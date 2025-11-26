import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
// FIX: Casting `motion` to `any` to bypass TypeScript errors caused by faulty type definitions.
import { motion as motion_, AnimatePresence } from 'framer-motion';
import { auth, db } from '../firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc, updateDoc, increment, arrayUnion, serverTimestamp, setDoc, Timestamp, DocumentData } from 'firebase/firestore';
const motion = motion_ as any;

interface Question {
  question: string;
  options: string[];
  answer: string;
}

interface Topic {
  topicName: string;
  quiz: Question[];
}

const ConfettiPiece = ({ i }: { i: number }) => {
  const colors = ['#4F46E5', '#0891B2', '#65A30D', '#9333EA', '#F59E0B'];
  return (
    <motion.div
      className="absolute top-0 left-1/2 w-2 h-4"
      style={{ background: colors[i % colors.length] }}
      initial={{ y: -10, x: (Math.random() - 0.5) * 400, opacity: 1, rotate: Math.random() * 360 }}
      animate={{ y: '100vh', opacity: [1, 1, 0] }}
      transition={{ duration: Math.random() * 3 + 2, ease: 'linear', delay: Math.random() * 1 }}
    />
  );
};

const Confetti = () => (
  <div className="absolute inset-0 z-50 pointer-events-none overflow-hidden">
    {Array.from({ length: 100 }).map((_, i) => <ConfettiPiece key={i} i={i} />)}
  </div>
);

