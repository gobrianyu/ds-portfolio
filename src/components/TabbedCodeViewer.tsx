import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { FileCode, MessageSquare, MessageSquareOff } from 'lucide-react';
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
  const [showComments, setShowComments] = useState(true);

  if (files.length === 0) return null;

  return (
    <div className="w-full bg-card rounded-lg border border-border overflow-hidden shadow-2xl">
      {/* Tab Bar */}
      <div className="flex items-center justify-between bg-muted/50 border-b border-border overflow-hidden">
        <div className="flex items-center flex-1 min-w-0 h-full">
          <div className="hidden xs:flex items-center gap-1.5 px-3 sm:px-4 border-r border-border h-full py-4 shrink-0">
            <div className="w-2.5 h-2.5 rounded-full bg-[#ff5f56]" />
            <div className="w-2.5 h-2.5 rounded-full bg-[#ffbd2e]" />
            <div className="w-2.5 h-2.5 rounded-full bg-[#27c93f]" />
          </div>
          <div className="flex items-center flex-1 min-w-0 overflow-x-auto no-scrollbar h-full">
            {files.map((file, index) => (
              <button
                key={file.filename}
                onClick={() => setActiveTab(index)}
                className={`flex items-center gap-2 px-3 sm:px-4 py-3 text-sm font-mono transition-all duration-200 border-r border-border h-full min-w-0 flex-1 sm:flex-none max-w-[160px] sm:max-w-none relative group ${
                  activeTab === index
                    ? 'bg-card text-primary border-b-2 border-b-primary'
                    : 'text-muted-foreground hover:text-foreground hover:bg-card'
                }`}
              >
                <FileCode size={14} className={`shrink-0 ${activeTab === index ? 'text-primary' : 'text-muted-foreground'}`} />
                <span className="truncate block relative pr-2">
                  {file.filename}
                  {/* Fade effect for long filenames */}
                  <div className={`absolute inset-y-0 right-0 w-4 pointer-events-none bg-gradient-to-l ${
                    activeTab === index ? 'from-card' : 'from-muted/50 group-hover:from-card'
                  } to-transparent`} />
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Comment Toggle */}
        <div className="px-2 sm:px-4 flex items-center shrink-0">
          <button
            onClick={() => setShowComments(!showComments)}
            className={`flex items-center gap-2 px-2 sm:px-3 py-1.5 rounded-md text-[10px] font-black uppercase tracking-widest transition-all border ${
              showComments 
                ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20 hover:bg-emerald-500/20' 
                : 'bg-muted text-muted-foreground border-border hover:bg-muted/80'
            }`}
            title={showComments ? "Hide Comments" : "Show Comments"}
          >
            {showComments ? <MessageSquare size={12} className="shrink-0" /> : <MessageSquareOff size={12} className="shrink-0" />}
            <span className="hidden md:inline">{showComments ? "Comments: ON" : "Comments: OFF"}</span>
          </button>
        </div>
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
            key={`${files[activeTab].filename}-${showComments}`}
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
              showComments={showComments}
            />
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

export default TabbedCodeViewer;
