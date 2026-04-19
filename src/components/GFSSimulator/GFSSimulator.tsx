import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useTheme } from '../../context/ThemeContext';
import { 
  Server, 
  Box, 
  ShieldCheck, 
  PowerOff, 
  RefreshCw, 
  Info,
  Play,
  Pause,
  Bug,
  RotateCcw,
  X,
  FolderOpen,
  Crown
} from 'lucide-react';

// --- Types ---
type NodeStatus = "HEALTHY" | "FAILED";
type ReplicaStatus = "HEALTHY" | "CORRUPTED";
type SystemStatus = "IDLE" | "RUNNING" | "STOPPED";

interface ChunkReplica {
  nodeId: string;
  status: ReplicaStatus;
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

const SVG_WIDTH = 1000;
const SVG_HEIGHT = 800;

const NODE_POSITIONS: Record<string, { x: number; y: number }> = {
  'MASTER': { x: 500, y: 180 },
  'S1': { x: 120, y: 550 },
  'S2': { x: 310, y: 550 },
  'S3': { x: 500, y: 550 },
  'S4': { x: 690, y: 550 },
  'S5': { x: 880, y: 550 },
};

export const GFSSimulator: React.FC = () => {
  const { theme } = useTheme();

  // --- State ---
  const [nodes, setNodes] = useState<Node[]>([]);
  const [chunks, setChunks] = useState<Chunk[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [isReplicating, setIsReplicating] = useState<boolean>(false);
  const [autoChaos, setAutoChaos] = useState<boolean>(false);
  const [autoRecoveryEnabled, setAutoRecoveryEnabled] = useState<boolean>(true);
  const [systemStatus, setSystemStatus] = useState<SystemStatus>("IDLE");
  const [elapsedTime, setElapsedTime] = useState<number>(0);
  const [pings, setPings] = useState<{ id: string; from: string; to: string; type: 'request' | 'response' }[]>([]);

  // --- Refs ---
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const simulationRef = useRef<NodeJS.Timeout | null>(null);
  const pingTimeoutsRef = useRef<NodeJS.Timeout[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  const nodesRef = useRef<Node[]>(nodes);
  const chunksRef = useRef<Chunk[]>(chunks);

  useEffect(() => {
    nodesRef.current = nodes;
  }, [nodes]);

  useEffect(() => {
    chunksRef.current = chunks;
  }, [chunks]);

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
      ...prev.slice(0, 24) // Limit to 25 entries
    ]);
  };

  // --- Initialisation ---
  const initSys = () => {
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
    addLog("System initialised. Ready for operation.", "success");
  };

