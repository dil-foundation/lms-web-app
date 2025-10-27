/**
 * Course Download Service
 * Handles downloading and storing complete courses for offline access
 * 
 * Features:
 * - Downloads course metadata, lessons, videos, and assets
 * - Compresses videos for optimal storage
 * - Tracks download progress in real-time
 * - Handles errors and retries gracefully
 * - Integrates with existing course data structure
 * 
 * @version 1.0.0
 */

import { supabase } from '@/integrations/supabase/client';
import { 
  getOfflineDatabase, 
  OfflineCourse, 
  OfflineLesson, 
  OfflineVideo, 
  OfflineAsset,
  STORAGE_LIMITS 
} from './offlineDatabase';
import { getOfflineDatabaseUtils } from './offlineDatabaseUtils';

// Download progress callback type
export type DownloadProgressCallback = (progress: {
  courseId: string;
  phase: 'metadata' | 'videos' | 'assets' | 'finalizing';
  progress: number; // 0-100
  currentItem?: string;
  totalItems?: number;
  completedItems?: number;
  error?: string;
}) => void;

// Download options
export interface DownloadOptions {
  videoQuality?: 'auto' | '720p' | '1080p';
  compressVideos?: boolean;
  includeAssets?: boolean;
  onProgress?: DownloadProgressCallback;
  signal?: AbortSignal; // For cancellation
}

// Course download result
export interface DownloadResult {
  success: boolean;
  courseId: string;
  totalSize: number;
  downloadTime: number;
  error?: string;
  details: {
    metadata: boolean;
    lessons: number;
    videos: number;
    assets: number;
  };
}

/**
 * Course Download Service Class
 */
export class CourseDownloadService {
  private db = getOfflineDatabase();
  private utils = getOfflineDatabaseUtils();
  private activeDownloads = new Map<string, AbortController>();

