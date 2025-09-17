import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  RotateCcw, 
  Clock, 
  CheckCircle, 
  XCircle,
  AlertTriangle,
  Info,
  BookOpen,
  Target,
  Timer
} from 'lucide-react';
import { QuizRetryService } from '@/services/quizRetryService';
import { RetryEligibility, QuizAttempt } from '@/types/quizRetry';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';

interface QuizRetryInterfaceProps {
  userId: string;
  lessonContentId: string;
  currentScore?: number;
  onRetryRequested?: (reason: string) => void;
  onRetryApproved?: () => void;
}

export const QuizRetryInterface: React.FC<QuizRetryInterfaceProps> = ({
  userId,
  lessonContentId,
  currentScore,
  onRetryRequested,
  onRetryApproved
}) => {
  const [eligibility, setEligibility] = useState<RetryEligibility | null>(null);
  const [attempts, setAttempts] = useState<QuizAttempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);

  useEffect(() => {
    loadRetryData();
  }, [userId, lessonContentId]);

  // Countdown timer effect
  useEffect(() => {
    if (!eligibility?.retryAfter) {
      setTimeRemaining(null);
      return;
    }

    const retryTime = new Date(eligibility.retryAfter);
    const now = new Date();
    
    // Check if the date is valid
    if (isNaN(retryTime.getTime())) {
      setTimeRemaining(null);
      return;
    }

    const updateTimer = () => {
      const now = new Date();
      const diff = retryTime.getTime() - now.getTime();
      
      if (diff <= 0) {
        setTimeRemaining(0);
        // When timer expires, refresh the eligibility data
        console.log('⏰ TIMER EXPIRED - REFRESHING ELIGIBILITY...');
        // Use a timeout to avoid dependency issues
        setTimeout(() => {
          loadRetryData();
        }, 100);
        return;
      }
      
      setTimeRemaining(diff);
    };

    // Update immediately
    updateTimer();

    // Set up interval to update every second
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [eligibility?.retryAfter]);

  const loadRetryData = async () => {
    try {
      setLoading(true);
      const [eligibilityData, attemptsData] = await Promise.all([
        QuizRetryService.checkRetryEligibility(userId, lessonContentId),
        QuizRetryService.getUserAttempts(userId, lessonContentId)
      ]);
      
      setEligibility(eligibilityData);
      
      // If no attempts found in new system, check legacy quiz_submissions
      if (attemptsData.length === 0) {
        const legacyAttempts = await loadLegacyAttempts();
        setAttempts(legacyAttempts);
      } else {
        setAttempts(attemptsData);
      }
    } catch (error) {
      console.error('Error loading retry data:', error);
      toast.error('Failed to load retry information');
    } finally {
      setLoading(false);
    }
  };

  const loadLegacyAttempts = async (): Promise<QuizAttempt[]> => {
    try {
      const { data, error } = await supabase
        .from('quiz_submissions')
        .select('*')
        .eq('user_id', userId)
        .eq('lesson_content_id', lessonContentId)
        .order('submitted_at', { ascending: true });

      if (error) {
        console.error('Error fetching legacy attempts:', error);
        return [];
      }

      // Convert legacy quiz_submissions to QuizAttempt format
      return data.map((submission: any, index: number) => ({
        id: submission.id,
        userId: submission.user_id,
        lessonContentId: submission.lesson_content_id,
        attemptNumber: index + 1,
        answers: submission.answers,
        results: submission.results,
        score: submission.score,
        submittedAt: submission.submitted_at,
        retryReason: null,
        teacherApprovalRequired: false,
        teacherApproved: false,
        teacherApprovedBy: undefined,
        teacherApprovedAt: undefined,
        teacherApprovalNotes: undefined,
        studyMaterialsCompleted: false,
        studyMaterialsCompletedAt: undefined,
        ipAddress: submission.ip_address,
        userAgent: submission.user_agent,
        createdAt: submission.created_at,
        updatedAt: submission.updated_at
      }));
    } catch (error) {
      console.error('Error loading legacy attempts:', error);
      return [];
    }
  };

  const handleRetryRequest = async () => {
    try {
      setSubmitting(true);
      // Directly start the retry without asking for a reason
      onRetryRequested?.('Automatic retry - no approval required');
      toast.success('Starting quiz retry...');
    } catch (error) {
      console.error('Error starting retry:', error);
      toast.error('Failed to start retry');
    } finally {
      setSubmitting(false);
    }
  };

  const getRetryStatus = () => {
    if (!eligibility) return null;

    if (!eligibility.canRetry) {
      return {
        type: 'error' as const,
        title: 'Retry Not Available',
        message: eligibility.reason || 'You cannot retry this quiz at this time',
        icon: XCircle
      };
    }

    // If cooldown is still active, show cooldown message
    if (timeRemaining !== null && timeRemaining > 0) {
      return {
        type: 'error' as const,
        title: 'Retry Not Available',
        message: 'Cooldown period not yet expired',
        icon: XCircle
      };
    }

    return {
      type: 'success' as const,
      title: 'Retry Available',
      message: `You can retry this quiz (Attempt ${(attempts.length || 0) + 1} of ${eligibility.maxRetries})`,
      icon: CheckCircle
    };
  };

  const getTimeUntilRetry = () => {
    if (!eligibility?.retryAfter) return null;
    
    const retryTime = new Date(eligibility.retryAfter);
    const now = new Date();
    
    // Check if the date is valid
    if (isNaN(retryTime.getTime())) return null;
    if (retryTime <= now) return null;
    
    return formatDistanceToNow(retryTime, { addSuffix: true });
  };

  const formatTimeRemaining = (milliseconds: number): string => {
    if (milliseconds <= 0) return "0:00";
    
    const totalSeconds = Math.floor(milliseconds / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    } else {
      return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-center py-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!eligibility) {
    return null;
  }

  const status = getRetryStatus();
  const timeUntilRetry = getTimeUntilRetry();

  // Only show retry options if student scored below the retry threshold
  const retryThreshold = eligibility.retryThreshold || 70; // Default to 70% if not specified
  const hasValidScore = currentScore !== undefined && currentScore !== null;
  const showRetryOptions = hasValidScore && currentScore < retryThreshold;
  
  // Check if cooldown period has expired or doesn't exist
  const isCooldownExpired = timeRemaining === null || timeRemaining === 0;
  
  // Debug logging
  console.log('🔍 RETRY BUTTON DEBUG:', {
    showRetryOptions,
    canRetry: eligibility?.canRetry,
    timeRemaining,
    isCooldownExpired,
    shouldShowButton: showRetryOptions && eligibility?.canRetry && isCooldownExpired,
    eligibility: eligibility,
    attempts: attempts.length,
    maxRetries: eligibility?.maxRetries,
    currentScore,
    retryThreshold
  });

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RotateCcw className="w-5 h-5" />
            {showRetryOptions ? 'Quiz Retry Options' : hasValidScore ? `Quiz Results (Above ${retryThreshold}% Threshold)` : 'Quiz Results'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Current Score Display */}
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium">Your Score</span>
            </div>
            {hasValidScore ? (
              <Badge variant={currentScore >= 70 ? 'default' : 'destructive'}>
                {currentScore}%
              </Badge>
            ) : (
              <Badge variant="outline">
                Pending
              </Badge>
            )}
          </div>

          {/* Message when score is pending and no retry options */}
          {!hasValidScore && !showRetryOptions && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                Your quiz has been submitted and is awaiting manual grading. Retry options will be available once your score is calculated.
              </AlertDescription>
            </Alert>
          )}

          {/* Message when score is above threshold */}
          {hasValidScore && !showRetryOptions && (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                Great job! You scored {currentScore}%, which is above the {retryThreshold}% threshold. No retry is needed.
              </AlertDescription>
            </Alert>
          )}

          {/* Retry Status - Only show if retry options are available */}
          {showRetryOptions && status && (
            <Alert variant={status.type === 'error' ? 'destructive' : 'default'}>
              <status.icon className="h-4 w-4" />
              <AlertDescription>
                <div className="font-medium">{status.title}</div>
                <div className="text-sm mt-1">{status.message}</div>
              </AlertDescription>
            </Alert>
          )}

          {/* Cooldown Timer - Only show if retry options are available */}
          {showRetryOptions && timeRemaining !== null && timeRemaining > 0 && (
            <Alert>
              <Timer className="h-4 w-4" />
              <AlertDescription>
                <div className="flex items-center justify-between">
                  <span>You can retry in:</span>
                  <span className="font-mono text-lg font-bold text-primary">
                    {formatTimeRemaining(timeRemaining)}
                  </span>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Attempt History */}
          {attempts.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Attempt History</h4>
              <div className="space-y-2">
                {attempts.map((attempt, index) => (
                  <div key={attempt.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">Attempt {attempt.attemptNumber}</span>
                      {attempt.teacherApprovalRequired && (
                        <Badge variant="secondary" className="text-xs">
                          {attempt.teacherApproved ? 'Approved' : 'Pending Approval'}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {attempt.score !== null && (
                        <Badge variant={attempt.score >= 70 ? 'default' : 'destructive'}>
                          {attempt.score}%
                        </Badge>
                      )}
                      <div className="text-xs text-muted-foreground text-right">
                        {(() => {
                          const date = new Date(attempt.submittedAt);
                          if (isNaN(date.getTime())) {
                            return <div>Submitted</div>;
                          }
                          return (
                            <div>
                              <div>{date.toLocaleDateString()} at {date.toLocaleTimeString()}</div>
                              <div className="text-xs opacity-75">{formatDistanceToNow(date, { addSuffix: true })}</div>
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Retry Button - Only show if retry options are available and cooldown has expired */}
          {showRetryOptions && eligibility.canRetry && isCooldownExpired && (
            <div className="pt-4">
              <Button 
                onClick={handleRetryRequest}
                className="w-full"
                disabled={submitting}
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Retry Quiz
              </Button>
            </div>
          )}

          {/* Refresh Button - Show when there's a mismatch between frontend and backend */}
          {showRetryOptions && !eligibility.canRetry && isCooldownExpired && (
            <div className="pt-4">
              <Button 
                onClick={() => {
                  console.log('🔄 REFRESHING RETRY ELIGIBILITY...');
                  loadRetryData();
                }}
                variant="outline"
                className="w-full"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Refresh Retry Status
              </Button>
            </div>
          )}

          {/* Study Materials Notice */}
          {eligibility.canRetry && (
            <Alert>
              <BookOpen className="h-4 w-4" />
              <AlertDescription>
                <div className="text-sm">
                  <strong>Before retrying:</strong> Make sure to review the course materials and 
                  understand the concepts you missed in your previous attempt.
                </div>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

    </>
  );
};
