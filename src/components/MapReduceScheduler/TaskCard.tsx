import React from 'react';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { Database, CheckCircle2 } from 'lucide-react';
import { Task } from './types';
import { cn } from '../../lib/utils';

interface TaskCardProps {
  task: Task;
  isDragging?: boolean;
  isAutoMode?: boolean;
}

export const TaskCard: React.FC<TaskCardProps> = ({ task, isDragging, isAutoMode }) => {
  const { attributes, listeners, setNodeRef, isDragging: isDraggingOriginal } = useDraggable({
    id: task.id,
    disabled: task.status === 'complete' || isAutoMode
  });

  return (
    <div 
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      className={cn(
        "p-1.5 sm:p-3 rounded-md border-2 transition-all select-none w-full relative overflow-hidden touch-none",
        isAutoMode ? "cursor-default" : "cursor-grab active:cursor-grabbing",
        task.type === 'map' ? "border-blue-500/30 bg-blue-500/5 hover:bg-blue-500/10" : "border-emerald-500/30 bg-emerald-500/5 hover:bg-emerald-500/10",
        isDraggingOriginal ? "opacity-20 grayscale scale-95 shadow-none" : "shadow-sm",
        task.status === 'complete' && "opacity-40 grayscale pointer-events-none",
        task.status === 'running' && "border-dashed"
      )}
    >
      {task.status === 'running' && (
        <div className="absolute inset-0 bg-primary/5 animate-pulse pointer-events-none" />
      )}
      <div className="flex items-center justify-between mb-1 sm:mb-2">
        <span className={cn(
          "text-[8px] sm:text-[10px] font-black uppercase px-1 sm:px-1.5 py-0.5 rounded-sm truncate",
          task.type === 'map' ? "bg-blue-500/20 text-blue-500" : "bg-emerald-500/20 text-emerald-500"
        )}>
          {task.type.toUpperCase()}_{task.id}
        </span>
        {task.status === 'complete' ? (
          <CheckCircle2 className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-emerald-500" />
        ) : task.status === 'running' ? (
          <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-primary animate-pulse" />
        ) : null}
      </div>
      
      {task.type === 'map' && task.dataBlockId && (
        <div className="flex items-center gap-1 opacity-60">
          <Database className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
          <span className="text-[7px] sm:text-[9px] font-bold uppercase tracking-widest truncate">Block_{task.dataBlockId}</span>
        </div>
      )}
    </div>
  );
};
