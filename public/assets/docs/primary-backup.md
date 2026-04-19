# System 02: Primary-Backup Replication
**Brian S. Yu**
**2026.01.23**

## Preface
### Goals
*   Provide fault-tolerant linearisable service for client operations.
*   Provide exactly-once client-visible behavior via an at-most-once (AMO) wrapper.
*   Tolerate server crashes by maintaining a primary/backup configuration chosen by a view server.

### Desired Fault Model
*   Tolerates primary, backup, or idle server crashes.
*   Tolerates network drops, delays, duplication, and message reordering; liveness relies on retries and eventual successful communication.
*   Clients may continue issuing requests during failures; each client maintains at most one outstanding request at a time.
*   Protocol does not tolerate failures of the view server.

### Challenges
*   Ensuring a single active primary despite delays or lost messages from the view server.
*   Preventing split-brain behaviour where two servers believe they are primary.
*   Maintaining consistent state between primary and backup across failures and view changes.
*   Maintaining at-most-once execution under retries and message duplication.
*   Handling partially completed operations, e.g. when primary crashes after forwarding requests but before replying to the client.
*   Handling view changes safely.

### Assumptions
*   The view server does not crash and follows the specified protocol.
*   Clients and servers follow the protocol exactly (including retry logic and view caching rules).
*   The network will eventually deliver messages.
*   Each client has at most one outstanding request.
*   Timeouts and timers are reliable.

## Protocol
### Kinds of Nodes
*   **View Server**: Distinguished node that tracks which servers are alive and determines the current view.
*   **Server**: Node that stores application state and may act as either a primary, backup, or idle server.
*   **Client**: Node that submits requests to the service and awaits replies.

Each node is permanently of one kind, however server nodes may temporarily have one of the following roles, depending on the current view:\
 **>  Primary**: Executes client requests, forwards them to the backup, and replies to the clients.\
 **>  Backup**: Receives forwarded requests from the primary and executes them in the same order.\
 **>  Idle**: Servers that are alive but are neither the primary nor the backup in the current view.\
At most one server is the primary and one server is the backup in any given view.

### State at Each Kind of Node
#### View Server State
*   **Current View**: View (view number, primary Address, backup Address)
    *   The current view for clients and servers.
    *   Initialised to (0, null, null).
    *   View number is monotonically increasing.
    *   Primary cannot be null after startup of system and primary must be the previous view's primary or backup.
    *   Backup must be different from primary.
*   **Acked View Number**: Integer
    *   The view number last acknowledged by the primary server.
    *   Initialised to 0.
    *   Less than or equal to view number in Current View.
*   **Live Servers**: Set<Address>
    *   Address of all servers that have pinged the view server in the previous timer segment.
    *   Initialised to empty set.

#### Client State
*   **Current View**: View
    *   Current view that the client knows about.
    *   Initialised to 0.
    *   Updated on response from view server.
*   **Sequence Number**: Integer
    *   Monotonically increasing identifier for the next client request.
    *   Initialised to 0.
    *   Provides unique identifier per command for deduplication.
*   **Pending Command**: Command
    *   The command currently attempting execution for this client, if any.
    *   Must complete before client sends another.
*   **Pending Result**: Result
    *   The result corresponding to the current pending command, if already received.
    *   Cleared when consumed.
*   **Awaiting View Update**:
    *   Whether the client is retrying ViewRequest.

#### Server State
*   **Current View**: View
    *   Current view that the server knows about.
    *   Initialised to 0.
    *   Updated after ping response.
*   **Application**: AMOApplication
    *   Application interface with at-most-once semantics.
    *   Present only once synced (below).
    *   Initialised through Application constructor call.
*   **Synced View Number**: Integer
    *   Indicates whether the server view is synced (received full state transfer).
    *   Tracks latest view for which backup has received full state.
    *   Initialised to 0.
*   **Backup Synchronised**: Boolean
    *   Indicates whether backup is ready to process request.
    *   Initialised to false.
