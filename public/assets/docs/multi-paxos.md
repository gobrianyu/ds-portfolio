# System 03: Multi-Paxos Consensus
**Brian Yu**
**2026.02.09**

## Preface

### Goals
* Build a replicated state machine that processes client commands using multi-instance Paxos while providing linearisability.
* Ensure all live servers execute commands in the same sequence.
* Continue to make progress as long as a majority of servers can communicate without reliance on a centralised view server such as in primary-backup.

### Desired fault model
* As long as a majority of nodes can communicate with each other, the system continues processing client requests.
* Handle temporary network failures, including network partitions, message drops, delays, duplication, and reordering.
* Tolerate leader failure or unavailability, with automatic leader replacement.
* Servers that fall behind due to failures or partitions should be able to catch up once back online.

### Challenges
* No longer a single trusted coordinator (view server from primary-backup) and replicas must agree on command ordering in a fully distributed manner.
* Servers may have inconsistent views of the system state due to network unreliability.
* Multiple servers may believe they are the leader simultaneously.
* Paxos log can grow without bound without proper garbage collection coordinated across servers.
* Must fill in log slots in the case of a leader crashing during an operation.

### Assumptions
* Crashed servers do not recover with persistent storage.
* Set of Paxos servers is fixed and known to all participants.
* Application executed by replicated state machine is deterministic.
* At any given time, a majority of nodes can function and communicate.
* Clients may resend requests and have at most one outstanding request at a time.
* Network eventually becomes reliable enough for a majority of servers to communicate with bounded delay.

## Protocol

### Kinds of nodes
* **PaxosClient**: A client that sends requests and waits for replies, retrying on timeout. Clients do not participate in consensus and do not maintain much protocol state. They do not change roles over time.
* **PaxosServer**: A server node that implements Paxos and the replicated state machine. Each PaxosServer plays three logical roles: (1) an acceptor that promises/accepts based on ballot numbers, (2) a proposer that may attempt to become leader and propose values, and (3) a replica that learns chosen values and executes them in order.

### PaxosServer Roles
* **Acceptor**: Maintains the promise (highest promised ballot) and accepted values per slot. It replies to Prepare (p1a) and Accept (p2a) messages following the Paxos protocol.
* **Proposer**: Can play two roles: leader (active proposer) or follower (inactive proposer). At start, all servers initiate Phase 1 to become the leader. Once a server is active, it proposes commands for slots via Phase 2 and drives values to be chosen by collecting majorities of p2b responses. The leader sends periodic heartbeats to other servers and coordinates log garbage collection and catch-up for lagging servers. Followers do not initiate Paxos rounds, respond to Paxos messages, and monitor for heartbeats to detect leader failure and potentially attempt leadership.
* **Replica**: Stores chosen decisions, executes them in increasing slot order, and produces client replies while deduplicating with at-most-once semantics.

## Node States

### PaxosClient
* **Sequence Number**
    * Type: Integer
    * Sequence number used to distinguish commands per client.
    * Initialisation: 0
    * Constraint(s): Monotonically increasing per client request.
* **Pending Request**
    * Type: Request (optional)
    * The current in-flight request with command awaiting a reply.
    * Initialisation: null
    * Constraint(s): At most one outstanding request at a time.

### PaxosServer
* **Application**
    * Type: Application (with at-most-once semantics)
    * Application interface for the server to interact with.
    * Initialisation: Application constructor call
    * Constraint(s): Present only once synced (below).
* **Servers**
    * Type: List<Address>
    * Fixed list of all Paxos servers.
    * Initialisation: Provided at construction.
    * Constraint(s): Immutable.
* **Active**
    * Type: Boolean
    * Whether this server currently believes it is the active leader.
    * Initialisation: false
    * Constraint(s): Set to true only after successful Phase 1. Set to false when preempted by a higher ballot.
* **Current Ballot**
    * Type: Ballot => {number: Integer, leader: Address}
    * Highest ballot this server has promised not to go below. Any P2A with a ballot lower than this is rejected. Relevant for acceptor and proposer roles.
    * Initialisation: (0, null)
    * Constraint(s): Monotonically increasing.
