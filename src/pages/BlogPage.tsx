import { useParams, Link, Navigate } from 'react-router-dom';
import { motion, AnimatePresence, useScroll, useSpring } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import { 
  ArrowLeft, 
  Quote, 
  BookOpen, 
  FileText, 
  Terminal, 
  Cpu, 
  ExternalLink, 
  Download, 
  Layers, 
  Database, 
  Network,
  ChevronRight,
  Info,
  Bot,
  Minus,
  Zap,
  Lock,
  Share2,
  Activity,
  RotateCcw,
  X,
  Maximize2,
  Minimize2
} from 'lucide-react';
import { cn } from '../lib/utils';
import { blogPosts } from '../data/blogs';
import BlogTerminal from '../components/BlogTerminal';
import BigtableReadPath from '../components/interactive/BigtableReadPath';
import { GFSSimulator } from '../components/GFSSimulator/GFSSimulator';
import { DynamoRing } from '../components/DynamoRing/DynamoRing';
import BitcoinSimulator from '../components/BitcoinSimulator/BitcoinSimulator';
import { MapReduceScheduler } from '../components/MapReduceScheduler/MapReduceScheduler';
import TensorFlowPlayground from '../components/TensorFlowPlayground/TensorFlowPlayground';
import { RigidWrapper } from '../components/interactive/RigidWrapper';
import { useState, useMemo, useEffect } from 'react';

