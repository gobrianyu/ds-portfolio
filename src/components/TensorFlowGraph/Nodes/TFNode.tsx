import React, { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { NodeData } from '../types';
import { getOpColor, getDeviceBorder } from '../engine';
import { Cpu, Zap, AlertCircle, CheckCircle2 } from 'lucide-react';
import { cn } from '../../../lib/utils';

export const TFNode = memo(({ data, selected }: NodeProps<NodeData>) => {
  const opColor = getOpColor(data.opType);
  const deviceBorder = getDeviceBorder(data.device);
  
  const isInput = data.opType === 'Placeholder' || data.opType === 'Variable';
  const isOutput = data.opType === 'Loss';

  return (
    <div className={cn(
      "px-4 py-2 rounded-md border-2 bg-card shadow-lg transition-all min-w-[120px]",
      deviceBorder,
      selected ? "ring-2 ring-primary ring-offset-2" : "",
      data.status === 'running' ? "animate-pulse border-primary shadow-primary/20" : "",
      data.error ? "border-destructive" : ""
    )}>
      {/* Inputs */}
      {!isInput && (
        <Handle
          type="target"
          position={Position.Left}
          className="w-3 h-3 bg-slate-400 border-2 border-card"
        />
      )}

      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between gap-2">
          <div className={cn("w-2 h-2 rounded-full", opColor)} />
          <span className="text-[10px] font-black uppercase tracking-widest text-foreground truncate">
            {data.label}
          </span>
          <div className="flex items-center gap-1">
            {data.status === 'complete' && <CheckCircle2 className="w-3 h-3 text-emerald-500" />}
            {data.error && <AlertCircle className="w-3 h-3 text-destructive" />}
            {data.device.startsWith('GPU') ? (
              <Zap className="w-3 h-3 text-indigo-500" />
            ) : (
              <Cpu className="w-3 h-3 text-slate-400" />
            )}
          </div>
        </div>

        <div className="flex flex-col">
          <span className="text-[8px] font-bold text-muted-foreground uppercase tracking-tighter">
            {data.opType}
          </span>
          {data.outputShape && data.outputShape.length > 0 && (
            <span className="text-[9px] font-mono text-primary font-bold">
              [{data.outputShape.join(', ')}]
            </span>
          )}
        </div>
      </div>

      {/* Outputs */}
      {!isOutput && (
        <Handle
          type="source"
          position={Position.Right}
          className="w-3 h-3 bg-slate-400 border-2 border-card"
        />
      )}

      {data.error && (
        <div className="absolute -bottom-8 left-0 right-0 bg-destructive text-destructive-foreground text-[8px] p-1 rounded shadow-lg z-50 font-bold uppercase tracking-widest text-center">
          {data.error}
        </div>
      )}
    </div>
  );
});

TFNode.displayName = 'TFNode';