* **Log**
    * Type: Map<Integer, LogEntry> (LogEntry => {accepted ballot: Ballot, command: Command, decided: boolean})
    * Paxos state for each slot (for acceptor and learner).
    * Initialisation: Empty Map
    * Constraint(s): acceptedBallot only increases. Once decided is true, command never changes.
* **Slot In**
    * Type: Integer
    * Smallest slot index not yet promised by this leader.
    * Initialisation: 1
    * Constraint(s): Monotonically increasing.
* **Slot Out**
    * Type: Integer
    * Next slot to execute on the local state machine.
    * Initialisation: 1
    * Constraint(s): Monotonically increasing, executes in order.
* **P1 Responses**
    * Type: Map<Address, Message>
    * Prepare responses received for the current ballot.
    * Initialisation: Empty Map
    * Constraint(s): Cleared on new Phase 1 attempt.
* **P2 Responses**
    * Type: Map<Integer, Set<Address>>
    * Tracks accept acknowledgements per slot. Only meaningful while leader.
    * Initialisation: Empty Map
    * Constraint(s): Entry removed once slot is decided.
* **Missed Heartbeats**
    * Type: Integer
    * Counts consecutive missed leader heartbeats.
    * Initialisation: 0
    * Constraint(s): Reset on heartbeat receipt. Triggers leadership attempt after threshold.
* **Slot Out by Server**
    * Type: Map<Address, Integer>
    * Highest executed slot reported by each server.
    * Initialisation: All entries 0
    * Constraint(s): Monotonically increasing per server.

## Messages

### Request
* Source: PaxosClient
* Destination: PaxosServer
* Contents: Command Object => {command, sequence number, client address}
* When sent: Client issues a new command or ClientTimer fires. Spontaneous.
* Behaviour at destination:
    * If server has already executed, reply immediately with cached result.
    * Otherwise, if leader, queue command for proposal. If follower, ignore.

### Reply
* Source: PaxosServer
* Destination: PaxosClient
* Contents: Result Object => {result, sequence number, client address)
* When sent: When the command is chosen and executed, or immediately if deduplicated. Spontaneous.
* Behaviour at destination: Client matches reply to its pending request and completes; ignores duplicates and stale replies.

### Prepare Request (P1A)
* Source: PaxosServer (proposer attempting leadership)
* Destination: PaxosServer
* Contents: Ballot
* When sent: When attempting to become leader. Triggered by HeartbeatCheckTimer or startup. Spontaneous.
* Purpose: Ask acceptors to promise not to accept lower ballots.
* Behaviour at destination: If proposed ballot is greater than current ballot, update current ballot and reply with Prepare Reply. If currently leader and stepping down, set active to false. Otherwise ignore.

### Prepare Reply (P1B)
* Source: PaxosServer (acceptor)
* Destination: PaxosServer (proposer)
* Contents: Ballot, accepted/chosen values for log slots past GC point
* When sent: In response to a p1a message.
* Behaviour at destination: Records response. Once majority reached, becomes active leader, merges accepted values, and beings phase 2. Ignores if ballot does not match current leadership attempt.

### Accept Request (P2A)
* Source: PaxosServer when active leader
* Destination: PaxosServer (acceptors)
* Contents: Ballot, slot, command
* When sent: For new client commands and for re-proposing recovered values.
* Behaviour at destination: If ballot is greater than current ballot, accepts and records value and replies with accept reply. Otherwise ignore.

### Accept Reply (P2B)
* Source: PaxosServer (acceptor)
* Destination: PaxosServer (leader)
* Contents: Ballot, slot
* When sent: In response to accepted P2A.
* Purpose: Provide acknowledgements upon acceptance so the leader can detect a majority and declare a value chosen.
* Behaviour at destination:
    * If ballot does not match promised or the slot is already decided, no longer active leader (preempted), sets active to false and awaits sets HeartbeatCheckTimer.
    * Otherwise, count acknowledgements and if majority reached, mark slot as decided and send out Decision.

