import { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import { 
  adminDashboardService, 
  DashboardOverviewData,
  KeyMetricsData,
  LearnUsageData,
  MostAccessedLessonsData,
  DashboardFilters
} from '@/services/adminDashboardService';

interface UseAdminDashboardOptions {
  initialTimeRange?: string;
  enableAutoRefresh?: boolean;
  autoRefreshInterval?: number;
  filters?: DashboardFilters;
}

interface AdminDashboardData {
  overview: DashboardOverviewData;
  keyMetrics: KeyMetricsData;
  learnUsage: LearnUsageData;
  mostAccessedLessons: MostAccessedLessonsData;
}

interface UseAdminDashboardReturn {
  data: AdminDashboardData | null;
  loading: boolean;
  error: string | null;
  refreshing: boolean;
  timeRange: string;
  fetchData: (showRefreshIndicator?: boolean, customTimeRange?: string, customFilters?: DashboardFilters) => Promise<void>;
  handleTimeRangeChange: (newTimeRange: string) => void;
  handleRefresh: () => void;
  clearError: () => void;
}

export const useAdminDashboard = (
  options: UseAdminDashboardOptions = {}
): UseAdminDashboardReturn => {
  const {
    initialTimeRange = 'alltime',
    enableAutoRefresh = false,
    autoRefreshInterval = 300000, // 5 minutes
    filters
  } = options;

  // State
  const [data, setData] = useState<AdminDashboardData | null>(null);
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
      'today': 'today',
      'thisweek': 'this_week',
      'thismonth': 'this_month',
      'alltime': 'all_time'
    };
    return mapping[uiValue] || 'all_time';
  }, []);

  // Fetch dashboard data
  const fetchData = useCallback(async (showRefreshIndicator = false, customTimeRange?: string, customFilters?: DashboardFilters) => {
    if (!isMountedRef.current) return;

    try {
      if (showRefreshIndicator) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      const apiTimeRange = mapTimeRangeToApiValue(customTimeRange || timeRange);
      const activeFilters = customFilters || filters;
      console.log('🔄 [useAdminDashboard] Fetching data with timeRange:', apiTimeRange, 'filters:', activeFilters);
      
      // Small delay to prevent rapid successive calls
      await new Promise(resolve => setTimeout(resolve, 50));
      
      if (!isMountedRef.current) return; // Check again after delay
      
      const result = await adminDashboardService.getAllOverviewData(apiTimeRange, activeFilters);
      
      if (isMountedRef.current) {
        setData(result);
        // Clear any previous errors
        if (error) {
          setError(null);
        }
        console.log('✅ [useAdminDashboard] Successfully loaded data');
        
        if (showRefreshIndicator) {
          toast.success('Dashboard data refreshed successfully');
        }
      }
      
    } catch (error: any) {
      if (isMountedRef.current) {
        console.error('❌ [useAdminDashboard] Error fetching data:', error);
        
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
          console.log('🚫 [useAdminDashboard] Request was cancelled, not showing error toast');
        }
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [timeRange, mapTimeRangeToApiValue, error, filters]);

  // Handle time range change with debouncing
  const handleTimeRangeChange = useCallback((newTimeRange: string) => {
    setTimeRange(newTimeRange);
    console.log('Time range changed to:', newTimeRange);
    
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
        console.log('🔄 [useAdminDashboard] Auto-refreshing data');
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
      adminDashboardService.cleanup();
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
