// Offline Data Hook
// Provides seamless access to cached and online data

import { useState, useEffect, useCallback } from 'react';
import { useNetworkStatus } from './useNetworkStatus';
import { cacheManager, CacheOptions } from '@/services/cacheManager';
import { offlineDatabase } from '@/services/offlineDatabase';
import { OfflineCourse, OfflineProgress, OfflineQuizSubmission } from '@/types/offline';

export interface UseOfflineDataOptions {
  autoRefresh?: boolean;
  refreshInterval?: number;
  fallbackToCache?: boolean;
}

export interface OfflineDataState<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  isFromCache: boolean;
  lastUpdated: Date | null;
  refresh: () => Promise<void>;
}

// Generic hook for offline-capable data fetching
export function useOfflineData<T>(
  key: string,
  fetcher: () => Promise<T>,
  options: UseOfflineDataOptions = {}
): OfflineDataState<T> {
  const [state, setState] = useState<OfflineDataState<T>>({
    data: null,
    loading: true,
    error: null,
    isFromCache: false,
    lastUpdated: null,
    refresh: async () => {}
  });

  const { isOnline } = useNetworkStatus();
  const { autoRefresh = true, refreshInterval = 5 * 60 * 1000, fallbackToCache = true } = options;

  const fetchData = useCallback(async (forceRefresh = false) => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const cacheOptions: CacheOptions = {
        forceRefresh,
        fallbackToCache: fallbackToCache && !isOnline
      };

      const data = await cacheManager.get(key, fetcher, cacheOptions);
      
      setState(prev => ({
        ...prev,
        data,
        loading: false,
        error: null,
        isFromCache: !isOnline,
        lastUpdated: new Date()
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error as Error
      }));
    }
  }, [key, fetcher, isOnline, fallbackToCache]);

  const refresh = useCallback(async () => {
    await fetchData(true);
  }, [fetchData]);

  // Initial data fetch
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Auto refresh when coming online
  useEffect(() => {
    if (isOnline && autoRefresh && state.data) {
      fetchData();
    }
  }, [isOnline, autoRefresh, fetchData, state.data]);

  // Periodic refresh
  useEffect(() => {
    if (!autoRefresh || !isOnline) return;

    const interval = setInterval(() => {
      fetchData();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, isOnline, refreshInterval, fetchData]);

  return {
    ...state,
    refresh
  };
}

// Specialized hooks for common data types
export function useCourses(userId?: string, options: UseOfflineDataOptions = {}) {
  return useOfflineData(
    `courses:${userId || 'all'}`,
    () => cacheManager.getCourses(userId),
    options
  );
}

export function useCourseContent(courseId: string, options: UseOfflineDataOptions = {}) {
  return useOfflineData(
    `course-content:${courseId}`,
    () => cacheManager.getCourseContent(courseId),
    options
  );
}

export function useUserProgress(userId: string, courseId?: string, options: UseOfflineDataOptions = {}) {
  return useOfflineData(
    `user-progress:${userId}:${courseId || 'all'}`,
    () => cacheManager.getUserProgress(userId, courseId),
    options
  );
}

export function useQuizSubmissions(userId: string, courseId?: string, options: UseOfflineDataOptions = {}) {
  return useOfflineData(
    `quiz-submissions:${userId}:${courseId || 'all'}`,
    () => cacheManager.getQuizSubmissions(userId, courseId),
    options
  );
}

// Hook for offline courses
export function useOfflineCourses() {
  const [courses, setCourses] = useState<OfflineCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchOfflineCourses = useCallback(async () => {
    try {
      setLoading(true);
      const offlineCourses = await offlineDatabase.getAllCourses();
      setCourses(offlineCourses);
      setError(null);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, []);

  const getCourseById = useCallback(async (courseId: string): Promise<OfflineCourse | null> => {
    return await offlineDatabase.getCourse(courseId);
  }, []);

  const getCoursesByStatus = useCallback(async (status: OfflineCourse['downloadStatus']): Promise<OfflineCourse[]> => {
    return await offlineDatabase.getCoursesByStatus(status);
  }, []);

  useEffect(() => {
    fetchOfflineCourses();
  }, [fetchOfflineCourses]);

  return {
    courses,
    loading,
    error,
    refresh: fetchOfflineCourses,
    getCourseById,
    getCoursesByStatus
  };
}

// Hook for offline progress
export function useOfflineProgress(userId: string, courseId?: string) {
  const [progress, setProgress] = useState<OfflineProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchProgress = useCallback(async () => {
    try {
      setLoading(true);
      const progressData = await offlineDatabase.getProgress(userId, courseId);
      setProgress(progressData);
      setError(null);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [userId, courseId]);

  const saveProgress = useCallback(async (progressItem: OfflineProgress) => {
    try {
      await offlineDatabase.saveProgress(progressItem);
      await fetchProgress(); // Refresh the list
    } catch (err) {
      setError(err as Error);
    }
  }, [fetchProgress]);

  const getPendingSyncProgress = useCallback(async (): Promise<OfflineProgress[]> => {
    return await offlineDatabase.getPendingSyncProgress();
  }, []);

  useEffect(() => {
    fetchProgress();
  }, [fetchProgress]);

  return {
    progress,
    loading,
    error,
    refresh: fetchProgress,
    saveProgress,
    getPendingSyncProgress
  };
}

// Hook for offline quiz submissions
export function useOfflineQuizSubmissions(userId: string, courseId?: string) {
  const [submissions, setSubmissions] = useState<OfflineQuizSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchSubmissions = useCallback(async () => {
    try {
      setLoading(true);
      const submissionData = await offlineDatabase.getQuizSubmissions(userId, courseId);
      setSubmissions(submissionData);
      setError(null);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [userId, courseId]);

  const saveSubmission = useCallback(async (submission: OfflineQuizSubmission) => {
    try {
      await offlineDatabase.saveQuizSubmission(submission);
      await fetchSubmissions(); // Refresh the list
    } catch (err) {
      setError(err as Error);
    }
  }, [fetchSubmissions]);

  const getPendingSyncSubmissions = useCallback(async (): Promise<OfflineQuizSubmission[]> => {
    return await offlineDatabase.getPendingSyncSubmissions();
  }, []);

  useEffect(() => {
    fetchSubmissions();
  }, [fetchSubmissions]);

  return {
    submissions,
    loading,
    error,
    refresh: fetchSubmissions,
    saveSubmission,
    getPendingSyncSubmissions
  };
}

// Hook for combined online/offline data
export function useHybridData<T>(
  onlineKey: string,
  onlineFetcher: () => Promise<T>,
  offlineFetcher: () => Promise<T>,
  options: UseOfflineDataOptions = {}
) {
  const { isOnline } = useNetworkStatus();
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [isFromCache, setIsFromCache] = useState(false);

  const fetchData = useCallback(async (forceRefresh = false) => {
    setLoading(true);
    setError(null);

    try {
      if (isOnline && !forceRefresh) {
        // Try online first
        try {
          const onlineData = await cacheManager.get(onlineKey, onlineFetcher, { forceRefresh });
          setData(onlineData);
          setIsFromCache(false);
        } catch (onlineError) {
          // Fallback to offline data
          console.warn('Online fetch failed, trying offline:', onlineError);
          const offlineData = await offlineFetcher();
          setData(offlineData);
          setIsFromCache(true);
        }
      } else {
        // Use offline data
        const offlineData = await offlineFetcher();
        setData(offlineData);
        setIsFromCache(true);
      }
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [isOnline, onlineKey, onlineFetcher, offlineFetcher]);

  const refresh = useCallback(async () => {
    await fetchData(true);
  }, [fetchData]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Refresh when coming online
  useEffect(() => {
    if (isOnline && data && isFromCache) {
      fetchData();
    }
  }, [isOnline, data, isFromCache, fetchData]);

  return {
    data,
    loading,
    error,
    isFromCache,
    refresh
  };
}

// Hook for data synchronization status
export function useSyncStatus() {
  const [pendingSync, setPendingSync] = useState({
    progress: 0,
    quizSubmissions: 0,
    total: 0
  });

  const checkSyncStatus = useCallback(async () => {
    try {
      const [pendingProgress, pendingSubmissions] = await Promise.all([
        offlineDatabase.getPendingSyncProgress(),
        offlineDatabase.getPendingSyncSubmissions()
      ]);

      setPendingSync({
        progress: pendingProgress.length,
        quizSubmissions: pendingSubmissions.length,
        total: pendingProgress.length + pendingSubmissions.length
      });
    } catch (error) {
      console.error('Failed to check sync status:', error);
    }
  }, []);

  useEffect(() => {
    checkSyncStatus();
    
    // Check sync status periodically
    const interval = setInterval(checkSyncStatus, 30000); // Every 30 seconds
    
    return () => clearInterval(interval);
  }, [checkSyncStatus]);

  return {
    pendingSync,
    refresh: checkSyncStatus,
    hasPendingSync: pendingSync.total > 0
  };
}