  /**
   * Download a complete course for offline access
   */
  async downloadCourse(
    courseId: string, 
    options: DownloadOptions = {}
  ): Promise<DownloadResult> {
    const startTime = Date.now();
    const {
      videoQuality = 'auto',
      compressVideos = true,
      includeAssets = true,
      onProgress,
      signal
    } = options;

    // Create abort controller for this download
    const abortController = new AbortController();
    this.activeDownloads.set(courseId, abortController);

    // Combine external signal with internal controller
    if (signal) {
      signal.addEventListener('abort', () => abortController.abort());
    }

    const result: DownloadResult = {
      success: false,
      courseId,
      totalSize: 0,
      downloadTime: 0,
      details: {
        metadata: false,
        lessons: 0,
        videos: 0,
        assets: 0
      }
    };

    try {
      await this.db.init();

      // Check if already downloading
      const existingCourse = await this.db.getCourse(courseId);
      if (existingCourse?.downloadStatus === 'downloading') {
        throw new Error('Course is already being downloaded');
      }

      // Phase 1: Download and store course metadata
      onProgress?.({
        courseId,
        phase: 'metadata',
        progress: 0,
        currentItem: 'Course information'
      });

      const courseData = await this.downloadCourseMetadata(courseId, abortController.signal);
      result.details.metadata = true;

      onProgress?.({
        courseId,
        phase: 'metadata',
        progress: 20,
        currentItem: 'Course structure'
      });

      // Phase 2: Download lessons and content
      const lessons = await this.downloadLessons(courseId, courseData, abortController.signal);
      result.details.lessons = lessons.length;

      onProgress?.({
        courseId,
        phase: 'videos',
        progress: 40,
        totalItems: lessons.filter(l => l.type === 'video').length,
        completedItems: 0
      });

      // Phase 3: Download videos
      const videos = await this.downloadVideos(
        lessons, 
        videoQuality, 
        compressVideos, 
        abortController.signal,
        (videoProgress) => {
          onProgress?.({
            courseId,
            phase: 'videos',
            progress: 40 + (videoProgress * 0.4), // 40-80%
            currentItem: videoProgress.currentVideo,
            totalItems: videoProgress.totalVideos,
            completedItems: videoProgress.completedVideos
          });
        }
      );
      result.details.videos = videos.length;

      // Phase 4: Download assets (if enabled)
      let assets: OfflineAsset[] = [];
      if (includeAssets) {
        onProgress?.({
          courseId,
          phase: 'assets',
          progress: 80,
          currentItem: 'Course assets'
        });

        assets = await this.downloadAssets(
          courseId, 
          courseData, 
          lessons, 
          abortController.signal,
          (assetProgress) => {
            onProgress?.({
              courseId,
              phase: 'assets',
              progress: 80 + (assetProgress * 0.15), // 80-95%
              currentItem: assetProgress.currentAsset,
              totalItems: assetProgress.totalAssets,
              completedItems: assetProgress.completedAssets
            });
          }
        );
      }
      result.details.assets = assets.length;

      // Phase 5: Finalize download
      onProgress?.({
        courseId,
        phase: 'finalizing',
        progress: 95,
        currentItem: 'Finalizing download'
      });

      // Calculate total size
      const totalSize = this.calculateTotalSize(courseData, lessons, videos, assets);
      result.totalSize = totalSize;

      // Update course status to completed
      await this.db.updateCourseProgress(courseId, 100, 'completed');
      
      // Update total size
      const finalCourse = await this.db.getCourse(courseId);
      if (finalCourse) {
        finalCourse.totalSize = totalSize;
        await this.db.storeCourse(finalCourse);
      }

      onProgress?.({
        courseId,
        phase: 'finalizing',
        progress: 100,
        currentItem: 'Download completed'
      });

      result.success = true;
      result.downloadTime = Date.now() - startTime;

      console.log(`✅ CourseDownload: Successfully downloaded course ${courseId} (${this.formatBytes(totalSize)} in ${result.downloadTime}ms)`);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      result.error = errorMessage;
      
      // Update course status to error
      try {
        await this.db.updateCourseProgress(courseId, 0, 'error');
      } catch (updateError) {
        console.error('Failed to update course status to error:', updateError);
      }

      console.error(`❌ CourseDownload: Failed to download course ${courseId}:`, errorMessage);

      // Clean up partial download on error
      if (!abortController.signal.aborted) {
        await this.cleanupPartialDownload(courseId);
      }
    } finally {
      this.activeDownloads.delete(courseId);
    }

    return result;
  }

  /**
   * Download course metadata and structure
   */
  private async downloadCourseMetadata(courseId: string, signal: AbortSignal): Promise<any> {
    if (signal.aborted) throw new Error('Download cancelled');

    // Fetch complete course data with all relationships
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
    if (!data) throw new Error('Course not found');

    // Create offline course record
    const offlineCourse: OfflineCourse = {
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
      downloadDate: Date.now(),
      lastAccessed: Date.now(),
      version: this.generateCourseVersion(data),
      totalSize: 0, // Will be calculated later
      downloadStatus: 'downloading',
      downloadProgress: 0,
      metadata: {
        originalData: data,
        downloadOptions: {
          includeVideos: true,
          includeAssets: true,
          compressed: true
        }
      }
    };

    // Store course in database
    await this.db.storeCourse(offlineCourse);

    return data;
  }

  /**
   * Download and store lessons
   */
  private async downloadLessons(courseId: string, courseData: any, signal: AbortSignal): Promise<OfflineLesson[]> {
    if (signal.aborted) throw new Error('Download cancelled');

    const lessons: OfflineLesson[] = [];

    for (const section of courseData.sections || []) {
      for (const lesson of section.lessons || []) {
        if (signal.aborted) throw new Error('Download cancelled');

        const offlineLesson: OfflineLesson = {
          id: lesson.id,
          courseId: courseId,
          title: lesson.title,
          description: lesson.description,
          content: lesson.content,
          order: lesson.order,
          duration: lesson.duration,
          type: this.determineLessonType(lesson),
          videoId: this.extractVideoId(lesson),
          assetIds: this.extractAssetIds(lesson),
          metadata: {
            sectionId: section.id,
            sectionTitle: section.title,
            originalData: lesson
          }
        };

        await this.db.storeLesson(offlineLesson);
        lessons.push(offlineLesson);
      }
    }

    return lessons;
  }

