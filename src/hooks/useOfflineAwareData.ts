import { useState, useEffect } from 'react';
import { useOfflineContext } from '@/contexts/OfflineContext';

interface UseOfflineAwareDataOptions {
  fallbackData?: any;
  cacheKey?: string;
  refreshInterval?: number;
}

/**
 * Hook that automatically handles online/offline data fetching
 * When online: uses provided fetch function
 * When offline: uses cached data from offline context
 */
export const useOfflineAwareData = <T>(
  fetchFunction: () => Promise<T>,
  dataType: string,
  options: UseOfflineAwareDataOptions = {}
) => {
  const { isOnline, getOfflineFallback } = useOfflineContext();
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const { fallbackData = null, refreshInterval } = options;

  const fetchData = async () => {
    if (!isOnline) {
      // Use offline fallback data
      const offlineData = getOfflineFallback(dataType, fallbackData);
      setData(offlineData);
      setLoading(false);
      setError(null);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const result = await fetchFunction();
      setData(result);
    } catch (err) {
      console.error(`Failed to fetch ${dataType}:`, err);
      setError(err as Error);
      
      // Try offline fallback on error
      const offlineData = getOfflineFallback(dataType, fallbackData);
      if (offlineData) {
        setData(offlineData);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [isOnline]);

  // Optional refresh interval
  useEffect(() => {
    if (refreshInterval && isOnline) {
      const interval = setInterval(fetchData, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [refreshInterval, isOnline]);

  return {
    data,
    loading,
    error,
    refetch: fetchData,
    isOffline: !isOnline
  };
};

/**
 * Specialized hook for course data with offline support
 */
export const useOfflineAwareCourses = () => {
  return useOfflineAwareData(
    async () => {
      // Your existing course fetching logic here
      // This would be moved from components to here
      return [];
    },
    'courses',
    { fallbackData: [] }
  );
};

/**
 * Specialized hook for progress data with offline support
 */
export const useOfflineAwareProgress = () => {
  return useOfflineAwareData(
    async () => {
      // Your existing progress fetching logic here
      return [];
    },
    'progress', 
    { fallbackData: [] }
  );
};

/**
 * Generic hook for any Supabase query with offline support
 */
export const useOfflineAwareQuery = <T>(
  queryFunction: () => Promise<T>,
  dataType: string,
  fallbackData: T
) => {
  return useOfflineAwareData(queryFunction, dataType, { fallbackData });
};
