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
  Plus,
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
    <div className="min-h-screen relative bg-background text-foreground">
      {/* Progress Bar */}
      <motion.div
        className="fixed top-0 left-0 right-0 h-1 bg-violet-400 z-50 origin-left"
        style={{ scaleX }}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-24 pt-10">
      

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

        {/* Interactive Widget Section */}
        <div className="relative left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] w-screen px-[2vw] mb-24 py-16 bg-muted/30 border-y border-border transition-colors overflow-visible">
          <div className="max-w-7xl mx-auto overflow-visible">
            <div className="flex flex-col items-center mb-6">
              <h2 className="text-2xl font-black text-foreground uppercase tracking-[0.2em] text-center">{getInteractiveTitle()}</h2>
              <div className="h-1 w-32 bg-gradient-to-r from-transparent via-violet-500 to-transparent mt-2" />
            </div>
            {renderInteractive()}

            {/* More Details Section */}
            {post.widgetDetails && (
              <div className="mt-8 flex flex-col items-center">
                <button
                  onClick={() => setShowWidgetDetails(!showWidgetDetails)}
                  className="cursor-pointer flex items-center space-x-2 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground hover:text-violet-500 transition-colors group"
                >
                  <Info className="w-3 h-3" />
                  <span>Technical Specifications & Implementation Details</span>
                  <ChevronRight className={`w-3 h-3 transition-transform duration-300 ${showWidgetDetails ? 'rotate-90' : ''}`} />
                </button>
                
                <AnimatePresence>
                  {showWidgetDetails && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden w-full max-w-4xl mt-6"
                    >
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-8 bg-card border border-border rounded-2xl relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-violet-500/50 via-transparent to-transparent" />
                        
                        <div className="space-y-6">
                          <div>
                            <h4 className="text-[10px] font-black uppercase tracking-widest text-violet-500 mb-2">Overview</h4>
                            <p className="text-sm text-muted-foreground leading-relaxed">{post.widgetDetails.overview}</p>
                          </div>
                        </div>
                        
                        <div className="space-y-6">
                          <div>
                            <h4 className="text-[10px] font-black uppercase tracking-widest text-violet-500 mb-2">Key Notes</h4>
                            <p className="text-sm text-muted-foreground leading-relaxed">{post.widgetDetails.whatToLookFor}</p>
                          </div>
                          <div className="p-4 bg-violet-500/5 border border-violet-500/10 rounded-xl">
                            <h4 className="text-[10px] font-black uppercase tracking-widest text-violet-500 mb-2 flex items-center">
                              <Info className="w-3 h-3 mr-2" />
                              Disclaimer
                            </h4>
                            <p className="text-[11px] text-muted-foreground/80 leading-relaxed italic">{post.widgetDetails.disclaimer}</p>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </div>
        </div>

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
