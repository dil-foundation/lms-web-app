/**
 * Global offline state management utility
 * Helps clear cached data that might contain network URLs when going offline
 */

type StateCleanupCallback = () => void;

class OfflineStateManager {
  private cleanupCallbacks: Set<StateCleanupCallback> = new Set();
  private isSetup = false;

  /**
   * Register a callback to be called when the device goes offline
   */
  registerCleanup(callback: StateCleanupCallback): () => void {
    this.cleanupCallbacks.add(callback);
    
    // Return unregister function
    return () => {
      this.cleanupCallbacks.delete(callback);
    };
  }

  /**
   * Setup global offline event listeners
   */
  setup(): void {
    if (this.isSetup) return;

    const handleOffline = () => {
      console.log('🔴 OfflineStateManager: Device went offline, cleaning up cached data');
      this.cleanupCallbacks.forEach(callback => {
        try {
          callback();
        } catch (error) {
          console.error('Error in offline cleanup callback:', error);
        }
      });
    };

    const handleOnline = () => {
      console.log('🟢 OfflineStateManager: Device back online');
    };

    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);

    this.isSetup = true;

    console.log('🛡️ OfflineStateManager: Setup complete');
  }

  /**
   * Manually trigger cleanup (useful for testing)
   */
  triggerCleanup(): void {
    this.cleanupCallbacks.forEach(callback => callback());
  }
}

export const offlineStateManager = new OfflineStateManager();
