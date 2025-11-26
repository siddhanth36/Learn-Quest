import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate, useLocation } from 'react-router-dom';
// FIX: Casting `motion` to `any` to bypass TypeScript errors caused by faulty type definitions.
import { motion as motion_, AnimatePresence } from 'framer-motion';
import { auth, db } from '../firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
const motion = motion_ as any;

// --- TYPE DEFINITIONS ---
interface Topic { topicName: string; notes?: string; xp: number; }
interface Unit { title: string; topics: Topic[]; }
interface Curriculum { subject: string; units: Unit[]; }
interface Progress { completedTopicIndexes: number[]; currentTopicIndex: number; }
interface UserData { xp: number; streak: number; }

// --- CONFETTI COMPONENT ---
const ConfettiPiece = ({ i }: { i: number }) => {
    const colors = ['#4F46E5', '#0891B2', '#65A30D', '#9333EA', '#F59E0B'];
    return (
      <motion.div
        className="absolute top-0 left-1/2 w-2 h-4"
        style={{ background: colors[i % colors.length] }}
        initial={{ y: -10, x: (Math.random() - 0.5) * window.innerWidth, opacity: 1, rotate: Math.random() * 360 }}
        animate={{ y: '100vh', opacity: [1, 1, 0] }}
        transition={{ duration: Math.random() * 3 + 2, ease: 'linear', delay: Math.random() * 1 }}
      />
    );
};
const Confetti = () => (
    <div className="fixed inset-0 z-[100] pointer-events-none overflow-hidden">
      {Array.from({ length: 150 }).map((_, i) => <ConfettiPiece key={i} i={i} />)}
    </div>
);

// --- TOPIC PREVIEW MODAL ---
const TopicPreviewModal = ({ unitIndex, topicIndex, unitTitle, topic, onClose, curriculumId }: { unitIndex: number, topicIndex: number, unitTitle: string, topic: Topic, onClose: () => void, curriculumId: string }) => {
    const navigate = useNavigate();

    const handleStart = () => {
        navigate(`/topic/${curriculumId}/${unitIndex}/${topicIndex}`);
    };
    
    const excerpt = topic.notes ? topic.notes.replace(/<[^>]+>/g, '').substring(0, 150) + '...' : "Ready to learn something new?";

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }} className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl w-full max-w-lg p-6 relative" onClick={(e) => e.stopPropagation()}>
                <button onClick={onClose} className="absolute top-3 right-3 text-slate-500 hover:text-slate-800 text-3xl leading-none">&times;</button>
                <p className="text-sm font-semibold text-brand-primary uppercase">Unit {unitIndex+1} &bull; Topic {topicIndex+1}</p>
                <h2 className="text-3xl font-bold text-slate-800 mt-1 mb-4">{topic.topicName}</h2>
                <p className="text-slate-600 mb-6">{excerpt}</p>
                <motion.button 
                    onClick={handleStart} 
                    className="w-full bg-gradient-to-r from-brand-primary to-brand-purple text-white font-bold py-3 px-4 rounded-lg shadow-lg"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                >
                    Start +{topic.xp || 10} XP
                </motion.button>
            </motion.div>
        </motion.div>
    );
};


