import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Settings2, 
  Activity, 
  Database, 
  Share2, 
  Cpu, 
  Zap, 
  TrendingUp, 
  Info, 
  Play, 
  Pause, 
  RotateCcw,
  Network,
  Layers,
  AlertTriangle,
  ChevronRight,
  Box,
  Clock
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';
import { Strategy, Replica, Packet, SimulationMetrics, ReplicaState } from './types';

// --- Constants ---
const MAX_REPLICAS = 8;
const SVG_SIZE = 600;
const CENTER = SVG_SIZE / 2;
const RING_RADIUS = 180;

const COLORS = {
  primary: '#FF6F00', // TF Orange
  secondary: '#4285F4', // TF Blue
  accent: '#00E676', // Success Green
  warning: '#FFD600', // Warning Yellow
  error: '#FF5252', // Error Red
  background: '#0B0E14',
  card: '#161B22',
  border: '#30363D',
  muted: '#8B949E'
};

// --- Main Component ---
export const GradientGossip: React.FC = () => {
  // --- State ---
  const [isSimulating, setIsSimulating] = useState(false);
  const [strategy, setStrategy] = useState<Strategy>('mirrored');
  const [replicaCount, setReplicaCount] = useState(4);
  const [batchSize, setBatchSize] = useState(32);
  const [networkBandwidth, setNetworkBandwidth] = useState(50);
  const [isSync, setIsSync] = useState(true);
  const [modelSize, setModelSize] = useState(50);
  const [stragglerId, setStragglerId] = useState<string | null>(null);
  
  const [replicas, setReplicas] = useState<Replica[]>([]);
  const [packets, setPackets] = useState<Packet[]>([]);
  const [metrics, setMetrics] = useState<SimulationMetrics>({
    stepTime: 0,
    computeTime: 0,
    commTime: 0,
    syncDelay: 0,
    throughput: 0,
    stepsCompleted: 0
  });
  const [history, setHistory] = useState<{ time: number; throughput: number }[]>([]);
  const [simulationTime, setSimulationTime] = useState(0);
  const [lastAction, setLastAction] = useState<string | null>(null);

  const simulationRef = useRef<number | null>(null);
  const lastTickRef = useRef<number>(0);

  // --- Initialization ---
  const initReplicas = useCallback(() => {
    const newReplicas: Replica[] = Array.from({ length: replicaCount }).map((_, i) => ({
      id: `Replica:${i}`,
      type: i % 4 === 0 ? 'CPU' : 'GPU',
      state: 'idle',
      progress: 0,
      batchSize: batchSize,
      hashPower: i % 4 === 0 ? 0.5 : 1.0,
      lastStepTime: 0,
      isStraggler: `Replica:${i}` === stragglerId
    }));
    setReplicas(newReplicas);
    setPackets([]);
    setMetrics({
      stepTime: 0,
      computeTime: 0,
      commTime: 0,
      syncDelay: 0,
      throughput: 0,
      stepsCompleted: 0
    });
    setHistory([]);
    setSimulationTime(0);
  }, [replicaCount, batchSize, stragglerId]);

  useEffect(() => {
    initReplicas();
  }, [initReplicas]);

  // --- Action Feedback ---
  const triggerAction = useCallback((message: string) => {
    setLastAction(message);
  }, []);

  useEffect(() => {
    if (lastAction) {
      const timer = setTimeout(() => setLastAction(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [lastAction]);

  // --- Simulation Loop ---
  const tick = useCallback((timestamp: number) => {
    if (!lastTickRef.current) lastTickRef.current = timestamp;
    const deltaTime = timestamp - lastTickRef.current;
    lastTickRef.current = timestamp;

    if (!isSimulating) return;

    setSimulationTime(prev => prev + deltaTime);

    setReplicas(prevReplicas => {
      const nextReplicas = [...prevReplicas];
      const activePackets: Packet[] = [];
      
      // 1. Update Replica States
      nextReplicas.forEach(replica => {
        const speed = replica.hashPower * (replica.isStraggler ? 0.3 : 1.0);
        
        if (replica.state === 'idle') {
          replica.state = 'computing';
          replica.progress = 0;
        }

        if (replica.state === 'computing') {
          const computeStep = (deltaTime / (batchSize * 15)) * speed;
          replica.progress = Math.min(1, replica.progress + computeStep);
          if (replica.progress >= 1) {
            replica.state = 'communicating';
            replica.progress = 0;
            
            // Generate Packets based on strategy
            if (strategy === 'parameter-server') {
              activePackets.push({
                id: `packet-${replica.id}-${Date.now()}`,
                from: replica.id,
                to: 'PS',
                type: 'gradient',
                progress: 0,
                size: modelSize
              });
            } else {
              // Mirrored: Send to neighbors (Ring All-Reduce)
              const idx = nextReplicas.findIndex(r => r.id === replica.id);
              const nextIdx = (idx + 1) % nextReplicas.length;
              activePackets.push({
                id: `packet-${replica.id}-${Date.now()}`,
                from: replica.id,
                to: nextReplicas[nextIdx].id,
                type: 'gradient',
                progress: 0,
                size: modelSize
              });
            }
          }
        }

        if (replica.state === 'communicating') {
          // Check if all packets for this replica have arrived
          // This is handled by the packet update logic below
        }
      });

      if (activePackets.length > 0) {
        setPackets(prev => [...prev, ...activePackets]);
      }

      return nextReplicas;
    });

    // 2. Update Packets
    setPackets(prevPackets => {
      const nextPackets = prevPackets.map(p => {
        const speed = (networkBandwidth / 100) * (50 / modelSize);
        return {
          ...p,
          progress: Math.min(1, p.progress + (deltaTime / 1000) * speed)
        };
      });

      // Check for completed packets and update replica states
      const completedPackets = nextPackets.filter(p => p.progress >= 1);
      if (completedPackets.length > 0) {
        setReplicas(prev => {
          const updated = [...prev];
          completedPackets.forEach(p => {
            if (strategy === 'parameter-server') {
              if (p.to === 'PS') {
                // Gradient reached PS, PS sends back weights
                setPackets(current => [
                  ...current,
                  {
                    id: `weight-${p.from}-${Date.now()}`,
                    from: 'PS',
                    to: p.from,
                    type: 'weight',
                    progress: 0,
                    size: modelSize
                  }
                ]);
              } else {
                // Weights reached worker
                const replica = updated.find(r => r.id === p.to);
                if (replica) replica.state = 'syncing';
              }
            } else {
              // Mirrored: Gradient reached neighbor
              const replica = updated.find(r => r.id === p.to);
              if (replica) replica.state = 'syncing';
            }
          });
          return updated;
        });
      }
      
      return nextPackets.filter(p => p.progress < 1);
    });

    // 3. Handle Synchronization
    setReplicas(prev => {
      const allSyncing = prev.every(r => r.state === 'syncing');
      if (allSyncing || (!isSync && prev.some(r => r.state === 'syncing'))) {
        // Step complete
        const currentTime = Date.now();
        const stepDuration = currentTime - (lastTickRef.current || currentTime);
        const currentCommTime = (modelSize / (networkBandwidth || 1)) * 100;
        
        setMetrics(m => ({
          ...m,
          stepsCompleted: m.stepsCompleted + 1,
          stepTime: stepDuration > 0 ? stepDuration : m.stepTime,
          computeTime: (batchSize * 15) / (replicaCount || 1),
          commTime: currentCommTime,
          throughput: (m.stepsCompleted + 1) / (simulationTime / 1000),
          syncDelay: prev.some(r => r.isStraggler) ? 150 : 20 // Simulated sync delay
        }));
        
        return prev.map(r => ({
          ...r,
          state: r.state === 'syncing' ? 'idle' : r.state,
          progress: 0
        }));
      }
      return prev;
    });

    simulationRef.current = requestAnimationFrame(tick);
  }, [isSimulating, batchSize, modelSize, networkBandwidth, strategy, isSync, simulationTime]);

  useEffect(() => {
    if (isSimulating) {
      simulationRef.current = requestAnimationFrame(tick);
    } else {
      if (simulationRef.current) cancelAnimationFrame(simulationRef.current);
      lastTickRef.current = 0;
    }
    return () => {
      if (simulationRef.current) cancelAnimationFrame(simulationRef.current);
    };
  }, [isSimulating, tick]);

  // --- Helpers ---
  const getReplicaPos = (index: number, total: number) => {
    const angle = (index / total) * 2 * Math.PI - Math.PI / 2;
    return {
      x: CENTER + RING_RADIUS * Math.cos(angle),
      y: CENTER + RING_RADIUS * Math.sin(angle),
      angle
    };
  };

  return (
    <div className="w-full max-w-7xl mx-auto bg-[#0B0E14] text-[#C9D1D9] font-sans selection:bg-[#FF6F00]/30 flex flex-col h-[900px] overflow-hidden border border-[#30363D] rounded-xl shadow-2xl">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-[#30363D] bg-[#161B22]/50">
        <div className="flex items-center gap-4">
          <div className="p-2 bg-[#FF6F00]/10 rounded-lg">
            <Activity className="w-6 h-6 text-[#FF6F00]" />
          </div>
          <div>
            <h1 className="text-lg font-black uppercase tracking-[0.2em] text-white">Gradient_Gossip_v1.0</h1>
            <p className="text-[10px] font-bold text-[#8B949E] uppercase tracking-widest">TensorFlow Distributed Training Visualizer</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsSimulating(!isSimulating)}
            className={`flex items-center gap-2 px-6 py-2 rounded-sm font-black text-xs uppercase tracking-widest transition-all border ${
              isSimulating 
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-500 hover:bg-amber-500/20' 
                : 'bg-[#FF6F00] border-[#FF6F00]/30 text-white hover:bg-[#FF6F00]/90 shadow-[0_0_15px_rgba(255,111,0,0.3)]'
            }`}
          >
            {isSimulating ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
            {isSimulating ? 'Pause' : 'Start_Training'}
          </button>
          <button 
            onClick={initReplicas}
            className="p-2 bg-[#161B22] hover:bg-[#30363D] border border-[#30363D] rounded-sm transition-all text-[#8B949E] hover:text-white"
          >
            <RotateCcw className="w-5 h-5" />
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar Controls */}
        <aside className="w-80 border-r border-[#30363D] bg-[#0D1117] flex flex-col overflow-y-auto custom-scrollbar">
          <div className="p-6 space-y-8">
            {/* Strategy Selection */}
            <section className="space-y-4">
              <div className="flex items-center gap-2 opacity-60">
                <Share2 className="w-4 h-4 text-[#FF6F00]" />
                <h3 className="text-[10px] font-bold uppercase tracking-[0.15em]">Distribution_Strategy</h3>
              </div>
              <div className="grid grid-cols-1 gap-2">
                {[
                  { id: 'parameter-server', label: 'ParameterServerStrategy', desc: 'Centralized aggregation' },
                  { id: 'mirrored', label: 'MirroredStrategy', desc: 'Synchronous All-Reduce' }
                ].map(s => (
                  <button
                    key={s.id}
                    onClick={() => {
                      setStrategy(s.id as Strategy);
                      triggerAction(`Switched to ${s.id}`);
                    }}
                    className={`p-3 rounded-sm border text-left transition-all ${
                      strategy === s.id 
                        ? 'bg-[#FF6F00]/10 border-[#FF6F00] text-white' 
                        : 'bg-[#161B22] border-[#30363D] text-[#8B949E] hover:border-[#8B949E]/50'
                    }`}
                  >
                    <div className="text-[10px] font-black uppercase tracking-widest mb-1">{s.label}</div>
                    <div className="text-[8px] font-medium opacity-60">{s.desc}</div>
                  </button>
                ))}
              </div>
            </section>

            {/* Hardware Config */}
            <section className="space-y-4">
              <div className="flex items-center gap-2 opacity-60">
                <Cpu className="w-4 h-4 text-[#FF6F00]" />
                <h3 className="text-[10px] font-bold uppercase tracking-[0.15em]">Hardware_Config</h3>
              </div>
              
              <div className="space-y-6">
                <ControlSlider 
                  label="Replica Count" 
                  value={replicaCount} 
                  min={1} 
                  max={MAX_REPLICAS} 
                  onChange={setReplicaCount} 
                  unit="Nodes"
                />
                <ControlSlider 
                  label="Batch Size" 
                  value={batchSize} 
                  min={8} 
                  max={128} 
                  step={8}
                  onChange={setBatchSize} 
                  unit="Samples"
                />
                <ControlSlider 
                  label="Network Bandwidth" 
                  value={networkBandwidth} 
                  min={10} 
                  max={100} 
                  onChange={setNetworkBandwidth} 
                  unit="Gbps"
                />
                <ControlSlider 
                  label="Model Size" 
                  value={modelSize} 
                  min={10} 
                  max={200} 
                  step={10}
                  onChange={setModelSize} 
                  unit="MB"
                />
              </div>
            </section>

            {/* Advanced Settings */}
            <section className="space-y-4">
              <div className="flex items-center gap-2 opacity-60">
                <Settings2 className="w-4 h-4 text-[#FF6F00]" />
                <h3 className="text-[10px] font-bold uppercase tracking-[0.15em]">Advanced_Settings</h3>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-[#161B22] border border-[#30363D] rounded-sm">
                  <div className="space-y-0.5">
                    <div className="text-[9px] font-black uppercase tracking-widest text-white">Sync Mode</div>
                    <div className="text-[7px] text-[#8B949E] uppercase font-bold">Barrier Synchronization</div>
                  </div>
                  <button 
                    onClick={() => setIsSync(!isSync)}
                    className={`w-10 h-5 rounded-full transition-all relative ${isSync ? 'bg-[#FF6F00]' : 'bg-[#30363D]'}`}
                  >
                    <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${isSync ? 'left-6' : 'left-1'}`} />
                  </button>
                </div>

                <div className="space-y-2">
                  <div className="text-[9px] font-black uppercase tracking-widest text-[#8B949E]">Straggler Injection</div>
                  <div className="grid grid-cols-4 gap-1">
                    {replicas.map(r => (
                      <button
                        key={r.id}
                        onClick={() => setStragglerId(stragglerId === r.id ? null : r.id)}
                        className={`py-1.5 text-[8px] font-bold rounded-sm border transition-all ${
                          stragglerId === r.id 
                            ? 'bg-red-500/20 border-red-500 text-red-500' 
                            : 'bg-[#161B22] border-[#30363D] text-[#8B949E]'
                        }`}
                      >
                        {r.id.split(':')[1]}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </section>
          </div>

          {/* Code Snippet */}
          <div className="mt-auto p-6 bg-[#0B0E14] border-t border-[#30363D]">
            <div className="flex items-center gap-2 mb-3 opacity-60">
              <Layers className="w-3 h-3 text-[#FF6F00]" />
              <span className="text-[8px] font-bold uppercase tracking-widest">TF_Distribution_API</span>
            </div>
            <pre className="text-[9px] font-mono text-[#4285F4] leading-relaxed">
              {strategy === 'mirrored' 
                ? `strategy = tf.distribute.MirroredStrategy()\nwith strategy.scope():\n  model = create_model()`
                : `strategy = tf.distribute.experimental.ParameterServerStrategy(cluster_resolver)\nwith strategy.scope():\n  model = create_model()`
              }
            </pre>
          </div>
        </aside>

        {/* Main Visualization */}
        <main className="flex-1 relative bg-[#0B0E14] flex flex-col overflow-hidden">
          {/* Background Grid */}
          <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[linear-gradient(currentColor_1px,transparent_1px),linear-gradient(90deg,currentColor_1px,transparent_1px)] bg-[size:40px_40px]" />
          
          {/* Overlay Labels */}
          <div className="absolute top-6 left-6 z-10 space-y-1">
            <h2 className="text-xl font-black uppercase tracking-[0.3em] text-white">Execution_Graph</h2>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-[#FF6F00] animate-pulse" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#8B949E]">
                {strategy === 'mirrored' ? 'Ring All-Reduce Active' : 'PS Aggregation Active'}
              </span>
            </div>
          </div>

          {/* Simulation Canvas */}
          <div className="flex-1 flex items-center justify-center p-8 relative">
            <svg viewBox={`0 0 ${SVG_SIZE} ${SVG_SIZE}`} className="w-full h-full max-w-[600px] drop-shadow-[0_0_30px_rgba(0,0,0,0.5)]">
              {/* Parameter Server Node (Center) */}
              {strategy === 'parameter-server' && (
                <motion.g
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="z-20"
                >
                  <circle cx={CENTER} cy={CENTER} r="40" fill="#161B22" stroke="#FF6F00" strokeWidth="2" />
                  <Database className="w-8 h-8 text-[#FF6F00]" x={CENTER - 16} y={CENTER - 16} />
                  <text x={CENTER} y={CENTER + 55} textAnchor="middle" className="text-[10px] font-black fill-white uppercase tracking-widest">Parameter_Server</text>
                  <text x={CENTER} y={CENTER + 68} textAnchor="middle" className="text-[8px] font-bold fill-[#8B949E] uppercase tracking-widest">tf.Variable Store</text>
                </motion.g>
              )}

              {/* Ring Path for Mirrored Strategy */}
              {strategy === 'mirrored' && (
                <circle cx={CENTER} cy={CENTER} r={RING_RADIUS} fill="none" stroke="#30363D" strokeWidth="1" strokeDasharray="4 4" className="opacity-30" />
              )}

              {/* Connections */}
              {replicas.map((replica, i) => {
                const pos = getReplicaPos(i, replicaCount);
                if (strategy === 'parameter-server') {
                  return (
                    <line 
                      key={`conn-${replica.id}`} 
                      x1={CENTER} y1={CENTER} 
                      x2={pos.x} y2={pos.y} 
                      stroke="#30363D" 
                      strokeWidth="1" 
                      className="opacity-50"
                    />
                  );
                }
                return null;
              })}

              {/* Replicas */}
              {replicas.map((replica, i) => {
                const pos = getReplicaPos(i, replicaCount);
                const isComputing = replica.state === 'computing';
                
                return (
                  <motion.g 
                    key={replica.id}
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.1 }}
                  >
                    {/* Progress Ring */}
                    <circle 
                      cx={pos.x} cy={pos.y} r="28" 
                      fill="none" stroke="#30363D" strokeWidth="4" 
                    />
                    <motion.circle 
                      cx={pos.x} cy={pos.y} r="28" 
                      fill="none" stroke={replica.isStraggler ? COLORS.error : COLORS.primary} 
                      strokeWidth="4" 
                      strokeDasharray="176"
                      strokeDashoffset={176 * (1 - replica.progress)}
                      strokeLinecap="round"
                      className="rotate-[-90deg]"
                      style={{ transformOrigin: `${pos.x}px ${pos.y}px` }}
                    />

                    {/* Node Body */}
                    <circle cx={pos.x} cy={pos.y} r="22" fill="#161B22" stroke={isComputing ? COLORS.primary : "#30363D"} strokeWidth="2" />
                    {replica.type === 'GPU' ? (
                      <Zap className={`w-5 h-5 ${isComputing ? 'text-[#FF6F00]' : 'text-[#8B949E]'}`} x={pos.x - 10} y={pos.y - 10} />
                    ) : (
                      <Cpu className={`w-5 h-5 ${isComputing ? 'text-[#FF6F00]' : 'text-[#8B949E]'}`} x={pos.x - 10} y={pos.y - 10} />
                    )}

                    {/* Labels */}
                    <text x={pos.x} y={pos.y + 45} textAnchor="middle" className="text-[9px] font-black fill-white uppercase tracking-widest">
                      {replica.id.replace('Replica:', 'Replica_')}
                    </text>
                    <text x={pos.x} y={pos.y + 56} textAnchor="middle" className="text-[7px] font-bold fill-[#8B949E] uppercase tracking-widest">
                      {replica.type === 'GPU' ? '/device:GPU:0' : '/device:CPU:0'}
                    </text>
                    
                    {replica.isStraggler && (
                      <motion.g animate={{ opacity: [0.4, 1, 0.4] }} transition={{ repeat: Infinity, duration: 1.5 }}>
                        <AlertTriangle className="w-4 h-4 text-red-500" x={pos.x + 15} y={pos.y - 35} />
                      </motion.g>
                    )}
                  </motion.g>
                );
              })}

              {/* Packets */}
              <AnimatePresence>
                {packets.map(packet => {
                  const fromPos = packet.from === 'PS' 
                    ? { x: CENTER, y: CENTER } 
                    : getReplicaPos(replicas.findIndex(r => r.id === packet.from), replicaCount);
                  
                  const toPos = packet.to === 'PS' 
                    ? { x: CENTER, y: CENTER } 
                    : getReplicaPos(replicas.findIndex(r => r.id === packet.to), replicaCount);
                  
                  const currentX = fromPos.x + (toPos.x - fromPos.x) * packet.progress;
                  const currentY = fromPos.y + (toPos.y - fromPos.y) * packet.progress;
                  
                  return (
                    <motion.g 
                      key={packet.id}
                      initial={{ opacity: 0, scale: 0 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0 }}
                    >
                      <circle 
                        cx={currentX} 
                        cy={currentY} 
                        r={packet.type === 'gradient' ? 4 : 5} 
                        fill={packet.type === 'gradient' ? COLORS.primary : COLORS.secondary} 
                        className="shadow-lg"
                      />
                      <circle 
                        cx={currentX} 
                        cy={currentY} 
                        r={packet.type === 'gradient' ? 8 : 10} 
                        fill={packet.type === 'gradient' ? COLORS.primary : COLORS.secondary} 
                        className="opacity-20 animate-pulse"
                      />
                    </motion.g>
                  );
                })}
              </AnimatePresence>
            </svg>
          </div>

          {/* Simulation Log Overlay */}
          <div className="absolute bottom-6 left-6 pointer-events-none overflow-hidden h-12 flex items-end z-50">
            <AnimatePresence mode="wait">
              {lastAction && (
                <motion.div 
                  key={lastAction}
                  initial={{ opacity: 0, y: 10, filter: 'blur(4px)' }}
                  animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                  exit={{ opacity: 0, scale: 0.95, filter: 'blur(4px)', transition: { duration: 0.2 } }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                  className="bg-[#161B22]/95 backdrop-blur-md border border-[#30363D] px-4 py-2 rounded-sm inline-flex items-center gap-3 shadow-2xl"
                >
                  <Activity className="w-4 h-4 text-[#FF6F00] animate-pulse" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-white">{lastAction}</span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </main>
      </div>

      {/* Metrics Footer */}
      <footer className="h-32 border-t border-[#30363D] bg-[#0D1117] px-8 py-4 flex items-center gap-8 shrink-0">
        <div className="grid grid-cols-5 gap-8 flex-1">
          <MetricItem label="Step Time" value={`${metrics.stepTime.toFixed(0)}ms`} icon={<Clock className="w-4 h-4" />} />
          <MetricItem label="Throughput" value={`${metrics.throughput.toFixed(1)} steps/s`} icon={<TrendingUp className="w-4 h-4" />} />
          <MetricItem label="Sync Delay" value={`${metrics.syncDelay.toFixed(0)}ms`} icon={<AlertTriangle className="w-4 h-4" />} color="text-amber-500" />
          <MetricItem label="Comm Overhead" value={`${((metrics.commTime / (metrics.stepTime || 1)) * 100).toFixed(1)}%`} icon={<Network className="w-4 h-4" />} />
          <MetricItem label="Compute Utilization" value={`${(100 - (metrics.commTime / (metrics.stepTime || 1)) * 100).toFixed(1)}%`} icon={<Zap className="w-4 h-4" />} color="text-emerald-500" />
        </div>
        
        <div className="w-64 h-full border-l border-[#30363D] pl-8 flex flex-col justify-center">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[8px] font-bold uppercase tracking-widest text-[#8B949E]">Scaling Efficiency</span>
            <span className="text-[10px] font-black text-white">84.2%</span>
          </div>
          <div className="w-full h-1.5 bg-[#161B22] rounded-full overflow-hidden">
            <motion.div 
              className="h-full bg-[#FF6F00]" 
              initial={{ width: 0 }}
              animate={{ width: '84.2%' }}
            />
          </div>
        </div>
      </footer>
    </div>
  );
};

// --- Sub-components ---

const ControlSlider: React.FC<{ 
  label: string; 
  value: number; 
  min: number; 
  max: number; 
  step?: number;
  unit: string;
  onChange: (val: number) => void;
}> = ({ label, value, min, max, step = 1, unit, onChange }) => (
  <div className="space-y-2">
    <div className="flex justify-between text-[9px] font-black uppercase tracking-widest text-[#8B949E]">
      <span>{label}</span>
      <span className="text-white">{value} <span className="opacity-50">{unit}</span></span>
    </div>
    <input 
      type="range" 
      min={min} 
      max={max} 
      step={step}
      value={value} 
      onChange={(e) => onChange(parseInt(e.target.value))}
      className="w-full h-1 bg-[#30363D] rounded-lg appearance-none cursor-pointer accent-[#FF6F00]"
      style={{
        background: `linear-gradient(to right, #FF6F00 0%, #FF6F00 ${((value - min) / (max - min)) * 100}%, #30363D ${((value - min) / (max - min)) * 100}%, #30363D 100%)`
      }}
    />
  </div>
);

const MetricItem: React.FC<{ label: string; value: string | number; icon: React.ReactNode; color?: string }> = ({ label, value, icon, color = "text-white" }) => (
  <div className="flex flex-col gap-1">
    <div className="flex items-center gap-2 opacity-50">
      {icon}
      <span className="text-[8px] font-bold uppercase tracking-widest">{label}</span>
    </div>
    <span className={`text-xl font-black tabular-nums ${color}`}>{value}</span>
  </div>
);

export default GradientGossip;
