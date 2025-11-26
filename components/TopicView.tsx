import React, { useState, useEffect, useCallback } from 'react';
// FIX: Import 'Link' from 'react-router-dom' to resolve the 'Cannot find name 'Link'' error.
import { useParams, useNavigate, Link } from 'react-router-dom';
// FIX: Casting `motion` to `any` to bypass TypeScript errors caused by faulty type definitions.
import { motion as motion_, AnimatePresence } from 'framer-motion';
import { auth, db } from '../firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc, updateDoc, setDoc, increment, arrayUnion } from 'firebase/firestore';
import { fetchAIResponse } from './utils';
import html2pdf from "html2pdf.js";
const motion = motion_ as any;

// --- TYPE DEFINITIONS ---
interface QuizQuestion {
  question: string;
  options: string[];
  answerIndex: number;
  explanation: string;
}
interface Topic {
  topicName: string;
  notes: string;
  quiz?: QuizQuestion[];
  xp: number;
}
interface Curriculum {
  units: { topics: Topic[] }[];
}

const TopicView = () => {
  const { curriculumId, unitIndex, topicIndex } = useParams<{ curriculumId: string; unitIndex: string; topicIndex: string }>();
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [topic, setTopic] = useState<Topic | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [viewState, setViewState] = useState<'notes' | 'quiz' | 'results'>('notes');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStatus, setGenerationStatus] = useState('');

  // Quiz State
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [quizPassed, setQuizPassed] = useState(false);


  const uIndex = parseInt(unitIndex || '0');
  const tIndex = parseInt(topicIndex || '0');

  const downloadNotesAsPDF = () => {
    if (!topic?.notes) return;
  
    const element = document.getElementById("notes-content");
    if (!element) return;
  
    const opt = {
      margin:       10,
      filename:     `${topic.topicName || "Notes"}.pdf`,
      // FIX: Cast image type to literal 'jpeg' to match html2pdf options type.
      image:        { type: 'jpeg' as const, quality: 0.98 },
      html2canvas:  { scale: 2, useCORS: true },
      // FIX: Cast orientation to literal 'portrait' to match html2pdf options type.
      jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' as const }
    };
  
    html2pdf().set(opt).from(element).save();
  };

  const generateContent = useCallback(async (currentTopic: Topic): Promise<Topic> => {
    setIsGenerating(true);
    let updatedTopic = { ...currentTopic };

    try {
        if (!currentTopic.notes) {
            setGenerationStatus("AI is writing study notes...");
            const notesPromptContent = currentTopic.topicName; // The topic name is the content for notes generation
            // Updated fetchAIResponse call for notes generation
            const notesRes = await fetchAIResponse(notesPromptContent, 'notes_generation');
            if (notesRes.success && notesRes.content) {
                updatedTopic.notes = notesRes.content;
            } else throw new Error("Failed to generate notes.");
        }

        if (!currentTopic.quiz || currentTopic.quiz.length === 0) {
            setGenerationStatus("AI is creating a quiz...");
            const quizPromptContent = updatedTopic.notes; // The notes are the content for quiz generation
            // Updated fetchAIResponse call for quiz generation
            const quizRes = await fetchAIResponse(quizPromptContent, 'quiz_generation');
            if (quizRes.success && quizRes.content) {
                const parsedQuiz = JSON.parse(quizRes.content);
                if (Array.isArray(parsedQuiz)) {
                    updatedTopic.quiz = parsedQuiz;
                } else throw new Error("AI returned invalid quiz format.");
            } else throw new Error(`Failed to generate quiz. ${quizRes.error}`);
        }
        
        // CRITICAL FIX: Removed the write operation to the curriculum document.
        // This component should NOT modify the shared curriculum. Generated content
        // will only exist in the component's state for this session. This prevents
        // any possibility of data corruption.
        
    } catch (err: any) {
        setError(`⚠️ AI Generation Error: ${err.message}`);
    } finally {
        setIsGenerating(false);
        setGenerationStatus('');
    }
    return updatedTopic;
  }, [uIndex, tIndex, curriculumId]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) setUser(currentUser);
      else navigate('/login');
    });
    return () => unsubscribe();
  }, [navigate]);

  useEffect(() => {
    const fetchTopicData = async () => {
      if (!user || !curriculumId) return;
      setLoading(true);
      setError('');
      try {
        const curriculumRef = doc(db, 'curriculums', curriculumId);
        const curriculumSnap = await getDoc(curriculumRef);
        if (!curriculumSnap.exists()) throw new Error('Curriculum not found.');
        
        const topicData = (curriculumSnap.data() as Curriculum).units[uIndex]?.topics[tIndex];
        if (!topicData) throw new Error('Topic not found.');
        
        if (!topicData.notes || !topicData.quiz || topicData.quiz.length === 0) {
            const generatedTopic = await generateContent(topicData);
            setTopic(generatedTopic);
        } else {
            setTopic(topicData);
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchTopicData();
  }, [user, curriculumId, uIndex, tIndex, generateContent, navigate]);
  
  const handlePassingFlow = async () => {
    if (!user || !curriculumId || !topic) return;

    const curriculumRef = doc(db, 'curriculums', curriculumId);
    const curriculumSnap = await getDoc(curriculumRef);
    if (!curriculumSnap.exists()) return;
    
    const units = (curriculumSnap.data() as Curriculum).units || [];
    let overallTopicIndex = -1;
    let counter = 0;
    for(let i = 0; i < units.length; i++) {
        for(let j = 0; j < units[i].topics.length; j++) {
            if (i === uIndex && j === tIndex) {
                overallTopicIndex = counter;
                break;
            }
            counter++;
        }
        if (overallTopicIndex !== -1) break;
    }

    if (overallTopicIndex === -1) {
        setError("Could not determine topic position to update progress.");
        return;
    };

    const progressRef = doc(db, `users/${user.uid}/progress`, curriculumId);
    const progressSnap = await getDoc(progressRef);
    const currentProgress = progressSnap.exists() ? progressSnap.data() : { completedTopicIndexes: [], currentTopicIndex: 0 };
    
    if (!currentProgress.completedTopicIndexes.includes(overallTopicIndex)) {
        const userRef = doc(db, 'users', user.uid);
        await updateDoc(userRef, { xp: increment(topic.xp || 10) });
        await setDoc(progressRef, {
            completedTopicIndexes: arrayUnion(overallTopicIndex),
            currentTopicIndex: Math.max(currentProgress.currentTopicIndex, overallTopicIndex + 1),
        }, { merge: true });
    }
    navigate(`/subject/${curriculumId}`, { state: { quizCompleted: true, topicName: topic.topicName } });
  };
  
  const retryQuiz = () => {
    setCurrentQuestionIndex(0);
    setScore(0);
    setSelectedAnswer(null);
    setIsAnswered(false);
    setQuizPassed(false);
    setViewState('quiz');
  };

  const handleAnswerSelect = (optionIndex: number) => {
    if (isAnswered) return;
    setSelectedAnswer(optionIndex);
    setIsAnswered(true);
    if (topic?.quiz && optionIndex === topic.quiz[currentQuestionIndex].answerIndex) {
      setScore(s => s + 1);
    }
  };

  const handleNextQuestion = async () => {
    if (topic?.quiz && currentQuestionIndex < topic.quiz.length - 1) {
      setCurrentQuestionIndex(i => i + 1);
      setSelectedAnswer(null);
      setIsAnswered(false);
    } else {
      const finalScorePercent = (score / (topic?.quiz?.length || 1)) * 100;
      setQuizPassed(finalScorePercent >= 75);
      setViewState('results');
    }
  };
  
  const getButtonClass = (optionIndex: number) => {
    if (!isAnswered || !topic?.quiz) return 'bg-white/70 hover:bg-blue-100';
    const correctIndex = topic.quiz[currentQuestionIndex].answerIndex;
    if (optionIndex === correctIndex) return 'bg-green-500 text-white';
    if (optionIndex === selectedAnswer) return 'bg-red-500 text-white';
    return 'bg-slate-200 text-slate-500 opacity-70';
  };

  if (loading || isGenerating) return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-slate-100">
          <p className="text-xl font-semibold mb-2">{isGenerating ? generationStatus : 'Loading Topic...'}</p>
          {isGenerating && <div className="w-32 h-2 bg-slate-200 rounded-full overflow-hidden"><motion.div className="h-2 bg-brand-primary rounded-full" initial={{x:"-100%"}} animate={{x:"100%"}} transition={{duration:1.5, repeat:Infinity, ease:"linear"}}></motion.div></div>}
      </div>
  );
  if (error) return <div className="h-screen w-full flex flex-col items-center justify-center bg-red-50 text-red-700 p-4 text-center"><p className="font-semibold text-lg">An Error Occurred</p><p>{error}</p><button onClick={() => window.location.reload()} className="mt-4 bg-red-500 text-white font-semibold px-4 py-2 rounded-lg">Retry</button></div>;
  if (!topic) return <div className="h-screen w-full flex items-center justify-center">Topic not found.</div>;

  return (
    <div className="min-h-screen w-full bg-slate-50 p-6">
      <div className="container mx-auto max-w-4xl">
        <AnimatePresence mode="wait">
        {viewState === 'notes' && (
            <motion.div key="notes" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <Link to={`/subject/${curriculumId}`} className="text-brand-primary font-semibold hover:underline">← Back to Roadmap</Link>
                <h1 className="text-5xl font-extrabold text-slate-800 mt-4">{topic.topicName}</h1>
                <div className="bg-white/50 backdrop-blur-md rounded-2xl shadow-xl border border-slate-200 p-8 mt-8">
                    <h2 className="text-2xl font-bold text-slate-700 border-b pb-3 mb-4">Study Notes</h2>
                    <div
                        id="notes-content"
                        className="prose prose-lg max-w-none text-slate-600 leading-relaxed"
                        dangerouslySetInnerHTML={{ __html: topic.notes }}
                    />
                    <button
                        onClick={downloadNotesAsPDF}
                        className="mt-4 bg-purple-600 text-white px-4 py-2 rounded-lg shadow-md hover:bg-purple-700"
                    >
                        Download Notes (PDF)
                    </button>
                </div>
                <div className="mt-8 text-center">
                    <motion.button onClick={() => setViewState('quiz')} className="bg-gradient-to-r from-brand-primary to-brand-purple text-white font-bold text-xl px-10 py-5 rounded-full shadow-lg" whileHover={{ scale: 1.05 }}>Start Quiz!</motion.button>
                </div>
            </motion.div>
        )}
        {viewState === 'quiz' && topic.quiz && (
             <motion.div key="quiz" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="w-full max-w-3xl mx-auto bg-white/60 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-200 p-8">
                <div className="mb-6"><h2 className="text-xl font-bold text-slate-700">Question {currentQuestionIndex + 1} of {topic.quiz.length}</h2><div className="w-full bg-slate-200 rounded-full h-2 mt-2"><motion.div className="bg-brand-primary h-2 rounded-full" initial={{ width: `${(currentQuestionIndex / topic.quiz.length) * 100}%` }} animate={{ width: `${((currentQuestionIndex + 1) / topic.quiz.length) * 100}%` }} /></div></div>
                <AnimatePresence mode="wait">
                    <motion.div key={currentQuestionIndex} initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }} transition={{ duration: 0.3 }}>
                        <div className="bg-yellow-50 p-4 rounded-md mb-6"><h3 className="font-bold text-lg text-slate-800">{topic.quiz[currentQuestionIndex].question}</h3></div>
                        <div className="space-y-3">
                            {topic.quiz[currentQuestionIndex].options.map((option, i) => (
                                <motion.button key={i} onClick={() => handleAnswerSelect(i)} className={`w-full text-left p-3 rounded-lg font-medium border-2 border-transparent transition-all duration-300 ${getButtonClass(i)}`} whileHover={{ scale: isAnswered ? 1 : 1.02 }} disabled={isAnswered}>{option}</motion.button>
                            ))}
                        </div>
                        {isAnswered && (
                            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-4 p-4 bg-slate-100 rounded-lg text-slate-700 text-sm">
                                <p dangerouslySetInnerHTML={{ __html: topic.quiz[currentQuestionIndex].explanation }} />
                            </motion.div>
                        )}
                    </motion.div>
                </AnimatePresence>
                <div className="mt-8 text-center">{isAnswered && (<motion.button onClick={handleNextQuestion} className="bg-brand-primary text-white font-bold py-3 px-12 rounded-full" whileHover={{ scale: 1.05 }}>{currentQuestionIndex < topic.quiz.length - 1 ? 'Next →' : 'Finish'}</motion.button>)}</div>
            </motion.div>
        )}
        {viewState === 'results' && topic.quiz && (
            <motion.div key="results" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-lg mx-auto text-center bg-white/60 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-200 p-8">
              {quizPassed ? (
                <>
                  <h2 className="text-4xl font-extrabold text-green-600">You Passed! 🎉</h2>
                  <p className="mt-2 text-slate-600">Great job! You've mastered this topic.</p>
                  <div className="my-8 space-y-4">
                      <div className="bg-amber-100/70 p-4 rounded-lg"><p className="text-lg font-semibold text-amber-800">Total XP Earned</p><p className="text-4xl font-bold text-amber-600">+{topic.xp || 10} XP</p></div>
                      <div className="bg-green-100/70 p-4 rounded-lg"><p className="text-lg font-semibold text-green-800">Your Score</p><p className="text-4xl font-bold text-green-600">{((score / topic.quiz.length) * 100).toFixed(0)}%</p></div>
                  </div>
                  <motion.button 
                    onClick={handlePassingFlow}
                    className="bg-brand-primary text-white font-bold py-3 px-10 rounded-full shadow-lg"
                    whileHover={{ scale: 1.05 }}
                  >
                    Return to Roadmap →
                  </motion.button>
                </>
              ) : (
                <>
                  <h2 className="text-4xl font-extrabold text-red-600">You Did Not Pass ❌</h2>
                  <p className="mt-2 text-slate-600">You need a score of 75% or higher to continue. Let's try that again!</p>
                  <div className="my-8 space-y-4">
                      <div className="bg-red-100/70 p-4 rounded-lg"><p className="text-lg font-semibold text-red-800">Your Score</p><p className="text-4xl font-bold text-red-600">{((score / topic.quiz.length) * 100).toFixed(0)}%</p></div>
                  </div>
                  <motion.button 
                    onClick={retryQuiz}
                    className="bg-red-600 text-white font-bold py-3 px-10 rounded-full shadow-lg"
                    whileHover={{ scale: 1.05 }}
                  >
                    Retry Quiz
                  </motion.button>
                </>
              )}
            </motion.div>
        )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default TopicView;