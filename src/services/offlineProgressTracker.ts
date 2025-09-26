// Offline Progress Tracker Service
// Handles progress tracking when offline and queues for sync

import { offlineDatabase } from './offlineDatabase';
import { syncEngine } from './syncEngine';
import { useAuth } from '@/hooks/useAuth';
import { 
  OfflineProgress, 
  OfflineQuizSubmission, 
  OfflineQuizAnswer,
  SyncQueueItem 
} from '@/types/offline';
import { toast } from 'sonner';

export interface ProgressUpdate {
  courseId: string;
  contentId: string;
  completed: boolean;
  score?: number;
  timeSpent?: number;
}

export interface QuizSubmissionData {
  courseId: string;
  contentId: string;
  answers: OfflineQuizAnswer[];
  score: number;
  totalPoints: number;
}

class OfflineProgressTrackerService {
  async init(): Promise<void> {
    await offlineDatabase.init();
  }

  // Track content completion
  async markContentComplete(
    userId: string,
    courseId: string,
    contentId: string,
    options: {
      score?: number;
      timeSpent?: number;
      syncImmediately?: boolean;
    } = {}
  ): Promise<void> {
    try {
      const progressId = `${userId}-${courseId}-${contentId}`;
      
      const progress: OfflineProgress = {
        id: progressId,
        userId,
        courseId,
        contentId,
        completed: true,
        score: options.score,
        timeSpent: options.timeSpent,
        completedAt: new Date(),
        syncStatus: 'pending',
        syncAttempts: 0,
        version: 1
      };

      // Save to offline database
      await offlineDatabase.saveProgress(progress);

      // Add to sync queue if online sync is enabled
      const settings = await offlineDatabase.getSettings();
      if (settings?.syncFrequency === 'immediate' && options.syncImmediately !== false) {
        await this.queueProgressForSync(progress);
      }

      console.log('[OfflineProgressTracker] Content marked as complete:', contentId);
      
      // Show offline notification
      if (!navigator.onLine) {
        toast.success('Progress saved offline - will sync when online');
      }

    } catch (error) {
      console.error('[OfflineProgressTracker] Failed to mark content complete:', error);
      toast.error('Failed to save progress');
      throw error;
    }
  }

  // Submit quiz answers
  async submitQuiz(
    userId: string,
    submissionData: QuizSubmissionData,
    options: {
      syncImmediately?: boolean;
    } = {}
  ): Promise<string> {
    try {
      const submissionId = `${userId}-${submissionData.courseId}-${submissionData.contentId}-${Date.now()}`;
      
      const submission: OfflineQuizSubmission = {
        id: submissionId,
        userId,
        courseId: submissionData.courseId,
        contentId: submissionData.contentId,
        answers: submissionData.answers,
        score: submissionData.score,
        totalPoints: submissionData.totalPoints,
        submittedAt: new Date(),
        syncStatus: 'pending',
        syncAttempts: 0,
        version: 1
      };

      // Save to offline database
      await offlineDatabase.saveQuizSubmission(submission);

      // Also mark content as complete with the quiz score
      await this.markContentComplete(
        userId,
        submissionData.courseId,
        submissionData.contentId,
        {
          score: submissionData.score,
          syncImmediately: options.syncImmediately
        }
      );

      // Add to sync queue if online sync is enabled
      const settings = await offlineDatabase.getSettings();
      if (settings?.syncFrequency === 'immediate' && options.syncImmediately !== false) {
        await this.queueSubmissionForSync(submission);
      }

      console.log('[OfflineProgressTracker] Quiz submitted:', submissionId);
      
      // Show offline notification
      if (!navigator.onLine) {
        toast.success('Quiz submitted offline - will sync when online');
      } else {
        toast.success('Quiz submitted successfully');
      }

      return submissionId;

    } catch (error) {
      console.error('[OfflineProgressTracker] Failed to submit quiz:', error);
      toast.error('Failed to submit quiz');
      throw error;
    }
  }

  // Get user progress for a course
  async getCourseProgress(userId: string, courseId: string): Promise<{
    progress: OfflineProgress[];
    completionPercentage: number;
    totalItems: number;
    completedItems: number;
  }> {
    try {
      const progress = await offlineDatabase.getProgress(userId, courseId);
      
      const completedItems = progress.filter(p => p.completed).length;
      const totalItems = progress.length;
      const completionPercentage = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

      return {
        progress,
        completionPercentage,
        totalItems,
        completedItems
      };
    } catch (error) {
      console.error('[OfflineProgressTracker] Failed to get course progress:', error);
      return {
        progress: [],
        completionPercentage: 0,
        totalItems: 0,
        completedItems: 0
      };
    }
  }

