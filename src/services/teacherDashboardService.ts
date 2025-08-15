import { BASE_API_URL, API_ENDPOINTS } from '@/config/api';
import { getAuthHeadersWithAccept } from '@/utils/authUtils';

// TypeScript interfaces for API responses
export interface TeacherEngagementData {
  totalStudentsEngaged: number;
  totalTimeSpent: number;
  avgResponsesPerStudent: number;
  activeStudentsToday: number;
  engagementRate: number;
  engagementTrend: number;
}

export interface TopLesson {
  id: number;
  name: string;
  stage: string;
  accessCount: number;
  trend: 'up' | 'down' | 'stable';
}

export interface BehaviorFlag {
  type: 'excessive_retries' | 'stuck_stage' | 'no_progress';
  title: string;
  description: string;
  count: number;
  severity: 'error' | 'warning' | 'info';
  students: Array<{
    name: string;
    retries?: number;
    lesson?: string;
    daysStuck?: number;
    currentLesson?: string;
    stage?: string;
    lastActive?: string;
    userId?: string;
    stagesAffected?: number[];
    topicsAffected?: number;
    progressPercentage?: number;
  }>;
}

export interface TeacherDashboardOverviewData {
  engagementSummary: TeacherEngagementData;
  topUsedLessons: TopLesson[];
  behaviorFlags: BehaviorFlag[];
}

export interface StudentProgressData {
  id: string;
  name: string;
  email: string;
  stage: string;
  completionPercentage: number;
  averageScore: number;
  lastActive: string;
  enrolledDate: string;
  totalLessons: number;
  completedLessons: number;
  aiTutorFeedback: {
    summary: string;
    sentiment: 'positive' | 'neutral' | 'negative';
    lastFeedback: string;
  };
  performance: {
    trend: 'up' | 'down' | 'stable';
    strugglingAreas: string[];
    strongAreas: string[];
  };
  flags: {
    excessive_retries?: number;
    stuck_days?: number;
    inactive_days?: number;
  };
}

export interface TeacherProgressOverviewData {
  totalStudents: number;
  averageCompletion: number;
  averageScore: number;
  studentsAtRisk: number;
  students: StudentProgressData[];
}

// Teacher Dashboard Service class for managing all API calls
class TeacherDashboardService {
  private currentOverviewController: AbortController | null = null;
  private currentProgressController: AbortController | null = null;
  private requestCache = new Map<string, { data: any; timestamp: number }>();
  private readonly CACHE_DURATION = 60000; // 60 seconds cache (increased for better UX)

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

