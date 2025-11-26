import React, { useState, useEffect } from 'react';
// FIX: Casting `motion` to `any` to bypass TypeScript errors caused by faulty type definitions.
import { motion as motion_ } from 'framer-motion';
import { Link } from 'react-router-dom';
import { LogoIcon } from '../constants';
const motion = motion_ as any;

const Header = () => {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <motion.header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? 'bg-white/80 backdrop-blur-lg shadow-md' : 'bg-transparent'
      }`}
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="container mx-auto px-6 py-4 flex justify-between items-center">
        <Link to="/" className="flex items-center space-x-2">
          <LogoIcon className="h-8 w-8 text-brand-primary" />
          <span className="text-2xl font-bold text-slate-900">LearnQuest ⚡</span>
        </Link>
        <nav className="hidden md:flex items-center space-x-8">
          <Link to="/" className="text-slate-600 hover:text-brand-primary transition-colors font-medium">Home</Link>
          <a href="#why-learnquest" className="text-slate-600 hover:text-brand-primary transition-colors font-medium">About</a>
        </nav>
        <div className="flex items-center space-x-4">
          <Link
            to="/login"
            className="text-slate-600 hover:text-brand-primary transition-colors font-medium"
          >
            Login
          </Link>
          <motion.a
            href="/signup"
            className="bg-brand-primary text-white font-semibold px-5 py-2 rounded-full shadow-lg shadow-indigo-500/30"
            whileHover={{ scale: 1.05, boxShadow: "0px 0px 20px rgba(79, 70, 229, 0.7)" }}
            whileTap={{ scale: 0.95 }}
          >
            Sign Up
          </motion.a>
        </div>
      </div>
    </motion.header>
  );
};

export default Header;