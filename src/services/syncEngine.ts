// Sync Engine Service
// Handles synchronization of offline data with the server

import { supabase } from '@/integrations/supabase/client';
import { offlineDatabase } from './offlineDatabase';
import { swAPI } from '@/utils/serviceWorkerRegistration';
import { 
  SyncQueueItem, 
  SyncResult, 
  SyncError, 
  OfflineProgress, 
  OfflineQuizSubmission,
  OfflineSettings
} from '@/types/offline';
import { toast } from 'sonner';

export interface SyncOptions {
  immediate?: boolean;
  retryFailed?: boolean;
  maxRetries?: number;
  batchSize?: number;
}

export interface SyncStatus {
  isRunning: boolean;
  progress: number;
  currentItem?: string;
  totalItems: number;
  completedItems: number;
  failedItems: number;
  errors: SyncError[];
}

class SyncEngineService {
  private isRunning = false;
  private syncStatus: SyncStatus = {
    isRunning: false,
    progress: 0,
    totalItems: 0,
    completedItems: 0,
    failedItems: 0,
    errors: []
  };
  private statusCallbacks = new Set<(status: SyncStatus) => void>();
  private autoSyncInterval: NodeJS.Timeout | null = null;

  async init(): Promise<void> {
    await offlineDatabase.init();
    
    // Start auto-sync if enabled
    const settings = await this.getSettings();
    if (settings.syncFrequency !== 'manual') {
      this.startAutoSync(settings.syncFrequency);
    }

    // Register background sync if supported
    if (settings.enableBackgroundSync) {
      await this.registerBackgroundSync();
    }
  }

  // Main sync method
  async syncAll(options: SyncOptions = {}): Promise<SyncResult> {
    if (this.isRunning) {
      console.log('[SyncEngine] Sync already in progress');
      return {
        success: false,
        syncedItems: 0,
        failedItems: 0,
        errors: [{ itemId: 'sync', type: 'system', error: 'Sync already in progress', timestamp: new Date() }]
      };
    }

    try {
      this.isRunning = true;
      this.resetSyncStatus();
      this.notifyStatusChange();

      console.log('[SyncEngine] Starting sync process...');

      // Get all pending sync items
      const syncQueue = await offlineDatabase.getSyncQueue();
      const pendingProgress = await offlineDatabase.getPendingSyncProgress();
      const pendingSubmissions = await offlineDatabase.getPendingSyncSubmissions();

      const allItems = [
        ...syncQueue,
        ...pendingProgress.map(p => this.createProgressSyncItem(p)),
        ...pendingSubmissions.map(s => this.createSubmissionSyncItem(s))
      ];

      this.syncStatus.totalItems = allItems.length;
      this.notifyStatusChange();

      if (allItems.length === 0) {
        console.log('[SyncEngine] No items to sync');
        return {
          success: true,
          syncedItems: 0,
          failedItems: 0,
          errors: []
        };
      }

      // Process items in batches
      const batchSize = options.batchSize || 10;
      const results: SyncResult[] = [];

      for (let i = 0; i < allItems.length; i += batchSize) {
        const batch = allItems.slice(i, i + batchSize);
        const batchResult = await this.processSyncBatch(batch, options);
        results.push(batchResult);

        // Update progress
        this.syncStatus.completedItems += batchResult.syncedItems;
        this.syncStatus.failedItems += batchResult.failedItems;
        this.syncStatus.progress = Math.round((this.syncStatus.completedItems / this.syncStatus.totalItems) * 100);
        this.syncStatus.errors.push(...batchResult.errors);
        this.notifyStatusChange();
      }

      // Combine results
      const finalResult: SyncResult = {
        success: results.every(r => r.success),
        syncedItems: results.reduce((sum, r) => sum + r.syncedItems, 0),
        failedItems: results.reduce((sum, r) => sum + r.failedItems, 0),
        errors: results.flatMap(r => r.errors)
      };

      console.log('[SyncEngine] Sync completed:', finalResult);

      // Show notification if enabled
      const settings = await this.getSettings();
      if (settings.notifyOnSyncComplete && finalResult.syncedItems > 0) {
        toast.success(`Synced ${finalResult.syncedItems} items successfully`);
      }

      if (finalResult.failedItems > 0) {
        toast.warning(`${finalResult.failedItems} items failed to sync`);
      }

      await this.addEvent({
        type: finalResult.success ? 'sync_completed' : 'sync_failed',
        message: `Sync completed: ${finalResult.syncedItems} synced, ${finalResult.failedItems} failed`,
        timestamp: new Date(),
        severity: finalResult.success ? 'success' : 'warning'
      });

      return finalResult;

    } catch (error) {
      console.error('[SyncEngine] Sync failed:', error);
      
      const errorResult: SyncResult = {
        success: false,
        syncedItems: 0,
        failedItems: this.syncStatus.totalItems,
        errors: [{
          itemId: 'sync',
          type: 'system',
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date()
        }]
      };

      await this.addEvent({
        type: 'sync_failed',
        message: `Sync failed: ${error}`,
        timestamp: new Date(),
        severity: 'error'
      });

      return errorResult;

    } finally {
      this.isRunning = false;
      this.syncStatus.isRunning = false;
      this.notifyStatusChange();
    }
  }

