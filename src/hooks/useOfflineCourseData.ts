// Hook for accessing course data in both online and offline modes
import { useState, useEffect } from 'react';
import { useNetworkStatus } from './useNetworkStatus';
import { offlineDatabase } from '@/services/offlineDatabase';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

interface CourseData {
  course: any;
  sections: any[];
  lessons: any[];
  contentItems: any[];
  userProgress: any[];
  loading: boolean;
  error: string | null;
}

export const useOfflineCourseData = (courseId: string): CourseData => {
  const { isOnline } = useNetworkStatus();
  const { user } = useAuth();
  const [data, setData] = useState<CourseData>({
    course: null,
    sections: [],
    lessons: [],
    contentItems: [],
    userProgress: [],
    loading: true,
    error: null
  });

  useEffect(() => {
    if (!courseId || !user) return;

    const fetchCourseData = async () => {
      console.log('[useOfflineCourseData] Fetching course data for:', courseId, 'online:', isOnline);
      
      try {
        setData(prev => ({ ...prev, loading: true, error: null }));

        if (isOnline && navigator.onLine) {
          // Online: Fetch from Supabase
          console.log('[useOfflineCourseData] Fetching from Supabase...');
          
          const { data: courseData, error: courseError } = await supabase
            .from('courses')
            .select(`
              *,
              course_levels (name),
              sections: course_sections (
                id,
                title,
                order_index,
                lessons: course_lessons (
                  id,
                  title,
                  order_index,
                  content_items: course_lesson_content (
                    id,
                    title,
                    content_type,
                    content_data,
                    order_index,
                    duration
                  )
                )
              )
            `)
            .eq('id', courseId)
            .single();

          if (courseError) throw courseError;

          // Get user progress
          const { data: progressData, error: progressError } = await supabase
            .from('user_content_item_progress')
            .select('*')
            .eq('user_id', user.id)
            .eq('course_id', courseId);

          if (progressError) {
            console.warn('[useOfflineCourseData] Progress fetch failed:', progressError);
          }

          // Flatten the data structure
          const sections = courseData.sections || [];
          const lessons = sections.flatMap(s => s.lessons || []);
          const contentItems = lessons.flatMap(l => l.content_items || []);

          setData({
            course: courseData,
            sections,
            lessons,
            contentItems,
            userProgress: progressData || [],
            loading: false,
            error: null
          });

          console.log('[useOfflineCourseData] Online data loaded:', {
            sections: sections.length,
            lessons: lessons.length,
            contentItems: contentItems.length,
            progress: progressData?.length || 0
          });

        } else {
          // Offline: Fetch from IndexedDB
          console.log('[useOfflineCourseData] Fetching from offline database...');
          
          const offlineCourse = await offlineDatabase.getCourse(courseId);
          console.log('[useOfflineCourseData] Retrieved offline course:', offlineCourse);
          
          if (!offlineCourse) {
            throw new Error('Course not available offline. Please download it first.');
          }

          const offlineProgress = await offlineDatabase.getProgress(user.id, courseId);
          console.log('[useOfflineCourseData] Retrieved offline progress:', offlineProgress);

          // Convert offline data to match online format
          const sections = offlineCourse.sections || [];
          const lessons = sections.flatMap(s => s.lessons || []);
          const contentItems = lessons.flatMap(l => l.contentItems || []);

          setData({
            course: {
              ...offlineCourse,
              course_levels: { name: offlineCourse.level || 'All Levels' }
            },
            sections,
            lessons,
            contentItems,
            userProgress: offlineProgress.map(p => ({
              id: p.id,
              user_id: p.userId,
              course_id: p.courseId,
              lesson_content_id: p.contentId,
              completed_at: p.completed ? new Date() : null,
              updated_at: p.updatedAt
            })),
            loading: false,
            error: null
          });

          console.log('[useOfflineCourseData] Offline data loaded:', {
            sections: sections.length,
            lessons: lessons.length,
            contentItems: contentItems.length,
            progress: offlineProgress.length
          });
        }

      } catch (error: any) {
        console.error('[useOfflineCourseData] Failed to fetch course data:', error);
        setData(prev => ({
          ...prev,
          loading: false,
          error: error.message || 'Failed to load course data'
        }));
      }
    };

    // Add timeout to prevent infinite loading
    const timeoutId = setTimeout(() => {
      console.warn('[useOfflineCourseData] Fetch timeout - setting error state');
      setData(prev => ({
        ...prev,
        loading: false,
        error: 'Loading timeout - course data may not be available offline'
      }));
    }, 10000); // 10 second timeout

    fetchCourseData().finally(() => {
      clearTimeout(timeoutId);
    });

    return () => clearTimeout(timeoutId);
  }, [courseId, user, isOnline]);

  return data;
};
