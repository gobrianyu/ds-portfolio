# Multi-Paxos Consensus Engine

## Overview
This project provides a complete implementation of the **Multi-Paxos** consensus algorithm. It enables a group of distributed nodes to agree on a total ordering of operations (a replicated log) even in the presence of unreliable networks, message drops, and partial node failures.

## Architecture
The implementation follows the classic Paxos roles (Proposer, Acceptor, Learner) with several optimisations for production use:
- **Leader Election**: A stable leader is elected to act as the primary proposer, reducing the number of message phases required for consecutive log entries.
- **Log Compaction**: Nodes can snapshot their local state and truncate old log entries to save storage and speed up recovery for laggy nodes.
- **Catch-up Mechanism**: New or recovering nodes can synchronised their state by requesting missing entries from peers.

## Core Features
- [x] **Leader Election**: Optimised consensus flow with a stable primary proposer.
- [x] **Log Compaction**: Support for state snapshots to manage unbounded log growth.
- [x] **Network Resiliency**: Resilience against network partitions and message reordering.
- [x] **Dynamic Membership**: Ability to change the set of servers in the consensus group.
- [x] **Efficient Messaging**: Minimal message overhead for high-throughput log agreement.

## Project Structure
- `PaxosServer.java`: The core consensus logic. Each server runs multiple instances of Paxos (one per log slot) to maintain the shared state.
- `PaxosClient.java`: The client interface that handles leader discovery and ensures linearisable request execution using AMO semantics.

## Design Documentation
For a detailed explanation of the protocol, node states, and failure analysis, see the [Multi-Paxos Design Document](../../docs/multi-paxos.md).

## Technologies
- Java 11+
- Apache Commons Lang
- Project Lombok
- Paxos / Consensus Algorithms
- Distributed Logs
    
