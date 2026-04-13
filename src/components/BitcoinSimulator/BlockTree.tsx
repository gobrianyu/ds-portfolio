import React, { useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Block, BlockId, MinerId } from './types';
import { calculateLongestChain } from './utils';

interface BlockTreeProps {
  blocks: Block[];
  hoveredBlock: Block | null;
  setHoveredBlock: (b: Block | null) => void;
  confirmationThreshold: number;
  selectedNodeId: MinerId | null;
  globalCanonicalChain: BlockId[];
}

const BLOCK_W = 100;
const BLOCK_H = 50;
const GAP_X = 60;
const GAP_Y = 40;
const OFFSET_X = 50;
const OFFSET_Y = 300;

export const BlockTree: React.FC<BlockTreeProps> = ({ 
  blocks, hoveredBlock, setHoveredBlock, confirmationThreshold, selectedNodeId, globalCanonicalChain 
}) => {
  const mainChain = useMemo(() => calculateLongestChain(blocks, 'genesis'), [blocks]);
  
  // Group blocks by height
  const { byHeight, sortedHeights } = useMemo(() => {
    const byHeight: Record<number, Block[]> = {};
    blocks.forEach(b => {
      if (!byHeight[b.height]) byHeight[b.height] = [];
      byHeight[b.height].push(b);
    });
    const sortedHeights = Object.keys(byHeight).map(Number).sort((a, b) => a - b);
    return { byHeight, sortedHeights };
  }, [blocks]);

  // Assign Y positions to avoid overlaps
  const yPositions = useMemo(() => {
    const positions: Record<string, number> = { 'genesis': 0 };
    const heightOccupancy: Record<number, number[]> = {};

    sortedHeights.forEach(h => {
      if (h === 0) {
        heightOccupancy[0] = [0];
        return;
      }
      
      const levelBlocks = byHeight[h];
      levelBlocks.forEach((b) => {
        const parentY = positions[b.parentId!] || 0;
        
        // Find a free slot near the parent's Y
        let offset = 0;
        let found = false;
        const step = BLOCK_H + GAP_Y;
        
        if (!heightOccupancy[h]) heightOccupancy[h] = [];
        
        while (!found) {
          const tryY = parentY + offset;
          if (!heightOccupancy[h].includes(tryY)) {
            positions[b.id] = tryY;
            heightOccupancy[h].push(tryY);
            found = true;
          } else {
            // Alternate checking up and down
            if (offset <= 0) {
              offset = -offset + step;
            } else {
              offset = -offset;
            }
          }
        }
      });
    });
    return positions;
  }, [byHeight, sortedHeights]);

  // Calculate confirmation depth (distance from tip)
  const mainChainTipId = mainChain[mainChain.length - 1];
  const mainChainTip = blocks.find(b => b.id === mainChainTipId);
  const tipHeight = mainChainTip ? mainChainTip.height : 0;
  
  const getConfirmations = (b: Block) => {
    if (!mainChain.includes(b.id)) return 0;
    return tipHeight - b.height + 1;
  };

  const constraintsRef = useRef<HTMLDivElement>(null);

  const canvasWidth = (sortedHeights.length * (BLOCK_W + GAP_X)) + 400;
  const canvasHeight = 800; // Fixed height for the draggable area

  return (
    <div className="w-full h-full flex flex-col bg-background/50 overflow-hidden" ref={constraintsRef}>
      <div className="flex-1 relative cursor-move">
        {/* Background Grid Effect */}
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[linear-gradient(currentColor_1px,transparent_1px),linear-gradient(90deg,currentColor_1px,transparent_1px)] bg-[size:40px_40px] z-0" />
        
        <motion.div 
          drag
          dragConstraints={constraintsRef}
          dragElastic={0.1}
          dragMomentum={false}
          className="relative" 
          style={{ 
            width: canvasWidth,
            height: canvasHeight 
          }}
        >
          <svg className="absolute inset-0 w-full h-full pointer-events-none">
            <defs>
              <marker id="arrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="4" markerHeight="4" orient="auto-start-reverse">
                <path d="M 0 0 L 10 5 L 0 10 z" fill="currentColor" />
              </marker>
            </defs>
            {blocks.map(b => {
              if (!b.parentId) return null;
              const px = (b.height - 1) * (BLOCK_W + GAP_X) + OFFSET_X;
              const py = (yPositions[b.parentId] || 0) + OFFSET_Y;
              const cx = b.height * (BLOCK_W + GAP_X) + OFFSET_X;
              const cy = (yPositions[b.id] || 0) + OFFSET_Y;
              
              const isMain = mainChain.includes(b.id) && mainChain.includes(b.parentId);
              const isGlobal = globalCanonicalChain.includes(b.id) && globalCanonicalChain.includes(b.parentId);
              const isMine = b.minerId === selectedNodeId;

              return (
                <motion.path 
                  key={`edge-${b.id}`}
                  d={`M ${px + BLOCK_W} ${py + BLOCK_H/2} L ${cx} ${cy + BLOCK_H/2}`}
                  stroke={isMine ? "var(--violet-500)" : isMain ? "var(--violet-500)" : isGlobal ? "#8b5cf6" : "#334155"}
                  strokeWidth={isMine || isMain || isGlobal ? 2 : 1}
                  strokeOpacity={isMine || isMain || isGlobal ? 0.8 : 0.3}
                  strokeDasharray={isGlobal && !isMain ? "4 2" : "none"}
                  fill="none"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 0.5 }}
                />
              );
            })}
          </svg>

          <AnimatePresence>
            {blocks.map(b => {
              const isMain = mainChain.includes(b.id);
              const isGlobal = globalCanonicalChain.includes(b.id);
              const isMine = b.minerId === selectedNodeId;
              const isOrphan = b.id !== 'genesis' && !isMain;
              const confirmations = getConfirmations(b);
              const parentY = (b.parentId ? (yPositions[b.parentId] || 0) : 0) + OFFSET_Y;
              const parentX = (b.parentId ? (b.height - 1) * (BLOCK_W + GAP_X) : 0) + OFFSET_X;
              
              return (
                <motion.div
                  key={b.id}
                  initial={{ scale: 0, opacity: 0, x: parentX, y: parentY }}
                  animate={{ 
                    scale: 1, 
                    opacity: 1,
                    x: b.height * (BLOCK_W + GAP_X) + OFFSET_X,
                    y: (yPositions[b.id] || 0) + OFFSET_Y
                  }}
                  exit={{ scale: 0, opacity: 0 }}
                  transition={{ 
                    type: "spring",
                    stiffness: 400,
                    damping: 35,
                    mass: 1
                  }}
                  whileHover={{ scale: 1.1 }}
                  className={`absolute top-0 left-0 cursor-pointer rounded-sm border p-1.5 flex flex-col justify-between group bg-card ${
                    isMine
                      ? 'border-violet-500 ring-2 ring-violet-500/40 bg-violet-500/20'
                      : isMain 
                        ? confirmations >= confirmationThreshold
                          ? 'border-violet-500 bg-violet-500/10 shadow-[0_0_20px_rgba(var(--violet-500-rgb),0.3)] ring-1 ring-violet-500'
                          : 'border-violet-500 bg-violet-500/10 shadow-[0_0_15px_rgba(var(--violet-500-rgb),0.15)]'
                        : isGlobal
                          ? 'border-violet-500 bg-violet-500/5'
                          : 'border-border'
                  } ${hoveredBlock?.id === b.id ? 'z-50 border-foreground ring-2 ring-violet-500/20' : 'z-10'}`}
                  style={{ 
                    width: BLOCK_W, 
                    height: BLOCK_H
                  }}
                  onMouseEnter={() => setHoveredBlock(b)}
                  onMouseLeave={() => setHoveredBlock(null)}
                >
                  <div className="w-full h-full flex flex-col justify-between" style={{ opacity: isOrphan ? 0.3 : 1 }}>
                    {isMine && (
                      <div className="absolute -top-2 -right-2 bg-violet-500 text-white text-[8px] font-black px-1.5 py-0.5 rounded-full border border-background z-20 shadow-sm">
                        YOU
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <div 
                        className={`w-2 h-2 rounded-full ${isMain ? 'animate-pulse' : ''}`} 
                        style={{ backgroundColor: b.color }} 
                      />
                      <span className="text-[10px] font-black opacity-70 tabular-nums text-foreground">H:{b.height}</span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold truncate max-w-[60px] text-foreground">{b.id}</span>
                      {confirmations > 0 && (
                        <div className="flex items-center gap-0.5">
                          <div className="w-1.5 h-1.5 rounded-full bg-violet-500" />
                          <span className="text-[9px] font-black text-violet-500">{confirmations}c</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Tooltip on hover */}
                  {hoveredBlock?.id === b.id && (
                    <div className="absolute top-full left-0 mt-2 w-48 bg-card border border-border p-2 rounded-sm shadow-2xl z-[100] pointer-events-none">
                      <div className="flex items-center gap-2 mb-1.5">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: b.color }} />
                        <span className="text-[9px] font-black uppercase tracking-widest">{b.id}</span>
                      </div>
                      <div className="space-y-1 text-[8px] font-bold uppercase tracking-widest text-muted-foreground">
                        <div className="flex justify-between">
                          <span>Miner</span>
                          <span className="text-foreground">{b.minerId}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Height</span>
                          <span className="text-foreground">{b.height}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Status</span>
                          <span className={isMain ? 'text-violet-500' : 'text-violet-500'}>
                            {isMain ? 'MAIN_CHAIN' : 'ORPHANED'}
                          </span>
                        </div>
                        {confirmations > 0 && (
                          <div className="flex justify-between">
                            <span>Confirmations</span>
                            <span className="text-violet-500">{confirmations}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );
};
