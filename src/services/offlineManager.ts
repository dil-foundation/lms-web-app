// Offline Manager Service
// Central coordinator for all offline learning functionality

import { offlineDatabase } from './offlineDatabase';
import { contentDownloader } from './contentDownloader';
import { offlineContentServer } from './offlineContentServer';
import { syncEngine } from './syncEngine';
import { offlineProgressTracker } from './offlineProgressTracker';
import { cacheManager } from './cacheManager';
import { swAPI } from '@/utils/serviceWorkerRegistration';
import { OfflineSettings, OfflineCapabilityInfo } from '@/types/offline';
import { toast } from 'sonner';

export interface OfflineManagerStatus {
  isInitialized: boolean;
  isOnline: boolean;
  capabilities: OfflineCapabilityInfo;
  pendingSyncItems: number;
  downloadedCourses: number;
  storageUsed: number;
  lastSyncTime?: Date;
}

class OfflineManagerService {
  private isInitialized = false;
  private initPromise: Promise<void> | null = null;
  private statusCallbacks = new Set<(status: OfflineManagerStatus) => void>();

  async init(): Promise<void> {
    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = this.performInit();
    return this.initPromise;
  }

  private async performInit(): Promise<void> {
    try {
      console.log('[OfflineManager] Initializing offline learning system...');

      // Check offline capabilities
      const capabilities = await this.checkOfflineCapabilities();
      if (!capabilities.isSupported) {
        console.warn('[OfflineManager] Offline learning not fully supported');
        return;
      }

      // Initialize all services in order
      await offlineDatabase.init();
      console.log('[OfflineManager] ✓ Database initialized');

      await contentDownloader.init();
      console.log('[OfflineManager] ✓ Content downloader initialized');

      await offlineContentServer.init();
      console.log('[OfflineManager] ✓ Content server initialized');

      await syncEngine.init();
      console.log('[OfflineManager] ✓ Sync engine initialized');

      await offlineProgressTracker.init();
      console.log('[OfflineManager] ✓ Progress tracker initialized');

      // Set up periodic tasks
      this.setupPeriodicTasks();

      // Set up event listeners
      this.setupEventListeners();

      this.isInitialized = true;
      console.log('[OfflineManager] ✅ Offline learning system initialized successfully');

      // Notify status change
      this.notifyStatusChange();

    } catch (error) {
      console.error('[OfflineManager] Failed to initialize offline learning system:', error);
      throw error;
    }
  }

  async checkOfflineCapabilities(): Promise<OfflineCapabilityInfo> {
    const capabilities: OfflineCapabilityInfo = {
      isSupported: true,
      storageQuota: 0,
      usedStorage: 0,
      availableStorage: 0,
      features: {
        serviceWorker: 'serviceWorker' in navigator,
        indexedDB: 'indexedDB' in window,
        backgroundSync: false,
        persistentStorage: false
      }
    };

    // Check IndexedDB
    if (!capabilities.features.indexedDB) {
      capabilities.isSupported = false;
    }

    // Check Service Worker
    if (!capabilities.features.serviceWorker) {
      capabilities.isSupported = false;
    }

    // Check Background Sync
    if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
      capabilities.features.backgroundSync = true;
    }

    // Check Persistent Storage
    if ('storage' in navigator && 'persist' in navigator.storage) {
      capabilities.features.persistentStorage = true;
      
      // Request persistent storage
      try {
        const persistent = await navigator.storage.persist();
        if (persistent) {
          console.log('[OfflineManager] Persistent storage granted');
        }
      } catch (error) {
        console.warn('[OfflineManager] Failed to request persistent storage:', error);
      }
    }

