// Offline Content Server Service
// Serves cached content when offline and manages blob URLs

import { offlineDatabase } from './offlineDatabase';
import { OfflineCourse, OfflineContentItem } from '@/types/offline';

export interface ContentMetadata {
  contentType: string;
  fileName: string;
  fileSize: number;
  downloadedAt: Date;
  courseId: string;
  lessonId: string;
}

export interface ServedContent {
  url: string;
  metadata: ContentMetadata;
  isFromCache: boolean;
}

class OfflineContentServerService {
  private blobUrlCache = new Map<string, string>();
  private urlRevokeTimeouts = new Map<string, NodeJS.Timeout>();

  async init(): Promise<void> {
    await offlineDatabase.init();
  }

  // Get content URL (blob URL for offline content)
  async getContentUrl(contentId: string): Promise<ServedContent | null> {
    try {
      // Check if we already have a blob URL cached
      const cachedUrl = this.blobUrlCache.get(contentId);
      if (cachedUrl) {
        // Extend the lifetime of the cached URL
        this.extendBlobUrlLifetime(contentId, cachedUrl);
        
        const content = await offlineDatabase.getContent(contentId);
        if (content) {
          return {
            url: cachedUrl,
            metadata: content.metadata,
            isFromCache: true
          };
        }
      }

      // Get content from IndexedDB
      const content = await offlineDatabase.getContent(contentId);
      if (!content) {
        return null;
      }

      // Create blob URL
      const blobUrl = URL.createObjectURL(content.blob);
      
      // Cache the blob URL
      this.blobUrlCache.set(contentId, blobUrl);
      
      // Set up automatic cleanup after 1 hour
      this.scheduleBlobUrlCleanup(contentId, blobUrl, 60 * 60 * 1000);

      return {
        url: blobUrl,
        metadata: content.metadata,
        isFromCache: true
      };
    } catch (error) {
      console.error('[OfflineContentServer] Failed to get content URL:', error);
      return null;
    }
  }

  // Get multiple content URLs at once
  async getMultipleContentUrls(contentIds: string[]): Promise<Map<string, ServedContent>> {
    const results = new Map<string, ServedContent>();
    
    const promises = contentIds.map(async (contentId) => {
      const content = await this.getContentUrl(contentId);
      if (content) {
        results.set(contentId, content);
      }
    });

    await Promise.allSettled(promises);
    return results;
  }

  // Get content for a specific course
  async getCourseContentUrls(courseId: string): Promise<Map<string, ServedContent>> {
    try {
      const course = await offlineDatabase.getCourse(courseId);
      if (!course) {
        return new Map();
      }

      const contentIds: string[] = [];
      
      // Collect all content IDs from the course structure
      for (const section of course.sections) {
        for (const lesson of section.lessons) {
          for (const contentItem of lesson.contentItems) {
            if (contentItem.content_path && 
                (contentItem.content_type === 'video' || contentItem.content_type === 'attachment')) {
              contentIds.push(contentItem.id);
            }
          }
        }
      }

      return await this.getMultipleContentUrls(contentIds);
    } catch (error) {
      console.error('[OfflineContentServer] Failed to get course content URLs:', error);
      return new Map();
    }
  }

  // Check if content is available offline
  async isContentAvailable(contentId: string): Promise<boolean> {
    try {
      const content = await offlineDatabase.getContent(contentId);
      return content !== null;
    } catch (error) {
      console.error('[OfflineContentServer] Failed to check content availability:', error);
      return false;
    }
  }

  // Check if entire course is available offline
  async isCourseAvailable(courseId: string): Promise<{
    isAvailable: boolean;
    availableItems: number;
    totalItems: number;
    missingItems: string[];
  }> {
    try {
      const course = await offlineDatabase.getCourse(courseId);
      if (!course) {
        return {
          isAvailable: false,
          availableItems: 0,
          totalItems: 0,
          missingItems: []
        };
      }

      const contentItems: OfflineContentItem[] = [];
      const missingItems: string[] = [];
      let availableItems = 0;

      // Collect all content items
      for (const section of course.sections) {
        for (const lesson of section.lessons) {
          for (const contentItem of lesson.contentItems) {
            if (contentItem.content_path && 
                (contentItem.content_type === 'video' || contentItem.content_type === 'attachment')) {
              contentItems.push(contentItem);
              
              const isAvailable = await this.isContentAvailable(contentItem.id);
              if (isAvailable) {
                availableItems++;
              } else {
                missingItems.push(contentItem.id);
              }
            }
          }
        }
      }

      return {
        isAvailable: missingItems.length === 0 && contentItems.length > 0,
        availableItems,
        totalItems: contentItems.length,
        missingItems
      };
    } catch (error) {
      console.error('[OfflineContentServer] Failed to check course availability:', error);
      return {
        isAvailable: false,
        availableItems: 0,
        totalItems: 0,
        missingItems: []
      };
    }
  }

  // Get content metadata without creating blob URL
  async getContentMetadata(contentId: string): Promise<ContentMetadata | null> {
    try {
      const content = await offlineDatabase.getContent(contentId);
      return content?.metadata || null;
    } catch (error) {
      console.error('[OfflineContentServer] Failed to get content metadata:', error);
      return null;
    }
  }

  // Get content as blob (for direct manipulation)
  async getContentBlob(contentId: string): Promise<Blob | null> {
    try {
      const content = await offlineDatabase.getContent(contentId);
      return content?.blob || null;
    } catch (error) {
      console.error('[OfflineContentServer] Failed to get content blob:', error);
      return null;
    }
  }

