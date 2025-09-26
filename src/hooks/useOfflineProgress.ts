// Hook for tracking and syncing progress in offline mode
import { useCallback } from 'react';
import { useNetworkStatus } from './useNetworkStatus';
import { offlineDatabase } from '@/services/offlineDatabase';
import { supabase } from '@/integrations/supabase/client';
import { useAuthSafe } from './useAuthSafe';
import { toast } from 'sonner';

export const useOfflineProgress = () => {
  const { isOnline } = useNetworkStatus();
  const { user } = useAuthSafe();

  // Mark content as completed
  const markContentCompleted = useCallback(async (
    courseId: string,
    contentId: string,
    lessonId?: string
  ) => {
    if (!user) return;

    console.log('[useOfflineProgress] Marking content completed:', {
      courseId,
      contentId,
      lessonId,
      isOnline
    });

    try {
      if (isOnline && navigator.onLine) {
        // Online: Save to Supabase
        const { error } = await supabase
          .from('user_content_item_progress')
          .upsert({
            user_id: user.id,
            course_id: courseId,
            lesson_content_id: contentId,
            completed_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'user_id,lesson_content_id'
          });

        if (error) throw error;
        console.log('[useOfflineProgress] Progress saved online');

      } else {
        // Offline: Save to IndexedDB
        await offlineDatabase.saveProgress({
          id: `${user.id}-${contentId}`,
          userId: user.id,
          courseId,
          contentId,
          lessonId: lessonId || '',
          completed: true,
          completedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          syncStatus: 'pending'
        });

        console.log('[useOfflineProgress] Progress saved offline');
        toast.success('Progress saved offline - will sync when online');
      }

    } catch (error: any) {
      console.error('[useOfflineProgress] Failed to save progress:', error);
      
      // If online save fails, fallback to offline
      if (isOnline) {
        try {
          await offlineDatabase.saveProgress({
            id: `${user.id}-${contentId}`,
            userId: user.id,
            courseId,
            contentId,
            lessonId: lessonId || '',
            completed: true,
            completedAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            syncStatus: 'pending'
          });
          
          toast.warning('Progress saved offline - will sync when connection is stable');
        } catch (offlineError) {
          console.error('[useOfflineProgress] Offline save also failed:', offlineError);
          toast.error('Failed to save progress');
        }
      } else {
        toast.error('Failed to save progress');
      }
    }
  }, [user, isOnline]);

  // Submit quiz answers
  const submitQuizAnswers = useCallback(async (
    courseId: string,
    contentId: string,
    lessonId: string,
    answers: any,
    score: number
  ) => {
    if (!user) return;

    console.log('[useOfflineProgress] Submitting quiz answers:', {
      courseId,
      contentId,
      lessonId,
      score,
      isOnline
    });

    try {
      if (isOnline && navigator.onLine) {
        // Online: Save to Supabase
        const { error } = await supabase
          .from('quiz_submissions')
          .insert({
            user_id: user.id,
            lesson_content_id: contentId,
            answers,
            score,
            submitted_at: new Date().toISOString()
          });

        if (error) throw error;

        // Also mark content as completed
        await markContentCompleted(courseId, contentId, lessonId);
        console.log('[useOfflineProgress] Quiz submitted online');

      } else {
        // Offline: Save to IndexedDB
        await offlineDatabase.saveQuizSubmission({
          id: `${user.id}-${contentId}-${Date.now()}`,
          userId: user.id,
          courseId,
          contentId,
          lessonId,
          answers,
          score,
          submittedAt: new Date().toISOString(),
          syncStatus: 'pending'
        });

        // Mark content as completed offline
        await markContentCompleted(courseId, contentId, lessonId);
        console.log('[useOfflineProgress] Quiz submitted offline');
        toast.success('Quiz submitted offline - will sync when online');
      }

    } catch (error: any) {
      console.error('[useOfflineProgress] Failed to submit quiz:', error);
      
      // If online save fails, fallback to offline
      if (isOnline) {
        try {
          await offlineDatabase.saveQuizSubmission({
            id: `${user.id}-${contentId}-${Date.now()}`,
            userId: user.id,
            courseId,
            contentId,
            lessonId,
            answers,
            score,
            submittedAt: new Date().toISOString(),
            syncStatus: 'pending'
          });

          await markContentCompleted(courseId, contentId, lessonId);
          toast.warning('Quiz submitted offline - will sync when connection is stable');
        } catch (offlineError) {
          console.error('[useOfflineProgress] Offline quiz save also failed:', offlineError);
          toast.error('Failed to submit quiz');
        }
      } else {
        toast.error('Failed to submit quiz');
      }
    }
  }, [user, isOnline, markContentCompleted]);

  // Sync pending progress when online
  const syncPendingProgress = useCallback(async () => {
    if (!user || !isOnline || !navigator.onLine) return;

    console.log('[useOfflineProgress] Syncing pending progress...');

    try {
      // Sync progress
      const pendingProgress = await offlineDatabase.getPendingSyncProgress();
      console.log('[useOfflineProgress] Found', pendingProgress.length, 'pending progress items');

      for (const progress of pendingProgress) {
        try {
          const { error } = await supabase
            .from('user_content_item_progress')
            .upsert({
              user_id: progress.userId,
              course_id: progress.courseId,
              lesson_content_id: progress.contentId,
              completed_at: progress.completedAt,
              updated_at: progress.updatedAt
            }, {
              onConflict: 'user_id,lesson_content_id'
            });

          if (!error) {
            // Update sync status
            await offlineDatabase.saveProgress({
              ...progress,
              syncStatus: 'synced'
            });
            console.log('[useOfflineProgress] Synced progress for content:', progress.contentId);
          }
        } catch (error) {
          console.error('[useOfflineProgress] Failed to sync progress item:', progress.contentId, error);
        }
      }

      // Sync quiz submissions
      const pendingQuizzes = await offlineDatabase.getPendingSyncSubmissions();
      console.log('[useOfflineProgress] Found', pendingQuizzes.length, 'pending quiz submissions');

      for (const quiz of pendingQuizzes) {
        try {
          const { error } = await supabase
            .from('quiz_submissions')
            .insert({
              user_id: quiz.userId,
              lesson_content_id: quiz.contentId,
              answers: quiz.answers,
              score: quiz.score,
              submitted_at: quiz.submittedAt
            });

          if (!error) {
            // Update sync status
            await offlineDatabase.saveQuizSubmission({
              ...quiz,
              syncStatus: 'synced'
            });
            console.log('[useOfflineProgress] Synced quiz submission for content:', quiz.contentId);
          }
        } catch (error) {
          console.error('[useOfflineProgress] Failed to sync quiz submission:', quiz.contentId, error);
        }
      }

      if (pendingProgress.length > 0 || pendingQuizzes.length > 0) {
        toast.success(`Synced ${pendingProgress.length} progress items and ${pendingQuizzes.length} quiz submissions`);
      }

    } catch (error) {
      console.error('[useOfflineProgress] Failed to sync pending progress:', error);
    }
  }, [user, isOnline]);

  return {
    markContentCompleted,
    submitQuizAnswers,
    syncPendingProgress
  };
};
