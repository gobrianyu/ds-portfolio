/**
 * ShardStoreServer is a replica in a sharded, fault-tolerant key/value system.
 *
 * Key responsibilities:
 *  - Execute client commands via Paxos replication
 *  - Manage shard ownership and reconfiguration
 *  - Transfer shard state between replica groups
 *  - Support distributed transactions using two-phase commit
 *  - Ensure at-most-once semantics
 *
 * This server operates as part of a replica group. Each group runs Paxos
 * to agree on a total order of operations, including:
 *  - Client KV operations
 *  - Transaction phases (prepare, commit, abort)
 *  - Reconfiguration operations
 *  - Shard installations
 *
 * All state transitions are driven through the Paxos log to ensure
 * determinism and linearisability.
 */
public class ShardStoreServer extends ShardStoreNode {

  /* ---------------------------------------------------------------------------------------------
   *  Replica Group Metadata
   * -------------------------------------------------------------------------------------------*/

  // All servers in this replica group.
  private final Address[] group;

  // Unique identifier for this replica group.
  private final int groupId;

  // Identifier used for sub-node Paxos instances.
  private static final String PAXOS_ADDRESS_ID = "paxos";

  // Address of this node's local Paxos instance.
  private Address paxosAddress;

  /* ---------------------------------------------------------------------------------------------
   *  Configuration State
   * -------------------------------------------------------------------------------------------*/

  // Current active configuration.
  private ShardConfig currentConfig;

  // Next configuration being installed.
  private ShardConfig pendingConfig;

  // Whether the server is currently reconfiguring.
  private boolean reconfiguring;

  // Sequence number for shard master queries.
  private int querySequenceNum;

  /* ---------------------------------------------------------------------------------------------
   *  Shard Management State
   * -------------------------------------------------------------------------------------------*/

  // Shards to send to other groups during reconfiguration.
  private final Set<Integer> shardsToSend = new LinkedHashSet<>();

  // Shards expected to be received.
  private final Set<Integer> shardsToReceive = new LinkedHashSet<>();

  // Shards currently being installed.
  private final Set<Integer> installingShards = new LinkedHashSet<>();

  // Mapping: shard → application instance (state machine).
  private final Map<Integer, AMOApplication<TransactionalKVStore>> shardApplications =
      new LinkedHashMap<>();

  /* ---------------------------------------------------------------------------------------------
   *  Paxos Log Commands
   * -------------------------------------------------------------------------------------------*/

  /** Command: install a received shard. */
  private static class InstallShardOp implements Command {
    final int shard;
    final AMOApplication<TransactionalKVStore> application;
  }

  /** Command: apply a new configuration. */
  private static class ReconfigOp implements Command {
    final ShardConfig config;
  }

  /** Command: transaction prepare phase. */
  private static class PrepareOp implements Command {
    final Set<String> keys;
    final String txnId;
    final Address sender;
  }

  /** Command: transaction commit phase. */
  private static class CommitOp implements Command {
    final TxnState txn;
    final Address sender;
    final Map<String, String> writes;
  }

  /** Command: transaction abort. */
  private static class AbortOp implements Command {
    final String txnId;
    final Address sender;
  }

  /* ---------------------------------------------------------------------------------------------
   *  Transaction State
   * -------------------------------------------------------------------------------------------*/

  /** Represents the full state of an in-progress transaction. */
  public static class TxnState implements Serializable {
    String txnId;
    Transaction txn;
    int sequenceNum;
    int configNum;
    Address client;

    // Final result after execution.
    Result result;

    // Groups still expected to reply during prepare phase.
    Map<Integer, Set<String>> outstandingGroups = new LinkedHashMap<>();

    // Groups that have acknowledged commit/abort.
    Set<Integer> committedGroups = new LinkedHashSet<>();

    // Values read during prepare phase.
    Map<String, String> readValues = new LinkedHashMap<>();

    // Final write set for commit.
    Map<String, String> commitWrites = new LinkedHashMap<>();
  }

  /** Transaction lifecycle states. */
  private enum TxnStatus {
    COMMIT, ABORT
  }

  // Active transactions keyed by txnId.
  private final Map<String, TxnState> activeTransactions = new LinkedHashMap<>();

  // Write locks: key → txnId.
  private final Map<String, String> writeLocks = new LinkedHashMap<>();

  // Read locks: key → txnId.
  private final Map<String, String> readLocks = new LinkedHashMap<>();

  /* ---------------------------------------------------------------------------------------------
   *  At-Most-Once + Retry Tracking
   * -------------------------------------------------------------------------------------------*/

