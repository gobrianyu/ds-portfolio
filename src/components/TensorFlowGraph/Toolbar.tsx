import React from 'react';
import { 
  Plus, 
  Database, 
  Zap, 
  Activity, 
  ArrowRightLeft, 
  Box, 
  Target,
  Layers
} from 'lucide-react';
import { OpType } from './types';
import { getOpColor } from './engine';
import { cn } from '../../lib/utils';

const OP_CATEGORIES = [
  {
    name: 'Basic Ops',
    ops: [
      { type: 'Add' as OpType, icon: Plus },
      { type: 'Multiply' as OpType, icon: Zap },
      { type: 'MatMul' as OpType, icon: Layers },
      { type: 'ReLU' as OpType, icon: Activity },
      { type: 'Softmax' as OpType, icon: ArrowRightLeft },
    ]
  },
  {
    name: 'Stateful Ops',
    ops: [
      { type: 'Variable' as OpType, icon: Database },
      { type: 'Assign' as OpType, icon: ArrowRightLeft },
    ]
  },
  {
    name: 'Input/Output',
    ops: [
      { type: 'Placeholder' as OpType, icon: Box },
      { type: 'Loss' as OpType, icon: Target },
    ]
  }
];

export const Toolbar: React.FC = () => {
  const onDragStart = (event: React.DragEvent, nodeType: OpType) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  };

  return (
    <div className="w-full bg-muted/50 border-b border-border p-2 lg:p-3 flex items-center gap-4 lg:gap-8 overflow-x-auto no-scrollbar">
      <div className="flex items-center gap-2 shrink-0">
        <Layers className="w-4 h-4 text-primary" />
        <h2 className="text-[10px] lg:text-[11px] font-black uppercase tracking-[0.2em] text-foreground">Ops_Palette</h2>
      </div>

      <div className="flex items-center gap-6 lg:gap-8">
        {OP_CATEGORIES.map((category) => (
          <div key={category.name} className="flex flex-col gap-1.5">
            <span className="text-[7px] lg:text-[8px] font-bold uppercase tracking-widest text-muted-foreground">
              {category.name}
            </span>
            <div className="flex items-center gap-2">
              {category.ops.map((op) => {
                const Icon = op.icon;
                const color = getOpColor(op.type);
                return (
                  <div
                    key={op.type}
                    draggable
                    onDragStart={(e) => onDragStart(e, op.type)}
                    className="group relative flex items-center justify-center w-8 h-8 lg:w-10 lg:h-10 bg-card border border-border rounded-sm cursor-grab hover:border-primary transition-all shadow-sm active:cursor-grabbing"
                  >
                    <div className={cn("absolute top-0 left-0 w-full h-0.5 opacity-50", color)} />
                    <Icon className="w-4 h-4 lg:w-5 lg:h-5 text-foreground group-hover:text-primary transition-colors" />
                    
                    <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 px-2 py-1 bg-popover text-popover-foreground text-[7px] font-bold uppercase tracking-widest rounded-sm border border-border opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 shadow-xl whitespace-nowrap">
                      {op.type}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
