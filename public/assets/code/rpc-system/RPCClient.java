/**
 * RPCClient implements a single-outstanding-request client with
 * retry-based reliability and exactly-once semantics.
 *
 * Key Responsibilities:
 *  - Sends commands to a single server
 *  - Retries requests on timeout (at-least-once delivery)
 *  - Filters duplicate replies using sequence numbers
 *  - Blocks until a result is received
 *
 * Design Notes:
 *  - Only one request may be outstanding at a time
 *  - Sequence numbers uniquely identify requests
 *  - Timers implement the resend/discard pattern
 *  - Synchronisation ensures thread-safe blocking behaviour
 */
class RPCClient extends Node implements Client {

  // Address of the server this client communicates with
  private final Address serverAddress;

  /* ---------------------------------------------------------------------------------------------
   *  Client State
   * -------------------------------------------------------------------------------------------*/

  // Next sequence number to assign to outgoing requests
  private int nextSequenceNumber = 0;

  // Command currently awaiting a response
  private Command currentCommand = null;

  // Result corresponding to the current command
  private Result currentResult = null;

  // Sequence number of the current in-flight request
  private int currentSequenceNumber = -1;

  // Whether the client is waiting for a reply
  private boolean waitingForReply = false;

  /* ---------------------------------------------------------------------------------------------
   *  Construction and Initialisation
   * -------------------------------------------------------------------------------------------*/

  public RPCClient(Address address, Address serverAddress) {
    super(address);
    this.serverAddress = serverAddress;
  }

  /* ---------------------------------------------------------------------------------------------
   *  Client API
   * -------------------------------------------------------------------------------------------*/

  /**
   * Sends a command to the server.
   * Throws an exception if another request is still pending.
   * Workflow:
   *  - Assign sequence number
   *  - Wrap command in AMOCommand
   *  - Send request
   *  - Start retry timer
   */
  public synchronized void sendCommand(Command command) {
    if (waitingForReply) {
      throw new IllegalStateException(
        "Cannot send a new command while another is pending.");
    }

    currentCommand = command;
    currentSequenceNumber = nextSequenceNumber++;
    currentResult = null;
    waitingForReply = true;

    AMOCommand amoCommand =
        new AMOCommand(address(), currentCommand, currentSequenceNumber);

    send(new Request(amoCommand), serverAddress);

    // Start retry timer (resend/discard pattern)
    set(new ClientTimer(currentSequenceNumber),
        ClientTimer.CLIENT_RETRY_MILLIS);
  }

  /** Non-blocking check for result availability. */
  public synchronized boolean hasResult() {
    return currentResult != null;
  }

  /**
   * Blocks until a result is available, then returns it.
   * Uses Java wait/notify for synchronisation.
   */
  public synchronized Result getResult() throws InterruptedException {
    while (currentResult == null) {
      this.wait();
    }

    Result resultToReturn = currentResult;

    // Reset state for next command
    currentResult = null;
    currentCommand = null;

    return resultToReturn;
  }

  /* ---------------------------------------------------------------------------------------------
   *  Message Handlers
   * -------------------------------------------------------------------------------------------*/

  /**
   * Handles replies from the server.
   * Ensures:
   *  - Reply corresponds to this client
   *  - Sequence number matches current request
   * Duplicate or stale replies are ignored.
   */
  private synchronized void handleReply(Reply reply, Address sender) {
    if (!waitingForReply) {
      return;
    }

    AMOResult amoResult = reply.result();

    // Validate reply matches current request
    if (!amoResult.clientAddress().equals(address())
        || amoResult.sequence() != currentSequenceNumber) {
      return;
    }

    currentResult = amoResult.result();
    waitingForReply = false;

    // Wake up any thread waiting in getResult()
    this.notify();
  }

  /* ---------------------------------------------------------------------------------------------
   *  Timer Handlers
   * -------------------------------------------------------------------------------------------*/

  /**
   * Retry timer handler.
   * Implements resend/discard pattern:
   *  - If still waiting, resend request
   *  - If completed, ignore timer
   */
  private synchronized void onClientTimer(ClientTimer timer) {
    if (!waitingForReply
        || currentResult != null
        || timer.sequence() != currentSequenceNumber) {
      return;
    }

    AMOCommand amoCommand =
        new AMOCommand(address(), currentCommand, currentSequenceNumber);

    send(new Request(amoCommand), serverAddress);

    // Reset timer for next retry
    set(new ClientTimer(currentSequenceNumber),
        ClientTimer.CLIENT_RETRY_MILLIS);
  }
}
