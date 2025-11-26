import React from 'react';
import Header from './Header';
import Hero from './Hero';
import Features from './Features';
import WhyLearnQuest from './WhyLearnQuest';
import HowItWorks from './HowItWorks';
import CTASection from './CTASection';
import Footer from './Footer';

const HomeBackground = () => (
    <div className="absolute top-0 left-0 w-full h-screen -z-10 overflow-x-hidden" aria-hidden="true">
        <svg
            className="absolute -top-40 md:-top-52 lg:-top-64 left-1/2 -translate-x-1/2 w-[200%] md:w-[150%] lg:w-full max-w-none text-brand-purple"
            viewBox="0 0 1440 810"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
        >
            <path
                d="M-33 301.953L720 720L1473 301.953L1393.3 234.361L720 600.312L46.7002 234.361L-33 301.953Z"
                fill="currentColor"
            />
        </svg>
    </div>
);


const HomePage = () => {
  return (
    <div className="min-h-screen w-full bg-slate-50 relative">
      <HomeBackground />
      <div className="relative z-10">
        <Header />
        <main>
          <Hero />
          <Features />
          <WhyLearnQuest />
          <HowItWorks />
          <CTASection />
        </main>
        <Footer />
      </div>
    </div>
  );
};

export default HomePage;