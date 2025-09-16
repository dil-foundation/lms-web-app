import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  Target, 
  BookOpen, 
  ArrowLeft, 
  RotateCcw,
  Trophy,
  TrendingUp,
  Calendar,
  User,
  Eye,
  EyeOff
} from 'lucide-react';
import { StandaloneQuizService } from '@/services/standaloneQuizService';
import { 
  StandaloneQuiz, 
  StandaloneQuizQuestion, 
  QuizResult,
  QuizAttemptWithDetails 
} from '@/types/standaloneQuiz';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface QuizResultsProps {
  quizId: string;
  attemptId?: string;
  onRetake?: () => void;
  onBack?: () => void;
}

interface QuestionResult {
  question: StandaloneQuizQuestion;
  userAnswer: any;
  isCorrect: boolean;
  points: number;
  explanation?: string;
}

const QuizResults: React.FC<QuizResultsProps> = ({
  quizId,
  attemptId,
  onRetake,
  onBack
}) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [quiz, setQuiz] = useState<StandaloneQuiz | null>(null);
  const [questions, setQuestions] = useState<StandaloneQuizQuestion[]>([]);
  const [attempt, setAttempt] = useState<QuizAttemptWithDetails | null>(null);
  const [questionResults, setQuestionResults] = useState<QuestionResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAnswers, setShowAnswers] = useState(false);

  useEffect(() => {
    loadResults();
  }, [quizId, attemptId]);

  const loadResults = async () => {
    try {
      setLoading(true);
      
      // Load quiz data
      const quizData = await StandaloneQuizService.getQuizWithQuestions(quizId);
      setQuiz(quizData);
      setQuestions(quizData.questions || []);
      
      // Load attempt data
      let attemptData: QuizAttemptWithDetails | null = null;
      if (attemptId) {
        attemptData = await StandaloneQuizService.getQuizAttempt(attemptId);
        if (!attemptData) {
          toast.error('Quiz attempt not found');
          onBack?.();
          return;
        }
      } else {
        // Get latest attempt for this quiz
        const userAttempts = await StandaloneQuizService.getUserAttempts(user!.id);
        const latestAttempt = userAttempts
          .filter(a => a.quiz_id === quizId)
          .sort((a, b) => new Date(b.submitted_at || b.created_at).getTime() - new Date(a.submitted_at || a.created_at).getTime())[0];
        
        if (!latestAttempt) {
          toast.error('No quiz attempt found');
          onBack?.();
          return;
        }
        
        // Create QuizAttemptWithDetails by adding the quiz data
        attemptData = {
          ...latestAttempt,
          quiz: quizData
        };
      }
      
      setAttempt(attemptData);
      
      if (attemptData && quizData.questions) {
        // Process question results
        const results = quizData.questions.map(question => {
          const userAnswer = attemptData.answers?.[question.id];
          const isCorrect = evaluateAnswer(question, userAnswer, attemptData);
          const points = isCorrect ? question.points : 0;
          
          return {
            question,
            userAnswer,
            isCorrect,
            points,
            explanation: question.explanation
          };
        });
        
        setQuestionResults(results);
      }
    } catch (error) {
      console.error('Error loading results:', error);
      toast.error('Failed to load quiz results');
    } finally {
      setLoading(false);
    }
  };

  const evaluateAnswer = (question: StandaloneQuizQuestion, userAnswer: any, attempt?: QuizAttemptWithDetails): boolean => {
    if (!userAnswer) return false;

    switch (question.question_type) {
      case 'single_choice':
        const selectedOption = question.options?.find(opt => opt.id === userAnswer.selectedOptions?.[0]);
        return selectedOption?.is_correct || false;
        
      case 'multiple_choice':
        const correctOptions = question.options?.filter(opt => opt.is_correct).map(opt => opt.id) || [];
        const userOptions = userAnswer.selectedOptions || [];
        return correctOptions.length === userOptions.length && 
               correctOptions.every(id => userOptions.includes(id));
               
      case 'text_answer':
        // For text answers, if manual grading is required and not completed, 
        // we can't determine correctness yet - use the actual results from attempt
        if (attempt?.manual_grading_required && !attempt?.manual_grading_completed) {
          // Check if we have actual results from the attempt
          if (attempt.results && Array.isArray(attempt.results)) {
            const result = attempt.results.find(r => r.question_id === question.id);
            return result ? result.earned_points > 0 : false;
          }
          // If no results yet, return false (pending manual grading)
          return false;
        }
        // For completed manual grading or auto-graded text answers
        return userAnswer.textAnswer && userAnswer.textAnswer.trim().length > 0;
        
      case 'math_expression':
        // For math expressions, we'll consider it correct if there's any expression
        // In a real implementation, you'd want to evaluate the mathematical expression
        return userAnswer.mathExpression && userAnswer.mathExpression.trim().length > 0;
        
      default:
        return false;
    }
  };

  const getScoreColor = (score: number, passingScore: number) => {
    if (score >= passingScore) return 'text-green-600';
    if (score >= passingScore * 0.8) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBadge = (score: number, passingScore: number) => {
    if (score >= passingScore) {
      return <Badge className="bg-green-100 text-green-800 border-green-200">Passed</Badge>;
    }
    return <Badge variant="destructive" className="bg-red-100 text-red-800 border-red-200">Failed</Badge>;
  };

  const formatDuration = (startTime: string, endTime?: string) => {
    try {
      const start = new Date(startTime);
      const end = endTime ? new Date(endTime) : new Date();
      
      // Check if dates are valid
      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        return '0:00';
      }
      
      const durationMs = end.getTime() - start.getTime();
      
      // Handle negative duration (shouldn't happen but just in case)
      if (durationMs < 0) {
        return '0:00';
      }
      
      const minutes = Math.floor(durationMs / 60000);
      const seconds = Math.floor((durationMs % 60000) / 1000);
      return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    } catch (error) {
      console.error('Error formatting duration:', error);
      return '0:00';
    }
  };

  const canRetake = () => {
    if (!quiz || !attempt) {
      console.log('🔍 canRetake: false - missing quiz or attempt', { quiz: !!quiz, attempt: !!attempt });
      return false;
    }
    
    const canRetakeResult = quiz.allow_retake && attempt.score < quiz.passing_score;
    console.log('🔍 canRetake check:', {
      allow_retake: quiz.allow_retake,
      score: attempt.score,
      passing_score: quiz.passing_score,
      canRetake: canRetakeResult
    });
    
    return canRetakeResult;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!quiz || !attempt) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-8 text-center">
            <XCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">Results not found</h3>
            <p className="text-muted-foreground">
              Unable to load quiz results. Please try again.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Use the actual score from the attempt data instead of recalculating
  const actualScore = attempt?.score || 0;
  const totalPoints = questions.reduce((sum, q) => sum + q.points, 0);
  
  // Calculate earned points from attempt results if available, otherwise from question results
  let earnedPoints = 0;
  if (attempt?.results && Array.isArray(attempt.results)) {
    // Use the actual results from the attempt
    earnedPoints = attempt.results.reduce((sum, r) => sum + (r.earned_points || 0), 0);
  } else {
    // Fallback to calculated results
    earnedPoints = questionResults.reduce((sum, r) => sum + r.points, 0);
  }
  
  // Use actual score if available, otherwise calculate from question results
  const scorePercentage = actualScore > 0 ? actualScore : (totalPoints > 0 ? (earnedPoints / totalPoints) * 100 : 0);
  
  console.log('🔍 QuizResults Score Debug:', {
    actualScore,
    calculatedScore: totalPoints > 0 ? (earnedPoints / totalPoints) * 100 : 0,
    totalPoints,
    earnedPoints,
    questionResults: questionResults.map(r => ({
      questionId: r.question.id,
      isCorrect: r.isCorrect,
      points: r.points
    })),
    attemptData: attempt ? {
      id: attempt.id,
      score: attempt.score,
      answers: attempt.answers,
      results: attempt.results
    } : null
  });

  return (
    <div className="container mx-auto p-6 max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Quiz Results</h1>
          <p className="text-muted-foreground mt-1">{quiz.title}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowAnswers(!showAnswers)}>
            {showAnswers ? <EyeOff className="h-4 w-4 mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
            {showAnswers ? 'Hide' : 'Show'} Answers
          </Button>
          <Button variant="outline" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Quizzes
          </Button>
        </div>
      </div>

      {/* Score Summary */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5" />
              Your Score
            </CardTitle>
            {getScoreBadge(scorePercentage, quiz.passing_score)}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Score Circle */}
          <div className="flex items-center justify-center">
            <div className="relative w-32 h-32">
              <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  stroke="currentColor"
                  strokeWidth="8"
                  fill="none"
                  className="text-muted-foreground/20"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  stroke="currentColor"
                  strokeWidth="8"
                  fill="none"
                  strokeDasharray={`${2 * Math.PI * 40}`}
                  strokeDashoffset={`${2 * Math.PI * 40 * (1 - scorePercentage / 100)}`}
                  className={getScoreColor(scorePercentage, quiz.passing_score)}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  {attempt?.manual_grading_required && !attempt?.manual_grading_completed ? (
                    <div className="text-center">
                      <div className="text-2xl font-bold text-orange-600">
                        Pending
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Manual Grading
                      </div>
                    </div>
                  ) : (
                    <div className="text-center">
                      <div className={`text-2xl font-bold ${getScoreColor(scorePercentage, quiz.passing_score)}`}>
                        {scorePercentage.toFixed(1)}%
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {earnedPoints}/{totalPoints} pts
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Score Details */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {attempt?.results && Array.isArray(attempt.results) 
                  ? attempt.results.filter(r => {
                      const question = questions.find(q => q.id === r.question_id);
                      const isTextAnswerPending = question?.question_type === 'text_answer' && 
                        attempt?.manual_grading_required && !attempt?.manual_grading_completed;
                      
                      // For text answers: if manual grading is completed, count based on earned_points
                      if (question?.question_type === 'text_answer' && attempt?.manual_grading_completed) {
                        return r.earned_points > 0;
                      }
                      // For text answers pending grading, don't count as correct
                      if (question?.question_type === 'text_answer' && isTextAnswerPending) {
                        return false;
                      }
                      // For other question types, count as correct if earned_points > 0
                      return r.earned_points > 0;
                    }).length
                  : questionResults.filter(r => r.isCorrect).length}
              </div>
              <div className="text-sm text-muted-foreground">Correct Answers</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">
                {attempt?.results && Array.isArray(attempt.results) 
                  ? attempt.results.filter(r => {
                      const question = questions.find(q => q.id === r.question_id);
                      const isTextAnswerPending = question?.question_type === 'text_answer' && 
                        attempt?.manual_grading_required && !attempt?.manual_grading_completed;
                      
                      // For text answers: if manual grading is completed, count as incorrect if earned_points === 0
                      if (question?.question_type === 'text_answer' && attempt?.manual_grading_completed) {
                        return r.earned_points === 0;
                      }
                      // For text answers pending grading, don't count as incorrect
                      if (question?.question_type === 'text_answer' && isTextAnswerPending) {
                        return false;
                      }
                      // For other question types, count as incorrect if earned_points === 0
                      return r.earned_points === 0;
                    }).length
                  : questionResults.filter(r => !r.isCorrect).length}
              </div>
              <div className="text-sm text-muted-foreground">Incorrect Answers</div>
            </div>
            {attempt?.manual_grading_required && !attempt?.manual_grading_completed && (
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">
                  {questions.filter(q => q.question_type === 'text_answer').length}
                </div>
                <div className="text-sm text-muted-foreground">Pending Grading</div>
              </div>
            )}
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {formatDuration(attempt.created_at, attempt.submitted_at)}
              </div>
              <div className="text-sm text-muted-foreground">Time Taken</div>
            </div>
          </div>

          {/* Progress Bar */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Score Progress</span>
              <span className="text-sm text-muted-foreground">
                {attempt?.manual_grading_required && !attempt?.manual_grading_completed 
                  ? 'Pending Manual Grading' 
                  : `${scorePercentage.toFixed(1)}% / ${quiz.passing_score}% required`
                }
              </span>
            </div>
            <Progress value={attempt?.manual_grading_required && !attempt?.manual_grading_completed ? 0 : scorePercentage} className="h-2" />
          </div>

          {/* Manual Grading Status Alert */}
          {attempt?.manual_grading_required && !attempt?.manual_grading_completed && (
            <div className="mt-4 p-4 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-700 rounded-lg">
              <div className="flex items-center gap-2 text-orange-700 dark:text-orange-300">
                <Clock className="h-5 w-5" />
                <div>
                  <p className="font-medium">Manual Grading Required</p>
                  <p className="text-sm">Your quiz contains text answer questions that require manual grading by your teacher. Your final score will be available once grading is complete.</p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quiz Information */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm text-muted-foreground">Total Questions</p>
                <p className="text-xl font-bold">{questions.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Target className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm text-muted-foreground">Passing Score</p>
                <p className="text-xl font-bold">{quiz.passing_score}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-orange-600" />
              <div>
                <p className="text-sm text-muted-foreground">Completed</p>
                <p className="text-xl font-bold">
                  {new Date(attempt.submitted_at || attempt.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Question Results */}
      {showAnswers && (
        <Card>
          <CardHeader>
            <CardTitle>Question Review</CardTitle>
            <CardDescription>
              Review your answers and see the correct solutions
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {questionResults.map((result, index) => (
              <div key={result.question.id} className="space-y-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-medium">Question {index + 1}</span>
                      <Badge variant="secondary">{result.question.points} pts</Badge>
                      {result.isCorrect ? (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-600" />
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">
                      {result.question.question_text}
                    </p>
                  </div>
                </div>

                {/* Answer Display */}
                <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Your Answer:</p>
                    <div className="mt-1">
                      {result.question.question_type === 'single_choice' && (
                        <div>
                          {result.question.options?.map(option => (
                            <div
                              key={option.id}
                              className={`p-2 rounded ${
                                result.userAnswer?.selectedOptions?.[0] === option.id
                                  ? option.is_correct
                                    ? 'bg-green-100 text-green-800 border border-green-300'
                                    : 'bg-red-100 text-red-800 border border-red-300'
                                  : option.is_correct
                                  ? 'bg-green-50 text-green-700 border border-green-200'
                                  : 'bg-gray-50'
                              }`}
                            >
                              {option.option_text}
                              {option.is_correct && (
                                <CheckCircle className="h-4 w-4 inline ml-2 text-green-600" />
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                      
                      {result.question.question_type === 'multiple_choice' && (
                        <div>
                          {result.question.options?.map(option => (
                            <div
                              key={option.id}
                              className={`p-2 rounded ${
                                result.userAnswer?.selectedOptions?.includes(option.id)
                                  ? option.is_correct
                                    ? 'bg-green-100 text-green-800 border border-green-300'
                                    : 'bg-red-100 text-red-800 border border-red-300'
                                  : option.is_correct
                                  ? 'bg-green-50 text-green-700 border border-green-200'
                                  : 'bg-gray-50'
                              }`}
                            >
                              {option.option_text}
                              {option.is_correct && (
                                <CheckCircle className="h-4 w-4 inline ml-2 text-green-600" />
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                      
                      {result.question.question_type === 'text_answer' && (
                        <p className="p-2 bg-gray-100 rounded">
                          {result.userAnswer?.textAnswer || 'No answer provided'}
                        </p>
                      )}
                      
                      {result.question.question_type === 'math_expression' && (
                        <p className="p-2 bg-gray-100 rounded font-mono">
                          {result.userAnswer?.mathExpression || 'No answer provided'}
                        </p>
                      )}
                    </div>
                  </div>

                  {result.explanation && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Explanation:</p>
                      <p className="text-sm mt-1 p-2 bg-blue-50 rounded">
                        {result.explanation}
                      </p>
                    </div>
                  )}
                </div>

                {index < questionResults.length - 1 && <Separator />}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        {canRetake() && (
          <Button onClick={onRetake}>
            <RotateCcw className="h-4 w-4 mr-2" />
            Retake Quiz
          </Button>
        )}
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Quizzes
        </Button>
      </div>
    </div>
  );
};

export default QuizResults;
