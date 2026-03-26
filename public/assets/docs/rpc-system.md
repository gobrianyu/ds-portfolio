# Design Document – Lab 1: Simple RPC
**Brian S. Yu**  
**1/14/2026**  
**CSE 452**

## Preface
### Goals
*   Provide a client-server remote procedure call (RPC) abstraction allowing clients to run commands on a server.
*   Ensure exactly once execution semantics whereby each command issued by a client is executed at most once and at least once despite any network failures.
*   Support multiple clients concurrently interacting with a single server.

### Desired Fault Model
The system tolerates the following:
*   Message loss
*   Message delay
*   Message duplication
*   Message reordering
*   Node crashes/restarts

### Challenges
*   Network unreliability means replies can be lost or delayed, so a client may see no response even if the server has already executed the command.
*   Clients must retry to tolerate message loss, but this creates duplicate requests at the server.
*   Network may reorder messages arbitrarily so the server must distinguish between already executed commands from new ones.
*   Protocol must avoid unbounded state growth.

### Assumptions
*   Each client issues at most one outstanding command at a time.
*   Clients retry commands until a response is received.
*   Commands are deterministic.
*   The networks will eventually deliver messages if retried indefinitely.
*   Commands sent in tests are smaller than 2^31 - 1 (avoids integer overflow).

## Protocol
### Kinds of Nodes
*   **Client node**: issues commands on behalf of an external user to the server, waits for a result, and retries if no result arrives within timeout.
*   **Server node**: receives requests from clients and executes commands on an application with at-most-once (AMO) semantics per client command.

Each node is permanently of one kind. No temporary roles.

### State at Each Kind of Node
#### Client State
*   **nextSequence**: Integer
    *   Sequence number to assign to the next new command that will be sent.
    *   Initialised to 0.
    *   Increases by 1 each time client successfully completes a command.
    *   *Intuition*: provides a unique monotonically increasing identifier per command from this client, used for deduplication.
*   **pendingCommand**: Command (optional)
    *   The command currently attempting execution for this client, if any.
    *   Initialised to null.
    *   Set to the new command when client sends it; cleared when the result is returned to the caller.
    *   *Intuition*: the command that must eventually complete before the client can send another.
*   **pendingResult**: Result (optional)
    *   The result corresponding to the current pendingCommand, if already received from the server.
    *   Initialised to null.
    *   Set when a valid reply is received; cleared when the caller consumes it via getResult.
    *   *Intuition*: buffer that allows hasResult to be non-blocking and getResult to block until a result is available.
*   **pendingSequence**: Integer
    *   The sequence number associated with pendingCommand.
    *   Initialised to -1 (indicating no pending request).
    *   Set to nextSequence when a new command is sent.
    *   Remains fixed until command is completed; used to correlate replies and timers with the currently outstanding command.
*   **awaitingReply**: Boolean
    *   True or false value indicating whether this client is still awaiting a response from the server.
    *   Initialised to false.
    *   Set to true when a corresponding response is received from the server to the currently outstanding command; false when a new command is sent.

#### Server State
*   **application**: Application
    *   Type: abstract application that supports execution of a command and returns a result.
    *   *Intuition*: holds the logical application state; executing a command may mutate this state and returns a result.
*   **lastClientCommands**: Map<Address, Entry>
    *   Type: finite map from Address to Entry
    *   Each Entry is a value object:
        *   **lastSequence**: Integer – the largest sequence number from that client that has been executed.
        *   **lastResult**: Result – the wrapped result of that last executed command.
    *   Initialised to empty HashMap.
    *   Constraint: lastSequence increases monotonically for each client; there is at most one entry per client.
    *   *Intuition*: the at-most-once log; this is the metadata to recognise and filter duplicates per client.
    *   *Note*: this may be implemented inside application.

To support AMO semantics, commands and results are wrapped:
*   **AMOCommand**
    *   Fields: clientAddress (Address), command (Command), sequence (Integer).
    *   readonly() – delegates to the inner command.
    *   *Intuition*: adds to each application command a unique identifier and sequence for deduplication.
