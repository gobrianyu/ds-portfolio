export type BlockId = string;
export type MinerId = string;
export type TransactionId = string;

export interface Transaction {
  id: TransactionId;
  fee: number;
  size: number;
  timestamp: number;
}

export interface Block {
  id: BlockId;
  parentId: BlockId | null;
  height: number;
  minerId: MinerId;
  timestamp: number;
  color: string; // Color of the miner who mined it
}

export interface Miner {
  id: MinerId;
  hashPower: number; // 0-100 (percentage)
  knownBlockIds: Set<BlockId>;
  tipId: BlockId;
  color: string;
  mempool: Transaction[];
  reorgCount: number;
  localChainHeight: number;
  orphanedBlocksSeen: number;
  avgPropagationDelay: number;
  propagationDelays: number[]; // To calculate avg
}

export interface NetworkEvent {
  id: string;
  type: 'PROPAGATION' | 'MINED' | 'REORG' | 'FORK';
  blockId: BlockId;
  fromMinerId?: MinerId;
  toMinerId: MinerId;
  arrivalTime: number;
  status?: 'accepted' | 'fork' | 'orphan';
}

export interface SimulationMetrics {
  totalBlocks: number;
  forkCount: number;
  orphanRate: number;
  longestChainLength: number;
  avgForkDepth: number;
  minerBlockShare: Record<MinerId, number>;
  globalCanonicalChain: BlockId[];
}