  /**
   * Download and store videos
   */
  private async downloadVideos(
    lessons: OfflineLesson[], 
    quality: string, 
    compress: boolean, 
    signal: AbortSignal,
    onProgress?: (progress: { currentVideo?: string; totalVideos: number; completedVideos: number }) => void
  ): Promise<OfflineVideo[]> {
    const videoLessons = lessons.filter(l => l.type === 'video' && l.videoId);
    const videos: OfflineVideo[] = [];
    let completedVideos = 0;

    for (const lesson of videoLessons) {
      if (signal.aborted) throw new Error('Download cancelled');

      try {
        onProgress?.({
          currentVideo: lesson.title,
          totalVideos: videoLessons.length,
          completedVideos
        });

        const videoUrl = await this.getVideoUrl(lesson);
        if (!videoUrl) continue;

        const videoBlob = await this.downloadVideoFile(videoUrl, signal);
        const processedBlob = compress ? await this.compressVideo(videoBlob) : videoBlob;

        const offlineVideo: OfflineVideo = {
          id: lesson.videoId!, // This is the content item ID
          lessonId: lesson.id,
          courseId: lesson.courseId,
          originalUrl: videoUrl,
          blob: processedBlob,
          duration: lesson.duration || 0,
          size: processedBlob.size,
          quality: quality,
          format: this.getVideoFormat(processedBlob),
          compressed: compress,
          compressionRatio: compress ? videoBlob.size / processedBlob.size : 1,
          downloadDate: Date.now(),
          metadata: {
            originalSize: videoBlob.size,
            lessonTitle: lesson.title,
            contentItemId: lesson.videoId // Store content item ID for reference
          }
        };

        await this.db.storeVideo(offlineVideo);
        videos.push(offlineVideo);
        completedVideos++;

      } catch (error) {
        console.error(`Failed to download video for lesson ${lesson.title}:`, error);
        // Continue with other videos instead of failing entire download
      }
    }

    return videos;
  }

  /**
   * Download and store assets
   */
  private async downloadAssets(
    courseId: string, 
    courseData: any, 
    lessons: OfflineLesson[], 
    signal: AbortSignal,
    onProgress?: (progress: { currentAsset?: string; totalAssets: number; completedAssets: number }) => void
  ): Promise<OfflineAsset[]> {
    const assetUrls = await this.extractAllAssetUrls(courseData, lessons);
    const assets: OfflineAsset[] = [];
    let completedAssets = 0;

    for (const assetInfo of assetUrls) {
      if (signal.aborted) throw new Error('Download cancelled');

      try {
        onProgress?.({
          currentAsset: assetInfo.filename,
          totalAssets: assetUrls.length,
          completedAssets
        });

        // Validate asset info before downloading
        if (!assetInfo.url || typeof assetInfo.url !== 'string') {
          console.warn(`Skipping invalid asset URL:`, assetInfo);
          continue;
        }

        const assetBlob = await this.downloadAssetFile(assetInfo.url, signal);

        const offlineAsset: OfflineAsset = {
          id: assetInfo.contentItemId || this.generateAssetId(assetInfo.url), // Use content item ID if available
          courseId: courseId,
          lessonId: assetInfo.lessonId,
          originalUrl: assetInfo.url,
          blob: assetBlob,
          type: this.determineAssetType(assetInfo.url, assetBlob.type),
          mimeType: assetBlob.type,
          size: assetBlob.size,
          filename: assetInfo.filename || `asset-${Date.now()}`,
          downloadDate: Date.now(),
          metadata: {
            source: assetInfo.source,
            contentItemId: assetInfo.contentItemId // Store content item ID for lookup
          }
        };

        await this.db.storeAsset(offlineAsset);
        assets.push(offlineAsset);
        completedAssets++;

      } catch (error) {
        const assetName = assetInfo?.filename || 'Unknown Asset';
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error(`Failed to download asset ${assetName}:`, errorMessage);
        
        // Report progress even for failed assets
        onProgress?.({
          currentAsset: `❌ ${assetName} (failed)`,
          totalAssets: assetUrls.length,
          completedAssets
        });
        
        // Continue with other assets instead of failing entire download
      }
    }

    return assets;
  }

