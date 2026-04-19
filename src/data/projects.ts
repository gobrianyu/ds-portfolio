export interface Project {
  id: string;
  title: string;
  shortDescription: string;
  longDescription: string;
  architecture: string;
  features: string[];
  technologies: string[];
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
    id: "exactly-once rpc",
    title: "Exactly-Once RPC",
    shortDescription: "A robust Remote Procedure Call system ensuring exactly-once execution semantics.",
    longDescription: "This project implements a client-server key-value store that supports operations over an unreliable network. It uses exactly-once RPC semantics, ensuring commands are executed correctly despite message loss, duplication, or delay.",
    architecture: "The system uses a client-server architecture where clients send commands with unique identifiers and retry requests using timers to handle message loss. The server wraps the application in an at-most-once layer that tracks previously executed commands and returns cached results for duplicates.",
    designDocUrl: "/assets/docs/rpc-system.json",
    features: [
      "Sequence number tracking",
      "Automatic retransmissions",
      "Server-side result caching",
      "Timeout handling",
      "Binary serialisation"
    ],
    technologies: ["Java", "Apache Commons Lang", "Project Lombok", "Network"],
    codeFiles: [
      {
        filename: "RPCClient.java",
        description: "Client implementation managing sequence numbers and retries.",
        codeUrl: "/assets/code/rpc-system/RPCClient.java"
      },
      {
        filename: "RPCServer.java",
        description: "Server implementation with duplicate detection and result caching.",
        codeUrl: "/assets/code/rpc-system/RPCServer.java"
      },
      {
        filename: "AMOApplication.java",
        description: "At-most-once application guaranteeing exactly-once client execution.",
        codeUrl: "/assets/code/rpc-system/AMOApplication.java"
      }
    ],
    links: [
      { label: "GitHub Repository", url: "https://github.com/gobrianyu/ds-portfolio/tree/main/public/assets/code/rpc-system" }
    ]
  },
  {
    id: "primary-backup",
    title: "Primary-Backup",
    shortDescription: "A fault-tolerant system using primary-backup replication for high availability.",
    longDescription: "Implementation of a replicated state machine using a primary-backup approach. The system handles primary failures by promoting a backup and ensuring consistency through a view service.",
    architecture: "A centralised View Service monitors the health of servers. When the primary fails, the View Service promotes the backup and informs all clients of the new configuration.",
    designDocUrl: "/assets/docs/primary-backup.json",
    features: [
      "Membership management",
      "Primary-backup state transfer",
      "Heartbeat monitoring",
      "Client-side view caching"
    ],
    technologies: ["Java", "Apache Commons Lang", "Project Lombok", "Replication"],
    codeFiles: [
      {
        filename: "PBClient.java",
        description: "Client implementation for communicating with the replicated service.",
        codeUrl: "/assets/code/primary-backup/PBClient.java"
      },
      {
        filename: "PBServer.java",
        description: "Replicated key-value server implementing primary-backup logic.",
        codeUrl: "/assets/code/primary-backup/PBServer.java"
      },
      {
        filename: "ViewServer.java",
        description: "View Service for membership management and role assignment.",
        codeUrl: "/assets/code/primary-backup/ViewServer.java"
      }
    ],
    links: [
      { label: "GitHub Repository", url: "https://github.com/gobrianyu/ds-portfolio/tree/main/public/assets/code/primary-backup" }
    ]
  },
  {
    id: "multi-paxos",
    title: "Multi-Paxos",
    shortDescription: "A consensus-based replicated log using the Multi-Paxos protocol.",
    longDescription: "A complete implementation of the Multi-Paxos consensus algorithm to maintain a consistent log across multiple distributed nodes, even in the presence of failures.",
    architecture: "Nodes act as Proposers, Acceptors, and Learners. Multi-Paxos optimises the basic Paxos algorithm by electing a leader to handle multiple log entries with a single prepare phase.",
    designDocUrl: "/assets/docs/multi-paxos.json",
    features: [
      "Leader election optimisation",
      "Log compaction and snapshots",
      "Network partition handling",
      "Dynamic membership changes",
      "Efficient message passing"
    ],
    technologies: ["Java", "Apache Commons Lang", "Project Lombok", "Paxos Consensus"],
    codeFiles: [
      {
        filename: "PaxosClient.java",
        description: "Implements a multi-instance Paxos replicated state machine with leader election and log agreement.",
        codeUrl: "/assets/code/multi-paxos/PaxosClient.java"
      },
      {
        filename: "PaxosServer.java",
        description: "Sends commands to Paxos servers and ensures linearisable request execution with retries.",
        codeUrl: "/assets/code/multi-paxos/PaxosServer.java"
      }
    ],
    links: [
      { label: "GitHub Repository", url: "https://github.com/gobrianyu/ds-portfolio/tree/main/public/assets/code/multi-paxos" }
    ]
  },
  {
    id: "sharded-kv",
    title: "Sharded Key-Value Store",
    shortDescription: "A scalable, sharded key-value store with automatic data migration.",
    longDescription: "A distributed key-value store that partitions data across multiple replica groups. It supports dynamic re-sharding and ensures linearisability for all operations.",
    architecture: "A Shard Master manages the assignment of shards to replica groups. Each replica group uses Paxos to maintain consistency internally.",
    designDocUrl: "/assets/docs/sharded-kv.json",
    features: [
      "Consistent hashing",
      "Live data migration",
      "Configuration management",
      "Linearisable reads/writes",
      "Fault-tolerant replica groups"
    ],
    technologies: ["Java", "Apache Commons Lang", "Project Lombok", "Sharding"],
    codeFiles: [
      {
        filename: "ShardMaster.java",
        description: "Controller for shard assignments and group membership.",
        codeUrl: "/assets/code/sharded-kv/ShardMaster.java"
      },
      {
        filename: "ShardStoreClient.java",
        description: "Client that routes requests to shard groups and handles retries, configs, and transactions.",
        codeUrl: "/assets/code/sharded-kv/ShardStoreClient.java"
      },
      {
        filename: "ShardStoreServer.java",
        description: "Replica server implementing sharded KV storage with Paxos replication, reconfiguration, and 2PC transactions.",
        codeUrl: "/assets/code/sharded-kv/ShardStoreServer.java"
      }
    ],
    links: [
      { label: "GitHub Repository", url: "https://github.com/gobrianyu/ds-portfolio/tree/main/public/assets/code/sharded-kv" },
    ]
  }
];
