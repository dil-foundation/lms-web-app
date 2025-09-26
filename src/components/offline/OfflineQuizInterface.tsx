// Offline Quiz Interface Component
// Handles quiz taking when offline with local validation and sync

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  AlertCircle,
  WifiOff,
  ArrowLeft,
  ArrowRight,
  RotateCcw,
  Send
} from 'lucide-react';
import { offlineDatabase } from '@/services/offlineDatabase';
import { offlineProgressTracker } from '@/services/offlineProgressTracker';
import { useAuthSafe } from '@/hooks/useAuthSafe';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { 
  OfflineQuiz, 
  OfflineQuizQuestion, 
  OfflineQuizAnswer,
  OfflineContentItem 
} from '@/types/offline';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface OfflineQuizInterfaceProps {
  courseId: string;
  contentId: string;
  contentItem: OfflineContentItem;
  onComplete?: (score: number, totalPoints: number) => void;
  onCancel?: () => void;
  className?: string;
}

interface QuizState {
  currentQuestionIndex: number;
  answers: Map<string, string>;
  timeSpent: number;
  startTime: Date;
  isSubmitted: boolean;
  score?: number;
  totalPoints?: number;
  feedback?: Array<{
    questionId: string;
    isCorrect: boolean;
    correctAnswer?: string;
    explanation?: string;
  }>;
}

