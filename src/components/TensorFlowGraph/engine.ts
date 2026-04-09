import { OpType, TensorShape, NodeData } from './types';

export function validateShapes(opType: OpType, inputShapes: TensorShape[]): { outputShape: TensorShape; error?: string } {
  if (inputShapes.some(s => s.length === 0)) {
    return { outputShape: [], error: 'Missing input shape' };
  }

  switch (opType) {
    case 'MatMul': {
      if (inputShapes.length !== 2) return { outputShape: [], error: 'MatMul requires 2 inputs' };
      const [a, b] = inputShapes;
      if (a.length !== 2 || b.length !== 2) return { outputShape: [], error: 'MatMul requires 2D tensors' };
      if (a[1] !== b[0]) return { outputShape: [], error: `Incompatible shapes for MatMul: [${a}] and [${b}]` };
      return { outputShape: [a[0], b[1]] };
    }
    case 'Add':
    case 'Multiply': {
      if (inputShapes.length !== 2) return { outputShape: [], error: `${opType} requires 2 inputs` };
      const [a, b] = inputShapes;
      if (JSON.stringify(a) !== JSON.stringify(b)) {
        // Simple broadcast check: same shape or one is scalar (not fully implementing TF broadcasting for simplicity)
        return { outputShape: [], error: `Incompatible shapes for ${opType}: [${a}] and [${b}]` };
      }
      return { outputShape: a };
    }
    case 'ReLU':
    case 'Softmax':
    case 'Assign': {
      if (inputShapes.length !== 1) return { outputShape: [], error: `${opType} requires 1 input` };
      return { outputShape: inputShapes[0] };
    }
    case 'Variable':
    case 'Placeholder': {
      // These usually have their shape defined by params
      return { outputShape: [] }; // Should be handled by node params
    }
    case 'Loss': {
      return { outputShape: [1] };
    }
    default:
      return { outputShape: [] };
  }
}

export function topologicalSort(nodes: any[], edges: any[]): string[] {
  const adjacencyList: Record<string, string[]> = {};
  const inDegree: Record<string, number> = {};
  const allNodeIds = nodes.map(n => n.id);

  allNodeIds.forEach(id => {
    adjacencyList[id] = [];
    inDegree[id] = 0;
  });

  edges.forEach(edge => {
    adjacencyList[edge.source].push(edge.target);
    inDegree[edge.target]++;
  });

  const queue: string[] = allNodeIds.filter(id => inDegree[id] === 0);
  const sorted: string[] = [];

  while (queue.length > 0) {
    const u = queue.shift()!;
    sorted.push(u);

    adjacencyList[u].forEach(v => {
      inDegree[v]--;
      if (inDegree[v] === 0) {
        queue.push(v);
      }
    });
  }

  if (sorted.length !== allNodeIds.length) {
    throw new Error('Cycle detected in graph');
  }

  return sorted;
}

export function getOpColor(opType: OpType): string {
  switch (opType) {
    case 'Add':
    case 'Multiply':
    case 'MatMul':
      return 'bg-blue-500';
    case 'ReLU':
    case 'Softmax':
      return 'bg-purple-500';
    case 'Variable':
    case 'Assign':
      return 'bg-amber-500';
    case 'Placeholder':
      return 'bg-emerald-500';
    case 'Loss':
      return 'bg-rose-500';
    default:
      return 'bg-slate-500';
  }
}

export function getDeviceBorder(device: string): string {
  switch (device) {
    case 'CPU':
      return 'border-slate-400';
    case 'GPU:0':
      return 'border-indigo-500';
    case 'GPU:1':
      return 'border-cyan-500';
    default:
      return 'border-slate-400';
  }
}
