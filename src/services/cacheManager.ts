// Cache Manager Service
// Handles intelligent caching strategies for different types of data

import { supabase } from '@/integrations/supabase/client';
import { offlineDatabase } from './offlineDatabase';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';

export interface CacheStrategy {
  name: string;
  description: string;
  maxAge: number; // in milliseconds
  staleWhileRevalidate: boolean;
  networkFirst: boolean;
}

export interface CacheEntry<T = any> {
  data: T;
  timestamp: number;
  etag?: string;
  maxAge: number;
  strategy: string;
}

export interface CacheOptions {
  strategy?: CacheStrategy;
  forceRefresh?: boolean;
  fallbackToCache?: boolean;
}

// Predefined cache strategies
export const CACHE_STRATEGIES = {
  COURSE_LIST: {
    name: 'course-list',
    description: 'Course listings with moderate freshness requirements',
    maxAge: 5 * 60 * 1000, // 5 minutes
    staleWhileRevalidate: true,
    networkFirst: false
  },
  COURSE_CONTENT: {
    name: 'course-content',
    description: 'Course content that changes infrequently',
    maxAge: 30 * 60 * 1000, // 30 minutes
    staleWhileRevalidate: true,
    networkFirst: false
  },
  USER_PROGRESS: {
    name: 'user-progress',
    description: 'User progress data requiring freshness',
    maxAge: 2 * 60 * 1000, // 2 minutes
    staleWhileRevalidate: true,
    networkFirst: true
  },
  STATIC_DATA: {
    name: 'static-data',
    description: 'Static reference data',
    maxAge: 60 * 60 * 1000, // 1 hour
    staleWhileRevalidate: false,
    networkFirst: false
  },
  REAL_TIME: {
    name: 'real-time',
    description: 'Real-time data that should always be fresh',
    maxAge: 30 * 1000, // 30 seconds
    staleWhileRevalidate: false,
    networkFirst: true
  }
} as const;

class CacheManagerService {
  private memoryCache = new Map<string, CacheEntry>();
  private pendingRequests = new Map<string, Promise<any>>();

  // Generate cache key from request parameters
  private getCacheKey(endpoint: string, params?: Record<string, any>): string {
    const paramString = params ? JSON.stringify(params) : '';
    return `${endpoint}:${paramString}`;
  }

  // Check if cache entry is still valid
  private isValidCacheEntry(entry: CacheEntry): boolean {
    const now = Date.now();
    return (now - entry.timestamp) < entry.maxAge;
  }

  // Check if cache entry is stale but acceptable
  private isStaleButAcceptable(entry: CacheEntry): boolean {
    const strategy = Object.values(CACHE_STRATEGIES).find(s => s.name === entry.strategy);
    if (!strategy?.staleWhileRevalidate) return false;
    
    const now = Date.now();
    const staleThreshold = entry.maxAge * 2; // Allow stale data for 2x the max age
    return (now - entry.timestamp) < staleThreshold;
  }

  // Store data in memory cache
  private setCacheEntry<T>(key: string, data: T, strategy: CacheStrategy, etag?: string): void {
    this.memoryCache.set(key, {
      data,
      timestamp: Date.now(),
      etag,
      maxAge: strategy.maxAge,
      strategy: strategy.name
    });
  }

  // Get data from memory cache
  private getCacheEntry<T>(key: string): CacheEntry<T> | null {
    const entry = this.memoryCache.get(key);
    return entry as CacheEntry<T> || null;
  }

  // Make network request with error handling
  private async makeNetworkRequest<T>(
    requestFn: () => Promise<T>,
    cacheKey: string,
    strategy: CacheStrategy
  ): Promise<T> {
    try {
      const data = await requestFn();
      this.setCacheEntry(cacheKey, data, strategy);
      return data;
    } catch (error) {
      console.error('[CacheManager] Network request failed:', error);
      throw error;
    }
  }

