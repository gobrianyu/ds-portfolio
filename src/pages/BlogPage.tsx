import { useParams, Link, Navigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
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
import GFSSimulator from '../components/GFSSimulator/GFSSimulator';
import { DynamoRing } from '../components/DynamoRing/DynamoRing';
import { useState, useMemo, useEffect } from 'react';

// --- Interactive Element: Proof of Work (Bitcoin) ---
const BitcoinVisualization = () => {
  const [nonce, setNonce] = useState(0);
  const [isMining, setIsMining] = useState(false);
  const [hash, setHash] = useState("0000000000000000000000000000000000000000000000000000000000000000");
  const difficulty = 2;

  const simulateHash = () => {
    const chars = '0123456789abcdef';
    let res = '0'.repeat(difficulty);
    for (let i = 0; i < 64 - difficulty; i++) {
      res += chars[Math.floor(Math.random() * chars.length)];
    }
    return res;
  };

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isMining) {
      interval = setInterval(() => {
        setNonce(prev => prev + 1);
        setHash(simulateHash());
        if (Math.random() > 0.98) {
          setIsMining(false);
        }
      }, 50);
    }
    return () => clearInterval(interval);
  }, [isMining]);

  return (
    <div className="terminal-window p-6 bg-muted/40 border-orange-500/20 shadow-2xl relative overflow-hidden">
      <div className="flex items-center space-x-3 mb-8">
        <div className="p-2 bg-orange-500/10 rounded-lg">
          <Lock className="w-5 h-5 text-orange-400" />
        </div>
        <h3 className="text-xl font-black text-foreground uppercase tracking-widest">Interactive: Proof of Work</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-6">
          <div className="p-4 bg-background/50 rounded-xl border border-border font-mono">
            <div className="flex justify-between mb-2">
              <span className="text-[10px] text-muted-foreground uppercase font-black">Block #835,421</span>
              <span className="text-[10px] text-orange-400 uppercase font-black">{isMining ? 'Mining...' : 'Ready'}</span>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Nonce:</span>
                <span className="text-sm text-foreground">{nonce}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-xs text-muted-foreground mb-1">Hash:</span>
                <span className="text-[10px] text-orange-400 break-all leading-tight">{hash}</span>
              </div>
            </div>
          </div>

          <button 
            onClick={() => setIsMining(!isMining)}
            className={`w-full py-3 rounded-xl font-black uppercase tracking-widest text-xs transition-all ${
              isMining ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-orange-500 text-black'
            }`}
          >
            {isMining ? 'Stop Mining' : 'Start Mining'}
          </button>
        </div>

        <div className="space-y-4">
          <h4 className="text-xs font-black text-foreground uppercase tracking-widest">How it works</h4>
          <p className="text-[10px] text-muted-foreground leading-relaxed">
            Miners must find a <span className="text-orange-400">nonce</span> that, when hashed with the block data, produces a result starting with a specific number of zeros. 
            This is the <span className="text-orange-400">difficulty</span>.
          </p>
          <div className="flex items-center space-x-4 p-3 bg-orange-500/5 border border-orange-500/20 rounded-lg">
            <Zap className="w-4 h-4 text-orange-400" />
            <p className="text-[10px] text-muted-foreground italic">
              Safety is guaranteed by the sheer energy required to rewrite history. To alter a block, you must re-mine all subsequent blocks faster than the rest of the network.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- Interactive Element: MapReduce Pipeline (MapReduce) ---
const MapReduceVisualization = () => {
  const [stage, setStage] = useState(0); 

  const data = ["apple", "banana", "apple", "cherry", "banana", "apple"];

  return (
    <div className="terminal-window p-6 bg-muted/40 border-yellow-500/20 shadow-2xl relative overflow-hidden">
      <div className="flex items-center space-x-3 mb-8">
        <div className="p-2 bg-yellow-500/10 rounded-lg">
          <Share2 className="w-5 h-5 text-yellow-400" />
        </div>
        <h3 className="text-xl font-black text-foreground uppercase tracking-widest">Interactive: MapReduce Pipeline</h3>
      </div>

      <div className="flex justify-between mb-8">
        {['Input', 'Map', 'Shuffle', 'Reduce'].map((s, i) => (
          <button 
            key={s} 
            onClick={() => setStage(i)}
            className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
              stage === i ? 'bg-yellow-500 text-black' : 'bg-muted text-muted-foreground hover:text-foreground'
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      <div className="h-48 flex items-center justify-center">
        <AnimatePresence mode="wait">
          {stage === 0 && (
            <motion.div key="input" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex gap-2">
              {data.map((d, i) => (
                <div key={i} className="px-3 py-2 bg-background border border-border rounded text-xs text-muted-foreground font-mono">{d}</div>
              ))}
            </motion.div>
          )}
          {stage === 1 && (
            <motion.div key="map" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="grid grid-cols-3 gap-4">
              {data.map((d, i) => (
                <div key={i} className="px-3 py-2 bg-yellow-500/10 border border-yellow-500/30 rounded text-xs text-yellow-400 font-mono">({d}, 1)</div>
              ))}
            </motion.div>
          )}
          {stage === 2 && (
            <motion.div key="shuffle" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex flex-col gap-2">
              <div className="px-3 py-2 bg-background border border-border rounded text-xs text-muted-foreground font-mono">apple: [1, 1, 1]</div>
              <div className="px-3 py-2 bg-background border border-border rounded text-xs text-muted-foreground font-mono">banana: [1, 1]</div>
              <div className="px-3 py-2 bg-background border border-border rounded text-xs text-muted-foreground font-mono">cherry: [1]</div>
            </motion.div>
          )}
          {stage === 3 && (
            <motion.div key="reduce" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex gap-4">
              <div className="px-4 py-3 bg-yellow-500 text-black rounded font-black text-sm">apple: 3</div>
              <div className="px-4 py-3 bg-yellow-500 text-black rounded font-black text-sm">banana: 2</div>
              <div className="px-4 py-3 bg-yellow-500 text-black rounded font-black text-sm">cherry: 1</div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

// --- Interactive Element: Dataflow Graph (TensorFlow) ---
const TensorFlowVisualization = () => {
  const [isActive, setIsActive] = useState(false);

  return (
    <div className="terminal-window p-6 bg-muted/40 border-orange-500/20 shadow-2xl relative overflow-hidden">
      <div className="flex items-center space-x-3 mb-8">
        <div className="p-2 bg-orange-500/10 rounded-lg">
          <Activity className="w-5 h-5 text-orange-400" />
        </div>
        <h3 className="text-xl font-black text-foreground uppercase tracking-widest">Interactive: Dataflow Graph</h3>
      </div>

      <div className="relative h-64 flex items-center justify-center">
        <div className="absolute inset-0 flex items-center justify-center">
          <svg width="100%" height="100%" className="max-w-md">
            <line x1="20%" y1="30%" x2="45%" y2="50%" stroke="#f97316" strokeWidth="2" strokeDasharray={isActive ? "5,5" : "0"} className={isActive ? "animate-pulse" : ""} />
            <line x1="20%" y1="70%" x2="45%" y2="50%" stroke="#f97316" strokeWidth="2" strokeDasharray={isActive ? "5,5" : "0"} className={isActive ? "animate-pulse" : ""} />
            <line x1="55%" y1="50%" x2="80%" y2="50%" stroke="#f97316" strokeWidth="2" strokeDasharray={isActive ? "5,5" : "0"} className={isActive ? "animate-pulse" : ""} />
          </svg>
        </div>

        <div className="relative z-10 flex w-full justify-around items-center">
          <div className="space-y-12">
            <div className="w-16 h-16 bg-background border border-border rounded-full flex items-center justify-center text-[10px] font-black text-muted-foreground">Input A</div>
            <div className="w-16 h-16 bg-background border border-border rounded-full flex items-center justify-center text-[10px] font-black text-muted-foreground">Input B</div>
          </div>
          <motion.div 
            animate={isActive ? { scale: [1, 1.1, 1] } : {}}
            transition={{ repeat: Infinity, duration: 1 }}
            className="w-20 h-20 bg-orange-500/20 border-2 border-orange-500 rounded-2xl flex items-center justify-center text-xs font-black text-orange-400"
          >
            MatMul
          </motion.div>
          <div className="w-16 h-16 bg-emerald-500/20 border border-emerald-500/40 rounded-full flex items-center justify-center text-[10px] font-black text-emerald-400">Output</div>
        </div>
      </div>

      <button 
        onClick={() => setIsActive(!isActive)}
        className="w-full py-3 bg-orange-500 text-black font-black uppercase tracking-widest text-xs rounded-xl"
      >
        {isActive ? 'Stop Execution' : 'Run Computation'}
      </button>
    </div>
  );
};

export default function BlogPage() {
  const { id } = useParams();
  const post = blogPosts.find(p => p.id === id);
  const [showPdf, setShowPdf] = useState(false);
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);
  const [pdfKey, setPdfKey] = useState(0);

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
      case 'bigtable': return "Interactive Read Path Explorer";
      case 'gfs': return "GFS Failure Simulator";
      case 'dynamo': return "Interactive Dynamo Ring";
      case 'bitcoin': return "Interactive Proof of Work";
      case 'mapreduce': return "Interactive MapReduce Pipeline";
      case 'tensorflow': return "Interactive Dataflow Graph";
      default: return "Interactive Simulation Environment";
    }
  };

  const renderInteractive = () => {
    switch (post.id) {
      case 'bigtable': return <BigtableReadPath />;
      case 'gfs': return <GFSSimulator />;
      case 'dynamo': return <DynamoRing />;
      case 'bitcoin': return <BitcoinVisualization />;
      case 'mapreduce': return <MapReduceVisualization />;
      case 'tensorflow': return <TensorFlowVisualization />;
      default: return null;
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
      <Link
        to="/blog"
        className="inline-flex items-center text-muted-foreground hover:text-primary mb-12 transition-colors font-bold uppercase tracking-widest text-[10px] group"
      >
        <ArrowLeft className="mr-2 w-3 h-3 group-hover:-translate-x-1 transition-transform" /> 
        <span>cd ..</span>
      </Link>

      <motion.article
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-5xl mx-auto"
      >
        <header className="mb-16">
          <div className="flex flex-wrap items-center gap-3 mb-8">
            <div className="px-3 py-1 bg-violet-500/10 rounded-md border border-violet-500/20 text-violet-400 text-[10px] font-black uppercase tracking-widest flex items-center space-x-2">
              <Terminal className="w-3 h-3" />
              <span>Log: {post.id}</span>
            </div>
            <div className="px-3 py-1 bg-emerald-500/10 rounded-md border border-emerald-500/20 text-emerald-500 text-[10px] font-black uppercase tracking-widest">
              Status: Analyzed
            </div>
            <div className="px-3 py-1 bg-primary/10 rounded-md border border-primary/20 text-primary text-[10px] font-black uppercase tracking-widest">
              {post.date}
            </div>
          </div>

          <h1 className="text-6xl md:text-9xl font-black mb-10 leading-[0.8] text-foreground tracking-tighter">
            {post.title.split(':').map((part, i) => (
              <span key={i} className={i === 1 ? "block text-primary/80 text-4xl md:text-6xl mt-6 font-bold tracking-tight" : ""}>
                {part}{i === 0 && post.title.includes(':') ? ':' : ''}
              </span>
            ))}
          </h1>

          <p className="text-2xl text-muted-foreground font-medium leading-relaxed mb-12 border-l-4 border-primary/30 pl-8 italic">
            {post.overview}
          </p>

          <div className="flex flex-wrap gap-3 mb-12">
            {post.tags.map(tag => (
              <span key={tag} className="px-4 py-2 bg-muted text-muted-foreground rounded-md text-[10px] font-black uppercase tracking-widest border border-border cursor-default">
                {tag}
              </span>
            ))}
          </div>
        </header>

        <div className="mb-20">
          <BlogTerminal text={post.aiSummary} />
        </div>

        {/* Interactive Widget Section - Full Width Breakout */}
        <div className="relative left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] w-screen px-4 sm:px-6 lg:px-8 mb-24 py-20 bg-muted/30 border-y border-border transition-colors">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center gap-4 mb-8">
              <div className="h-px flex-grow bg-border" />
              <div className="flex items-center gap-2 px-4 py-2 bg-card border border-border rounded-full">
                <Zap className="w-4 h-4 text-primary" />
                <span className="text-[10px] font-black text-foreground uppercase tracking-widest text-center">{getInteractiveTitle()}</span>
              </div>
              <div className="h-px flex-grow bg-border" />
            </div>
            {renderInteractive()}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-16">
          <div className="lg:col-span-8">
            <div className="prose prose-invert max-w-none">
              <div className="flex items-center space-x-4 mb-12">
                <div className="p-3 bg-primary/10 rounded-xl flex items-center justify-center">
                  <FileText className="w-8 h-8 text-primary" />
                </div>
                <h2 className="text-4xl font-black m-0 text-foreground tracking-tight uppercase tracking-widest leading-none">Analysis & Discussion</h2>
              </div>
              
              <div className="text-muted-foreground leading-relaxed text-xl space-y-12 font-medium">
                {post.content.split('\n\n').map((paragraph, i) => (
                  <div key={i} className="relative group">
                    <div className="absolute -left-10 top-2 opacity-0 group-hover:opacity-100 transition-opacity text-primary">
                      <ChevronRight className="w-6 h-6" />
                    </div>
                    <p className="relative">
                      {paragraph}
                    </p>
                  </div>
                ))}
              </div>
            </div>

              <div className="mt-24 pt-12 border-t border-border flex items-center justify-between">
                <div className="flex items-center space-x-6">
                  <div className="w-20 h-20 bg-muted rounded-2xl border border-border flex items-center justify-center shadow-lg group hover:border-primary/30 transition-colors">
                    <BookOpen className="w-10 h-10 text-primary group-hover:scale-110 transition-transform" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground uppercase font-black tracking-widest mb-1">Written by</p>
                    <p className="font-black text-2xl text-foreground tracking-tight">Brian S. Yu</p>
                    <p className="text-sm text-muted-foreground font-medium italic">Distributed Systems Researcher</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground uppercase font-black tracking-widest mb-1">Published</p>
                  <p className="font-mono text-sm text-muted-foreground">{formatDate(post.date)}</p>
                </div>
              </div>
            </div>

          <div className="lg:col-span-4 space-y-10">
            <div className="terminal-window p-6 bg-muted/40 border-border relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-violet-500/50 to-transparent" />
              <h3 className="text-[11px] font-black text-foreground uppercase tracking-[0.2em] mb-6 flex items-center">
                <Activity className="w-4 h-4 mr-3 text-primary" />
                System Metrics
              </h3>
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
                  <span className="text-[9px] text-muted-foreground uppercase font-black">Temporal Coordinate</span>
                  <span className="text-xs font-mono text-primary">MAR 2026</span>
                </div>
              </div>
            </div>

            <div className="terminal-window p-8 bg-violet-500/5 border-violet-500/20 shadow-xl relative overflow-hidden">
              <div className="flex items-center space-x-3 mb-8">
                <Quote className="w-6 h-6 text-violet-400" />
                <h3 className="text-[11px] font-black text-foreground uppercase tracking-widest">Original Citation</h3>
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

                    <button 
                      onClick={() => setShowPdf(!showPdf)}
                      className="flex items-center justify-between w-full p-3.5 bg-violet-500/10 border border-violet-500/20 rounded-xl text-violet-400 text-[13px] font-bold hover:bg-violet-500/20 transition-all group whitespace-nowrap"
                    >
                      <span className="flex items-center">
                        <Layers className="w-4 h-4 mr-3" />
                        Interactive Reader
                      </span>
                      <ChevronRight className={`w-4 h-4 transition-all duration-300 group-hover:translate-x-1 ${showPdf ? 'rotate-90' : ''}`} />
                    </button>
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
                  <div className="terminal-window border-primary/30 bg-card shadow-2xl flex flex-col h-[800px]">
                    <div className="terminal-header bg-muted px-4 py-2 border-b border-border flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <FileText className="w-3 h-3 text-primary" />
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

                    <div className="p-4 bg-muted border-t border-border">
                      <button 
                        onClick={() => setIsPdfModalOpen(true)}
                        className="w-full py-3 bg-primary text-primary-foreground font-black uppercase tracking-widest text-[10px] rounded-lg hover:bg-primary/90 transition-all flex items-center justify-center gap-3 group"
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
                <div className="terminal-window border-primary/30 bg-card shadow-[0_0_50px_rgba(0,0,0,0.5)] flex flex-col h-full overflow-hidden">
                  <div className="terminal-header bg-muted flex items-center justify-between px-6 py-4 border-b border-border">
                    <div className="flex items-center space-x-4">
                      <div className="flex space-x-2">
                        <div className="w-3 h-3 rounded-full bg-[#ff5f56]" />
                        <div className="w-3 h-3 rounded-full bg-[#ffbd2e]" />
                        <div className="w-3 h-3 rounded-full bg-[#27c93f]" />
                      </div>
                      <div className="h-4 w-[1px] bg-border mx-2" />
                      <div className="flex items-center space-x-3">
                        <FileText className="w-4 h-4 text-primary" />
                        <span className="text-xs font-black text-foreground uppercase tracking-widest">Research Document: {post.id}.pdf</span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <button 
                        onClick={() => setPdfKey(prev => prev + 1)}
                        className="p-2 hover:bg-muted-foreground/10 rounded-lg text-muted-foreground hover:text-foreground transition-all"
                        title="Refresh View"
                      >
                        <RotateCcw className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => setIsPdfModalOpen(false)}
                        className="p-2 hover:bg-red-500/20 rounded-lg text-muted-foreground hover:text-red-500 transition-all"
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
                        className="w-14 h-14 bg-primary text-primary-foreground rounded-xl shadow-2xl hover:scale-110 hover:rotate-3 transition-transform flex items-center justify-center group"
                      >
                        <Download className="w-6 h-6 group-hover:translate-y-1 transition-transform" />
                      </a>
                      <button 
                        onClick={() => setIsPdfModalOpen(false)}
                        className="w-14 h-14 bg-card backdrop-blur-md border border-border text-foreground rounded-xl shadow-2xl hover:scale-110 transition-transform flex items-center justify-center"
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
  );
}
