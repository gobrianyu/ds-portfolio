import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Settings2, 
  Box, 
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

const SVG_SIZE = 500;
const CENTER = SVG_SIZE / 2;
const RING_RADIUS = 180;

export const DynamoRing: React.FC = () => {
  // --- State ---
  const [nodes, setNodes] = useState<PhysicalNode[]>([
    { id: 'Node-1', color: COLORS[0], vnodeCount: 12, seed: generateId() },
    { id: 'Node-2', color: COLORS[1], vnodeCount: 12, seed: generateId() },
    { id: 'Node-3', color: COLORS[2], vnodeCount: 12, seed: generateId() },
    { id: 'Node-4', color: COLORS[3], vnodeCount: 12, seed: generateId() },
  ]);
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

  // --- Helpers ---
  const addNode = () => {
    setNodes(prev => {
      if (prev.length >= COLORS.length) return prev;
      
      let availableIndex = 0;
      for (let i = 0; i < COLORS.length; i++) {
        const idToCheck = `Node-${i + 1}`;
        if (!prev.some(n => n.id === idToCheck)) {
          availableIndex = i;
          break;
        }
      }

      const id = `Node-${availableIndex + 1}`;
      const newNode: PhysicalNode = {
        id,
        color: COLORS[availableIndex],
        vnodeCount: vnodeCount,
        seed: generateId()
      };
      return [...prev, newNode];
    });
    setLastAction('add-node');
  };

  const removeNode = (id?: string) => {
    setNodes(prev => {
      if (prev.length <= 1) return prev;
      
      const targetId = id || prev.reduce((max, node) => {
        const num = parseInt(node.id.split('-')[1]);
        const maxNum = parseInt(max.id.split('-')[1]);
        return num > maxNum ? node : max;
      }, prev[0]).id;

      return prev.filter(n => n.id !== targetId);
    });
    setLastAction('remove-node');
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
    const nextState = !isSimulating;
    setIsSimulating(nextState);
    if (nextState) {
      setSimulationMessage('Simulation Started');
      if (!useVNodes) setUseVNodes(true);
    } else {
      setSimulationMessage('Simulation Paused');
    }
  };

  const reset = () => {
    setNodes([
      { id: 'Node-1', color: COLORS[0], vnodeCount: 12, seed: generateId() },
      { id: 'Node-2', color: COLORS[1], vnodeCount: 12, seed: generateId() },
      { id: 'Node-3', color: COLORS[2], vnodeCount: 12, seed: generateId() },
      { id: 'Node-4', color: COLORS[3], vnodeCount: 12, seed: generateId() },
    ]);
    setKeys([]);
    setVnodeCount(12);
    setUseVNodes(true);
    setReplicationFactor(3);
    setLastAction('');
    setIsSimulating(false);
    setSimulationMessage('');
  };

  // --- Effects ---
  // Simulation Messages
  useEffect(() => {
    if (simulationMessage) {
      const timer = setTimeout(() => {
        setSimulationMessage('');
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [simulationMessage]);

  useEffect(() => {
    if (!isSimulating) return;
    
    if (lastAction === 'add-node') {
      const lastNode = nodes[nodes.length - 1];
      if (lastNode) {
        setSimulationMessage(`Rebalancing: ${lastNode.id} joined and claimed keyspace slices`);
      }
    } else if (lastAction === 'remove-node') {
      setSimulationMessage('Scaling: Removed physical node');
    }
  }, [nodes.length, lastAction, isSimulating]);

  // Replication Factor Guard
  useEffect(() => {
    const activeNodes = nodes.length;
    if (replicationFactor > activeNodes && activeNodes > 0) {
      setReplicationFactor(activeNodes);
    } else if (activeNodes === 0 && replicationFactor !== 1) {
      setReplicationFactor(1);
    }
  }, [nodes, replicationFactor]);

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
  }, [tokens, replicationFactor, lastAction]);

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
          setSimulationMessage('Balancing: Increasing VNode density to equalise ownership');
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
  }, [isSimulating, nodes, keys, vnodeCount, replicationFactor, tokens, lastAction, metrics]);

  // --- Render Helpers ---
  const getPos = (h: number, r: number = RING_RADIUS) => {
    const angle = h * 2 * Math.PI - Math.PI / 2;
    return {
      x: CENTER + r * Math.cos(angle),
      y: CENTER + r * Math.sin(angle)
    };
  };

  return (
    <div className="w-[1200px] mx-auto bg-card border border-border shadow-2xl flex flex-col relative overflow-hidden rounded-lg font-mono selection:bg-primary/30 text-foreground transition-colors">
      {/* Header - GFS Style */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-border bg-muted/50 shrink-0">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            <Box className="w-5 h-5 text-violet-500" />
            <h1 className="text-[15px] font-black uppercase tracking-[0.25em] text-foreground">DYNAMO_RING_SIM_V1.0</h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={toggleSimulation}
            className={`flex items-center justify-center gap-2 px-4 py-2 rounded-sm font-bold text-[11px] uppercase transition-all border ${
              isSimulating 
                ? 'bg-violet-500/10 border-violet-500/30 text-violet-500 hover:bg-violet-500/20' 
                : 'bg-violet-500 border-violet-500/30 text-white hover:bg-violet-500/90 shadow-[0_0_10px_rgba(var(--violet-500-rgb),0.2)]'
            }`}
          >
            {isSimulating ? <PauseIcon className="w-3 h-3 fill-current" /> : <Play className="w-3 h-3 fill-current" />}
            {isSimulating ? 'Pause' : (keys.length > 0 ? 'Resume' : 'Init_Sys')}
          </button>
          {(!isSimulating && keys.length === 0) ? null : (
            <button 
              onClick={reset}
              className="flex items-center justify-center p-2 bg-muted hover:bg-muted/80 text-foreground rounded-sm transition-all border border-border"
              title="Reset System"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          )}
        </div>
      </header>

      <div className="flex flex-row gap-3 p-3 overflow-hidden flex-1">
        {/* Left Panel: Controls & Nodes */}
        <div className="w-64 flex flex-col gap-3 shrink-0 min-h-0">
          <div className="bg-muted/40 rounded-sm border border-border p-3 select-none">
            <div className="flex items-center gap-2 mb-4">
              <Settings2 className="w-4 h-4 text-violet-500" />
              <h2 className="text-[11px] font-black uppercase tracking-[0.2em] text-foreground">Controls</h2>
            </div>

            <div className="grid grid-cols-1 gap-5">
              <div className="space-y-4">
                <div className="space-y-1 pt-0.5">
                  <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    <span>Nodes</span>
                    <span className="text-violet-500">{nodes.length}</span>
                  </div>
                  <input 
                    type="range" 
                    min="1" 
                    max={COLORS.length} 
                    value={nodes.length} 
                    disabled={isSimulating}
                    onDragStart={(e) => e.preventDefault()}
                    onChange={(e) => {
                      const targetCount = parseInt(e.target.value);
                      setNodes(prev => {
                        let currentNodes = [...prev];
                        if (targetCount > currentNodes.length) {
                          const toAdd = targetCount - currentNodes.length;
                          for (let i = 0; i < toAdd; i++) {
                            if (currentNodes.length >= COLORS.length) break;
                            let availableIndex = 0;
                            for (let j = 0; j < COLORS.length; j++) {
                              const idToCheck = `Node-${j + 1}`;
                              if (!currentNodes.some(n => n.id === idToCheck)) {
                                availableIndex = j;
                                break;
                              }
                            }
                            currentNodes.push({
                              id: `Node-${availableIndex + 1}`,
                              color: COLORS[availableIndex],
                              vnodeCount: vnodeCount,
                              seed: generateId()
                            });
                          }
                        } else if (targetCount < currentNodes.length) {
                          const toRemove = currentNodes.length - targetCount;
                          for (let i = 0; i < toRemove; i++) {
                            if (currentNodes.length <= 1) break;
                            const targetId = currentNodes.reduce((max, node) => {
                              const num = parseInt(node.id.split('-')[1]);
                              const maxNum = parseInt(max.id.split('-')[1]);
                              return num > maxNum ? node : max;
                            }, currentNodes[0]).id;
                            currentNodes = currentNodes.filter(n => n.id !== targetId);
                          }
                        }
                        return currentNodes;
                      });
                      setLastAction('change-nodes');
                    }}
                    className="w-full h-1 bg-muted rounded-lg appearance-none cursor-pointer accent-violet-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{
                      background: `linear-gradient(to right, var(--violet-500) 0%, var(--violet-500) ${((nodes.length - 1) / (COLORS.length - 1)) * 100}%, var(--muted) ${((nodes.length - 1) / (COLORS.length - 1)) * 100}%, var(--muted) 100%)`
                    }}
                  />
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">VNodes</span>
                  <button 
                    onClick={() => setUseVNodes(!useVNodes)}
                    disabled={isSimulating}
                    className={`w-8 h-4 rounded-full transition-colors relative ${useVNodes ? 'bg-violet-500' : 'bg-muted'} ${isSimulating ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all ${useVNodes ? 'left-[18px]' : 'left-0.5'}`} />
                  </button>
                </div>
              </div>

              <div className="space-y-3 lg:space-y-4">
                {useVNodes && (
                  <div className="space-y-1">
                    <div className="flex justify-between text-[8px] lg:text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                      <span>Tokens</span>
                      <span className="text-violet-500">{vnodeCount}</span>
                    </div>
                    <input 
                      type="range" 
                      min="1" 
                      max="64" 
                      value={vnodeCount} 
                      disabled={isSimulating}
                      onDragStart={(e) => e.preventDefault()}
                      onChange={(e) => {
                        setVnodeCount(parseInt(e.target.value));
                        setLastAction('change-vnodes');
                      }}
                      className="w-full h-1 bg-muted rounded-lg appearance-none cursor-pointer accent-violet-500 disabled:opacity-50 disabled:cursor-not-allowed"
                      style={{
                        background: `linear-gradient(to right, var(--violet-500) 0%, var(--violet-500) ${((vnodeCount - 1) / (64 - 1)) * 100}%, var(--muted) ${((vnodeCount - 1) / (64 - 1)) * 100}%, var(--muted) 100%)`
                      }}
                    />
                  </div>
                )}

                <div className="space-y-1">
                  <div className="flex justify-between text-[8px] lg:text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    <span>Replicas</span>
                    <span className={replicationFactor > nodes.length ? "text-red-500" : "text-violet-500"}>
                      {replicationFactor}
                    </span>
                  </div>
                  <input 
                    type="range" 
                    min="1" 
                    max={Math.max(3, nodes.length)} 
                    value={replicationFactor} 
                    disabled={isSimulating}
                    onDragStart={(e) => e.preventDefault()}
                    onChange={(e) => {
                      setReplicationFactor(parseInt(e.target.value));
                      setLastAction('change-replication');
                    }}
                    className="w-full h-1 bg-muted rounded-lg appearance-none cursor-pointer accent-violet-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{
                      background: `linear-gradient(to right, var(--violet-500) 0%, var(--violet-500) ${((replicationFactor - 1) / (Math.max(3, nodes.length) - 1)) * 100}%, var(--muted) ${((replicationFactor - 1) / (Math.max(3, nodes.length) - 1)) * 100}%, var(--muted) 100%)`
                    }}
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-border">
              <button 
                onClick={() => addRandomKeys(20)}
                disabled={isSimulating}
                className="flex items-center justify-center gap-1.5 py-2 px-2 bg-muted hover:bg-muted/80 disabled:opacity-50 disabled:cursor-not-allowed text-foreground rounded-sm transition-all font-bold text-[8px] lg:text-[10px] uppercase tracking-widest border border-border"
              >
                <Database className="w-2.5 h-2.5 lg:w-3 lg:h-3" /> +20 Keys
              </button>
              <button 
                onClick={randomizeNodes}
                disabled={isSimulating}
                className="flex items-center justify-center gap-1.5 py-2 px-2 bg-muted hover:bg-muted/80 disabled:opacity-50 disabled:cursor-not-allowed text-foreground rounded-sm transition-all font-bold text-[8px] lg:text-[10px] uppercase tracking-widest border border-border"
              >
                <RefreshCw className="w-2.5 h-2.5 lg:w-3 lg:h-3" /> Randomize
              </button>
            </div>
          </div>

          {/* Node List */}
          <div className="bg-muted/40 rounded-sm border border-border p-2 lg:p-3 flex-1 flex flex-col min-h-[120px] lg:min-h-0">
            <div className="flex items-center gap-2 mb-2 lg:mb-4">
              <LayoutGrid className="w-3 h-3 lg:w-4 lg:h-4 text-violet-500" />
              <h2 className="text-[10px] lg:text-[11px] font-black uppercase tracking-[0.2em] text-foreground">Nodes</h2>
            </div>
            <div className="flex-1 overflow-y-auto overflow-x-hidden pr-1 space-y-3 lg:space-y-4 custom-scrollbar">
            <AnimatePresence initial={false}>
              {nodes.map(node => (
                <motion.div 
                  key={node.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  className="flex flex-col gap-1.5"
                >
                  <div className="flex items-center justify-between text-[9px] font-bold uppercase tracking-widest">
                    <div className="flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 rounded-full" 
                           style={{ backgroundColor: node.color, boxShadow: `0 0 4px ${node.color}` }} />
                      <span className="text-foreground">{node.id}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-muted-foreground">
                        {metrics.primaryDistribution[node.id] || 0}P / {metrics.totalLoadDistribution[node.id] || 0}T
                      </span>
                      <span className="text-violet-500">
                        {((metrics.partitionSizes[node.id] || 0) * 100).toFixed(1)}% OWN
                      </span>
                    </div>
                  </div>
                  <div className="h-1 w-full bg-muted rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${(metrics.partitionSizes[node.id] || 0) * 100}%` }}
                      className="h-full"
                      style={{ backgroundColor: node.color }}
                    />
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            {nodes.length === 0 && (
              <div className="text-center py-4 text-muted-foreground text-[8px] uppercase tracking-widest italic">
                No nodes active.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Center Panel: Visualization */}
      <div className="flex-1 flex flex-col gap-2 lg:gap-3 min-w-0">
        <div className="bg-muted/40 rounded-sm border border-border p-2 lg:p-3 flex-1 flex flex-col items-center justify-center relative min-h-[300px] lg:min-h-[500px] overflow-hidden">
          {/* Background Grid Effect - GFS Style */}
          <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[linear-gradient(currentColor_1px,transparent_1px),linear-gradient(90deg,currentColor_1px,transparent_1px)] bg-[size:40px_40px]" />

            <div className="absolute top-2 lg:top-4 left-2 lg:left-4 flex flex-col gap-0.5 z-10">
              <h2 className="text-[10px] lg:text-[12px] font-black uppercase tracking-[0.3em] text-foreground">Consistent Hash Ring</h2>
              <p className="text-[7px] lg:text-[8px] text-muted-foreground font-bold uppercase tracking-widest">Clockwise Successor Rule (N={replicationFactor})</p>
              <AnimatePresence mode="wait">
                {simulationMessage && (
                  <motion.div
                    key={simulationMessage}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, scale: 0.95, filter: "blur(4px)", transition: { duration: 0.2 } }}
                    className="flex items-center gap-1 lg:gap-1.5 mt-1 lg:mt-1.5 px-1 lg:px-1.5 py-0.5 bg-violet-500/10 border border-violet-500/20 rounded-sm"
                  >
                    <Activity className="w-2 lg:w-2.5 h-2 lg:h-2.5 text-violet-500 animate-pulse" />
                    <span className="text-[7px] lg:text-[8px] text-violet-500 font-black uppercase tracking-widest">{simulationMessage}</span>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

              <div className="flex items-center gap-3 text-[8px] font-bold uppercase tracking-widest text-muted-foreground z-10">
                <div className="flex items-center gap-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-violet-500 shadow-[0_0_4px_var(--violet-500)]" />
                  <span>Token</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-1 h-1 rounded-full bg-muted-foreground" />
                  <span>Key</span>
                </div>
              </div>

          <svg 
            viewBox={`0 0 ${SVG_SIZE} ${SVG_SIZE}`} 
            className="w-full max-w-[500px] h-auto relative z-10 drop-shadow-[0_0_20px_rgba(0,0,0,0.3)]"
          >
            {/* Base Ring */}
            <motion.circle 
              cx={CENTER} 
              cy={CENTER} 
              r={RING_RADIUS} 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="24" 
              className="text-muted opacity-30"
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
            {tokens.length === 1 && (
              <circle 
                cx={CENTER} 
                cy={CENTER} 
                r={RING_RADIUS} 
                fill="none" 
                stroke={tokens[0].color}
                strokeWidth="24"
                strokeOpacity="0.5"
                className=""
              />
            )}
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
              return (
                <path 
                  key={`arc-${token.id}`}
                  d={`M ${x1} ${y1} A ${RING_RADIUS} ${RING_RADIUS} 0 ${largeArcFlag} 1 ${x2} ${y2}`}
                  fill="none"
                  stroke={nextToken.color}
                  strokeWidth="24"
                  strokeOpacity="0.5"
                  className=""
                />
              );
            })}

            {/* Tokens */}
            <AnimatePresence>
              {tokens.map(token => {
                const pos = getPos(token.hash);
                
                return (
                  <motion.g
                    key={token.id}
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0, opacity: 0 }}
                    onMouseEnter={() => setHoveredToken(token)}
                    onMouseLeave={() => setHoveredToken(null)}
                    className="cursor-pointer"
                  >
                    <circle 
                      cx={pos.x} 
                      cy={pos.y} 
                      r={useVNodes ? 4 : 8} 
                      fill={token.color} 
                      stroke="var(--background)"
                      strokeWidth="2"
                      className="shadow-[0_0_10px_currentColor]"
                      style={{ color: token.color }}
                    />
                    {hoveredToken?.id === token.id && (
                      <circle 
                        cx={pos.x} 
                        cy={pos.y} 
                        r={useVNodes ? 8 : 12} 
                        fill="none" 
                        stroke={token.color} 
                        strokeWidth="1"
                        strokeDasharray="2 2"
                        className=""
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
                className="absolute top-4 right-4 bg-card border border-border shadow-2xl rounded-sm p-3 z-20 pointer-events-none w-56 opacity-100 bg-opacity-100"
                style={{ backgroundColor: 'var(--card)' }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: hoveredToken.color }} />
                  <span className="font-black text-[10px] uppercase tracking-widest text-foreground">{hoveredToken.nodeId}</span>
                </div>
                <div className="text-[9px] text-muted-foreground space-y-1 font-bold uppercase tracking-widest">
                  <p>Token: {hoveredToken.id}</p>
                  <p>Hash: <span className="text-violet-500">{hoveredToken.hash.toFixed(6)}</span></p>
                </div>
              </motion.div>
            )}

            {hoveredKey && (
              <motion.div 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="absolute top-4 right-4 bg-card border border-border shadow-2xl rounded-sm p-3 z-20 pointer-events-none w-56 opacity-100 bg-opacity-100"
                style={{ backgroundColor: 'var(--card)' }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Hash className="w-2.5 h-2.5 text-violet-500" />
                  <span className="font-black text-[10px] uppercase tracking-widest text-foreground">{hoveredKey.id}</span>
                </div>
                <div className="text-[9px] text-muted-foreground space-y-2 font-bold uppercase tracking-widest">
                  <div>
                    <p className="mb-0.5 text-muted-foreground">Hash Value</p>
                    <p className="text-violet-500">{hoveredKey.hash.toFixed(6)}</p>
                  </div>
                  <div>
                    <p className="mb-1 text-muted-foreground">Replica Set (N={replicationFactor})</p>
                    <div className="space-y-1">
                      {hoveredKey.assignedNodeIds.map((nodeId, i) => {
                        const node = nodes.find(n => n.id === nodeId);
                        return (
                          <div key={nodeId} className="flex items-center justify-between bg-muted p-1 rounded-sm">
                            <div className="flex items-center gap-1.5">
                              <div className="w-1 h-1 rounded-full" style={{ backgroundColor: node?.color }} />
                              <span className="text-foreground">{nodeId}</span>
                            </div>
                            <span className="text-[7px] opacity-50">{i === 0 ? 'PRIMARY' : `REPLICA ${i}`}</span>
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
        <div className="bg-muted/40 rounded-sm border border-border p-2 lg:p-4">
          <div className="flex items-center justify-between mb-3 lg:mb-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-3.5 h-3.5 lg:w-4 lg:h-4 text-violet-500" />
              <h2 className="text-[10px] lg:text-[11px] font-black uppercase tracking-[0.2em] text-foreground">Load Metrics</h2>
            </div>
            <div className="px-1.5 py-0.5 bg-violet-500/10 text-violet-500 text-[7px] lg:text-[9px] font-black uppercase tracking-widest rounded-sm border border-primary/20">
              Live_Feed
            </div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
            <div className="p-3 bg-background rounded-sm border border-border relative group">
              <div className="flex items-center justify-between mb-1">
                <p className="text-[8px] lg:text-[9px] text-muted-foreground font-black uppercase tracking-widest">Partition Balance</p>
                <div className="relative">
                  <Info className="w-2 h-2 text-muted-foreground cursor-help" />
                  <div className="absolute bottom-full left-0 mb-2 w-36 p-1.5 bg-card text-popover-foreground text-[6px] rounded-sm border border-border opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 shadow-xl font-bold uppercase tracking-widest bg-opacity-100">
                    Measures how evenly the ring is divided among nodes (Partition CV).
                  </div>
                </div>
              </div>
              <p className={`text-lg font-black ${
                metrics.partitionCV < 0.2 ? 'text-emerald-400' : 
                metrics.partitionCV < 0.5 ? 'text-amber-400' : 'text-red-400'
              }`}>
                {(metrics.partitionCV * 100).toFixed(1)}%
              </p>
            </div>

            <div className="p-3 bg-background rounded-sm border border-border relative group">
              <div className="flex items-center justify-between mb-1">
                <p className="text-[8px] lg:text-[9px] text-muted-foreground font-black uppercase tracking-widest">Load Balance</p>
                <div className="relative">
                  <Info className="w-2 h-2 text-muted-foreground cursor-help" />
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-36 p-1.5 bg-card text-popover-foreground text-[6px] rounded-sm border border-border opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 shadow-xl font-bold uppercase tracking-widest bg-opacity-100">
                    Measures how evenly the actual keys are distributed across nodes (Load CV).
                  </div>
                </div>
              </div>
              <p className={`text-lg font-black ${
                metrics.isLowData ? 'text-muted-foreground' : 
                metrics.primaryLoadCV < 0.2 ? 'text-emerald-400' : 
                metrics.primaryLoadCV < 0.5 ? 'text-amber-400' : 'text-red-400'
              }`}>
                {metrics.isLowData ? '--' : (metrics.primaryLoadCV * 100).toFixed(1) + '%'}
              </p>
            </div>

            <div className="p-3 bg-background rounded-sm border border-border relative group">
              <div className="flex items-center justify-between mb-1">
                <p className="text-[8px] lg:text-[9px] text-muted-foreground font-black uppercase tracking-widest">System Load</p>
                <div className="relative">
                  <Info className="w-2 h-2 text-muted-foreground cursor-help" />
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-36 p-1.5 bg-card text-popover-foreground text-[6px] rounded-sm border border-border opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 shadow-xl font-bold uppercase tracking-widest bg-opacity-100">
                    Average number of keys (primary + replicas) stored per node.
                  </div>
                </div>
              </div>
              <p className="text-lg font-black text-foreground">{Math.round(metrics.totalAvg)}</p>
            </div>

            <div className="p-3 bg-background rounded-sm border border-border relative group">
              <div className="flex items-center justify-between mb-1">
                <p className="text-[8px] lg:text-[9px] text-muted-foreground font-black uppercase tracking-widest">Token Scatter</p>
                <div className="relative">
                  <Info className="w-2 h-2 text-muted-foreground cursor-help" />
                  <div className="absolute bottom-full right-0 mb-2 w-36 p-1.5 bg-card text-popover-foreground text-[6px] rounded-sm border border-border opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 shadow-xl font-bold uppercase tracking-widest bg-opacity-100">
                    Measures the uniformity of VNode placement around the ring.
                  </div>
                </div>
              </div>
              <p className="text-lg font-black text-foreground">{(metrics.gapCV * 100).toFixed(1)}%</p>
            </div>
          </div>

          <div className="mt-3">
            <div className="p-2 bg-violet-500/5 rounded-sm border border-violet-500/20 flex gap-2">
              <Info className="w-3 h-3 text-violet-500 shrink-0" />
              <div className="space-y-1">
                <p className="text-[8px] lg:text-[10px] text-muted-foreground leading-relaxed font-medium">
                  <strong className="text-violet-500 uppercase tracking-widest mr-1">Analysis:</strong> {useVNodes 
                    ? "VNodes distribute tokens more evenly, improving Partition Balance. Replication (N) increases Total Load but does NOT affect hashing quality."
                    : "Standard hashing leads to uneven Partition Balance. Increasing N adds redundancy but doesn't fix the underlying ownership hotspots."}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
  );
};