  // Sync specific types of data
  async syncProgress(options: SyncOptions = {}): Promise<SyncResult> {
    try {
      const pendingProgress = await offlineDatabase.getPendingSyncProgress();
      
      if (pendingProgress.length === 0) {
        return { success: true, syncedItems: 0, failedItems: 0, errors: [] };
      }

      const syncItems = pendingProgress.map(p => this.createProgressSyncItem(p));
      return await this.processSyncBatch(syncItems, options);
    } catch (error) {
      console.error('[SyncEngine] Failed to sync progress:', error);
      return {
        success: false,
        syncedItems: 0,
        failedItems: 0,
        errors: [{
          itemId: 'progress-sync',
          type: 'progress',
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date()
        }]
      };
    }
  }

  async syncQuizSubmissions(options: SyncOptions = {}): Promise<SyncResult> {
    try {
      const pendingSubmissions = await offlineDatabase.getPendingSyncSubmissions();
      
      if (pendingSubmissions.length === 0) {
        return { success: true, syncedItems: 0, failedItems: 0, errors: [] };
      }

      const syncItems = pendingSubmissions.map(s => this.createSubmissionSyncItem(s));
      return await this.processSyncBatch(syncItems, options);
    } catch (error) {
      console.error('[SyncEngine] Failed to sync quiz submissions:', error);
      return {
        success: false,
        syncedItems: 0,
        failedItems: 0,
        errors: [{
          itemId: 'quiz-sync',
          type: 'quiz_submission',
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date()
        }]
      };
    }
  }

  // Status management
  subscribeToStatus(callback: (status: SyncStatus) => void): () => void {
    this.statusCallbacks.add(callback);
    
    // Send current status immediately
    callback(this.syncStatus);
    
    return () => {
      this.statusCallbacks.delete(callback);
    };
  }

  getCurrentStatus(): SyncStatus {
    return { ...this.syncStatus };
  }

  // Auto-sync management
  startAutoSync(frequency: OfflineSettings['syncFrequency']): void {
    this.stopAutoSync();

    if (frequency === 'manual') return;

    const intervals = {
      immediate: 30000, // 30 seconds for immediate mode
      every_5min: 5 * 60 * 1000,
      every_15min: 15 * 60 * 1000
    };

    const interval = intervals[frequency];
    if (interval) {
      this.autoSyncInterval = setInterval(() => {
        if (!this.isRunning) {
          this.syncAll({ immediate: false });
        }
      }, interval);

      console.log(`[SyncEngine] Auto-sync started with ${frequency} frequency`);
    }
  }

  stopAutoSync(): void {
    if (this.autoSyncInterval) {
      clearInterval(this.autoSyncInterval);
      this.autoSyncInterval = null;
      console.log('[SyncEngine] Auto-sync stopped');
    }
  }

  // Background sync registration
  private async registerBackgroundSync(): Promise<void> {
    try {
      await swAPI.registerBackgroundSync('offline-sync');
      console.log('[SyncEngine] Background sync registered');
    } catch (error) {
      console.warn('[SyncEngine] Failed to register background sync:', error);
    }
  }