  // Main caching method
  async get<T>(
    cacheKey: string,
    requestFn: () => Promise<T>,
    options: CacheOptions = {}
  ): Promise<T> {
    const strategy = options.strategy || CACHE_STRATEGIES.COURSE_LIST;
    const fullCacheKey = `${strategy.name}:${cacheKey}`;

    // Check for pending request to avoid duplicate calls
    if (this.pendingRequests.has(fullCacheKey)) {
      return this.pendingRequests.get(fullCacheKey);
    }

    // Force refresh bypasses all caching
    if (options.forceRefresh) {
      const promise = this.makeNetworkRequest(requestFn, fullCacheKey, strategy);
      this.pendingRequests.set(fullCacheKey, promise);
      
      try {
        const result = await promise;
        return result;
      } finally {
        this.pendingRequests.delete(fullCacheKey);
      }
    }

    const cachedEntry = this.getCacheEntry<T>(fullCacheKey);

    // Cache hit with valid data
    if (cachedEntry && this.isValidCacheEntry(cachedEntry)) {
      return cachedEntry.data;
    }

    // Network first strategy
    if (strategy.networkFirst) {
      try {
        const promise = this.makeNetworkRequest(requestFn, fullCacheKey, strategy);
        this.pendingRequests.set(fullCacheKey, promise);
        const result = await promise;
        this.pendingRequests.delete(fullCacheKey);
        return result;
      } catch (error) {
        this.pendingRequests.delete(fullCacheKey);
        
        // Fallback to stale cache if available and network fails
        if (cachedEntry && this.isStaleButAcceptable(cachedEntry)) {
          console.warn('[CacheManager] Using stale cache due to network error');
          return cachedEntry.data;
        }
        
        if (options.fallbackToCache && cachedEntry) {
          console.warn('[CacheManager] Using expired cache as fallback');
          return cachedEntry.data;
        }
        
        throw error;
      }
    }

    // Cache first strategy
    if (cachedEntry) {
      // Return cached data immediately
      const cachedData = cachedEntry.data;
      
      // Background refresh if stale-while-revalidate is enabled
      if (!this.isValidCacheEntry(cachedEntry) && strategy.staleWhileRevalidate) {
        // Don't await this - let it run in background
        this.makeNetworkRequest(requestFn, fullCacheKey, strategy).catch(error => {
          console.warn('[CacheManager] Background refresh failed:', error);
        });
      }
      
      return cachedData;
    }

    // No cache available, make network request
    const promise = this.makeNetworkRequest(requestFn, fullCacheKey, strategy);
    this.pendingRequests.set(fullCacheKey, promise);
    
    try {
      const result = await promise;
      return result;
    } finally {
      this.pendingRequests.delete(fullCacheKey);
    }
  }

  // Specialized methods for common operations
  async getCourses(userId?: string, options: CacheOptions = {}): Promise<any[]> {
    const cacheKey = `courses:${userId || 'all'}`;
    
    return this.get(
      cacheKey,
      async () => {
        let query = supabase.from('courses').select(`
          *,
          sections:course_sections(count),
          members:course_members(count)
        `);
        
        if (userId) {
          query = query.eq('creator_id', userId);
        }
        
        const { data, error } = await query;
        if (error) throw error;
        return data || [];
      },
      { strategy: CACHE_STRATEGIES.COURSE_LIST, ...options }
    );
  }

  async getCourseContent(courseId: string, options: CacheOptions = {}): Promise<any> {
    const cacheKey = `course-content:${courseId}`;
    
    return this.get(
      cacheKey,
      async () => {
        const { data, error } = await supabase
          .from('courses')
          .select(`
            *,
            sections:course_sections (
              *,
              lessons:course_lessons (
                *,
                contentItems:course_lesson_content (
                  *,
                  quiz:quiz_questions(
                    *,
                    options:question_options(*)
                  )
                )
              )
            )
          `)
          .eq('id', courseId)
          .single();
        
        if (error) throw error;
        return data;
      },
      { strategy: CACHE_STRATEGIES.COURSE_CONTENT, ...options }
    );
  }

  async getUserProgress(userId: string, courseId?: string, options: CacheOptions = {}): Promise<any[]> {
    const cacheKey = `user-progress:${userId}:${courseId || 'all'}`;
    
    return this.get(
      cacheKey,
      async () => {
        let query = supabase
          .from('user_progress')
          .select('*')
          .eq('user_id', userId);
        
        if (courseId) {
          query = query.eq('course_id', courseId);
        }
        
        const { data, error } = await query;
        if (error) throw error;
        return data || [];
      },
      { strategy: CACHE_STRATEGIES.USER_PROGRESS, ...options }
    );
  }

