/**
 * Course Data Layer - Smart Online/Offline Data Abstraction
 * 
 * This service provides a unified interface for accessing course data,
 * automatically switching between online (Supabase) and offline (IndexedDB) sources
 * based on network availability and data availability.
 * 
 * Key Features:
 * - Transparent online/offline switching
 * - Maintains existing API compatibility
 * - Handles signed URLs for offline content
 * - Progress tracking synchronization
 * - Minimal changes to existing components
 * 
 * @version 1.0.0
 */

import { supabase } from '@/integrations/supabase/client';
import { 
  getOfflineDatabase, 
  OfflineCourse, 
  OfflineLesson, 
  OfflineVideo, 
  OfflineAsset 
} from './offlineDatabase';
import { getOfflineDatabaseUtils } from './offlineDatabaseUtils';

// Data source type
export type DataSource = 'online' | 'offline' | 'hybrid';

// Course data interface (matches existing structure)
export interface CourseData {
  id: string;
  title: string;
  subtitle?: string;
  description?: string;
  image_url?: string;
  instructor_name?: string;
  sections: CourseSectionData[];
  // Additional metadata
  total_lessons?: number;
  estimated_duration?: number;
  difficulty_level?: string;
  category?: string;
  // Offline-specific fields
  isOfflineAvailable?: boolean;
  downloadStatus?: 'downloading' | 'completed' | 'error' | 'paused';
  downloadProgress?: number;
  lastAccessed?: Date;
}

export interface CourseSectionData {
  id: string;
  title: string;
  description?: string;
  order: number;
  lessons: CourseLessonData[];
}

export interface CourseLessonData {
  id: string;
  title: string;
  description?: string;
  content?: string;
  order: number;
  duration?: number;
  contentItems: CourseContentItemData[];
  // Progress tracking
  completed?: boolean;
  progress?: number;
  lastAccessed?: Date;
}

export interface CourseContentItemData {
  id: string;
  title: string;
  content_type: 'video' | 'text' | 'quiz' | 'attachment';
  content_path?: string;
  signedUrl?: string; // For videos and attachments
  content?: string; // For text content
  order: number;
  quiz?: QuizData[];
  // Offline-specific
  isAvailableOffline?: boolean;
}

export interface QuizData {
  id: string;
  question: string;
  question_type: string;
  options?: { id: string; option_text: string; is_correct: boolean }[];
  points?: number;
  // Additional quiz fields as needed
}

// Progress data interface
export interface ProgressData {
  courseId: string;
  lessonId: string;
  contentItemId?: string;
  completed: boolean;
  progress: number;
  timeSpent: number;
  lastAccessed: Date;
  completedAt?: Date;
}

/**
 * Course Data Layer Service
 */
export class CourseDataLayer {
  private db = getOfflineDatabase();
  private utils = getOfflineDatabaseUtils();
  private blobUrlCache = new Map<string, string>(); // Cache blob URLs to prevent memory leaks
  private preferOffline = false; // Can be set to prefer offline when available

  /**
   * Cleanup blob URLs to prevent memory leaks
   */
  public cleanupBlobUrls(): void {
    console.log(`🧹 CourseDataLayer: Cleaning up ${this.blobUrlCache.size} cached blob URLs`);
    for (const [key, url] of this.blobUrlCache) {
      URL.revokeObjectURL(url);
    }
    this.blobUrlCache.clear();
  }

  /**
   * Get course data with automatic online/offline switching
   */
  async getCourseData(courseId: string, userId?: string): Promise<CourseData | null> {
    try {
      // Check if course is available offline
      const isOfflineAvailable = await this.utils.isCourseAvailableOffline(courseId);
      const isOnline = navigator.onLine;

      console.log(`📊 CourseDataLayer: Getting course ${courseId} - Online: ${isOnline}, Offline Available: ${isOfflineAvailable}`);

      // Decision logic for data source
      if (isOfflineAvailable && (!isOnline || this.preferOffline)) {
        return this.getCourseDataOffline(courseId, userId);
      } else if (isOnline) {
        return this.getCourseDataOnline(courseId, userId);
      } else {
        // Offline but no offline data available
        throw new Error('Course not available offline. Please download the course when online.');
      }
    } catch (error) {
      console.error('CourseDataLayer: Failed to get course data:', error);
      throw error;
    }
  }

