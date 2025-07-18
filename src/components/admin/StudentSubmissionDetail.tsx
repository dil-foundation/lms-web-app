import { useState } from 'react';
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

// Mock data - replace with actual data fetching
const mockSubmissionData = {
  1: {
    id: 1,
    studentName: 'Student1',
    studentEmail: 'student1@example.com',
    studentInitials: 'S1',
    assignmentTitle: 'QUIZTESTING',
    assignmentId: 1,
    course: 'DIL-SE',
    submissionDate: '2024-01-15T10:30:00Z',
    status: 'submitted',
    score: 85,
    maxScore: 100,
    content: 'This is the student\'s submission content. They have provided detailed answers to all the questions in the quiz. The answers demonstrate a good understanding of the material.',
    attachments: [
      { name: 'quiz_answers.pdf', size: '256 KB', url: '#' },
      { name: 'additional_notes.docx', size: '128 KB', url: '#' }
    ],
    feedback: 'Good work overall. Your understanding of the core concepts is evident.',
    gradedAt: '2024-01-16T14:20:00Z',
    gradedBy: 'Teacher Name'
  },
  2: {
    id: 2,
    studentName: 'Student2',
    studentEmail: 'student2@example.com',
    studentInitials: 'S2',
    assignmentTitle: 'QUIZTESTING',
    assignmentId: 1,
    course: 'DIL-SE',
    submissionDate: '2024-01-16T14:30:00Z',
    status: 'submitted',
    score: null,
    maxScore: 100,
    content: 'This is Student2\'s submission. They have attempted to answer the questions but need some guidance on certain topics. The work shows effort but could benefit from more detailed explanations.',
    attachments: [
      { name: 'my_answers.pdf', size: '180 KB', url: '#' }
    ],
    feedback: null,
    gradedAt: null,
    gradedBy: null
  },
  3: {
    id: 3,
    studentName: 'Student3',
    studentEmail: 'student3@example.com',
    studentInitials: 'S3',
    assignmentTitle: 'QUIZTESTING',
    assignmentId: 1,
    course: 'DIL-SE',
    submissionDate: null,
    status: 'not submitted',
    score: null,
    maxScore: 100,
    content: null,
    attachments: [],
    feedback: null,
    gradedAt: null,
    gradedBy: null
  }
};

export const StudentSubmissionDetail = () => {
  const { assignmentId, studentId } = useParams();
  const navigate = useNavigate();
  
  // Get submission data (mock data for now)
  const submission = mockSubmissionData[parseInt(studentId || '1') as keyof typeof mockSubmissionData];
  
  const [score, setScore] = useState(submission?.score?.toString() || '');
  const [feedback, setFeedback] = useState(submission?.feedback || '');
  const [isGrading, setIsGrading] = useState(false);

  const handleSaveGrade = async () => {
    setIsGrading(true);
    try {
      // Mock save operation - replace with actual API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast.success('Grade saved successfully!');
      console.log('Saving grade:', { score, feedback, studentId, assignmentId });
    } catch (error) {
      toast.error('Failed to save grade');
      console.error('Error saving grade:', error);
    } finally {
      setIsGrading(false);
    }
  };

  const handleGoBack = () => {
    navigate(`/dashboard/grade-assignments/${assignmentId}`);
  };

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
            {submission.assignmentTitle} - {submission.studentName}
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
                  src={`https://api.dicebear.com/6.x/initials/svg?seed=${submission.studentName}`}
                />
                <AvatarFallback>{submission.studentInitials}</AvatarFallback>
              </Avatar>
              <div>
                <p className="font-semibold">{submission.studentName}</p>
                <p className="text-xs text-muted-foreground">{submission.studentEmail}</p>
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
            {submission.content ? (
              <div className="bg-muted/50 p-4 rounded-lg">
                <p className="text-sm whitespace-pre-wrap">{submission.content}</p>
              </div>
            ) : (
              <div className="text-center py-8">
                <Clock className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No submission content available</p>
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
                        <span className="text-xs text-muted-foreground">({attachment.size})</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="sm">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm">
                          <Download className="h-4 w-4" />
                        </Button>
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
                 {!submission.gradedAt && (
                   <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg">
                     <p className="text-sm text-blue-800 dark:text-blue-200 font-medium">
                       ✨ First time grading this submission
                     </p>
                   </div>
                 )}
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