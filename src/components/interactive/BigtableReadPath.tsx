import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, Database, Layers, Zap, Clock, HardDrive, 
  CheckCircle2, XCircle, Info, Settings2, Play, 
  RotateCcw, FileText
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

  const queries = ['user_123', 'user_456', 'user_789', 'user_999'];
  const ANIMATION_SPEED = 250; // Snappy animations

  const initSimulation = useCallback(() => {
    const newSteps: Step[] = [
      { id: 'routing', title: 'Request Routing', description: 'Locating tablet server via metadata service...', status: 'pending', latency: 0.2 },
      { id: 'row_cache', title: 'Row Cache', description: 'Checking in-memory row cache...', status: 'pending', latency: 0.1 },
      { id: 'block_cache', title: 'Block Cache', description: 'Checking cached SSTable blocks...', status: 'pending', latency: 0.1 },
      { id: 'memtable', title: 'Memtable', description: 'Searching active memtable...', status: 'pending', latency: 0.5 },
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

    newSteps.push({ id: 'merge', title: 'Merge & Return', description: 'Merging results from all layers...', status: 'pending', latency: 0.1 });
    
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
    setResults([]);
    setMetrics({ totalBatchLatency: 0, currentQueryLatency: 0, diskSeeks: 0, completedQueries: 0 });

    let totalBatchTime = 0;
    let totalSeeks = 0;

    for (let qIdx = 0; qIdx < queries.length; qIdx++) {
      const rowKey = queries[qIdx];
      let currentQueryTime = 0;
      let found = false;
      let foundAt = 'Not Found';
      let currentSeeks = 0;

      // Reset steps for new query
      setSteps(prev => prev.map(s => ({ ...s, status: 'pending' })));
      setCurrentStepIndex(-1);
      await new Promise(r => setTimeout(r, ANIMATION_SPEED));

      // 1. Routing
      setCurrentStepIndex(0);
      await new Promise(r => setTimeout(r, ANIMATION_SPEED));
      updateStep(0, 'completed', 0.2);
      currentQueryTime += 0.2;

      // 2. Row Cache
      setCurrentStepIndex(1);
      await new Promise(r => setTimeout(r, ANIMATION_SPEED));
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

    setIsSimulating(false);
    setCurrentStepIndex(-1);
  };

  const [activeTab, setActiveTab] = useState<'config' | 'viz' | 'results'>('viz');

  return (
    <div className="w-[1200px] mx-auto bg-card border border-border shadow-2xl flex flex-col relative overflow-hidden rounded-lg font-mono selection:bg-primary/30 text-foreground transition-colors h-[850px]">
      {/* Header */}
      <header className="flex flex-row items-center justify-between px-6 py-4 border-b border-border bg-muted/50 shrink-0 gap-4">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            <Database className="w-5 h-5 text-primary" />
            <h1 className="text-[15px] font-black uppercase tracking-[0.25em] text-foreground">BIGTABLE_READ_PATH_V1</h1>
          </div>
          
          <div className="hidden lg:flex items-center gap-4 px-3 py-1.5 bg-background border border-border rounded-sm">
            <div className="flex flex-col">
              <span className="text-[8px] font-bold uppercase tracking-widest text-muted-foreground">System_Status</span>
              <span className="text-[10px] font-black text-primary uppercase tracking-widest">
                {isSimulating ? 'SIMULATING' : 'IDLE'}
              </span>
            </div>
            <div className="h-4 w-[1px] bg-border" />
            <div className="flex flex-col">
              <span className="text-[8px] font-bold uppercase tracking-widest text-muted-foreground">Queries</span>
              <span className="text-[10px] font-black text-foreground tabular-nums">
                {metrics.completedQueries} / {queries.length}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={runBatchSimulation}
            disabled={isSimulating}
            className={`flex items-center justify-center gap-2 px-4 py-2 rounded-sm font-bold text-[11px] uppercase transition-all border ${
              isSimulating 
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-500 hover:bg-amber-500/20' 
                : 'bg-primary border-primary/30 text-primary-foreground hover:bg-primary/90 shadow-[0_0_10px_rgba(var(--primary-rgb),0.2)]'
            }`}
          >
            {isSimulating ? <RotateCcw className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3 fill-current" />}
            {isSimulating ? 'simulating...' : 'run_batch'}
          </button>
          <button 
            onClick={initSimulation}
            disabled={isSimulating}
            className="flex items-center justify-center p-2 bg-muted hover:bg-muted/80 text-foreground rounded-sm transition-all border border-border"
            title="Reset"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </header>

      <div className="flex flex-1 flex-row overflow-hidden">
        {/* Left Panel: Config */}
        <aside className="w-80 border-r border-border bg-muted/30 p-6 flex flex-col gap-8 shrink-0 relative z-20">
          <section className="space-y-4">
            <div className="flex items-center gap-2 opacity-60">
              <Settings2 className="w-4 h-4 text-primary" />
              <h3 className="text-[10px] font-bold uppercase tracking-[0.15em]">Parameters</h3>
            </div>
            
            <div className="space-y-6">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                    Bloom Filters 
                    <div className="group relative inline-block">
                      <Info size={12} className="text-primary/50 cursor-help" />
                      <div className="absolute left-full ml-4 top-1/2 -translate-y-1/2 w-64 p-3 bg-card border border-border rounded text-[10px] text-muted-foreground opacity-0 group-hover:opacity-100 transition-all pointer-events-none z-[100] shadow-2xl">
                        Probabilistic data structure that tells if a key is definitely NOT in an SSTable, avoiding disk seeks.
                      </div>
                    </div>
                  </span>
                  <button 
                    onClick={() => setBloomEnabled(!bloomEnabled)}
                    disabled={isSimulating}
                    className={`w-10 h-5 rounded-full relative transition-colors ${bloomEnabled ? 'bg-primary' : 'bg-muted'}`}
                  >
                    <div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-all ${bloomEnabled ? 'left-6' : 'left-1'}`} />
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                    Warm Cache 
                    <div className="group relative inline-block">
                      <Info size={12} className="text-primary/50 cursor-help" />
                      <div className="absolute left-full ml-4 top-1/2 -translate-y-1/2 w-64 p-3 bg-card border border-border rounded text-[10px] text-muted-foreground opacity-0 group-hover:opacity-100 transition-all pointer-events-none z-[100] shadow-2xl">
                        Simulates data already residing in memory (Row & Block caches).
                      </div>
                    </div>
                  </span>
                  <button 
                    onClick={() => setCacheWarm(!cacheWarm)}
                    disabled={isSimulating}
                    className={`w-10 h-5 rounded-full relative transition-colors ${cacheWarm ? 'bg-primary' : 'bg-muted'}`}
                  >
                    <div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-all ${cacheWarm ? 'left-6' : 'left-1'}`} />
                  </button>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                      SSTables 
                      <div className="group relative inline-block">
                        <Info size={12} className="text-primary/50 cursor-help" />
                        <div className="absolute left-full ml-4 top-1/2 -translate-y-1/2 w-64 p-3 bg-card border border-border rounded text-[10px] text-muted-foreground opacity-0 group-hover:opacity-100 transition-all pointer-events-none z-[100] shadow-2xl">
                          Number of immutable on-disk files. More files increase lookup complexity without Bloom filters.
                        </div>
                      </div>
                    </span>
                    <span className="text-[10px] font-mono text-primary font-bold">{sstableCount}</span>
                  </div>
                  <input 
                    type="range" min="1" max="5" value={sstableCount} 
                    onChange={(e) => setSstableCount(parseInt(e.target.value))}
                    disabled={isSimulating}
                    className="w-full h-1 bg-muted rounded-lg appearance-none cursor-pointer accent-primary disabled:opacity-50"
                    style={{
                      background: `linear-gradient(to right, var(--primary) 0%, var(--primary) ${(sstableCount - 1) / 4 * 100}%, var(--muted) ${(sstableCount - 1) / 4 * 100}%, var(--muted) 100%)`
                    }}
                  />
                </div>
              </div>
            </div>
          </section>

          <section className="mt-auto space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-primary" />
                  <span className="text-[10px] font-bold text-foreground uppercase tracking-widest">Progress</span>
                </div>
                <span className="text-[10px] font-mono text-muted-foreground font-bold tabular-nums">
                  {metrics.completedQueries} / {queries.length}
                </span>
              </div>
              <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden border border-border">
                <motion.div 
                  className="bg-primary h-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${(metrics.completedQueries / queries.length) * 100}%` }}
                />
              </div>
            </div>
          </section>
        </aside>

        {/* Main Area: Visualizer */}
        <main className="flex-1 p-8 flex flex-col items-center justify-center relative overflow-hidden bg-background/50">
          <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[linear-gradient(currentColor_1px,transparent_1px),linear-gradient(90deg,currentColor_1px,transparent_1px)] bg-[size:40px_40px] z-0" />
          
          <div className="w-full max-w-md space-y-3 relative z-10">
            <AnimatePresence mode="popLayout">
              {steps.map((step, idx) => {
                const isActive = currentStepIndex === idx;
                const isHit = step.status === 'hit';
                const isMiss = step.status === 'miss';
                const isSkipped = step.status === 'skipped';

                return (
                  <motion.div
                    key={step.id}
                    layout
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ 
                      opacity: 1, 
                      scale: isActive ? 1.02 : 1,
                      borderColor: isActive ? 'var(--primary)' : isHit ? '#10b981' : isMiss ? '#ef4444' : 'var(--border)'
                    }}
                    className={`p-3 rounded-sm border transition-all duration-300 relative overflow-hidden ${
                      isActive ? 'bg-primary/10 shadow-[0_0_20px_rgba(242,125,38,0.1)]' : 
                      isHit ? 'bg-emerald-500/10 border-emerald-500/30' :
                      isMiss ? 'bg-red-500/10 border-red-500/30' :
                      isSkipped ? 'bg-red-500/5 border-red-500/10 opacity-40' :
                      'bg-card'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`p-1.5 rounded-sm ${isActive ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                          {step.id === 'routing' ? <Search size={14} /> :
                           step.id === 'row_cache' ? <Zap size={14} /> : 
                           step.id === 'block_cache' ? <Zap size={14} /> : 
                           step.id === 'memtable' ? <Layers size={14} /> :
                           step.id === 'merge' ? <CheckCircle2 size={14} /> :
                           <Database size={14} />}
                        </div>
                        <div>
                          <h4 className={`text-[10px] font-black uppercase tracking-widest ${isActive ? 'text-primary' : 'text-foreground'}`}>
                            {step.title}
                          </h4>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {isHit && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                        {isMiss && <XCircle className="w-4 h-4 text-red-500" />}
                        {isSkipped && <XCircle className="w-4 h-4 text-red-500/50" />}
                        {isActive && <div className="w-1.5 h-1.5 bg-primary rounded-full animate-ping" />}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </main>

        {/* Right Panel: Results & Metrics */}
        <aside className="w-80 border-l border-border bg-muted/30 p-6 flex flex-col gap-6 overflow-y-auto custom-scrollbar shrink-0">
          <section className="space-y-4">
            <div className="flex items-center gap-2 opacity-60">
              <Clock className="w-4 h-4 text-primary" />
              <h3 className="text-[10px] font-bold uppercase tracking-[0.15em]">Metrics</h3>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-card border border-border rounded-sm">
                <p className="text-[8px] font-bold text-muted-foreground uppercase mb-1">Total Time</p>
                <p className="text-lg font-black text-foreground tabular-nums">{metrics.totalBatchLatency.toFixed(1)}<span className="text-[9px] text-primary ml-1">ms</span></p>
              </div>
              <div className="p-3 bg-card border border-border rounded-sm">
                <p className="text-[8px] font-bold text-muted-foreground uppercase mb-1">Disk Seeks</p>
                <p className="text-lg font-black text-foreground tabular-nums">{metrics.diskSeeks}</p>
              </div>
            </div>
          </section>

          <section className="flex-grow flex flex-col min-h-0 space-y-4">
            <div className="flex items-center gap-2 opacity-60">
              <FileText className="w-4 h-4 text-primary" />
              <h3 className="text-[10px] font-bold uppercase tracking-[0.15em]">Query Results</h3>
            </div>
            <div className="flex-grow overflow-y-auto pr-2 custom-scrollbar space-y-2">
              {results.length > 0 ? (
                results.map((res, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="p-3 bg-card border border-border rounded-sm flex flex-col gap-1"
                  >
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-mono text-foreground font-bold">{res.key}</span>
                      <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded-sm ${
                        res.status === 'hit' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
                      }`}>
                        {res.status}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-[9px]">
                      <span className="text-muted-foreground italic">{res.foundAt}</span>
                      <span className="text-primary font-mono font-bold tabular-nums">{res.latency.toFixed(1)}ms</span>
                    </div>
                  </motion.div>
                ))
              ) : (
                <p className="text-[10px] text-muted-foreground italic uppercase tracking-widest text-center py-8 opacity-40">Awaiting results...</p>
              )}
            </div>
          </section>

          {!isSimulating && results.length === queries.length && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="p-4 bg-primary/10 border border-primary/30 rounded-sm text-center"
            >
              <h4 className="text-[10px] font-black text-primary uppercase mb-1">Batch Complete</h4>
              <p className="text-[11px] text-muted-foreground">
                Processed {queries.length} queries in <span className="font-bold text-foreground">{metrics.totalBatchLatency.toFixed(1)}ms</span>
              </p>
            </motion.div>
          )}

          <section className="space-y-4">
            <div className="p-4 bg-primary/5 border border-border rounded-sm">
              <h4 className="text-[10px] font-black text-foreground uppercase tracking-widest mb-2">Insight</h4>
              <p className="text-[9px] text-muted-foreground leading-relaxed italic">
                A "Miss" is expensive when Bloom filters are off because the system must scan every SSTable index. <span className="text-primary">Bloom filters</span> allow skipping disk entirely for non-existent keys.
              </p>
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
