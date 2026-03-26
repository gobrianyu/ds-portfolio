public class ViewService {
    private View currentView;

    public void tick() {
        synchronized (this) {
            if (currentView.getPrimary() != null && isDead(currentView.getPrimary())) {
                promoteBackup();
            }
            // Heartbeat monitoring logic
        }
    }
}
