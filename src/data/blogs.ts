export interface BlogPost {
  id: string;
  title: string;
  citation: string;
  preview: string;
  overview: string;
  content: string;
  aiSummary: string;
  pdfUrl?: string;
  date: string;
  tags: string[];
}

export const blogPosts: BlogPost[] = [
  {
    id: "tensorflow",
    title: "TensorFlow: Large-Scale Machine Learning on Heterogeneous Distributed Systems",
    citation: "Abadi, M., et al. (2016). TensorFlow: Large-scale machine learning on heterogeneous distributed systems. OSDI.",
    pdfUrl: "https://www.tensorflow.org/extras/tensorflow-whitepaper2015.pdf",
    preview: "TensorFlow is an interface for expressing machine learning algorithms, and an implementation for executing such algorithms.",
    overview: "Exploring the design of TensorFlow, a system that represents computations as dataflow graphs to enable efficient execution across diverse hardware.",
    content: `One of the central design ideas in the TensorFlow paper is its **dataflow graph abstraction**, which serves as the core programming and execution model. In TensorFlow, computations are represented as directed graphs where nodes correspond to operations (e.g., matrix multiplication, convolution) and edges represent tensors (multi-dimensional data arrays) flowing between them. This abstraction decouples *what* computation is performed from *where* and *how* it is executed. The runtime system is then responsible for mapping this graph onto a heterogeneous set of devices, such as CPUs, GPUs, and distributed machines across a cluster.

A key benefit of this design is flexibility. Because the graph is static (in the original TensorFlow design), it allows the system to perform optimisations like scheduling and memory management ahead of execution. The runtime uses heuristics and cost models to decide which device should execute each operation, aiming to minimise communication overhead and maximise parallelism. Additionally, TensorFlow introduces the concept of sessions, which execute parts of the graph, enabling partial computation and reuse. This model allows developers to build complex machine learning pipelines while delegating the messy details of distributed execution to the framework itself.

What I found particularly interesting is the paper's implicit assumption that a static dataflow graph is the right abstraction for most machine learning workloads. This makes some sense: static graphs enable strong optimisation and are easier to distribute efficiently. But this assumption also feels a bit rigid. Frameworks like [PyTorch](https://pytorch.org/) gained massive popularity precisely because they embraced dynamic computation graphs, allowing developers to write code that feels more flexible and intuitive… like regular Python.

Static graphs can feel like programming with oven mitts on. You define everything upfront, hit “run,” and hope nothing breaks deep inside the graph. I've heard stories about debugging becoming a nightmare when errors don't surface where they originate. A colleague once tried to track down a shape mismatch in TensorFlow 1.x and later, defeated, moaned about “decoding ancient hieroglyphics.” In contrast, dynamic frameworks let you step through execution line by line, which is a huge productivity boost. So while TensorFlow's original design was elegant from a systems perspective, it arguably sacrificed developer ergonomic—a tradeoff that later versions had to correct.

Another angle worth exploring is how TensorFlow's design reflects assumptions about hardware heterogeneity and network costs. The system is built around the idea that computation is expensive and communication even more so, so careful placement of operations is critical. While this is still true, modern hardware like specialized accelerators (TPUs) have shifted the balance somewhat. It will be interesting to read about how [TensorFlow 2](https://www.tensorflow.org/guide/effective_tf2) iterates on its legacy predecessor.

TensorFlow's design is undeniably influential as it essentially defined how large-scale machine learning systems were built for years. The dataflow graph abstraction is powerful and enabled an impressive level of scalability. But like many systems optimised for performance at scale, it came with usability tradeoffs that became more apparent as the field matured. The evolution toward more dynamic and user-friendly frameworks suggests that while TensorFlow got the “systems” part very right, the “human” part needed iteration.`,
    aiSummary: "TensorFlow is a flexible, large-scale machine learning system designed for building and deploying dataflow-based computation graphs across heterogeneous environments. It represents computations as graphs of operations on tensors, enabling automatic differentiation, parallel execution, and deployment across CPUs, GPUs, and distributed systems. TensorFlow supports both research and production use cases, providing scalability and portability for training and serving machine learning models.",
    date: "2026.03.13",
    tags: ["Machine Learning", "Dataflow", "Distributed Systems"]
  },
  {
    id: "mapreduce",
    title: "MapReduce: Simplified Data Processing on Large Clusters",
    citation: "Dean, J., & Ghemawat, S. (2004). MapReduce: Simplified data processing on large clusters. OSDI.",
    pdfUrl: "https://static.googleusercontent.com/media/research.google.com/en//archive/mapreduce-osdi04.pdf",
    preview: "MapReduce is a programming model and an associated implementation for processing and generating large data sets.",
    overview: "A look at the programming model that democratized large-scale data processing by abstracting away the complexities of parallelization.",
    content: `The MapReduce paper tackles a simple but important problem: how to process massive datasets efficiently across thousands of unreliable machines without forcing developers to think about distributed systems. At the time, writing distributed programs required dealing with low-level concerns like fault tolerance, synchronisation, network communication, and more; basically everything you *don't* want to think about when your real goal is, say, counting words or indexing the web. This paper's goal is to abstract away this complexity by introducing a programming model where users only define two functions—map and reduce—while the system handles everything else.

This matters because data was (and still is) growing faster than single machines could handle. Google, in particular, needed a way to process web-scale datasets reliably and repeatedly. MapReduce's key insight is that many of these tasks can be expressed as transformations over key-value pairs. By constraining the programming model, the system gains the ability to automatically parallelise computation, distribute data, recover from failures, and optimise execution. TLDR; the paper reframes distributed computing from a systems problem into a programming model problem… and then solves it with a surprisingly small API surface.

If MapReduce were a person, it would be that one professor who explains everything beautifully… but only within the scope of their syllabus. Step outside that scope and things get awkward fast. While the model is elegant, it's also rigid. Many real-world workloads like PageRank or modern machine learning training don't fit neatly into a single map, shuffle, reduce pipeline. You end up chaining multiple MapReduce jobs together, writing intermediate results to disk each time, which is about as efficient as running a marathon but stopping to take a nap every kilometre.

This limitation is exactly what led to the rise of systems like [Apache Spark](https://people.eecs.berkeley.edu/~matei/papers/2016/cacm_apache_spark.pdf), which essentially said: “What if we kept the spirit of MapReduce, but removed the constant disk I/O and supported iterative computation?” Spark's in-memory model and more flexible DAG execution made it dramatically faster for many workloads. This certainly feels like the natural evolution of MapReduce. Same core idea of distributed data processing, but less stubbornness.

That said, although [Martin Gorner declared MapReduce obsolete](https://jaxlondon.com/generative-ai-data/no-one-at-google-uses-mapreduce-anymore-cloud-dataflow-explained/), the mental model it introduced was an undeniably great contribution. Even today, when I think about processing large datasets, I instinctively break problems into “map-like” and “reduce-like” steps. It's kind of like learning recursion—it rewires how you think, even if you don't always use it directly.

MapReduce is one of those papers that feels almost too simple when you first read it, and then you realise how profound it actually is. By aggressively limiting the programming model, it unlocks massive scalability and fault tolerance almost for free. But that simplicity is also its biggest constraint, which later systems had to work around. In a way, MapReduce defined a new layer of abstraction that really shaped an entire generation of distributed systems.`,
    aiSummary: "MapReduce is a programming model and execution framework for processing large datasets in a distributed and parallel manner. It abstracts computation into two functions—map and reduce—allowing developers to focus on data transformations while the system handles task distribution, fault tolerance, and data shuffling. By automatically parallelizing workloads across clusters of machines, MapReduce enables scalable and efficient large-scale data processing.",
    date: "2026.03.11",
    tags: ["Parallel Computing", "Big Data", "Google"]
  },
  {
    id: "bitcoin",
    title: "Bitcoin: A Peer-to-Peer Electronic Cash System",
    citation: "Nakamoto, S. (2008). Bitcoin: A peer-to-peer electronic cash system.",
    pdfUrl: "https://bitcoin.org/bitcoin.pdf",
    preview: "Bitcoin is a purely peer-to-peer version of electronic cash that allows online payments to be sent directly from one party to another without going through a financial institution.",
    overview: "Analysing the revolutionary whitepaper that introduced the blockchain, proof-of-work, and a decentralised consensus mechanism for digital currency.",
    content: `One of the most interesting aspects of Nakamoto's paper is its analysis of **security against double-spending attacks**. It models a scenario where an attacker controls a fraction of the network's computational power and attempts to reverse a transaction by secretly building a longer chain. Confirmations are defined as the number of blocks added after a transaction—this is the key variable that increases transaction security.

As the number of confirmations increases, the probability of a successful attack drops off exponentially, assuming the attacker controls less than 50% of the total hash power. Especially with a relatively small fraction of malicious power, the chance of catching up becomes negligible after just a few blocks. The conclusion is that Bitcoin achieves practical security not by making attacks impossible, but by making them computationally infeasible over time. This probabilistic guarantee replaces traditional trust models with a system where security emerges from economic and computational constraints rather than centralised authority.

One thing that the paper kind of speedruns past is the idea of proof-of-work. At a high level, proof-of-work requires miners to solve cryptographic puzzles: brute-force searching for a hash with certain properties. This process is intentionally expensive, which makes it hard for attackers to rewrite history because they would need to redo all that work faster than the rest of the network combined. It's like a global game of “guess the number,” except the guesses require real electricity and hardware, translating into real-world cost.

That said, this is also where my inner skeptic starts raising eyebrows. The entire security model hinges on the assumption that no single entity controls more than 50% of the network's computational power. But in practice, mining has become highly centralised due to economies of scale (think: massive mining pools and specialised hardware dominate the landscape). So while the math in the paper is clean and convincing, the real-world system might drift away from its original assumptions. It's a bit like designing a fair democracy and then watching lobbying groups quietly take over.

Another issue is the energy consumption. The paper frames proof-of-work as a necessary cost for decentralisation, but it doesn't fully grapple with how massive that cost could become. From a modern perspective, it's hard not to see proof-of-work as both brilliant and slightly unhinged—like solving trust with a global furnace. It works, but at a scale that feels increasingly hard to justify.

The Bitcoin paper is one of those rare pieces that launches an entire industry. Its evaluation of security through probabilistic guarantees is both elegant and surprisingly intuitive once you wrap your head around it. But the gap between the paper's assumptions and real-world deployment raises important questions about scalability, centralisation, and sustainability. Even so, the core idea that trust can emerge from computation and incentives rather than institutions is undeniably powerful, and it continues to influence systems far beyond cryptocurrency.`,
    aiSummary: "Bitcoin is a decentralized digital currency system that enables peer-to-peer transactions without relying on a central authority. It introduces a distributed ledger called the blockchain, where transactions are grouped into blocks and secured using cryptographic hashing and a proof-of-work consensus mechanism. This design prevents double-spending and ensures trust through economic incentives, allowing a network of untrusted participants to agree on a consistent transaction history.",
    date: "2026.03.09",
    tags: ["Blockchain", "Cryptography", "Decentralisation"]
  },
  {
    id: "dynamo",
    title: "Dynamo: Amazon's Highly Available Key-value Store",
    citation: "DeCandia, G., et al. (2007). Dynamo: Amazon's highly available key-value store. SOSP.",
    pdfUrl: "https://cdn.amazon.science/ac/1d/eb50c4064c538c8ac440ce6a1d91/dynamo-amazons-highly-available-key-value-store.pdf",
    preview: "Dynamo is a highly available key-value storage system that some of Amazon's core services use to provide an 'always-on' experience.",
    overview: "Exploring Amazon's decentralised key-value store that pioneered eventual consistency and consistent hashing for high availability.",
    content: `A central hypothesis in the Dynamo paper is that **prioritising availability over strong consistency leads to better real-world performance** for large-scale, user-facing systems, especially in environments where failures are common and unavoidable. Rather than enforcing strict consistency across replicas (which can introduce latency and unavailability during partitions), Dynamo embraces an *eventual consistency* model, allowing the system to continue serving reads and writes even when parts of the system are down or disconnected.

To support this hypothesis, the paper presents operational data from Amazon's production systems, showing that services built on Dynamo can maintain extremely high availability even during network partitions and node failures. The use of techniques like sloppy quorums and hinted handoff ensures that writes are rarely rejected, while vector clocks and application-level reconciliation allow inconsistencies to be resolved later. The evaluation shows that this design minimises downtime and keeps latency low. In the context of Amazon, this is critical for e-commerce applications where even small delays or failures can translate to lost revenue.

Dynamo feels like a direct philosophical rebellion against more traditional distributed systems, such as those built on strong consistency models (e.g. classic relational databases or even systems inspired by [Paxos-style consensus](https://paxos.systems/)). Those systems aim for a single, correct view of the data at all times. This sounds great in theory but its often painful in practice when networks misbehave… which they always do. Dynamo instead says, what if we just didn't do that…? Instead, it pushes the complexity of resolving conflicts to the application layer.

Compared to earlier systems, this is both radical and refreshingly pragmatic. Where traditional systems prioritise correctness first, Dynamo prioritises survivability. And honestly, for something like a shopping cart, that makes total sense. If I add an item to my cart and it disappears because of a consistency issue, that's annoying. But if the entire service goes down? That's catastrophic.

From an advocate perspective, Dynamo's greatest strength is how brutally honest it is about distributed systems: **failures are the norm, not the exception**. Instead of trying to eliminate it, Dynamo builds mechanisms to tolerate and recover from it gracefully. It shifts some responsibility to developers, particularly in handling conflict resolution, but does so in a way that keeps the system responsive under nearly all conditions.

A key piece of Dynamo's design that quietly enables much of this resilience is its use of a consistent hashing ring for data partitioning. Rather than assigning contiguous key ranges to nodes, Dynamo hashes both nodes and keys into the same circular space. Each key is stored on the first node clockwise from its hash position, along with replicas on subsequent nodes. This design ensures that when nodes join or leave the system, only a small fraction of keys need to be reassigned, avoiding large-scale data reshuffling.

Dynamo extends this idea with virtual nodes (vnodes), where each physical machine is responsible for multiple positions on the ring. This improves load balancing by spreading data more evenly across nodes, especially when hardware is heterogeneous. It also enhances fault tolerance: when a node fails, its responsibilities are distributed across many other nodes rather than concentrated in one place, preventing hotspots during recovery.

Here, the hash ring ties directly back to the paper's core hypothesis. By making data placement flexible and decentralized, Dynamo avoids single points of failure and adapts quickly to changing cluster conditions. A mechanism for maintaining availability under constant churn.

That said, Dynamo's design assumes that applications can tolerate and correctly resolve inconsistencies, which is not universally true. The system pushes complexity upward, requiring developers to merge conflicting versions using vector clocks. In practice, this can be tricky especially for applications with more complex invariants than something like a shopping cart. Not all data models are as forgiving, and mistakes in your reconciliation logic can lead to nightmare debugging issues.

The hash ring itself, while elegant, also introduces tradeoffs. For instance, while consistent hashing minimises data movement, it can still lead to uneven load if the hash distribution or workload is skewed. Virtual nodes mitigate this, but at the cost of increased metadata and overhead.

All in all, Dynamo is less about inventing entirely new mechanisms and more about combining existing ideas into a cohesive, availability-first philosophy. Its hypothesis of relaxed consistency has clearly influenced an entire generation of distributed systems. At the same time, Dynamo forces developers to confront the mess of distributed systems. From a more constructive perspective, Dynamo teaches the mindset that **staying alive is more important than being perfectly right**.`,
    aiSummary: "Amazon's Dynamo is a highly available, distributed key-value store designed to support always-on services like shopping carts. It prioritizes availability and partition tolerance over strong consistency, using techniques such as consistent hashing for data partitioning, replication across nodes, and versioning with vector clocks to reconcile conflicts. Dynamo embraces eventual consistency and employs decentralized coordination to remain operational even under failures.",
    date: "2026.03.06",
    tags: ["High Availability", "NoSQL", "Amazon"]
  },
  {
    id: "gfs",
    title: "The Google File System",
    citation: "Ghemawat, S., et al. (2003). The Google file system. SOSP.",
    pdfUrl: "https://static.googleusercontent.com/media/research.google.com/en//archive/gfs-sosp03.pdf",
    preview: "GFS is a scalable distributed file system for large distributed data-intensive applications.",
    overview: "Examining the architecture of GFS, designed to handle massive files on commodity hardware with high aggregate throughput and fault tolerance.",
    content: `One of the most defining aspects of the Google File System (GFS) is its chunk-based architecture combined with a single master design. Instead of treating files as continuous byte streams like traditional file systems, GFS splits files into large fixed-size chunks (64 MB if you're curious), each identified by a unique handle and stored across multiple chunkservers. A centralised master node maintains metadata such as the mapping from files to chunks, chunk locations, and access permissions, while the actual data is stored on distributed machines.

This design enables both scalability and fault tolerance. Clients interact with the master only to retrieve metadata, after which they communicate directly with chunkservers to read or write data. Writes are coordinated through a primary replica chosen by the master, which also serialises updates and ensures a consistent order of operations across replicas. This separation of control (master) and data (chunkservers) reduces bottlenecks while still maintaining a global view of the system. Additionally, replication across multiple chunkservers ensures durability, even in the presence of frequent hardware failures. The result is a system optimised specifically for large-scale, append-heavy data processing tasks.

What really stood out to me is how unapologetic GFS is with not serving as a general-purpose file system. It makes some very specific assumptions; files are huge and writes are mostly sequential appends. At first, this felt almost limiting… like designing a kitchen that only cooks rice. But the more I thought about it, the more it clicked—Google *only needed rice*, and they needed a lot of it, really fast.

This specialisation is GFS's biggest strength. By tailoring the system to its workload, it avoids the overhead and complexity of supporting unnecessary features. For example, the relaxed consistency model would be unacceptable in something like a banking system, but for log processing or indexing, it's perfectly fine. It's a great reminder that in systems design, “one size fits all” is often worse than “one size fits perfectly.”

Also, the idea of a single master initially sounded like a glaring bottleneck or single point of failure, but the paper argues that this is mitigated through replication and careful design. It's one of those things that made me instinctively nervous. In practice however, the mostly large streaming reads/writes workloads mean the master isn't on the critical path for most operations. This makes the design surprisingly robust.

On the flip side, GFS leaves open questions about how well its design generalises. For example, how would it handle workloads with heavy random reads and writes, or strict consistency requirements? The system's relaxed consistency model and append-optimised design suggest it might struggle in these scenarios.

Another open question is how the system evolves as hardware improves. GFS was designed in an era where failures were frequent and disks were slow. With modern SSDs and more reliable hardware, some of its tradeoffs might look different today. Could a more decentralised metadata system replace the single master? Or does the simplicity of that design still outweigh the potential scalability benefits of distributing metadata?

All in all, GFS is a masterclass in designing for your workload instead of designing for everything. Its chunk-based architecture, relaxed consistency, and centralised metadata management all stem from a deep understanding of the problems Google needed to solve. Reading this paper feels like watching someone ignore conventional wisdom and then absolutely nail the landing anyway. It's trying to be the *right* file system rather than the perfect one, and that distinction makes a big difference.`,
    aiSummary: "The Google File System (GFS) is a scalable distributed file system designed to store and process large data-intensive workloads across commodity hardware. It departs from traditional file system assumptions by optimizing for large sequential reads/writes, fault tolerance, and high throughput rather than low latency. GFS uses a master–chunkserver architecture, where data is split into large chunks and replicated across machines, enabling reliability and efficient parallel access despite frequent component failures.",
    date: "2026.03.04",
    tags: ["File Systems", "Scalability", "Google"]
  },
  {
    id: "bigtable",
    title: "BigTable: A Distributed Storage System for Structured Data",
    citation: "Chang, F., et al. (2006). Bigtable: A distributed storage system for structured data. OSDI.",
    pdfUrl: "https://static.googleusercontent.com/media/research.google.com/en//archive/bigtable-osdi06.pdf",
    preview: "BigTable is a sparse, distributed, multi-dimensional sorted map designed to scale to petabytes of data across thousands of commodity servers.",
    overview: "An in-depth analysis of Google's foundational distributed storage system, exploring its hierarchical metadata structure and the impact of modern hardware on its original design assumptions.",
    content: `The BigTable paper tackles the nightmare of storing and querying petabytes of structured data across thousands of commodity servers. This was a problem exploding at Google in the mid-2000s with apps like web indexing, Google Earth satellite imagery, and more. BigTable stepped in to alleviate the traditional databases choking on this scale.

One thing that initially felt a bit hand-wavy in the paper was the concept of **sparse, distributed, persistent multidimensional sorted maps**, which sounds impressive but also like something you'd say to win a buzzword bingo contest. Breaking it down, BigTable is essentially a map indexed by **(row key, column key, timestamp)**, where each value is just a byte array. The “sparse” part means that not every row has every column, which is actually super important for efficiency. Instead of storing tons of empty cells, Bigtable only stores what exists.

Its core design revolves around its tablet-based partitioning: each table splits into tablets, stored as immutable SSTables on [Google's File System](/blog/gfs) with a commit log for mutations. It consisted of a three-level hierarchy: root tablet (in Chubby lock service), METADATA tablets, and data tablets. The master handles assignments and load balancing while tabletservers serve reads/writes directly. This let clients locate any tablet fast without hammering a single master. SSTables stack in memory (memtables) and on disk, with Bloom filters and compression speeding scans, and compactions merging them to reclaim space and bound recovery time.

Understanding this made the design click for me. It's less like a rigid table and more like a giant **dictionary of dictionaries of dictionaries**. You can model wildly different kinds of data without changing the schema every other minute. From a programming languages perspective, it almost feels like BigTable is bringing the flexibility of something like a hash map into a distributed systems context. Just at a scale where your “map” spans thousands of machines and your bugs are now distributed too.

Figure 6 in the paper plots random read/write throughput versus tabletserver count, showing near-linear scalability: writes hit ~5K ops/sec per server at small scale, scaling to millions cluster-wide with minimal overhead from locality groups or compression. This demonstrates BigTable's hypothesis that a simple, shared-nothing architecture on GFS/Chubby can deliver high performance without custom hardware.

Despite its strengths, BigTable raises some interesting open questions. One is how well its data model balances flexibility with usability. While the sparse map abstraction is powerful, it also pushes a lot of responsibility onto developers to design good row keys and column families. Poor choices can lead to performance issues like hotspotting or inefficient scans. The system gives you a lot of freedom, but seemingly not a lot of guardrails.

Another open question is how BigTable compares to fully relational systems when it comes to complex queries. BigTable doesn't support joins or rich query languages, which means applications have to implement these features themselves if needed. This tradeoff is similar to what we saw in [Dynamo](/blog/dynamo), where we sacrifice higher-level abstractions for simplicity and scalability. The question here becomes where the right boundary between system responsibility and application responsibility lies.

Bigtable feels like a system that quietly redefined what a database could be. Its evaluation shows that it delivers on its promise of scalability and performance, but what's more interesting is how it changes the way developers think about structured data. It offers a flexible data model that can adapt to a wide range of use cases. At the same time, that flexibility comes with a cost: it's a powerful tool, but you have to know how to use it. Designing a good Bigtable schema likely feels more like planning a city; you need to think about layout, traffic, and growth ahead of time. And if you mess it up, well… enjoy your distributed traffic jam.`,
    aiSummary: "BigTable is a distributed storage system for managing structured data at massive scale, designed to power many of Google's core services. It organizes data into a sparse, multidimensional map indexed by row keys, column families, and timestamps, allowing efficient storage and retrieval of large datasets. Built on top of Google File System and using a distributed architecture with tablets and a master server, BigTable provides high scalability, performance, and fault tolerance for diverse applications.",
    date: "2026.03.02",
    tags: ["Distributed Systems", "Storage", "Google"]
  }
];
