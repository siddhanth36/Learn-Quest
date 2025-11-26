import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
// FIX: Casting `motion` to `any` to bypass TypeScript errors caused by faulty type definitions.
import { motion as motion_, AnimatePresence } from 'framer-motion';
import { auth, db } from '../firebase';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import { doc, getDoc, collection, query, orderBy, getDocs, setDoc, serverTimestamp, deleteDoc, DocumentData } from 'firebase/firestore';
import { fetchAIResponse } from './utils';
const motion = motion_ as any;

interface Topic {
  topicName: string;
  notes: string;
  quiz: any[];
  xp: number;
}
interface Unit {
  title: string;
  topics: Topic[];
}
interface Curriculum {
  id: string;
  board: string;
  class: string;
  subject: string;
  units: Unit[];
  createdAt?: any;
}
interface StructuredData {
  units: Unit[];
}

const EDUCATION_BOARDS = ['CBSE', 'ICSE', 'College Stream'];
const SCHOOL_GRADES = Array.from({ length: 7 }, (_, i) => `Class ${i + 6}`);
const COLLEGE_SEMESTERS = Array.from({ length: 8 }, (_, i) => `Semester ${i + 1}`);

/**
 * Normalizes the AI-generated curriculum data to ensure units and topics are always arrays.
 * This prevents data structure inconsistencies in Firestore.
 * @param data The raw structured data from the AI.
 * @returns A normalized curriculum object with guaranteed arrays for units and topics.
 */
function normalizeCurriculum(data: StructuredData): StructuredData {
  if (!data) return { units: [] };

  // Normalize units: Ensure it's an array.
  let units = Array.isArray(data.units)
    ? data.units
    : Object.values(data.units || {});

  // FIX: Explicitly type `unit` as `any` to handle unstructured AI responses where `unit`'s shape is not guaranteed.
  units = units.map((unit: any) => {
    if (!unit) return { title: 'Untitled', topics: [] };

    // Normalize topics: Ensure it's an array within each unit.
    let topics = Array.isArray(unit.topics)
      ? unit.topics
      : Object.values(unit.topics || {});

    // FIX: Explicitly type `topic` as `any` to handle cases where it might not be a perfectly formed object.
    topics = topics.map((topic: any) => {
       if (!topic) return { topicName: 'Untitled Topic', notes: '', quiz: [], xp: 10 };
      // Normalize quiz and ensure default XP.
      const quiz = Array.isArray(topic.quiz)
        ? topic.quiz
        : Object.values(topic.quiz || {});
      
      return {
        ...topic,
        quiz,
        xp: topic.xp ?? 10, // Provide a default XP value if missing
      };
    });

    return {
      ...unit,
      topics,
    };
  });

  return {
    ...data,
    // FIX: Cast the normalized `units` array to `Unit[]` to satisfy the function's return type.
    units: units as Unit[],
  };
}


