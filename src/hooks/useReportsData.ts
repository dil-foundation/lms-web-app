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
  // Use ref for timeRange in API calls to avoid dependency issues
  const timeRangeRef = useRef(initialTimeRange);

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
  // Note: Using timeRangeRef instead of timeRange state to avoid dependency issues
  const fetchData = useCallback(async (showRefreshIndicator = false, customTimeRange?: string) => {
    console.log('🚀 [useReportsData] fetchData called!', { showRefreshIndicator, customTimeRange, currentTimeRange: timeRangeRef.current });
    
    if (!isMountedRef.current) {
      console.log('⚠️ [useReportsData] Component not mounted, returning early');
      return;
    }

    try {
      console.log('🔧 [useReportsData] Setting loading states...');
      if (showRefreshIndicator) {
        setRefreshing(true);
        console.log('🔄 [useReportsData] Refreshing = true');
      } else {
        setLoading(true);
        console.log('⏳ [useReportsData] Loading = true');
      }
      setError(null);

      // Use custom value if provided, otherwise use ref value
      const apiTimeRange = mapTimeRangeToApiValue(customTimeRange || timeRangeRef.current);
      console.log('🗺️ [useReportsData] Mapped timeRange:', { ui: customTimeRange || timeRangeRef.current, api: apiTimeRange });
      console.log('🔄 [useReportsData] About to fetch data with API timeRange:', apiTimeRange);
      
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
        setError(null);
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
  }, [mapTimeRangeToApiValue]); // Removed state dependencies

  // Handle time range change - fetch immediately on dropdown selection
  const handleTimeRangeChange = useCallback((newTimeRange: string) => {
    console.log('🔄 [useReportsData] Time range changed to:', newTimeRange);
    
    // Update both state (for UI) and ref (for API calls)
    setTimeRange(newTimeRange);
    timeRangeRef.current = newTimeRange;
    
    // Clear any pending debounced requests
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
      debounceTimeoutRef.current = null;
    }
    
    // Clear cache to ensure fresh data
    reportsService.clearCache?.();
    adminDashboardService.clearCache();
    
    // Fetch immediately - no debounce for explicit dropdown selection
    if (isMountedRef.current) {
      fetchData(true, newTimeRange);
    }
  }, [fetchData]);

  // Handle refresh - fetch immediately with fresh data
  const handleRefresh = useCallback(() => {
    console.log('🔄 [useReportsData] Manual refresh triggered');
    
    // Clear any pending debounced requests
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }
    
    // Clear cache to ensure fresh data on manual refresh
    reportsService.clearCache?.();
    adminDashboardService.clearCache();
    
    // Fetch immediately
    if (isMountedRef.current) {
      fetchData(true);
    }
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

  // Mount/unmount effect - only runs once
  useEffect(() => {
    console.log('🎬 [useReportsData] Component mounted');
    isMountedRef.current = true;
    
    return () => {
      console.log('🧹 [useReportsData] Component unmounting');
      isMountedRef.current = false;
      
      // Clear all timeouts on unmount
      if (debounceTimeoutRef.current) {
        console.log('🗑️ [useReportsData] Clearing debounce timeout on unmount');
        clearTimeout(debounceTimeoutRef.current);
      }
      if (autoRefreshTimeoutRef.current) {
        clearTimeout(autoRefreshTimeoutRef.current);
      }
      
      // Cleanup service requests
      reportsService.cleanup?.();
      adminDashboardService.cleanup();
    };
  }, []);

  // Initial data fetch effect
  useEffect(() => {
    console.log('📡 [useReportsData] Initial data fetch effect');
    const initialFetchTimeout = setTimeout(() => {
      if (isMountedRef.current) {
        console.log('🚀 [useReportsData] Triggering initial fetch');
        fetchData();
      }
    }, 100);
    
    return () => {
      clearTimeout(initialFetchTimeout);
    };
  }, [fetchData]);

  // Auto-refresh setup effect
  useEffect(() => {
    if (enableAutoRefresh) {
      console.log('⏰ [useReportsData] Setting up auto-refresh');
      setupAutoRefresh();
    }
  }, [enableAutoRefresh, setupAutoRefresh]);

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
