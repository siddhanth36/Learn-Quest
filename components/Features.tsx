import React from 'react';
// FIX: Casting `motion` to `any` to bypass TypeScript errors caused by faulty type definitions.
import { motion as motion_ } from 'framer-motion';
const motion = motion_ as any;

const featureList = [
  {
    icon: '🏅',
    title: 'XP & Leveling System',
    description: 'Earn points as you learn and level up your skills.',
  },
  {
    icon: '🔥',
    title: 'Daily Streaks',
    description: 'Keep your learning streak alive for extra rewards.',
  },
  {
    icon: '🤖',
    title: 'AI Study Buddy',
    description: 'Your 24/7 learning companion for instant help.',
  },
   {
    icon: '🧩',
    title: 'Mini Games',
    description: 'Fun interactive quizzes and challenges to test your knowledge.',
  },
];

const cardVariants = {
  hidden: { opacity: 0, y: 50 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5
    }
  }
};

interface FeatureCardProps {
  feature: typeof featureList[0];
  index: number;
}

const FeatureCard = ({ feature, index }: FeatureCardProps) => (
  <motion.div
    className="bg-white p-8 rounded-2xl shadow-lg border border-slate-200 flex flex-col items-center text-center"
    variants={cardVariants}
    initial="hidden"
    whileInView="visible"
    viewport={{ once: true, amount: 0.5 }}
    custom={index}
    transition={{ delay: index * 0.2, duration: 0.6 }}
  >
    <div className="text-5xl mb-6">
      {feature.icon}
    </div>
    <h3 className="text-2xl font-bold text-slate-900 mb-3">{feature.title}</h3>
    <p className="text-slate-500">{feature.description}</p>
  </motion.div>
);

const Features = () => {
  return (
    <section id="features" className="py-20 sm:py-32">
      <div className="container mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-extrabold text-slate-900">
            Everything You Need to Succeed
          </h2>
          <p className="mt-4 text-lg text-slate-600 max-w-2xl mx-auto">
            LearnQuest combines cutting-edge technology with proven learning methods to create the ultimate educational experience.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {featureList.map((feature, index) => (
            <FeatureCard key={feature.title} feature={feature} index={index} />
          ))}
        </div>
      </div>
    </section>
  );
};

export default Features;