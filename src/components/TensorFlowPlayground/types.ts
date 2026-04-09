export type DatasetType = 'circles' | 'moons' | 'xor' | 'linear';
export type ActivationType = 'linear' | 'relu' | 'tanh';
export type RegularizationType = 'none' | 'l1' | 'l2';

export interface Point {
  x: number;
  y: number;
  label: number; // 1 or -1
}

export interface Node {
  id: string;
  layerIndex: number;
  nodeIndex: number;
  bias: number;
  output: number;
  error: number;
  derivative: number;
}

export interface Link {
  source: string;
  target: string;
  weight: number;
  error: number;
}

export interface NetworkState {
  layers: number[]; // e.g. [2, 4, 4, 1]
  nodes: Node[][];
  links: Link[][];
}

export interface PlaygroundConfig {
  dataset: DatasetType;
  noise: number;
  trainTestSplit: number;
  batchSize: number;
  learningRate: number;
  activation: ActivationType;
  regularization: RegularizationType;
  regularizationRate: number;
  hiddenLayers: number[];
}