const AdminDashboard = () => {
    const navigate = useNavigate();
    const [user, setUser] = useState<User | null>(null);
    const [isAdmin, setIsAdmin] = useState(false);
    const [loading, setLoading] = useState(true);

    const [board, setBoard] = useState('');
    const [grade, setGrade] = useState('');
    const [subject, setSubject] = useState('');
    const [syllabusText, setSyllabusText] = useState('');
    
    const [isAiLoading, setIsAiLoading] = useState(false);
    const [aiStatus, setAiStatus] = useState('');
    const [aiError, setAiError] = useState('');
    const [structuredData, setStructuredData] = useState<StructuredData | null>(null);
    
    const [curriculums, setCurriculums] = useState<Curriculum[]>([]);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            if (currentUser) {
                setUser(currentUser);
                const userDocRef = doc(db, 'users', currentUser.uid);
                const userDocSnap = await getDoc(userDocRef);
                if (userDocSnap.exists() && (userDocSnap.data() as DocumentData)?.role === 'admin') {
                    setIsAdmin(true);
                } else {
                    navigate('/dashboard');
                }
            } else {
                navigate('/login');
            }
            setLoading(false);
        });
        return () => unsubscribe();
    }, [navigate]);

    const fetchCurriculums = useCallback(async () => {
        const curriculumsCollection = collection(db, 'curriculums');
        const q = query(curriculumsCollection, orderBy('createdAt', 'desc'));
        const querySnapshot = await getDocs(q);
        const curriculumsList = querySnapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as Omit<Curriculum, 'id'>) }));
        setCurriculums(curriculumsList);
    }, []);

    useEffect(() => {
        if (isAdmin) {
            fetchCurriculums();
        }
    }, [isAdmin, fetchCurriculums]);

    const handleGenerateStructure = async () => {
        if (!syllabusText.trim()) {
            setAiError('Syllabus text cannot be empty.');
            return;
        }
        setIsAiLoading(true);
        setAiError('');
        setStructuredData(null);
        setAiStatus('Structuring syllabus...');

        const structurePrompt = syllabusText; // The prompt content itself is the syllabus text

        // Updated fetchAIResponse call for syllabus structuring
        const structureRes = await fetchAIResponse(structurePrompt, 'syllabus_structure');

        if (!structureRes.success || !structureRes.content) {
            setAiError(`⚠️ AI failed to structure syllabus: ${structureRes.error}`);
            setIsAiLoading(false);
            return;
        }
        
        try {
            const parsedData = JSON.parse(structureRes.content);
            if (!parsedData.units) {
                throw new Error("AI returned data in an unexpected format. Expected a 'units' key.");
            }
            
            setAiStatus('Generating detailed notes for each topic...');
            
            // Temporarily cast to allow processing before final normalization
            let tempUnits = Array.isArray(parsedData.units) ? parsedData.units : Object.values(parsedData.units);

            const notesGenerationPromises = tempUnits.map(async (unit: any) => {
                let tempTopics = Array.isArray(unit.topics) ? unit.topics : Object.values(unit.topics);

                const topicPromises = tempTopics.map(async (topic: any) => {
                    const notesPromptContent = topic.topicName; // The topic name is the content for notes generation
                    // Updated fetchAIResponse call for notes generation
                    const notesRes = await fetchAIResponse(notesPromptContent, 'notes_generation');
                    return {
                        topicName: topic.topicName,
                        notes: notesRes.success && notesRes.content ? notesRes.content : '<p>Notes could not be generated for this topic.</p>',
                        quiz: [], // Quiz is always generated on demand by the student
                        xp: 10, // Default XP value for a topic
                    };
                });
                const topicsWithNotes = await Promise.all(topicPromises);
                return { ...unit, topics: topicsWithNotes };
            });

            const unitsWithNotes = await Promise.all(notesGenerationPromises);
            setStructuredData({ units: unitsWithNotes as Unit[] });
    
        } catch (err: any) {
            setAiError(`⚠️ AI process failed: ${err.message}. Raw response: ${structureRes.content}`);
        } finally {
            setIsAiLoading(false);
            setAiStatus('');
        }
    };

    const handleSaveCurriculum = async () => {
        if (!structuredData || !board || !grade || !subject) {
            setAiError('Missing details. Please select board, class, and subject.');
            return;
        }
        setIsSaving(true);
        setAiError('');
        const docId = `${board.replace(/\s+/g, '-')}_${grade.replace(/\s+/g, '-')}_${subject.replace(/\s+/g, '-')}`.toLowerCase();
        
        try {
            const normalizedData = normalizeCurriculum(structuredData);

            const curriculumDocRef = doc(db, 'curriculums', docId);
            await setDoc(curriculumDocRef, {
                board,
                class: grade,
                subject,
                units: normalizedData.units,
                createdAt: serverTimestamp(),
            });
            setStructuredData(null);
            setSyllabusText('');
            setBoard('');
            setGrade('');
            setSubject('');
            await fetchCurriculums();
        } catch (err) {
            console.error(err);
            setAiError('Failed to save curriculum.');
        } finally {
            setIsSaving(false);
        }
    };
    
    const handleDeleteCurriculum = async (id: string) => {
        if (window.confirm('Are you sure you want to delete this curriculum? This action cannot be undone.')) {
            await deleteDoc(doc(db, 'curriculums', id));
            await fetchCurriculums();
        }
    };

    const handleLogout = async () => {
        await signOut(auth);
        navigate('/login');
    };

    const gradeOptions = board === 'College Stream' ? COLLEGE_SEMESTERS : SCHOOL_GRADES;

    if (loading) return <div className="h-screen w-full flex items-center justify-center bg-slate-100">Verifying Access...</div>;
    if (!isAdmin) return <div className="h-screen w-full flex items-center justify-center bg-red-50 text-red-700">Access Denied. Redirecting...</div>;

    return (
        <div className="min-h-screen w-full bg-slate-100 font-sans p-4 sm:p-6">
            <div className="container mx-auto">
                <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white p-4 rounded-xl shadow-md mb-6">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800">LearnQuest Admin Panel 🏫</h1>
                        <p className="text-sm text-slate-500 mt-1">Manage curriculum and AI-generated learning content.</p>
                    </div>
                    <div className="flex items-center space-x-4 mt-3 sm:mt-0">
                        <p className="text-sm text-slate-600 hidden md:block">Welcome, {user?.displayName || 'Admin'}</p>
                        <button onClick={handleLogout} className="text-sm font-semibold text-brand-primary hover:underline">Logout</button>
                    </div>
                </header>

                <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                    <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="lg:col-span-2 bg-white p-6 rounded-xl shadow-md space-y-4">
                        <h2 className="text-xl font-bold text-slate-800 border-b pb-2">Upload New Curriculum</h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="text-sm font-medium text-slate-600">Board</label>
                                <select value={board} onChange={(e) => setBoard(e.target.value)} className="w-full mt-1 p-2 border rounded-md bg-slate-50 focus:ring-2 focus:ring-brand-primary focus:border-transparent outline-none"><option value="" disabled>Select Board</option>{EDUCATION_BOARDS.map(b => <option key={b} value={b}>{b}</option>)}</select>
                            </div>
                            <div>
                                <label className="text-sm font-medium text-slate-600">Class/Semester</label>
                                <select value={grade} onChange={(e) => setGrade(e.target.value)} className="w-full mt-1 p-2 border rounded-md bg-slate-50 focus:ring-2 focus:ring-brand-primary focus:border-transparent outline-none" disabled={!board}><option value="" disabled>Select Grade</option>{gradeOptions.map(g => <option key={g} value={g}>{g}</option>)}</select>
                            </div>
                        </div>
                        <div>
                            <label className="text-sm font-medium text-slate-600">Subject</label>
                            <input type="text" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="e.g., Science" className="w-full mt-1 p-2 border rounded-md bg-slate-50 focus:ring-2 focus:ring-brand-primary focus:border-transparent outline-none"/>
                        </div>
                        <div>
                            <label className="text-sm font-medium text-slate-600">Syllabus Content</label>
                            <textarea value={syllabusText} onChange={(e) => setSyllabusText(e.target.value)} rows={8} placeholder="Paste syllabus text here..." className="w-full mt-1 p-2 border rounded-md bg-slate-50 focus:ring-2 focus:ring-brand-primary focus:border-transparent outline-none"></textarea>
                        </div>
                        
                        <motion.button onClick={handleGenerateStructure} disabled={isAiLoading || !syllabusText} className="w-full bg-brand-primary text-white font-bold py-3 rounded-lg shadow-lg disabled:opacity-50 flex items-center justify-center gap-2" whileHover={{ scale: (isAiLoading || !syllabusText) ? 1 : 1.02 }} whileTap={{ scale: (isAiLoading || !syllabusText) ? 1 : 0.98 }}>
                            {isAiLoading ? (<><svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>{aiStatus || 'AI is generating...'}</>) : '🤖 Generate Notes with AI'}
                        </motion.button>
                        {aiError && <p className="text-sm text-red-500 text-center mt-2">{aiError}</p>}
                    </motion.div>
                    
                    <div className="lg:col-span-3 space-y-6">
                       <AnimatePresence>
                        {structuredData && (
                            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="bg-white p-6 rounded-xl shadow-md overflow-hidden">
                                <h2 className="text-xl font-bold text-slate-800">AI Generated Preview</h2>
                                <div className="max-h-64 overflow-y-auto my-4 pr-2 space-y-3">
                                    {structuredData.units.map((unit, i) => (<div key={i} className="bg-slate-50 p-3 rounded-md border"><p className="font-semibold">{unit.title}</p><p className="text-sm text-slate-600">Topics: {unit.topics.map(t => t.topicName).join(', ')}</p></div>))}
                                </div>
                                <div className="flex justify-end gap-3 border-t pt-4">
                                    <button onClick={() => setStructuredData(null)} className="font-semibold text-slate-600 px-4 py-2 rounded-lg hover:bg-slate-100">Discard</button>
                                    <motion.button onClick={handleSaveCurriculum} disabled={isSaving} className="bg-brand-accent text-white font-bold px-6 py-2 rounded-lg disabled:opacity-50" whileHover={{ scale: isSaving ? 1 : 1.05 }}>{isSaving ? 'Saving...' : '✅ Save Curriculum'}</motion.button>
                                </div>
                            </motion.div>
                        )}
                       </AnimatePresence>
                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-white p-6 rounded-xl shadow-md">
                            <h2 className="text-xl font-bold text-slate-800 border-b pb-2 mb-4">Uploaded Curriculums</h2>
                            <div className="space-y-3 max-h-[30rem] overflow-y-auto pr-2">
                                {curriculums.map(c => (<motion.div key={c.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border"><div><p className="font-semibold">{c.subject}</p><p className="text-sm text-slate-500">{c.board} - {c.class}</p></div><button onClick={() => handleDeleteCurriculum(c.id)} className="text-red-500 hover:text-red-700 p-2 rounded-full hover:bg-red-100 transition-colors"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button></motion.div>))}
                                {curriculums.length === 0 && <p className="text-slate-500 text-center py-4">No curriculums uploaded yet.</p>}
                            </div>
                        </motion.div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminDashboard;