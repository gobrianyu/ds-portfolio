/**
 * Primary-Backup Server.
 *
 * Implements a replicated state machine using a primary-backup protocol.
 *
 * Key guarantees:
 *  - Linearisable execution
 *  - Exactly-once semantics (via AMOApplication)
 *  - Single active primary at any time
 *
 * High-level design:
 *  - The primary handles all client requests.
 *  - Requests are forwarded to the backup before execution.
 *  - The backup executes requests in the same order as the primary.
 *  - The primary only replies to the client after the backup acknowledges.
 *  - State transfer ensures newly assigned backups are consistent.
 *
 * Concurrency model:
 *  - At most one in-flight request is processed at a time.
 *  - Timers are used to ensure liveness under message loss.
 */
class PBServer extends Node {

  private final Address viewServer;

  // Current view known to this server.
  private View currentView;

  // Application wrapped with at-most-once semantics.
  private AMOApplication<Application> application;

  // The latest view number for which this server has fully synchronised state.
  private int syncedViewNumber;

  // Indicates whether the backup is fully synchronised with the primary.
  private boolean backupSynced;

  // Currently in-flight client request (primary only).
  private Request inFlightRequest;

  // Client address corresponding to the in-flight request.
  private Address inFlightClient;

  /* ---------------------------------------------------------------------------------------------
   *  Construction and Initialisation
   * -------------------------------------------------------------------------------------------*/

  /**
   * Constructs a new Primary-Backup server node.
   * @param address: the address of this server
   * @param viewServer: the address of the ViewServer
   * @param app: the underlying application to replicate
   */
  PBServer(Address address, Address viewServer, Application app) {
    super(address);
    this.viewServer = viewServer;
    this.application = new AMOApplication<>(app);

    currentView = new View(ViewServer.STARTUP_VIEWNUM, null, null);
    syncedViewNumber = ViewServer.STARTUP_VIEWNUM;
    backupSynced = true;

    inFlightRequest = null;
    inFlightClient = null;
  }

  /**
   * Initialises the server by sending an initial ping to the ViewServer
   * and scheduling periodic heartbeat pings.
   */
  public void init() {
    send(new Ping(ViewServer.STARTUP_VIEWNUM), viewServer);
    set(new PingTimer(), PingTimer.PING_MILLIS);
  }

  /* ---------------------------------------------------------------------------------------------
   *  Message Handlers
   * -------------------------------------------------------------------------------------------*/

  /**
   * Handles a client request received by this server.
   * Only the primary processes client requests. The request is:
   *  - validated against the current view
   *  - forwarded to the backup (if present)
   *  - executed after backup acknowledgment
   * @param request: the client request message
   * @param sender: the client address
   */
  private void handleRequest(Request request, Address sender) {
    if (request.viewNum() != currentView.viewNum()
        || !isPrimary()
        || inFlightRequest != null
        || (currentView.backup() != null && !backupSynced)
        || syncedViewNumber == -1) return;

    inFlightRequest = request;
    inFlightClient = sender;

    // If no backup exists, execute immediately
    if (currentView.backup() == null) {
      executeRequest();
      return;
    }

    // Forward request to backup
    send(new ForwardRequest(currentView.viewNum(), request.command()), currentView.backup());
    set(new ForwardTimer(request), ForwardTimer.RETRY_MILLIS);
  }

  /**
   * Handles a forwarded request from the primary (backup only).
   * The backup:
   *  - validates the request belongs to the current view
   *  - ensures it is synchronised
   *  - executes the command exactly once
   *  - replies back to the primary
   * @param request: the forwarded request
   * @param sender: the primary server
   */
  private void handleForwardRequest(ForwardRequest request, Address sender) {
    if (!isBackup()) return;

    if (syncedViewNumber != currentView.viewNum()
        || !sender.equals(currentView.primary())
        || request.viewNum() != currentView.viewNum()) return;

    AMOResult result = application.execute(request.command());
    send(new ForwardReply(result, currentView.viewNum()), sender);
  }

  /**
   * Handles a reply from the backup after executing a forwarded request.
   * The primary validates:
   *  - sender is the current backup
   *  - sequence number and client match
   *  - view number is current
   * If valid, the primary executes the request locally and replies to the client.
   * @param reply: the forwarded reply from the backup
   * @param sender: the backup server
   */
  private void handleForwardReply(ForwardReply reply, Address sender) {
    if (!isPrimary()
        || !backupSynced
        || inFlightRequest == null
        || !sender.equals(currentView.backup())
        || reply.result().sequence() != inFlightRequest.command().sequence()
        || reply.result().clientAddress() != inFlightClient
        || reply.viewNum() != currentView.viewNum()) return;

    executeRequest();
  }

