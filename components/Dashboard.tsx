import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
// FIX: Casting `motion` to `any` to bypass TypeScript errors caused by faulty type definitions.
import { motion as motion_, AnimatePresence } from 'framer-motion';
import { auth, db } from '../firebase';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import { collection, doc, onSnapshot, orderBy, query, getDocs, getDoc, DocumentData, where, updateDoc, arrayUnion } from 'firebase/firestore';
import { SubjectCard, SubjectCardSkeleton, SubjectCardProps } from './SubjectCard';
const motion = motion_ as any;

interface UserData {
  name: string;
  level: number;
  levelName: string;
  xp: number;
  nextLevelXP: number;
  streak: number;
  achievements: string[];
  rank: number;
  subjects: string[]; // curriculum IDs
  board: string;
  class: string;
}

interface AvailableSubject {
  id: string;
  name: string;
}

const motivationalQuotes = [
  "Keep pushing, your next achievement is waiting! ⚡",
  "Every topic mastered is a step towards greatness. 🏆",
  "Learning is your superpower. Use it well! 🧠",
  "Consistency is key. Keep that streak alive! 🔥",
];

// --- Skeleton Component for Loading State ---
const DashboardSkeleton = () => (
    <div className="min-h-screen w-full bg-slate-100 font-sans animate-pulse">
        <header className="bg-white/80 shadow-sm">
            <div className="container mx-auto px-6 py-3 flex justify-between items-center">
                <div className="h-7 bg-slate-200 rounded w-48"></div>
                <div className="flex items-center space-x-4">
                    <div className="text-right">
                        <div className="h-5 bg-slate-200 rounded w-24 mb-1"></div>
                        <div className="h-4 bg-slate-200 rounded w-16"></div>
                    </div>
                    <div className="w-12 h-12 rounded-full bg-slate-200"></div>
                </div>
            </div>
        </header>
        <main className="container mx-auto p-6">
            <div className="h-8 bg-slate-200 rounded w-3/4 mb-2"></div>
            <div className="h-5 bg-slate-200 rounded w-1/2"></div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-slate-200/70 p-6 rounded-2xl h-24"></div>
                    <div className="h-8 bg-slate-200 rounded w-40 mb-4"></div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <SubjectCardSkeleton />
                        <SubjectCardSkeleton />
                    </div>
                </div>
                <div className="space-y-6">
                    <div className="bg-slate-200/70 rounded-2xl h-32"></div>
                    <div className="bg-slate-200/70 rounded-2xl h-24"></div>
                    <div className="bg-slate-200/70 rounded-2xl h-36"></div>
                </div>
            </div>
        </main>
    </div>
);


