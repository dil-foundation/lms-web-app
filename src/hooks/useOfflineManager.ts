// Offline Manager Hook
// React hook for accessing offline learning functionality

import { useState, useEffect, useCallback } from 'react';
import { offlineManager, OfflineManagerStatus } from '@/services/offlineManager';
import { OfflineSettings } from '@/types/offline';
import { offlineDatabase } from '@/services/offlineDatabase';
import { contentDownloader } from '@/services/contentDownloader';

export interface UseOfflineManagerReturn {
  // Status
  status: OfflineManagerStatus | null;
  isInitialized: boolean;
  isOnline: boolean;
  
  // Dashboard data
  storageUsage: { usedBytes: number; totalBytes: number; percentage: number } | null;
  downloadQueue: Array<{ courseId: string; courseName: string; progress: number; status: string }>;
  syncStatus: { isOnline: boolean; lastSync?: Date; pendingItems: number };
  activityLog: Array<{ type: string; message: string; timestamp: Date; severity?: string }>;
  
  // Course management
  downloadCourse: (courseId: string, courseName?: string) => Promise<void>;
  deleteCourse: (courseId: string) => Promise<void>;
  
  // Content access
  getOfflineContent: (contentId: string) => Promise<string | null>;
  
  // Progress tracking
  markContentComplete: (
    userId: string,
    courseId: string,
    contentId: string,
    options?: { score?: number; timeSpent?: number }
  ) => Promise<void>;
  
  submitQuiz: (
    userId: string,
    courseId: string,
    contentId: string,
    answers: any[],
    score: number,
    totalPoints: number
  ) => Promise<string>;
  
  // Sync
  syncData: () => Promise<void>;
  
  // Settings
  settings: OfflineSettings | null;
  updateSettings: (settings: Partial<OfflineSettings>) => Promise<void>;
  
  // Utilities
  clearAllData: () => Promise<void>;
  healthCheck: () => Promise<any>;
  getDiagnostics: () => Promise<any>;
}

