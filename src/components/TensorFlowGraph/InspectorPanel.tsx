import React from 'react';
import { 
  Settings2, 
  Database, 
  Cpu, 
  Zap, 
  Activity, 
  AlertCircle,
  CheckCircle2,
  Info
} from 'lucide-react';
import { NodeData, Device } from './types';
import { cn } from '../../lib/utils';

interface InspectorPanelProps {
  selectedNode: { id: string; data: NodeData } | null;
  onParamsChange: (id: string, params: Record<string, any>) => void;
  onDeviceChange: (id: string, device: Device) => void;
}

export const InspectorPanel: React.FC<InspectorPanelProps> = ({ 
  selectedNode, 
  onParamsChange, 
  onDeviceChange 
}) => {
  if (!selectedNode) {
    return (
      <div className="w-full lg:w-72 bg-muted/30 border-l border-border flex flex-col items-center justify-center p-8 text-center gap-4 shrink-0">
        <div className="p-4 bg-muted/50 rounded-full border border-border/50">
          <Info className="w-8 h-8 text-muted-foreground opacity-30" />
        </div>
        <div className="space-y-1">
          <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">No_Selection</h3>
          <p className="text-[8px] font-bold uppercase tracking-widest text-muted-foreground/60 leading-relaxed">
            Select a node on the canvas to inspect its properties and tensors.
          </p>
        </div>
      </div>
    );
  }

  const { id, data } = selectedNode;

  return (
    <div className="w-full lg:w-72 bg-muted/30 border-l border-border flex flex-col shrink-0 overflow-y-auto custom-scrollbar">
      <div className="p-4 lg:p-6 space-y-6 lg:space-y-8">
        {/* Header */}
        <div className="space-y-1">
          <div className="flex items-center gap-2 opacity-60">
            <Settings2 className="w-4 h-4 text-primary" />
            <h3 className="text-[10px] font-bold uppercase tracking-[0.15em]">Node_Inspector</h3>
          </div>
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-black uppercase tracking-tighter text-foreground truncate max-w-[180px]">
              {data.label}
            </h2>
            <div className="flex items-center gap-1">
              {data.status === 'complete' && <CheckCircle2 className="w-3 h-3 text-emerald-500" />}
              {data.error && <AlertCircle className="w-3 h-3 text-destructive" />}
            </div>
          </div>
        </div>

        {/* Properties */}
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-[8px] font-bold uppercase tracking-widest text-muted-foreground">Operation Type</label>
            <div className="px-3 py-2 bg-background border border-border rounded-sm flex items-center gap-2">
              <Activity className="w-3 h-3 text-primary" />
              <span className="text-[10px] font-black uppercase tracking-widest text-foreground">{data.opType}</span>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[8px] font-bold uppercase tracking-widest text-muted-foreground">Device Placement</label>
            <div className="grid grid-cols-3 gap-1">
              {(['CPU', 'GPU:0', 'GPU:1'] as Device[]).map((d) => (
                <button
                  key={d}
                  onClick={() => onDeviceChange(id, d)}
                  className={cn(
                    "flex flex-col items-center justify-center py-2 px-1 rounded-sm border transition-all gap-1",
                    data.device === d
                      ? "bg-primary/10 border-primary text-primary shadow-[0_0_10px_rgba(var(--primary-rgb),0.1)]"
                      : "bg-background border-border text-muted-foreground hover:text-foreground hover:border-muted-foreground/50"
                  )}
                >
                  {d === 'CPU' ? <Cpu className="w-3 h-3" /> : <Zap className="w-3 h-3" />}
                  <span className="text-[7px] font-black tracking-widest">{d}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Dynamic Params based on OpType */}
          {(data.opType === 'Placeholder' || data.opType === 'Variable') && (
            <div className="space-y-2">
              <label className="text-[8px] font-bold uppercase tracking-widest text-muted-foreground">Tensor Shape</label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={data.params.shape?.join(', ') || ''}
                  onChange={(e) => {
                    const shape = e.target.value.split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n));
                    onParamsChange(id, { ...data.params, shape });
                  }}
                  placeholder="e.g. 32, 128"
                  className="flex-1 px-3 py-2 bg-background border border-border rounded-sm text-[10px] font-mono font-bold focus:outline-none focus:border-primary transition-colors"
                />
              </div>
              <p className="text-[7px] font-bold uppercase tracking-widest text-muted-foreground/60 italic">
                Comma-separated dimensions.
              </p>
            </div>
          )}
        </div>

        {/* Tensor Details */}
        <div className="space-y-4 pt-6 border-t border-border/50">
          <div className="flex items-center gap-2 opacity-60">
            <Database className="w-4 h-4 text-primary" />
            <h3 className="text-[10px] font-bold uppercase tracking-[0.15em]">Tensor_Details</h3>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between items-center bg-background/50 border border-border p-2 rounded-sm">
              <span className="text-[8px] font-bold uppercase text-muted-foreground">Output Shape</span>
              <span className="text-[10px] font-black text-primary font-mono">
                {data.outputShape && data.outputShape.length > 0 ? `[${data.outputShape.join(', ')}]` : 'None'}
              </span>
            </div>
            <div className="flex justify-between items-center bg-background/50 border border-border p-2 rounded-sm">
              <span className="text-[8px] font-bold uppercase text-muted-foreground">Data Type</span>
              <span className="text-[10px] font-black text-foreground">float32</span>
            </div>
            
            {data.status === 'complete' && (
              <div className="p-2 bg-emerald-500/5 border border-emerald-500/20 rounded-sm">
                <div className="flex items-center gap-1.5 mb-1">
                  <CheckCircle2 className="w-2.5 h-2.5 text-emerald-500" />
                  <span className="text-[8px] font-black uppercase tracking-widest text-emerald-500">Executed</span>
                </div>
                <p className="text-[7px] font-bold uppercase tracking-widest text-muted-foreground/80">
                  Tensor computed and stored in memory.
                </p>
              </div>
            )}

            {data.error && (
              <div className="p-2 bg-destructive/5 border border-destructive/20 rounded-sm">
                <div className="flex items-center gap-1.5 mb-1">
                  <AlertCircle className="w-2.5 h-2.5 text-destructive" />
                  <span className="text-[8px] font-black uppercase tracking-widest text-destructive">Error</span>
                </div>
                <p className="text-[7px] font-bold uppercase tracking-widest text-destructive/80 leading-relaxed">
                  {data.error}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
