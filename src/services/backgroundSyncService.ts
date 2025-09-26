// Background Sync Service
// Handles automatic syncing of offline data when connection is restored

import { supabase } from '@/integrations/supabase/client';
import { offlineDatabase } from './offlineDatabase';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { toast } from 'sonner';

export interface SyncResult {
  success: boolean;
  syncedItems: number;
  failedItems: number;
  errors: string[];
}

export interface SyncStatus {
  isActive: boolean;
  progress: number;
  currentItem: string;
  totalItems: number;
  completedItems: number;
}

class BackgroundSyncService {
  private syncInProgress = false;
  private syncStatusCallbacks = new Set<(status: SyncStatus) => void>();
  private retryAttempts = new Map<string, number>();
  private maxRetries = 3;
  private syncInterval: NodeJS.Timeout | null = null;

  async init(): Promise<void> {
    await offlineDatabase.init();
    
    // Start periodic sync check
    this.startPeriodicSync();
    
    // Listen for network status changes
    this.setupNetworkListener();
    
    console.log('[BackgroundSync] Service initialized');
  }

  private setupNetworkListener(): void {
    // This would be called from a React component that uses useNetworkStatus
    // For now, we'll implement a basic online/offline listener
    window.addEventListener('online', () => {
      console.log('[BackgroundSync] Network came online, starting sync');
      this.syncAll();
    });

    window.addEventListener('offline', () => {
      console.log('[BackgroundSync] Network went offline, pausing sync');
      this.pauseSync();
    });
  }

  private startPeriodicSync(): void {
    // Check for pending sync items every 30 seconds when online
    this.syncInterval = setInterval(() => {
      if (navigator.onLine && !this.syncInProgress) {
        this.syncAll();
      }
    }, 30000);
  }

  private pauseSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  // Subscribe to sync status updates
  subscribeToSyncStatus(callback: (status: SyncStatus) => void): () => void {
    this.syncStatusCallbacks.add(callback);
    return () => {
      this.syncStatusCallbacks.delete(callback);
    };
  }

  private notifySyncStatus(status: SyncStatus): void {
    this.syncStatusCallbacks.forEach(callback => callback(status));
  }

  // Main sync method
  async syncAll(): Promise<SyncResult> {
    if (this.syncInProgress) {
      console.log('[BackgroundSync] Sync already in progress');
      return { success: false, syncedItems: 0, failedItems: 0, errors: ['Sync already in progress'] };
    }

    if (!navigator.onLine) {
      console.log('[BackgroundSync] Cannot sync while offline');
      return { success: false, syncedItems: 0, failedItems: 0, errors: ['Device is offline'] };
    }

    this.syncInProgress = true;
    const errors: string[] = [];
    let syncedItems = 0;
    let failedItems = 0;

    try {
      console.log('[BackgroundSync] Starting comprehensive sync');

      // Get all pending sync items
      const pendingProgress = await offlineDatabase.getPendingSyncProgress();
      const pendingQuizSubmissions = await offlineDatabase.getPendingSyncSubmissions();
      const syncQueue = await offlineDatabase.getSyncQueue();

      const totalItems = pendingProgress.length + pendingQuizSubmissions.length + syncQueue.length;

      this.notifySyncStatus({
        isActive: true,
        progress: 0,
        currentItem: 'Starting sync...',
        totalItems,
        completedItems: 0
      });

      // Sync progress data
      for (const progress of pendingProgress) {
        try {
          this.notifySyncStatus({
            isActive: true,
            progress: (syncedItems / totalItems) * 100,
            currentItem: `Syncing progress for content ${progress.contentId}`,
            totalItems,
            completedItems: syncedItems
          });

          await this.syncProgressItem(progress);
          syncedItems++;
        } catch (error) {
          console.error('[BackgroundSync] Failed to sync progress:', error);
          errors.push(`Progress sync failed: ${error}`);
          failedItems++;
        }
      }

      // Sync quiz submissions
      for (const submission of pendingQuizSubmissions) {
        try {
          this.notifySyncStatus({
            isActive: true,
            progress: (syncedItems / totalItems) * 100,
            currentItem: `Syncing ${submission.type === 'assignment' ? 'assignment' : 'quiz'} submission`,
            totalItems,
            completedItems: syncedItems
          });

          if (submission.type === 'assignment') {
            await this.syncAssignmentSubmission(submission);
          } else {
            await this.syncQuizSubmission(submission);
          }
          syncedItems++;
        } catch (error) {
          console.error('[BackgroundSync] Failed to sync submission:', error);
          errors.push(`Submission sync failed: ${error}`);
          failedItems++;
        }
      }

      // Sync other queue items
      for (const item of syncQueue) {
        try {
          this.notifySyncStatus({
            isActive: true,
            progress: (syncedItems / totalItems) * 100,
            currentItem: `Syncing ${item.type}`,
            totalItems,
            completedItems: syncedItems
          });

          await this.syncQueueItem(item);
          syncedItems++;
        } catch (error) {
          console.error('[BackgroundSync] Failed to sync queue item:', error);
          errors.push(`Queue item sync failed: ${error}`);
          failedItems++;
        }
      }

      this.notifySyncStatus({
        isActive: false,
        progress: 100,
        currentItem: 'Sync completed',
        totalItems,
        completedItems: syncedItems
      });

      if (syncedItems > 0) {
        toast.success(`Synced ${syncedItems} item${syncedItems !== 1 ? 's' : ''} successfully`);
      }

      if (failedItems > 0) {
        toast.error(`Failed to sync ${failedItems} item${failedItems !== 1 ? 's' : ''}`);
      }

      console.log(`[BackgroundSync] Sync completed: ${syncedItems} synced, ${failedItems} failed`);

      return {
        success: failedItems === 0,
        syncedItems,
        failedItems,
        errors
      };

    } catch (error) {
      console.error('[BackgroundSync] Sync failed:', error);
      errors.push(`Sync failed: ${error}`);
      
      this.notifySyncStatus({
        isActive: false,
        progress: 0,
        currentItem: 'Sync failed',
        totalItems: 0,
        completedItems: 0
      });

      return {
        success: false,
        syncedItems,
        failedItems: failedItems + 1,
        errors
      };
    } finally {
      this.syncInProgress = false;
    }
  }

