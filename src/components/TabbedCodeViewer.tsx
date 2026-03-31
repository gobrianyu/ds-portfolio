import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { FileCode, ChevronLeft, ChevronRight } from 'lucide-react';
import CodeBlock from './CodeBlock';

interface CodeFile {
  filename: string;
  description: string;
  codeUrl: string;
}

interface TabbedCodeViewerProps {
  files: CodeFile[];
}

const TabbedCodeViewer: React.FC<TabbedCodeViewerProps> = ({ files }) => {
  const [activeTab, setActiveTab] = useState(0);

  if (files.length === 0) return null;

  return (
    <div className="w-full bg-card rounded-lg border border-border overflow-hidden shadow-2xl">
      {/* Tab Bar */}
      <div className="flex items-center bg-muted/50 border-b border-border overflow-x-auto no-scrollbar">
        <div className="flex items-center gap-1.5 px-4 border-r border-border h-full">
          <div className="w-2.5 h-2.5 rounded-full bg-[#ff5f56]" />
          <div className="w-2.5 h-2.5 rounded-full bg-[#ffbd2e]" />
          <div className="w-2.5 h-2.5 rounded-full bg-[#27c93f]" />
        </div>
        {files.map((file, index) => (
          <button
            key={file.filename}
            onClick={() => setActiveTab(index)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-mono transition-all duration-200 border-r border-border whitespace-nowrap ${
              activeTab === index
                ? 'bg-card text-primary border-b-2 border-b-primary'
                : 'text-muted-foreground hover:text-foreground hover:bg-card'
            }`}
          >
            <FileCode size={14} className={activeTab === index ? 'text-primary' : 'text-muted-foreground'} />
            {file.filename}
          </button>
        ))}
      </div>

      {/* Description Bar */}
      <div className="px-4 py-2 bg-card border-b border-border">
        <p className="text-xs text-muted-foreground font-mono italic">
          // {files[activeTab].description}
        </p>
      </div>

      {/* Code Content */}
      <div className="relative">
        <AnimatePresence mode="wait">
          <motion.div
            key={files[activeTab].filename}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            <CodeBlock 
              codeUrl={files[activeTab].codeUrl} 
              filename={files[activeTab].filename}
              hideHeader={true}
              hideDescription={true}
            />
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

export default TabbedCodeViewer;
