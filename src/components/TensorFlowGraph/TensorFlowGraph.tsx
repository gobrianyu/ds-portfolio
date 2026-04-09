import React, { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import ReactFlow, { 
  addEdge, 
  Background, 
  Controls, 
  Connection, 
  Edge, 
  Node, 
  ReactFlowProvider, 
  useNodesState, 
  useEdgesState, 
  Panel,
  MarkerType,
  ConnectionMode
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Layers } from 'lucide-react';

import { TFNode } from './Nodes/TFNode';
import { Toolbar } from './Toolbar';
import { InspectorPanel } from './InspectorPanel';
import { ExecutionControls } from './ExecutionControls';
import { OpType, Device, NodeData, ExecutionMode } from './types';
import { validateShapes, topologicalSort } from './engine';
import { generateId } from '../DynamoRing/utils'; // Reusing a simple ID generator

const nodeTypes = {
  tfNode: TFNode,
};

const defaultEdgeOptions = {
  style: { strokeWidth: 2, stroke: 'var(--muted-foreground)' },
  markerEnd: {
    type: MarkerType.ArrowClosed,
    color: 'var(--muted-foreground)',
  },
};

const INITIAL_NODES: Node<NodeData>[] = [
  {
    id: 'node-1',
    type: 'tfNode',
    position: { x: 100, y: 100 },
    data: { 
      label: 'Input_A', 
      opType: 'Placeholder', 
      device: 'CPU', 
      params: { shape: [32, 128] },
      status: 'idle',
      outputShape: [32, 128]
    },
  },
  {
    id: 'node-2',
    type: 'tfNode',
    position: { x: 100, y: 250 },
    data: { 
      label: 'Weights', 
      opType: 'Variable', 
      device: 'GPU:0', 
      params: { shape: [128, 64] },
      status: 'idle',
      outputShape: [128, 64]
    },
  },
  {
    id: 'node-3',
    type: 'tfNode',
    position: { x: 350, y: 175 },
    data: { 
      label: 'MatMul_1', 
      opType: 'MatMul', 
      device: 'GPU:0', 
      params: {},
      status: 'idle'
    },
  },
];

const INITIAL_EDGES: Edge[] = [
  { id: 'e1-3', source: 'node-1', target: 'node-3', ...defaultEdgeOptions },
  { id: 'e2-3', source: 'node-2', target: 'node-3', ...defaultEdgeOptions },
];

export const TensorFlowGraph: React.FC = () => {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState(INITIAL_NODES);
  const [edges, setEdges, onEdgesChange] = useEdgesState(INITIAL_EDGES);
  const [reactFlowInstance, setReactFlowInstance] = useState<any>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [executionStatus, setExecutionStatus] = useState<'idle' | 'running' | 'complete' | 'error'>('idle');
  const [executionProgress, setExecutionProgress] = useState(0);
  const [executionMode, setExecutionMode] = useState<ExecutionMode>('Run');
  const [executionOrder, setExecutionOrder] = useState<string[]>([]);
  const [currentStepIndex, setCurrentStepIndex] = useState(-1);

  // --- Graph Validation ---
  const validateGraph = useCallback(() => {
    const newNodes = nodes.map(node => {
      const incomingEdges = edges.filter(e => e.target === node.id);
      const inputShapes = incomingEdges.map(e => {
        const sourceNode = nodes.find(n => n.id === e.source);
        return sourceNode?.data.outputShape || [];
      });

      if (node.data.opType === 'Placeholder' || node.data.opType === 'Variable') {
        const shape = node.data.params.shape || [];
        return { ...node, data: { ...node.data, outputShape: shape, error: undefined } };
      }

      const { outputShape, error } = validateShapes(node.data.opType, inputShapes);
      return { ...node, data: { ...node.data, outputShape, error } };
    });

    if (JSON.stringify(newNodes) !== JSON.stringify(nodes)) {
      setNodes(newNodes);
    }
  }, [nodes, edges, setNodes]);

  useEffect(() => {
    validateGraph();
  }, [edges.length, nodes.length]); // Re-validate on structure change

  // --- Drag and Drop ---
  const onConnect = useCallback((params: Connection) => setEdges((eds) => addEdge({ ...params, ...defaultEdgeOptions }, eds)), [setEdges]);

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const reactFlowBounds = reactFlowWrapper.current?.getBoundingClientRect();
      const type = event.dataTransfer.getData('application/reactflow') as OpType;

      if (!type || !reactFlowBounds || !reactFlowInstance) return;

      const position = reactFlowInstance.project({
        x: event.clientX - reactFlowBounds.left,
        y: event.clientY - reactFlowBounds.top,
      });

      const newNode: Node<NodeData> = {
        id: `node-${generateId()}`,
        type: 'tfNode',
        position,
        data: { 
          label: `${type}_${nodes.length + 1}`, 
          opType: type, 
          device: 'CPU', 
          params: type === 'Placeholder' || type === 'Variable' ? { shape: [32, 32] } : {},
          status: 'idle'
        },
      };

      setNodes((nds) => nds.concat(newNode));
    },
    [reactFlowInstance, nodes.length, setNodes]
  );

  // --- Execution Logic ---
  const resetExecution = useCallback(() => {
    setNodes(nds => nds.map(n => ({ ...n, data: { ...n.data, status: 'idle' } })));
    setExecutionStatus('idle');
    setExecutionProgress(0);
    setCurrentStepIndex(-1);
    setExecutionOrder([]);
  }, [setNodes]);

  const runExecution = useCallback(async () => {
    try {
      resetExecution();
      setExecutionStatus('running');
      
      const order = topologicalSort(nodes, edges);
      setExecutionOrder(order);

      for (let i = 0; i < order.length; i++) {
        const nodeId = order[i];
        
        // Highlight current node
        setNodes(nds => nds.map(n => n.id === nodeId ? { ...n, data: { ...n.data, status: 'running' } } : n));
        setExecutionProgress((i + 1) / order.length);
        
        // Simulate computation delay
        await new Promise(resolve => setTimeout(resolve, 600));
        
        // Mark as complete
        setNodes(nds => nds.map(n => n.id === nodeId ? { ...n, data: { ...n.data, status: 'complete' } } : n));
      }

      setExecutionStatus('complete');
    } catch (err: any) {
      setExecutionStatus('error');
      // Could show global error here
    }
  }, [nodes, edges, setNodes, resetExecution]);

  const stepExecution = useCallback(async () => {
    if (executionStatus === 'complete' || executionStatus === 'error') return;

    let order = executionOrder;
    let nextIndex = currentStepIndex + 1;

    if (executionOrder.length === 0) {
      try {
        order = topologicalSort(nodes, edges);
        setExecutionOrder(order);
        setExecutionStatus('running');
      } catch (err) {
        setExecutionStatus('error');
        return;
      }
    }

    if (nextIndex < order.length) {
      const nodeId = order[nextIndex];
      
      // Mark previous as complete if any
      if (currentStepIndex >= 0) {
        const prevId = order[currentStepIndex];
        setNodes(nds => nds.map(n => n.id === prevId ? { ...n, data: { ...n.data, status: 'complete' } } : n));
      }

      // Highlight current
      setNodes(nds => nds.map(n => n.id === nodeId ? { ...n, data: { ...n.data, status: 'running' } } : n));
      setCurrentStepIndex(nextIndex);
      setExecutionProgress((nextIndex + 1) / order.length);

      if (nextIndex === order.length - 1) {
        // Last step
        setTimeout(() => {
          setNodes(nds => nds.map(n => n.id === nodeId ? { ...n, data: { ...n.data, status: 'complete' } } : n));
          setExecutionStatus('complete');
        }, 600);
      }
    }
  }, [nodes, edges, executionOrder, currentStepIndex, executionStatus, setNodes]);

  // --- Handlers ---
  const onNodeClick = useCallback((_: any, node: Node) => {
    setSelectedNodeId(node.id);
  }, []);

  const onPaneClick = useCallback(() => {
    setSelectedNodeId(null);
  }, []);

  const handleParamsChange = useCallback((id: string, params: Record<string, any>) => {
    setNodes(nds => nds.map(n => n.id === id ? { ...n, data: { ...n.data, params } } : n));
  }, [setNodes]);

  const handleDeviceChange = useCallback((id: string, device: Device) => {
    setNodes(nds => nds.map(n => n.id === id ? { ...n, data: { ...n.data, device } } : n));
  }, [setNodes]);

  const selectedNode = useMemo(() => {
    const node = nodes.find(n => n.id === selectedNodeId);
    return node ? { id: node.id, data: node.data } : null;
  }, [nodes, selectedNodeId]);

  return (
    <div className="w-full max-w-7xl mx-auto bg-card border border-border shadow-2xl flex flex-col relative overflow-hidden rounded-lg font-mono selection:bg-primary/30 text-foreground transition-colors h-[800px]">
      {/* Header */}
      <header className="flex items-center justify-between px-3 lg:px-6 py-2 lg:py-4 border-b border-border bg-muted/50 shrink-0">
        <div className="flex items-center gap-3 lg:gap-6">
          <div className="flex items-center gap-2 lg:gap-3">
            <Layers className="w-4 h-4 lg:w-5 lg:h-5 text-primary" />
            <h1 className="text-[11px] lg:text-[15px] font-black uppercase tracking-[0.2em] lg:tracking-[0.25em] text-foreground">TF_GRAPH_BUILDER_V1.0</h1>
          </div>
        </div>
        
        <div className="flex items-center gap-2 lg:gap-3">
          <div className="px-2 py-1 bg-primary/10 border border-primary/20 rounded-sm">
            <span className="text-[8px] lg:text-[10px] text-primary font-black uppercase tracking-widest">Static_Graph_Mode</span>
          </div>
        </div>
      </header>

      <Toolbar />

      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 relative" ref={reactFlowWrapper}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onInit={setReactFlowInstance}
            onDrop={onDrop}
            onDragOver={onDragOver}
            onNodeClick={onNodeClick}
            onPaneClick={onPaneClick}
            nodeTypes={nodeTypes}
            defaultEdgeOptions={defaultEdgeOptions}
            connectionMode={ConnectionMode.Loose}
            fitView
          >
            <Background color="var(--border)" gap={20} size={1} />
            <Controls />
            <Panel position="top-right" className="bg-card/80 backdrop-blur-md border border-border p-2 rounded-sm shadow-lg">
              <div className="flex flex-col gap-1">
                <span className="text-[8px] font-bold uppercase tracking-widest text-muted-foreground">Graph_Stats</span>
                <div className="flex gap-3">
                  <div className="flex flex-col">
                    <span className="text-[7px] text-muted-foreground uppercase">Nodes</span>
                    <span className="text-[10px] font-black">{nodes.length}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[7px] text-muted-foreground uppercase">Edges</span>
                    <span className="text-[10px] font-black">{edges.length}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[7px] text-muted-foreground uppercase">Errors</span>
                    <span className={nodes.some(n => n.data.error) ? "text-[10px] font-black text-destructive" : "text-[10px] font-black text-emerald-500"}>
                      {nodes.filter(n => n.data.error).length}
                    </span>
                  </div>
                </div>
              </div>
            </Panel>
          </ReactFlow>
        </div>

        <InspectorPanel 
          selectedNode={selectedNode}
          onParamsChange={handleParamsChange}
          onDeviceChange={handleDeviceChange}
        />
      </div>

      <ExecutionControls 
        mode={executionMode}
        onModeChange={setExecutionMode}
        onStep={stepExecution}
        onRun={runExecution}
        onReset={resetExecution}
        status={executionStatus}
        progress={executionProgress}
      />
    </div>
  );
};

export default function TensorFlowGraphWrapper() {
  return (
    <ReactFlowProvider>
      <TensorFlowGraph />
    </ReactFlowProvider>
  );
}