  // Tracks number of attempts per client command.
  private final Map<String, Integer> commandAttempts = new LinkedHashMap<>();

  // Highest attempt number seen for each command.
  private final Map<String, Integer> highestAttemptSeen = new LinkedHashMap<>();

  // Completed transaction results (for AMO semantics).
  private final Map<String, AMOResult> completedTransactions = new LinkedHashMap<>();

  /* ---------------------------------------------------------------------------------------------
   *  Construction and Initialisation
   * -------------------------------------------------------------------------------------------*/

  /**
   * Constructs a ShardStoreServer.
   * @param address: this node's address
   * @param shardMasters: shard master replicas
   * @param numShards: total number of shards
   * @param group: replica group members
   * @param groupId: this group's ID
   */
  ShardStoreServer(
      Address address, Address[] shardMasters, int numShards,
      Address[] group, int groupId) {
    super(address, shardMasters, numShards);
    this.group = group;
    this.groupId = groupId;
  }

  /** Initialises the server and starts Paxos. */
  public void init() {

    // Initialise Paxos sub-node
    paxosAddress = Address.subAddress(address(), PAXOS_ADDRESS_ID);

    Address[] paxosAddresses = new Address[group.length];
    for (int i = 0; i < group.length; i++) {
      paxosAddresses[i] = Address.subAddress(group[i], PAXOS_ADDRESS_ID);
    }

    PaxosServer paxosServer =
        new PaxosServer(paxosAddress, paxosAddresses, address());

    addSubNode(paxosServer);
    paxosServer.init();

    currentConfig = null;
    pendingConfig = null;
    reconfiguring = false;
    querySequenceNum = 0;

    queryShardMaster();
  }

  /* ---------------------------------------------------------------------------------------------
   *  Helper Methods`
   * -------------------------------------------------------------------------------------------*/

  /**
   * Determines if this server is the coordinator for a transaction.
   * Coordinator selection is deterministic:
   * group owning the lowest shard, lowest-address server.
   * @param txn: transaction
   * @return true if this server is coordinator
   */
  private boolean isCoordinator(Transaction txn) {
    Set<Integer> shards = new LinkedHashSet<>();
    for (String key : txn.keySet()) {
      shards.add(keyToShard(key));
    }

    int lowestShard = Collections.min(shards);
    int group = groupForShard(currentConfig, lowestShard);

    Set<Address> servers = currentConfig.groupInfo().get(group).getLeft();
    return address().equals(Collections.min(servers));
  }

  /* ---------------------------------------------------------------------------------------------
   *  Core Execution (Paxos Decisions)
   * -------------------------------------------------------------------------------------------*/

  /**
   * Handles decisions from Paxos.
   * All state transitions occur here.
   * @param decision: Paxos decision
   * @param sender: sender address
   */
  private void handlePaxosDecision(PaxosDecision decision, Address sender) {
    AMOCommand amoCommand = decision.command();
    Command command = amoCommand.command();

    if (command instanceof PrepareOp op) {
      finishPrepare(op);
    } else if (command instanceof CommitOp op) {
      applyCommit(op);
    } else if (command instanceof AbortOp op) {
      applyAbort(op);
    } else if (command instanceof ReconfigOp op) {
      applyConfiguration(op.config());
    } else if (command instanceof InstallShardOp op) {
      installShard(op);
    } else {
      executeClientCommand(amoCommand);
    }
  }

  /**
   * Executes a client single-key command.
   * @param command: AMO-wrapped command
   */
  private void executeClientCommand(AMOCommand command) {
    SingleKeyCommand singleKey = (SingleKeyCommand) command.command();
    int shard = keyToShard(singleKey.key());

    if (!shardApplications.containsKey(shard)
        || shardsToReceive.contains(shard)
        || shardsToSend.contains(shard)) {

      send(new ShardStoreReply(null, true), command.clientAddress());
      return;
    }

    AMOResult result = shardApplications.get(shard).execute(command);
    send(new ShardStoreReply(result, false), command.clientAddress());
  }

  /* ---------------------------------------------------------------------------------------------
   *  Transaction Helpers
   * -------------------------------------------------------------------------------------------*/

  /**
   * Releases all locks held by a transaction.
   * @param txnId: transaction ID
   */
  private void releaseLocks(String txnId) {
    for (String key : new LinkedHashSet<>(writeLocks.keySet())) {
      if (txnId.equals(writeLocks.get(key))) {
        writeLocks.remove(key);
      }
    }

    for (String key : new LinkedHashSet<>(readLocks.keySet())) {
      if (txnId.equals(readLocks.get(key))) {
        readLocks.remove(key);
      }
    }
  }