const QuestionRenderer: React.FC<{
  question: OfflineQuizQuestion;
  answer: string;
  onAnswerChange: (answer: string) => void;
  showFeedback?: boolean;
  feedback?: {
    isCorrect: boolean;
    correctAnswer?: string;
    explanation?: string;
  };
  disabled?: boolean;
}> = ({ question, answer, onAnswerChange, showFeedback, feedback, disabled }) => {
  
  const renderMultipleChoice = () => (
    <div className="space-y-3">
      <RadioGroup
        value={answer}
        onValueChange={onAnswerChange}
        disabled={disabled}
      >
        {question.options?.map((option) => (
          <div key={option.id} className="flex items-center space-x-2">
            <RadioGroupItem value={option.text} id={option.id} />
            <Label 
              htmlFor={option.id}
              className={cn(
                "flex-1 cursor-pointer",
                showFeedback && feedback && (
                  option.is_correct 
                    ? "text-green-600 font-medium" 
                    : answer === option.text && !feedback.isCorrect 
                      ? "text-red-600" 
                      : ""
                )
              )}
            >
              {option.text}
              {showFeedback && option.is_correct && (
                <CheckCircle className="inline h-4 w-4 ml-2 text-green-600" />
              )}
              {showFeedback && answer === option.text && !feedback?.isCorrect && (
                <XCircle className="inline h-4 w-4 ml-2 text-red-600" />
              )}
            </Label>
          </div>
        ))}
      </RadioGroup>
    </div>
  );

  const renderTrueFalse = () => (
    <div className="space-y-3">
      <RadioGroup
        value={answer}
        onValueChange={onAnswerChange}
        disabled={disabled}
      >
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="true" id="true" />
          <Label 
            htmlFor="true"
            className={cn(
              "cursor-pointer",
              showFeedback && feedback && (
                question.correct_answer?.toLowerCase() === 'true'
                  ? "text-green-600 font-medium"
                  : answer === 'true' && !feedback.isCorrect
                    ? "text-red-600"
                    : ""
              )
            )}
          >
            True
            {showFeedback && question.correct_answer?.toLowerCase() === 'true' && (
              <CheckCircle className="inline h-4 w-4 ml-2 text-green-600" />
            )}
          </Label>
        </div>
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="false" id="false" />
          <Label 
            htmlFor="false"
            className={cn(
              "cursor-pointer",
              showFeedback && feedback && (
                question.correct_answer?.toLowerCase() === 'false'
                  ? "text-green-600 font-medium"
                  : answer === 'false' && !feedback.isCorrect
                    ? "text-red-600"
                    : ""
              )
            )}
          >
            False
            {showFeedback && question.correct_answer?.toLowerCase() === 'false' && (
              <CheckCircle className="inline h-4 w-4 ml-2 text-green-600" />
            )}
          </Label>
        </div>
      </RadioGroup>
    </div>
  );

  const renderShortAnswer = () => (
    <div className="space-y-3">
      <Textarea
        value={answer}
        onChange={(e) => onAnswerChange(e.target.value)}
        placeholder="Enter your answer..."
        disabled={disabled}
        className={cn(
          showFeedback && feedback && (
            feedback.isCorrect ? "border-green-500" : "border-red-500"
          )
        )}
      />
      {showFeedback && feedback?.correctAnswer && (
        <div className="p-3 bg-green-50 dark:bg-green-950 rounded-lg">
          <p className="text-sm font-medium text-green-800 dark:text-green-200">
            Correct Answer: {feedback.correctAnswer}
          </p>
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between">
        <h3 className="text-lg font-medium flex-1">{question.question}</h3>
        {question.points && (
          <Badge variant="outline" className="ml-4">
            {question.points} {question.points === 1 ? 'point' : 'points'}
          </Badge>
        )}
      </div>

      {question.image_url && (
        <img 
          src={question.image_url} 
          alt="Question image" 
          className="max-w-full h-auto rounded-lg"
        />
      )}

      {question.type === 'multiple_choice' && renderMultipleChoice()}
      {question.type === 'true_false' && renderTrueFalse()}
      {question.type === 'short_answer' && renderShortAnswer()}

      {question.math_hint && (
        <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
          <p className="text-sm text-blue-800 dark:text-blue-200">
            <strong>Hint:</strong> {question.math_hint}
          </p>
        </div>
      )}

      {showFeedback && feedback?.explanation && (
        <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
          <p className="text-sm text-gray-700 dark:text-gray-300">
            <strong>Explanation:</strong> {feedback.explanation}
          </p>
        </div>
      )}
    </div>
  );
};

export const OfflineQuizInterface: React.FC<OfflineQuizInterfaceProps> = ({
  courseId,
  contentId,
  contentItem,
  onComplete,
  onCancel,
  className
}) => {
  const [quizState, setQuizState] = useState<QuizState>({
    currentQuestionIndex: 0,
    answers: new Map(),
    timeSpent: 0,
    startTime: new Date(),
    isSubmitted: false
  });
  const [loading, setLoading] = useState(false);
  const { user } = useAuthSafe();
  const { isOnline } = useNetworkStatus();

  const quiz = contentItem.quiz;
  const questions = quiz?.questions || [];
  const currentQuestion = questions[quizState.currentQuestionIndex];

  // Timer effect
  useEffect(() => {
    if (quizState.isSubmitted) return;

    const interval = setInterval(() => {
      setQuizState(prev => ({
        ...prev,
        timeSpent: Math.floor((Date.now() - prev.startTime.getTime()) / 1000)
      }));
    }, 1000);

    return () => clearInterval(interval);
  }, [quizState.isSubmitted, quizState.startTime]);

  const handleAnswerChange = useCallback((answer: string) => {
    if (quizState.isSubmitted || !currentQuestion) return;

    setQuizState(prev => {
      const newAnswers = new Map(prev.answers);
      newAnswers.set(currentQuestion.id, answer);
      return { ...prev, answers: newAnswers };
    });
  }, [currentQuestion, quizState.isSubmitted]);

  const goToQuestion = useCallback((index: number) => {
    if (index >= 0 && index < questions.length) {
      setQuizState(prev => ({ ...prev, currentQuestionIndex: index }));
    }
  }, [questions.length]);

  const goToPreviousQuestion = useCallback(() => {
    goToQuestion(quizState.currentQuestionIndex - 1);
  }, [quizState.currentQuestionIndex, goToQuestion]);

  const goToNextQuestion = useCallback(() => {
    goToQuestion(quizState.currentQuestionIndex + 1);
  }, [quizState.currentQuestionIndex, goToQuestion]);

  const submitQuiz = useCallback(async () => {
    if (!user || !quiz || quizState.isSubmitted) return;

    try {
      setLoading(true);

      // Convert answers to the required format
      const quizAnswers: OfflineQuizAnswer[] = Array.from(quizState.answers.entries()).map(
        ([questionId, answer]) => ({
          questionId,
          answer
        })
      );

      // Validate answers offline
      const validation = await offlineProgressTracker.validateQuizAnswers(
        quizAnswers,
        courseId,
        contentId
      );

      if (!validation.isValid) {
        toast.error('Failed to validate quiz answers');
        return;
      }

      // Submit quiz
      const submissionId = await offlineProgressTracker.submitQuiz(
        user.id,
        {
          courseId,
          contentId,
          answers: quizAnswers,
          score: validation.score,
          totalPoints: validation.totalPoints
        },
        { syncImmediately: isOnline }
      );

      // Update quiz state with results
      setQuizState(prev => ({
        ...prev,
        isSubmitted: true,
        score: validation.score,
        totalPoints: validation.totalPoints,
        feedback: validation.feedback
      }));

      // Notify parent component
      onComplete?.(validation.score, validation.totalPoints);

      // Show success message
      const percentage = Math.round((validation.score / validation.totalPoints) * 100);
      toast.success(`Quiz completed! Score: ${validation.score}/${validation.totalPoints} (${percentage}%)`);

    } catch (error) {
      console.error('Failed to submit quiz:', error);
      toast.error('Failed to submit quiz');
    } finally {
      setLoading(false);
    }
  }, [user, quiz, quizState, courseId, contentId, isOnline, onComplete]);

  const resetQuiz = useCallback(() => {
    setQuizState({
      currentQuestionIndex: 0,
      answers: new Map(),
      timeSpent: 0,
      startTime: new Date(),
      isSubmitted: false
    });
  }, []);

  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const getAnsweredQuestions = (): number => {
    return quizState.answers.size;
  };

  const getQuestionFeedback = (questionId: string) => {
    return quizState.feedback?.find(f => f.questionId === questionId);
  };

  if (!quiz || questions.length === 0) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center h-64">
          <div className="text-center">
            <AlertCircle className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-muted-foreground">Quiz not available offline</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Quiz header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center space-x-3">
              <span>{contentItem.title}</span>
              {!isOnline && (
                <Badge variant="secondary">
                  <WifiOff className="h-3 w-3 mr-1" />
                  Offline
                </Badge>
              )}
            </CardTitle>

            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Clock className="h-4 w-4" />
                <span className="text-sm font-mono">{formatTime(quizState.timeSpent)}</span>
              </div>
              
              {!quizState.isSubmitted && (
                <Badge variant="outline">
                  {getAnsweredQuestions()}/{questions.length} answered
                </Badge>
              )}
            </div>
          </div>

          {/* Progress bar */}
          <div className="mt-4">
            <div className="flex justify-between text-sm text-muted-foreground mb-2">
              <span>Question {quizState.currentQuestionIndex + 1} of {questions.length}</span>
              {quizState.isSubmitted && quizState.score !== undefined && quizState.totalPoints !== undefined && (
                <span>
                  Score: {quizState.score}/{quizState.totalPoints} 
                  ({Math.round((quizState.score / quizState.totalPoints) * 100)}%)
                </span>
              )}
            </div>
            <Progress 
              value={((quizState.currentQuestionIndex + 1) / questions.length) * 100} 
              className="h-2" 
            />
          </div>
        </CardHeader>
      </Card>

      {/* Question content */}
      <Card>
        <CardContent className="p-6">
          {currentQuestion && (
            <QuestionRenderer
              question={currentQuestion}
              answer={quizState.answers.get(currentQuestion.id) || ''}
              onAnswerChange={handleAnswerChange}
              showFeedback={quizState.isSubmitted}
              feedback={getQuestionFeedback(currentQuestion.id)}
              disabled={quizState.isSubmitted}
            />
          )}
        </CardContent>
      </Card>

      {/* Navigation and actions */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                onClick={goToPreviousQuestion}
                disabled={quizState.currentQuestionIndex === 0}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Previous
              </Button>

              <Button
                variant="outline"
                onClick={goToNextQuestion}
                disabled={quizState.currentQuestionIndex === questions.length - 1}
              >
                Next
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>

            <div className="flex items-center space-x-2">
              {quizState.isSubmitted ? (
                <>
                  <Button variant="outline" onClick={resetQuiz}>
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Retake Quiz
                  </Button>
                  <Button onClick={onCancel}>
                    Done
                  </Button>
                </>
              ) : (
                <>
                  <Button variant="outline" onClick={onCancel}>
                    Cancel
                  </Button>
                  <Button 
                    onClick={submitQuiz}
                    disabled={loading || getAnsweredQuestions() === 0}
                  >
                    {loading ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    ) : (
                      <Send className="h-4 w-4 mr-2" />
                    )}
                    Submit Quiz
                  </Button>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Question navigator */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Questions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-10 gap-2">
            {questions.map((question, index) => {
              const isAnswered = quizState.answers.has(question.id);
              const isCurrent = index === quizState.currentQuestionIndex;
              const feedback = getQuestionFeedback(question.id);
              
              return (
                <Button
                  key={question.id}
                  variant={isCurrent ? "default" : "outline"}
                  size="sm"
                  className={cn(
                    "h-8 w-8 p-0",
                    quizState.isSubmitted && feedback && (
                      feedback.isCorrect ? "bg-green-100 border-green-500 text-green-700" : 
                      "bg-red-100 border-red-500 text-red-700"
                    ),
                    !quizState.isSubmitted && isAnswered && "bg-blue-100 border-blue-500"
                  )}
                  onClick={() => goToQuestion(index)}
                >
                  {index + 1}
                  {quizState.isSubmitted && feedback && (
                    feedback.isCorrect ? 
                      <CheckCircle className="h-3 w-3 ml-1" /> : 
                      <XCircle className="h-3 w-3 ml-1" />
                  )}
                </Button>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
