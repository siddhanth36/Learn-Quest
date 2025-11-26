import React from 'react';
import { FacebookIcon, TwitterIcon, InstagramIcon } from '../constants';

const Footer = () => {
  return (
    <footer className="bg-white border-t border-slate-200">
      <div className="container mx-auto px-6 py-8">
        <div className="flex flex-col md:flex-row justify-between items-center text-center md:text-left">
          <div className="mb-4 md:mb-0">
            <span className="text-lg font-semibold text-slate-900">LearnQuest</span>
            <p className="text-slate-500 mt-1">© {new Date().getFullYear()} LearnQuest Inc. All rights reserved.</p>
          </div>
          <div className="flex space-x-6">
            <a href="#" className="text-slate-500 hover:text-brand-primary transition-colors"><TwitterIcon className="h-6 w-6" /></a>
            <a href="#" className="text-slate-500 hover:text-brand-primary transition-colors"><FacebookIcon className="h-6 w-6" /></a>
            <a href="#" className="text-slate-500 hover:text-brand-primary transition-colors"><InstagramIcon className="h-6 w-6" /></a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;