  // Private methods
  private async processSyncBatch(items: SyncQueueItem[], options: SyncOptions): Promise<SyncResult> {
    const results: { success: boolean; error?: string }[] = [];

    for (const item of items) {
      this.syncStatus.currentItem = item.id;
      this.notifyStatusChange();

      try {
        const success = await this.syncItem(item);
        results.push({ success });

        if (success) {
          // Remove from sync queue if it was originally there
          if (item.type !== 'progress' && item.type !== 'quiz_submission') {
            await offlineDatabase.removeSyncQueueItem(item.id);
          }
        } else {
          // Update retry count
          item.attempts++;
          item.nextAttempt = new Date(Date.now() + Math.pow(2, item.attempts) * 60000); // Exponential backoff
          
          if (item.attempts >= item.maxAttempts) {
            // Max retries reached, remove from queue
            await offlineDatabase.removeSyncQueueItem(item.id);
            results.push({ success: false, error: 'Max retries exceeded' });
          } else {
            // Update item in queue for retry
            await offlineDatabase.addToSyncQueue(item);
            results.push({ success: false, error: 'Will retry later' });
          }
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        results.push({ success: false, error: errorMessage });
        console.error(`[SyncEngine] Failed to sync item ${item.id}:`, error);
      }
    }

    const syncedItems = results.filter(r => r.success).length;
    const failedItems = results.filter(r => !r.success).length;
    const errors: SyncError[] = results
      .filter(r => !r.success && r.error)
      .map((r, i) => ({
        itemId: items[i].id,
        type: items[i].type,
        error: r.error!,
        timestamp: new Date()
      }));

    return {
      success: failedItems === 0,
      syncedItems,
      failedItems,
      errors
    };
  }

  private async syncItem(item: SyncQueueItem): Promise<boolean> {
    switch (item.type) {
      case 'progress':
        return await this.syncProgressItem(item.data as OfflineProgress);
      case 'quiz_submission':
        return await this.syncQuizSubmissionItem(item.data as OfflineQuizSubmission);
      case 'course_data':
        return await this.syncCourseDataItem(item.data);
      default:
        console.warn(`[SyncEngine] Unknown sync item type: ${item.type}`);
        return false;
    }
  }

  private async syncProgressItem(progress: OfflineProgress): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('offline_content_progress')
        .upsert({
          user_id: progress.userId,
          course_id: progress.courseId,
          content_id: progress.contentId,
          completed: progress.completed,
          score: progress.score,
          time_spent: progress.timeSpent,
          completed_at: progress.completedAt.toISOString(),
          sync_status: 'synced',
          sync_attempts: progress.syncAttempts,
          last_sync_attempt: new Date().toISOString(),
          version: progress.version,
          updated_at: new Date().toISOString()
        });

      if (error) {
        console.error('[SyncEngine] Failed to sync progress:', error);
        return false;
      }

      // Update local record as synced
      progress.syncStatus = 'synced';
      progress.lastSyncAttempt = new Date();
      await offlineDatabase.saveProgress(progress);

      return true;
    } catch (error) {
      console.error('[SyncEngine] Error syncing progress:', error);
      return false;
    }
  }

  private async syncQuizSubmissionItem(submission: OfflineQuizSubmission): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('quiz_submissions')
        .upsert({
          id: submission.id,
          user_id: submission.userId,
          course_id: submission.courseId,
          lesson_content_id: submission.contentId, // Use existing field name
          answers: submission.answers,
          score: submission.score,
          submitted_at: submission.submittedAt.toISOString()
        });

      if (error) {
        console.error('[SyncEngine] Failed to sync quiz submission:', error);
        return false;
      }

      // Update local record as synced
      submission.syncStatus = 'synced';
      submission.lastSyncAttempt = new Date();
      await offlineDatabase.saveQuizSubmission(submission);

      return true;
    } catch (error) {
      console.error('[SyncEngine] Error syncing quiz submission:', error);
      return false;
    }
  }

  private async syncCourseDataItem(data: any): Promise<boolean> {
    try {
      // This would handle syncing course-related data
      // Implementation depends on specific requirements
      console.log('[SyncEngine] Syncing course data:', data);
      return true;
    } catch (error) {
      console.error('[SyncEngine] Error syncing course data:', error);
      return false;
    }
  }

  private createProgressSyncItem(progress: OfflineProgress): SyncQueueItem {
    return {
      id: `progress-${progress.id}`,
      type: 'progress',
      data: progress,
      priority: 'medium',
      createdAt: new Date(),
      attempts: progress.syncAttempts,
      maxAttempts: 3
    };
  }

  private createSubmissionSyncItem(submission: OfflineQuizSubmission): SyncQueueItem {
    return {
      id: `submission-${submission.id}`,
      type: 'quiz_submission',
      data: submission,
      priority: 'high',
      createdAt: new Date(),
      attempts: submission.syncAttempts,
      maxAttempts: 3
    };
  }

  private resetSyncStatus(): void {
    this.syncStatus = {
      isRunning: true,
      progress: 0,
      totalItems: 0,
      completedItems: 0,
      failedItems: 0,
      errors: []
    };
  }

  private notifyStatusChange(): void {
    for (const callback of this.statusCallbacks) {
      try {
        callback(this.syncStatus);
      } catch (error) {
        console.error('[SyncEngine] Error in status callback:', error);
      }
    }
  }

  private async getSettings(): Promise<OfflineSettings> {
    const settings = await offlineDatabase.getSettings();
    return settings || {
      autoDownload: false,
      downloadOnWifiOnly: false, // Allow downloads on all connections by default
      maxStorageGB: 5,
      syncFrequency: 'immediate',
      deleteAfterDays: 30,
      compressVideos: false,
      downloadQuality: 'medium',
      enableBackgroundSync: true,
      notifyOnDownloadComplete: true,
      notifyOnSyncComplete: true
    };
  }

  private async addEvent(event: Omit<import('@/types/offline').OfflineEvent, 'id'>): Promise<void> {
    try {
      await offlineDatabase.addEvent(event);
    } catch (error) {
      console.error('[SyncEngine] Failed to add event:', error);
    }
  }

  // Cleanup
  destroy(): void {
    this.stopAutoSync();
    this.statusCallbacks.clear();
  }
}

// Export singleton instance
export const syncEngine = new SyncEngineService();

// Cleanup on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    syncEngine.destroy();
  });
}
