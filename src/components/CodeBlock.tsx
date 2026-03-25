import { motion } from 'motion/react';
import { FileCode, Terminal } from 'lucide-react';

interface CodeBlockProps {
  filename: string;
  description: string;
  code: string;
  index: number;
  key?: string | number;
}

export default function CodeBlock({ filename, description, code, index }: CodeBlockProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      whileInView={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.1 }}
      viewport={{ once: true }}
      className="mb-8"
    >
      <div className="flex items-center justify-between bg-slate-900 px-4 py-2 rounded-t-xl border-x border-t border-white/10">
        <div className="flex items-center space-x-2">
          <FileCode className="w-4 h-4 text-primary" />
          <span className="text-xs font-mono text-gray-300 font-bold">{filename}</span>
        </div>
        <div className="flex space-x-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-rose-500/50" />
          <div className="w-2.5 h-2.5 rounded-full bg-amber-500/50" />
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/50" />
        </div>
      </div>
      
      <div className="code-block rounded-t-none rounded-b-xl border-white/10">
        <pre className="text-primary/90">
          <code>{code}</code>
        </pre>
      </div>
      
      <div className="mt-2 flex items-start space-x-2 px-2">
        <Terminal className="w-4 h-4 text-gray-500 mt-0.5" />
        <p className="text-xs text-gray-500 italic">{description}</p>
      </div>
    </motion.div>
  );
}
