export type Strategy = 'parameter-server' | 'mirrored';
export type DeviceType = 'CPU' | 'GPU';
export type ReplicaState = 'idle' | 'computing' | 'communicating' | 'syncing';

export interface Replica {
  id: string;
  type: DeviceType;
  state: ReplicaState;
  progress: number; // 0 to 1
  batchSize: number;
  hashPower: number; // Compute speed multiplier
  lastStepTime: number;
  isStraggler: boolean;
}

export interface Packet {
  id: string;
  from: string;
  to: string;
  type: 'gradient' | 'weight';
  progress: number; // 0 to 1
  size: number;
}

export interface SimulationMetrics {
  stepTime: number;
  computeTime: number;
  commTime: number;
  syncDelay: number;
  throughput: number;
  stepsCompleted: number;
}
