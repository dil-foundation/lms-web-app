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
  const fetchData = useCallback(async (showRefreshIndicator = false, customTimeRange?: string) => {
    if (!isMountedRef.current) return;

    try {
      if (showRefreshIndicator) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      const apiTimeRange = mapTimeRangeToApiValue(customTimeRange || timeRange);
      console.log('🔄 [useTeacherDashboard] Fetching data with timeRange:', apiTimeRange);
      
      // Small delay to prevent rapid successive calls
      await new Promise(resolve => setTimeout(resolve, 50));
      
      if (!isMountedRef.current) return; // Check again after delay
      
      const result = await teacherDashboardService.getOverviewData(apiTimeRange);
      
      if (isMountedRef.current) {
        setData(result);
        // Clear any previous errors
        if (error) {
          setError(null);
        }
        console.log('✅ [useTeacherDashboard] Successfully loaded data');
      }
      
    } catch (error: any) {
      if (isMountedRef.current) {
        console.error('❌ [useTeacherDashboard] Error fetching data:', error);
        
        // Check for various cancellation indicators
        const isCancelled = error.name === 'AbortError' || 
                           error.message === 'Request was cancelled' ||
                           error.message?.includes('cancelled') ||
                           error.message?.includes('aborted');
        
        if (!isCancelled) {
          setError(error.message || 'Failed to load dashboard data');
          toast.error('Failed to load dashboard data', {
            description: error.message || 'Please try refreshing the page'
          });
        } else {
          console.log('🚫 [useTeacherDashboard] Request was cancelled, not showing error toast');
        }
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [timeRange, mapTimeRangeToApiValue]);

  // Handle time range change with debouncing
  const handleTimeRangeChange = useCallback((newTimeRange: string) => {
    setTimeRange(newTimeRange);
    
    // Clear existing timeout
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }
    
    // Debounce the API call
    debounceTimeoutRef.current = setTimeout(() => {
      if (isMountedRef.current) {
        fetchData(true, newTimeRange);
      }
    }, 300);
  }, [fetchData]);

  // Handle refresh
  const handleRefresh = useCallback(() => {
    // Clear any pending debounced requests
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }
    
    fetchData(true);
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
