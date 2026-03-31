import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { FileCode, Terminal, Loader2 } from 'lucide-react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { atomDark, prism } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { useTheme } from '../context/ThemeContext';

interface CodeBlockProps {
  filename: string;
  description?: string;
  code?: string;
  codeUrl?: string;
  index?: number;
  hideHeader?: boolean;
  hideDescription?: boolean;
}

export default function CodeBlock({ 
  filename, 
  description, 
  code: initialCode, 
  codeUrl, 
  index = 0,
  hideHeader = false,
  hideDescription = false
}: CodeBlockProps) {
  const { theme } = useTheme();
  const [code, setCode] = useState<string>(initialCode || '');
  const [loading, setLoading] = useState<boolean>(!!codeUrl && !initialCode);
  const [error, setError] = useState<string | null>(null);

  const getLanguage = (filename: string) => {
    const ext = filename.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'java': return 'java';
      case 'js': return 'javascript';
      case 'ts': return 'typescript';
      case 'tsx': return 'tsx';
      case 'jsx': return 'jsx';
      case 'py': return 'python';
      case 'go': return 'go';
      case 'cpp': return 'cpp';
      case 'c': return 'c';
      case 'html': return 'html';
      case 'css': return 'css';
      case 'json': return 'json';
      case 'md': return 'markdown';
      default: return 'text';
    }
  };

  useEffect(() => {
    if (codeUrl && !initialCode) {
      setLoading(true);
      fetch(codeUrl)
        .then(res => {
          if (!res.ok) throw new Error(`Failed to fetch code: ${res.statusText}`);
          return res.text();
        })
        .then(text => {
          setCode(text);
          setLoading(false);
        })
        .catch(err => {
          console.error(err);
          setError(err.message);
          setLoading(false);
        });
    }
  }, [codeUrl, initialCode]);

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      whileInView={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.1 }}
      viewport={{ once: true }}
      className={hideHeader ? "" : "mb-8"}
    >
      {!hideHeader && (
        <div className="flex items-center justify-between bg-muted px-4 py-2 rounded-t-xl border-x border-t border-border">
          <div className="flex items-center space-x-2">
            <FileCode className="w-4 h-4 text-primary" />
            <span className="text-xs font-mono text-foreground font-bold">{filename}</span>
          </div>
          <div className="flex space-x-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-rose-500/50" />
            <div className="w-2.5 h-2.5 rounded-full bg-amber-500/50" />
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/50" />
          </div>
        </div>
      )}
      
      <div className={`code-block ${hideHeader ? "rounded-xl" : "rounded-t-none rounded-b-xl"} border border-border min-h-[100px] flex flex-col overflow-hidden bg-card`}>
        {loading ? (
          <div className="flex-1 flex items-center justify-center p-8">
            <Loader2 className="w-6 h-6 text-primary animate-spin" />
          </div>
        ) : error ? (
          <div className="flex-1 p-8 text-rose-500 font-mono text-xs">
            Error: {error}
          </div>
        ) : (
          <SyntaxHighlighter
            language={getLanguage(filename)}
            style={theme === 'dark' ? atomDark : prism}
            customStyle={{
              margin: 0,
              padding: '1.5rem',
              background: 'transparent',
              fontSize: '0.875rem',
              lineHeight: '1.5',
            }}
            codeTagProps={{
              style: {
                fontFamily: 'inherit',
              }
            }}
          >
            {code}
          </SyntaxHighlighter>
        )}
      </div>
      
      {!hideDescription && description && (
        <div className="mt-2 flex items-start space-x-2 px-2">
          <Terminal className="w-4 h-4 text-muted-foreground mt-0.5" />
          <p className="text-xs text-muted-foreground italic">{description}</p>
        </div>
      )}
    </motion.div>
  );
}
