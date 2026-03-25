export interface Project {
  id: string;
  title: string;
  shortDescription: string;
  longDescription: string;
  architecture: string;
  features: string[];
  imageUrl: string;
  codeFiles: {
    filename: string;
    description: string;
    code: string;
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
    features: [
      "Sequence number tracking",
      "Automatic retransmissions",
      "Server-side result caching",
      "Timeout handling",
      "Custom binary serialization"
    ],
    codeFiles: [
      {
        filename: "RPCClient.java",
        description: "Client stub implementation managing sequence numbers and retries.",
        code: `public class RPCClient {
    private int nextSeq = 0;
    private final Connection conn;

    public Object call(String method, Object args) throws Exception {
        int seq = nextSeq++;
        while (true) {
            Request req = new Request(seq, method, args);
            conn.send(req);
            Response resp = conn.receive(timeout);
            if (resp != null && resp.getSeq() == seq) {
                return resp.getResult();
            }
            Thread.sleep(RETRY_INTERVAL);
        }
    }
}`
      },
      {
        filename: "RPCServer.java",
        description: "Server implementation with duplicate detection and result caching.",
        code: `public class RPCServer {
    private final Map<String, Map<Integer, Response>> cache = new HashMap<>();

    public Response handle(Request req) {
        synchronized (cache) {
            if (cache.containsKey(req.getClientId()) && 
                cache.get(req.getClientId()).containsKey(req.getSeq())) {
                return cache.get(req.getClientId()).get(req.getSeq());
            }
        }

        Object result = execute(req.getMethod(), req.getArgs());
        Response resp = new Response(req.getSeq(), result);

        synchronized (cache) {
            cache.computeIfAbsent(req.getClientId(), k -> new HashMap<>())
                 .put(req.getSeq(), resp);
        }
        return resp;
    }
}`
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
    features: [
      "View Service for membership management",
      "State transfer between primary and backup",
      "Heartbeat monitoring",
      "Client-side view caching",
      "Consistency under network partitions"
    ],
    codeFiles: [
      {
        filename: "ViewService.java",
        description: "Centralized service managing the current primary and backup.",
        code: `public class ViewService {
    private View currentView;

    public void tick() {
        synchronized (this) {
            if (currentView.getPrimary() != null && isDead(currentView.getPrimary())) {
                promoteBackup();
            }
            // Heartbeat monitoring logic
        }
    }
}`
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
    features: [
      "Leader election optimization",
      "Log compaction and snapshots",
      "Handling of network partitions",
      "Dynamic membership changes",
      "Efficient message passing"
    ],
    codeFiles: [
      {
        filename: "PaxosNode.java",
        description: "Core Paxos logic for proposing and accepting values.",
        code: `public class PaxosNode {
    public void propose(Object value) {
        while (!isDecided(instance)) {
            int n = chooseProposalNumber();
            if (sendPrepare(n)) {
                if (sendAccept(n, value)) {
                    sendDecide(value);
                }
            }
        }
    }
}`
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
    features: [
      "Consistent hashing for sharding",
      "Live data migration between shards",
      "Shard Master for configuration management",
      "Linearizable read/write operations",
      "Fault-tolerant replica groups"
    ],
    codeFiles: [
      {
        filename: "ShardMaster.java",
        description: "Controller for shard assignments and group membership.",
        code: `public class ShardMaster {
    public void join(Map<Integer, List<String>> groups) {
        Config newConfig = copyLastConfig();
        for (Map.Entry<Integer, List<String>> entry : groups.entrySet()) {
            newConfig.getGroups().put(entry.getKey(), entry.getValue());
        }
        rebalance(newConfig);
        configs.add(newConfig);
    }
}`
      }
    ],
    links: [
      { label: "GitHub Repository", url: "#" },
      { label: "System Design", url: "#" }
    ]
  }
];
