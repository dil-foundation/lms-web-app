// Content Downloader Service
// Handles downloading and caching of course content (videos, PDFs, etc.)

import { supabase } from '@/integrations/supabase/client';
import { offlineDatabase } from './offlineDatabase';
import { swAPI } from '@/utils/serviceWorkerRegistration';
import { 
  OfflineCourse, 
  OfflineContentItem, 
  DownloadQueueItem, 
  OfflineSettings,
  OfflineEvent
} from '@/types/offline';
import { toast } from 'sonner';

export interface DownloadProgress {
  courseId: string;
  contentId: string;
  progress: number;
  status: 'pending' | 'downloading' | 'completed' | 'failed' | 'paused';
  error?: string;
}

export interface DownloadOptions {
  priority?: 'high' | 'medium' | 'low';
  wifiOnly?: boolean;
  quality?: 'high' | 'medium' | 'low';
}

class ContentDownloaderService {
  private downloadInProgress = new Set<string>();
  private downloadControllers = new Map<string, AbortController>();
  private progressCallbacks = new Map<string, (progress: DownloadProgress) => void>();
  private maxConcurrentDownloads = 3;
  private activeDownloads = 0;

  // Default settings
  private defaultSettings: OfflineSettings = {
    autoDownload: false,
    downloadOnWifiOnly: false, // Allow downloads on all connections by default
    maxStorageGB: 5,
    syncFrequency: 'immediate',
    deleteAfterDays: 30,
    compressVideos: false,
    downloadQuality: 'medium',
    enableBackgroundSync: true,
    notifyOnDownloadComplete: true,
    notifyOnSyncComplete: true
  };

  async init(): Promise<void> {
    await offlineDatabase.init();
    
    // Set default settings if none exist
    const existingSettings = await offlineDatabase.getSettings();
    if (!existingSettings) {
      await offlineDatabase.saveSettings(this.defaultSettings);
    }

    // Resume any interrupted downloads
    await this.resumeInterruptedDownloads();
  }

  // Main method to download a complete course
  async downloadCourse(courseId: string, options: DownloadOptions = {}): Promise<void> {
    if (this.downloadInProgress.has(courseId)) {
      toast.info('Course download already in progress');
      return;
    }

    try {
      this.downloadInProgress.add(courseId);
      
      // Check storage availability
      const storageInfo = await this.checkStorageAvailability();
      if (!storageInfo.hasSpace) {
        throw new Error('Insufficient storage space. Please free up some space and try again.');
      }

      // Fetch course data from Supabase
      const courseData = await this.fetchCourseData(courseId);
      if (!courseData) {
        throw new Error('Course not found');
      }

      // Create offline course structure
      const offlineCourse = await this.createOfflineCourseStructure(courseData);
      
      // Save course structure to IndexedDB
      await offlineDatabase.saveCourse(offlineCourse);

      // Queue content items for download
      await this.queueContentDownloads(offlineCourse, options);

      // Start processing download queue
      console.log('[ContentDownloader] Starting download queue processing');
      await this.processDownloadQueue();

      await this.addEvent({
        type: 'download_started',
        courseId: courseId,
        courseName: courseData.title,
        message: `Started downloading course: ${courseData.title}`,
        timestamp: new Date(),
        severity: 'info'
      });

      toast.success(`Started downloading course: ${courseData.title}`);

    } catch (error) {
      console.error('Error downloading course:', error);
      toast.error(`Failed to download course: ${error}`);
      
      await this.addEvent({
        type: 'download_failed',
        courseId: courseId,
        message: `Failed to download course: ${error}`,
        timestamp: new Date(),
        severity: 'error'
      });
    } finally {
      this.downloadInProgress.delete(courseId);
    }
  }

