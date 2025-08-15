import { useState, useEffect, useCallback } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, CheckCircle2, Clock, FileText, Search, Users, ChevronRight, Download, Eye, CheckCircle, XCircle, Circle } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { ContentLoader } from '@/components/ContentLoader';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

// Types
type SubmissionStatus = 'graded' | 'submitted' | 'not submitted';

interface Student {
  id: string;
  name: string;
  avatar_url?: string;
}

interface Submission {
  id: number | string;
  student: Student;
  status: SubmissionStatus;
  score?: number | null;
  feedback?: string | null;
  submitted_at?: string;
  content?: string;
  answers?: any;
  results?: any;
  // Manual grading fields for quiz submissions
  manual_grading_required?: boolean;
  manual_grading_completed?: boolean;
  manual_grading_score?: number | null;
  manual_grading_feedback?: string | null;
  manual_grading_completed_at?: string;
  manual_grading_completed_by?: string;
  // Individual text answer grades
  text_answer_grades?: Array<{
    question_id: string;
    question_text: string;
    question_position: number;
    grade: number;
    feedback?: string;
    graded_by: string;
    graded_at: string;
  }>;
}

interface QuizQuestion {
  id: string;
  question_text: string;
  question_type: 'single_choice' | 'multiple_choice' | 'text_answer';
  options: {
    id: string;
    option_text: string;
    is_correct: boolean;
    position: number;
  }[];
  position: number;
}

interface AssignmentDetails {
  title: string;
  course: string;
  type: 'quiz' | 'assignment';
  course_id: string;
  lesson_id: string;
}

type StatCardData = {
  title: string;
  value: string;
  icon: React.ElementType;
};