*   **AMOResult**
    *   Fields: clientAddress (Address), result (Result), sequence (Integer).
    *   *Intuition*: carries back result associated with a specific clientAddress sequence pair, allowing client to match it and for application history map to store the last executed result.

## Messages
### Request
*   **Source**: Client
*   **Destination**: Server
*   **Contents**: One AMOCommand containing:
    *   clientAddress: sender’s address.
    *   command: application command to execute.
    *   sequence: client’s sequence number for this command.
*   **When Sent**:
    *   Spontaneously by the client when the external caller calls sendCommand and there is no command currently awaiting response for that client.
    *   Re-sent by the client’s retry timer if no corresponding reply has been received by timeout and the command is still pending.
*   **Behaviour at Server on Receipt**:
    *   Extracts clientAddress, sequence, and command from the AMOCommand.
    *   Checks lastClientCommands[clientAddress].
    *   If there is an entry with lastSequence >= sequence, treat this request as a duplicate or old and do not re-execute; instead, re-use the stored lastResult.
    *   Otherwise, treat this as a new command and execute on the application. Construct a new AMOResult from the execution result and update lastClientCommands with the new result.
    *   Send a reply containing the resulting AMOResult to the clientAddress.
*   **When Ignored**:
    *   Never fully ignored: every well-formed request triggers a reply.
    *   No change on server application state for duplicate or old requests.

### Reply
*   **Source**: Server
*   **Destination**: Client
*   **Contents**:
    *   AMOResult containing the result from execution on application along with clientAddress and sequence identifiers.
*   **When Sent**:
    *   Sent as direct response to a Request (i.e. never spontaneously).
*   **Behaviour at Client on Receipt**:
    *   Extracts clientAddress, sequence, and result from the AMOResult.
    *   Checks whether the client currently has a pendingCommand. Discard reply if not.
    *   If sequence or clientAddress does not match this client, discard reply. Otherwise, set pendingResult to the result.
    *   Wake (notify) any thread blocked in the client’s blocking getResult.

## Timers
### Client Retry Timer
*   **Setter Node**: Client
*   **Contents**:
    *   sequence: the sequence number of the command whose request is being retried.
    *   length: a fixed timeout in milliseconds, assumed the same for all instances of this timer.
*   **When Set**:
    *   Immediately after sending a Request for a new pendingCommand.
    *   Reset after firing while there is a still a pending command corresponding to this sequence.
*   **Behaviour When Fired**:
    *   Compares the timer’s sequence to the client’s current pendingSequence.
    *   If there is no pending command or sequences do not match, the timer is considered stale and discarded (i.e. not reset).
    *   Otherwise, resend the same Request to the server and set a new timer with the same sequence and length.

There are no timers on the server.

## Correctness/Liveness Analysis
| Message | Delayed | Dropped | Duplicated | Reordered |
| :--- | :--- | :--- | :--- | :--- |
| **Request** | Client keeps retrying; at-most-once via history; once a copy arrives, it is processed and replied. | Client’s timer eventually fires; request is retried until some copy arrives. | Duplicate requests detected by clientAddress, sequence pair; server re-sends stored results. | Original and retries may arrive in any order; server’s history uses max sequence to distinguish new and old. |
| **Reply** | Client may wait longer; timer may cause more request retries; once matching reply arrives, retries stop. | Client never sees this reply; timer resends request; server re-sends result without re-execution. | Extra replies are discarded if they do not match current pending sequence or after client has moved on. | Replies for older completed commands are dropped by client’s sequence check. |

### Request Failures
#### Delayed Request
*   Older replies are ignored by sequence check; only reply for current pending command is accepted.
*   If a request is delayed, the client’s timer eventually fires and sends another copy with the same clientAddress and sequence.
*   The server’s history map ensures that when any copy is processed for the first time, the command is executed exactly once. All later copies either arrive before the map entry and are treated as new once, or arrive after the map entry and return the stored result without re-execution.
*   Execution count remains 0 or 1; liveness is preserved as long as some copy eventually arrives at the server.

