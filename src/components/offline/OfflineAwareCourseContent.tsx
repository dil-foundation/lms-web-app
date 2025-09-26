// Offline-aware wrapper for CourseContent
// Routes to appropriate component based on online/offline status

import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { useOfflineManager } from '@/hooks/useOfflineManager';
import { offlineDatabase } from '@/services/offlineDatabase';
import OfflineCourseViewer from './OfflineCourseViewer';
import { CourseContent } from '../../pages/CourseContent';

const OfflineAwareCourseContent: React.FC = () => {
  const { id: courseId } = useParams<{ id: string }>();
  const { isOnline } = useNetworkStatus();
  const { downloadQueue } = useOfflineManager();
  const [courseFromDB, setCourseFromDB] = useState<any>(null);

  // Check if course exists in IndexedDB directly
  useEffect(() => {
    if (!courseId || isOnline) return;
    
    const checkCourseInDB = async () => {
      try {
        const course = await offlineDatabase.getCourse(courseId);
        setCourseFromDB(course);
        console.log('[OfflineAwareCourseContent] Direct DB check - course found:', !!course, course?.downloadStatus);
      } catch (error) {
        console.error('[OfflineAwareCourseContent] Failed to check course in DB:', error);
        setCourseFromDB(null);
      }
    };

    checkCourseInDB();
  }, [courseId, isOnline]);

  // If online, use the full CourseContent page (profile caching happens inside)
  if (isOnline && navigator.onLine) {
    console.log('[OfflineAwareCourseContent] Online - using full CourseContent');
    return <CourseContent />;
  }

  // If offline, check if course is downloaded (check both download queue and course data)
  const isCourseDownloaded = downloadQueue.some(
    item => item.courseId === courseId && item.status === 'completed'
  ) || (courseFromDB && courseFromDB.downloadStatus === 'completed');

  console.log('[OfflineAwareCourseContent] Debug info:', {
    courseId,
    downloadQueueLength: downloadQueue.length,
    downloadQueue: downloadQueue.map(item => ({ 
      id: item.id,
      courseId: item.courseId, 
      status: item.status,
      progress: item.progress,
      createdAt: item.createdAt 
    })),
    courseFromDB: courseFromDB ? {
      id: courseFromDB.id,
      title: courseFromDB.title,
      downloadStatus: courseFromDB.downloadStatus
    } : null,
    isCourseDownloaded
  });

  if (isCourseDownloaded) {
    console.log('[OfflineAwareCourseContent] Course available offline - using OfflineCourseViewer');
    return <OfflineCourseViewer courseData={courseFromDB} />;
  } else {
    console.log('[OfflineAwareCourseContent] Course not downloaded, showing error');
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="max-w-md text-center">
          <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold mb-2">Course Not Available Offline</h3>
          <p className="text-muted-foreground mb-4">
            This course needs to be downloaded first to view it offline.
          </p>
          <p className="text-sm text-amber-600 mb-4">
            💡 Go to the Offline Learning tab to download this course while online.
          </p>
          <button 
            onClick={() => window.history.back()}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }
};

export default OfflineAwareCourseContent;
