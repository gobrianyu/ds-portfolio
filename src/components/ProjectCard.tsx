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
      className="terminal-window group hover:border-primary/50 transition-all duration-500 cursor-pointer shadow-lg hover:shadow-primary/10"
    >
      <div className="terminal-header">
        <div className="flex items-center space-x-2">
          <FileCode className="w-3 h-3 text-primary" />
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{project.id}.java</span>
        </div>
        <div className="flex space-x-1">
          <div className="w-2 h-2 rounded-full bg-white/10" />
          <div className="w-2 h-2 rounded-full bg-white/10" />
        </div>
      </div>

      <div className="p-8">
        <div className="flex items-start justify-between mb-6">
          <div className="p-3 bg-primary/10 rounded-xl text-primary group-hover:scale-110 transition-transform">
            <Code className="w-6 h-6" />
          </div>
          <span className="text-[10px] font-black text-emerald-500/50 uppercase tracking-widest">Process Running</span>
        </div>

        <h3 className="text-2xl font-black mb-4 text-white tracking-tight group-hover:text-primary transition-colors">
          {project.title}
        </h3>
        
        <p className="text-gray-400 mb-8 line-clamp-2 text-sm font-medium leading-relaxed">
          {project.shortDescription}
        </p>

        <div className="flex items-center justify-between pt-6 border-t border-white/5">
          <div className="flex space-x-2">
            {['Distributed', 'Java', 'Systems'].map((tag) => (
              <span key={tag} className="text-[9px] font-bold text-gray-500 uppercase tracking-widest px-2 py-1 bg-white/5 rounded-md">
                {tag}
              </span>
            ))}
          </div>
          <div className="flex items-center space-x-2 text-primary font-bold uppercase tracking-widest text-[10px] group/link">
            <span>./inspect</span>
            <ArrowRight className="w-3 h-3 group-hover/link:translate-x-1 transition-transform" />
          </div>
        </div>
      </div>
    </motion.div>
  );
}
