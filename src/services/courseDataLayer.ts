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
  metadata?: any; // For storing additional lesson metadata (e.g., sectionId, sectionTitle)
}

export interface CourseContentItemData {
  id: string;
  title: string;
  content_type: 'video' | 'text' | 'quiz' | 'attachment' | 'lesson_plan';
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
   * Detect video MIME type based on format and URL
   */
  private detectVideoMimeType(format: string, originalUrl: string): string {
    // Try to detect from format first
    if (format) {
      switch (format.toLowerCase()) {
        case 'mp4':
        case 'mpeg4':
          return 'video/mp4';
        case 'webm':
          return 'video/webm';
        case 'ogg':
        case 'ogv':
          return 'video/ogg';
        case 'avi':
          return 'video/x-msvideo';
        case 'mov':
        case 'quicktime':
          return 'video/quicktime';
        case 'wmv':
          return 'video/x-ms-wmv';
        case 'flv':
          return 'video/x-flv';
        case '3gp':
          return 'video/3gpp';
        case 'mkv':
          return 'video/x-matroska';
      }
    }

    // Try to detect from URL extension
    if (originalUrl) {
      const urlLower = originalUrl.toLowerCase();
      if (urlLower.includes('.mp4')) return 'video/mp4';
      if (urlLower.includes('.webm')) return 'video/webm';
      if (urlLower.includes('.ogg') || urlLower.includes('.ogv')) return 'video/ogg';
      if (urlLower.includes('.avi')) return 'video/x-msvideo';
      if (urlLower.includes('.mov')) return 'video/quicktime';
      if (urlLower.includes('.wmv')) return 'video/x-ms-wmv';
      if (urlLower.includes('.flv')) return 'video/x-flv';
      if (urlLower.includes('.3gp')) return 'video/3gpp';
      if (urlLower.includes('.mkv')) return 'video/x-matroska';
    }

    // Default fallback
    console.warn(`🎥 CourseDataLayer: Could not detect MIME type for format: ${format}, URL: ${originalUrl}, using default mp4`);
    return 'video/mp4';
  }