  async getOverviewData(timeRange: string = 'all_time'): Promise<TeacherDashboardOverviewData> {
    try {
      console.log('🔄 Fetching teacher dashboard data with timeRange:', timeRange);
      
      // Check cache first
      const cacheKey = this.getCacheKey('overview', { timeRange });
      const cachedData = this.getCachedData(cacheKey);
      if (cachedData) {
        return cachedData;
      }

      // Cancel any existing overview request
      if (this.currentOverviewController) {
        this.currentOverviewController.abort();
        // Small delay to ensure proper cleanup
        await new Promise(resolve => setTimeout(resolve, 10));
      }

      // Create single controller for the entire overview operation
      this.currentOverviewController = new AbortController();
      
      // Fetch overview and behavior insights data in parallel for better performance
      const [overviewData, behaviorInsightsData] = await Promise.all([
        this.fetchBasicOverviewData(timeRange, this.currentOverviewController.signal),
        this.fetchBehaviorInsights(timeRange, this.currentOverviewController.signal),
      ]);

      const result = {
        engagementSummary: overviewData.engagementSummary,
        topUsedLessons: overviewData.topUsedLessons,
        behaviorFlags: behaviorInsightsData,
      };

      // Cache the result
      this.setCachedData(cacheKey, result);

      console.log('✅ Successfully processed teacher dashboard overview data');
      
      return result;

    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.log('🚫 Teacher dashboard overview request was cancelled');
        // Re-throw the original AbortError to preserve the error type
        throw error;
      }
      console.error('❌ Error fetching teacher dashboard overview:', error);
      throw new Error(`Failed to fetch teacher dashboard overview: ${error.message}`);
    } finally {
      // Clean up controller
      this.currentOverviewController = null;
    }
  }

  private async fetchBasicOverviewData(timeRange: string = 'all_time', signal?: AbortSignal): Promise<{
    engagementSummary: TeacherEngagementData;
    topUsedLessons: TopLesson[];
  }> {
    try {
      console.log('🔄 Fetching teacher dashboard overview data with timeRange:', timeRange);
      
      // Use provided signal or create a new one
      const controller = signal ? null : new AbortController();
      const requestSignal = signal || controller?.signal;
      const timeoutId = setTimeout(() => {
        if (controller) controller.abort();
        else if (signal && !signal.aborted) {
          console.warn('⚠️ Cannot abort external signal, request may continue');
        }
      }, 15000); // Increased timeout to 15 seconds

      const url = new URL(`${BASE_API_URL}${API_ENDPOINTS.TEACHER_DASHBOARD_OVERVIEW}`);
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

      console.log('📥 Raw teacher dashboard overview response:', result);

      // Handle different possible response formats
      let data: any = {};

      if (result && typeof result === 'object') {
        if (result.data) {
          data = result.data;
        } else if (result.success && result.overview) {
          data = result.overview;
        } else {
          data = result;
        }
      }

      // Normalize data to our expected format - match actual API response structure
      const engagementData = data.learn_feature_engagement_summary || data.engagement_summary || data.engagementSummary || {};
      const topLessons = data.top_used_practice_lessons || data.top_used_lessons || data.topUsedLessons || [];
      const behaviorFlags = data.behavior_flags || data.behaviorFlags || [];

      const normalizedEngagement: TeacherEngagementData = {
        totalStudentsEngaged: engagementData.total_students_engaged || engagementData.totalStudentsEngaged || 0,
        totalTimeSpent: engagementData.total_time_spent_hours || engagementData.total_time_spent || engagementData.totalTimeSpent || 0,
        avgResponsesPerStudent: engagementData.avg_responses_per_student || engagementData.avgResponsesPerStudent || 0,
        activeStudentsToday: engagementData.active_today || engagementData.active_students_today || engagementData.activeStudentsToday || 0,
        engagementRate: engagementData.engagement_rate || engagementData.engagementRate || 0,
        engagementTrend: this.parseEngagementTrend(engagementData.engagement_change) || engagementData.engagement_trend || engagementData.engagementTrend || 0,
      };

      const normalizedTopLessons: TopLesson[] = topLessons.map((lesson: any, index: number) => ({
        id: lesson.id || index + 1,
        name: lesson.name || lesson.lesson_name || lesson.title || 'Unknown Lesson',
        stage: lesson.stage || lesson.lesson_stage || lesson.level || 'Unknown Stage',
        accessCount: lesson.access_count || lesson.accessCount || lesson.accesses || lesson.count || 0,
        trend: this.normalizeTrend(lesson.trend),
      }));

      console.log('✅ Successfully processed basic teacher dashboard overview data');
      
      return {
        engagementSummary: normalizedEngagement,
        topUsedLessons: normalizedTopLessons,
      };

    } catch (error: any) {
      console.error('❌ Error fetching basic teacher dashboard overview:', error);
      throw new Error(`Failed to fetch basic teacher dashboard overview: ${error.message}`);
    }
  }

  private async fetchBehaviorInsights(timeRange: string = 'all_time', signal?: AbortSignal): Promise<BehaviorFlag[]> {
    try {
      console.log('🔄 Fetching teacher dashboard behavior insights with timeRange:', timeRange);
      
      // Use provided signal or create a new one
      const controller = signal ? null : new AbortController();
      const requestSignal = signal || controller?.signal;
      const timeoutId = setTimeout(() => {
        if (controller) controller.abort();
        else if (signal && !signal.aborted) {
          console.warn('⚠️ Cannot abort external signal, request may continue');
        }
      }, 15000); // Increased timeout to 15 seconds

      const url = new URL(`${BASE_API_URL}${API_ENDPOINTS.TEACHER_DASHBOARD_BEHAVIOR_INSIGHTS}`);
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

      console.log('📥 Raw teacher dashboard behavior insights response:', result);

      // Handle different possible response formats
      let data: any = {};

      if (result && typeof result === 'object') {
        if (result.data) {
          data = result.data;
        } else if (result.success && result.behavior_insights) {
          data = result.behavior_insights;
        } else {
          data = result;
        }
      }

      // Normalize behavior flags data based on actual API response structure
      const normalizedBehaviorFlags: BehaviorFlag[] = [];

      // High Retry Rate Flag
      if (data.high_retry_rate?.has_alert) {
        normalizedBehaviorFlags.push({
          type: 'excessive_retries',
          title: 'High Retry Rate Detected',
          description: data.high_retry_rate.message,
          count: data.high_retry_rate.affected_students,
          severity: 'warning',
          students: data.high_retry_rate.details?.map((student: any) => ({
            name: student.student_name,
            retries: student.total_attempts,
            lesson: `${student.topics_affected} topics across ${student.stages_affected.length} stages`,
            userId: student.user_id,
            stagesAffected: student.stages_affected,
            topicsAffected: student.topics_affected
          })) || []
        });
      }

      // Stuck Students Flag
      if (data.stuck_students?.has_alert) {
        normalizedBehaviorFlags.push({
          type: 'stuck_stage',
          title: 'Students Stuck at Stages',
          description: data.stuck_students.message,
          count: data.stuck_students.affected_students,
          severity: 'error',
          students: data.stuck_students.details?.map((student: any) => ({
            name: student.student_name,
            daysStuck: student.days_stuck,
            currentLesson: student.current_lesson,
            stage: student.current_stage,
            userId: student.user_id,
            progressPercentage: student.progress_percentage
          })) || []
        });
      }

      // Low Engagement Flag
      if (data.low_engagement?.has_alert) {
        normalizedBehaviorFlags.push({
          type: 'no_progress',
          title: 'Low Engagement Detected',
          description: data.low_engagement.message,
          count: data.low_engagement.affected_students,
          severity: 'info',
          students: data.low_engagement.details?.map((student: any) => ({
            name: student.student_name,
            lastActive: student.last_activity || student.last_active_date || student.last_active || 'Unknown',
            stage: student.current_stage || student.stage || 'Unknown',
            userId: student.user_id,
            progressPercentage: student.progress_percentage || 0
          })) || []
        });
      }

      // Inactivity Flag (only if has_alert is true)
      if (data.inactivity?.has_alert) {
        normalizedBehaviorFlags.push({
          type: 'no_progress',
          title: 'Student Inactivity',
          description: data.inactivity.message,
          count: data.inactivity.affected_students,
          severity: 'info',
          students: data.inactivity.details?.map((student: any) => ({
            name: student.student_name,
            lastActive: student.last_activity || student.last_active_date || student.last_active || 'Unknown',
            stage: student.current_stage || student.stage || 'Unknown',
            userId: student.user_id,
            progressPercentage: student.progress_percentage || 0
          })) || []
        });
      }

      console.log('✅ Successfully processed teacher dashboard behavior insights');
      
      return normalizedBehaviorFlags;

    } catch (error: any) {
      console.error('❌ Error fetching teacher dashboard behavior insights:', error);
      // Return empty array instead of throwing to prevent breaking the entire dashboard
      console.warn('⚠️ Returning empty behavior flags due to error');
      return [];
    }
  }

  private normalizeTrend(trend: any): 'up' | 'down' | 'stable' {
    if (typeof trend === 'string') {
      const trendLower = trend.toLowerCase();
      if (trendLower === 'up' || trendLower === 'increasing' || trendLower === 'positive') return 'up';
      if (trendLower === 'down' || trendLower === 'decreasing' || trendLower === 'negative') return 'down';
      return 'stable';
    }
    if (typeof trend === 'number') {
      if (trend > 0) return 'up';
      if (trend < 0) return 'down';
      return 'stable';
    }
    return 'stable';
  }

  private parseEngagementTrend(engagementChange: string): number {
    if (!engagementChange || typeof engagementChange !== 'string') return 0;
    
    // Parse strings like "+0% from last week" or "-5% from last week"
    const match = engagementChange.match(/([+-]?\d+)%/);
    if (match) {
      return parseInt(match[1], 10);
    }
    
    return 0;
  }

  async getProgressOverviewData(
    timeRange: string = 'all_time', 
    searchQuery?: string, 
    stageFilter?: string
  ): Promise<TeacherProgressOverviewData> {
    try {
      console.log('🔄 Fetching teacher dashboard progress overview with filters:', { 
        timeRange, 
        searchQuery, 
        stageFilter 
      });
      
      // Check cache first
      const cacheKey = this.getCacheKey('progress', { timeRange, searchQuery, stageFilter });
      const cachedData = this.getCachedData(cacheKey);
      if (cachedData) {
        return cachedData;
      }

      // Cancel any existing progress request
      if (this.currentProgressController) {
        this.currentProgressController.abort();
        // Small delay to ensure proper cleanup
        await new Promise(resolve => setTimeout(resolve, 10));
      }

      // Create new controller
      this.currentProgressController = new AbortController();
      const timeoutId = setTimeout(() => {
        if (this.currentProgressController) {
          this.currentProgressController.abort();
        }
      }, 15000); // Increased timeout to 15 seconds

      const url = new URL(`${BASE_API_URL}${API_ENDPOINTS.TEACHER_DASHBOARD_PROGRESS_OVERVIEW}`);
      url.searchParams.append('time_range', timeRange);
      
      // Add filter parameters if provided
      if (searchQuery && searchQuery.trim()) {
        url.searchParams.append('search_query', searchQuery.trim());
      }
      if (stageFilter && stageFilter !== 'all') {
        // Extract just the number from "Stage X" format
        const stageNumber = stageFilter.replace('Stage ', '');
        url.searchParams.append('stage_id', stageNumber);
      }

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: getAuthHeadersWithAccept(),
        signal: this.currentProgressController.signal,
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

      console.log('📥 Raw teacher dashboard progress overview response:', result);

      // Handle different possible response formats
      let data: any = {};

      if (result && typeof result === 'object') {
        if (result.data) {
          data = result.data;
        } else if (result.success && result.progress_overview) {
          data = result.progress_overview;
        } else {
          data = result;
        }
      }

      // Normalize student progress data
      const students = (data.students || []).map((student: any) => ({
        id: student.id || student.user_id || '',
        name: student.name || student.student_name || 'Unknown Student',
        email: student.email || '',
        stage: student.stage || student.current_stage || 'Stage 1',
        completionPercentage: student.completion_percentage || student.completionPercentage || student.progress_percentage || 0,
        averageScore: Math.round((student.avg_score || student.average_score || student.averageScore || 0) * 10) / 10, // Round to 1 decimal place
        lastActive: student.last_active || student.lastActive || '',
        enrolledDate: student.enrolled_date || student.enrolledDate || '',
        totalLessons: student.total_lessons || student.totalLessons || 0,
        completedLessons: student.completed_lessons || student.completedLessons || student.exercises_completed || 0,
        aiTutorFeedback: {
          summary: student.ai_feedback || student.aiTutorFeedback?.summary || 'No feedback available',
          sentiment: this.normalizeSentiment(student.feedback_sentiment || student.ai_feedback?.sentiment || student.aiTutorFeedback?.sentiment),
          lastFeedback: student.ai_feedback || student.ai_feedback?.last_feedback || student.aiTutorFeedback?.lastFeedback || 'No recent feedback'
        },
        performance: {
          trend: this.normalizeTrend(student.performance?.trend || student.trend),
          strugglingAreas: student.performance?.struggling_areas || student.strugglingAreas || [],
          strongAreas: student.performance?.strong_areas || student.strongAreas || []
        },
        flags: {
          excessive_retries: student.flags?.excessive_retries,
          stuck_days: student.flags?.stuck_days,
          inactive_days: student.flags?.inactive_days || (student.is_at_risk ? 1 : undefined)
        }
      }));

      // Use API provided summary statistics or calculate from students data
      const totalStudents = data.total_students || students.length;
      const averageCompletion = data.avg_completion_percentage !== undefined 
        ? Math.round(data.avg_completion_percentage * 10) / 10
        : (totalStudents > 0 
          ? Math.round(students.reduce((acc: number, s: any) => acc + s.completionPercentage, 0) / totalStudents)
          : 0);
      const averageScore = data.avg_score !== undefined
        ? Math.round(data.avg_score * 10) / 10
        : (totalStudents > 0
          ? Math.round(students.reduce((acc: number, s: any) => acc + s.averageScore, 0) / totalStudents * 10) / 10
          : 0);
      const studentsAtRisk = data.students_at_risk_count !== undefined
        ? data.students_at_risk_count
        : students.filter((s: any) => Object.keys(s.flags).some(key => s.flags[key] > 0)).length;

      const progressResult = {
        totalStudents,
        averageCompletion,
        averageScore,
        studentsAtRisk,
        students
      };

      // Cache the result
      this.setCachedData(cacheKey, progressResult);

      console.log('✅ Successfully processed teacher dashboard progress overview');
      
      return progressResult;

    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.log('🚫 Teacher dashboard progress overview request was cancelled');
        // Re-throw the original AbortError to preserve the error type
        throw error;
      }
      console.error('❌ Error fetching teacher dashboard progress overview:', error);
      throw new Error(`Failed to fetch teacher dashboard progress overview: ${error.message}`);
    } finally {
      // Clean up controller
      this.currentProgressController = null;
    }
  }

  private normalizeSentiment(sentiment: any): 'positive' | 'neutral' | 'negative' {
    if (typeof sentiment === 'string') {
      const sentimentLower = sentiment.toLowerCase();
      if (sentimentLower === 'positive' || sentimentLower === 'good' || sentimentLower === 'excellent') return 'positive';
      if (sentimentLower === 'negative' || sentimentLower === 'poor' || sentimentLower === 'bad') return 'negative';
      return 'neutral';
    }
    return 'neutral';
  }

  async getStudentDetail(userId: string): Promise<any> {
    try {
      console.log('🔄 Fetching student detail data for userId:', userId);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const url = `${BASE_API_URL}${API_ENDPOINTS.TEACHER_DASHBOARD_STUDENT_DETAIL(userId)}`;

      const response = await fetch(url, {
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

      console.log('📥 Raw student detail response:', result);

      // Handle different possible response formats
      let data: any = {};

      if (result && typeof result === 'object') {
        if (result.data) {
          data = result.data;
        } else if (result.success && result.student) {
          data = result.student;
        } else {
          data = result;
        }
      }

      console.log('✅ Successfully processed student detail data');
      
      return data;

    } catch (error: any) {
      console.error('❌ Error fetching student detail data:', error);
      throw new Error(`Failed to fetch student detail data: ${error.message}`);
    }
  }

  async exportProgressData(
    timeRange: string = 'all_time', 
    format: 'csv' = 'csv',
    searchQuery?: string,
    stageFilter?: string
  ): Promise<Blob> {
    try {
      console.log('🔄 Exporting teacher dashboard progress data with timeRange:', timeRange, 'format:', format);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout for export

      const url = new URL(`${BASE_API_URL}${API_ENDPOINTS.TEACHER_DASHBOARD_EXPORT_PROGRESS}`);
      url.searchParams.append('time_range', timeRange);
      url.searchParams.append('format', format);
      
      // Add filter parameters if provided
      if (searchQuery && searchQuery.trim()) {
        url.searchParams.append('search_query', searchQuery.trim());
      }
      if (stageFilter && stageFilter !== 'all') {
        // Extract just the number from "Stage X" format
        const stageNumber = stageFilter.replace('Stage ', '');
        url.searchParams.append('stage_id', stageNumber);
      }

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

      // Get the blob data for file download
      const blob = await response.blob();
      
      console.log('✅ Successfully exported teacher dashboard progress data');
      
      return blob;

    } catch (error: any) {
      console.error('❌ Error exporting teacher dashboard progress data:', error);
      throw new Error(`Failed to export progress data: ${error.message}`);
    }
  }

  // Cleanup method to cancel all ongoing requests
  public cleanup(): void {
    console.log('🧹 Cleaning up teacher dashboard service requests');
    
    if (this.currentOverviewController) {
      this.currentOverviewController.abort();
      this.currentOverviewController = null;
    }
    
    if (this.currentProgressController) {
      this.currentProgressController.abort();
      this.currentProgressController = null;
    }

    // Clear cache
    this.requestCache.clear();
  }

  // Clear cache method
  public clearCache(): void {
    console.log('🗑️ Clearing teacher dashboard service cache');
    this.requestCache.clear();
  }
}

// Export service instance
export const teacherDashboardService = new TeacherDashboardService();
