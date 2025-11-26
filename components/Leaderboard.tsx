import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
// FIX: Casting `motion` to `any` to bypass TypeScript errors caused by faulty type definitions.
import { motion as motion_, AnimatePresence } from 'framer-motion';
import { auth, db } from '../firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
// FIX: Import DocumentData for type casting.
import { collection, query, orderBy, limit, getDocs, doc, getDoc, DocumentData } from "firebase/firestore";
const motion = motion_ as any;

// --- Type Definitions ---
interface LeaderboardUser {
  id: string;
  name: string;
  xp: number;
  level: number;
  levelName: string;
  role?: string;
}

interface CurrentUserStats extends LeaderboardUser {
  rank: number;
  achievements: string[];
}

interface Badge {
  name: string;
  description: string;
  icon: string;
}

// --- Constants ---
const ALL_BADGES: Badge[] = [
  { name: 'Bookworm 📚', description: 'Complete your first mission.', icon: '📚' },
  { name: 'Quick Starter ⚡', description: 'Log in for the first time.', icon: '⚡' },
  { name: 'Mission Complete! ✅', description: 'Successfully finish any mission.', icon: '✅' },
  { name: 'Perfect Score! ✨', description: 'Get all answers right in a mission.', icon: '✨' },
  { name: 'XP Hunter 🎯', description: 'Earn over 1000 total XP.', icon: '🎯' },
  { name: 'Streak Keeper 🔥', description: 'Maintain a 3-day learning streak.', icon: '🔥' },
  { name: 'Math Whiz 🧠', description: 'Complete 3 math missions.', icon: '🧠' },
  { name: 'Science Star 🔬', description: 'Complete 3 science missions.', icon: '🔬' },
];

const rankIcons = ['🥇', '🥈', '🥉'];

// --- Helper Components ---
const ConfettiPiece = ({ i }: { i: number }) => {
  const colors = ['#4F46E5', '#0891B2', '#65A30D', '#9333EA', '#F59E0B'];
  return (
    <motion.div
      className="absolute top-0 left-1/2 w-2 h-4"
      style={{ background: colors[i % colors.length] }}
      initial={{ y: -20, x: (Math.random() - 0.5) * 600, opacity: 1, rotate: Math.random() * 360 }}
      animate={{ y: '100vh', opacity: [1, 1, 0] }}
      transition={{ duration: Math.random() * 4 + 3, ease: 'linear', delay: Math.random() * 2 }}
    />
  );
};

const Confetti = () => (
  <div className="absolute inset-0 z-50 pointer-events-none overflow-hidden">
    {Array.from({ length: 150 }).map((_, i) => <ConfettiPiece key={i} i={i} />)}
  </div>
);