  /**
   * Debug method to list all stored data for a course
   */
  public async debugListVideos(courseId: string): Promise<void> {
    try {
      console.log(`==================== COURSE DEBUG START ====================`);
      
      // Get course info
      const course = await this.db.getCourse(courseId);
      console.log(`📋 Course Info:`, {
        id: course?.id,
        title: course?.title,
        subtitle: course?.subtitle,
        image_url: course?.image_url,
        total_lessons: course?.total_lessons,
        downloadStatus: course?.downloadStatus,
        downloadDate: course?.downloadDate ? new Date(course.downloadDate).toISOString() : 'N/A',
        totalSize: course?.totalSize ? `${(course.totalSize / 1024 / 1024).toFixed(2)} MB` : 'N/A'
      });
      
      // Get all lessons for the course
      const lessons = await this.db.getLessonsByCourse(courseId);
      console.log(`📚 Found ${lessons.length} lessons for course ${courseId}`);
      
      for (const lesson of lessons) {
        console.log(`\n📖 Lesson ${lesson.id}:`);
        console.log(`  - Title: ${lesson.title}`);
        console.log(`  - Type: ${lesson.type}`);
        console.log(`  - VideoId: ${lesson.videoId}`);
        console.log(`  - Order: ${lesson.order}`);
        console.log(`  - Duration: ${lesson.duration || 'N/A'}`);
        console.log(`  - AssetIds: [${lesson.assetIds?.join(', ') || 'none'}]`);
        console.log(`  - Metadata:`, lesson.metadata);
        
        // Check original data content items
        if (lesson.metadata?.originalData?.contentItems) {
          console.log(`  - Original Content Items (${lesson.metadata.originalData.contentItems.length}):`);
          lesson.metadata.originalData.contentItems.forEach((item: any, index: number) => {
            console.log(`    ${index + 1}. ${item.content_type.toUpperCase()}: ${item.title} (ID: ${item.id})`);
            console.log(`       - content_path: ${item.content_path || 'N/A'}`);
            console.log(`       - order: ${item.order}`);
          });
        }
        
        // Get videos for this lesson
        const videos = await this.db.getVideosByLesson(lesson.id);
        console.log(`  🎥 Videos for lesson (${videos.length}):`);
        for (const video of videos) {
          console.log(`    📹 Video ID: ${video.id}`);
          console.log(`       - Original URL: ${video.originalUrl}`);
          console.log(`       - Size: ${(video.size / 1024 / 1024).toFixed(2)} MB`);
          console.log(`       - Quality: ${video.quality}`);
          console.log(`       - Format: ${video.format}`);
          console.log(`       - Compressed: ${video.compressed}`);
          console.log(`       - Download Date: ${new Date(video.downloadDate).toISOString()}`);
          console.log(`       - Metadata:`, video.metadata);
        }
      }
      
      // Get all videos for the course directly
      const allVideos = await this.db.getVideosByCourse(courseId);
      console.log(`\n🎬 All videos in course ${courseId} (${allVideos.length}):`);
      allVideos.forEach((video, index) => {
        console.log(`  ${index + 1}. Video ID: ${video.id} | Lesson: ${video.lessonId} | Size: ${(video.size / 1024 / 1024).toFixed(2)} MB`);
      });
      
      // Get all assets for the course
      const allAssets = await this.db.getAssetsByCourse(courseId);
      console.log(`\n📎 All assets in course ${courseId} (${allAssets.length}):`);
      allAssets.forEach((asset, index) => {
        console.log(`  ${index + 1}. Asset ID: ${asset.id} | Type: ${asset.type} | Filename: ${asset.filename}`);
        console.log(`       - Size: ${(asset.size / 1024).toFixed(2)} KB`);
        console.log(`       - Lesson: ${asset.lessonId || 'N/A'}`);
        console.log(`       - Download Date: ${new Date(asset.downloadDate).toISOString()}`);
      });
      
      console.log(`==================== COURSE DEBUG END ====================`);
      
    } catch (error) {
      console.error(`❌ CourseDataLayer: Debug failed:`, error);
    }
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
          if ((item.content_type === 'video' || item.content_type === 'attachment' || item.content_type === 'lesson_plan') && item.content_path) {
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
      contentItems: await this.transformOfflineContentItems(lesson),
      metadata: lesson.metadata // Preserve metadata for section information
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
        console.log(`🎥 VIDEO PROCESSING START FOR ITEM ${item.id}`);
        console.log(`🎥 CourseDataLayer: Processing video item ${item.id}, lesson.videoId: ${lesson.videoId}`);
        
        // First, let's see what videos are actually stored for this lesson
        try {
          const allVideosForLesson = await this.db.getVideosByLesson(lesson.id);
          console.log(`🎥 CourseDataLayer: Found ${allVideosForLesson.length} videos stored for lesson ${lesson.id}:`);
          allVideosForLesson.forEach(v => {
            console.log(`  📹 Video ID: ${v.id}, originalUrl: ${v.originalUrl}, size: ${(v.size / 1024 / 1024).toFixed(2)}MB`);
          });
        } catch (error) {
          console.warn(`🎥 CourseDataLayer: Error listing videos for lesson: ${error}`);
        }
        
        // Try multiple strategies to find the video
        const videoSearchIds = [
          item.id,                    // Content item ID (primary)
          lesson.videoId,             // Lesson's video ID
          `${lesson.id}_video`,       // Lesson ID + suffix
          lesson.id                   // Lesson ID itself
        ].filter(Boolean).filter((id, index, arr) => arr.indexOf(id) === index); // Remove duplicates
        
        console.log(`🎥 CourseDataLayer: Will try video search IDs: ${videoSearchIds.join(', ')}`);
        
        for (const videoId of videoSearchIds) {
          if (signedUrl) break; // Already found
          
          console.log(`🎥 CourseDataLayer: Trying video ID: ${videoId}`);
          signedUrl = await this.getVideoUrlOffline(videoId);
          
          if (signedUrl) {
            console.log(`🎥 CourseDataLayer: ✅ Found video with ID: ${videoId}`);
            break;
          }
        }
        
        // If still no video found, try to find by lesson ID in the videos store
        if (!signedUrl) {
          console.log(`🎥 CourseDataLayer: Trying to find video by lesson ID: ${lesson.id}`);
          try {
            const videosByLesson = await this.db.getVideosByLesson(lesson.id);
            if (videosByLesson.length > 0) {
              const video = videosByLesson[0]; // Take the first video for this lesson
              console.log(`🎥 CourseDataLayer: Using first video found: ${video.id} (${video.originalUrl})`);
              
              // Apply MIME type fix
              let videoBlob = video.blob;
              if (!videoBlob.type || videoBlob.type === 'application/octet-stream') {
                console.log(`🎥 CourseDataLayer: Fixing MIME type for video ${video.id}`);
                const mimeType = this.detectVideoMimeType(video.format, video.originalUrl);
                videoBlob = new Blob([videoBlob], { type: mimeType });
              }
              
              const blobUrl = URL.createObjectURL(videoBlob);
              this.blobUrlCache.set(`video-${video.id}`, blobUrl);
              signedUrl = blobUrl;
              console.log(`🎥 CourseDataLayer: ✅ Found video by lesson lookup: ${video.id}, blob URL: ${blobUrl}`);
            }
          } catch (error) {
            console.warn(`🎥 CourseDataLayer: Failed to lookup videos by lesson: ${error}`);
          }
        }
        
        if (!signedUrl) {
          console.warn(`🎥 CourseDataLayer: ❌ No video URL found for item ${item.id}, lesson videoId: ${lesson.videoId}, tried IDs: ${videoSearchIds.join(', ')}`);
        }
      } else if (item.content_type === 'attachment') {
        console.log(`📎 CourseDataLayer: Processing attachment item ${item.id}`);
        
        // First, let's see what assets are actually stored for this lesson
        try {
          const allAssetsForLesson = await this.db.getAssetsByLesson(lesson.id);
          console.log(`📎 CourseDataLayer: Found ${allAssetsForLesson.length} assets stored for lesson ${lesson.id}:`);
          allAssetsForLesson.forEach(a => {
            console.log(`  📎 Asset ID: ${a.id}, filename: ${a.filename}, type: ${a.type}, size: ${(a.size / 1024).toFixed(2)}KB`);
          });
        } catch (error) {
          console.warn(`📎 CourseDataLayer: Error listing assets for lesson: ${error}`);
        }
        
        // Try multiple strategies to find the attachment
        const assetSearchIds = [
          item.id,                    // Content item ID (primary)
          `${lesson.id}_attachment`,  // Lesson ID + suffix
          lesson.id                   // Lesson ID itself
        ].filter(Boolean).filter((id, index, arr) => arr.indexOf(id) === index);
        
        console.log(`📎 CourseDataLayer: Will try asset search IDs: ${assetSearchIds.join(', ')}`);
        
        for (const assetId of assetSearchIds) {
          if (signedUrl) break; // Already found
          
          console.log(`📎 CourseDataLayer: Trying asset ID: ${assetId}`);
          signedUrl = await this.getAssetUrlOffline(assetId);
          
          if (signedUrl) {
            console.log(`📎 CourseDataLayer: ✅ Found asset with ID: ${assetId}`);
            break;
          }
        }
        
        // If still no asset found, try to find by lesson ID
        if (!signedUrl) {
          console.log(`📎 CourseDataLayer: Trying to find asset by lesson ID: ${lesson.id}`);
          try {
            const assetsByLesson = await this.db.getAssetsByLesson(lesson.id);
            if (assetsByLesson.length > 0) {
              const asset = assetsByLesson[0]; // Take the first asset for this lesson
              console.log(`📎 CourseDataLayer: Using first asset found: ${asset.id} (${asset.filename})`);
              
              const blobUrl = URL.createObjectURL(asset.blob);
              this.blobUrlCache.set(`asset-${asset.id}`, blobUrl);
              signedUrl = blobUrl;
              console.log(`📎 CourseDataLayer: ✅ Found asset by lesson lookup: ${asset.id}, blob URL: ${blobUrl}`);
            }
          } catch (error) {
            console.warn(`📎 CourseDataLayer: Failed to lookup assets by lesson: ${error}`);
          }
        }
        
        console.log(`📎 CourseDataLayer: Attachment URL: ${signedUrl ? 'SUCCESS' : 'FAILED'}`);
      } else if (item.content_type === 'quiz') {
        console.log(`🧠 CourseDataLayer: Processing quiz item ${item.id} with ${item.quiz?.length || 0} questions`);
      }
      
      const contentItem = {
        id: item.id,
        title: item.title,
        content_type: item.content_type,
        content_path: item.content_path,
        signedUrl: signedUrl || undefined,
        content: item.content,
        order: item.order,
        quiz: item.quiz || [],
        isAvailableOffline: true
      };
      
      console.log(`📚 CourseDataLayer: Created content item:`, {
        id: contentItem.id,
        title: contentItem.title,
        content_type: contentItem.content_type,
        hasSignedUrl: !!contentItem.signedUrl,
        signedUrlPreview: contentItem.signedUrl?.substring(0, 100)
      });
      
      // Special debug for video items
      if (contentItem.content_type === 'video') {
        console.log(`🎥 FINAL VIDEO CONTENT ITEM:`, {
          id: contentItem.id,
          title: contentItem.title,
          hasSignedUrl: !!contentItem.signedUrl,
          signedUrl: contentItem.signedUrl
        });
      }
      
      items.push(contentItem);
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
        console.log(`🎥 CourseDataLayer: ✅ Using cached blob URL for video ${videoId}: ${cachedUrl.substring(0, 50)}...`);
        return cachedUrl;
      }
      
