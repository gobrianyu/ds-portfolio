# Brian S. Yu | Distributed Systems Portfolio

A high-performance, interactive portfolio showcasing implementations and simulations of foundational distributed systems concepts. This project serves as a technical deep-dive into the architectures that power modern cloud infrastructure, featuring real-time simulators for GFS, Bigtable, Dynamo, and more.

---

## Overview

This portfolio is designed for engineers and researchers interested in the "how" behind large-scale systems. Instead of static descriptions, it provides **interactive simulation environments** where users can inject failures, observe consensus protocols, and visualize data flow across distributed nodes.

### Core Focus Areas
- **Distributed Consensus:** Paxos, Sharded-KV, and multi-master synchronization.
- **Fault Tolerance:** Automated recovery, re-replication, and partition handling.
- **Scalability:** Consistent hashing, sharding, and load balancing.
- **High-Performance RPC:** Exactly-once semantics and binary protocol optimization.

---

## Interactive Simulators

The portfolio features several "System Modules" implemented as interactive React components:

### 1. GFS Failure Simulator
A real-time visualization of the Google File System (GFS).
- **Failure Injection:** Manually fail chunkservers to observe the Master's re-replication logic.
- **Auto-Recovery:** Configurable node recovery cycles (2-10s).
- **Visual Metrics:** Live telemetry for system availability and replication health.

### 2. Bigtable Read Path Explorer
Visualizes the multi-stage read path in Google's Bigtable.
- **Cache Layers:** Observe interactions between Memtable, Block Cache, and SSTables.
- **Bloom Filters:** Visual feedback on how Bloom filters prevent unnecessary disk I/O.

More in progress!

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
│   ├── GFSSimulator/      # GFS logic and visualization
│   ├── interactive/       # Reusable simulation primitives
│   ├── ui/                # Core design system components
│   └── Layout/            # Global navigation and shell
├── pages/
│   ├── Home.tsx           # Terminal-inspired landing page
│   ├── ProjectPage.tsx    # Detailed architecture deep-dives
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
