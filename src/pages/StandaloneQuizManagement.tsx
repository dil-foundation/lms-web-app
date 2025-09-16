import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Plus, 
  Search, 
  Filter, 
  MoreHorizontal, 
  Edit, 
  Trash2, 
  Eye, 
  BarChart3,
  Users,
  Clock,
  Target,
  CheckCircle,
  XCircle,
  AlertCircle,
  Play,
  Pause
} from 'lucide-react';
import { StandaloneQuizService } from '@/services/standaloneQuizService';
import { 
  StandaloneQuiz, 
  QuizStatistics, 
  QuizPerformanceAnalytics,
  QuestionPerformanceAnalytics,
  StandaloneQuizAttempt
} from '@/types/standaloneQuiz';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { StandaloneQuizManualGradingEnhanced } from '@/components/standaloneQuiz/StandaloneQuizManualGradingEnhanced';

const StandaloneQuizManagement: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const [quizzes, setQuizzes] = useState<StandaloneQuiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [activeTab, setActiveTab] = useState('quizzes');

  // Handle URL parameters for tab selection
  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam && ['quizzes', 'analytics', 'attempts', 'grading'].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  // Load quizzes
  useEffect(() => {
    if (user?.id) {
      loadQuizzes();
    }
  }, [user?.id]);

  const loadQuizzes = async () => {
    try {
      setLoading(true);
      // Use getUserAccessibleQuizzes to show quizzes where teacher has access
      // (either as author or through access management)
      const quizData = await StandaloneQuizService.getUserAccessibleQuizzes(user!.id);
      setQuizzes(quizData);
    } catch (error) {
      console.error('Error loading quizzes:', error);
      toast.error('Failed to load quizzes');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateQuiz = () => {
    navigate('/dashboard/quiz-builder');
  };

  const handleEditQuiz = (quizId: string) => {
    navigate(`/dashboard/quiz-builder/${quizId}`);
  };

  const handleDeleteQuiz = async (quizId: string) => {
    if (!confirm('Are you sure you want to delete this quiz? This action cannot be undone.')) {
      return;
    }

    try {
      await StandaloneQuizService.deleteQuiz(quizId);
      toast.success('Quiz deleted successfully');
      loadQuizzes();
    } catch (error) {
      console.error('Error deleting quiz:', error);
      toast.error('Failed to delete quiz');
    }
  };


  const handlePublishQuiz = async (quizId: string) => {
    try {
      await StandaloneQuizService.publishQuiz(quizId);
      toast.success('Quiz published successfully');
      loadQuizzes();
    } catch (error) {
      console.error('Error publishing quiz:', error);
      toast.error('Failed to publish quiz');
    }
  };

  const handleUnpublishQuiz = async (quizId: string) => {
    try {
      await StandaloneQuizService.unpublishQuiz(quizId);
      toast.success('Quiz unpublished successfully');
      loadQuizzes();
    } catch (error) {
      console.error('Error unpublishing quiz:', error);
      toast.error('Failed to unpublish quiz');
    }
  };


  const filteredQuizzes = quizzes.filter(quiz => {
    const matchesSearch = quiz.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         quiz.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || quiz.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'published':
        return <Badge className="bg-green-100 text-green-800"><CheckCircle className="h-3 w-3 mr-1" />Published</Badge>;
      case 'draft':
        return <Badge variant="secondary"><Edit className="h-3 w-3 mr-1" />Draft</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getDifficultyBadge = (difficulty: string) => {
    switch (difficulty) {
      case 'easy':
        return <Badge variant="outline" className="text-green-600">Easy</Badge>;
      case 'medium':
        return <Badge variant="outline" className="text-yellow-600">Medium</Badge>;
      case 'hard':
        return <Badge variant="outline" className="text-red-600">Hard</Badge>;
      default:
        return <Badge variant="outline">{difficulty}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Quiz Management</h1>
          <p className="text-muted-foreground">
            Create, manage, and analyze your standalone quizzes
          </p>
        </div>
        <Button onClick={handleCreateQuiz} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Create Quiz
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="quizzes">My Quizzes</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="attempts">Attempts</TabsTrigger>
          <TabsTrigger value="grading">Manual Grading</TabsTrigger>
        </TabsList>

        <TabsContent value="quizzes" className="space-y-6">
          {/* Filters */}
          <Card>
            <CardContent className="p-4">
              <div className="flex gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search quizzes..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="published">Published</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Quiz List */}
          {filteredQuizzes.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No quizzes found</h3>
                <p className="text-muted-foreground mb-4">
                  {quizzes.length === 0 
                    ? "You haven't created any quizzes yet."
                    : "No quizzes match your current filters."
                  }
                </p>
                {quizzes.length === 0 && (
                  <Button onClick={handleCreateQuiz}>
                    Create Your First Quiz
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {filteredQuizzes.map((quiz) => (
                <QuizCard
                  key={quiz.id}
                  quiz={quiz}
                  onEdit={handleEditQuiz}
                  onDelete={handleDeleteQuiz}
                  onPublish={handlePublishQuiz}
                  onUnpublish={handleUnpublishQuiz}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="analytics">
          <QuizAnalytics quizzes={quizzes} />
        </TabsContent>

        <TabsContent value="attempts">
          <QuizAttempts quizzes={quizzes} />
        </TabsContent>

        <TabsContent value="grading">
          <StandaloneQuizManualGradingEnhanced />
        </TabsContent>

      </Tabs>
    </div>
  );
};

// Quiz Card Component
interface QuizCardProps {
  quiz: StandaloneQuiz;
  onEdit: (quizId: string) => void;
  onDelete: (quizId: string) => void;
  onPublish: (quizId: string) => void;
  onUnpublish: (quizId: string) => void;
}

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'published':
      return <Badge className="bg-green-100 text-green-800"><CheckCircle className="h-3 w-3 mr-1" />Published</Badge>;
    case 'draft':
      return <Badge variant="secondary"><Edit className="h-3 w-3 mr-1" />Draft</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
};

const getDifficultyBadge = (difficulty: string) => {
  switch (difficulty) {
    case 'easy':
      return <Badge variant="outline" className="text-green-600">Easy</Badge>;
    case 'medium':
      return <Badge variant="outline" className="text-yellow-600">Medium</Badge>;
    case 'hard':
      return <Badge variant="outline" className="text-red-600">Hard</Badge>;
    default:
      return <Badge variant="outline">{difficulty}</Badge>;
  }
};

const QuizCard: React.FC<QuizCardProps> = ({
  quiz,
  onEdit,
  onDelete,
  onPublish,
  onUnpublish
}) => {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg">{quiz.title}</CardTitle>
            {quiz.description && (
              <CardDescription className="mt-1">{quiz.description}</CardDescription>
            )}
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(quiz.id)}>
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </DropdownMenuItem>
              {quiz.status === 'draft' && (
                <DropdownMenuItem onClick={() => onPublish(quiz.id)}>
                  <Play className="h-4 w-4 mr-2" />
                  Publish
                </DropdownMenuItem>
              )}
              {quiz.status === 'published' && (
                <DropdownMenuItem onClick={() => onUnpublish(quiz.id)}>
                  <Pause className="h-4 w-4 mr-2" />
                  Unpublish
                </DropdownMenuItem>
              )}
              <DropdownMenuItem 
                onClick={() => onDelete(quiz.id)}
                className="text-red-600"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-4 mb-4">
          {getStatusBadge(quiz.status)}
          {quiz.time_limit_minutes && (
            <Badge variant="outline">
              <Clock className="h-3 w-3 mr-1" />
              {quiz.time_limit_minutes} min
            </Badge>
          )}
        </div>
        
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>Created {new Date(quiz.created_at).toLocaleDateString()}</span>
        </div>
      </CardContent>
    </Card>
  );
};

// Quiz Analytics Component
const QuizAnalytics: React.FC<{ quizzes: StandaloneQuiz[] }> = ({ quizzes }) => {
  const [selectedQuiz, setSelectedQuiz] = useState<string>('');
  const [statistics, setStatistics] = useState<QuizStatistics | null>(null);
  const [performanceAnalytics, setPerformanceAnalytics] = useState<QuizPerformanceAnalytics[]>([]);
  const [questionAnalytics, setQuestionAnalytics] = useState<QuestionPerformanceAnalytics[]>([]);
  const [loading, setLoading] = useState(false);

  const loadAnalytics = async (quizId: string) => {
    setLoading(true);
    try {
      console.log('🔍 [DEBUG] Loading analytics for quiz:', quizId);
      
      const [stats, perf, questions] = await Promise.all([
        StandaloneQuizService.getQuizStatistics(quizId),
        StandaloneQuizService.getQuizPerformanceAnalytics(quizId),
        StandaloneQuizService.getQuestionPerformanceAnalytics(quizId)
      ]);
      
      console.log('🔍 [DEBUG] Analytics data received:', {
        stats,
        perf,
        questions: questions.map(q => ({
          question_id: q.question_id,
          question_text: q.question_text,
          question_type: q.question_type,
          total_attempts: q.total_attempts,
          correct_attempts: q.correct_attempts,
          accuracy_rate: q.accuracy_rate
        }))
      });
      
      setStatistics(stats);
      setPerformanceAnalytics(perf);
      setQuestionAnalytics(questions);
    } catch (error) {
      console.error('Error loading analytics:', error);
      toast.error('Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedQuiz) {
      loadAnalytics(selectedQuiz);
    }
  }, [selectedQuiz]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Quiz Analytics</CardTitle>
          <CardDescription>
            Select a quiz to view detailed analytics
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Select value={selectedQuiz} onValueChange={setSelectedQuiz}>
            <SelectTrigger>
              <SelectValue placeholder="Select a quiz" />
            </SelectTrigger>
            <SelectContent>
              {quizzes.filter(q => q.status === 'published').map(quiz => (
                <SelectItem key={quiz.id} value={quiz.id}>
                  {quiz.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {selectedQuiz && (
        <>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <>
              {statistics && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <Card>
                    <CardContent className="p-4">
                      <div className="text-2xl font-bold">{statistics.total_attempts}</div>
                      <div className="text-sm text-muted-foreground">Total Attempts</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="text-2xl font-bold">{statistics.unique_users}</div>
                      <div className="text-sm text-muted-foreground">Unique Users</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="text-2xl font-bold">{statistics.average_score}%</div>
                      <div className="text-sm text-muted-foreground">Average Score</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="text-2xl font-bold">{statistics.pass_rate}%</div>
                      <div className="text-sm text-muted-foreground">Pass Rate</div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {performanceAnalytics.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Performance Metrics</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Metric</TableHead>
                          <TableHead>Value</TableHead>
                          <TableHead>Description</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {performanceAnalytics.map((metric, index) => (
                          <TableRow key={index}>
                            <TableCell className="font-medium">
                              {metric.metric_name.replace('_', ' ')}
                            </TableCell>
                            <TableCell>{metric.metric_value}</TableCell>
                            <TableCell className="text-muted-foreground">
                              {metric.metric_description}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              )}

              {questionAnalytics.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Question Performance</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Question</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Attempts</TableHead>
                          <TableHead>Correct</TableHead>
                          <TableHead>Accuracy</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {questionAnalytics.map((question, index) => (
                          <TableRow key={index}>
                            <TableCell className="max-w-xs truncate">
                              {question.question_text}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">
                                {question.question_type.replace('_', ' ')}
                              </Badge>
                            </TableCell>
                            <TableCell>{question.total_attempts}</TableCell>
                            <TableCell>{question.correct_attempts}</TableCell>
                            <TableCell>{question.accuracy_rate}%</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
};

// Quiz Attempts Component
const QuizAttempts: React.FC<{ quizzes: StandaloneQuiz[] }> = ({ quizzes }) => {
  const [selectedQuiz, setSelectedQuiz] = useState<string>('');
  const [attempts, setAttempts] = useState<StandaloneQuizAttempt[]>([]);
  const [loading, setLoading] = useState(false);

  const loadAttempts = async (quizId: string) => {
    setLoading(true);
    try {
      console.log('🔍 Loading attempts for quiz:', quizId);
      const attemptData = await StandaloneQuizService.getQuizAttempts(quizId);
      console.log('📊 Attempts loaded:', attemptData);
      setAttempts(attemptData);
    } catch (error) {
      console.error('Error loading attempts:', error);
      toast.error('Failed to load attempts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedQuiz) {
      loadAttempts(selectedQuiz);
    }
  }, [selectedQuiz]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Quiz Attempts</CardTitle>
          <CardDescription>
            View all attempts for a specific quiz
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Select value={selectedQuiz} onValueChange={setSelectedQuiz}>
            <SelectTrigger>
              <SelectValue placeholder="Select a quiz" />
            </SelectTrigger>
            <SelectContent>
              {quizzes.map(quiz => (
                <SelectItem key={quiz.id} value={quiz.id}>
                  {quiz.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {selectedQuiz && (
        <>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Attempt History</CardTitle>
              </CardHeader>
              <CardContent>
                {attempts.length === 0 ? (
                  <div className="text-center py-8">
                    <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No attempts found for this quiz</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>User</TableHead>
                        <TableHead>Attempt</TableHead>
                        <TableHead>Score</TableHead>
                        <TableHead>Time Taken</TableHead>
                        <TableHead>Submitted</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {attempts.map((attempt: any) => (
                        <TableRow key={attempt.id}>
                          <TableCell>
                            <div>
                              <div className="font-medium">{attempt.user_name || 'Unknown User'}</div>
                              <div className="text-sm text-muted-foreground">{attempt.user_email || 'No email'}</div>
                            </div>
                          </TableCell>
                          <TableCell>{attempt.attempt_number}</TableCell>
                          <TableCell>
                            {attempt.score ? `${attempt.score}%` : 'N/A'}
                          </TableCell>
                          <TableCell>
                            {attempt.time_taken_minutes ? `${attempt.time_taken_minutes} min` : 'N/A'}
                          </TableCell>
                          <TableCell>
                            {attempt.submitted_at ? new Date(attempt.submitted_at).toLocaleDateString() : 'N/A'}
                          </TableCell>
                          <TableCell>
                            {attempt.score && attempt.score >= 70 ? (
                              <Badge className="bg-green-100 text-green-800">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Passed
                              </Badge>
                            ) : (
                              <Badge variant="outline">
                                <XCircle className="h-3 w-3 mr-1" />
                                Failed
                              </Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
};


export default StandaloneQuizManagement;
