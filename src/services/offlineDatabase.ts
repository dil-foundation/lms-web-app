/**
 * Offline Database Service - IndexedDB Management for Course Downloads
 * Handles storage and retrieval of courses, lessons, videos, and assets for offline learning
 * 
 * Database Schema:
 * - courses: Course metadata and download information
 * - lessons: Individual lesson content and structure
 * - videos: Video files stored as blobs with metadata
 * - assets: Course assets (images, documents, etc.)
 * - progress: User progress tracking for offline courses
 * 
 * @version 1.0.0
 */

// Database configuration
const DB_NAME = 'DIL_OfflineLearning';
const DB_VERSION = 1;

// Object store names
export const STORES = {
  COURSES: 'courses',
  LESSONS: 'lessons', 
  VIDEOS: 'videos',
  ASSETS: 'assets',
  PROGRESS: 'progress'
} as const;

// Type definitions for database entities
export interface OfflineCourse {
  id: string;
  title: string;
  subtitle?: string;
  description?: string;
  image_url?: string;
  instructor_name?: string;
  total_lessons: number;
  estimated_duration?: number;
  difficulty_level?: string;
  category?: string;
  downloadDate: number; // timestamp
  lastAccessed: number; // timestamp
  version: string; // course version hash
  totalSize: number; // total size in bytes
  downloadStatus: 'downloading' | 'completed' | 'error' | 'paused';
  downloadProgress: number; // 0-100
  metadata: Record<string, any>; // additional course metadata
}

export interface OfflineLesson {
  id: string;
  courseId: string;
  title: string;
  description?: string;
  content?: string; // lesson content/transcript
  order: number;
  duration?: number; // in seconds
  type: 'video' | 'text' | 'quiz' | 'assignment';
  videoId?: string; // reference to video in videos store
  assetIds: string[]; // references to assets
  metadata: Record<string, any>;
}

export interface OfflineVideo {
  id: string;
  lessonId: string;
  courseId: string;
  originalUrl: string;
  blob: Blob;
  duration: number; // in seconds
  size: number; // in bytes
  quality: string; // '720p', '1080p', etc.
  format: string; // 'mp4', 'webm', etc.
  compressed: boolean;
  compressionRatio?: number; // original size / compressed size
  downloadDate: number; // timestamp
  metadata: Record<string, any>;
}

export interface OfflineAsset {
  id: string;
  courseId: string;
  lessonId?: string; // optional - some assets are course-wide
  originalUrl: string;
  blob: Blob;
  type: 'image' | 'document' | 'audio' | 'other';
  mimeType: string;
  size: number; // in bytes
  filename: string;
  downloadDate: number; // timestamp
  metadata: Record<string, any>;
}

export interface OfflineProgress {
  id: string; // composite key: courseId-lessonId
  courseId: string;
  lessonId: string;
  userId: string;
  completed: boolean;
  progress: number; // 0-100 for partial completion
  timeSpent: number; // in seconds
  lastAccessed: number; // timestamp
  completedAt?: number; // timestamp when completed
  notes?: string; // user notes
  metadata: Record<string, any>;
}

// Storage quota and limits
export const STORAGE_LIMITS = {
  MAX_COURSE_SIZE: 2 * 1024 * 1024 * 1024, // 2GB per course
  MAX_TOTAL_SIZE: 10 * 1024 * 1024 * 1024, // 10GB total
  CLEANUP_THRESHOLD: 0.9, // cleanup when 90% full
  AUTO_CLEANUP_DAYS: 30, // cleanup courses not accessed for 30 days
} as const;

/**
 * Offline Database Manager
 * Handles all IndexedDB operations for offline learning
 */
export class OfflineDatabase {
  private db: IDBDatabase | null = null;
  private initPromise: Promise<void> | null = null;

  /**
   * Initialize the database connection
   */
  async init(): Promise<void> {
    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = this._initDatabase();
    return this.initPromise;
  }

  /**
   * Internal database initialization
   */
  private async _initDatabase(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        console.error('❌ OfflineDB: Failed to open database:', request.error);
        reject(new Error(`Failed to open database: ${request.error?.message}`));
      };

