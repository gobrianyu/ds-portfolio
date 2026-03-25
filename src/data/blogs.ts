export interface BlogPost {
  id: string;
  title: string;
  citation: string;
  preview: string;
  content: string;
  aiSummary: string;
  imageUrl: string;
  date: string;
}

export const blogPosts: BlogPost[] = [
  {
    id: "bigtable",
    title: "BigTable: A Distributed Storage System for Structured Data",
    citation: "Chang, F., et al. (2006). Bigtable: A distributed storage system for structured data. OSDI.",
    preview: "BigTable is a sparse, distributed, multi-dimensional sorted map designed to scale to petabytes of data across thousands of commodity servers.",
    content: "BigTable was developed at Google to handle massive amounts of data. It provides a simple data model that gives clients dynamic control over data layout and format. It uses the Google File System (GFS) for storage and Chubby for distributed lock management. The system is designed to be highly scalable and available, supporting applications like Google Search, Google Earth, and Google Finance.",
    aiSummary: "BigTable is Google's solution for massive structured data storage. It uses a multi-dimensional sorted map (Row, Column, Timestamp) and relies on GFS for persistence. Key innovations include SSTables, Memtables, and the use of Bloom filters for efficient lookups. It scales horizontally by splitting tables into 'Tablets' managed by a master and multiple tablet servers.",
    imageUrl: "https://picsum.photos/seed/bigtable-paper/800/600",
    date: "2024.03.15"
  },
  {
    id: "dynamo",
    title: "Dynamo: Amazon's Highly Available Key-value Store",
    citation: "DeCandia, G., et al. (2007). Dynamo: Amazon's highly available key-value store. SOSP.",
    preview: "Dynamo is a highly available key-value storage system that some of Amazon's core services use to provide an 'always-on' experience.",
    content: "Dynamo was built to address the need for a storage system that is always available, even in the face of network partitions or server failures. It uses a combination of techniques like consistent hashing, vector clocks, and Merkle trees to achieve high availability and eventual consistency. It is a leaderless system where any node can handle any request, prioritizing availability over strict consistency (AP in CAP theorem).",
    aiSummary: "Dynamo is a decentralized, highly available key-value store. It uses consistent hashing for data distribution, vector clocks for versioning and conflict resolution, and 'sloppy quorums' with hinted handoff to maintain availability during failures. It popularized the 'eventual consistency' model for high-scale web applications.",
    imageUrl: "https://picsum.photos/seed/dynamo-paper/800/600",
    date: "2024.03.10"
  },
  {
    id: "mapreduce",
    title: "MapReduce: Simplified Data Processing on Large Clusters",
    citation: "Dean, J., & Ghemawat, S. (2004). MapReduce: Simplified data processing on large clusters. OSDI.",
    preview: "MapReduce is a programming model and an associated implementation for processing and generating large data sets.",
    content: "MapReduce allows developers to write simple Map and Reduce functions while the underlying system handles the complexities of parallelization, fault tolerance, data distribution, and load balancing. It revolutionized big data processing by enabling computations on thousands of machines with minimal effort from the programmer.",
    aiSummary: "MapReduce simplifies large-scale data processing by abstracting parallel computation into two primitives: Map (filtering/sorting) and Reduce (summary). The framework handles data partitioning, task scheduling, and machine failures. It relies on a 'moving computation to data' philosophy to minimize network overhead.",
    imageUrl: "https://picsum.photos/seed/mapreduce-paper/800/600",
    date: "2024.03.05"
  },
  {
    id: "spanner",
    title: "Spanner: Google's Globally-Distributed Database",
    citation: "Corbett, J. C., et al. (2012). Spanner: Google's globally-distributed database. OSDI.",
    preview: "Spanner is Google's scalable, multi-version, globally-distributed, and synchronously-replicated database.",
    content: "Spanner is the first system to distribute data at global scale and support externally-consistent distributed transactions. It uses a unique combination of Paxos replication and hardware-assisted time synchronization (TrueTime API) to provide strong consistency across data centers worldwide.",
    aiSummary: "Spanner is a global-scale database that provides external consistency (linearizability) for distributed transactions. Its 'killer feature' is TrueTime, which uses atomic clocks and GPS to bound clock uncertainty, allowing the system to assign globally meaningful timestamps and support consistent snapshots without global locking.",
    imageUrl: "https://picsum.photos/seed/spanner-paper/800/600",
    date: "2024.02.28"
  },
  {
    id: "raft",
    title: "In Search of an Understandable Consensus Algorithm",
    citation: "Ongaro, D., & Ousterhout, J. (2014). In search of an understandable consensus algorithm. USENIX ATC.",
    preview: "Raft is a consensus algorithm that is designed to be easy to understand, equivalent to Paxos in fault-tolerance and performance.",
    content: "Raft was developed as an alternative to Paxos, which is notoriously difficult to understand and implement. Raft decomposes the consensus problem into three subproblems: leader election, log replication, and safety. It uses a stronger form of leadership than Paxos to simplify log management.",
    aiSummary: "Raft is a consensus algorithm designed for understandability. It operates through a strong leader model: the leader handles all client requests and log replication. Key components include Term numbers, Heartbeats for leader election, and the 'Log Matching Property' to ensure consistency across the cluster.",
    imageUrl: "https://picsum.photos/seed/raft-paper/800/600",
    date: "2024.02.20"
  },
  {
    id: "gfs",
    title: "The Google File System",
    citation: "Ghemawat, S., et al. (2003). The Google file system. SOSP.",
    preview: "GFS is a scalable distributed file system for large distributed data-intensive applications.",
    content: "GFS was designed to run on clusters of commodity hardware and handle massive files. It prioritizes high aggregate throughput over low latency and is optimized for large sequential reads and appends. It uses a single master to manage metadata and multiple chunkservers to store data.",
    aiSummary: "GFS is a distributed file system optimized for Google's specific workloads (large files, sequential appends). It features a single Master for metadata and multiple Chunkservers for data. It uses 64MB chunks and triple replication for fault tolerance, sacrificing small-file performance for massive aggregate throughput.",
    imageUrl: "https://picsum.photos/seed/gfs-paper/800/600",
    date: "2024.02.15"
  }
];