  // Pause course download
  async pauseDownload(courseId: string): Promise<void> {
    try {
      // Cancel active downloads for this course
      const queue = await offlineDatabase.getDownloadQueueByCourse(courseId);
      const activeDownloads = queue.filter(item => item.status === 'downloading');

      for (const download of activeDownloads) {
        const controller = this.downloadControllers.get(download.id);
        if (controller) {
          controller.abort();
          this.downloadControllers.delete(download.id);
        }
        
        // Update status to paused
        download.status = 'paused';
        await offlineDatabase.updateDownloadQueueItem(download);
      }

      // Update course status
      const course = await offlineDatabase.getCourse(courseId);
      if (course) {
        course.downloadStatus = 'paused';
        await offlineDatabase.saveCourse(course);
      }

      await this.addEvent({
        type: 'download_paused',
        courseId: courseId,
        courseName: course?.title,
        message: `Download paused for course: ${course?.title}`,
        timestamp: new Date(),
        severity: 'info'
      });

      toast.info('Download paused');
    } catch (error) {
      console.error('Error pausing download:', error);
      toast.error('Failed to pause download');
    }
  }

  // Resume course download
  async resumeDownload(courseId: string): Promise<void> {
    try {
      // Update paused downloads to pending
      const queue = await offlineDatabase.getDownloadQueueByCourse(courseId);
      const pausedDownloads = queue.filter(item => item.status === 'paused');

      for (const download of pausedDownloads) {
        download.status = 'pending';
        await offlineDatabase.updateDownloadQueueItem(download);
      }

      // Update course status
      const course = await offlineDatabase.getCourse(courseId);
      if (course) {
        course.downloadStatus = 'downloading';
        await offlineDatabase.saveCourse(course);
      }

      // Resume processing
      this.processDownloadQueue();

      toast.success('Download resumed');
    } catch (error) {
      console.error('Error resuming download:', error);
      toast.error('Failed to resume download');
    }
  }

  // Cancel course download
  async cancelDownload(courseId: string): Promise<void> {
    try {
      // Cancel all downloads for this course
      await this.cancelCourseDownloads(courseId);
      
      // Remove course and its content
      await this.deleteCourse(courseId);

      toast.success('Download cancelled and content removed');
    } catch (error) {
      console.error('Error cancelling download:', error);
      toast.error('Failed to cancel download');
    }
  }

  // Delete downloaded course
  async deleteCourse(courseId: string): Promise<void> {
    try {
      // Cancel any ongoing downloads for this course
      await this.cancelCourseDownloads(courseId);
      
      // Remove course data and content
      const course = await offlineDatabase.getCourse(courseId);
      if (course) {
        // Delete all content blobs for this course
        await offlineDatabase.deleteContentByCourse(courseId);
        
        // Delete course record
        await offlineDatabase.deleteCourse(courseId);
        
        // Remove download queue items
        await offlineDatabase.removeDownloadQueueByCourse(courseId);
        
        await this.addEvent({
          type: 'course_updated',
          courseId: courseId,
          courseName: course.title,
          message: `Deleted offline course: ${course.title}`,
          timestamp: new Date(),
          severity: 'info'
        });
        
        toast.success(`Deleted offline course: ${course.title}`);
      }
    } catch (error) {
      console.error('Error deleting course:', error);
      toast.error(`Failed to delete course: ${error}`);
    }
  }

  // Get download progress for a course
  async getDownloadProgress(courseId: string): Promise<{
    overall: number;
    items: DownloadProgress[];
  }> {
    try {
      const queue = await offlineDatabase.getDownloadQueueByCourse(courseId);
      
      if (queue.length === 0) {
        return { overall: 100, items: [] };
      }

      const items: DownloadProgress[] = queue.map(item => ({
        courseId: item.courseId,
        contentId: item.contentId,
        progress: item.progress,
        status: item.status,
        error: item.error
      }));

      const completedItems = queue.filter(item => item.status === 'completed').length;
      const overall = Math.round((completedItems / queue.length) * 100);

      return { overall, items };
    } catch (error) {
      console.error('Error getting download progress:', error);
      return { overall: 0, items: [] };
    }
  }