*   **In-Flight Request**: Request
    *   Single outstanding request.
    *   Initialised to null.
*   **In-Flight Client**:
    *   Client associated with the in-flight request.

## Messages
### Ping
*   **Source**: Server
*   **Destination**: View Server
*   **Contents**:
    *   Server Address: sender's address.
    *   View Number: current known view number.
*   **When Sent**:
    *   Sent periodically on PingTimer.
*   **Behaviour at View Server on Receipt**:
    *   View server records this server as live.
    *   If the server is primary, updates acknowledgement of view.
    *   Replies with a ViewReply.

### Request
*   **Source**: Client
*   **Destination**: Server
*   **Contents**: One AMOCommand containing:
    *   Client Address: sender's address.
    *   Command/Operation: application command to execute.
    *   Sequence Number: client's sequence number for this command.
    *   View Number: current known view number.
*   **When Sent**:
    *   When client sends to cached primary or primary forwards to backup.
*   **Behaviour at Server on Receipt**:
    *   If the server is not in the correct role for the view, reply with an error.
    *   Backup executes the request exactly once and sends acknowledgement to primary.
    *   Primary awaits backup acknowledgement before executing and replying to the client.

### Reply
*   **Source**: Server
*   **Destination**: Client
*   **Contents**:
    *   AMOResult containing the result from execution on application along with clientAddress and sequence identifiers.
    *   View Number: current known view number.
*   **When Sent**:
    *   Sent after executing command locally on server.
*   **Behaviour at Client on Receipt**:
    *   Primary executes the request and replies to the client on backup acknowledgement.
    *   Client matches reply to pending request and completes it.

### ViewRequest
*   **Source**: Client
*   **Destination**: View Server
*   **Contents**: none
*   **When Sent**:
    *   Sent on startup and on timeout at Client after receiving an error.
*   **Behaviour at View Server on Receipt**:
    *   Replies with a ViewReply.

### ViewReply
*   **Source**: View Server
*   **Destination**: Client
*   **Contents**:
    *   Current view, including view number, primary address, and backup address.
*   **When Sent**:
    *   In response to a ViewRequest or Ping.
*   **Behaviour at Client on Receipt**:
    *   Updates local view if newer.
    *   If a server learns it is the backup, awaits state transfer.
    *   If a server learns it is a primary and has an uninitialised backup, it initiates state transfer.

### StateTransfer
*   **Source**: Server (Primary)
*   **Destination**: Server (Backup)
*   **Contents**:
    *   View Number: current known view number.
    *   Application: full application state.
*   **When Sent**:
    *   On learning it is a primary from a ViewReply.
*   **Behaviour at Server on Receipt**:
    *   If newer view, replace application state and update synced view number.
    *   Respond with a StateTransferAck.

### StateTransferAck
*   **Source**: Server (Backup)
*   **Destination**: Server (Primary)
*   **Contents**:
    *   View Number: acknowledged view number.
*   **When Sent**:
    *   Sent by backup to primary in response to successful state transfer.
*   **Behaviour at Server on Receipt**:
    *   Marks backup as synced.
    *   Forwards pending requests.

## Timers
"**PingCheckTimer**: Resets on view server to detect failed servers and advance views based on primary acknowledgement rule.",
            "**PingTimer**: Resets on servers to send periodic heartbeats to view server.",
            "**ClientTimer**: Resets on client to retry pending requests after querying latest view from view server.",
            "**StateTransferTimer**: Resets state transfer until acknowledged."
### Client Timer
*   **Setter Node**: Client
*   **Contents**:
    *   Pending request info.
*   **When Set**:
    *   Immediately after sending a Request for a new pendingCommand.
    *   Reset after firing while there is a still a pending command corresponding to this sequence.
*   **Behaviour When Fired**:
    *   Compares the timer's sequence to the client's current pendingSequence.
    *   If there is no pending command or sequences do not match, the timer is considered stale and discarded (i.e. not reset).
    *   Otherwise, queries View Server for latest view before retrying request with newly cached primary.

