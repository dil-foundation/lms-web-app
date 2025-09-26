/**
 * Offline Database Utilities
 * Helper functions and utilities for working with the offline database
 * 
 * @version 1.0.0
 */

import { 
  getOfflineDatabase, 
  OfflineCourse, 
  OfflineLesson, 
  OfflineVideo, 
  OfflineAsset, 
  OfflineProgress,
  STORAGE_LIMITS 
} from './offlineDatabase';

/**
 * Storage information interface
 */
export interface StorageInfo {
  used: number;
  available: number;
  quota: number;
  usedPercentage: number;
  courses: Array<{
    id: string;
    title: string;
    size: number;
    sizeFormatted: string;
    lastAccessed: Date;
  }>;
}

/**
 * Course download statistics
 */
export interface CourseStats {
  totalCourses: number;
  completedDownloads: number;
  inProgressDownloads: number;
  failedDownloads: number;
  totalSize: number;
  totalSizeFormatted: string;
}

/**
 * Database health check result
 */
export interface DatabaseHealth {
  isHealthy: boolean;
  version: number;
  stores: string[];
  issues: string[];
  recommendations: string[];
}

/**
 * Utility class for offline database operations
 */
export class OfflineDatabaseUtils {
  private db = getOfflineDatabase();

  /**
   * Format bytes to human readable format
   */
  static formatBytes(bytes: number, decimals: number = 2): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];

    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  }

  /**
   * Generate unique ID for database records
   */
  static generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Create composite key for progress records
   */
  static createProgressId(courseId: string, lessonId: string): string {
    return `${courseId}-${lessonId}`;
  }

  /**
   * Get comprehensive storage information
   */
  async getStorageInfo(): Promise<StorageInfo> {
    await this.db.init();
    
    const storage = await this.db.getStorageUsage();
    const courses = await this.db.getAllCourses();
    
    const courseInfo = courses.map(course => ({
      id: course.id,
      title: course.title,
      size: course.totalSize,
      sizeFormatted: OfflineDatabaseUtils.formatBytes(course.totalSize),
      lastAccessed: new Date(course.lastAccessed)
    }));

    return {
      used: storage.used,
      available: storage.available,
      quota: storage.quota,
      usedPercentage: (storage.used / storage.quota) * 100,
      courses: courseInfo.sort((a, b) => b.lastAccessed.getTime() - a.lastAccessed.getTime())
    };
  }

  /**
   * Get course download statistics
   */
  async getCourseStats(): Promise<CourseStats> {
    await this.db.init();
    
    const courses = await this.db.getAllCourses();
    
    const stats = courses.reduce((acc, course) => {
      acc.totalSize += course.totalSize;
      
      switch (course.downloadStatus) {
        case 'completed':
          acc.completedDownloads++;
          break;
        case 'downloading':
        case 'paused':
          acc.inProgressDownloads++;
          break;
        case 'error':
          acc.failedDownloads++;
          break;
      }
      
      return acc;
    }, {
      totalCourses: courses.length,
      completedDownloads: 0,
      inProgressDownloads: 0,
      failedDownloads: 0,
      totalSize: 0,
      totalSizeFormatted: ''
    });

    stats.totalSizeFormatted = OfflineDatabaseUtils.formatBytes(stats.totalSize);
    
    return stats;
  }

  /**
   * Check if a course is fully downloaded and available offline
   */
  async isCourseAvailableOffline(courseId: string): Promise<boolean> {
    await this.db.init();
    
    const course = await this.db.getCourse(courseId);
    if (!course || course.downloadStatus !== 'completed') {
      return false;
    }

    // Verify all lessons are present
    const lessons = await this.db.getLessonsByCourse(courseId);
    if (lessons.length === 0) {
      return false;
    }

    // Verify videos are present for video lessons
    for (const lesson of lessons) {
      if (lesson.type === 'video' && lesson.videoId) {
        const video = await this.db.getVideo(lesson.videoId);
        if (!video) {
          return false;
        }
      }
    }

    return true;
  }

  /**
   * Get course completion percentage based on downloaded content
   */
  async getCourseDownloadProgress(courseId: string): Promise<number> {
    await this.db.init();
    
    const course = await this.db.getCourse(courseId);
    if (!course) {
      return 0;
    }

    return course.downloadProgress;
  }

  /**
   * Estimate download size for a course (placeholder - will be implemented with actual course data)
   */
  async estimateCourseSize(courseId: string): Promise<number> {
    // This will be implemented when we have the course download service
    // For now, return a reasonable estimate
    return 500 * 1024 * 1024; // 500MB default estimate
  }

  /**
   * Check database health and integrity
   */
  async checkDatabaseHealth(): Promise<DatabaseHealth> {
    const health: DatabaseHealth = {
      isHealthy: true,
      version: 1,
      stores: ['courses', 'lessons', 'videos', 'assets', 'progress'],
      issues: [],
      recommendations: []
    };

    try {
      await this.db.init();
      
      // Check storage usage
      const storage = await this.getStorageInfo();
      if (storage.usedPercentage > 90) {
        health.issues.push('Storage usage is above 90%');
        health.recommendations.push('Consider cleaning up old courses');
        health.isHealthy = false;
      }

      // Check for failed downloads
      const courses = await this.db.getAllCourses();
      const failedCourses = courses.filter(c => c.downloadStatus === 'error');
      if (failedCourses.length > 0) {
        health.issues.push(`${failedCourses.length} courses have failed downloads`);
        health.recommendations.push('Retry failed downloads or remove corrupted courses');
      }

      // Check for orphaned data
      const lessons = await this.db.getAllCourses(); // This will be expanded to check orphaned lessons
      
      // Check for old courses
      const oldCourses = courses.filter(c => 
        Date.now() - c.lastAccessed > STORAGE_LIMITS.AUTO_CLEANUP_DAYS * 24 * 60 * 60 * 1000
      );
      if (oldCourses.length > 0) {
        health.recommendations.push(`${oldCourses.length} courses haven't been accessed in ${STORAGE_LIMITS.AUTO_CLEANUP_DAYS} days`);
      }

    } catch (error) {
      health.isHealthy = false;
      health.issues.push(`Database initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      health.recommendations.push('Try refreshing the page or clearing browser data');
    }

    return health;
  }

  /**
   * Perform database maintenance
   */
  async performMaintenance(): Promise<{
    cleanedCourses: string[];
    reclaimedSpace: number;
    errors: string[];
  }> {
    await this.db.init();
    
    const result = {
      cleanedCourses: [] as string[],
      reclaimedSpace: 0,
      errors: [] as string[]
    };

    try {
      // Get storage info before cleanup
      const beforeStorage = await this.getStorageInfo();
      
      // Clean up old courses
      const cleanedCourses = await this.db.cleanupOldCourses();
      result.cleanedCourses = cleanedCourses;
      
      // Calculate reclaimed space
      const afterStorage = await this.getStorageInfo();
      result.reclaimedSpace = beforeStorage.used - afterStorage.used;
      
      console.log(`🧹 Database maintenance completed: ${cleanedCourses.length} courses cleaned, ${OfflineDatabaseUtils.formatBytes(result.reclaimedSpace)} reclaimed`);
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      result.errors.push(errorMessage);
      console.error('❌ Database maintenance failed:', errorMessage);
    }

    return result;
  }

  /**
   * Export course data for backup (metadata only, not blobs)
   */
  async exportCourseMetadata(courseId: string): Promise<{
    course: OfflineCourse | null;
    lessons: OfflineLesson[];
    progress: OfflineProgress[];
  }> {
    await this.db.init();
    
    const course = await this.db.getCourse(courseId);
    const lessons = course ? await this.db.getLessonsByCourse(courseId) : [];
    const progress = course ? await this.db.getProgressByCourse(courseId) : [];
    
    return {
      course,
      lessons,
      progress
    };
  }

  /**
   * Get courses that need attention (failed downloads, old courses, etc.)
   */
  async getCoursesNeedingAttention(): Promise<{
    failed: OfflineCourse[];
    old: OfflineCourse[];
    incomplete: OfflineCourse[];
  }> {
    await this.db.init();
    
    const courses = await this.db.getAllCourses();
    const cutoffTime = Date.now() - (STORAGE_LIMITS.AUTO_CLEANUP_DAYS * 24 * 60 * 60 * 1000);
    
    return {
      failed: courses.filter(c => c.downloadStatus === 'error'),
      old: courses.filter(c => c.lastAccessed < cutoffTime),
      incomplete: courses.filter(c => c.downloadStatus === 'downloading' || c.downloadStatus === 'paused')
    };
  }

  /**
   * Reset database (for development/testing)
   */
  async resetDatabase(): Promise<void> {
    await this.db.init();
    
    const courses = await this.db.getAllCourses();
    for (const course of courses) {
      await this.db.deleteCourse(course.id);
    }
    
    console.log('🔄 Database reset completed');
  }
}

// Singleton instance
let utilsInstance: OfflineDatabaseUtils | null = null;

/**
 * Get the singleton instance of OfflineDatabaseUtils
 */
export const getOfflineDatabaseUtils = (): OfflineDatabaseUtils => {
  if (!utilsInstance) {
    utilsInstance = new OfflineDatabaseUtils();
  }
  return utilsInstance;
};

export default OfflineDatabaseUtils;
