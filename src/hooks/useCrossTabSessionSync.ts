import { useEffect, useCallback, useRef } from 'react';

interface SessionSyncMessage {
  type: 'SESSION_EXTENDED' | 'SESSION_TIMEOUT';
  timestamp: number;
  tabId: string;
}

class CrossTabSessionSync {
  private static instance: CrossTabSessionSync;
  private channel: BroadcastChannel | null = null;
  private listeners: Map<string, Set<(message: SessionSyncMessage) => void>> = new Map();
  private tabId: string;

  constructor() {
    this.tabId = `tab_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Check if BroadcastChannel is supported
    if (typeof BroadcastChannel !== 'undefined') {
      this.channel = new BroadcastChannel('session-sync');
      this.channel.onmessage = this.handleMessage.bind(this);
    } else {
      // Set up localStorage fallback
      this.setupStorageFallback();
    }
  }

  static getInstance(): CrossTabSessionSync {
    if (!CrossTabSessionSync.instance) {
      CrossTabSessionSync.instance = new CrossTabSessionSync();
    }
    return CrossTabSessionSync.instance;
  }

  private handleMessage(event: MessageEvent<SessionSyncMessage>) {
    const message = event.data;
    console.log('📨 Cross-tab message received:', message);
    
    // Don't process messages from the same tab
    if (message.tabId === this.tabId) {
      console.log('🚫 Ignoring message from same tab');
      return;
    }

    console.log(`📡 Processing ${message.type} message from tab ${message.tabId}`);

    // Notify all listeners for this message type
    const typeListeners = this.listeners.get(message.type);
    if (typeListeners) {
      console.log(`📢 Notifying ${typeListeners.size} listeners for ${message.type}`);
      typeListeners.forEach(listener => {
        try {
          listener(message);
        } catch (error) {
          console.error('❌ Error in session sync listener:', error);
        }
      });
    } else {
      console.log(`⚠️ No listeners found for message type: ${message.type}`);
    }
  }

  public subscribe(type: string, callback: (message: SessionSyncMessage) => void): () => void {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set());
    }
    
    this.listeners.get(type)!.add(callback);

    // Return unsubscribe function
    return () => {
      const typeListeners = this.listeners.get(type);
      if (typeListeners) {
        typeListeners.delete(callback);
        if (typeListeners.size === 0) {
          this.listeners.delete(type);
        }
      }
    };
  }

  public broadcast(type: string): void {
    console.log(`📡 Broadcasting ${type} message from tab ${this.tabId}`);
    
    if (!this.channel) {
      console.log('📦 Using localStorage fallback for cross-tab communication');
      // Fallback to localStorage events if BroadcastChannel is not supported
      this.broadcastViaStorage(type);
      return;
    }

    const message: SessionSyncMessage = {
      type: type as any,
      timestamp: Date.now(),
      tabId: this.tabId
    };

    console.log('📤 Sending message via BroadcastChannel:', message);
    this.channel.postMessage(message);
  }

  private broadcastViaStorage(type: string): void {
    const message: SessionSyncMessage = {
      type: type as any,
      timestamp: Date.now(),
      tabId: this.tabId
    };

    // Store in localStorage to trigger storage event
    localStorage.setItem('session-sync', JSON.stringify(message));
    
    // Clean up immediately to avoid storage bloat
    setTimeout(() => {
      localStorage.removeItem('session-sync');
    }, 100);
  }

  // Set up localStorage fallback for browsers without BroadcastChannel
  private setupStorageFallback(): void {
    if (typeof BroadcastChannel !== 'undefined') {
      return; // Use BroadcastChannel if available
    }

    // Listen for storage events as fallback
    window.addEventListener('storage', (event) => {
      if (event.key === 'session-sync' && event.newValue) {
        try {
          const message: SessionSyncMessage = JSON.parse(event.newValue);
          this.handleMessage({ data: message } as MessageEvent<SessionSyncMessage>);
        } catch (error) {
          console.error('Error parsing storage event:', error);
        }
      }
    });
  }

  public destroy(): void {
    if (this.channel) {
      this.channel.close();
      this.channel = null;
    }
    this.listeners.clear();
  }
}

export const useCrossTabSessionSync = () => {
  const syncManager = useRef(CrossTabSessionSync.getInstance());

  const broadcastSessionExtended = useCallback(() => {
    syncManager.current.broadcast('SESSION_EXTENDED');
  }, []);

  const broadcastSessionTimeout = useCallback(() => {
    syncManager.current.broadcast('SESSION_TIMEOUT');
  }, []);

  const subscribeToSessionExtended = useCallback((callback: (message: SessionSyncMessage) => void) => {
    return syncManager.current.subscribe('SESSION_EXTENDED', callback);
  }, []);

  const subscribeToSessionTimeout = useCallback((callback: (message: SessionSyncMessage) => void) => {
    return syncManager.current.subscribe('SESSION_TIMEOUT', callback);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Don't destroy the singleton, just clean up subscriptions
    };
  }, []);

  return {
    broadcastSessionExtended,
    broadcastSessionTimeout,
    subscribeToSessionExtended,
    subscribeToSessionTimeout
  };
};
