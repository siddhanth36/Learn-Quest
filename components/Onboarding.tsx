import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
// FIX: Casting `motion` to `any` to bypass TypeScript errors caused by faulty type definitions.
import { motion as motion_, AnimatePresence } from 'framer-motion';
import { auth, db } from '../firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, setDoc, serverTimestamp, collection, query, where, getDocs } from 'firebase/firestore';
const motion = motion_ as any;

const EDUCATION_BOARDS = ['CBSE', 'ICSE', 'College Stream'];
const SCHOOL_GRADES = Array.from({ length: 7 }, (_, i) => `Class ${i + 6}`);
const COLLEGE_SEMESTERS = Array.from({ length: 8 }, (_, i) => `Semester ${i + 1}`);
const TOTAL_STEPS = 2;

const ProgressBar = ({ step }: { step: number }) => (
  <div className="w-full bg-slate-200 rounded-full h-2.5 mb-8">
    <motion.div
      className="bg-gradient-to-r from-brand-secondary to-brand-primary h-2.5 rounded-full"
      initial={{ width: '0%' }}
      animate={{ width: `${(step / TOTAL_STEPS) * 100}%` }}
      transition={{ duration: 0.5, ease: 'easeInOut' }}
    />
  </div>
);

interface SubjectOption {
  id: string;
  name: string;
}

