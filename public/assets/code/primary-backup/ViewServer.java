/**
 * ViewServer maintains system membership and assigns primary/backup roles.
 *
 * Key Responsibilities:
 *  - Tracks server liveness via periodic Ping messages
 *  - Maintains and advances views (primary/backup assignments)
 *  - Ensures safe view transitions via acknowledgment rules
 *
 * Key invariants:
 *  - At most one primary per view
 *  - Primary of a new view must be the primary or backup of the previous view
 *  - View changes only occur after the current view is acknowledged
 *
 * Liveness detection:
 *  - Servers must ping every interval
 *  - Missing pings across intervals marks a server as dead
 *
 * Design note:
 *  - The acknowledgment rule prevents the ViewServer from advancing too far ahead
 *    of servers, avoiding split-brain scenarios.
 */
class ViewServer extends Node {

  // Special view number used before any view is established.
  static final int STARTUP_VIEWNUM = 0;

  // First valid (non-startup) view number.
  private static final int INITIAL_VIEWNUM = 1;

  // Current system view (primary & backup).
  private View currentView;

  // The latest view number acknowledged by the primary.
  // A view is considered "stable" only after the primary confirms it
  // by sending a Ping with the same view number.
  private int acknowledgedView;

  // Servers that were alive in the previous timer interval.
  private Set<Address> liveServers;

  // Servers that have pinged during the current interval.
  private Set<Address> pingedServers;

  /**
   * Constructs a ViewServer node.
   * @param address: the address of this ViewServer
   */
  public ViewServer(Address address) {
    super(address);
  }

  public void init() {
    set(new PingCheckTimer(), PING_CHECK_MILLIS);

    currentView = new View(STARTUP_VIEWNUM, null, null);
    acknowledgedView = STARTUP_VIEWNUM;

    liveServers = new LinkedHashSet<>();
    pingedServers = new LinkedHashSet<>();
  }

  /* ---------------------------------------------------------------------------------------------
   *  Message Handlers
   * -------------------------------------------------------------------------------------------*/

  /**
   * Handles a Ping message from a server.
   *  - Records the sender as alive in the current interval
   *  - Initialises the first view if needed
   *  - Tracks primary acknowledgment of the current view
   *  - Assigns a backup if none exists and conditions allow
   * @param ping: the Ping message containing the sender's view number
   * @param sender: the server sending the Ping
   */
  private void handlePing(Ping ping, Address sender) {
    pingedServers.add(sender);

    // Initialise first view with first server as primary
    if (currentView.viewNum() == STARTUP_VIEWNUM) {
      currentView = new View(INITIAL_VIEWNUM, sender, null);
    }

    // Check if current primary acknowledges the view
    if (ping.viewNum() == currentView.viewNum()
        && sender.equals(currentView.primary())) {
      acknowledgedView = currentView.viewNum();
    }

    // If view is acknowledged and no backup exists, assign one
    if (acknowledgedView == currentView.viewNum()
        && currentView.backup() == null) {
      Address backup = getIdleServer(currentView.primary(), null);
      if (backup != null) {
        currentView = new View(currentView.viewNum() + 1,
            currentView.primary(), backup);
      }
    }

    // Reply with current view
    send(new ViewReply(currentView), sender);
  }

  /**
   * Handles a GetView request from a client or server.
   * Simply returns the current view without affecting server liveness tracking.
   * @param m: the GetView message
   * @param sender: the requester
   */
  private void handleGetView(GetView m, Address sender) {
    send(new ViewReply(currentView), sender);
  }

  /* ---------------------------------------------------------------------------------------------
   *  Timer Handlers
   * -------------------------------------------------------------------------------------------*/

  /**
   * Handles periodic PingCheckTimer.
   *  - Determines which servers are still alive
   *  - Updates liveness tracking sets
   *  - Advances the view if allowed by the acknowledgment rule
   *  - Reschedules the next timer
   * A server is considered dead if it did not ping in the current interval.
   * @param timer: the PingCheckTimer event
   */
  private void onPingCheckTimer(PingCheckTimer timer) {
    // Move current pings into live set
    liveServers = pingedServers;
    pingedServers = new LinkedHashSet<>();

    // Only advance view if current view has been acknowledged
    if (acknowledgedView == currentView.viewNum()) {
      advanceView();
    }

    set(timer, PING_CHECK_MILLIS);
  }

  /* ---------------------------------------------------------------------------------------------
   *  View Management
   * -------------------------------------------------------------------------------------------*/

  /**
   * Attempts to advance the current view based on server liveness.
   * This method is only invoked when the current view has been acknowledged.
   */
  private void advanceView() {
    Address primary = currentView.primary();
    Address backup = currentView.backup();

    Set<Address> servers = allLiveServers();

    boolean primaryDead = primary != null && !servers.contains(primary);
    boolean backupDead = backup != null && !servers.contains(backup);
    boolean backupAlive = backup != null && servers.contains(backup);

    // Case 1: Primary failed -> promote backup
    if (primaryDead) {
      if (backupAlive) {
        Address newBackup = getIdleServer(primary, backup);
        currentView = new View(currentView.viewNum() + 1, backup, newBackup);
      }
      return;
    }

    // Case 2: Backup failed -> replace backup
    if (backupDead) {
      Address newBackup = getIdleServer(primary, backup);
      currentView = new View(currentView.viewNum() + 1, primary, newBackup);
      return;
    }

    // Case 3: No backup -> assign one if available
    if (backup == null) {
      Address newBackup = getIdleServer(primary, null);
      if (newBackup != null) {
        currentView = new View(currentView.viewNum() + 1, primary, newBackup);
      }
    }
  }

  /**
   * Selects an idle server to act as backup.
   * An idle server is any live server that is not the current primary or backup.
   * @param primary: current primary server
   * @param backup: current backup server
   * @return an idle server address, or null if none available
   */
  private Address getIdleServer(Address primary, Address backup) {
    for (Address addr : allLiveServers()) {
      if (!addr.equals(primary) && !addr.equals(backup)) {
        return addr;
      }
    }
    return null;
  }

  /**
   * Computes the set of all live servers, including:
   *  - servers that were alive in the previous interval
   *  - servers that pinged in the current interval
   * @return set of all currently live servers
   */
  private Set<Address> allLiveServers() {
    Set<Address> servers = new LinkedHashSet<>(liveServers);
    servers.addAll(pingedServers);
    return servers;
  }
}