### Decision
* Source: PaxosServer (leader)
* Destination: PaxosServer
* Contents: slot, command
* When sent: When a slot becomes decided and periodically during catch-up.
* Purpose: Once a value is chosen, others must learn it.
* Behaviour at destination: Records decision and execute in order if possible. Ignored if slot is less than or equal to global cleared slot or if already decided.

### Heartbeat
* Source: PaxosServer (leader)
* Destination: PaxosServer (followers)
* Contents: ballot, global cleared slot
* When sent: Periodically via HeartbeatTimer.
* Purpose: Declare leader as live to followers. Triggers HeartbeatReply so the leader can learn follower execution progress (slot out).
* Behaviour at destination:
    * Updates known leader ballot, resets heartbeat miss counter, and performs GC up to global cleared slot.
    * Ignores if ballot is less than known leader ballot (stale/old leader).

### HeartbeatReply
* Source: PaxosServer (follower)
* Destination: PaxosServer (leader)
* Contents: slot out
* When sent: In response to Heartbeat.
* Behaviour at destination: Updates follower progress and trigger catch-up if relevant.

## Timers

### ClientTimer
* Set by: PaxosClient
* Contents: Sequence Number
* When set: When the client sends a Request. Reset on every resend.
* Behaviour on fire:
    * Resend the same Request to all PaxosServers.
    * Restart the timer.
* Purpose: Ensures progress despite message loss or server crashes.

### HeartbeatTimer
* Set by: PaxosServer when active leader
* Contents: Current ballot, leader address, global garbage-collection (GC) slot
* When set: When the server becomes active leader. Periodically thereafter.
* Behaviour on fire:
    * Broadcast Heartbeat messages to all servers.
    * Restart the timer unless preempted.
* Purpose: Stabilises leadership and shares GC information.

### HeartbeatCheckTimer
* Set by: PaxosServer when follower
* Contents: Expected leader address, ballot number
* When set: On startup and periodically thereafter.
* Behaviour on fire:
    * Increments missed heartbeat counter.
    * If 2 consecutive misses reached, attempts to become leader, starting phase 1 with higher ballot.
* Purpose: Detects leader failure.

### P1RetryTimer
* Set by: PaxosServer when attempting leadership
* Contents: Ballot number
* When set: When phase 1 begins.
* Behaviour on fire:
    * If phase 1 majority not reached, await one more cycle before restarting phase 1 with higher ballot. Another server may become leader in that cycle. Re-broadcast Prepare messages if still no active leader known.
* Purpose: Ensures progress under message loss.

### P2RetryTimer
* Set by: PaxosServer when proposing values as leader
* Contents: Ballot, log slot number, proposed command
* When set: After sending Accept (P2A) messages for a slot.
* Behaviour on fire: If decision majority not reached, re-send Accept messages for undecided slots.
* Purpose: Ensures decisions are complete despite dropped messages.

## Correctness/Liveness Analysis

| Message | Delay | Drop | Duplicate | Reorder |
| :--- | :--- | :--- | :--- | :--- |
| Request | Late arrival may be proposed in later slot. | Client retries / broadcasts. Command not executed without Paxos decision. | At-most-once semantics deduplicate. | Paxos slot order defines execution order. |
| Reply | Client waits or ignores stale reply. | Client retries request. | Client-side deduplication. | Client matches reply to request. |
| Prepare Request (P1A) | Stale prepare requests rejected by ballot check. | Leader retries or increases ballot. | Acceptor replies idempotently. | Ballots impose total order. |
| Prepare Reply (P1B) | Stale replies ignored. | Leader retries phase 1 until majority consensus. | Counted once per acceptor. | Leader considers only current ballot. |
| Accept Request (P2A) | Mismatched ballots are rejected. | Retry if no majority consensus. | Safe to re-accept same value. | Slot and ballot uniquely identify proposal. |
| Accept Reply (P2B) | Late replies ignored. | Retry if no majority. | Counted once. | Check old P2B’s are ignored or processed. |
| Heartbeat | Higher ballot overrides old leader. | Follower suspects leader failure and runs for election. | Idempotent. | Ballot ordering ignores stale heartbeat. |
| Heartbeat Reply | Slot out is monotonic. Stale replies are ignored. | Garbage collection delayed but Paxos continues. | Idempotent. | Leader uses max slot out. |
| Decision | Applied when prior slots are known. | Learned later via leader. | Decision is immutable. | Execution waits for slot continuity. |

