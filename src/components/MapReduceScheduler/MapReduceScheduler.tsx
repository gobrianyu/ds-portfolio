import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
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
  Pause, 
  RotateCcw, 
  Activity, 
  Layers, 
  Share2, 
  Info, 
  Clock,
  CheckCircle2,
  Network,
  Database,
  TrendingUp,
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

  // --- Action Feedback ---
  const triggerAction = useCallback((message: string) => {
    setLastAction(message);
    if (actionTimeoutRef.current) clearTimeout(actionTimeoutRef.current);
    actionTimeoutRef.current = setTimeout(() => {
      setLastAction(null);
    }, 3000);
  }, []);

  // --- Initialization ---
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
    triggerAction('System Initialized');
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
            setTimeout(() => {
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
    window.addEventListener('resize', updatePositions);
    return () => window.removeEventListener('resize', updatePositions);
  }, [workers]);

  return (
    <div className="w-full max-w-7xl mx-auto bg-card border border-border shadow-2xl flex flex-col relative overflow-hidden rounded-lg font-mono selection:bg-primary/30 text-foreground transition-colors h-auto lg:max-h-[900px]">
      {/* Header */}
      <header className="flex flex-col md:flex-row items-center justify-between px-6 py-4 border-b border-border bg-muted/50 shrink-0 gap-4">
        <div className="flex items-center gap-6 w-full md:w-auto">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-sm shrink-0">
              <Network className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-sm font-black tracking-tighter uppercase truncate">Be_The_Scheduler</h1>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest truncate">MapReduce_Sim</span>
                <div className="flex items-center gap-1 px-1.5 py-0.5 bg-emerald-500/10 rounded-full shrink-0">
                  <div className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[8px] font-black text-emerald-500 uppercase tracking-widest">Live</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end">
          <div className="flex items-center bg-background border border-border rounded-sm p-1">
            <button 
              disabled={isRunning}
              onClick={() => setIsAutoMode(false)}
              className={cn(
                "px-3 py-1 text-[10px] font-bold uppercase transition-all rounded-sm",
                !isAutoMode ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
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
                isAutoMode ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
                isRunning && "opacity-50 cursor-not-allowed"
              )}
            >
              Auto
            </button>
          </div>

          <div className="h-8 w-[1px] bg-border mx-1 hidden md:block" />

          {!hasStarted ? (
            <button 
              onClick={() => {
                setIsRunning(true);
                setHasStarted(true);
                triggerAction('Simulation Started');
              }}
              className="flex items-center justify-center gap-2 px-4 md:px-6 py-2 rounded-sm font-bold text-[11px] uppercase transition-all bg-primary border border-primary/30 text-primary-foreground hover:bg-primary/90 shadow-[0_0_10px_rgba(var(--primary-rgb),0.2)] flex-1 md:flex-none"
            >
              <Play className="w-3 h-3 fill-current" />
              Start
            </button>
          ) : (
            <button 
              onClick={initSimulation}
              className="flex items-center justify-center gap-2 px-4 md:px-6 py-2 rounded-sm font-bold text-[11px] uppercase transition-all bg-amber-500/10 border border-amber-500/30 text-amber-500 hover:bg-amber-500/20 flex-1 md:flex-none"
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
        <div className="flex-auto flex flex-col lg:flex-row overflow-hidden">
          {/* Mobile-only Job Status Bar */}
          <div className="lg:hidden px-4 py-3 border-b border-border bg-muted/30 shrink-0">
            <div className="flex items-center justify-between px-2">
              {[
                { id: 'map', label: 'Map', icon: Database },
                { id: 'shuffle', label: 'Shuffle', icon: Share2 },
                { id: 'reduce', label: 'Reduce', icon: Filter },
                { id: 'complete', label: 'Done', icon: CheckCircle2 }
              ].map((p, idx) => {
                const isCurrent = phase === p.id;
                const isDone = idx < ['map', 'shuffle', 'reduce', 'complete'].indexOf(phase);
                const isJobComplete = phase === 'complete' && p.id === 'complete';
                const Icon = p.icon;
                
                return (
                  <React.Fragment key={p.id}>
                    <div className="flex flex-col items-center gap-1 relative">
                      <div className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center border transition-all",
                        isCurrent 
                          ? isJobComplete ? "bg-emerald-500/10 border-emerald-500 text-emerald-500" : "bg-primary/10 border-primary text-primary"
                          : isDone ? "bg-emerald-500/5 border-emerald-500/20 text-emerald-500" : "bg-background border-border text-muted-foreground opacity-40"
                      )}>
                        {isDone || isJobComplete ? <CheckCircle2 className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
                      </div>
                      {isCurrent && (
                        <span className="text-[8px] font-black uppercase tracking-widest text-primary animate-pulse absolute -bottom-4 whitespace-nowrap">
                          {p.label}
                        </span>
                      )}
                    </div>
                    {idx < 3 && (
                      <div className={cn(
                        "h-[1px] flex-1 mx-2",
                        isDone ? "bg-emerald-500/30" : "bg-border"
                      )} />
                    )}
                  </React.Fragment>
                );
              })}
            </div>
            <div className="h-4" /> {/* Spacer for the absolute label */}
          </div>

          {/* Left Panel: Controls & Info (Moves to bottom on mobile) */}
          <aside className="w-full lg:w-72 border-t lg:border-t-0 lg:border-r border-border bg-muted/30 pt-4 px-4 pb-2 lg:pt-6 lg:px-6 lg:pb-2 grid grid-cols-1 sm:grid-cols-2 lg:flex lg:flex-col lg:self-stretch gap-4 lg:gap-6 overflow-y-auto custom-scrollbar shrink-0 order-last lg:order-first">
            {/* Desktop Job Status */}
            <section className="hidden lg:block space-y-3">
              <div className="flex items-center gap-2 opacity-60">
                <Activity className="w-4 h-4 text-primary" />
                <h3 className="text-[10px] font-bold uppercase tracking-[0.15em]">Job_Status</h3>
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
                            : "bg-primary/10 border-primary text-primary shadow-[0_0_10px_rgba(var(--primary-rgb),0.1)]" 
                          : isDone
                            ? "bg-emerald-500/5 border-emerald-500/20 text-emerald-500"
                            : "bg-background border-border text-muted-foreground opacity-40"
                      )}
                    >
                      <div className={cn(
                        "w-5 h-5 rounded-full flex items-center justify-center border",
                        isCurrent 
                          ? isJobComplete ? "border-emerald-500" : "border-primary" 
                          : isDone ? "border-emerald-500" : "border-border"
                      )}>
                        {isDone || isJobComplete ? <CheckCircle2 className="w-3 h-3" /> : <Icon className="w-3 h-3" />}
                      </div>
                      <span className="text-[9px] font-black uppercase tracking-widest">{p.label}</span>
                      {isCurrent && !isJobComplete && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />}
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Comparison */}
            {(autoTime || userTime) && (
              <section className="space-y-3">
                <div className="flex items-center gap-2 opacity-60">
                  <TrendingUp className="w-4 h-4 text-primary" />
                  <h3 className="text-[10px] font-bold uppercase tracking-[0.15em]">Comparison</h3>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between items-center bg-background/50 border border-border p-2 rounded-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-[8px] font-bold uppercase text-muted-foreground">Auto Scheduler</span>
                      {autoTime && (!userTime || autoTime <= userTime) && (
                        <Crown className="w-3 h-3 text-primary fill-primary/20" />
                      )}
                    </div>
                    <span className="text-[10px] font-black text-primary">{autoTime ? `${autoTime.toFixed(1)}s` : '--'}</span>
                  </div>
                  <div className="flex justify-between items-center bg-background/50 border border-border p-2 rounded-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-[8px] font-bold uppercase text-muted-foreground">Your Time</span>
                      {userTime && autoTime && userTime < autoTime && (
                        <Crown className="w-3 h-3 text-amber-500 fill-amber-500/20" />
                      )}
                    </div>
                    <span className="text-[10px] font-black text-amber-500">{userTime ? `${userTime.toFixed(1)}s` : '--'}</span>
                  </div>
                </div>
              </section>
            )}

            {/* Progress Chart */}
            <section className="space-y-3">
              <div className="flex items-center justify-between opacity-60">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-primary" />
                  <h3 className="text-[10px] font-bold uppercase tracking-[0.15em]">Job_Progress</h3>
                </div>
                <div className="flex items-center gap-1.5 bg-background border border-border px-2 py-0.5 rounded-sm">
                  <Clock className="w-3 h-3 text-primary" />
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
                          stroke="var(--primary)" 
                          strokeDasharray="3 3" 
                          label={{ value: '100%', position: 'insideTopLeft', fill: 'var(--primary)', fontSize: 7, fontWeight: 'bold' }} 
                        />
                        <Area 
                          type="monotone" 
                          dataKey="completion" 
                          stroke="var(--primary)" 
                          fill="var(--primary)" 
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
            <section className="pt-3 border-t border-border/50 space-y-2">
              <div className="flex justify-between items-center bg-background/50 border border-border p-2 rounded-sm">
                <span className="text-[8px] font-bold uppercase text-muted-foreground">Completion</span>
                <span className="text-[10px] font-black text-foreground">{Math.round((tasks.filter(t => t.status === 'complete' && !t.isSpeculative).length / (tasks.filter(t => !t.isSpeculative).length || 1)) * 100)}%</span>
              </div>
              <div className="flex justify-between items-center bg-background/50 border border-border p-2 rounded-sm">
                <span className="text-[8px] font-bold uppercase text-muted-foreground">Locality</span>
                <span className="text-[10px] font-black text-primary">{metrics.dataLocalityPercent.toFixed(0)}%</span>
              </div>
              <div className="flex justify-between items-center bg-background/50 border border-border p-2 rounded-sm">
                <span className="text-[8px] font-bold uppercase text-muted-foreground">Network</span>
                <span className="text-[10px] font-black text-amber-500">{metrics.networkCost}</span>
              </div>
            </section>
          </aside>

          {/* Main Area: Cluster Visualization */}
          <main className="flex-auto flex flex-col overflow-hidden relative bg-background/50">
            {/* Background Grid */}
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[linear-gradient(currentColor_1px,transparent_1px),linear-gradient(90deg,currentColor_1px,transparent_1px)] bg-[size:40px_40px] z-0" />
            
            <div ref={containerRef} className="flex-auto pt-4 px-4 pb-2 lg:pt-6 lg:px-6 lg:pb-2 overflow-y-auto custom-scrollbar relative z-10">
              {/* Network Lines */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none z-0 overflow-visible hidden lg:block">
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
                          stroke="var(--primary)" 
                          strokeWidth="1" 
                          strokeDasharray="4 4"
                          className="opacity-20"
                        />
                        <motion.circle
                          r="3"
                          fill="var(--primary)"
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

              <div className="grid grid-cols-2 lg:grid-cols-2 gap-3 md:gap-6 relative z-10">
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
                      className="flex items-center gap-3 px-8 py-4 bg-primary text-primary-foreground font-black uppercase tracking-widest text-xs rounded-sm hover:bg-primary/90 shadow-2xl"
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
                        <h2 className="text-2xl font-black uppercase tracking-tighter">Job_Complete</h2>
                        <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Distributed_Processing_Finished</p>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 bg-muted/50 rounded-lg border border-border">
                          <div className="text-[8px] font-bold text-muted-foreground uppercase mb-1">Final Time</div>
                          <div className="text-xl font-black tabular-nums">{(currentTime / 1000).toFixed(1)}s</div>
                        </div>
                        <div className="p-4 bg-muted/50 rounded-lg border border-border">
                          <div className="text-[8px] font-bold text-muted-foreground uppercase mb-1">Data Locality</div>
                          <div className="text-xl font-black text-primary">{metrics.dataLocalityPercent.toFixed(0)}%</div>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div className="flex justify-between items-center text-[10px] font-bold uppercase">
                          <span className="text-muted-foreground">Network Overhead</span>
                          <span className="text-amber-500">{metrics.networkCost} units</span>
                        </div>
                        <div className="w-full h-1 bg-border rounded-full overflow-hidden">
                          <div className="h-full bg-primary" style={{ width: '100%' }} />
                        </div>
                      </div>

                      <button 
                        onClick={initSimulation}
                        className="w-full py-4 bg-primary text-primary-foreground font-black uppercase tracking-widest text-xs rounded-sm hover:bg-primary/90 transition-all shadow-lg"
                      >
                        Run_New_Scenario
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Task Queue Panel */}
              <div className="mt-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 opacity-60">
                    <Layers className="w-4 h-4 text-primary" />
                    <h3 className="text-[10px] font-bold uppercase tracking-[0.15em]">Pending_Tasks</h3>
                  </div>
                </div>

                <div className="min-h-[100px] p-4 bg-muted/20 border border-border border-dashed rounded-lg grid grid-cols-4 lg:grid-cols-6 gap-2 md:gap-3">
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
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
                    transition={{ duration: 0.3, ease: "easeOut" }}
                    className="bg-background/95 backdrop-blur-md border border-border px-3 py-1.5 rounded-sm inline-flex items-center gap-2 shadow-xl"
                  >
                    <Activity className="w-3 h-3 text-primary animate-pulse" />
                    <span className="text-[9px] font-bold uppercase tracking-widest text-foreground">{lastAction}</span>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </main>
        </div>

        <DragOverlay>
          {activeTask ? (
            <div className="scale-110 rotate-3 shadow-2xl">
              <TaskCard task={activeTask} isAutoMode={isAutoMode} />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
};

export default MapReduceScheduler;
