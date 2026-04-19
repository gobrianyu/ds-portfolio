/**
 * ShardMaster is a fault-tolerant configuration manager for a sharded key/value system.
 *
 * Key Responsibilities:
 *  - Maintain a sequence of configurations mapping shards to replica groups
 *  - Handle dynamic membership changes (Join / Leave)
 *  - Support explicit shard reassignment (Move)
 *  - Serve configuration queries (Query)
 *
 * Each configuration assigns all shards to groups, attempting to:
 *  - Balance shards evenly across groups
 *  - Minimise movement of shards between configurations
 *
 * This class is deterministic and intended to be replicated via Paxos.
 */
public final class ShardMaster implements Application {

  // Configuration number of the first valid configuration.
  public static final int INITIAL_CONFIG_NUM = 0;

  // Total number of shards in the system.
  private final int numShards;

  // Mapping from configuration number to configuration.
  private final Map<Integer, ShardConfig> configs = new LinkedHashMap<>();

  // Latest (highest) configuration number. -1 indicates no configuration exists yet.
  private int latestConfigNum = -1;

  /**
   * Constructs a ShardMaster.
   * @param numShards: total number of shards in the system
   */
  public ShardMaster(int numShards) {
    this.numShards = numShards;
  }

  /* ---------------------------------------------------------------------------------------------
   *  Command Definitions
   * -------------------------------------------------------------------------------------------*/

  /** Join command: adds a new replica group. */
  public static final class Join implements ShardMasterCommand {
    private final int groupId;
    private final Set<Address> servers;
  }

  /** Leave command: removes an existing replica group. */
  public static final class Leave implements ShardMasterCommand {
    private final int groupId;
  }

  /** Move command: reassigns a specific shard to a target group. */
  public static final class Move implements ShardMasterCommand {
    private final int groupId;
    private final int shardNum;
  }

  /** Query command: retrieves a specific or latest configuration. */
  public static final class Query implements ShardMasterCommand {
    private final int configNum;

    // Query is read-only and does not modify system state.
    public boolean readOnly() {
      return true;
    }
  }

  /* ---------------------------------------------------------------------------------------------
   *  Result Definitions
   * -------------------------------------------------------------------------------------------*/

  /** Successful operation result. */
  public static final class Ok implements ShardMasterResult {}

  /** Error result (invalid operation or state). */
  public static final class Error implements ShardMasterResult {}

  /**
   * Represents a full shard configuration.
   * Maps: groupId -> (set of servers, set of shards assigned)
   */
  public static final class ShardConfig implements ShardMasterResult {
    private final int configNum;
    private final Map<Integer, Pair<Set<Address>, Set<Integer>>> groupInfo;
  }

  /* ---------------------------------------------------------------------------------------------
   *  Core Execution Logic
   * -------------------------------------------------------------------------------------------*/