## Node Crash and Recovery

### PaxosClient
**Crash:**
* [Correctness] Client crash cannot cause incorrect behaviour because clients do not participate in the Paxos agreement protocol. Commands are executed only after Paxos decides it and client-side state does not affect server-side safety. If a client crashes, its request may or may not be chosen; but either outcome is valid.
* [Liveness] Other clients continue unaffected. If the crashed client restarts, it may reissue requests safely due to AMO semantics, and receives the result if the command was already executed.

**Disappear and reconnect:**
* [Correctness] Client can continue to send messages to the server and get a response after the reconnection. The system continues to follow the requirements and is unaffected by the disappearance of the client.
* [Liveness] The system will be unaffected by the client disappearing. After the client reconnects, the system will still be able to process and reply to the client.

### PaxosServer
**Crash:**
* [Correctness] Paxos requires only a majority of servers and no single server is required to ensure safety. If a server crashes while acting as a leader or proposer, any incomplete phase 1 or 2 activity cannot result in a decision without a majority consensus, so no incorrect value can be chosen. If a server crashes as an acceptor, its state is effectively removed, but any values that was already chosen must have been accepted by a majority of acceptors, and future leaders will learn and preserve that value during phase 1. Learning and execution also occur only after decisions are reached, and execution order is enforced by log slot ordering. A conservative garbage collection protocol also ensures that a crash cannot cause loss of required log entries so no decided command is forgotten prematurely.
* [Liveness] The protocol remains live as long as a majority of servers are alive and can communicate long enough, regardless of which individual server crashes. If the leader crashes, followers detect missing heartbeats and elect a new leader using a higher ballot, allowing progress to resume. Acceptor crashes are tolerated provided a majority of servers are alive. Progress is not blocked since clients only require one replica in the majority to execute and respond.

**Disappear and reconnect:**
* [Correctness] Paxos requires only a majority of servers be able to send and receive messages at any specific time. If this server disappears and reconnects, as long as in between the disappearance and the reconnection a majority of servers are operating, this node will be able to update the log. When there are gaps in its logs, which it will notice by getting messages referencing some higher log number, it will ask other servers for these missing entries. It will then be able to know which ones are accepted if it receives a majority of replies.
* [Liveness] As long as a majority of servers are able to communicate with each other, the system is live, even if this node disappears.

## Network Partitions
Paxos remains correct and live during and after a network partition because safety depends only on majority consensus. At most one partition can contain a majority and only that partition can decide values, while minority partitions cannot form majority or choose conflicting values. Even if multiple leaders are suspected, acceptors enforce ballot ordering so no two servers ever decide different values for the same slot. Liveness is preserved because the majority partition can continue processing client commands independently and when the partition heals, isolated nodes catch up via heartbeats, decision, and phase 1 messages. Leaders adopt previously accepted or decided values, stale ballots are ignored, and log continuity is maintained. This ensures that progress resumes and all nodes eventually converge without violating safety.

## Conclusion

### Goals achieved
* Linearisability: each server executes commands strictly in a log order and only after they are decided by majority.
* Fault tolerance to server crashes. As long as a majority of nodes can communicate, the system is alive.
* Robustness to network failures. Even if a node is asleep and wakes up after a long time, it becomes synced due to log merging and messages being able to inform nodes of the current status.
* Anti split-brain logic. Even if two nodes think that they are the leader, the system remains consistent.

### Limitations
* The system is not always alive if too many nodes fail. A majority is required to guarantee progress.
* No recovery from permanent crashes.
* Fixed membership: set of servers is static. The protocol does not support adding or removing/dropping servers dynamically.
* Race conditions may occur, preventing the system from making progress.