      console.log(`🎥 CourseDataLayer: Cache miss, querying IndexedDB for video ${videoId}`);
      const video = await this.db.getVideo(videoId);
      
      if (!video) {
        console.warn(`🎥 CourseDataLayer: ❌ No video found in IndexedDB for ID: ${videoId}`);
        return null;
      }

      console.log(`🎥 CourseDataLayer: ✅ Found video in IndexedDB:`, {
        id: video.id,
        lessonId: video.lessonId,
        courseId: video.courseId,
        size: `${(video.size / 1024 / 1024).toFixed(2)} MB`,
        format: video.format,
        quality: video.quality,
        originalUrl: video.originalUrl,
        blobType: video.blob.type,
        blobSize: video.blob.size
      });

      // Debug: Check if blob is valid and has content
      console.log(`🔍 CourseDataLayer: Blob validation:`, {
        hasBlob: !!video.blob,
        blobSize: video.blob.size,
        blobType: video.blob.type,
        isValidSize: video.blob.size > 0,
        expectedMimeTypes: ['video/mp4', 'video/quicktime', 'video/webm', 'video/ogg']
      });

      // Check if blob type is supported
      const supportedTypes = ['video/mp4', 'video/quicktime', 'video/webm', 'video/ogg', 'video/avi'];
      const isTypeSupported = supportedTypes.includes(video.blob.type) || video.blob.type.startsWith('video/');
      
