import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Play, Pause, RotateCcw, Settings2, 
  Database, Activity, Shield, TrendingUp, Info, 
  Network, Cpu, Layers, AlertTriangle, Hash, Clock,
  ChevronRight, Share2, Zap, RefreshCw
} from 'lucide-react';
import { Block, Miner, NetworkEvent, SimulationMetrics, BlockId, MinerId } from './types';
import { COLORS, generateId, calculateLongestChain } from './utils';
import { BlockTree } from './BlockTree';
import { NetworkView } from './NetworkView';
import { MempoolView } from './MempoolView';

// --- Constants ---
const TICK_MS = 50; // Simulation tick rate
const GENESIS_BLOCK: Block = {
  id: 'genesis',
  parentId: null,
  height: 0,
  minerId: 'system',
  timestamp: 0,
  color: '#64748b' // slate-500
};

export const BitcoinSimulator: React.FC = () => {
  // --- Simulation State ---
  const [isRunning, setIsRunning] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [speed, setSpeed] = useState(1); // 1x, 2x, 5x
  const [latency, setLatency] = useState(2000); // ms for full propagation
  const [minerCount, setMinerCount] = useState(5);
  const [confirmationThreshold, setConfirmationThreshold] = useState(6);
  
  const [blocks, setBlocks] = useState<Block[]>([GENESIS_BLOCK]);
  const [miners, setMiners] = useState<Miner[]>([]);
  const [events, setEvents] = useState<NetworkEvent[]>([]);
  const [simulationTime, setSimulationTime] = useState(0);
  const [selectedNodeId, setSelectedNodeId] = useState<MinerId | null>(null);
  
  // --- UI State ---
  const [activeTab, setActiveTab] = useState<'viz' | 'network' | 'mempool'>('viz');
  const [hoveredBlock, setHoveredBlock] = useState<Block | null>(null);
  const [lastAction, setLastAction] = useState<string | null>(null);

  // --- Auto-fade Simulation Log ---
  useEffect(() => {
    if (lastAction) {
      const timer = setTimeout(() => setLastAction(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [lastAction]);

  // --- Resize Handler ---
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024 && activeTab === 'mempool') {
        setActiveTab('viz');
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [activeTab]);

  // --- Refs for Simulation ---
  const blocksRef = useRef<Block[]>(blocks);
  const minersRef = useRef<Miner[]>(miners);
  const eventsRef = useRef<NetworkEvent[]>(events);
  const timeRef = useRef(0);

  // Sync refs
  useEffect(() => { blocksRef.current = blocks; }, [blocks]);
  useEffect(() => { minersRef.current = miners; }, [miners]);
  useEffect(() => { eventsRef.current = events; }, [events]);

  // --- Initialization ---
  const initMiners = useCallback((count: number) => {
    const newMiners: Miner[] = [];
    const hp = 100 / count;
    for (let i = 0; i < count; i++) {
      const id = `Miner-${i + 1}`;
      newMiners.push({
        id,
        hashPower: hp,
        knownBlockIds: new Set(['genesis']),
        tipId: 'genesis',
        color: COLORS[i % COLORS.length],
        mempool: [],
        reorgCount: 0,
        localChainHeight: 1,
        orphanedBlocksSeen: 0,
        avgPropagationDelay: 0,
        propagationDelays: []
      });
    }
    setMiners(newMiners);
    if (newMiners.length > 0) setSelectedNodeId(newMiners[0].id);
    setBlocks([GENESIS_BLOCK]);
    setEvents([]);
    setSimulationTime(0);
    timeRef.current = 0;
  }, []);

  useEffect(() => {
    initMiners(minerCount);
  }, [minerCount, initMiners]);

  // --- Simulation Logic ---
  const step = useCallback(() => {
    const dt = TICK_MS * speed;
    timeRef.current += dt;
    setSimulationTime(timeRef.current);

    const currentBlocks = [...blocksRef.current];
    const currentMiners = [...minersRef.current];
    const currentEvents = [...eventsRef.current];

    let stateChanged = false;

    // 1. Simulate Transaction Arrivals
    if (Math.random() < 0.1) {
      currentMiners.forEach(m => {
        if (m.mempool.length < 50) {
          m.mempool.push({
            id: `tx-${generateId()}`,
            fee: Math.random() * 50,
            size: 200 + Math.random() * 1000,
            timestamp: timeRef.current
          });
        }
      });
      stateChanged = true;
    }

    // 2. Process Network Events (Propagation)
    const arrivingEvents = currentEvents.filter(e => e.arrivalTime <= timeRef.current);
    const remainingEvents = currentEvents.filter(e => e.arrivalTime > timeRef.current);

    if (arrivingEvents.length > 0) {
      arrivingEvents.forEach(event => {
        const minerIndex = currentMiners.findIndex(m => m.id === event.toMinerId);
        if (minerIndex !== -1) {
          const miner = currentMiners[minerIndex];
          if (!miner.knownBlockIds.has(event.blockId)) {
            miner.knownBlockIds.add(event.blockId);
            
            const block = currentBlocks.find(b => b.id === event.blockId);
            const currentTip = currentBlocks.find(b => b.id === miner.tipId);
            
            if (block && currentTip) {
              // Track propagation delay
              const delay = timeRef.current - block.timestamp;
              miner.propagationDelays.push(delay);
              miner.avgPropagationDelay = miner.propagationDelays.reduce((a, b) => a + b, 0) / miner.propagationDelays.length;

              const isBetter = block.height > currentTip.height || (block.height === currentTip.height && block.timestamp < currentTip.timestamp);
              
              if (isBetter) {
                // Check if it's a reorg (switching to a different branch)
                // A reorg happens if the new tip is not a direct child of the old tip
                if (block.parentId !== miner.tipId) {
                  miner.reorgCount++;
                }
                miner.tipId = block.id;
                miner.localChainHeight = block.height + 1;
              } else {
                miner.orphanedBlocksSeen++;
              }
            }
            
            // Propagate to neighbors (all-to-all with latency)
            currentMiners.forEach(peer => {
              if (peer.id !== miner.id && !peer.knownBlockIds.has(event.blockId)) {
                const inFlight = remainingEvents.some(re => re.toMinerId === peer.id && re.blockId === event.blockId);
                if (!inFlight) {
                  remainingEvents.push({
                    id: generateId(),
                    type: 'PROPAGATION',
                    blockId: event.blockId,
                    fromMinerId: miner.id,
                    toMinerId: peer.id,
                    arrivalTime: timeRef.current + (Math.random() * 0.5 + 0.5) * latency
                  });
                }
              }
            });
          }
        }
      });
      stateChanged = true;
    }

    // 2. Mining Process (Poisson)
    const TARGET_BLOCK_TIME = 10000; 
    const miningProbability = dt / TARGET_BLOCK_TIME;

    currentMiners.forEach(miner => {
      const minerMiningProb = miningProbability * (miner.hashPower / 100);
      if (Math.random() < minerMiningProb) {
        const parent = currentBlocks.find(b => b.id === miner.tipId) || GENESIS_BLOCK;
        const newBlock: Block = {
          id: `Block-${currentBlocks.length}`,
          parentId: parent.id,
          height: parent.height + 1,
          minerId: miner.id,
          timestamp: timeRef.current,
          color: miner.color
        };
        
        currentBlocks.push(newBlock);
        miner.knownBlockIds.add(newBlock.id);
        miner.tipId = newBlock.id;
        miner.localChainHeight = newBlock.height + 1;
        miner.mempool = []; // Clear mempool when block is mined
        
        // Broadcast to peers
        currentMiners.forEach(peer => {
          if (peer.id !== miner.id) {
            remainingEvents.push({
              id: generateId(),
              type: 'PROPAGATION',
              blockId: newBlock.id,
              fromMinerId: miner.id,
              toMinerId: peer.id,
              arrivalTime: timeRef.current + (Math.random() * 0.5 + 0.5) * latency
            });
          }
        });
        
        stateChanged = true;
        setLastAction(`${miner.id} found ${newBlock.id}`);
      }
    });

    if (stateChanged || arrivingEvents.length > 0) {
      setBlocks(currentBlocks);
      setMiners(currentMiners);
      setEvents(remainingEvents);
    } else if (remainingEvents.length !== currentEvents.length) {
      setEvents(remainingEvents);
    }
  }, [speed, latency, blocks, miners, events]);

  // Simulation Loop
  useEffect(() => {
    if (!isRunning) return;
    const interval = setInterval(step, TICK_MS);
    return () => clearInterval(interval);
  }, [isRunning, step]);

  // --- Metrics Calculation ---
  const metrics = useMemo((): SimulationMetrics => {
    const mainChain = calculateLongestChain(blocks, 'genesis');
    const totalBlocks = blocks.length - 1;
    
    // Fork Count: Number of blocks that share a parent with another block
    const forkPoints = new Set<string>();
    blocks.forEach(b => {
      if (b.parentId) {
        const siblings = blocks.filter(other => other.parentId === b.parentId);
        if (siblings.length > 1) forkPoints.add(b.parentId);
      }
    });
    const forkCount = forkPoints.size;

    const orphans = blocks.filter(b => b.id !== 'genesis' && !mainChain.includes(b.id));
    const orphanRate = totalBlocks > 0 ? orphans.length / totalBlocks : 0;
    
    const minerBlockShare: Record<MinerId, number> = {};
    blocks.forEach(b => {
      if (b.id === 'genesis') return;
      minerBlockShare[b.minerId] = (minerBlockShare[b.minerId] || 0) + 1;
    });

    // Avg Fork Depth
    let totalForkDepth = 0;
    if (orphans.length > 0) {
      orphans.forEach(o => {
        // Find how deep this orphan goes before it died
        totalForkDepth += 1; // Simplified
      });
    }

    return {
      totalBlocks,
      forkCount,
      orphanRate,
      longestChainLength: mainChain.length,
      avgForkDepth: orphans.length > 0 ? totalForkDepth / orphans.length : 0,
      minerBlockShare,
      globalCanonicalChain: mainChain
    };
  }, [blocks]);

  const reset = () => {
    setIsRunning(false);
    setHasStarted(false);
    initMiners(minerCount);
    setLastAction('System Reset');
  };

  const selectedNode = miners.find(m => m.id === selectedNodeId);

  return (
    <div className="w-[1200px] mx-auto bg-card border border-border shadow-2xl flex flex-col relative overflow-hidden rounded-lg font-mono selection:bg-primary/30 text-foreground transition-colors h-[850px]">
      {/* Header */}
      <header className="flex flex-row items-center justify-between px-6 py-4 border-b border-border bg-muted/50 shrink-0 gap-4">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            <Layers className="w-5 h-5 text-primary" />
            <h1 className="text-[15px] font-black uppercase tracking-[0.25em] text-foreground">BITCOIN_CONSENSUS_SIM_V1</h1>
          </div>
          
          <div className="hidden lg:flex items-center gap-4 px-3 py-1.5 bg-background border border-border rounded-sm">
            <div className="flex flex-col">
              <span className="text-[8px] font-bold uppercase tracking-widest text-muted-foreground">Network_Status</span>
              <span className="text-[10px] font-black text-primary uppercase tracking-widest">
                {isRunning ? 'ACTIVE_MINING' : 'PAUSED'}
              </span>
            </div>
            <div className="h-4 w-[1px] bg-border" />
            <div className="flex flex-col">
              <span className="text-[8px] font-bold uppercase tracking-widest text-muted-foreground">Sim_Time</span>
              <span className="text-[10px] font-black text-foreground tabular-nums">
                {(simulationTime / 1000).toFixed(1)}s
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={() => {
              if (!hasStarted) setHasStarted(true);
              setIsRunning(!isRunning);
            }}
            className={`flex items-center justify-center gap-2 px-4 py-2 rounded-sm font-bold text-[11px] uppercase transition-all border ${
              isRunning 
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-500 hover:bg-amber-500/20' 
                : 'bg-primary border-primary/30 text-primary-foreground hover:bg-primary/90 shadow-[0_0_10px_rgba(var(--primary-rgb),0.2)]'
            }`}
          >
            {isRunning ? <Pause className="w-3 h-3 fill-current" /> : <Play className="w-3 h-3 fill-current" />}
            {isRunning ? 'Pause' : hasStarted ? 'Resume' : 'init_sys'}
          </button>
          <button 
            onClick={reset}
            className="flex items-center justify-center p-2 bg-muted hover:bg-muted/80 text-foreground rounded-sm transition-all border border-border"
            title="Reset"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </header>

      <div className="flex flex-1 flex-row overflow-hidden">
        {/* Left Panel: Controls */}
        <aside className="w-64 border-r border-border bg-muted/30 p-4 flex flex-col gap-6 overflow-y-auto custom-scrollbar shrink-0">
          {/* Node Perspective */}
          <section className="space-y-4">
            <div className="flex items-center gap-2 opacity-60">
              <Shield className="w-4 h-4 text-primary" />
              <h3 className="text-[10px] font-bold uppercase tracking-[0.15em]">Perspective</h3>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-[8px] font-bold uppercase tracking-widest text-muted-foreground">
                <span>Switch Node</span>
              </div>
              <div className="grid grid-cols-2 gap-1">
                {miners.map(m => (
                  <button 
                    key={m.id} onClick={() => setSelectedNodeId(m.id)}
                    className={`py-1.5 text-[9px] font-bold rounded-sm border transition-all ${
                      selectedNodeId === m.id ? 'bg-primary/20 border-primary text-primary' : 'bg-background border-border text-muted-foreground'
                    }`}
                  >
                    {m.id} {selectedNodeId === m.id ? '(YOU)' : ''}
                  </button>
                ))}
              </div>
            </div>
          </section>

          {/* Simulation Parameters */}
          <section className="space-y-4">
            <div className="flex items-center gap-2 opacity-60">
              <Settings2 className="w-4 h-4 text-primary" />
              <h3 className="text-[10px] font-bold uppercase tracking-[0.15em]">Parameters</h3>
            </div>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-[8px] font-bold uppercase tracking-widest text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <Cpu className="w-3 h-3" />
                    <span>Miners</span>
                  </div>
                  <span className="text-primary">{minerCount}</span>
                </div>
                <input 
                  type="range" min="2" max="10" value={minerCount}
                  onChange={(e) => setMinerCount(parseInt(e.target.value))}
                  className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary touch-none my-2"
                  style={{
                    background: `linear-gradient(to right, var(--primary) 0%, var(--primary) ${(minerCount - 2) / (10 - 2) * 100}%, var(--muted) ${(minerCount - 2) / (10 - 2) * 100}%, var(--muted) 100%)`
                  }}
                />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-[8px] font-bold uppercase tracking-widest text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3 h-3" />
                    <span>Latency</span>
                  </div>
                  <span className="text-primary">{latency}ms</span>
                </div>
                <input 
                  type="range" min="0" max="10000" step="500" value={latency}
                  onChange={(e) => setLatency(parseInt(e.target.value))}
                  className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary touch-none my-2"
                  style={{
                    background: `linear-gradient(to right, var(--primary) 0%, var(--primary) ${latency / 10000 * 100}%, var(--muted) ${latency / 10000 * 100}%, var(--muted) 100%)`
                  }}
                />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-[8px] font-bold uppercase tracking-widest text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <Zap className="w-3 h-3" />
                    <span>Speed</span>
                  </div>
                  <span className="text-primary">{speed}x</span>
                </div>
                <div className="grid grid-cols-4 gap-1">
                  {[1, 2, 5, 10].map(s => (
                    <button 
                      key={s} onClick={() => setSpeed(s)}
                      className={`py-1 text-[9px] font-bold rounded-sm border transition-all ${
                        speed === s ? 'bg-primary/20 border-primary text-primary' : 'bg-background border-border text-muted-foreground'
                      }`}
                    >
                      {s}x
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* Local Miner Config */}
          {selectedNode && (
            <section className="space-y-4">
              <div className="flex items-center gap-2 opacity-60">
                <Hash className="w-4 h-4 text-primary" />
                <h3 className="text-[10px] font-bold uppercase tracking-[0.15em]">Local_Miner</h3>
              </div>
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-[8px] font-bold uppercase tracking-widest text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: selectedNode.color }} />
                      <span>{selectedNode.id} Hash Power</span>
                    </div>
                    <span className="text-primary">{Math.round(selectedNode.hashPower)}%</span>
                  </div>
                  <input 
                    type="range" min="1" max="100" value={selectedNode.hashPower}
                    onChange={(e) => {
                      const newVal = parseInt(e.target.value);
                      setMiners(prev => prev.map(m => m.id === selectedNode.id ? { ...m, hashPower: newVal } : m));
                    }}
                    className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary touch-none"
                    style={{
                      background: `linear-gradient(to right, var(--primary) 0%, var(--primary) ${(selectedNode.hashPower - 1) / (100 - 1) * 100}%, var(--muted) ${(selectedNode.hashPower - 1) / (100 - 1) * 100}%, var(--muted) 100%)`
                    }}
                  />
                </div>
              </div>
            </section>
          )}
        </aside>

        {/* Main Content: Visualization */}
        <main className="flex-1 flex flex-col overflow-hidden relative">
          {/* Tabs */}
          <div className="flex border-b border-border bg-muted/20 overflow-x-auto no-scrollbar scroll-smooth">
            <div className="flex min-w-max">
              <button 
                onClick={() => setActiveTab('viz')}
                className={`px-6 py-3 text-[10px] font-bold uppercase tracking-widest transition-all border-b-2 flex items-center gap-2 ${
                  activeTab === 'viz' ? 'border-primary text-primary bg-primary/5' : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                <Layers className="w-3 h-3" />
                <span>Block_Tree</span>
              </button>
              <button 
                onClick={() => setActiveTab('network')}
                className={`px-6 py-3 text-[10px] font-bold uppercase tracking-widest transition-all border-b-2 flex items-center gap-2 ${
                  activeTab === 'network' ? 'border-primary text-primary bg-primary/5' : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                <Share2 className="w-3 h-3" />
                <span>Propagation</span>
              </button>
            </div>
          </div>

          {/* Viz Area */}
          <div className="flex-1 flex overflow-hidden">
            <div className="flex-1 relative overflow-hidden bg-background">
              {activeTab === 'viz' ? (
                <BlockTree 
                  blocks={blocks} 
                  hoveredBlock={hoveredBlock} 
                  setHoveredBlock={setHoveredBlock} 
                  confirmationThreshold={confirmationThreshold}
                  selectedNodeId={selectedNodeId}
                  globalCanonicalChain={metrics.globalCanonicalChain}
                />
              ) : activeTab === 'network' ? (
                <NetworkView 
                  miners={miners} 
                  events={events} 
                  blocks={blocks} 
                  simulationTime={simulationTime} 
                  selectedNodeId={selectedNodeId}
                />
              ) : (
                <div className="lg:hidden h-full">
                  <MempoolView 
                    key={selectedNodeId} 
                    transactions={selectedNode?.mempool || []} 
                  />
                </div>
              )}

              {/* Miner Block Share Widget (Top Right) */}
              <div className="absolute top-4 right-4 w-48 bg-background/80 backdrop-blur-md border border-border p-2 rounded-sm shadow-lg z-30 hidden sm:block">
                <div className="flex justify-between items-center mb-1.5">
                  <span className="text-[7px] font-bold uppercase tracking-widest text-muted-foreground">Miner_Block_Share</span>
                  <div className="flex items-center gap-1">
                    <span className="w-1 h-1 rounded-full bg-primary animate-pulse" />
                    <span className="text-[7px] font-bold uppercase tracking-widest text-primary">Live</span>
                  </div>
                </div>
                <div className="flex h-1.5 rounded-full overflow-hidden bg-muted border border-border/50">
                  {miners.map(m => {
                    const share = (metrics.minerBlockShare[m.id] || 0) / (metrics.totalBlocks || 1);
                    return (
                      <div 
                        key={m.id} 
                        style={{ width: `${share * 100}%`, backgroundColor: m.color }}
                        className="h-full transition-all duration-500 relative group"
                      >
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-card border border-border rounded-sm opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50 shadow-xl">
                          <span className="text-[8px] font-bold uppercase tracking-widest">{m.id}: {Math.round(share * 100)}%</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

      {/* Simulation Log Overlay */}
      <div className="absolute bottom-4 left-4 pointer-events-none overflow-hidden h-12 flex items-end z-50">
        <AnimatePresence mode="wait">
          {lastAction && (
            <motion.div 
              key={lastAction}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, filter: "blur(4px)", transition: { duration: 0.2 } }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="bg-background/95 backdrop-blur-md border border-border px-3 py-1.5 rounded-sm inline-flex items-center gap-2 shadow-xl"
            >
              <Activity className="w-3 h-3 text-primary animate-pulse" />
              <span className="text-[9px] font-bold uppercase tracking-widest text-foreground">{lastAction}</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
            </div>

            {/* Local Mempool Panel */}
            <div className="flex w-72 shrink-0">
              <MempoolView 
                key={selectedNodeId} 
                transactions={selectedNode?.mempool || []} 
              />
            </div>
          </div>
        </main>
      </div>

      {/* Footer: Metrics */}
      <footer className="h-auto border-t border-border bg-muted/50 p-4 flex items-center justify-between shrink-0">
        <div className="grid grid-cols-6 gap-8 flex-1 w-full">
          <MetricItem label="Height" value={selectedNode?.localChainHeight || 0} icon={<Database className="w-3 h-3" />} />
          <MetricItem label="Forks" value={miners.find(m => m.id === selectedNodeId)?.orphanedBlocksSeen || 0} icon={<AlertTriangle className="w-3 h-3" />} color="text-amber-500" />
          <MetricItem label="Reorgs" value={selectedNode?.reorgCount || 0} icon={<RefreshCw className="w-3 h-3" />} color="text-amber-400" />
          <MetricItem label="Orphans" value={selectedNode?.orphanedBlocksSeen || 0} icon={<Activity className="w-3 h-3" />} />
          <MetricItem label="Delay" value={`${(selectedNode?.avgPropagationDelay || 0).toFixed(0)}ms`} icon={<Clock className="w-3 h-3" />} />
          <MetricItem 
            label="Diverge" 
            value={metrics.longestChainLength - (selectedNode?.localChainHeight || 0)} 
            icon={<TrendingUp className="w-3 h-3" />} 
            color={(metrics.longestChainLength - (selectedNode?.localChainHeight || 0)) > 0 ? "text-red-500" : "text-emerald-500"} 
          />
        </div>
      </footer>
    </div>
  );
};

const MetricItem: React.FC<{ label: string; value: string | number; icon: React.ReactNode; color?: string }> = ({ label, value, icon, color = "text-foreground" }) => (
  <div className="flex flex-col gap-0.5 min-w-0">
    <div className="flex items-center gap-1 opacity-60">
      {icon}
      <span className="text-[8px] font-bold uppercase tracking-widest truncate">{label}</span>
    </div>
    <span className={`text-lg font-black tabular-nums truncate ${color}`}>{value}</span>
  </div>
);

export default BitcoinSimulator;
