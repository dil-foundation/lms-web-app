import { useState, useEffect, useCallback } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, CheckCircle2, Clock, FileText, Search, Users, ChevronRight, Download, Eye } from 'lucide-react';
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

  // Event Handlers
  const handleOpenGrader = async (submission: Submission) => {
    setSelectedSubmission(submission);
    setGrade(submission.score?.toString() || '');
    setFeedback(submission.feedback || '');
    setSignedFileUrl(null);

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

  const handleSaveGrade = async () => {
    if (!selectedSubmission || !assignmentDetails || assignmentDetails.type !== 'assignment') return;

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
    
    fetchSubmissionData();
    setIsGradingOpen(false);
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
                                sub.status === 'submitted' ? 'default' : 
                                sub.status === 'graded' ? 'secondary' : 
                                'destructive'
                              }
                              className="capitalize"
                            >
                              {sub.status}
                            </Badge>
                            <p className="text-sm text-muted-foreground mt-1">
                              {sub.score ? `${sub.score.toFixed(1)}%` : 'Not graded'}
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
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Quiz Review: {selectedSubmission?.student.name}</DialogTitle>
              <DialogDescription>
                Score: {selectedSubmission?.score?.toFixed(1)}%
              </DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-6 max-h-[60vh] overflow-y-auto pr-6">
                {/* This part needs to be adapted for the new quiz data structure */}
            </div>
            <DialogFooter>
              <Button onClick={() => setIsGradingOpen(false)}>Close</Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
};