  // Subscribe to download progress updates
  subscribeToProgress(courseId: string, callback: (progress: DownloadProgress) => void): () => void {
    const key = `progress:${courseId}`;
    this.progressCallbacks.set(key, callback);
    
    return () => {
      this.progressCallbacks.delete(key);
    };
  }

  // Private methods
  private async fetchCourseData(courseId: string): Promise<any> {
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
  }

  private async createOfflineCourseStructure(courseData: any): Promise<OfflineCourse> {
    return {
      id: courseData.id,
      title: courseData.title,
      subtitle: courseData.subtitle,
      description: courseData.description,
      image_url: courseData.image_url,
      sections: courseData.sections?.map((section: any) => ({
        id: section.id,
        title: section.title,
        position: section.position,
        lessons: section.lessons?.map((lesson: any) => ({
          id: lesson.id,
          title: lesson.title,
          overview: lesson.overview,
          duration_text: lesson.duration_text,
          position: lesson.position,
          contentItems: lesson.contentItems?.map((item: any) => ({
            id: item.id,
            title: item.title,
            content_type: item.content_type,
            content_path: item.content_path,
            position: item.position,
            downloadStatus: 'pending',
            due_date: item.due_date,
            retry_settings: item.retry_settings,
            quiz: item.quiz ? {
              questions: item.quiz.map((q: any) => ({
                id: q.id,
                question: q.question,
                type: q.type,
                options: q.options || [],
                correct_answer: q.correct_answer,
                points: q.points,
                math_expression: q.math_expression,
                math_tolerance: q.math_tolerance,
                math_hint: q.math_hint,
                image_url: q.image_url
              }))
            } : undefined
          })) || []
        })) || []
      })) || [],
      downloadedAt: new Date(),
      lastSyncedAt: new Date(),
      totalSize: 0,
      downloadStatus: 'downloading',
      downloadProgress: 0,
      version: 1
    };
  }

  private async queueContentDownloads(course: OfflineCourse, options: DownloadOptions): Promise<void> {
    const downloadItems: DownloadQueueItem[] = [];

    console.log('[ContentDownloader] Queuing content downloads for course:', course.title);
    console.log('[ContentDownloader] Course sections:', course.sections.length);

    for (const section of course.sections) {
      console.log('[ContentDownloader] Processing section:', section.title, 'with', section.lessons.length, 'lessons');
      for (const lesson of section.lessons) {
        console.log('[ContentDownloader] Processing lesson:', lesson.title, 'with', lesson.contentItems.length, 'content items');
        for (const contentItem of lesson.contentItems) {
          console.log('[ContentDownloader] Content item:', contentItem.title, 'type:', contentItem.content_type, 'path:', contentItem.content_path);
          if (contentItem.content_path && 
              (contentItem.content_type === 'video' || contentItem.content_type === 'attachment')) {
            
            // Get signed URL for content
            const { data: signedUrlData } = await supabase.storage
              .from('dil-lms')
              .createSignedUrl(contentItem.content_path, 3600);

            if (signedUrlData?.signedUrl) {
              downloadItems.push({
                id: `${course.id}-${contentItem.id}`,
                courseId: course.id,
                contentId: contentItem.id,
                contentType: contentItem.content_type,
                url: signedUrlData.signedUrl,
                priority: options.priority || (contentItem.content_type === 'video' ? 'high' : 'medium'),
                status: 'pending',
                progress: 0,
                createdAt: new Date()
              });
            }
          }
        }
      }
    }

    console.log('[ContentDownloader] Found', downloadItems.length, 'items to download');
    
    // If no downloadable content (e.g., quiz-only course), mark course as completed
    if (downloadItems.length === 0) {
      console.log('[ContentDownloader] No downloadable content found, marking course as completed');
      
      // Update course status to completed
      const updatedCourse = { ...course, downloadStatus: 'completed', downloadProgress: 100 };
      await offlineDatabase.saveCourse(updatedCourse);
      
      await this.addEvent({
        type: 'download_completed',
        courseId: course.id,
        courseName: course.title,
        message: `Course downloaded successfully (quiz-only content): ${course.title}`,
        timestamp: new Date(),
        severity: 'info'
      });
      
      toast.success(`Course downloaded successfully: ${course.title}`);
      return;
    }
    
    // Add all download items to queue
    for (const item of downloadItems) {
      console.log('[ContentDownloader] Adding to queue:', item.contentId, item.url);
      await offlineDatabase.addToDownloadQueue(item);
    }
  }

