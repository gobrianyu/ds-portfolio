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
    <div className="w-full bg-[#1a1b1e] rounded-lg border border-[#2d2e32] overflow-hidden shadow-2xl">
      {/* Tab Bar */}
      <div className="flex items-center bg-[#141517] border-b border-[#2d2e32] overflow-x-auto no-scrollbar">
        <div className="flex items-center gap-1.5 px-4 border-r border-[#2d2e32] h-full">
          <div className="w-2.5 h-2.5 rounded-full bg-[#ff5f56]" />
          <div className="w-2.5 h-2.5 rounded-full bg-[#ffbd2e]" />
          <div className="w-2.5 h-2.5 rounded-full bg-[#27c93f]" />
        </div>
        {files.map((file, index) => (
          <button
            key={file.filename}
            onClick={() => setActiveTab(index)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-mono transition-all duration-200 border-r border-[#2d2e32] whitespace-nowrap ${
              activeTab === index
                ? 'bg-[#1a1b1e] text-[#00ff9d] border-b-2 border-b-[#00ff9d]'
                : 'text-gray-500 hover:text-gray-300 hover:bg-[#1a1b1e]'
            }`}
          >
            <FileCode size={14} className={activeTab === index ? 'text-[#00ff9d]' : 'text-gray-500'} />
            {file.filename}
          </button>
        ))}
      </div>

      {/* Description Bar */}
      <div className="px-4 py-2 bg-[#1a1b1e] border-b border-[#2d2e32]">
        <p className="text-xs text-gray-400 font-mono italic">
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
