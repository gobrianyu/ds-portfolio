export const hash = (str: string): number => {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0) / 0xFFFFFFFF;
};

export const generateId = () => Math.random().toString(36).substring(2, 9);

export interface Token {
  id: string;
  nodeId: string;
  hash: number;
  color: string;
}

export interface PhysicalNode {
  id: string;
  color: string;
  vnodeCount: number;
  isDown: boolean;
  seed: string; // Used for hashing
}

export interface Key {
  id: string;
  hash: number;
  assignedNodeIds: string[]; // Primary + Replicas
  expiresAt?: number; // Timestamp for TTL simulation
}

export const findSuccessors = (hashVal: number, tokens: Token[], replicationFactor: number, nodes: PhysicalNode[]): string[] => {
  if (tokens.length === 0) return [];
  
  const healthyNodeIds = new Set(nodes.filter(n => !n.isDown).map(n => n.id));
  if (healthyNodeIds.size === 0) return [];

  // Find all tokens starting from hashVal clockwise
  const startIndex = tokens.findIndex(t => t.hash >= hashVal);
  const searchIndex = startIndex === -1 ? 0 : startIndex;
  
  const resultNodeIds: string[] = [];
  const seenNodeIds = new Set<string>();

  // Walk the ring
  for (let i = 0; i < tokens.length; i++) {
    const idx = (searchIndex + i) % tokens.length;
    const token = tokens[idx];
    
    if (healthyNodeIds.has(token.nodeId) && !seenNodeIds.has(token.nodeId)) {
      resultNodeIds.push(token.nodeId);
      seenNodeIds.add(token.nodeId);
      if (resultNodeIds.length >= replicationFactor) break;
    }
  }

  return resultNodeIds;
};

export const COLORS = [
  '#8b5cf6', // violet-500
  '#3b82f6', // blue-500
  '#ef4444', // red-500
  '#10b981', // emerald-500
  '#f59e0b', // amber-500
  '#ec4899', // pink-500
  '#06b6d4', // cyan-500
  '#84cc16', // lime-500
];