  private async processDownloadQueue(): Promise<void> {
    console.log('[ContentDownloader] Processing download queue, active downloads:', this.activeDownloads);
    
    if (this.activeDownloads >= this.maxConcurrentDownloads) {
      console.log('[ContentDownloader] Already at max capacity');
      return; // Already at max capacity
    }

    const queue = await offlineDatabase.getDownloadQueue();
    console.log('[ContentDownloader] Total queue items:', queue.length);
    
    const pendingItems = queue.filter(item => item.status === 'pending');
    console.log('[ContentDownloader] Pending items:', pendingItems.length);

    if (pendingItems.length === 0) {
      console.log('[ContentDownloader] No pending downloads');
      return; // No pending downloads
    }

    // Start downloads up to the concurrent limit
    const availableSlots = this.maxConcurrentDownloads - this.activeDownloads;
    const itemsToProcess = pendingItems.slice(0, availableSlots);
    console.log('[ContentDownloader] Starting', itemsToProcess.length, 'downloads');

    for (const item of itemsToProcess) {
      console.log('[ContentDownloader] Starting download for:', item.contentId);
      this.downloadContentItem(item);
    }
  }

  private async downloadContentItem(item: DownloadQueueItem): Promise<void> {
    this.activeDownloads++;
    console.log('[ContentDownloader] Starting download for item:', item.contentId, 'URL:', item.url);
    
    try {
      // Update status to downloading
      item.status = 'downloading';
      item.startedAt = new Date();
      await offlineDatabase.updateDownloadQueueItem(item);
      console.log('[ContentDownloader] Updated item status to downloading');

      // Create abort controller for this download
      const controller = new AbortController();
      this.downloadControllers.set(item.id, controller);

      // Notify progress subscribers
      this.notifyProgress({
        courseId: item.courseId,
        contentId: item.contentId,
        progress: 0,
        status: 'downloading'
      });

      // Download the content
      console.log('[ContentDownloader] Fetching content from:', item.url);
      const response = await fetch(item.url, { 
        signal: controller.signal 
      });

      console.log('[ContentDownloader] Fetch response:', response.status, response.statusText);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const contentLength = response.headers.get('content-length');
      const totalSize = contentLength ? parseInt(contentLength, 10) : 0;

      if (totalSize > 0) {
        item.fileSize = totalSize;
      }

      // Read response as blob with progress tracking
      const blob = await this.readResponseWithProgress(response, item);

      // Save content to IndexedDB
      await offlineDatabase.saveContent(item.contentId, blob, {
        contentType: response.headers.get('content-type') || 'application/octet-stream',
        fileName: this.getFileNameFromUrl(item.url),
        fileSize: blob.size,
        courseId: item.courseId,
        lessonId: 'unknown' // We could derive this from the content structure
      });

      // Update download status
      item.status = 'completed';
      item.progress = 100;
      item.completedAt = new Date();
      item.downloadedBytes = blob.size;
      await offlineDatabase.updateDownloadQueueItem(item);

      // Notify progress subscribers
      this.notifyProgress({
        courseId: item.courseId,
        contentId: item.contentId,
        progress: 100,
        status: 'completed'
      });

      // Update course progress
      await this.updateCourseDownloadProgress(item.courseId);

      this.downloadControllers.delete(item.id);

    } catch (error) {
      console.error(`Error downloading content item ${item.id}:`, error);
      
      item.status = 'failed';
      item.error = error instanceof Error ? error.message : 'Unknown error';
      await offlineDatabase.updateDownloadQueueItem(item);
      
      // Notify progress subscribers
      this.notifyProgress({
        courseId: item.courseId,
        contentId: item.contentId,
        progress: item.progress,
        status: 'failed',
        error: item.error
      });
      
      this.downloadControllers.delete(item.id);
    } finally {
      this.activeDownloads--;
      
      // Continue processing queue
      setTimeout(() => this.processDownloadQueue(), 1000);
    }
  }

