/**
 * AMOApplication (At-Most-Once Application)
 *
 * Wraps an underlying Application and guarantees that each
 * client command is executed at most once.
 *
 * Core Idea:
 *  - Track the latest sequence number per client
 *  - If a request is duplicated, return cached result
 *  - If new, execute and store result
 *
 * This component is essential for achieving exactly-once semantics
 * when combined with client retries.
 */
public final class AMOApplication<T extends Application> implements Application {

  // Underlying application being wrapped
  private final T application;

  /**
   * Tracks the latest processed command per client.
   *  - Key: client address  
   *  - Value: last executed sequence number + corresponding result
   */
  private final Map<Address, ClientHistoryEntry> clientHistory = new HashMap<>();

  /** Stores metadata for a client's most recent request. */
  private static final class ClientHistoryEntry implements Serializable {
    final int lastSequenceNumber;
    final AMOResult lastResult;

    ClientHistoryEntry(int lastSequenceNumber, AMOResult lastResult) {
      this.lastSequenceNumber = lastSequenceNumber;
      this.lastResult = lastResult;
    }
  }

  /**
   * Executes a command with at-most-once semantics.
   * Behaviour:
   *  - If command is duplicate, return cached result
   *  - If new, execute and cache result
   */
  public AMOResult execute(Command command) {
    if (!(command instanceof AMOCommand)) {
      throw new IllegalArgumentException("Command must be an AMOCommand");
    }

    AMOCommand amoCommand = (AMOCommand) command;

    Address clientAddress = amoCommand.clientAddress();
    int sequenceNumber = amoCommand.sequence();

    ClientHistoryEntry entry = clientHistory.get(clientAddress);

    // Duplicate or stale request, return cached result
    if (entry != null && sequenceNumber <= entry.lastSequenceNumber) {
      return entry.lastResult;
    }

    // Execute new command
    Result result = application.execute(amoCommand.command());
    AMOResult amoResult = new AMOResult(clientAddress, result, sequenceNumber);

    // Update client history
    clientHistory.put(
        clientAddress,
        new ClientHistoryEntry(sequenceNumber, amoResult)
    );

    return amoResult;
  }

  /**
   * Executes read-only commands.
   * Allows bypassing AMO logic for non-AMO read-only commands.
   */
  public Result executeReadOnly(Command command) {
    if (!command.readOnly()) {
      throw new IllegalArgumentException("Command must be read-only");
    }

    if (command instanceof AMOCommand) {
      return execute(command);
    }

    return application.execute(command);
  }

  /** Checks whether a command has already been executed. */
  public boolean alreadyExecuted(AMOCommand amoCommand) {
    ClientHistoryEntry entry = clientHistory.get(amoCommand.clientAddress());

    if (entry == null) {
      return false;
    }

    return amoCommand.sequence() <= entry.lastSequenceNumber;
  }
}
