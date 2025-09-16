import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Clock, 
  Target, 
  Users, 
  BookOpen, 
  Search,
  Play,
  CheckCircle,
  AlertCircle,
  Calendar
} from 'lucide-react';
import { StandaloneQuizService } from '@/services/standaloneQuizService';
import { StandaloneQuiz, QuizAttemptWithDetails } from '@/types/standaloneQuiz';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface QuizCardProps {
  quiz: StandaloneQuiz;
  onTakeQuiz: (quizId: string) => void;
  userAttempts?: QuizAttemptWithDetails[];
}

const QuizCard: React.FC<QuizCardProps> = ({ quiz, onTakeQuiz, userAttempts = [] }) => {
  const navigate = useNavigate();
  
  // Get user's attempts for this quiz
  const quizAttempts = userAttempts.filter(attempt => attempt.quiz_id === quiz.id);
  const latestAttempt = quizAttempts.length > 0 ? quizAttempts[0] : null;

  // Debug logging for QuizCard
  console.log(`🔍 QuizCard Debug - Quiz: ${quiz.title} (${quiz.id})`);
  console.log('  📊 Quiz Details:', {
    passing_score: quiz.passing_score,
    max_attempts: quiz.max_attempts,
    allow_retake: quiz.allow_retake
  });
  console.log('  📝 All attempts for this quiz:', quizAttempts);
  console.log('  🎯 Latest attempt:', latestAttempt);
  if (latestAttempt) {
    console.log('  📈 Latest attempt details:', {
      id: latestAttempt.id,
      score: latestAttempt.score,
      submitted_at: latestAttempt.submitted_at,
      created_at: latestAttempt.created_at,
      results: latestAttempt.results
    });
  }
  
  const hasPassed = latestAttempt && latestAttempt.score !== null && latestAttempt.score !== undefined && latestAttempt.score >= (quiz.passing_score || 70);
  const hasReachedMaxAttempts = quizAttempts.length >= (quiz.max_attempts || 1);
  const canRetake = quiz.allow_retake && !hasReachedMaxAttempts && !hasPassed;

  console.log('  ✅ Calculated values:', {
    hasPassed,
    hasReachedMaxAttempts,
    canRetake,
    scoreCheck: latestAttempt ? `${latestAttempt.score} >= ${quiz.passing_score || 70}` : 'no attempt'
  });

  const getStatusBadge = () => {
    if (!latestAttempt) {
      return <Badge variant="outline" className="text-blue-600 border-blue-200">Not Started</Badge>;
    }
    
    if (hasPassed) {
      return <Badge variant="default" className="bg-green-100 text-green-800 border-green-200">Passed</Badge>;
    }
    
    if (latestAttempt.score === null || latestAttempt.score === undefined || latestAttempt.score < (quiz.passing_score || 70)) {
      return <Badge variant="destructive" className="bg-red-100 text-red-800 border-red-200">Failed</Badge>;
    }
    
    return <Badge variant="secondary">In Progress</Badge>;
  };

  const getActionButton = () => {
    if (!latestAttempt) {
      return (
        <Button onClick={() => onTakeQuiz(quiz.id)} className="w-full">
          <Play className="h-4 w-4 mr-2" />
          Start Quiz
        </Button>
      );
    }
    
    if (canRetake) {
      return (
        <Button onClick={() => onTakeQuiz(quiz.id)} variant="outline" className="w-full">
          <Play className="h-4 w-4 mr-2" />
          Retake Quiz
        </Button>
      );
    }
    
    return (
      <Button 
        onClick={() => navigate(`/dashboard/quiz-results/${quiz.id}`)} 
        variant="outline" 
        className="w-full"
      >
        <CheckCircle className="h-4 w-4 mr-2" />
        View Results
      </Button>
    );
  };

  return (
    <Card className="h-full hover:shadow-lg transition-shadow duration-200">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg font-semibold line-clamp-2 mb-2">
              {quiz.title}
            </CardTitle>
            {quiz.description && (
              <CardDescription className="line-clamp-2">
                {quiz.description}
              </CardDescription>
            )}
          </div>
          {getStatusBadge()}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Quiz Info */}
        <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
          {quiz.time_limit_minutes && (
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              <span>{quiz.time_limit_minutes} min</span>
            </div>
          )}
          <div className="flex items-center gap-1">
            <Target className="h-3 w-3" />
            <span>{quiz.passing_score || 70}% to pass</span>
          </div>
          <div className="flex items-center gap-1">
            <BookOpen className="h-3 w-3" />
            <span>{quiz.max_attempts || 1} attempt{(quiz.max_attempts || 1) > 1 ? 's' : ''}</span>
          </div>
        </div>

        {/* Attempt Info */}
        {latestAttempt && (
          <div className="bg-muted/50 rounded-lg p-3 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">Latest Score:</span>
              <span className={`font-semibold ${hasPassed ? 'text-green-600' : 'text-red-600'}`}>
                {latestAttempt.score !== null && latestAttempt.score !== undefined ? latestAttempt.score.toFixed(1) : '0.0'}%
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span>Attempts:</span>
              <span>
                {Math.min(quizAttempts.length, quiz.max_attempts || 1)}/{quiz.max_attempts || 1}
                {quizAttempts.length > (quiz.max_attempts || 1) && (
                  <span className="text-orange-600 ml-1" title="More attempts than allowed">
                    ⚠️
                  </span>
                )}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span>Last taken:</span>
              <span>{new Date(latestAttempt.submitted_at || latestAttempt.created_at).toLocaleDateString()}</span>
            </div>
          </div>
        )}

        {/* Action Button */}
        {getActionButton()}
      </CardContent>
    </Card>
  );
};