  private async readResponseWithProgress(response: Response, item: DownloadQueueItem): Promise<Blob> {
    const reader = response.body?.getReader();
    if (!reader) {
      return await response.blob();
    }

    const chunks: Uint8Array[] = [];
    let receivedLength = 0;
    const contentLength = parseInt(response.headers.get('content-length') || '0', 10);

    while (true) {
      const { done, value } = await reader.read();
      
      if (done) break;
      
      chunks.push(value);
      receivedLength += value.length;
      
      // Update progress
      if (contentLength > 0) {
        const progress = Math.round((receivedLength / contentLength) * 100);
        item.progress = progress;
        item.downloadedBytes = receivedLength;
        await offlineDatabase.updateDownloadQueueItem(item);
        
        // Notify progress subscribers
        this.notifyProgress({
          courseId: item.courseId,
          contentId: item.contentId,
          progress,
          status: 'downloading'
        });
      }
    }

    // Combine chunks into blob
    const allChunks = new Uint8Array(receivedLength);
    let position = 0;
    for (const chunk of chunks) {
      allChunks.set(chunk, position);
      position += chunk.length;
    }

    return new Blob([allChunks]);
  }

  private async updateCourseDownloadProgress(courseId: string): Promise<void> {
    const course = await offlineDatabase.getCourse(courseId);
    if (!course) return;

    const queue = await offlineDatabase.getDownloadQueueByCourse(courseId);
    
    if (queue.length === 0) return;

    const completedItems = queue.filter(item => item.status === 'completed');
    const failedItems = queue.filter(item => item.status === 'failed');
    const totalProgress = Math.round((completedItems.length / queue.length) * 100);

    course.downloadProgress = totalProgress;
    
    if (completedItems.length === queue.length) {
      course.downloadStatus = 'completed';
      course.totalSize = queue.reduce((sum, item) => sum + (item.downloadedBytes || 0), 0);
      
      await this.addEvent({
        type: 'download_completed',
        courseId: courseId,
        courseName: course.title,
        message: `Successfully downloaded course: ${course.title}`,
        timestamp: new Date(),
        severity: 'success'
      });
      
      const settings = await offlineDatabase.getSettings();
      if (settings?.notifyOnDownloadComplete) {
        toast.success(`Course downloaded: ${course.title}`);
      }
      
    } else if (failedItems.length > 0 && (completedItems.length + failedItems.length) === queue.length) {
      course.downloadStatus = 'failed';
      
      await this.addEvent({
        type: 'download_failed',
        courseId: courseId,
        courseName: course.title,
        message: `Failed to download some content for: ${course.title}`,
        timestamp: new Date(),
        severity: 'error'
      });
    }

    await offlineDatabase.saveCourse(course);
  }

  private notifyProgress(progress: DownloadProgress): void {
    const key = `progress:${progress.courseId}`;
    const callback = this.progressCallbacks.get(key);
    if (callback) {
      callback(progress);
    }
  }

  private getFileNameFromUrl(url: string): string {
    try {
      const urlObj = new URL(url);
      const pathname = urlObj.pathname;
      return pathname.split('/').pop() || 'unknown_file';
    } catch {
      return 'unknown_file';
    }
  }

  private async cancelCourseDownloads(courseId: string): Promise<void> {
    // Cancel active downloads
    const queue = await offlineDatabase.getDownloadQueueByCourse(courseId);
    const courseDownloads = queue.filter(item => 
      item.status === 'downloading' || item.status === 'pending'
    );

    for (const download of courseDownloads) {
      const controller = this.downloadControllers.get(download.id);
      if (controller) {
        controller.abort();
        this.downloadControllers.delete(download.id);
      }
      
      // Remove from queue
      await offlineDatabase.removeDownloadQueueItem(download.id);
    }
  }

