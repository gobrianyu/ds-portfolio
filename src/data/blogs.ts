export interface BlogPost {
  id: string;
  title: string;
  citation: string;
  preview: string;
  overview: string;
  content: string;
  aiSummary: string;
  imageUrl: string;
  pdfUrl?: string;
  date: string;
  tags: string[];
}

export const blogPosts: BlogPost[] = [
  {
    id: "tensorflow",
    title: "TensorFlow: Large-Scale Machine Learning on Heterogeneous Distributed Systems",
    citation: "Abadi, M., et al. (2016). TensorFlow: Large-scale machine learning on heterogeneous distributed systems. OSDI.",
    pdfUrl: "https://www.usenix.org/system/files/conference/osdi16/osdi16-abadi.pdf",
    preview: "TensorFlow is an interface for expressing machine learning algorithms, and an implementation for executing such algorithms.",
    overview: "Exploring the design of TensorFlow, a system that represents computations as dataflow graphs to enable efficient execution across diverse hardware.",
    content: `One of the central design ideas in the TensorFlow paper is its **dataflow graph abstraction**, which serves as the core programming and execution model. In TensorFlow, computations are represented as directed graphs where nodes correspond to operations (e.g., matrix multiplication, convolution) and edges represent tensors (multi-dimensional data arrays) flowing between them. This abstraction decouples *what* computation is performed from *where* and *how* it is executed. The runtime system is then responsible for mapping this graph onto a heterogeneous set of devices, such as CPUs, GPUs, and distributed machines across a cluster.

A key benefit of this design is flexibility. Because the graph is static (in the original TensorFlow design), it allows the system to perform optimisations like scheduling and memory management ahead of execution. The runtime uses heuristics and cost models to decide which device should execute each operation, aiming to minimise communication overhead and maximise parallelism. Additionally, TensorFlow introduces the concept of sessions, which execute parts of the graph, enabling partial computation and reuse. This model allows developers to build complex machine learning pipelines while delegating the messy details of distributed execution to the framework itself.

What I found particularly interesting is the paper's implicit assumption that a static dataflow graph is the right abstraction for most machine learning workloads. This makes some sense: static graphs enable strong optimisation and are easier to distribute efficiently. But this assumption also feels a bit rigid. Frameworks like [PyTorch](https://pytorch.org/) gained massive popularity precisely because they embraced dynamic computation graphs, allowing developers to write code that feels more flexible and intuitive… *like regular Python*.

Static graphs can feel like programming with oven mitts on. You define everything upfront, hit “run,” and hope nothing breaks deep inside the graph. I've heard stories about debugging becoming a nightmare when errors don't surface where they originate. A colleague once tried to track down a shape mismatch in TensorFlow 1.x and later, defeated, moaned about “decoding ancient hieroglyphics.” In contrast, dynamic frameworks let you step through execution line by line, which is a huge productivity boost. So while TensorFlow's original design was elegant from a systems perspective, it arguably sacrificed developer ergonomic—a tradeoff that later versions had to correct.

Another angle worth exploring is how TensorFlow's design reflects assumptions about hardware heterogeneity and network costs. The system is built around the idea that computation is expensive and communication even more so, so careful placement of operations is critical. While this is still true, modern hardware like specialized accelerators (TPUs) have shifted the balance somewhat. It will be interesting to read about how [TensorFlow 2](https://www.tensorflow.org/guide/effective_tf2) iterates on its legacy predecessor.

TensorFlow's design is undeniably influential as it essentially defined how large-scale machine learning systems were built for years. The dataflow graph abstraction is powerful and enabled an impressive level of scalability. But like many systems optimised for performance at scale, it came with usability tradeoffs that became more apparent as the field matured. The evolution toward more dynamic and user-friendly frameworks suggests that while TensorFlow got the “systems” part very right, the “human” part needed iteration.`,
    aiSummary: "TensorFlow is a flexible, large-scale machine learning system designed for building and deploying dataflow-based computation graphs across heterogeneous environments. It represents computations as graphs of operations on tensors, enabling automatic differentiation, parallel execution, and deployment across CPUs, GPUs, and distributed systems. TensorFlow supports both research and production use cases, providing scalability and portability for training and serving machine learning models.",
    imageUrl: "https://picsum.photos/seed/tensorflow-paper/800/600",
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
    imageUrl: "https://picsum.photos/seed/mapreduce-paper/800/600",
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
    content: `The Bitcoin whitepaper introduced a solution to the **double-spending problem** using a peer-to-peer network. The core of the system is the **blockchain**, a distributed ledger that records all transactions. Consensus is achieved through **Proof-of-Work (PoW)**, where miners compete to solve complex mathematical puzzles to add new blocks to the chain.

Bitcoin's security relies on the assumption that the majority of the network's computing power is controlled by honest nodes. By linking blocks together using **cryptographic hashes**, the system makes it computationally expensive to alter past transactions. This creates a *trustless environment* where participants can transact directly without a central authority. The fixed supply of **21 million coins** and the halving mechanism are key economic components designed to prevent inflation.`,
    aiSummary: "Bitcoin is a decentralized digital currency system that enables peer-to-peer transactions without relying on a central authority. It introduces a distributed ledger called the blockchain, where transactions are grouped into blocks and secured using cryptographic hashing and a proof-of-work consensus mechanism. This design prevents double-spending and ensures trust through economic incentives, allowing a network of untrusted participants to agree on a consistent transaction history.",
    imageUrl: "https://picsum.photos/seed/bitcoin-paper/800/600",
    date: "2026.03.09",
    tags: ["Blockchain", "Cryptography", "Decentralisation"]
  },
  {
    id: "dynamo",
    title: "Dynamo: Amazon's Highly Available Key-value Store",
    citation: "DeCandia, G., et al. (2007). Dynamo: Amazon's highly available key-value store. SOSP.",
    pdfUrl: "https://www.allthingsdistributed.com/files/amazon-dynamo-sosp2007.pdf",
    preview: "Dynamo is a highly available key-value storage system that some of Amazon's core services use to provide an 'always-on' experience.",
    overview: "Exploring Amazon's decentralised key-value store that pioneered eventual consistency and consistent hashing for high availability.",
    content: `Dynamo was built to address the need for a storage system that is **always available**, even in the face of network partitions or server failures. It uses a combination of techniques like **consistent hashing**, **vector clocks**, and **Merkle trees** to achieve high availability and eventual consistency. 

A key innovation in Dynamo is the use of **virtual nodes (vnodes)** in its consistent hashing ring. This allows for better load balancing and easier scaling. When a node is added or removed, only a fraction of the keys need to be moved, minimizing the impact on the system. Dynamo prioritizes availability over strict consistency, making it an **AP system** in the [CAP theorem](https://en.wikipedia.org/wiki/CAP_theorem). This design choice was driven by the business requirement of *never losing a shopping cart addition*, even if it meant resolving conflicts later.`,
    aiSummary: "Amazon's Dynamo is a highly available, distributed key-value store designed to support always-on services like shopping carts. It prioritizes availability and partition tolerance over strong consistency, using techniques such as consistent hashing for data partitioning, replication across nodes, and versioning with vector clocks to reconcile conflicts. Dynamo embraces eventual consistency and employs decentralized coordination to remain operational even under failures.",
    imageUrl: "https://picsum.photos/seed/dynamo-paper/800/600",
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
    content: `The Google File System (GFS) was a **radical departure** from traditional file system design. It was built with the assumption that *component failures are the norm* rather than the exception. By using a single master to manage metadata and multiple chunkservers to store data, GFS achieved massive scale. Files are divided into fixed-size chunks of **64MB**, each identified by an immutable and globally unique 64-bit chunk handle.

One of the most interesting aspects of GFS is its **consistency model**. It was optimized for large sequential appends rather than random writes. This choice reflects the needs of Google's internal workloads, like the indexing of the web. The master maintains all file system metadata, including the namespace, access control information, and the mapping from files to chunks. To minimize the master's involvement in data transfers, clients cache chunk locations and communicate directly with chunkservers for data operations.`,
    aiSummary: "The Google File System (GFS) is a scalable distributed file system designed to store and process large data-intensive workloads across commodity hardware. It departs from traditional file system assumptions by optimizing for large sequential reads/writes, fault tolerance, and high throughput rather than low latency. GFS uses a master–chunkserver architecture, where data is split into large chunks and replicated across machines, enabling reliability and efficient parallel access despite frequent component failures.",
    imageUrl: "https://picsum.photos/seed/gfs-paper/800/600",
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
    content: `One notable aspect of Bigtable's design is how it locates the machine that stores a requested piece of data without relying on a single centralised directory. Instead, it divides each table into row range partitions called **tablets**, and each tablet is served by exactly one tablet server. To track them, the system uses a **distributed metadata service** that maps row ranges to tablet servers. Through this, locating a tablet requires only a small number of network steps. Additionally, clients cache tablet locations in practice so most requests go directly to the correct tablet server without repeatedly traversing the metadata. In summary, Bigtable spreads metadata across multiple servers, avoiding a central bottleneck and is a key design component that enables it to scale to thousands of machines.

One implicit technical assumption in the paper is that network transfers and reads from disk are the main performance bottlenecks. These seem to influence many of Bigtable's design choices such as **block caching**, **memtables**, and **Bloom filters**. When reading the paper, I noted the publish date of 2006 and could not help but wonder whether the improved SSDs and faster modern networks in 2026 would have any significant impact on the protocols and design choices made for the system if it were to be redesigned today. While I doubt the high-level architecture (i.e. tablets and metadata) would change fundamentally, perhaps shifts and fine-tuning of system parameters such as memory allocation to certain processes may be made. With cheaper random access, it may make sense to reduce read block sizes to avoid over-fetching data, as an example. Overall, core ideas would probably stay, but it is my opinion that the **cost model** may benefit from slight updates to optimise for newer hardware.`,
    aiSummary: "BigTable is a distributed storage system for managing structured data at massive scale, designed to power many of Google's core services. It organizes data into a sparse, multidimensional map indexed by row keys, column families, and timestamps, allowing efficient storage and retrieval of large datasets. Built on top of Google File System and using a distributed architecture with tablets and a master server, BigTable provides high scalability, performance, and fault tolerance for diverse applications.",
    imageUrl: "https://picsum.photos/seed/bigtable-paper/800/600",
    date: "2026.03.02",
    tags: ["Distributed Systems", "Storage", "Google"]
  }
];
