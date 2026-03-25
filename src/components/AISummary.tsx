import React from 'react';
import { Cpu, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface AISummaryProps {
  summary: string;
}

export default function AISummary({ summary }: AISummaryProps) {
  const [isGenerating, setIsGenerating] = React.useState(false);
  const [showSummary, setShowSummary] = React.useState(false);

  const handleGenerate = () => {
    setIsGenerating(true);
    setTimeout(() => {
      setIsGenerating(false);
      setShowSummary(true);
    }, 1500);
  };

  return (
    <div className="my-12 glass rounded-3xl p-8 border-primary/20 relative overflow-hidden">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-primary/10 rounded-xl">
            <Cpu className="w-6 h-6 text-primary" />
          </div>
          <h3 className="font-black text-lg uppercase tracking-widest">Automated Synthesis</h3>
        </div>
        
        {!showSummary && !isGenerating && (
          <button
            onClick={handleGenerate}
            className="px-6 py-3 bg-primary hover:bg-primary-hover text-white rounded-xl text-sm font-black uppercase tracking-widest transition-all hover:scale-105 shadow-lg shadow-primary/20 flex items-center space-x-2"
          >
            <span>Generate Summary</span>
          </button>
        )}
      </div>

      <AnimatePresence mode="wait">
        {isGenerating ? (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center py-12 space-y-6"
          >
            <Loader2 className="w-10 h-10 text-primary animate-spin" />
            <p className="text-primary/60 dark:text-primary/40 text-xs font-bold uppercase tracking-[0.3em] animate-pulse">Analyzing distributed system patterns...</p>
          </motion.div>
        ) : showSummary ? (
          <motion.div
            key="summary"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative"
          >
            <div className="absolute -left-8 top-0 bottom-0 w-1.5 bg-primary rounded-full" />
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed italic text-lg">
              {summary}
            </p>
          </motion.div>
        ) : (
          <p className="text-gray-600 dark:text-gray-400 text-sm font-medium leading-relaxed">
            Click the button to generate an automated summary of this research paper's core contributions and architectural impact.
          </p>
        )}
      </AnimatePresence>
    </div>
  );
}
