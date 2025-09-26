// IndexedDB Service for Offline Learning Data
// Handles all local data storage and retrieval

import { 
  OfflineDatabase, 
  OfflineCourse, 
  OfflineProgress, 
  OfflineQuizSubmission, 
  SyncQueueItem, 
  DownloadQueueItem, 
  OfflineSettings, 
  OfflineEvent,
  DatabaseMigration
} from '@/types/offline';

const DB_NAME = 'DIL_LMS_OfflineDB';
const DB_VERSION = 2;

// Database migrations for version control
const migrations: DatabaseMigration[] = [
  {
    version: 1,
    description: 'Initial database schema',
    migrate: (db: IDBDatabase) => {
      // Courses store
      if (!db.objectStoreNames.contains('courses')) {
        const coursesStore = db.createObjectStore('courses', { keyPath: 'id' });
        coursesStore.createIndex('downloadStatus', 'downloadStatus', { unique: false });
        coursesStore.createIndex('downloadedAt', 'downloadedAt', { unique: false });
        coursesStore.createIndex('lastSyncedAt', 'lastSyncedAt', { unique: false });
      }

      // Content blobs store
      if (!db.objectStoreNames.contains('content')) {
        const contentStore = db.createObjectStore('content', { keyPath: 'id' });
        contentStore.createIndex('contentId', 'contentId', { unique: false });
        contentStore.createIndex('courseId', 'metadata.courseId', { unique: false });
      }

      // Progress store
      if (!db.objectStoreNames.contains('progress')) {
        const progressStore = db.createObjectStore('progress', { keyPath: 'id' });
        progressStore.createIndex('userId', 'userId', { unique: false });
        progressStore.createIndex('courseId', 'courseId', { unique: false });
        progressStore.createIndex('syncStatus', 'syncStatus', { unique: false });
        progressStore.createIndex('userCourse', ['userId', 'courseId'], { unique: false });
      }

      // Quiz submissions store
      if (!db.objectStoreNames.contains('quizSubmissions')) {
        const quizStore = db.createObjectStore('quizSubmissions', { keyPath: 'id' });
        quizStore.createIndex('userId', 'userId', { unique: false });
        quizStore.createIndex('courseId', 'courseId', { unique: false });
        quizStore.createIndex('syncStatus', 'syncStatus', { unique: false });
        quizStore.createIndex('userCourse', ['userId', 'courseId'], { unique: false });
      }

      // Sync queue store
      if (!db.objectStoreNames.contains('syncQueue')) {
        const syncStore = db.createObjectStore('syncQueue', { keyPath: 'id' });
        syncStore.createIndex('type', 'type', { unique: false });
        syncStore.createIndex('priority', 'priority', { unique: false });
        syncStore.createIndex('createdAt', 'createdAt', { unique: false });
        syncStore.createIndex('nextAttempt', 'nextAttempt', { unique: false });
      }

      // Download queue store
      if (!db.objectStoreNames.contains('downloadQueue')) {
        const downloadStore = db.createObjectStore('downloadQueue', { keyPath: 'id' });
        downloadStore.createIndex('courseId', 'courseId', { unique: false });
        downloadStore.createIndex('status', 'status', { unique: false });
        downloadStore.createIndex('priority', 'priority', { unique: false });
        downloadStore.createIndex('createdAt', 'createdAt', { unique: false });
      }

      // Settings store
      if (!db.objectStoreNames.contains('settings')) {
        db.createObjectStore('settings', { keyPath: 'id' });
      }

      // Events store
      if (!db.objectStoreNames.contains('events')) {
        const eventsStore = db.createObjectStore('events', { keyPath: 'id', autoIncrement: true });
        eventsStore.createIndex('type', 'type', { unique: false });
        eventsStore.createIndex('timestamp', 'timestamp', { unique: false });
        eventsStore.createIndex('courseId', 'courseId', { unique: false });
        eventsStore.createIndex('severity', 'severity', { unique: false });
      }
    }
  },
  {
    version: 2,
    description: 'Add user profiles store',
    migrate: (db: IDBDatabase) => {
      // User profiles store
      if (!db.objectStoreNames.contains('profiles')) {
        const profilesStore = db.createObjectStore('profiles', { keyPath: 'id' });
        profilesStore.createIndex('email', 'email', { unique: false });
        profilesStore.createIndex('role', 'role', { unique: false });
        profilesStore.createIndex('lastUpdated', 'lastUpdated', { unique: false });
      }
    }
  }
];

