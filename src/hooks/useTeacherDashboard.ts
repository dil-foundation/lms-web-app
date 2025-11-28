import { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import { 
  teacherDashboardService, 
  TeacherDashboardOverviewData 
} from '@/services/teacherDashboardService';

interface UseTeacherDashboardOptions {
  initialTimeRange?: string;
  enableAutoRefresh?: boolean;
  autoRefreshInterval?: number;
}

interface UseTeacherDashboardReturn {
  data: TeacherDashboardOverviewData | null;
  loading: boolean;
  error: string | null;
  refreshing: boolean;
  timeRange: string;
  fetchData: (showRefreshIndicator?: boolean, customTimeRange?: string) => Promise<void>;
  handleTimeRangeChange: (newTimeRange: string) => void;
  handleRefresh: () => void;
  clearError: () => void;
}

export const useTeacherDashboard = (
  options: UseTeacherDashboardOptions = {}
): UseTeacherDashboardReturn => {
  const {
    initialTimeRange = 'all-time',
    enableAutoRefresh = false,
    autoRefreshInterval = 300000 // 5 minutes
  } = options;

  // State
  const [data, setData] = useState<TeacherDashboardOverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState(initialTimeRange);
  const [refreshing, setRefreshing] = useState(false);

  // Refs
  const isMountedRef = useRef(true);
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const autoRefreshTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  // Use ref for timeRange in API calls to avoid dependency issues that cause request abortion
  const timeRangeRef = useRef(initialTimeRange);

  // Map UI time range values to API values
  const mapTimeRangeToApiValue = useCallback((uiValue: string): string => {
    const mapping: Record<string, string> = {
      'all-time': 'all_time',
      'this-week': 'this_week',
      'this-month': 'this_month',
      'this-year': 'this_year'
    };
    return mapping[uiValue] || 'all_time';
  }, []);

  // Fetch dashboard data
  // Note: Using timeRangeRef instead of timeRange state to avoid dependency issues
  // that cause the useEffect cleanup to abort in-flight requests
  const fetchData = useCallback(async (showRefreshIndicator = false, customTimeRange?: string) => {
    if (!isMountedRef.current) return;

    try {
      if (showRefreshIndicator) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      // Use customTimeRange if provided, otherwise use the ref value
      const apiTimeRange = mapTimeRangeToApiValue(customTimeRange || timeRangeRef.current);
      console.log('🔄 [useTeacherDashboard] Fetching data with timeRange:', apiTimeRange);
      
      const result = await teacherDashboardService.getOverviewData(apiTimeRange);
      
      if (isMountedRef.current) {
        setData(result);
        // Clear any previous errors
        setError(null);
        console.log('✅ [useTeacherDashboard] Successfully loaded data');
      }
      
    } catch (error: any) {
      if (isMountedRef.current) {
        // Check for various cancellation indicators first before logging
        const isCancelled = error.name === 'AbortError' ||
                           error.message === 'Request was cancelled' ||
                           error.message?.includes('cancelled') ||
                           error.message?.includes('aborted');

        if (isCancelled) {
          console.log('🚫 [useTeacherDashboard] Request was cancelled, not showing error toast');
          return;
        }

        // Log and handle other errors normally
        console.error('❌ [useTeacherDashboard] Error fetching data:', error);
        setError(error.message || 'Failed to load dashboard data');
        toast.error('Failed to load dashboard data', {
          description: error.message || 'Please try refreshing the page'
        });
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [mapTimeRangeToApiValue]); // Removed timeRange from dependencies to prevent cleanup abortion

  // Handle time range change - fetch immediately on dropdown selection
  const handleTimeRangeChange = useCallback((newTimeRange: string) => {
    console.log('🔄 [useTeacherDashboard] Time range changed to:', newTimeRange);
    
    // Update both state (for UI) and ref (for API calls)
    setTimeRange(newTimeRange);
    timeRangeRef.current = newTimeRange;
    
    // Clear any pending debounced requests
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }
    
    // Clear cache for the new time range to ensure fresh data
    teacherDashboardService.clearCache();
    
    // Fetch immediately - no debounce for explicit dropdown selection
    if (isMountedRef.current) {
      fetchData(true, newTimeRange);
    }
  }, [fetchData]);

  // Handle refresh - fetch immediately with fresh data
  const handleRefresh = useCallback(() => {
    console.log('🔄 [useTeacherDashboard] Manual refresh triggered');
    
    // Clear any pending debounced requests
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }
    
    // Clear cache to ensure fresh data on manual refresh
    teacherDashboardService.clearCache();
    
    // Fetch immediately
    if (isMountedRef.current) {
      fetchData(true);
    }
  }, [fetchData]);

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Setup auto refresh
  const setupAutoRefresh = useCallback(() => {
    if (!enableAutoRefresh) return;

    if (autoRefreshTimeoutRef.current) {
      clearTimeout(autoRefreshTimeoutRef.current);
    }

    autoRefreshTimeoutRef.current = setTimeout(() => {
      if (isMountedRef.current) {
        console.log('🔄 [useTeacherDashboard] Auto-refreshing data');
        fetchData(true);
        setupAutoRefresh(); // Schedule next refresh
      }
    }, autoRefreshInterval);
  }, [enableAutoRefresh, autoRefreshInterval, fetchData]);

  // Initial data fetch and cleanup
  useEffect(() => {
    // Small delay to prevent rapid requests on mount
    const initialFetchTimeout = setTimeout(() => {
      if (isMountedRef.current) {
        fetchData();
      }
    }, 100);
    
    if (enableAutoRefresh) {
      setupAutoRefresh();
    }
    
    return () => {
      isMountedRef.current = false;
      
      // Clear all timeouts
      clearTimeout(initialFetchTimeout);
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
      if (autoRefreshTimeoutRef.current) {
        clearTimeout(autoRefreshTimeoutRef.current);
      }
      
      // Cleanup service requests
      teacherDashboardService.cleanup();
    };
  }, [fetchData, setupAutoRefresh, enableAutoRefresh]);

  return {
    data,
    loading,
    error,
    refreshing,
    timeRange,
    fetchData,
    handleTimeRangeChange,
    handleRefresh,
    clearError
  };
};
