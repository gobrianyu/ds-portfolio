import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  Plus, 
  Minus, 
  Settings2, 
  Activity, 
  Database,
  Box,
  Layers,
  Info
} from 'lucide-react';
import { 
  DatasetType, 
  ActivationType, 
  RegularizationType, 
  Point, 
  PlaygroundConfig 
} from './types';
import { 
  generateData, 
  NeuralNetwork, 
  shuffle 
} from './engine';
import { cn } from '../../lib/utils';
import * as d3 from 'd3';

const DATASETS: { type: DatasetType; label: string }[] = [
  { type: 'circles', label: 'Circles' },
  { type: 'xor', label: 'XOR' },
  { type: 'linear', label: 'Linear' },
];

const ACTIVATIONS: ActivationType[] = ['relu', 'tanh', 'linear'];
const REGULARIZATIONS: RegularizationType[] = ['none', 'l1', 'l2'];

export const TensorFlowPlayground: React.FC = () => {
  // --- State ---
  const [config, setConfig] = useState<PlaygroundConfig>({
    dataset: 'circles',
    noise: 0.1,
    trainTestSplit: 0.5,
    batchSize: 10,
    learningRate: 0.03,
    activation: 'tanh',
    regularization: 'none',
    regularizationRate: 0,
    hiddenLayers: [4, 2],
  });

  const [isPlaying, setIsPlaying] = useState(false);
  const [epoch, setEpoch] = useState(0);
  const [trainLoss, setTrainLoss] = useState(0);
  const [testLoss, setTestLoss] = useState(0);
  const [lossHistory, setLossHistory] = useState<{ train: number; test: number }[]>([]);
  const [data, setData] = useState<Point[]>([]);
  const [trainData, setTrainData] = useState<Point[]>([]);
  const [testData, setTestData] = useState<Point[]>([]);
  const [showTestData, setShowTestData] = useState(false);
  const [hoveredNode, setHoveredNode] = useState<{ lIdx: number; nIdx: number } | null>(null);
  const [lastActivations, setLastActivations] = useState<number[][] | null>(null);

  const [network, setNetwork] = useState<NeuralNetwork | null>(null);
  const networkRef = useRef<NeuralNetwork | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number | null>(null);

  // --- Initialization ---
  const initData = useCallback(() => {
    const allData = generateData(config.dataset, 500, config.noise);
    const shuffled = shuffle(allData);
    const splitIdx = Math.floor(shuffled.length * config.trainTestSplit);
    setData(allData);
    setTrainData(shuffled.slice(0, splitIdx));
    setTestData(shuffled.slice(splitIdx));
    setEpoch(0);
    setTrainLoss(0);
    setTestLoss(0);
  }, [config.dataset, config.noise, config.trainTestSplit]);

  const initNetwork = useCallback(() => {
    const layers = [2, ...config.hiddenLayers, 1];
    const newNetwork = new NeuralNetwork(layers, config.activation);
    networkRef.current = newNetwork;
    setNetwork(newNetwork);
    setEpoch(0);
    
    // Initialise lastActivations to match new architecture
    const lastInput = trainData[0] ? [trainData[0].x, trainData[0].y] : [0, 0];
    setLastActivations(newNetwork.forward(lastInput));
  }, [config.hiddenLayers, config.activation, trainData]);

  useEffect(() => {
    initData();
  }, [initData]);

  useEffect(() => {
    initNetwork();
  }, [initNetwork]);

  // --- Training Loop ---
  const trainStep = useCallback(() => {
    if (!networkRef.current || trainData.length === 0) return;

    const network = networkRef.current;
    const batchSize = config.batchSize;
    const shuffled = shuffle(trainData);

    for (let s = 0; s < 5; s++) { // Run 5 steps per frame for speed
      for (let i = 0; i < shuffled.length; i += batchSize) {
        const batch = shuffled.slice(i, i + batchSize);
        const inputs = batch.map(p => [p.x, p.y]);
        const targets = batch.map(p => [p.label]);
        network.trainBatch(
          inputs,
          targets,
          config.learningRate,
          config.regularization,
          config.regularizationRate
        );
      }
    }

    // Calculate Losses
    let totalTrainLoss = 0;
    trainData.forEach(p => {
      const out = network.forward([p.x, p.y]);
      const pred = out[out.length - 1][0];
      const target = p.label;
      totalTrainLoss += Math.pow(pred - target, 2);
    });
    setTrainLoss(totalTrainLoss / trainData.length);

    let totalTestLoss = 0;
    testData.forEach(p => {
      const out = network.forward([p.x, p.y]);
      const pred = out[out.length - 1][0];
      const target = p.label;
      totalTestLoss += Math.pow(pred - target, 2);
    });
    setTestLoss(totalTestLoss / testData.length);

    setLossHistory(prev => {
      const next = [...prev, { train: totalTrainLoss / trainData.length, test: totalTestLoss / testData.length }];
      if (next.length > 100) return next.slice(1);
      return next;
    });

    setEpoch(prev => prev + 1);
    const lastInput = trainData[0] ? [trainData[0].x, trainData[0].y] : [0, 0];
    setLastActivations(network.forward(lastInput));
    drawDecisionBoundary();
  }, [trainData, testData, config, hoveredNode]);

  const animate = useCallback(() => {
    if (isPlaying) {
      trainStep();
      requestRef.current = requestAnimationFrame(animate);
    }
  }, [isPlaying, trainStep]);

  useEffect(() => {
    if (isPlaying) {
      requestRef.current = requestAnimationFrame(animate);
    } else {
      if (requestRef.current !== null) cancelAnimationFrame(requestRef.current);
    }
    return () => {
      if (requestRef.current !== null) cancelAnimationFrame(requestRef.current);
    };
  }, [isPlaying, animate]);

  // --- Visualization ---
  const drawDecisionBoundary = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !networkRef.current) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const network = networkRef.current;

    const imageData = ctx.createImageData(width, height);
    const data = imageData.data;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const px = (x / width) * 2 - 1;
        const py = (y / height) * 2 - 1;
        const out = network.forward([px, py]);
        
        let pred = 0;
        if (hoveredNode && out[hoveredNode.lIdx] && out[hoveredNode.lIdx][hoveredNode.nIdx] !== undefined) {
          pred = out[hoveredNode.lIdx][hoveredNode.nIdx];
        } else {
          pred = out[out.length - 1][0];
        }

        // Map pred to color
        const val = pred;

        const idx = (y * width + x) * 4;
        if (val > 0) {
          data[idx] = 255 - Math.min(1, val) * 100;
          data[idx + 1] = 255 - Math.min(1, val) * 50;
          data[idx + 2] = 255;
        } else {
          data[idx] = 255;
          data[idx + 1] = 255 + Math.max(-1, val) * 50;
          data[idx + 2] = 255 + Math.max(-1, val) * 100;
        }
        data[idx + 3] = 255;
      }
    }
    ctx.putImageData(imageData, 0, 0);
  }, [hoveredNode]);

  useEffect(() => {
    drawDecisionBoundary();
  }, [drawDecisionBoundary, epoch]);

  // --- Handlers ---
  const updateConfig = (updates: Partial<PlaygroundConfig>) => {
    setConfig(prev => ({ ...prev, ...updates }));
    reset();
  };

  const togglePlay = () => setIsPlaying(!isPlaying);
  const reset = () => {
    setIsPlaying(false);
    setLossHistory([]);
    initNetwork();
    initData();
  };

  const addLayer = () => {
    if (config.hiddenLayers.length < 6) {
      updateConfig({ hiddenLayers: [...config.hiddenLayers, 4] });
    }
  };

  const removeLayer = () => {
    if (config.hiddenLayers.length > 0) {
      updateConfig({ hiddenLayers: config.hiddenLayers.slice(0, -1) });
    }
  };

  const updateLayerSize = (idx: number, delta: number) => {
    const newLayers = [...config.hiddenLayers];
    newLayers[idx] = Math.max(1, Math.min(8, newLayers[idx] + delta));
    updateConfig({ hiddenLayers: newLayers });
  };

  const toggleNode = (lIdx: number, nIdx: number) => {
    if (networkRef.current) {
      networkRef.current.toggleNode(lIdx, nIdx);
      drawDecisionBoundary();
      // Force re-render to update visualization
      setNetwork({ ...networkRef.current } as NeuralNetwork);
      const lastInput = trainData[0] ? [trainData[0].x, trainData[0].y] : [0, 0];
      setLastActivations(networkRef.current.forward(lastInput));
      setEpoch(e => e + 1); 
    }
  };

  return (
    <div className="w-[1200px] bg-card border border-border shadow-2xl flex flex-col relative overflow-hidden rounded-lg font-mono selection:bg-primary/30 text-foreground transition-colors min-h-[800px] tf-playground">
      <style>
        {`
          .tf-playground input[type="range"]::-webkit-slider-thumb {
            background: #8b5cf6 !important;
            box-shadow: 0 0 10px rgba(139, 92, 246, 0.5) !important;
          }
          .tf-playground input[type="range"]::-moz-range-thumb {
            background: #8b5cf6 !important;
            box-shadow: 0 0 10px rgba(139, 92, 246, 0.5) !important;
          }
        `}
      </style>
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-border bg-muted/50 shrink-0">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            <Box className="w-5 h-5 text-violet-500" />
            <h1 className="text-[15px] font-black uppercase tracking-[0.25em] text-foreground">TF_PLAYGROUND_V2.0</h1>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-3 py-1 bg-background border border-border rounded-sm">
            {isPlaying && (
              <div className="w-1.5 h-1.5 rounded-full bg-violet-500 animate-pulse mr-1" />
            )}
            <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">
              Epoch
            </span>
            <span className="text-[12px] font-black text-violet-500 ml-1">{epoch}</span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={togglePlay}
              className={cn(
                "flex items-center gap-2 px-4 py-1.5 rounded-sm font-bold text-[11px] uppercase tracking-widest transition-all border",
                isPlaying 
                  ? "bg-violet-600 border-violet-700/30 text-white hover:bg-violet-700" 
                  : "bg-violet-500 border-violet-500/30 text-white hover:bg-violet-500/90 shadow-[0_0_10px_rgba(139,92,246,0.2)]"
              )}
            >
              {isPlaying ? <Pause className="w-3 h-3 fill-current" /> : <Play className="w-3 h-3 fill-current" />}
              {isPlaying ? 'Pause' : (epoch > 0 ? 'Resume' : 'Train')}
            </button>
            <button 
              onClick={reset}
              className="flex items-center justify-center p-2 bg-muted hover:bg-muted/80 text-foreground rounded-sm transition-all border border-border"
              title="Reset"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <div className="flex-1 flex flex-row overflow-hidden">
        {/* Left Panel: Controls */}
        <aside className="w-80 border-r border-border bg-muted/30 p-6 space-y-6 overflow-y-auto custom-scrollbar shrink-0">
          {/* Dataset Selection */}
          <section className="space-y-3">
            <div className="flex items-center gap-2 opacity-60">
              <Database className="w-4 h-4 text-violet-500" />
              <h3 className="text-[10px] font-bold uppercase tracking-[0.15em]">Dataset</h3>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {DATASETS.map((ds) => (
                  <button
                    key={ds.type}
                    onClick={() => updateConfig({ dataset: ds.type })}
                    className={cn(
                      "flex flex-col items-center justify-center py-2 px-2 rounded-sm border transition-all gap-1",
                      config.dataset === ds.type
                        ? "bg-violet-500/10 border-violet-500 text-violet-500 shadow-[0_0_10px_rgba(139,92,246,0.1)]"
                        : "bg-background border-border text-muted-foreground hover:text-foreground hover:border-muted-foreground/50"
                    )}
                  >
                    <span className="text-[9px] font-black tracking-widest uppercase">{ds.label}</span>
                  </button>
              ))}
            </div>
          </section>

          {/* Hyperparameters */}
          <section className="space-y-4 pt-4 border-t border-border/50">
            <div className="flex items-center gap-2 opacity-60">
              <Settings2 className="w-4 h-4 text-violet-500" />
              <h3 className="text-[10px] font-bold uppercase tracking-[0.15em]">Hyperparameters</h3>
            </div>
 
              <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Noise</label>
                  <span className="text-[10px] font-bold text-violet-500">{(config.noise ?? 0).toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="0.5"
                  step="0.01"
                  value={config.noise}
                  onChange={(e) => updateConfig({ noise: parseFloat(e.target.value) })}
                  className="w-full h-1.5 bg-muted rounded-lg appearance-none cursor-pointer accent-violet-500"
                  style={{
                    background: `linear-gradient(to right, #8b5cf6 0%, #8b5cf6 ${(config.noise ?? 0) / 0.5 * 100}%, var(--muted) ${(config.noise ?? 0) / 0.5 * 100}%, var(--muted) 100%)`
                  }}
                />
              </div>
 
              <div className="space-y-2">
                <div className="flex justify-between">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Train/Test Split</label>
                  <span className="text-[10px] font-bold text-violet-500">{Math.round(config.trainTestSplit * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0.1"
                  max="0.9"
                  step="0.1"
                  value={config.trainTestSplit}
                  onChange={(e) => updateConfig({ trainTestSplit: parseFloat(e.target.value) })}
                  className="w-full h-1.5 bg-muted rounded-lg appearance-none cursor-pointer accent-violet-500"
                  style={{
                    background: `linear-gradient(to right, #8b5cf6 0%, #8b5cf6 ${(config.trainTestSplit - 0.1) / 0.8 * 100}%, var(--muted) ${(config.trainTestSplit - 0.1) / 0.8 * 100}%, var(--muted) 100%)`
                  }}
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Batch Size</label>
                <select
                  value={config.batchSize}
                  onChange={(e) => updateConfig({ batchSize: parseInt(e.target.value) })}
                  className="w-full bg-background border border-border rounded-sm px-2 py-1 text-[10px] font-bold focus:outline-none focus:border-violet-500"
                >
                  {[1, 5, 10, 20, 50].map(bs => (
                    <option key={bs} value={bs}>{bs}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Learning Rate</label>
                <select
                  value={config.learningRate}
                  onChange={(e) => updateConfig({ learningRate: parseFloat(e.target.value) })}
                  className="w-full bg-background border border-border rounded-sm px-2 py-1 text-[10px] font-bold focus:outline-none focus:border-violet-500"
                >
                  {[0.001, 0.003, 0.01, 0.03, 0.1, 0.3, 1, 3].map(lr => (
                    <option key={lr} value={lr}>{lr}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Activation</label>
                <div className="grid grid-cols-3 gap-1">
                  {ACTIVATIONS.map(act => (
                    <button
                      key={act}
                      onClick={() => updateConfig({ activation: act })}
                      className={cn(
                        "py-1 px-1 rounded-sm border text-[9px] font-black uppercase tracking-widest transition-all",
                        config.activation === act
                          ? "bg-violet-500/10 border-violet-500 text-violet-500"
                          : "bg-background border-border text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {act}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Regularization</label>
                <div className="grid grid-cols-3 gap-1">
                  {REGULARIZATIONS.map(reg => (
                    <button
                      key={reg}
                      onClick={() => updateConfig({ regularization: reg })}
                      className={cn(
                        "py-1 px-1 rounded-sm border text-[9px] font-black uppercase tracking-widest transition-all",
                        config.regularization === reg
                          ? "bg-violet-500/10 border-violet-500 text-violet-500"
                          : "bg-background border-border text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {reg}
                    </button>
                  ))}
                </div>
              </div>

              {config.regularization !== 'none' && (
                <div className="space-y-2">
                  <label className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Reg. Rate</label>
                  <select
                    value={config.regularizationRate}
                    onChange={(e) => updateConfig({ regularizationRate: parseFloat(e.target.value) })}
                    className="w-full bg-background border border-border rounded-sm px-2 py-1 text-[10px] font-bold focus:outline-none focus:border-violet-500"
                  >
                    {[0, 0.001, 0.003, 0.01, 0.03, 0.1, 0.3, 1, 3, 10].map(rate => (
                      <option key={rate} value={rate}>{rate}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </section>

          {/* Metrics */}
          <section className="space-y-4 pt-4 border-t border-border/50">
            <div className="flex items-center gap-2 opacity-60">
              <Activity className="w-4 h-4 text-violet-500" />
              <h3 className="text-[10px] font-bold uppercase tracking-[0.15em]">Metrics</h3>
            </div>
            
            <div className="h-24 w-full bg-background/50 border border-border rounded-sm relative overflow-hidden">
              <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 100 100">
                {lossHistory.length > 1 && (
                  <>
                    <path
                      d={`M ${lossHistory.map((h, i) => `${(i / (lossHistory.length - 1)) * 100},${100 - Math.min(100, h.train * 100)}`).join(' L ')}`}
                      fill="none"
                      stroke="#8b5cf6"
                      strokeOpacity="0.4"
                      strokeWidth="2"
                    />
                    <path
                      d={`M ${lossHistory.map((h, i) => `${(i / (lossHistory.length - 1)) * 100},${100 - Math.min(100, h.test * 100)}`).join(' L ')}`}
                      fill="none"
                      stroke="#8b5cf6"
                      strokeWidth="2"
                      strokeDasharray="2,2"
                    />
                  </>
                )}
              </svg>
              <div className="absolute top-1 left-1 flex gap-2">
                <div className="flex items-center gap-1">
                  <div className="w-2 h-0.5 bg-violet-500/40" />
                  <span className="text-[6px] font-bold uppercase text-muted-foreground">Train</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-2 h-0.5 bg-violet-500" />
                  <span className="text-[6px] font-bold uppercase text-muted-foreground">Test</span>
                </div>
              </div>
            </div>
 
            <div className="space-y-2">
              <div className="flex justify-between items-center bg-background/50 border border-border p-2 rounded-sm">
                <span className="text-[8px] font-bold uppercase text-muted-foreground">Train Loss</span>
                <span className="text-[10px] font-black text-violet-500/60">{epoch > 0 ? trainLoss.toFixed(4) : '--'}</span>
              </div>
              <div className="flex justify-between items-center bg-background/50 border border-border p-2 rounded-sm">
                <span className="text-[8px] font-bold uppercase text-muted-foreground">Test Loss</span>
                <span className="text-[10px] font-black text-violet-500">{epoch > 0 ? testLoss.toFixed(4) : '--'}</span>
              </div>
            </div>
          </section>
        </aside>

        {/* Main Content: Visualization */}
        <main className="flex-1 flex flex-col min-w-0 bg-background relative overflow-hidden">
          {/* Background Grid */}
          <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[linear-gradient(currentColor_1px,transparent_1px),linear-gradient(90deg,currentColor_1px,transparent_1px)] bg-[size:40px_40px] z-0" />

          <div className="flex-1 flex flex-col p-8 gap-4 relative z-10 overflow-hidden items-center justify-start">
            
            {/* Network Architecture Section (Full Width) */}
            <section className="w-full h-full flex flex-col gap-4 min-w-0 relative">
              <div className="flex items-center justify-between px-2">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-3 bg-background border border-border rounded-full px-4 py-1.5 shadow-sm">
                    <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Hidden Layers</span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={removeLayer}
                        className="p-1 bg-violet-500/10 border border-violet-500/30 rounded-full text-violet-500 hover:bg-violet-500/20 transition-colors"
                        title="Remove Hidden Layer"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="text-[12px] font-black text-violet-500 min-w-[1rem] text-center">{config.hiddenLayers.length}</span>
                      <button
                        onClick={addLayer}
                        className="p-1 bg-violet-500/10 border border-violet-500/30 rounded-full text-violet-500 hover:bg-violet-500/20 transition-colors"
                        title="Add Hidden Layer"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex-1 bg-muted/5 border border-border rounded-xl relative min-h-[500px] overflow-hidden group">
                <svg className="w-full h-full" viewBox="0 0 1100 600" preserveAspectRatio="xMidYMid meet">
                  <defs>
                    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                      <feGaussianBlur stdDeviation="2" result="blur" />
                      <feComposite in="SourceGraphic" in2="blur" operator="over" />
                    </filter>
                    <linearGradient id="guideGradient" x1="0" y1="0" x2="0" y2="600" gradientUnits="userSpaceOnUse">
                      <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0" />
                      <stop offset="15%" stopColor="#8b5cf6" stopOpacity="0.6" />
                      <stop offset="85%" stopColor="#8b5cf6" stopOpacity="0.6" />
                      <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0" />
                    </linearGradient>
                  </defs>

                  {/* Vertical Guide Lines */}
                    {network && network.layers.map((_, lIdx) => {
                      const layerCount = network.layers.length;
                      const paddingX = 120;
                      const availableWidth = 1100 - paddingX * 2;
                      const x = paddingX + (lIdx / (layerCount - 1)) * availableWidth;
                      return (
                        <line
                          key={`guide-${lIdx}`}
                          x1={x}
                          y1={0}
                          x2={x}
                          y2={600}
                          stroke="url(#guideGradient)"
                          strokeWidth="2.5"
                          strokeDasharray="8,8"
                          className="pointer-events-none"
                        />
                      );
                    })}

                  {/* Weights (Curved Paths) */}
                  {network && network.weights.map((layerWeights, lIdx) => {
                    const layerCount = network.layers.length;
                    const sourceCount = network.layers[lIdx];
                    const targetCount = network.layers[lIdx + 1];
                    
                    const paddingX = 120;
                    const paddingY = 80;
                    const availableWidth = 1100 - paddingX * 2;
                    const availableHeight = 600 - paddingY * 2;

                    const sourceX = paddingX + (lIdx / (layerCount - 1)) * availableWidth;
                    const targetX = paddingX + ((lIdx + 1) / (layerCount - 1)) * availableWidth;

                    return layerWeights.map((nodeWeights, tIdx) => {
                      return nodeWeights.map((weight, sIdx) => {
                        const sourceY = paddingY + ((sIdx + 0.5) / sourceCount) * availableHeight;
                        const targetY = paddingY + ((tIdx + 0.5) / targetCount) * availableHeight;
                        
                        const isSourceDisabled = network.disabledNodes.has(`${lIdx}-${sIdx}`);
                        const isTargetDisabled = network.disabledNodes.has(`${lIdx + 1}-${tIdx}`);

                        if (isSourceDisabled || isTargetDisabled) return null;

                        const midX = (sourceX + targetX) / 2;
                        const pathData = `M ${sourceX} ${sourceY} C ${midX} ${sourceY}, ${midX} ${targetY}, ${targetX} ${targetY}`;

                        return (
                        <path
                          key={`${lIdx}-${tIdx}-${sIdx}`}
                          d={pathData}
                          fill="none"
                          stroke={weight > 0 ? '#3b82f6' : '#ef4444'}
                          strokeWidth={2}
                          strokeOpacity={Math.abs(weight)}
                          strokeLinecap="round"
                          strokeDasharray={isPlaying ? "4,6" : "none"}
                          className={cn(
                            "transition-all duration-500",
                            isPlaying && "animate-[flow_20s_linear_infinite]"
                          )}
                          style={{
                            strokeDashoffset: isPlaying ? (weight > 0 ? -100 : 100) : 0
                          }}
                        />
                        );
                      });
                    });
                  })}

                  {/* Layer Controls & Labels */}
                  {network && network.layers.map((size, lIdx) => {
                    const layerCount = network.layers.length;
                    const paddingX = 120;
                    const availableWidth = 1100 - paddingX * 2;
                    const x = paddingX + (lIdx / (layerCount - 1)) * availableWidth;
                    
                    let label = "";
                    if (lIdx === 0) label = "Input";
                    else if (lIdx === layerCount - 1) label = "Output";
                    else label = `Hidden ${lIdx}`;

                    return (
                      <g key={`layer-ctrl-${lIdx}`}>
                        <text
                          x={x}
                          y={40}
                          textAnchor="middle"
                          className="text-[14px] font-black fill-muted-foreground uppercase tracking-widest opacity-80"
                        >
                          {label}
                        </text>
                        {lIdx > 0 && lIdx < layerCount - 1 && (
                          <foreignObject x={x - 40} y={50} width="80" height="40">
                            <div className="flex justify-center gap-2">
                              <button
                                onClick={() => updateLayerSize(lIdx - 1, -1)}
                                className="p-1.5 bg-violet-500/10 border border-violet-500/30 rounded-full text-violet-500 hover:bg-violet-500/20 transition-colors"
                              >
                                <Minus className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => updateLayerSize(lIdx - 1, 1)}
                                className="p-1.5 bg-violet-500/10 border border-violet-500/30 rounded-full text-violet-500 hover:bg-violet-500/20 transition-colors"
                              >
                                <Plus className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </foreignObject>
                        )}
                      </g>
                    );
                  })}

                  {/* Neurons */}
                  {network && network.layers.map((size, lIdx) => {
                    const layerCount = network.layers.length;
                    
                    const paddingX = 120;
                    const paddingY = 80;
                    const availableWidth = 1100 - paddingX * 2;
                    const availableHeight = 600 - paddingY * 2;

                    const x = paddingX + (lIdx / (layerCount - 1)) * availableWidth;
                    const isOutput = lIdx === layerCount - 1;

                    return Array.from({ length: size }).map((_, nIdx) => {
                      const y = paddingY + ((nIdx + 0.5) / size) * availableHeight;
                      const isInput = lIdx === 0;
                      const isDisabled = network.disabledNodes.has(`${lIdx}-${nIdx}`);
                      const activation = lastActivations?.[lIdx]?.[nIdx] ?? 0;

                      return (
                        <g 
                          key={`${lIdx}-${nIdx}`}
                          onClick={() => !isInput && toggleNode(lIdx, nIdx)}
                          onMouseEnter={() => setHoveredNode({ lIdx, nIdx })}
                          onMouseLeave={() => setHoveredNode(null)}
                          style={{ transformOrigin: 'center', transformBox: 'fill-box' }}
                          className={cn(
                            "cursor-pointer transition-all duration-300",
                            isDisabled ? "opacity-20 grayscale" : "opacity-100",
                            "hover:scale-110"
                          )}
                        >
                          {/* Neuron Outer Ring - Opaque background */}
                          <circle
                            cx={x}
                            cy={y}
                            r={isInput ? 20 : 18}
                            className={cn(
                              "stroke-background stroke-[3px] fill-background shadow-lg",
                              isInput ? "fill-background stroke-primary/50" : "fill-background stroke-border"
                            )}
                          />
                          {/* Neuron Core - Colored by activation */}
                          <circle
                            cx={x}
                            cy={y}
                            r={isInput ? 14 : 12}
                            fill={activation > 0 ? `rgba(59, 130, 246, ${Math.min(1, activation)})` : `rgba(239, 68, 68, ${Math.min(1, -activation)})`}
                            className="transition-colors duration-300 stroke-background/20 stroke-1"
                            filter={!isDisabled ? "url(#glow)" : ""}
                          />
                          {isInput && (
                            <text
                              x={x}
                              y={y}
                              dy=".35em"
                              textAnchor="middle"
                              className="text-[14px] font-black fill-foreground pointer-events-none select-none"
                            >
                              X{nIdx + 1}
                            </text>
                          )}
                          {!isInput && !isOutput && (
                            <text
                              x={x}
                              y={y + 30}
                              textAnchor="middle"
                              className="text-[12px] font-bold fill-muted-foreground pointer-events-none select-none opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              {activation.toFixed(2)}
                            </text>
                          )}
                          {isOutput && (
                            <circle
                              cx={x}
                              cy={y}
                              r={4}
                              className="fill-foreground/20 pointer-events-none"
                            />
                          )}
                        </g>
                      );
                    });
                  })}
                </svg>

                {/* Integrated Visualizer at Bottom Right */}
                <div className="absolute bottom-6 right-6 z-10 pointer-events-none">
                  <div className="flex flex-col gap-3 items-end">
                    <div className="w-[130px] h-[130px] sm:w-[180px] sm:h-[180px] relative bg-background/40 backdrop-blur-md border-2 border-border rounded-xl overflow-hidden shadow-2xl">
                      <canvas 
                        ref={canvasRef} 
                        width={200} 
                        height={200} 
                        className="absolute inset-0 w-full h-full image-pixelated opacity-60"
                      />
                      <svg className="absolute inset-0 w-full h-full">
                        {trainData.map((p, i) => (
                          <circle
                            key={`train-${i}`}
                            cx={`${(p.x + 1) * 50}%`}
                            cy={`${(p.y + 1) * 50}%`}
                            r={2.5}
                            className={cn(
                              "stroke-background stroke-[1px]",
                              p.label > 0 ? "fill-blue-500" : "fill-red-500"
                            )}
                          />
                        ))}
                        {showTestData && testData.map((p, i) => (
                          <circle
                            key={`test-${i}`}
                            cx={`${(p.x + 1) * 50}%`}
                            cy={`${(p.y + 1) * 50}%`}
                            r={2.5}
                            className={cn(
                              "stroke-background stroke-[1px] opacity-40",
                              p.label > 0 ? "fill-blue-500" : "fill-red-500"
                            )}
                          />
                        ))}
                      </svg>
                      <div className="absolute bottom-1 right-1 bg-background/80 px-1.5 py-0.5 rounded text-[6px] sm:text-[7px] font-black uppercase tracking-widest text-muted-foreground">
                        {hoveredNode ? `Node [${hoveredNode.lIdx}, ${hoveredNode.nIdx}]` : 'Output'}
                      </div>
                    </div>
                    
                    <label className="flex items-center gap-3 cursor-pointer group pointer-events-auto">
                      <input 
                        type="checkbox" 
                        checked={showTestData} 
                        onChange={(e) => setShowTestData(e.target.checked)}
                        className="w-2 h-2 sm:w-3 sm:h-3 rounded border-border bg-muted text-violet-500 focus:ring-violet-500"
                      />
                      <span className="text-[7px] sm:text-[8px] font-bold uppercase tracking-widest text-muted-foreground group-hover:text-foreground transition-colors">Show Test Data</span>
                    </label>
                  </div>
                </div>
              </div>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
};

export default TensorFlowPlayground;
