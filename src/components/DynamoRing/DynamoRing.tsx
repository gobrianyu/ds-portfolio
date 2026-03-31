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
  ChevronRight
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
  const [vnodeCount, setVnodeCount] = useState<number>(8);
  const [useVNodes, setUseVNodes] = useState<boolean>(true);
  const [replicationFactor, setReplicationFactor] = useState<number>(3);
  const [logs, setLogs] = useState<{id: string, msg: string, type: string}[]>([]);
  const [hoveredToken, setHoveredToken] = useState<Token | null>(null);
  const [hoveredKey, setHoveredKey] = useState<Key | null>(null);
  const [movedKeyCount, setMovedKeyCount] = useState<number>(0);
  const [lastAction, setLastAction] = useState<string>('');
  const [customKey, setCustomKey] = useState<string>('');

  // --- Derived State ---
  const tokens = useMemo(() => {
    const allTokens: Token[] = [];
    nodes.forEach((node) => {
      const count = useVNodes ? vnodeCount : 1;
      for (let i = 0; i < count; i++) {
        // Use node.seed to ensure tokens are placed randomly on the ring
        const tokenHash = hash(`${node.seed}-vnode-${i}`);
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
  const addLog = (msg: string, type: string = 'info') => {
    setLogs(prev => [{ id: generateId(), msg, type }, ...prev].slice(0, 50));
  };

  const addNode = () => {
    if (nodes.length >= COLORS.length) {
      addLog("Maximum number of nodes reached for this demo.", "warning");
      return;
    }
    const id = `Node-${nodes.length + 1}`;
    const newNode: PhysicalNode = {
      id,
      color: COLORS[nodes.length],
      vnodeCount: vnodeCount,
      isDown: false,
      seed: generateId() // Random seed for placement
    };
    setNodes(prev => [...prev, newNode]);
    setLastAction('add-node');
    addLog(`Added node ${id}`, "success");
  };

  const removeNode = (id: string) => {
    setNodes(prev => prev.filter(n => n.id !== id));
    setLastAction('remove-node');
    addLog(`Removed node ${id}`, "error");
  };

  const toggleNodeStatus = (id: string) => {
    setNodes(prev => prev.map(n => n.id === id ? { ...n, isDown: !n.isDown } : n));
    setLastAction('toggle-node');
    const node = nodes.find(n => n.id === id);
    addLog(`${id} is now ${node?.isDown ? 'UP' : 'DOWN'}`, node?.isDown ? 'success' : 'error');
  };

  const randomizeNodes = () => {
    setNodes(prev => prev.map(n => ({ ...n, seed: generateId() })));
    setLastAction('randomize');
    addLog("Randomized node positions", "info");
  };

  const addRandomKeys = (count: number = 10) => {
    const newKeys: Key[] = [];
    for (let i = 0; i < count; i++) {
      const keyId = `Key-${generateId()}`;
      const keyHash = Math.random();
      const successors = findSuccessors(keyHash, tokens, replicationFactor, nodes);
      newKeys.push({
        id: keyId,
        hash: keyHash,
        assignedNodeIds: successors
      });
    }
    setKeys(prev => [...prev, ...newKeys]);
    addLog(`Added ${count} random keys`, "info");
  };

  const addSpecificKey = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customKey.trim()) return;
    
    const keyHash = hash(customKey);
    const successors = findSuccessors(keyHash, tokens, replicationFactor, nodes);
    
    const newKey: Key = {
      id: customKey,
      hash: keyHash,
      assignedNodeIds: successors
    };
    
    setKeys(prev => [newKey, ...prev.filter(k => k.id !== customKey)]);
    setCustomKey('');
    addLog(`Added specific key: ${newKey.id}`, "success");
  };

  const reset = () => {
    setNodes([]);
    setKeys([]);
    setLogs([]);
    setMovedKeyCount(0);
    setLastAction('');
    addLog("Simulator reset", "warning");
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

    let moved = 0;
    setKeys(prev => {
      const updated = prev.map(k => {
        const successors = findSuccessors(k.hash, tokens, replicationFactor, nodes);
        // Check if primary changed
        if (successors[0] !== k.assignedNodeIds[0]) {
          moved++;
        }
        return {
          ...k,
          previousNodeIds: k.assignedNodeIds,
          assignedNodeIds: successors
        };
      });
      return updated;
    });

    if (lastAction !== '') {
      setMovedKeyCount(moved);
      if (moved > 0) {
        addLog(`${moved} keys rebalanced to new nodes`, "info");
      }
    }
  }, [tokens, replicationFactor, nodes.map(n => n.isDown).join(','), lastAction]);

  // Initial nodes
  useEffect(() => {
    if (nodes.length === 0) {
      const initialNodes = [
        { id: 'Node-1', color: COLORS[0], vnodeCount: 8, isDown: false, seed: 'seed1' },
        { id: 'Node-2', color: COLORS[1], vnodeCount: 8, isDown: false, seed: 'seed2' },
        { id: 'Node-3', color: COLORS[2], vnodeCount: 8, isDown: false, seed: 'seed3' },
      ];
      setNodes(initialNodes);
    }
  }, []);

  // --- Metrics ---
  const metrics = useMemo(() => {
    const distribution: Record<string, number> = {};
    nodes.forEach(n => distribution[n.id] = 0);
    
    keys.forEach(k => {
      // In Dynamo, load is distributed across all replicas
      k.assignedNodeIds.forEach(nodeId => {
        if (distribution[nodeId] !== undefined) {
          distribution[nodeId]++;
        }
      });
    });

    const loads = Object.values(distribution);
    const n = loads.length;
    const avg = n > 0 ? loads.reduce((a, b) => a + b, 0) / n : 0;
    const variance = n > 0 ? loads.reduce((a, b) => a + Math.pow(b - avg, 2), 0) / n : 0;
    const stdDev = Math.sqrt(variance);
    
    // Coefficient of Variation (CV)
    const cv = avg > 0 ? stdDev / avg : 0;
    
    // Max/Min Ratio
    const max = Math.max(...loads, 0);
    const min = Math.min(...loads.filter(l => l > 0), 0);
    const ratio = min > 0 ? max / min : (max > 0 ? Infinity : 1);

    return {
      distribution,
      avg,
      stdDev,
      cv,
      max,
      min,
      ratio,
      totalKeys: keys.length,
      movedPercent: keys.length > 0 ? (movedKeyCount / keys.length) * 100 : 0
    };
  }, [nodes, keys, movedKeyCount]);

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
              <button 
                onClick={addNode}
                disabled={nodes.length >= COLORS.length}
                className="flex items-center justify-center gap-2 w-full py-2.5 px-4 bg-primary hover:bg-primary/90 disabled:bg-muted disabled:text-muted-foreground text-primary-foreground rounded-sm transition-all font-bold text-[11px] uppercase tracking-widest border border-primary/30 shadow-[0_0_15px_rgba(var(--primary-rgb),0.2)]"
              >
                <Plus className="w-4 h-4" /> Add Physical Node
              </button>
              <button 
                onClick={() => addRandomKeys(20)}
                className="flex items-center justify-center gap-2 w-full py-2.5 px-4 bg-muted hover:bg-muted/80 text-foreground rounded-sm transition-all font-bold text-[11px] uppercase tracking-widest border border-border"
              >
                <Database className="w-4 h-4" /> Add 20 Keys
              </button>
              <button 
                onClick={randomizeNodes}
                className="flex items-center justify-center gap-2 w-full py-2.5 px-4 bg-muted hover:bg-muted/80 text-foreground rounded-sm transition-all font-bold text-[11px] uppercase tracking-widest border border-border"
              >
                <RefreshCw className="w-4 h-4" /> Randomize Nodes
              </button>
            </div>

            <form onSubmit={addSpecificKey} className="pt-6 border-t border-border space-y-3">
              <div className="flex items-center gap-2 mb-1">
                <Hash className="w-4 h-4 text-muted-foreground" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Add Specific Key</span>
              </div>
              <div className="flex gap-2">
                <input 
                  type="text"
                  value={customKey}
                  onChange={(e) => setCustomKey(e.target.value)}
                  placeholder="Enter key name..."
                  className="flex-1 bg-background border border-border rounded-sm px-3 py-2 text-[11px] focus:outline-none focus:border-primary text-foreground"
                />
                <button 
                  type="submit"
                  className="p-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-sm transition-all"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </form>

            <div className="pt-6 border-t border-border">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-muted-foreground" />
                  <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Virtual Nodes</span>
                </div>
                <button 
                  onClick={() => setUseVNodes(!useVNodes)}
                  className={`w-10 h-5 rounded-full transition-colors relative ${useVNodes ? 'bg-primary' : 'bg-muted'}`}
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
                    onChange={(e) => {
                      setVnodeCount(parseInt(e.target.value));
                      setLastAction('change-vnodes');
                    }}
                    className="w-full h-1 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
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
                  <span className="text-primary">{replicationFactor}</span>
                </div>
                <input 
                  type="range" 
                  min="1" 
                  max={Math.max(1, nodes.length)} 
                  value={replicationFactor} 
                  onChange={(e) => {
                    setReplicationFactor(parseInt(e.target.value));
                    setLastAction('change-replication');
                  }}
                  className="w-full h-1 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                />
              </div>
            </div>

            <button 
              onClick={reset}
              className="flex items-center justify-center gap-2 w-full py-2 px-4 text-muted-foreground hover:text-red-500 hover:bg-red-500/5 rounded-sm transition-all text-[10px] font-bold uppercase tracking-widest"
            >
              <RefreshCw className="w-3 h-3" /> Reset Simulator
            </button>
          </div>
        </div>

        {/* Node List */}
        <div className="bg-muted/40 rounded-sm border border-border p-6 flex-1 overflow-hidden flex flex-col">
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
                  }`}
                  onClick={() => toggleNodeStatus(node.id)}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${node.isDown ? 'bg-muted-foreground' : ''}`} 
                         style={{ backgroundColor: node.isDown ? undefined : node.color, boxShadow: node.isDown ? 'none' : `0 0 8px ${node.color}` }} />
                    <div className="flex flex-col">
                      <span className={`text-[11px] font-bold ${node.isDown ? 'text-muted-foreground line-through' : 'text-foreground'}`}>{node.id}</span>
                      <span className="text-[9px] text-muted-foreground uppercase tracking-widest font-bold">
                        {metrics.distribution[node.id] || 0} keys
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
            <circle 
              cx={CENTER} 
              cy={CENTER} 
              r={RING_RADIUS} 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="12" 
              className="text-muted opacity-50"
            />
            <circle 
              cx={CENTER} 
              cy={CENTER} 
              r={RING_RADIUS} 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="1" 
              strokeDasharray="4 4"
              className="text-muted-foreground opacity-30"
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
              
              const node = nodes.find(n => n.id === token.nodeId);
              const isDown = node?.isDown;

              return (
                <path 
                  key={`arc-${token.id}`}
                  d={`M ${x1} ${y1} A ${RING_RADIUS} ${RING_RADIUS} 0 ${largeArcFlag} 1 ${x2} ${y2}`}
                  fill="none"
                  stroke={isDown ? 'currentColor' : token.color}
                  strokeWidth="4"
                  strokeOpacity={isDown ? "0.1" : "0.2"}
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
            {keys.map(key => {
              const pos = getPos(key.hash, RING_RADIUS + 22);
              const primaryNodeId = key.assignedNodeIds[0];
              const primaryNode = nodes.find(n => n.id === primaryNodeId);
              
              return (
                <motion.g
                  key={key.id}
                  layout
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
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
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
          </svg>

          {/* Tooltip Overlays */}
          <AnimatePresence>
            {hoveredToken && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="absolute bottom-10 bg-card border border-border shadow-2xl rounded-sm p-4 z-20 pointer-events-none"
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
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="absolute bottom-10 bg-card border border-border shadow-2xl rounded-sm p-4 z-20 pointer-events-none min-w-[200px]"
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

        {/* Bottom Panel: Metrics & Logs */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Metrics */}
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

            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-background rounded-sm border border-border">
                <p className="text-[9px] text-muted-foreground font-black uppercase tracking-widest mb-1">Total Keys</p>
                <p className="text-2xl font-black text-foreground">{metrics.totalKeys}</p>
              </div>
              <div className="p-4 bg-background rounded-sm border border-border">
                <p className="text-[9px] text-muted-foreground font-black uppercase tracking-widest mb-1">Imbalance (CV)</p>
                <div className="flex items-baseline gap-2">
                  <p className={`text-2xl font-black ${metrics.cv < 0.2 ? 'text-emerald-400' : metrics.cv < 0.5 ? 'text-amber-400' : 'text-red-400'}`}>
                    {(metrics.cv * 100).toFixed(1)}%
                  </p>
                  <span className="text-[8px] text-muted-foreground font-black uppercase tracking-tighter">Target &lt; 15%</span>
                </div>
              </div>
              <div className="p-4 bg-background rounded-sm border border-border">
                <p className="text-[9px] text-muted-foreground font-black uppercase tracking-widest mb-1">Max / Min Load</p>
                <p className="text-2xl font-black text-foreground">{metrics.max} / {metrics.min}</p>
              </div>
              <div className="p-4 bg-background rounded-sm border border-border">
                <p className="text-[9px] text-muted-foreground font-black uppercase tracking-widest mb-1">Keys Moved</p>
                <div className="flex items-baseline gap-2">
                  <p className="text-2xl font-black text-primary">{(metrics.movedPercent || 0).toFixed(1)}%</p>
                  <span className="text-[8px] text-muted-foreground font-black uppercase tracking-tighter">Topology_Change</span>
                </div>
              </div>
            </div>

            <div className="mt-6 p-4 bg-primary/5 rounded-sm border border-primary/20 flex gap-4">
              <Info className="w-5 h-5 text-primary shrink-0" />
              <div className="space-y-2">
                <p className="text-[10px] text-muted-foreground leading-relaxed font-medium">
                  <strong className="text-primary uppercase tracking-widest mr-1">Analysis:</strong> {useVNodes 
                    ? "VNodes distribute tokens more evenly, significantly reducing 'hotspots' and improving overall system balance."
                    : "Standard hashing often leads to uneven distribution. Some nodes may handle 2-3x more data than others."}
                </p>
                <p className="text-[9px] text-muted-foreground italic">
                  * Load includes primary and replica assignments.
                </p>
              </div>
            </div>
          </div>

          {/* Logs */}
          <div className="bg-muted/40 rounded-sm border border-border p-6 flex flex-col h-[340px]">
            <div className="flex items-center gap-3 mb-4">
              <Activity className="w-5 h-5 text-primary" />
              <h2 className="text-[13px] font-black uppercase tracking-[0.2em] text-foreground">System Events</h2>
            </div>
            <div className="flex-1 overflow-y-auto pr-2 space-y-2 custom-scrollbar text-[10px] font-bold uppercase tracking-widest">
              {logs.map(log => (
                <div key={log.id} className={`p-2 rounded-sm border-l-2 ${
                  log.type === 'success' ? 'bg-emerald-500/5 border-emerald-500 text-emerald-400' :
                  log.type === 'error' ? 'bg-red-500/5 border-red-500 text-red-400' :
                  log.type === 'warning' ? 'bg-amber-500/5 border-amber-500 text-amber-400' :
                  'bg-muted border-muted-foreground text-muted-foreground'
                }`}>
                  <span className="opacity-50 mr-2">[{new Date().toLocaleTimeString([], {hour12:false})}]</span>
                  {log.msg}
                </div>
              ))}
              {logs.length === 0 && (
                <div className="text-center py-12 text-muted-foreground italic">
                  No events recorded.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      </div>
  );
};