const Leaderboard = () => {
  const [user, setUser] = useState<User | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardUser[]>([]);
  const [currentUserStats, setCurrentUserStats] = useState<CurrentUserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [showConfetti, setShowConfetti] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        await fetchData(currentUser);
      } else {
        navigate('/login');
      }
    });
    return () => unsubscribe();
  }, [navigate]);
  
  const fetchData = async (currentUser: User) => {
    setLoading(true);
    try {
      const usersRef = collection(db, "users");
      const q = query(usersRef, orderBy("xp", "desc"), limit(10));
      const querySnapshot = await getDocs(q);
      // FIX: Spread types may only be created from object types.
      const topUsers = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...(doc.data() as Omit<LeaderboardUser, 'id'>)
      })) as LeaderboardUser[];
      setLeaderboard(topUsers);

      const allUsersQuery = query(usersRef, orderBy("xp", "desc"));
      const allUsersSnapshot = await getDocs(allUsersQuery);
      // FIX: Spread types may only be created from object types.
      const allUsers = allUsersSnapshot.docs.map(doc => ({id: doc.id, ...doc.data()}));
      const userRank = allUsers.findIndex(u => u.id === currentUser.uid) + 1;
      
      const userDocRef = doc(db, "users", currentUser.uid);
      const userDocSnap = await getDoc(userDocRef);
      if(userDocSnap.exists()) {
        // FIX: Cast DocumentData to a known type to access its properties safely.
        const userData = userDocSnap.data() as DocumentData;
        setCurrentUserStats({
          id: currentUser.uid,
          name: userData.name || "You",
          xp: userData.xp || 0,
          level: userData.level || 1,
          levelName: userData.levelName || "Learner",
          achievements: userData.achievements || [],
          rank: userRank > 0 ? userRank : allUsers.length + 1,
          role: userData.role || 'student',
        });

        // FIX: Property 'achievements' does not exist on type 'unknown'.
        if(userData.achievements?.includes('Perfect Score! ✨')) {
            setShowConfetti(true);
        }
      }
    } catch (error) {
      console.error("Error fetching leaderboard data:", error);
    } finally {
      setLoading(false);
    }
  };


  if (loading) {
    return <div className="h-screen w-full flex items-center justify-center bg-slate-100">Loading Leaderboard...</div>;
  }

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-slate-50 via-blue-100 to-purple-100 font-sans text-slate-800 p-4 sm:p-6">
      {showConfetti && <Confetti />}
      <div className="container mx-auto">
        <header className="flex justify-between items-center mb-6">
          <h1 className="text-4xl font-extrabold text-slate-900">Leaderboard & Achievements</h1>
          <Link to="/dashboard" className="bg-white text-slate-700 font-semibold px-4 py-2 text-sm rounded-full shadow-md hover:bg-slate-200 transition-colors">
            ← Back to Dashboard
          </Link>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="lg:col-span-2 bg-white/60 backdrop-blur-xl rounded-2xl shadow-xl border border-slate-200 p-6"
          >
            <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">🏆 Top Players</h2>
            <div className="space-y-3">
              {leaderboard.map((player, index) => (
                <motion.div
                  key={player.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.4, delay: index * 0.08 }}
                  className={`flex items-center p-3 rounded-lg transition-all ${
                    index < 3 ? 'bg-gradient-to-r from-yellow-100 to-amber-200' : 'bg-white/80'
                  } ${player.id === user?.uid ? 'border-2 border-brand-primary ring-2 ring-brand-primary/30' : ''}`}
                >
                  <div className="w-10 text-2xl font-bold text-center">{rankIcons[index] || index + 1}</div>
                  <div className="flex-grow mx-4">
                    <p className="font-bold text-slate-900 flex items-center gap-2">
                      {player.name}
                      {player.role === 'admin' && <span title="Admin">🛡️</span>}
                    </p>
                    <p className="text-sm text-slate-500">Level {player.level} - {player.levelName}</p>
                  </div>
                  <div className="font-bold text-lg text-amber-600">{player.xp} XP</div>
                </motion.div>
              ))}
            </div>
          </motion.div>

          <div className="space-y-6">
            {currentUserStats && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.5 }} className="bg-white/60 backdrop-blur-xl rounded-2xl shadow-xl border border-slate-200 p-6 text-center">
                 <h2 className="text-2xl font-bold mb-4">Your Stats</h2>
                 <div className="grid grid-cols-2 gap-4">
                    <div>
                        <p className="text-4xl font-bold text-brand-primary">#{currentUserStats.rank}</p>
                        <p className="text-sm text-slate-500">Your Rank</p>
                    </div>
                     <div>
                        <p className="text-4xl font-bold text-brand-accent">{currentUserStats.xp}</p>
                        <p className="text-sm text-slate-500">Total XP</p>
                    </div>
                 </div>
              </motion.div>
            )}

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4, duration: 0.5 }} className="bg-white/60 backdrop-blur-xl rounded-2xl shadow-xl border border-slate-200 p-6">
              <h2 className="text-2xl font-bold mb-4">My Achievements</h2>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-4">
                {ALL_BADGES.map(badge => {
                  const isUnlocked = currentUserStats?.achievements.includes(badge.name);
                  return (
                    <motion.div 
                      key={badge.name}
                      whileHover={{ scale: 1.1, rotate: isUnlocked ? 3 : 0 }}
                      className="flex flex-col items-center text-center group"
                      title={`${badge.name} - ${badge.description}`}
                    >
                      <div className={`w-20 h-20 rounded-full flex items-center justify-center text-4xl transition-all duration-300 ${
                        isUnlocked ? 'bg-gradient-to-br from-amber-300 to-orange-400 shadow-lg' : 'bg-slate-200'
                      }`}>
                         {isUnlocked ? badge.icon : '🔒'}
                      </div>
                       <p className={`mt-2 text-xs font-semibold ${isUnlocked ? 'text-slate-700' : 'text-slate-400'}`}>{badge.name.split(' ')[0]}</p>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Leaderboard;