class OfflineDatabaseService {
  private db: IDBDatabase | null = null;
  private initPromise: Promise<void> | null = null;

  async init(): Promise<void> {
    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = new Promise((resolve, reject) => {
      if (!('indexedDB' in window)) {
        reject(new Error('IndexedDB not supported'));
        return;
      }

      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        console.error('[OfflineDB] Failed to open database:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        console.log('[OfflineDB] Database opened successfully');
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        const oldVersion = event.oldVersion;
        const newVersion = event.newVersion || DB_VERSION;

        console.log(`[OfflineDB] Upgrading database from version ${oldVersion} to ${newVersion}`);

        // Run migrations
        for (const migration of migrations) {
          if (migration.version > oldVersion && migration.version <= newVersion) {
            console.log(`[OfflineDB] Running migration: ${migration.description}`);
            try {
              migration.migrate(db, request.transaction!);
            } catch (error) {
              console.error(`[OfflineDB] Migration failed:`, error);
              throw error;
            }
          }
        }
      };

      request.onblocked = () => {
        console.warn('[OfflineDB] Database upgrade blocked - close other tabs');
      };
    });

    return this.initPromise;
  }

  private async ensureDB(): Promise<IDBDatabase> {
    if (!this.db) {
      await this.init();
    }
    return this.db!;
  }

  private async getStore(storeName: keyof OfflineDatabase, mode: IDBTransactionMode = 'readonly'): Promise<IDBObjectStore> {
    const db = await this.ensureDB();
    const transaction = db.transaction([storeName], mode);
    return transaction.objectStore(storeName);
  }

