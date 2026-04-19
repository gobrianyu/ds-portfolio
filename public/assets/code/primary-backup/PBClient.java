/**
 * Primary-Backup Client.
 *
 * This client communicates with a replicated key-value service using a
 * ViewServer to discover the current primary.
 *
 * Key Properties:
 *  - At most one outstanding request
 *  - Retries on failure using timers
 *  - Fetches updated views when primary may have changed
 *  - Ensures exactly-once semantics via at-most-once command
 */
class PBClient extends Node implements Client {

  // Address of the ViewServer
  private final Address viewServer;

  // Current cached view
  private View currentView;

  // Monotonically increasing sequence number
  private int sequenceNumber;

  // Current outstanding command
  private Command pendingCommand;

  // Result of outstanding command
  private Result pendingResult;

  // Whether client is waiting for a view update
  private boolean awaitingViewUpdate;

  /* ---------------------------------------------------------------------------------------------
   *  Construction and Initialisation
   * -------------------------------------------------------------------------------------------*/

  /**
   * @param address: client address
   * @param viewServer: address of the ViewServer
   */
  public PBClient(Address address, Address viewServer) {
    super(address);
    this.viewServer = viewServer;
  }

  public synchronized void init() {
    currentView = new View(ViewServer.STARTUP_VIEWNUM, null, null);
    sequenceNumber = 0;
    pendingCommand = null;
    pendingResult = null;

    // Fetch initial view
    send(new GetView(), viewServer);
    set(new GetViewTimer(), GetViewTimer.RETRY_MILLIS);
    awaitingViewUpdate = true;
  }

  /* ---------------------------------------------------------------------------------------------
   *  Client API
   * -------------------------------------------------------------------------------------------*/

  /**
   * Sends a command to the primary.
   * @param command: command to execute
   * @throws IllegalStateException if another command is already pending
   */
  public synchronized void sendCommand(Command command) {
    if (pendingCommand != null) {
      throw new IllegalStateException("Outstanding command already exists.");
    }

    pendingCommand = command;
    pendingResult = null;
    sequenceNumber++;

    if (currentView.primary() == null) {
      requestViewUpdate();
    } else {
      sendRequestToPrimary();
    }
  }

  /** @return true if result is available */
  public synchronized boolean hasResult() {
    return pendingResult != null;
  }

  /**
   * Blocks until result is available.
   * @return result of command
   * @throws InterruptedException if interrupted while waiting
   */
  public synchronized Result getResult() throws InterruptedException {
    while (pendingResult == null) {
      wait();
    }

    Result result = pendingResult;

    // Reset state
    pendingResult = null;
    pendingCommand = null;

    return result;
  }

  /* ---------------------------------------------------------------------------------------------
   *  Message Handlers
   * -------------------------------------------------------------------------------------------*/

  /** Handles replies from primary. */
  private synchronized void handleReply(Reply reply, Address sender) {
    if (pendingCommand == null || pendingResult != null) return;
    if (!sender.equals(currentView.primary())) return;

    AMOResult amoResult = reply.result();

    if (!amoResult.clientAddress().equals(address())) return;
    if (amoResult.sequence() != sequenceNumber) return;

    pendingResult = amoResult.result();
    notify();
  }

  /** Handles ViewServer responses. */
  private synchronized void handleViewReply(ViewReply reply, Address sender) {
    if (currentView.viewNum() > reply.view().viewNum()) return;

    awaitingViewUpdate = false;
    currentView = reply.view();

    if (pendingCommand != null && pendingResult == null && currentView.primary() != null) {
      sendRequestToPrimary();
    }
  }

  /* ---------------------------------------------------------------------------------------------
   *  Timer Handlers
   * -------------------------------------------------------------------------------------------*/

  /** Retries request by fetching updated view. */
  private synchronized void onClientTimer(ClientTimer timer) {
    if (timer.sequenceNum() != sequenceNumber
        || pendingCommand == null
        || pendingResult != null) return;

    requestViewUpdate();
  }

  /** Retries GetView requests. */
  private synchronized void onGetViewTimer(GetViewTimer timer) {
    if (pendingCommand != null && pendingResult == null && awaitingViewUpdate) {
      requestViewUpdate();
    }
  }

  /* ---------------------------------------------------------------------------------------------
   *  Helper Methods
   * -------------------------------------------------------------------------------------------*/

  /** Sends request to current primary */
  private void sendRequestToPrimary() {
    AMOCommand amoCommand =
        new AMOCommand(address(), pendingCommand, sequenceNumber);

    send(new Request(currentView.viewNum(), amoCommand), currentView.primary());
    set(new ClientTimer(sequenceNumber), ClientTimer.CLIENT_RETRY_MILLIS);
  }

  /** Requests updated view from ViewServer */
  private void requestViewUpdate() {
    send(new GetView(), viewServer);
    set(new GetViewTimer(), GetViewTimer.RETRY_MILLIS);
    awaitingViewUpdate = true;
  }
}
