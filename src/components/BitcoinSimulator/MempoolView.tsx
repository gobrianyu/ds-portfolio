import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Transaction } from './types';
import { Layers, Info, Zap, Activity } from 'lucide-react';

interface MempoolViewProps {
  transactions: Transaction[];
}

const getFeeColor = (satVb: number) => {
  if (satVb >= 50) return 'bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.4)]';
  if (satVb >= 25) return 'bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.3)]';
  if (satVb >= 10) return 'bg-yellow-300 shadow-[0_0_4px_rgba(253,224,71,0.2)]';
  if (satVb >= 5) return 'bg-lime-400';
  return 'bg-emerald-500';
};

export const MempoolView: React.FC<MempoolViewProps> = ({ transactions }) => {
  const [hoveredTx, setHoveredTx] = useState<Transaction | null>(null);
  const [pinnedTxId, setPinnedTxId] = useState<string | null>(null);

  // Clear pin if transaction is gone (e.g. mined)
  useEffect(() => {
    if (pinnedTxId && !transactions.some(tx => tx.id === pinnedTxId)) {
      setPinnedTxId(null);
    }
  }, [transactions, pinnedTxId]);

  // Sort transactions by fee rate (highest first)
  const sortedTxs = [...transactions].sort((a, b) => {
    const rateA = a.fee / (a.size / 1024);
    const rateB = b.fee / (b.size / 1024);
    return rateB - rateA;
  });

  const totalSize = transactions.reduce((acc, tx) => acc + tx.size, 0);
  const avgFeeRate = transactions.length > 0 
    ? transactions.reduce((acc, tx) => acc + (tx.fee / (tx.size / 1024)), 0) / transactions.length 
    : 0;

  const displayTx = hoveredTx || transactions.find(tx => tx.id === pinnedTxId) || null;

  return (
    <div className="w-full h-full border-l border-border bg-muted/30 p-4 flex flex-col gap-4 overflow-hidden shrink-0 relative">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 opacity-60">
          <Layers className="w-4 h-4 text-primary" />
          <h3 className="text-[10px] font-bold uppercase tracking-[0.15em]">Mempool_Grid</h3>
        </div>
        <div className="flex items-center gap-1 px-1.5 py-0.5 bg-primary/10 rounded-full">
          <Activity className="w-2.5 h-2.5 text-primary animate-pulse" />
          <span className="text-[8px] font-bold text-primary tabular-nums">{transactions.length}</span>
        </div>
      </div>

      {/* Mempool Block Visualization */}
      <div className="flex-1 relative bg-background/50 border border-border rounded-sm p-2 overflow-hidden flex flex-col gap-2">
        <div className="flex justify-between items-center px-1">
          <span className="text-[7px] font-bold uppercase tracking-widest text-muted-foreground">Pending_Block</span>
          <span className="text-[7px] font-bold text-muted-foreground tabular-nums">
            {(totalSize / 1024 / 1024).toFixed(2)} / 1.00 MB
          </span>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar pr-1">
          <div className="grid grid-cols-8 sm:grid-cols-10 md:grid-cols-12 lg:grid-cols-8 gap-1 auto-rows-fr">
            <AnimatePresence initial={false}>
              {sortedTxs.map((tx) => {
                const satVb = tx.fee / (tx.size / 1024);
                return (
                  <motion.div
                    key={tx.id}
                    layout
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0 }}
                    transition={{ 
                      layout: {
                        type: "spring",
                        stiffness: 500,
                        damping: 40,
                        mass: 1
                      },
                      opacity: { duration: 0.2 },
                      scale: { 
                        type: "spring", 
                        stiffness: 400, 
                        damping: 40,
                        bounce: 0
                      }
                    }}
                    onMouseEnter={() => {
                      setHoveredTx(tx);
                      if (pinnedTxId && pinnedTxId !== tx.id) {
                        setPinnedTxId(null);
                      }
                    }}
                    onMouseLeave={() => setHoveredTx(null)}
                    onClick={(e) => {
                      e.stopPropagation();
                      setPinnedTxId(prev => prev === tx.id ? null : tx.id);
                    }}
                    className={`aspect-square rounded-[1px] cursor-pointer border border-transparent hover:border-white/60 hover:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.4)] hover:z-10 transition-colors duration-200 ${getFeeColor(satVb)} ${pinnedTxId === tx.id ? 'ring-2 ring-white z-20 border-white shadow-lg' : ''}`}
                  />
                );
              })}
            </AnimatePresence>
          </div>

          {transactions.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center opacity-20 gap-2 py-12">
              <Zap className="w-8 h-8" />
              <span className="text-[9px] font-bold uppercase tracking-widest text-center px-4">
                Listening for transactions...
              </span>
            </div>
          )}
        </div>

        {/* Hover Tooltip */}
        <AnimatePresence>
          {displayTx && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="absolute bottom-2 left-2 right-2 bg-card border border-border p-2 rounded shadow-2xl z-20 pointer-events-none ring-1 ring-black/5 opacity-100"
            >
              <div className="flex justify-between items-center mb-1">
                <span className="text-[8px] font-black text-primary uppercase tracking-widest">{displayTx.id}</span>
                <Info className="w-2.5 h-2.5 text-muted-foreground" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col">
                  <span className="text-[6px] uppercase text-muted-foreground">Fee Rate</span>
                  <span className="text-[9px] font-bold tabular-nums">
                    {(displayTx.fee / (displayTx.size / 1024)).toFixed(1)} sat/vB
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[6px] uppercase text-muted-foreground">Size</span>
                  <span className="text-[9px] font-bold tabular-nums">
                    {Math.round(displayTx.size / 1024 * 10) / 10} KB
                  </span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Stats Summary */}
      <div className="pt-4 border-t border-border space-y-2 shrink-0">
        <div className="flex justify-between items-end">
          <div className="flex flex-col">
            <span className="text-[7px] font-bold uppercase tracking-widest text-muted-foreground">Avg_Fee_Rate</span>
            <span className="text-[12px] font-black text-foreground tabular-nums">
              {avgFeeRate.toFixed(1)} <span className="text-[8px] font-medium text-muted-foreground">sat/vB</span>
            </span>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-[7px] font-bold uppercase tracking-widest text-muted-foreground">Mempool_Weight</span>
            <span className="text-[10px] font-black text-foreground tabular-nums">
              {Math.round(totalSize / 1024)} <span className="text-[8px] font-medium text-muted-foreground">vB</span>
            </span>
          </div>
        </div>

        {/* Fee Legend */}
        <div className="flex items-center justify-between pt-2 border-t border-border/50">
          <div className="flex gap-1">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <div className="w-1.5 h-1.5 rounded-full bg-lime-400" />
            <div className="w-1.5 h-1.5 rounded-full bg-yellow-300" />
            <div className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            <div className="w-1.5 h-1.5 rounded-full bg-orange-500" />
          </div>
          <span className="text-[6px] font-bold uppercase tracking-widest text-muted-foreground">Fee_Gradient</span>
        </div>
      </div>
    </div>
  );
};