  // --- Core Logic: Re-replication ---
  const triggerReReplication = useCallback(async (force = false, currentNodes: Node[] = nodes, currentChunks: Chunk[] = chunks) => {
    if (systemStatus !== "RUNNING" || (isReplicating && !force)) return;

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

      addLog(`Re-replicating ${chunk.id} from ${sourceReplica.nodeId} to ${targetNode.id}...`, "warning");
      await new Promise(resolve => setTimeout(resolve, REPLICATION_DELAY));

      setChunks(prev => prev.map(c => {
        if (c.id !== chunk.id) return c;
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

  const evaluateSystemState = useCallback((currentNodes: Node[] = nodes, currentChunks: Chunk[] = chunks) => {
    let updatedChunks = [...currentChunks];
    let chunksChanged = false;

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
          addLog(`Primary for ${chunk.id} re-elected: ${newPrimary}`, "warning");
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

    triggerReReplication(false, currentNodes, updatedChunks);
  }, [nodes, chunks, triggerReReplication]);

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

  const startSystem = () => {
    if (!isSystemAlive && systemStatus === "STOPPED") {
      addLog("CRITICAL: System cannot be resumed. Data loss detected.", "error");
      return;
    }
    if (systemStatus === "IDLE") {
      initSys();
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
    setPings([]);
    setElapsedTime(0);
    setSelectedNodeId(null);
    setIsReplicating(false);
    setAutoChaos(false);
    
    // Clear any pending ping timeouts
    pingTimeoutsRef.current.forEach(clearTimeout);
    pingTimeoutsRef.current = [];
  };

  // --- Ping Logic ---
  useEffect(() => {
    if (systemStatus !== 'RUNNING') return;

    const pingInterval = setInterval(() => {
      nodesRef.current.forEach(node => {
        if (node.status === 'HEALTHY' && Math.random() > 0.7) {
          const pingId = Math.random().toString(36).substr(2, 9);
          setPings(prev => [...prev, { id: pingId, from: node.id, to: 'MASTER', type: 'request' }]);
          
          // Schedule response
          const t1 = setTimeout(() => {
            setPings(prev => prev.filter(p => p.id !== pingId));
            const respId = Math.random().toString(36).substr(2, 9);
            setPings(prev => [...prev, { id: respId, from: 'MASTER', to: node.id, type: 'response' }]);
            const t2 = setTimeout(() => {
              setPings(prev => prev.filter(p => p.id !== respId));
            }, 2000);
            pingTimeoutsRef.current.push(t2);
          }, 2000);
          pingTimeoutsRef.current.push(t1);
        }
      });
    }, 3000);

    return () => {
      clearInterval(pingInterval);
      pingTimeoutsRef.current.forEach(clearTimeout);
      pingTimeoutsRef.current = [];
    };
  }, [systemStatus]);

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

  useEffect(() => {
    if (systemStatus === "RUNNING") {
      timerRef.current = setInterval(() => {
        setElapsedTime(prev => prev + 1);
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

      simulationRef.current = setInterval(() => {
        chunksRef.current.forEach(c => {
          const primaryNode = nodesRef.current.find(n => n.id === c.primaryNodeId);
          const primaryReplica = c.replicas.find(r => r.nodeId === c.primaryNodeId);
          const primaryIsUnhealthy = !primaryNode || primaryNode.status === "FAILED" || primaryReplica?.status === "CORRUPTED";
          if (primaryIsUnhealthy && c.primaryNodeId !== null) {
            evaluateRef.current(nodesRef.current, chunksRef.current);
          }
        });

        if (!isReplicatingRef.current) {
          const needsReplication = chunksRef.current.some(c => {
            const validCount = c.replicas.filter(r => {
              const node = nodesRef.current.find(n => n.id === r.nodeId);
              return r.status === "HEALTHY" && node?.status === "HEALTHY";
            }).length;
            return validCount < REPLICATION_FACTOR;
          });
          if (needsReplication) triggerReReplicationRef.current();
        }

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
      setNodes(prev => prev.map(n => 
        n.status === "FAILED" && n.recoveryCountdown === undefined
          ? { ...n, recoveryCountdown: Math.floor(Math.random() * 9) + 2 } 
          : n
      ));
    } else {
      setNodes(prev => prev.map(n => ({ ...n, recoveryCountdown: undefined })));
    }
  }, [autoRecoveryEnabled, systemStatus]);

  useEffect(() => {
    let chaosTimer: NodeJS.Timeout | null = null;
    if (autoChaos && systemStatus === "RUNNING") {
      const scheduleNextChaos = (isFirst = false) => {
        const delay = isFirst ? Math.random() * 3000 : 5000 + Math.random() * 10000;
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
    return () => { if (chaosTimer) clearTimeout(chaosTimer); };
  }, [autoChaos, systemStatus]);

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

  return (
    <>
      <div className="w-[1200px] mx-auto h-[750px] bg-background border border-border shadow-[0_0_50px_rgba(0,0,0,0.1)] flex flex-col relative overflow-hidden rounded-xl font-mono selection:bg-violet-500/30 text-foreground transition-all" ref={containerRef}>
      
      {/* Background Grid & Atmosphere */}
      <div className="absolute inset-0 opacity-[0.03] dark:opacity-20 pointer-events-none bg-[linear-gradient(rgba(0,0,0,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.1)_1px,transparent_1px)] dark:bg-[linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:30px_30px]" />
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_50%_-20%,rgba(139,92,246,0.15),transparent_70%)]" />
      
      {/* Header - Technical Dashboard Style */}
        <header className="flex items-center justify-between px-8 py-5 border-b border-border bg-muted/40 backdrop-blur-md shrink-0 z-20">
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-3">
              <Box className="w-5 h-5 text-violet-500" />
              <h1 className="text-[15px] font-black uppercase tracking-[0.25em] text-foreground">GFS_Failure_Sim_v1.3</h1>
            </div>
            
            {systemStatus !== 'IDLE' && (
              <div className="flex items-center gap-5 px-4 py-2 bg-muted/50 border border-border rounded-lg">
                <div className="relative">
                  <motion.div
                    animate={isSystemAlive && systemStatus === 'RUNNING' ? { 
                      scale: [1, 1.2, 1],
                      opacity: [0.5, 1, 0.5]
                    } : { opacity: 0.3 }}
                    transition={{ repeat: Infinity, duration: 2 }}
                    className={`w-3 h-3 rounded-full ${!isSystemAlive ? 'bg-red-500' : isSystemDegraded ? 'bg-orange-500' : 'bg-green-500'} blur-[4px] absolute inset-0`}
                  />
                  <div className={`w-3 h-3 rounded-full ${!isSystemAlive ? 'bg-red-500' : isSystemDegraded ? 'bg-orange-500' : 'bg-green-500'} relative z-10 border border-white/20`} />
                </div>
                <div className="flex flex-col">
                  <span className={`text-[10px] font-black uppercase tracking-widest ${!isSystemAlive ? 'text-red-500' : isSystemDegraded ? 'text-orange-500' : 'text-green-500'}`}>
                    {!isSystemAlive ? 'CRITICAL_FAILURE' : (systemStatus === 'RUNNING' ? (isSystemDegraded ? 'DEGRADED_OPS' : 'SYSTEM_NOMINAL') : 'SYSTEM_PAUSED')}
                  </span>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center gap-8">
            {systemStatus !== 'IDLE' && (
              <div className="hidden md:flex items-center gap-4">
                <div className="flex flex-col items-end">
                  <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">UPTIME</span>
                  <span className="text-[14px] font-mono font-bold text-violet-500 tabular-nums">{formatTime(elapsedTime)}</span>
                </div>
              </div>
            )}
            
            <div className="flex items-center gap-3">
              <button 
                onClick={() => {
                  if (systemStatus === 'IDLE') initSys();
                  if (systemStatus === 'RUNNING') stopSystem();
                  else startSystem();
                }}
                disabled={!isSystemAlive && systemStatus === 'STOPPED'}
                className={`flex items-center justify-center gap-2 px-4 py-2 rounded-sm font-bold text-[11px] uppercase transition-all border ${
                  systemStatus === 'RUNNING' 
                    ? 'bg-violet-500/10 border-violet-500/30 text-violet-500 hover:bg-violet-500/20' 
                    : (!isSystemAlive && systemStatus === 'STOPPED')
                      ? 'bg-muted border-border text-muted-foreground cursor-not-allowed opacity-50'
                      : 'bg-violet-500 border-violet-500/30 text-white hover:bg-violet-500/90 shadow-[0_0_10px_rgba(139,92,246,0.2)]'
                }`}
              >
                {systemStatus === 'RUNNING' ? <Pause className="w-3 h-3 fill-current" /> : <Play className="w-3 h-3 fill-current" />}
                {systemStatus === 'RUNNING' ? 'Pause' : systemStatus === 'STOPPED' ? 'Resume' : 'init_sys'}
              </button>
              {systemStatus !== 'IDLE' && (
                <button 
                  onClick={resetSystem}
                  className="flex items-center justify-center p-2 bg-muted hover:bg-muted/80 text-foreground rounded-sm transition-all border border-border"
                  title="Reset"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </header>

        <div className="flex-1 flex flex-row overflow-hidden relative">
          
          {/* Left Panel: Controls */}
          <aside className="w-72 border-r border-border bg-muted/20 p-6 flex flex-col gap-10 overflow-y-auto custom-scrollbar shrink-0 z-20">
            <div className="space-y-6">
              <div className="opacity-80">
                <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-foreground/80">System Modes</h3>
              </div>
              
              <div className="space-y-4">
                <div className="group relative">
                  <button 
                    onClick={() => setAutoChaos(!autoChaos)}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-all duration-300 ${autoChaos ? 'bg-red-500/10 border-red-500/40 text-red-400 shadow-[inset_0_0_10px_rgba(239,68,68,0.1)]' : 'bg-muted/50 border-border text-muted-foreground hover:border-border/80'}`}
                  >
                    <span className="text-[11px] font-black uppercase tracking-widest">Chaos Mode</span>
                    {autoChaos && systemStatus === 'RUNNING' ? <Bug className="w-4 h-4 animate-pulse" /> : <Bug className="w-4 h-4" />}
                  </button>
                </div>

                <div className="group relative">
                  <button 
                    onClick={() => setAutoRecoveryEnabled(!autoRecoveryEnabled)}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-all duration-300 ${autoRecoveryEnabled ? 'bg-green-500/10 border-green-500/40 text-green-400 shadow-[inset_0_0_10px_rgba(34,197,94,0.1)]' : 'bg-muted/50 border-border text-muted-foreground hover:border-border/80'}`}
                  >
                    <span className="text-[11px] font-black uppercase tracking-widest">Auto Recovery</span>
                    <RefreshCw className={`w-4 h-4 ${autoRecoveryEnabled && systemStatus === 'RUNNING' ? 'animate-spin-slow' : ''}`} />
                  </button>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="opacity-80">
                <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-foreground/80">Node Controls</h3>
              </div>

              {!selectedNodeId && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="p-4 rounded-xl border border-dashed border-violet-500/30 bg-violet-500/5 text-center"
                >
                  <p className="text-[9px] font-bold text-violet-400/80 uppercase tracking-widest leading-relaxed">
                    Select a node in the cluster to enable manual overrides
                  </p>
                </motion.div>
              )}
              
              <div className="grid grid-cols-1 gap-3">
                <motion.button
                  whileHover={{ scale: 1.02, backgroundColor: 'rgba(239,68,68,0.15)' }}
                  whileTap={{ scale: 0.98 }}
                  disabled={!selectedNodeId || nodes.find(n => n.id === selectedNodeId)?.status === 'FAILED' || systemStatus !== 'RUNNING'}
                  onClick={() => selectedNodeId && failNode(selectedNodeId)}
                  className="flex items-center justify-center gap-3 py-3 bg-red-500/5 text-red-500 border border-red-500/20 rounded-xl transition-all disabled:opacity-30 disabled:cursor-not-allowed text-[11px] font-black uppercase tracking-widest"
                >
                  <PowerOff className="w-4 h-4" />
                  Terminate Node
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02, backgroundColor: 'rgba(139,92,246,0.15)' }}
                  whileTap={{ scale: 0.98 }}
                  disabled={!selectedNodeId || systemStatus !== 'RUNNING'}
                  onClick={() => selectedNodeId && corruptServer(selectedNodeId)}
                  className="flex items-center justify-center gap-3 py-3 bg-primary/5 text-primary border border-primary/20 rounded-xl transition-all disabled:opacity-30 disabled:cursor-not-allowed text-[11px] font-black uppercase tracking-widest"
                >
                  <Bug className="w-4 h-4" />
                  Corrupt Data
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02, backgroundColor: 'rgba(34,197,94,0.15)' }}
                  whileTap={{ scale: 0.98 }}
                  disabled={!selectedNodeId || nodes.find(n => n.id === selectedNodeId)?.status === 'HEALTHY' || systemStatus !== 'RUNNING'}
                  onClick={() => selectedNodeId && recoverNode(selectedNodeId)}
                  className="flex items-center justify-center gap-3 py-3 bg-green-500/5 text-green-500 border border-green-500/20 rounded-xl transition-all disabled:opacity-30 disabled:cursor-not-allowed text-[11px] font-black uppercase tracking-widest"
                >
                  <RefreshCw className="w-4 h-4" />
                  Restore Node
                </motion.button>
              </div>
            </div>

            {selectedNodeId && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-auto p-5 rounded-2xl border border-violet-500/30 bg-violet-500/5 backdrop-blur-sm shadow-[0_0_20px_rgba(139,92,246,0.1)]"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Server className="w-3 h-3 text-violet-400" />
                    <h4 className="text-[11px] font-black uppercase tracking-widest text-violet-400">NODE_{selectedNodeId}</h4>
                  </div>
                  <button onClick={() => setSelectedNodeId(null)} className="text-muted-foreground hover:text-foreground transition-colors">
                    <X className="w-3 h-3" />
                  </button>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between items-center text-[10px]">
                    <span className="text-muted-foreground font-bold uppercase">STATUS</span>
                    <span className={`font-black px-2 py-0.5 rounded-sm ${nodes.find(n => n.id === selectedNodeId)?.status === 'HEALTHY' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                      {nodes.find(n => n.id === selectedNodeId)?.status}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-muted-foreground font-bold uppercase text-[9px] shrink-0">RESIDENT_CHUNKS</span>
                    <div className="flex flex-wrap justify-end gap-1">
                      {(() => {
                        const nodeChunks = chunks.filter(c => c.replicas.some(r => r.nodeId === selectedNodeId));
                        if (nodeChunks.length > 0) {
                          return nodeChunks.map(c => {
                            const isPrimary = c.primaryNodeId === selectedNodeId;
                            return (
                              <span key={c.id} className={`flex items-center gap-1 px-1.5 py-0.5 border rounded text-[9px] font-mono ${isPrimary ? 'bg-amber-500/20 border-amber-500/40 text-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.2)]' : 'bg-muted border-border text-foreground/80'}`}>
                                {isPrimary && <Crown className="w-2 h-2" />}
                                {c.id}
                              </span>
                            );
                          });
                        }
                        return (
                          <div className="px-2 py-0.5 bg-muted/30 border border-dashed border-border rounded text-[8px] font-black text-muted-foreground/40 uppercase tracking-widest">
                            EMPTY
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </aside>

          {/* Center: Visualiser */}
          <main className="flex-1 p-8 flex flex-col relative overflow-hidden bg-muted/10">
            {/* Grid Background for Center Area */}
            <div className="absolute inset-0 opacity-[0.2] dark:opacity-50 pointer-events-none bg-[linear-gradient(rgba(139,92,246,0.3)_1px,transparent_1px),linear-gradient(90deg,rgba(139,92,246,0.3)_1px,transparent_1px)] bg-[size:50px_50px]" />
            
            <svg className="absolute inset-0 w-full h-full pointer-events-none z-0" viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`} preserveAspectRatio="none">
              {/* Heartbeat Connections from Master to all Nodes */}
              {nodes.map(node => {
                const start = NODE_POSITIONS['MASTER'];
                const end = NODE_POSITIONS[node.id];
                if (!start || !end) return null;

                const midX = (start.x + end.x) / 2;
                const midY = (start.y + end.y) / 2 - 40;
                const pathData = `M ${start.x} ${start.y} Q ${midX} ${midY} ${end.x} ${end.y}`;

                return (
                  <g key={`heartbeat-${node.id}`}>
                    <path 
                      d={pathData}
                      fill="none"
                      stroke="rgba(139,92,246,0.15)"
                      strokeWidth="1.5"
                    />
                  </g>
                );
              })}

              {/* Animated Pings */}
              <AnimatePresence>
                {pings.map(ping => {
                  const start = NODE_POSITIONS[ping.from];
                  const end = NODE_POSITIONS[ping.to];
                  if (!start || !end) return null;

                  const midX = (start.x + end.x) / 2;
                  const midY = (start.y + end.y) / 2 - 40;
                  const pathData = `M ${start.x} ${start.y} Q ${midX} ${midY} ${end.x} ${end.y}`;

                  return (
                    <motion.circle
                      key={ping.id}
                      r="3.5"
                      fill="#8B5CF6"
                      style={{ offsetPath: `path('${pathData}')` }}
                      initial={{ offsetDistance: "0%" }}
                      animate={{ offsetDistance: "100%" }}
                      transition={{ duration: 2, ease: "linear" }}
                    />
                  );
                })}
              </AnimatePresence>
            </svg>

            <div className="flex-1 relative z-10 w-full h-full pointer-events-none">
              {/* Master Node */}
              <div 
                style={{ 
                  position: 'absolute', 
                  left: `${(NODE_POSITIONS['MASTER'].x / SVG_WIDTH) * 100}%`, 
                  top: `${(NODE_POSITIONS['MASTER'].y / SVG_HEIGHT) * 100}%`, 
                  transform: 'translate(-50%, -50%)' 
                }}
                className="p-6 rounded-3xl border-2 border-violet-500/40 bg-violet-500/10 backdrop-blur-xl shadow-[0_0_50px_rgba(139,92,246,0.2)] pointer-events-auto"
              >
                <div className="absolute -top-3 px-4 py-1 bg-background border border-violet-500/40 rounded-full text-[10px] font-black uppercase tracking-[0.2em] left-1/2 -translate-x-1/2 text-violet-400 whitespace-nowrap shadow-xl">MASTER CONTROLLER</div>
                <div className="flex flex-col items-center gap-3">
                  <div className="relative">
                    <ShieldCheck className="w-10 h-10 text-violet-500 relative z-10" />
                    {systemStatus === 'RUNNING' && (
                      <motion.div 
                        animate={{ scale: [1, 1.5, 1], opacity: [0.2, 0.4, 0.2] }}
                        transition={{ repeat: Infinity, duration: 3 }}
                        className="absolute inset-0 bg-violet-500 rounded-full blur-xl"
                      />
                    )}
                  </div>
                  <div className="flex flex-col items-center">
                    <div className="text-[11px] font-black uppercase tracking-widest text-foreground">ACTIVE</div>
                    <div className="text-[8px] font-bold text-violet-400/60 uppercase mt-0.5">MASTER READY</div>
                  </div>
                </div>
              </div>

              {/* Chunkservers */}
              {nodes.map((node) => {
                const pos = NODE_POSITIONS[node.id];
                return (
                  <div
                    key={node.id} 
                    style={{ 
                      position: 'absolute', 
                      left: `${(pos.x / SVG_WIDTH) * 100}%`, 
                      top: `${(pos.y / SVG_HEIGHT) * 100}%`, 
                      transform: 'translate(-50%, -50%)',
                      width: '90px'
                    }}
                    className="pointer-events-none"
                  >
                    <motion.div
                      whileHover={{ y: -5, scale: 1.02 }}
                      onClick={() => setSelectedNodeId(node.id)}
                      className={`cursor-pointer group p-3 rounded-2xl border-2 transition-all duration-300 h-[120px] flex flex-col justify-between backdrop-blur-sm pointer-events-auto ${
                        node.status === 'FAILED' 
                          ? 'border-red-500/40 bg-red-500/5 shadow-[0_0_20px_rgba(239,68,68,0.1)]' 
                          : selectedNodeId === node.id 
                            ? 'border-violet-500 bg-violet-500/20 shadow-[0_0_30px_rgba(139,92,246,0.2)]' 
                            : 'border-border bg-muted/50 hover:border-border/80 hover:bg-muted/80'
                      }`}
                    >
                      <div className="flex flex-col items-center gap-2">
                        <div className="relative">
                          <Server className={`w-5 h-5 ${node.status === 'HEALTHY' ? 'text-violet-500' : 'text-red-500'}`} />
                          {node.status === 'HEALTHY' && systemStatus === 'RUNNING' && (
                            <motion.div 
                              animate={{ opacity: [0.3, 0.6, 0.3] }}
                              transition={{ repeat: Infinity, duration: 2 }}
                              className="absolute -top-1 -right-1 w-1.5 h-1.5 bg-green-500 rounded-full shadow-[0_0_8px_rgba(34,197,94,0.8)]"
                            />
                          )}
                        </div>
                        <div className="text-center">
                          <div className="text-[10px] font-black uppercase tracking-widest text-foreground">{node.id}</div>
                          <div className="text-[7px] font-black uppercase tracking-widest h-3 flex items-center justify-center mt-0.5">
                            {node.status === 'HEALTHY' ? (
                              <span className="text-green-500/80">ACTIVE</span>
                            ) : node.recoveryCountdown !== undefined ? (
                              <span className={`text-red-500 ${systemStatus === 'RUNNING' ? 'animate-pulse' : ''}`}>RECOVERY: {node.recoveryCountdown}S</span>
                            ) : (
                              <span className="text-red-500">OFFLINE</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="mt-2 flex flex-wrap justify-center gap-1">
                        {chunks.map(chunk => {
                          const replica = chunk.replicas.find(r => r.nodeId === node.id);
                          if (!replica) return null;
                          const isPrimary = chunk.primaryNodeId === node.id;
                          return (
                            <motion.div 
                              key={chunk.id} 
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              className={`flex items-center gap-1 px-1.5 py-0.5 text-[7px] font-black rounded border ${
                                replica.status === 'CORRUPTED' ? 'bg-orange-500/20 border-orange-500/40 text-orange-500' : 
                                isPrimary ? 'bg-amber-500/20 border-amber-500/40 text-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.2)]' : 
                                'bg-blue-500/20 border-blue-500/40 text-blue-500'
                              }`}
                            >
                              {isPrimary && <Crown className="w-2 h-2" />}
                              {chunk.id}
                            </motion.div>
                          );
                        })}
                      </div>
                    </motion.div>
                  </div>
                );
              })}
            </div>

            {/* Legend Overlay */}
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-8 px-8 py-3 bg-muted/80 backdrop-blur-md border border-border rounded-full text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground z-20">
              <div className="flex items-center gap-2.5"><div className="w-2.5 h-2.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]" /> HEALTHY</div>
              <div className="flex items-center gap-2.5 text-amber-500"><Crown className="w-3 h-3" /> PRIMARY</div>
              <div className="flex items-center gap-2.5"><div className="w-2.5 h-2.5 rounded-full bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.5)]" /> CORRUPT</div>
              <div className="flex items-center gap-2.5"><div className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]" /> FAILED</div>              
            </div>
          </main>

          {/* Right Panel: Metrics & Logs */}
          <aside className="w-80 border-l border-border bg-muted/20 p-6 flex flex-col gap-6 overflow-hidden z-20">
            <div className="space-y-4">
              <div className="opacity-80">
                <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-foreground/80">Metrics</h3>
              </div>
              <div className="space-y-3">
                <div className="p-4 bg-muted/50 rounded-2xl border border-border shadow-inner">
                  <div className="flex justify-between items-end mb-2">
                    <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">AVAILABILITY</span>
                    <span className={`text-[15px] font-mono font-black tabular-nums ${getAvailability() < 100 ? 'text-orange-500' : 'text-green-500'}`}>{getAvailability().toFixed(1)}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden border border-border">
                    <motion.div 
                      initial={{ width: 0 }} 
                      animate={{ width: `${getAvailability()}%` }} 
                      className={`h-full transition-colors duration-500 ${getAvailability() < 100 ? 'bg-orange-500' : 'bg-green-500'}`} 
                    />
                  </div>
                </div>

                <div className="p-4 bg-muted/50 rounded-2xl border border-border shadow-inner">
                  <div className="flex justify-between items-end mb-2">
                    <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">REPLICATION HEALTH</span>
                    <span className={`text-[15px] font-mono font-black tabular-nums ${getReplicationHealth() < 80 ? 'text-red-500' : getReplicationHealth() < 100 ? 'text-orange-500' : 'text-violet-500'}`}>{getReplicationHealth().toFixed(1)}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden border border-border">
                    <motion.div 
                      initial={{ width: 0 }} 
                      animate={{ width: `${getReplicationHealth()}%` }} 
                      className={`h-full transition-colors duration-500 ${getReplicationHealth() < 80 ? 'bg-red-500' : getReplicationHealth() < 100 ? 'bg-orange-500' : 'bg-violet-500'}`} 
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex-1 flex flex-col min-h-0">
              <div className="mb-4 opacity-80">
                <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-foreground/80">System Log</h3>
              </div>
              <div className="flex-1 overflow-y-auto space-y-2.5 pr-2 custom-scrollbar">
                <AnimatePresence initial={false}>
                  {logs.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center opacity-20 text-center p-8">
                      <FolderOpen className="w-12 h-12 mb-4" />
                      <p className="text-[10px] font-black uppercase tracking-widest">No system events to display.</p>
                    </div>
                  ) : (
                    logs.map((log) => (
                      <motion.div
                        key={log.id} 
                        initial={{ opacity: 0, x: 20 }} 
                        animate={{ opacity: 1, x: 0 }}
                        className={`p-3.5 rounded-xl border-l-4 text-[11px] leading-relaxed backdrop-blur-sm transition-all ${
                          log.type === 'error' ? 'bg-red-500/10 border-red-500 text-red-500' :
                          log.type === 'warning' ? 'bg-violet-500/10 border-violet-500 text-violet-500' :
                          log.type === 'success' ? 'bg-green-500/10 border-green-500 text-green-500' :
                          'bg-muted/50 border-border text-muted-foreground'
                        }`}
                      >
                        <div className="flex justify-between items-start gap-4">
                          <span className="font-medium">{log.message}</span>
                          <span className="text-[9px] font-mono opacity-30 shrink-0 tabular-nums">{log.timestamp}</span>
                        </div>
                      </motion.div>
                    ))
                  )}
                </AnimatePresence>
                {logs.length >= 25 && (
                  <div className="py-4 text-center">
                    <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">History_Truncated</span>
                  </div>
                )}
              </div>
            </div>

            <div className="p-5 bg-violet-500/5 rounded-2xl border border-violet-500/20 backdrop-blur-sm">
              <div className="flex items-center gap-2 mb-2">
                <Info className="w-3 h-3 text-violet-400" />
                <h4 className="text-[10px] font-black text-violet-400 uppercase tracking-widest">INSIGHT</h4>
              </div>
              <p className="text-[10px] leading-relaxed text-muted-foreground">
                {isReplicating ? "Master is actively re-replicating under-replicated chunks to maintain redundancy." : 
                 !isSystemAlive ? "System is in critical failure state. Manual intervention required." :
                 isSystemDegraded ? "System is operational but redundancy is compromised. Recovery in progress." :
                 "System is nominal. Primary chunks (with Crown icon) hold active leases for client writes."}
              </p>
            </div>
          </aside>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(139,92,246,0.1); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(139,92,246,0.2); }
        @keyframes spin-slow { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .animate-spin-slow { animation: spin-slow 8s linear infinite; }
      `}} />
    </>
  );
};
