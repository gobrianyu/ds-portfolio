# Primary-Backup Replication System

## Overview
A fault-tolerant replicated service implementation using the **Primary-Backup** approach. This system ensures high availability by maintaining a consistent state across a primary server and its designated backup, overseen by a centralised monitoring service.

## Architecture
The system consists of three main roles:
1. **View Service**: The "Source of Truth" that monitors heartbeats from all servers and issues configurations (Views). It handles the promotion of a backup to primary if the original primary crashes.
2. **Primary Server**: Receives requests from clients, executes them locally, and synchronously forwards updates to the backup before replying.
3. **Backup Server**: Maintains a mirror of the primary's state, ready to take over as primary at any moment.

## Core Features
- [x] **Membership Management**: Dynamic tracking of live nodes via a View Server.
- [x] **State Transfer**: Initialise new backups by performing full state synchronisation from the active primary.
- [x] **Heartbeat Monitoring**: Failure detection through periodic liveness checks.
- [x] **Client-Side Caching**: Clients cache the current view to reduce load on the View Service while ensuring correctness.

## Project Structure
- `PBClient.java`: A smart client that handles view lookups and handles primary failures by re-querying the View Service.
- `PBServer.java`: Implements the replication protocol, handling state transfer and request forwarding.
- `ViewServer.java`: The control plane responsible for electing primaries/backups and monitoring node health.

## Technologies
- Java 11+
- Apache Commons Lang
- Project Lombok
- Replication Protocols
- Distributed State Machines
