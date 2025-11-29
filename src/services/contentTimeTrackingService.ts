/**
 * Content Item Time Tracking Service
 *
 * Manages time tracking for video and quiz content items.
 * Tracks sessions, durations, and engagement metrics for student learning analytics.
 */

import { supabase } from "@/integrations/supabase/client";

export interface TimeTrackingSession {
  id?: string;
  user_id: string;
  course_id: string;
  lesson_id: string;
  lesson_content_id: string;
  content_type: 'video' | 'quiz';
  session_id: string;
  session_start_at: string;
  session_end_at?: string;
  session_duration?: number;
  active_duration?: number;

  // Video-specific
  video_start_position?: number;
  video_end_position?: number;
  video_total_length?: number;
  pause_count?: number;
  seek_count?: number;

  // Quiz-specific
  quiz_started_at?: string;
  quiz_submitted_at?: string;
  quiz_attempt_number?: number;

  // Engagement
  interaction_events?: InteractionEvent[];
  completed?: boolean;
}

export interface InteractionEvent {
  type: 'play' | 'pause' | 'seek' | 'resume' | 'speed_change' | 'quality_change' | 'fullscreen' | 'quiz_answer' | 'quiz_review';
  timestamp: string;
  position?: number; // For video events
  from_position?: number; // For seek events
  to_position?: number; // For seek events
  value?: string | number; // For speed/quality changes
}

export interface TimeStatistics {
  total_sessions: number;
  total_session_duration: number;
  total_active_duration: number;
  average_session_duration: number;
  first_accessed_at: string;
  last_accessed_at: string;
  total_pause_count: number;
  total_seek_count: number;
  completion_count: number;
}

export interface CourseTimeStatistics {
  content_type: 'video' | 'quiz';
  total_sessions: number;
  total_active_duration: number;
  average_session_duration: number;
  content_items_accessed: number;
}

class ContentTimeTrackingService {
  /**
   * Start a new time tracking session for a content item
   */
  async startSession(params: {
    userId: string;
    courseId: string;
    lessonId: string;
    lessonContentId: string;
    contentType: 'video' | 'quiz';
    videoPosition?: number;
    videoTotalLength?: number;
  }): Promise<{ sessionId: string; error?: string }> {
    try {
      const sessionId = crypto.randomUUID();

      const sessionData: any = {
        user_id: params.userId,
        course_id: params.courseId,
        lesson_id: params.lessonId,
        lesson_content_id: params.lessonContentId,
        content_type: params.contentType,
        session_id: sessionId,
        session_start_at: new Date().toISOString(),
      };

      // Add video-specific fields
      if (params.contentType === 'video') {
        sessionData.video_start_position = params.videoPosition || 0;
        sessionData.video_total_length = params.videoTotalLength || 0;
        sessionData.pause_count = 0;
        sessionData.seek_count = 0;
        sessionData.interaction_events = [{
          type: 'play',
          timestamp: new Date().toISOString(),
          position: params.videoPosition || 0,
        }];
      }

      // Add quiz-specific fields
      if (params.contentType === 'quiz') {
        sessionData.quiz_started_at = new Date().toISOString();
        sessionData.interaction_events = [{
          type: 'quiz_answer',
          timestamp: new Date().toISOString(),
        }];
      }

      const { error } = await supabase
        .from('content_item_time_tracking')
        .insert(sessionData);

      if (error) {
        console.error('[TIME TRACKING] Error starting session:', error);
        return { sessionId, error: error.message };
      }

      console.log(`[TIME TRACKING] Started ${params.contentType} session:`, sessionId);
      return { sessionId };
    } catch (error: any) {
      console.error('[TIME TRACKING] Exception starting session:', error);
      return { sessionId: '', error: error.message };
    }
  }