  // Get quiz submissions for a course
  async getCourseQuizSubmissions(userId: string, courseId: string): Promise<OfflineQuizSubmission[]> {
    try {
      return await offlineDatabase.getQuizSubmissions(userId, courseId);
    } catch (error) {
      console.error('[OfflineProgressTracker] Failed to get quiz submissions:', error);
      return [];
    }
  }

  // Get overall progress across all courses
  async getOverallProgress(userId: string): Promise<{
    totalCourses: number;
    completedCourses: number;
    inProgressCourses: number;
    totalContentItems: number;
    completedContentItems: number;
    overallPercentage: number;
  }> {
    try {
      const allProgress = await offlineDatabase.getProgress(userId);
      const courses = await offlineDatabase.getAllCourses();
      
      // Group progress by course
      const progressByCourse = new Map<string, OfflineProgress[]>();
      for (const progress of allProgress) {
        if (!progressByCourse.has(progress.courseId)) {
          progressByCourse.set(progress.courseId, []);
        }
        progressByCourse.get(progress.courseId)!.push(progress);
      }

      let completedCourses = 0;
      let inProgressCourses = 0;
      let totalContentItems = 0;
      let completedContentItems = 0;

      for (const [courseId, courseProgress] of progressByCourse) {
        const completed = courseProgress.filter(p => p.completed).length;
        const total = courseProgress.length;
        
        totalContentItems += total;
        completedContentItems += completed;

        if (completed === total && total > 0) {
          completedCourses++;
        } else if (completed > 0) {
          inProgressCourses++;
        }
      }

      const overallPercentage = totalContentItems > 0 
        ? Math.round((completedContentItems / totalContentItems) * 100) 
        : 0;

      return {
        totalCourses: courses.length,
        completedCourses,
        inProgressCourses,
        totalContentItems,
        completedContentItems,
        overallPercentage
      };
    } catch (error) {
      console.error('[OfflineProgressTracker] Failed to get overall progress:', error);
      return {
        totalCourses: 0,
        completedCourses: 0,
        inProgressCourses: 0,
        totalContentItems: 0,
        completedContentItems: 0,
        overallPercentage: 0
      };
    }
  }

  // Get pending sync items
  async getPendingSyncItems(): Promise<{
    progress: OfflineProgress[];
    submissions: OfflineQuizSubmission[];
    total: number;
  }> {
    try {
      const progress = await offlineDatabase.getPendingSyncProgress();
      const submissions = await offlineDatabase.getPendingSyncSubmissions();
      
      return {
        progress,
        submissions,
        total: progress.length + submissions.length
      };
    } catch (error) {
      console.error('[OfflineProgressTracker] Failed to get pending sync items:', error);
      return {
        progress: [],
        submissions: [],
        total: 0
      };
    }
  }

  // Force sync all pending items
  async syncAllPending(): Promise<void> {
    try {
      console.log('[OfflineProgressTracker] Starting sync of all pending items...');
      
      const result = await syncEngine.syncAll({ immediate: true });
      
      if (result.success) {
        toast.success(`Successfully synced ${result.syncedItems} items`);
      } else {
        toast.warning(`Synced ${result.syncedItems} items, ${result.failedItems} failed`);
      }
    } catch (error) {
      console.error('[OfflineProgressTracker] Failed to sync pending items:', error);
      toast.error('Failed to sync data');
    }
  }

  // Update time spent on content
  async updateTimeSpent(
    userId: string,
    courseId: string,
    contentId: string,
    additionalTime: number
  ): Promise<void> {
    try {
      const progressId = `${userId}-${courseId}-${contentId}`;
      let progress = await offlineDatabase.getProgress(userId, courseId);
      
      const existingProgress = progress.find(p => p.id === progressId);
      
      if (existingProgress) {
        existingProgress.timeSpent = (existingProgress.timeSpent || 0) + additionalTime;
        existingProgress.syncStatus = 'pending';
        await offlineDatabase.saveProgress(existingProgress);
      } else {
        // Create new progress entry
        const newProgress: OfflineProgress = {
          id: progressId,
          userId,
          courseId,
          contentId,
          completed: false,
          timeSpent: additionalTime,
          completedAt: new Date(),
          syncStatus: 'pending',
          syncAttempts: 0,
          version: 1
        };
        
        await offlineDatabase.saveProgress(newProgress);
      }
    } catch (error) {
      console.error('[OfflineProgressTracker] Failed to update time spent:', error);
    }
  }