      request.onsuccess = () => {
        this.db = request.result;
        console.log('✅ OfflineDB: Database opened successfully');
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        console.log('🔧 OfflineDB: Upgrading database schema...');

        // Create courses store
        if (!db.objectStoreNames.contains(STORES.COURSES)) {
          const coursesStore = db.createObjectStore(STORES.COURSES, { keyPath: 'id' });
          coursesStore.createIndex('downloadDate', 'downloadDate', { unique: false });
          coursesStore.createIndex('lastAccessed', 'lastAccessed', { unique: false });
          coursesStore.createIndex('downloadStatus', 'downloadStatus', { unique: false });
        }

        // Create lessons store
        if (!db.objectStoreNames.contains(STORES.LESSONS)) {
          const lessonsStore = db.createObjectStore(STORES.LESSONS, { keyPath: 'id' });
          lessonsStore.createIndex('courseId', 'courseId', { unique: false });
          lessonsStore.createIndex('order', 'order', { unique: false });
          lessonsStore.createIndex('type', 'type', { unique: false });
        }

        // Create videos store
        if (!db.objectStoreNames.contains(STORES.VIDEOS)) {
          const videosStore = db.createObjectStore(STORES.VIDEOS, { keyPath: 'id' });
          videosStore.createIndex('lessonId', 'lessonId', { unique: false });
          videosStore.createIndex('courseId', 'courseId', { unique: false });
          videosStore.createIndex('size', 'size', { unique: false });
        }

        // Create assets store
        if (!db.objectStoreNames.contains(STORES.ASSETS)) {
          const assetsStore = db.createObjectStore(STORES.ASSETS, { keyPath: 'id' });
          assetsStore.createIndex('courseId', 'courseId', { unique: false });
          assetsStore.createIndex('lessonId', 'lessonId', { unique: false });
          assetsStore.createIndex('type', 'type', { unique: false });
        }

        // Create progress store
        if (!db.objectStoreNames.contains(STORES.PROGRESS)) {
          const progressStore = db.createObjectStore(STORES.PROGRESS, { keyPath: 'id' });
          progressStore.createIndex('courseId', 'courseId', { unique: false });
          progressStore.createIndex('userId', 'userId', { unique: false });
          progressStore.createIndex('completed', 'completed', { unique: false });
          progressStore.createIndex('lastAccessed', 'lastAccessed', { unique: false });
        }

        console.log('✅ OfflineDB: Database schema created successfully');
      };
    });
  }

  /**
   * Ensure database is initialized before operations
   */
  private async ensureInitialized(): Promise<IDBDatabase> {
    if (!this.db) {
      await this.init();
    }
    if (!this.db) {
      throw new Error('Database not initialized');
    }
    return this.db;
  }

  /**
   * Generic method to perform database transactions
   */
  private async performTransaction<T>(
    storeNames: string | string[],
    mode: IDBTransactionMode,
    operation: (stores: IDBObjectStore | IDBObjectStore[]) => Promise<T> | T
  ): Promise<T> {
    const db = await this.ensureInitialized();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeNames, mode);
      
      transaction.onerror = () => {
        console.error('❌ OfflineDB: Transaction failed:', transaction.error);
        reject(new Error(`Transaction failed: ${transaction.error?.message}`));
      };

      transaction.onabort = () => {
        console.error('❌ OfflineDB: Transaction aborted');
        reject(new Error('Transaction aborted'));
      };

      try {
        const stores = Array.isArray(storeNames) 
          ? storeNames.map(name => transaction.objectStore(name))
          : transaction.objectStore(storeNames);

        const result = operation(stores);
        
        if (result instanceof Promise) {
          result.then(resolve).catch(reject);
        } else {
          resolve(result);
        }
      } catch (error) {
        reject(error);
      }
    });
  }

  // ==================== COURSE OPERATIONS ====================

  /**
   * Store a course in the database
   */
  async storeCourse(course: OfflineCourse): Promise<void> {
    await this.performTransaction(STORES.COURSES, 'readwrite', (store) => {
      return new Promise<void>((resolve, reject) => {
        const request = (store as IDBObjectStore).put(course);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    });
    console.log(`📦 OfflineDB: Course stored - ${course.title} (${course.id})`);
  }

  /**
   * Retrieve a course by ID
   */
  async getCourse(courseId: string): Promise<OfflineCourse | null> {
    return this.performTransaction(STORES.COURSES, 'readonly', (store) => {
      return new Promise<OfflineCourse | null>((resolve, reject) => {
        const request = (store as IDBObjectStore).get(courseId);
        request.onsuccess = () => resolve(request.result || null);
        request.onerror = () => reject(request.error);
      });
    });
  }

  /**
   * Get all downloaded courses
   */
  async getAllCourses(): Promise<OfflineCourse[]> {
    return this.performTransaction(STORES.COURSES, 'readonly', (store) => {
      return new Promise<OfflineCourse[]>((resolve, reject) => {
        const request = (store as IDBObjectStore).getAll();
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => reject(request.error);
      });
    });
  }

  /**
   * Update course download progress
   */
  async updateCourseProgress(courseId: string, progress: number, status?: OfflineCourse['downloadStatus']): Promise<void> {
    const course = await this.getCourse(courseId);
    if (!course) {
      throw new Error(`Course not found: ${courseId}`);
    }

    course.downloadProgress = progress;
    if (status) {
      course.downloadStatus = status;
    }
    if (status === 'completed') {
      course.downloadProgress = 100;
    }

    await this.storeCourse(course);
  }

  /**
   * Update course last accessed time
   */
  async updateCourseAccess(courseId: string): Promise<void> {
    const course = await this.getCourse(courseId);
    if (course) {
      course.lastAccessed = Date.now();
      await this.storeCourse(course);
    }
  }

  /**
   * Delete a course and all its related data
   */
  async deleteCourse(courseId: string): Promise<void> {
    await this.performTransaction(
      [STORES.COURSES, STORES.LESSONS, STORES.VIDEOS, STORES.ASSETS, STORES.PROGRESS],
      'readwrite',
      async (stores) => {
        const [coursesStore, lessonsStore, videosStore, assetsStore, progressStore] = stores as IDBObjectStore[];

        // Delete course
        await new Promise<void>((resolve, reject) => {
          const request = coursesStore.delete(courseId);
          request.onsuccess = () => resolve();
          request.onerror = () => reject(request.error);
        });

        // Delete related lessons
        await this._deleteByIndex(lessonsStore, 'courseId', courseId);
        
        // Delete related videos
        await this._deleteByIndex(videosStore, 'courseId', courseId);
        
        // Delete related assets
        await this._deleteByIndex(assetsStore, 'courseId', courseId);
        
        // Delete related progress
        await this._deleteByIndex(progressStore, 'courseId', courseId);
      }
    );
    console.log(`🗑️ OfflineDB: Course deleted - ${courseId}`);
  }

  /**
   * Helper method to delete records by index
   */
  private async _deleteByIndex(store: IDBObjectStore, indexName: string, value: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const index = store.index(indexName);
      const request = index.openCursor(IDBKeyRange.only(value));
      
      request.onsuccess = () => {
        const cursor = request.result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        } else {
          resolve();
        }
      };
      
      request.onerror = () => reject(request.error);
    });
  }

  // ==================== LESSON OPERATIONS ====================

  /**
   * Store a lesson
   */
  async storeLesson(lesson: OfflineLesson): Promise<void> {
    await this.performTransaction(STORES.LESSONS, 'readwrite', (store) => {
      return new Promise<void>((resolve, reject) => {
        const request = (store as IDBObjectStore).put(lesson);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    });
  }

  /**
   * Get lessons for a course
   */
  async getLessonsByCourse(courseId: string): Promise<OfflineLesson[]> {
    return this.performTransaction(STORES.LESSONS, 'readonly', (store) => {
      return new Promise<OfflineLesson[]>((resolve, reject) => {
        const index = (store as IDBObjectStore).index('courseId');
        const request = index.getAll(courseId);
        request.onsuccess = () => {
          const lessons = request.result || [];
          // Sort by order
          lessons.sort((a, b) => a.order - b.order);
          resolve(lessons);
        };
        request.onerror = () => reject(request.error);
      });
    });
  }

  /**
   * Get a specific lesson
   */
  async getLesson(lessonId: string): Promise<OfflineLesson | null> {
    return this.performTransaction(STORES.LESSONS, 'readonly', (store) => {
      return new Promise<OfflineLesson | null>((resolve, reject) => {
        const request = (store as IDBObjectStore).get(lessonId);
        request.onsuccess = () => resolve(request.result || null);
        request.onerror = () => reject(request.error);
      });
    });
  }

  // ==================== VIDEO OPERATIONS ====================

  /**
   * Store a video
   */
  async storeVideo(video: OfflineVideo): Promise<void> {
    await this.performTransaction(STORES.VIDEOS, 'readwrite', (store) => {
      return new Promise<void>((resolve, reject) => {
        const request = (store as IDBObjectStore).put(video);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    });
    console.log(`🎥 OfflineDB: Video stored - ${video.id} (${(video.size / 1024 / 1024).toFixed(2)}MB)`);
  }

  /**
   * Get a video by ID
   */
  async getVideo(videoId: string): Promise<OfflineVideo | null> {
    return this.performTransaction(STORES.VIDEOS, 'readonly', (store) => {
      return new Promise<OfflineVideo | null>((resolve, reject) => {
        const request = (store as IDBObjectStore).get(videoId);
        request.onsuccess = () => resolve(request.result || null);
        request.onerror = () => reject(request.error);
      });
    });
  }

  /**
   * Get videos for a lesson
   */
  async getVideosByLesson(lessonId: string): Promise<OfflineVideo[]> {
    return this.performTransaction(STORES.VIDEOS, 'readonly', (store) => {
      return new Promise<OfflineVideo[]>((resolve, reject) => {
        const index = (store as IDBObjectStore).index('lessonId');
        const request = index.getAll(lessonId);
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => reject(request.error);
      });
    });
  }

  // ==================== ASSET OPERATIONS ====================

  /**
   * Store an asset
   */
  async storeAsset(asset: OfflineAsset): Promise<void> {
    await this.performTransaction(STORES.ASSETS, 'readwrite', (store) => {
      return new Promise<void>((resolve, reject) => {
        const request = (store as IDBObjectStore).put(asset);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    });
  }

  /**
   * Get assets for a course
   */
  async getAssetsByCourse(courseId: string): Promise<OfflineAsset[]> {
    return this.performTransaction(STORES.ASSETS, 'readonly', (store) => {
      return new Promise<OfflineAsset[]>((resolve, reject) => {
        const index = (store as IDBObjectStore).index('courseId');
        const request = index.getAll(courseId);
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => reject(request.error);
      });
    });
  }

  // ==================== PROGRESS OPERATIONS ====================

  /**
   * Store progress data
   */
  async storeProgress(progress: OfflineProgress): Promise<void> {
    await this.performTransaction(STORES.PROGRESS, 'readwrite', (store) => {
      return new Promise<void>((resolve, reject) => {
        const request = (store as IDBObjectStore).put(progress);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    });
  }

  /**
   * Get progress for a course
   */
  async getProgressByCourse(courseId: string): Promise<OfflineProgress[]> {
    return this.performTransaction(STORES.PROGRESS, 'readonly', (store) => {
      return new Promise<OfflineProgress[]>((resolve, reject) => {
        const index = (store as IDBObjectStore).index('courseId');
        const request = index.getAll(courseId);
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => reject(request.error);
      });
    });
  }

  // ==================== STORAGE MANAGEMENT ====================

  /**
   * Get total storage usage
   */
  async getStorageUsage(): Promise<{ used: number; available: number; quota: number }> {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      const estimate = await navigator.storage.estimate();
      return {
        used: estimate.usage || 0,
        available: (estimate.quota || 0) - (estimate.usage || 0),
        quota: estimate.quota || 0
      };
    }
    
    // Fallback: calculate from stored data
    const courses = await this.getAllCourses();
    const used = courses.reduce((total, course) => total + course.totalSize, 0);
    
    return {
      used,
      available: STORAGE_LIMITS.MAX_TOTAL_SIZE - used,
      quota: STORAGE_LIMITS.MAX_TOTAL_SIZE
    };
  }

  /**
   * Check if there's enough space for a download
   */
  async hasSpaceForDownload(sizeBytes: number): Promise<boolean> {
    const storage = await this.getStorageUsage();
    return storage.available >= sizeBytes;
  }

  /**
   * Clean up old courses
   */
  async cleanupOldCourses(daysOld: number = STORAGE_LIMITS.AUTO_CLEANUP_DAYS): Promise<string[]> {
    const cutoffTime = Date.now() - (daysOld * 24 * 60 * 60 * 1000);
    const courses = await this.getAllCourses();
    const oldCourses = courses.filter(course => course.lastAccessed < cutoffTime);
    
    const deletedCourseIds: string[] = [];
    for (const course of oldCourses) {
      await this.deleteCourse(course.id);
      deletedCourseIds.push(course.id);
    }
    
    if (deletedCourseIds.length > 0) {
      console.log(`🧹 OfflineDB: Cleaned up ${deletedCourseIds.length} old courses`);
    }
    
    return deletedCourseIds;
  }

  /**
   * Close database connection
   */
  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
      this.initPromise = null;
      console.log('🔒 OfflineDB: Database connection closed');
    }
  }
}

// Singleton instance
let offlineDbInstance: OfflineDatabase | null = null;

/**
 * Get the singleton instance of OfflineDatabase
 */
export const getOfflineDatabase = (): OfflineDatabase => {
  if (!offlineDbInstance) {
    offlineDbInstance = new OfflineDatabase();
  }
  return offlineDbInstance;
};

/**
 * Initialize the offline database
 */
export const initOfflineDatabase = async (): Promise<OfflineDatabase> => {
  const db = getOfflineDatabase();
  await db.init();
  return db;
};

export default OfflineDatabase;
