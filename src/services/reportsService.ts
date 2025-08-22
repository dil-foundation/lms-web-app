import { BASE_API_URL, API_ENDPOINTS } from '@/config/api';
import { getAuthHeadersWithAccept } from '@/utils/authUtils';

// TypeScript interfaces for API responses
export interface PracticeStagePerformance {
  stage: string;
  performance: number;
  users: number;
  avgScore: number;
  status: string;
  completionRate?: number;
  averageTime?: number;
}

export interface UserEngagementOverview {
  name: string;
  value: number;
  users: number;
  color: string;
  percentage?: number;
  growth?: number;
}

export interface TimeUsagePattern {
  hour: string;
  users: number;
  sessions?: number;
  avgDuration?: number;
  peakHour?: boolean;
}

export interface TopContentAccessed {
  title: string;
  type: string;
  stage: string;
  accessCount: number;
  completionRate: number;
  avgRating: number;
  category?: string;
  lastAccessed?: string;
}

export interface AnalyticsOverview {
  totalUsers: number;
  activeUsers: number;
  totalSessions: number;
  avgSessionDuration: number;
  completionRate: number;
  engagementScore: number;
  growthRate: number;
  retentionRate: number;
}

export interface PracticeStagePerformanceData {
  stages: PracticeStagePerformance[];
  overallPerformance?: number;
  totalUsers?: number;
  timeRange?: string;
}

export interface UserEngagementData {
  engagementTypes: UserEngagementOverview[];
  totalEngagement?: number;
  timeRange?: string;
}

export interface TimeUsagePatternsData {
  patterns: TimeUsagePattern[];
  peakHours?: string[];
  totalSessions?: number;
  timeRange?: string;
}

export interface TopContentData {
  content: TopContentAccessed[];
  totalAccesses?: number;
  timeRange?: string;
}

// Reports Service class for managing all API calls
class ReportsService {
  private currentController: AbortController | null = null;
  private requestCache = new Map<string, { data: any; timestamp: number }>();
  private readonly CACHE_DURATION = 60000; // 60 seconds cache

  private getCacheKey(endpoint: string, params: Record<string, any>): string {
    return `${endpoint}_${JSON.stringify(params)}`;
  }