const Dashboard = () => {
    const [user, setUser] = useState<User | null>(null);
    const [userData, setUserData] = useState<UserData | null>(null);
    const [subjectsData, setSubjectsData] = useState<SubjectCardProps[]>([]);
    const [pageLoading, setPageLoading] = useState(true);
    const [subjectsLoading, setSubjectsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [quote, setQuote] = useState('');
    const navigate = useNavigate();

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [availableSubjects, setAvailableSubjects] = useState<AvailableSubject[]>([]);
    const [subjectsToAdd, setSubjectsToAdd] = useState<string[]>([]);
    const [isModalLoading, setIsModalLoading] = useState(false);

    useEffect(() => {
        setQuote(motivationalQuotes[Math.floor(Math.random() * motivationalQuotes.length)]);
        const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
            if (currentUser) setUser(currentUser);
            else navigate('/login');
        });
        return () => unsubscribeAuth();
    }, [navigate]);

    // This effect sets up the real-time listener for the user's document.
    // When the user doc changes (e.g., subjects are added), this will re-run its logic.
    useEffect(() => {
        if (!user) return;

        const userDocRef = doc(db, 'users', user.uid);
        const unsubscribeUser = onSnapshot(userDocRef, (userDocSnap) => {
            if (!userDocSnap.exists()) {
                navigate('/signup');
                return;
            }
            
            const data = userDocSnap.data() as DocumentData;
            
            if (data.role === 'admin') { navigate('/admin'); return; }
            if (!data.onboardingComplete) { navigate('/onboarding'); return; }

            // Set the core user data for the dashboard UI
            setUserData(data as UserData);
            setPageLoading(false);

            // Now, fetch the details for each subject ID listed in the user's document
            const subjectIds = data.subjects || [];
            if (subjectIds.length > 0) {
                fetchSubjectsDetails(subjectIds, user.uid);
            } else {
                // If there are no subjects, clear the list and stop loading.
                setSubjectsData([]);
                setSubjectsLoading(false);
            }
        }, (err) => {
            setError("Failed to load dashboard data.");
            console.error(err);
            setPageLoading(false);
        });

        return () => unsubscribeUser();
    }, [user, navigate]);

    // Callback to fetch details for all subjects. This is called by the onSnapshot listener.
    const fetchSubjectsDetails = useCallback(async (subjectIds: string[], uid: string) => {
        setSubjectsLoading(true);
        try {
            const subjectPromises = subjectIds.map(async (subjectId) => {
                const curriculumRef = doc(db, 'curriculums', subjectId);
                const progressRef = doc(db, `users/${uid}/progress`, subjectId);

                const [curriculumSnap, progressSnap] = await Promise.all([
                    getDoc(curriculumRef),
                    getDoc(progressRef)
                ]);

                if (!curriculumSnap.exists()) {
                    console.warn(`Curriculum doc not found for id: ${subjectId}`);
                    return { id: subjectId, name: 'Subject data missing', topicCount: 0, progress: 0, isMissing: true };
                }

                const curriculumData = curriculumSnap.data();

                // FIX: Safely parse curriculum data with the nested units/topics array structure.
                // This removes the "Invalid curriculum format" errors and correctly handles the schema.
                const units = Array.isArray(curriculumData.units) ? curriculumData.units : [];
                const totalTopics = units.reduce((sum, unit) => {
                    return sum + (unit && Array.isArray(unit.topics) ? unit.topics.length : 0);
                }, 0);

                const completedIndexes = progressSnap.exists() ? (progressSnap.data().completedTopicIndexes || []) : [];
                const progress = totalTopics > 0 ? (completedIndexes.length / totalTopics) * 100 : 0;

                return {
                    id: subjectId,
                    name: curriculumData.subject || 'Unnamed Subject',
                    topicCount: totalTopics,
                    progress: progress,
                    isMissing: false,
                };
            });

            const results = (await Promise.all(subjectPromises)).filter(Boolean) as SubjectCardProps[];
            setSubjectsData(results);
        } catch (e) {
            console.error("Error fetching subject details:", e);
            setError("Could not load subject details.");
        } finally {
            setSubjectsLoading(false);
        }
    }, []);
    
    const handleOpenModal = async () => {
        if (!userData) return;
        setIsModalLoading(true);
        setIsModalOpen(true);
        try {
            const q = query(collection(db, "curriculums"), where("board", "==", userData.board), where("class", "==", userData.class));
            const querySnapshot = await getDocs(q);
            const subjects = querySnapshot.docs.map(doc => ({ id: doc.id, name: doc.data().subject }));
            setAvailableSubjects(subjects);
        } catch (err) {
            console.error("Error fetching available subjects:", err);
            setError("Could not fetch subjects.");
        }
        setIsModalLoading(false);
    };

    const handleAddSubjects = async () => {
        if (!user || subjectsToAdd.length === 0 || !userData) return;
        try {
            const userRef = doc(db, 'users', user.uid);
            // FIX: Combine existing subjects with new ones and overwrite the array.
            // This ensures the list is always in sync with the user's full set of subjects.
            const updatedSubjects = Array.from(new Set([...userData.subjects, ...subjectsToAdd]));
            await updateDoc(userRef, { subjects: updatedSubjects });
            setSubjectsToAdd([]);
            setIsModalOpen(false);
        } catch (err) {
            console.error("Error adding subjects:", err);
            setError("Failed to add subjects.");
        }
    };

    const handleSubjectSelection = (subjectId: string) => {
        setSubjectsToAdd(prev => prev.includes(subjectId) ? prev.filter(id => id !== subjectId) : [...prev, subjectId]);
    };



    const handleLogout = async () => {
        await signOut(auth);
        navigate('/login');
    };
    
    const getInitials = (name: string = '') => name.split(' ').map(n => n[0]).join('').substring(0,2).toUpperCase();
    
    if (pageLoading) return <DashboardSkeleton />;
    if (error || !userData) return <div className="h-screen w-full flex items-center justify-center bg-red-50 text-red-700">{error || "Could not load user data."}</div>;

    const xpPercentage = userData.nextLevelXP > 0 ? (userData.xp / userData.nextLevelXP) * 100 : 0;

    return (
    <>
    <div className="min-h-screen w-full bg-gradient-to-br from-slate-100 via-blue-50 to-purple-50 font-sans">
      <header className="bg-white/80 backdrop-blur-lg shadow-sm sticky top-0 z-40">
        <div className="container mx-auto px-6 py-3 flex justify-between items-center">
          <Link to="/" className="flex items-center space-x-2"><span className="text-2xl font-bold text-slate-900">LearnQuest ⚡</span></Link>
          <div className="flex items-center space-x-4">
            <Link to="/ai-buddy" className="hidden sm:block text-slate-600 hover:text-brand-primary transition-colors font-medium">AI Buddy</Link>
              <div className="text-right">
                <p className="font-semibold text-slate-800">{userData.name}</p>
                <p className="text-sm text-slate-500">XP: {userData.xp}</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-brand-primary text-white flex items-center justify-center font-bold text-lg shadow-md">{getInitials(userData.name)}</div>
              <button onClick={handleLogout} className="text-slate-500 hover:text-brand-primary transition-colors"><svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg></button>
          </div>
        </div>
      </header>
      
      <main className="container mx-auto p-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <h1 className="text-3xl font-bold text-slate-800">Welcome back, {userData.name}!</h1>
            <p className="text-slate-500 mt-1">{quote}</p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
          <div className="lg:col-span-2 space-y-6">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, duration: 0.5 }} className="bg-white/70 backdrop-blur-md p-6 rounded-2xl shadow-lg border border-slate-200">
                <div className="flex justify-between items-center mb-2">
                    <h2 className="font-bold text-xl text-slate-800">Level {userData.level} - <span className="text-brand-primary">{userData.levelName}</span></h2>
                    <p className="font-semibold text-slate-600">{userData.xp} / {userData.nextLevelXP} XP</p>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-4 overflow-hidden"><motion.div className="bg-gradient-to-r from-amber-400 to-yellow-500 h-4 rounded-full shadow-inner" initial={{ width: 0 }} animate={{ width: `${xpPercentage}%` }} transition={{ duration: 1, ease: 'easeOut' }}/></div>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.5 }}>
              <div className="flex justify-between items-center mb-4">
                 <h2 className="text-2xl font-bold text-slate-800">📚 My Subjects</h2>
                 <button onClick={handleOpenModal} className="bg-brand-primary text-white font-semibold px-4 py-2 rounded-lg text-sm shadow-md hover:bg-opacity-90 transition-colors">+ Add Subject</button>
              </div>
              {subjectsLoading ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <SubjectCardSkeleton />
                      <SubjectCardSkeleton />
                  </div>
              ) : subjectsData.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {subjectsData.map(subject => <SubjectCard key={subject.id} {...subject} />)}
                </div>
              ) : (
                <div className="text-slate-500 text-center bg-white/50 backdrop-blur-sm border border-slate-200 p-8 rounded-2xl">
                    <p className="text-lg font-medium">No subjects added yet.</p>
                    <button onClick={handleOpenModal} className="mt-3 text-brand-primary font-semibold hover:underline">Click “Add Subject” to get started.</button>
                </div>
              )}
            </motion.div>
          </div>

          <div className="space-y-6">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.5 }} className="bg-white/70 backdrop-blur-md p-6 rounded-2xl shadow-lg border border-slate-200 text-center">
              <p className="text-6xl">🔥</p><h3 className="text-2xl font-bold text-slate-800 mt-2">{userData.streak} Day Streak!</h3><p className="text-slate-500">Keep the flame alive!</p>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4, duration: 0.5 }} className="bg-white/70 backdrop-blur-md p-6 rounded-2xl shadow-lg border border-slate-200">
              <div className="flex justify-between items-center mb-4"><h2 className="text-xl font-bold text-slate-800">🏆 Leaderboard</h2><Link to="/leaderboard" className="text-sm font-semibold text-brand-primary hover:underline">View All</Link></div>
              <p className="text-slate-600">You are currently ranked <span className="font-bold text-brand-primary">#{userData.rank}</span>!</p>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5, duration: 0.5 }} className="bg-white/70 backdrop-blur-md p-6 rounded-2xl shadow-lg border border-slate-200">
              <h2 className="text-xl font-bold text-slate-800 mb-4">🏅 Achievements</h2>
              {userData.achievements.length > 0 ? (<div className="flex flex-wrap gap-3">{userData.achievements.map(badge => (<motion.div key={badge} whileHover={{ scale: 1.1, rotate: 5 }} className="bg-slate-100 text-slate-700 text-sm font-medium px-3 py-1 rounded-full">{badge}</motion.div>))}</div>) : (<p className="text-slate-500 text-sm">Earn achievements by completing quizzes!</p>)}
            </motion.div>
          </div>
        </div>
      </main>
    </div>

    <AnimatePresence>
        {isModalOpen && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
                <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }} className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6">
                    <h2 className="text-xl font-bold text-slate-800 mb-4">Add New Subjects</h2>
                    {isModalLoading ? (<p>Loading subjects...</p>) : (
                    <>
                        <div className="space-y-2 max-h-64 overflow-y-auto pr-2">
                            {availableSubjects.map(subject => {
                                const isAlreadyAdded = userData.subjects.includes(subject.id);
                                return (
                                    <label key={subject.id} className={`flex items-center p-3 rounded-lg transition-colors ${isAlreadyAdded ? 'bg-slate-200 text-slate-500 cursor-not-allowed' : 'bg-slate-100 hover:bg-slate-200 cursor-pointer'}`}>
                                        <input type="checkbox" className="h-5 w-5 rounded text-brand-primary focus:ring-brand-primary" checked={isAlreadyAdded || subjectsToAdd.includes(subject.id)} disabled={isAlreadyAdded} onChange={() => handleSubjectSelection(subject.id)} />
                                        <span className="ml-3 font-medium">{subject.name}</span>
                                        {isAlreadyAdded && <span className="ml-auto text-xs font-semibold text-green-600">ADDED</span>}
                                    </label>
                                )
                            })}
                        </div>
                        {availableSubjects.length === 0 && <p className="text-slate-500 text-center py-4">No other subjects found for your class.</p>}
                        <div className="flex justify-end gap-3 mt-6">
                            <button onClick={() => setIsModalOpen(false)} className="font-semibold text-slate-600 px-4 py-2 rounded-lg hover:bg-slate-100">Cancel</button>
                            <button onClick={handleAddSubjects} disabled={subjectsToAdd.length === 0} className="bg-brand-primary text-white font-bold px-6 py-2 rounded-lg disabled:opacity-50">Add Subjects</button>
                        </div>
                    </>
                    )}
                </motion.div>
            </motion.div>
        )}
    </AnimatePresence>
    </>
  );
};

export default Dashboard;