  private promisifyRequest<T>(request: IDBRequest<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // Course operations
  async saveCourse(course: OfflineCourse): Promise<void> {
    try {
      const store = await this.getStore('courses', 'readwrite');
      await this.promisifyRequest(store.put(course));
      console.log('[OfflineDB] Course saved:', course.id);
    } catch (error) {
      console.error('[OfflineDB] Failed to save course:', error);
      throw error;
    }
  }

  async getCourse(courseId: string): Promise<OfflineCourse | null> {
    try {
      const store = await this.getStore('courses');
      const result = await this.promisifyRequest(store.get(courseId));
      return result || null;
    } catch (error) {
      console.error('[OfflineDB] Failed to get course:', error);
      return null;
    }
  }

  async getAllCourses(): Promise<OfflineCourse[]> {
    try {
      const store = await this.getStore('courses');
      const result = await this.promisifyRequest(store.getAll());
      return result || [];
    } catch (error) {
      console.error('[OfflineDB] Failed to get all courses:', error);
      return [];
    }
  }

  async getCoursesByStatus(status: OfflineCourse['downloadStatus']): Promise<OfflineCourse[]> {
    try {
      const store = await this.getStore('courses');
      const index = store.index('downloadStatus');
      const result = await this.promisifyRequest(index.getAll(status));
      return result || [];
    } catch (error) {
      console.error('[OfflineDB] Failed to get courses by status:', error);
      return [];
    }
  }

  async getCourse(courseId: string): Promise<OfflineCourse | null> {
    try {
      const store = await this.getStore('courses');
      const result = await this.promisifyRequest(store.get(courseId));
      return result || null;
    } catch (error) {
      console.error('[OfflineDB] Failed to get course:', error);
      return null;
    }
  }

  async deleteCourse(courseId: string): Promise<void> {
    try {
      const store = await this.getStore('courses', 'readwrite');
      await this.promisifyRequest(store.delete(courseId));
      console.log('[OfflineDB] Course deleted:', courseId);
    } catch (error) {
      console.error('[OfflineDB] Failed to delete course:', error);
      throw error;
    }
  }

  // Content operations
  async saveContent(contentId: string, blob: Blob, metadata: any): Promise<void> {
    try {
      const store = await this.getStore('content', 'readwrite');
      await this.promisifyRequest(store.put({
        id: contentId,
        contentId,
        blob,
        metadata: {
          ...metadata,
          downloadedAt: new Date()
        }
      }));
      console.log('[OfflineDB] Content saved:', contentId);
    } catch (error) {
      console.error('[OfflineDB] Failed to save content:', error);
      throw error;
    }
  }

  async getContent(contentId: string): Promise<{ blob: Blob; metadata: any } | null> {
    try {
      const store = await this.getStore('content');
      const result = await this.promisifyRequest(store.get(contentId));
      return result ? { blob: result.blob, metadata: result.metadata } : null;
    } catch (error) {
      console.error('[OfflineDB] Failed to get content:', error);
      return null;
    }
  }

  async getContentByCourse(courseId: string): Promise<Array<{ id: string; blob: Blob; metadata: any }>> {
    try {
      const store = await this.getStore('content');
      const index = store.index('courseId');
      const result = await this.promisifyRequest(index.getAll(courseId));
      return result || [];
    } catch (error) {
      console.error('[OfflineDB] Failed to get content by course:', error);
      return [];
    }
  }

  async deleteContent(contentId: string): Promise<void> {
    try {
      const store = await this.getStore('content', 'readwrite');
      await this.promisifyRequest(store.delete(contentId));
      console.log('[OfflineDB] Content deleted:', contentId);
    } catch (error) {
      console.error('[OfflineDB] Failed to delete content:', error);
      throw error;
    }
  }

  async deleteContentByCourse(courseId: string): Promise<void> {
    try {
      const store = await this.getStore('content', 'readwrite');
      const index = store.index('courseId');
      const request = index.openCursor(courseId);
      
      await new Promise<void>((resolve, reject) => {
        request.onsuccess = (event) => {
          const cursor = (event.target as IDBRequest).result;
          if (cursor) {
            cursor.delete();
            cursor.continue();
          } else {
            resolve();
          }
        };
        request.onerror = () => reject(request.error);
      });
      
      console.log('[OfflineDB] All content deleted for course:', courseId);
    } catch (error) {
      console.error('[OfflineDB] Failed to delete course content:', error);
      throw error;
    }
  }

  // Progress operations
  async saveProgress(progress: OfflineProgress): Promise<void> {
    try {
      const store = await this.getStore('progress', 'readwrite');
      await this.promisifyRequest(store.put(progress));
      console.log('[OfflineDB] Progress saved:', progress.id);
    } catch (error) {
      console.error('[OfflineDB] Failed to save progress:', error);
      throw error;
    }
  }

  async getProgress(userId: string, courseId?: string): Promise<OfflineProgress[]> {
    try {
      const store = await this.getStore('progress');
      
      if (courseId) {
        const index = store.index('userCourse');
        const result = await this.promisifyRequest(index.getAll([userId, courseId]));
        return result || [];
      } else {
        const index = store.index('userId');
        const result = await this.promisifyRequest(index.getAll(userId));
        return result || [];
      }
    } catch (error) {
      console.error('[OfflineDB] Failed to get progress:', error);
      return [];
    }
  }

  async getPendingSyncProgress(): Promise<OfflineProgress[]> {
    try {
      const store = await this.getStore('progress');
      const index = store.index('syncStatus');
      const result = await this.promisifyRequest(index.getAll('pending'));
      return result || [];
    } catch (error) {
      console.error('[OfflineDB] Failed to get pending sync progress:', error);
      return [];
    }
  }

  // Quiz submission operations
  async saveQuizSubmission(submission: OfflineQuizSubmission): Promise<void> {
    try {
      const store = await this.getStore('quizSubmissions', 'readwrite');
      await this.promisifyRequest(store.put(submission));
      console.log('[OfflineDB] Quiz submission saved:', submission.id);
    } catch (error) {
      console.error('[OfflineDB] Failed to save quiz submission:', error);
      throw error;
    }
  }

  async getQuizSubmissions(userId: string, courseId?: string): Promise<OfflineQuizSubmission[]> {
    try {
      const store = await this.getStore('quizSubmissions');
      
      if (courseId) {
        const index = store.index('userCourse');
        const result = await this.promisifyRequest(index.getAll([userId, courseId]));
        return result || [];
      } else {
        const index = store.index('userId');
        const result = await this.promisifyRequest(index.getAll(userId));
        return result || [];
      }
    } catch (error) {
      console.error('[OfflineDB] Failed to get quiz submissions:', error);
      return [];
    }
  }

  async getPendingSyncSubmissions(): Promise<OfflineQuizSubmission[]> {
    try {
      const store = await this.getStore('quizSubmissions');
      const index = store.index('syncStatus');
      const result = await this.promisifyRequest(index.getAll('pending'));
      return result || [];
    } catch (error) {
      console.error('[OfflineDB] Failed to get pending sync submissions:', error);
      return [];
    }
  }

  // Sync queue operations
  async addToSyncQueue(item: SyncQueueItem): Promise<void> {
    try {
      const store = await this.getStore('syncQueue', 'readwrite');
      await this.promisifyRequest(store.put(item));
      console.log('[OfflineDB] Item added to sync queue:', item.id);
    } catch (error) {
      console.error('[OfflineDB] Failed to add to sync queue:', error);
      throw error;
    }
  }

  async getSyncQueue(): Promise<SyncQueueItem[]> {
    try {
      const store = await this.getStore('syncQueue');
      const result = await this.promisifyRequest(store.getAll());
      return (result || []).sort((a, b) => {
        const priorityOrder = { high: 0, medium: 1, low: 2 };
        const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
        return priorityDiff !== 0 ? priorityDiff : a.createdAt.getTime() - b.createdAt.getTime();
      });
    } catch (error) {
      console.error('[OfflineDB] Failed to get sync queue:', error);
      return [];
    }
  }

  async updateSyncQueueItem(item: SyncQueueItem): Promise<void> {
    try {
      const store = await this.getStore('syncQueue', 'readwrite');
      await this.promisifyRequest(store.put(item));
    } catch (error) {
      console.error('[OfflineDB] Failed to update sync queue item:', error);
      throw error;
    }
  }

  async removeSyncQueueItem(itemId: string): Promise<void> {
    try {
      const store = await this.getStore('syncQueue', 'readwrite');
      await this.promisifyRequest(store.delete(itemId));
      console.log('[OfflineDB] Sync queue item removed:', itemId);
    } catch (error) {
      console.error('[OfflineDB] Failed to remove sync queue item:', error);
      throw error;
    }
  }

  // Download queue operations
  async addToDownloadQueue(item: DownloadQueueItem): Promise<void> {
    try {
      const store = await this.getStore('downloadQueue', 'readwrite');
      await this.promisifyRequest(store.put(item));
      console.log('[OfflineDB] Item added to download queue:', item.id);
    } catch (error) {
      console.error('[OfflineDB] Failed to add to download queue:', error);
      throw error;
    }
  }

  async getDownloadQueue(): Promise<DownloadQueueItem[]> {
    try {
      const store = await this.getStore('downloadQueue');
      const result = await this.promisifyRequest(store.getAll());
      return (result || []).sort((a, b) => {
        const priorityOrder = { high: 0, medium: 1, low: 2 };
        const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
        return priorityDiff !== 0 ? priorityDiff : a.createdAt.getTime() - b.createdAt.getTime();
      });
    } catch (error) {
      console.error('[OfflineDB] Failed to get download queue:', error);
      return [];
    }
  }

  async getDownloadQueueByCourse(courseId: string): Promise<DownloadQueueItem[]> {
    try {
      const store = await this.getStore('downloadQueue');
      const index = store.index('courseId');
      const result = await this.promisifyRequest(index.getAll(courseId));
      return result || [];
    } catch (error) {
      console.error('[OfflineDB] Failed to get download queue by course:', error);
      return [];
    }
  }

  async updateDownloadQueueItem(item: DownloadQueueItem): Promise<void> {
    try {
      const store = await this.getStore('downloadQueue', 'readwrite');
      await this.promisifyRequest(store.put(item));
    } catch (error) {
      console.error('[OfflineDB] Failed to update download queue item:', error);
      throw error;
    }
  }

  async removeDownloadQueueItem(itemId: string): Promise<void> {
    try {
      const store = await this.getStore('downloadQueue', 'readwrite');
      await this.promisifyRequest(store.delete(itemId));
      console.log('[OfflineDB] Download queue item removed:', itemId);
    } catch (error) {
      console.error('[OfflineDB] Failed to remove download queue item:', error);
      throw error;
    }
  }

  async removeDownloadQueueByCourse(courseId: string): Promise<void> {
    try {
      const store = await this.getStore('downloadQueue', 'readwrite');
      const index = store.index('courseId');
      const request = index.openCursor(courseId);
      
      await new Promise<void>((resolve, reject) => {
        request.onsuccess = (event) => {
          const cursor = (event.target as IDBRequest).result;
          if (cursor) {
            cursor.delete();
            cursor.continue();
          } else {
            resolve();
          }
        };
        request.onerror = () => reject(request.error);
      });
      
      console.log('[OfflineDB] All download queue items removed for course:', courseId);
    } catch (error) {
      console.error('[OfflineDB] Failed to remove course download queue:', error);
      throw error;
    }
  }

  // Settings operations
  async saveSettings(settings: OfflineSettings): Promise<void> {
    try {
      const store = await this.getStore('settings', 'readwrite');
      await this.promisifyRequest(store.put({ 
        id: 'user_settings', 
        settings,
        updatedAt: new Date()
      }));
      console.log('[OfflineDB] Settings saved');
    } catch (error) {
      console.error('[OfflineDB] Failed to save settings:', error);
      throw error;
    }
  }

  async getSettings(): Promise<OfflineSettings | null> {
    try {
      const store = await this.getStore('settings');
      const result = await this.promisifyRequest(store.get('user_settings'));
      return result?.settings || null;
    } catch (error) {
      console.error('[OfflineDB] Failed to get settings:', error);
      return null;
    }
  }

  // Events operations
  async addEvent(event: Omit<OfflineEvent, 'id'>): Promise<void> {
    try {
      const store = await this.getStore('events', 'readwrite');
      await this.promisifyRequest(store.add(event));
      console.log('[OfflineDB] Event added:', event.type);
    } catch (error) {
      console.error('[OfflineDB] Failed to add event:', error);
      throw error;
    }
  }

  async getEvents(limit = 100, courseId?: string): Promise<OfflineEvent[]> {
    try {
      const store = await this.getStore('events');
      
      if (courseId) {
        const index = store.index('courseId');
        const request = index.openCursor(courseId, 'prev');
        
        return new Promise((resolve, reject) => {
          const events: OfflineEvent[] = [];
          request.onsuccess = (event) => {
            const cursor = (event.target as IDBRequest).result;
            if (cursor && events.length < limit) {
              events.push(cursor.value);
              cursor.continue();
            } else {
              resolve(events);
            }
          };
          request.onerror = () => reject(request.error);
        });
      } else {
        const index = store.index('timestamp');
        const request = index.openCursor(null, 'prev');
        
        return new Promise((resolve, reject) => {
          const events: OfflineEvent[] = [];
          request.onsuccess = (event) => {
            const cursor = (event.target as IDBRequest).result;
            if (cursor && events.length < limit) {
              events.push(cursor.value);
              cursor.continue();
            } else {
              resolve(events);
            }
          };
          request.onerror = () => reject(request.error);
        });
      }
    } catch (error) {
      console.error('[OfflineDB] Failed to get events:', error);
      return [];
    }
  }

  async clearOldEvents(olderThanDays: number = 30): Promise<void> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);
      