  // Private helper methods
  private async queueProgressForSync(progress: OfflineProgress): Promise<void> {
    try {
      const syncItem: SyncQueueItem = {
        id: `progress-sync-${progress.id}`,
        type: 'progress',
        data: progress,
        priority: 'medium',
        createdAt: new Date(),
        attempts: 0,
        maxAttempts: 3
      };

      await offlineDatabase.addToSyncQueue(syncItem);
      
      // Trigger immediate sync if online
      if (navigator.onLine) {
        setTimeout(() => syncEngine.syncProgress(), 1000);
      }
    } catch (error) {
      console.error('[OfflineProgressTracker] Failed to queue progress for sync:', error);
    }
  }

  private async queueSubmissionForSync(submission: OfflineQuizSubmission): Promise<void> {
    try {
      const syncItem: SyncQueueItem = {
        id: `submission-sync-${submission.id}`,
        type: 'quiz_submission',
        data: submission,
        priority: 'high',
        createdAt: new Date(),
        attempts: 0,
        maxAttempts: 3
      };

      await offlineDatabase.addToSyncQueue(syncItem);
      
      // Trigger immediate sync if online
      if (navigator.onLine) {
        setTimeout(() => syncEngine.syncQuizSubmissions(), 1000);
      }
    } catch (error) {
      console.error('[OfflineProgressTracker] Failed to queue submission for sync:', error);
    }
  }

  // Validation methods
  async validateQuizAnswers(
    answers: OfflineQuizAnswer[],
    courseId: string,
    contentId: string
  ): Promise<{
    isValid: boolean;
    score: number;
    totalPoints: number;
    feedback: Array<{
      questionId: string;
      isCorrect: boolean;
      correctAnswer?: string;
      explanation?: string;
    }>;
  }> {
    try {
      // Get the course to access quiz questions
      const course = await offlineDatabase.getCourse(courseId);
      if (!course) {
        throw new Error('Course not found');
      }

      // Find the quiz content item
      let quizQuestions: any[] = [];
      
      for (const section of course.sections) {
        for (const lesson of section.lessons) {
          for (const contentItem of lesson.contentItems) {
            if (contentItem.id === contentId && contentItem.quiz) {
              quizQuestions = contentItem.quiz.questions;
              break;
            }
          }
        }
      }

      if (quizQuestions.length === 0) {
        throw new Error('Quiz questions not found');
      }

      // Validate answers and calculate score
      let score = 0;
      let totalPoints = 0;
      const feedback: Array<{
        questionId: string;
        isCorrect: boolean;
        correctAnswer?: string;
        explanation?: string;
      }> = [];

      for (const answer of answers) {
        const question = quizQuestions.find(q => q.id === answer.questionId);
        if (!question) continue;

        const points = question.points || 1;
        totalPoints += points;

        const isCorrect = this.checkAnswer(answer.answer, question);
        if (isCorrect) {
          score += points;
        }

        feedback.push({
          questionId: answer.questionId,
          isCorrect,
          correctAnswer: question.correct_answer,
          explanation: question.explanation
        });
      }

      return {
        isValid: true,
        score,
        totalPoints,
        feedback
      };
    } catch (error) {
      console.error('[OfflineProgressTracker] Failed to validate quiz answers:', error);
      return {
        isValid: false,
        score: 0,
        totalPoints: 0,
        feedback: []
      };
    }
  }

  private checkAnswer(userAnswer: string, question: any): boolean {
    const correctAnswer = question.correct_answer;
    
    switch (question.type) {
      case 'multiple_choice':
        return userAnswer === correctAnswer;
      
      case 'true_false':
        return userAnswer.toLowerCase() === correctAnswer.toLowerCase();
      
      case 'short_answer':
        // Simple text comparison - could be enhanced with fuzzy matching
        return userAnswer.toLowerCase().trim() === correctAnswer.toLowerCase().trim();
      
      default:
        return false;
    }
  }

