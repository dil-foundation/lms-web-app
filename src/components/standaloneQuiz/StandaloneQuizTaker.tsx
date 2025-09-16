import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Clock, 
  Target, 
  BookOpen, 
  ArrowLeft, 
  ArrowRight, 
  CheckCircle, 
  AlertCircle,
  Play,
  Pause,
  RotateCcw,
  Calculator,
  Type,
  CheckSquare,
  Circle
} from 'lucide-react';
import { StandaloneQuizService } from '@/services/standaloneQuizService';
import { 
  StandaloneQuiz, 
  StandaloneQuizQuestion, 
  StandaloneQuizAttempt,
  QuizResult 
} from '@/types/standaloneQuiz';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface StandaloneQuizTakerProps {
  quizId: string;
  onComplete?: (result: QuizResult) => void;
  onExit?: () => void;
}

interface AnswerState {
  [questionId: string]: {
    textAnswer?: string;
    selectedOptions?: string[];
    mathExpression?: string;
  };
}

const StandaloneQuizTaker: React.FC<StandaloneQuizTakerProps> = ({
  quizId,
  onComplete,
  onExit
}) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  // State
  const [quiz, setQuiz] = useState<StandaloneQuiz | null>(null);
  const [questions, setQuestions] = useState<StandaloneQuizQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<AnswerState>({});
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [attempt, setAttempt] = useState<StandaloneQuizAttempt | null>(null);
  const [showConfirmExit, setShowConfirmExit] = useState(false);

  // Load quiz data
  useEffect(() => {
    loadQuiz();
  }, [quizId]);

  // Timer effect
  useEffect(() => {
    if (timeRemaining === null || timeRemaining <= 0) return;

    const timer = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev === null || prev <= 1) {
          handleTimeUp();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeRemaining]);

  const loadQuiz = async () => {
    try {
      setLoading(true);
      const quizData = await StandaloneQuizService.getQuizWithQuestions(quizId);
      if (!quizData) {
        toast.error('Quiz not found');
        onExit?.();
        return;
      }
      
      setQuiz(quizData);
      setQuestions(quizData.questions || []);
      
      // Initialize timer if time limit exists
      if (quizData.time_limit_minutes) {
        setTimeRemaining(quizData.time_limit_minutes * 60);
      }
    } catch (error) {
      console.error('Error loading quiz:', error);
      toast.error('Failed to load quiz');
      onExit?.();
    } finally {
      setLoading(false);
    }
  };

  const startQuiz = async () => {
    try {
      const newAttempt = await StandaloneQuizService.startQuizAttempt(quizId);
      setAttempt(newAttempt);
    } catch (error) {
      console.error('Error starting quiz:', error);
      toast.error('Failed to start quiz');
    }
  };

  const handleTimeUp = () => {
    toast.error('Time\'s up! Submitting your quiz automatically.');
    submitQuiz();
  };

  const handleAnswerChange = (questionId: string, answer: any) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: answer
    }));
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    }
  };

  const handlePreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    }
  };

  const handleSubmitQuiz = () => {
    submitQuiz();
  };

  const submitQuiz = async () => {
    if (!attempt) return;
    
    setIsSubmitting(true);
    try {
      const result = await StandaloneQuizService.submitQuizAttempt(attempt.id, answers);
      toast.success('Quiz submitted successfully!');
      onComplete?.(result);
    } catch (error) {
      console.error('Error submitting quiz:', error);
      toast.error('Failed to submit quiz');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const getProgressPercentage = () => {
    const answeredCount = getAnsweredCount();
    return (answeredCount / questions.length) * 100;
  };

  const getAnsweredCount = () => {
    return questions.filter(question => isQuestionAnswered(question.id)).length;
  };

  const isQuestionAnswered = (questionId: string) => {
    const answer = answers[questionId];
    if (!answer) return false;
    
    const question = questions.find(q => q.id === questionId);
    if (!question) return false;

    switch (question.question_type) {
      case 'single_choice':
      case 'multiple_choice':
        return answer.selectedOptions && answer.selectedOptions.length > 0;
      case 'text_answer':
        return answer.textAnswer && answer.textAnswer.trim().length > 0;
      case 'math_expression':
        return answer.mathExpression && answer.mathExpression.trim().length > 0;
      default:
        return false;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!quiz) {
    return (
      <div className="container mx-auto p-6">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Quiz not found or you don't have access to it.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Show quiz start screen
  if (!attempt) {
    return (
      <div className="container mx-auto p-6 max-w-4xl">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">{quiz.title}</CardTitle>
            {quiz.description && (
              <CardDescription className="text-base">{quiz.description}</CardDescription>
            )}
          </CardHeader>
          
          <CardContent className="space-y-6">
            {quiz.instructions && (
              <div className="bg-muted/50 rounded-lg p-4">
                <h3 className="font-medium mb-2">Instructions</h3>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {quiz.instructions}
                </p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="text-sm text-muted-foreground">Questions</p>
                  <p className="font-semibold">{questions.length}</p>
                </div>
              </div>
              
              {quiz.time_limit_minutes && (
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-orange-600" />
                  <div>
                    <p className="text-sm text-muted-foreground">Time Limit</p>
                    <p className="font-semibold">{quiz.time_limit_minutes} minutes</p>
                  </div>
                </div>
              )}
              
              <div className="flex items-center gap-2">
                <Target className="h-5 w-5 text-green-600" />
                <div>
                  <p className="text-sm text-muted-foreground">Passing Score</p>
                  <p className="font-semibold">{quiz.passing_score}%</p>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <Button onClick={startQuiz} className="flex-1">
                <Play className="h-4 w-4 mr-2" />
                Start Quiz
              </Button>
              <Button variant="outline" onClick={onExit}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Quizzes
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];
  const currentAnswer = answers[currentQuestion.id] || {};

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">{quiz.title}</h1>
          <p className="text-muted-foreground">
            Question {currentQuestionIndex + 1} of {questions.length}
          </p>
        </div>
        
        <div className="flex items-center gap-4">
          {timeRemaining !== null && (
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              <span className={`font-mono ${timeRemaining < 300 ? 'text-red-600' : ''}`}>
                {formatTime(timeRemaining)}
              </span>
            </div>
          )}
          
          <Button variant="outline" onClick={() => setShowConfirmExit(true)}>
            Exit Quiz
          </Button>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-muted-foreground">Progress</span>
          <span className="text-sm text-muted-foreground">
            {getAnsweredCount()}/{questions.length} answered
          </span>
        </div>
        <Progress value={getProgressPercentage()} className="h-2" />
      </div>

      {/* Question Navigation */}
      <div className="mb-6">
        <div className="flex flex-wrap gap-2">
          {questions.map((question, index) => (
            <Button
              key={question.id}
              variant={index === currentQuestionIndex ? "default" : "outline"}
              size="sm"
              onClick={() => setCurrentQuestionIndex(index)}
              className={`w-10 h-10 p-0 ${
                isQuestionAnswered(question.id) ? 'bg-green-100 text-green-800 border-green-300' : ''
              }`}
            >
              {index + 1}
            </Button>
          ))}
        </div>
      </div>

      {/* Question Card */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <span>Question {currentQuestionIndex + 1}</span>
              <Badge variant="secondary">{currentQuestion.points} pts</Badge>
            </CardTitle>
            <Badge variant="outline">
              {currentQuestion.question_type.replace('_', ' ')}
            </Badge>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-6">
          <div>
            <p className="text-lg">{currentQuestion.question_text}</p>
          </div>

          {/* Answer Input */}
          {currentQuestion.question_type === 'single_choice' && (
            <RadioGroup
              value={currentAnswer.selectedOptions?.[0] || ''}
              onValueChange={(value) => 
                handleAnswerChange(currentQuestion.id, { selectedOptions: [value] })
              }
            >
              {currentQuestion.options?.map((option) => (
                <div key={option.id} className="flex items-center space-x-2">
                  <RadioGroupItem value={option.id} id={option.id} />
                  <Label htmlFor={option.id} className="flex-1 cursor-pointer">
                    {option.option_text}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          )}

          {currentQuestion.question_type === 'multiple_choice' && (
            <div className="space-y-3">
              {currentQuestion.options?.map((option) => (
                <div key={option.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={option.id}
                    checked={currentAnswer.selectedOptions?.includes(option.id) || false}
                    onCheckedChange={(checked) => {
                      const currentOptions = currentAnswer.selectedOptions || [];
                      const newOptions = checked
                        ? [...currentOptions, option.id]
                        : currentOptions.filter(id => id !== option.id);
                      handleAnswerChange(currentQuestion.id, { selectedOptions: newOptions });
                    }}
                  />
                  <Label htmlFor={option.id} className="flex-1 cursor-pointer">
                    {option.option_text}
                  </Label>
                </div>
              ))}
            </div>
          )}

          {currentQuestion.question_type === 'text_answer' && (
            <Textarea
              placeholder="Enter your answer here..."
              value={currentAnswer.textAnswer || ''}
              onChange={(e) => 
                handleAnswerChange(currentQuestion.id, { textAnswer: e.target.value })
              }
              rows={4}
            />
          )}

          {currentQuestion.question_type === 'math_expression' && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Calculator className="h-4 w-4" />
                <span className="text-sm text-muted-foreground">Math Expression</span>
              </div>
              <Input
                placeholder="Enter mathematical expression (e.g., x^2 + 2x + 1)"
                value={currentAnswer.mathExpression || ''}
                onChange={(e) => 
                  handleAnswerChange(currentQuestion.id, { mathExpression: e.target.value })
                }
              />
              {currentQuestion.math_hint && (
                <p className="text-sm text-muted-foreground">
                  <strong>Hint:</strong> {currentQuestion.math_hint}
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={handlePreviousQuestion}
          disabled={currentQuestionIndex === 0}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Previous
        </Button>

        <div className="flex gap-2">
          {currentQuestionIndex === questions.length - 1 ? (
            <Button onClick={handleSubmitQuiz} disabled={isSubmitting}>
              {isSubmitting ? 'Submitting...' : 'Submit Quiz'}
            </Button>
          ) : (
            <Button onClick={handleNextQuestion}>
              Next
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          )}
        </div>
      </div>

      {/* Exit Confirmation Dialog */}
      {showConfirmExit && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Exit Quiz?</CardTitle>
              <CardDescription>
                Are you sure you want to exit? Your progress will be saved, but you'll need to resume later.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex gap-3">
              <Button variant="outline" onClick={() => setShowConfirmExit(false)}>
                Continue Quiz
              </Button>
              <Button variant="destructive" onClick={submitQuiz} disabled={isSubmitting}>
                {isSubmitting ? 'Submitting...' : 'Submit & Exit'}
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default StandaloneQuizTaker;