  /**
   * Executes a ShardMaster command.
   * @param command: the incoming command
   * @return the result of execution
   * @throws IllegalArgumentException if command type is unknown
   */
  public Result execute(Command command) {

    /* -------------------- JOIN -------------------- */
    if (command instanceof Join join) {

      // Reject if group already exists
      if (latestConfigNum >= 0
          && configs.get(latestConfigNum).groupInfo.containsKey(join.groupId)) {
        return new Error();
      }

      Map<Integer, Pair<Set<Address>, Set<Integer>>> newGroupInfo =
          latestConfigNum >= 0
              ? deepCopy(configs.get(latestConfigNum).groupInfo)
              : new LinkedHashMap<>();

      // Add new group with empty shard set
      newGroupInfo.put(
          join.groupId,
          Pair.of(new LinkedHashSet<>(join.servers), new LinkedHashSet<>()));

      // First group gets all shards
      if (latestConfigNum < 0) {
        for (int shard = 1; shard <= numShards; shard++) {
          newGroupInfo.get(join.groupId).getRight().add(shard);
        }
      } else {
        rebalance(newGroupInfo);
      }

      int newConfigNum =
          latestConfigNum < 0 ? INITIAL_CONFIG_NUM : latestConfigNum + 1;

      configs.put(newConfigNum, new ShardConfig(newConfigNum, newGroupInfo));
      latestConfigNum = newConfigNum;

      return new Ok();
    }

    /* -------------------- LEAVE -------------------- */
    if (command instanceof Leave leave) {

      if (latestConfigNum < 0) return new Error();

      ShardConfig latest = configs.get(latestConfigNum);
      if (!latest.groupInfo.containsKey(leave.groupId)) return new Error();

      Map<Integer, Pair<Set<Address>, Set<Integer>>> newGroupInfo =
          deepCopy(latest.groupInfo);

      // Collect shards to redistribute
      Set<Integer> removedShards =
          new LinkedHashSet<>(newGroupInfo.get(leave.groupId).getRight());

      newGroupInfo.remove(leave.groupId);

      // Redistribute shards
      if (!newGroupInfo.isEmpty()) {
        for (int shard : removedShards) {
          int targetGroup = getLeastLoadedGroup(newGroupInfo);
          newGroupInfo.get(targetGroup).getRight().add(shard);
        }
        rebalance(newGroupInfo);
      }

      latestConfigNum++;
      configs.put(latestConfigNum, new ShardConfig(latestConfigNum, newGroupInfo));

      return new Ok();
    }

    /* -------------------- MOVE -------------------- */
    if (command instanceof Move move) {

      if (latestConfigNum < 0) return new Error();

      ShardConfig latest = configs.get(latestConfigNum);
      if (!latest.groupInfo.containsKey(move.groupId)) return new Error();

      Map<Integer, Pair<Set<Address>, Set<Integer>>> newGroupInfo =
          deepCopy(latest.groupInfo);

      Integer currentOwner = findShardOwner(newGroupInfo, move.shardNum);

      if (currentOwner == null || currentOwner.equals(move.groupId)) {
        return new Error();
      }

      newGroupInfo.get(currentOwner).getRight().remove(move.shardNum);
      newGroupInfo.get(move.groupId).getRight().add(move.shardNum);

      latestConfigNum++;
      configs.put(latestConfigNum, new ShardConfig(latestConfigNum, newGroupInfo));

      return new Ok();
    }

    /* -------------------- QUERY -------------------- */
    if (command instanceof Query query) {

      if (latestConfigNum < 0) return new Error();

      int requested = query.configNum;

      if (requested == -1 || requested > latestConfigNum) {
        return configs.get(latestConfigNum);
      }

      return configs.get(requested);
    }

    throw new IllegalArgumentException("Unknown command type: " + command);
  }

  /* ---------------------------------------------------------------------------------------------
   *  Helper Methods
   * -------------------------------------------------------------------------------------------*/

  /**
   * Rebalances shards across groups to ensure near-even distribution.
   * Ensures deterministic behavior (sorted group IDs) and Minimises shard movement.
   * @param groupInfo: mapping of groupId -> shard assignments
   */
  private void rebalance(Map<Integer, Pair<Set<Address>, Set<Integer>>> groupInfo) {

    List<Integer> groupIds = new ArrayList<>(groupInfo.keySet());
    Collections.sort(groupIds);

    int numGroups = groupIds.size();
    int base = numShards / numGroups;
    int remainder = numShards % numGroups;

    // Desired shard count per group
    Map<Integer, Integer> targetCounts = new LinkedHashMap<>();
    for (int i = 0; i < numGroups; i++) {
      targetCounts.put(groupIds.get(i), i < remainder ? base + 1 : base);
    }

    boolean changed = true;

    while (changed) {
      changed = false;

      for (int from : groupIds) {
        for (int to : groupIds) {
          if (groupInfo.get(from).getRight().size() > targetCounts.get(from)
              && groupInfo.get(to).getRight().size() < targetCounts.get(to)) {

            int shard = Collections.min(groupInfo.get(from).getRight());

            groupInfo.get(from).getRight().remove(shard);
            groupInfo.get(to).getRight().add(shard);

            changed = true;
          }
        }
      }
    }
  }

  /**
   * Finds the group that currently owns a shard.
   * @param groupInfo: mapping of groups
   * @param shardNum: shard identifier
   * @return groupId owning the shard, or null if not found
   */
  private Integer findShardOwner(
      Map<Integer, Pair<Set<Address>, Set<Integer>>> groupInfo,
      int shardNum) {

    for (Map.Entry<Integer, Pair<Set<Address>, Set<Integer>>> entry : groupInfo.entrySet()) {
      if (entry.getValue().getRight().contains(shardNum)) {
        return entry.getKey();
      }
    }
    return null;
  }

  /**
   * Returns the group with the fewest shards.
   * Ties are broken deterministically using smallest group ID.
   * @param groupInfo: mapping of groups
   * @return groupId: with minimal shard count
   */
  private int getLeastLoadedGroup(
      Map<Integer, Pair<Set<Address>, Set<Integer>>> groupInfo) {

    List<Integer> groups = new ArrayList<>(groupInfo.keySet());
    Collections.sort(groups);

    int minGroup = groups.get(0);
    int minShards = groupInfo.get(minGroup).getRight().size();

    for (int group : groups) {
      int size = groupInfo.get(group).getRight().size();
      if (size < minShards) {
        minShards = size;
        minGroup = group;
      }
    }

    return minGroup;
  }
}