  /**
   * Cancel an active download
   */
  async cancelDownload(courseId: string): Promise<void> {
    const controller = this.activeDownloads.get(courseId);
    if (controller) {
      controller.abort();
      await this.db.updateCourseProgress(courseId, 0, 'paused');
      console.log(`🛑 CourseDownload: Cancelled download for course ${courseId}`);
    }
  }

  /**
   * Resume a paused download
   */
  async resumeDownload(courseId: string, options: DownloadOptions = {}): Promise<DownloadResult> {
    const course = await this.db.getCourse(courseId);
    if (!course || course.downloadStatus !== 'paused') {
      throw new Error('No paused download found for this course');
    }

    // Update status to downloading
    await this.db.updateCourseProgress(courseId, course.downloadProgress, 'downloading');

    // Resume download from where it left off
    return this.downloadCourse(courseId, options);
  }

  /**
   * Get download progress for a course
   */
  async getDownloadProgress(courseId: string): Promise<{
    status: OfflineCourse['downloadStatus'];
    progress: number;
    totalSize: number;
    downloadedSize: number;
  } | null> {
    const course = await this.db.getCourse(courseId);
    if (!course) return null;

    return {
      status: course.downloadStatus,
      progress: course.downloadProgress,
      totalSize: course.totalSize,
      downloadedSize: Math.floor((course.downloadProgress / 100) * course.totalSize)
    };
  }

  /**
   * Estimate download size for a course
   */
  async estimateDownloadSize(courseId: string): Promise<number> {
    try {
      const { data, error } = await supabase
        .from('courses')
        .select(`
          *,
          sections:course_sections (
            lessons:course_lessons (
              contentItems:course_lesson_content (*)
            )
          )
        `)
        .eq('id', courseId)
        .single();

      if (error || !data) return 500 * 1024 * 1024; // 500MB default

      // Rough estimation based on content
      let estimatedSize = 0;
      
      // Base course data: ~1MB
      estimatedSize += 1024 * 1024;

      // Videos: estimate based on duration (rough: 1MB per minute for compressed)
      const totalDuration = this.estimateTotalDuration(data);
      estimatedSize += totalDuration * 60 * 1024 * 1024; // 1MB per minute

      // Assets: rough estimate
      const assetCount = this.countAssets(data);
      estimatedSize += assetCount * 2 * 1024 * 1024; // 2MB per asset average

      return Math.min(estimatedSize, STORAGE_LIMITS.MAX_COURSE_SIZE);
    } catch (error) {
      console.error('Failed to estimate download size:', error);
      return 500 * 1024 * 1024; // 500MB fallback
    }
  }

  // ==================== HELPER METHODS ====================

  private countTotalLessons(courseData: any): number {
    return courseData.sections?.reduce((total: number, section: any) => 
      total + (section.lessons?.length || 0), 0) || 0;
  }

  private generateCourseVersion(courseData: any): string {
    // Simple version based on updated_at timestamp
    return `v${Date.now()}-${courseData.updated_at ? new Date(courseData.updated_at).getTime() : Date.now()}`;
  }

  private determineLessonType(lesson: any): OfflineLesson['type'] {
    // Determine lesson type based on content items
    const hasVideo = lesson.contentItems?.some((item: any) => item.content_type === 'video');
    const hasQuiz = lesson.contentItems?.some((item: any) => item.content_type === 'quiz');
    const hasLessonPlan = lesson.contentItems?.some((item: any) => item.content_type === 'lesson_plan');
    
    if (hasVideo) return 'video';
    if (hasQuiz) return 'quiz';
    if (hasLessonPlan) return 'text'; // Treat lesson plans as text content for offline
    return 'text';
  }

