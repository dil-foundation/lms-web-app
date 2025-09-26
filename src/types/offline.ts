// Offline Learning Type Definitions
// Comprehensive types for offline learning functionality

export interface OfflineCourse {
  id: string;
  title: string;
  subtitle?: string;
  description?: string;
  image_url?: string;
  sections: OfflineSection[];
  downloadedAt: Date;
  lastSyncedAt: Date;
  totalSize: number; // in bytes
  downloadStatus: 'pending' | 'downloading' | 'completed' | 'failed' | 'paused';
  downloadProgress: number; // 0-100
  version: number; // for conflict resolution
}

export interface OfflineSection {
  id: string;
  title: string;
  position: number;
  lessons: OfflineLesson[];
}

export interface OfflineLesson {
  id: string;
  title: string;
  overview?: string;
  duration_text?: string;
  position: number;
  contentItems: OfflineContentItem[];
}

export interface OfflineContentItem {
  id: string;
  title?: string;
  content_type: 'video' | 'attachment' | 'assignment' | 'quiz';
  content_path?: string;
  position: number;
  localBlobUrl?: string; // For offline access
  downloadStatus: 'pending' | 'downloading' | 'completed' | 'failed';
  fileSize?: number;
  quiz?: OfflineQuiz;
  due_date?: string;
  retry_settings?: any;
}

export interface OfflineQuiz {
  questions: OfflineQuizQuestion[];
}

export interface OfflineQuizQuestion {
  id: string;
  question: string;
  type: 'multiple_choice' | 'true_false' | 'short_answer';
  options?: OfflineQuizOption[];
  correct_answer?: string;
  points?: number;
  math_expression?: boolean;
  math_tolerance?: number;
  math_hint?: string;
  image_url?: string;
}

export interface OfflineQuizOption {
  id: string;
  text: string;
  is_correct: boolean;
}

// Progress and Sync Types
export interface OfflineProgress {
  id: string;
  userId: string;
  courseId: string;
  contentId: string;
  completed: boolean;
  score?: number;
  timeSpent?: number;
  completedAt: Date;
  syncStatus: 'pending' | 'synced' | 'failed';
  syncAttempts: number;
  lastSyncAttempt?: Date;
  version: number;
}

export interface OfflineQuizSubmission {
  id: string;
  userId: string;
  courseId: string;
  contentId: string;
  answers: OfflineQuizAnswer[];
  score: number;
  totalPoints: number;
  submittedAt: Date;
  syncStatus: 'pending' | 'synced' | 'failed';
  syncAttempts: number;
  lastSyncAttempt?: Date;
  version: number;
}

export interface OfflineQuizAnswer {
  questionId: string;
  answer: string;
  isCorrect?: boolean;
  points?: number;
}

// Storage and Cache Management
export interface StorageInfo {
  usedBytes: number;
  availableBytes: number;
  totalQuota: number;
  courses: OfflineCourseStorageInfo[];
}

export interface OfflineCourseStorageInfo {
  courseId: string;
  courseName: string;
  sizeBytes: number;
  downloadedAt: Date;
  lastAccessedAt: Date;
}

// Sync Engine Types
export interface SyncQueueItem {
  id: string;
  type: 'progress' | 'quiz_submission' | 'course_data';
  data: any;
  priority: 'high' | 'medium' | 'low';
  createdAt: Date;
  attempts: number;
  maxAttempts: number;
  nextAttempt?: Date;
  error?: string;
}

export interface SyncResult {
  success: boolean;
  syncedItems: number;
  failedItems: number;
  errors: SyncError[];
}

export interface SyncError {
  itemId: string;
  type: string;
  error: string;
  timestamp: Date;
}

// Download Management
export interface DownloadQueueItem {
  id: string;
  courseId: string;
  contentId: string;
  contentType: 'video' | 'attachment' | 'course_data';
  url: string;
  priority: 'high' | 'medium' | 'low';
  status: 'pending' | 'downloading' | 'completed' | 'failed' | 'paused';
  progress: number;
  fileSize?: number;
  downloadedBytes?: number;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  error?: string;
}