### Ping Timer
*   **Setter Node**: Server
*   **Contents**: none
*   **When Set**:
    *   Immediately at startup and periodically resets on firing.
*   **Behaviour When Fired**:
    *   Sends Ping to View Server.

### Ping Check Timer
*   **Setter Node**: View Server
*   **Contents**: none
*   **When Set**:
    *   Immediately at startup and periodically resets on firing.
*   **Behaviour When Fired**:
    *   Determines which servers failed to Ping in the previous timer windows.
    *   Advances the view if allowed by acknowledgement rule if current Primary or Backup is deemed not live.

### State Transfer Timer
*   **Setter Node**: Server (Primary)
*   **Contents**:
    *   View Number: view number for which state transfer is being carried out.
*   **When Set**:
    *   On sending a StateTransfer to the current backup.
*   **Behaviour When Fired**:
    *   Retries state transfer until acknowledged by backup while view number matches.

## Correctness/Liveness Analysis
| Message | Delayed | Dropped | Duplicated | Reordered |
| :--- | :--- | :--- | :--- | :--- |
| **Request** | Client keeps retrying; at-most-once via history; once a copy arrives, it is processed and replied. | Client's timer eventually fires; request is retried until some copy arrives. | Duplicate requests detected by clientAddress, sequence pair; server re-sends stored results. | Original and retries may arrive in any order; server's history uses max sequence to distinguish new and old. |
| **Reply** | Client may wait longer; timer may cause more request retries; once matching reply arrives, retries stop. | Client never sees this reply; timer resends request; server re-sends result without re-execution. | Extra replies are discarded if they do not match current pending sequence or after client has moved on. | Replies for older completed commands are dropped by client's sequence check. |
| **Ping** | View server relies on repeated pings over time; delayed pings are ignored if stale. | Missed ping eventually causes the server to be considered dead. | Idempotent; multiple identical pings do not change state. | View server uses view numbers to ignore stale information. |
| **Request** | Retries are handled by exactly-once semantics. | Retries eventually reach the correct primary through view change from view server. | Deduplicated by client sequence numbers. | Exactly-once semantics; primary server also enforces single total order. |
| **Reply** | Client waits or retries on timer. | Client retries request on timer. | Client ignores duplicate replies through sequence number comparison. | Client matches reply to request metadata. |
| **ViewRequest** | Client retries on timeout. | Client retires via timer. | Repeated queries return same current view. | View numbers totally order views. |
| **ViewReply** | Client/server ignores replies for older views. | Requesting client retries. | Latest view overwrites old state. | View numbers are monotonic; prevents regression. |
| **StateTransfer** | Backup may install state later; primary may delay normal operation until transfer completes; correctness preserved since state is a full snapshot. | Primary retries via timer; without eventual delivery, backup never becomes active; hurts liveness but not safety. | Idempotent if full-state overwrite; repeated installs lead to same state. | Tagged with view/epoch; backup ignores stale transfers; latest snapshot wins. |
| **StateTransferAck** | Primary waits longer before considering backup ready; delays progress but safe. | Primary may remain in “syncing” state and retry; hurts liveness if never received. | Idempotent; multiple acks do not change outcome after first. | Matched with specific view/transfer; stale acks ignored using view numbers. |

## Conclusion
### Goals Achieved
*   **Linearisability**:
    *   Primary executes only after backup ack, ensuring single-copy history.
*   **Exactly-Once behavior**:
    *   Client retries de-duplicated by AMO sequence numbers.
*   **Crash tolerance**:
    *   View server reconfigures views on failures.
*   **No split-brain**:
    *   View server's single authority and primary-ack rule prevent multiple active primaries.
*   **Network robustness**:
    *   Timers and retries handle drops/delays.

### Limitations
*   The view server is a single point of failure.
*   Liveness stalls if primary fails before acknowledging the current view.
*   Full state transfer to backup is computationally expensive.
*   Serial request processing and synchronous backup acks limit system throughput.
