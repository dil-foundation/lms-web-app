import { useState } from 'react';
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  FileText,
  Search,
  Users,
  ChevronRight,
} from 'lucide-react';
import { Link, useParams } from 'react-router-dom';

const assignmentDetails = {
  title: 'QUIZTESTING',
  course: 'DIL-SE',
  type: 'quiz',
  status: 'active',
};

const statCards = [
  {
    title: 'Total Students',
    value: '3',
    icon: Users,
  },
  {
    title: 'Submitted',
    value: '2',
    icon: FileText,
  },
  {
    title: 'Pending Grading',
    value: '1',
    icon: Clock,
  },
  {
    title: 'Average Score',
    value: '85.0%',
    icon: CheckCircle2,
  },
];

const submissions = [
  {
    id: 1,
    studentName: 'Student1',
    studentInitials: 'S1',
    status: 'graded',
    score: 85,
    feedback: 'Good work.',
  },
  {
    id: 2,
    studentName: 'Student2',
    studentInitials: 'S2',
    status: 'submitted',
    score: null,
    feedback: '',
  },
];

const studentsNotSubmitted = [
  {
    id: 3,
    studentName: 'Student3',
    studentInitials: 'S3',
    status: 'not submitted',
  },
];

export const AssignmentSubmissions = () => {
  const { id: assignmentId } = useParams();
  const [isGradingOpen, setIsGradingOpen] = useState(false);
  const [selectedSubmission, setSelectedSubmission] = useState<any>(null);
  const [grade, setGrade] = useState('');
  const [feedback, setFeedback] = useState('');

  const handleOpenGrader = (submission: any) => {
    setSelectedSubmission(submission);
    setGrade(submission.score?.toString() || '');
    setFeedback(submission.feedback || '');
    setIsGradingOpen(true);
  };

  const handleSaveGrade = () => {
    console.log('Saving grade for submission', selectedSubmission.id, { grade, feedback });
    // In a real app, this would be a Supabase call to update the assignment_submissions table.
    setIsGradingOpen(false);
  };
  
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
            <Badge>{assignmentDetails.status}</Badge>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((card) => (
          <Card key={card.title}>
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
                className="w-full rounded-lg bg-background pl-8 md:w-[200px] lg:w-[320px]"
              />
            </div>
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <Select>
                <SelectTrigger className="w-full sm:w-auto">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                </SelectContent>
              </Select>
              <Select>
                <SelectTrigger className="w-full sm:w-auto">
                  <SelectValue placeholder="Name" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Name</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Actual Submissions Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-semibold">
                  Student Submissions ({submissions.length})
                </h2>
              </div>
              <p className="text-sm text-muted-foreground">
                Review and grade student submissions for this assignment
              </p>
              <div className="space-y-4">
                {submissions.map((sub) => (
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
                              src={`https://api.dicebear.com/6.x/initials/svg?seed=${sub.studentName}`}
                            />
                            <AvatarFallback>{sub.studentInitials}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-semibold">{sub.studentName}</p>
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
                              {sub.score ? `${sub.score}%` : 'Not graded'}
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

            {/* Students Who Haven't Submitted Section */}
            {studentsNotSubmitted.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-orange-500" />
                  <h2 className="text-lg font-semibold">
                    Students Who Haven't Submitted ({studentsNotSubmitted.length})
                  </h2>
                </div>
                <p className="text-sm text-muted-foreground">
                  Students who have not yet submitted their work for this assignment
                </p>
                <div className="space-y-4">
                  {studentsNotSubmitted.map((student) => (
                    <Card key={student.id} className="opacity-75">
                      <CardContent className="p-4 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <Avatar className="h-10 w-10">
                            <AvatarImage
                              src={`https://api.dicebear.com/6.x/initials/svg?seed=${student.studentName}`}
                            />
                            <AvatarFallback>{student.studentInitials}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-semibold">{student.studentName}</p>
                            <p className="text-sm text-muted-foreground">
                              No submission yet
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge variant="destructive" className="capitalize">
                            Not Submitted
                          </Badge>
                          <p className="text-sm text-muted-foreground mt-1">
                            Waiting for submission
                          </p>
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Grade Submission: {selectedSubmission?.studentName}</DialogTitle>
            <DialogDescription>
              View the submission and provide a grade and feedback.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            {/* Placeholder for submission content */}
            <div className="p-4 border rounded-lg bg-muted/50 min-h-[150px]">
              <p className="text-sm text-muted-foreground italic">Submission content would be displayed here...</p>
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
                placeholder="Enter score"
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
      </Dialog>
    </div>
  );
}; 