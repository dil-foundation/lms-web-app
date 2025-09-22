import { useState, useEffect, useCallback } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, CheckCircle2, Clock, FileText, Search, Users, ChevronRight, Download, Eye, CheckCircle, XCircle, Circle, Image as ImageIcon } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { ContentLoader } from '@/components/ContentLoader';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import AccessLogService from '@/services/accessLogService';
import { MathDrawingCanvas } from '@/components/quiz/MathDrawingCanvas';

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
  // New attempt tracking fields
  attempt_number?: number;
  is_latest_attempt?: boolean;
  retry_reason?: string;
  total_attempts?: number;
}

interface QuizQuestion {
  id: string;
  question_text: string;
  question_type: 'single_choice' | 'multiple_choice' | 'text_answer' | 'math_expression';
  options: {
    id: string;
    option_text: string;
    is_correct: boolean;
    position: number;
  }[];
  position: number;
  // Math-specific fields
  math_expression?: string;
  math_tolerance?: number;
  math_hint?: string;
  math_allow_drawing?: boolean;
  // Image field for question
  image_url?: string;
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

// Component for displaying quiz question images with signed URL
const QuizQuestionImage = ({ imageUrl, onClick }: { imageUrl: string, onClick: () => void }) => {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadSignedUrl = async () => {
      if (imageUrl.startsWith('http')) {
        // Already a signed URL
        setSignedUrl(imageUrl);
        setLoading(false);
      } else {
        // It's a file path, create signed URL
        try {
          const { data, error } = await supabase.storage
            .from('dil-lms')
            .createSignedUrl(imageUrl, 3600); // 1 hour expiry
          
          if (error) {
            console.error('Error creating signed URL:', error);
            setLoading(false);
            return;
          }
          
          setSignedUrl(data.signedUrl);
        } catch (error) {
          console.error('Error creating signed URL:', error);
        } finally {
          setLoading(false);
        }
      }
    };

    loadSignedUrl();
  }, [imageUrl]);

  if (loading) {
    return (
      <div className="relative w-8 h-8 rounded-md overflow-hidden border border-purple-200 dark:border-purple-700 bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
        <div className="w-3 h-3 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!signedUrl) {
    return (
      <div className="relative w-8 h-8 rounded-md overflow-hidden border border-red-200 dark:border-red-700 bg-red-50 dark:bg-red-900/20 flex items-center justify-center">
        <ImageIcon className="w-3 h-3 text-red-500" />
      </div>
    );
  }

  return (
    <div 
      className="relative w-8 h-8 rounded-md overflow-hidden border border-purple-200 dark:border-purple-700 cursor-pointer hover:border-purple-400 dark:hover:border-purple-500 transition-colors"
      onClick={onClick}
    >
      <img 
        src={signedUrl} 
        alt="Question image" 
        className="w-full h-full object-cover"
      />
    </div>
  );
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
  const [showAllAttempts, setShowAllAttempts] = useState(false);
  const [allAttempts, setAllAttempts] = useState<Submission[]>([]);
  const [selectedStudentForAttempts, setSelectedStudentForAttempts] = useState<string | null>(null);
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const [selectedImageUrl, setSelectedImageUrl] = useState<string>('');
  const [imageLoading, setImageLoading] = useState(false);


  // Data Fetching
  const fetchSubmissionData = useCallback(async () => {
    if (!assignmentId) return;
    setLoading(true);
    setError(null);

    try {
      // First, get the assessment details
      const { data: assessmentData, error: assessmentError } = await supabase
        .rpc('get_assessment_submissions', { assessment_id: assignmentId })
        .single();

      if (assessmentError) throw assessmentError;
      if (!assessmentData) throw new Error("Assessment not found.");

      const responseData = assessmentData as any;

      setAssignmentDetails({
        title: responseData.title,
        course: responseData.course_title,
        type: responseData.content_type as 'quiz' | 'assignment',
        course_id: responseData.course_id,
        lesson_id: responseData.lesson_id
      });

      // For quizzes, use the new function to get latest attempts with attempt tracking
      if (responseData.content_type === 'quiz') {
        const { data: latestSubmissions, error: latestError } = await supabase
          .rpc('get_latest_quiz_submissions_for_assessment', { p_lesson_content_id: assignmentId });

        if (latestError) {
          console.error('Error fetching latest submissions:', latestError);
          // Fallback to original method
          const processedSubmissions = (responseData.submissions || []).map((item: any) => {
            if (item.submission) {
              return {
                ...item.submission,
                student: item.student,
                status: item.submission.status || 'submitted',
                attempt_number: 1, // Default for legacy data
                is_latest_attempt: true,
                total_attempts: 1
              }
            }
            return {
              id: item.student.id,
              student: item.student,
              status: 'not submitted' as SubmissionStatus,
            }
          });
          setAllSubmissions(processedSubmissions);
        } else {
          // Process the new data format
          const processedSubmissions = (latestSubmissions || []).map((submission: any) => ({
            ...submission,
            student: {
              id: submission.user_id,
              name: submission.student_name,
              avatar_url: undefined // Will be generated by dicebear
            },
            status: submission.manual_grading_completed ? 'graded' : 'submitted',
            score: submission.score,
            manual_grading_required: submission.manual_grading_required,
            manual_grading_completed: submission.manual_grading_completed,
            manual_grading_score: submission.manual_grading_score,
            submitted_at: submission.submitted_at,
            answers: submission.answers,
            results: submission.results,
            attempt_number: submission.attempt_number,
            is_latest_attempt: true, // This function only returns latest attempts
            retry_reason: submission.retry_reason,
            total_attempts: submission.total_attempts
          }));
          setAllSubmissions(processedSubmissions);
        }
      } else {
        // For assignments, use the original method
        const processedSubmissions = (responseData.submissions || []).map((item: any) => {
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
      }

    } catch(err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [assignmentId]);

  useEffect(() => {
    fetchSubmissionData();
  }, [fetchSubmissionData]);

  // Function to fetch all attempts for a specific student
  const fetchAllAttemptsForStudent = async (userId: string, studentName: string) => {
    if (!assignmentId) return;
    
    try {
      const { data: attempts, error } = await supabase
        .rpc('get_user_quiz_attempt_history', { 
          p_user_id: userId, 
          p_lesson_content_id: assignmentId 
        });

      if (error) {
        console.error('Error fetching attempt history:', error);
        toast.error('Failed to load attempt history');
        return;
      }

      const processedAttempts = (attempts || []).map((attempt: any) => ({
        ...attempt,
        student: {
          id: userId,
          name: studentName,
          avatar_url: undefined
        },
        status: attempt.manual_grading_completed ? 'graded' : 'submitted',
        id: `${userId}-${attempt.attempt_number}`, // Create unique ID
        manual_grading_required: attempt.manual_grading_required,
        manual_grading_completed: attempt.manual_grading_completed,
        manual_grading_score: attempt.manual_grading_score,
        answers: attempt.answers,
        results: attempt.results,
        retry_reason: attempt.retry_reason
      }));

      setAllAttempts(processedAttempts);
      setSelectedStudentForAttempts(studentName);
      setShowAllAttempts(true);
    } catch (error) {
      console.error('Error fetching attempt history:', error);
      toast.error('Failed to load attempt history');
    }
  };

  // Effect to focus grade input and prevent text selection when modal opens
  useEffect(() => {
    if (isGradingOpen) {
      const timer = setTimeout(() => {
        // Focus the grade input field
        const gradeInput = document.getElementById('grade') as HTMLInputElement;
        if (gradeInput) {
          gradeInput.focus();
          // Move cursor to end without selecting text
          if (gradeInput.value) {
            gradeInput.setSelectionRange(gradeInput.value.length, gradeInput.value.length);
          }
        }
        
        // For quiz grading, handle text answer grade inputs
        if (Object.keys(manualGrades).length > 0) {
          const inputs = document.querySelectorAll('input[type="text"]');
          inputs.forEach(input => {
            if (input instanceof HTMLInputElement && input.value) {
              // Clear any selection by moving cursor to end
              input.setSelectionRange(input.value.length, input.value.length);
            }
          });
        }
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
          image_url,
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

    // For quiz submissions with text answers or drawing math expressions, validate that all questions are graded
    if (assignmentDetails?.type === 'quiz' && quizQuestions) {
      const textAnswerQuestions = quizQuestions.filter(q => q.question_type === 'text_answer');
      const drawingMathQuestions = quizQuestions.filter(q => 
        q.question_type === 'math_expression' && 
        selectedSubmission?.answers?.[q.id]?.startsWith('{"paths":')
      );
      const manualGradingQuestions = [...textAnswerQuestions, ...drawingMathQuestions];
      
      const ungradedQuestions = manualGradingQuestions.filter(q => !manualGrades[q.id] && manualGrades[q.id] !== 0);
      
      if (ungradedQuestions.length > 0) {
        toast.error(`Please grade all ${manualGradingQuestions.length} manual grading question(s) before saving.`);
        return;
      }
      
      // Validate that all grades are valid numbers between 0 and 100
      const invalidGrades = manualGradingQuestions.filter(q => {
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
        grade: grade ? parseFloat(grade) : 0,
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
        
        // Log assignment grading
        if (user && selectedSubmission) {
          try {
            await AccessLogService.logAssignmentGrading(
              user.id,
              user.email || 'unknown@email.com',
              selectedSubmission.student.id,
              selectedSubmission.student.name,
              assignmentId || 'unknown',
              assignmentDetails.title,
              parseFloat(grade) || 0,
              feedback
            );
          } catch (logError) {
            console.error('Error logging assignment grading:', logError);
          }
        }
        }
      } else if (assignmentDetails?.type === 'quiz') {
        // Handle quiz grading
        const hasTextAnswers = quizQuestions.some(q => q.question_type === 'text_answer');
        const hasDrawingMath = quizQuestions.some(q => 
          q.question_type === 'math_expression' && 
          selectedSubmission?.answers?.[q.id]?.startsWith('{"paths":')
        );
        
        if (hasTextAnswers || hasDrawingMath) {
          // Calculate final score by combining auto-graded and manually graded questions
          const textAnswerQuestions = quizQuestions.filter(q => q.question_type === 'text_answer');
          const drawingMathQuestions = quizQuestions.filter(q => 
            q.question_type === 'math_expression' && 
            selectedSubmission?.answers?.[q.id]?.startsWith('{"paths":')
          );
          const manualGradingQuestions = [...textAnswerQuestions, ...drawingMathQuestions];
          const autoGradedQuestions = quizQuestions.filter(q => 
            q.question_type !== 'text_answer' && 
            !(q.question_type === 'math_expression' && selectedSubmission?.answers?.[q.id]?.startsWith('{"paths":'))
          );
          
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
          
          // Calculate score from manually graded questions (text answers + drawing math expressions)
          if (manualGradingQuestions.length > 0) {
            const manualScore = manualGradingQuestions.reduce((sum, q) => sum + (manualGrades[q.id] || 0), 0);
            finalScore += manualScore;
          }
          
          // Calculate final percentage
          const finalPercentage = Math.round(finalScore / totalQuestions);
          
          // Prepare grades data for the new structure
          const gradesData = manualGradingQuestions.map(q => ({
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
          const manualGradingCount = manualGradingQuestions.length;
          
          if (autoGradedCount > 0 && manualGradingCount > 0) {
            toast.success(`Grading completed! Final score: ${finalPercentage}% (Auto-graded: ${autoGradedCount} questions, Manual: ${manualGradingCount} questions)`);
          } else if (manualGradingCount > 0) {
            toast.success(`Manual grading completed! Final score: ${finalPercentage}%`);
          }
          
          // Log quiz grading
          if (user && selectedSubmission) {
            try {
              await AccessLogService.logQuizGrading(
                user.id,
                user.email || 'unknown@email.com',
                selectedSubmission.student.id,
                selectedSubmission.student.name,
                assignmentId || 'unknown',
                assignmentDetails.title,
                finalPercentage,
                feedback
              );
            } catch (logError) {
              console.error('Error logging quiz grading:', logError);
            }
          }
        } else {
          // Regular quiz grading (for quizzes with only auto-graded questions)
          const { error } = await supabase
            .from('quiz_submissions')
            .update({
              score: selectedSubmission.score || 0,
              manual_grading_completed: true
            })
            .eq('id', selectedSubmission.id);
          
          if (error) throw error;
          
          toast.success('Grade saved successfully!');
          
          // Log quiz grading
          if (user && selectedSubmission) {
            try {
              await AccessLogService.logQuizGrading(
                user.id,
                user.email || 'unknown@email.com',
                selectedSubmission.student.id,
                selectedSubmission.student.name,
                assignmentId || 'unknown',
                assignmentDetails.title,
                selectedSubmission.score || 0,
                feedback
              );
            } catch (logError) {
              console.error('Error logging quiz grading:', logError);
            }
          }
        }
    }
    
    fetchSubmissionData();
    setIsGradingOpen(false);
    } catch (error: any) {
      toast.error('Failed to save grade.', { description: error.message });
    }
  };

  // Helper function to open image modal
  const openImageModal = async (imageUrl: string) => {
    setImageLoading(true);
    setImageModalOpen(true);
    setSelectedImageUrl(''); // Clear previous image
    
    // Check if it's already a signed URL or if we need to create one
    let signedUrl = imageUrl;
    if (!imageUrl.startsWith('http')) {
      // It's a file path, create signed URL
      try {
        const { data, error } = await supabase.storage
          .from('dil-lms')
          .createSignedUrl(imageUrl, 3600);
        
        if (error) {
          console.error('Error creating signed URL:', error);
          toast.error('Failed to load image');
          setImageLoading(false);
          setImageModalOpen(false);
          return;
        }
        
        signedUrl = data.signedUrl;
      } catch (error) {
        console.error('Error creating signed URL:', error);
        toast.error('Failed to load image');
        setImageLoading(false);
        setImageModalOpen(false);
        return;
      }
    }
    setSelectedImageUrl(signedUrl);
    setImageLoading(false);
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
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <span>Click to view submission</span>
                              {assignmentDetails?.type === 'quiz' && sub.attempt_number && (
                                <>
                                  <span>•</span>
                                  <Badge variant="outline" className="text-xs">
                                    Attempt {sub.attempt_number}
                                    {sub.total_attempts && sub.total_attempts > 1 && ` of ${sub.total_attempts}`}
                                  </Badge>
                                </>
                              )}
                              {sub.retry_reason && (
                                <>
                                  <span>•</span>
                                  <span className="text-xs italic">Retry: {sub.retry_reason}</span>
                                </>
                              )}
                            </div>
                            {assignmentDetails?.type === 'quiz' && sub.total_attempts && sub.total_attempts > 1 && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-xs h-6 px-2"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  fetchAllAttemptsForStudent(sub.student.id, sub.student.name);
                                }}
                              >
                                View All {sub.total_attempts} Attempts
                              </Button>
                            )}
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
                <input
                  id="grade"
                  type="text"
                  value={grade}
                  onChange={(e) => {
                    const value = e.target.value;
                    // Only allow numbers and empty string
                    if (value === '' || /^\d+$/.test(value)) {
                      const numValue = value === '' ? 0 : parseInt(value);
                      // Ensure value is between 0 and 100
                      if (numValue >= 0 && numValue <= 100) {
                        setGrade(value);
                      }
                    }
                  }}
                  className="col-span-3 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
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
              <Button onClick={handleSaveGrade}>
                {selectedSubmission?.status === 'graded' ? 'Update Grade' : 'Save Grade'}
              </Button>
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
            <div className="py-4 space-y-6 max-h-[60vh] overflow-y-auto pr-6">
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
                                  variant={
                                    question.question_type === 'multiple_choice' ? 'blue' : 
                                    question.question_type === 'text_answer' ? 'warning' : 
                                    question.question_type === 'math_expression' ? 'secondary' : 'default'
                                  }
                                  className="text-xs"
                                >
                                  {question.question_type === 'multiple_choice' ? 'Multiple Choice' : 
                                   question.question_type === 'text_answer' ? 'Text Answer' : 
                                   question.question_type === 'math_expression' ? 'Math Expression' : 'Single Choice'}
                                </Badge>
                              </div>
                              <div className="flex items-center gap-3">
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                                  {question.question_text}
                                </h3>
                                {/* Quiz Question Image */}
                                {question.image_url && (
                                  <QuizQuestionImage 
                                    imageUrl={question.image_url}
                                    onClick={() => openImageModal(question.image_url)}
                                  />
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {question.question_type === 'text_answer' ? (
                                <Badge variant="outline" className="text-orange-600 border-orange-600 text-xs">
                                  Manual Grading Required
                                </Badge>
                              ) : question.question_type === 'math_expression' ? (
                                isCorrect ? (
                                  <CheckCircle className="h-6 w-6 text-green-600" />
                                ) : (
                                  <XCircle className="h-6 w-6 text-red-600" />
                                )
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
                            ) : question.question_type === 'math_expression' ? (
                              <div className="space-y-4">
                                {/* Check if this is a drawing answer or text input */}
                                {studentAnswer && studentAnswer.startsWith('{"paths":') ? (
                                  <div className="space-y-4">
                                    {/* Parse the drawing data to check for both drawing and text input */}
                                    {(() => {
                                      try {
                                        const drawingData = JSON.parse(studentAnswer);
                                        const hasMathExpression = drawingData.mathExpression && drawingData.mathExpression.trim() !== '';
                                        
                                        return (
                                          <>
                                            {/* Show drawing */}
                                            <div className="p-4 bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-900/20 dark:to-blue-800/10 border-2 border-blue-200 dark:border-blue-700/50 rounded-xl shadow-sm">
                                              <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-3 flex items-center gap-2">
                                                <Circle className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                                                Student's Drawing:
                                              </h4>
                                              <div className="p-4 bg-white/60 dark:bg-gray-800/60 rounded-lg border border-blue-200/50 dark:border-blue-700/30">
                                                <MathDrawingCanvas
                                                  questionId={question.id}
                                                  initialDrawing={studentAnswer}
                                                  disabled={true}
                                                  width={600}
                                                  height={400}
                                                  onDrawingChange={() => {}}
                                                />
                                              </div>
                                            </div>
                                            
                                            {/* Show text input if available */}
                                            {hasMathExpression ? (
                                              <div className="p-4 bg-gradient-to-br from-purple-50 to-purple-100/50 dark:from-purple-900/20 dark:to-purple-800/10 border-2 border-purple-200 dark:border-purple-700/50 rounded-xl shadow-sm">
                                                <h4 className="font-semibold text-purple-900 dark:text-purple-100 mb-3 flex items-center gap-2">
                                                  <Circle className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                                                  Student's Text Input:
                                                </h4>
                                                <div className="p-3 bg-white/60 dark:bg-gray-800/60 rounded-lg border border-purple-200/50 dark:border-purple-700/30">
                                                  <p className="text-gray-900 dark:text-gray-100 font-mono text-lg leading-relaxed">
                                                    {drawingData.mathExpression}
                                                  </p>
                                                </div>
                                              </div>
                                            ) : (
                                              <div className="p-3 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg">
                                                <p className="text-sm text-gray-600 dark:text-gray-400 italic">
                                                  ℹ️ Student provided drawing only - no text input was entered
                                                </p>
                                              </div>
                                            )}
                                          </>
                                        );
                                      } catch (error) {
                                        // Fallback to just showing the drawing if parsing fails
                                        return (
                                          <div className="p-4 bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-900/20 dark:to-blue-800/10 border-2 border-blue-200 dark:border-blue-700/50 rounded-xl shadow-sm">
                                            <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-3 flex items-center gap-2">
                                              <Circle className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                                              Student's Drawing:
                                            </h4>
                                            <div className="p-4 bg-white/60 dark:bg-gray-800/60 rounded-lg border border-blue-200/50 dark:border-blue-700/30">
                                              <MathDrawingCanvas
                                                questionId={question.id}
                                                initialDrawing={studentAnswer}
                                                disabled={true}
                                                width={600}
                                                height={400}
                                                onDrawingChange={() => {}}
                                              />
                                            </div>
                                          </div>
                                        );
                                      }
                                    })()}
                                    
                                    {/* Manual grading interface for drawing and text input */}
                                    <div className="space-y-4 p-4 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-700 rounded-lg">
                                      <h5 className="font-medium text-orange-900 dark:text-orange-100">
                                        {(() => {
                                          try {
                                            const drawingData = JSON.parse(studentAnswer);
                                            const hasMathExpression = drawingData.mathExpression && drawingData.mathExpression.trim() !== '';
                                            return hasMathExpression ? 'Grade This Answer (Drawing + Text Input):' : 'Grade This Drawing:';
                                          } catch (error) {
                                            return 'Grade This Drawing:';
                                          }
                                        })()}
                                      </h5>
                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                                              if (value === '' || /^\d+$/.test(value)) {
                                                const numValue = value === '' ? 0 : parseInt(value);
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
                                            placeholder={(() => {
                                              try {
                                                const drawingData = JSON.parse(studentAnswer);
                                                const hasMathExpression = drawingData.mathExpression && drawingData.mathExpression.trim() !== '';
                                                return hasMathExpression ? 'Provide feedback for this answer (drawing and text input)...' : 'Provide feedback for this drawing...';
                                              } catch (error) {
                                                return 'Provide feedback for this drawing...';
                                              }
                                            })()}
                                          />
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="space-y-4">
                                    {/* Text-only math expression answer */}
                                    <div className="p-4 bg-gradient-to-br from-purple-50 to-purple-100/50 dark:from-purple-900/20 dark:to-purple-800/10 border-2 border-purple-200 dark:border-purple-700/50 rounded-xl shadow-sm">
                                      <h4 className="font-semibold text-purple-900 dark:text-purple-100 mb-3 flex items-center gap-2">
                                        <Circle className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                                        Student's Text Input:
                                      </h4>
                                      <div className="p-3 bg-white/60 dark:bg-gray-800/60 rounded-lg border border-purple-200/50 dark:border-purple-700/30">
                                        <p className="text-gray-900 dark:text-gray-100 font-mono text-lg leading-relaxed">
                                          {studentAnswer || (
                                            <span className="text-gray-500 dark:text-gray-400 italic">No answer provided</span>
                                          )}
                                        </p>
                                      </div>
                                    </div>
                                    
                                    {question.math_expression && (
                                      <div className="p-4 bg-gradient-to-br from-green-50 to-green-100/50 dark:from-green-900/20 dark:to-green-800/10 border-2 border-green-200 dark:border-green-700/50 rounded-xl shadow-sm">
                                        <h4 className="font-semibold text-green-900 dark:text-green-100 mb-3 flex items-center gap-2">
                                          <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
                                          Expected Answer:
                                        </h4>
                                        <div className="p-3 bg-white/60 dark:bg-gray-800/60 rounded-lg border border-green-200/50 dark:border-green-700/30">
                                          <p className="text-gray-900 dark:text-gray-100 font-mono text-lg leading-relaxed">
                                            {question.math_expression}
                                          </p>
                                        </div>
                                      </div>
                                    )}
                                    
                                    {question.math_tolerance && (
                                      <div className="text-sm text-gray-600 dark:text-gray-400">
                                        <span className="font-medium">Tolerance:</span> {question.math_tolerance}
                                      </div>
                                    )}
                                  </div>
                                )}
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
                          
                          {/* Answer Summary - Only show for auto-graded questions (exclude drawing math expressions) */}
                          {question.question_type !== 'text_answer' && 
                           !(question.question_type === 'math_expression' && studentAnswer && studentAnswer.startsWith('{"paths":')) && (
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
                                    ? question.question_type === 'math_expression' 
                                      ? `Math Expression: ${studentAnswer}`
                                      : 'Answered'
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
              {assignmentDetails?.type === 'quiz' && quizQuestions && (
                (() => {
                  const textAnswerQuestions = quizQuestions.filter(q => q.question_type === 'text_answer');
                  const drawingMathQuestions = quizQuestions.filter(q => 
                    q.question_type === 'math_expression' && 
                    selectedSubmission?.answers?.[q.id]?.startsWith('{"paths":')
                  );
                  const manualGradingQuestions = [...textAnswerQuestions, ...drawingMathQuestions];
                  
                  if (manualGradingQuestions.length > 0) {
                    const allGraded = manualGradingQuestions.every(q => manualGrades[q.id] !== undefined && manualGrades[q.id] !== null);
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
                  }
                  
                  return null;
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

      {/* All Attempts Dialog */}
      <Dialog open={showAllAttempts} onOpenChange={setShowAllAttempts}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>All Attempts: {selectedStudentForAttempts}</DialogTitle>
            <DialogDescription>
              Complete attempt history for this student
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4 max-h-[60vh] overflow-y-auto">
            {allAttempts.length > 0 ? (
              <div className="space-y-4">
                {allAttempts.map((attempt, index) => (
                  <Card key={attempt.id} className="border-2 border-gray-200 dark:border-gray-700">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Badge variant="outline">
                            Attempt {attempt.attempt_number}
                          </Badge>
                          <span className="text-sm text-muted-foreground">
                            {new Date(attempt.submitted_at || '').toLocaleString()}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge 
                            variant={attempt.manual_grading_completed ? 'success' : 'default'}
                          >
                            {attempt.manual_grading_completed ? 'Graded' : 'Submitted'}
                          </Badge>
                          {attempt.score !== null && attempt.score !== undefined && (
                            <Badge variant="outline">
                              {attempt.score.toFixed(1)}%
                            </Badge>
                          )}
                        </div>
                      </div>
                      {attempt.retry_reason && (
                        <p className="text-sm text-muted-foreground italic">
                          Retry reason: {attempt.retry_reason}
                        </p>
                      )}
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-4">
                        <div className="flex-1">
                          <p className="text-sm text-muted-foreground">
                            {attempt.manual_grading_required ? 'Manual grading required' : 'Auto-graded'}
                          </p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setShowAllAttempts(false);
                            handleOpenGrader(attempt);
                          }}
                        >
                          Grade This Attempt
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No attempts found.</p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAllAttempts(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Image Modal */}
      <Dialog open={imageModalOpen} onOpenChange={(open) => {
        setImageModalOpen(open);
        if (!open) {
          setImageLoading(false);
          setSelectedImageUrl('');
        }
      }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>Question Image</DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center p-4 min-h-[400px]">
            {imageLoading ? (
              <div className="flex flex-col items-center justify-center space-y-4">
                <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                <div className="text-center">
                  <p className="text-lg font-medium text-foreground">Loading Image</p>
                  <p className="text-sm text-muted-foreground">Please wait while we prepare the image...</p>
                </div>
              </div>
            ) : selectedImageUrl ? (
              <img 
                src={selectedImageUrl} 
                alt="Question image preview" 
                className="max-w-full max-h-[70vh] object-contain rounded-lg shadow-lg transition-opacity duration-300"
                onLoad={() => setImageLoading(false)}
                onError={() => {
                  setImageLoading(false);
                  toast.error('Failed to load image');
                }}
              />
            ) : (
              <div className="flex flex-col items-center justify-center space-y-4">
                <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center">
                  <ImageIcon className="w-8 h-8 text-red-500" />
                </div>
                <div className="text-center">
                  <p className="text-lg font-medium text-foreground">Image Not Available</p>
                  <p className="text-sm text-muted-foreground">The image could not be loaded</p>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
