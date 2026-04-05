import { Block, Miner, NetworkEvent } from './types';

export const COLORS = [
  '#3b82f6', // blue
  '#ef4444', // red
  '#10b981', // emerald
  '#f59e0b', // amber
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#f97316', // orange
  '#84cc16', // lime
  '#6366f1', // indigo
];

export const generateId = () => Math.random().toString(36).substring(2, 9);

export const calculateLongestChain = (blocks: Block[], startBlockId: string): string[] => {
  const blockMap = new Map(blocks.map(b => [b.id, b]));
  
  // Find all tips (blocks that are not parents of any other block in the provided set)
  const tips = blocks.filter(b => !blocks.some(other => other.parentId === b.id));
  
  let longestChain: string[] = [];
  let maxHeight = -1;

  tips.forEach(tip => {
    const chain: string[] = [];
    let current: Block | undefined = tip;
    while (current) {
      chain.unshift(current.id);
      if (current.id === startBlockId) break;
      current = current.parentId ? blockMap.get(current.parentId) : undefined;
    }
    
    // Only consider chains that start from the specified startBlockId
    if (chain[0] === startBlockId) {
      if (chain.length > maxHeight) {
        maxHeight = chain.length;
        longestChain = chain;
      } else if (chain.length === maxHeight) {
        // Tie-break: earlier timestamp for the tip (first-seen rule)
        const currentTipId = longestChain[longestChain.length - 1];
        const currentTip = blockMap.get(currentTipId);
        if (currentTip && tip.timestamp < currentTip.timestamp) {
          longestChain = chain;
        }
      }
    }
  });

  return longestChain;
};

export const calculateLocalLongestChain = (blocks: Block[], knownBlockIds: Set<string>, startBlockId: string): string[] => {
  const localBlocks = blocks.filter(b => knownBlockIds.has(b.id));
  return calculateLongestChain(localBlocks, startBlockId);
};

export const getMinerTip = (miner: Miner, blocks: Block[]): string => {
  const knownBlocks = blocks.filter(b => miner.knownBlockIds.has(b.id));
  if (knownBlocks.length === 0) return 'genesis';
  
  let maxTip = knownBlocks[0];
  knownBlocks.forEach(b => {
    if (b.height > maxTip.height) {
      maxTip = b;
    } else if (b.height === maxTip.height && b.timestamp < maxTip.timestamp) {
      // Tie-break: earlier block (simulating first-seen rule)
      maxTip = b;
    }
  });
  
  return maxTip.id;
};
