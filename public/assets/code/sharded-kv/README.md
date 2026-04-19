# Sharded Key-Value Store

## Overview
A scalable, high-performance distributed key-value store that implements **sharding** (horizontal partitioning) to distribute data across multiple replica groups. The system supports dynamic re-sharding, allowing shards to migrate between groups without downtime.

## Architecture
The system is divided into two hierarchical layers:
1. **Control Plane (Shard Master)**: A fault-tolerant group (running Multi-Paxos) that manages the mapping of shards to replica groups.
2. **Data Plane (Shard Groups)**: Multiple independent replica groups (each running Paxos) that store a subset of the total keyspace.

## Core Features
- [x] **Consistent Hashing**: Efficient key-to-shard mapping to balance load.
- [x] **Live Migration**: Ability to move shards between groups atomically during reconfiguration.
- [x] **Configuration Management**: A centralized, versioned configuration system.
- [x] **Linearisable Reads/Writes**: Strong consistency guarantees for all client operations.
- [x] **Two-Phase Commit (2PC)**: Support for cross-shard transactions when multi-key operations are required.

## Project Structure
- `ShardMaster.java`: The configuration manager. Decides which groups own which shards and manages group joins/leaves.
- `ShardStoreServer.java`: A data node that participates in a replica group, storing shards and handling migration.
- `ShardStoreClient.java`: A smart client that tracks configurations and routes requests to the correct replica groups.

## Technologies
- Java 11+
- Apache Commons Lang
- Project Lombok
- Sharding / Scalability
- Two-Phase Commit
- Multi-Paxos
    
