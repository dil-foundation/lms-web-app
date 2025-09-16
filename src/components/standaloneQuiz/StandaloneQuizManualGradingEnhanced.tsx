import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { StandaloneQuizService } from '@/services/standaloneQuizService';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  CheckSquare,
  Clock,
  BookOpen,
  TrendingUp,
  Search,
  FileText,
  User,
  CheckCircle,
  AlertCircle,
  GraduationCap,
  Save,
  ArrowLeft,
  Eye,
  MessageSquare
} from 'lucide-react';
import { toast } from 'sonner';
import { ContentLoader } from '@/components/ContentLoader';
import { useDebounce } from '@/hooks/useDebounce';

interface TextAnswerGrade {
  question_id: string;
  question_text: string;
  question_position: number;
  question_points: number;
  student_answer: string;
  current_grade?: number;
  current_feedback?: string;
  graded_by?: string;
  graded_at?: string;
}

interface AttemptForGrading {
  attempt_id: string;
  quiz_id: string;
  quiz_title: string;
  student_id: string;
  student_name: string;
  student_email: string;
  attempt_number: number;
  submitted_at: string;
  total_questions: number;
  text_answer_questions: number;
  auto_graded_score: number;
  pending_grades: number;
}

type StatCardProps = {
  title: string;
  value: string;
  icon: React.ElementType;
  color: string;
};

const StatCard = ({ title, value, icon: Icon, color }: StatCardProps) => (
  <Card className="relative overflow-hidden transition-all duration-200 hover:shadow-lg bg-gradient-to-br from-card to-orange-500/5 dark:bg-card">
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
      <Icon className={`h-4 w-4 ${color}`} />
    </CardHeader>
    <CardContent>
      <div className="space-y-1">
        <div className="text-2xl font-bold">{value}</div>
      </div>
    </CardContent>
  </Card>
);

