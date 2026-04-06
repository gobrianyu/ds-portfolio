import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { motion, AnimatePresence } from 'motion/react';
import { Zap, Database, AlertTriangle } from 'lucide-react';
import { Worker, Task } from './types';
import { cn } from '../../lib/utils';

interface WorkerNodeProps {
  worker: Worker;
  currentTask: Task | null;
}

export const WorkerNode: React.FC<WorkerNodeProps> = ({ worker, currentTask }) => {
  const { setNodeRef, isOver } = useDroppable({
    id: `worker-${worker.id}`,
    data: { workerId: worker.id }
  });

  return (
    <div 
      ref={setNodeRef}
      id={`worker-${worker.id}`}
      className={cn(
        "relative flex flex-col p-2 sm:p-4 rounded-lg border-2 transition-all duration-200 h-44 sm:h-48",
        isOver ? "border-primary bg-primary/10 scale-105" : "border-border bg-card",
        worker.status === 'busy' ? "shadow-md" : "opacity-80"
      )}
    >
      <div className="flex items-center justify-between mb-2 sm:mb-3">
        <div className="flex items-center gap-1 sm:gap-2">
          <div className={cn(
            "w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full",
            worker.status === 'busy' ? "bg-primary animate-pulse" : "bg-muted-foreground"
          )} />
          <span className="text-[9px] sm:text-xs font-black uppercase tracking-widest">W_{worker.id}</span>
        </div>
        <div className="flex items-center gap-1 opacity-60">
          <Zap className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
          <span className="text-[8px] sm:text-[10px] font-bold">{worker.speed.toFixed(1)}x</span>
        </div>
      </div>

      {/* Local Data Blocks */}
      <div className="flex flex-wrap gap-1 mb-2 sm:mb-4">
        {Array.from(worker.localDataBlocks).map(blockId => (
          <div 
            key={blockId} 
            className="px-1.5 py-0.5 bg-muted rounded-sm border border-border flex items-center gap-1"
          >
            <Database className="w-2.5 h-2.5 text-primary" />
            <span className="text-[8px] font-bold uppercase">{blockId}</span>
          </div>
        ))}
      </div>

      {/* Current Task */}
      <div className="mt-auto">
        <AnimatePresence mode="wait">
          {currentTask ? (
            <motion.div 
              key={currentTask.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, filter: 'blur(4px)', transition: { duration: 0.2 } }}
              className="space-y-2"
            >
              <div className="flex justify-between items-center">
                <div className="flex flex-col">
                  <span className={cn(
                    "text-[10px] font-black uppercase px-1.5 py-0.5 rounded-sm w-fit",
                    currentTask.type === 'map' ? "bg-blue-500/20 text-blue-500" : "bg-emerald-500/20 text-emerald-500"
                  )}>
                    {currentTask.type}_{currentTask.id}
                  </span>
                  {currentTask.type === 'map' && currentTask.dataBlockId && (
                    <span className={cn(
                      "text-[8px] font-black uppercase mt-1",
                      worker.localDataBlocks.has(currentTask.dataBlockId) ? "text-emerald-500" : "text-amber-500"
                    )}>
                      {worker.localDataBlocks.has(currentTask.dataBlockId) ? "● LOCAL_EXEC" : "○ REMOTE_FETCH"}
                    </span>
                  )}
                </div>
                <span className="text-[10px] font-bold tabular-nums">
                  {Math.round(currentTask.progress * 100)}%
                </span>
              </div>
              <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                <motion.div 
                  className={cn(
                    "h-full",
                    currentTask.type === 'map' 
                      ? (worker.localDataBlocks.has(currentTask.dataBlockId!) ? "bg-emerald-500" : "bg-blue-500") 
                      : "bg-emerald-500"
                  )}
                  initial={{ width: 0 }}
                  animate={{ width: `${currentTask.progress * 100}%` }}
                  transition={{ duration: 0.1 }}
                />
              </div>
              <div className="flex items-center justify-between">
                {currentTask.isStraggler && (
                  <div className="flex items-center gap-1 text-amber-500 animate-pulse">
                    <AlertTriangle className="w-3 h-3" />
                    <span className="text-[8px] font-black uppercase">Straggler</span>
                  </div>
                )}
                {currentTask.isSpeculative && (
                  <div className="flex items-center gap-1 text-primary animate-pulse ml-auto">
                    <Zap className="w-3 h-3" />
                    <span className="text-[8px] font-black uppercase">Speculative</span>
                  </div>
                )}
              </div>
            </motion.div>
          ) : (
            <motion.div 
              key="idle"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="h-12 flex items-center justify-center border border-dashed border-border rounded-sm opacity-40"
            >
              <span className="text-[10px] font-bold uppercase tracking-widest">Idle</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
