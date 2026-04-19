import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  DndContext, 
  DragOverlay, 
  useSensor, 
  useSensors, 
  PointerSensor, 
  DragStartEvent, 
  DragEndEvent,
  TouchSensor
} from '@dnd-kit/core';
import { 
  Play, 
  RotateCcw, 
  Activity, 
  Share2, 
  Clock,
  CheckCircle2,
  Box,
  Database,
  Filter,
  Crown
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { Task, Worker, Phase, SimulationMetrics, TaskId, WorkerId, BlockId } from './types';
import { 
  WORKER_COUNT, 
  MAP_TASK_COUNT, 
  REDUCE_TASK_COUNT, 
  BASE_TASK_DURATION, 
  REMOTE_DATA_PENALTY, 
  STRAGGLER_PROBABILITY, 
  STRAGGLER_PENALTY, 
  TICK_RATE, 
  NETWORK_COST_REMOTE, 
  NETWORK_COST_LOCAL, 
  SHUFFLE_COST_PER_REDUCER 
} from './constants';
import { cn } from '../../lib/utils';
import { WorkerNode } from './WorkerNode';
import { TaskCard } from './TaskCard';
import { ShuffleView } from './ShuffleView';

// --- Main Component ---

export const MapReduceScheduler: React.FC = () => {
  // --- State ---
  const [isRunning, setIsRunning] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [isAutoMode, setIsAutoMode] = useState(false);
  const [phase, setPhase] = useState<Phase>('map');
  const [currentTime, setCurrentTime] = useState(0);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [lastAction, setLastAction] = useState<string | null>(null);
  const [history, setHistory] = useState<{ time: number; completion: number }[]>([]);
  const [autoTime, setAutoTime] = useState<number | null>(null);
  const [userTime, setUserTime] = useState<number | null>(null);
  const [isShuffleComplete, setIsShuffleComplete] = useState(false);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const actionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const shuffleTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // --- Action Feedback ---
  const triggerAction = useCallback((message: string) => {
    setLastAction(message);
    if (actionTimeoutRef.current) clearTimeout(actionTimeoutRef.current);
    actionTimeoutRef.current = setTimeout(() => {
      setLastAction(null);
    }, 3000);
  }, []);

  // --- Initialisation ---
  const initSimulation = useCallback(() => {
    // Create workers
    const newWorkers: Worker[] = Array.from({ length: WORKER_COUNT }).map((_, i) => ({
      id: `W${i + 1}`,
      speed: 0.8 + Math.random() * 0.4, // 0.8 to 1.2
      localDataBlocks: new Set(),
      currentTaskId: null,
      status: 'idle',
      totalActiveTime: 0,
      totalIdleTime: 0
    }));

    // Distribute data blocks (3 blocks per worker)
    const allBlocks: BlockId[] = Array.from({ length: MAP_TASK_COUNT }).map((_, i) => `B${i + 1}`);
    allBlocks.forEach((blockId, i) => {
      const workerIndex = i % WORKER_COUNT;
      newWorkers[workerIndex].localDataBlocks.add(blockId);
    });

    // Create tasks
    const mapTasks: Task[] = Array.from({ length: MAP_TASK_COUNT }).map((_, i) => ({
      id: `M${i + 1}`,
      type: 'map',
      dataBlockId: `B${i + 1}`,
      progress: 0,
      status: 'pending'
    }));

    const reduceTasks: Task[] = Array.from({ length: REDUCE_TASK_COUNT }).map((_, i) => ({
      id: `R${i + 1}`,
      type: 'reduce',
      progress: 0,
      status: 'pending'
    }));

    setWorkers(newWorkers);
    setTasks([...mapTasks, ...reduceTasks]);
    setPhase('map');
    setCurrentTime(0);
    setIsRunning(false);
    setHasStarted(false);
    setIsShuffleComplete(false);
    setHistory([{ time: 0, completion: 0 }]);
    if (shuffleTimeoutRef.current) clearTimeout(shuffleTimeoutRef.current);
    triggerAction('System Initialised');
  }, [triggerAction]);

  useEffect(() => {
    initSimulation();
  }, [initSimulation]);

  // --- Simulation Logic ---
  const tick = useCallback(() => {
    setCurrentTime(prevTime => {
      const nextTime = prevTime + TICK_RATE;
      
      setTasks(prevTasks => {
        const updatedTasks = [...prevTasks];
        let anyTaskUpdated = false;
        const workersToFree = new Set<WorkerId>();
        const actions: string[] = [];

        // 1. Update progress for all running tasks
        updatedTasks.forEach((task, idx) => {
          if (task.status === 'running' && task.assignedWorkerId) {
            const worker = workers.find(w => w.id === task.assignedWorkerId);
            if (worker) {
              let speedMultiplier = worker.speed;
              if (task.type === 'map' && task.dataBlockId) {
                if (!worker.localDataBlocks.has(task.dataBlockId)) speedMultiplier /= REMOTE_DATA_PENALTY;
              }
              if (task.isStraggler) speedMultiplier /= STRAGGLER_PENALTY;

              const increment = (TICK_RATE / BASE_TASK_DURATION) * speedMultiplier;
              const newProgress = Math.min(1, task.progress + increment);
              
              if (newProgress !== task.progress) {
                updatedTasks[idx] = { ...task, progress: newProgress };
                anyTaskUpdated = true;
                
                if (newProgress >= 1) {
                  updatedTasks[idx].status = 'complete';
                  workersToFree.add(worker.id);
                  actions.push(`Task ${task.id} Complete`);
                  
                  // Handle speculative/related tasks
                  const baseId = task.originalTaskId || task.id;
                  updatedTasks.forEach((t, tIdx) => {
                    if ((t.id === baseId || t.originalTaskId === baseId) && t.status !== 'complete') {
                      updatedTasks[tIdx] = { ...t, status: 'complete', progress: 1 };
                      if (t.assignedWorkerId) workersToFree.add(t.assignedWorkerId);
                      anyTaskUpdated = true;
                    }
                  });
                }
              }
            }
          }
        });

        // 2. Safety Check: Free any worker whose task is already complete
        workers.forEach(w => {
          if (w.currentTaskId) {
            const t = updatedTasks.find(task => task.id === w.currentTaskId);
            if (t && t.status === 'complete') {
              workersToFree.add(w.id);
            }
          }
        });

        // 3. Sync workers
        if (workersToFree.size > 0) {
          setWorkers(prev => prev.map(w => workersToFree.has(w.id) ? { ...w, currentTaskId: null, status: 'idle' } : w));
        }
        
        // 4. Trigger actions
        actions.forEach(a => triggerAction(a));

        // 5. Update history (if tasks changed)
        if (anyTaskUpdated) {
          const completedCount = updatedTasks.filter(t => t.status === 'complete' && !t.isSpeculative).length;
          const totalCount = updatedTasks.filter(t => !t.isSpeculative).length;
          const completionPercent = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;
          
          setHistory(prev => {
            const last = prev[prev.length - 1];
            if (!last || last.completion !== completionPercent) {
              return [...prev, { time: nextTime / 1000, completion: completionPercent }];
            }
            return prev;
          });
        }

        // 6. Phase Transitions
        const mapTasks = updatedTasks.filter(t => t.type === 'map' && !t.isSpeculative);
        const allMapsComplete = mapTasks.every(t => t.status === 'complete');
        
        if (phase === 'map' && allMapsComplete) {
          setPhase('shuffle');
          triggerAction('Map Phase Complete');
          setWorkers(prev => prev.map(w => ({ ...w, currentTaskId: null, status: 'idle' })));
          if (isAutoMode) {
            if (shuffleTimeoutRef.current) clearTimeout(shuffleTimeoutRef.current);
            shuffleTimeoutRef.current = setTimeout(() => {
              setIsShuffleComplete(true);
              setPhase('reduce');
              triggerAction('Entering Reduce Phase');
            }, 4000);
          }
        }
        
        const reduceTasks = updatedTasks.filter(t => t.type === 'reduce' && !t.isSpeculative);
        const allReducesComplete = reduceTasks.every(t => t.status === 'complete');
        if (phase === 'reduce' && allReducesComplete) {
          setPhase('complete');
          setIsRunning(false);
          triggerAction('Job Complete!');
          if (isAutoMode) setAutoTime(nextTime / 1000);
          else setUserTime(nextTime / 1000);
        }

        return anyTaskUpdated ? updatedTasks : prevTasks;
      });

      return nextTime;
    });
  }, [phase, workers, isAutoMode, triggerAction]);

  useEffect(() => {
    if (isRunning) {
      timerRef.current = setInterval(tick, TICK_RATE);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRunning, tick]);

  // --- Auto-Scheduler ---
  useEffect(() => {
    if (isAutoMode && isRunning) {
      const autoSchedule = () => {
        if (phase === 'shuffle' || (phase === 'reduce' && !isShuffleComplete)) return;
        
        const idleWorkers = workers.filter(w => w.status === 'idle');
        if (idleWorkers.length === 0) return;

        const assignedInThisTick = new Set<TaskId>();

        idleWorkers.forEach(worker => {
          // Priorities:
          // 1. Local + Already Executing
          // 2. Local + Not Executing
          // 3. Remote + Already Executing (Straggling)
          // 4. Remote + Not Executing
          // 5. Remote + Already Executing (Not Straggling)

          const getBestTask = () => {
            // Priority 1: Local + Already Executing
            if (phase === 'map') {
              const p1 = tasks.find(t => 
                t.status === 'running' && 
                t.type === 'map' && 
                t.dataBlockId && 
                worker.localDataBlocks.has(t.dataBlockId) && 
                !tasks.some(st => st.originalTaskId === t.id) &&
                !assignedInThisTick.has(t.id)
              );
              if (p1) return p1;
            }

            // Priority 2: Local + Not Executing
            if (phase === 'map') {
              const p2 = tasks.find(t => 
                t.status === 'pending' && 
                t.type === 'map' && 
                t.dataBlockId && 
                worker.localDataBlocks.has(t.dataBlockId) &&
                !assignedInThisTick.has(t.id)
              );
              if (p2) return p2;
            }

            // Priority 3: Remote + Already Executing (Straggling)
            const p3 = tasks.find(t => 
              t.status === 'running' && 
              (phase === 'map' ? t.type === 'map' : t.type === 'reduce') && 
              t.isStraggler && 
              !tasks.some(st => st.originalTaskId === t.id) &&
              !assignedInThisTick.has(t.id)
            );
            if (p3) return p3;

            // Priority 4: Remote + Not Executing
            const p4 = tasks.find(t => 
              t.status === 'pending' && 
              (phase === 'map' ? t.type === 'map' : t.type === 'reduce') &&
              !assignedInThisTick.has(t.id)
            );
            if (p4) return p4;

            // Priority 5: Remote + Already Executing (Not Straggling)
            const p5 = tasks.find(t => 
              t.status === 'running' && 
              (phase === 'map' ? t.type === 'map' : t.type === 'reduce') && 
              !t.isStraggler && 
              !tasks.some(st => st.originalTaskId === t.id) &&
              !assignedInThisTick.has(t.id)
            );
            if (p5) return p5;

            return null;
          };

          const bestTask = getBestTask();
          if (bestTask) {
            assignedInThisTick.add(bestTask.id);
            assignTask(bestTask.id, worker.id);
          }
        });
      };

      // Run immediately and then on interval
      autoSchedule();
      const interval = setInterval(autoSchedule, 200); // More frequent for "immediate" feel
      return () => clearInterval(interval);
    }
  }, [isAutoMode, isRunning, workers, tasks, phase, isShuffleComplete]);

  // --- Handlers ---
  const assignTask = (taskId: TaskId, workerId: WorkerId) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    const isStraggler = Math.random() < STRAGGLER_PROBABILITY;

    if (task.status === 'pending') {
      // Normal assignment
      setTasks(prevTasks => prevTasks.map(t => 
        t.id === taskId ? { ...t, status: 'running', assignedWorkerId: workerId, isStraggler } : t
      ));
      setWorkers(prevWorkers => prevWorkers.map(w => 
        w.id === workerId ? { ...w, currentTaskId: taskId, status: 'busy' } : w
      ));
      triggerAction(`Assigned ${taskId} to ${workerId}${isStraggler ? ' (STRAGGLER!)' : ''}`);
    } else if (task.status === 'running') {
      // Speculative assignment
      const baseId = task.originalTaskId || task.id;
      const specTaskId = `${baseId}_SPEC_${workerId}`;
      const specTask: Task = {
        ...task,
        id: specTaskId,
        progress: 0,
        isSpeculative: true,
        isStraggler,
        originalTaskId: baseId,
        status: 'running',
        assignedWorkerId: workerId
      };
      setTasks(prev => [...prev, specTask]);
      setWorkers(prev => prev.map(w => w.id === workerId ? { ...w, currentTaskId: specTaskId, status: 'busy' } : w));
      triggerAction(`Speculative: ${taskId} on ${workerId}${isStraggler ? ' (STRAGGLER!)' : ''}`);
    }
  };

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 250,
        tolerance: 5,
      },
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (over && over.id.toString().startsWith('worker-')) {
      if (!hasStarted) {
        triggerAction('Start the job first!');
        return;
      }
      const workerId = over.data.current?.workerId;
      const taskId = active.id.toString();
      
      const worker = workers.find(w => w.id === workerId);
      const task = tasks.find(t => t.id === taskId);

      if (worker && task && worker.status === 'idle' && task.status !== 'complete') {
        // Check if task type matches phase
        if ((phase === 'map' && task.type === 'map') || (phase === 'reduce' && task.type === 'reduce')) {
          // Check if this task is already running on this worker
          if (task.assignedWorkerId === workerId || tasks.some(t => t.originalTaskId === taskId && t.assignedWorkerId === workerId)) {
            triggerAction(`Task ${taskId} already running on ${workerId}`);
            return;
          }
          assignTask(taskId, workerId);
        } else {
          triggerAction(`Cannot assign ${task.type} task in ${phase} phase`);
        }
      }
    }
  };

  // --- Metrics Calculation ---
  const metrics = useMemo((): SimulationMetrics => {
    const mapTasks = tasks.filter(t => t.type === 'map');
    const localMaps = mapTasks.filter(t => {
      if (t.status !== 'complete') return false;
      const worker = workers.find(w => w.id === t.assignedWorkerId);
      return worker?.localDataBlocks.has(t.dataBlockId!);
    });

    const dataLocalityPercent = mapTasks.length > 0 ? (localMaps.length / mapTasks.length) * 100 : 0;
    
    const networkCost = tasks.reduce((acc, t) => {
      if (t.status !== 'complete') return acc;
      if (t.type === 'map') {
        const worker = workers.find(w => w.id === t.assignedWorkerId);
        return acc + (worker?.localDataBlocks.has(t.dataBlockId!) ? NETWORK_COST_LOCAL : NETWORK_COST_REMOTE);
      }
      return acc + SHUFFLE_COST_PER_REDUCER;
    }, 0);

    return {
      jobCompletionTime: currentTime / 1000,
      workerUtilization: 0, // Placeholder
      dataLocalityPercent,
      networkCost,
      idleTime: 0 // Placeholder
    };
  }, [tasks, workers, currentTime]);

  const activeTask = activeId ? tasks.find(t => t.id === activeId) : null;

  // --- Network Line Positions ---
  const [workerPositions, setWorkerPositions] = useState<Record<string, { x: number; y: number }>>({});
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const updatePositions = () => {
      if (!containerRef.current) return;
      const containerRect = containerRef.current.getBoundingClientRect();
      const positions: Record<string, { x: number; y: number }> = {};
      
      workers.forEach(w => {
        const el = document.getElementById(`worker-${w.id}`);
        if (el) {
          const rect = el.getBoundingClientRect();
          positions[w.id] = {
            x: rect.left - containerRect.left + rect.width / 2,
            y: rect.top - containerRect.top + rect.height / 2
          };
        }
      });
      setWorkerPositions(positions);
    };

    updatePositions();
    const container = containerRef.current;
    if (container) {
      container.addEventListener('scroll', updatePositions);
    }
    window.addEventListener('resize', updatePositions);
    return () => {
      if (container) {
        container.removeEventListener('scroll', updatePositions);
      }
      window.removeEventListener('resize', updatePositions);
    };
  }, [workers]);

  return (
    <div className="w-[1200px] mx-auto bg-card border border-border shadow-2xl flex flex-col relative overflow-hidden rounded-lg font-mono selection:bg-violet-500/30 text-foreground transition-colors h-[850px]">
      {/* Header */}
      <header className="flex flex-row items-center justify-between px-6 py-4 border-b border-border bg-muted/50 shrink-0 gap-4">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            <Box className="w-5 h-5 text-violet-500" />
            <h1 className="text-[15px] font-black uppercase tracking-[0.25em] text-foreground">MapReduce_Scheduler_v1.4</h1>
          </div>
        </div>

        <div className="flex items-center gap-3 justify-end">
          <div className="flex items-center bg-background border border-border rounded-sm p-1">
            <button 
              disabled={isRunning}
              onClick={() => setIsAutoMode(false)}
              className={cn(
                "px-3 py-1 text-[10px] font-bold uppercase transition-all rounded-sm",
                !isAutoMode ? "bg-violet-500 text-white" : "text-muted-foreground hover:text-foreground",
                isRunning && "opacity-50 cursor-not-allowed"
              )}
            >
              Manual
            </button>
            <button 
              disabled={isRunning}
              onClick={() => setIsAutoMode(true)}
              className={cn(
                "px-3 py-1 text-[10px] font-bold uppercase transition-all rounded-sm",
                isAutoMode ? "bg-violet-500 text-white" : "text-muted-foreground hover:text-foreground",
                isRunning && "opacity-50 cursor-not-allowed"
              )}
            >
              Auto
            </button>
          </div>

          <div className="h-8 w-[1px] bg-border mx-1 block" />

          {!hasStarted ? (
            <button 
              onClick={() => {
                setIsRunning(true);
                setHasStarted(true);
                triggerAction('Simulation Started');
              }}
              className="flex items-center justify-center gap-2 px-6 py-2 rounded-sm font-bold text-[11px] uppercase transition-all bg-violet-500 border border-violet-500/30 text-white hover:bg-violet-500/90 shadow-[0_0_10px_rgba(var(--violet-500-rgb),0.2)] flex-none"
            >
              <Play className="w-3 h-3 fill-current" />
              Start
            </button>
          ) : (
            <button 
              onClick={initSimulation}
              className="flex items-center justify-center gap-2 px-6 py-2 rounded-sm font-bold text-[11px] uppercase transition-all bg-violet-500/10 border border-violet-500/30 text-violet-500 hover:bg-violet-500/20 flex-none"
            >
              <RotateCcw className="w-3 h-3" />
              Reset
            </button>
          )}
        </div>
      </header>

      <DndContext 
        sensors={sensors} 
        onDragStart={handleDragStart} 
        onDragEnd={handleDragEnd}
      >
        <div className="flex-auto flex flex-row overflow-hidden">
          {/* Left Panel: Controls & Info */}
          <aside className="w-72 border-r border-border bg-muted/30 py-4 px-6 flex flex-col self-stretch gap-6 overflow-y-auto custom-scrollbar shrink-0">
            {/* Desktop Job Status */}
            <section className="block space-y-3">
              <div className="flex items-center opacity-60">
                <h3 className="text-[10px] font-bold uppercase tracking-[0.15em]">Job Status</h3>
              </div>
              
              <div className="flex flex-col gap-2">
                {[
                  { id: 'map', label: 'Map Phase', icon: Database },
                  { id: 'shuffle', label: 'Shuffle & Sort', icon: Share2 },
                  { id: 'reduce', label: 'Reduce Phase', icon: Filter },
                  { id: 'complete', label: 'Job Complete', icon: CheckCircle2 }
                ].map((p, idx) => {
                  const isCurrent = phase === p.id;
                  const isDone = idx < ['map', 'shuffle', 'reduce', 'complete'].indexOf(phase);
                  const isJobComplete = phase === 'complete' && p.id === 'complete';
                  const Icon = p.icon;
                  
                  return (
                    <div 
                      key={p.id}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2 rounded-sm border transition-all",
                        isCurrent 
                          ? isJobComplete
                            ? "bg-emerald-500/10 border-emerald-500 text-emerald-500"
                            : "bg-violet-500/10 border-violet-500 text-violet-500 shadow-[0_0_10px_rgba(var(--violet-500-rgb),0.1)]" 
                          : isDone
                            ? "bg-emerald-500/5 border-emerald-500/20 text-emerald-500"
                            : "bg-background border-border text-muted-foreground opacity-40"
                      )}
                    >
                      <div className={cn(
                        "w-5 h-5 rounded-full flex items-center justify-center border",
                        isCurrent 
                          ? isJobComplete ? "border-emerald-500" : "border-violet-500" 
                          : isDone ? "border-emerald-500" : "border-border"
                      )}>
                        {isDone || isJobComplete ? <CheckCircle2 className="w-3 h-3" /> : <Icon className="w-3 h-3" />}
                      </div>
                      <span className="text-[9px] font-black uppercase tracking-widest">{p.label}</span>
                      {isCurrent && !isJobComplete && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-violet-500 animate-pulse" />}
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Comparison */}
            {(autoTime || userTime) && (
              <section className="space-y-3">
                <div className="flex items-center opacity-60">
                  <h3 className="text-[10px] font-bold uppercase tracking-[0.15em]">Comparison</h3>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between items-center bg-background/50 border border-border p-2 rounded-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-[8px] font-bold uppercase text-muted-foreground">Auto Scheduler</span>
                      {autoTime && (!userTime || autoTime <= userTime) && (
                        <Crown className="w-3 h-3 text-violet-500 fill-violet-500/20" />
                      )}
                    </div>
                    <span className="text-[10px] font-black text-violet-500">{autoTime ? `${autoTime.toFixed(1)}s` : '--'}</span>
                  </div>
                  <div className="flex justify-between items-center bg-background/50 border border-border p-2 rounded-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-[8px] font-bold uppercase text-muted-foreground">Your Time</span>
                      {userTime && autoTime && userTime < autoTime && (
                        <Crown className="w-3 h-3 text-violet-500 fill-violet-500/20" />
                      )}
                    </div>
                    <span className="text-[10px] font-black text-violet-500">{userTime ? `${userTime.toFixed(1)}s` : '--'}</span>
                  </div>
                </div>
              </section>
            )}

            {/* Progress Chart */}
            <section className="space-y-3">
              <div className="flex items-center justify-between opacity-60">
                <div className="flex items-center">
                  <h3 className="text-[10px] font-bold uppercase tracking-[0.15em]">Job Progress</h3>
                </div>
                <div className="flex items-center gap-1.5 bg-background border border-border px-2 py-0.5 rounded-sm">
                  <Clock className="w-3 h-3 text-violet-500" />
                  <span className="text-[10px] font-black tabular-nums">{(currentTime / 1000).toFixed(1)}s</span>
                </div>
              </div>
              <div className="bg-background/50 border border-border rounded-sm relative overflow-hidden aspect-[1.25] flex flex-col">
                {history.length < 2 ? (
                  <div className="flex-1 flex items-center justify-center">
                    <span className="text-[8px] font-bold uppercase text-muted-foreground tracking-widest animate-pulse">Awaiting Data...</span>
                  </div>
                ) : (
                  <div className="flex-1">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={history} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                        <XAxis 
                          dataKey="time" 
                          type="number"
                          domain={[0, 'dataMax']}
                          padding={{ left: 0, right: 0 }}
                          hide 
                        />
                        <YAxis 
                          domain={[0, 100]} 
                          hide 
                        />
                        <Tooltip 
                          contentStyle={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)', fontSize: '8px' }}
                          labelStyle={{ color: 'var(--muted-foreground)' }}
                          formatter={(value: number) => [`${value.toFixed(1)}%`, 'Completion']}
                          labelFormatter={(label: number) => `Time: ${label.toFixed(1)}s`}
                        />
                        <ReferenceLine 
                          y={100} 
                          stroke="#8b5cf6" 
                          strokeDasharray="3 3" 
                          label={{ value: '100%', position: 'insideTopLeft', fill: '#8b5cf6', fontSize: 7, fontWeight: 'bold' }} 
                        />
                        <Area 
                          type="monotone" 
                          dataKey="completion" 
                          stroke="#8b5cf6" 
                          fill="#8b5cf6" 
                          fillOpacity={0.1} 
                          isAnimationActive={false}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            </section>

            {/* Metrics */}
            <section className="pt-2 border-t border-border/50 space-y-2">
              <div className="flex justify-between items-center bg-background/50 border border-border p-2 rounded-sm">
                <span className="text-[8px] font-bold uppercase text-muted-foreground">Completion</span>
                <span className="text-[10px] font-black text-foreground">{Math.round((tasks.filter(t => t.status === 'complete' && !t.isSpeculative).length / (tasks.filter(t => !t.isSpeculative).length || 1)) * 100)}%</span>
              </div>
              <div className="flex justify-between items-center bg-background/50 border border-border p-2 rounded-sm">
                <span className="text-[8px] font-bold uppercase text-muted-foreground">Locality</span>
                <span className="text-[10px] font-black text-violet-500">{metrics.dataLocalityPercent.toFixed(0)}%</span>
              </div>
              <div className="flex justify-between items-center bg-background/50 border border-border p-2 rounded-sm">
                <span className="text-[8px] font-bold uppercase text-muted-foreground">Network</span>
                <span className="text-[10px] font-black text-violet-500">{metrics.networkCost}</span>
              </div>
            </section>
          </aside>

          {/* Main Area: Cluster Visualization */}
          <main className="flex-auto flex flex-col overflow-hidden relative bg-background/50">
            {/* Background Grid */}
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[linear-gradient(currentColor_1px,transparent_1px),linear-gradient(90deg,currentColor_1px,transparent_1px)] bg-[size:40px_40px] z-0" />
            
            {/* Network Lines Overlay */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none z-10 overflow-visible hidden lg:block">
              <AnimatePresence>
                {tasks.filter(t => t.status === 'running' && t.type === 'map' && t.dataBlockId).map(task => {
                  const sourceWorker = workers.find(w => w.localDataBlocks.has(task.dataBlockId!));
                  const targetWorker = workers.find(w => w.id === task.assignedWorkerId);
                  
                  if (!sourceWorker || !targetWorker || sourceWorker.id === targetWorker.id) return null;
                  
                  const start = workerPositions[sourceWorker.id];
                  const end = workerPositions[targetWorker.id];
                  
                  if (!start || !end) return null;

                  return (
                    <motion.g
                      key={`${task.id}-network`}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                    >
                      <line 
                        x1={start.x} y1={start.y} 
                        x2={end.x} y2={end.y} 
                        stroke="var(--violet-500)" 
                        strokeWidth="1" 
                        strokeDasharray="4 4"
                        className="opacity-20"
                      />
                      <motion.circle
                        r="3"
                        fill="var(--violet-500)"
                        initial={{ offsetDistance: "0%" }}
                        animate={{ offsetDistance: "100%" }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        style={{
                          offsetPath: `path('M ${start.x} ${start.y} L ${end.x} ${end.y}')`,
                          position: 'absolute'
                        }}
                      />
                    </motion.g>
                  );
                })}
              </AnimatePresence>
            </svg>

            <div ref={containerRef} className="flex-auto py-3 px-4 lg:py-4 lg:px-6 overflow-y-auto custom-scrollbar relative z-20">
              <div className="grid grid-cols-2 gap-6 relative z-10">
                {workers.map(worker => (
                  <WorkerNode 
                    key={worker.id} 
                    worker={worker} 
                    currentTask={tasks.find(t => t.id === worker.currentTaskId) || null}
                  />
                ))}
              </div>

              {/* Shuffle View */}
              <AnimatePresence>
                {phase === 'shuffle' && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 z-50"
                  >
                    <ShuffleView 
                      isAutoMode={isAutoMode} 
                      onComplete={() => {
                        setIsShuffleComplete(true);
                        setPhase('reduce');
                        triggerAction('Entering Reduce Phase');
                      }} 
                    />
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Map Phase Complete Overlay (Manual Mode) */}
              <AnimatePresence>
                {phase === 'map' && tasks.filter(t => t.type === 'map' && !t.isSpeculative).every(t => t.status === 'complete') && !isAutoMode && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 flex items-center justify-center bg-background/50 backdrop-blur-sm z-40"
                  >
                    <motion.button 
                      initial={{ scale: 0.9, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => {
                        setPhase('shuffle');
                        triggerAction('Entering Shuffle Phase');
                      }}
                      className="flex items-center gap-3 px-8 py-4 bg-violet-500 text-white font-black uppercase tracking-widest text-xs rounded-sm hover:bg-violet-500/90 shadow-2xl"
                    >
                      <Share2 className="w-4 h-4" />
                      Map Complete: Start Shuffle
                    </motion.button>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Job Complete Summary */}
              <AnimatePresence>
                {phase === 'complete' && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="absolute inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4 lg:p-8"
                  >
                    <div className="max-w-md w-full bg-card border border-border rounded-xl p-8 shadow-2xl space-y-8">
                      <div className="text-center space-y-2">
                        <div className="inline-flex p-4 bg-emerald-500/10 rounded-full border-2 border-emerald-500/30 mb-4">
                          <CheckCircle2 className="w-12 h-12 text-emerald-500" />
                        </div>
                        <h2 className="text-2xl font-black uppercase tracking-tighter">Job Complete</h2>
                        <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Distributed Processing Finished</p>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 bg-muted/50 rounded-lg border border-border">
                          <div className="text-[8px] font-bold text-muted-foreground uppercase mb-1">Final Time</div>
                          <div className="text-xl font-black tabular-nums">{(currentTime / 1000).toFixed(1)}s</div>
                        </div>
                        <div className="p-4 bg-muted/50 rounded-lg border border-border">
                          <div className="text-[8px] font-bold text-muted-foreground uppercase mb-1">Data Locality</div>
                          <div className="text-xl font-black text-violet-500">{metrics.dataLocalityPercent.toFixed(0)}%</div>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div className="flex justify-between items-center text-[10px] font-bold uppercase">
                          <span className="text-muted-foreground">Network Overhead</span>
                          <span className="text-violet-500">{metrics.networkCost} units</span>
                        </div>
                        <div className="w-full h-1 bg-border rounded-full overflow-hidden">
                          <div className="h-full bg-violet-500" style={{ width: '100%' }} />
                        </div>
                      </div>

                      <button 
                        onClick={initSimulation}
                        className="w-full py-4 bg-violet-500 text-white font-black uppercase tracking-widest text-xs rounded-sm hover:bg-violet-500/90 transition-all shadow-lg"
                      >
                        Done
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Task Queue Panel */}
              <div className="mt-16 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center opacity-60">
                    <h3 className="text-[10px] font-bold uppercase tracking-[0.15em]">Pending Tasks</h3>
                  </div>
                </div>

                <div className="min-h-[60px] p-4 bg-muted/20 border border-border border-dashed rounded-lg grid grid-cols-6 gap-3">
                  <AnimatePresence>
                    {tasks
                      .filter(t => t.status !== 'complete' && !t.isSpeculative)
                      .filter(t => (phase === 'map' ? t.type === 'map' : t.type === 'reduce'))
                      .map(task => (
                        <motion.div
                          key={task.id}
                          layout
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.8 }}
                        >
                          <TaskCard task={task} isAutoMode={isAutoMode} />
                        </motion.div>
                      ))}
                  </AnimatePresence>
                  {tasks.filter(t => t.status !== 'complete' && !t.isSpeculative && (phase === 'map' ? t.type === 'map' : t.type === 'reduce')).length === 0 && (
                    <div className="w-full flex items-center justify-center py-4 opacity-20">
                      <span className="text-[10px] font-black uppercase tracking-widest">Queue Empty</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Simulation Log Overlay */}
            <div className="absolute bottom-4 left-4 pointer-events-none overflow-hidden h-12 flex items-end z-50">
              <AnimatePresence mode="wait">
                {lastAction && (
                  <motion.div 
                    key={lastAction}
                    initial={{ opacity: 0, y: 10, filter: 'blur(4px)' }}
                    animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                    exit={{ opacity: 0, scale: 0.95, filter: 'blur(4px)', transition: { duration: 0.2 } }}
                    transition={{ duration: 0.3, ease: "easeOut" }}
                    className="bg-background/95 backdrop-blur-md border border-border px-3 py-1.5 rounded-sm inline-flex items-center gap-2 shadow-xl"
                  >
                    <Activity className="w-3 h-3 text-violet-500 animate-pulse" />
                    <span className="text-[9px] font-bold uppercase tracking-widest text-foreground">{lastAction}</span>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </main>
        </div>

        {createPortal(
          <DragOverlay>
            {activeTask ? (
              <div className="scale-110 rotate-3 shadow-2xl">
                <TaskCard task={activeTask} isAutoMode={isAutoMode} />
              </div>
            ) : null}
          </DragOverlay>,
          document.body
        )}
      </DndContext>
    </div>
  );
};

export default MapReduceScheduler;
