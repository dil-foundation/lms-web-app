/**
 * Session Manager Utility
 * Handles session state management and prevents conflicts between tabs
 */

interface SessionState {
  isRefreshing: boolean;
  lastRefresh: number;
  tabId: string;
}

class SessionManager {
  private static instance: SessionManager;
  private tabId: string;
  private sessionState: SessionState;
  private refreshPromise: Promise<any> | null = null;

  constructor() {
    this.tabId = `tab_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.sessionState = {
      isRefreshing: false,
      lastRefresh: 0,
      tabId: this.tabId
    };
  }

  static getInstance(): SessionManager {
    if (!SessionManager.instance) {
      SessionManager.instance = new SessionManager();
    }
    return SessionManager.instance;
  }

  /**
   * Check if a token refresh is already in progress
   */
  isRefreshInProgress(): boolean {
    return this.sessionState.isRefreshing;
  }

  /**
   * Mark refresh as started
   */
  startRefresh(): void {
    this.sessionState.isRefreshing = true;
    this.sessionState.lastRefresh = Date.now();
    console.log(`🔄 [SessionManager] Token refresh started in tab ${this.tabId}`);
  }

  /**
   * Mark refresh as completed
   */
  endRefresh(): void {
    this.sessionState.isRefreshing = false;
    console.log(`✅ [SessionManager] Token refresh completed in tab ${this.tabId}`);
  }

  /**
   * Get the current refresh promise
   */
  getRefreshPromise(): Promise<any> | null {
    return this.refreshPromise;
  }

  /**
   * Set the current refresh promise
   */
  setRefreshPromise(promise: Promise<any> | null): void {
    this.refreshPromise = promise;
  }

  /**
   * Wait for any ongoing refresh to complete
   */
  async waitForRefresh(): Promise<void> {
    if (this.refreshPromise) {
      try {
        await this.refreshPromise;
      } catch (error) {
        console.warn('Previous refresh failed:', error);
      }
    }
  }

  /**
   * Check if we should skip refresh (recently refreshed)
   */
  shouldSkipRefresh(): boolean {
    const now = Date.now();
    const timeSinceLastRefresh = now - this.sessionState.lastRefresh;
    const minRefreshInterval = 10000; // 10 seconds minimum between refreshes

    return timeSinceLastRefresh < minRefreshInterval;
  }

  /**
   * Reset session state
   */
  reset(): void {
    this.sessionState = {
      isRefreshing: false,
      lastRefresh: 0,
      tabId: this.tabId
    };
    this.refreshPromise = null;
  }
}

export const sessionManager = SessionManager.getInstance();

/**
 * Hook to manage session state across components
 */
export const useSessionManager = () => {
  return {
    isRefreshInProgress: () => sessionManager.isRefreshInProgress(),
    startRefresh: () => sessionManager.startRefresh(),
    endRefresh: () => sessionManager.endRefresh(),
    waitForRefresh: () => sessionManager.waitForRefresh(),
    shouldSkipRefresh: () => sessionManager.shouldSkipRefresh(),
    reset: () => sessionManager.reset()
  };
};
