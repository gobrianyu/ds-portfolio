import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Code, Terminal, FileCode } from 'lucide-react';
import { Project } from '../data/projects';

interface ProjectCardProps {
  project: Project;
  index: number;
  key?: string | number;
}

export default function ProjectCard({ project, index }: ProjectCardProps) {
  const navigate = useNavigate();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      viewport={{ once: true }}
      onClick={() => navigate(`/projects/${project.id}`)}
      className="terminal-window group hover:border-orange-500/50 transition-all duration-500 flex flex-col cursor-pointer shadow-lg hover:shadow-orange-500/20 relative overflow-hidden bg-card/40 backdrop-blur-sm h-full"
    >
      <div className="terminal-header bg-muted/50">
        <div className="flex items-center space-x-2">
          <FileCode className="w-3 h-3 text-orange-500" />
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">MODULE: {project.id.toUpperCase()}</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex space-x-1">
            <div className="w-1.5 h-1.5 rounded-full bg-orange-500/20" />
            <div className="w-1.5 h-1.5 rounded-full bg-orange-500/40" />
            <div className="w-1.5 h-1.5 rounded-full bg-orange-500/60" />
          </div>
        </div>
      </div>

      <div className="p-8 flex-grow relative z-10 flex flex-col">
        <div className="flex items-center justify-between gap-4 mb-6">
          <div className="flex gap-1 overflow-hidden [mask-image:linear-gradient(to_right,black_70%,transparent)] min-w-0">
            {project.technologies.slice(0, 3).map(tag => (
              <span key={tag} className="px-2 py-0.5 bg-orange-500/10 border border-orange-500/20 rounded text-[8px] font-black text-orange-400 uppercase tracking-widest whitespace-nowrap">
                {tag}
              </span>
            ))}
          </div>
        </div>

        <h3 className="text-2xl font-black mb-4 text-foreground tracking-tighter group-hover:text-orange-500 transition-colors line-clamp-2 leading-[1.1]">
          {project.title}
        </h3>
        
        <p className="text-muted-foreground mb-8 line-clamp-3 text-sm font-medium leading-relaxed flex-grow">
          {project.shortDescription}
        </p>

        <div className="flex items-center justify-between pt-6 border-t border-border/50">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] font-black text-orange-500/40 uppercase tracking-[0.2em] shrink-0">System_Nominal</span>
          </div>
          <div className="flex items-center space-x-2 text-orange-500 font-black uppercase tracking-widest text-[10px] group/link">
            <span className="opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all duration-300">CAT ./MODULE</span>
            <div className="w-6 h-6 rounded-full bg-orange-500/10 flex items-center justify-center group-hover:bg-orange-500 group-hover:text-white transition-all">
              <ArrowRight className="w-3 h-3" />
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
