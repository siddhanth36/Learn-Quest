import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
// FIX: Casting `motion` to `any` to bypass TypeScript errors caused by faulty type definitions.
import { motion as motion_, AnimatePresence } from 'framer-motion';
import { fetchAIResponse } from './utils';
const motion = motion_ as any;

type Message = {
  role: 'user' | 'assistant';
  content: string;
};

const AIStudyBuddy = () => {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: "Hello! I'm your AI Study Buddy, powered by Google Gemini. Ask me anything about your subjects! 🤖" }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const userPrompt = inputValue.trim();
    if (!userPrompt || isLoading) return;

    const userMessage: Message = { role: 'user', content: userPrompt };
    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);
    setError(null);

    // Updated fetchAIResponse call
    const { success, content, error } = await fetchAIResponse(userPrompt, 'study_buddy');

    if (!success) {
      setError(error || "An unknown AI error occurred.");
      const aiErrorMessage: Message = { role: 'assistant', content: "I'm having trouble connecting right now. Please try again in a moment." };
      setMessages(prev => [...prev, aiErrorMessage]);
    } else {
      const aiMessage: Message = { role: 'assistant', content: content || "AI did not return a response." };
      setMessages(prev => [...prev, aiMessage]);
    }
    
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen w-full bg-slate-100 flex flex-col items-center justify-center p-4 font-sans">
       <div className="w-full max-w-2xl h-[90vh] flex flex-col bg-white rounded-2xl shadow-2xl border border-slate-200">
            <header className="flex items-center justify-between p-4 border-b border-slate-200 flex-shrink-0">
                <div className="text-center">
                    <h1 className="text-xl font-bold text-slate-800">AI Study Buddy 🤖</h1>
                    <p className="text-sm text-slate-500">Your personal learning assistant</p>
                </div>
                <Link to="/dashboard" className="bg-slate-200 text-slate-700 font-semibold px-4 py-2 text-sm rounded-full hover:bg-slate-300 transition-colors">
                    Dashboard
                </Link>
            </header>

            <div ref={chatContainerRef} className="flex-grow p-6 overflow-y-auto space-y-6">
                <AnimatePresence>
                    {messages.map((msg, index) => (
                        <motion.div
                            key={index}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.3 }}
                            className={`flex items-end gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                        >
                            {msg.role === 'assistant' && <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center flex-shrink-0">🤖</div>}
                            <div className={`max-w-xs md:max-w-md p-3 rounded-2xl ${
                                msg.role === 'user' 
                                ? 'bg-gradient-to-r from-brand-primary to-brand-purple text-white rounded-br-lg' 
                                : 'bg-slate-700 text-slate-50 rounded-bl-lg'
                            }`}>
                                <p className="text-sm" dangerouslySetInnerHTML={{ __html: msg.content.replace(/\n/g, '<br />') }} />
                            </div>
                        </motion.div>
                    ))}
                </AnimatePresence>
                 {isLoading && (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex items-end gap-3 justify-start"
                    >
                        <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center flex-shrink-0">🤖</div>
                        <div className="max-w-xs p-3 rounded-2xl bg-slate-700 rounded-bl-lg">
                           <div className="flex items-center space-x-1">
                                <motion.div animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5]}} transition={{ duration: 1.2, repeat: Infinity }} className="w-2 h-2 bg-slate-400 rounded-full" />
                                <motion.div animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5]}} transition={{ duration: 1.2, repeat: Infinity, delay: 0.2 }} className="w-2 h-2 bg-slate-400 rounded-full" />
                                <motion.div animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5]}} transition={{ duration: 1.2, repeat: Infinity, delay: 0.4 }} className="w-2 h-2 bg-slate-400 rounded-full" />
                           </div>
                        </div>
                    </motion.div>
                 )}
            </div>

            <form onSubmit={handleSendMessage} className="p-4 border-t border-slate-200 flex-shrink-0">
                <div className="flex items-center space-x-3">
                    <input
                        type="text"
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        placeholder="Ask me anything about your subjects..."
                        className="w-full p-3 bg-slate-100 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary transition-shadow"
                        disabled={isLoading}
                    />
                    <motion.button
                        type="submit"
                        className="bg-brand-primary text-white font-bold py-3 px-6 rounded-lg shadow-lg shadow-indigo-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
                        whileHover={{ scale: isLoading ? 1 : 1.05 }}
                        whileTap={{ scale: isLoading ? 1 : 0.95 }}
                        disabled={isLoading || !inputValue.trim()}
                    >
                        Send
                    </motion.button>
                </div>
                {error && <p className="text-xs text-red-500 text-center mt-2">{error}</p>}
            </form>
       </div>
    </div>
  );
};

export default AIStudyBuddy;