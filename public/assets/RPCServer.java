import java.util.HashMap;
import java.util.Map;

public class RPCServer {
    private final Map<String, Map<Integer, Response>> cache = new HashMap<>();

    public Response handle(Request req) {
        synchronized (cache) {
            if (cache.containsKey(req.getClientId()) && 
                cache.get(req.getClientId()).containsKey(req.getSeq())) {
                return cache.get(req.getClientId()).get(req.getSeq());
            }
        }

        Object result = execute(req.getMethod(), req.getArgs());
        Response resp = new Response(req.getSeq(), result);

        synchronized (cache) {
            cache.computeIfAbsent(req.getClientId(), k -> new HashMap<>())
                 .put(req.getSeq(), resp);
        }
        return resp;
    }
}
