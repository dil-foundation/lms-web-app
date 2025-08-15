import { BASE_API_URL, API_ENDPOINTS } from '@/config/api';
import { getAuthHeadersWithAccept } from '@/utils/authUtils';

// TypeScript interfaces for API responses
export interface DashboardOverviewData {
  totalUsers: number;
  students: number;
  teachers: number;
  admins: number;
  activeUsersToday: number;
}

export interface KeyMetricsData {
  totalUsers: number;
  students: number;
  teachers: number;
  activeToday: number;
  studentsPercentage: number;
  teachersPercentage: number;
}

export interface LearnUsageData {
  today: number;
  thisWeek: number;
  thisMonth?: number;
  totalSessions?: number;
}

export interface MostAccessedLesson {
  title: string;
  stage: string;
  accessCount: number;
  icon: string;
  category?: string;
  lastAccessed?: string;
}

export interface MostAccessedLessonsData {
  lessons: MostAccessedLesson[];
  totalAccesses?: number;
  timeRange?: string;
}

// Use API endpoints from config

// Admin Dashboard Service class for managing all API calls
class AdminDashboardService {
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

  async getAllOverviewData(timeRange: string = 'all_time'): Promise<{
    overview: DashboardOverviewData;
    keyMetrics: KeyMetricsData;
    learnUsage: LearnUsageData;
    mostAccessedLessons: MostAccessedLessonsData;
  }> {
    try {
      console.log('🔄 Fetching all admin dashboard data with timeRange:', timeRange);
      
      // Check cache first
      const cacheKey = this.getCacheKey('admin_overview', { timeRange });
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
      const [overview, keyMetrics, learnUsage, mostAccessedLessons] = await Promise.all([
        this.fetchDashboardOverview(timeRange, this.currentController.signal),
        this.fetchKeyMetrics(timeRange, this.currentController.signal),
        this.fetchLearnUsage(timeRange, this.currentController.signal),
        this.fetchMostAccessedLessons(timeRange, this.currentController.signal),
      ]);

      const result = {
        overview,
        keyMetrics,
        learnUsage,
        mostAccessedLessons,
      };

      // Cache the result
      this.setCachedData(cacheKey, result);

      console.log('✅ Successfully fetched all admin dashboard data');
      
      return result;
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.log('🚫 Admin dashboard request was cancelled');
        // Re-throw the original AbortError to preserve the error type
        throw error;
      }
      console.error('❌ Error fetching admin dashboard data:', error);
      throw new Error(`Failed to fetch admin dashboard data: ${error.message}`);
    } finally {
      // Clean up controller
      this.currentController = null;
    }
  }

  // Implement fetch functions directly in the class to avoid closure issues
  private async fetchDashboardOverview(timeRange: string, signal?: AbortSignal): Promise<DashboardOverviewData> {
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

      console.log('🔍 Fetching dashboard overview data with timeRange:', timeRange);

      const url = new URL(`${BASE_API_URL}${API_ENDPOINTS.ADMIN_DASHBOARD_OVERVIEW}`);
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

      console.log('📥 Raw dashboard overview response:', result);

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

      // Normalize data to our expected format
      // Handle nested structure from the overview endpoint
      const keyMetrics = data.key_metrics || data;
      
      return {
        totalUsers: keyMetrics.total_users || data.total_users || 0,
        students: keyMetrics.students || data.students || 0,
        teachers: keyMetrics.teachers || data.teachers || 0,
        admins: keyMetrics.admins || data.admins || 0,
        activeUsersToday: keyMetrics.active_today || data.active_today || 0,
      };

    } catch (error: any) {
      console.error('❌ Error fetching dashboard overview:', error);
      throw new Error(`Failed to fetch dashboard overview: ${error.message}`);
    }
  }

  private async fetchKeyMetrics(timeRange: string, signal?: AbortSignal): Promise<KeyMetricsData> {
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

      console.log('🔍 Fetching key metrics data with timeRange:', timeRange);

      const url = new URL(`${BASE_API_URL}${API_ENDPOINTS.ADMIN_DASHBOARD_KEY_METRICS}`);
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

      console.log('📥 Raw key metrics response:', result);

      // Handle different possible response formats
      let data: any = {};

      if (result && typeof result === 'object') {
        if (result.data) {
          data = result.data;
        } else if (result.success && result.metrics) {
          data = result.metrics;
        } else {
          data = result;
        }
      }

      // Normalize data to our expected format
      return {
        totalUsers: data.total_users || data.totalUsers || 0,
        students: data.students || data.student_count || 0,
        teachers: data.teachers || data.teacher_count || 0,
        activeToday: data.active_today || data.activeToday || data.active_users_today || 0,
        studentsPercentage: data.students_percentage || data.studentsPercentage || 0,
        teachersPercentage: data.teachers_percentage || data.teachersPercentage || 0,
      };

    } catch (error: any) {
      console.error('❌ Error fetching key metrics:', error);
      throw new Error(`Failed to fetch key metrics: ${error.message}`);
    }
  }

  private async fetchLearnUsage(timeRange: string, signal?: AbortSignal): Promise<LearnUsageData> {
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

      console.log('🔍 Fetching learn usage data with timeRange:', timeRange);

      const url = new URL(`${BASE_API_URL}${API_ENDPOINTS.ADMIN_DASHBOARD_LEARN_USAGE}`);
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

      console.log('📥 Raw learn usage response:', result);

      // Handle different possible response formats
      let data: any = {};

      if (result && typeof result === 'object') {
        if (result.data) {
          data = result.data;
        } else if (result.success && result.usage) {
          data = result.usage;
        } else {
          data = result;
        }
      }

      // Normalize data to our expected format
      // Handle nested structure from the overview endpoint
      const learnUsage = data.learn_feature_usage || data;
      
      return {
        today: learnUsage.today_access || data.today_access || data.today || 0,
        thisWeek: learnUsage.this_week || data.this_week || data.thisWeek || 0,
        thisMonth: learnUsage.this_month || data.this_month || data.thisMonth,
        totalSessions: learnUsage.total_sessions || data.total_sessions,
      };

    } catch (error: any) {
      console.error('❌ Error fetching learn usage:', error);
      throw new Error(`Failed to fetch learn usage: ${error.message}`);
    }
  }

  private async fetchMostAccessedLessons(timeRange: string, signal?: AbortSignal): Promise<MostAccessedLessonsData> {
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

      console.log('🔍 Fetching most accessed lessons data with timeRange:', timeRange);

      const url = new URL(`${BASE_API_URL}${API_ENDPOINTS.ADMIN_DASHBOARD_MOST_ACCESSED_LESSONS}`);
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

      console.log('📥 Raw most accessed lessons response:', result);

      // Handle different possible response formats
      let lessons: any[] = [];
      let totalAccesses = 0;
      let timeRangeResult = '';

      if (result && typeof result === 'object') {
        if (Array.isArray(result)) {
          lessons = result;
        } else if (result.data && Array.isArray(result.data.lessons)) {
          // Handle structure: { success: true, data: { lessons: [...] } }
          lessons = result.data.lessons;
          totalAccesses = result.data.total_accesses || 0;
          timeRangeResult = result.data.time_range || '';
        } else if (result.data && Array.isArray(result.data.most_accessed_lessons)) {
          // Handle structure: { success: true, data: { most_accessed_lessons: [...] } }
          lessons = result.data.most_accessed_lessons;
          totalAccesses = result.data.total_accesses || 0;
          timeRangeResult = result.data.time_range || '';
        } else if (result.data && Array.isArray(result.data)) {
          // Handle structure: { success: true, data: [...] }
          lessons = result.data;
        } else if (result.lessons && Array.isArray(result.lessons)) {
          lessons = result.lessons;
          totalAccesses = result.total_accesses || result.totalAccesses || 0;
          timeRangeResult = result.time_range || result.timeRange || '';
        } else if (result.success && result.lessons && Array.isArray(result.lessons)) {
          lessons = result.lessons;
          totalAccesses = result.total_accesses || result.totalAccesses || 0;
          timeRangeResult = result.time_range || result.timeRange || '';
        } else {
          // Look for any array property that could be lessons
          const arrayProperties = Object.keys(result).filter(key => Array.isArray(result[key]));
          if (arrayProperties.length > 0) {
            lessons = result[arrayProperties[0]];
          } else {
            throw new Error('No lessons array found in response');
          }
        }
      }

      if (!Array.isArray(lessons)) {
        throw new Error('Expected lessons data to be an array');
      }

      // Normalize lessons to our expected format
      const normalizedLessons: MostAccessedLesson[] = lessons.map((lesson: any) => ({
        title: lesson.lesson_name || lesson.title || lesson.name || 'Untitled Lesson',
        stage: lesson.stage || lesson.lesson_stage || lesson.level || 'Unknown Stage',
        accessCount: lesson.accesses || lesson.access_count || lesson.accessCount || lesson.count || 0,
        icon: this.convertIconName(lesson.icon) || this.getDefaultIcon(lesson.lesson_name || lesson.title),
        category: lesson.category || lesson.lesson_category,
        lastAccessed: lesson.last_accessed || lesson.lastAccessed,
      }));

      return {
        lessons: normalizedLessons,
        totalAccesses,
        timeRange: timeRangeResult,
      };

    } catch (error: any) {
      console.error('❌ Error fetching most accessed lessons:', error);
      throw new Error(`Failed to fetch most accessed lessons: ${error.message}`);
    }
  }

  // Helper methods moved to class
  private convertIconName(iconName: string): string {
    const iconMap: Record<string, string> = {
      'chatbubble': '💬',
      'flash': '⚡',
      'globe': '🌍',
      'newspaper': '📰',
      'people': '👥',
      'book': '📚',
      'microphone': '🎤',
      'headphones': '🎧',
      'play': '▶️',
      'star': '⭐',
      'trophy': '🏆',
      'target': '🎯',
      'lightbulb': '💡',
      'clock': '🕐',
      'calendar': '📅',
      'chart': '📊',
      'graduation': '🎓',
      'briefcase': '💼',
    };
    
    return iconMap[iconName?.toLowerCase()] || '';
  }

  private getDefaultIcon(title: string): string {
    const titleLower = title?.toLowerCase() || '';
    
    if (titleLower.includes('conversation')) return '💬';
    if (titleLower.includes('vocabulary') || titleLower.includes('routine')) return '🕐';
    if (titleLower.includes('workplace') || titleLower.includes('work')) return '💼';
    if (titleLower.includes('academic') || titleLower.includes('presentation')) return '🎓';
    if (titleLower.includes('quick') || titleLower.includes('response')) return '⚡';
    if (titleLower.includes('interview')) return '👔';
    if (titleLower.includes('story') || titleLower.includes('narrative')) return '📖';
    if (titleLower.includes('news') || titleLower.includes('summary')) return '📰';
    if (titleLower.includes('critical') || titleLower.includes('thinking')) return '🤔';
    if (titleLower.includes('roleplay') || titleLower.includes('simulation')) return '🎭';
    if (titleLower.includes('abstract') || titleLower.includes('topic')) return '🌍';
    
    return '📚'; // Default icon
  }

  // Cleanup method to cancel all ongoing requests
  public cleanup(): void {
    console.log('🧹 Cleaning up admin dashboard service requests');
    
    if (this.currentController) {
      this.currentController.abort();
      this.currentController = null;
    }

    // Clear cache
    this.requestCache.clear();
  }

  // Clear cache method
  public clearCache(): void {
    console.log('🗑️ Clearing admin dashboard service cache');
    this.requestCache.clear();
  }
}

// Export service instance
export const adminDashboardService = new AdminDashboardService();