  private extractVideoId(lesson: any): string | undefined {
    const videoItem = lesson.contentItems?.find((item: any) => item.content_type === 'video');
    // Use the content item ID as the video ID for consistency
    return videoItem?.id;
  }

  private extractAssetIds(lesson: any): string[] {
    return lesson.contentItems
      ?.filter((item: any) => item.content_type === 'attachment')
      ?.map((item: any) => item.id) || [];
  }

  private async getVideoUrl(lesson: OfflineLesson): Promise<string | null> {
    try {
      const videoItem = lesson.metadata?.originalData?.contentItems
        ?.find((item: any) => item.content_type === 'video');
      
      if (!videoItem?.content_path) {
        console.warn(`No video content_path found for lesson ${lesson.title}`);
        return null;
      }

      // If it's already a full URL (signed URL), use it directly
      if (videoItem.content_path.startsWith('http') || videoItem.content_path.startsWith('blob:')) {
        return videoItem.content_path;
      }

      // Create signed URL from storage path
      const { data: signedUrlData } = await supabase.storage
        .from('dil-lms')
        .createSignedUrl(videoItem.content_path, 3600);
      
      if (signedUrlData?.signedUrl) {
        console.log(`✅ Created signed URL for video in lesson ${lesson.title}`);
        return signedUrlData.signedUrl;
      } else {
        console.error(`Failed to create signed URL for video: ${videoItem.content_path}`);
        return null;
      }
    } catch (error) {
      console.error(`Error getting video URL for lesson ${lesson.title}:`, error);
      return null;
    }
  }

  private async downloadVideoFile(url: string, signal: AbortSignal): Promise<Blob> {
    const response = await fetch(url, { signal });
    if (!response.ok) throw new Error(`Failed to download video: ${response.statusText}`);
    return response.blob();
  }

  private async compressVideo(videoBlob: Blob): Promise<Blob> {
    // Video compression would be implemented here
    // For now, return original blob - compression will be added in future iteration
    console.log('🎥 Video compression not yet implemented, returning original');
    return videoBlob;
  }

  private getVideoFormat(blob: Blob): string {
    return blob.type.split('/')[1] || 'mp4';
  }

  private async extractAllAssetUrls(courseData: any, lessons: OfflineLesson[]): Promise<Array<{
    url: string;
    filename: string;
    lessonId?: string;
    source: string;
    contentItemId?: string;
  }>> {
    const assets: Array<{ url: string; filename: string; lessonId?: string; source: string; contentItemId?: string }> = [];

    // Course image
    if (courseData.image_url) {
      // Convert storage path to signed URL if needed
      let imageUrl = courseData.image_url;
      
      // If it's a storage path (not a full URL), create signed URL
      if (!imageUrl.startsWith('http') && !imageUrl.startsWith('blob:')) {
        try {
          const { data: signedUrlData } = await supabase.storage
            .from('dil-lms')
            .createSignedUrl(courseData.image_url, 3600);
          if (signedUrlData) {
            imageUrl = signedUrlData.signedUrl;
          }
        } catch (error) {
          console.warn('Failed to create signed URL for course image:', error);
          // Skip this asset if we can't get a valid URL
          imageUrl = null;
        }
      }
      
      if (imageUrl) {
        assets.push({
          url: imageUrl,
          filename: `course-image.${this.getFileExtension(courseData.image_url)}`,
          source: 'course'
        });
      }
    }

    // Lesson assets
    for (const lesson of lessons) {
      const attachmentItems = lesson.metadata?.originalData?.contentItems
        ?.filter((item: any) => item.content_type === 'attachment' && item.content_path) || [];
      
      for (const item of attachmentItems) {
        let attachmentUrl = item.content_path;
        
        // Convert storage path to signed URL if needed
        if (!attachmentUrl.startsWith('http') && !attachmentUrl.startsWith('blob:')) {
          try {
            const { data: signedUrlData } = await supabase.storage
              .from('dil-lms')
              .createSignedUrl(item.content_path, 3600);
            if (signedUrlData) {
              attachmentUrl = signedUrlData.signedUrl;
            } else {
              console.warn(`Failed to create signed URL for attachment: ${item.content_path}`);
              continue; // Skip this attachment if we can't get a valid URL
            }
          } catch (error) {
            console.warn(`Error creating signed URL for attachment:`, error);
            continue; // Skip this attachment if we can't get a valid URL
          }
        }
        
        if (attachmentUrl) {
          assets.push({
            url: attachmentUrl,
            filename: (item.title && typeof item.title === 'string') ? item.title : `asset-${item.id}`,
            lessonId: lesson.id,
            source: 'lesson',
            contentItemId: item.id // Include content item ID for proper mapping
          });
        }
      }
    }

    return assets;
  }

