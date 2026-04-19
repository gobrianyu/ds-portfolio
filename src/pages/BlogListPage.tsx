import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence, useScroll, useTransform, useMotionValue, useSpring } from 'motion/react';
import { Terminal, Search, Database } from 'lucide-react';
import { blogPosts } from '../data/blogs';
import BlogCard from '../components/BlogCard';
import BlogTerminal from '../components/BlogTerminal';

const BUZZWORDS = [
  "Consensus", "Raft", "Paxos", "Byzantine Fault Tolerance", "Vector Clocks", 
  "Consistent Hashing", "Quorums", "Linearizability", "Eventual Consistency", 
  "Sharding", "Replication", "CAP Theorem", "LSM Trees", "B-Trees", 
  "Zero-Knowledge Proofs", "Directed Acyclic Graphs", "Gossip Protocols", 
  "Heartbeats", "Leases", "State Machine Replication", "Two-Phase Commit",
  "Atomic Broadcast", "Causal Consistency", "Snapshot Isolation", "Distributed Locking",
  "Clock Skew", "Logical Clocks", "Total Order", "Partial Order", "Safety & Liveness"
];

function TagCarousel() {
  const allTags = Array.from(new Set(blogPosts.flatMap(post => post.tags)));
  const items = [...allTags, ...BUZZWORDS];
  
  // Duplicate items for infinite scroll effect
  const displayItems = [...items, ...items, ...items];
  
  return (
    <div className="relative w-full py-12 overflow-hidden group">
      {/* Center Indicators */}
      <div className="absolute left-1/2 top-0 -translate-x-1/2 z-20 flex flex-col items-center justify-between h-full py-2 pointer-events-none">
        <motion.div 
          animate={{ y: [0, 4, 0] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
          className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[8px] border-t-violet-500"
        />
        <div className="w-[1px] h-full bg-gradient-to-b from-violet-500/50 via-violet-500 to-violet-500/50" />
        <motion.div 
          animate={{ y: [0, -4, 0] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
          className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-b-[8px] border-b-violet-500"
        />
      </div>

      {/* Center Highlight Glow */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-16 bg-violet-500/20 blur-3xl rounded-full pointer-events-none z-10" />

      {/* Scrolling Container with Mask */}
      <div className="flex items-center [mask-image:linear-gradient(to_right,transparent,black_15%,black_85%,transparent)]">
        <motion.div 
          className="flex items-center gap-8 whitespace-nowrap"
          animate={{ x: ["0%", "-33.33%"] }}
          transition={{ 
            duration: 60, 
            repeat: Infinity, 
            ease: "linear" 
          }}
        >
          {displayItems.map((item, i) => (
            <div 
              key={`${item}-${i}`}
              className="relative px-6 py-3 rounded-full border border-border/50 bg-card overflow-hidden group/tag transition-colors hover:border-violet-500/30"
            >
              {/* Shimmer Effect */}
              <motion.div 
                className="absolute inset-0 bg-gradient-to-r from-transparent via-violet-500/10 to-transparent"
                animate={{ x: ["-100%", "100%"] }}
                transition={{ 
                  duration: 3, 
                  repeat: Infinity, 
                  ease: "easeInOut",
                  delay: (i % 5) * 0.5
                }}
              />
              <span className="relative z-10 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/80 group-hover/tag:text-violet-500 transition-colors">
                {item}
              </span>
            </div>
          ))}
        </motion.div>
      </div>
    </div>
  );
}

export default function BlogListPage() {
  const filteredPosts = blogPosts; // No filtering anymore
  const today = new Date();
  const lastIndexedDate = `${today.getFullYear()}.${String(today.getMonth() + 1).padStart(2, '0')}.${String(today.getDate()).padStart(2, '0')}`;

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Background Decorative Elements */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" />
        <div className="absolute top-[20%] -left-32 w-[600px] h-[600px] bg-violet-500/5 rounded-full blur-[140px]" />
        <div className="absolute bottom-[10%] -right-32 w-[500px] h-[500px] bg-violet-500/10 rounded-full blur-[120px]" />
      </div>

      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-32 relative z-10">
        {/* Hero Section */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 mb-24">
          <div className="lg:col-span-7">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-8"
            >
              <div className="flex items-center space-x-3">
                <div className="px-3 py-1 bg-violet-500/10 rounded-md border border-violet-500/20 text-violet-400 text-[10px] font-black uppercase tracking-widest flex items-center space-x-2">
                  <Terminal className="w-3 h-3" />
                  <span>ls ./research</span>
                </div>
                <div className="px-3 py-1 bg-emerald-500/10 rounded-md border border-emerald-500/20 text-emerald-500 text-[10px] font-black uppercase tracking-widest flex items-center space-x-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Status: Online</span>
                </div>
              </div>

              <h1 className="text-6xl md:text-8xl font-black text-foreground tracking-tighter leading-[0.85]">
                Paper <br />
                <span className="text-violet-500">Archive</span>
              </h1>

              <div className="max-w-xl">
                <p className="text-xl text-muted-foreground leading-relaxed font-medium">
                  Critical breakdowns of industry-defining research papers. 
                  Deconstructing the foundational blueprints of modern distributed infrastructure 
                  through the lens of historical breakthroughs.
                </p>
              </div>

              {/* Animated Tag Carousel */}
              <div className="max-w-3xl -ml-4">
                <TagCarousel />
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
                title="ARCHIVE.log"
                text="Synchronising research nodes... 6 papers indexed. Metadata verified. Distributed systems archive is live. Accessing research analyses and architectural simulations."
                color="violet"
              />
            </motion.div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-16">
          {/* Sidebar Index */}
          <aside className="hidden lg:block lg:col-span-3 space-y-12 sticky top-32 h-fit">
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <Database className="w-4 h-4 text-violet-500" />
                <h3 className="text-[10px] font-black text-foreground uppercase tracking-[0.3em]">Archive Index</h3>
              </div>
              <div className="space-y-2">
                {filteredPosts.map((post, i) => (
                  <motion.button
                    key={post.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="group flex items-center gap-3 w-full text-left p-2 rounded-lg hover:bg-violet-500/5 transition-colors"
                    onClick={() => {
                      const element = document.getElementById(`post-${post.id}`);
                      element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }}
                  >
                    <span className="text-[10px] font-mono text-muted-foreground group-hover:text-violet-500 transition-colors">0{i + 1}</span>
                    <span className="text-[11px] font-bold text-muted-foreground group-hover:text-foreground transition-colors truncate uppercase tracking-wider">
                      {post.id}
                    </span>
                  </motion.button>
                ))}
              </div>
            </div>

            <div className="p-6 bg-violet-500/5 border border-violet-500/10 rounded-2xl space-y-4">
              <div className="flex items-center gap-3">
                <h3 className="text-[10px] font-black text-foreground uppercase tracking-[0.3em]">Archive Stats</h3>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Total Papers</span>
                  <span className="text-[10px] font-mono text-violet-500 font-bold">{blogPosts.length}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Last Indexed</span>
                  <span className="text-[10px] font-mono text-violet-500 font-bold">{lastIndexedDate}</span>
                </div>
                <div className="w-full h-1 bg-violet-500/10 rounded-full overflow-hidden">
                  <motion.div 
                    className="h-full bg-violet-500"
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
              {filteredPosts.length > 0 ? (
                <motion.div 
                  layout
                  className="grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch"
                >
                  {filteredPosts.map((post, i) => (
                    <div key={post.id} id={`post-${post.id}`} className="flex flex-col">
                      <BlogCard 
                        post={post} 
                        index={i} 
                      />
                    </div>
                  ))}
                </motion.div>
              ) : (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex flex-col items-center justify-center py-32 text-center space-y-6"
                >
                  <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center">
                    <Search className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-xl font-bold">No results found</h3>
                    <p className="text-muted-foreground">Try adjusting your search or filters</p>
                  </div>
                  <button 
                    onClick={() => { window.location.reload(); }}
                    className="text-violet-500 font-black uppercase tracking-widest text-[10px] hover:underline"
                  >
                    Reset Archive
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
