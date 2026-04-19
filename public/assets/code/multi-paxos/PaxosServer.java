/**
 * PaxosServer implements a full multi-instance Paxos replicated state machine.
 *
 * This class combines all Paxos roles:
 *  - Leader (proposer)
 *  - Acceptor
 *  - Replica (state machine executor)
 *
 * Key features:
 *  - Multi-instance Paxos (log-based agreement)
 *  - Stable leader optimisation
 *  - Log garbage collection via heartbeats
 *  - At-most-once semantics integration
 *
 * The system guarantees:
 *  - Linearisability
 *  - Safety under partitions
 *  - Progress with a majority quorum
 */
public class PaxosServer extends Node {

    /* -------------------------------------------------------------------------------------------
     * Constants & Types
     * -----------------------------------------------------------------------------------------*/

    // Internal no-op command used to fill gaps in the Paxos log.
    private static final class NoOp implements Command {}

    // Singleton No-Op command wrapped in AMOCommand
    private static final AMOCommand NOOP = new AMOCommand(null, new NoOp(), -1);

    /**
     * Ballot identifier used for leader election.
     * Ordered lexicographically by (number, address).
     */
    public static class Ballot implements Serializable, Comparable<Ballot> {
        final int number;
        final Address address;

        @Override
        public int compareTo(Ballot other) {
            if (this.number != other.number) {
                return Integer.compare(this.number, other.number);
            }
            return this.address.compareTo(other.address);
        }
    }

    // Represents a single Paxos log slot entry.
    public static class LogEntry implements Serializable {
        private Ballot acceptedBallot;
        private AMOCommand value;
        private boolean chosen;
    }

    /* -------------------------------------------------------------------------------------------
     * Core State
     * -----------------------------------------------------------------------------------------*/

    // All servers participating in Paxos
    private final Address[] servers;

    // Wrapped application for execution
    private final AMOApplication<Application> app;

    // Optional decision-forwarding address
    private final Address decisionAddress;

    /* ---------------- Leader State ---------------- */

    // Whether this node believes it is the active leader
    private boolean active;

    // Current ballot number
    private Ballot currBallot;

    // Phase 1 responses (Prepare)
    private final Map<Address, Map<Integer, LogEntry>> p1Responses = new LinkedHashMap<>();

    // Phase 2 responses (Accept)
    private final Map<Integer, Set<Address>> p2Responses = new LinkedHashMap<>();

    // Followers' execution progress
    private final Map<Address, Integer> followerSlotOuts = new LinkedHashMap<>();

    // Pending client requests
    private final Queue<PaxosRequest> pendingRequests = new LinkedList<>();

    /* ---------------- Replica State ---------------- */

    // Paxos log (slot -> entry)
    private final Map<Integer, LogEntry> log = new LinkedHashMap<>();

    // Next slot to propose into
    private int slotIn;

    // Next slot to execute
    private int slotOut;

    // First non-garbage-collected slot
    private int gcPointer;

    // Missed heartbeat counter
    private int missedHeartbeats;

    /* -------------------------------------------------------------------------------------------
     * Construction
     * -----------------------------------------------------------------------------------------*/

    /**
     * Constructor for normal Paxos server with application execution.
     * @param address: this node's address
     * @param servers: all Paxos servers
     * @param app: application to replicate
     */
    public PaxosServer(Address address, Address[] servers, Application app) {
        super(address);
        this.servers = servers;
        this.app = new AMOApplication<>(app);
        this.decisionAddress = null;
    }

    /**
     * Constructor for forwarding-only Paxos server.
     * @param address: this node's address
     * @param servers: all Paxos servers
     * @param decisionAddress: external decision handler
     */
    public PaxosServer(Address address, Address[] servers, Address decisionAddress) {
        super(address);
        this.servers = servers;
        this.app = null;
        this.decisionAddress = decisionAddress;
    }

    public void init() {
        currBallot = new Ballot(0, address());
        active = false;

        slotIn = 1;
        slotOut = 1;
        gcPointer = 1;

        missedHeartbeats = 0;

        set(new HeartbeatCheckTimer(), HeartbeatCheckTimer.RETRY_MILLIS);
    }

    /* -------------------------------------------------------------------------------------------
     * Interface Methods
     * -----------------------------------------------------------------------------------------*/