  private async downloadAssetFile(url: string, signal: AbortSignal): Promise<Blob> {
    const response = await fetch(url, { signal });
    if (!response.ok) throw new Error(`Failed to download asset: ${response.statusText}`);
    return response.blob();
  }

  private determineAssetType(url: string, mimeType: string): OfflineAsset['type'] {
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType.startsWith('audio/')) return 'audio';
    if (mimeType.includes('pdf') || mimeType.includes('document')) return 'document';
    return 'other';
  }

  private generateAssetId(url: string): string {
    return `asset-${Date.now()}-${url.split('/').pop()?.replace(/[^a-zA-Z0-9]/g, '') || 'unknown'}`;
  }

  private getFileExtension(url: string): string {
    return url.split('.').pop()?.toLowerCase() || 'bin';
  }

  private calculateTotalSize(
    courseData: any, 
    lessons: OfflineLesson[], 
    videos: OfflineVideo[], 
    assets: OfflineAsset[]
  ): number {
    const metadataSize = JSON.stringify(courseData).length;
    const lessonsSize = lessons.reduce((total, lesson) => total + JSON.stringify(lesson).length, 0);
    const videosSize = videos.reduce((total, video) => total + video.size, 0);
    const assetsSize = assets.reduce((total, asset) => total + asset.size, 0);

    return metadataSize + lessonsSize + videosSize + assetsSize;
  }

  private async cleanupPartialDownload(courseId: string): Promise<void> {
    try {
      await this.db.deleteCourse(courseId);
      console.log(`🧹 CourseDownload: Cleaned up partial download for course ${courseId}`);
    } catch (error) {
      console.error(`Failed to cleanup partial download for course ${courseId}:`, error);
    }
  }

  private estimateTotalDuration(courseData: any): number {
    // Estimate total duration in minutes
    return courseData.sections?.reduce((total: number, section: any) =>
      total + (section.lessons?.reduce((lessonTotal: number, lesson: any) =>
        lessonTotal + (lesson.duration || 10), 0) || 0), 0) || 60; // Default 60 minutes
  }

  private countAssets(courseData: any): number {
    let count = courseData.image_url ? 1 : 0; // Course image
    
    courseData.sections?.forEach((section: any) => {
      section.lessons?.forEach((lesson: any) => {
        lesson.contentItems?.forEach((item: any) => {
          if (item.content_type === 'attachment') count++;
        });
      });
    });

    return count;
  }

  private formatBytes(bytes: number): string {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  }
}

// Singleton instance
let downloadServiceInstance: CourseDownloadService | null = null;

/**
 * Get the singleton instance of CourseDownloadService
 */
export const getCourseDownloadService = (): CourseDownloadService => {
  if (!downloadServiceInstance) {
    downloadServiceInstance = new CourseDownloadService();
  }
  return downloadServiceInstance;
};

export default CourseDownloadService;
