export type TaskId = string;
export type WorkerId = string;
export type BlockId = string;

export type TaskType = 'map' | 'reduce';
export type TaskStatus = 'pending' | 'running' | 'complete';

export interface Task {
  id: TaskId;
  type: TaskType;
  dataBlockId?: BlockId; // for map
  assignedWorkerId?: WorkerId;
  progress: number; // 0-1
  status: TaskStatus;
  startTime?: number;
  endTime?: number;
  isStraggler?: boolean;
  isSpeculative?: boolean;
  originalTaskId?: TaskId; // for speculative tasks
}

export interface Worker {
  id: WorkerId;
  speed: number; // relative processing speed (e.g., 0.5 to 1.5)
  localDataBlocks: Set<BlockId>;
  currentTaskId: TaskId | null;
  status: 'idle' | 'busy';
  totalActiveTime: number;
  totalIdleTime: number;
}

export type Phase = 'map' | 'shuffle' | 'reduce' | 'complete';

export interface Job {
  mapTasks: Task[];
  reduceTasks: Task[];
  phase: Phase;
  startTime?: number;
  endTime?: number;
}

export interface SimulationMetrics {
  jobCompletionTime: number;
  workerUtilization: number;
  dataLocalityPercent: number;
  networkCost: number;
  idleTime: number;
}

export interface SimulationState {
  workers: Worker[];
  tasks: Task[];
  phase: Phase;
  isRunning: boolean;
  isAutoMode: boolean;
  currentTime: number;
  metrics: SimulationMetrics;
  history: { time: number; completion: number }[];
}
