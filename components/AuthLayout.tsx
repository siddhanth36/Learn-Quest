import React from 'react';
// FIX: Casting `motion` to `any` to bypass TypeScript errors caused by faulty type definitions.
import { motion as motion_ } from 'framer-motion';
import { Link } from 'react-router-dom';
import { LogoIcon } from '../constants';
const motion = motion_ as any;

interface AuthLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle: string;
}

const containerVariants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: { 
    opacity: 1, 
    scale: 1, 
    transition: { 
      duration: 0.5,
      ease: 'easeInOut'
    }
  }
};

const AuthBackground = () => (
  <div className="absolute top-0 left-0 w-full h-full -z-20" aria-hidden="true">
      <svg
          className="absolute -top-40 md:-top-52 lg:-top-64 left-1/2 -translate-x-1/2 w-[200%] md:w-[150%] lg:w-full max-w-none"
          viewBox="0 0 1440 810"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
      >
          <path
              d="M-33 301.953L720 720L1473 301.953L1393.3 234.361L720 600.312L46.7002 234.361L-33 301.953Z"
              fill="currentColor"
              className="text-brand-primary"
          />
      </svg>
  </div>
);

const FloatingShapes = () => (
  <div className="absolute inset-0 -z-10">
    <motion.div
      className="absolute top-[10%] left-[5%] w-32 h-32 bg-purple-200 rounded-full opacity-30"
      animate={{ y: [-20, 20, -20], x: [-10, 10, -10] }}
      transition={{ duration: 20, repeat: Infinity, ease: 'easeInOut' }}
    />
    <motion.div
      className="absolute bottom-[15%] right-[10%] w-48 h-48 bg-blue-200 rounded-2xl opacity-20 transform rotate-45"
      animate={{ y: [30, -30, 30], x: [15, -15, 15], rotate: [45, 65, 45] }}
      transition={{ duration: 25, repeat: Infinity, ease: 'easeInOut' }}
    />
     <motion.div
      className="absolute top-[25%] right-[20%] w-24 h-24 bg-green-200 rounded-full opacity-20"
      animate={{ y: [10, -10, 10], x: [-20, 20, -20] }}
      transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
    />
  </div>
);

const AuthLayout = ({ children, title, subtitle }: AuthLayoutProps) => {
  return (
    <div className="min-h-screen w-full bg-slate-50 flex items-center justify-center p-4 relative">
      <AuthBackground />
      <FloatingShapes />
      <motion.div
        className="relative z-10 w-full max-w-md bg-white/70 backdrop-blur-xl rounded-2xl shadow-2xl shadow-slate-300/30 border border-slate-200 p-8"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center justify-center space-x-2 mb-4">
            <LogoIcon className="h-10 w-10 text-brand-primary" />
            <span className="text-3xl font-bold text-slate-900">LearnQuest</span>
          </Link>
          <h2 className="text-2xl font-bold text-slate-800">{title}</h2>
          <p className="text-slate-500">{subtitle}</p>
        </div>
        {children}
      </motion.div>
    </div>
  );
};

export default AuthLayout;