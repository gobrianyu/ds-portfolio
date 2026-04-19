import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { ArrowRight, Terminal } from 'lucide-react';
import { Link } from 'react-router-dom';
import { projects } from '../data/projects';
import { blogPosts } from '../data/blogs';
import ProjectCard from '../components/ProjectCard';
import BlogCard from '../components/BlogCard';
import SystemStatus from '../components/SystemStatus';

export default function Home() {
  const [typedBio, setTypedBio] = useState('');
  const fullBio = "This portfolio showcases my work in Distributed Systems, featuring a collection of projects implementing core distributed protocols, alongside in-depth analyses of seminal research papers that have shaped the field of large-scale computing.";

  useEffect(() => {
    let index = 0;
    const interval = setInterval(() => {
      setTypedBio(fullBio.slice(0, index));
      index++;
      if (index > fullBio.length) clearInterval(interval);
    }, 15);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* System Status Bar */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <SystemStatus />
      </motion.div>

      {/* Terminal Hero / README */}
      <section className="mb-32">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="terminal-window crt-effect"
        >
          <div className="terminal-header">
            <div className="flex space-x-2">
              <div className="w-3 h-3 rounded-full bg-rose-500" />
              <div className="w-3 h-3 rounded-full bg-amber-500" />
              <div className="w-3 h-3 rounded-full bg-emerald-500" />
            </div>
            <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center space-x-2">
              <Terminal className="w-3 h-3" />
              <span>BASH — yusbrian@DIST-SYS: ~</span>
            </div>
            <div className="w-12" />
          </div>
          
          <div className="p-8 md:p-12 font-mono relative overflow-hidden bg-card/40 backdrop-blur-sm">
            <div className="scanline" />
            
            <div className="relative z-10">
              <div className="mb-8 flex items-center space-x-3 text-emerald-500">
                <span className="font-bold">$</span>
                <span>cat README.md</span>
              </div>

              <div className="space-y-8">
                <div>
                  <h1 className="text-4xl md:text-7xl font-black mb-4 tracking-tighter text-foreground">
                    Distributed Systems Portfolio
                  </h1>
                  <p className="text-xl md:text-2xl text-emerald-500/80 font-bold tracking-tight">
                    Brian S. Yu, UW CSE
                  </p>
                </div>

                <div className="max-w-3xl space-y-6 text-muted-foreground text-lg leading-relaxed">
                  <p>
                    <span className="text-amber-500 font-bold"># About the Portfolio</span>
                    <br />
                    {typedBio}
                    <span className="inline-block w-2 h-5 bg-primary ml-1 animate-pulse align-middle" />
                  </p>
                  
                  <div className="flex flex-wrap gap-4 pt-4">
                    <Link 
                      to="/projects" 
                      className="px-6 py-3 bg-primary text-primary-foreground font-bold rounded-xl hover:bg-primary/90 transition-all flex items-center space-x-2 shadow-lg shadow-primary/20"
                    >
                      <span>./view_projects.sh</span>
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                    <Link 
                      to="/blog" 
                      className="px-6 py-3 bg-muted text-foreground font-bold rounded-xl hover:bg-muted/80 transition-all border border-border flex items-center space-x-2"
                    >
                      <span>./read_papers.sh</span>
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Core Goals as "System Modules" */}
      <section className="mb-32">
        <div className="flex items-center space-x-4 mb-12">
          <div>
            <h2 className="text-3xl font-black tracking-tight text-foreground uppercase">System Modules</h2>
            <p className="text-muted-foreground font-bold text-sm uppercase tracking-widest">Core Technical Competencies</p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <ModuleCard 
            title="Distributed Consensus"
            description="Implementing Paxos and Raft protocols to ensure state machine replication and fault tolerance across unreliable networks."
            tag="MODULE_01"
          />
          <ModuleCard 
            title="High-Performance RPC"
            description="Building custom binary protocols with exactly-once semantics, optimising for low latency and high throughput."
            tag="MODULE_02"
          />
          <ModuleCard 
            title="Fault Tolerance"
            description="Designing systems that gracefully handle network partitions, server crashes, and data corruption without service interruption."
            tag="MODULE_03"
          />
        </div>
      </section>

      {/* Featured Projects as "Active Processes" */}
      <section className="mb-32">
        <div className="flex items-center justify-between mb-12">
          <div className="flex items-center space-x-4">
            <div>
              <h2 className="text-3xl font-black tracking-tight text-foreground uppercase">Active Processes</h2>
              <p className="text-muted-foreground font-bold text-sm uppercase tracking-widest">Featured Projects</p>
            </div>
          </div>
          <Link 
            to="/projects" 
            className="hidden md:flex items-center space-x-2 text-primary font-bold uppercase tracking-widest text-xs hover:underline"
          >
            <span>View All Projects</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          {projects.slice(0, 4).map((project, i) => (
            <ProjectCard key={project.id} project={project} index={i} />
          ))}
        </div>
      </section>

      {/* Research Paper Blogs Section */}
      <section className="mb-32">
        <div className="flex items-center justify-between mb-12">
          <div className="flex items-center space-x-4">
            <div>
              <h2 className="text-3xl font-black tracking-tight text-foreground uppercase">Research Paper Logs</h2>
              <p className="text-muted-foreground font-bold text-sm uppercase tracking-widest">Breakdown Blogs</p>
            </div>
          </div>
          <Link 
            to="/blog" 
            className="hidden md:flex items-center space-x-2 text-violet-400 font-bold uppercase tracking-widest text-xs hover:underline"
          >
            <span>View All Blogs</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-10">
          {blogPosts.slice(0, 3).map((post, i) => (
            <BlogCard key={post.id} post={post} index={i} />
          ))}
        </div>
      </section>
    </div>
  );
}

function ModuleCard({ title, description, tag }: { title: string, description: string, tag: string }) {
  return (
    <div className="group p-8 bg-muted/20 border border-border/40 rounded-3xl">
      <div className="flex justify-between items-start mb-8">
        <span className="text-[10px] font-black text-muted-foreground/50 tracking-[0.3em] uppercase">{tag}</span>
      </div>
      <h3 className="text-xl font-black mb-4 text-foreground tracking-tight uppercase">{title}</h3>
      <p className="text-muted-foreground leading-relaxed text-sm font-medium mb-8">
        {description}
      </p>
      <div className="flex items-center space-x-2 text-[10px] font-black text-primary/60 uppercase tracking-[0.2em]">
        <div className="w-2 h-2 rounded-full bg-primary animate-pulse shadow-[0_0_8px_rgba(var(--primary),0.5)]" />
        <span>Status: Operational</span>
      </div>
    </div>
  );
}
