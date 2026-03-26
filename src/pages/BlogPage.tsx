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
  Activity
} from 'lucide-react';
import { blogPosts } from '../data/blogs';
import BlogTerminal from '../components/BlogTerminal';
import { useState, useMemo, useEffect } from 'react';

// --- Interactive Element: Tablet Hierarchy Visualization (BigTable) ---
const TabletHierarchy = () => {
  const [activeLevel, setActiveLevel] = useState<number | null>(null);

  const levels = [
    { 
      id: 1, 
      name: "Chubby File", 
      icon: <Terminal className="w-5 h-5" />, 
      desc: "Stores the location of the Root Tablet.",
      details: "A small file in the Chubby lock service. If clients lose this, they must restart the lookup process."
    },
    { 
      id: 2, 
      name: "Root Tablet", 
      icon: <Database className="w-5 h-5" />, 
      desc: "Contains pointers to all METADATA tablets.",
      details: "A special METADATA tablet that never splits, ensuring the hierarchy depth stays constant."
    },
    { 
      id: 3, 
      name: "METADATA Tablets", 
      icon: <Layers className="w-5 h-5" />, 
      desc: "Store mappings of row ranges to Tablet Servers.",
      details: "Each METADATA tablet stores the location of a set of user tablets."
    },
    { 
      id: 4, 
      name: "User Tablets", 
      icon: <Network className="w-5 h-5" />, 
      desc: "The actual data partitions served to clients.",
      details: "Divided into row ranges. Each tablet is roughly 100-200MB."
    }
  ];

  return (
    <div className="terminal-window p-6 bg-violet-950/10 border-violet-500/20 shadow-2xl overflow-hidden relative">
      <div className="absolute top-0 right-0 p-4 opacity-10">
        <Network className="w-32 h-32 text-primary" />
      </div>
      
      <div className="flex items-center space-x-3 mb-8">
        <div className="p-2 bg-primary/10 rounded-lg">
          <Layers className="w-5 h-5 text-primary" />
        </div>
        <h3 className="text-xl font-black text-white uppercase tracking-widest">Interactive: Tablet Hierarchy</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 relative">
        <div className="hidden md:block absolute top-1/2 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-primary/20 to-transparent -translate-y-1/2 z-0" />
        
        {levels.map((level, idx) => (
          <motion.div
            key={level.id}
            whileHover={{ scale: 1.02 }}
            onMouseEnter={() => setActiveLevel(level.id)}
            onMouseLeave={() => setActiveLevel(null)}
            className={`relative z-10 p-4 rounded-xl border transition-all duration-300 cursor-help ${
              activeLevel === level.id 
                ? 'bg-primary/10 border-primary/40 shadow-[0_0_20px_rgba(0,255,157,0.1)]' 
                : 'bg-white/5 border-white/10'
            }`}
          >
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 transition-colors ${
              activeLevel === level.id ? 'bg-primary text-black' : 'bg-white/10 text-gray-400'
            }`}>
              {level.icon}
            </div>
            <p className="text-[10px] font-black text-primary mb-1 uppercase tracking-widest">Level 0{idx + 1}</p>
            <h4 className="text-sm font-bold text-white mb-2">{level.name}</h4>
            <p className="text-[10px] text-gray-400 leading-tight">{level.desc}</p>
          </motion.div>
        ))}
      </div>

      <AnimatePresence>
        {activeLevel && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="mt-6 p-4 bg-primary/5 border border-primary/20 rounded-xl flex items-start space-x-3"
          >
            <Info className="w-4 h-4 text-primary shrink-0 mt-1" />
            <p className="text-xs text-gray-300 italic leading-relaxed">
              {levels.find(l => l.id === activeLevel)?.details}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// --- Interactive Element: GFS Architecture (GFS) ---
const GFSVisualization = () => {
  const [activeStep, setActiveStep] = useState<number | null>(null);

  const steps = [
    { id: 1, title: "1. Request Metadata", from: "Client", to: "Master", desc: "Client asks Master for chunk locations." },
    { id: 2, title: "2. Return Metadata", from: "Master", to: "Client", desc: "Master returns chunk handles and locations." },
    { id: 3, title: "3. Read/Write Data", from: "Client", to: "Chunkserver", desc: "Client interacts directly with Chunkserver." },
    { id: 4, title: "4. Replication", from: "Chunkserver", to: "Chunkserver", desc: "Data is replicated across multiple servers." }
  ];

  return (
    <div className="terminal-window p-6 bg-blue-950/10 border-blue-500/20 shadow-2xl relative overflow-hidden">
      <div className="flex items-center space-x-3 mb-8">
        <div className="p-2 bg-blue-500/10 rounded-lg">
          <Database className="w-5 h-5 text-blue-400" />
        </div>
        <h3 className="text-xl font-black text-white uppercase tracking-widest">Interactive: GFS Data Flow</h3>
      </div>

      <div className="flex flex-col md:flex-row items-center justify-around gap-8 mb-12">
        <div className="flex flex-col items-center">
          <div className="w-20 h-20 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center mb-2">
            <Terminal className="w-10 h-10 text-gray-400" />
          </div>
          <span className="text-xs font-bold text-white uppercase tracking-widest">Client</span>
        </div>

        <div className="flex flex-col items-center">
          <div className="w-24 h-24 bg-blue-500/10 border border-blue-500/30 rounded-2xl flex items-center justify-center mb-2 relative">
            <Cpu className="w-12 h-12 text-blue-400" />
            <div className="absolute -top-2 -right-2 px-2 py-0.5 bg-blue-500 text-black text-[8px] font-black rounded uppercase">Master</div>
          </div>
          <span className="text-xs font-bold text-white uppercase tracking-widest">Metadata Master</span>
        </div>

        <div className="flex flex-col items-center">
          <div className="flex gap-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center justify-center">
                <Database className="w-8 h-8 text-emerald-400" />
              </div>
            ))}
          </div>
          <span className="text-xs font-bold text-white uppercase tracking-widest mt-2">Chunkservers</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {steps.map(step => (
          <button
            key={step.id}
            onClick={() => setActiveStep(activeStep === step.id ? null : step.id)}
            className={`p-4 rounded-xl border text-left transition-all ${
              activeStep === step.id ? 'bg-blue-500/10 border-blue-500/40' : 'bg-white/5 border-white/10'
            }`}
          >
            <h4 className="text-sm font-bold text-white mb-1">{step.title}</h4>
            <p className="text-[10px] text-gray-400 leading-tight">{step.desc}</p>
          </button>
        ))}
      </div>
    </div>
  );
};

// --- Interactive Element: Consistent Hashing Ring (Dynamo) ---
const DynamoRing = () => {
  const [nodeCount, setNodeCount] = useState(4);
  const [vnodesPerNode, setVnodesPerNode] = useState(1);
  const [keys, setKeys] = useState<{ id: number; pos: number; color: string }[]>([]);

  const colors = ['#00ff9d', '#ffbd2e', '#ff5f56', '#27c93f', '#3b82f6', '#a855f7', '#ec4899'];

  const nodes = useMemo(() => {
    const result = [];
    for (let i = 0; i < nodeCount; i++) {
      for (let v = 0; v < vnodesPerNode; v++) {
        // Spread vnodes across the ring
        const pos = ((i * (360 / nodeCount)) + (v * (360 / (nodeCount * vnodesPerNode)))) % 360;
        result.push({ id: i, vnodeId: v, pos, color: colors[i % colors.length] });
      }
    }
    return result.sort((a, b) => a.pos - b.pos);
  }, [nodeCount, vnodesPerNode]);

  const addKey = () => {
    const newKey = {
      id: Date.now(),
      pos: Math.random() * 360,
      color: '#ffffff'
    };
    setKeys(prev => [...prev, newKey]);
  };

  const clearKeys = () => setKeys([]);

  const getOwnerNode = (keyPos: number) => {
    const owner = nodes.find(n => n.pos >= keyPos) || nodes[0];
    return owner;
  };

  const loadImbalance = useMemo(() => {
    if (keys.length === 0) return 0;
    const counts: Record<number, number> = {};
    keys.forEach(k => {
      const owner = getOwnerNode(k.pos);
      counts[owner.id] = (counts[owner.id] || 0) + 1;
    });
    const values = Object.values(counts);
    if (values.length === 0) return 0;
    const max = Math.max(...values);
    const avg = keys.length / nodeCount;
    return avg === 0 ? 0 : (max - avg) / avg;
  }, [keys, nodes, nodeCount]);

  return (
    <div className="terminal-window p-6 bg-emerald-950/10 border-emerald-500/20 shadow-2xl relative overflow-hidden">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-emerald-500/10 rounded-lg">
            <Activity className="w-5 h-5 text-emerald-400" />
          </div>
          <h3 className="text-xl font-black text-white uppercase tracking-widest">Interactive: Dynamo Ring</h3>
        </div>
        <div className="flex gap-2">
          <button onClick={addKey} className="p-2 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-emerald-400 hover:bg-emerald-500/20 transition-all">
            <Plus size={16} />
          </button>
          <button onClick={clearKeys} className="p-2 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 hover:bg-red-500/20 transition-all">
            <Minus size={16} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-center">
        <div className="space-y-6">
          <div>
            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest block mb-2">Physical Nodes: {nodeCount}</label>
            <input 
              type="range" min="2" max="7" value={nodeCount} 
              onChange={(e) => setNodeCount(parseInt(e.target.value))}
              className="w-full accent-emerald-500"
            />
          </div>
          <div>
            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest block mb-2">VNodes per Node: {vnodesPerNode}</label>
            <input 
              type="range" min="1" max="10" value={vnodesPerNode} 
              onChange={(e) => setVnodesPerNode(parseInt(e.target.value))}
              className="w-full accent-emerald-500"
            />
          </div>
          <div className="p-4 bg-white/5 rounded-xl border border-white/10">
            <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Load Imbalance</p>
            <div className="flex items-end space-x-2">
              <span className="text-2xl font-black text-white">{(loadImbalance * 100).toFixed(1)}%</span>
              <span className={`text-[10px] font-bold mb-1 ${loadImbalance > 0.5 ? 'text-red-400' : 'text-emerald-400'}`}>
                {loadImbalance > 0.5 ? 'High' : 'Optimal'}
              </span>
            </div>
          </div>
        </div>

        <div className="relative flex justify-center py-10">
          <div className="w-64 h-64 rounded-full border-2 border-dashed border-white/10 relative">
            <AnimatePresence>
              {nodes.map((node) => (
                <motion.div
                  key={`${node.id}-${node.vnodeId}`}
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                  className="absolute w-4 h-4 rounded-full border-2 border-black z-20"
                  style={{
                    backgroundColor: node.color,
                    left: `calc(50% + ${Math.cos((node.pos - 90) * (Math.PI / 180)) * 128}px - 8px)`,
                    top: `calc(50% + ${Math.sin((node.pos - 90) * (Math.PI / 180)) * 128}px - 8px)`,
                    boxShadow: `0 0 10px ${node.color}44`
                  }}
                />
              ))}
            </AnimatePresence>

            {keys.map((key) => {
              const owner = getOwnerNode(key.pos);
              return (
                <motion.div
                  key={key.id}
                  layout
                  className="absolute w-2 h-2 rounded-full z-10"
                  style={{
                    backgroundColor: owner.color,
                    left: `calc(50% + ${Math.cos((key.pos - 90) * (Math.PI / 180)) * 110}px - 4px)`,
                    top: `calc(50% + ${Math.sin((key.pos - 90) * (Math.PI / 180)) * 110}px - 4px)`,
                  }}
                />
              );
            })}
          </div>
        </div>

        <div className="p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-xl">
          <h4 className="text-xs font-black text-white uppercase tracking-widest mb-3">Minimal Movement</h4>
          <p className="text-[10px] text-gray-400 leading-relaxed italic">
            Notice how adding/removing nodes only affects keys in the immediate vicinity of the change. 
            Virtual nodes (vnodes) help distribute keys more evenly across physical hardware, reducing "hot spots".
          </p>
        </div>
      </div>
    </div>
  );
};

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
    <div className="terminal-window p-6 bg-orange-950/10 border-orange-500/20 shadow-2xl relative overflow-hidden">
      <div className="flex items-center space-x-3 mb-8">
        <div className="p-2 bg-orange-500/10 rounded-lg">
          <Lock className="w-5 h-5 text-orange-400" />
        </div>
        <h3 className="text-xl font-black text-white uppercase tracking-widest">Interactive: Proof of Work</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-6">
          <div className="p-4 bg-white/5 rounded-xl border border-white/10 font-mono">
            <div className="flex justify-between mb-2">
              <span className="text-[10px] text-gray-500 uppercase font-black">Block #835,421</span>
              <span className="text-[10px] text-orange-400 uppercase font-black">{isMining ? 'Mining...' : 'Ready'}</span>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-400">Nonce:</span>
                <span className="text-sm text-white">{nonce}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-xs text-gray-400 mb-1">Hash:</span>
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
          <h4 className="text-xs font-black text-white uppercase tracking-widest">How it works</h4>
          <p className="text-[10px] text-gray-400 leading-relaxed">
            Miners must find a <span className="text-orange-400">nonce</span> that, when hashed with the block data, produces a result starting with a specific number of zeros. 
            This is the <span className="text-orange-400">difficulty</span>.
          </p>
          <div className="flex items-center space-x-4 p-3 bg-orange-500/5 border border-orange-500/20 rounded-lg">
            <Zap className="w-4 h-4 text-orange-400" />
            <p className="text-[10px] text-gray-300 italic">
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
    <div className="terminal-window p-6 bg-yellow-950/10 border-yellow-500/20 shadow-2xl relative overflow-hidden">
      <div className="flex items-center space-x-3 mb-8">
        <div className="p-2 bg-yellow-500/10 rounded-lg">
          <Share2 className="w-5 h-5 text-yellow-400" />
        </div>
        <h3 className="text-xl font-black text-white uppercase tracking-widest">Interactive: MapReduce Pipeline</h3>
      </div>

      <div className="flex justify-between mb-8">
        {['Input', 'Map', 'Shuffle', 'Reduce'].map((s, i) => (
          <button 
            key={s} 
            onClick={() => setStage(i)}
            className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
              stage === i ? 'bg-yellow-500 text-black' : 'bg-white/5 text-gray-500'
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
                <div key={i} className="px-3 py-2 bg-white/5 border border-white/10 rounded text-xs text-gray-400 font-mono">{d}</div>
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
              <div className="px-3 py-2 bg-white/5 border border-white/10 rounded text-xs text-gray-400 font-mono">apple: [1, 1, 1]</div>
              <div className="px-3 py-2 bg-white/5 border border-white/10 rounded text-xs text-gray-400 font-mono">banana: [1, 1]</div>
              <div className="px-3 py-2 bg-white/5 border border-white/10 rounded text-xs text-gray-400 font-mono">cherry: [1]</div>
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
    <div className="terminal-window p-6 bg-orange-950/10 border-orange-500/20 shadow-2xl relative overflow-hidden">
      <div className="flex items-center space-x-3 mb-8">
        <div className="p-2 bg-orange-500/10 rounded-lg">
          <Activity className="w-5 h-5 text-orange-400" />
        </div>
        <h3 className="text-xl font-black text-white uppercase tracking-widest">Interactive: Dataflow Graph</h3>
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
            <div className="w-16 h-16 bg-white/5 border border-white/10 rounded-full flex items-center justify-center text-[10px] font-black text-gray-400">Input A</div>
            <div className="w-16 h-16 bg-white/5 border border-white/10 rounded-full flex items-center justify-center text-[10px] font-black text-gray-400">Input B</div>
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

  if (!post) return <Navigate to="/blog" />;

  const renderInteractive = () => {
    switch (post.id) {
      case 'bigtable': return <TabletHierarchy />;
      case 'gfs': return <GFSVisualization />;
      case 'dynamo': return <DynamoRing />;
      case 'bitcoin': return <BitcoinVisualization />;
      case 'mapreduce': return <MapReduceVisualization />;
      case 'tensorflow': return <TensorFlowVisualization />;
      default: return null;
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
      <Link
        to="/blog"
        className="inline-flex items-center text-gray-500 hover:text-primary mb-12 transition-colors font-bold uppercase tracking-widest text-[10px] group"
      >
        <ArrowLeft className="mr-2 w-3 h-3 group-hover:-translate-x-1 transition-transform" /> 
        <span>cd ..</span>
      </Link>

      <motion.article
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid grid-cols-1 lg:grid-cols-12 gap-12"
      >
        <div className="lg:col-span-8">
          <header className="mb-16">
            <div className="flex flex-wrap items-center gap-3 mb-6">
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

            <h1 className="text-5xl md:text-8xl font-black mb-8 leading-[0.85] text-white tracking-tighter">
              {post.title.split(':').map((part, i) => (
                <span key={i} className={i === 1 ? "block text-primary/80 text-4xl md:text-5xl mt-4" : ""}>
                  {part}{i === 0 && post.title.includes(':') ? ':' : ''}
                </span>
              ))}
            </h1>

            <p className="text-xl text-gray-400 font-medium leading-relaxed mb-12 border-l-4 border-primary/30 pl-6 italic">
              {post.overview}
            </p>
          </header>

          <div className="mb-16">
            <BlogTerminal text={post.aiSummary} />
          </div>

          <div className="mb-16">
            {renderInteractive()}
          </div>

          <div className="prose prose-invert max-w-none">
            <div className="flex items-center space-x-4 mb-10">
              <div className="p-3 bg-primary/10 rounded-xl">
                <FileText className="w-7 h-7 text-primary" />
              </div>
              <h2 className="text-3xl font-black m-0 text-white tracking-tight uppercase tracking-widest">Analysis & Discussion</h2>
            </div>
            
            <div className="text-gray-300 leading-relaxed text-xl space-y-10 font-medium">
              {post.content.split('\n\n').map((paragraph, i) => (
                <div key={i} className="relative group">
                  <div className="absolute -left-8 top-2 opacity-0 group-hover:opacity-100 transition-opacity text-primary">
                    <ChevronRight className="w-5 h-5" />
                  </div>
                  <p className="relative">
                    {paragraph}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-20 pt-12 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="flex items-center space-x-5">
              <div className="w-16 h-16 bg-white/5 rounded-2xl border border-white/10 flex items-center justify-center shadow-lg group hover:border-primary/30 transition-colors">
                <BookOpen className="w-8 h-8 text-primary group-hover:scale-110 transition-transform" />
              </div>
              <div>
                <p className="text-[10px] text-gray-500 uppercase font-black tracking-widest">Written by</p>
                <p className="font-black text-xl text-white tracking-tight">Brian S. Yu</p>
              </div>
            </div>
            
            <div className="flex flex-wrap gap-3">
              {post.tags.map(tag => (
                <span key={tag} className="px-4 py-2 bg-white/5 text-gray-400 rounded-md text-[10px] font-black uppercase tracking-widest border border-white/10 hover:border-primary/30 hover:text-primary transition-all cursor-default">
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="lg:col-span-4 space-y-8">
          <div className="terminal-window p-6 bg-violet-950/10 border-violet-500/20 shadow-xl relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-violet-500/50 to-transparent" />
            <div className="flex items-center space-x-3 mb-6">
              <Quote className="w-5 h-5 text-violet-400" />
              <h3 className="text-xs font-black text-white uppercase tracking-widest">Original Citation</h3>
            </div>
            <p className="text-gray-400 italic text-sm font-medium leading-relaxed mb-6">
              "{post.citation}"
            </p>
            {post.pdfUrl && (
              <div className="space-y-3">
                <a 
                  href={post.pdfUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center justify-between w-full p-3 bg-violet-500/10 border border-violet-500/20 rounded-lg text-violet-400 text-xs font-bold hover:bg-violet-500/20 transition-all group"
                >
                  <span className="flex items-center">
                    <ExternalLink className="w-4 h-4 mr-2" />
                    View Original Paper
                  </span>
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </a>
                <button 
                  onClick={() => setShowPdf(!showPdf)}
                  className="flex items-center justify-center w-full p-3 bg-primary/10 border border-primary/20 rounded-lg text-primary text-xs font-bold hover:bg-primary/20 transition-all"
                >
                  <Layers className="w-4 h-4 mr-2" />
                  {showPdf ? "Hide PDF Viewer" : "Show PDF Viewer"}
                </button>
              </div>
            )}
          </div>

          <AnimatePresence>
            {showPdf && post.pdfUrl && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="terminal-window border-white/10 bg-black/40 h-[600px] relative">
                  <iframe 
                    src={`${post.pdfUrl}#toolbar=0`} 
                    className="w-full h-full rounded-lg"
                    title="Research Paper PDF"
                  />
                  <div className="absolute bottom-4 right-4">
                    <a 
                      href={post.pdfUrl} 
                      download 
                      className="p-3 bg-primary text-black rounded-full shadow-2xl hover:scale-110 transition-transform flex items-center justify-center"
                    >
                      <Download className="w-5 h-5" />
                    </a>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="terminal-window p-6 bg-white/5 border-white/10">
            <h3 className="text-xs font-black text-white uppercase tracking-widest mb-6 flex items-center">
              <Info className="w-4 h-4 mr-2 text-primary" />
              System Metadata
            </h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center py-2 border-b border-white/5">
                <span className="text-[10px] text-gray-500 uppercase font-bold">Word Count</span>
                <span className="text-xs font-mono text-gray-300">{post.content.split(/\s+/).length} words</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-white/5">
                <span className="text-[10px] text-gray-500 uppercase font-bold">Read Time</span>
                <span className="text-xs font-mono text-gray-300">{Math.ceil(post.content.split(/\s+/).length / 200)} min</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-white/5">
                <span className="text-[10px] text-gray-500 uppercase font-bold">Complexity</span>
                <span className="text-xs font-mono text-emerald-500">O(log N)</span>
              </div>
            </div>
          </div>
        </div>
      </motion.article>
    </div>
  );
}
