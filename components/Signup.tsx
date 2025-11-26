import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
// FIX: Casting `motion` to `any` to bypass TypeScript errors caused by faulty type definitions.
import { motion as motion_ } from 'framer-motion';
import { auth, db, googleProvider } from '../firebase';
import { createUserWithEmailAndPassword, signInWithPopup, UserCredential } from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import AuthLayout from './AuthLayout';
const motion = motion_ as any;

const Signup = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  
  const createUserDocument = async (userCred: UserCredential) => {
    const user = userCred.user;
    if (user) {
        const userDocRef = doc(db, "users", user.uid);
        await setDoc(userDocRef, {
            uid: user.uid,
            name: name || user.displayName,
            email: user.email,
            createdAt: serverTimestamp(),
            role: 'student',
            xp: 0,
            streak: 0,
            achievements: ['Quick Starter ⚡'],
            level: 1,
            levelName: 'Newbie Learner',
            nextLevelXP: 1000,
            lastMissionCompletedAt: null,
        });
    }
  }

  const handleEmailSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      await createUserDocument(userCredential);
      navigate('/onboarding');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignup = async () => {
    setLoading(true);
    setError(null);
    try {
      const userCredential = await signInWithPopup(auth, googleProvider);
      await createUserDocument(userCredential);
      navigate('/onboarding');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout title="Create Your Account" subtitle="Join the adventure and start learning today!">
      <form onSubmit={handleEmailSignup} className="space-y-4">
        {error && <p className="bg-red-100 text-red-700 p-3 rounded-lg text-sm">{error}</p>}
        <div className="relative">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3">👤</span>
          <input
            type="text"
            placeholder="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-slate-100 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary"
            required
          />
        </div>
        <div className="relative">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3">✉️</span>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-slate-100 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary"
            required
          />
        </div>
        <div className="relative">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3">🔒</span>
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-slate-100 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary"
            required
          />
        </div>
        <div className="relative">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3">🔒</span>
          <input
            type="password"
            placeholder="Confirm Password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-slate-100 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary"
            required
          />
        </div>
        <motion.button
          type="submit"
          className="w-full bg-gradient-to-r from-brand-primary to-brand-purple text-white font-bold py-3 px-4 rounded-lg shadow-lg disabled:opacity-50"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          disabled={loading}
        >
          {loading ? 'Creating Account...' : 'Create Account'}
        </motion.button>
      </form>
      <div className="relative flex py-5 items-center">
        <div className="flex-grow border-t border-gray-300"></div>
        <span className="flex-shrink mx-4 text-gray-400">OR</span>
        <div className="flex-grow border-t border-gray-300"></div>
      </div>
      <motion.button
        onClick={handleGoogleSignup}
        className="w-full flex items-center justify-center gap-2 bg-white border border-slate-300 text-slate-700 font-semibold py-3 px-4 rounded-lg shadow-sm"
        whileHover={{ scale: 1.02, boxShadow: "0px 4px 15px rgba(0, 0, 0, 0.05)" }}
        whileTap={{ scale: 0.98 }}
        disabled={loading}
      >
        <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google logo" className="w-5 h-5"/>
        Sign up with Google
      </motion.button>
      <p className="text-center text-sm text-slate-500 mt-6">
        Already have an account?{' '}
        <Link to="/login" className="font-semibold text-brand-primary hover:underline">
          Login here
        </Link>
      </p>
    </AuthLayout>
  );
};

export default Signup;