const StudentQuizzes: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [quizzes, setQuizzes] = useState<StandaloneQuiz[]>([]);
  const [userAttempts, setUserAttempts] = useState<QuizAttemptWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    if (user?.id) {
      loadQuizzes();
      loadUserAttempts();
    }
  }, [user?.id]);

  const loadQuizzes = async () => {
    try {
      setLoading(true);
      const accessibleQuizzes = await StandaloneQuizService.getUserAccessibleQuizzes(user!.id);
      
      // Filter to only show published quizzes for students
      // Teachers and admins can see all quizzes, students only see published ones
      const filteredQuizzes = accessibleQuizzes?.filter(quiz => {
        // If user is student, only show published quizzes
        if (user?.role === 'student') {
          return quiz.status === 'published';
        }
        // Teachers and admins can see all quizzes
        return true;
      }) || [];
      
      setQuizzes(filteredQuizzes);
    } catch (error) {
      console.error('Error loading quizzes:', error);
      toast.error('Failed to load quizzes');
      setQuizzes([]);
    } finally {
      setLoading(false);
    }
  };

  const loadUserAttempts = async () => {
    try {
      console.log('🔄 Loading user attempts for user:', user!.id);
      const attempts = await StandaloneQuizService.getUserAttempts(user!.id);
      console.log('📥 Raw attempts from service:', attempts);
      console.log('📊 Attempts summary:', {
        total: attempts?.length || 0,
        attempts: attempts?.map(a => ({
          id: a.id,
          quiz_id: a.quiz_id,
          score: a.score,
          submitted_at: a.submitted_at,
          results: a.results
        }))
      });
      setUserAttempts((attempts || []) as QuizAttemptWithDetails[]);
    } catch (error) {
      console.error('❌ Error loading user attempts:', error);
      setUserAttempts([]);
    }
  };

  const handleTakeQuiz = (quizId: string) => {
    navigate(`/dashboard/quiz/${quizId}`);
  };

  const filteredQuizzes = quizzes.filter(quiz => {
    const matchesSearch = quiz.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         quiz.description?.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (!matchesSearch) return false;
    
    if (statusFilter === 'all') return true;
    
    const quizAttempts = userAttempts.filter(attempt => attempt.quiz_id === quiz.id);
    const latestAttempt = quizAttempts.length > 0 ? quizAttempts[0] : null;
    
    switch (statusFilter) {
      case 'not_started':
        return !latestAttempt;
      case 'in_progress':
        return latestAttempt && !latestAttempt.submitted_at;
      case 'passed':
        return latestAttempt && latestAttempt.score >= (quiz.passing_score || 70);
      case 'failed':
        return latestAttempt && latestAttempt.score < (quiz.passing_score || 70);
      default:
        return true;
    }
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">My Quizzes</h1>
          <p className="text-muted-foreground mt-1">
            Take quizzes assigned to you and track your progress
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search quizzes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Quizzes</SelectItem>
            <SelectItem value="not_started">Not Started</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="passed">Passed</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm text-muted-foreground">Total Quizzes</p>
                <p className="text-2xl font-bold">{quizzes.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm text-muted-foreground">Passed</p>
                <p className="text-2xl font-bold">
                  {quizzes.filter(quiz => {
                    const attempts = userAttempts.filter(a => a.quiz_id === quiz.id);
                    return attempts.length > 0 && attempts[0].score >= (quiz.passing_score || 70);
                  }).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-600" />
              <div>
                <p className="text-sm text-muted-foreground">Failed</p>
                <p className="text-2xl font-bold">
                  {quizzes.filter(quiz => {
                    const attempts = userAttempts.filter(a => a.quiz_id === quiz.id);
                    return attempts.length > 0 && attempts[0].score < (quiz.passing_score || 70);
                  }).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-orange-600" />
              <div>
                <p className="text-sm text-muted-foreground">In Progress</p>
                <p className="text-2xl font-bold">
                  {quizzes.filter(quiz => {
                    const attempts = userAttempts.filter(a => a.quiz_id === quiz.id);
                    return attempts.length > 0 && !attempts[0].submitted_at;
                  }).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quiz Grid */}
      {filteredQuizzes.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No quizzes found</h3>
            <p className="text-muted-foreground">
              {searchTerm || statusFilter !== 'all' 
                ? 'Try adjusting your search or filter criteria.'
                : 'You don\'t have access to any quizzes yet. Contact your teacher for access.'
              }
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredQuizzes.map((quiz) => (
            <QuizCard
              key={quiz.id}
              quiz={quiz}
              onTakeQuiz={handleTakeQuiz}
              userAttempts={userAttempts}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default StudentQuizzes;
