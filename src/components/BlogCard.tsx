import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, ArrowRight, FileText, Quote } from 'lucide-react';
import { BlogPost } from '../data/blogs';

interface BlogCardProps {
  post: BlogPost;
  index: number;
  key?: string | number;
}

export default function BlogCard({ post, index }: BlogCardProps) {
  const navigate = useNavigate();

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      whileInView={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.05 }}
      viewport={{ once: true }}
      onClick={() => navigate(`/blog/${post.id}`)}
      className="terminal-window group hover:border-violet-500/50 transition-all duration-500 flex flex-col cursor-pointer shadow-lg hover:shadow-violet-500/10"
    >
      <div className="terminal-header bg-muted/50">
        <div className="flex items-center space-x-2">
          <FileText className="w-3 h-3 text-violet-500" />
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">b-log_{post.id}.txt</span>
        </div>
        <div className="flex space-x-1">
          <div className="w-2 h-2 rounded-full bg-muted" />
        </div>
      </div>

      <div className="p-8 flex-grow">
        <div className="flex items-start justify-end mb-6">
          <span className="text-[10px] font-black text-violet-500/50 uppercase tracking-widest">Analysis B-Log</span>
        </div>

        <h3 className="text-xl font-black mb-4 text-foreground tracking-tight group-hover:text-violet-500 transition-colors line-clamp-2">
          {post.title.split(':')[0]}
        </h3>
        
        <div className="flex items-start space-x-3 mb-6 p-4 bg-muted/50 rounded-xl border border-border">
          <Quote className="w-4 h-4 text-violet-500/50 shrink-0 mt-1" />
          <p className="text-muted-foreground italic text-[10px] font-bold uppercase tracking-widest line-clamp-2">
            {post.citation}
          </p>
        </div>
        
        <p className="text-muted-foreground text-xs line-clamp-3 leading-relaxed font-medium">
          {post.preview}
        </p>
      </div>
      
      <div className="p-8 pt-0">
        <div className="flex items-center justify-between pt-6 border-t border-border">
          <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">
            {post.date || '--'}
          </span>
          <div className="flex items-center space-x-2 text-violet-500 font-bold uppercase tracking-widest text-[10px] group/link">
            <span>./read_log</span>
            <ArrowRight className="w-3 h-3 group-hover/link:translate-x-1 transition-transform" />
          </div>
        </div>
      </div>
    </motion.div>
  );
}
