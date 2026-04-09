export type OpType = 
  | 'Add' 
  | 'Multiply' 
  | 'MatMul' 
  | 'ReLU' 
  | 'Softmax' 
  | 'Variable' 
  | 'Assign' 
  | 'Placeholder' 
  | 'Loss';

export type Device = 'CPU' | 'GPU:0' | 'GPU:1';

export type TensorShape = number[];

export interface Tensor {
  shape: TensorShape;
  dtype: string;
  value?: any;
}

export interface NodeData {
  label: string;
  opType: OpType;
  device: Device;
  params: Record<string, any>;
  outputShape?: TensorShape;
  error?: string;
  status: 'idle' | 'running' | 'complete' | 'error';
  onParamsChange?: (params: Record<string, any>) => void;
  onDeviceChange?: (device: Device) => void;
}

export interface GraphEdgeData {
  tensor: Tensor;
  error?: string;
}

export type ExecutionMode = 'Run' | 'Step' | 'Reset';

export interface ExecutionState {
  mode: ExecutionMode;
  currentNodeId: string | null;
  executedNodeIds: Set<string>;
  intermediateTensors: Record<string, Tensor>;
  errors: string[];
}
