import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Settings2, 
  Plus, 
  Trash2, 
  RefreshCw, 
  Layers, 
  Database, 
  TrendingUp, 
  Activity, 
  Info, 
  Hash, 
  LayoutGrid,
  AlertTriangle,
  Shield,
  Zap,
  ChevronRight,
  Play,
  Pause as PauseIcon
} from 'lucide-react';
import { 
  hash, 
  generateId, 
  Token, 
  PhysicalNode, 
  Key, 
  findSuccessors, 
  COLORS 
} from './utils';

const SVG_SIZE = 600;
const CENTER = SVG_SIZE / 2;
const RING_RADIUS = 220;

export const DynamoRing: React.FC = () => {
  // --- State ---
  const [nodes, setNodes] = useState<PhysicalNode[]>([]);
  const [keys, setKeys] = useState<Key[]>([]);
  const [vnodeCount, setVnodeCount] = useState<number>(12);
  const [useVNodes, setUseVNodes] = useState<boolean>(true);
  const [replicationFactor, setReplicationFactor] = useState<number>(3);
  const [hoveredToken, setHoveredToken] = useState<Token | null>(null);
  const [hoveredKey, setHoveredKey] = useState<Key | null>(null);
  const [lastAction, setLastAction] = useState<string>('');
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [simulationMessage, setSimulationMessage] = useState<string>('');

  // --- Derived State ---
  const tokens = useMemo(() => {
    const allTokens: Token[] = [];
    
    // Simple seeded random function to ensure deterministic but random-looking placement
    const createRNG = (seed: string) => {
      let h = 0;
      for (let i = 0; i < seed.length; i++) {
        h = (Math.imul(31, h) + seed.charCodeAt(i)) | 0;
      }
      // Add some extra mixing
      h = Math.imul(h ^ (h >>> 16), 0x85ebca6b);
      h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
      h ^= (h >>> 16);
      
      return function() {
        h = (Math.imul(h, 1664525) + 1013904223) | 0;
        return (h >>> 0) / 0xFFFFFFFF;
      };
    };

    nodes.forEach((node) => {
      const count = useVNodes ? vnodeCount : 1;
      const rng = createRNG(node.seed);
      
      for (let i = 0; i < count; i++) {
        const tokenHash = rng();
        allTokens.push({
          id: `${node.id}-vnode-${i}`,
          nodeId: node.id,
          hash: tokenHash,
          color: node.color
        });
      }
    });
    return allTokens.sort((a, b) => a.hash - b.hash);
  }, [nodes, vnodeCount, useVNodes]);

  // --- Helpers ---
  const addNode = () => {
    if (nodes.length >= COLORS.length) return;
    
    // Find next available index in COLORS
    let availableIndex = 0;
    for (let i = 0; i < COLORS.length; i++) {
      const idToCheck = `Node-${i + 1}`;
      if (!nodes.some(n => n.id === idToCheck)) {
        availableIndex = i;
        break;
      }
    }

    const id = `Node-${availableIndex + 1}`;
    const newNode: PhysicalNode = {
      id,
      color: COLORS[availableIndex],
      vnodeCount: vnodeCount,
      isDown: false,
      seed: generateId() // Random seed for placement
    };
    setNodes(prev => [...prev, newNode]);
    setLastAction('add-node');
    
    if (isSimulating) {
      setSimulationMessage(`Rebalancing: ${id} joined and claimed keyspace slices`);
    }
  };

  const removeNode = (id?: string) => {
    if (nodes.length === 0) return;
    
    // If no ID provided, or we want to enforce removing the highest numbered node
    const targetId = id || nodes.reduce((max, node) => {
      const num = parseInt(node.id.split('-')[1]);
      const maxNum = parseInt(max.id.split('-')[1]);
      return num > maxNum ? node : max;
    }, nodes[0]).id;

    setNodes(prev => prev.filter(n => n.id !== targetId));
    setLastAction('remove-node');
  };

  const toggleNodeStatus = (id: string) => {
    setNodes(prev => prev.map(n => n.id === id ? { ...n, isDown: !n.isDown } : n));
    setLastAction('toggle-node');
  };

  const randomizeNodes = () => {
    setNodes(prev => prev.map(n => ({ ...n, seed: generateId() })));
    setLastAction('randomize');
  };

  const addRandomKeys = (count: number = 10) => {
    const newKeys: Key[] = [];
    const now = Date.now();
    for (let i = 0; i < count; i++) {
      const keyId = `Key-${generateId()}`;
      const keyHash = Math.random();
      const successors = findSuccessors(keyHash, tokens, replicationFactor, nodes);
      newKeys.push({
        id: keyId,
        hash: keyHash,
        assignedNodeIds: successors,
        expiresAt: now + (Math.random() * 30000 + 20000) // 20-50s TTL
      });
    }
    setKeys(prev => [...prev, ...newKeys].slice(-500)); // Cap at 500
  };

  const removeRandomKey = () => {
    if (keys.length === 0) return;
    const index = Math.floor(Math.random() * keys.length);
    setKeys(prev => prev.filter((_, i) => i !== index));
  };

  const toggleSimulation = () => {
    setIsSimulating(!isSimulating);
    if (!isSimulating) setSimulationMessage('Simulation Started');
    else setSimulationMessage('Simulation Paused');
  };

  const reset = () => {
    setNodes([
      { id: 'Node-1', color: COLORS[0], vnodeCount: 12, isDown: false, seed: generateId() },
      { id: 'Node-2', color: COLORS[1], vnodeCount: 12, isDown: false, seed: generateId() },
      { id: 'Node-3', color: COLORS[2], vnodeCount: 12, isDown: false, seed: generateId() },
      { id: 'Node-4', color: COLORS[3], vnodeCount: 12, isDown: false, seed: generateId() },
    ]);
    setKeys([]);
    setLastAction('');
    setIsSimulating(false);
    setSimulationMessage('');
  };

  // --- Effects ---
  // Re-assign keys when tokens or replication factor change
  useEffect(() => {
    if (tokens.length === 0) {
      if (keys.length > 0) {
        setKeys(prev => prev.map(k => ({ ...k, assignedNodeIds: [] })));
      }
      return;
    }

    setKeys(prev => {
      return prev.map(k => {
        const successors = findSuccessors(k.hash, tokens, replicationFactor, nodes);
        return {
          ...k,
          assignedNodeIds: successors
        };
      });
    });
  }, [tokens, replicationFactor, nodes.map(n => n.isDown).join(','), lastAction]);

  // Simulation Loop
  useEffect(() => {
    if (!isSimulating) return;

    const interval = setInterval(() => {
      const rand = Math.random();
      const keyCount = keys.length;
      const nodeCount = nodes.length;

      // TTL Check: Remove expired keys
      const now = Date.now();
      setKeys(prev => prev.filter(k => !k.expiresAt || k.expiresAt > now));

      // Imbalance check for adaptive probabilities (Primary Only)
      const isImbalanced = metrics.partitionCV > 0.3;
      
      // 1. Add Key (60% base, 40% if imbalanced)
      const addKeyProb = isImbalanced ? 0.40 : 0.60;
      if (rand < addKeyProb) {
        if (keyCount < 500) {
          addRandomKeys(4); // Doubled speed
        }
      } 
      // 2. Remove Key (15%)
      else if (rand < addKeyProb + 0.15) {
        removeRandomKey();
      }
      // 3. Balancing Actions (Adaptive)
      else if (isImbalanced) {
        const balanceRand = Math.random();
        
        // Priority 1: Increase VNode density (High impact on balance)
        if (balanceRand < 0.65) {
          const increment = vnodeCount < 16 ? 4 : 8;
          setVnodeCount(prev => Math.min(64, prev + increment));
          setSimulationMessage('Balancing: Increasing VNode density to equalize ownership');
          setLastAction('change-vnodes');
        } 
        // Priority 2: Scale out (Add physical nodes)
        else if (balanceRand < 0.90 && nodeCount < 8) {
          addNode();
          // Message is handled inside addNode
        }
        // Priority 3: Shuffle tokens (Shuffle distribution)
        else {
          randomizeNodes();
          setSimulationMessage('Balancing: Shuffling token distribution to break clusters');
        }
      }
      // 4. Standard Topology changes (Rare when balanced)
      else if (rand < 0.95) {
        const delta = Math.random() > 0.5 ? 1 : -1;
        setVnodeCount(prev => Math.min(64, Math.max(1, prev + delta)));
        setSimulationMessage(`Topology: VNodes set to ${vnodeCount}`);
        setLastAction('change-vnodes');
      }
      else if (rand < 0.99) {
        if (keyCount > 400 && nodeCount < 8) {
          addNode();
          setSimulationMessage('Scaling: Added physical node');
        } else if (keyCount < 150 && nodeCount > 4) {
          // Always remove the highest numbered node
          const highestNode = nodes.reduce((max, node) => {
            const num = parseInt(node.id.split('-')[1]);
            const maxNum = parseInt(max.id.split('-')[1]);
            return num > maxNum ? node : max;
          }, nodes[0]);
          removeNode(highestNode.id);
          setSimulationMessage('Scaling: Removed physical node');
        }
      }
      // 5. Replication change (1%)
      else {
        const delta = Math.random() > 0.5 ? 1 : -1;
        const newRF = Math.min(nodeCount, Math.max(1, replicationFactor + delta));
        if (newRF !== replicationFactor) {
          setReplicationFactor(newRF);
          setSimulationMessage(`Config: Replication Factor is ${newRF}`);
          setLastAction('change-replication');
        }
      }
    }, 200);

    return () => clearInterval(interval);
  }, [isSimulating, keys.length, nodes, vnodeCount, replicationFactor, tokens]);

  // Initial nodes
  useEffect(() => {
    if (nodes.length === 0) {
      const initialNodes = [
        { id: 'Node-1', color: COLORS[0], vnodeCount: 12, isDown: false, seed: generateId() },
        { id: 'Node-2', color: COLORS[1], vnodeCount: 12, isDown: false, seed: generateId() },
        { id: 'Node-3', color: COLORS[2], vnodeCount: 12, isDown: false, seed: generateId() },
        { id: 'Node-4', color: COLORS[3], vnodeCount: 12, isDown: false, seed: generateId() },
      ];
      setNodes(initialNodes);
    }
  }, []);

  // --- Metrics ---
  const metrics = useMemo(() => {
    const primaryDistribution: Record<string, number> = {};
    const totalLoadDistribution: Record<string, number> = {};
    const partitionSizes: Record<string, number> = {};
    
    nodes.forEach(n => {
      primaryDistribution[n.id] = 0;
      totalLoadDistribution[n.id] = 0;
      partitionSizes[n.id] = 0;
    });
    
    // Calculate Partition Sizes (Keyspace Ownership)
    if (tokens.length > 0) {
      for (let i = 0; i < tokens.length; i++) {
        const current = tokens[i];
        const prev = tokens[(i - 1 + tokens.length) % tokens.length];
        let range = current.hash - prev.hash;
        if (range < 0) range += 1; // Wraparound
        partitionSizes[current.nodeId] += range;
      }
    }

    keys.forEach(k => {
      // Primary ownership (First node in assignedNodeIds)
      if (k.assignedNodeIds.length > 0) {
        const primaryId = k.assignedNodeIds[0];
        if (primaryDistribution[primaryId] !== undefined) {
          primaryDistribution[primaryId]++;
        }
      }
      
      // Total load (Primary + Replicas)
      k.assignedNodeIds.forEach(nodeId => {
        if (totalLoadDistribution[nodeId] !== undefined) {
          totalLoadDistribution[nodeId]++;
        }
      });
    });

    // 1. Partition Balance (Keyspace Ownership)
    // This measures how evenly the ring is divided among nodes.
    const sizes = Object.values(partitionSizes);
    const n = nodes.length;
    const sizeAvg = n > 0 ? sizes.reduce((a, b) => a + b, 0) / n : 0;
    const sizeVar = n > 0 ? sizes.reduce((a, b) => a + Math.pow(b - sizeAvg, 2), 0) / n : 0;
    const sizeStdDev = Math.sqrt(sizeVar);
    const partitionCV = sizeAvg > 0 ? sizeStdDev / sizeAvg : 0;

    // 2. Load Balance (Key Distribution - Primary Only)
    // This measures how evenly the actual keys are distributed.
    const primaryLoads = Object.values(primaryDistribution);
    const primaryAvg = n > 0 ? primaryLoads.reduce((a, b) => a + b, 0) / n : 0;
    const primaryVar = n > 0 ? primaryLoads.reduce((a, b) => a + Math.pow(b - primaryAvg, 2), 0) / n : 0;
    const primaryStdDev = Math.sqrt(primaryVar);
    const primaryLoadCV = primaryAvg > 0 ? primaryStdDev / primaryAvg : 0;
    
    const primaryMax = Math.max(...primaryLoads, 0);
    const partitionImbalanceRatio = primaryAvg > 0 ? primaryMax / primaryAvg : 1;
    const isLowData = keys.length < 15;

    // 3. Total System Load Metrics (Primary + Replicas)
    const totalLoads = Object.values(totalLoadDistribution);
    const totalAvg = n > 0 ? totalLoads.reduce((a, b) => a + b, 0) / n : 0;
    const totalMax = Math.max(...totalLoads, 0);

    // 4. Token Distribution Fairness (Gap CV)
    const gaps = [];
    if (tokens.length > 1) {
      for (let i = 0; i < tokens.length; i++) {
        const current = tokens[i];
        const next = tokens[(i + 1) % tokens.length];
        let gap = next.hash - current.hash;
        if (gap < 0) gap += 1;
        gaps.push(gap);
      }
    }
    const avgGap = gaps.length > 0 ? gaps.reduce((a, b) => a + b, 0) / gaps.length : 0;
    const gapVar = gaps.length > 0 ? gaps.reduce((a, b) => a + Math.pow(b - avgGap, 2), 0) / gaps.length : 0;
    const gapStdDev = Math.sqrt(gapVar);
    const gapCV = avgGap > 0 ? gapStdDev / avgGap : 0;

    return {
      primaryDistribution,
      totalLoadDistribution,
      partitionSizes,
      partitionCV,
      primaryLoadCV,
      partitionImbalanceRatio,
      totalAvg,
      totalMax,
      gapCV,
      totalKeys: keys.length,
      isLowData
    };
  }, [nodes, keys, tokens]);

  // --- Render Helpers ---
  const getPos = (h: number, r: number = RING_RADIUS) => {
    const angle = h * 2 * Math.PI - Math.PI / 2;
    return {
      x: CENTER + r * Math.cos(angle),
      y: CENTER + r * Math.sin(angle)
    };
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 p-6 bg-card border border-border shadow-2xl rounded-lg font-mono selection:bg-primary/30 text-foreground transition-colors">
      {/* Left Panel: Controls */}
      <div className="w-full lg:w-80 flex flex-col gap-6">
        <div className="bg-muted/40 rounded-sm border border-border p-6">
          <div className="flex items-center gap-3 mb-6">
            <Settings2 className="w-5 h-5 text-primary" />
            <h2 className="text-[13px] font-black uppercase tracking-[0.2em] text-foreground">Controls</h2>
          </div>

          <div className="space-y-6">
            <div className="flex flex-col gap-3">
              <div className="grid grid-cols-2 gap-2">
                <button 
                  onClick={toggleSimulation}
                  className={`flex items-center justify-center gap-2 py-2.5 px-4 rounded-sm transition-all font-bold text-[11px] uppercase tracking-widest border ${
                    isSimulating 
                      ? 'bg-amber-500/10 border-amber-500/30 text-amber-500 hover:bg-amber-500/20' 
                      : 'bg-primary border-primary/30 text-primary-foreground hover:bg-primary/90 shadow-[0_0_15px_rgba(var(--primary-rgb),0.2)]'
                  }`}
                >
                  {isSimulating ? <PauseIcon className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
                  {isSimulating ? 'Pause' : (keys.length > 0 || nodes.length > 4 ? 'Resume' : 'Init_Sys')}
                </button>
                <button 
                  onClick={reset}
                  className="flex items-center justify-center gap-2 py-2.5 px-4 bg-muted hover:bg-muted/80 text-foreground rounded-sm transition-all font-bold text-[11px] uppercase tracking-widest border border-border"
                >
                  <RefreshCw className="w-4 h-4" /> Reset
                </button>
              </div>

              <div className="space-y-3 pt-2">
                <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  <span>Physical Nodes</span>
                  <span className="text-primary">{nodes.length}</span>
                </div>
                <input 
                  type="range" 
                  min="1" 
                  max={COLORS.length} 
                  value={nodes.length} 
                  disabled={isSimulating}
                  onChange={(e) => {
                    const targetCount = parseInt(e.target.value);
                    const currentCount = nodes.length;
                    if (targetCount > currentCount) {
                      for (let i = 0; i < targetCount - currentCount; i++) addNode();
                    } else if (targetCount < currentCount) {
                      for (let i = 0; i < currentCount - targetCount; i++) removeNode();
                    }
                  }}
                  className="w-full h-1 bg-muted rounded-lg appearance-none cursor-pointer accent-primary disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>

              <button 
                onClick={() => addRandomKeys(20)}
                disabled={isSimulating}
                className="flex items-center justify-center gap-2 w-full py-2.5 px-4 bg-muted hover:bg-muted/80 disabled:opacity-50 disabled:cursor-not-allowed text-foreground rounded-sm transition-all font-bold text-[11px] uppercase tracking-widest border border-border"
              >
                <Database className="w-4 h-4" /> Add 20 Keys
              </button>
              <button 
                onClick={randomizeNodes}
                disabled={isSimulating}
                className="flex items-center justify-center gap-2 w-full py-2.5 px-4 bg-muted hover:bg-muted/80 disabled:opacity-50 disabled:cursor-not-allowed text-foreground rounded-sm transition-all font-bold text-[11px] uppercase tracking-widest border border-border"
              >
                <RefreshCw className="w-4 h-4" /> Randomize Nodes
              </button>
            </div>

            <div className="pt-6 border-t border-border">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-muted-foreground" />
                  <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Virtual Nodes</span>
                </div>
                <button 
                  onClick={() => setUseVNodes(!useVNodes)}
                  disabled={isSimulating}
                  className={`w-10 h-5 rounded-full transition-colors relative ${useVNodes ? 'bg-primary' : 'bg-muted'} ${isSimulating ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${useVNodes ? 'left-6' : 'left-1'}`} />
                </button>
              </div>

              {useVNodes && (
                <div className="space-y-3">
                  <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    <span>Tokens / Node</span>
                    <span className="text-primary">{vnodeCount}</span>
                  </div>
                  <input 
                    type="range" 
                    min="1" 
                    max="64" 
                    value={vnodeCount} 
                    disabled={isSimulating}
                    onChange={(e) => {
                      setVnodeCount(parseInt(e.target.value));
                      setLastAction('change-vnodes');
                    }}
                    className="w-full h-1 bg-muted rounded-lg appearance-none cursor-pointer accent-primary disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                </div>
              )}
            </div>

            <div className="pt-6 border-t border-border">
              <div className="flex items-center gap-2 mb-4">
                <Shield className="w-4 h-4 text-muted-foreground" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Replication Factor (N)</span>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  <span>Replicas</span>
                  <span className={replicationFactor > nodes.length ? "text-red-500" : "text-primary"}>
                    {replicationFactor}
                  </span>
                </div>
                <input 
                  type="range" 
                  min="1" 
                  max={Math.max(3, nodes.length)} 
                  value={replicationFactor} 
                  disabled={isSimulating}
                  onChange={(e) => {
                    setReplicationFactor(parseInt(e.target.value));
                    setLastAction('change-replication');
                  }}
                  className="w-full h-1 bg-muted rounded-lg appearance-none cursor-pointer accent-primary disabled:opacity-50 disabled:cursor-not-allowed"
                />
                {replicationFactor > nodes.length && (
                  <div className="flex items-center gap-2 p-2 bg-red-500/10 border border-red-500/20 rounded-sm">
                    <AlertTriangle className="w-3 h-3 text-red-500" />
                    <span className="text-[8px] text-red-400 font-bold uppercase tracking-tighter">N exceeds distinct nodes</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Node List */}
        <div className="bg-muted/40 rounded-sm border border-border p-6 h-[400px] flex flex-col">
          <div className="flex items-center gap-3 mb-4">
            <LayoutGrid className="w-5 h-5 text-primary" />
            <h2 className="text-[13px] font-black uppercase tracking-[0.2em] text-foreground">Nodes</h2>
          </div>
          <p className="text-[9px] text-muted-foreground mb-4 uppercase tracking-widest font-bold">Click node to simulate failure</p>
          <div className="flex-1 overflow-y-auto pr-2 space-y-2 custom-scrollbar">
            <AnimatePresence initial={false}>
              {nodes.map(node => (
                <motion.div 
                  key={node.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  className={`flex items-center justify-between p-3 rounded-sm border transition-all cursor-pointer group ${
                    node.isDown ? 'bg-red-500/5 border-red-500/20 grayscale opacity-60' : 'bg-background border-border hover:border-primary/50'
                  } ${isSimulating ? 'pointer-events-none opacity-80' : ''}`}
                  onClick={() => !isSimulating && toggleNodeStatus(node.id)}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${node.isDown ? 'bg-muted-foreground' : ''}`} 
                         style={{ backgroundColor: node.isDown ? undefined : node.color, boxShadow: node.isDown ? 'none' : `0 0 8px ${node.color}` }} />
                    <div className="flex flex-col">
                      <span className={`text-[11px] font-bold ${node.isDown ? 'text-muted-foreground line-through' : 'text-foreground'}`}>{node.id}</span>
                      <span className="text-[9px] text-muted-foreground uppercase tracking-widest font-bold">
                        {metrics.primaryDistribution[node.id] || 0} primary / {metrics.totalLoadDistribution[node.id] || 0} total
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {node.isDown && <Zap className="w-3 h-3 text-red-500 animate-pulse" />}
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        removeNode(node.id);
                      }}
                      className="p-1.5 text-muted-foreground hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            {nodes.length === 0 && (
              <div className="text-center py-8 text-muted-foreground text-[10px] uppercase tracking-widest italic">
                No nodes active.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Center Panel: Visualization */}
      <div className="flex-1 flex flex-col gap-6">
        <div className="bg-muted/40 rounded-sm border border-border p-6 flex flex-col items-center justify-center relative min-h-[600px] overflow-hidden">
          {/* Background Grid Effect */}
          <div className="absolute inset-0 opacity-[0.03] pointer-events-none" 
               style={{ backgroundImage: 'radial-gradient(currentColor 1px, transparent 1px)', backgroundSize: '30px 30px' }} />

            <div className="absolute top-6 left-6 flex flex-col gap-1 z-10">
              <h2 className="text-[15px] font-black uppercase tracking-[0.3em] text-foreground">Consistent Hash Ring</h2>
              <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">Clockwise Successor Rule (N={replicationFactor})</p>
              <AnimatePresence mode="wait">
                {simulationMessage && (
                  <motion.div
                    key={simulationMessage}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    className="flex items-center gap-2 mt-2 px-2 py-1 bg-primary/10 border border-primary/20 rounded-sm"
                  >
                    <Activity className="w-3 h-3 text-primary animate-pulse" />
                    <span className="text-[9px] text-primary font-black uppercase tracking-widest">{simulationMessage}</span>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

          <div className="absolute top-6 right-6 flex items-center gap-4 text-[9px] font-bold uppercase tracking-widest text-muted-foreground z-10">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-primary shadow-[0_0_5px_var(--primary)]" />
              <span>Token</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground" />
              <span>Key</span>
            </div>
          </div>

          <svg width={SVG_SIZE} height={SVG_SIZE} viewBox={`0 0 ${SVG_SIZE} ${SVG_SIZE}`} className="max-w-full h-auto relative z-10">
            {/* Base Ring */}
            <motion.circle 
              cx={CENTER} 
              cy={CENTER} 
              r={RING_RADIUS} 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="12" 
              className="text-muted opacity-50"
              animate={isSimulating ? { rotate: 360 } : { rotate: 0 }}
              transition={isSimulating ? { duration: 20, repeat: Infinity, ease: "linear" } : { duration: 0.5 }}
              style={{ transformOrigin: 'center' }}
            />
            <motion.circle 
              cx={CENTER} 
              cy={CENTER} 
              r={RING_RADIUS} 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="1" 
              strokeDasharray="4 4"
              className="text-muted-foreground opacity-30"
              animate={isSimulating ? { rotate: -360 } : { rotate: 0 }}
              transition={isSimulating ? { duration: 40, repeat: Infinity, ease: "linear" } : { duration: 0.5 }}
              style={{ transformOrigin: 'center' }}
            />

            {/* Ownership Arcs */}
            {tokens.length > 1 && tokens.map((token, i) => {
              const nextToken = tokens[(i + 1) % tokens.length];
              const startAngle = token.hash * 2 * Math.PI - Math.PI / 2;
              const endAngle = nextToken.hash * 2 * Math.PI - Math.PI / 2;
              
              const adjustedEndAngle = endAngle < startAngle ? endAngle + 2 * Math.PI : endAngle;
              
              const x1 = CENTER + RING_RADIUS * Math.cos(startAngle);
              const y1 = CENTER + RING_RADIUS * Math.sin(startAngle);
              const x2 = CENTER + RING_RADIUS * Math.cos(adjustedEndAngle);
              const y2 = CENTER + RING_RADIUS * Math.sin(adjustedEndAngle);
              
              const largeArcFlag = adjustedEndAngle - startAngle <= Math.PI ? "0" : "1";
              
              // In Dynamo, the range (token, nextToken] belongs to nextToken
              const ownerNode = nodes.find(n => n.id === nextToken.nodeId);
              const isDown = ownerNode?.isDown;

              return (
                <path 
                  key={`arc-${token.id}`}
                  d={`M ${x1} ${y1} A ${RING_RADIUS} ${RING_RADIUS} 0 ${largeArcFlag} 1 ${x2} ${y2}`}
                  fill="none"
                  stroke={isDown ? 'currentColor' : nextToken.color}
                  strokeWidth="12"
                  strokeOpacity={isDown ? "0.1" : "0.3"}
                  className={isDown ? 'text-muted-foreground' : ''}
                />
              );
            })}

            {/* Tokens */}
            <AnimatePresence>
              {tokens.map(token => {
                const pos = getPos(token.hash);
                const node = nodes.find(n => n.id === token.nodeId);
                const isDown = node?.isDown;

                return (
                  <motion.g
                    key={token.id}
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: isDown ? 0.4 : 1 }}
                    exit={{ scale: 0, opacity: 0 }}
                    onMouseEnter={() => setHoveredToken(token)}
                    onMouseLeave={() => setHoveredToken(null)}
                    className="cursor-pointer"
                  >
                    <circle 
                      cx={pos.x} 
                      cy={pos.y} 
                      r={useVNodes ? 4 : 8} 
                      fill={isDown ? 'currentColor' : token.color} 
                      stroke="var(--background)"
                      strokeWidth="2"
                      className={isDown ? "text-muted-foreground" : "shadow-[0_0_10px_currentColor]"}
                      style={{ color: isDown ? undefined : token.color }}
                    />
                    {hoveredToken?.id === token.id && (
                      <circle 
                        cx={pos.x} 
                        cy={pos.y} 
                        r={useVNodes ? 8 : 12} 
                        fill="none" 
                        stroke={isDown ? 'currentColor' : token.color} 
                        strokeWidth="1"
                        strokeDasharray="2 2"
                        className={isDown ? 'text-muted-foreground' : ''}
                      />
                    )}
                  </motion.g>
                );
              })}
            </AnimatePresence>

            {/* Keys */}
            <AnimatePresence>
              {keys.map(key => {
                const pos = getPos(key.hash, RING_RADIUS + 22);
                const primaryNodeId = key.assignedNodeIds[0];
                const primaryNode = nodes.find(n => n.id === primaryNodeId);
                
                return (
                  <motion.g
                    key={key.id}
                    layout
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0, opacity: 0 }}
                    transition={{ 
                      layout: { type: "spring", stiffness: 100, damping: 20 },
                      opacity: { duration: 0.5 }
                    }}
                    onMouseEnter={() => setHoveredKey(key)}
                    onMouseLeave={() => setHoveredKey(null)}
                    className="cursor-help"
                  >
                    <motion.circle 
                      cx={pos.x} 
                      cy={pos.y} 
                      r="3" 
                      fill={primaryNode ? primaryNode.color : "currentColor"}
                      className={primaryNode ? "" : "text-muted-foreground"}
                      style={{ filter: primaryNode ? `drop-shadow(0 0 2px ${primaryNode.color})` : 'none' }}
                    />
                    {hoveredKey?.id === key.id && (
                    <>
                      {key.assignedNodeIds.map((nodeId, idx) => {
                        const node = nodes.find(n => n.id === nodeId);
                        if (!node) return null;
                        
                        // Find a token for this node to draw a line to
                        const nodeToken = tokens.find(t => t.nodeId === nodeId);
                        if (!nodeToken) return null;
                        const tokenPos = getPos(nodeToken.hash);

                        return (
                          <motion.line 
                            key={`replica-line-${nodeId}`}
                            initial={{ pathLength: 0, opacity: 0 }}
                            animate={{ pathLength: 1, opacity: 1 }}
                            x1={pos.x} 
                            y1={pos.y} 
                            x2={tokenPos.x} 
                            y2={tokenPos.y} 
                            stroke={node.color} 
                            strokeWidth={idx === 0 ? "1" : "0.5"} 
                            strokeDasharray={idx === 0 ? "none" : "4 4"} 
                            strokeOpacity={idx === 0 ? "0.6" : "0.3"}
                          />
                        );
                      })}
                    </>
                  )}
                </motion.g>
              );
            })}
            </AnimatePresence>
          </svg>

          {/* Tooltip Overlays */}
          <AnimatePresence>
            {hoveredToken && (
              <motion.div 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="absolute top-10 right-10 bg-card border border-border shadow-2xl rounded-sm p-4 z-20 pointer-events-none w-64"
              >
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: hoveredToken.color }} />
                  <span className="font-black text-[11px] uppercase tracking-widest text-foreground">{hoveredToken.nodeId}</span>
                  {nodes.find(n => n.id === hoveredToken.nodeId)?.isDown && (
                    <span className="text-[8px] bg-red-500/20 text-red-400 px-1 rounded-sm border border-red-500/30">OFFLINE</span>
                  )}
                </div>
                <div className="text-[10px] text-muted-foreground space-y-1 font-bold uppercase tracking-widest">
                  <p>Token: {hoveredToken.id}</p>
                  <p>Hash: <span className="text-primary">{hoveredToken.hash.toFixed(6)}</span></p>
                </div>
              </motion.div>
            )}

            {hoveredKey && (
              <motion.div 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="absolute top-10 right-10 bg-card border border-border shadow-2xl rounded-sm p-4 z-20 pointer-events-none w-64"
              >
                <div className="flex items-center gap-2 mb-3">
                  <Hash className="w-3 h-3 text-primary" />
                  <span className="font-black text-[11px] uppercase tracking-widest text-foreground">{hoveredKey.id}</span>
                </div>
                <div className="text-[10px] text-muted-foreground space-y-3 font-bold uppercase tracking-widest">
                  <div>
                    <p className="mb-1 text-muted-foreground">Hash Value</p>
                    <p className="text-primary">{hoveredKey.hash.toFixed(6)}</p>
                  </div>
                  <div>
                    <p className="mb-2 text-muted-foreground">Replica Set (N={replicationFactor})</p>
                    <div className="space-y-1.5">
                      {hoveredKey.assignedNodeIds.map((nodeId, i) => {
                        const node = nodes.find(n => n.id === nodeId);
                        return (
                          <div key={nodeId} className="flex items-center justify-between bg-muted p-1.5 rounded-sm">
                            <div className="flex items-center gap-2">
                              <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: node?.color }} />
                              <span className="text-foreground">{nodeId}</span>
                            </div>
                            <span className="text-[8px] opacity-50">{i === 0 ? 'PRIMARY' : `REPLICA ${i}`}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Bottom Panel: Metrics */}
        <div className="bg-muted/40 rounded-sm border border-border p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <TrendingUp className="w-5 h-5 text-primary" />
              <h2 className="text-[13px] font-black uppercase tracking-[0.2em] text-foreground">Load Metrics</h2>
            </div>
            <div className="px-2 py-1 bg-primary/10 text-primary text-[9px] font-black uppercase tracking-widest rounded-sm border border-primary/20">
              Live_Feed
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 bg-background rounded-sm border border-border relative group">
              <div className="flex items-center justify-between mb-1">
                <p className="text-[9px] text-muted-foreground font-black uppercase tracking-widest">Partition Balance</p>
                <div className="relative">
                  <Info className="w-3 h-3 text-muted-foreground cursor-help" />
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-popover text-popover-foreground text-[8px] rounded-sm border border-border opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-30 shadow-xl font-bold uppercase tracking-widest">
                    Measures how evenly the hash ring is divided among nodes (Keyspace CV).
                  </div>
                </div>
              </div>
              <p className={`text-2xl font-black ${
                metrics.partitionCV < 0.1 ? 'text-emerald-400' : 
                metrics.partitionCV < 0.3 ? 'text-amber-400' : 'text-red-400'
              }`}>
                {(metrics.partitionCV * 100).toFixed(1)}%
              </p>
            </div>

            <div className="p-4 bg-background rounded-sm border border-border relative group">
              <div className="flex items-center justify-between mb-1">
                <p className="text-[9px] text-muted-foreground font-black uppercase tracking-widest">Load Balance</p>
                <div className="relative">
                  <Info className="w-3 h-3 text-muted-foreground cursor-help" />
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-popover text-popover-foreground text-[8px] rounded-sm border border-border opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-30 shadow-xl font-bold uppercase tracking-widest">
                    Measures how evenly the actual keys are distributed across nodes (Load CV).
                  </div>
                </div>
              </div>
              <p className={`text-2xl font-black ${
                metrics.isLowData ? 'text-muted-foreground' : 
                metrics.primaryLoadCV < 0.2 ? 'text-emerald-400' : 
                metrics.primaryLoadCV < 0.5 ? 'text-amber-400' : 'text-red-400'
              }`}>
                {metrics.isLowData ? '--' : (metrics.primaryLoadCV * 100).toFixed(1) + '%'}
              </p>
            </div>

            <div className="p-4 bg-background rounded-sm border border-border relative group">
              <div className="flex items-center justify-between mb-1">
                <p className="text-[9px] text-muted-foreground font-black uppercase tracking-widest">System Load</p>
                <div className="relative">
                  <Info className="w-3 h-3 text-muted-foreground cursor-help" />
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-popover text-popover-foreground text-[8px] rounded-sm border border-border opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-30 shadow-xl font-bold uppercase tracking-widest">
                    Average number of keys (primary + replicas) stored per node.
                  </div>
                </div>
              </div>
              <p className="text-2xl font-black text-foreground">{Math.round(metrics.totalAvg)}</p>
            </div>

            <div className="p-4 bg-background rounded-sm border border-border relative group">
              <div className="flex items-center justify-between mb-1">
                <p className="text-[9px] text-muted-foreground font-black uppercase tracking-widest">Token Scatter</p>
                <div className="relative">
                  <Info className="w-3 h-3 text-muted-foreground cursor-help" />
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-popover text-popover-foreground text-[8px] rounded-sm border border-border opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-30 shadow-xl font-bold uppercase tracking-widest">
                    Measures the uniformity of VNode placement around the ring.
                  </div>
                </div>
              </div>
              <p className="text-2xl font-black text-foreground">{(metrics.gapCV * 100).toFixed(1)}%</p>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-4 bg-primary/5 rounded-sm border border-primary/20 flex gap-4">
              <Info className="w-5 h-5 text-primary shrink-0" />
              <div className="space-y-2">
                <p className="text-[10px] text-muted-foreground leading-relaxed font-medium">
                  <strong className="text-primary uppercase tracking-widest mr-1">Analysis:</strong> {useVNodes 
                    ? "VNodes distribute tokens more evenly, improving Partition Balance. Note that Replication (N) increases Total Load but does NOT affect hashing quality."
                    : "Standard hashing leads to uneven Partition Balance. Increasing N adds redundancy but doesn't fix the underlying ownership hotspots."}
                </p>
                <p className="text-[9px] text-muted-foreground italic">
                  * Load includes primary and replica assignments.
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Keyspace Ownership %</h3>
              <div className="space-y-2">
                {nodes.map(node => (
                  <div key={node.id} className="space-y-1">
                    <div className="flex justify-between text-[9px] font-bold uppercase tracking-widest">
                      <span className="text-foreground">{node.id}</span>
                      <span className="text-muted-foreground">{(metrics.partitionSizes[node.id] * 100).toFixed(1)}%</span>
                    </div>
                    <div className="h-1 w-full bg-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full transition-all duration-500" 
                        style={{ 
                          width: `${metrics.partitionSizes[node.id] * 100}%`,
                          backgroundColor: node.color
                        }} 
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      </div>
  );
};
