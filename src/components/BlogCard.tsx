import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, ArrowRight, FileText, Quote, Calendar, Activity } from 'lucide-react';
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
      layout
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      viewport={{ once: true }}
      onClick={() => navigate(`/blog/${post.id}`)}
      className="terminal-window group hover:border-violet-500/50 transition-all duration-500 flex flex-col cursor-pointer shadow-lg hover:shadow-violet-500/20 relative overflow-hidden bg-card/40 backdrop-blur-sm h-full"
    >
      {/* Background Pattern */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-violet-500/5 rounded-full -mr-16 -mt-16 blur-3xl group-hover:bg-violet-500/10 transition-colors" />
      
      <div className="terminal-header bg-muted/50">
        <div className="flex items-center space-x-2">
          <FileText className="w-3 h-3 text-violet-500" />
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">LOG: {post.id.toUpperCase()}</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex space-x-1">
            <div className="w-1.5 h-1.5 rounded-full bg-violet-500/20" />
            <div className="w-1.5 h-1.5 rounded-full bg-violet-500/40" />
          </div>
        </div>
      </div>

      <div className="p-8 flex-grow relative z-10 flex flex-col">
        <div className="flex items-center justify-between gap-4 mb-6">
          <div className="flex gap-1 overflow-hidden [mask-image:linear-gradient(to_right,black_70%,transparent)] min-w-0">
            {post.tags.slice(0, 2).map(tag => (
              <span key={tag} className="px-2 py-0.5 bg-violet-500/10 border border-violet-500/20 rounded text-[8px] font-black text-violet-400 uppercase tracking-widest whitespace-nowrap">
                {tag}
              </span>
            ))}
          </div>
          <span className="text-[9px] font-black text-violet-500/40 uppercase tracking-[0.2em] shrink-0">Research_Log</span>
        </div>

        <h3 className="text-2xl font-black mb-4 text-foreground tracking-tighter group-hover:text-violet-500 transition-colors line-clamp-2 leading-[1.1]">
          {post.title.split(':')[0]}
        </h3>
        
        <div className="flex items-start space-x-3 mb-6 p-4 bg-muted/30 rounded-xl border border-border/50 group-hover:border-violet-500/20 transition-colors">
          <Quote className="w-4 h-4 text-violet-500/30 shrink-0 mt-1" />
          <p className="text-muted-foreground italic text-[10px] font-bold uppercase tracking-widest line-clamp-2 leading-relaxed">
            {post.citation}
          </p>
        </div>
        
        <p className="text-muted-foreground text-xs line-clamp-3 leading-relaxed font-medium opacity-80 group-hover:opacity-100 transition-opacity">
          {post.preview}
        </p>
      </div>
      
      <div className="p-8 pt-0 relative z-10">
        <div className="flex items-center justify-between pt-6 border-t border-border/50">
          <div className="flex items-center gap-2">
            <Calendar className="w-3 h-3 text-muted-foreground/50" />
            <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">
              {post.date || '--'}
            </span>
          </div>
          <div className="flex items-center space-x-2 text-violet-500 font-black uppercase tracking-widest text-[10px] group/link">
            <span className="opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all duration-300">CAT ./LOG</span>
            <div className="w-6 h-6 rounded-full bg-violet-500/10 flex items-center justify-center group-hover:bg-violet-500 group-hover:text-white transition-all">
              <ArrowRight className="w-3 h-3" />
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
