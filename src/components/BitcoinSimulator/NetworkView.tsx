import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Miner, NetworkEvent, Block, MinerId } from './types';
import { Network, Cpu, Shield, Activity, User } from 'lucide-react';

interface NetworkViewProps {
  miners: Miner[];
  events: NetworkEvent[];
  blocks: Block[];
  simulationTime: number;
  selectedNodeId: MinerId | null;
}

export const NetworkView: React.FC<NetworkViewProps> = ({ miners, events, blocks, simulationTime, selectedNodeId }) => {
  // Simple circular layout for miners
  const radius = 220;
  const center = { x: 350, y: 320 };

  const minerPositions = useMemo(() => {
    return miners.map((miner, i) => {
      const angle = i * 2 * Math.PI / miners.length;
      return {
        id: miner.id,
        x: center.x + radius * Math.cos(angle),
        y: center.y + radius * Math.sin(angle)
      };
    });
  }, [miners.length]);

  return (
    <div className="w-full h-full flex items-center justify-center bg-background/50 relative overflow-hidden">
      {/* Background Grid Effect */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[linear-gradient(currentColor_1px,transparent_1px),linear-gradient(90deg,currentColor_1px,transparent_1px)] bg-[size:40px_40px]" />
      
      <svg width="100%" height="100%" viewBox="0 0 700 700" className="relative z-10">
        <defs>
          <filter id="glow">
            <feGaussianBlur stdDeviation="2.5" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>

        {/* Connections (Mesh Network) */}
        {minerPositions.map((m1, i) => minerPositions.slice(i + 1).map(m2 => (
          <line 
            key={`${m1.id}-${m2.id}`}
            x1={m1.x} y1={m1.y} x2={m2.x} y2={m2.y}
            stroke="var(--violet-500)"
            strokeWidth="1"
            strokeDasharray="4 4"
            opacity="0.1"
          />
        )))}

        {/* Propagation Particles */}
        <AnimatePresence>
          {events.map(event => {
            const fromPos = minerPositions.find(m => m.id === event.fromMinerId);
            const toPos = minerPositions.find(m => m.id === event.toMinerId);
            if (!fromPos || !toPos) return null;

            const block = blocks.find(b => b.id === event.blockId);
            if (!block) return null;

            // Calculate progress based on simulation time
            // Note: This is tricky with Framer Motion because simulation time might jump
            // We'll use a simpler approach: if the event is active, show it.
            
            return (
              <motion.g key={event.id}>
                <motion.circle
                  r="5"
                  fill={block.color}
                  initial={{ cx: fromPos.x, cy: fromPos.y, opacity: 0 }}
                  animate={{ cx: toPos.x, cy: toPos.y, opacity: 1 }}
                  exit={{ opacity: 0, scale: 2 }}
                  transition={{ 
                    duration: Math.max(0.1, (event.arrivalTime - simulationTime) / 1000), 
                    ease: "linear" 
                  }}
                  filter="url(#glow)"
                />
                <motion.path
                  d={`M ${fromPos.x} ${fromPos.y} L ${toPos.x} ${toPos.y}`}
                  stroke={block.color}
                  strokeWidth="1.5"
                  strokeDasharray="2 2"
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: 1, opacity: 0.3 }}
                  exit={{ opacity: 0 }}
                />
              </motion.g>
            );
          })}
        </AnimatePresence>

        {/* Miners */}
        {miners.map((miner, i) => {
          const pos = minerPositions[i];
          const isSelected = miner.id === selectedNodeId;

          return (
            <g key={miner.id} className="cursor-pointer group">
              {/* Outer Ring */}
              <motion.circle 
                cx={pos.x} cy={pos.y} r={isSelected ? "48" : "40"} 
                fill={isSelected ? "var(--violet-500-rgb)" : "var(--card)"} 
                fillOpacity={isSelected ? 0.1 : 1}
                stroke={miner.color} 
                strokeWidth={isSelected ? "4" : "2.5"}
                strokeOpacity={isSelected ? 0.8 : 0.3}
                animate={{ scale: isSelected ? [1, 1.1, 1] : [1, 1.05, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
              
              {/* Inner Circle */}
              <circle cx={pos.x} cy={pos.y} r="30" fill="var(--card)" stroke={miner.color} strokeWidth="1" />
              
              {/* Miner Icon */}
              <foreignObject x={pos.x - 15} y={pos.y - 15} width="30" height="30">
                <div className="w-full h-full flex items-center justify-center">
                  {isSelected ? (
                    <User className="w-6 h-6 text-violet-500" />
                  ) : (
                    <Cpu className="w-5 h-5" style={{ color: miner.color }} />
                  )}
                </div>
              </foreignObject>

              {/* Label */}
              <text x={pos.x} y={pos.y + 65} textAnchor="middle" fill="currentColor" className={`text-[11px] font-black uppercase tracking-widest ${isSelected ? 'text-violet-500' : ''}`}>
                {miner.id} {isSelected ? '(YOU)' : ''}
              </text>
              <text x={pos.x} y={pos.y + 80} textAnchor="middle" fill={miner.color} className="text-[10px] font-bold tabular-nums">{Math.round(miner.hashPower)}% HP</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
};
