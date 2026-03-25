import { motion } from 'motion/react';
import { Terminal, Cpu } from 'lucide-react';
import { projects } from '../data/projects';
import ProjectCard from '../components/ProjectCard';

export default function ProjectListPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-20"
      >
        <div className="flex items-center space-x-3 mb-6">
          <div className="px-3 py-1 bg-primary/10 rounded-md border border-primary/20 text-primary text-[10px] font-black uppercase tracking-widest flex items-center space-x-2">
            <Terminal className="w-3 h-3" />
            <span>ls ./projects</span>
          </div>
          <div className="px-3 py-1 bg-emerald-500/10 rounded-md border border-emerald-500/20 text-emerald-500 text-[10px] font-black uppercase tracking-widest">
            Status: Active
          </div>
        </div>
        
        <h1 className="text-5xl md:text-7xl font-black mb-8 text-white tracking-tighter">
          Distributed <span className="text-primary">Systems</span>
        </h1>
        
        <div className="terminal-window p-8 bg-white/5 border-white/10 max-w-3xl">
          <p className="text-lg text-gray-400 leading-relaxed font-medium">
            <span className="text-primary font-mono mr-2">{" >>> "}</span>
            A collection of core distributed systems components implemented from scratch, 
            focusing on reliability, consistency, and fault tolerance.
          </p>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
        {projects.map((project, i) => (
          <ProjectCard 
            key={project.id} 
            project={project} 
            index={i} 
          />
        ))}
      </div>
    </div>
  );
}
