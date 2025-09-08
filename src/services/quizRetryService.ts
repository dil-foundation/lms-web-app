import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { 
  QuizRetrySettings, 
  QuizAttempt, 
  QuizRetryRequest, 
  RetryEligibility, 
  CreateAttemptResult, 
  ReviewRequestResult,
  QuizRetryAnalytics,
  DEFAULT_RETRY_SETTINGS
} from '@/types/quizRetry';

export class QuizRetryService {
  /**
   * Check if a user can retry a quiz
   */
  static async checkRetryEligibility(
    userId: string, 
    lessonContentId: string
  ): Promise<RetryEligibility> {
    try {
      const { data, error } = await supabase.rpc('can_retry_quiz', {
        p_user_id: userId,
        p_lesson_content_id: lessonContentId
      });

      if (error) {
        console.error('Error checking retry eligibility:', error);
        return { canRetry: false, reason: 'Error checking eligibility' };
      }

      return data as RetryEligibility;
    } catch (error) {
      console.error('Error checking retry eligibility:', error);
      return { canRetry: false, reason: 'Error checking eligibility' };
    }
  }

  /**
   * Create a new quiz attempt
   */
  static async createQuizAttempt(
    userId: string,
    lessonContentId: string,
    answers: Record<string, any>,
    results: Record<string, boolean>,
    score: number | null,
    retryReason?: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<CreateAttemptResult> {
    try {
      const { data, error } = await supabase.rpc('create_quiz_attempt', {
        p_user_id: userId,
        p_lesson_content_id: lessonContentId,
        p_answers: answers,
        p_results: results,
        p_score: score,
        p_retry_reason: retryReason || null,
        p_ip_address: ipAddress || null,
        p_user_agent: userAgent || null
      });

      if (error) {
        console.error('Error creating quiz attempt:', error);
        return { success: false, error: error.message };
      }

      return data as CreateAttemptResult;
    } catch (error) {
      console.error('Error creating quiz attempt:', error);
      return { success: false, error: 'Failed to create quiz attempt' };
    }
  }

  /**
   * Get quiz retry settings for a content item
   */
  static async getRetrySettings(lessonContentId: string): Promise<QuizRetrySettings> {
    try {
      const { data, error } = await supabase
        .from('course_lesson_content')
        .select('retry_settings')
        .eq('id', lessonContentId)
        .single();

      if (error) {
        console.error('Error fetching retry settings:', error);
        return DEFAULT_RETRY_SETTINGS;
      }

      return { ...DEFAULT_RETRY_SETTINGS, ...data.retry_settings };
    } catch (error) {
      console.error('Error fetching retry settings:', error);
      return DEFAULT_RETRY_SETTINGS;
    }
  }

  /**
   * Update quiz retry settings for a content item
   */
  static async updateRetrySettings(
    lessonContentId: string, 
    settings: Partial<QuizRetrySettings>
  ): Promise<boolean> {
    try {
      // First check if the retry_settings column exists
      const { data: columnCheck, error: columnError } = await supabase
        .from('course_lesson_content')
        .select('retry_settings')
        .eq('id', lessonContentId)
        .limit(1);

      if (columnError && columnError.code === 'PGRST204') {
        console.warn('retry_settings column does not exist. Please run the database migration.');
        toast.error('Database migration required. Please contact your administrator.');
        return false;
      }

      const { error } = await supabase
        .from('course_lesson_content')
        .update({ retry_settings: settings })
        .eq('id', lessonContentId);

      if (error) {
        console.error('Error updating retry settings:', error);
        toast.error('Failed to save retry settings: ' + error.message);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error updating retry settings:', error);
      toast.error('Failed to save retry settings');
      return false;
    }
  }

  /**
   * Get all attempts for a user and content item
   */
  static async getUserAttempts(
    userId: string, 
    lessonContentId: string
  ): Promise<QuizAttempt[]> {
    try {
      const { data, error } = await supabase
        .from('quiz_attempts')
        .select('*')
        .eq('user_id', userId)
        .eq('lesson_content_id', lessonContentId)
        .order('attempt_number', { ascending: true });

      if (error) {
        console.error('Error fetching user attempts:', error);
        return [];
      }

      return data as QuizAttempt[];
    } catch (error) {
      console.error('Error fetching user attempts:', error);
      return [];
    }
  }

  /**
   * Get pending retry requests for teachers
   */
  static async getPendingRetryRequests(courseId?: string): Promise<QuizRetryRequest[]> {
    try {
      let query = supabase
        .from('quiz_retry_requests')
        .select(`
          *,
          user:user_id (
            id,
            email,
            full_name
          ),
          content:lesson_content_id (
            id,
            title,
            content_type
          )
        `)
        .eq('status', 'pending')
        .order('requested_at', { ascending: true });

      if (courseId) {
        // Filter by course if provided
        query = query.eq('content.course_id', courseId);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching retry requests:', error);
        return [];
      }

      return data as QuizRetryRequest[];
    } catch (error) {
      console.error('Error fetching retry requests:', error);
      return [];
    }
  }

  /**
   * Review a retry request (approve or reject)
   */
  static async reviewRetryRequest(
    requestId: string,
    teacherId: string,
    decision: 'approved' | 'rejected',
    notes?: string
  ): Promise<ReviewRequestResult> {
    try {
      const { data, error } = await supabase.rpc('review_retry_request', {
        p_request_id: requestId,
        p_teacher_id: teacherId,
        p_decision: decision,
        p_notes: notes || null
      });

      if (error) {
        console.error('Error reviewing retry request:', error);
        return { success: false, error: error.message };
      }

      return data as ReviewRequestResult;
    } catch (error) {
      console.error('Error reviewing retry request:', error);
      return { success: false, error: 'Failed to review retry request' };
    }
  }

  /**
   * Get retry analytics for a course or content item
   */
  static async getRetryAnalytics(
    courseId?: string, 
    lessonContentId?: string
  ): Promise<QuizRetryAnalytics> {
    try {
      let query = supabase
        .from('quiz_attempts')
        .select(`
          id,
          attempt_number,
          score,
          retry_reason,
          submitted_at,
          content:lesson_content_id (
            id,
            course_id
          )
        `);

      if (lessonContentId) {
        query = query.eq('lesson_content_id', lessonContentId);
      } else if (courseId) {
        query = query.eq('content.course_id', courseId);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching retry analytics:', error);
        return {
          totalAttempts: 0,
          retryAttempts: 0,
          averageAttempts: 0,
          retrySuccessRate: 0,
          commonRetryReasons: [],
          suspiciousPatterns: []
        };
      }

      const attempts = data as any[];
      const totalAttempts = attempts.length;
      const retryAttempts = attempts.filter(a => a.attempt_number > 1).length;
      
      // Calculate average attempts per user
      const userAttempts = new Map<string, number>();
      attempts.forEach(attempt => {
        const userId = attempt.user_id;
        userAttempts.set(userId, (userAttempts.get(userId) || 0) + 1);
      });
      const averageAttempts = userAttempts.size > 0 
        ? Array.from(userAttempts.values()).reduce((sum, count) => sum + count, 0) / userAttempts.size 
        : 0;

      // Calculate retry success rate
      const retrySuccesses = attempts
        .filter(a => a.attempt_number > 1 && a.score && a.score >= 70)
        .length;
      const retrySuccessRate = retryAttempts > 0 ? (retrySuccesses / retryAttempts) * 100 : 0;

      // Get common retry reasons
      const reasonCounts = new Map<string, number>();
      attempts
        .filter(a => a.retry_reason)
        .forEach(attempt => {
          const reason = attempt.retry_reason;
          reasonCounts.set(reason, (reasonCounts.get(reason) || 0) + 1);
        });
      
      const commonRetryReasons = Array.from(reasonCounts.entries())
        .map(([reason, count]) => ({ reason, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      // Detect suspicious patterns
      const suspiciousPatterns = this.detectSuspiciousPatterns(attempts);

      return {
        totalAttempts,
        retryAttempts,
        averageAttempts: Math.round(averageAttempts * 100) / 100,
        retrySuccessRate: Math.round(retrySuccessRate * 100) / 100,
        commonRetryReasons,
        suspiciousPatterns
      };
    } catch (error) {
      console.error('Error fetching retry analytics:', error);
      return {
        totalAttempts: 0,
        retryAttempts: 0,
        averageAttempts: 0,
        retrySuccessRate: 0,
        commonRetryReasons: [],
        suspiciousPatterns: []
      };
    }
  }

  /**
   * Detect suspicious retry patterns
   */
  private static detectSuspiciousPatterns(attempts: any[]): Array<{
    pattern: string;
    description: string;
    severity: 'low' | 'medium' | 'high';
  }> {
    const patterns: Array<{
      pattern: string;
      description: string;
      severity: 'low' | 'medium' | 'high';
    }> = [];

    // Group attempts by user
    const userAttempts = new Map<string, any[]>();
    attempts.forEach(attempt => {
      const userId = attempt.user_id;
      if (!userAttempts.has(userId)) {
        userAttempts.set(userId, []);
      }
      userAttempts.get(userId)!.push(attempt);
    });

    // Check for rapid retries (within 1 hour)
    userAttempts.forEach((userAttempts, userId) => {
      const sortedAttempts = userAttempts.sort((a, b) => 
        new Date(a.submitted_at).getTime() - new Date(b.submitted_at).getTime()
      );

      for (let i = 1; i < sortedAttempts.length; i++) {
        const timeDiff = new Date(sortedAttempts[i].submitted_at).getTime() - 
                        new Date(sortedAttempts[i-1].submitted_at).getTime();
        const hoursDiff = timeDiff / (1000 * 60 * 60);

        if (hoursDiff < 1) {
          patterns.push({
            pattern: 'rapid_retries',
            description: `User ${userId} retried within ${Math.round(hoursDiff * 60)} minutes`,
            severity: 'high'
          });
        }
      }
    });

    // Check for consistent low scores across retries
    userAttempts.forEach((userAttempts, userId) => {
      if (userAttempts.length >= 3) {
        const allLowScores = userAttempts.every(attempt => 
          attempt.score && attempt.score < 50
        );
        
        if (allLowScores) {
          patterns.push({
            pattern: 'consistent_low_scores',
            description: `User ${userId} consistently scored below 50% across ${userAttempts.length} attempts`,
            severity: 'medium'
          });
        }
      }
    });

    return patterns;
  }

  /**
   * Get client IP address (for academic integrity tracking)
   */
  static getClientIP(): string {
    // This would need to be implemented based on your setup
    // For now, return a placeholder
    return 'unknown';
  }

  /**
   * Get user agent string
   */
  static getUserAgent(): string {
    return navigator.userAgent;
  }
}
