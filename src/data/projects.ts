export interface Project {
  id: string;
  title: string;
  shortDescription: string;
  longDescription: string;
  architecture: string;
  features: string[];
  technologies: string[];
  imageUrl: string;
  designDocUrl?: string;
  codeFiles: {
    filename: string;
    description: string;
    codeUrl: string;
  }[];
  links: {
    label: string;
    url: string;
  }[];
}

export const projects: Project[] = [
  {
    id: "rpc-system",
    title: "Exactly-Once RPC Client-Server",
    shortDescription: "A robust Remote Procedure Call system ensuring exactly-once execution semantics.",
    longDescription: "This project implements a custom RPC framework that handles network failures, timeouts, and duplicate requests. It ensures that even in the face of retransmissions, the server executes each unique request exactly once.",
    architecture: "The system uses a client-side stub to manage sequence numbers and a server-side cache to store results of previous requests. If a duplicate sequence number is received, the cached result is returned without re-executing the logic.",
    imageUrl: "https://picsum.photos/seed/rpc-code/800/600",
    designDocUrl: "/assets/docs/rpc-system.json",
    features: [
      "Sequence number tracking",
      "Automatic retransmissions",
      "Server-side result caching",
      "Timeout handling",
      "Custom binary serialization"
    ],
    technologies: ["Java", "Distributed Systems", "Network Programming"],
    codeFiles: [
      {
        filename: "RPCClient.java",
        description: "Client stub implementation managing sequence numbers and retries.",
        codeUrl: "/assets/code/rpc-system/RPCClient.java"
      },
      {
        filename: "RPCServer.java",
        description: "Server implementation with duplicate detection and result caching.",
        codeUrl: "/assets/code/rpc-system/RPCServer.java"
      }
    ],
    links: [
      { label: "GitHub Repository", url: "#" },
      { label: "Design Doc", url: "#" }
    ]
  },
  {
    id: "primary-backup",
    title: "Primary-Backup System",
    shortDescription: "A fault-tolerant system using primary-backup replication for high availability.",
    longDescription: "Implementation of a replicated state machine using a primary-backup approach. The system handles primary failures by promoting a backup and ensuring consistency through a view service.",
    architecture: "A centralized View Service monitors the health of servers. When the primary fails, the View Service promotes the backup and informs all clients of the new configuration.",
    imageUrl: "https://picsum.photos/seed/replication-diag/800/600",
    designDocUrl: "/assets/docs/primary-backup.json",
    features: [
      "View Service for membership management",
      "State transfer between primary and backup",
      "Heartbeat monitoring",
      "Client-side view caching",
      "Consistency under network partitions"
    ],
    technologies: ["Java", "Replication", "Fault Tolerance"],
    codeFiles: [
      {
        filename: "ViewService.java",
        description: "Centralized service managing the current primary and backup.",
        codeUrl: "/assets/code/primary-backup/ViewService.java"
      }
    ],
    links: [
      { label: "GitHub Repository", url: "#" },
      { label: "Architecture Diagram", url: "#" }
    ]
  },
  {
    id: "multi-paxos",
    title: "Multi-Paxos Implementation",
    shortDescription: "A consensus-based replicated log using the Multi-Paxos protocol.",
    longDescription: "A complete implementation of the Multi-Paxos consensus algorithm to maintain a consistent log across multiple distributed nodes, even in the presence of failures.",
    architecture: "Nodes act as Proposers, Acceptors, and Learners. Multi-Paxos optimizes the basic Paxos algorithm by electing a leader to handle multiple log entries with a single prepare phase.",
    imageUrl: "https://picsum.photos/seed/consensus-paxos/800/600",
    designDocUrl: "/assets/docs/multi-paxos.json",
    features: [
      "Leader election optimization",
      "Log compaction and snapshots",
      "Handling of network partitions",
      "Dynamic membership changes",
      "Efficient message passing"
    ],
    technologies: ["Java", "Consensus Algorithms", "Paxos"],
    codeFiles: [
      {
        filename: "PaxosNode.java",
        description: "Core Paxos logic for proposing and accepting values.",
        codeUrl: "/assets/code/multi-paxos/PaxosNode.java"
      }
    ],
    links: [
      { label: "GitHub Repository", url: "#" },
      { label: "Paxos Paper", url: "https://lamport.azurewebsites.net/pubs/paxos-simple.pdf" }
    ]
  },
  {
    id: "sharded-kv",
    title: "Sharded Key-Value Store",
    shortDescription: "A scalable, sharded key-value store with automatic data migration.",
    longDescription: "A distributed key-value store that partitions data across multiple replica groups. It supports dynamic re-sharding and ensures linearizability for all operations.",
    architecture: "A Shard Master manages the assignment of shards to replica groups. Each replica group uses Paxos to maintain consistency internally.",
    imageUrl: "https://picsum.photos/seed/sharding-db/800/600",
    designDocUrl: "/assets/docs/sharded-kv.json",
    features: [
      "Consistent hashing for sharding",
      "Live data migration between shards",
      "Shard Master for configuration management",
      "Linearizable read/write operations",
      "Fault-tolerant replica groups"
    ],
    technologies: ["Java", "Sharding", "Scalability"],
    codeFiles: [
      {
        filename: "ShardMaster.java",
        description: "Controller for shard assignments and group membership.",
        codeUrl: "/assets/code/sharded-kv/ShardMaster.java"
      }
    ],
    links: [
      { label: "GitHub Repository", url: "#" },
      { label: "System Design", url: "#" }
    ]
  }
];
