# Brian S. Yu | Distributed Systems Portfolio

A high-performance, interactive portfolio showcasing implementations and simulations of foundational distributed systems concepts. This project serves as a technical deep-dive into the architectures that power modern cloud infrastructure, featuring real-time simulators for GFS, Bigtable, Dynamo, and more.

---

## Overview

This portfolio is designed for engineers and researchers interested in the "how" behind large-scale systems. Instead of static descriptions, it provides **interactive simulation environments** where users can inject failures, observe consensus protocols, and visualize data flow across distributed nodes.

### Core Focus Areas
- **Distributed Consensus:** Paxos, Sharded-KV, and multi-master synchronisation.
- **Fault Tolerance:** Automated recovery, re-replication, and partition handling.
- **Scalability:** Consistent hashing, sharding, and load balancing.
- **High-Performance RPC:** Exactly-once semantics and binary protocol optimisation.

---

## Interactive Simulators

The portfolio features several "System Modules" implemented as interactive React components, designed to visualise the internal mechanics of distributed protocols:

### 1. GFS Failure Simulator (`GFS_Failure_Sim_v1.3`)
A real-time visualisation of the Google File System (GFS) architecture.
- **Failure Injection:** Manually simulate chunkserver crashes to observe the Master's automated re-replication logic.
- **Auto-Recovery:** Monitor heartbeats and configurable node recovery cycles.
- **Visual Metrics:** Live telemetry for system availability, chunk distribution, and replication health.

### 2. Bigtable Read Path Explorer (`BigTable_Read_Path_v1.6`)
Visualises the multi-stage read path in Google's Bigtable storage engine.
- **Layered Caching:** Observe interaction between the Memtable (RAM), Block Cache, and immutable SSTables (Disk).
- **Bloom Filters:** Real-time feedback on how Bloom filters prune search space to prevent unnecessary disk I/O.
- **Compaction Logic:** Visual representations of how data transitions between different storage stages.

### 3. Dynamo Hash Ring Visualiser (`Dynamo_Ring_Sim_v1.7`)
An interactive demonstration of Amazon's Dynamo consistent hashing architecture.
- **Consistent Hashing:** Customises the hash ring to observe how keys are mapped to virtual nodes.
- **Membership Changes:** Adds or removes nodes to trigger automatic re-sharding and data migration.
- **Replication Strategy:** Visualises N-replication across clockwise neighbors in the preference list.

### 4. Bitcoin Mining Consensus Simulator (`Bitcoin_Consensus_Sim_v1.8`)
Simulates the Proof-of-Work (PoW) consensus mechanism used in the Bitcoin blockchain.
- **PoW Demonstration:** Real-time hashing visualizations showing nonce discovery and difficulty adjustments.
- **Chain Selection:** Observe the "longest chain" rule in action as multiple miners compete for the next block.
- **Fork Resolution:** Injects network latency to see how temporary forks resolve automatically through consensus.

### 5. MapReduce Task Scheduler (`MapReduce_Scheduler_v1.4`)
A simulation of the MapReduce framework's orchestration and execution lifecycle.
- **Job Partitioning:** Watch a job being decomposed into parallel Map and Reduce tasks.
- **Master Orchestration:** Observe how the Master node assigns tasks to idle workers based on locality.
- **Shuffle & Sort:** Visualises the intermediate data shuffle phase where data flows from Mappers to Reducers.

### 6. TensorFlow Playground (`TF_Playground_v1.6`)
A lightweight neural network visualiser inspired by the original TensorFlow playground.
- **Network Configuration:** Real-time architectural changes to layers, neuron counts, and activation functions.
- **Training Visuals:** Observe forward and backward passes with animated weight updates.
- **Loss Convergence:** Live plotting of the training loss curve as the model converges on pattern recognition.

---

## Tech Stack

- **Frontend:** [React 18+](https://reactjs.org/) with [TypeScript](https://www.typescriptlang.org/)
- **Build Tool:** [Vite](https://vitejs.dev/)
- **Styling:** [Tailwind CSS](https://tailwindcss.com/) (Utility-first, mobile-responsive)
- **Animations:** [Framer Motion](https://www.framer.com/motion/) (Physics-based UI transitions)
- **Icons:** [Lucide React](https://lucide.dev/)

---

## Architecture

The project follows a modular, component-based architecture optimized for performance and maintainability.

```text
src/
├── components/
│   ├── GFSSimulator/      # GFS logic and visualisation
│   ├── BigtableReadPath/  # Bigtable storage engine simulator
│   ├── DynamoRing/        # Consistent hashing simulator
│   ├── BitcoinSimulator/  # PoW consensus visualizer
│   ├── MapReduceScheduler/# Task orchestration simulation
│   ├── RigidWrapper.tsx   # Higher-level UI wrapper for widgets
│   ├── Layout.tsx         # Main application wrapper
│   └── Navbar.tsx         # Global navigation
├── pages/
│   ├── Home.tsx           # Terminal-inspired landing page
│   ├── ProjectListPage.tsx# Grid of system modules
│   ├── ProjectPage.tsx    # Detailed architecture deep-dives
│   ├── BlogListPage.tsx   # Index of research papers
│   └── BlogPage.tsx       # Research analysis and interactive logs
├── data/                  # Static project and blog metadata
└── context/               # Global state (Theme, Auth simulation)
```

---

## Getting Started

### Prerequisites
- Node.js (v18 or higher)
- npm

### Installation
1. Clone the repository:
   ```bash
   git clone https://github.com/gobrianyu/ds-portfolio.git
   ```
2. Install dependencies:
   ```bash
   npm install
   ```

### Development
Start the development server with HMR:
```bash
npm run dev
```

### Build
Generate a production-ready build in the `dist/` directory:
```bash
npm run build
```

---


## Contact

**Brian S. Yu**
Computer Science @ University of Washington
[gobrianyu@gmail.com](mailto:GoBrianYu@gmail.com)
