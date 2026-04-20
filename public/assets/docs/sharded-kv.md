# System 04: Sharded Key-Value Store
**Brian Yu**
**2026.02.26**

## Preface

### Goals
* Build a linearisable, fault-tolerant, sharded key/value (KV) storage system.
* Implement exactly-once (AMO) semantics for both single-key operations and cross-shard transactions.
* Ensure continuous progress despite server failures and network partitions through nested consensus.
* Guarantee correctness during dynamic reconfiguration, even with in-flight client operations.
* Optimise shard movement during rebalancing to minimise network overhead.
* Support atomic multi-shard transactions using a two-phase commit (2PC) protocol.

### Desired Fault Model
* Tolerates fail-stop crashes for a minority of nodes in any Paxos group (ShardMaster or Replica Group).
* Resilient to arbitrary network failures: delays, drops, duplication, and reordering.
* Handles concurrent reconfigurations and client operations without safety violations.
* Ensures transaction integrity despite participant failures or protocol retries.

### Challenges
* Maintaining global linearisability across asynchronous reconfigurations.
* Ensuring atomic shard handoff between donor and recipient groups without losing AMO metadata.
* Coordinating distributed transactions spanning multiple independent replica groups.
* Preventing deadlocks and inconsistent partial commits in a distributed environment.
* Balancing system throughput with the overhead of multi-level consensus (Paxos + 2PC).

### Assumptions
* A majority of nodes in each Paxos group remain functional and communicative.
* Nodes exhibit fail-stop behavior only; no Byzantine or malicious actions.
* The Paxos protocol implementation is assumed correct and eventually reaches progress.
* Reconfigurations are processed sequentially by each replica group.
* The underlying network eventually becomes stable enough for communication majorities to form.

## Protocol

### Kinds of Nodes
* **ShardStoreClient**: Proxies client requests. Maintains a cached configuration from the ShardMaster and routes requests to the appropriate replica group. Handles retries on 'Wrong Group' errors.
* **ShardStoreServer**: Member of a specific replica group. Runs a local Paxos instance to order all state-changing operations.
* **ShardMasterServer**: A replicated configuration service using Paxos to manage the global mapping of shards to replica groups. Supports Join, Leave, Move, and Query operations.

**Server Dynamic Roles:**
* **Donor**: Current owner preparing to transfer a shard to a new group.
* **Recipient**: Group waiting to install a shard during reconfiguration.
* **Coordinator**: The server responsible for driving a distributed transaction to completion.

### Distributed Transactions
* **Two-Phase Commit (2PC)**: Used to ensure atomicity across shards. Phases include Prepare (locking and reading) and Commit/Abort (writing and unlocking).
* **Locking**: Uses `readLocks` and `writeLocks` to ensure isolation. Transactions are blocked if they attempt to access keys locked by other active transactions.
* **Coordinator Role**: Deterministically elected (usually the group owning the lowest shard in the txn). Manages the lifecycle and retries of the transaction.

### Shard Management
* **Reconfiguration**: Triggered when a new configuration is queried from the ShardMaster. Groups voluntarily suspend serving shards that are moving.
* **Shard Transfer**: Donor groups send full application state and AMO history to recipient groups. Data is only serving by the recipient after a successful Paxos 'InstallShard' operation.

## Node States

### ShardStoreClient
* **Cached Config**: The latest `ShardConfig` known to the client. Used for routing requests.
* **Sequence Number**: Monotonically increasing ID to distinguish commands per client.
* **Pending Request**: The current in-flight RPC with metadata for retry logic.

### ShardStoreServer
* **Current Config**: The active `ShardConfig` this server is operating under.
* **Shards**: The set of shard IDs currently assigned to this replica group.
* **Reconfig in Progress**: Boolean flag that blocks certain operations during shard handoff to ensure safety.
* **Active Transactions**: A map of `TxnState` objects tracking progress, read sets, and buffered writes for in-flight transactions.
* **Locks**: Read and write lock maps ensuring transactional isolation at the key level.

### ShardMasterServer
* **Configurations**: A sequence of versioned mappings from Shard ID to Replica Group.
* **Group Metadata**: Information about server addresses for each replica group registered in the system.

## Messages