  // Statistics and reporting
  async getProgressStatistics(userId: string): Promise<{
    dailyProgress: Array<{ date: string; itemsCompleted: number }>;
    weeklyProgress: Array<{ week: string; itemsCompleted: number }>;
    courseProgress: Array<{ courseId: string; courseName: string; percentage: number }>;
    timeSpentByCourse: Array<{ courseId: string; courseName: string; timeSpent: number }>;
  }> {
    try {
      const allProgress = await offlineDatabase.getProgress(userId);
      const courses = await offlineDatabase.getAllCourses();
      
      // Create course name lookup
      const courseNames = new Map(courses.map(c => [c.id, c.title]));

      // Daily progress (last 30 days)
      const dailyProgress = this.calculateDailyProgress(allProgress, 30);
      
      // Weekly progress (last 12 weeks)
      const weeklyProgress = this.calculateWeeklyProgress(allProgress, 12);
      
      // Course progress percentages
      const courseProgress = this.calculateCourseProgress(allProgress, courseNames);
      
      // Time spent by course
      const timeSpentByCourse = this.calculateTimeSpentByCourse(allProgress, courseNames);

      return {
        dailyProgress,
        weeklyProgress,
        courseProgress,
        timeSpentByCourse
      };
    } catch (error) {
      console.error('[OfflineProgressTracker] Failed to get progress statistics:', error);
      return {
        dailyProgress: [],
        weeklyProgress: [],
        courseProgress: [],
        timeSpentByCourse: []
      };
    }
  }

  private calculateDailyProgress(progress: OfflineProgress[], days: number): Array<{ date: string; itemsCompleted: number }> {
    const result: Array<{ date: string; itemsCompleted: number }> = [];
    const now = new Date();

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dateString = date.toISOString().split('T')[0];

      const itemsCompleted = progress.filter(p => 
        p.completed && 
        p.completedAt.toISOString().split('T')[0] === dateString
      ).length;

      result.push({ date: dateString, itemsCompleted });
    }

    return result;
  }

  private calculateWeeklyProgress(progress: OfflineProgress[], weeks: number): Array<{ week: string; itemsCompleted: number }> {
    const result: Array<{ week: string; itemsCompleted: number }> = [];
    const now = new Date();

    for (let i = weeks - 1; i >= 0; i--) {
      const weekStart = new Date(now);
      weekStart.setDate(weekStart.getDate() - (weekStart.getDay() + 7 * i));
      weekStart.setHours(0, 0, 0, 0);

      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);
      weekEnd.setHours(23, 59, 59, 999);

      const weekString = `${weekStart.toISOString().split('T')[0]} - ${weekEnd.toISOString().split('T')[0]}`;

      const itemsCompleted = progress.filter(p => 
        p.completed && 
        p.completedAt >= weekStart && 
        p.completedAt <= weekEnd
      ).length;

      result.push({ week: weekString, itemsCompleted });
    }

    return result;
  }

  private calculateCourseProgress(progress: OfflineProgress[], courseNames: Map<string, string>): Array<{ courseId: string; courseName: string; percentage: number }> {
    const courseProgress = new Map<string, { completed: number; total: number }>();

    for (const p of progress) {
      if (!courseProgress.has(p.courseId)) {
        courseProgress.set(p.courseId, { completed: 0, total: 0 });
      }

      const stats = courseProgress.get(p.courseId)!;
      stats.total++;
      if (p.completed) {
        stats.completed++;
      }
    }

    return Array.from(courseProgress.entries()).map(([courseId, stats]) => ({
      courseId,
      courseName: courseNames.get(courseId) || 'Unknown Course',
      percentage: stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0
    }));
  }

  private calculateTimeSpentByCourse(progress: OfflineProgress[], courseNames: Map<string, string>): Array<{ courseId: string; courseName: string; timeSpent: number }> {
    const timeSpent = new Map<string, number>();

    for (const p of progress) {
      if (p.timeSpent) {
        timeSpent.set(p.courseId, (timeSpent.get(p.courseId) || 0) + p.timeSpent);
      }
    }

    return Array.from(timeSpent.entries()).map(([courseId, time]) => ({
      courseId,
      courseName: courseNames.get(courseId) || 'Unknown Course',
      timeSpent: time
    }));
  }
}

// Export singleton instance
export const offlineProgressTracker = new OfflineProgressTrackerService();