  /**
   * Update an active session (for video progress updates)
   */
  async updateSession(params: {
    sessionId: string;
    userId: string;
    lessonContentId: string;
    videoPosition?: number;
    pauseIncrement?: number;
    seekIncrement?: number;
    interactionEvent?: InteractionEvent;
  }): Promise<{ success: boolean; error?: string }> {
    try {
      // Get current session data
      const { data: currentSession, error: fetchError } = await supabase
        .from('content_item_time_tracking')
        .select('*')
        .eq('session_id', params.sessionId)
        .eq('user_id', params.userId)
        .eq('lesson_content_id', params.lessonContentId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (fetchError || !currentSession) {
        console.error('[TIME TRACKING] Session not found:', params.sessionId);
        return { success: false, error: 'Session not found' };
      }

      const updateData: any = {};

      // Update video position
      if (params.videoPosition !== undefined) {
        updateData.video_end_position = params.videoPosition;
      }

      // Increment pause count
      if (params.pauseIncrement) {
        updateData.pause_count = (currentSession.pause_count || 0) + params.pauseIncrement;
      }

      // Increment seek count
      if (params.seekIncrement) {
        updateData.seek_count = (currentSession.seek_count || 0) + params.seekIncrement;
      }

      // Add interaction event
      if (params.interactionEvent) {
        const currentEvents = currentSession.interaction_events || [];
        updateData.interaction_events = [...currentEvents, params.interactionEvent];
      }

      const { error: updateError } = await supabase
        .from('content_item_time_tracking')
        .update(updateData)
        .eq('session_id', params.sessionId)
        .eq('user_id', params.userId);

      if (updateError) {
        console.error('[TIME TRACKING] Error updating session:', updateError);
        return { success: false, error: updateError.message };
      }

      return { success: true };
    } catch (error: any) {
      console.error('[TIME TRACKING] Exception updating session:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * End a time tracking session
   */
  async endSession(params: {
    sessionId: string;
    userId: string;
    lessonContentId: string;
    videoPosition?: number;
    quizSubmitted?: boolean;
    quizAttemptNumber?: number;
    completed?: boolean;
  }): Promise<{ success: boolean; error?: string }> {
    try {
      // Get current session
      const { data: currentSession, error: fetchError } = await supabase
        .from('content_item_time_tracking')
        .select('*')
        .eq('session_id', params.sessionId)
        .eq('user_id', params.userId)
        .eq('lesson_content_id', params.lessonContentId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (fetchError || !currentSession) {
        console.error('[TIME TRACKING] Session not found for ending:', params.sessionId);
        return { success: false, error: 'Session not found' };
      }

      const endTime = new Date();
      const startTime = new Date(currentSession.session_start_at);
      const sessionDuration = Math.floor((endTime.getTime() - startTime.getTime()) / 1000);

      const updateData: any = {
        session_end_at: endTime.toISOString(),
        session_duration: sessionDuration,
        active_duration: sessionDuration, // Can be refined with pause tracking
        completed: params.completed || false,
      };

      // Video-specific updates
      if (currentSession.content_type === 'video' && params.videoPosition !== undefined) {
        updateData.video_end_position = params.videoPosition;

        // Add final interaction event
        const currentEvents = currentSession.interaction_events || [];
        updateData.interaction_events = [...currentEvents, {
          type: 'pause',
          timestamp: endTime.toISOString(),
          position: params.videoPosition,
        }];

        // Calculate active duration (excluding pauses)
        // This is a simplified version - could be enhanced with detailed pause tracking
        const pauseCount = currentSession.pause_count || 0;
        const estimatedPauseTime = pauseCount * 2; // Assume 2 seconds average pause
        updateData.active_duration = Math.max(0, sessionDuration - estimatedPauseTime);
      }

      // Quiz-specific updates
      if (currentSession.content_type === 'quiz') {
        if (params.quizSubmitted) {
          updateData.quiz_submitted_at = endTime.toISOString();
          updateData.quiz_attempt_number = params.quizAttemptNumber;

          // Add quiz submission event
          const currentEvents = currentSession.interaction_events || [];
          updateData.interaction_events = [...currentEvents, {
            type: 'quiz_review',
            timestamp: endTime.toISOString(),
          }];
        }
      }

      const { error: updateError } = await supabase
        .from('content_item_time_tracking')
        .update(updateData)
        .eq('session_id', params.sessionId)
        .eq('user_id', params.userId);

      if (updateError) {
        console.error('[TIME TRACKING] Error ending session:', updateError);
        return { success: false, error: updateError.message };
      }

      console.log(`[TIME TRACKING] Ended session ${params.sessionId}:`, {
        duration: sessionDuration,
        completed: params.completed,
      });

      return { success: true };
    } catch (error: any) {
      console.error('[TIME TRACKING] Exception ending session:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Record a video pause event
   */
  async recordVideoPause(params: {
    sessionId: string;
    userId: string;
    lessonContentId: string;
    position: number;
  }): Promise<void> {
    await this.updateSession({
      sessionId: params.sessionId,
      userId: params.userId,
      lessonContentId: params.lessonContentId,
      videoPosition: params.position,
      pauseIncrement: 1,
      interactionEvent: {
        type: 'pause',
        timestamp: new Date().toISOString(),
        position: params.position,
      },
    });
  }

  /**
   * Record a video resume/play event
   */
  async recordVideoResume(params: {
    sessionId: string;
    userId: string;
    lessonContentId: string;
    position: number;
  }): Promise<void> {
    await this.updateSession({
      sessionId: params.sessionId,
      userId: params.userId,
      lessonContentId: params.lessonContentId,
      videoPosition: params.position,
      interactionEvent: {
        type: 'resume',
        timestamp: new Date().toISOString(),
        position: params.position,
      },
    });
  }

  /**
   * Record a video seek event
   */
  async recordVideoSeek(params: {
    sessionId: string;
    userId: string;
    lessonContentId: string;
    fromPosition: number;
    toPosition: number;
  }): Promise<void> {
    await this.updateSession({
      sessionId: params.sessionId,
      userId: params.userId,
      lessonContentId: params.lessonContentId,
      videoPosition: params.toPosition,
      seekIncrement: 1,
      interactionEvent: {
        type: 'seek',
        timestamp: new Date().toISOString(),
        from_position: params.fromPosition,
        to_position: params.toPosition,
      },
    });
  }

  /**
   * Get aggregated time statistics for a content item
   */
  async getContentStatistics(
    userId: string,
    lessonContentId: string
  ): Promise<TimeStatistics | null> {
    try {
      const { data, error } = await supabase.rpc('get_content_time_statistics', {
        p_user_id: userId,
        p_lesson_content_id: lessonContentId,
      });

      if (error) {
        console.error('[TIME TRACKING] Error fetching statistics:', error);
        return null;
      }

      return data?.[0] || null;
    } catch (error) {
      console.error('[TIME TRACKING] Exception fetching statistics:', error);
      return null;
    }
  }

  /**
   * Get time statistics for entire course
   */
  async getCourseStatistics(
    userId: string,
    courseId: string
  ): Promise<CourseTimeStatistics[]> {
    try {
      const { data, error } = await supabase.rpc('get_course_time_statistics', {
        p_user_id: userId,
        p_course_id: courseId,
      });

      if (error) {
        console.error('[TIME TRACKING] Error fetching course statistics:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('[TIME TRACKING] Exception fetching course statistics:', error);
      return [];
    }
  }

  /**
   * Get session history for a content item
   */
  async getSessionHistory(
    userId: string,
    lessonContentId: string,
    limit: number = 50
  ): Promise<TimeTrackingSession[]> {
    try {
      const { data, error } = await supabase.rpc('get_content_session_history', {
        p_user_id: userId,
        p_lesson_content_id: lessonContentId,
        p_limit: limit,
      });

      if (error) {
        console.error('[TIME TRACKING] Error fetching session history:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('[TIME TRACKING] Exception fetching session history:', error);
      return [];
    }
  }

  /**
   * Get active session for user and content item
   */
  async getActiveSession(
    userId: string,
    lessonContentId: string
  ): Promise<TimeTrackingSession | null> {
    try {
      const { data, error } = await supabase
        .from('content_item_time_tracking')
        .select('*')
        .eq('user_id', userId)
        .eq('lesson_content_id', lessonContentId)
        .is('session_end_at', null)
        .order('session_start_at', { ascending: false })
        .limit(1)
        .single();

      if (error) {
        // Not finding an active session is not an error
        if (error.code === 'PGRST116') {
          return null;
        }
        console.error('[TIME TRACKING] Error fetching active session:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('[TIME TRACKING] Exception fetching active session:', error);
      return null;
    }
  }

  /**
   * Close any orphaned sessions (sessions without end_at that are older than 1 hour)
   * Call this when starting a new session to clean up
   */
  async closeOrphanedSessions(
    userId: string,
    lessonContentId: string
  ): Promise<void> {
    try {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

      const { data: orphanedSessions, error: fetchError } = await supabase
        .from('content_item_time_tracking')
        .select('*')
        .eq('user_id', userId)
        .eq('lesson_content_id', lessonContentId)
        .is('session_end_at', null)
        .lt('session_start_at', oneHourAgo);

      if (fetchError || !orphanedSessions || orphanedSessions.length === 0) {
        return;
      }

      // Close each orphaned session
      for (const session of orphanedSessions) {
        const startTime = new Date(session.session_start_at);
        const estimatedEndTime = new Date(startTime.getTime() + 60 * 60 * 1000); // Assume 1 hour max
        const sessionDuration = Math.floor((estimatedEndTime.getTime() - startTime.getTime()) / 1000);

        await supabase
          .from('content_item_time_tracking')
          .update({
            session_end_at: estimatedEndTime.toISOString(),
            session_duration: sessionDuration,
            active_duration: sessionDuration,
          })
          .eq('session_id', session.session_id);
      }

      console.log(`[TIME TRACKING] Closed ${orphanedSessions.length} orphaned sessions`);
    } catch (error) {
      console.error('[TIME TRACKING] Error closing orphaned sessions:', error);
    }
  }
}

export const contentTimeTrackingService = new ContentTimeTrackingService();
