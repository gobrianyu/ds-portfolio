import java.util.List;
import java.util.Map;

public class ShardMaster {
    public void join(Map<Integer, List<String>> groups) {
        Config newConfig = copyLastConfig();
        for (Map.Entry<Integer, List<String>> entry : groups.entrySet()) {
            newConfig.getGroups().put(entry.getKey(), entry.getValue());
        }
        rebalance(newConfig);
        configs.add(newConfig);
    }
}