  private async resumeInterruptedDownloads(): Promise<void> {
    try {
      const queue = await offlineDatabase.getDownloadQueue();
      const interruptedDownloads = queue.filter(item => item.status === 'downloading');

      // Reset interrupted downloads to pending
      for (const download of interruptedDownloads) {
        download.status = 'pending';
        await offlineDatabase.updateDownloadQueueItem(download);
      }

      if (interruptedDownloads.length > 0) {
        console.log(`[ContentDownloader] Resumed ${interruptedDownloads.length} interrupted downloads`);
        this.processDownloadQueue();
      }
    } catch (error) {
      console.error('[ContentDownloader] Failed to resume interrupted downloads:', error);
    }
  }

  private async checkStorageAvailability(): Promise<{ hasSpace: boolean; availableBytes: number }> {
    try {
      if ('storage' in navigator && 'estimate' in navigator.storage) {
        const estimate = await navigator.storage.estimate();
        const availableBytes = (estimate.quota || 0) - (estimate.usage || 0);
        const minRequiredBytes = 100 * 1024 * 1024; // 100MB minimum
        
        return {
          hasSpace: availableBytes > minRequiredBytes,
          availableBytes
        };
      }
      
      return { hasSpace: true, availableBytes: Infinity };
    } catch (error) {
      console.error('Failed to check storage availability:', error);
      return { hasSpace: true, availableBytes: Infinity };
    }
  }

  private async addEvent(event: Omit<OfflineEvent, 'id'>): Promise<void> {
    try {
      await offlineDatabase.addEvent(event);
    } catch (error) {
      console.error('Failed to add event:', error);
    }
  }

  // Public utility methods
  async getDownloadedCourses(): Promise<OfflineCourse[]> {
    return await offlineDatabase.getAllCourses();
  }

  async getCourseDownloadStatus(courseId: string): Promise<OfflineCourse | null> {
    return await offlineDatabase.getCourse(courseId);
  }

  async getStorageInfo(): Promise<{ usedBytes: number; availableBytes: number; totalQuota: number }> {
    const settings = await offlineDatabase.getSettings() || this.defaultSettings;
    const totalQuota = settings.maxStorageGB * 1024 * 1024 * 1024; // Convert GB to bytes
    
    const { usedBytes } = await offlineDatabase.getStorageInfo();
    const availableBytes = Math.max(0, totalQuota - usedBytes);

    return {
      usedBytes,
      availableBytes,
      totalQuota
    };
  }

  async getSettings(): Promise<OfflineSettings> {
    return await offlineDatabase.getSettings() || this.defaultSettings;
  }

  async saveSettings(settings: OfflineSettings): Promise<void> {
    await offlineDatabase.saveSettings(settings);
  }

  async updateSettings(partialSettings: Partial<OfflineSettings>): Promise<void> {
    const currentSettings = await this.getSettings();
    const newSettings = { ...currentSettings, ...partialSettings };
    await this.saveSettings(newSettings);
  }

  async cleanupOldContent(): Promise<void> {
    const settings = await this.getSettings();
    if (!settings.deleteAfterDays) return;

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - settings.deleteAfterDays);

    const courses = await offlineDatabase.getAllCourses();
    const coursesToDelete = courses.filter(course => 
      course.downloadedAt < cutoffDate
    );

    for (const course of coursesToDelete) {
      await this.deleteCourse(course.id);
    }

    if (coursesToDelete.length > 0) {
      await this.addEvent({
        type: 'storage_cleaned',
        message: `Cleaned up ${coursesToDelete.length} old course(s)`,
        timestamp: new Date(),
        severity: 'info'
      });
      
      toast.info(`Cleaned up ${coursesToDelete.length} old course(s)`);
    }
  }
}

// Export singleton instance
export const contentDownloader = new ContentDownloaderService();
