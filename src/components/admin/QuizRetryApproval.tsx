import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
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
  User, 
  BookOpen, 
  CheckCircle, 
  XCircle,
  AlertTriangle,
  Eye,
  MessageSquare,
  Calendar
} from 'lucide-react';
import { QuizRetryService } from '@/services/quizRetryService';
import { QuizRetryRequest } from '@/types/quizRetry';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

interface QuizRetryApprovalProps {
  courseId?: string;
  onRequestProcessed?: () => void;
}

export const QuizRetryApproval: React.FC<QuizRetryApprovalProps> = ({
  courseId,
  onRequestProcessed
}) => {
  const [requests, setRequests] = useState<QuizRetryRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<QuizRetryRequest | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    loadRequests();
  }, [courseId]);

  const loadRequests = async () => {
    try {
      setLoading(true);
      const pendingRequests = await QuizRetryService.getPendingRetryRequests(courseId);
      setRequests(pendingRequests);
      setError(null);
    } catch (err) {
      setError('Failed to load retry requests');
      console.error('Error loading retry requests:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleReview = async (request: QuizRetryRequest, decision: 'approved' | 'rejected') => {
    try {
      setProcessing(true);
      const result = await QuizRetryService.reviewRetryRequest(
        request.id,
        'current-user-id', // This should come from auth context
        decision,
        reviewNotes || undefined
      );

      if (result.success) {
        toast.success(`Retry request ${decision} successfully`);
        setSelectedRequest(null);
        setReviewNotes('');
        loadRequests();
        onRequestProcessed?.();
      } else {
        toast.error(`Failed to ${decision} retry request: ${result.error}`);
      }
    } catch (err) {
      toast.error(`Failed to ${decision} retry request`);
      console.error('Error reviewing retry request:', err);
    } finally {
      setProcessing(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      case 'expired':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityLevel = (request: QuizRetryRequest) => {
    const requestedAt = new Date(request.requestedAt);
    const now = new Date();
    const hoursSinceRequest = (now.getTime() - requestedAt.getTime()) / (1000 * 60 * 60);
    
    if (hoursSinceRequest > 48) return 'high'; // Over 2 days
    if (hoursSinceRequest > 24) return 'medium'; // Over 1 day
    return 'low';
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RotateCcw className="w-5 h-5" />
            Quiz Retry Requests
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RotateCcw className="w-5 h-5" />
            Quiz Retry Requests
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Review and approve student requests to retry quizzes
          </p>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {requests.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Pending Requests</h3>
              <p className="text-gray-500">All retry requests have been processed.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {requests.map((request) => {
                const priority = getPriorityLevel(request);
                return (
                  <Card key={request.id} className={`border-l-4 ${
                    priority === 'high' ? 'border-l-red-500' :
                    priority === 'medium' ? 'border-l-yellow-500' :
                    'border-l-green-500'
                  }`}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="space-y-2 flex-1">
                          <div className="flex items-center gap-2">
                            <Badge className={getStatusColor(request.status)}>
                              {request.status.toUpperCase()}
                            </Badge>
                            {priority === 'high' && (
                              <Badge variant="destructive">High Priority</Badge>
                            )}
                            {priority === 'medium' && (
                              <Badge variant="secondary">Medium Priority</Badge>
                            )}
                          </div>
                          
                          <div className="space-y-1">
                            <h4 className="font-medium">
                              {request.user?.full_name || request.user?.email || 'Unknown Student'}
                            </h4>
                            <p className="text-sm text-muted-foreground">
                              {request.content?.title || 'Unknown Quiz'}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {request.requestReason}
                            </p>
                          </div>

                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {formatDistanceToNow(new Date(request.requestedAt), { addSuffix: true })}
                            </div>
                            <div className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              Expires {formatDistanceToNow(new Date(request.expiresAt), { addSuffix: true })}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedRequest(request)}
                          >
                            <Eye className="w-4 h-4 mr-1" />
                            Review
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Review Dialog */}
      <Dialog open={!!selectedRequest} onOpenChange={() => setSelectedRequest(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RotateCcw className="w-5 h-5" />
              Review Retry Request
            </DialogTitle>
            <DialogDescription>
              Review the student's request to retry the quiz
            </DialogDescription>
          </DialogHeader>

          {selectedRequest && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Student</Label>
                  <p className="text-sm text-muted-foreground">
                    {selectedRequest.user?.full_name || selectedRequest.user?.email || 'Unknown'}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Quiz</Label>
                  <p className="text-sm text-muted-foreground">
                    {selectedRequest.content?.title || 'Unknown Quiz'}
                  </p>
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium">Request Reason</Label>
                <p className="text-sm text-muted-foreground mt-1 p-3 bg-gray-50 rounded-md">
                  {selectedRequest.requestReason}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Requested</Label>
                  <p className="text-sm text-muted-foreground">
                    {formatDistanceToNow(new Date(selectedRequest.requestedAt), { addSuffix: true })}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Expires</Label>
                  <p className="text-sm text-muted-foreground">
                    {formatDistanceToNow(new Date(selectedRequest.expiresAt), { addSuffix: true })}
                  </p>
                </div>
              </div>

              <Separator />

              <div>
                <Label htmlFor="review-notes" className="text-sm font-medium">
                  Review Notes (Optional)
                </Label>
                <Textarea
                  id="review-notes"
                  placeholder="Add notes about your decision..."
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  className="mt-1"
                  rows={3}
                />
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setSelectedRequest(null)}
              disabled={processing}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => selectedRequest && handleReview(selectedRequest, 'rejected')}
              disabled={processing}
            >
              <XCircle className="w-4 h-4 mr-2" />
              Reject
            </Button>
            <Button
              onClick={() => selectedRequest && handleReview(selectedRequest, 'approved')}
              disabled={processing}
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Approve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