// Main Component
export const AssignmentSubmissions = () => {
  const { user } = useAuth();
  const { id: assignmentId } = useParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [assignmentDetails, setAssignmentDetails] = useState<AssignmentDetails | null>(null);
  const [allSubmissions, setAllSubmissions] = useState<Submission[]>([]);

  const [isGradingOpen, setIsGradingOpen] = useState(false);
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
  const [grade, setGrade] = useState('');
  const [feedback, setFeedback] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [signedFileUrl, setSignedFileUrl] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
  const [isLoadingQuiz, setIsLoadingQuiz] = useState(false);
  const [manualGrades, setManualGrades] = useState<Record<string, number>>({});
  const [manualFeedback, setManualFeedback] = useState<Record<string, string>>({});


  // Data Fetching
  const fetchSubmissionData = useCallback(async () => {
    if (!assignmentId) return;
    setLoading(true);
    setError(null);

    try {
      const { data, error: rpcError } = await supabase
        .rpc('get_assessment_submissions', { assessment_id: assignmentId })
        .single();

      if (rpcError) throw rpcError;
      if (!data) throw new Error("Assessment not found.");

      setAssignmentDetails({
        title: data.title,
        course: data.course_title,
        type: data.content_type as 'quiz' | 'assignment',
        course_id: data.course_id,
        lesson_id: data.lesson_id
      });
      
      const processedSubmissions = (data.submissions || []).map((item: any) => {
          if (item.submission) {
              return {
                  ...item.submission,
                  student: item.student,
                  status: item.submission.status || 'submitted',
              }
          }
          return {
              id: item.student.id,
              student: item.student,
              status: 'not submitted' as SubmissionStatus,
          }
      });
      setAllSubmissions(processedSubmissions);

    } catch(err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [assignmentId]);

  useEffect(() => {
    fetchSubmissionData();
  }, [fetchSubmissionData]);

  // Effect to prevent text selection in grade inputs when modal opens
  useEffect(() => {
    if (isGradingOpen && Object.keys(manualGrades).length > 0) {
      const timer = setTimeout(() => {
        const inputs = document.querySelectorAll('input[type="text"]');
        inputs.forEach(input => {
          if (input instanceof HTMLInputElement && input.value) {
            // Clear any selection by moving cursor to end
            input.setSelectionRange(input.value.length, input.value.length);
          }
        });
      }, 100);
      
      return () => clearTimeout(timer);
    }
  }, [isGradingOpen, manualGrades]);









  // Event Handlers
  const handleOpenGrader = async (submission: Submission) => {
    setSelectedSubmission(submission);
    setGrade(submission.score?.toString() || '');
    setFeedback(submission.feedback || '');
    setSignedFileUrl(null);
    
    // Reset manual grading state
    setManualGrades({});
    setManualFeedback({});

    // If it's a quiz, fetch the quiz questions
    if (assignmentDetails?.type === 'quiz' && assignmentId) {
      await fetchQuizQuestions(assignmentId, submission);
    }

    if (submission.content && /submission-files\/[^\s]+/.test(submission.content)) {
      try {
        const { data, error } = await supabase.storage
          .from('dil-lms')
          .createSignedUrl(submission.content, 3600);
        if (error) throw error;
        setSignedFileUrl(data.signedUrl);
      } catch (err) {
        toast.error('Could not load submission file.');
        console.error(err);
      }
    }
    setIsGradingOpen(true);
  };

  const handleDownload = async (url: string, fileName: string) => {
    if (!url) return;
    setIsDownloading(true);
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error('File download failed');
      const blob = await response.blob();
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsDownloading(false);
    }
  };

  const fetchQuizQuestions = async (contentItemId: string, submission?: Submission) => {
    setIsLoadingQuiz(true);
    try {
      const { data: questions, error } = await supabase
        .from('quiz_questions')
        .select(`
          id,
          question_text,
          question_type,
          position,
          options:question_options(
            id,
            option_text,
            is_correct,
            position
          )
        `)
        .eq('lesson_content_id', contentItemId)
        .order('position');

      if (error) throw error;

      const processedQuestions = questions?.map(q => ({
        ...q,
        options: q.options.sort((a: any, b: any) => a.position - b.position)
      })) || [];

      setQuizQuestions(processedQuestions);
      
      // After questions are loaded, populate manual grading data if submission exists
      const submissionToUse = submission || selectedSubmission;
      if (submissionToUse && submissionToUse.manual_grading_completed) {
        // Set overall grade and feedback
        if (submissionToUse.manual_grading_score !== null && submissionToUse.manual_grading_score !== undefined) {
          console.log('Setting grade:', submissionToUse.manual_grading_score);
          setGrade(submissionToUse.manual_grading_score.toString());
        }
        if (submissionToUse.manual_grading_feedback) {
          console.log('Setting feedback:', submissionToUse.manual_grading_feedback);
          setFeedback(submissionToUse.manual_grading_feedback);
        }
        
        // Populate individual question grades and feedback from the new text_answer_grades table
        const textAnswerQuestions = processedQuestions.filter(q => q.question_type === 'text_answer');
        
        if (textAnswerQuestions.length > 0) {
          // Check if we have individual grades in the submission data
          if (submissionToUse.text_answer_grades && submissionToUse.text_answer_grades.length > 0) {
            console.log('Using individual grades from submission data:', submissionToUse.text_answer_grades);
            
            // Populate grades and feedback from the submission data
            const grades: Record<string, number> = {};
            const feedbackMap: Record<string, string> = {};
            
            submissionToUse.text_answer_grades.forEach((gradeData: any) => {
              grades[gradeData.question_id] = gradeData.grade;
              if (gradeData.feedback) {
                feedbackMap[gradeData.question_id] = gradeData.feedback;
              }
              console.log('Loaded grade for question:', gradeData.question_id, '=', gradeData.grade);
              console.log('Loaded feedback for question:', gradeData.question_id, '=', gradeData.feedback);
            });
            
            setManualGrades(grades);
            setManualFeedback(feedbackMap);
          } else {
            // Fallback: Fetch individual grades from the database
            const { data: individualGrades, error: gradesError } = await supabase
              .rpc('get_text_answer_grades', { submission_id: submissionToUse.id });
            
            if (gradesError) {
              console.error('Error fetching individual grades:', gradesError);
            } else {
              console.log('Fetched individual grades from database:', individualGrades);
              
              // Populate grades and feedback from the database
              const grades: Record<string, number> = {};
              const feedbackMap: Record<string, string> = {};
              
              individualGrades?.forEach((gradeData: any) => {
                grades[gradeData.question_id] = gradeData.grade;
                if (gradeData.feedback) {
                  feedbackMap[gradeData.question_id] = gradeData.feedback;
                }
                console.log('Loaded grade for question:', gradeData.question_id, '=', gradeData.grade);
                console.log('Loaded feedback for question:', gradeData.question_id, '=', gradeData.feedback);
              });
              
              setManualGrades(grades);
              setManualFeedback(feedbackMap);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error fetching quiz questions:', error);
      toast.error('Failed to load quiz questions');
    } finally {
      setIsLoadingQuiz(false);
    }
  };

  const handleSaveGrade = async () => {
    if (!selectedSubmission) return;

    // For quiz submissions with text answers, validate that all questions are graded
    if (assignmentDetails?.type === 'quiz' && quizQuestions) {
      const textAnswerQuestions = quizQuestions.filter(q => q.question_type === 'text_answer');
      const ungradedQuestions = textAnswerQuestions.filter(q => !manualGrades[q.id] && manualGrades[q.id] !== 0);
      
      if (ungradedQuestions.length > 0) {
        toast.error(`Please grade all ${textAnswerQuestions.length} text answer question(s) before saving.`);
        return;
      }
      
      // Validate that all grades are valid numbers between 0 and 100
      const invalidGrades = textAnswerQuestions.filter(q => {
        const grade = manualGrades[q.id];
        return typeof grade !== 'number' || grade < 0 || grade > 100;
      });
      
      if (invalidGrades.length > 0) {
        toast.error('Please ensure all grades are valid numbers between 0 and 100.');
        return;
      }
    }

    try {
      if (assignmentDetails?.type === 'assignment') {
        // Handle assignment grading
    const { error: updateError } = await supabase
      .from('assignment_submissions')
      .update({
        grade: parseFloat(grade),
        feedback,
        status: 'graded'
      })
      .eq('id', selectedSubmission.id);

    if (updateError) {
      toast.error(updateError.message);
      return;
    }

    const { error: rpcError } = await supabase.rpc('mark_assignment_complete', {
        p_student_id: selectedSubmission.student.id,
        p_course_id: assignmentDetails.course_id,
        p_lesson_id: assignmentDetails.lesson_id,
        p_content_item_id: assignmentId,
        p_teacher_id: user?.id
    });

    if (rpcError) {
        toast.error("Failed to mark assignment as complete for the student.", { description: rpcError.message });
    } else {
        toast.success('Grade saved and assignment marked as complete!');
        }
      } else if (assignmentDetails?.type === 'quiz') {
        // Handle quiz grading
        const hasTextAnswers = quizQuestions.some(q => q.question_type === 'text_answer');
        
        if (hasTextAnswers) {
          // Calculate final score by combining auto-graded and manually graded questions
          const textAnswerQuestions = quizQuestions.filter(q => q.question_type === 'text_answer');
          const autoGradedQuestions = quizQuestions.filter(q => q.question_type !== 'text_answer');
          
          let finalScore = 0;
          let totalQuestions = quizQuestions.length;
          
          // Calculate score from auto-graded questions
          if (autoGradedQuestions.length > 0 && selectedSubmission.results) {
            const autoGradedScore = autoGradedQuestions.reduce((sum, q) => {
              const isCorrect = selectedSubmission.results[q.id];
              return sum + (isCorrect ? 100 : 0);
            }, 0);
            finalScore += autoGradedScore;
          }
          
          // Calculate score from manually graded text answer questions
          if (textAnswerQuestions.length > 0) {
            const textAnswerScore = textAnswerQuestions.reduce((sum, q) => sum + (manualGrades[q.id] || 0), 0);
            finalScore += textAnswerScore;
          }
          
          // Calculate final percentage
          const finalPercentage = Math.round(finalScore / totalQuestions);
          
          // Prepare grades data for the new structure
          const gradesData = textAnswerQuestions.map(q => ({
            question_id: q.id,
            grade: manualGrades[q.id] || 0,
            feedback: manualFeedback[q.id] || ''
          }));
          
          // Complete manual grading using the new structure
          const { error } = await supabase.rpc('complete_manual_grading_v2', {
            submission_id: selectedSubmission.id,
            teacher_id: user?.id,
            grades_data: gradesData
          });
          
          if (error) throw error;
          
          const autoGradedCount = autoGradedQuestions.length;
          const textAnswerCount = textAnswerQuestions.length;
          
          if (autoGradedCount > 0 && textAnswerCount > 0) {
            toast.success(`Grading completed! Final score: ${finalPercentage}% (Auto-graded: ${autoGradedCount} questions, Manual: ${textAnswerCount} questions)`);
          } else if (textAnswerCount > 0) {
            toast.success(`Manual grading completed! Final score: ${finalPercentage}%`);
          }
        } else {
          // Regular quiz grading (for non-text answer quizzes)
          const { error } = await supabase
            .from('quiz_submissions')
            .update({
              score: parseFloat(grade),
              feedback: feedback
            })
            .eq('id', selectedSubmission.id);
          
          if (error) throw error;
          
          toast.success('Grade saved successfully!');
        }
    }
    
    fetchSubmissionData();
    setIsGradingOpen(false);
    } catch (error: any) {
      toast.error('Failed to save grade.', { description: error.message });
    }
  };

  // Utility Functions
  const cleanFileName = (fileName: string): string => {
    return fileName.replace(/^\d{13}-/, '');
  };

  // Derived State
  const submissionsWithStatus = allSubmissions.filter(s => s.status !== 'not submitted');
  const studentsNotSubmitted = allSubmissions.filter(s => s.status === 'not submitted');

  const filteredSubmissions = submissionsWithStatus.filter(s => 
    s.student.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredNotSubmitted = studentsNotSubmitted.filter(s => 
    s.student.name.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  const totalStudents = allSubmissions.length;
  const submittedCount = submissionsWithStatus.length;
  const gradedCount = submissionsWithStatus.filter(s => s.status === 'graded').length;
  const pendingGrading = assignmentDetails?.type === 'assignment' ? submittedCount - gradedCount : 0;
  
  const gradedSubmissions = submissionsWithStatus.filter(s => s.status === 'graded' && s.score != null);
  const totalScore = gradedSubmissions.reduce((acc, s) => acc + (s.score || 0), 0);
  const avgScore = gradedSubmissions.length > 0 ? totalScore / gradedSubmissions.length : 0;

  const statCards: StatCardData[] = [
    { title: 'Total Students', value: totalStudents.toString(), icon: Users },
    { title: 'Submitted', value: submittedCount.toString(), icon: FileText },
    { title: 'Pending Grading', value: pendingGrading.toString(), icon: Clock },
    { title: 'Average Score', value: `${avgScore.toFixed(1)}%`, icon: CheckCircle2 },
  ];

  // Render Logic
  if (loading) return <ContentLoader message="Loading submissions..." />;
  if (error) return <div className="p-8 text-center text-red-500">Error: {error}</div>;
  if (!assignmentDetails) return <div className="p-8 text-center">Assignment not found.</div>;
  
  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      <Link
        to="/dashboard/grade-assignments"
        className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Assignments
      </Link>

      <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
            {assignmentDetails.title}
          </h1>
          <div className="flex items-center gap-2 mt-1">
            <p className="text-muted-foreground">
              Grade submissions and provide feedback • {assignmentDetails.course}
            </p>
            <Badge>{assignmentDetails.type}</Badge>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((card) => (
          <Card key={card.title} className="bg-gradient-to-br from-card to-green-500/5 dark:bg-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
              <card.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{card.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="relative flex-1 md:grow-0">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search students..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full rounded-lg bg-background pl-8 md:w-[200px] lg:w-[320px]"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-semibold">
                  Student Submissions ({filteredSubmissions.length})
                </h2>
              </div>
              <p className="text-sm text-muted-foreground">
                Review and grade student submissions for this {assignmentDetails.type}
              </p>
              <div className="space-y-4">
                {filteredSubmissions.map((sub) => (
                  <div
                    key={sub.id} 
                    onClick={() => handleOpenGrader(sub)}
                    className="block"
                  >
                    <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
                      <CardContent className="p-4 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <Avatar className="h-10 w-10">
                            <AvatarImage
                              src={sub.student.avatar_url || `https://api.dicebear.com/6.x/initials/svg?seed=${sub.student.name}`}
                            />
                            <AvatarFallback>{sub.student.name.substring(0, 2)}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-semibold">{sub.student.name}</p>
                            <p className="text-sm text-muted-foreground">
                              Click to view submission
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <Badge 
                              variant={
                                sub.manual_grading_completed ? 'success' :
                                sub.status === 'submitted' ? 'default' : 
                                sub.status === 'graded' ? 'success' : 
                                'destructive'
                              }
                              className="capitalize"
                            >
                              {sub.manual_grading_completed ? 'graded' : sub.status}
                            </Badge>
                            <p className="text-sm text-muted-foreground mt-1">
                              {sub.manual_grading_completed && sub.manual_grading_score !== null 
                                ? `${sub.manual_grading_score.toFixed(1)}%` 
                                : sub.score 
                                  ? `${sub.score.toFixed(1)}%` 
                                  : 'Not graded'
                              }
                            </p>
                          </div>
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                ))}
              </div>
            </div>

            {filteredNotSubmitted.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-orange-500" />
                  <h2 className="text-lg font-semibold">
                    Students Who Haven't Submitted ({filteredNotSubmitted.length})
                  </h2>
                </div>
                <p className="text-sm text-muted-foreground">
                  Students who have not yet submitted their work
                </p>
                <div className="space-y-4">
                  {filteredNotSubmitted.map((item) => (
                    <Card key={item.student.id} className="opacity-75">
                      <CardContent className="p-4 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <Avatar className="h-10 w-10">
                            <AvatarImage
                              src={item.student.avatar_url || `https://api.dicebear.com/6.x/initials/svg?seed=${item.student.name}`}
                            />
                            <AvatarFallback>{item.student.name.substring(0, 2)}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-semibold">{item.student.name}</p>
                            <p className="text-sm text-muted-foreground">
                              No submission yet
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge variant="destructive" className="capitalize">
                            Not Submitted
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
      <Dialog open={isGradingOpen} onOpenChange={setIsGradingOpen}>
        {assignmentDetails?.type === 'assignment' ? (
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Grade Submission: {selectedSubmission?.student.name}</DialogTitle>
              <DialogDescription>
                View the submission and provide a grade and feedback.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-4">
              <div className="p-4 border rounded-lg bg-muted/50 min-h-[150px] flex items-center">
                {selectedSubmission?.content ? (
                  (() => {
                    const content = selectedSubmission.content!;
                    const isFilePath = /submission-files\/[^\s]+/.test(content);
                    const isUrl = /^(https?:\/\/[^\s/$.?#].[^\s]*)$/i.test(content);

                    if (isFilePath) {
                      const originalFileName = content.split('/').pop() ?? 'attachment';
                      const displayFileName = cleanFileName(originalFileName);
                      return signedFileUrl ? (
                        <div className="flex items-center justify-between w-full gap-4">
                          <div className="flex items-center gap-2 min-w-0">
                            <FileText className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                            <span className="text-sm font-medium truncate" title={originalFileName}>{displayFileName}</span>
                          </div>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <Button variant="ghost" size="icon" asChild>
                              <a href={signedFileUrl} target="_blank" rel="noopener noreferrer" title="View File">
                                <Eye className="h-4 w-4" />
                              </a>
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDownload(signedFileUrl!, originalFileName)}
                              disabled={isDownloading}
                              title="Download File"
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ) : <p className="text-sm text-muted-foreground italic w-full text-center">Loading file...</p>;
                    }

                    if (isUrl) {
                      return (
                        <a href={content} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline" style={{ wordBreak: 'break-all' }}>
                          {content}
                        </a>
                      );
                    }
                    
                    return <div className="prose prose-sm max-w-none dark:prose-invert" dangerouslySetInnerHTML={{ __html: content }} />;
                  })()
                ) : (
                  <p className="text-sm text-muted-foreground italic w-full text-center">No content was submitted.</p>
                )}
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="grade" className="text-right">
                  Grade
                </Label>
                <Input
                  id="grade"
                  type="number"
                  value={grade}
                  onChange={(e) => setGrade(e.target.value)}
                  className="col-span-3"
                  placeholder="Enter score (0-100)"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="feedback" className="text-right">
                  Feedback
                </Label>
                <Textarea
                  id="feedback"
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  className="col-span-3"
                  placeholder="Provide feedback for the student..."
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsGradingOpen(false)}>Cancel</Button>
              <Button onClick={handleSaveGrade}>Save Grade</Button>
            </DialogFooter>
          </DialogContent>
        ) : (
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden bg-background">
            <DialogHeader className="pb-4 border-b border-gray-200 dark:border-gray-700">
              <DialogTitle className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                Quiz Review: {selectedSubmission?.student.name}
              </DialogTitle>
              <DialogDescription className="flex items-center gap-3 mt-2">
                <span className="text-gray-600 dark:text-gray-300">
                  Score: {selectedSubmission?.manual_grading_completed && selectedSubmission?.manual_grading_score !== null 
                    ? `${selectedSubmission.manual_grading_score.toFixed(1)}%` 
                    : selectedSubmission?.score 
                      ? `${selectedSubmission.score.toFixed(1)}%` 
                      : 'Not graded'
                  }
                </span>
                {selectedSubmission?.manual_grading_completed && (
                  <Badge variant="success" className="text-xs">
                    Previously Graded
                  </Badge>
                )}
              </DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-6 max-h-[70vh] overflow-y-auto pr-6">
              {isLoadingQuiz ? (
                <div className="flex items-center justify-center py-8">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                    <p className="text-muted-foreground">Loading quiz questions...</p>
                  </div>
                </div>
              ) : quizQuestions.length > 0 ? (
                <div className="space-y-8">
                  {quizQuestions.map((question, qIndex) => {
                    const studentAnswer = selectedSubmission?.answers?.[question.id];
                    const isCorrect = selectedSubmission?.results?.[question.id];
                    const correctOptions = question.options.filter(opt => opt.is_correct);
                    
                    return (
                      <Card key={question.id} className="border-2 border-gray-200 dark:border-gray-700 bg-gradient-to-br from-card to-card/50 dark:bg-card shadow-sm hover:shadow-md transition-shadow">
                        <CardHeader>
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <Badge variant="outline" className="text-sm">
                                  Question {qIndex + 1}
                                </Badge>
                                <Badge 
                                  variant={question.question_type === 'multiple_choice' ? 'blue' : question.question_type === 'text_answer' ? 'warning' : 'default'}
                                  className="text-xs"
                                >
                                  {question.question_type === 'multiple_choice' ? 'Multiple Choice' : question.question_type === 'text_answer' ? 'Text Answer' : 'Single Choice'}
                                </Badge>
                              </div>
                              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                                {question.question_text}
                              </h3>
                            </div>
                            <div className="flex items-center gap-2">
                              {question.question_type === 'text_answer' ? (
                                <Badge variant="outline" className="text-orange-600 border-orange-600 text-xs">
                                  Manual Grading Required
                                </Badge>
                              ) : isCorrect ? (
                                <CheckCircle className="h-6 w-6 text-green-600" />
                              ) : (
                                <XCircle className="h-6 w-6 text-red-600" />
                              )}
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-3">
                            {question.question_type === 'text_answer' ? (
                              <div className="space-y-4">
                                <div className="p-4 bg-gradient-to-br from-orange-50 to-orange-100/50 dark:from-orange-900/20 dark:to-orange-800/10 border-2 border-orange-200 dark:border-orange-700/50 rounded-xl shadow-sm">
                                  <h4 className="font-semibold text-orange-900 dark:text-orange-100 mb-3 flex items-center gap-2">
                                    <Circle className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                                    Student's Answer:
                                  </h4>
                                  <div className="p-3 bg-white/60 dark:bg-gray-800/60 rounded-lg border border-orange-200/50 dark:border-orange-700/30">
                                    <p className="text-gray-900 dark:text-gray-100 whitespace-pre-wrap leading-relaxed">
                                      {studentAnswer || (
                                        <span className="text-gray-500 dark:text-gray-400 italic">No answer provided</span>
                                      )}
                                    </p>
                                  </div>
                                </div>
                                
                                <div className="space-y-4">
                                  <div>
                                    <Label className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2 flex items-center gap-2">
                                      Grade (0-100):
                                      {manualGrades[question.id] !== undefined && manualGrades[question.id] !== null && (
                                        <Badge variant="success" className="text-xs">
                                          Grade: {manualGrades[question.id]}%
                                        </Badge>
                                      )}
                                    </Label>
                                    <Input
                                      type="text"
                                      value={manualGrades[question.id] ?? ''}
                                      onChange={(e) => {
                                        const value = e.target.value;
                                        // Only allow numbers and empty string
                                        if (value === '' || /^\d+$/.test(value)) {
                                          const numValue = value === '' ? 0 : parseInt(value);
                                          // Ensure value is between 0 and 100
                                          if (numValue >= 0 && numValue <= 100) {
                                            setManualGrades(prev => ({
                                              ...prev,
                                              [question.id]: numValue
                                            }));
                                          }
                                        }
                                      }}
                                      className="bg-background border-2 border-gray-200 dark:border-gray-700 focus:border-orange-500 focus-visible:ring-2 focus-visible:ring-orange-500/20 focus-visible:ring-offset-0 focus-visible:outline-none text-gray-900 dark:text-gray-100"
                                      placeholder="Enter grade (0-100)"
                                    />
                                  </div>
                                  
                                  <div>
                                    <Label className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2 flex items-center gap-2">
                                      Feedback (Optional):
                                      {manualFeedback[question.id] && (
                                        <Badge variant="info" className="text-xs">
                                          Feedback provided
                                        </Badge>
                                      )}
                                    </Label>
                                    <Textarea
                                      value={manualFeedback[question.id] || ''}
                                      onChange={(e) => setManualFeedback(prev => ({
                                        ...prev,
                                        [question.id]: e.target.value
                                      }))}
                                      className="bg-background border-2 border-gray-200 dark:border-gray-700 focus:border-orange-500 focus-visible:ring-2 focus-visible:ring-orange-500/20 focus-visible:ring-offset-0 focus-visible:outline-none text-gray-900 dark:text-gray-100 min-h-[100px]"
                                      placeholder="Provide feedback for this answer..."
                                    />
                                  </div>
                                </div>
                              </div>
                            ) : (
                              question.options.map((option) => {
                                const isSelected = Array.isArray(studentAnswer) 
                                  ? studentAnswer.includes(option.id)
                                  : studentAnswer === option.id;
                                const isCorrectOption = option.is_correct;
                                
                                return (
                                  <div
                                    key={option.id}
                                    className={`p-4 rounded-lg border-2 transition-all ${
                                      isCorrectOption
                                        ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                                        : isSelected && !isCorrectOption
                                        ? 'border-red-500 bg-red-50 dark:bg-red-900/20'
                                        : isSelected
                                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                                        : 'border-gray-200 dark:border-gray-600'
                                    }`}
                                  >
                                    <div className="flex items-center gap-3">
                                      <div className="flex-shrink-0">
                                        {question.question_type === 'multiple_choice' ? (
                                          <div className={`w-5 h-5 border-2 rounded flex items-center justify-center ${
                                            isSelected 
                                              ? 'border-primary bg-primary' 
                                              : 'border-gray-300 dark:border-gray-600'
                                          }`}>
                                            {isSelected && (
                                              <CheckCircle className="h-3 w-3 text-white" />
                                            )}
                                          </div>
                                        ) : (
                                          <div className={`w-5 h-5 border-2 rounded-full flex items-center justify-center ${
                                            isSelected 
                                              ? 'border-primary bg-primary' 
                                              : 'border-gray-300 dark:border-gray-600'
                                          }`}>
                                            {isSelected && (
                                              <div className="w-2 h-2 bg-white rounded-full"></div>
                                            )}
                                          </div>
                                        )}
                                      </div>
                                      <span className="flex-1 text-gray-900 dark:text-gray-100">
                                        {option.option_text}
                                      </span>
                                      <div className="flex items-center gap-2">
                                        {isCorrectOption && (
                                          <Badge variant="outline" className="text-green-600 border-green-600 text-xs">
                                            Correct
                                          </Badge>
                                        )}
                                        {isSelected && (
                                          <Badge variant="outline" className="text-blue-600 border-blue-600 text-xs">
                                            Selected
                                          </Badge>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })
                              )}
                            </div>
                          
                          {/* Answer Summary - Only show for auto-graded questions */}
                          {question.question_type !== 'text_answer' && (
                            <div className="mt-4 p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                  Student's Answer:
                                </span>
                                <span className={`text-sm font-semibold ${
                                  isCorrect ? 'text-green-600' : 'text-red-600'
                                }`}>
                                  {isCorrect ? 'Correct' : 'Incorrect'}
                                </span>
                              </div>
                              <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                                {Array.isArray(studentAnswer) 
                                  ? studentAnswer.length > 0 
                                    ? `Selected ${studentAnswer.length} option(s)`
                                    : 'No answer selected'
                                  : studentAnswer 
                                    ? 'Answered'
                                    : 'No answer selected'
                                }
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">No quiz questions found.</p>
                </div>
              )}
            </div>
            <DialogFooter>
              {assignmentDetails?.type === 'quiz' && quizQuestions && quizQuestions.some((q: QuizQuestion) => q.question_type === 'text_answer') && (
                (() => {
                  const textAnswerQuestions = quizQuestions.filter(q => q.question_type === 'text_answer');
                  const allGraded = textAnswerQuestions.every(q => manualGrades[q.id] !== undefined && manualGrades[q.id] !== null);
                  const isAlreadyGraded = selectedSubmission?.manual_grading_completed;
                  
                  return (
                    <Button 
                      onClick={handleSaveGrade}
                      disabled={!allGraded}
                      className="bg-green-600 hover:bg-green-700 text-white disabled:bg-gray-400 dark:disabled:bg-gray-600 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5"
                    >
                      {isAlreadyGraded ? 'Update Grade' : 'Save Grade'}
                    </Button>
                  );
                })()
              )}
              <Button 
                onClick={() => setIsGradingOpen(false)} 
                variant="outline"
                className="border-2 border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100 transition-all duration-300"
              >
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
};
