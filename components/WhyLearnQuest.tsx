import React from 'react';
// FIX: Casting `motion` to `any` to bypass TypeScript errors caused by faulty type definitions.
import { motion as motion_ } from 'framer-motion';
import { TargetIcon, SparklesIcon, TrophyIcon } from '../constants';
const motion = motion_ as any;

const whyList = [
  {
    icon: <TargetIcon className="h-10 w-10 text-brand-primary" />,
    title: 'Gamified Learning Experience',
    description: 'Engage with your studies like never before. Our platform turns curriculum into exciting quests and challenges.',
  },
  {
    icon: <SparklesIcon className="h-10 w-10 text-brand-purple" />,
    title: 'Personalized AI Support',
    description: 'Get tailored guidance from our AI Study Buddy, ensuring you understand concepts and stay on track.',
  },
  {
    icon: <TrophyIcon className="h-10 w-10 text-brand-accent" />,
    title: 'Motivating Rewards',
    description: 'Earn badges, XP, and streaks. See your progress and compete with friends on the leaderboard.',
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

interface WhyCardProps {
  item: typeof whyList[0];
  index: number;
}

const WhyCard = ({ item, index }: WhyCardProps) => (
  <motion.div
    className="bg-white/60 backdrop-blur-sm p-8 rounded-2xl shadow-lg border border-slate-200"
    variants={cardVariants}
    initial="hidden"
    whileInView="visible"
    viewport={{ once: true, amount: 0.5 }}
    custom={index}
    transition={{ delay: index * 0.2, duration: 0.6 }}
  >
    <div className="flex items-center space-x-4 mb-4">
      <div className="p-3 bg-white rounded-full shadow-md">
        {item.icon}
      </div>
      <h3 className="text-xl font-bold text-slate-900">{item.title}</h3>
    </div>
    <p className="text-slate-600">{item.description}</p>
  </motion.div>
);

const WhyLearnQuest = () => {
  return (
    <section id="why-learnquest" className="py-20 sm:py-32 bg-slate-100/70">
      <div className="container mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-extrabold text-slate-900">
            Why LearnQuest?
          </h2>
          <p className="mt-4 text-lg text-slate-600 max-w-2xl mx-auto">
            We're revolutionizing education by making it more effective, engaging, and fun for everyone involved.
          </p>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {whyList.map((item, index) => (
            <WhyCard key={item.title} item={item} index={index} />
          ))}
        </div>
      </div>
    </section>
  );
};

export default WhyLearnQuest;