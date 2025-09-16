// Types for Quiz Retry System

export interface QuizRetrySettings {
  allowRetries: boolean;
  maxRetries: number; // 1-3 attempts
  retryCooldownHours: number; // 24-48 hours
  retryThreshold: number; // Only allow retries below this score (0-100)
  requireTeacherApproval: boolean;
  generateNewQuestions: boolean;
  requireStudyMaterials: boolean;
  studyMaterialsRequired: string[]; // IDs of required study materials
}

export interface QuizAttempt {
  id: string;
  userId: string;
  lessonContentId: string;
  attemptNumber: number;
  answers: Record<string, any>;
  results: Record<string, boolean>;
  score: number | null;
  submittedAt: string;
  retryReason?: string;
  teacherApprovalRequired: boolean;
  teacherApproved: boolean;
  teacherApprovedBy?: string;
  teacherApprovedAt?: string;
  teacherApprovalNotes?: string;
  studyMaterialsCompleted: boolean;
  studyMaterialsCompletedAt?: string;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
  updatedAt: string;
}

export interface QuizRetryRequest {
  id: string;
  userId: string;
  lessonContentId: string;
  currentAttemptId: string;
  requestReason: string;
  requestedAt: string;
  status: 'pending' | 'approved' | 'rejected' | 'expired';
  reviewedBy?: string;
  reviewedAt?: string;
  reviewNotes?: string;
  expiresAt: string;
  createdAt: string;
}

export interface RetryEligibility {
  canRetry: boolean;
  reason?: string;
  retryAfter?: string;
  requiresApproval?: boolean;
  currentAttempts?: number;
  maxRetries?: number;
  retryThreshold?: number;
}

export interface CreateAttemptResult {
  success: boolean;
  attemptId?: string;
  attemptNumber?: number;
  requiresApproval?: boolean;
  error?: string;
}

export interface ReviewRequestResult {
  success: boolean;
  decision?: string;
  attemptId?: string;
  error?: string;
}

export interface QuizRetryAnalytics {
  totalAttempts: number;
  retryAttempts: number;
  averageAttempts: number;
  retrySuccessRate: number;
  commonRetryReasons: Array<{
    reason: string;
    count: number;
  }>;
  suspiciousPatterns: Array<{
    pattern: string;
    description: string;
    severity: 'low' | 'medium' | 'high';
  }>;
}

export const DEFAULT_RETRY_SETTINGS: QuizRetrySettings = {
  allowRetries: false,
  maxRetries: 2,
  retryCooldownHours: 1/60, // 1 minute (1/60 of an hour)
  retryThreshold: 70,
  requireTeacherApproval: false,
  generateNewQuestions: true,
  requireStudyMaterials: false,
  studyMaterialsRequired: []
};