#### Dropped Request
*   Dropped requests are indistinguishable from long delays; the client’s timer eventually sends another copy.
*   If all copies are dropped, the client may wait indefinitely. No progress is made under permanent loss.

#### Duplicated Request
*   Duplicate requests include the same clientAddress and sequence.
*   If no entry is present yet in the history map, the first instance processed causes application execution and history entry creation; subsequent instances are treated as duplicates, resending the stored result only; preserves AMO.

#### Reordered Requests
*   If older request for a sequence arrives after a newer one, the server’s check treats it as old and returns result associated with the newer last sequence without touching application state.
*   Clients, however, do not send new commands in this context until the receive previous results meaning cross-sequence reordering beyond one client’s in-progress request does not occur.

### Reply Failures
#### Delayed Reply
*   If reply is delayed, client’s timer fires and resends the same request. Once any reply with matching clientAddress and sequence arrives, the client sets pendingResult, wakes the waiting caller, and stops resending and resetting timers.
*   Duplicate work at the server is avoided via the history map (as explained previously); client liveness depends only on some reply eventually being delivered.

#### Dropped Reply
*   Dropped replies are handled the same as delayed replies; the client does not see the result, so its timer resends the request.
*   Server recognises a duplicate request if already executed and returns the stored result. Once a reply eventually arrives, the client completes.

#### Duplicated Reply
*   If duplicate replies arrive while the client still has the same pendingSequence, the first one sets pendingResult; subsequent ones are harmless overwrites of the same result.
*   If duplicates arrive after the client has moved on and updated pendingSequence, they fail the sequence check and are discarded.

#### Reordered Reply
*   Replies for older completed commands are dropped by client’s sequence check.
*   Only replies with clientAddress and sequence matching the client’s current pending fields can complete the blocked call.

### Groups of Lost/Delayed Messages
#### Many consecutive list/delayed Requests and Replies
*   Each client sends only one message per timer firing.
*   If a long run of request and reply messages are dropped or delayed, the client continues to retry until some request and reply pair succeeds (or until either client or server crashes).
*   No extra application executions occur beyond the first successful execution for each clientAddress and sequence pair.

## Node Crashes/Prolonged Unavailability
This protocol does not address explicit crash recovery or state persistence; a crashed node simply stops participating.

### Client Crash
*   If a client crashes, it stops sending requests and processing replies.
*   *Correctness*: the server’s application state is always consistent with the client’s command sequence; there is no partially executed command logic.
*   *Liveness*: that client’s workload may not complete, which is acceptable under the assumptions.

### Server Crash
*   Server crash stops request processing and reply sending; clients will continue retrying but will not progress until the server is available again.
*   Since protocol assumptions do not require state recovery, a restarted server would start from an empty history and application state, potentially violating exactly-once semantics. Handling this is out of scope.

### Network Partitions
*   A partition isolating the server from clients is indistinguishable from long delays or drops. Clients will continue to retry without progress until the partition recovers.
*   No incorrect executions occur as the server does not see the requests and thus does not mutate application state.

## Conclusion
### Goals Achieved
*   **Exactly-Once Semantics**:
    *   At-least-once delivery achieved by client-side retries on timeouts using resend/discard timer pattern.
    *   At-most-once execution enforced by per-client sequence numbers combined with server application’s history map of clientAddress to last sequence. Duplicate or old requests never re-execute commands.
    *   The above together guarantees exactly-once semantics: each command is executed once (outside of unrecoverable failures mentioned previously).
*   **Scalable, Application-Agnostic Design**:
    *   The protocol treats the application as an abstract deterministic state machine; AMOApplication wraps any application and provides at-most-once semantics for wrapped commands.

### Limitations
*   Lack of implementation for crash recovery. Server crashes can cause loss of command effects and violations of exactly-once semantics if the server restarts (no persistent states).
*   If the network permanently drops all messages, client commands never complete. Liveness is only guaranteed under eventual delivery.
*   No support for multiple outstanding commands per client.