  /**
   * Get course data from online source (Supabase)
   */
  private async getCourseDataOnline(courseId: string, userId?: string): Promise<CourseData | null> {
    console.log('🌐 CourseDataLayer: Fetching course data online');

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

    if (error) throw new Error(`Failed to fetch course data: ${error.message}`);
    if (!data) return null;

    // Process signed URLs for videos and attachments
    await this.processSignedUrls(data);

    // Get user progress if userId provided
    let userProgress: any[] = [];
    if (userId) {
      userProgress = await this.getUserProgressOnline(courseId, userId);
    }

    // Transform to our standard format
    return this.transformOnlineDataToCourseData(data, userProgress);
  }

  /**
   * Get course data from offline source (IndexedDB)
   */
  private async getCourseDataOffline(courseId: string, userId?: string): Promise<CourseData | null> {
    console.log('💾 CourseDataLayer: Fetching course data offline');

    await this.db.init();

    // Get course metadata
    const course = await this.db.getCourse(courseId);
    if (!course) return null;

    // Get lessons
    const lessons = await this.db.getLessonsByCourse(courseId);

    // Get user progress if userId provided
    let userProgress: any[] = [];
    if (userId) {
      userProgress = await this.getUserProgressOffline(courseId, userId);
    }

    // Transform to our standard format
    return await this.transformOfflineDataToCourseData(course, lessons, userProgress);
  }

  /**
   * Get video URL (online signed URL or offline blob URL)
   */
  async getVideoUrl(videoId: string, lessonId: string): Promise<string | null> {
    try {
      const isOnline = navigator.onLine;
      const isOfflineAvailable = await this.isVideoAvailableOffline(videoId);

      if (isOfflineAvailable && (!isOnline || this.preferOffline)) {
        return this.getVideoUrlOffline(videoId);
      } else if (isOnline) {
        return this.getVideoUrlOnline(videoId, lessonId);
      } else {
        throw new Error('Video not available offline');
      }
    } catch (error) {
      console.error('CourseDataLayer: Failed to get video URL:', error);
      return null;
    }
  }

  /**
   * Get asset URL (online signed URL or offline blob URL)
   */
  async getAssetUrl(assetId: string): Promise<string | null> {
    try {
      const isOnline = navigator.onLine;
      const isOfflineAvailable = await this.isAssetAvailableOffline(assetId);

      if (isOfflineAvailable && (!isOnline || this.preferOffline)) {
        return this.getAssetUrlOffline(assetId);
      } else if (isOnline) {
        return this.getAssetUrlOnline(assetId);
      } else {
        throw new Error('Asset not available offline');
      }
    } catch (error) {
      console.error('CourseDataLayer: Failed to get asset URL:', error);
      return null;
    }
  }

  /**
   * Update user progress (with offline sync capability)
   */
  async updateProgress(progressData: ProgressData): Promise<void> {
    try {
      const isOnline = navigator.onLine;

      if (isOnline) {
        // Update online immediately
        await this.updateProgressOnline(progressData);
      }

      // Always update offline for sync later
      await this.updateProgressOffline(progressData);

      console.log(`📈 CourseDataLayer: Progress updated for lesson ${progressData.lessonId}`);
    } catch (error) {
      console.error('CourseDataLayer: Failed to update progress:', error);
      throw error;
    }
  }

  /**
   * Check if course is available offline
   */
  async isCourseAvailableOffline(courseId: string): Promise<boolean> {
    return this.utils.isCourseAvailableOffline(courseId);
  }

  /**
   * Get data source information
   */
  async getDataSourceInfo(courseId: string): Promise<{
    source: DataSource;
    isOnline: boolean;
    isOfflineAvailable: boolean;
    canSwitchSource: boolean;
  }> {
    const isOnline = navigator.onLine;
    const isOfflineAvailable = await this.utils.isCourseAvailableOffline(courseId);

    let source: DataSource;
    if (isOfflineAvailable && isOnline) {
      source = 'hybrid';
    } else if (isOfflineAvailable) {
      source = 'offline';
    } else {
      source = 'online';
    }

    return {
      source,
      isOnline,
      isOfflineAvailable,
      canSwitchSource: isOfflineAvailable && isOnline
    };
  }

  /**
   * Set preference for offline data when available
   */
  setOfflinePreference(prefer: boolean): void {
    this.preferOffline = prefer;
    console.log(`⚙️ CourseDataLayer: Offline preference set to ${prefer}`);
  }

  // ==================== PRIVATE HELPER METHODS ====================

