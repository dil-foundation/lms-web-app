import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  RotateCcw, 
  AlertTriangle,
  CheckCircle,
  Clock,
  Target,
  Activity
} from 'lucide-react';
import { QuizRetryService } from '@/services/quizRetryService';
import { QuizRetryAnalytics } from '@/types/quizRetry';
import { toast } from 'sonner';

interface QuizRetryAnalyticsProps {
  courseId?: string;
  lessonContentId?: string;
  title?: string;
}

export const QuizRetryAnalytics: React.FC<QuizRetryAnalyticsProps> = ({
  courseId,
  lessonContentId,
  title = "Quiz Retry Analytics"
}) => {
  const [analytics, setAnalytics] = useState<QuizRetryAnalytics>({
    totalAttempts: 0,
    retryAttempts: 0,
    averageAttempts: 0,
    retrySuccessRate: 0,
    commonRetryReasons: [],
    suspiciousPatterns: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadAnalytics();
  }, [courseId, lessonContentId]);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      const data = await QuizRetryService.getRetryAnalytics(courseId, lessonContentId);
      setAnalytics(data);
      setError(null);
    } catch (err) {
      setError('Failed to load analytics data');
      console.error('Error loading analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  const getSeverityColor = (severity: 'low' | 'medium' | 'high') => {
    switch (severity) {
      case 'high':
        return 'text-red-600 bg-red-100';
      case 'medium':
        return 'text-yellow-600 bg-yellow-100';
      case 'low':
        return 'text-blue-600 bg-blue-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getSeverityIcon = (severity: 'low' | 'medium' | 'high') => {
    switch (severity) {
      case 'high':
        return <AlertTriangle className="w-4 h-4" />;
      case 'medium':
        return <Clock className="w-4 h-4" />;
      case 'low':
        return <Activity className="w-4 h-4" />;
      default:
        return <Activity className="w-4 h-4" />;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            {title}
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
    <div className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Attempts</p>
                <p className="text-2xl font-bold">{analytics.totalAttempts}</p>
              </div>
              <Target className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Retry Attempts</p>
                <p className="text-2xl font-bold">{analytics.retryAttempts}</p>
              </div>
              <RotateCcw className="w-8 h-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Avg Attempts</p>
                <p className="text-2xl font-bold">{analytics.averageAttempts}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Retry Success Rate</p>
                <p className="text-2xl font-bold">{analytics.retrySuccessRate}%</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Retry Rate Visualization */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Retry Rate Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span>Retry Rate</span>
                <span>{analytics.totalAttempts > 0 ? Math.round((analytics.retryAttempts / analytics.totalAttempts) * 100) : 0}%</span>
              </div>
              <Progress 
                value={analytics.totalAttempts > 0 ? (analytics.retryAttempts / analytics.totalAttempts) * 100 : 0} 
                className="h-2"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">First Attempts</p>
                <p className="font-medium">{analytics.totalAttempts - analytics.retryAttempts}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Retry Attempts</p>
                <p className="font-medium">{analytics.retryAttempts}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Common Retry Reasons */}
      {analytics.commonRetryReasons.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Common Retry Reasons
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {analytics.commonRetryReasons.map((reason, index) => (
                <div key={index} className="flex items-center justify-between">
                  <span className="text-sm">{reason.reason}</span>
                  <Badge variant="secondary">{reason.count} times</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Suspicious Patterns */}
      {analytics.suspiciousPatterns.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              Suspicious Patterns Detected
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Patterns that may indicate academic integrity concerns
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {analytics.suspiciousPatterns.map((pattern, index) => (
                <Alert key={index} variant={pattern.severity === 'high' ? 'destructive' : 'default'}>
                  <div className="flex items-start gap-2">
                    {getSeverityIcon(pattern.severity)}
                    <div className="flex-1">
                      <AlertDescription>
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{pattern.pattern}</span>
                          <Badge className={getSeverityColor(pattern.severity)}>
                            {pattern.severity.toUpperCase()}
                          </Badge>
                        </div>
                        <p className="text-sm mt-1">{pattern.description}</p>
                      </AlertDescription>
                    </div>
                  </div>
                </Alert>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* No Data State */}
      {analytics.totalAttempts === 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <BarChart3 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Data Available</h3>
            <p className="text-gray-500">No quiz attempts have been recorded yet.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