  // Preload content URLs for better performance
  async preloadCourseContent(courseId: string): Promise<void> {
    try {
      console.log(`[OfflineContentServer] Preloading content for course: ${courseId}`);
      await this.getCourseContentUrls(courseId);
      console.log(`[OfflineContentServer] Preloaded content for course: ${courseId}`);
    } catch (error) {
      console.error('[OfflineContentServer] Failed to preload course content:', error);
    }
  }

  // Clean up specific blob URL
  revokeBlobUrl(contentId: string): void {
    const blobUrl = this.blobUrlCache.get(contentId);
    if (blobUrl) {
      URL.revokeObjectURL(blobUrl);
      this.blobUrlCache.delete(contentId);
      
      // Clear any pending cleanup timeout
      const timeout = this.urlRevokeTimeouts.get(contentId);
      if (timeout) {
        clearTimeout(timeout);
        this.urlRevokeTimeouts.delete(contentId);
      }
      
      console.log(`[OfflineContentServer] Revoked blob URL for content: ${contentId}`);
    }
  }

  // Clean up all blob URLs
  revokeAllBlobUrls(): void {
    for (const [contentId, blobUrl] of this.blobUrlCache) {
      URL.revokeObjectURL(blobUrl);
    }
    
    this.blobUrlCache.clear();
    
    // Clear all timeouts
    for (const timeout of this.urlRevokeTimeouts.values()) {
      clearTimeout(timeout);
    }
    this.urlRevokeTimeouts.clear();
    
    console.log('[OfflineContentServer] Revoked all blob URLs');
  }

  // Get storage statistics
  async getStorageStats(): Promise<{
    totalContent: number;
    totalSize: number;
    contentByType: Record<string, number>;
    contentByCourse: Record<string, number>;
  }> {
    try {
      const courses = await offlineDatabase.getAllCourses();
      const stats = {
        totalContent: 0,
        totalSize: 0,
        contentByType: {} as Record<string, number>,
        contentByCourse: {} as Record<string, number>
      };

      for (const course of courses) {
        let courseContentCount = 0;
        
        for (const section of course.sections) {
          for (const lesson of section.lessons) {
            for (const contentItem of lesson.contentItems) {
              if (await this.isContentAvailable(contentItem.id)) {
                stats.totalContent++;
                courseContentCount++;
                
                const metadata = await this.getContentMetadata(contentItem.id);
                if (metadata) {
                  stats.totalSize += metadata.fileSize;
                  
                  const type = contentItem.content_type;
                  stats.contentByType[type] = (stats.contentByType[type] || 0) + 1;
                }
              }
            }
          }
        }
        
        if (courseContentCount > 0) {
          stats.contentByCourse[course.title] = courseContentCount;
        }
      }

      return stats;
    } catch (error) {
      console.error('[OfflineContentServer] Failed to get storage stats:', error);
      return {
        totalContent: 0,
        totalSize: 0,
        contentByType: {},
        contentByCourse: {}
      };
    }
  }

  // Validate content integrity
  async validateContentIntegrity(contentId: string): Promise<{
    isValid: boolean;
    error?: string;
  }> {
    try {
      const content = await offlineDatabase.getContent(contentId);
      if (!content) {
        return { isValid: false, error: 'Content not found' };
      }

      // Basic validation - check if blob is readable
      const blob = content.blob;
      if (!blob || blob.size === 0) {
        return { isValid: false, error: 'Invalid or empty blob' };
      }

      // Verify blob can be read
      const slice = blob.slice(0, 100);
      await slice.arrayBuffer();

      return { isValid: true };
    } catch (error) {
      return { 
        isValid: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  // Repair corrupted content by re-downloading
  async repairContent(contentId: string): Promise<boolean> {
    try {
      // This would trigger a re-download of the specific content item
      // For now, we'll just remove the corrupted content
      await offlineDatabase.deleteContent(contentId);
      this.revokeBlobUrl(contentId);
      
      console.log(`[OfflineContentServer] Removed corrupted content: ${contentId}`);
      return true;
    } catch (error) {
      console.error('[OfflineContentServer] Failed to repair content:', error);
      return false;
    }
  }

  // Private helper methods
  private scheduleBlobUrlCleanup(contentId: string, blobUrl: string, delayMs: number): void {
    // Clear any existing timeout for this content
    const existingTimeout = this.urlRevokeTimeouts.get(contentId);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    // Schedule new cleanup
    const timeout = setTimeout(() => {
      if (this.blobUrlCache.get(contentId) === blobUrl) {
        URL.revokeObjectURL(blobUrl);
        this.blobUrlCache.delete(contentId);
        this.urlRevokeTimeouts.delete(contentId);
        console.log(`[OfflineContentServer] Auto-cleaned blob URL for content: ${contentId}`);
      }
    }, delayMs);

    this.urlRevokeTimeouts.set(contentId, timeout);
  }

  private extendBlobUrlLifetime(contentId: string, blobUrl: string): void {
    // Extend the lifetime by another hour
    this.scheduleBlobUrlCleanup(contentId, blobUrl, 60 * 60 * 1000);
  }

  // Cleanup method to be called when the service is destroyed
  destroy(): void {
    this.revokeAllBlobUrls();
  }
}

// Export singleton instance
export const offlineContentServer = new OfflineContentServerService();

// Cleanup on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    offlineContentServer.destroy();
  });
}
