import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  FileText,
  Save,
  Download,
  Eye,
  Calendar,
  User,
  Award,
  MessageSquare,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { ContentLoader } from '@/components/ContentLoader';

interface Student {
  id: string;
  name: string;
  email: string;
}

interface Attachment {
  name: string;
  url: string;
}

interface Submission {
  id?: number | string; // submission id
  student: Student;
  assignmentTitle: string;
  assignmentId: string;
  course: string;
  type: 'quiz' | 'assignment';
  submissionDate: string | null;
  status: 'graded' | 'submitted' | 'not submitted';
  score: number | null;
  maxScore: number;
  content: any; // Assignment content string or quiz questions object
  attachments: Attachment[];
  feedback: string | null;
  gradedAt: string | null;
  gradedBy: string | null;
  // For quizzes
  answers?: any;
  results?: any;
}


export const StudentSubmissionDetail = () => {
  const { assignmentId, studentId } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const [score, setScore] = useState('');
  const [feedback, setFeedback] = useState('');
  const [isGrading, setIsGrading] = useState(false);

  const fetchDetails = useCallback(async () => {
    if (!assignmentId || !studentId) {
      setError("Assignment or Student ID is missing.");
      setLoading(false);
      return;
    }
    setLoading(true);

    try {
      const [lessonRes, studentRes] = await Promise.all([
        supabase.from('course_lessons').select('*, course_sections(course_id, courses(title))').eq('id', assignmentId).single(),
        supabase.from('profiles').select('id, first_name, last_name, email').eq('id', studentId).single()
      ]);

      if (lessonRes.error) throw new Error(`Failed to fetch assignment: ${lessonRes.error.message}`);
      if (!lessonRes.data) throw new Error("Assignment not found.");
      if (studentRes.error) throw new Error(`Failed to fetch student: ${studentRes.error.message}`);
      if (!studentRes.data) throw new Error("Student not found.");

      const lesson = lessonRes.data;
      const studentProfile = studentRes.data;

      const student: Student = {
        id: studentProfile.id,
        name: `${studentProfile.first_name || ''} ${studentProfile.last_name || ''}`.trim(),
        email: studentProfile.email,
      };

      let submissionData: Submission = {
        student,
        assignmentTitle: lesson.title,
        assignmentId,
        course: lesson.course_sections?.courses?.title || 'Unknown Course',
        type: lesson.type as 'quiz' | 'assignment',
        submissionDate: null,
        status: 'not submitted',
        score: null,
        maxScore: 100,
        content: null,
        attachments: [],
        feedback: null,
        gradedAt: null,
        gradedBy: null,
      };

      if (lesson.type === 'assignment') {
        const { data: assgnSubmission, error } = await supabase.from('assignment_submissions')
          .select('*').eq('assignment_id', assignmentId).eq('user_id', studentId).single();
        if (error && error.code !== 'PGRST116') throw error; // Ignore 'no rows' error
        
        if (assgnSubmission) {
          submissionData = {
            ...submissionData,
            id: assgnSubmission.id,
            submissionDate: assgnSubmission.submitted_at,
            status: assgnSubmission.status,
            score: assgnSubmission.grade,
            content: assgnSubmission.content,
            feedback: assgnSubmission.feedback,
            // attachments logic to be added if available
          };
        }
      } else if (lesson.type === 'quiz') {
        const { data: quizSubmission, error } = await supabase.from('quiz_submissions')
          .select('*').eq('lesson_id', assignmentId).eq('user_id', studentId).single();
        if (error && error.code !== 'PGRST116') throw error;
        
        if (quizSubmission) {
          submissionData = {
            ...submissionData,
            id: quizSubmission.id,
            submissionDate: quizSubmission.submitted_at,
            status: 'graded',
            score: quizSubmission.score,
            content: typeof lesson.content === 'string' ? JSON.parse(lesson.content) : lesson.content,
            answers: quizSubmission.answers,
            results: quizSubmission.results,
          };
        }
      }
      
      setSubmission(submissionData);
      setScore(submissionData.score?.toString() || '');
      setFeedback(submissionData.feedback || '');

    } catch (err: any) {
      setError(err.message);
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }, [assignmentId, studentId]);

  useEffect(() => {
    fetchDetails();
  }, [fetchDetails]);


  const handleSaveGrade = async () => {
    if (!submission || !submission.id || submission.type !== 'assignment') return;
    setIsGrading(true);
    try {
      const { error } = await supabase.from('assignment_submissions')
        .update({
          grade: parseFloat(score),
          feedback: feedback,
          status: 'graded'
        })
        .eq('id', submission.id);

      if (error) throw error;
      
      toast.success('Grade saved successfully!');
      fetchDetails(); // Refresh data
    } catch (error: any) {
      toast.error('Failed to save grade');
      console.error('Error saving grade:', error);
    } finally {
      setIsGrading(false);
    }
  };

  const handleGoBack = () => {
    navigate(`/dashboard/grade-assignments/${assignmentId}`);
  };

  if (loading) return <ContentLoader message="Loading submission details..." />;

  if (error) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 space-y-6 text-center">
        <h1 className="text-2xl font-bold text-destructive">Error</h1>
        <p className="text-muted-foreground mt-2">{error}</p>
        <Button onClick={() => navigate(-1)} className="mt-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Go Back
        </Button>
      </div>
    );
  }

  if (!submission) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Submission Not Found</h1>
          <p className="text-muted-foreground mt-2">The requested submission could not be found.</p>
          <Button onClick={handleGoBack} className="mt-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Assignment
          </Button>
        </div>
      </div>
    );
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Not submitted';
    return new Date(dateString).toLocaleString();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'submitted': return 'default';
      case 'graded': return 'secondary';
      case 'not submitted': return 'destructive';
      default: return 'outline';
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      <Button
        variant="ghost"
        onClick={handleGoBack}
        className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Assignment
      </Button>

      <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
            {submission.assignmentTitle} - {submission.student.name}
          </h1>
          <div className="flex items-center gap-2 mt-1">
            <p className="text-muted-foreground">
              Grade submission and provide feedback • {submission.course}
            </p>
            <Badge variant={getStatusColor(submission.status)} className="capitalize">
              {submission.status}
            </Badge>
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Student</CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <Avatar className="h-8 w-8">
                <AvatarImage
                  src={`https://api.dicebear.com/6.x/initials/svg?seed=${submission.student.name}`}
                />
                <AvatarFallback>{submission.student.name.substring(0, 2)}</AvatarFallback>
              </Avatar>
              <div>
                <p className="font-semibold">{submission.student.name}</p>
                <p className="text-xs text-muted-foreground">{submission.student.email}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Submission Date</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-sm">{formatDate(submission.submissionDate)}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Current Score</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {submission.score ? `${submission.score}/${submission.maxScore}` : 'Not graded'}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Submission Content */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Submission Content
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {submission.type === 'assignment' && submission.content && (
              <div className="bg-muted/50 p-4 rounded-lg">
                <p className="text-sm whitespace-pre-wrap">{submission.content}</p>
              </div>
            )}
            
            {submission.type === 'quiz' && (
               <div className="space-y-4 max-h-[40vh] overflow-y-auto pr-4">
                 {submission.content?.questions?.map((q: any, index: number) => (
                   <div key={q.id} className="space-y-3 border-b pb-4">
                     <p className="font-semibold">{index + 1}. {q.text}</p>
                     <div className="space-y-2">
                       {q.options.map((opt: any) => {
                         const isSelected = submission.answers[q.id] === opt.id;
                         const isCorrect = q.correctOptionId === opt.id;
                         return (
                           <div key={opt.id}
                             className={`flex items-center gap-2 p-2 rounded-md border ${
                               isCorrect ? 'bg-green-100 dark:bg-green-900/30 border-green-300 dark:border-green-700' :
                               isSelected ? 'bg-red-100 dark:bg-red-900/30 border-red-300 dark:border-red-700' : ''
                             }`}
                           >
                             <span className="flex-1">{opt.text}</span>
                             {isSelected && <Badge variant={isCorrect ? "default" : "destructive"}>Student's Answer</Badge>}
                             {isCorrect && !isSelected && <Badge variant="secondary">Correct Answer</Badge>}
                           </div>
                         );
                       })}
                     </div>
                   </div>
                 ))}
               </div>
            )}

            {!submission.content && submission.status !== 'not submitted' && (
              <div className="text-center py-8">
                <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No submission content was provided.</p>
              </div>
            )}
            
            {submission.status === 'not submitted' && (
              <div className="text-center py-8">
                <Clock className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Student hasn't submitted yet.</p>
              </div>
            )}
            
            {/* Attachments */}
            {submission.attachments && submission.attachments.length > 0 && (
              <div className="space-y-2">
                <Label className="text-sm font-medium">Attachments</Label>
                <div className="space-y-2">
                  {submission.attachments.map((attachment, index) => (
                    <div key={index} className="flex items-center justify-between p-2 border rounded">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{attachment.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {attachment.url && (
                          <Button variant="ghost" size="sm" onClick={() => window.open(attachment.url, '_blank')}>
                            <Eye className="h-4 w-4" />
                          </Button>
                        )}
                        {attachment.url && (
                          <Button variant="ghost" size="sm" onClick={() => window.open(attachment.url, '_blank')}>
                            <Download className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

                 {/* Grading Panel */}
         <Card>
           <CardHeader>
             <CardTitle className="flex items-center gap-2">
               <Award className="h-5 w-5" />
               Grading
               {submission.gradedAt && (
                 <Badge variant="secondary" className="ml-2">
                   Previously Graded
                 </Badge>
               )}
             </CardTitle>
           </CardHeader>
                     <CardContent className="space-y-4">
             {submission.status === 'not submitted' ? (
               <div className="text-center py-8">
                 <Clock className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                 <p className="text-muted-foreground">Student hasn't submitted yet</p>
               </div>
             ) : (
               <>
                 {!submission.gradedAt && submission.type === 'assignment' && (
                   <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg">
                     <p className="text-sm text-blue-800 dark:text-blue-200 font-medium">
                       ✨ First time grading this submission
                     </p>
                   </div>
                 )}
                 {submission.type === 'assignment' ? (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="score">Score (out of {submission.maxScore})</Label>
                      <Input
                        id="score"
                        type="number"
                        min="0"
                        max={submission.maxScore}
                        value={score}
                        onChange={(e) => setScore(e.target.value)}
                        placeholder={submission.score ? `Current: ${submission.score}` : "Enter score"}
                      />
                    </div>
    
                    <div className="space-y-2">
                      <Label htmlFor="feedback">Feedback</Label>
                      <Textarea
                        id="feedback"
                        value={feedback}
                        onChange={(e) => setFeedback(e.target.value)}
                        placeholder={submission.feedback ? "Update feedback..." : "Provide feedback to the student..."}
                        rows={4}
                      />
                    </div>
    
                    <Button 
                      onClick={handleSaveGrade} 
                      disabled={isGrading}
                      className="w-full"
                    >
                      {isGrading ? (
                        <>
                          <Clock className="h-4 w-4 mr-2 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4 mr-2" />
                          {submission.gradedAt ? 'Update Grade' : 'Save Grade'}
                        </>
                      )}
                    </Button>
                  </>
                 ) : (
                  <div className="p-4 text-center">
                    <CheckCircle2 className="h-12 w-12 mx-auto text-green-500 mb-4" />
                    <p className="font-semibold">Quiz Auto-Graded</p>
                    <p className="text-muted-foreground text-sm">The student's score has been automatically calculated.</p>
                  </div>
                 )}

                {submission.gradedAt && (
                  <div className="mt-4 p-3 bg-muted/50 rounded-lg">
                    <p className="text-sm text-muted-foreground">
                      Previously graded on {formatDate(submission.gradedAt)}
                      {submission.gradedBy && ` by ${submission.gradedBy}`}
                    </p>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Previous Feedback */}
      {submission.feedback && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Previous Feedback
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-muted/50 p-4 rounded-lg">
              <p className="text-sm">{submission.feedback}</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}; 