  private async syncProgressItem(progress: any): Promise<void> {
    const { data, error } = await supabase
      .from('user_content_item_progress')
      .upsert({
        user_id: progress.userId,
        course_id: progress.courseId,
        content_item_id: progress.contentId,
        progress_data: progress.progressData,
        completed: progress.completed,
        updated_at: new Date().toISOString()
      });

    if (error) throw error;

    // Mark as synced in local database
    progress.syncStatus = 'synced';
    await offlineDatabase.saveProgress(progress);
  }

  private async syncQuizSubmission(submission: any): Promise<void> {
    // Convert offline quiz submission to online format
    const submissionData = {
      user_id: submission.userId,
      course_id: submission.courseId,
      content_item_id: submission.contentId,
      answers: submission.answers,
      score: submission.score,
      submitted_at: submission.submittedAt.toISOString(),
      time_spent: submission.timeSpent
    };

    const { data, error } = await supabase
      .from('quiz_submissions')
      .insert(submissionData);

    if (error) throw error;

    // Mark as synced in local database
    submission.syncStatus = 'synced';
    await offlineDatabase.saveQuizSubmission(submission);
  }

  private async syncAssignmentSubmission(submission: any): Promise<void> {
    // First, upload files to Supabase storage
    const uploadedFiles = [];
    
    for (const file of submission.files || []) {
      try {
        const fileName = `assignments/${submission.courseId}/${submission.userId}/${Date.now()}-${file.name}`;
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('dil-lms')
          .upload(fileName, file.blob, {
            contentType: file.type,
            upsert: false
          });

        if (uploadError) throw uploadError;

        uploadedFiles.push({
          name: file.name,
          size: file.size,
          type: file.type,
          path: uploadData.path
        });
      } catch (error) {
        console.error('[BackgroundSync] Failed to upload file:', file.name, error);
        // Continue with other files
      }
    }

    // Create assignment submission record
    const submissionData = {
      user_id: submission.userId,
      course_id: submission.courseId,
      content_item_id: submission.contentId,
      text_response: submission.textResponse,
      files: uploadedFiles,
      submitted_at: submission.submittedAt.toISOString(),
      metadata: submission.metadata
    };

    const { data, error } = await supabase
      .from('assignment_submissions')
      .insert(submissionData);

    if (error) throw error;

    // Mark as synced in local database
    submission.syncStatus = 'synced';
    await offlineDatabase.saveQuizSubmission(submission);
  }

  private async syncQueueItem(item: any): Promise<void> {
    switch (item.type) {
      case 'progress_update':
        await this.syncProgressItem(item.data);
        break;
      case 'quiz_submission':
        await this.syncQuizSubmission(item.data);
        break;
      case 'assignment_submission':
        await this.syncAssignmentSubmission(item.data);
        break;
      default:
        console.warn('[BackgroundSync] Unknown sync item type:', item.type);
    }

    // Remove from sync queue
    await offlineDatabase.removeSyncQueueItem(item.id);
  }

  // Manual sync trigger
  async forcSync(): Promise<SyncResult> {
    console.log('[BackgroundSync] Force sync triggered');
    return await this.syncAll();
  }

  // Get sync status
  getSyncStatus(): { hasUnsyncedData: boolean; pendingCount: number } {
    // This would need to be implemented with proper state management
    // For now, return a placeholder
    return {
      hasUnsyncedData: false,
      pendingCount: 0
    };
  }

  // Cleanup
  destroy(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }
    
    window.removeEventListener('online', this.syncAll);
    window.removeEventListener('offline', this.pauseSync);
    
    this.syncStatusCallbacks.clear();
    console.log('[BackgroundSync] Service destroyed');
  }
}

// Export singleton instance
export const backgroundSyncService = new BackgroundSyncService();
