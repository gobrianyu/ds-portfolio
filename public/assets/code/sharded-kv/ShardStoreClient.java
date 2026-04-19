/**
 * ShardStoreClient is a client for a sharded key/value storage system.
 *
 * Key Responsibilities:
 *  - Route client requests to the correct replica group
 *  - Track shard configurations via the ShardMaster
 *  - Ensure at-most-once semantics using sequence numbers
 *  - Handle retries and configuration changes transparently
 *
 * The client supports:
 *  - Single-key operations (GET, PUT, APPEND)
 *  - Multi-key transactions (via two-phase commit)
 *
 * All public methods are synchronised to ensure thread safety.
 */
public class ShardStoreClient extends ShardStoreNode implements Client {

  /* ---------------------------------------------------------------------------------------------
   *  Internal State
   * -------------------------------------------------------------------------------------------*/

  // Monotonically increasing sequence number for at-most-once semantics.
  private int sequenceNum;

  // Currently outstanding command (only one allowed at a time).
  private Command pendingCommand;

  // Result corresponding to the pending command.
  private Result pendingResult;

  // Most recent shard configuration known to the client.
  private ShardConfig currentConfig;

  /* ---------------------------------------------------------------------------------------------
   *  Construction and Initialisation
   * -------------------------------------------------------------------------------------------*/

  /**
   * Constructs a ShardStoreClient.
   * @param address: this client's address
   * @param shardMasters: addresses of shard master replicas
   * @param numShards: total number of shards in the system
   */
  public ShardStoreClient(Address address, Address[] shardMasters, int numShards) {
    super(address, shardMasters, numShards);
  }

  /** Initialises the client state and queries the ShardMaster for configuration. */
  public synchronized void init() {
    sequenceNum = 0;
    pendingCommand = null;
    pendingResult = null;
    currentConfig = null;
    queryShardMaster();
  }

  /* ---------------------------------------------------------------------------------------------
   *  Client API
   * -------------------------------------------------------------------------------------------*/

  /**
   * Sends a command to the sharded key/value system.
   * @param command: the command to execute
   * @throws IllegalStateException if a command is already in progress
   */
  public synchronized void sendCommand(Command command) {
    if (pendingCommand != null) {
      throw new IllegalStateException("Outstanding command already exists.");
    }

    pendingCommand = command;
    pendingResult = null;
    sequenceNum++;

    if (currentConfig == null) {
      queryShardMaster();
    } else {
      dispatchRequest();
    }

    set(new ClientTimer(sequenceNum), ClientTimer.CLIENT_RETRY_MILLIS);
  }

  /**
   * Checks whether the client has received a result.
   * @return true if a result is available
   */
  public synchronized boolean hasResult() {
    return pendingResult != null;
  }

  /**
   * Blocks until the result for the current command is available.
   * @return the result of the command
   * @throws InterruptedException if the thread is interrupted while waiting
   */
  public synchronized Result getResult() throws InterruptedException {
    while (pendingResult == null) {
      wait();
    }

    Result result = pendingResult;

    // Reset state for next command
    pendingResult = null;
    pendingCommand = null;

    return result;
  }

  /* ---------------------------------------------------------------------------------------------
   *  Message Handlers
   * -------------------------------------------------------------------------------------------*/

  /**
   * Handles replies from shard store servers.
   * @param reply: the reply message
   * @param sender: sender address
   */
  private synchronized void handleShardStoreReply(ShardStoreReply reply, Address sender) {

    // Ignore if no active request or already completed
    if (pendingCommand == null || pendingResult != null) return;

    // Wrong group → refresh configuration
    if (reply.wrongGroup()) {
      queryShardMaster();
      return;
    }

    AMOResult amoResult = reply.result();

    // Validate client identity and sequence number
    if (!amoResult.clientAddress().equals(address())) return;
    if (amoResult.sequence() != sequenceNum) return;

    pendingResult = amoResult.result();
    notifyAll();
  }

  /**
   * Handles replies from Paxos (used for shard master queries).
   * @param reply: Paxos reply
   * @param sender: sender address
   */
  private synchronized void handlePaxosReply(PaxosReply reply, Address sender) {
    Result result = reply.result().result();

    if (result instanceof ShardConfig newConfig) {
      handleNewConfiguration(newConfig);
    }

    if (result instanceof Error) {
      queryShardMaster();
    }
  }

