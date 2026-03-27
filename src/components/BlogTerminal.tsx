import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Terminal, Cpu } from 'lucide-react';

interface BlogTerminalProps {
  text: string;
  title?: string;
}

const BlogTerminal: React.FC<BlogTerminalProps> = ({ text, title = "AI_SUMMARY.bin" }) => {
  const [displayedText, setDisplayedText] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  useEffect(() => {
    let index = 0;
    let intervalId: NodeJS.Timeout;

    if (isTyping) {
      setDisplayedText('');
      intervalId = setInterval(() => {
        if (index < text.length) {
          setDisplayedText(text.substring(0, index + 1));
          index++;
        } else {
          clearInterval(intervalId);
          setIsTyping(false);
        }
      }, 20);
    }

    return () => clearInterval(intervalId);
  }, [isTyping, text]);

  // Start typing when component mounts
  useEffect(() => {
    setIsTyping(true);
  }, []);

  return (
    <div className="terminal-window border-white/5 overflow-hidden shadow-2xl bg-black/40 backdrop-blur-md">
      <div className="terminal-header bg-white/5 flex items-center justify-between px-4 py-2">
        <div className="flex items-center space-x-2">
          <div className="flex space-x-1.5">
            <div className="w-3 h-3 rounded-full bg-[#ff5f56] shadow-[0_0_10px_rgba(255,95,86,0.3)]" />
            <div className="w-3 h-3 rounded-full bg-[#ffbd2e] shadow-[0_0_10px_rgba(255,189,46,0.3)]" />
            <div className="w-3 h-3 rounded-full bg-[#27c93f] shadow-[0_0_10px_rgba(39,201,63,0.3)]" />
          </div>
          <div className="h-4 w-[1px] bg-white/10 mx-2" />
          <div className="flex items-center space-x-2">
            <Cpu className="w-3 h-3 text-primary animate-pulse" />
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{title}</span>
          </div>
        </div>
        <div className="flex items-center space-x-2 text-[10px] font-mono text-gray-500">
          <span>{text.length} bytes</span>
        </div>
      </div>
      <div className="p-6 font-mono text-sm leading-relaxed relative">
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_50%,rgba(0,255,157,0.05),transparent)] pointer-events-none" />
        <div className="flex items-start space-x-2">
          <span className="text-primary shrink-0 mt-1">
            <Terminal size={14} />
          </span>
          <div className="text-gray-300">
            {displayedText}
            {isTyping && (
              <motion.span
                animate={{ opacity: [1, 0] }}
                transition={{ duration: 0.8, repeat: Infinity }}
                className="inline-block w-2 h-4 bg-primary ml-1 align-middle"
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BlogTerminal;
