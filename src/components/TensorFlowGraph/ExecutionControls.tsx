import React from 'react';
import { 
  Play, 
  StepForward, 
  RotateCcw, 
  Activity, 
  CheckCircle2, 
  AlertCircle 
} from 'lucide-react';
import { ExecutionMode } from './types';
import { cn } from '../../lib/utils';

interface ExecutionControlsProps {
  mode: ExecutionMode;
  onModeChange: (mode: ExecutionMode) => void;
  onStep: () => void;
  onRun: () => void;
  onReset: () => void;
  status: 'idle' | 'running' | 'complete' | 'error';
  progress: number;
}

export const ExecutionControls: React.FC<ExecutionControlsProps> = ({ 
  mode, 
  onModeChange, 
  onStep, 
  onRun, 
  onReset, 
  status,
  progress 
}) => {
  return (
    <div className="w-full bg-muted/50 border-t border-border p-3 lg:p-4 flex items-center justify-between shrink-0">
      <div className="flex items-center gap-4 lg:gap-8">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-primary" />
          <h3 className="text-[10px] lg:text-[11px] font-black uppercase tracking-[0.2em] text-foreground">Execution_Controls</h3>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onRun}
            disabled={status === 'running' || status === 'complete'}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-sm font-bold text-[9px] lg:text-[11px] uppercase tracking-widest transition-all border",
              status === 'running' || status === 'complete'
                ? "bg-muted border-border text-muted-foreground cursor-not-allowed"
                : "bg-primary border-primary/30 text-primary-foreground hover:bg-primary/90 shadow-[0_0_10px_rgba(var(--primary-rgb),0.2)]"
            )}
          >
            <Play className="w-3 h-3 fill-current" />
            Run
          </button>

          <button
            onClick={onStep}
            disabled={status === 'running' || status === 'complete'}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-sm font-bold text-[9px] lg:text-[11px] uppercase tracking-widest transition-all border",
              status === 'running' || status === 'complete'
                ? "bg-muted border-border text-muted-foreground cursor-not-allowed"
                : "bg-card border-border text-foreground hover:bg-muted"
            )}
          >
            <StepForward className="w-3 h-3" />
            Step
          </button>

          <button
            onClick={onReset}
            className="flex items-center gap-2 px-4 py-2 rounded-sm font-bold text-[9px] lg:text-[11px] uppercase tracking-widest transition-all border bg-card border-border text-foreground hover:bg-muted"
          >
            <RotateCcw className="w-3 h-3" />
            Reset
          </button>
        </div>
      </div>

      <div className="flex items-center gap-4 lg:gap-8">
        <div className="flex flex-col items-end gap-1">
          <div className="flex items-center gap-2">
            {status === 'complete' && (
              <div className="flex items-center gap-1.5 px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/20 rounded-sm">
                <CheckCircle2 className="w-2.5 h-2.5 text-emerald-500" />
                <span className="text-[8px] font-black uppercase tracking-widest text-emerald-500">Execution_Complete</span>
              </div>
            )}
            {status === 'error' && (
              <div className="flex items-center gap-1.5 px-2 py-0.5 bg-destructive/10 border border-destructive/20 rounded-sm">
                <AlertCircle className="w-2.5 h-2.5 text-destructive" />
                <span className="text-[8px] font-black uppercase tracking-widest text-destructive">Execution_Error</span>
              </div>
            )}
            {status === 'running' && (
              <div className="flex items-center gap-1.5 px-2 py-0.5 bg-primary/10 border border-primary/20 rounded-sm">
                <Activity className="w-2.5 h-2.5 text-primary animate-pulse" />
                <span className="text-[8px] font-black uppercase tracking-widest text-primary">Executing_Graph</span>
              </div>
            )}
          </div>
          <div className="w-32 lg:w-48 h-1 bg-muted rounded-full overflow-hidden border border-border/50">
            <div 
              className="h-full bg-primary transition-all duration-300" 
              style={{ width: `${progress * 100}%` }} 
            />
          </div>
        </div>
      </div>
    </div>
  );
};