const Onboarding = () => {
  const [step, setStep] = useState(1);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    board: '',
    grade: '',
    subjects: [] as string[],
  });
  const [availableSubjects, setAvailableSubjects] = useState<SubjectOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [subjectsLoading, setSubjectsLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setCurrentUser(user);
        setFormData((prev) => ({ ...prev, name: user.displayName || '' }));
      } else {
        navigate('/login');
      }
    });
    return unsubscribe;
  }, [navigate]);

  useEffect(() => {
    const fetchSubjects = async () => {
      if (formData.board && formData.grade) {
        setSubjectsLoading(true);
        setError('');
        try {
          const q = query(collection(db, "curriculums"), where("board", "==", formData.board), where("class", "==", formData.grade));
          const querySnapshot = await getDocs(q);
          const subjects = querySnapshot.docs.map(doc => ({
            id: doc.id,
            name: doc.data().subject
          }));
          setAvailableSubjects(subjects);
        } catch (err) {
          console.error("Error fetching subjects: ", err);
          setError("Could not load subjects for your class.");
        }
        setSubjectsLoading(false);
      }
    };
    fetchSubjects();
  }, [formData.board, formData.grade]);

  const handleNext = () => {
    setError('');
    if (step === 1 && (!formData.name || !formData.board || !formData.grade)) {
      setError('Please fill out all fields.');
      return;
    }
    setStep((prev) => prev + 1);
  };

  const handlePrev = () => setStep((prev) => prev - 1);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (name === 'board' || name === 'grade') {
        setAvailableSubjects([]);
        setFormData(prev => ({...prev, subjects: []}));
    }
  };

  const handleSubjectToggle = (subjectId: string) => {
    setFormData((prev) => {
      const newSubjects = prev.subjects.includes(subjectId)
        ? prev.subjects.filter((s) => s !== subjectId)
        : [...prev.subjects, subjectId];
      return { ...prev, subjects: newSubjects };
    });
  };

  const handleSubmit = async () => {
    setError('');
    if (formData.subjects.length === 0) {
      setError('Please select at least one subject to start learning.');
      return;
    }
    if (!currentUser) {
      setError('No user logged in. Please sign in again.');
      return;
    }
    
    setLoading(true);
    try {
      const userRef = doc(db, 'users', currentUser.uid);
      await setDoc(userRef, {
        name: formData.name,
        board: formData.board,
        class: formData.grade,
        subjects: formData.subjects,
        onboardingComplete: true,
      }, { merge: true });

      navigate('/dashboard');
    } catch (err: any) {
      setError('Failed to save profile. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const gradeOptions = formData.board === 'College Stream' ? COLLEGE_SEMESTERS : SCHOOL_GRADES;

  const stepVariants = {
    hidden: { opacity: 0, x: 50 },
    visible: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -50 },
  };

  return (
    <div className="min-h-screen w-full bg-slate-100 flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_top,_rgba(79,70,229,0.08),_transparent_40%),radial-gradient(circle_at_bottom,_rgba(147,51,234,0.06),_transparent_50%)]"></div>
      <div className="relative z-10 w-full max-w-2xl">
        <motion.div
          className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl border border-slate-200 p-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="text-center mb-4">
            <h1 className="text-3xl font-bold text-slate-800">Welcome to LearnQuest! ⚡</h1>
            <p className="text-slate-500">Let's personalize your learning journey.</p>
          </div>
          
          <ProgressBar step={step} />

          {error && <p className="bg-red-100 text-red-700 p-3 rounded-lg text-sm mb-4 text-center">{error}</p>}

          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              variants={stepVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              transition={{ duration: 0.3 }}
            >
              {step === 1 && (
                <div className="space-y-6">
                   <h2 className="text-xl font-semibold text-slate-700 text-center">Step 1: About You 👤</h2>
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-slate-600 mb-1">Full Name</label>
                    <input type="text" name="name" id="name" value={formData.name} onChange={handleChange} className="w-full p-3 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary" />
                  </div>
                  <div>
                    <label htmlFor="board" className="block text-sm font-medium text-slate-600 mb-1">Education Board</label>
                    <select name="board" id="board" value={formData.board} onChange={handleChange} className="w-full p-3 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary">
                      <option value="" disabled>Select a board</option>
                      {EDUCATION_BOARDS.map(b => <option key={b} value={b}>{b}</option>)}
                    </select>
                  </div>
                   {formData.board && (
                    <div>
                      <label htmlFor="grade" className="block text-sm font-medium text-slate-600 mb-1">Class / Semester</label>
                      <select name="grade" id="grade" value={formData.grade} onChange={handleChange} className="w-full p-3 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary">
                        <option value="" disabled>Select your grade</option>
                        {gradeOptions.map(g => <option key={g} value={g}>{g}</option>)}
                      </select>
                    </div>
                  )}
                </div>
              )}

              {step === 2 && (
                 <div className="space-y-4">
                    <h2 className="text-xl font-semibold text-slate-700 text-center">Step 2: Your Subjects 📚</h2>
                    <p className="text-center text-slate-500 text-sm">Choose what you want to learn.</p>
                    {subjectsLoading ? (
                      <div className="text-center p-4">Loading subjects...</div>
                    ) : availableSubjects.length > 0 ? (
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                          {availableSubjects.map(subject => (
                              <button
                                  key={subject.id}
                                  onClick={() => handleSubjectToggle(subject.id)}
                                  className={`p-4 rounded-lg text-center font-medium transition-all duration-200 ${
                                      formData.subjects.includes(subject.id)
                                      ? 'bg-brand-primary text-white ring-2 ring-offset-2 ring-brand-primary'
                                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                                  }`}
                              >
                                  {subject.name}
                              </button>
                          ))}
                      </div>
                    ) : (
                      <p className="text-center text-slate-500 bg-slate-100 p-4 rounded-lg">No subjects have been added for your class yet. Please check back later.</p>
                    )}
                </div>
              )}
            </motion.div>
          </AnimatePresence>
          
          <div className="mt-8 flex justify-between items-center">
            <motion.button
              onClick={handlePrev}
              className="text-slate-500 font-semibold py-3 px-5 rounded-lg disabled:opacity-50"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              disabled={step === 1 || loading}
            >
              Back
            </motion.button>
            {step < TOTAL_STEPS ? (
              <motion.button
                onClick={handleNext}
                className="bg-brand-primary text-white font-bold py-3 px-8 rounded-lg shadow-lg shadow-indigo-500/30"
                whileHover={{ scale: 1.05, boxShadow: "0px 0px 20px rgba(79, 70, 229, 0.7)" }}
                whileTap={{ scale: 0.95 }}
                disabled={!formData.board || !formData.grade}
              >
                Next →
              </motion.button>
            ) : (
              <motion.button
                onClick={handleSubmit}
                className="bg-brand-accent text-white font-bold py-3 px-8 rounded-lg shadow-lg shadow-lime-500/30 disabled:opacity-50"
                whileHover={{ scale: 1.05, boxShadow: "0px 0px 20px rgba(101, 163, 13, 0.7)" }}
                whileTap={{ scale: 0.95 }}
                disabled={loading || formData.subjects.length === 0}
              >
                {loading ? 'Saving...' : 'Start Learning!'}
              </motion.button>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Onboarding;