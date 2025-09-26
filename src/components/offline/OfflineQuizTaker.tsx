// Offline Quiz Taker Component
// Allows taking quizzes offline and saves answers locally for sync when online

import React, { useState, useEffect } from 'react';
import { CheckCircle, Clock, AlertTriangle, Send, Save, Wifi, WifiOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { useAuthSafe } from '@/hooks/useAuthSafe';
import { offlineDatabase } from '@/services/offlineDatabase';
import { toast } from 'sonner';

interface OfflineQuizTakerProps {
  quizContent: any;
  courseId: string;
  contentId: string;
  onComplete?: (score: number) => void;
}

interface QuizAnswer {
  questionId: string;
  answer: string | string[];
  questionType: string;
}

interface QuizSubmission {
  id: string;
  userId: string;
  courseId: string;
  contentId: string;
  answers: QuizAnswer[];
  score: number;
  totalQuestions: number;
  submittedAt: Date;
  syncStatus: 'pending' | 'synced' | 'failed';
  timeSpent: number;
}

const OfflineQuizTaker: React.FC<OfflineQuizTakerProps> = ({
  quizContent,
  courseId,
  contentId,
  onComplete
}) => {
  const { isOnline } = useNetworkStatus();
  const { user } = useAuthSafe();
  const [answers, setAnswers] = useState<Record<string, QuizAnswer>>({});
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [score, setScore] = useState<number | null>(null);
  const [startTime] = useState(Date.now());
  const [savedLocally, setSavedLocally] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Parse quiz questions
  const questions = React.useMemo(() => {
    if (quizContent.quiz) {
      if (Array.isArray(quizContent.quiz)) {
        return quizContent.quiz;
      } else if (quizContent.quiz.questions) {
        return quizContent.quiz.questions;
      }
    }
    return [];
  }, [quizContent]);

  const currentQuestion = questions[currentQuestionIndex];
  const progress = questions.length > 0 ? ((currentQuestionIndex + 1) / questions.length) * 100 : 0;

  // Load existing answers from local storage
  useEffect(() => {
    const loadSavedAnswers = async () => {
      if (!user) return;
      
      try {
        const submissions = await offlineDatabase.getQuizSubmissions(user.id, courseId);
        const existingSubmission = submissions.find(s => s.contentId === contentId);
        
        if (existingSubmission && existingSubmission.syncStatus === 'pending') {
          // Load saved answers
          const answersMap: Record<string, QuizAnswer> = {};
          existingSubmission.answers.forEach(answer => {
            answersMap[answer.questionId] = answer;
          });
          setAnswers(answersMap);
          setSavedLocally(true);
          toast.info('Loaded your saved quiz progress');
        }
      } catch (error) {
        console.error('[OfflineQuizTaker] Failed to load saved answers:', error);
      }
    };

    loadSavedAnswers();
  }, [user, courseId, contentId]);

  const handleAnswerChange = (questionId: string, answer: string | string[], questionType: string) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: {
        questionId,
        answer,
        questionType
      }
    }));
  };

  const saveProgress = async () => {
    if (!user) return;

    try {
      const timeSpent = Date.now() - startTime;
      const submission: QuizSubmission = {
        id: `${user.id}-${courseId}-${contentId}-${Date.now()}`,
        userId: user.id,
        courseId,
        contentId,
        answers: Object.values(answers),
        score: 0, // Will be calculated on submission
        totalQuestions: questions.length,
        submittedAt: new Date(),
        syncStatus: 'pending',
        timeSpent
      };

      await offlineDatabase.saveQuizSubmission(submission);
      setSavedLocally(true);
      toast.success('Quiz progress saved locally');
    } catch (error) {
      console.error('[OfflineQuizTaker] Failed to save progress:', error);
      toast.error('Failed to save quiz progress');
    }
  };

  const calculateScore = (): number => {
    let correctAnswers = 0;
    
    questions.forEach((question: any) => {
      const userAnswer = answers[question.id];
      if (!userAnswer) return;

      const questionType = question.question_type || question.type || 'single_choice';
      
      if (questionType === 'single_choice') {
        if (userAnswer.answer === question.correct_answer) {
          correctAnswers++;
        }
      } else if (questionType === 'multiple_choice') {
        const correctOptions = question.options
          ?.filter((opt: any) => opt.is_correct)
          ?.map((opt: any) => opt.id || opt.option_text || opt.text) || [];
        
        const userAnswers = Array.isArray(userAnswer.answer) ? userAnswer.answer : [userAnswer.answer];
        
        if (correctOptions.length === userAnswers.length &&
            correctOptions.every((correct: string) => userAnswers.includes(correct))) {
          correctAnswers++;
        }
      }
      // Text and math answers would need server-side validation
    });

    return Math.round((correctAnswers / questions.length) * 100);
  };

  const submitQuiz = async () => {
    if (!user) return;

    setIsSubmitting(true);
    
    try {
      const timeSpent = Date.now() - startTime;
      const calculatedScore = calculateScore();
      
      const submission: QuizSubmission = {
        id: `${user.id}-${courseId}-${contentId}-${Date.now()}`,
        userId: user.id,
        courseId,
        contentId,
        answers: Object.values(answers),
        score: calculatedScore,
        totalQuestions: questions.length,
        submittedAt: new Date(),
        syncStatus: isOnline ? 'synced' : 'pending',
        timeSpent
      };

      await offlineDatabase.saveQuizSubmission(submission);
      
      setScore(calculatedScore);
      setIsSubmitted(true);
      
      if (isOnline) {
        toast.success(`Quiz submitted! Score: ${calculatedScore}%`);
      } else {
        toast.success(`Quiz saved offline! Score: ${calculatedScore}% (will sync when online)`);
      }
      
      onComplete?.(calculatedScore);
      
    } catch (error) {
      console.error('[OfflineQuizTaker] Failed to submit quiz:', error);
      toast.error('Failed to submit quiz');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderQuestion = (question: any) => {
    const questionType = question.question_type || question.type || 'single_choice';
    const questionText = question.question_text || question.question;
    const options = question.options || [];
    const userAnswer = answers[question.id];

    return (
      <Card className="bg-gradient-to-br from-card to-card/50 dark:bg-card border border-gray-200/50 dark:border-gray-700/50 rounded-3xl shadow-lg">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Question {currentQuestionIndex + 1} of {questions.length}
            </CardTitle>
            <Badge 
              variant={questionType === 'multiple_choice' ? 'default' : 'secondary'}
              className="text-xs"
            >
              {questionType === 'multiple_choice' ? 'Multiple Choice' : 
               questionType === 'text_answer' ? 'Text Answer' :
               questionType === 'math_expression' ? 'Math Expression' : 'Single Choice'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-gray-900 dark:text-gray-100 text-base leading-relaxed">
            {questionText}
          </div>

          {questionType === 'single_choice' && (
            <RadioGroup
              value={userAnswer?.answer as string || ''}
              onValueChange={(value) => handleAnswerChange(question.id, value, questionType)}
            >
              {options.map((option: any, index: number) => (
                <div key={option.id || index} className="flex items-center space-x-2">
                  <RadioGroupItem value={option.id || option.option_text || option.text} id={`option-${index}`} />
                  <Label htmlFor={`option-${index}`} className="text-gray-700 dark:text-gray-300">
                    {option.option_text || option.text || option.label}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          )}

          {questionType === 'multiple_choice' && (
            <div className="space-y-3">
              {options.map((option: any, index: number) => {
                const optionValue = option.id || option.option_text || option.text;
                const isChecked = Array.isArray(userAnswer?.answer) && userAnswer.answer.includes(optionValue);
                
                return (
                  <div key={option.id || index} className="flex items-center space-x-2">
                    <Checkbox
                      id={`option-${index}`}
                      checked={isChecked}
                      onCheckedChange={(checked) => {
                        const currentAnswers = Array.isArray(userAnswer?.answer) ? userAnswer.answer : [];
                        let newAnswers;
                        
                        if (checked) {
                          newAnswers = [...currentAnswers, optionValue];
                        } else {
                          newAnswers = currentAnswers.filter(a => a !== optionValue);
                        }
                        
                        handleAnswerChange(question.id, newAnswers, questionType);
                      }}
                    />
                    <Label htmlFor={`option-${index}`} className="text-gray-700 dark:text-gray-300">
                      {option.option_text || option.text || option.label}
                    </Label>
                  </div>
                );
              })}
            </div>
          )}

          {questionType === 'text_answer' && (
            <Textarea
              placeholder="Enter your answer..."
              value={userAnswer?.answer as string || ''}
              onChange={(e) => handleAnswerChange(question.id, e.target.value, questionType)}
              className="min-h-[100px]"
            />
          )}

          {questionType === 'math_expression' && (
            <Input
              placeholder="Enter mathematical expression..."
              value={userAnswer?.answer as string || ''}
              onChange={(e) => handleAnswerChange(question.id, e.target.value, questionType)}
            />
          )}
        </CardContent>
      </Card>
    );
  };

  if (questions.length === 0) {
    return (
      <div className="text-center p-8">
        <AlertTriangle className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
        <p className="text-muted-foreground">No quiz questions available.</p>
      </div>
    );
  }

  if (isSubmitted && score !== null) {
    return (
      <Card className="bg-gradient-to-br from-card to-card/50 dark:bg-card border border-gray-200/50 dark:border-gray-700/50 rounded-3xl shadow-lg">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-4">
            <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
          </div>
          <CardTitle className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Quiz Completed!
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <div className="text-4xl font-bold text-primary">{score}%</div>
          <p className="text-muted-foreground">
            You scored {score}% ({Math.round((score / 100) * questions.length)} out of {questions.length} questions correct)
          </p>
          
          <div className="flex items-center justify-center gap-2 mt-4">
            {isOnline ? (
              <>
                <Wifi className="w-4 h-4 text-green-600" />
                <span className="text-sm text-green-600">Submitted successfully</span>
              </>
            ) : (
              <>
                <WifiOff className="w-4 h-4 text-orange-600" />
                <span className="text-sm text-orange-600">Saved offline - will sync when online</span>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Progress Bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>Quiz Progress</span>
          <span>{currentQuestionIndex + 1} / {questions.length}</span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      {/* Network Status */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isOnline ? (
            <>
              <Wifi className="w-4 h-4 text-green-600" />
              <span className="text-sm text-green-600">Online - answers will be submitted immediately</span>
            </>
          ) : (
            <>
              <WifiOff className="w-4 h-4 text-orange-600" />
              <span className="text-sm text-orange-600">Offline - answers will be saved locally</span>
            </>
          )}
        </div>
        
        {savedLocally && (
          <Badge variant="outline" className="text-xs">
            <Save className="w-3 h-3 mr-1" />
            Saved locally
          </Badge>
        )}
      </div>

      {/* Current Question */}
      {renderQuestion(currentQuestion)}

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={() => setCurrentQuestionIndex(prev => Math.max(0, prev - 1))}
          disabled={currentQuestionIndex === 0}
        >
          Previous
        </Button>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={saveProgress}
            disabled={Object.keys(answers).length === 0}
          >
            <Save className="w-4 h-4 mr-2" />
            Save Progress
          </Button>

          {currentQuestionIndex < questions.length - 1 ? (
            <Button
              onClick={() => setCurrentQuestionIndex(prev => prev + 1)}
            >
              Next
            </Button>
          ) : (
            <Button
              onClick={submitQuiz}
              disabled={Object.keys(answers).length !== questions.length || isSubmitting}
              className="bg-primary hover:bg-primary/90"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Submitting...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Submit Quiz
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Offline Mode Warning */}
      {!isOnline && (
        <Card className="border-orange-200 dark:border-orange-700 bg-orange-50 dark:bg-orange-900/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-orange-700 dark:text-orange-300">
              <AlertTriangle className="w-5 h-5" />
              <div>
                <p className="font-medium">Offline Mode</p>
                <p className="text-sm text-orange-600 dark:text-orange-400">
                  Your quiz answers are being saved locally and will be submitted when you're back online.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default OfflineQuizTaker;
