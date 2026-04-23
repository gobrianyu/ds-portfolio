import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Route, Layers, Gauge, HardDrive, 
  CheckCircle2, XCircle, Info, Play, 
  RotateCcw, Box, Terminal, Cpu
} from 'lucide-react';

interface Step {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'active' | 'completed' | 'skipped' | 'hit' | 'miss';
  latency: number;
}

interface QueryResult {
  key: string;
  foundAt: string;
  latency: number;
  status: 'hit' | 'miss';
}

interface Metrics {
  totalBatchLatency: number;
  currentQueryLatency: number;
  diskSeeks: number;
  completedQueries: number;
}

const BigtableReadPath: React.FC = () => {
  const [isSimulating, setIsSimulating] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(-1);
  const [bloomEnabled, setBloomEnabled] = useState(true);
  const [cacheWarm, setCacheWarm] = useState(false);
  const [sstableCount, setSstableCount] = useState(3);
  
  const [steps, setSteps] = useState<Step[]>([]);
  const [results, setResults] = useState<QueryResult[]>([]);
  const [metrics, setMetrics] = useState<Metrics>({
    totalBatchLatency: 0,
    currentQueryLatency: 0,
    diskSeeks: 0,
    completedQueries: 0
  });

  const simulationIdRef = useRef(0);

  const queries = ['user_123', 'user_456', 'user_789', 'user_999'];
  const ANIMATION_SPEED = 250; // Snappy animations

  const initSimulation = useCallback(() => {
    simulationIdRef.current++;
    const newSteps: Step[] = [
      { id: 'routing', title: 'Request Routing', description: 'Locate tablet server via metadata service', status: 'pending', latency: 0.2 },
      { id: 'row_cache', title: 'Row Cache', description: 'Check in-memory row cache', status: 'pending', latency: 0.1 },
      { id: 'block_cache', title: 'Block Cache', description: 'Check cached SSTable blocks', status: 'pending', latency: 0.1 },
      { id: 'memtable', title: 'Memtable', description: 'Search active memtable', status: 'pending', latency: 0.5 },
    ];

    for (let i = 1; i <= sstableCount; i++) {
      newSteps.push({ 
        id: `sstable_${i}`, 
        title: `SSTable ${i}`, 
        description: bloomEnabled ? `Bloom Filter check for SSTable ${i}...` : `Index scan for SSTable ${i}...`, 
        status: 'pending', 
        latency: bloomEnabled ? 0.2 : 15.0 
      });
    }

    newSteps.push({ id: 'merge', title: 'Merge & Return', description: 'Merge results from all layers', status: 'pending', latency: 0.1 });
    
    setSteps(newSteps);
    setCurrentStepIndex(-1);
    setResults([]);
    setMetrics({ totalBatchLatency: 0, currentQueryLatency: 0, diskSeeks: 0, completedQueries: 0 });
    setIsSimulating(false);
  }, [bloomEnabled, sstableCount]);

  useEffect(() => {
    initSimulation();
  }, [initSimulation]);

  const updateStep = (index: number, status: Step['status'], latency: number) => {
    setSteps(prev => prev.map((s, i) => i === index ? { ...s, status } : s));
  };

  const runBatchSimulation = async () => {
    if (isSimulating) return;
    setIsSimulating(true);
    const currentId = ++simulationIdRef.current;
    setResults([]);
    setMetrics({ totalBatchLatency: 0, currentQueryLatency: 0, diskSeeks: 0, completedQueries: 0 });

    let totalBatchTime = 0;
    let totalSeeks = 0;

    for (let qIdx = 0; qIdx < queries.length; qIdx++) {
      if (simulationIdRef.current !== currentId) return;
      const rowKey = queries[qIdx];
      let currentQueryTime = 0;
      let found = false;
      let foundAt = 'Not Found';
      let currentSeeks = 0;

      // Reset steps for new query
      setSteps(prev => prev.map(s => ({ ...s, status: 'pending' })));
      setCurrentStepIndex(-1);
      await new Promise(r => setTimeout(r, ANIMATION_SPEED));
      if (simulationIdRef.current !== currentId) return;

      // 1. Routing
      setCurrentStepIndex(0);
      await new Promise(r => setTimeout(r, ANIMATION_SPEED));
      if (simulationIdRef.current !== currentId) return;
      updateStep(0, 'completed', 0.2);
      currentQueryTime += 0.2;

      // 2. Row Cache
      setCurrentStepIndex(1);
      await new Promise(r => setTimeout(r, ANIMATION_SPEED));
      if (simulationIdRef.current !== currentId) return;
      if (cacheWarm && rowKey === 'user_123') {
        updateStep(1, 'hit', 0.1);
        currentQueryTime += 0.1;
        found = true;
        foundAt = 'Row Cache';
      } else {
        updateStep(1, 'completed', 0.1);
        currentQueryTime += 0.1;
      }

      // 3. Block Cache
      if (!found) {
        setCurrentStepIndex(2);
        await new Promise(r => setTimeout(r, ANIMATION_SPEED));
        if (simulationIdRef.current !== currentId) return;
        // Simulate block cache hit for user_123 if row cache missed but cache is warm
        if (cacheWarm && rowKey === 'user_123') {
           updateStep(2, 'hit', 0.1);
           currentQueryTime += 0.1;
           found = true;
           foundAt = 'Block Cache';
        } else {
          updateStep(2, 'completed', 0.1);
          currentQueryTime += 0.1;
        }
      }

      // 4. Memtable
      if (!found) {
        setCurrentStepIndex(3);
        await new Promise(r => setTimeout(r, ANIMATION_SPEED));
        if (simulationIdRef.current !== currentId) return;
        if (rowKey === 'user_456') {
          updateStep(3, 'hit', 0.5);
          currentQueryTime += 0.5;
          found = true;
          foundAt = 'Memtable';
        } else {
          updateStep(3, 'completed', 0.5);
          currentQueryTime += 0.5;
        }
      }

      // 5. SSTables
      if (!found) {
        for (let i = 0; i < sstableCount; i++) {
          const stepIdx = i + 4;
          setCurrentStepIndex(stepIdx);
          await new Promise(r => setTimeout(r, ANIMATION_SPEED));
          if (simulationIdRef.current !== currentId) return;

          const isTargetInThisSSTable = (rowKey === 'user_123' && i === 0) || (rowKey === 'user_789' && i === 1);
          
          if (bloomEnabled) {
            // Bloom Filter check (probabilistic, in-memory)
            if (isTargetInThisSSTable) {
              // Bloom Hit (True Positive) -> Disk Access for DATA block
              updateStep(stepIdx, 'active', 0.2);
              currentQueryTime += 0.2;
              currentSeeks++; // Data block read
              currentQueryTime += 20.0; // Data block latency
              found = true;
              foundAt = 'SSTable Disk';
              updateStep(stepIdx, 'hit', 20.2);
              break;
            } else {
              // Bloom Miss (Definitely Not Present) -> Skip
              updateStep(stepIdx, 'skipped', 0.2);
              currentQueryTime += 0.2;
            }
          } else {
            // Bloom OFF -> Must check Index block on disk for EVERY SSTable
            updateStep(stepIdx, 'active', 15.0); // Index scan cost
            currentQueryTime += 15.0;
            currentSeeks++; // Index block read from disk
            
            if (isTargetInThisSSTable) {
              // Found in this SSTable index -> Now read DATA block
              currentSeeks++; // Data block read from disk
              currentQueryTime += 20.0; // Data block read
              updateStep(stepIdx, 'hit', 35.0);
              found = true;
              foundAt = 'SSTable Disk';
              break;
            } else {
              // Not in this SSTable, but we still paid for the index scan
              updateStep(stepIdx, 'miss', 15.0);
            }
          }
        }
      }

      // 6. Merge & Return
      const mergeStepIdx = steps.length - 1;
      setCurrentStepIndex(mergeStepIdx);
      await new Promise(r => setTimeout(r, ANIMATION_SPEED));
      if (simulationIdRef.current !== currentId) return;
      
      if (!found) {
        updateStep(mergeStepIdx, 'miss', 0.1);
        foundAt = 'None (Miss)';
      } else {
        updateStep(mergeStepIdx, 'completed', 0.1);
      }
      currentQueryTime += 0.1;

      totalBatchTime += currentQueryTime;
      totalSeeks += currentSeeks;
      
      const result: QueryResult = {
        key: rowKey,
        foundAt,
        latency: currentQueryTime,
        status: foundAt.includes('Miss') ? 'miss' : 'hit'
      };

      setResults(prev => [...prev, result]);
      setMetrics(prev => ({
        ...prev,
        totalBatchLatency: totalBatchTime,
        currentQueryLatency: currentQueryTime,
        diskSeeks: totalSeeks,
        completedQueries: qIdx + 1
      }));
    }

    if (simulationIdRef.current === currentId) {
      setIsSimulating(false);
      setCurrentStepIndex(-1);
    }
  };

  const [activeTab, setActiveTab] = useState<'config' | 'viz' | 'results'>('viz');

  return (
    <div className="w-[1200px] mx-auto h-[800px] bg-background border border-border shadow-[0_0_50px_rgba(0,0,0,0.1)] flex flex-col relative overflow-hidden rounded-xl font-mono selection:bg-violet-500/30 text-foreground transition-all">
      
      {/* Background Grid & Atmosphere */}
      <div className="absolute inset-0 opacity-[0.03] dark:opacity-20 pointer-events-none bg-[linear-gradient(rgba(0,0,0,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.1)_1px,transparent_1px)] dark:bg-[linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:30px_30px]" />
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_50%_-20%,rgba(139,92,246,0.15),transparent_70%)]" />
      
      {/* Header */}
      <header className="h-16 border-b border-border bg-card/50 backdrop-blur-md flex items-center justify-between px-8 shrink-0 z-30 relative">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-3">
            <Box className="w-5 h-5 text-violet-500" />
            <h1 className="text-[14px] font-black uppercase tracking-[0.25em] text-foreground">BIGTABLE_READ_PATH_v1.6</h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={runBatchSimulation}
            disabled={isSimulating}
            className={`group flex items-center justify-center gap-2 px-6 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all border ${
              isSimulating 
                ? 'bg-muted border-border text-muted-foreground' 
                : 'bg-violet-500/10 border-violet-500/40 text-violet-400 hover:bg-violet-500/20 shadow-[0_0_20px_rgba(139,92,246,0.1)]'
            }`}
          >
            {isSimulating ? <RotateCcw className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3 fill-current" />}
            {isSimulating ? 'Processing...' : 'Execute_Batch'}
          </button>
          <button 
            onClick={initSimulation}
            className="flex items-center justify-center w-10 h-10 bg-card hover:bg-muted text-foreground rounded-xl transition-all border border-border group"
            title="Reset System"
          >
            <RotateCcw className="w-4 h-4 group-hover:-rotate-180 transition-transform duration-500" />
          </button>
        </div>
      </header>

      <div className="flex flex-1 flex-row overflow-hidden relative z-10">
        {/* Left Panel: Control Panel */}
        <aside className="w-80 border-r border-border bg-card/30 backdrop-blur-sm p-8 flex flex-col gap-10 shrink-0">
          <section className="space-y-6">
            <h3 className="text-[11px] font-black opacity-80 mb-3 uppercase tracking-[0.2em] text-foreground/80">Parameters</h3>            
            <div className="space-y-4">
              <div className="p-4 bg-muted/30 rounded-2xl border border-border space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-black uppercase tracking-widest text-foreground/80">Bloom Filters</span>
                  <button 
                    onClick={() => setBloomEnabled(!bloomEnabled)}
                    disabled={isSimulating}
                    className={`w-10 h-5 rounded-full relative transition-all duration-300 ${bloomEnabled ? 'bg-violet-500 shadow-[0_0_10px_rgba(139,92,246,0.4)]' : 'bg-muted-foreground/20'}`}
                  >
                    <motion.div 
                      animate={{ x: bloomEnabled ? 22 : 4 }}
                      className="absolute top-1 w-3 h-3 rounded-full bg-white shadow-sm"
                    />
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-black uppercase tracking-widest text-foreground/80">Warm Cache</span>
                  <button 
                    onClick={() => setCacheWarm(!cacheWarm)}
                    disabled={isSimulating}
                    className={`w-10 h-5 rounded-full relative transition-all duration-300 ${cacheWarm ? 'bg-violet-500 shadow-[0_0_10px_rgba(139,92,246,0.4)]' : 'bg-muted-foreground/20'}`}
                  >
                    <motion.div 
                      animate={{ x: cacheWarm ? 22 : 4 }}
                      className="absolute top-1 w-3 h-3 rounded-full bg-white shadow-sm"
                    />
                  </button>
                </div>
              </div>

              <div className="p-4 bg-muted/30 rounded-2xl border border-border space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-[11px] font-black text-foreground/80 uppercase tracking-widest">SSTables</span>
                  <span className="px-2 py-0.5 bg-violet-500/20 text-violet-400 rounded text-[10px] font-black">{sstableCount}</span>
                </div>
                <div className="relative flex items-center h-6">
                  <div className="absolute left-0 right-0 h-1 bg-border rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-violet-500 shadow-[0_0_8px_rgba(139,92,246,0.5)]" 
                      style={{ width: `${((sstableCount - 1) / 4) * 100}%` }}
                    />
                  </div>
                  <input 
                    type="range" min="1" max="5" value={sstableCount} 
                    onChange={(e) => setSstableCount(parseInt(e.target.value))}
                    disabled={isSimulating}
                    className="absolute inset-0 w-full h-full bg-transparent appearance-none cursor-pointer accent-violet-500 disabled:opacity-50 z-10"
                  />
                </div>
              </div>
            </div>
          </section>

          <section className="mt-auto space-y-6">
            <div className="p-5 bg-violet-500/5 rounded-2xl border border-violet-500/20 backdrop-blur-sm">
              <div className="flex items-center gap-2 mb-2">
                <Info className="w-3 h-3 text-violet-400" />
                <h4 className="text-[10px] font-black text-violet-400 uppercase tracking-widest">INSIGHT</h4>
              </div>
              <p className="text-[10px] leading-relaxed text-muted-foreground">
                Bloom filters significantly reduce P99 latency by avoiding unnecessary disk I/O for non-existent keys.
              </p>
            </div>
          </section>
        </aside>

        {/* Main Area: Visualiser */}
        <main className="flex-1 p-12 flex flex-col items-center justify-center relative overflow-hidden bg-muted/10">
          {/* Grid Background for Center Area */}
          <div className="absolute inset-0 opacity-[0.2] dark:opacity-50 pointer-events-none bg-[linear-gradient(rgba(139,92,246,0.3)_1px,transparent_1px),linear-gradient(90deg,rgba(139,92,246,0.3)_1px,transparent_1px)] bg-[size:50px_50px]" />
          
          <div className="w-full max-w-lg relative z-10 space-y-3">
            <AnimatePresence mode="popLayout">
              {steps.filter(s => !s.id.startsWith('sstable_')).map((step, idx) => {
                const stepIndexInFull = steps.findIndex(s => s.id === step.id);
                const isActive = currentStepIndex === stepIndexInFull;
                const isHit = step.status === 'hit';
                const isMiss = step.status === 'miss';
                const isCompleted = step.status === 'completed';

                return (
                  <motion.div
                    key={step.id}
                    layout
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-3"
                  >
                    <motion.div
                      layout
                      animate={{ 
                        scale: isActive ? 1.02 : 1,
                      }}
                      className={`group p-4 rounded-2xl border-2 transition-all duration-500 relative overflow-hidden backdrop-blur-sm ${
                        isActive ? 'border-violet-500 bg-violet-500/10 shadow-[0_0_30px_rgba(139,92,246,0.2)] z-20' : 
                        isHit ? 'border-emerald-500/40 bg-emerald-500/5' :
                        isMiss ? 'border-red-500/40 bg-red-500/5' :
                        isCompleted ? 'border-violet-500/20 bg-violet-500/5' :
                        'border-border bg-card/50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-500 ${
                            isActive ? 'bg-violet-500 text-white shadow-[0_0_15px_rgba(139,92,246,0.5)]' : 
                            isHit ? 'bg-emerald-500/20 text-emerald-500' :
                            isMiss ? 'bg-red-500/20 text-red-500' :
                            isCompleted ? 'bg-violet-500/20 text-violet-400' :
                            'bg-muted text-muted-foreground'
                          }`}>
                            {step.id === 'routing' ? <Route size={18} /> :
                             step.id === 'row_cache' ? <Gauge size={18} /> : 
                             step.id === 'block_cache' ? <Cpu size={18} /> : 
                             step.id === 'memtable' ? <Layers size={18} /> :
                             step.id === 'merge' ? <CheckCircle2 size={18} /> :
                             <HardDrive size={18} />}
                          </div>
                          <div>
                            <h4 className={`text-[11px] font-black uppercase tracking-widest transition-colors ${isActive ? 'text-violet-400' : 'text-foreground'}`}>
                              {step.title}
                            </h4>
                            <p className="text-[9px] text-muted-foreground font-bold uppercase tracking-tighter opacity-60 mt-0.5">
                              {step.description}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          {isHit && (
                            <div className="flex items-center gap-1.5 px-2 py-1 bg-emerald-500/20 rounded-lg">
                              <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                              <span className="text-[8px] font-black text-emerald-500 uppercase">HIT</span>
                            </div>
                          )}
                          {isMiss && (
                            <div className="flex items-center gap-1.5 px-2 py-1 bg-red-500/20 rounded-lg">
                              <XCircle className="w-3 h-3 text-red-500" />
                              <span className="text-[8px] font-black text-red-500 uppercase">MISS</span>
                            </div>
                          )}
                          {isActive && (
                            <motion.div 
                              animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
                              transition={{ repeat: Infinity, duration: 1.5 }}
                              className="w-2 h-2 bg-violet-500 rounded-full shadow-[0_0_10px_rgba(139,92,246,1)]" 
                            />
                          )}
                        </div>
                      </div>
                    </motion.div>

                    {/* Inject Storage Layer after Memtable */}
                    {step.id === 'memtable' && (
                      <motion.div
                        layout
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="p-4 rounded-2xl border-2 border-border bg-card/30 backdrop-blur-sm space-y-4"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center text-muted-foreground">
                            <HardDrive size={16} />
                          </div>
                          <h4 className="text-[10px] font-black uppercase tracking-widest text-foreground/80">Storage Layer (SSTables)</h4>
                        </div>
                        
                        <div className="flex gap-2">
                          {steps.filter(s => s.id.startsWith('sstable_')).map((ssStep) => {
                            const ssIdx = steps.findIndex(s => s.id === ssStep.id);
                            const isSSActive = currentStepIndex === ssIdx;
                            const isSSHit = ssStep.status === 'hit';
                            const isSSMiss = ssStep.status === 'miss';
                            const isSSSkipped = ssStep.status === 'skipped';

                            return (
                              <div 
                                key={ssStep.id}
                                className={`flex-1 p-2 rounded-xl border-2 transition-all duration-300 flex flex-col items-center gap-1.5 ${
                                  isSSActive ? 'border-violet-500 bg-violet-500/10 shadow-[0_0_15px_rgba(139,92,246,0.2)]' :
                                  isSSHit ? 'border-emerald-500/40 bg-emerald-500/10' :
                                  isSSMiss ? 'border-red-500/40 bg-red-500/10' :
                                  isSSSkipped ? 'border-border/20 bg-muted/10 opacity-40' :
                                  'border-border bg-muted/20'
                                }`}
                              >
                                <span className="text-[8px] font-black uppercase tracking-tighter opacity-60">SS_{ssStep.id.split('_')[1]}</span>
                                <div className="h-4 flex items-center justify-center">
                                  {isSSActive ? (
                                    <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity }} className="w-1.5 h-1.5 bg-violet-500 rounded-full" />
                                  ) : isSSHit ? (
                                    <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                                  ) : isSSMiss ? (
                                    <XCircle className="w-3 h-3 text-red-500" />
                                  ) : isSSSkipped ? (
                                    <XCircle className="w-3 h-3 text-muted-foreground/40" />
                                  ) : (
                                    <div className="w-1.5 h-1.5 bg-border rounded-full" />
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </motion.div>
                    )}
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </main>

        {/* Right Panel: Analytics */}
        <aside className="w-80 border-l border-border bg-card/30 backdrop-blur-sm p-8 flex flex-col gap-8 overflow-hidden">
          <section className="space-y-6">
            <h3 className="text-[11px] font-black mb-3 opacity-80 uppercase tracking-[0.2em] text-foreground/80">Performance</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="px-5 pb-5 pt-3 bg-card border border-border rounded-2xl shadow-sm">
                <div className="mb-2 opacity-60">
                  <span className="text-[8px] font-black uppercase tracking-widest">Total Latency</span>
                </div>
                <p className="text-xl font-black text-foreground tabular-nums leading-none">
                  {metrics.totalBatchLatency.toFixed(1)}
                  <span className="text-[10px] text-violet-500 ml-1 font-black">MS</span>
                </p>
              </div>
              <div className="px-5 pb-5 pt-3 bg-card border border-border rounded-2xl shadow-sm">
                <div className="mb-2 opacity-60">
                  <span className="text-[8px] font-black uppercase tracking-widest">Disk Seeks</span>
                </div>
                <p className="text-xl font-black text-foreground tabular-nums leading-none">
                  {metrics.diskSeeks}
                  <span className="text-[10px] text-violet-500 ml-1 font-black">I/O</span>
                </p>
              </div>
            </div>
          </section>

          <section className="flex-1 flex flex-col min-h-0 space-y-6">
              <h3 className="text-[11px] mb-3 opacity-80 font-black uppercase tracking-[0.2em] text-foreground/80">Query Log</h3>
            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-3 overflow-x-hidden">
              <AnimatePresence initial={false}>
                {results.length > 0 ? (
                  results.map((res, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="p-4 bg-card border border-border rounded-xl flex flex-col gap-3"
                    >
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <Terminal className="w-3 h-3 text-violet-500 opacity-60" />
                          <span className="text-[10px] font-black text-foreground">{res.key}</span>
                        </div>
                        <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full ${
                          res.status === 'hit' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-red-500/10 text-red-500 border border-red-500/20'
                        }`}>
                          {res.status}
                        </span>
                      </div>
                      <div className="flex justify-between items-baseline">
                        <span className="text-[9px] font-bold text-muted-foreground italic">{res.foundAt}</span>
                        <div className="text-right">
                          <span className="text-[11px] text-violet-500 font-black tabular-nums">{res.latency.toFixed(1)}ms</span>
                        </div>
                      </div>
                    </motion.div>
                  ))
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 opacity-20">
                    <Terminal className="w-8 h-8 mb-3" />
                    <p className="text-[10px] font-black uppercase tracking-[0.2em]">Awaiting Execution</p>
                  </div>
                )}
              </AnimatePresence>
            </div>
          </section>

          <section className="mt-auto space-y-3 pt-4 border-t border-border/50">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black text-foreground uppercase tracking-widest">Batch Progress</span>
              <span className="text-[10px] font-bold text-violet-500 tabular-nums">
                {Math.round((metrics.completedQueries / queries.length) * 100)}%
              </span>
            </div>
            <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden border border-border">
              <motion.div 
                className="bg-violet-500 h-full shadow-[0_0_10px_rgba(139,92,246,0.5)]"
                initial={{ width: 0 }}
                animate={{ width: `${(metrics.completedQueries / queries.length) * 100}%` }}
              />
            </div>
          </section>
        </aside>
      </div>
      
      <style dangerouslySetInnerHTML={{ __html: `
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: var(--border); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: var(--muted-foreground); }
      `}} />
    </div>
  );
};

export default BigtableReadPath;