// --- Blog Page Component ---
export default function BlogPage() {
  const { id } = useParams();
  const post = blogPosts.find(p => p.id === id);
  const [showPdf, setShowPdf] = useState(false);
  const [showWidgetDetails, setShowWidgetDetails] = useState(false);
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);
  const [pdfKey, setPdfKey] = useState(0);
  const [isMobile, setIsMobile] = useState(false);

  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001
  });

  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (mobile) setShowPdf(false);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    if (isPdfModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isPdfModalOpen]);

  if (!post) return <Navigate to="/blog" />;

  const formatDate = (dateString: string) => {
    const [year, month, day] = dateString.split('.');
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  };

  const getInteractiveTitle = () => {
    switch (post.id) {
      case 'bigtable': return "BigTable Read Path Explorer";
      case 'gfs': return "GFS Failure Simulator";
      case 'dynamo': return "Dynamo Ring Visualiser";
      case 'bitcoin': return "Bitcoin Block Mining Simulator";
      case 'mapreduce': return "MapReduce Task Scheduler";
      case 'tensorflow': return "TensorFlow Neural Network Visualiser";
      default: return "Interactive Simulation Environment";
    }
  };

  const getWidgetCodeName = () => {
    switch (post.id) {
      case 'bigtable': return "BigTable_Read_Path_v1.6";
      case 'gfs': return "GFS_Failure_Sim_v1.3";
      case 'dynamo': return "Dynamo_Ring_Sim_v1.7";
      case 'bitcoin': return "Bitcoin_Consensus_Sim_v1.8";
      case 'mapreduce': return "MapReduce_Scheduler_v1.4";
      case 'tensorflow': return "TF_Playground_v1.6";
      default: return `SIM_${post.id.toUpperCase()}_v2.4`;
    }
  };

  const renderInteractive = () => {
    switch (post.id) {
      case 'bigtable': return <RigidWrapper><BigtableReadPath /></RigidWrapper>;
      case 'gfs': return <RigidWrapper><GFSSimulator /></RigidWrapper>;
      case 'dynamo': return <RigidWrapper><DynamoRing /></RigidWrapper>;
      case 'bitcoin': return <RigidWrapper><BitcoinSimulator /></RigidWrapper>;
      case 'mapreduce': return <RigidWrapper><MapReduceScheduler /></RigidWrapper>;
      case 'tensorflow': return <RigidWrapper><TensorFlowPlayground /></RigidWrapper>;
      default: return null;
    }
  };

  return (
    <div className="min-h-screen relative bg-background text-foreground overflow-hidden">
      {/* Background Blobs */}
      <div className="absolute top-[10%] -left-64 w-[500px] h-[500px] bg-violet-500/5 rounded-full blur-[120px] pointer-events-none z-0" />
      <div className="absolute bottom-[20%] -right-64 w-[600px] h-[600px] bg-violet-500/10 rounded-full blur-[140px] pointer-events-none z-0" />

      {/* Progress Bar */}
      <motion.div
        className="fixed top-0 left-0 right-0 h-1 bg-violet-400 z-50 origin-left"
        style={{ scaleX }}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-24 pt-10 relative z-10">
      

      <motion.article
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-5xl mx-auto"
      >
        <header className="mb-16">
          <div className="flex flex-wrap items-center gap-3 mb-8">
            <Link
              to="/blog"
              className="inline-flex items-center text-muted-foreground hover:text-violet-500 transition-colors font-bold uppercase tracking-widest text-[10px] group"
            >
              <ArrowLeft className="mr-2 w-3 h-3 group-hover:-translate-x-1 transition-transform" /> 
              <span>cd ..</span>
            </Link>
            <div className="px-3 py-1 bg-violet-500/10 rounded-md border border-violet-500/20 text-violet-400 text-[10px] font-black uppercase tracking-widest flex items-center space-x-2">
              <Terminal className="w-3 h-3" />
              <span>Log: {post.id}</span>
            </div>
            <div className="px-3 py-1 bg-violet-500/10 rounded-md border border-violet-500/20 text-violet-500 text-[10px] font-black uppercase tracking-widest">
              {post.date}
            </div>
          </div>

          <h1 className="text-6xl md:text-9xl font-black mb-10 leading-[0.8] text-foreground tracking-tighter">
            {post.title.split(':').map((part, i) => (
              <span key={i} className={i === 1 ? "block text-violet-500/80 text-4xl md:text-6xl mt-6 font-bold tracking-tight" : ""}>
                {part}{i === 0 && post.title.includes(':') ? ':' : ''}
              </span>
            ))}
          </h1>
        </header>

        <div className="mb-20">
          <BlogTerminal text={post.aiSummary} color="violet" />
        </div>

        {/* Reimagined Interactive Widget Section: The Simulation Lab */}
        <section className="relative left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] w-screen mb-32 py-24 overflow-hidden group/lab">
          {/* Lab Background Elements */}
          <div className="absolute inset-0 bg-muted/30 dark:bg-[#0a0a0a] z-0 transition-colors duration-500" />
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:40px_40px] opacity-20 pointer-events-none z-0" />
          <div className="absolute top-[10%] right-[10%] w-[400px] h-[400px] bg-violet-600/10 rounded-full blur-[120px] pointer-events-none z-0" />
          <div className="absolute bottom-[10%] left-[10%] w-[400px] h-[400px] bg-violet-600/5 rounded-full blur-[120px] pointer-events-none z-0" />

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            {/* Lab Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-12">
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <div className="flex items-center space-x-2 px-3 py-1 bg-violet-500/10 rounded-md border border-violet-500/20 text-violet-400">
                    <Bot className="w-3 h-3 animate-pulse" />
                    <span className="text-[10px] font-black uppercase tracking-[0.2em]">Interactive Simulation</span>
                  </div>
                  <div className="h-px w-8 bg-violet-500/20" />
                  <span className="text-[10px] font-mono text-muted-foreground/50 tracking-widest uppercase">{getWidgetCodeName()}</span>
                </div>
                <h2 className="text-4xl md:text-5xl font-black text-foreground tracking-tighter uppercase leading-none">
                  {getInteractiveTitle()}
                </h2>
              </div>
            </div>

            <div className="space-y-12">
              {/* Main Simulation Stage - Pure & Stretched */}
              <div className="w-full flex justify-center">
                <div className="w-full relative z-10">
                  {renderInteractive()}
                </div>
              </div>

              {/* Diagnostic Toggle Button - Simplified & Centered */}
              {post.widgetDetails && (
                <div className="flex justify-center">
                  <button
                    onClick={() => setShowWidgetDetails(!showWidgetDetails)}
                    className={cn(
                      "flex items-center space-x-3 px-8 py-3.5 rounded-2xl border transition-all duration-300 group/btn shadow-sm",
                      showWidgetDetails 
                        ? "bg-violet-500 border-violet-500 text-white shadow-lg shadow-violet-500/20" 
                        : "bg-card dark:bg-white/5 border-border dark:border-white/10 text-muted-foreground hover:bg-muted dark:hover:bg-white/10 hover:border-violet-500/30 hover:text-foreground"
                    )}
                  >
                    <span className="text-xs font-black uppercase tracking-widest">Details Panel</span>
                    <ChevronRight className={cn("w-4 h-4 transition-transform duration-500", showWidgetDetails ? "rotate-90" : "group-hover/btn:translate-x-1")} />
                  </button>
                </div>
              )}

              {/* Collapsible Diagnostic Panel - Full Width Below Widget */}
              <AnimatePresence>
                {showWidgetDetails && post.widgetDetails && (
                  <motion.div
                    initial={{ opacity: 0, y: 20, height: 0 }}
                    animate={{ opacity: 1, y: 0, height: 'auto' }}
                    exit={{ opacity: 0, y: 20, height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
                      {/* Overview Section */}
                      <div className="p-8 bg-card dark:bg-white/5 border border-border dark:border-white/10 rounded-2xl space-y-4">
                        <div className="flex items-center space-x-3 text-violet-500">
                          <h4 className="text-[10px] font-black uppercase tracking-widest">Protocol Dynamics</h4>
                        </div>
                        <p className="text-sm text-foreground/70 dark:text-muted-foreground leading-relaxed font-medium">
                          {post.widgetDetails.overview}
                        </p>
                      </div>

                      {/* Observations Section */}
                      <div className="space-y-6">
                        <div className="p-8 bg-card dark:bg-white/5 border border-border dark:border-white/10 rounded-2xl space-y-4">
                          <div className="flex items-center space-x-3 text-violet-500">
                            <h4 className="text-[10px] font-black uppercase tracking-widest">Telemetry Indicators</h4>
                          </div>
                          <p className="text-sm text-foreground/70 dark:text-muted-foreground leading-relaxed font-medium">
                            {post.widgetDetails.whatToLookFor}
                          </p>
                        </div>

                        {/* System Disclaimer */}
                        <div className="p-6 bg-amber-500/5 border border-amber-500/10 rounded-2xl">
                          <div className="flex items-center space-x-2 text-amber-500/80 mb-2">
                            <Info className="w-3 h-3" />
                            <span className="text-[9px] font-black uppercase tracking-widest">System Disclaimer</span>
                          </div>
                          <p className="text-[11px] text-amber-700/70 dark:text-amber-500/60 leading-relaxed italic">
                            {post.widgetDetails.disclaimer}
                          </p>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            
            {/* Lab Footer Decoration */}
            <div className="mt-12 pt-8 border-t border-border dark:border-white/5 flex items-center justify-between opacity-50 dark:opacity-30 transition-colors">
              <div className="flex space-x-8">
                <div className="flex flex-col">
                  <span className="text-[8px] font-mono uppercase text-muted-foreground mb-1">Clock Sync</span>
                  <span className="text-[10px] font-mono text-foreground dark:text-white">LOCKED_STRATUM_1</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[8px] font-mono uppercase text-muted-foreground mb-1">State Consistency</span>
                  <span className="text-[10px] font-mono text-foreground dark:text-white">LINEARISABLE</span>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <div className="h-1 w-24 bg-gradient-to-r from-transparent via-violet-500/40 to-transparent" />
                <div className="w-1.5 h-1.5 rounded-full bg-violet-500/40" />
              </div>
            </div>
          </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-16">
          <div className="lg:col-span-8">
            <div className="prose prose-invert max-w-none">
              <div className="flex flex-col space-y-6 mb-12">
                <h2 className="text-4xl font-black m-0 text-foreground tracking-tight uppercase tracking-widest leading-none">Analysis & Discussion</h2>
                <div className="flex flex-wrap gap-2 mt-3">
                  {post.tags.map(tag => (
                    <span key={tag} className="px-3 py-1 bg-violet-500/5 text-violet-500/70 rounded-full text-[9px] font-black uppercase tracking-widest border border-violet-500/10">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              {/* Mobile Metrics - Shown only on mobile, between tags and content */}
              <div className="lg:hidden block mb-12">
                <div className="terminal-window p-6 bg-muted/40 border-border relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-violet-500/50 to-transparent" />
                  <div className="space-y-4">
                    <div className="flex justify-between items-center py-2 border-b border-border">
                      <span className="text-[9px] text-muted-foreground uppercase font-black">Data Volume</span>
                      <span className="text-xs font-mono text-muted-foreground">{(post.content.length / 1024).toFixed(1)} KB</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-border">
                      <span className="text-[9px] text-muted-foreground uppercase font-black">Read Time</span>
                      <span className="text-xs font-mono text-muted-foreground">{Math.ceil(post.content.split(/\s+/).length / 225)}m</span>
                    </div>
                    <div className="flex justify-between items-center py-2">
                      <span className="text-[9px] text-muted-foreground uppercase font-black">Last Updated</span>
                      <span className="text-xs font-mono text-violet-500">APR 2026</span>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="text-muted-foreground leading-relaxed text-xl space-y-12 font-medium markdown-content">
                <ReactMarkdown
                  components={{
                    p: ({ children }) => (
                      <div className="relative group mb-12 last:mb-0">
                        <div className="absolute -left-10 top-2 opacity-0 group-hover:opacity-100 transition-opacity text-violet-500 hidden lg:block">
                          <ChevronRight className="w-6 h-6" />
                        </div>
                        <p className="relative m-0">
                          {children}
                        </p>
                      </div>
                    ),
                    a: ({ children, href }) => {
                      const isInternal = href?.startsWith('/');
                      return (
                        <a 
                          href={href} 
                          target={isInternal ? undefined : "_blank"} 
                          rel={isInternal ? undefined : "noopener noreferrer"}
                          className="text-violet-500 hover:text-violet-400 transition-colors underline underline-offset-4 font-black"
                        >
                          {children}
                        </a>
                      );
                    },
                    strong: ({ children }) => <strong className="text-foreground font-black">{children}</strong>,
                    em: ({ children }) => <em className="italic">{children}</em>,
                  }}
                >
                  {post.content}
                </ReactMarkdown>
              </div>
            </div>

              <div className="mt-24 pt-12 border-t border-border flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground uppercase font-black tracking-widest mb-1">Written by</p>
                  <p className="font-black text-2xl text-foreground tracking-tight">Brian S. Yu</p>
                  <p className="text-sm text-muted-foreground font-medium italic">Distributed Systems Blog</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground uppercase font-black tracking-widest mb-1">Published</p>
                  <p className="font-mono text-sm text-muted-foreground">{formatDate(post.date)}</p>
                </div>
              </div>
            </div>

          <div className="lg:col-span-4 space-y-10">
            {/* Desktop Metrics - Hidden on mobile */}
            <div className="terminal-window p-6 bg-muted/40 border-border relative overflow-hidden hidden lg:block">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-violet-500/50 to-transparent" />
              <div className="space-y-4">
                <div className="flex justify-between items-center py-2 border-b border-border">
                  <span className="text-[9px] text-muted-foreground uppercase font-black">Data Volume</span>
                  <span className="text-xs font-mono text-muted-foreground">{(post.content.length / 1024).toFixed(1)} KB</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-border">
                  <span className="text-[9px] text-muted-foreground uppercase font-black">Read Time</span>
                  <span className="text-xs font-mono text-muted-foreground">{Math.ceil(post.content.split(/\s+/).length / 225)}m</span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-[9px] text-muted-foreground uppercase font-black">Last Updated</span>
                  <span className="text-xs font-mono text-violet-500">APR 2026</span>
                </div>
              </div>
            </div>

            <div className="terminal-window p-8 bg-violet-500/5 border-violet-500/20 shadow-xl relative overflow-hidden">
              <div className="flex items-center space-x-3 mb-8">
                <Quote className="w-6 h-6 text-violet-400" />
                <h3 className="text-[11px] font-black text-foreground uppercase tracking-widest">Paper Citation</h3>
              </div>
              <p className="text-muted-foreground italic text-base font-medium leading-relaxed mb-8">
                "{post.citation}"
              </p>
              
              {post.pdfUrl && (
                <div className="space-y-4">
                  <div className="h-px bg-border w-full my-6" />
                  
                  <div className="grid grid-cols-1 gap-3">
                    <a 
                      href={post.pdfUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center justify-between w-full p-3.5 bg-violet-500/10 border border-violet-500/20 rounded-xl text-violet-400 text-[13px] font-bold hover:bg-violet-500/20 transition-all group whitespace-nowrap"
                    >
                      <span className="flex items-center">
                        <ExternalLink className="w-4 h-4 mr-3" />
                        View Original Paper
                      </span>
                      <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </a>
                    
                    <a 
                      href={post.pdfUrl} 
                      download
                      className="flex items-center justify-between w-full p-3.5 bg-violet-500/10 border border-violet-500/20 rounded-xl text-violet-400 text-[13px] font-bold hover:bg-violet-500/20 transition-all group whitespace-nowrap"
                    >
                      <span className="flex items-center">
                        <Download className="w-4 h-4 mr-3" />
                        Download Paper
                      </span>
                      <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </a>

                    {!isMobile && (
                      <button 
                        onClick={() => setShowPdf(!showPdf)}
                        className="cursor-pointer flex items-center justify-between w-full p-3.5 bg-violet-500/10 border border-violet-500/20 rounded-xl text-violet-400 text-[13px] font-bold hover:bg-violet-500/20 transition-all group whitespace-nowrap"
                      >
                        <span className="flex items-center">
                          <BookOpen className="w-4 h-4 mr-3" />
                          Interactive Reader
                        </span>
                        <ChevronRight className={`w-4 h-4 transition-all duration-300 group-hover:translate-x-1 ${showPdf ? 'rotate-90' : ''}`} />
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>

            <AnimatePresence>
              {showPdf && post.pdfUrl && (
                <motion.div
                  initial={{ opacity: 0, height: 0, y: -20 }}
                  animate={{ opacity: 1, height: 'auto', y: 0 }}
                  exit={{ opacity: 0, height: 0, y: -20 }}
                  className="overflow-hidden"
                >
                  <div 
                    className="terminal-window border-violet-500/30 bg-card shadow-2xl flex flex-col h-[800px] rounded-xl overflow-hidden relative z-0"
                    style={{ transform: 'translateZ(0)', isolation: 'isolate' }}
                  >
                    <div className="terminal-header bg-muted px-4 py-2 border-b border-border flex items-center justify-between rounded-t-xl">
                      <div className="flex items-center gap-2">
                        <FileText className="w-3 h-3 text-violet-500" />
                        <span className="text-[10px] font-black text-foreground uppercase tracking-widest">Preview: {post.id}.pdf</span>
                      </div>
                      <div className="flex gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-muted-foreground/20" />
                        <div className="w-2 h-2 rounded-full bg-muted-foreground/20" />
                        <div className="w-2 h-2 rounded-full bg-muted-foreground/20" />
                      </div>
                    </div>
                    
                    <div className="flex-grow relative overflow-hidden">
                      <iframe 
                        src={`${post.pdfUrl}#toolbar=0&navpanes=0&scrollbar=0`} 
                        className="w-full h-full opacity-90 dark:invert dark:hue-rotate-180"
                        title="Mini Preview"
                      />
                    </div>

                    <div className="p-4 bg-muted border-t border-border rounded-b-xl">
                      <button 
                        onClick={() => setIsPdfModalOpen(true)}
                        className="cursor-pointer w-full py-3 bg-violet-500 text-white font-black uppercase tracking-widest text-[10px] rounded-lg hover:bg-violet-600 transition-all flex items-center justify-center gap-3 group"
                      >
                        <Maximize2 size={14} className="group-hover:scale-110 transition-transform" />
                        Expand Full-Scale Reader
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

          </div>
        </div>

        <AnimatePresence>
          {isPdfModalOpen && post.pdfUrl && (
            <>
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsPdfModalOpen(false)}
                className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100]"
              />

              {/* Modal Window */}
              <motion.div
                initial={{ opacity: 0, scale: 0.9, x: -100 }}
                animate={{ opacity: 1, scale: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0.9, x: -100 }}
                className="fixed top-10 left-10 bottom-10 w-[70%] z-[101] flex flex-col"
              >
                <div className="terminal-window border-violet-500/30 bg-card shadow-[0_0_50px_rgba(0,0,0,0.5)] flex flex-col h-full overflow-hidden">
                  <div className="terminal-header bg-muted flex items-center justify-between px-6 py-4 border-b border-border">
                    <div className="flex items-center space-x-4">
                      <div className="flex space-x-2">
                        <div className="w-3 h-3 rounded-full bg-[#ff5f56]" />
                        <div className="w-3 h-3 rounded-full bg-[#ffbd2e]" />
                        <div className="w-3 h-3 rounded-full bg-[#27c93f]" />
                      </div>
                      <div className="h-4 w-[1px] bg-border mx-2" />
                      <div className="flex items-center space-x-3">
                        <FileText className="w-4 h-4 text-violet-500" />
                        <span className="text-xs font-black text-foreground uppercase tracking-widest">Document: {post.id}.pdf</span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <button 
                        onClick={() => setPdfKey(prev => prev + 1)}
                        className="cursor-pointer p-2 hover:bg-muted-foreground/10 rounded-lg text-muted-foreground hover:text-foreground transition-all"
                        title="Refresh View"
                      >
                        <RotateCcw className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => setIsPdfModalOpen(false)}
                        className="cursor-pointer p-2 hover:bg-red-500/20 rounded-lg text-muted-foreground hover:text-red-500 transition-all"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                  
                  <div className="flex-grow relative bg-background">
                    <iframe 
                      key={pdfKey}
                      src={`${post.pdfUrl}#toolbar=1`} 
                      className="w-full h-full dark:invert dark:hue-rotate-180"
                      title="Research Paper PDF"
                    />
                    
                    {/* Floating Controls */}
                    <div className="absolute bottom-8 right-8 flex flex-col gap-4">
                      <a 
                        href={post.pdfUrl} 
                        download 
                        className="w-14 h-14 bg-violet-500 text-white rounded-xl shadow-2xl hover:scale-110 hover:rotate-3 transition-transform flex items-center justify-center group"
                      >
                        <Download className="w-6 h-6 group-hover:translate-y-1 transition-transform" />
                      </a>
                      <button 
                        onClick={() => setIsPdfModalOpen(false)}
                        className="cursor-pointer w-14 h-14 bg-card backdrop-blur-md border border-border text-foreground rounded-xl shadow-2xl hover:scale-110 transition-transform flex items-center justify-center"
                      >
                        <Minimize2 className="w-6 h-6" />
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </motion.article>
      </div>
    </div>
  );
}
