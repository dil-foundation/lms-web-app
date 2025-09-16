import React, { useState, useEffect } from 'react';
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
  CheckCircle, 
  Clock, 
  User, 
  FileText, 
  Save, 
  ArrowLeft,
  AlertCircle,
  GraduationCap
} from 'lucide-react';
import { toast } from 'sonner';

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

interface StandaloneQuizManualGradingProps {
  onBack?: () => void;
}

export const StandaloneQuizManualGrading: React.FC<StandaloneQuizManualGradingProps> = ({ onBack }) => {
  const { user } = useAuth();
  const [attempts, setAttempts] = useState<AttemptForGrading[]>([]);
  const [selectedAttempt, setSelectedAttempt] = useState<AttemptForGrading | null>(null);
  const [textAnswers, setTextAnswers] = useState<TextAnswerGrade[]>([]);
  const [grades, setGrades] = useState<Record<string, number>>({});
  const [feedback, setFeedback] = useState<Record<string, string>>({});
  const [overallFeedback, setOverallFeedback] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

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
    setGrades(prev => ({ ...prev, [questionId]: grade }));
  };

  const handleFeedbackChange = (questionId: string, feedbackText: string) => {
    setFeedback(prev => ({ ...prev, [questionId]: feedbackText }));
  };

  const handleSaveGrades = async () => {
    if (!selectedAttempt || !user) return;

    try {
      setSaving(true);
      
      // Prepare grades data
      const gradesData = textAnswers.map(item => ({
        question_id: item.question_id,
        grade: grades[item.question_id] || 0,
        feedback: feedback[item.question_id] || ''
      }));

      // Complete manual grading
      await StandaloneQuizService.completeManualGrading(
        selectedAttempt.attempt_id,
        user.id,
        gradesData,
        overallFeedback
      );

      toast.success('Grades saved successfully!');
      
      // Refresh the attempts list
      await loadAttemptsRequiringGrading();
      setSelectedAttempt(null);
      setTextAnswers([]);
      setGrades({});
      setFeedback({});
      setOverallFeedback('');
    } catch (error) {
      console.error('Error saving grades:', error);
      toast.error('Failed to save grades');
    } finally {
      setSaving(false);
    }
  };

  const isGradingComplete = () => {
    return textAnswers.every(item => 
      grades[item.question_id] !== undefined && 
      grades[item.question_id] !== null &&
      grades[item.question_id] >= 0 &&
      grades[item.question_id] <= 100
    );
  };

  if (loading && attempts.length === 0) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading attempts requiring grading...</p>
        </div>
      </div>
    );
  }

  if (attempts.length === 0) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <GraduationCap className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Manual Grading Required</h3>
          <p className="text-gray-600 mb-4">There are currently no quiz attempts that require manual grading.</p>
          {onBack && (
            <Button onClick={onBack} variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Quiz Management
            </Button>
          )}
        </div>
      </div>
    );
  }

  if (selectedAttempt) {
    return (
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Manual Grading</h2>
            <p className="text-gray-600">Grade text answer questions for student submissions</p>
          </div>
          <Button onClick={() => setSelectedAttempt(null)} variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Attempts
          </Button>
        </div>

        {/* Attempt Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {selectedAttempt.quiz_title}
            </CardTitle>
            <CardDescription>
              <div className="flex items-center gap-4 text-sm">
                <span className="flex items-center gap-1">
                  <User className="h-4 w-4" />
                  {selectedAttempt.student_name} ({selectedAttempt.student_email})
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  Attempt #{selectedAttempt.attempt_number}
                </span>
                <span>
                  Submitted: {new Date(selectedAttempt.submitted_at).toLocaleDateString()}
                </span>
              </div>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{selectedAttempt.total_questions}</div>
                <div className="text-sm text-gray-600">Total Questions</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">{selectedAttempt.text_answer_questions}</div>
                <div className="text-sm text-gray-600">Text Answers</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{selectedAttempt.auto_graded_score}</div>
                <div className="text-sm text-gray-600">Auto-Graded Score</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">{selectedAttempt.pending_grades}</div>
                <div className="text-sm text-gray-600">Pending Grades</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Text Answer Questions */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Text Answer Questions</h3>
          
          {textAnswers.map((item, index) => (
            <Card key={item.question_id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">
                    Question {item.question_position} ({item.question_points} points)
                  </CardTitle>
                  <Badge variant="outline">
                    {item.current_grade !== null && item.current_grade !== undefined ? 'Graded' : 'Pending'}
                  </Badge>
                </div>
                <CardDescription>{item.question_text}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Student Answer */}
                <div>
                  <Label className="text-sm font-medium text-gray-700">Student Answer:</Label>
                  <div className="mt-1 p-3 bg-gray-50 rounded-md border">
                    <p className="text-sm whitespace-pre-wrap">{item.student_answer || 'No answer provided'}</p>
                  </div>
                </div>

                {/* Grade Input */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor={`grade-${item.question_id}`}>Grade (0-100)</Label>
                    <Input
                      id={`grade-${item.question_id}`}
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      value={grades[item.question_id] || ''}
                      onChange={(e) => handleGradeChange(item.question_id, parseFloat(e.target.value) || 0)}
                      placeholder="Enter grade..."
                    />
                  </div>
                  <div>
                    <Label htmlFor={`feedback-${item.question_id}`}>Feedback (Optional)</Label>
                    <Textarea
                      id={`feedback-${item.question_id}`}
                      value={feedback[item.question_id] || ''}
                      onChange={(e) => handleFeedbackChange(item.question_id, e.target.value)}
                      placeholder="Provide feedback to the student..."
                      rows={2}
                    />
                  </div>
                </div>

                {/* Previous Grade Info */}
                {item.graded_by && (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Previously graded by {item.graded_by} on {new Date(item.graded_at!).toLocaleDateString()}
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Overall Feedback */}
        <Card>
          <CardHeader>
            <CardTitle>Overall Feedback</CardTitle>
            <CardDescription>Provide general feedback for this quiz attempt</CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              value={overallFeedback}
              onChange={(e) => setOverallFeedback(e.target.value)}
              placeholder="Provide overall feedback for this quiz attempt..."
              rows={3}
            />
          </CardContent>
        </Card>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button 
            onClick={handleSaveGrades} 
            disabled={!isGradingComplete() || saving}
            className="bg-green-600 hover:bg-green-700"
          >
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Grades
              </>
            )}
          </Button>
        </div>

        {!isGradingComplete() && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Please provide grades for all text answer questions before saving.
            </AlertDescription>
          </Alert>
        )}
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Manual Grading Queue</h2>
          <p className="text-gray-600">Grade text answer questions for student quiz attempts</p>
        </div>
        {onBack && (
          <Button onClick={onBack} variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Quiz Management
          </Button>
        )}
      </div>

      <div className="grid gap-4">
        {attempts.map((attempt) => (
          <Card key={attempt.attempt_id} className="cursor-pointer hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <h3 className="font-semibold text-lg">{attempt.quiz_title}</h3>
                  <div className="flex items-center gap-4 text-sm text-gray-600 mt-1">
                    <span className="flex items-center gap-1">
                      <User className="h-4 w-4" />
                      {attempt.student_name}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      Attempt #{attempt.attempt_number}
                    </span>
                    <span>
                      {new Date(attempt.submitted_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="text-sm text-gray-600">Auto-Graded</div>
                    <div className="font-semibold text-green-600">{attempt.auto_graded_score}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-gray-600">Pending</div>
                    <div className="font-semibold text-orange-600">{attempt.pending_grades}</div>
                  </div>
                  <Button onClick={() => handleAttemptSelect(attempt)}>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Grade
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
