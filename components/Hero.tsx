import React from 'react';
// FIX: Casting `motion` to `any` to bypass TypeScript errors caused by faulty type definitions.
import { motion as motion_ } from 'framer-motion';
import { Link } from 'react-router-dom';
const motion = motion_ as any;

const icons = ['🎓', '📚', '🎮', '🧠', '🏆', '🧪'];

const FloatingIcons = () => {
  return (
    <div className="absolute inset-0 -z-10 h-full w-full overflow-hidden">
      {icons.map((icon, i) => (
        <motion.div
          key={i}
          className="absolute text-3xl md:text-5xl"
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 0.4, scale: 1 }}
          transition={{
            delay: Math.random() * 2,
            duration: 1.5,
            ease: 'easeOut'
          }}
          style={{
            top: `${Math.random() * 80 + 10}%`,
            left: `${Math.random() * 80 + 10}%`,
          }}
        >
          <motion.div
            animate={{
              y: [0, -10, 10, 0],
              rotate: [0, 5, -5, 0],
            }}
            transition={{
              duration: Math.random() * 8 + 6,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          >
            {icon}
          </motion.div>
        </motion.div>
      ))}
    </div>
  );
};


const Hero = () => {
  return (
    <section className="relative h-screen flex items-center justify-center text-center overflow-hidden pt-16">
      <FloatingIcons />
      <div className="container mx-auto px-6 z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <h1 className="text-5xl md:text-7xl lg:text-8xl font-extrabold text-slate-900 leading-tight">
            🎮 Turn Learning Into
            <br />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-500 via-purple-500 to-green-400">
              an Adventure!
            </span>
          </h1>
          <p className="mt-6 text-lg md:text-xl text-slate-600 max-w-2xl mx-auto">
            Earn XP. Level Up. Master Subjects the Fun Way.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row justify-center items-center space-y-4 sm:space-y-0 sm:space-x-6">
            <motion.div
              whileHover={{ scale: 1.05, y: -2, boxShadow: "0px 10px 30px rgba(79, 70, 229, 0.5)" }}
              whileTap={{ scale: 0.95 }}
            >
              <Link
                to="/signup"
                className="block bg-gradient-to-r from-brand-primary to-brand-purple text-white font-bold text-lg px-8 py-4 rounded-full shadow-lg shadow-indigo-500/40"
              >
                Start Learning →
              </Link>
            </motion.div>
            <motion.div
               whileHover={{ scale: 1.05, y: -2 }}
               whileTap={{ scale: 0.95 }}
            >
              <Link
                to="/login"
                className="block border-2 border-slate-400 text-slate-600 font-bold text-lg px-8 py-4 rounded-full hover:text-slate-900 hover:border-slate-900 transition-colors"
              >
                Admin Login →
              </Link>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default Hero;