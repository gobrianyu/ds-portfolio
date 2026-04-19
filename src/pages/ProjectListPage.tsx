import { motion, AnimatePresence } from 'motion/react';
import { Terminal, Box } from 'lucide-react';
import { projects } from '../data/projects';
import ProjectCard from '../components/ProjectCard';
import BlogTerminal from '../components/BlogTerminal';

const TECH_STACK = [
  "Java", "Distributed Systems", "RPC", "Paxos", "Raft", "Sharding", 
  "Replication", "Fault Tolerance", "Consistency", "Linearizability",
  "Vector Clocks", "Gossip Protocols", "LSM Trees", "B-Trees",
  "Network Programming", "Concurrency", "Multithreading", "TCP/IP",
  "UDP", "Serialization", "Protobuf", "Apache Commons", "Lombok"
];

function DataStream() {
  const displayItems = [...TECH_STACK, ...TECH_STACK];
  
  return (
    <div className="relative w-full py-8 overflow-hidden">
      <div className="flex items-center [mask-image:linear-gradient(to_right,transparent,black_15%,black_85%,transparent)]">
        <motion.div 
          className="flex items-center gap-12 whitespace-nowrap"
          animate={{ x: ["0%", "-50%"] }}
          transition={{ 
            duration: 40, 
            repeat: Infinity, 
            ease: "linear" 
          }}
        >
          {displayItems.map((item, i) => (
            <div key={`${item}-${i}`} className="flex items-center gap-4">
              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-orange-500/40">
                {item}
              </span>
              <div className="w-12 h-[1px] bg-gradient-to-r from-orange-500/20 via-orange-500/40 to-orange-500/20" />
            </div>
          ))}
        </motion.div>
      </div>
    </div>
  );
}

export default function ProjectListPage() {
  const today = new Date();
  const lastSyncDate = `${today.getFullYear()}.${String(today.getMonth() + 1).padStart(2, '0')}.${String(today.getDate()).padStart(2, '0')}`;

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Background Decorative Elements */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" />
        <div className="absolute top-[20%] -left-32 w-[600px] h-[600px] bg-orange-500/5 rounded-full blur-[140px]" />
        <div className="absolute bottom-[10%] -right-32 w-[500px] h-[500px] bg-amber-500/5 rounded-full blur-[120px]" />
      </div>

      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-32 relative z-10">
        {/* Hero Section */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-10">
          <div className="lg:col-span-7">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-8"
            >
              <div className="flex items-center space-x-3">
                <div className="px-3 py-1 bg-orange-500/10 rounded-md border border-orange-500/20 text-orange-500 text-[10px] font-black uppercase tracking-widest flex items-center space-x-2">
                  <Terminal className="w-3 h-3" />
                  <span>ls ./projects</span>
                </div>
                <div className="px-3 py-1 bg-emerald-500/10 rounded-md border border-emerald-500/20 text-emerald-500 text-[10px] font-black uppercase tracking-widest flex items-center space-x-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Status: Online</span>
                </div>
              </div>

              <h1 className="text-6xl md:text-8xl font-black text-foreground tracking-tighter leading-[0.85]">
                Systems <br />
                <span className="text-orange-500">Lab</span>
              </h1>

              <div className="max-w-xl">
                <p className="text-xl text-muted-foreground leading-relaxed font-medium">
                  A collection of core distributed systems components implemented from scratch. 
                  Focusing on the engineering of reliability, consistency, and fault tolerance 
                  in large-scale infrastructure.
                </p>
              </div>
            </motion.div>
          </div>

          <div className="lg:col-span-5">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
            >
              <BlogTerminal 
                title="SYSTEMS.log"
                text="Initialising systems lab... 4 core modules active. Network topology verified. Consensus engines synchronised. Distributed key-value store operational. Ready for inspection."
                color="orange"
              />
            </motion.div>
          </div>
        </div>

        <div className="mb-16">
          <DataStream />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-16">
          {/* Sidebar Index */}
          <aside className="hidden lg:block lg:col-span-3 space-y-12 sticky top-32 h-fit">
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <Box className="w-4 h-4 text-orange-500" />
                <h3 className="text-[10px] font-black text-foreground uppercase tracking-[0.3em]">Module Index</h3>
              </div>
              <div className="space-y-2">
                {projects.map((project, i) => (
                  <motion.button
                    key={project.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="group flex items-center gap-3 w-full text-left p-2 rounded-lg hover:bg-orange-500/5 transition-colors"
                    onClick={() => {
                      const element = document.getElementById(`project-${project.id}`);
                      element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }}
                  >
                    <span className="text-[10px] font-mono text-muted-foreground group-hover:text-orange-500 transition-colors">0{i + 1}</span>
                    <span className="text-[11px] font-bold text-muted-foreground group-hover:text-foreground transition-colors truncate uppercase tracking-wider">
                      {project.id}
                    </span>
                  </motion.button>
                ))}
              </div>
            </div>

            <div className="p-6 bg-orange-500/5 border border-orange-500/10 rounded-2xl space-y-4">
              <div className="flex items-center gap-3">
                <h3 className="text-[10px] font-black text-foreground uppercase tracking-[0.3em]">Systems Stats</h3>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Active Modules</span>
                  <span className="text-[10px] font-mono text-orange-500 font-bold">{projects.length}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Last Sync</span>
                  <span className="text-[10px] font-mono text-orange-500 font-bold">{lastSyncDate}</span>
                </div>
                <div className="w-full h-1 bg-orange-500/10 rounded-full overflow-hidden">
                  <motion.div 
                    className="h-full bg-orange-500"
                    initial={{ width: 0 }}
                    animate={{ width: "100%" }}
                  />
                </div>
              </div>
            </div>
          </aside>

          {/* Main Grid */}
          <div className="lg:col-span-9">
            <AnimatePresence mode="popLayout">
              <motion.div 
                layout
                className="grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch"
              >
                {projects.map((project, i) => (
                  <div key={project.id} id={`project-${project.id}`} className="flex flex-col">
                    <ProjectCard 
                      project={project} 
                      index={i} 
                    />
                  </div>
                ))}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
