

import React from 'react';
// FIX: Casting `motion` to `any` to bypass TypeScript errors caused by faulty type definitions.
import { motion as motion_ } from 'framer-motion';
const motion = motion_ as any;

const steps = [
  {
    number: '01',
    title: 'Upload Curriculum',
    description: 'Admins easily upload the syllabus via PDF or manual entry. Our AI helps structure it into missions.',
  },
  {
    number: '02',
    title: 'Learn & Compete',
    description: 'Students complete missions, take quizzes, and challenge friends, earning points and climbing the leaderboard.',
  },
  {
    number: '03',
    title: 'Track & Grow',
    description: 'Monitor progress with detailed analytics. Students see their growth, and admins track class performance.',
  },
];

const containerVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.3
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, x: -50 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.7 } }
};

const HowItWorks = () => {
  return (
    <section id="how-it-works" className="py-20 sm:py-32 bg-slate-900">
      <div className="container mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-extrabold text-white">
            Get Started in 3 Simple Steps
          </h2>
          <p className="mt-4 text-lg text-slate-400">
            It's never been easier to revolutionize your classroom.
          </p>
        </div>
        <motion.div
          className="relative"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
        >
          <div className="absolute left-1/2 top-0 bottom-0 w-px bg-slate-700 hidden md:block" />
          {steps.map((step, index) => (
            <motion.div
              key={index}
              className="flex flex-col md:flex-row items-center mb-16 md:mb-8"
              variants={itemVariants}
            >
              <div className={`flex-1 ${index % 2 === 0 ? 'md:pr-12 md:text-right' : 'md:pl-12 md:order-2'}`}>
                <h3 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-green-400 mb-2">{step.title}</h3>
                <p className="text-slate-400">{step.description}</p>
              </div>
              <div className="flex-shrink-0 md:order-1">
                <div className="w-20 h-20 rounded-full bg-slate-800 border-2 border-slate-700 flex items-center justify-center text-3xl font-bold text-white shadow-lg my-4 md:my-0">
                  {step.number}
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default HowItWorks;