  private async processSignedUrls(courseData: any): Promise<void> {
    for (const section of courseData.sections || []) {
      for (const lesson of section.lessons || []) {
        for (const item of lesson.contentItems || []) {
          if ((item.content_type === 'video' || item.content_type === 'attachment') && item.content_path) {
            try {
              const { data: signedUrlData } = await supabase.storage
                .from('dil-lms')
                .createSignedUrl(item.content_path, 3600);
              item.signedUrl = signedUrlData?.signedUrl;
            } catch (error) {
              console.warn(`Failed to create signed URL for ${item.content_path}:`, error);
            }
          }
        }
      }
    }
  }

  private async getUserProgressOnline(courseId: string, userId: string): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('user_content_item_progress')
        .select('*')
        .eq('user_id', userId)
        .eq('course_id', courseId);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Failed to fetch user progress online:', error);
      return [];
    }
  }

  private async getUserProgressOffline(courseId: string, userId: string): Promise<any[]> {
    try {
      const progress = await this.db.getProgressByCourse(courseId);
      return progress.filter(p => p.userId === userId);
    } catch (error) {
      console.error('Failed to fetch user progress offline:', error);
      return [];
    }
  }

  private transformOnlineDataToCourseData(data: any, userProgress: any[]): CourseData {
    return {
      id: data.id,
      title: data.title,
      subtitle: data.subtitle,
      description: data.description,
      image_url: data.image_url,
      instructor_name: data.instructor_name,
      total_lessons: this.countTotalLessons(data),
      estimated_duration: data.estimated_duration,
      difficulty_level: data.difficulty_level,
      category: data.category,
      isOfflineAvailable: false, // Will be updated if offline version exists
      sections: this.transformSections(data.sections || [], userProgress)
    };
  }

  private async transformOfflineDataToCourseData(
    course: OfflineCourse, 
    lessons: OfflineLesson[], 
    userProgress: any[]
  ): Promise<CourseData> {
    // Group lessons by section
    const sectionsMap = new Map<string, CourseLessonData[]>();
    
    for (const lesson of lessons) {
      const sectionId = lesson.metadata?.sectionId || 'default';
      if (!sectionsMap.has(sectionId)) {
        sectionsMap.set(sectionId, []);
      }
      
      const transformedLesson = await this.transformOfflineLesson(lesson, userProgress);
      sectionsMap.get(sectionId)!.push(transformedLesson);
    }

    // Create sections
    const sections: CourseSectionData[] = Array.from(sectionsMap.entries()).map(([sectionId, sectionLessons]) => ({
      id: sectionId,
      title: sectionLessons[0]?.metadata?.sectionTitle || 'Section',
      order: 0, // Will be properly ordered in future iteration
      lessons: sectionLessons.sort((a, b) => a.order - b.order)
    }));

    return {
      id: course.id,
      title: course.title,
      subtitle: course.subtitle,
      description: course.description,
      image_url: course.image_url,
      instructor_name: course.instructor_name,
      total_lessons: course.total_lessons,
      estimated_duration: course.estimated_duration,
      difficulty_level: course.difficulty_level,
      category: course.category,
      isOfflineAvailable: true,
      downloadStatus: course.downloadStatus,
      downloadProgress: course.downloadProgress,
      lastAccessed: new Date(course.lastAccessed),
      sections: sections
    };
  }

  private transformSections(sections: any[], userProgress: any[]): CourseSectionData[] {
    return sections.map(section => ({
      id: section.id,
      title: section.title,
      description: section.description,
      order: section.order,
      lessons: this.transformLessons(section.lessons || [], userProgress)
    }));
  }

  private transformLessons(lessons: any[], userProgress: any[]): CourseLessonData[] {
    return lessons.map(lesson => {
      const lessonProgress = userProgress.find(p => p.lesson_id === lesson.id);
      
      return {
        id: lesson.id,
        title: lesson.title,
        description: lesson.description,
        content: lesson.content,
        order: lesson.order,
        duration: lesson.duration,
        completed: lessonProgress?.completed || false,
        progress: lessonProgress?.progress || 0,
        lastAccessed: lessonProgress?.last_accessed ? new Date(lessonProgress.last_accessed) : undefined,
        contentItems: this.transformContentItems(lesson.contentItems || [])
      };
    });
  }

  private async transformOfflineLesson(lesson: OfflineLesson, userProgress: any[]): Promise<CourseLessonData> {
    const lessonProgress = userProgress.find(p => p.lessonId === lesson.id);
    
    return {
      id: lesson.id,
      title: lesson.title,
      description: lesson.description,
      content: lesson.content,
      order: lesson.order,
      duration: lesson.duration,
      completed: lessonProgress?.completed || false,
      progress: lessonProgress?.progress || 0,
      lastAccessed: lessonProgress?.lastAccessed ? new Date(lessonProgress.lastAccessed) : undefined,
      contentItems: await this.transformOfflineContentItems(lesson)
    };
  }

  private transformContentItems(contentItems: any[]): CourseContentItemData[] {
    return contentItems.map(item => ({
      id: item.id,
      title: item.title,
      content_type: item.content_type,
      content_path: item.content_path,
      signedUrl: item.signedUrl,
      content: item.content,
      order: item.order,
      quiz: item.quiz || [],
      isAvailableOffline: false // Will be updated based on offline availability
    }));
  }

  private async transformOfflineContentItems(lesson: OfflineLesson): Promise<CourseContentItemData[]> {
    // Transform from offline lesson metadata
    const originalData = lesson.metadata?.originalData;
    if (!originalData?.contentItems) {
      console.warn(`📚 CourseDataLayer: No content items found for lesson ${lesson.id}`);
      return [];
    }

    console.log(`📚 CourseDataLayer: Processing ${originalData.contentItems.length} content items for lesson ${lesson.id}`);
    const items: CourseContentItemData[] = [];
    
    for (const item of originalData.contentItems) {
      let signedUrl: string | undefined;
      
      console.log(`📚 CourseDataLayer: Processing content item ${item.id} (${item.content_type}): ${item.title}`);
      
      // Generate blob URLs for offline content
      if (item.content_type === 'video') {
        console.log(`🎥 CourseDataLayer: Processing video item ${item.id}, lesson.videoId: ${lesson.videoId}`);
        
        // Always try the content item ID first (this is what we store videos as)
        signedUrl = await this.getVideoUrlOffline(item.id);
        console.log(`🎥 CourseDataLayer: Video URL from item.id: ${signedUrl ? 'SUCCESS' : 'FAILED'}`);
        
        // If that fails and we have a different lesson.videoId, try that too
        if (!signedUrl && lesson.videoId && lesson.videoId !== item.id) {
          signedUrl = await this.getVideoUrlOffline(lesson.videoId);
          console.log(`🎥 CourseDataLayer: Video URL from lesson.videoId: ${signedUrl ? 'SUCCESS' : 'FAILED'}`);
        }
        
        if (!signedUrl) {
          console.warn(`🎥 CourseDataLayer: No video URL found for item ${item.id}, lesson videoId: ${lesson.videoId}`);
        }
      } else if (item.content_type === 'attachment') {
        console.log(`📎 CourseDataLayer: Processing attachment item ${item.id}`);
        signedUrl = await this.getAssetUrlOffline(item.id);
        console.log(`📎 CourseDataLayer: Attachment URL: ${signedUrl ? 'SUCCESS' : 'FAILED'}`);
      } else if (item.content_type === 'quiz') {
        console.log(`🧠 CourseDataLayer: Processing quiz item ${item.id} with ${item.quiz?.length || 0} questions`);
      }
      
      items.push({
        id: item.id,
        title: item.title,
        content_type: item.content_type,
        content_path: item.content_path,
        signedUrl: signedUrl || undefined,
        content: item.content,
        order: item.order,
        quiz: item.quiz || [],
        isAvailableOffline: true
      });
    }

    console.log(`📚 CourseDataLayer: Transformed ${items.length} content items for lesson ${lesson.id}`);
    return items;
  }

  private async getVideoUrlOnline(videoId: string, lessonId: string): Promise<string | null> {
    // Get video URL from Supabase storage
    // This would be implemented based on how videos are stored
    return null; // Placeholder
  }

  private async getVideoUrlOffline(videoId: string): Promise<string | null> {
    try {
      console.log(`🎥 CourseDataLayer: Attempting to get offline video for ID: ${videoId}`);
      
      // Check cache first
      if (this.blobUrlCache.has(`video-${videoId}`)) {
        const cachedUrl = this.blobUrlCache.get(`video-${videoId}`)!;
        console.log(`🎥 CourseDataLayer: Using cached blob URL for video ${videoId}`);
        return cachedUrl;
      }
      
      const video = await this.db.getVideo(videoId);
      
      if (!video) {
        console.warn(`🎥 CourseDataLayer: No video found in IndexedDB for ID: ${videoId}`);
        return null;
      }

      // Create blob URL for offline video
      const blobUrl = URL.createObjectURL(video.blob);
      
      // Cache the blob URL
      this.blobUrlCache.set(`video-${videoId}`, blobUrl);
      
      console.log(`🎥 CourseDataLayer: Created blob URL for video ${videoId}: ${blobUrl.substring(0, 50)}...`);
      return blobUrl;
    } catch (error) {
      console.error(`🎥 CourseDataLayer: Failed to get offline video URL for ${videoId}:`, error);
      return null;
    }
  }

  private async getAssetUrlOnline(assetId: string): Promise<string | null> {
    // Get asset URL from Supabase storage
    // This would be implemented based on how assets are stored
    return null; // Placeholder
  }

  private async getAssetUrlOffline(assetId: string): Promise<string | null> {
    try {
      console.log(`📎 CourseDataLayer: Attempting to get offline asset for ID: ${assetId}`);
      
      // Check cache first
      if (this.blobUrlCache.has(`asset-${assetId}`)) {
        const cachedUrl = this.blobUrlCache.get(`asset-${assetId}`)!;
        console.log(`📎 CourseDataLayer: Using cached blob URL for asset ${assetId}`);
        return cachedUrl;
      }
      
      // First try to get asset directly by ID (content item ID)
      let asset = await this.db.getAsset(assetId);
      
      if (!asset) {
        // If not found by ID, search through all assets for content item ID in metadata
        console.log(`📎 CourseDataLayer: Asset not found by ID, searching by content item ID...`);
        const allAssets = await this.db.getAllAssets();
        asset = allAssets.find(a => 
          a.id === assetId || 
          a.metadata?.contentItemId === assetId
        );
      }
      
      if (!asset) {
        console.warn(`📎 CourseDataLayer: No asset found for ID: ${assetId}`);
        return null;
      }

      // Create blob URL for offline asset
      const blobUrl = URL.createObjectURL(asset.blob);
      
      // Cache the blob URL
      this.blobUrlCache.set(`asset-${assetId}`, blobUrl);
      
      console.log(`📎 CourseDataLayer: Created blob URL for asset ${assetId}: ${blobUrl.substring(0, 50)}...`);
      return blobUrl;
    } catch (error) {
      console.error(`📎 CourseDataLayer: Failed to get offline asset URL for ${assetId}:`, error);
      return null;
    }
  }

  private async isVideoAvailableOffline(videoId: string): Promise<boolean> {
    try {
      const video = await this.db.getVideo(videoId);
      return !!video;
    } catch (error) {
      return false;
    }
  }

  private async isAssetAvailableOffline(assetId: string): Promise<boolean> {
    try {
      // This would need a proper asset lookup method
      return false; // Placeholder
    } catch (error) {
      return false;
    }
  }

  private async updateProgressOnline(progressData: ProgressData): Promise<void> {
    // Update progress in Supabase
    const { error } = await supabase
      .from('user_content_item_progress')
      .upsert({
        user_id: progressData.courseId, // This should be userId, needs proper mapping
        course_id: progressData.courseId,
        lesson_id: progressData.lessonId,
        completed: progressData.completed,
        progress: progressData.progress,
        time_spent: progressData.timeSpent,
        last_accessed: progressData.lastAccessed.toISOString(),
        completed_at: progressData.completedAt?.toISOString()
      });

    if (error) throw error;
  }

  private async updateProgressOffline(progressData: ProgressData): Promise<void> {
    // Update progress in IndexedDB
    const offlineProgress = {
      id: `${progressData.courseId}-${progressData.lessonId}`,
      courseId: progressData.courseId,
      lessonId: progressData.lessonId,
      userId: 'current-user', // This should be actual userId
      completed: progressData.completed,
      progress: progressData.progress,
      timeSpent: progressData.timeSpent,
      lastAccessed: progressData.lastAccessed.getTime(),
      completedAt: progressData.completedAt?.getTime(),
      metadata: {}
    };

    await this.db.storeProgress(offlineProgress);
  }

  private countTotalLessons(courseData: any): number {
    return courseData.sections?.reduce((total: number, section: any) => 
      total + (section.lessons?.length || 0), 0) || 0;
  }
}

// Singleton instance
let dataLayerInstance: CourseDataLayer | null = null;

/**
 * Get the singleton instance of CourseDataLayer
 */
export const getCourseDataLayer = (): CourseDataLayer => {
  if (!dataLayerInstance) {
    dataLayerInstance = new CourseDataLayer();
  }
  return dataLayerInstance;
};

export default CourseDataLayer;