      const store = await this.getStore('events', 'readwrite');
      const index = store.index('timestamp');
      const request = index.openCursor(IDBKeyRange.upperBound(cutoffDate));
      
      await new Promise<void>((resolve, reject) => {
        request.onsuccess = (event) => {
          const cursor = (event.target as IDBRequest).result;
          if (cursor) {
            cursor.delete();
            cursor.continue();
          } else {
            resolve();
          }
        };
        request.onerror = () => reject(request.error);
      });
      
      console.log('[OfflineDB] Old events cleared');
    } catch (error) {
      console.error('[OfflineDB] Failed to clear old events:', error);
      throw error;
    }
  }

  // Storage calculation and management
  async getStorageInfo(): Promise<{ usedBytes: number; courseCount: number; contentCount: number }> {
    try {
      const courses = await this.getAllCourses();
      const totalSize = courses.reduce((sum, course) => sum + (course.totalSize || 0), 0);
      
      const contentStore = await this.getStore('content');
      const contentCount = await this.promisifyRequest(contentStore.count());
      
      return {
        usedBytes: totalSize,
        courseCount: courses.length,
        contentCount
      };
    } catch (error) {
      console.error('[OfflineDB] Failed to get storage info:', error);
      return { usedBytes: 0, courseCount: 0, contentCount: 0 };
    }
  }

  // Profile operations
  async saveProfile(profile: any): Promise<void> {
    try {
      const profileToSave = {
        ...profile,
        lastUpdated: new Date().toISOString()
      };
      
      const store = await this.getStore('profiles', 'readwrite');
      await this.promisifyRequest(store.put(profileToSave));
      console.log('[OfflineDB] Profile saved:', profile.id);
    } catch (error) {
      console.error('[OfflineDB] Failed to save profile:', error);
      throw error;
    }
  }

  async getProfile(userId: string): Promise<any | null> {
    try {
      const store = await this.getStore('profiles');
      const result = await this.promisifyRequest(store.get(userId));
      return result || null;
    } catch (error) {
      console.error('[OfflineDB] Failed to get profile:', error);
      return null;
    }
  }

  async deleteProfile(userId: string): Promise<void> {
    try {
      const store = await this.getStore('profiles', 'readwrite');
      await this.promisifyRequest(store.delete(userId));
      console.log('[OfflineDB] Profile deleted:', userId);
    } catch (error) {
      console.error('[OfflineDB] Failed to delete profile:', error);
      throw error;
    }
  }

  // Utility methods
  async clearAllData(): Promise<void> {
    try {
      const db = await this.ensureDB();
      const storeNames = ['courses', 'content', 'progress', 'quizSubmissions', 'syncQueue', 'downloadQueue', 'events', 'profiles'];
      const transaction = db.transaction(storeNames, 'readwrite');
      
      const clearPromises = storeNames.map(storeName => 
        this.promisifyRequest(transaction.objectStore(storeName).clear())
      );
      
      await Promise.all(clearPromises);
      console.log('[OfflineDB] All data cleared');
    } catch (error) {
      console.error('[OfflineDB] Failed to clear all data:', error);
      throw error;
    }
  }

  async close(): Promise<void> {
    if (this.db) {
      this.db.close();
      this.db = null;
      this.initPromise = null;
      console.log('[OfflineDB] Database closed');
    }
  }

  // Health check
  async healthCheck(): Promise<boolean> {
    try {
      await this.ensureDB();
      // Try a simple operation
      const store = await this.getStore('settings');
      await this.promisifyRequest(store.count());
      return true;
    } catch (error) {
      console.error('[OfflineDB] Health check failed:', error);
      return false;
    }
  }
}

// Export singleton instance
export const offlineDatabase = new OfflineDatabaseService();
