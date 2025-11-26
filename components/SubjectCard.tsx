import React from 'react';
// FIX: Casting `motion` to `any` to bypass TypeScript errors caused by faulty type definitions.
import { motion as motion_ } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
const motion = motion_ as any;

export interface SubjectCardProps {
  id: string;
  name: string;
  topicCount: number;
  progress: number;
  isMissing?: boolean;
}

const getGradientClasses = (subjectName: string) => {
    const lowerName = subjectName.toLowerCase();
    if (lowerName.includes('math')) return 'from-sky-400 to-blue-600';
    if (lowerName.includes('science')) return 'from-green-400 to-emerald-500';
    if (lowerName.includes('social') || lowerName.includes('history') || lowerName.includes('opps')) return 'from-orange-400 to-yellow-500';
    if (lowerName.includes('english')) return 'from-rose-400 to-red-500';
    if (lowerName.includes('java')) return 'from-red-500 to-orange-500';
    return 'from-purple-500 to-indigo-600'; // Default
};

export const SubjectCard = ({ id, name, topicCount, progress, isMissing }: SubjectCardProps) => {
  const navigate = useNavigate();

  const handleNavigation = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isMissing) {
      navigate(`/subject/${id}`);
    }
  };

  return (
    <motion.div
      whileHover={{ scale: 1.05, y: -5 }}
      onClick={handleNavigation}
      className={`bg-white/70 backdrop-blur-md border border-slate-200 rounded-2xl shadow-lg hover:shadow-xl p-5 transition-all flex flex-col ${isMissing ? 'cursor-not-allowed' : 'cursor-pointer'}`}
    >
      <div className="flex-grow">
        <h3 className="text-xl font-semibold text-slate-800 mb-1">{name}</h3>
        {isMissing ? (
             <p className="text-sm text-red-600 font-medium mb-4">Subject data missing. Please contact admin.</p>
        ) : (
            <p className="text-gray-600 font-medium mb-4">{topicCount} Topics</p>
        )}
      </div>
      
      {!isMissing && (
        <>
            <div>
                <div className="w-full bg-slate-200 rounded-full h-2.5 my-2">
                    <motion.div
                        className={`bg-gradient-to-r ${getGradientClasses(name)} h-2.5 rounded-full`}
                        initial={{ width: 0 }}
                        animate={{ width: `${progress}%` }}
                        transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
                    />
                </div>
                <p className="text-xs text-slate-700 font-semibold text-right mb-4">{Math.round(progress)}% Complete</p>
            </div>
            <button 
                onClick={handleNavigation}
                className="mt-auto bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-4 py-2 rounded-lg text-sm text-center transition-colors w-full"
            >
                Go to Roadmap →
            </button>
        </>
      )}
    </motion.div>
  );
};

export const SubjectCardSkeleton = () => (
    <div className="bg-white/70 rounded-2xl shadow-lg p-5 animate-pulse">
        <div className="h-6 bg-slate-200 rounded w-3/4 mb-2"></div>
        <div className="h-4 bg-slate-200 rounded w-1/4 mb-4"></div>
        <div className="h-2.5 bg-slate-200 rounded-full w-full mb-1"></div>
        <div className="h-3 bg-slate-200 rounded w-1/5 ml-auto mb-4"></div>
        <div className="h-9 bg-slate-200 rounded-lg w-full"></div>
    </div>
);