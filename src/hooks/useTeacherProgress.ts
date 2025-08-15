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

  // Fetch progress data
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

      const effectiveTimeRange = customTimeRange || timeRange;
      const effectiveSearchQuery = customSearchQuery !== undefined ? customSearchQuery : searchQuery;
      const effectiveStageFilter = customStageFilter !== undefined ? customStageFilter : stageFilter;

      console.log('🔄 [useTeacherProgress] Fetching data with filters:', {
        timeRange: effectiveTimeRange,
        searchQuery: effectiveSearchQuery,
        stageFilter: effectiveStageFilter
      });
      
      // Small delay to prevent rapid successive calls
      await new Promise(resolve => setTimeout(resolve, 50));
      
      if (!isMountedRef.current) return; // Check again after delay
      
      const result = await teacherDashboardService.getProgressOverviewData(
        effectiveTimeRange,
        effectiveSearchQuery,
        effectiveStageFilter
      );
      
      if (isMountedRef.current) {
        setData(result);
        // Clear any previous errors
        if (error) {
          setError(null);
        }
        console.log('✅ [useTeacherProgress] Successfully loaded data');
      }
      
    } catch (error: any) {
      if (isMountedRef.current) {
        console.error('❌ [useTeacherProgress] Error fetching data:', error);
        
        // Check for various cancellation indicators
        const isCancelled = error.name === 'AbortError' || 
                           error.message === 'Request was cancelled' ||
                           error.message?.includes('cancelled') ||
                           error.message?.includes('aborted');
        
        if (!isCancelled) {
          setError(error.message || 'Failed to load progress data');
          toast.error('Failed to load progress data', {
            description: error.message || 'Please try refreshing the page'
          });
        } else {
          console.log('🚫 [useTeacherProgress] Request was cancelled, not showing error toast');
        }
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [timeRange, searchQuery, stageFilter, error]);

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
        fetchData(true, newTimeRange, searchQuery, stageFilter);
      }
    }, 300);
  }, [fetchData, searchQuery, stageFilter]);

  // Handle search change with debouncing
  const handleSearchChange = useCallback((newSearchQuery: string) => {
    setSearchQuery(newSearchQuery);
    
    // Clear existing timeout
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }
    
    // Debounce the API call
    debounceTimeoutRef.current = setTimeout(() => {
      if (isMountedRef.current) {
        fetchData(true, timeRange, newSearchQuery, stageFilter);
      }
    }, 500); // Longer debounce for search
  }, [fetchData, timeRange, stageFilter]);

  // Handle stage filter change with debouncing
  const handleStageFilterChange = useCallback((newStageFilter: string) => {
    setStageFilter(newStageFilter);
    
    // Clear existing timeout
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }
    
    // Debounce the API call
    debounceTimeoutRef.current = setTimeout(() => {
      if (isMountedRef.current) {
        fetchData(true, timeRange, searchQuery, newStageFilter);
      }
    }, 300);
  }, [fetchData, timeRange, searchQuery]);

  // Handle refresh
  const handleRefresh = useCallback(() => {
    // Clear any pending debounced requests
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }
    
    fetchData(true, timeRange, searchQuery, stageFilter);
  }, [fetchData, timeRange, searchQuery, stageFilter]);

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