// --- MAIN ROADMAP COMPONENT ---
const SubjectRoadmap = () => {
  const { curriculumId } = useParams<{ curriculumId: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [curriculum, setCurriculum] = useState<Curriculum | null>(null);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [showConfetti, setShowConfetti] = useState(false);
  const [showToast, setShowToast] = useState<string | null>(null);
  const [selectedTopic, setSelectedTopic] = useState<{ unitIndex: number, topicIndex: number, unitTitle: string, topic: Topic } | null>(null);

  useEffect(() => {
    if (location.state?.quizCompleted) {
        setShowConfetti(true);
        setShowToast(`Awesome! You mastered "${location.state.topicName}" 🎉`);
        setTimeout(() => setShowConfetti(false), 5000);
        setTimeout(() => setShowToast(null), 5000);
        window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) setUser(currentUser);
      else navigate('/login');
    });
    return () => unsubscribeAuth();
  }, [navigate]);

  const fetchRoadmapData = useCallback(async (currentUser: User) => {
    if (!curriculumId) return;
    setLoading(true);
    try {
        const curriculumRef = doc(db, 'curriculums', curriculumId);
        const curriculumSnap = await getDoc(curriculumRef);
        if (!curriculumSnap.exists()) throw new Error('Curriculum not found.');
        setCurriculum(curriculumSnap.data() as Curriculum);
    } catch (err: any) {
        setError(err.message);
        setLoading(false);
    }
  }, [curriculumId]);

  useEffect(() => {
    if (!user) return;
    fetchRoadmapData(user);

    const unsubscribes: (() => void)[] = [];
    const userRef = doc(db, 'users', user.uid);
    unsubscribes.push(onSnapshot(userRef, (snap) => setUserData(snap.data() as UserData)));
    
    if (curriculumId) {
        const progressRef = doc(db, `users/${user.uid}/progress`, curriculumId);
        unsubscribes.push(onSnapshot(progressRef, (snap) => {
            if (snap.exists()) {
                setProgress(snap.data() as Progress);
            } else {
                setProgress({ completedTopicIndexes: [], currentTopicIndex: 0 });
            }
            setLoading(false); // Stop loading only after progress is fetched
        }));
    }
    
    return () => unsubscribes.forEach(unsub => unsub());
  }, [user, curriculumId, fetchRoadmapData]);

  if (loading || !curriculum || !progress) return <div className="h-screen w-full flex items-center justify-center bg-slate-100">Loading Roadmap...</div>;
  if (error) return <div className="h-screen w-full flex items-center justify-center bg-red-50 text-red-700">{error}</div>;

  let overallTopicCounter = 0;

  return (
    <>
    <div className="min-h-screen w-full bg-gradient-to-b from-sky-50 via-indigo-50 to-emerald-50 p-6 font-sans relative overflow-x-hidden">
      {showConfetti && <Confetti />}
      <AnimatePresence>
        {showToast && (
            <motion.div
                initial={{ opacity: 0, y: -50 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -50 }}
                className="fixed top-5 left-1/2 -translate-x-1/2 z-[60] bg-white/80 backdrop-blur-md shadow-lg rounded-full px-6 py-3 font-semibold text-slate-800"
            >
                {showToast}
            </motion.div>
        )}
      </AnimatePresence>
      
      <div className="container mx-auto max-w-4xl relative z-10">
        <header className="flex flex-col sm:flex-row justify-between items-center mb-8 bg-white/50 backdrop-blur-sm p-4 rounded-xl shadow-md">
            <div>
                <Link to="/dashboard" className="text-sm text-brand-primary font-semibold hover:underline mb-1 inline-block">← Back to Dashboard</Link>
                <h1 className="text-3xl font-extrabold text-slate-900">{curriculum.subject} Roadmap</h1>
            </div>
            <div className="flex items-center space-x-4 mt-3 sm:mt-0">
                <div className="flex items-center gap-2 font-semibold text-slate-700 bg-amber-100/70 px-3 py-1 rounded-full">🎯 XP: {userData?.xp ?? 0}</div>
                <div className="flex items-center gap-2 font-semibold text-slate-700 bg-red-100/70 px-3 py-1 rounded-full">🔥 Streak: {userData?.streak ?? 0}</div>
            </div>
        </header>
        
        <div className="space-y-12">
            {curriculum.units.map((unit, unitIndex) => (
            <div key={unitIndex}>
              <h2 className="text-2xl font-bold text-slate-700 mb-8 pl-4 border-l-4 border-brand-primary">{unit.title}</h2>
              <div className="relative w-full flex flex-col items-center">
                {unit.topics.map((topic, topicIndex) => {
                  const currentOverallIndex = overallTopicCounter;
                  overallTopicCounter++;
                  const isCompleted = progress.completedTopicIndexes.includes(currentOverallIndex);
                  const isCurrent = progress.currentTopicIndex === currentOverallIndex;
                  
                  let status: 'locked' | 'active' | 'completed' = 'locked';
                  if (isCompleted) status = 'completed';
                  else if (isCurrent) status = 'active';

                  const isLeft = topicIndex % 2 !== 0;

                  return (
                    <div key={topic.topicName} className="w-full flex justify-center h-40 relative">
                        { topicIndex < unit.topics.length - 1 && 
                          <svg className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-full w-auto text-slate-300" viewBox="0 0 100 100" preserveAspectRatio="none">
                              <path d={isLeft ? "M 50 0 V 50 C 50 75, 25 75, 25 100" : "M 50 0 V 50 C 50 75, 75 75, 75 100"} stroke="currentColor" strokeWidth="3" fill="none" strokeDasharray="6" />
                          </svg>
                        }
                        <motion.button 
                            initial={{ scale: 0, opacity: 0 }} 
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ type: 'spring', stiffness: 260, damping: 20, delay: (currentOverallIndex * 0.1) }}
                            onClick={() => status !== 'locked' && setSelectedTopic({ unitIndex, topicIndex, unitTitle: unit.title, topic })}
                            disabled={status === 'locked'}
                            aria-label={`Topic: ${topic.topicName}, Status: ${status}`}
                            className={`absolute top-0 w-28 h-28 rounded-full flex items-center justify-center text-4xl text-white font-bold transition-all duration-300 border-8 z-10 cursor-pointer disabled:cursor-not-allowed
                                ${isLeft ? 'left-1/2 -translate-x-[150%] md:-translate-x-[175%]' : 'right-1/2 translate-x-[150%] md:translate-x-[175%]'}
                                ${status === 'completed' && 'bg-green-500 border-green-300 shadow-lg shadow-green-500/50'}
                                ${status === 'active' && 'bg-blue-500 border-blue-300 shadow-lg shadow-blue-500/50 animate-pulse'}
                                ${status === 'locked' && 'bg-slate-400 border-slate-300 opacity-60'}`}
                        >
                            {status === 'completed' ? '✅' : status === 'active' ? '🚀' : '🔒'}
                            {status === 'active' && <div className="absolute inset-0 rounded-full border-2 border-white/50 animate-ping"></div>}
                        </motion.button>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
    <AnimatePresence>
        {selectedTopic && curriculumId && (
            <TopicPreviewModal 
                {...selectedTopic}
                onClose={() => setSelectedTopic(null)}
                curriculumId={curriculumId}
            />
        )}
    </AnimatePresence>
    </>
  );
};

export default SubjectRoadmap;