### Client & Reconfiguration
* **Request/Reply**: Standard KV or Transaction operations. Includes 'Wrong Group' failure responses.
* **Query Request/Reply**: Interaction with ShardMaster to fetch specific or latest configurations.
* **Shard Transfer**: Data migration message containing shard application state and AMO trackers.
* **Shard Transfer Ack**: Confirmation from recipient to donor, allowing the donor to safely delete the migrated data.

### Transactional (2PC)
* **PrepareTxn**: Sent by coordinator to participants. Triggers lock acquisition and local state capture.
* **PrepareTxnReply**: Sent by participants to coordinator. Includes success/failure flag and read values on success. Upon gathering all replies, the coordinator decides to Commit (if all success) or Abort (if any fail/timeout).
* **CommitTxn**: Sent if all participants prepared successfully. Commands the application of buffered writes and release of locks.
* **AbortTxn**: Sent if any prepare failed. Triggers lock release and cleanup of temporary transaction state.
* **Commit/Abort Ack**: Acknowledgements sent back to the coordinator to signal completion of the 2PC phase.

## Correctness / Liveness Analysis

| Message | Failure | Handling |
| :--- | :--- | :--- |
| **Request** | Late / Lost | Client retries with same sequence number; AMO layer deduplicates. |
| **Shard Transfer** | Network Drop | Donor retries sending periodically until Ack is received. |
| **PrepareTxn** | Lost / Delay | Coordinator retries via timer to ensure all participants are reached. |
| **PrepareTxn** | Duplicate | Participants use `txnId` to ensure idempotent lock acquisition. |
| **Decision** | Partial Commit | Prevented by 2PC atomic protocol; Paxos persists the decision across failures. |
| **Stale Messages** | Old Config | Messages include config numbers; recipients drop operations from mismatched views. |
| **Locks** | Participant Crash | Remaining majority in group maintains locks; recovery from Paxos log restores lock state. |

## Node Crash and Recovery

### ShardStoreClient
**Crash**: Client crashes are benign as they maintain no consensus state. Requests may be chosen or lost; retries after recovery are handled by the server's AMO layer.

**Reconnect**: Clients refresh their configuration cache upon 'Wrong Group' errors or periodically, allowing them to find the correct group post-repartition.

### ShardStoreServer
**Crash**: Safety is maintained as long as a majority of a group is alive. All shard ownership and KV state changes are logged in Paxos. On recovery, nodes replay the Paxos log to rebuild their application state, including active transaction locks.

**Transactions**: Ongoing transactions can be retried safely. 2PC ensures no partial commits occur because participants only apply changes after the coordinator decides 'Commit'. If a participant crashes during 'Prepare', the coordinator can eventually time out and abort unless the participant recovers.

### ShardMaster
**Crash**: Rebalancing and Join/Leave operations are persisted in the ShardMaster Paxos log. Replicas recover by replaying this log to reconstruct the configuration timeline.

**Safety**: The ShardMaster always converges to the latest configuration number, ensuring all healthy replica groups eventually see the same mapping.

## Network Partitions
Partitions are handled by the Paxos majority rule. Only the segment with a communicative majority can reach decisions, preventing split-brain scenarios in both the ShardMaster and Replica Groups. Shard transfers may be delayed if the network between majorities is severed, but periodic retries ensure eventual migration once connectivity is restored. Distributed transactions may stall (block) if the coordinator cannot reach a participant's majority, but atomicity is never violated as locks remain held until a majority-backed decision (Commit/Abort) is reached.

## Conclusion

### Goals Achieved
* **Linearisability**: All client operations are proposed through group-specific Paxos instances.
* **Atomic 2PC**: Multi-shard transactions are all-or-nothing, facilitated by synchronous locking.
* **Dynamic Rebalancing**: ShardMaster ensures deterministic and balanced shard distribution.
* **Fault Tolerance**: Nested majority-based consensus allows progress despite individual node failures.
* **Safety**: Shard handoff protocol ensures exactly one group serves a specific shard at any point in time.

### Limitations
* Requires a communicative majority in every involved group for continuous progress.
* Two-Phase Commit (2PC) is a blocking protocol; persistent failures in one group can stall global transactions.
* No tolerance for Byzantine (malicious) behavior in this model.
* Static group membership: adding or removing servers from an existing replica group is not supported.
* Significant coordination overhead due to the layers of consensus (Paxos within groups + 2PC across groups).