const Quiz = () => {
  const { curriculumId, unitIndex, topicIndex } = useParams<{ curriculumId: string; unitIndex: string; topicIndex: string }>();
  const navigate = useNavigate();

  const [user, setUser] = useState<User | null>(null);
  const [topic, setTopic] = useState<Topic | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [xpEarned] = useState(10); // Fixed XP per quiz
  const [quizState, setQuizState] = useState<'loading' | 'in-progress' | 'completed'>('loading');
  const [error, setError] = useState<string | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (!currentUser) navigate('/login');
      else setUser(currentUser);
    });
    return () => unsubscribe();
  }, [navigate]);

  useEffect(() => {
    const fetchQuizData = async () => {
      if (!curriculumId || unitIndex === undefined || topicIndex === undefined) {
        setError('Quiz parameters are missing.');
        setQuizState('in-progress'); // To show error message
        return;
      }

      try {
        const curriculumDocRef = doc(db, 'curriculums', curriculumId);
        const curriculumSnap = await getDoc(curriculumDocRef);
        if (!curriculumSnap.exists()) throw new Error("Curriculum not found.");

        const topicData = curriculumSnap.data().units[parseInt(unitIndex)].topics[parseInt(topicIndex)];
        if (!topicData || !topicData.quiz || topicData.quiz.length === 0) {
            throw new Error("Quiz not available for this topic yet.");
        }
        
        setTopic(topicData);
        setQuestions(topicData.quiz);
        setQuizState('in-progress');
      } catch (err: any) {
        console.error("Error fetching quiz:", err);
        setError(err.message || 'Failed to load quiz. Please go back and try again.');
      }
    };
    if(user) fetchQuizData();
  }, [curriculumId, unitIndex, topicIndex, user]);

  const updateUserProgress = useCallback(async () => {
    if (!user || !curriculumId || !topic) return;
    
    const passed = score / questions.length >= 0.7;
    if (!passed) return;

    try {
        const userRef = doc(db, 'users', user.uid);
        const progressRef = doc(db, `users/${user.uid}/progress`, curriculumId);

        const [userSnap, progressSnap] = await Promise.all([getDoc(userRef), getDoc(progressRef)]);
        if (!userSnap.exists()) return;

        const userData = userSnap.data() as DocumentData;
        let newStreak = userData.streak || 0;
        const lastCompletion = (userData.lastMissionCompletedAt as Timestamp)?.toDate();
        if (lastCompletion) {
            const today = new Date();
            const lastCompletedDate = new Date(lastCompletion);
            today.setHours(0, 0, 0, 0);
            lastCompletedDate.setHours(0, 0, 0, 0);
            const diffDays = Math.round((today.getTime() - lastCompletedDate.getTime()) / (1000 * 60 * 60 * 24));
            if (diffDays === 1) newStreak++;
            else if (diffDays > 1) newStreak = 1;
        } else {
            newStreak = 1;
        }
        
        await updateDoc(userRef, {
            xp: increment(xpEarned),
            streak: newStreak,
            lastMissionCompletedAt: serverTimestamp(),
        });
        
        const completedTopicsUpdate = arrayUnion(topic.topicName);
        if (!progressSnap.exists()) {
            await setDoc(progressRef, { completedTopics: [topic.topicName], xp: xpEarned });
        } else {
            await updateDoc(progressRef, { completedTopics: completedTopicsUpdate, xp: increment(xpEarned) });
        }

        if (score === questions.length) {
          setShowConfetti(true);
          await updateDoc(userRef, { achievements: arrayUnion('Perfect Score! ✨') });
        }

    } catch (err) {
        console.error("Failed to update user progress:", err);
        setError("There was an error saving your progress.");
    }
  }, [user, curriculumId, xpEarned, score, questions.length, topic]);

  useEffect(() => {
    if (quizState === 'completed') {
      updateUserProgress();
    }
  }, [quizState, updateUserProgress]);

  const handleAnswerSelect = (option: string) => {
    if (isAnswered) return;
    setSelectedAnswer(option);
    setIsAnswered(true);
    if (option === questions[currentQuestionIndex].answer) {
      setScore(s => s + 1);
    }
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(i => i + 1);
      setSelectedAnswer(null);
      setIsAnswered(false);
    } else {
      setQuizState('completed');
    }
  };

  const handleReturnToRoadmap = () => {
    if (curriculumId) {
        const passed = score / questions.length >= 0.7;
        // Navigate back to the roadmap, passing state to show a success message.
        navigate(`/subject/${curriculumId}`, { state: { quizCompleted: passed, topicName: topic?.topicName } });
    } else {
        navigate('/dashboard');
    }
  };

  const getButtonClass = (option: string) => {
    if (!isAnswered) return 'bg-white/70 hover:bg-blue-100';
    const isCorrect = option === questions[currentQuestionIndex].answer;
    const isSelected = option === selectedAnswer;

    if (isCorrect) return 'bg-green-500 text-white';
    if (isSelected && !isCorrect) return 'bg-red-500 text-white';
    return 'bg-slate-200 text-slate-500 opacity-70';
  };

  if (quizState === 'loading') return <div className="h-screen w-full flex items-center justify-center bg-slate-100">Loading Quiz...</div>;
  if (error) return <div className="h-screen w-full flex flex-col items-center justify-center bg-red-50 text-red-700"><p>{error}</p><Link to="/dashboard" className="mt-4 bg-red-500 text-white font-semibold px-4 py-2 rounded-lg">Back to Dashboard</Link></div>;

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-blue-50 to-purple-100 flex items-center justify-center p-4 font-sans">
        <AnimatePresence mode="wait">
        {quizState === 'in-progress' && questions.length > 0 && (
            <motion.div key="quiz" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="w-full max-w-2xl bg-white/60 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-200 p-8">
                <div className="mb-6">
                    <p className="text-sm font-semibold text-brand-primary">{topic?.topicName}</p>
                    <div className="flex justify-between items-center mt-1">
                        <h2 className="text-xl font-bold text-slate-700">Question {currentQuestionIndex + 1} of {questions.length}</h2>
                        <span className="font-bold text-green-600">+{xpEarned} XP</span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-2 mt-2"><motion.div className="bg-gradient-to-r from-brand-secondary to-brand-primary h-2 rounded-full" initial={{ width: `${(currentQuestionIndex / questions.length) * 100}%` }} animate={{ width: `${((currentQuestionIndex + 1) / questions.length) * 100}%` }} /></div>
                </div>
                <AnimatePresence mode="wait"><motion.div key={currentQuestionIndex} initial={{ opacity: 0, x: 100 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -100 }} transition={{ duration: 0.3 }}>
                        <h3 className="text-2xl md:text-3xl font-bold text-slate-800 text-center mb-8 min-h-[100px] flex items-center justify-center">{questions[currentQuestionIndex].question}</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {questions[currentQuestionIndex].options.map((option, i) => (
                                <motion.button key={i} onClick={() => handleAnswerSelect(option)} className={`p-4 rounded-lg text-lg font-semibold border-2 border-transparent transition-all duration-300 ${getButtonClass(option)}`} whileHover={{ scale: isAnswered ? 1 : 1.05 }} disabled={isAnswered}>{option}</motion.button>
                            ))}
                        </div>
                </motion.div></AnimatePresence>
                <div className="mt-8 text-center">{isAnswered && (<motion.button onClick={handleNextQuestion} className="bg-brand-primary text-white font-bold py-3 px-12 rounded-full shadow-lg shadow-indigo-500/30" whileHover={{ scale: 1.05 }} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>{currentQuestionIndex < questions.length - 1 ? 'Next →' : 'Finish'}</motion.button>)}</div>
            </motion.div>
        )}
        {quizState === 'completed' && (
             <motion.div key="results" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-lg text-center bg-white/60 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-200 p-8">
                {showConfetti && <Confetti />}
                {score / questions.length >= 0.7 ? (
                    <>
                        <h2 className="text-4xl font-extrabold text-slate-800">🎉 Topic Mastered! 🎉</h2>
                        <p className="text-slate-600 mt-2">Awesome! You unlocked the next topic.</p>
                    </>
                ) : (
                    <>
                        <h2 className="text-4xl font-extrabold text-slate-800">Keep Trying! 💪</h2>
                        <p className="text-slate-600 mt-2">Don't worry, review the material and try again.</p>
                    </>
                )}
                <div className="my-8 space-y-4">
                    <div className="bg-amber-100/70 p-4 rounded-lg"><p className="text-lg font-semibold text-amber-800">Total XP Earned</p><p className="text-4xl font-bold text-amber-600">+{score / questions.length >= 0.7 ? xpEarned : 0} XP</p></div>
                     <div className="bg-green-100/70 p-4 rounded-lg"><p className="text-lg font-semibold text-green-800">Correct Answers</p><p className="text-4xl font-bold text-green-600">{score} / {questions.length}</p></div>
                </div>
                <motion.button onClick={handleReturnToRoadmap} className="bg-brand-primary text-white font-bold py-3 px-10 rounded-full shadow-lg" whileHover={{ scale: 1.05 }}>Return to Roadmap</motion.button>
             </motion.div>
        )}
        </AnimatePresence>
    </div>
  );
};

export default Quiz;