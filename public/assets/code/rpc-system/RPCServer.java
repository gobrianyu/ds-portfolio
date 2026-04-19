/**
 * RPCServer processes client requests and returns responses.
 *
 * This server delegates execution to an AMOApplication,
 * which ensures at-most-once semantics. Combined with client retries,
 * this achieves exactly-once execution.
 *
 * Design:
 *  - Stateless request handling
 *  - No retry logic on server side
 *  - Deduplication handled by AMOApplication
 */
class RPCServer extends Node {

  // Application wrapper providing at-most-once execution
  private final AMOApplication<?> amoApplication;

  /* ---------------------------------------------------------------------------------------------
   *  Construction and Initialisation
   * -------------------------------------------------------------------------------------------*/

  public RPC(Address address, Application application) {
    super(address);

    // Wrap application with at-most-once semantics
    this.amoApplication = new AMOApplication<>(application);
  }

  /* ---------------------------------------------------------------------------------------------
   *  Message Handlers
   * -------------------------------------------------------------------------------------------*/

  /**
   * Handles incoming client requests.
   * Execution flow:
   *  - Execute command via AMOApplication
   *  - Return result (cached if duplicate)
   */
  private void handleRequest(Request request, Address sender) {
    AMOResult result = amoApplication.execute(request.command());
    send(new Reply(result), sender);
  }
}