// Settings and Configuration
export interface OfflineSettings {
  autoDownload: boolean;
  downloadOnWifiOnly: boolean;
  maxStorageGB: number;
  syncFrequency: 'immediate' | 'every_5min' | 'every_15min' | 'manual';
  deleteAfterDays?: number;
  compressVideos: boolean;
  downloadQuality: 'high' | 'medium' | 'low';
  enableBackgroundSync: boolean;
  notifyOnDownloadComplete: boolean;
  notifyOnSyncComplete: boolean;
}

// Events and Notifications
export interface OfflineEvent {
  id?: number;
  type: 'download_started' | 'download_completed' | 'download_failed' | 'download_paused' | 
        'sync_completed' | 'sync_failed' | 'storage_full' | 'storage_cleaned' | 
        'course_updated' | 'settings_changed';
  courseId?: string;
  courseName?: string;
  message: string;
  timestamp: Date;
  data?: any;
  severity: 'info' | 'warning' | 'error' | 'success';
}

// Network Status
export interface NetworkStatus {
  isOnline: boolean;
  connectionType: 'wifi' | 'cellular' | 'ethernet' | 'unknown';
  isMetered: boolean;
  effectiveType: 'slow-2g' | '2g' | '3g' | '4g' | 'unknown';
  downlink: number;
  rtt: number;
}

// Database Schema for IndexedDB
export interface OfflineDatabase {
  courses: OfflineCourse;
  content: {
    id: string;
    contentId: string;
    blob: Blob;
    metadata: {
      contentType: string;
      fileName: string;
      fileSize: number;
      downloadedAt: Date;
      courseId: string;
      lessonId: string;
    };
  };
  progress: OfflineProgress;
  quizSubmissions: OfflineQuizSubmission;
  syncQueue: SyncQueueItem;
  downloadQueue: DownloadQueueItem;
  settings: {
    id: 'user_settings';
    settings: OfflineSettings;
    updatedAt: Date;
  };
  events: OfflineEvent;
}

// API Response Types
export interface OfflineCapabilityInfo {
  isSupported: boolean;
  storageQuota: number;
  usedStorage: number;
  availableStorage: number;
  features: {
    serviceWorker: boolean;
    indexedDB: boolean;
    backgroundSync: boolean;
    persistentStorage: boolean;
  };
}

// Component Props Types
export interface OfflineProviderProps {
  children: React.ReactNode;
  settings?: Partial<OfflineSettings>;
}

export interface OfflineContextValue {
  isOfflineCapable: boolean;
  isOnline: boolean;
  storageInfo: StorageInfo;
  downloadedCourses: OfflineCourse[];
  downloadQueue: DownloadQueueItem[];
  syncQueue: SyncQueueItem[];
  settings: OfflineSettings;
  events: OfflineEvent[];
  
  // Actions
  downloadCourse: (courseId: string) => Promise<void>;
  deleteCourse: (courseId: string) => Promise<void>;
  pauseDownload: (courseId: string) => Promise<void>;
  resumeDownload: (courseId: string) => Promise<void>;
  syncData: () => Promise<SyncResult>;
  updateSettings: (settings: Partial<OfflineSettings>) => Promise<void>;
  clearStorage: () => Promise<void>;
  getOfflineContent: (contentId: string) => Promise<string | null>;
}

// Utility Types
export type DownloadStatus = OfflineCourse['downloadStatus'];
export type SyncStatus = OfflineProgress['syncStatus'];
export type ContentType = OfflineContentItem['content_type'];
export type EventType = OfflineEvent['type'];
export type Priority = SyncQueueItem['priority'];

// Error Types
export interface OfflineError extends Error {
  code: 'STORAGE_FULL' | 'NETWORK_ERROR' | 'SYNC_FAILED' | 'DOWNLOAD_FAILED' | 'DB_ERROR';
  details?: any;
}

// Migration Types (for database versioning)
export interface DatabaseMigration {
  version: number;
  description: string;
  migrate: (db: IDBDatabase, transaction: IDBTransaction) => void;
}
