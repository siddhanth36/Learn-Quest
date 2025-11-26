import React from 'react';
// FIX: Casting `motion` to `any` to bypass TypeScript errors caused by faulty type definitions.
import { motion as motion_ } from 'framer-motion';
import { Link } from 'react-router-dom';
const motion = motion_ as any;

const CTASection = () => {
  return (
    <section className="py-20 sm:py-32">
      <div className="container mx-auto px-6 text-center">
        <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, amount: 0.5 }}
            transition={{ duration: 0.7 }}
            className="bg-gradient-to-r from-brand-primary to-brand-purple rounded-3xl p-10 md:p-16 shadow-2xl shadow-indigo-300"
        >
          <h2 className="text-4xl md:text-5xl font-extrabold text-white">
            🚀 Start Your Learning Adventure Now!
          </h2>
          <p className="mt-4 text-lg text-indigo-100 max-w-2xl mx-auto">
            Join thousands of students and educators transforming learning into an unforgettable experience.
          </p>
          <div className="mt-10">
             <motion.div
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95 }}
                className="inline-block"
             >
                <Link
                    to="/signup"
                    className="bg-white text-brand-primary font-bold text-xl px-10 py-5 rounded-full shadow-lg"
                >
                    Join Now
                </Link>
             </motion.div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default CTASection;