  /**
   * Handles view updates from the ViewServer.
   *  - update local view if newer
   *  - clear in-flight requests if no longer primary
   *  - reset sync state if becoming backup
   *  - initiate state transfer if becoming primary with a new backup
   * @param reply: the ViewReply message
   * @param sender: the ViewServer
   */
  private void handleViewReply(ViewReply reply, Address sender) {
    if ((currentView != null && reply.view().viewNum() <= currentView.viewNum())
        || (reply.view().primary().equals(address()) && syncedViewNumber == -1)) {
      return;
    }

    Address oldBackup = currentView.backup();
    currentView = reply.view();

    // If no longer primary, clear any in-flight work
    if (!isPrimary()) {
      inFlightRequest = null;
      inFlightClient = null;
    }

    // If becoming backup, mark as unsynchronised
    if (isBackup()) syncedViewNumber = -1;

    // If new backup assigned, initiate state transfer
    if (isPrimary() && currentView.backup() != null
        && !currentView.backup().equals(oldBackup)) {
      sendState();
    }
  }

  /**
   * Handles full state transfer from primary (backup only).
   * The backup:
   *  - installs the application state if newer
   *  - marks itself as synchronised for the view
   *  - acknowledges the transfer to the primary
   * @param transfer: the state transfer message
   * @param sender: the primary server
   */
  private void handleStateTransfer(StateTransfer transfer, Address sender) {
    if (!isBackup()
        || transfer.viewNum() < syncedViewNumber
        || transfer.viewNum() != currentView.viewNum()) return;

    if (transfer.viewNum() > syncedViewNumber) {
      application = (AMOApplication<Application>) transfer.state();
      syncedViewNumber = transfer.viewNum();
    }

    send(new StateTransferAck(transfer.viewNum()), sender);
  }

  /**
   * Handles acknowledgment of state transfer (primary only).
   * Marks the backup as synchronised and resumes any pending request.
   * @param ack: the acknowledgment message
   * @param sender: the backup server
   */
  private void handleStateTransferAck(StateTransferAck ack, Address sender) {
    if (!isPrimary()
        || ack.viewNum() != currentView.viewNum()
        || !sender.equals(currentView.backup())) return;

    backupSynced = true;

    if (inFlightRequest != null) {
      send(new ForwardRequest(currentView.viewNum(), inFlightRequest.command()),
          currentView.backup());
      set(new ForwardTimer(inFlightRequest), ForwardTimer.RETRY_MILLIS);
    }
  }

  /* ---------------------------------------------------------------------------------------------
   *  Timer Handlers
   * -------------------------------------------------------------------------------------------*/

  /**
   * Periodic ping timer.
   * Sends heartbeat to ViewServer unless:
   *  - this node is primary AND
   *  - backup is not yet synchronised
   * This prevents premature acknowledgment of a view.
   * @param timer: the PingTimer event
   */
  private void onPingTimer(PingTimer timer) {
    if (isPrimary() && !backupSynced) {
      set(new PingTimer(), PingTimer.PING_MILLIS);
      return;
    }

    send(new Ping(currentView.viewNum()), viewServer);
    set(new PingTimer(), PingTimer.PING_MILLIS);
  }

  /**
   * Retransmission timer for forwarded requests.
   * Ensures the backup eventually receives the request.
   * @param timer: the ForwardTimer event
   */
  private void onForwardTimer(ForwardTimer timer) {
    if (inFlightRequest == null
        || !inFlightRequest.equals(timer.request())
        || !backupSynced) return;

    if (!isPrimary()) {
      inFlightRequest = null;
      inFlightClient = null;
      return;
    }

    if (currentView.backup() == null) {
      executeRequest();
      return;
    }

    send(new ForwardRequest(currentView.viewNum(), inFlightRequest.command()),
        currentView.backup());

    set(new ForwardTimer(inFlightRequest), ForwardTimer.RETRY_MILLIS);
  }

  /**
   * Retransmission timer for state transfer.
   * Retries sending application state until the backup acknowledges.
   * @param timer: the StateTransferTimer event
   */
  private void onStateTransferTimer(StateTransferTimer timer) {
    if (currentView.viewNum() == timer.viewNum() && !backupSynced) {
      sendState();
    }
  }

  /* ---------------------------------------------------------------------------------------------
   *  Helper Methods
   * -------------------------------------------------------------------------------------------*/

  /** @return true if this server is the current primary */
  private boolean isPrimary() {
    return address().equals(currentView.primary());
  }

  /** @return true if this server is the current backup */
  private boolean isBackup() {
    return address().equals(currentView.backup());
  }

  /**
   * Executes the current in-flight request and replies to the client.
   * This is only called by the primary after:
   *  - backup acknowledgment OR
   *  - no backup exists
   */
  private void executeRequest() {
    AMOResult result = application.execute(inFlightRequest.command());
    send(new Reply(result), inFlightClient);

    inFlightRequest = null;
    inFlightClient = null;
  }

  /**
   * Initiates full state transfer to the backup.
   * This is triggered when:
   *  - a new backup is assigned
   *  - the backup is not yet synchronised
   * Retries are handled by StateTransferTimer.
   */
  private void sendState() {
    if (!isPrimary() || currentView.backup() == null) return;

    backupSynced = false;

    send(new StateTransfer(currentView.viewNum(), application),
        currentView.backup());

    set(new StateTransferTimer(currentView.viewNum()),
        StateTransferTimer.RETRY_MILLIS);
  }
}
