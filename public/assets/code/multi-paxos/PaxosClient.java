/**
 * PaxosClient is responsible for issuing commands to a Paxos-based replicated
 * state machine and receiving the corresponding results.
 *
 * This client implements at-most-once semantics using sequence numbers and
 * AMOCommand/AMOResult wrappers. It broadcasts requests to all servers and
 * retries periodically until a valid response is received.
 *
 * Concurrency model:
 * All public methods are synchronised to ensure thread safety, as the client
 * interacts with asynchronous message handlers and timers.
 */
public final class PaxosClient extends Node implements Client {

    // List of all Paxos servers in the system.
    private final Address[] servers;

    // Monotonically increasing sequence number for requests.
    private int sequenceNum = 0;

    // The currently outstanding command (if any).
    private Command pendingCommand = null;

    // The result corresponding to the outstanding command.
    private Result pendingResult = null;

    /* -----------------------------------------------------------------------------------------------
     * Construction and Initialisation
     * ---------------------------------------------------------------------------------------------*/

    /**
     * Constructs a new PaxosClient.
     * @param address: the unique address of this client
     * @param servers: the list of Paxos server addresses
     */
    public PaxosClient(Address address, Address[] servers) {
        super(address);
        this.servers = servers;
    }

    /* -----------------------------------------------------------------------------------------------
     * Client Interface Methods
     * ---------------------------------------------------------------------------------------------*/

    /**
     * Sends a command to the Paxos cluster.
     * The command is wrapped in an AMOCommand to ensure at-most-once semantics.
     * The request is broadcast to all servers. A retry timer is scheduled in case
     * of message loss or delayed responses.
     * @param operation: the command to execute
     * @throws IllegalStateException if there is already an outstanding command
     */
    public synchronized void sendCommand(Command operation) {
        if (pendingCommand != null) {
            throw new IllegalStateException("Outstanding command already exists.");
        }

        pendingCommand = operation;
        pendingResult = null;
        sequenceNum++;

        broadcastRequest(operation);

        // Schedule retry timer
        set(new ClientTimer(sequenceNum), ClientTimer.CLIENT_RETRY_MILLIS);
    }

    /**
     * Checks whether the result for the outstanding command is available.
     * @return true if a result has been received, false otherwise
     */
    public synchronized boolean hasResult() {
        return pendingResult != null;
    }

    /**
     * Blocks until the result for the outstanding command is available.
     * @return the result of the command
     * @throws InterruptedException if the waiting thread is interrupted
     */
    public synchronized Result getResult() throws InterruptedException {
        while (pendingResult == null) {
            wait();
        }

        Result result = pendingResult;

        // Reset client state after consuming result
        pendingResult = null;
        pendingCommand = null;

        return result;
    }

    /* -----------------------------------------------------------------------------------------------
     * Message Handlers
     * ---------------------------------------------------------------------------------------------*/

    /**
     * Handles incoming PaxosReply messages from servers.
     * Validates that the reply corresponds to the current outstanding request
     * using both client address and sequence number. If valid, stores the result
     * and wakes any waiting threads.
     * @param message: the received PaxosReply
     * @param sender: the address of the sender
     */
    private synchronized void handlePaxosReply(PaxosReply message, Address sender) {
        // Ignore if no outstanding request or already satisfied
        if (pendingCommand == null || pendingResult != null) {
            return;
        }

        AMOResult amoResult = message.result();

        // Validate client identity
        if (!amoResult.clientAddress().equals(address())) {
            return;
        }

        // Validate sequence number
        if (amoResult.sequence() != sequenceNum) {
            return;
        }

        // Accept result
        pendingResult = amoResult.result();
        notifyAll();
    }

    /* -----------------------------------------------------------------------------------------------
     * Timer Handlers
     * ---------------------------------------------------------------------------------------------*/

    /**
     * Handles client retry timer events.
     * If the result has not yet been received, the client re-broadcasts the
     * request to all servers and reschedules the timer.</p>
     * @param timer the triggered ClientTimer
     */
    private synchronized void onClientTimer(ClientTimer timer) {
        // Ignore stale or unnecessary timers
        if (timer.sequenceNum() != sequenceNum ||
            pendingCommand == null ||
            pendingResult != null) {
            return;
        }

        broadcastRequest(pendingCommand);

        // Reschedule retry
        set(new ClientTimer(sequenceNum), ClientTimer.CLIENT_RETRY_MILLIS);
    }

    /* -----------------------------------------------------------------------------------------------
     * Helper Methods
     * ---------------------------------------------------------------------------------------------*/

    /**
     * Broadcasts the current command to all Paxos servers.
     * This method encapsulates the creation of AMOCommand and PaxosRequest
     * messages, improving modularity and reducing duplication.
     * @param command: the command to broadcast
     */
    private void broadcastRequest(Command command) {
        AMOCommand amoCommand = new AMOCommand(address(), command, sequenceNum);

        for (Address server : servers) {
            send(new PaxosRequest(amoCommand), server);
        }
    }
}
