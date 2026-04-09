import { Point, DatasetType, ActivationType, RegularizationType } from './types';

export function generateData(type: DatasetType, count: number, noise: number): Point[] {
  const points: Point[] = [];
  const rand = () => Math.random() * 2 - 1;

  for (let i = 0; i < count; i++) {
    let x = rand();
    let y = rand();
    let label = 0;

    switch (type) {
      case 'circles': {
        const dist = Math.sqrt(x * x + y * y);
        label = dist > 0.5 ? 1 : -1;
        if (noise > 0) {
          x += (Math.random() * 2 - 1) * noise * 0.5;
          y += (Math.random() * 2 - 1) * noise * 0.5;
        }
        break;
      }
      case 'xor': {
        label = (x * y > 0) ? 1 : -1;
        x += (Math.random() * 2 - 1) * noise * 0.2;
        y += (Math.random() * 2 - 1) * noise * 0.2;
        break;
      }
      case 'linear': {
        label = (x + y > 0) ? 1 : -1;
        x += (Math.random() * 2 - 1) * noise * 0.2;
        y += (Math.random() * 2 - 1) * noise * 0.2;
        break;
      }
    }
    points.push({ x, y, label });
  }
  return points;
}

export const Activations = {
  relu: {
    output: (x: number) => Math.max(0, x),
    der: (x: number) => (x > 0 ? 1 : 0),
  },
  tanh: {
    output: (x: number) => Math.tanh(x),
    der: (x: number) => 1 - Math.pow(Math.tanh(x), 2),
  },
  linear: {
    output: (x: number) => x,
    der: (x: number) => 1,
  },
};

export function shuffle<T>(array: T[]): T[] {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
}

export class NeuralNetwork {
  layers: number[];
  weights: number[][][]; // [layer][targetNode][sourceNode]
  biases: number[][]; // [layer][node]
  activations: ActivationType;
  disabledNodes: Set<string>; // "layer-index"

  constructor(layers: number[], activations: ActivationType) {
    this.layers = layers;
    this.activations = activations;
    this.weights = [];
    this.biases = [];
    this.disabledNodes = new Set();

    for (let i = 1; i < layers.length; i++) {
      const layerWeights: number[][] = [];
      const layerBiases: number[] = [];
      
      // Xavier/Glorot Initialization
      const nIn = layers[i - 1];
      const nOut = layers[i];
      const limit = Math.sqrt(6 / (nIn + nOut));

      for (let j = 0; j < layers[i]; j++) {
        const nodeWeights: number[] = [];
        for (let k = 0; k < layers[i - 1]; k++) {
          nodeWeights.push(Math.random() * 2 * limit - limit);
        }
        layerWeights.push(nodeWeights);
        layerBiases.push(0); // Biases initialized to 0 is common with Xavier
      }
      this.weights.push(layerWeights);
      this.biases.push(layerBiases);
    }
  }

  toggleNode(layerIdx: number, nodeIdx: number) {
    const key = `${layerIdx}-${nodeIdx}`;
    if (this.disabledNodes.has(key)) {
      this.disabledNodes.delete(key);
    } else {
      this.disabledNodes.add(key);
    }
  }

  forward(input: number[]): number[][] {
    const results: number[][] = [input];
    let current = input;

    for (let i = 0; i < this.weights.length; i++) {
      const next: number[] = [];
      const layerIdx = i + 1;
      for (let j = 0; j < this.weights[i].length; j++) {
        if (this.disabledNodes.has(`${layerIdx}-${j}`)) {
          next.push(0);
          continue;
        }
        let sum = this.biases[i][j];
        for (let k = 0; k < this.weights[i][j].length; k++) {
          sum += current[k] * this.weights[i][j][k];
        }
        next.push(Activations[this.activations].output(sum));
      }
      results.push(next);
      current = next;
    }

    return results;
  }

  trainBatch(
    inputs: number[][],
    targets: number[][],
    learningRate: number,
    regularization: RegularizationType,
    regularizationRate: number
  ) {
    const batchSize = inputs.length;
    const weightGradients: number[][][] = this.weights.map(l => l.map(n => n.map(() => 0)));
    const biasGradients: number[][] = this.biases.map(l => l.map(() => 0));

    for (let b = 0; b < batchSize; b++) {
      const activations = this.forward(inputs[b]);
      const deltas: number[][] = [];

      // Output layer error
      const outputLayerIdx = this.layers.length - 1;
      const outputActivations = activations[outputLayerIdx];
      const outputDeltas: number[] = [];
      for (let i = 0; i < outputActivations.length; i++) {
        // Mean Squared Error derivative: (output - target) * activation_derivative
        const error = outputActivations[i] - targets[b][i];
        outputDeltas.push(error * Activations[this.activations].der(outputActivations[i]));
      }
      deltas.unshift(outputDeltas);

      // Backpropagate errors
      for (let i = this.weights.length - 1; i > 0; i--) {
        const layerDeltas: number[] = [];
        const nextDeltas = deltas[0];
        const currentActivations = activations[i];

        for (let j = 0; j < this.layers[i]; j++) {
          if (this.disabledNodes.has(`${i}-${j}`)) {
            layerDeltas.push(0);
            continue;
          }
          let error = 0;
          for (let k = 0; k < this.layers[i + 1]; k++) {
            error += nextDeltas[k] * this.weights[i][k][j];
          }
          layerDeltas.push(error * Activations[this.activations].der(currentActivations[j]));
        }
        deltas.unshift(layerDeltas);
      }

      // Accumulate gradients
      for (let i = 0; i < this.weights.length; i++) {
        for (let j = 0; j < this.weights[i].length; j++) {
          for (let k = 0; k < this.weights[i][j].length; k++) {
            weightGradients[i][j][k] += deltas[i][j] * activations[i][k];
          }
          biasGradients[i][j] += deltas[i][j];
        }
      }
    }

    // Update weights and biases
    for (let i = 0; i < this.weights.length; i++) {
      for (let j = 0; j < this.weights[i].length; j++) {
        for (let k = 0; k < this.weights[i][j].length; k++) {
          let regTerm = 0;
          if (regularization === 'l1') {
            regTerm = regularizationRate * (this.weights[i][j][k] > 0 ? 1 : -1);
          } else if (regularization === 'l2') {
            regTerm = regularizationRate * this.weights[i][j][k];
          }
          
          this.weights[i][j][k] -= (learningRate / batchSize) * (weightGradients[i][j][k] + regTerm);
        }
        this.biases[i][j] -= (learningRate / batchSize) * biasGradients[i][j];
      }
    }
  }
}