  async getQuizSubmissions(userId: string, courseId?: string, options: CacheOptions = {}): Promise<any[]> {
    const cacheKey = `quiz-submissions:${userId}:${courseId || 'all'}`;
    
    return this.get(
      cacheKey,
      async () => {
        let query = supabase
          .from('quiz_submissions')
          .select('*')
          .eq('user_id', userId);
        
        if (courseId) {
          query = query.eq('course_id', courseId);
        }
        
        const { data, error } = await query;
        if (error) throw error;
        return data || [];
      },
      { strategy: CACHE_STRATEGIES.USER_PROGRESS, ...options }
    );
  }

  // Cache invalidation methods
  invalidateCache(pattern: string): void {
    const keysToDelete: string[] = [];
    
    for (const [key] of this.memoryCache) {
      if (key.includes(pattern)) {
        keysToDelete.push(key);
      }
    }
    
    keysToDelete.forEach(key => {
      this.memoryCache.delete(key);
    });
    
    console.log(`[CacheManager] Invalidated ${keysToDelete.length} cache entries matching: ${pattern}`);
  }

  invalidateCourseCache(courseId: string): void {
    this.invalidateCache(`course:${courseId}`);
    this.invalidateCache('courses:');
  }

  invalidateUserCache(userId: string): void {
    this.invalidateCache(`user:${userId}`);
    this.invalidateCache(`progress:${userId}`);
    this.invalidateCache(`quiz-submissions:${userId}`);
  }

  // Clear all cache
  clearCache(): void {
    this.memoryCache.clear();
    this.pendingRequests.clear();
    console.log('[CacheManager] All cache cleared');
  }

  // Cache statistics
  getCacheStats(): {
    totalEntries: number;
    validEntries: number;
    staleEntries: number;
    strategies: Record<string, number>;
  } {
    const stats = {
      totalEntries: this.memoryCache.size,
      validEntries: 0,
      staleEntries: 0,
      strategies: {} as Record<string, number>
    };

    for (const [key, entry] of this.memoryCache) {
      if (this.isValidCacheEntry(entry)) {
        stats.validEntries++;
      } else {
        stats.staleEntries++;
      }

      stats.strategies[entry.strategy] = (stats.strategies[entry.strategy] || 0) + 1;
    }

    return stats;
  }

  // Cleanup stale entries
  cleanup(): void {
    const keysToDelete: string[] = [];
    
    for (const [key, entry] of this.memoryCache) {
      if (!this.isStaleButAcceptable(entry)) {
        keysToDelete.push(key);
      }
    }
    
    keysToDelete.forEach(key => {
      this.memoryCache.delete(key);
    });
    
    console.log(`[CacheManager] Cleaned up ${keysToDelete.length} stale cache entries`);
  }

  // Preload common data
  async preloadEssentialData(userId: string): Promise<void> {
    try {
      console.log('[CacheManager] Preloading essential data...');
      
      // Preload in parallel
      await Promise.allSettled([
        this.getCourses(userId),
        this.getUserProgress(userId),
        // Add other essential data as needed
      ]);
      
      console.log('[CacheManager] Essential data preloaded');
    } catch (error) {
      console.error('[CacheManager] Failed to preload essential data:', error);
    }
  }
}

// Export singleton instance
export const cacheManager = new CacheManagerService();

// React hook for using cache manager
export const useCacheManager = () => {
  return {
    getCourses: cacheManager.getCourses.bind(cacheManager),
    getCourseContent: cacheManager.getCourseContent.bind(cacheManager),
    getUserProgress: cacheManager.getUserProgress.bind(cacheManager),
    getQuizSubmissions: cacheManager.getQuizSubmissions.bind(cacheManager),
    invalidateCache: cacheManager.invalidateCache.bind(cacheManager),
    invalidateCourseCache: cacheManager.invalidateCourseCache.bind(cacheManager),
    invalidateUserCache: cacheManager.invalidateUserCache.bind(cacheManager),
    clearCache: cacheManager.clearCache.bind(cacheManager),
    getCacheStats: cacheManager.getCacheStats.bind(cacheManager),
    preloadEssentialData: cacheManager.preloadEssentialData.bind(cacheManager)
  };
};