  /**
   * Applies a committed transaction's writes.
   * @param op: commit operation
   */
  private void applyCommit(CommitOp op) {
    for (Map.Entry<String, String> entry : op.writes.entrySet()) {
      int shard = keyToShard(entry.getKey());

      if (!shardApplications.containsKey(shard)) continue;

      Map<String, String> write = new LinkedHashMap<>();
      if (entry.getValue() != null) {
        write.put(entry.getKey(), entry.getValue());
      }

      MultiPut put = new MultiPut(write);
      shardApplications.get(shard)
          .execute(new AMOCommand(op.txn.client, put, op.txn.sequenceNum));
    }

    releaseLocks(op.txn.txnId);

    CommitTxnReply reply = new CommitTxnReply(op.txn, groupId);
    if (op.sender.equals(address())) {
      handleCommitTxnReply(reply, address());
    }
    send(reply, op.sender);
  }

  /**
   * Applies an abort operation.
   * @param op: abort operation
   */
  private void applyAbort(AbortOp op) {
    releaseLocks(op.txnId);

    TxnState txn = activeTransactions.get(op.txnId);

    if (txn != null) {
      txn.committedGroups.add(groupId);

      if (txn.committedGroups.size() ==
          getParticipantGroups(txn.txn).size()) {

        activeTransactions.remove(op.txnId);
        send(new ShardStoreReply(null, true), txn.client);
      }
      return;
    }
    send(new AbortTxnReply(op.txnId, groupId), op.sender);
  }

  /**
   * Completes the prepare phase by returning read values.
   * @param op: prepare operation
   */
  private void finishPrepare(PrepareOp op) {
    Map<String, String> values = readValues(op.keys);
    send(new PrepareTxnReply(op.txnId, true, values), op.sender);
  }

  /* ---------------------------------------------------------------------------------------------
   *  Reconfiguration Logic
   * -------------------------------------------------------------------------------------------*/

  /**
   * Applies a new configuration.
   * @param config: new configuration
   */
  private void applyConfiguration(ShardConfig config) {

    if (currentConfig == null) {
      currentConfig = config;
      initialiseShards(config);
      return;
    }

    if (pendingConfig != null &&
        pendingConfig.configNum() >= config.configNum()) {
      return;
    }

    // Delay reconfiguration if locks are held
    if (!writeLocks.isEmpty() || !readLocks.isEmpty()) {
      pendingConfig = config;
      return;
    }

    pendingConfig = config;
    reconfiguring = true;

    shardsToSend.clear();
    shardsToReceive.clear();
    installingShards.clear();

    Set<Integer> newShards = shardOwner(groupId, config);
    Set<Integer> oldShards = shardOwner(groupId, currentConfig);

    for (int shard : oldShards) {
      if (!newShards.contains(shard)) {
        shardsToSend.add(shard);
      }
    }

    for (int shard : newShards) {
      if (!oldShards.contains(shard)) {
        shardsToReceive.add(shard);
      }
    }

    if (shardsToSend.isEmpty() && shardsToReceive.isEmpty()) {
      finishReconfiguration();
      return;
    }

    sendShards();
    set(new TransferTimer(), TransferTimer.TIMER_RETRY_MILLIS);
  }

  /** Completes reconfiguration if all transfers are done. */
  private void finishReconfiguration() {
    if (!reconfiguring) return;

    if (!shardsToSend.isEmpty()) return;
    if (!shardsToReceive.isEmpty()) return;
    if (!installingShards.isEmpty()) return;

    currentConfig = pendingConfig;
    pendingConfig = null;
    reconfiguring = false;
  }

  /**
   * Initialises shard applications for first configuration.
   * @param config initial configuration
   */
  private void initialiseShards(ShardConfig config) {
    for (int shard : shardOwner(groupId, config)) {
      shardApplications.put(shard,
          new AMOApplication<>(new TransactionalKVStore()));
    }
  }

  /** Queries the shard master for the latest configuration. */
  private void queryShardMaster() {

    int nextConfig =
        (currentConfig == null) ? 0 : currentConfig.configNum() + 1;

    querySequenceNum++;

    PaxosRequest request =
        new PaxosRequest(new AMOCommand(address(), new Query(nextConfig), querySequenceNum));

    for (Address master : shardMasters()) {
      send(request, master);
    }

    set(new QueryTimer(), QueryTimer.TIMER_RETRY_MILLIS);
  }
}