  /* ---------------------------------------------------------------------------------------------
   *  Timer Handlers
   * -------------------------------------------------------------------------------------------*/

  /**
   * Retries outstanding requests or re-queries configuration on timeout.
   * @param timer: client retry timer
   */
  private synchronized void onClientTimer(ClientTimer timer) {

    // Ignore stale or completed timers
    if ((timer.sequenceNum() != sequenceNum
        || pendingCommand == null
        || pendingResult != null) && currentConfig != null) {
      return;
    }

    if (currentConfig == null) {
      queryShardMaster();
    } else {
      dispatchRequest();
    }

    set(new ClientTimer(sequenceNum), ClientTimer.CLIENT_RETRY_MILLIS);
  }

  /* ---------------------------------------------------------------------------------------------
   *  Core Logic
   * -------------------------------------------------------------------------------------------*/

  /** Sends a query to all shard masters to obtain the latest configuration. */
  private void queryShardMaster() {
    int requestedConfig = (currentConfig == null) ? -1 : currentConfig.configNum() + 1;

    PaxosRequest request =
        new PaxosRequest(new AMOCommand(address(), new Query(requestedConfig), -1));

    for (Address master : shardMasters()) {
      send(request, master);
    }
  }

  /**
   * Dispatches the pending command to the appropriate replica group.
   * Handles:
   *  - Single-key operations -> routed to owning shard group
   *  - Transactions → routed to coordinator group
   * @throws IllegalStateException if command type is unsupported
   */
  private void dispatchRequest() {
    if (pendingCommand == null) return;

    if (pendingCommand instanceof SingleKeyCommand singleKeyCommand) {
      sendSingleKeyRequest(singleKeyCommand);
      return;
    }

    if (pendingCommand instanceof Transaction transaction) {
      sendTransactionRequest(transaction);
      return;
    }

    throw new IllegalStateException(
        "Unsupported command type: " + pendingCommand.getClass());
  }

  /**
   * Sends a single-key request to the appropriate shard group.
   * @param command: single-key command
   */
  private void sendSingleKeyRequest(SingleKeyCommand command) {
    int shard = keyToShard(command.key());
    int groupId = findGroupForShard(shard);

    if (groupId == -1 || currentConfig == null) {
      queryShardMaster();
      return;
    }

    Set<Address> servers = currentConfig.groupInfo().get(groupId).getLeft();

    AMOCommand amoCommand = new AMOCommand(address(), command, sequenceNum);
    ShardStoreRequest request = new ShardStoreRequest(amoCommand);

    for (Address server : servers) {
      send(request, server);
    }
  }

  /**
   * Sends a transactional request to a coordinator group.
   * Coordinator selected as the group responsible for the
   * smallest shard ID involved in the transaction.
   * @param transaction: transaction command
   */
  private void sendTransactionRequest(Transaction transaction) {

    if (currentConfig == null) {
      queryShardMaster();
      return;
    }

    // Determine all shards involved
    Set<Integer> shards = new LinkedHashSet<>();
    for (String key : transaction.keySet()) {
      shards.add(keyToShard(key));
    }

    int coordinatorShard = Collections.min(shards);
    int coordinatorGroup = findGroupForShard(coordinatorShard);

    Set<Address> servers =
        currentConfig.groupInfo().get(coordinatorGroup).getLeft();

    // Deterministic coordinator selection
    Address coordinator = Collections.min(servers);

    AMOCommand amoCommand = new AMOCommand(address(), transaction, sequenceNum);
    ShardStoreRequest request = new ShardStoreRequest(amoCommand);

    send(request, coordinator);
  }

  /**
   * Updates the client's current configuration if it is newer.
   * @param newConfig: newly received configuration
   */
  private void handleNewConfiguration(ShardConfig newConfig) {
    if (currentConfig == null
        || newConfig.configNum() == currentConfig.configNum() + 1) {

      currentConfig = newConfig;

      // Retry pending request with updated config
      if (pendingCommand != null && pendingResult == null) {
        dispatchRequest();
      }
    }
  }

  /**
   * Finds the group responsible for a given shard.
   * @param shard: shard ID
   * @return group ID, or -1 if not found
   */
  private int findGroupForShard(int shard) {
    for (Map.Entry<Integer, Pair<Set<Address>, Set<Integer>>> entry :
        currentConfig.groupInfo().entrySet()) {

      if (entry.getValue().getRight().contains(shard)) {
        return entry.getKey();
      }
    }
    return -1;
  }
}