  private getCachedData(cacheKey: string): any | null {
    const cached = this.requestCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      console.log('📦 Using cached data for:', cacheKey);
      return cached.data;
    }
    return null;
  }

  private setCachedData(cacheKey: string, data: any): void {
    this.requestCache.set(cacheKey, { data, timestamp: Date.now() });
  }

  async getPracticeStagePerformance(timeRange: string = 'all_time', signal?: AbortSignal): Promise<PracticeStagePerformanceData> {
    try {
      // Use provided signal or create a new one
      const controller = signal ? null : new AbortController();
      const requestSignal = signal || controller?.signal;
      const timeoutId = setTimeout(() => {
        if (controller) controller.abort();
        else if (signal && !signal.aborted) {
          console.warn('⚠️ Cannot abort external signal, request may continue');
        }
      }, 15000); // Increased timeout to 15 seconds

      console.log('🔍 Fetching practice stage performance data with timeRange:', timeRange);

      const url = new URL(`${BASE_API_URL}${API_ENDPOINTS.ADMIN_REPORTS_PRACTICE_STAGE_PERFORMANCE}`);
      url.searchParams.append('time_range', timeRange);

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: getAuthHeadersWithAccept(),
        signal: requestSignal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'No response text');
        throw new Error(`HTTP ${response.status}: ${response.statusText}${errorText ? ` - ${errorText}` : ''}`);
      }

      const responseText = await response.text();
      
      let result: any;
      try {
        result = JSON.parse(responseText);
      } catch (parseError) {
        throw new Error('Invalid JSON response from server');
      }

      console.log('📥 Raw practice stage performance response:', result);

      // Handle different possible response formats
      let data: any = {};
      let stages: any[] = [];

      if (result && typeof result === 'object') {
        if (result.data) {
          data = result.data;
          stages = result.data.stages || result.data.performance || result.data;
        } else if (result.success && result.stages) {
          stages = result.stages;
          data = result;
        } else if (Array.isArray(result)) {
          stages = result;
        } else {
          data = result;
          stages = result.stages || result.performance || [];
        }
      }

      if (!Array.isArray(stages)) {
        stages = [];
      }

      // Normalize stages to our expected format
      const normalizedStages: PracticeStagePerformance[] = stages.map((stage: any) => ({
        stage: stage.stage || stage.stage_name || stage.name || 'Unknown Stage',
        performance: stage.performance || stage.performance_score || stage.score || 0,
        users: stage.users || stage.user_count || stage.total_users || 0,
        avgScore: stage.avg_score || stage.avgScore || stage.average_score || 0,
        status: this.getPerformanceStatus(stage.performance || stage.performance_score || stage.score || 0),
        completionRate: stage.completion_rate || stage.completionRate,
        averageTime: stage.average_time || stage.averageTime || stage.avg_time,
      }));

      return {
        stages: normalizedStages,
        overallPerformance: data.overall_performance || data.overallPerformance,
        totalUsers: data.total_users || data.totalUsers,
        timeRange: data.time_range || data.timeRange || timeRange,
      };

    } catch (error: any) {
      console.error('❌ Error fetching practice stage performance:', error);
      throw new Error(`Failed to fetch practice stage performance: ${error.message}`);
    }
  }

  async getUserEngagementOverview(timeRange: string = 'all_time'): Promise<UserEngagementData> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      console.log('🔍 Fetching user engagement overview data with timeRange:', timeRange);

      const url = new URL(`${BASE_API_URL}${API_ENDPOINTS.ADMIN_REPORTS_USER_ENGAGEMENT_OVERVIEW}`);
      url.searchParams.append('time_range', timeRange);

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: getAuthHeadersWithAccept(),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'No response text');
        throw new Error(`HTTP ${response.status}: ${response.statusText}${errorText ? ` - ${errorText}` : ''}`);
      }

      const responseText = await response.text();
      
      let result: any;
      try {
        result = JSON.parse(responseText);
      } catch (parseError) {
        throw new Error('Invalid JSON response from server');
      }

      console.log('📥 Raw user engagement overview response:', result);

      // Handle different possible response formats
      let data: any = {};
      let engagementTypes: any[] = [];

      if (result && typeof result === 'object') {
        if (result.data) {
          data = result.data;
          engagementTypes = result.data.engagement || result.data.types || result.data.engagement_types || result.data;
        } else if (result.success && result.engagement) {
          engagementTypes = result.engagement;
          data = result;
        } else if (Array.isArray(result)) {
          engagementTypes = result;
        } else {
          data = result;
          engagementTypes = result.engagement || result.types || result.engagement_types || [];
        }
      }

      if (!Array.isArray(engagementTypes)) {
        engagementTypes = [];
      }

      // Normalize engagement types to our expected format
      const normalizedEngagementTypes: UserEngagementOverview[] = engagementTypes.map((engagement: any, index: number) => ({
        name: engagement.name || engagement.type || engagement.category || `Type ${index + 1}`,
        value: engagement.value || engagement.percentage || engagement.score || 0,
        users: engagement.users || engagement.user_count || engagement.total_users || 0,
        color: engagement.color || this.getEngagementColor(index),
        percentage: engagement.percentage || engagement.value,
        growth: engagement.growth || engagement.growth_rate,
      }));

      return {
        engagementTypes: normalizedEngagementTypes,
        totalEngagement: data.total_engagement || data.totalEngagement,
        timeRange: data.time_range || data.timeRange || timeRange,
      };

    } catch (error: any) {
      console.error('❌ Error fetching user engagement overview:', error);
      throw new Error(`Failed to fetch user engagement overview: ${error.message}`);
    }
  }

  async getTimeUsagePatterns(timeRange: string = 'all_time'): Promise<TimeUsagePatternsData> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      console.log('🔍 Fetching time usage patterns data with timeRange:', timeRange);

      const url = new URL(`${BASE_API_URL}${API_ENDPOINTS.ADMIN_REPORTS_TIME_USAGE_PATTERNS}`);
      url.searchParams.append('time_range', timeRange);

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: getAuthHeadersWithAccept(),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'No response text');
        throw new Error(`HTTP ${response.status}: ${response.statusText}${errorText ? ` - ${errorText}` : ''}`);
      }

      const responseText = await response.text();
      
      let result: any;
      try {
        result = JSON.parse(responseText);
      } catch (parseError) {
        throw new Error('Invalid JSON response from server');
      }

      console.log('📥 Raw time usage patterns response:', result);

      // Handle different possible response formats
      let data: any = {};
      let patterns: any[] = [];

      if (result && typeof result === 'object') {
        if (result.data) {
          data = result.data;
          patterns = result.data.patterns || result.data.usage || result.data.time_patterns || result.data;
        } else if (result.success && result.patterns) {
          patterns = result.patterns;
          data = result;
        } else if (Array.isArray(result)) {
          patterns = result;
        } else {
          data = result;
          patterns = result.patterns || result.usage || result.time_patterns || [];
        }
      }

      if (!Array.isArray(patterns)) {
        patterns = [];
      }

      // Normalize patterns to our expected format
      const normalizedPatterns: TimeUsagePattern[] = patterns.map((pattern: any) => ({
        hour: pattern.hour || pattern.time || pattern.period || '00:00',
        users: pattern.users || pattern.user_count || pattern.active_users || 0,
        sessions: pattern.sessions || pattern.session_count,
        avgDuration: pattern.avg_duration || pattern.avgDuration || pattern.average_duration,
        peakHour: pattern.peak_hour || pattern.peakHour || pattern.is_peak,
      }));

      return {
        patterns: normalizedPatterns,
        peakHours: data.peak_hours || data.peakHours,
        totalSessions: data.total_sessions || data.totalSessions,
        timeRange: data.time_range || data.timeRange || timeRange,
      };

    } catch (error: any) {
      console.error('❌ Error fetching time usage patterns:', error);
      throw new Error(`Failed to fetch time usage patterns: ${error.message}`);
    }
  }

  async getTopContentAccessed(timeRange: string = 'all_time'): Promise<TopContentData> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      console.log('🔍 Fetching top content accessed data with timeRange:', timeRange);

      const url = new URL(`${BASE_API_URL}${API_ENDPOINTS.ADMIN_REPORTS_TOP_CONTENT_ACCESSED}`);
      url.searchParams.append('time_range', timeRange);

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: getAuthHeadersWithAccept(),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'No response text');
        throw new Error(`HTTP ${response.status}: ${response.statusText}${errorText ? ` - ${errorText}` : ''}`);
      }

      const responseText = await response.text();
      
      let result: any;
      try {
        result = JSON.parse(responseText);
      } catch (parseError) {
        throw new Error('Invalid JSON response from server');
      }

      console.log('📥 Raw top content accessed response:', result);

      // Handle different possible response formats
      let data: any = {};
      let content: any[] = [];

      if (result && typeof result === 'object') {
        if (result.data) {
          data = result.data;
          content = result.data.content || result.data.top_content || result.data.lessons || result.data;
        } else if (result.success && result.content) {
          content = result.content;
          data = result;
        } else if (Array.isArray(result)) {
          content = result;
        } else {
          data = result;
          content = result.content || result.top_content || result.lessons || [];
        }
      }

      if (!Array.isArray(content)) {
        content = [];
      }

      // Normalize content to our expected format
      const normalizedContent: TopContentAccessed[] = content.map((item: any) => ({
        title: item.title || item.name || item.lesson_name || item.content_title || 'Untitled Content',
        type: item.type || item.content_type || item.category || 'Practice',
        stage: item.stage || item.lesson_stage || item.level || 'Unknown Stage',
        accessCount: item.access_count || item.accessCount || item.accesses || item.views || 0,
        completionRate: item.completion_rate || item.completionRate || item.completed_percentage || 0,
        avgRating: item.avg_score || item.avg_rating || item.avgRating || item.rating || item.average_rating || 0,
        category: item.category || item.content_category,
        lastAccessed: item.last_accessed || item.lastAccessed || item.recent_access,
      }));

      return {
        content: normalizedContent,
        totalAccesses: data.total_accesses || data.totalAccesses,
        timeRange: data.time_range || data.timeRange || timeRange,
      };

    } catch (error: any) {
      console.error('❌ Error fetching top content accessed:', error);
      throw new Error(`Failed to fetch top content accessed: ${error.message}`);
    }
  }

  async getAnalyticsOverview(timeRange: string = 'all_time'): Promise<AnalyticsOverview> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      console.log('🔍 Fetching analytics overview data with timeRange:', timeRange);

      const url = new URL(`${BASE_API_URL}${API_ENDPOINTS.ADMIN_REPORTS_ANALYTICS_OVERVIEW}`);
      url.searchParams.append('time_range', timeRange);

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: getAuthHeadersWithAccept(),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'No response text');
        throw new Error(`HTTP ${response.status}: ${response.statusText}${errorText ? ` - ${errorText}` : ''}`);
      }

      const responseText = await response.text();
      
      let result: any;
      try {
        result = JSON.parse(responseText);
      } catch (parseError) {
        throw new Error('Invalid JSON response from server');
      }

      console.log('📥 Raw analytics overview response:', result);

      // Handle different possible response formats
      let data: any = {};

      if (result && typeof result === 'object') {
        if (result.data) {
          data = result.data;
        } else if (result.success && result.analytics) {
          data = result.analytics;
        } else {
          data = result;
        }
      }

      // Normalize data to our expected format
      return {
        totalUsers: data.total_users || data.totalUsers || 0,
        activeUsers: data.active_users || data.activeUsers || 0,
        totalSessions: data.total_sessions || data.totalSessions || 0,
        avgSessionDuration: data.avg_session_duration || data.avgSessionDuration || data.average_session_duration || 0,
        completionRate: data.completion_rate || data.completionRate || 0,
        engagementScore: data.engagement_score || data.engagementScore || 0,
        growthRate: data.growth_rate || data.growthRate || 0,
        retentionRate: data.retention_rate || data.retentionRate || 0,
      };

    } catch (error: any) {
      console.error('❌ Error fetching analytics overview:', error);
      throw new Error(`Failed to fetch analytics overview: ${error.message}`);
    }
  }

  // Get all reports data in parallel
  async getAllReportsData(timeRange: string = 'all_time'): Promise<{
    practiceStagePerformance: PracticeStagePerformanceData;
    userEngagement: UserEngagementData;
    timeUsagePatterns: TimeUsagePatternsData;
    topContentAccessed: TopContentData;
    analyticsOverview: AnalyticsOverview;
  }> {
    try {
      console.log('🔄 Fetching all reports data with timeRange:', timeRange);
      
      // Check cache first
      const cacheKey = this.getCacheKey('reports_overview', { timeRange });
      const cachedData = this.getCachedData(cacheKey);
      if (cachedData) {
        return cachedData;
      }

      // Cancel any existing request
      if (this.currentController) {
        this.currentController.abort();
        // Small delay to ensure proper cleanup
        await new Promise(resolve => setTimeout(resolve, 10));
      }

      // Create single controller for all requests
      this.currentController = new AbortController();
      
      // Fetch all data in parallel for better performance
      const [practiceStagePerformance, userEngagement, timeUsagePatterns, topContentAccessed, analyticsOverview] = await Promise.all([
        this.getPracticeStagePerformance(timeRange, this.currentController.signal),
        this.getUserEngagementOverview(timeRange, this.currentController.signal),
        this.getTimeUsagePatterns(timeRange, this.currentController.signal),
        this.getTopContentAccessed(timeRange, this.currentController.signal),
        this.getAnalyticsOverview(timeRange, this.currentController.signal),
      ]);

      const result = {
        practiceStagePerformance,
        userEngagement,
        timeUsagePatterns,
        topContentAccessed,
        analyticsOverview,
      };

      // Cache the result
      this.setCachedData(cacheKey, result);

      console.log('✅ Successfully fetched all reports data');
      
      return result;
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.log('🚫 Reports data request was cancelled');
        // Re-throw the original AbortError to preserve the error type
        throw error;
      }
      console.error('❌ Error fetching reports data:', error);
      throw new Error(`Failed to fetch reports data: ${error.message}`);
    } finally {
      // Clean up controller
      this.currentController = null;
    }
  }

  // Helper methods
  private getPerformanceStatus(score: number): string {
    if (score >= 90) return 'excellent';
    if (score >= 80) return 'good';
    if (score >= 70) return 'needs-attention';
    return 'poor';
  }

  private getEngagementColor(index: number): string {
    const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#F97316'];
    return colors[index % colors.length];
  }

  // Cleanup method to cancel all ongoing requests
  public cleanup(): void {
    console.log('🧹 Cleaning up reports service requests');
    
    if (this.currentController) {
      this.currentController.abort();
      this.currentController = null;
    }

    // Clear cache
    this.requestCache.clear();
  }

  // Clear cache method
  public clearCache(): void {
    console.log('🗑️ Clearing reports service cache');
    this.requestCache.clear();
  }
}

// Export service instance
export const reportsService = new ReportsService();
