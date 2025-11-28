import { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import { 
  teacherDashboardService, 
  TeacherProgressOverviewData 
} from '@/services/teacherDashboardService';

interface UseTeacherProgressOptions {
  initialTimeRange?: string;
  initialSearchQuery?: string;
  initialStageFilter?: string;
}

interface UseTeacherProgressReturn {
  data: TeacherProgressOverviewData | null;
  loading: boolean;
  error: string | null;
  refreshing: boolean;
  timeRange: string;
  searchQuery: string;
  stageFilter: string;
  fetchData: (
    showRefreshIndicator?: boolean, 
    customTimeRange?: string,
    customSearchQuery?: string,
    customStageFilter?: string
  ) => Promise<void>;
  handleTimeRangeChange: (newTimeRange: string) => void;
  handleSearchChange: (newSearchQuery: string) => void;
  handleStageFilterChange: (newStageFilter: string) => void;
  handleRefresh: () => void;
  clearError: () => void;
}

export const useTeacherProgress = (
  options: UseTeacherProgressOptions = {}
): UseTeacherProgressReturn => {
  const {
    initialTimeRange = 'all_time',
    initialSearchQuery = '',
    initialStageFilter = 'all'
  } = options;

  // State
  const [data, setData] = useState<TeacherProgressOverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState(initialTimeRange);
  const [searchQuery, setSearchQuery] = useState(initialSearchQuery);
  const [stageFilter, setStageFilter] = useState(initialStageFilter);
  const [refreshing, setRefreshing] = useState(false);

  // Refs
  const isMountedRef = useRef(true);
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  // Use refs for filter values in API calls to avoid dependency issues that cause request abortion
  const timeRangeRef = useRef(initialTimeRange);
  const searchQueryRef = useRef(initialSearchQuery);
  const stageFilterRef = useRef(initialStageFilter);

  // Fetch progress data
  // Note: Using refs instead of state to avoid dependency issues that cause request abortion
  const fetchData = useCallback(async (
    showRefreshIndicator = false, 
    customTimeRange?: string,
    customSearchQuery?: string,
    customStageFilter?: string
  ) => {
    if (!isMountedRef.current) return;

    try {
      if (showRefreshIndicator) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      // Use custom values if provided, otherwise use ref values
      const effectiveTimeRange = customTimeRange || timeRangeRef.current;
      const effectiveSearchQuery = customSearchQuery !== undefined ? customSearchQuery : searchQueryRef.current;
      const effectiveStageFilter = customStageFilter !== undefined ? customStageFilter : stageFilterRef.current;

      console.log('🔄 [useTeacherProgress] Fetching data with filters:', {
        timeRange: effectiveTimeRange,
        searchQuery: effectiveSearchQuery,
        stageFilter: effectiveStageFilter
      });
      
      const result = await teacherDashboardService.getProgressOverviewData(
        effectiveTimeRange,
        effectiveSearchQuery,
        effectiveStageFilter
      );
      
      if (isMountedRef.current) {
        setData(result);
        setError(null);
        console.log('✅ [useTeacherProgress] Successfully loaded data');
      }
      
    } catch (error: any) {
      if (isMountedRef.current) {
        // Check for various cancellation indicators first before logging
        const isCancelled = error.name === 'AbortError' ||
                           error.message === 'Request was cancelled' ||
                           error.message?.includes('cancelled') ||
                           error.message?.includes('aborted');

        if (isCancelled) {
          console.log('🚫 [useTeacherProgress] Request was cancelled, not showing error toast');
          return;
        }

        // Log and handle other errors normally
        console.error('❌ [useTeacherProgress] Error fetching data:', error);
        setError(error.message || 'Failed to load progress data');
        toast.error('Failed to load progress data', {
          description: error.message || 'Please try refreshing the page'
        });
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, []); // Removed state dependencies to prevent cleanup abortion

  // Handle time range change - fetch immediately on dropdown selection
  const handleTimeRangeChange = useCallback((newTimeRange: string) => {
    console.log('🔄 [useTeacherProgress] Time range changed to:', newTimeRange);
    
    // Update both state (for UI) and ref (for API calls)
    setTimeRange(newTimeRange);
    timeRangeRef.current = newTimeRange;
    
    // Clear any pending debounced requests
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }
    
    // Clear cache to ensure fresh data
    teacherDashboardService.clearCache();
    
    // Fetch immediately - no debounce for explicit dropdown selection
    if (isMountedRef.current) {
      fetchData(true, newTimeRange);
    }
  }, [fetchData]);

  // Handle search change with debouncing (keep debounce for text input)
  const handleSearchChange = useCallback((newSearchQuery: string) => {
    // Update both state (for UI) and ref (for API calls)
    setSearchQuery(newSearchQuery);
    searchQueryRef.current = newSearchQuery;
    
    // Clear existing timeout
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }
    
    // Debounce the API call for search (typing)
    debounceTimeoutRef.current = setTimeout(() => {
      if (isMountedRef.current) {
        teacherDashboardService.clearCache();
        fetchData(true, undefined, newSearchQuery);
      }
    }, 500); // Keep debounce for search input
  }, [fetchData]);

  // Handle stage filter change - fetch immediately on dropdown selection
  const handleStageFilterChange = useCallback((newStageFilter: string) => {
    console.log('🔄 [useTeacherProgress] Stage filter changed to:', newStageFilter);
    
    // Update both state (for UI) and ref (for API calls)
    setStageFilter(newStageFilter);
    stageFilterRef.current = newStageFilter;
    
    // Clear any pending debounced requests
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }
    
    // Clear cache to ensure fresh data
    teacherDashboardService.clearCache();
    
    // Fetch immediately - no debounce for explicit dropdown selection
    if (isMountedRef.current) {
      fetchData(true, undefined, undefined, newStageFilter);
    }
  }, [fetchData]);

  // Handle refresh - fetch immediately with fresh data
  const handleRefresh = useCallback(() => {
    console.log('🔄 [useTeacherProgress] Manual refresh triggered');
    
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

  // Initial data fetch and cleanup
  useEffect(() => {
    // Small delay to prevent rapid requests on mount
    const initialFetchTimeout = setTimeout(() => {
      if (isMountedRef.current) {
        fetchData();
      }
    }, 100);
    
    return () => {
      isMountedRef.current = false;
      
      // Clear all timeouts
      clearTimeout(initialFetchTimeout);
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
      
      // Cleanup service requests
      teacherDashboardService.cleanup();
    };
  }, [fetchData]);

  return {
    data,
    loading,
    error,
    refreshing,
    timeRange,
    searchQuery,
    stageFilter,
    fetchData,
    handleTimeRangeChange,
    handleSearchChange,
    handleStageFilterChange,
    handleRefresh,
    clearError
  };
};
