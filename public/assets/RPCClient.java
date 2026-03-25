public class RPCClient {
    private int nextSeq = 0;
    private final Connection conn;

    public Object call(String method, Object args) throws Exception {
        int seq = nextSeq++;
        while (true) {
            Request req = new Request(seq, method, args);
            conn.send(req);
            Response resp = conn.receive(timeout);
            if (resp != null && resp.getSeq() == seq) {
                return resp.getResult();
            }
            Thread.sleep(RETRY_INTERVAL);
        }
    }
}
