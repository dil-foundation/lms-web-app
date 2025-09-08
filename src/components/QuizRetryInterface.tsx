import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
  const [showRetryDialog, setShowRetryDialog] = useState(false);
  const [retryReason, setRetryReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadRetryData();
  }, [userId, lessonContentId]);

  const loadRetryData = async () => {
    try {
      setLoading(true);
      const [eligibilityData, attemptsData] = await Promise.all([
        QuizRetryService.checkRetryEligibility(userId, lessonContentId),
        QuizRetryService.getUserAttempts(userId, lessonContentId)
      ]);
      
      setEligibility(eligibilityData);
      setAttempts(attemptsData);
    } catch (error) {
      console.error('Error loading retry data:', error);
      toast.error('Failed to load retry information');
    } finally {
      setLoading(false);
    }
  };

  const handleRetryRequest = async () => {
    if (!retryReason.trim()) {
      toast.error('Please provide a reason for retrying');
      return;
    }

    try {
      setSubmitting(true);
      onRetryRequested?.(retryReason);
      setShowRetryDialog(false);
      setRetryReason('');
      toast.success('Retry request submitted');
    } catch (error) {
      console.error('Error submitting retry request:', error);
      toast.error('Failed to submit retry request');
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

    if (eligibility.requiresApproval) {
      return {
        type: 'warning' as const,
        title: 'Retry Requires Approval',
        message: 'Your retry request will need teacher approval before you can attempt the quiz again',
        icon: Clock
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
    
    if (retryTime <= now) return null;
    
    return formatDistanceToNow(retryTime, { addSuffix: true });
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

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RotateCcw className="w-5 h-5" />
            Quiz Retry Options
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Current Score Display */}
          {currentScore !== undefined && (
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium">Your Score</span>
              </div>
              <Badge variant={currentScore >= 70 ? 'default' : 'destructive'}>
                {currentScore}%
              </Badge>
            </div>
          )}

          {/* Retry Status */}
          {status && (
            <Alert variant={status.type === 'error' ? 'destructive' : status.type === 'warning' ? 'default' : 'default'}>
              <status.icon className="h-4 w-4" />
              <AlertDescription>
                <div className="font-medium">{status.title}</div>
                <div className="text-sm mt-1">{status.message}</div>
              </AlertDescription>
            </Alert>
          )}

          {/* Cooldown Timer */}
          {timeUntilRetry && (
            <Alert>
              <Timer className="h-4 w-4" />
              <AlertDescription>
                You can retry in {timeUntilRetry}
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
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(attempt.submittedAt), { addSuffix: true })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Retry Button */}
          {eligibility.canRetry && !timeUntilRetry && (
            <div className="pt-4">
              <Button 
                onClick={() => setShowRetryDialog(true)}
                className="w-full"
                disabled={submitting}
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                {eligibility.requiresApproval ? 'Request Retry' : 'Retry Quiz'}
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

      {/* Retry Request Dialog */}
      <Dialog open={showRetryDialog} onOpenChange={setShowRetryDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RotateCcw className="w-5 h-5" />
              {eligibility?.requiresApproval ? 'Request Quiz Retry' : 'Retry Quiz'}
            </DialogTitle>
            <DialogDescription>
              {eligibility?.requiresApproval 
                ? 'Please provide a reason for your retry request. Your teacher will review it before approval.'
                : 'Please provide a reason for retrying this quiz.'
              }
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="retry-reason">Reason for Retry</Label>
              <Textarea
                id="retry-reason"
                placeholder="Explain why you want to retry this quiz..."
                value={retryReason}
                onChange={(e) => setRetryReason(e.target.value)}
                rows={3}
                className="mt-1"
              />
            </div>

            {eligibility?.requiresApproval && (
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  Your retry request will be sent to your teacher for approval. 
                  You'll be notified once it's been reviewed.
                </AlertDescription>
              </Alert>
            )}
          </div>

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowRetryDialog(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleRetryRequest}
              disabled={submitting || !retryReason.trim()}
            >
              {submitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Submitting...
                </>
              ) : (
                <>
                  <RotateCcw className="w-4 h-4 mr-2" />
                  {eligibility?.requiresApproval ? 'Submit Request' : 'Start Retry'}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
