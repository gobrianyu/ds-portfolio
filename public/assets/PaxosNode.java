public class PaxosNode {
    public void propose(Object value) {
        while (!isDecided(instance)) {
            int n = chooseProposalNumber();
            if (sendPrepare(n)) {
                if (sendAccept(n, value)) {
                    sendDecide(value);
                }
            }
        }
    }
}
