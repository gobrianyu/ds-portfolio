import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useTheme } from '../../context/ThemeContext';
import { 
  Server, 
  Database, 
  Shield, 
  ShieldCheck, 
  Zap, 
  ZapOff, 
  RefreshCw, 
  Activity,
  Info,
  Play,
  Pause,
  Bug,
  Settings2
} from 'lucide-react';

// --- Types ---
type NodeStatus = "HEALTHY" | "FAILED";
type ReplicaStatus = "HEALTHY" | "CORRUPTED";
type SystemStatus = "IDLE" | "RUNNING" | "STOPPED";

interface ChunkReplica {
  nodeId: string;
  status: ReplicaStatus;
}

interface ReplicationAnimation {
  id: string;
  chunkId: string;
  sourceNodeId: string;
  targetNodeId: string;
}

interface Chunk {
  id: string;
  replicas: ChunkReplica[];
  primaryNodeId: string | null;
  version: number;
}

interface Node {
  id: string;
  status: NodeStatus;
  recoveryCountdown?: number;
}

interface LogEntry {
  id: string;
  timestamp: string;
  message: string;
  type: 'info' | 'warning' | 'error' | 'success';
}

// --- Constants ---
const REPLICATION_FACTOR = 3;
const NODE_COUNT = 5;
const REPLICATION_DELAY = 2000;