    /**
     * Returns the status of a log slot.
     * @param logSlotNum: slot index (1-based)
     * @return slot status
     */
    public PaxosLogSlotStatus status(int logSlotNum) {
        if (logSlotNum < gcPointer) return PaxosLogSlotStatus.CLEARED;

        LogEntry entry = log.get(logSlotNum);
        if (entry == null) return PaxosLogSlotStatus.EMPTY;
        if (entry.chosen) return PaxosLogSlotStatus.CHOSEN;
        if (entry.value != null) return PaxosLogSlotStatus.ACCEPTED;

        return PaxosLogSlotStatus.EMPTY;
    }

    /**
     * Returns the command stored in a log slot.
     * @param logSlotNum: slot index
     * @return command or null
     */
    public Command command(int logSlotNum) {
        PaxosLogSlotStatus s = status(logSlotNum);
        if (s == PaxosLogSlotStatus.EMPTY || s == PaxosLogSlotStatus.CLEARED) return null;

        return log.get(logSlotNum).value.command();
    }

    /** @return first non-garbage-collected slot */
    public int firstNonCleared() {
        return gcPointer;
    }

    /** @return last slot that is not EMPTY */
    public int lastNonEmpty() {
        int max = Math.max(0, gcPointer - 1);
        for (int slot : log.keySet()) {
            if (status(slot) != PaxosLogSlotStatus.EMPTY) {
                max = Math.max(max, slot);
            }
        }
        return max;
    }

    /* -------------------------------------------------------------------------------------------
     * Paxos Core Logic
     * -----------------------------------------------------------------------------------------*/

    /**
     * Phase 1 (Prepare):
     *  - Elect leader
     *  - Gather accepted values
     *
     * Phase 2 (Accept):
     *  - Propose values
     *  - Achieve majority agreement
     *
     * Execution:
     *  - Execute chosen commands in order
     *
     * Garbage Collection:
     *  - Remove slots executed by all replicas
     */

    /* -------------------------------------------------------------------------------------------
     * Key Utility Methods
     * -----------------------------------------------------------------------------------------*/

    /**
     * Broadcasts a message to all other servers.
     * @param message: message to send
     */
    private void broadcast(Message message) {
        for (Address server : servers) {
            if (!server.equals(address())) {
                send(message, server);
            }
        }
    }

    /**
     * Transition to follower mode upon observing higher ballot.
     * @param ballot: new higher ballot
     */
    private void stepDown(Ballot ballot) {
        if (ballot.compareTo(currBallot) > 0) {
            currBallot = ballot;
            active = false;
            missedHeartbeats = 0;
            p1Responses.clear();
            p2Responses.clear();
            followerSlotOuts.clear();
            pendingRequests.clear();
        }
    }

    /** Execute all consecutively chosen commands. */
    private void execute() {
        while (true) {
            LogEntry entry = log.get(slotOut);
            if (entry == null || !entry.chosen || entry.value == null) break;

            if (!(entry.value.command() instanceof NoOp)) {
                if (app != null) {
                    AMOResult result = app.execute(entry.value);
                    send(new PaxosReply(result), entry.value.clientAddress());
                } else if (decisionAddress != null) {
                    handleMessage(new PaxosDecision(slotOut, entry.value), decisionAddress);
                }
            }
            slotOut++;
        }

        // Clear stale election data
        p1Responses.clear();
    }

    /**
     * Garbage collect log entries up to a given slot.
     * @param upTo: exclusive upper bound
     */
    private void garbageCollect(int upTo) {
        if (upTo <= gcPointer) return;

        for (int i = gcPointer; i < upTo; i++) {
            log.remove(i);
        }
        gcPointer = upTo;
    }

    /** Fill missing slots with NOOPs to maintain log continuity. */
    private void fillHoles() {
        for (int i = gcPointer; i < slotIn; i++) {
            LogEntry entry = log.get(i);

            if (entry != null && (entry.chosen || entry.value != null)) continue;

            Set<Address> responders = new LinkedHashSet<>();
            responders.add(address());

            p2Responses.put(i, responders);

            LogEntry e = log.computeIfAbsent(i, k -> new LogEntry());
            e.acceptedBallot = currBallot;
            e.value = NOOP;

            if (responders.size() > servers.length / 2) {
                e.chosen = true;
                broadcast(new Decision(i, NOOP));
                p2Responses.remove(i);
            } else {
                broadcast(new AcceptRequest(currBallot, i, NOOP));
                set(new P2RetryTimer(i), P2RetryTimer.RETRY_MILLIS);
            }
        }

        execute();
    }
}