export const StandaloneQuizManualGradingEnhanced: React.FC = () => {
  const { user } = useAuth();
  const [attempts, setAttempts] = useState<AttemptForGrading[]>([]);
  const [selectedAttempt, setSelectedAttempt] = useState<AttemptForGrading | null>(null);
  const [textAnswers, setTextAnswers] = useState<TextAnswerGrade[]>([]);
  const [grades, setGrades] = useState<Record<string, number>>({});
  const [feedback, setFeedback] = useState<Record<string, string>>({});
  const [overallFeedback, setOverallFeedback] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  useEffect(() => {
    loadAttemptsRequiringGrading();
  }, []);

  const loadAttemptsRequiringGrading = async () => {
    try {
      setLoading(true);
      const data = await StandaloneQuizService.getAttemptsRequiringGrading(user?.id);
      setAttempts(data);
    } catch (error) {
      console.error('Error loading attempts:', error);
      toast.error('Failed to load attempts requiring grading');
    } finally {
      setLoading(false);
    }
  };

  const loadTextAnswersForGrading = async (attemptId: string) => {
    try {
      setLoading(true);
      const data = await StandaloneQuizService.getTextAnswersForGrading(attemptId);
      setTextAnswers(data);
      
      // Initialize grades and feedback from existing data
      const initialGrades: Record<string, number> = {};
      const initialFeedback: Record<string, string> = {};
      
      data.forEach((item: TextAnswerGrade) => {
        if (item.current_grade !== null && item.current_grade !== undefined) {
          initialGrades[item.question_id] = item.current_grade;
        }
        if (item.current_feedback) {
          initialFeedback[item.question_id] = item.current_feedback;
        }
      });
      
      setGrades(initialGrades);
      setFeedback(initialFeedback);
    } catch (error) {
      console.error('Error loading text answers:', error);
      toast.error('Failed to load text answers for grading');
    } finally {
      setLoading(false);
    }
  };

  const handleAttemptSelect = (attempt: AttemptForGrading) => {
    setSelectedAttempt(attempt);
    loadTextAnswersForGrading(attempt.attempt_id);
  };

  const handleGradeChange = (questionId: string, grade: number) => {
    setGrades(prev => ({
      ...prev,
      [questionId]: grade
    }));
  };

  const handleFeedbackChange = (questionId: string, feedback: string) => {
    setFeedback(prev => ({
      ...prev,
      [questionId]: feedback
    }));
  };

  const handleSaveGrading = async () => {
    if (!selectedAttempt || !user) {
      console.error('❌ [ERROR] Missing required data:', { selectedAttempt, user });
      return;
    }

    try {
      setSaving(true);
      
      // Prepare individual question grades
      const questionGrades = textAnswers.map(item => ({
        question_id: item.question_id,
        grade: grades[item.question_id] || 0,
        feedback: feedback[item.question_id] || ''
      }));

      console.log('🔍 [DEBUG] Frontend - About to submit manual grading:', {
        attemptId: selectedAttempt.attempt_id,
        teacherId: user.id,
        questionGrades,
        overallFeedback,
        textAnswersCount: textAnswers.length,
        gradesObject: grades,
        feedbackObject: feedback
      });

      // Validate that all required grades are provided
      const missingGrades = textAnswers.filter(item => 
        grades[item.question_id] === undefined || 
        grades[item.question_id] === null ||
        grades[item.question_id] < 0 ||
        grades[item.question_id] > 100
      );

      if (missingGrades.length > 0) {
        console.error('❌ [ERROR] Missing or invalid grades:', missingGrades);
        toast.error('Please provide valid grades for all questions (0-100)');
        return;
      }

      await StandaloneQuizService.completeManualGrading(
        selectedAttempt.attempt_id,
        user.id,
        questionGrades,
        overallFeedback
      );

      toast.success('Grading completed successfully');
      
      // Reload attempts and clear selection
      await loadAttemptsRequiringGrading();
      setSelectedAttempt(null);
      setTextAnswers([]);
      setGrades({});
      setFeedback({});
      setOverallFeedback('');
    } catch (error) {
      console.error('❌ [ERROR] Frontend - Error saving grading:', error);
      toast.error(`Failed to save grading: ${error.message || 'Unknown error'}`);
    } finally {
      setSaving(false);
    }
  };

  const filteredAttempts = attempts.filter(attempt =>
    attempt.quiz_title.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
    attempt.student_name.toLowerCase().includes(debouncedSearchTerm.toLowerCase())
  );

  const statCardsData = [
    { 
      title: 'Pending Grading',
      value: attempts.length.toString(), 
      icon: Clock, 
      color: 'text-orange-500' 
    },
    { 
      title: 'Total Questions', 
      value: attempts.reduce((acc, a) => acc + a.text_answer_questions, 0).toString(), 
      icon: FileText, 
      color: 'text-blue-500' 
    },
    { 
      title: 'Students', 
      value: new Set(attempts.map(a => a.student_id)).size.toString(), 
      icon: User, 
      color: 'text-green-500' 
    },
    { 
      title: 'Quizzes', 
      value: new Set(attempts.map(a => a.quiz_id)).size.toString(), 
      icon: BookOpen, 
      color: 'text-purple-500' 
    },
  ];

  if (loading && attempts.length === 0) {
    return <ContentLoader message="Loading manual grading queue..." />;
  }

  return (
    <div className="space-y-6 mx-auto">
      {/* Header */}
      <div className="relative p-8 rounded-3xl bg-gradient-to-r from-orange-500/5 via-transparent to-orange-500/5">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-orange-500/10 to-orange-500/20 rounded-2xl flex items-center justify-center">
            <GraduationCap className="w-6 h-6 text-orange-500" />
          </div>
          <div>
            <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-orange-500 via-orange-500 to-orange-500/80 bg-clip-text text-transparent">
              Manual Grading
            </h1>
            <p className="text-lg text-muted-foreground mt-2 leading-relaxed">
              Grade text answer questions that require manual review
            </p>
          </div>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {statCardsData.map((card) => <StatCard key={card.title} {...card} />)}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Panel - Attempts List */}
        <Card className="bg-card border border-border">
          <CardHeader>
            <CardTitle className="text-xl font-semibold flex items-center gap-2">
              <FileText className="h-5 w-5 text-orange-500" />
              Pending Grading ({filteredAttempts.length})
            </CardTitle>
            <CardDescription>
              Select an attempt to begin grading text answer questions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search by quiz or student..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full rounded-xl bg-background border border-input shadow-sm hover:shadow-lg hover:shadow-orange-500/10 transition-all duration-300 hover:-translate-y-0.5 pl-10 h-10"
                />
              </div>

              {/* Attempts List */}
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {filteredAttempts.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
                    <p className="text-lg font-medium">All caught up!</p>
                    <p className="text-sm">No attempts require manual grading at this time.</p>
                  </div>
                ) : (
                  filteredAttempts.map((attempt) => (
                    <Card
                      key={attempt.attempt_id}
                      className={`cursor-pointer transition-all duration-200 hover:shadow-lg hover:shadow-orange-500/10 hover:-translate-y-0.5 ${
                        selectedAttempt?.attempt_id === attempt.attempt_id
                          ? 'ring-2 ring-orange-500 bg-orange-50 dark:bg-orange-900/10'
                          : 'hover:bg-muted/50'
                      }`}
                      onClick={() => handleAttemptSelect(attempt)}
                    >
                      <CardContent className="p-4">
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <h3 className="font-semibold text-sm">{attempt.quiz_title}</h3>
                            <Badge variant="outline" className="text-xs">
                              Attempt {attempt.attempt_number}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <User className="h-3 w-3" />
                            <span>{attempt.student_name}</span>
                          </div>
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <FileText className="h-3 w-3" />
                              <span>{attempt.text_answer_questions} text questions</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              <span>{new Date(attempt.submitted_at).toLocaleDateString()}</span>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Right Panel - Grading Interface */}
        <Card className="bg-card border border-border">
          <CardHeader>
            <CardTitle className="text-xl font-semibold flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-orange-500" />
              Grade Text Answers
            </CardTitle>
            <CardDescription>
              {selectedAttempt 
                ? `Grading ${selectedAttempt.quiz_title} - ${selectedAttempt.student_name}`
                : 'Select an attempt to begin grading'
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!selectedAttempt ? (
              <div className="text-center py-12 text-muted-foreground">
                <AlertCircle className="h-12 w-12 mx-auto mb-4 text-orange-500" />
                <p className="text-lg font-medium">No attempt selected</p>
                <p className="text-sm">Choose an attempt from the list to begin grading.</p>
              </div>
            ) : loading ? (
              <ContentLoader message="Loading text answers..." />
            ) : (
              <div className="space-y-6">
                {/* Student Info */}
                <div className="bg-muted/50 rounded-lg p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center">
                      <User className="h-5 w-5 text-orange-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold">{selectedAttempt.student_name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {selectedAttempt.quiz_title} • Attempt {selectedAttempt.attempt_number}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Text Answer Questions */}
                <div className="space-y-4">
                  {textAnswers.map((item, index) => (
                    <Card key={item.question_id} className="border-l-4 border-l-orange-500">
                      <CardContent className="p-4">
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <h4 className="font-medium">Question {item.question_position}</h4>
                            <Badge variant="outline">
                              {item.question_points} points
                            </Badge>
                          </div>
                          
                          <div>
                            <Label className="text-sm font-medium text-muted-foreground">Question:</Label>
                            <p className="text-sm mt-1 p-3 bg-muted/50 rounded-lg">
                              {item.question_text}
                            </p>
                          </div>

                          <div>
                            <Label className="text-sm font-medium text-muted-foreground">Student Answer:</Label>
                            <p className="text-sm mt-1 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                              {item.student_answer}
                            </p>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <Label htmlFor={`grade-${item.question_id}`}>
                                Grade (0-{item.question_points})
                              </Label>
                              <Input
                                id={`grade-${item.question_id}`}
                                type="number"
                                min="0"
                                max={item.question_points}
                                value={grades[item.question_id] || ''}
                                onChange={(e) => handleGradeChange(item.question_id, Number(e.target.value))}
                                className="mt-1"
                              />
                            </div>
                            <div>
                              <Label htmlFor={`feedback-${item.question_id}`}>
                                Feedback
                              </Label>
                              <Textarea
                                id={`feedback-${item.question_id}`}
                                value={feedback[item.question_id] || ''}
                                onChange={(e) => handleFeedbackChange(item.question_id, e.target.value)}
                                placeholder="Provide feedback for this answer..."
                                className="mt-1 min-h-[80px]"
                              />
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {/* Overall Feedback */}
                <div>
                  <Label htmlFor="overall-feedback">Overall Feedback</Label>
                  <Textarea
                    id="overall-feedback"
                    value={overallFeedback}
                    onChange={(e) => setOverallFeedback(e.target.value)}
                    placeholder="Provide overall feedback for this quiz attempt..."
                    className="mt-1 min-h-[100px]"
                  />
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 pt-4">
                  <Button
                    onClick={handleSaveGrading}
                    disabled={saving || textAnswers.length === 0}
                    className="flex-1"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {saving ? 'Saving...' : 'Complete Grading'}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSelectedAttempt(null);
                      setTextAnswers([]);
                      setGrades({});
                      setFeedback({});
                      setOverallFeedback('');
                    }}
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to List
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