      if (!isTypeSupported && video.blob.type) {
        console.warn(`⚠️ CourseDataLayer: Potentially unsupported video type: ${video.blob.type}`);
      }

      // Try to create a proper video blob with correct MIME type if needed
      let videoBlob = video.blob;
      
      // If blob has no type or wrong type, try to fix it based on format
      if (!video.blob.type || !video.blob.type.startsWith('video/')) {
        console.log(`🔧 CourseDataLayer: Fixing blob MIME type based on format: ${video.format}`);
        
        let mimeType = 'video/mp4'; // Default
        switch (video.format?.toLowerCase()) {
          case 'quicktime':
          case 'mov':
            mimeType = 'video/quicktime';
            break;
          case 'mp4':
            mimeType = 'video/mp4';
            break;
          case 'webm':
            mimeType = 'video/webm';
            break;
          case 'ogg':
            mimeType = 'video/ogg';
            break;
          default:
            // Try to detect from original URL
            if (video.originalUrl) {
              if (video.originalUrl.includes('.mov')) mimeType = 'video/quicktime';
              else if (video.originalUrl.includes('.mp4')) mimeType = 'video/mp4';
              else if (video.originalUrl.includes('.webm')) mimeType = 'video/webm';
            }
        }
        
        console.log(`🔧 CourseDataLayer: Creating new blob with MIME type: ${mimeType}`);
        videoBlob = new Blob([video.blob], { type: mimeType });
      }

      // Create blob URL for offline video
      const blobUrl = URL.createObjectURL(videoBlob);
      
      // Cache the blob URL
      this.blobUrlCache.set(`video-${videoId}`, blobUrl);
      
      console.log(`🎥 CourseDataLayer: ✅ Created blob URL for video ${videoId}: ${blobUrl}`);
      console.log(`🔍 CourseDataLayer: Final blob info:`, {
        finalBlobType: videoBlob.type,
        finalBlobSize: videoBlob.size,
        blobUrl: blobUrl
      });
      
      return blobUrl;
    } catch (error) {
      console.error(`🎥 CourseDataLayer: ❌ Failed to get offline video URL for ${videoId}:`, error);
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
        console.warn(`📎 CourseDataLayer: ❌ No asset found for ID: ${assetId}`);
        return null;
      }

      console.log(`📎 CourseDataLayer: ✅ Found asset in IndexedDB:`, {
        id: asset.id,
        filename: asset.filename,
        type: asset.type,
        size: `${(asset.size / 1024).toFixed(2)} KB`,
        courseId: asset.courseId,
        lessonId: asset.lessonId,
        blobType: asset.blob.type,
        blobSize: asset.blob.size,
        metadata: asset.metadata
      });

      // Create blob URL for offline asset
      const blobUrl = URL.createObjectURL(asset.blob);
      
      // Cache the blob URL
      this.blobUrlCache.set(`asset-${assetId}`, blobUrl);
      
      console.log(`📎 CourseDataLayer: ✅ Created blob URL for asset ${assetId}: ${blobUrl}`);
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
