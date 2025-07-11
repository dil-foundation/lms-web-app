import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/EmptyState';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  ClipboardList, 
  Calendar, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  FileText, 
  Upload,
  Link as LinkIcon,
  Eye,
  Edit,
  Download,
  Filter,
  Search,
  BookOpen,
  GraduationCap
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ContentLoader } from '../ContentLoader';

type Profile = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  role: string;
  [key: string]: any;
};

interface Assignment {
  id: string;
  title: string;
  description: string;
  dueDate: string;
  status: 'pending' | 'submitted' | 'graded';
  courseTitle: string;
  courseId: string;
  points: number;
  earnedPoints?: number;
  submissionType: 'file' | 'text' | 'link';
  submittedAt?: string;
  gradedAt?: string;
  feedback?: string;
  attachments?: string[];
}

interface StudentAssignmentsProps {
  userProfile: Profile;
}

export const StudentAssignments = ({ userProfile }: StudentAssignmentsProps) => {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'submitted' | 'graded'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [submissionText, setSubmissionText] = useState('');
  const [submissionLink, setSubmissionLink] = useState('');
  const [submissionFile, setSubmissionFile] = useState<File | null>(null);

  // Mock assignments data
  const mockAssignments: Assignment[] = [
    {
      id: '1',
      title: 'Essay on Climate Change',
      description: 'Write a 1500-word essay discussing the impacts of climate change on global ecosystems. Include at least 5 peer-reviewed sources and proper citations.',
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // Due in 7 days
      status: 'pending',
      courseTitle: 'Environmental Science 101',
      courseId: 'env101',
      points: 100,
      submissionType: 'text',
      attachments: ['assignment_guidelines.pdf', 'sample_essay.docx']
    },
    {
      id: '2',
      title: 'JavaScript Calculator Project',
      description: 'Build a functional calculator using vanilla JavaScript, HTML, and CSS. The calculator should support basic arithmetic operations (+, -, *, /).',
      dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(), // Due in 3 days
      status: 'pending',
      courseTitle: 'Web Development Fundamentals',
      courseId: 'web101',
      points: 150,
      submissionType: 'link'
    },
    {
      id: '3',
      title: 'Data Analysis Report',
      description: 'Analyze the provided dataset and create a comprehensive report with visualizations. Use Python pandas and matplotlib for data processing and visualization.',
      dueDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // Overdue by 2 days
      status: 'pending',
      courseTitle: 'Data Science Basics',
      courseId: 'ds101',
      points: 120,
      submissionType: 'file',
      attachments: ['dataset.csv', 'analysis_template.ipynb']
    },
    {
      id: '4',
      title: 'Literature Review: Modern Poetry',
      description: 'Conduct a literature review on modern poetry movements from 1950-2000. Focus on at least three major poets and their contributions.',
      dueDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), // Submitted 5 days ago
      status: 'submitted',
      courseTitle: 'English Literature',
      courseId: 'eng201',
      points: 80,
      submissionType: 'text',
      submittedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: '5',
      title: 'Physics Lab Report: Pendulum Motion',
      description: 'Write a detailed lab report on your pendulum motion experiment. Include methodology, data analysis, error calculations, and conclusions.',
      dueDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'graded',
      courseTitle: 'Physics I',
      courseId: 'phy101',
      points: 90,
      earnedPoints: 85,
      submissionType: 'file',
      submittedAt: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toISOString(),
      gradedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      feedback: 'Excellent analysis and methodology. Minor issues with error calculation formatting. Well done overall!'
    },
    {
      id: '6',
      title: 'Marketing Strategy Presentation',
      description: 'Create a 15-minute presentation on a marketing strategy for a startup company. Include market analysis, target audience, and promotional tactics.',
      dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(), // Due in 2 weeks
      status: 'pending',
      courseTitle: 'Business Marketing',
      courseId: 'biz301',
      points: 110,
      submissionType: 'file',
      attachments: ['presentation_template.pptx']
    },
    {
      id: '7',
      title: 'Database Design Project',
      description: 'Design and implement a relational database for a library management system. Include ER diagrams, normalized tables, and sample queries.',
      dueDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'submitted',
      courseTitle: 'Database Systems',
      courseId: 'cs301',
      points: 140,
      submissionType: 'link',
      submittedAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString() // Submitted 6 hours ago
    },
    {
      id: '8',
      title: 'Historical Timeline: World War II',
      description: 'Create an interactive timeline of major World War II events. Include dates, locations, and brief descriptions of significant battles and political events.',
      dueDate: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'graded',
      courseTitle: 'World History',
      courseId: 'hist201',
      points: 75,
      earnedPoints: 70,
      submissionType: 'link',
      submittedAt: new Date(Date.now() - 22 * 24 * 60 * 60 * 1000).toISOString(),
      gradedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
      feedback: 'Good research and presentation. Could use more detail on the Pacific Theater events.'
    }
  ];

  useEffect(() => {
    const fetchAssignments = async () => {
      setLoading(true);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      try {
        // Replace with actual API call
        setAssignments(mockAssignments);
      } catch (error) {
        console.error("Error fetching assignments:", error);
        toast.error("Failed to load assignments.", {
          description: "Please try reloading the page.",
        });
      }
      
      setLoading(false);
    };

    fetchAssignments();
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'destructive';
      case 'submitted': return 'secondary';
      case 'graded': return 'default';
      default: return 'outline';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <AlertCircle className="h-4 w-4" />;
      case 'submitted': return <Clock className="h-4 w-4" />;
      case 'graded': return <CheckCircle className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const isOverdue = (dueDate: string, status: string) => {
    return new Date(dueDate) < new Date() && status === 'pending';
  };

  const filteredAssignments = assignments.filter(assignment => {
    const matchesFilter = filterStatus === 'all' || assignment.status === filterStatus;
    const matchesSearch = assignment.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         assignment.courseTitle.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const handleSubmission = async (assignmentId: string) => {
    // Simulate submission
    toast.success("Assignment submitted successfully!", {
      description: "Your assignment has been submitted for review.",
    });
    
    // Update assignment status
    setAssignments(prev => 
      prev.map(assignment => 
        assignment.id === assignmentId 
          ? { ...assignment, status: 'submitted' as const, submittedAt: new Date().toISOString() }
          : assignment
      )
    );
    
    // Reset form
    setSubmissionText('');
    setSubmissionLink('');
    setSubmissionFile(null);
    setSelectedAssignment(null);
  };

  const AssignmentCard = ({ assignment }: { assignment: Assignment }) => (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg">{assignment.title}</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">{assignment.courseTitle}</p>
          </div>
          <div className="flex items-center space-x-2">
            <Badge variant={getStatusColor(assignment.status)} className="capitalize">
              {getStatusIcon(assignment.status)}
              <span className="ml-1">{assignment.status}</span>
            </Badge>
            {isOverdue(assignment.dueDate, assignment.status) && (
              <Badge variant="destructive">Overdue</Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground line-clamp-2">
          {assignment.description}
        </p>
        
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-1">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className={isOverdue(assignment.dueDate, assignment.status) ? 'text-red-600' : ''}>
                Due: {formatDate(assignment.dueDate)}
              </span>
            </div>
            <div className="flex items-center space-x-1">
              <GraduationCap className="h-4 w-4 text-muted-foreground" />
              <span>{assignment.points} pts</span>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" onClick={() => setSelectedAssignment(assignment)}>
                  <Eye className="h-4 w-4 mr-2" />
                  View Details
                </Button>
              </DialogTrigger>
              <AssignmentDetailModal assignment={assignment} />
            </Dialog>
            
            {assignment.status === 'pending' && (
              <Dialog>
                <DialogTrigger asChild>
                  <Button size="sm" onClick={() => setSelectedAssignment(assignment)}>
                    <Edit className="h-4 w-4 mr-2" />
                    Submit
                  </Button>
                </DialogTrigger>
                <AssignmentSubmissionModal assignment={assignment} />
              </Dialog>
            )}
          </div>
        </div>
        
        {assignment.status === 'graded' && (
          <div className="p-3 bg-muted rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Grade: {assignment.earnedPoints}/{assignment.points}</span>
              <span className="text-sm text-muted-foreground">
                Graded on {assignment.gradedAt && formatDate(assignment.gradedAt)}
              </span>
            </div>
            {assignment.feedback && (
              <p className="text-sm text-muted-foreground mt-2">{assignment.feedback}</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );

  const AssignmentDetailModal = ({ assignment }: { assignment: Assignment }) => (
    <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>{assignment.title}</DialogTitle>
      </DialogHeader>
      <div className="space-y-4">
        <div>
          <Label className="text-sm font-medium">Course</Label>
          <p className="text-sm text-muted-foreground">{assignment.courseTitle}</p>
        </div>
        
        <div>
          <Label className="text-sm font-medium">Description</Label>
          <p className="text-sm text-muted-foreground mt-1">{assignment.description}</p>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="text-sm font-medium">Due Date</Label>
            <p className="text-sm text-muted-foreground">{formatDate(assignment.dueDate)}</p>
          </div>
          <div>
            <Label className="text-sm font-medium">Points</Label>
            <p className="text-sm text-muted-foreground">{assignment.points} pts</p>
          </div>
        </div>
        
        <div>
          <Label className="text-sm font-medium">Status</Label>
          <div className="flex items-center space-x-2 mt-1">
            <Badge variant={getStatusColor(assignment.status)} className="capitalize">
              {getStatusIcon(assignment.status)}
              <span className="ml-1">{assignment.status}</span>
            </Badge>
            {isOverdue(assignment.dueDate, assignment.status) && (
              <Badge variant="destructive">Overdue</Badge>
            )}
          </div>
        </div>
        
        {assignment.submittedAt && (
          <div>
            <Label className="text-sm font-medium">Submitted</Label>
            <p className="text-sm text-muted-foreground">{formatDate(assignment.submittedAt)}</p>
          </div>
        )}
        
        {assignment.attachments && assignment.attachments.length > 0 && (
          <div>
            <Label className="text-sm font-medium">Attachments</Label>
            <div className="space-y-2 mt-1">
              {assignment.attachments.map((attachment, index) => (
                <div key={index} className="flex items-center justify-between p-2 border rounded">
                  <span className="text-sm">{attachment}</span>
                  <Button variant="ghost" size="sm">
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </DialogContent>
  );

  const AssignmentSubmissionModal = ({ assignment }: { assignment: Assignment }) => (
    <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>Submit Assignment: {assignment.title}</DialogTitle>
      </DialogHeader>
      <div className="space-y-4">
        <div className="p-4 bg-muted rounded-lg">
          <h4 className="font-medium">Assignment Details</h4>
          <p className="text-sm text-muted-foreground mt-1">{assignment.description}</p>
          <p className="text-sm mt-2">
            <strong>Due:</strong> {formatDate(assignment.dueDate)} | <strong>Points:</strong> {assignment.points}
          </p>
        </div>
        
        <Tabs defaultValue="text" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="text">Text Submission</TabsTrigger>
            <TabsTrigger value="file">File Upload</TabsTrigger>
            <TabsTrigger value="link">Link Submission</TabsTrigger>
          </TabsList>
          
          <TabsContent value="text" className="space-y-4">
            <div>
              <Label htmlFor="submission-text">Your Submission</Label>
              <Textarea
                id="submission-text"
                placeholder="Enter your assignment submission here..."
                value={submissionText}
                onChange={(e) => setSubmissionText(e.target.value)}
                className="mt-2 min-h-[200px]"
              />
            </div>
            <Button 
              onClick={() => handleSubmission(assignment.id)}
              disabled={!submissionText.trim()}
              className="w-full"
            >
              Submit Assignment
            </Button>
          </TabsContent>
          
          <TabsContent value="file" className="space-y-4">
            <div>
              <Label htmlFor="submission-file">Upload File</Label>
              <div className="mt-2 border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center">
                <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <div className="space-y-2">
                  <p className="text-sm font-medium">Click to upload or drag and drop</p>
                  <p className="text-xs text-muted-foreground">
                    PDF, DOC, DOCX, TXT files up to 10MB
                  </p>
                  <Input
                    id="submission-file"
                    type="file"
                    accept=".pdf,.doc,.docx,.txt"
                    onChange={(e) => setSubmissionFile(e.target.files?.[0] || null)}
                    className="mt-4"
                  />
                </div>
              </div>
            </div>
            <Button 
              onClick={() => handleSubmission(assignment.id)}
              disabled={!submissionFile}
              className="w-full"
            >
              Submit Assignment
            </Button>
          </TabsContent>
          
          <TabsContent value="link" className="space-y-4">
            <div>
              <Label htmlFor="submission-link">Submission Link</Label>
              <Input
                id="submission-link"
                type="url"
                placeholder="https://example.com/your-submission"
                value={submissionLink}
                onChange={(e) => setSubmissionLink(e.target.value)}
                className="mt-2"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Provide a link to your submission (e.g., Google Drive, GitHub, etc.)
              </p>
            </div>
            <Button 
              onClick={() => handleSubmission(assignment.id)}
              disabled={!submissionLink.trim()}
              className="w-full"
            >
              Submit Assignment
            </Button>
          </TabsContent>
        </Tabs>
      </div>
    </DialogContent>
  );

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Assignments</h1>
          <p className="text-muted-foreground">
            View and submit your course assignments.
          </p>
        </div>
        <div className="py-12">
          <ContentLoader message="Loading your assignments..." />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Assignments</h1>
        <p className="text-muted-foreground">
          View and submit your course assignments.
        </p>
      </div>

      {assignments.length === 0 ? (
        <EmptyState
          title="No assignments yet"
          description="Your assignments will appear here once teachers create them"
          icon={<ClipboardList className="h-8 w-8 text-muted-foreground" />}
        />
      ) : (
        <>
          {/* Filters and Search */}
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search assignments..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-64"
                />
              </div>
              <div className="flex items-center space-x-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <Select value={filterStatus} onValueChange={(value) => setFilterStatus(value as any)}>
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="All Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="submitted">Submitted</SelectItem>
                    <SelectItem value="graded">Graded</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="text-sm text-muted-foreground">
              {filteredAssignments.length} of {assignments.length} assignments
            </div>
          </div>

          {/* Assignment Statistics */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Total Assignments</p>
                    <p className="text-2xl font-bold">{assignments.length}</p>
                  </div>
                  <ClipboardList className="h-8 w-8 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Pending</p>
                    <p className="text-2xl font-bold">{assignments.filter(a => a.status === 'pending').length}</p>
                  </div>
                  <AlertCircle className="h-8 w-8 text-orange-500" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Submitted</p>
                    <p className="text-2xl font-bold">{assignments.filter(a => a.status === 'submitted').length}</p>
                  </div>
                  <Clock className="h-8 w-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Graded</p>
                    <p className="text-2xl font-bold">{assignments.filter(a => a.status === 'graded').length}</p>
                  </div>
                  <CheckCircle className="h-8 w-8 text-green-500" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Assignment List */}
          <div className="space-y-4">
            {filteredAssignments.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No assignments match your current filters.</p>
              </div>
            ) : (
              filteredAssignments.map((assignment) => (
                <AssignmentCard key={assignment.id} assignment={assignment} />
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}; 