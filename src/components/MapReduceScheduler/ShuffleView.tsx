import React from 'react';
import { motion } from 'motion/react';
import { Share2, ArrowRight, Play } from 'lucide-react';

interface ShuffleViewProps {
  onComplete?: () => void;
  isAutoMode: boolean;
}

export const ShuffleView: React.FC<ShuffleViewProps> = ({ onComplete, isAutoMode }) => {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-background/90 backdrop-blur-md z-50">
      <div className="flex flex-col items-center gap-8 p-12 bg-card border border-border rounded-xl shadow-2xl max-w-2xl w-full mx-4">
        <div className="flex items-center justify-between w-full mb-4">
          <div className="flex flex-col items-center gap-2">
            <div className="w-16 h-16 bg-blue-500/10 border-2 border-blue-500/30 rounded-lg flex items-center justify-center p-2 text-center">
              <span className="text-[9px] font-black text-blue-500 leading-tight">MAP<br/>NODES</span>
            </div>
            <span className="text-[8px] font-bold text-muted-foreground uppercase">Intermediate Data</span>
          </div>
          
          <div className="flex-1 px-8 relative h-24">
            {/* Flowing particles */}
            {[...Array(12)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute top-1/2 w-2 h-2 rounded-full"
                style={{ 
                  backgroundColor: i % 2 === 0 ? '#8b5cf6' : '#3b82f6',
                  left: '0%'
                }}
                animate={{ 
                  left: '100%',
                  y: [0, Math.sin(i) * 20, 0],
                  opacity: [0, 1, 0]
                }}
                transition={{ 
                  duration: 2, 
                  repeat: Infinity, 
                  delay: i * 0.2,
                  ease: "linear"
                }}
              />
            ))}
            <div className="absolute inset-0 flex items-center justify-center">
              <motion.div
                animate={{ scale: [1, 1.1, 1], opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <Share2 className="w-8 h-8 text-violet-500" />
              </motion.div>
            </div>
          </div>

          <div className="flex flex-col items-center gap-2">
            <div className="w-16 h-16 bg-emerald-500/10 border-2 border-emerald-500/30 rounded-lg flex items-center justify-center p-2 text-center">
              <span className="text-[9px] font-black text-emerald-500 leading-tight">REDUCE<br/>NODES</span>
            </div>
            <span className="text-[8px] font-bold text-muted-foreground uppercase">Grouped by Key</span>
          </div>
        </div>
        
        <div className="text-center space-y-3">
          <h2 className="text-2xl font-black uppercase tracking-tighter text-violet-500">Shuffle & Sort</h2>
          <p className="text-sm font-medium text-muted-foreground leading-relaxed max-w-md mx-auto">
            Intermediate data from Map tasks is being partitioned, sorted, and transferred to the appropriate Reduce workers. This "all-to-all" communication is often the bottleneck in distributed jobs.
          </p>
        </div>

        {!isAutoMode && onComplete && (
          <motion.button 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={onComplete}
            className="flex items-center gap-3 px-8 py-4 bg-violet-500 text-white font-black uppercase tracking-widest text-xs rounded-sm hover:bg-violet-500/90 shadow-lg group"
          >
            <Play className="w-4 h-4 fill-current" />
            Proceed to Reduce Phase
          </motion.button>
        )}

        {isAutoMode && (
          <div className="flex items-center gap-3 text-muted-foreground animate-pulse">
            <div className="w-2 h-2 bg-violet-500 rounded-full" />
            <span className="text-[10px] text-violet-500 font-black uppercase tracking-widest">Auto Processing...</span>
          </div>
        )}
      </div>
    </div>
  );
};