export const GFSSimulator: React.FC = () => {
  const { theme } = useTheme();

  // --- State ---
  const [nodes, setNodes] = useState<Node[]>([]);
  const [chunks, setChunks] = useState<Chunk[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [isReplicating, setIsReplicating] = useState<boolean>(false);
  const [replicationAnimations, setReplicationAnimations] = useState<ReplicationAnimation[]>([]);
  const [autoChaos, setAutoChaos] = useState<boolean>(false);
  const [autoRecoveryEnabled, setAutoRecoveryEnabled] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'config' | 'viz' | 'logs'>('viz');
  const [systemStatus, setSystemStatus] = useState<SystemStatus>("IDLE");
  const [elapsedTime, setElapsedTime] = useState<number>(0);
  const [nodePositions, setNodePositions] = useState<Record<string, { x: number; y: number }>>({});

  // --- Refs ---
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const simulationRef = useRef<NodeJS.Timeout | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const visualizerRef = useRef<HTMLDivElement>(null);
  const nodeRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const masterRef = useRef<HTMLDivElement>(null);

  const nodesRef = useRef<Node[]>(nodes);
  const chunksRef = useRef<Chunk[]>(chunks);

  useEffect(() => {
    nodesRef.current = nodes;
  }, [nodes]);

  useEffect(() => {
    chunksRef.current = chunks;
  }, [chunks]);

  // --- Helpers ---
  const updateNodePositions = useCallback(() => {
    if (!visualizerRef.current) return;
    const vizRect = visualizerRef.current.getBoundingClientRect();
    const positions: Record<string, { x: number; y: number }> = {};

    nodeRefs.current.forEach((el, id) => {
      if (el) {
        const rect = el.getBoundingClientRect();
        positions[id] = {
          x: rect.left - vizRect.left + rect.width / 2,
          y: rect.top - vizRect.top + rect.height / 2
        };
      }
    });

    if (masterRef.current) {
      const rect = masterRef.current.getBoundingClientRect();
      positions['MASTER'] = {
        x: rect.left - vizRect.left + rect.width / 2,
        y: rect.top - vizRect.top + rect.height / 2
      };
    }

    setNodePositions(positions);
  }, []);

  useEffect(() => {
    if (systemStatus !== 'IDLE') {
      updateNodePositions();
      window.addEventListener('resize', updateNodePositions);
    }
    return () => window.removeEventListener('resize', updateNodePositions);
  }, [systemStatus, updateNodePositions, nodes, chunks, selectedNodeId]);

  // --- Helpers ---
  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const addLog = (message: string, type: LogEntry['type'] = 'info') => {
    const timestamp = new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setLogs(prev => [
      { id: Math.random().toString(36).substr(2, 9), timestamp, message, type },
      ...prev.slice(0, 49)
    ]);
  };

  // --- Initialization ---
  const initializeSystem = () => {
    const initialNodes: Node[] = Array.from({ length: NODE_COUNT }, (_, i) => ({
      id: `S${i + 1}`,
      status: "HEALTHY",
    }));

    const initialChunks: Chunk[] = [
      {
        id: "C1",
        replicas: [
          { nodeId: "S1", status: "HEALTHY" },
          { nodeId: "S2", status: "HEALTHY" },
          { nodeId: "S3", status: "HEALTHY" },
        ],
        primaryNodeId: "S1",
        version: 1,
      },
      {
        id: "C2",
        replicas: [
          { nodeId: "S3", status: "HEALTHY" },
          { nodeId: "S4", status: "HEALTHY" },
          { nodeId: "S5", status: "HEALTHY" },
        ],
        primaryNodeId: "S3",
        version: 1,
      },
    ];

    setNodes(initialNodes);
    setChunks(initialChunks);
    setElapsedTime(0);
    setLogs([]);
    addLog("System initialized. Ready for operation.", "success");
  };

  // --- Core Logic: Re-replication ---
  const triggerReReplication = useCallback(async (force = false, currentNodes: Node[] = nodes, currentChunks: Chunk[] = chunks) => {
    if (systemStatus !== "RUNNING" || (isReplicating && !force)) return;

    // Find under-replicated chunks
    const underReplicated = currentChunks.filter(c => {
      const validCount = c.replicas.filter(r => {
        const node = currentNodes.find(n => n.id === r.nodeId);
        return r.status === "HEALTHY" && node?.status === "HEALTHY";
      }).length;
      return validCount < REPLICATION_FACTOR;
    });

    if (underReplicated.length === 0) {
      if (force) addLog("All chunks sufficiently replicated.", "success");
      return;
    }

    setIsReplicating(true);
    if (force) addLog("Forcing re-replication scan...", "warning");
    else addLog(`Master detected under-replication. Scheduling recovery...`, "warning");

    for (const chunk of underReplicated) {
      if (systemStatus !== "RUNNING") break;

      const validReplicas = chunk.replicas.filter(r => {
        const node = currentNodes.find(n => n.id === r.nodeId);
        return r.status === "HEALTHY" && node?.status === "HEALTHY";
      });

      if (validReplicas.length === 0) {
        addLog(`Replication failed for ${chunk.id}: No valid replicas to copy from.`, "error");
        continue;
      }

      // Find target nodes (healthy, don't have this chunk)
      const targetNodes = currentNodes.filter(n => 
        n.status === "HEALTHY" && 
        !chunk.replicas.some(r => r.nodeId === n.id)
      );

      if (targetNodes.length === 0) {
        addLog(`Replication stalled for ${chunk.id}: No available healthy nodes.`, "warning");
        continue;
      }

      const sourceReplica = validReplicas[0];
      const targetNode = targetNodes[0];
      const animationId = Math.random().toString(36).substr(2, 9);

      // Add animation
      setReplicationAnimations(prev => [...prev, {
        id: animationId,
        chunkId: chunk.id,
        sourceNodeId: sourceReplica.nodeId,
        targetNodeId: targetNode.id
      }]);

      addLog(`Re-replicating ${chunk.id} from ${sourceReplica.nodeId} to ${targetNode.id}...`, "info");

      // Simulate delay
      await new Promise(resolve => setTimeout(resolve, REPLICATION_DELAY));

      // Remove animation
      setReplicationAnimations(prev => prev.filter(a => a.id !== animationId));

      // Final check before update
      setChunks(prev => prev.map(c => {
        if (c.id !== chunk.id) return c;
        
        // Remove corrupted replicas and add new healthy one
        const newReplicas = [
          ...c.replicas.filter(r => {
            const node = currentNodes.find(n => n.id === r.nodeId);
            return r.status === "HEALTHY" && node?.status === "HEALTHY";
          }), 
          { nodeId: targetNode.id, status: "HEALTHY" as const }
        ];
        
        return { ...c, replicas: newReplicas };
      }));

      addLog(`Replication of ${chunk.id} to ${targetNode.id} complete.`, "success");
    }

    setIsReplicating(false);
  }, [nodes, chunks, systemStatus, isReplicating]);

  // --- Core Logic: Evaluation Hook ---
  const evaluateSystemState = useCallback((currentNodes: Node[] = nodes, currentChunks: Chunk[] = chunks) => {
    let updatedChunks = [...currentChunks];
    let chunksChanged = false;

    // 1. Primary Election
    updatedChunks = updatedChunks.map(chunk => {
      const validReplicas = chunk.replicas.filter(r => {
        const node = currentNodes.find(n => n.id === r.nodeId);
        return r.status === "HEALTHY" && node?.status === "HEALTHY";
      });

      let newPrimary = chunk.primaryNodeId;
      const primaryReplica = chunk.replicas.find(r => r.nodeId === chunk.primaryNodeId);
      const primaryNode = currentNodes.find(n => n.id === chunk.primaryNodeId);
      const primaryIsInvalid = !primaryNode || primaryNode.status !== "HEALTHY" || primaryReplica?.status !== "HEALTHY";

      if (primaryIsInvalid) {
        if (validReplicas.length > 0) {
          newPrimary = validReplicas[0].nodeId;
          addLog(`Primary for ${chunk.id} re-elected: ${newPrimary}`, "info");
          chunksChanged = true;
          return { ...chunk, primaryNodeId: newPrimary, version: chunk.version + 1 };
        } else if (chunk.primaryNodeId !== null) {
          addLog(`CRITICAL: Data lost for ${chunk.id}! No valid replicas for primary election.`, "error");
          chunksChanged = true;
          return { ...chunk, primaryNodeId: null, version: chunk.version + 1 };
        }
      }
      return chunk;
    });

    if (chunksChanged) {
      setChunks(updatedChunks);
    }

    // 2. Trigger Re-replication if needed
    triggerReReplication(false, currentNodes, updatedChunks);
    
    // Ensure positions are updated after state changes that might affect layout
    setTimeout(updateNodePositions, 50);
  }, [nodes, chunks, triggerReReplication, updateNodePositions]);

  const evaluateRef = useRef(evaluateSystemState);
  const triggerReReplicationRef = useRef(triggerReReplication);
  const isReplicatingRef = useRef(isReplicating);

  useEffect(() => {
    evaluateRef.current = evaluateSystemState;
  }, [evaluateSystemState]);

  useEffect(() => {
    triggerReReplicationRef.current = triggerReReplication;
  }, [triggerReReplication]);

  useEffect(() => {
    isReplicatingRef.current = isReplicating;
  }, [isReplicating]);

  // --- User Actions ---
  const startSystem = () => {
    if (systemStatus === "IDLE") {
      initializeSystem();
    }
    setSystemStatus("RUNNING");
    addLog("System started.", "success");
  };

  const stopSystem = () => {
    setSystemStatus("STOPPED");
    addLog("System stopped.", "warning");
  };

  const resetSystem = () => {
    setSystemStatus("IDLE");
    setNodes([]);
    setChunks([]);
    setLogs([]);
    setElapsedTime(0);
    setSelectedNodeId(null);
    setIsReplicating(false);
    setReplicationAnimations([]);
    setAutoChaos(false);
  };

  const failNode = (nodeId: string) => {
    const recoveryCountdown = autoRecoveryEnabled ? Math.floor(Math.random() * 9) + 2 : undefined;
    const newNodes = nodesRef.current.map(n => n.id === nodeId ? { ...n, status: "FAILED" as const, recoveryCountdown } : n);
    setNodes(newNodes);
    addLog(`Chunkserver ${nodeId} failed!${recoveryCountdown ? ` Auto-recovery in ${recoveryCountdown}s.` : ''}`, "error");
    setTimeout(() => evaluateSystemState(newNodes, chunksRef.current), 100);
  };

  const recoverNode = (nodeId: string) => {
    const newNodes = nodesRef.current.map(n => n.id === nodeId ? { ...n, status: "HEALTHY" as const, recoveryCountdown: undefined } : n);
    setNodes(newNodes);
    // Simplified recovery: clear chunks from node as per simplified model
    const newChunks = chunksRef.current.map(c => ({
      ...c,
      replicas: c.replicas.filter(r => r.nodeId !== nodeId)
    }));
    setChunks(newChunks);
    addLog(`Chunkserver ${nodeId} recovered. Chunks cleared for fresh use.`, "success");
    setTimeout(() => evaluateSystemState(newNodes, newChunks), 100);
  };

  const corruptServer = (nodeId: string) => {
    const newChunks = chunks.map(c => {
      const newReplicas = c.replicas.map(r => 
        r.nodeId === nodeId ? { ...r, status: "CORRUPTED" as const } : r
      );
      return { ...c, replicas: newReplicas };
    });
    setChunks(newChunks);
    addLog(`Corruption injected! All replicas on ${nodeId} marked CORRUPTED.`, "warning");
    setTimeout(() => evaluateSystemState(nodes, newChunks), 100);
  };

  // --- Simulation Loop ---
  useEffect(() => {
    if (systemStatus === "RUNNING") {
      // Timer
      timerRef.current = setInterval(() => {
        setElapsedTime(prev => prev + 1);
        
        // Handle auto-recovery countdowns
        setNodes(prevNodes => {
          let nodesChanged = false;
          const updatedNodes = prevNodes.map(node => {
            if (node.status === "FAILED" && node.recoveryCountdown !== undefined && node.recoveryCountdown > 0) {
              nodesChanged = true;
              return { ...node, recoveryCountdown: node.recoveryCountdown - 1 };
            }
            return node;
          });
          return nodesChanged ? updatedNodes : prevNodes;
        });
      }, 1000);

      // Health Check Loop
      simulationRef.current = setInterval(() => {
        // 1. Check for missing primaries
        chunksRef.current.forEach(c => {
          const primaryNode = nodesRef.current.find(n => n.id === c.primaryNodeId);
          const primaryReplica = c.replicas.find(r => r.nodeId === c.primaryNodeId);
          
          const primaryIsUnhealthy = !primaryNode || 
                                    primaryNode.status === "FAILED" || 
                                    primaryReplica?.status === "CORRUPTED";

          if (primaryIsUnhealthy && c.primaryNodeId !== null) {
            evaluateRef.current(nodesRef.current, chunksRef.current);
          }
        });

        // 2. Auto Re-replication
        if (!isReplicatingRef.current) {
          const needsReplication = chunksRef.current.some(c => {
            const validCount = c.replicas.filter(r => {
              const node = nodesRef.current.find(n => n.id === r.nodeId);
              return r.status === "HEALTHY" && node?.status === "HEALTHY";
            }).length;
            return validCount < REPLICATION_FACTOR;
          });

          if (needsReplication) {
            triggerReReplicationRef.current();
          }
        }

        // 3. System Failure Check
        const allChunksLost = chunksRef.current.length > 0 && chunksRef.current.every(c => {
          const healthyCount = c.replicas.filter(r => {
            const node = nodesRef.current.find(n => n.id === r.nodeId);
            return r.status === "HEALTHY" && node?.status === "HEALTHY";
          }).length;
          return healthyCount === 0;
        });

        if (allChunksLost) {
          setSystemStatus("STOPPED");
          addLog("FATAL: All data replicas lost. System halted.", "error");
        }

      }, 3000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      if (simulationRef.current) clearInterval(simulationRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (simulationRef.current) clearInterval(simulationRef.current);
    };
  }, [systemStatus]);

  useEffect(() => {
    if (systemStatus !== "RUNNING") return;
    
    const nodesToRecover = nodes.filter(n => n.status === "FAILED" && n.recoveryCountdown === 0);
    nodesToRecover.forEach(n => recoverNode(n.id));
  }, [nodes, systemStatus]);

  useEffect(() => {
    if (systemStatus !== "RUNNING") return;

    if (autoRecoveryEnabled) {
      // Start fresh countdowns for all failed nodes
      setNodes(prev => prev.map(n => 
        n.status === "FAILED" && n.recoveryCountdown === undefined
          ? { ...n, recoveryCountdown: Math.floor(Math.random() * 9) + 2 } 
          : n
      ));
    } else {
      // Clear all countdowns
      setNodes(prev => prev.map(n => ({ ...n, recoveryCountdown: undefined })));
    }
  }, [autoRecoveryEnabled, systemStatus]);

  // --- Chaos Mode Manager ---
  useEffect(() => {
    let chaosTimer: NodeJS.Timeout | null = null;
    
    if (autoChaos && systemStatus === "RUNNING") {
      const scheduleNextChaos = (isFirst = false) => {
        const delay = isFirst 
          ? Math.random() * 3000 // First error within 3 seconds
          : 5000 + Math.random() * 10000; // Subsequent errors around 10s (5-15s)
          
        chaosTimer = setTimeout(() => {
          const healthyNodes = nodesRef.current.filter(n => n.status === "HEALTHY");
          if (healthyNodes.length > 0) {
            const nodeToFail = healthyNodes[Math.floor(Math.random() * healthyNodes.length)];
            failNode(nodeToFail.id);
          }
          scheduleNextChaos();
        }, delay);
      };
      
      scheduleNextChaos(true);
    }
    
    return () => {
      if (chaosTimer) clearTimeout(chaosTimer);
    };
  }, [autoChaos, systemStatus]);

  // --- Metrics Calculation ---
  const getAvailability = () => {
    const totalChunks = chunks.length;
    if (totalChunks === 0) return 100;
    const availableChunks = chunks.filter(c => 
      c.replicas.some(r => {
        const node = nodes.find(n => n.id === r.nodeId);
        return r.status === "HEALTHY" && node?.status === "HEALTHY";
      })
    ).length;
    return (availableChunks / totalChunks) * 100;
  };

  const getReplicationHealth = () => {
    const totalPossibleReplicas = chunks.length * REPLICATION_FACTOR;
    if (totalPossibleReplicas === 0) return 100;
    const currentHealthyReplicas = chunks.reduce((acc, c) => {
      return acc + c.replicas.filter(r => {
        const node = nodes.find(n => n.id === r.nodeId);
        return r.status === "HEALTHY" && node?.status === "HEALTHY";
      }).length;
    }, 0);
    return Math.min(100, (currentHealthyReplicas / totalPossibleReplicas) * 100);
  };

  const isSystemAlive = chunks.every(c => 
    c.replicas.some(r => {
      const node = nodes.find(n => n.id === r.nodeId);
      return r.status === "HEALTHY" && node?.status === "HEALTHY";
    })
  );
  const isSystemDegraded = getReplicationHealth() < 100 && isSystemAlive;

  // --- Render ---
  return (
    <>
      <div className="w-[1200px] mx-auto h-[700px] bg-card border border-border shadow-2xl flex flex-col relative overflow-hidden rounded-lg font-mono selection:bg-primary/30 text-foreground transition-colors" ref={containerRef}>
      
      {/* Header - Technical Dashboard Style */}
        <header className="flex items-center justify-between px-6 py-4 border-b border-border bg-muted/50 shrink-0">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3">
              <Shield className="w-5 h-5 text-primary" />
              <h1 className="text-[15px] font-black uppercase tracking-[0.25em] text-foreground">GFS_SIM_V2.1</h1>
            </div>
            
            {systemStatus !== 'IDLE' && (
              <div className="flex items-center gap-4 px-3 py-1.5 bg-background border border-border rounded-sm">
                <motion.div
                  animate={isSystemAlive && systemStatus === 'RUNNING' ? { 
                    scale: [1, 1.2, 1],
                    rotate: [0, 5, -5, 0]
                  } : {}}
                  transition={{ repeat: Infinity, duration: 2 }}
                  className="text-xl"
                >
                  {!isSystemAlive ? '💀' : isSystemDegraded ? '😐' : '😊'}
                </motion.div>
                <div className="flex flex-col">
                  <span className={`text-[10px] font-bold uppercase tracking-widest ${!isSystemAlive ? 'text-red-500' : isSystemDegraded ? 'text-orange-500' : 'text-green-500'}`}>
                    {systemStatus === 'RUNNING' ? (!isSystemAlive ? 'CRITICAL_FAILURE' : isSystemDegraded ? 'DEGRADED_OPS' : 'SYSTEM_NOMINAL') : 'SYSTEM_HALTED'}
                  </span>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center gap-6">
            {systemStatus !== 'IDLE' && (
              <div className="hidden sm:flex items-center gap-3">
                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">UPTIME:</span>
                <span className="text-[13px] font-bold text-primary tabular-nums">{formatTime(elapsedTime)}</span>
              </div>
            )}
            
            <div className="flex items-center gap-3">
              {systemStatus === 'IDLE' ? (
                <button 
                  onClick={startSystem}
                  className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-sm font-bold text-[11px] uppercase hover:bg-primary/90 transition-all border border-primary/30"
                >
                  <Play className="w-4 h-4 fill-current" />
                  INIT_SYS
                </button>
              ) : (
                <>
                  {systemStatus === 'RUNNING' ? (
                    <button onClick={stopSystem} className="p-2 bg-orange-500/10 text-orange-500 border border-orange-500/30 rounded-sm hover:bg-orange-500/20 transition-all">
                      <Pause className="w-4 h-4" />
                    </button>
                  ) : (
                    <button onClick={startSystem} disabled={!isSystemAlive} className="p-2 bg-green-500/10 text-green-500 border border-green-500/30 rounded-sm hover:bg-green-500/20 transition-all disabled:opacity-30">
                      <Play className="w-4 h-4" />
                    </button>
                  )}
                  <button onClick={resetSystem} className="p-2 bg-muted hover:bg-muted/80 text-muted-foreground border border-border rounded-sm transition-all">
                    <RefreshCw className="w-4 h-4" />
                  </button>
                </>
              )}
            </div>
          </div>
        </header>

        <div className="flex-1 flex flex-row overflow-hidden relative">
          
          {/* Left Panel: Controls */}
          <aside className="w-64 border-r border-border bg-muted/20 p-5 flex flex-col gap-8 overflow-y-auto custom-scrollbar shrink-0">
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-1 opacity-60">
                <Settings2 className="w-5 h-5 text-primary" />
                <h3 className="text-[11px] font-bold uppercase tracking-[0.15em] text-foreground">Parameters</h3>
              </div>
              
              <div className="space-y-3">
                <button 
                  onClick={() => setAutoChaos(!autoChaos)}
                  className={`w-full flex items-center justify-between px-4 py-2.5 border transition-all ${autoChaos ? 'bg-red-500/10 border-red-500/40 text-red-500' : 'bg-background border-border text-muted-foreground'}`}
                >
                  <span className="text-[11px] font-bold uppercase tracking-tighter">Chaos_Mode</span>
                  {autoChaos ? <Bug className="w-4 h-4" /> : <Zap className="w-4 h-4" />}
                </button>

                <button 
                  onClick={() => setAutoRecoveryEnabled(!autoRecoveryEnabled)}
                  className={`w-full flex items-center justify-between px-4 py-2.5 border transition-all ${autoRecoveryEnabled ? 'bg-green-500/10 border-green-500/40 text-green-500' : 'bg-background border-border text-muted-foreground'}`}
                >
                  <span className="text-[11px] font-bold uppercase tracking-tighter">Auto_Recovery</span>
                  <RefreshCw className={`w-4 h-4 ${autoRecoveryEnabled ? 'animate-spin-slow' : ''}`} />
                </button>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-1 opacity-60">
                <Activity className="w-5 h-5 text-primary" />
                <h3 className="text-[11px] font-bold uppercase tracking-[0.15em] text-foreground">Direct_Control</h3>
              </div>
              
              <div className="flex flex-col gap-3">
                <button
                  disabled={!selectedNodeId || nodes.find(n => n.id === selectedNodeId)?.status === 'FAILED' || systemStatus !== 'RUNNING'}
                  onClick={() => selectedNodeId && failNode(selectedNodeId)}
                  className="flex items-center justify-center gap-3 py-2.5 bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500/20 transition-all disabled:opacity-20 disabled:cursor-not-allowed text-[11px] font-bold uppercase tracking-tighter"
                >
                  <ZapOff className="w-4 h-4" />
                  Kill_Node
                </button>
                <button
                  disabled={!selectedNodeId || nodes.find(n => n.id === selectedNodeId)?.status === 'HEALTHY' || systemStatus !== 'RUNNING'}
                  onClick={() => selectedNodeId && recoverNode(selectedNodeId)}
                  className="flex items-center justify-center gap-3 py-2.5 bg-green-500/10 text-green-500 border border-green-500/20 hover:bg-green-500/20 transition-all disabled:opacity-20 disabled:cursor-not-allowed text-[11px] font-bold uppercase tracking-tighter"
                >
                  <RefreshCw className="w-4 h-4" />
                  Restore
                </button>
                <button
                  disabled={!selectedNodeId || systemStatus !== 'RUNNING'}
                  onClick={() => selectedNodeId && corruptServer(selectedNodeId)}
                  className="flex items-center justify-center gap-3 py-2.5 bg-orange-500/10 text-orange-500 border border-orange-500/20 hover:bg-orange-500/20 transition-all disabled:opacity-20 disabled:cursor-not-allowed text-[11px] font-bold uppercase tracking-tighter"
                >
                  <Activity className="w-4 h-4" />
                  Inject_Err
                </button>
              </div>
            </div>

            {selectedNodeId && (
              <div className="mt-auto p-4 border border-border bg-muted/50">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-[10px] font-bold uppercase tracking-widest text-primary">Node::{selectedNodeId}</h4>
                  <button onClick={() => setSelectedNodeId(null)} className="text-muted-foreground hover:text-foreground text-lg">×</button>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-[10px]">
                    <span className="text-muted-foreground uppercase">STATE</span>
                    <span className={`font-bold ${nodes.find(n => n.id === selectedNodeId)?.status === 'HEALTHY' ? 'text-green-500' : 'text-red-500'}`}>
                      {nodes.find(n => n.id === selectedNodeId)?.status}
                    </span>
                  </div>
                  <div className="flex justify-between text-[10px]">
                    <span className="text-muted-foreground uppercase">DATA</span>
                    <span className="text-foreground truncate max-w-[120px]">
                      {chunks.filter(c => c.replicas.some(r => r.nodeId === selectedNodeId)).map(c => c.id).join(',') || 'NULL'}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </aside>

          {/* Center: Visualizer */}
          <main className="flex-1 p-6 flex flex-col relative overflow-hidden bg-background/50 flex" ref={visualizerRef}>
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[linear-gradient(currentColor_1px,transparent_1px),linear-gradient(90deg,currentColor_1px,transparent_1px)] bg-[size:40px_40px]" />
            
            <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
              <AnimatePresence>
                {replicationAnimations.map(anim => {
                  const start = nodePositions[anim.sourceNodeId];
                  const end = nodePositions[anim.targetNodeId];
                  if (!start || !end) return null;
                  return (
                    <motion.g key={anim.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                      <line x1={start.x} y1={start.y} x2={end.x} y2={end.y} stroke="var(--primary)" strokeWidth="2" strokeDasharray="6,6" />
                      <motion.circle r="4" fill="var(--primary)" initial={{ cx: start.x, cy: start.y }} animate={{ cx: end.x, cy: end.y }} transition={{ duration: REPLICATION_DELAY / 1000, ease: "linear" }} />
                    </motion.g>
                  );
                })}
              </AnimatePresence>
            </svg>

            <div className="flex-1 flex flex-col items-center justify-center gap-12 relative z-10">
              {/* Master Node */}
              <motion.div 
                layout ref={masterRef}
                className="relative p-6 border border-primary/40 bg-primary/5 shadow-[0_0_30px_rgba(var(--primary-rgb),0.15)]"
              >
                <div className="absolute -top-2.5 px-3 py-1 bg-card border border-primary/40 text-[10px] font-bold uppercase tracking-widest left-1/2 -translate-x-1/2 text-foreground">MASTER_CTRL</div>
                <div className="flex flex-col items-center gap-3">
                  <ShieldCheck className="w-8 h-8 text-primary" />
                  <div className="text-[11px] font-bold uppercase tracking-tighter text-primary">ACTIVE</div>
                </div>
              </motion.div>

              {/* Chunkservers Grid */}
              <div className="grid grid-cols-5 gap-4 w-full max-w-3xl">
                {nodes.map((node) => (
                  <motion.div
                    key={node.id} layout ref={el => { if (el) nodeRefs.current.set(node.id, el); }}
                    onClick={() => setSelectedNodeId(node.id)}
                    className={`cursor-pointer group relative p-4 border transition-all duration-200 ${
                      selectedNodeId === node.id ? 'border-primary bg-primary/10' : 'border-border bg-muted/30'
                    } ${node.status === 'FAILED' ? 'border-red-500/50 bg-red-500/5' : 'hover:border-primary/50'}`}
                  >
                    <div className="flex flex-col items-center gap-3">
                      <Server className={`w-7 h-7 ${node.status === 'HEALTHY' ? 'text-blue-500' : 'text-red-500'}`} />
                      <div className="text-center">
                        <div className="text-[12px] font-bold uppercase tracking-tighter text-foreground">{node.id}</div>
                        {node.status === 'FAILED' && node.recoveryCountdown !== undefined && (
                          <div className="text-[10px] font-bold text-orange-500 tabular-nums">R:{node.recoveryCountdown}S</div>
                        )}
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap justify-center gap-1.5">
                      {chunks.map(chunk => {
                        const replica = chunk.replicas.find(r => r.nodeId === node.id);
                        if (!replica) return null;
                        const isPrimary = chunk.primaryNodeId === node.id;
                        return (
                          <div 
                            key={chunk.id} 
                            className={`px-1.5 py-0.5 text-[9px] font-bold rounded-sm ${
                              replica.status === 'CORRUPTED' ? 'bg-orange-500 text-black' : 
                              isPrimary ? 'bg-green-500 text-black shadow-[0_0_8px_#22c55e]' : 
                              'bg-blue-500 text-white'
                            }`}
                          >
                            {chunk.id}
                          </div>
                        );
                      })}
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Legend Overlay */}
            <div className="absolute bottom-4 left-6 right-6 flex flex-wrap items-center justify-center gap-6 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              <div className="flex items-center gap-2"><div className="w-2 h-2 bg-blue-500" /> HEALTHY</div>
              <div className="flex items-center gap-2"><div className="w-2 h-2 bg-red-500" /> FAILED</div>
              <div className="flex items-center gap-2"><div className="w-2 h-2 bg-green-500" /> PRIMARY</div>
              <div className="flex items-center gap-2"><div className="w-2 h-2 bg-orange-500" /> CORRUPT</div>
            </div>
          </main>

          {/* Right Panel: Metrics & Logs */}
          <aside className="w-72 border-l border-border bg-muted/30 p-5 flex flex-col gap-8 overflow-hidden flex">
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-1 opacity-60">
                <Activity className="w-5 h-5 text-primary" />
                <h3 className="text-[11px] font-bold uppercase tracking-[0.15em] text-foreground">Telemetry</h3>
              </div>
              <div className="space-y-4">
                <div className="p-4 bg-card border border-border">
                  <div className="flex justify-between items-end mb-2">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase">AVAILABILITY</span>
                    <span className={`text-[13px] font-bold tabular-nums ${getAvailability() < 100 ? 'text-destructive' : 'text-green-500'}`}>{getAvailability().toFixed(1)}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-muted overflow-hidden">
                    <motion.div initial={{ width: 0 }} animate={{ width: `${getAvailability()}%` }} className={`h-full ${getAvailability() < 100 ? 'bg-destructive' : 'bg-green-500'}`} />
                  </div>
                </div>
                <div className="p-4 bg-card border border-border">
                  <div className="flex justify-between items-end mb-2">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase">REPL_HEALTH</span>
                    <span className={`text-[13px] font-bold tabular-nums ${getReplicationHealth() < 100 ? 'text-orange-500' : 'text-primary'}`}>{getReplicationHealth().toFixed(1)}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-muted overflow-hidden">
                    <motion.div initial={{ width: 0 }} animate={{ width: `${getReplicationHealth()}%` }} className={`h-full ${getReplicationHealth() < 100 ? 'bg-orange-500' : 'bg-primary'}`} />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex-1 flex flex-col min-h-0">
              <div className="flex items-center gap-2 mb-3 opacity-60">
                <Info className="w-5 h-5 text-primary" />
                <h3 className="text-[11px] font-bold uppercase tracking-[0.15em] text-foreground">System_Log</h3>
              </div>
              <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                <AnimatePresence initial={false}>
                  {logs.map((log) => (
                    <motion.div
                      key={log.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                      className={`p-3 border-l-2 text-[11px] leading-tight ${
                        log.type === 'error' ? 'bg-destructive/10 border-destructive text-destructive' :
                        log.type === 'warning' ? 'bg-orange-500/10 border-orange-500 text-orange-500' :
                        log.type === 'success' ? 'bg-green-500/10 border-green-500 text-green-500' :
                        'bg-muted/50 border-border text-muted-foreground'
                      }`}
                    >
                      <div className="flex justify-between items-start gap-3">
                        <span className="break-words">{log.message}</span>
                        <span className="text-[9px] opacity-40 shrink-0 tabular-nums">{log.timestamp}</span>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </div>

            <div className="p-4 bg-primary/5 border border-border">
              <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">INSIGHT</h4>
              <p className="text-[9px] text-muted-foreground/80 leading-tight italic">
                GFS ensures availability via re-replication. Data loss occurs only if all replicas fail simultaneously.
              </p>
            </div>
          </aside>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .custom-scrollbar::-webkit-scrollbar { width: 3px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: var(--border); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: var(--muted-foreground); }
        @keyframes spin-slow { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .animate-spin-slow { animation: spin-slow 8s linear infinite; }
      `}} />
    </>
  );
};

export default GFSSimulator;
