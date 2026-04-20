# Exactly-Once RPC System

## Overview
This project implements a robust Remote Procedure Call (RPC) system designed for unreliable networks. It provides **exactly-once** execution semantics, ensuring that commands sent from a client to a server are executed exactly one time, regardless of network failures, message duplication, or packet delay.

## Architecture
The system uses a client-server architecture with several key components:
- **Client Retries**: Clients use timers to detect message loss and automatically retransmit requests.
- **Sequence Tracking**: Every request is assigned a unique identifier (sequence number) to detect duplicates.
- **At-Most-Once (AMO) Layer**: The server wraps the application logic in a filtering layer that caches results of previous executions to avoid re-running non-idempotent operations.

## Core Features
- [x] **Sequence Number Tracking**: Maintains per-client state to identify repeated requests.
- [x] **Automatic Retransmissions**: Resilient to message drops using exponential backoff or fixed-rate retries.
- [x] **Server-Side Result Caching**: Stores the outcome of the most recent execution for each client.
- [x] **Timeout Handling**: Graceful recovery from network partitions and unresponsive nodes.
- [x] **Binary Serialisation**: Efficient data representation for network transit.

## Project Structure
- `RPCClient.java`: Manages the client-side lifecycle, including request numbering and retry logic.
- `RPCServer.java`: Handles incoming requests, duplicate detection, and result retrieval from the cache.
- `AMOApplication.java`: A wrapper for the actual application (e.g., a KV Store) that enforces the at-most-once property.

## Design Documentation
For a detailed explanation of the at-most-once semantics and retry logic, see the [Exactly-Once RPC Design Document](../../docs/rpc-system.md).

## Technologies
- Java 11+
- Apache Commons Lang
- Project Lombok
- Socket Programming / Network Stack