export const useOfflineManager = (): UseOfflineManagerReturn => {
  const [status, setStatus] = useState<OfflineManagerStatus | null>(null);
  const [settings, setSettings] = useState<OfflineSettings | null>(null);
  const [storageUsage, setStorageUsage] = useState<{ usedBytes: number; totalBytes: number; percentage: number } | null>(null);
  const [downloadQueue, setDownloadQueue] = useState<Array<{ courseId: string; courseName: string; progress: number; status: string }>>([]);
  const [syncStatus, setSyncStatus] = useState<{ isOnline: boolean; lastSync?: Date; pendingItems: number }>({ isOnline: false, pendingItems: 0 });
  const [activityLog, setActivityLog] = useState<Array<{ type: string; message: string; timestamp: Date; severity?: string }>>([]);

  // Subscribe to status updates
  useEffect(() => {
    const unsubscribe = offlineManager.subscribeToStatus((newStatus) => {
      setStatus(newStatus);
    });

    return unsubscribe;
  }, []);

  // Load settings and dashboard data
  useEffect(() => {
    const loadData = async () => {
      try {
        // Load settings
        try {
          const currentSettings = await offlineManager.getSettings();
          setSettings(currentSettings);
        } catch (error) {
          console.warn('Failed to load settings:', error);
        }

        // Load storage info
        try {
          const storageInfo = await offlineDatabase.getStorageInfo();
          const totalBytes = 5 * 1024 * 1024 * 1024; // 5GB default quota
          setStorageUsage({
            usedBytes: storageInfo.usedBytes,
            totalBytes: totalBytes,
            percentage: Math.round((storageInfo.usedBytes / totalBytes) * 100)
          });
        } catch (error) {
          console.warn('Failed to load storage info:', error);
          setStorageUsage({ usedBytes: 0, totalBytes: 5 * 1024 * 1024 * 1024, percentage: 0 });
        }

        // Load download queue
        try {
          const queue = await offlineDatabase.getDownloadQueue();
          setDownloadQueue(queue.map(item => ({
            courseId: item.courseId,
            courseName: item.courseName,
            progress: item.progress,
            status: item.status
          })));
        } catch (error) {
          console.warn('Failed to load download queue:', error);
          setDownloadQueue([]);
        }

        // Load recent events
        try {
          const events = await offlineDatabase.getEvents(20);
          setActivityLog(events.map(event => ({
            type: event.type,
            message: event.message,
            timestamp: event.timestamp,
            severity: event.severity
          })));
        } catch (error) {
          console.warn('Failed to load events:', error);
          setActivityLog([]);
        }

        // Update sync status
        setSyncStatus({
          isOnline: navigator.onLine,
          pendingItems: 0 // TODO: Get actual pending items
        });

      } catch (error) {
        console.error('Failed to load offline data:', error);
      }
    };

    if (status?.isInitialized) {
      loadData();
    }
  }, [status?.isInitialized]);

  // Refresh data periodically
  useEffect(() => {
    if (!status?.isInitialized) return;

    const interval = setInterval(async () => {
      try {
        // Update download queue
        const queue = await offlineDatabase.getDownloadQueue();
        setDownloadQueue(queue.map(item => ({
          courseId: item.courseId,
          courseName: item.courseName,
          progress: item.progress,
          status: item.status
        })));

        // Update storage usage
        const storageInfo = await offlineDatabase.getStorageInfo();
        const totalBytes = 5 * 1024 * 1024 * 1024; // 5GB default quota
        setStorageUsage({
          usedBytes: storageInfo.usedBytes,
          totalBytes: totalBytes,
          percentage: Math.round((storageInfo.usedBytes / totalBytes) * 100)
        });

      } catch (error) {
        console.error('Failed to refresh offline data:', error);
      }
    }, 5000); // Refresh every 5 seconds

    return () => clearInterval(interval);
  }, [status?.isInitialized]);

  // Course management
  const downloadCourse = useCallback(async (courseId: string, courseName?: string) => {
    await offlineManager.downloadCourse(courseId);
    
    // Refresh data after download starts
    setTimeout(async () => {
      try {
        const queue = await offlineDatabase.getDownloadQueue();
        setDownloadQueue(queue.map(item => ({
          courseId: item.courseId,
          courseName: item.courseName,
          progress: item.progress,
          status: item.status
        })));
      } catch (error) {
        console.error('Failed to refresh download queue:', error);
      }
    }, 1000);
  }, []);

  const deleteCourse = useCallback(async (courseId: string) => {
    await offlineManager.deleteCourse(courseId);
  }, []);

  // Content access
  const getOfflineContent = useCallback(async (contentId: string) => {
    return await offlineManager.getOfflineContent(contentId);
  }, []);

  // Progress tracking
  const markContentComplete = useCallback(async (
    userId: string,
    courseId: string,
    contentId: string,
    options?: { score?: number; timeSpent?: number }
  ) => {
    await offlineManager.markContentComplete(userId, courseId, contentId, options);
  }, []);

  const submitQuiz = useCallback(async (
    userId: string,
    courseId: string,
    contentId: string,
    answers: any[],
    score: number,
    totalPoints: number
  ) => {
    return await offlineManager.submitQuiz(userId, courseId, contentId, answers, score, totalPoints);
  }, []);

  // Sync
  const syncData = useCallback(async () => {
    await offlineManager.syncData();
  }, []);

  // Settings
  const updateSettings = useCallback(async (newSettings: Partial<OfflineSettings>) => {
    await offlineManager.updateSettings(newSettings);
    const updatedSettings = await offlineManager.getSettings();
    setSettings(updatedSettings);
  }, []);

  // Utilities
  const clearAllData = useCallback(async () => {
    await offlineManager.clearAllData();
  }, []);

  const healthCheck = useCallback(async () => {
    return await offlineManager.healthCheck();
  }, []);

  const getDiagnostics = useCallback(async () => {
    return await offlineManager.getDiagnostics();
  }, []);

  return {
    // Status
    status,
    isInitialized: status?.isInitialized || false,
    isOnline: status?.isOnline || false,
    
    // Dashboard data
    storageUsage,
    downloadQueue,
    syncStatus,
    activityLog,
    
    // Course management
    downloadCourse,
    deleteCourse,
    
    // Content access
    getOfflineContent,
    
    // Progress tracking
    markContentComplete,
    submitQuiz,
    
    // Sync
    syncData,
    
    // Settings
    settings,
    updateSettings,
    
    // Utilities
    clearAllData,
    healthCheck,
    getDiagnostics
  };
};

// Specialized hooks for specific functionality
export const useOfflineStatus = () => {
  const { status, isInitialized, isOnline } = useOfflineManager();
  
  return {
    status,
    isInitialized,
    isOnline,
    pendingSyncItems: status?.pendingSyncItems || 0,
    downloadedCourses: status?.downloadedCourses || 0,
    storageUsed: status?.storageUsed || 0,
    capabilities: status?.capabilities
  };
};

export const useOfflineCourses = () => {
  const { downloadCourse, deleteCourse, getOfflineContent } = useOfflineManager();
  
  return {
    downloadCourse,
    deleteCourse,
    getOfflineContent
  };
};

export const useOfflineProgress = () => {
  const { markContentComplete, submitQuiz, syncData } = useOfflineManager();
  
  return {
    markContentComplete,
    submitQuiz,
    syncData
  };
};

export const useOfflineSettings = () => {
  const { settings, updateSettings } = useOfflineManager();
  
  return {
    settings,
    updateSettings
  };
};