    // Get storage quota
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      try {
        const estimate = await navigator.storage.estimate();
        capabilities.storageQuota = estimate.quota || 0;
        capabilities.usedStorage = estimate.usage || 0;
        capabilities.availableStorage = (estimate.quota || 0) - (estimate.usage || 0);
      } catch (error) {
        console.warn('[OfflineManager] Failed to get storage estimate:', error);
      }
    }

    return capabilities;
  }

  async getStatus(): Promise<OfflineManagerStatus> {
    const capabilities = await this.checkOfflineCapabilities();
    
    let pendingSyncItems = 0;
    let downloadedCourses = 0;
    let storageUsed = 0;

    if (this.isInitialized) {
      try {
        const pendingProgress = await offlineDatabase.getPendingSyncProgress();
        const pendingSubmissions = await offlineDatabase.getPendingSyncSubmissions();
        pendingSyncItems = pendingProgress.length + pendingSubmissions.length;

        const courses = await offlineDatabase.getAllCourses();
        downloadedCourses = courses.length;

        const storageInfo = await offlineDatabase.getStorageInfo();
        storageUsed = storageInfo.usedBytes;
      } catch (error) {
        console.error('[OfflineManager] Failed to get status:', error);
      }
    }

    return {
      isInitialized: this.isInitialized,
      isOnline: navigator.onLine,
      capabilities,
      pendingSyncItems,
      downloadedCourses,
      storageUsed,
      lastSyncTime: undefined // This would come from sync engine
    };
  }

  subscribeToStatus(callback: (status: OfflineManagerStatus) => void): () => void {
    this.statusCallbacks.add(callback);
    
    // Send current status immediately
    this.getStatus().then(callback);
    
    return () => {
      this.statusCallbacks.delete(callback);
    };
  }

  private async notifyStatusChange(): Promise<void> {
    if (this.statusCallbacks.size === 0) return;

    try {
      const status = await this.getStatus();
      for (const callback of this.statusCallbacks) {
        try {
          callback(status);
        } catch (error) {
          console.error('[OfflineManager] Error in status callback:', error);
        }
      }
    } catch (error) {
      console.error('[OfflineManager] Failed to notify status change:', error);
    }
  }

  private setupPeriodicTasks(): void {
    // Cleanup old events every hour
    setInterval(async () => {
      try {
        await offlineDatabase.clearOldEvents(7); // Keep events for 7 days
      } catch (error) {
        console.error('[OfflineManager] Failed to cleanup old events:', error);
      }
    }, 60 * 60 * 1000); // 1 hour

    // Update status every 30 seconds
    setInterval(() => {
      this.notifyStatusChange();
    }, 30000);

    // Cleanup old content based on settings
    setInterval(async () => {
      try {
        await contentDownloader.cleanupOldContent();
      } catch (error) {
        console.error('[OfflineManager] Failed to cleanup old content:', error);
      }
    }, 24 * 60 * 60 * 1000); // 24 hours
  }

  private setupEventListeners(): void {
    // Online/offline events
    window.addEventListener('online', () => {
      console.log('[OfflineManager] Connection restored');
      this.notifyStatusChange();
      
      // Trigger sync when coming online
      setTimeout(() => {
        syncEngine.syncAll({ immediate: false });
      }, 2000); // Wait 2 seconds for connection to stabilize
    });

    window.addEventListener('offline', () => {
      console.log('[OfflineManager] Connection lost');
      this.notifyStatusChange();
    });

    // Page visibility changes
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && navigator.onLine) {
        // Page became visible and we're online, check for sync
        setTimeout(() => {
          syncEngine.syncAll({ immediate: false });
        }, 1000);
      }
    });

    // Before page unload
    window.addEventListener('beforeunload', () => {
      this.cleanup();
    });
  }

  // Public API methods
  async downloadCourse(courseId: string): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('Offline manager not initialized');
    }
    
    return contentDownloader.downloadCourse(courseId);
  }

  async deleteCourse(courseId: string): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('Offline manager not initialized');
    }
    
    return contentDownloader.deleteCourse(courseId);
  }

  async syncData(): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('Offline manager not initialized');
    }
    
    const result = await syncEngine.syncAll({ immediate: true });
    
    if (result.success) {
      toast.success(`Synced ${result.syncedItems} items successfully`);
    } else {
      toast.warning(`Synced ${result.syncedItems} items, ${result.failedItems} failed`);
    }
    
    this.notifyStatusChange();
  }

  async getOfflineContent(contentId: string): Promise<string | null> {
    if (!this.isInitialized) {
      return null;
    }
    
    const content = await offlineContentServer.getContentUrl(contentId);
    return content?.url || null;
  }

  async markContentComplete(
    userId: string, 
    courseId: string, 
    contentId: string, 
    options?: { score?: number; timeSpent?: number }
  ): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('Offline manager not initialized');
    }
    
    await offlineProgressTracker.markContentComplete(userId, courseId, contentId, options);
    this.notifyStatusChange();
  }

  async submitQuiz(
    userId: string,
    courseId: string,
    contentId: string,
    answers: any[],
    score: number,
    totalPoints: number
  ): Promise<string> {
    if (!this.isInitialized) {
      throw new Error('Offline manager not initialized');
    }
    
    const submissionId = await offlineProgressTracker.submitQuiz(userId, {
      courseId,
      contentId,
      answers,
      score,
      totalPoints
    });
    
    this.notifyStatusChange();
    return submissionId;
  }

  async getSettings(): Promise<OfflineSettings> {
    if (!this.isInitialized) {
      throw new Error('Offline manager not initialized');
    }
    
    return contentDownloader.getSettings();
  }

  async updateSettings(settings: Partial<OfflineSettings>): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('Offline manager not initialized');
    }
    
    const currentSettings = await contentDownloader.getSettings();
    const newSettings = { ...currentSettings, ...settings };
    
    await contentDownloader.saveSettings(newSettings);
    
    // Update sync frequency if changed
    if (settings.syncFrequency) {
      syncEngine.startAutoSync(settings.syncFrequency);
    }
    
    this.notifyStatusChange();
  }

  async clearAllData(): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('Offline manager not initialized');
    }
    
    await offlineDatabase.clearAllData();
    cacheManager.clearCache();
    
    toast.success('All offline data cleared');
    this.notifyStatusChange();
  }

  // Health check
  async healthCheck(): Promise<{
    database: boolean;
    contentServer: boolean;
    syncEngine: boolean;
    serviceWorker: boolean;
  }> {
    const health = {
      database: false,
      contentServer: false,
      syncEngine: false,
      serviceWorker: false
    };

    try {
      health.database = await offlineDatabase.healthCheck();
    } catch (error) {
      console.error('[OfflineManager] Database health check failed:', error);
    }

    try {
      // Simple content server check
      health.contentServer = true; // offlineContentServer doesn't have a health check method
    } catch (error) {
      console.error('[OfflineManager] Content server health check failed:', error);
    }

    try {
      // Check if sync engine is responsive
      const status = syncEngine.getCurrentStatus();
      health.syncEngine = status !== null;
    } catch (error) {
      console.error('[OfflineManager] Sync engine health check failed:', error);
    }

    try {
      // Check service worker
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        health.serviceWorker = true;
      }
    } catch (error) {
      console.error('[OfflineManager] Service worker health check failed:', error);
    }

    return health;
  }

  // Diagnostics
  async getDiagnostics(): Promise<{
    version: string;
    initialized: boolean;
    capabilities: OfflineCapabilityInfo;
    health: any;
    storage: any;
    courses: number;
    pendingSync: number;
    errors: string[];
  }> {
    const capabilities = await this.checkOfflineCapabilities();
    const health = await this.healthCheck();
    const status = await this.getStatus();
    
    return {
      version: '1.0.0',
      initialized: this.isInitialized,
      capabilities,
      health,
      storage: {
        used: status.storageUsed,
        quota: capabilities.storageQuota,
        available: capabilities.availableStorage
      },
      courses: status.downloadedCourses,
      pendingSync: status.pendingSyncItems,
      errors: [] // This would collect recent errors
    };
  }

  private cleanup(): void {
    // Cleanup resources
    offlineContentServer.destroy();
    syncEngine.destroy();
    this.statusCallbacks.clear();
  }

  // Getters for individual services (for advanced usage)
  get database() { return offlineDatabase; }
  get downloader() { return contentDownloader; }
  get contentServer() { return offlineContentServer; }
  get sync() { return syncEngine; }
  get progressTracker() { return offlineProgressTracker; }
  get cache() { return cacheManager; }
}

// Export singleton instance
export const offlineManager = new OfflineManagerService();

// Auto-initialize when imported
if (typeof window !== 'undefined') {
  // Initialize after a short delay to allow other services to load
  setTimeout(() => {
    offlineManager.init().catch(error => {
      console.error('[OfflineManager] Auto-initialization failed:', error);
    });
  }, 1000);
}
