import { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import { 
  reportsService,
  PracticeStagePerformanceData,
  UserEngagementData,
  TimeUsagePatternsData,
  TopContentData,
  AnalyticsOverview
} from '@/services/reportsService';
import { 
  adminDashboardService,
  KeyMetricsData
} from '@/services/adminDashboardService';

interface UseReportsDataOptions {
  initialTimeRange?: string;
  enableAutoRefresh?: boolean;
  autoRefreshInterval?: number;
}

interface ReportsData {
  practiceStagePerformance: PracticeStagePerformanceData;
  userEngagement: UserEngagementData;
  timeUsagePatterns: TimeUsagePatternsData;
  topContentAccessed: TopContentData;
  analyticsOverview: AnalyticsOverview;
  keyMetrics: KeyMetricsData;
}

interface UseReportsDataReturn {
  data: ReportsData | null;
  loading: boolean;
  error: string | null;
  refreshing: boolean;
  timeRange: string;
  fetchData: (showRefreshIndicator?: boolean, customTimeRange?: string) => Promise<void>;
  handleTimeRangeChange: (newTimeRange: string) => void;
  handleRefresh: () => void;
  clearError: () => void;
}

export const useReportsData = (
  options: UseReportsDataOptions = {}
): UseReportsDataReturn => {
  const {
    initialTimeRange = 'thismonth',
    enableAutoRefresh = false,
    autoRefreshInterval = 300000 // 5 minutes
  } = options;

  // State
  const [data, setData] = useState<ReportsData | null>(null);
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
      '7days': 'this_week',
      '30days': 'this_month',
      '3months': 'this_month', // fallback to month for 3 months
      'alltime': 'all_time'
    };
    return mapping[uiValue] || 'all_time';
  }, []);

  // Fetch reports data
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
      console.log('🔄 [useReportsData] Fetching data with timeRange:', apiTimeRange);
      
      // Small delay to prevent rapid successive calls
      await new Promise(resolve => setTimeout(resolve, 50));
      
      if (!isMountedRef.current) return; // Check again after delay
      
      // Fetch reports data and key metrics in parallel
      const [reportsData, dashboardData] = await Promise.all([
        reportsService.getAllReportsData(apiTimeRange),
        adminDashboardService.getAllOverviewData(apiTimeRange)
      ]);
      
      if (isMountedRef.current) {
        const result: ReportsData = {
          practiceStagePerformance: reportsData.practiceStagePerformance,
          userEngagement: reportsData.userEngagement,
          timeUsagePatterns: reportsData.timeUsagePatterns,
          topContentAccessed: reportsData.topContentAccessed,
          analyticsOverview: reportsData.analyticsOverview,
          keyMetrics: dashboardData.keyMetrics,
        };
        
        setData(result);
        // Clear any previous errors
        if (error) {
          setError(null);
        }
        console.log('✅ [useReportsData] Successfully loaded data');
        
        if (showRefreshIndicator) {
          toast.success('Reports data refreshed successfully');
        }
      }
      
    } catch (error: any) {
      if (isMountedRef.current) {
        // Check for various cancellation indicators first before logging
        const isCancelled = error.name === 'AbortError' ||
                           error.message === 'Request was cancelled' ||
                           error.message?.includes('cancelled') ||
                           error.message?.includes('aborted');

        if (isCancelled) {
          console.log('🚫 [useReportsData] Request was cancelled, not showing error toast');
          return;
        }

        // Log and handle other errors normally
        console.error('❌ [useReportsData] Error fetching data:', error);
        setError(error.message || 'Failed to load reports data');
        toast.error('Failed to load reports data', {
          description: error.message || 'Please try refreshing the page'
        });
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [timeRange, mapTimeRangeToApiValue, error]);

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

  // Setup auto refresh (with offline awareness)
  const setupAutoRefresh = useCallback(() => {
    if (!enableAutoRefresh) return;

    if (autoRefreshTimeoutRef.current) {
      clearTimeout(autoRefreshTimeoutRef.current);
    }

    autoRefreshTimeoutRef.current = setTimeout(() => {
      if (isMountedRef.current) {
        // Only auto-refresh if online
        if (navigator.onLine) {
          console.log('🔄 [useReportsData] Auto-refreshing data');
          fetchData(true);
          setupAutoRefresh(); // Schedule next refresh
        } else {
          console.log('🔴 [useReportsData] Offline - skipping auto-refresh');
          setupAutoRefresh(); // Still schedule next check
        }
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
      reportsService.cleanup?.();
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
