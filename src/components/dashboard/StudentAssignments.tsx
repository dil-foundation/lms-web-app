import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/EmptyState';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
  GraduationCap,
  Paperclip
} from 'lucide-react';
import { useState, useEffect, memo, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ContentLoader } from '../ContentLoader';
import { useAuth } from '@/hooks/useAuth';

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
  overview?: string;
  description: string;
  dueDate: string;
  status: 'pending' | 'submitted' | 'graded';
  courseTitle: string;
  courseId: string;
  submittedAt?: string;
  gradedAt?: string;
  feedback?: string;
  attachments: { name: string; url: string }[];
  submissionId?: string;
  submissionContent?: string;
  submissionType?: 'text' | 'file' | 'link';
  score?: number;
}

interface StudentAssignmentsProps {
  userProfile: Profile;
}

const AssignmentDetailModal = memo(({ 
  assignment,
  isDownloading,
  handleDownload,
}: { 
  assignment: Assignment | null,
  isDownloading: string | null,
  handleDownload: (url: string, name: string) => void,
}) => {
  if (!assignment) return null;

  return (
    <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0 bg-card border border-border backdrop-blur-sm">
      {/* Premium Header */}
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-primary/5"></div>
        <div className="relative p-6 border-b border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-primary/10 to-primary/20 rounded-2xl flex items-center justify-center">
                <ClipboardList className="w-6 h-6 text-primary" />
              </div>
              <div>
                <DialogTitle className="text-2xl font-bold tracking-tight bg-gradient-to-r from-primary via-primary to-primary/80 bg-clip-text text-transparent" style={{ backgroundClip: 'text', WebkitBackgroundClip: 'text' }}>
                  {assignment.title}
                </DialogTitle>
                <DialogDescription className="text-lg text-muted-foreground mt-2 leading-relaxed">
                  Assignment Details
                </DialogDescription>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="p-8 space-y-8">
          
          {/* Course Information */}
          <Card className="bg-card border border-border backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-xl">
                <BookOpen className="w-6 h-6 text-primary" />
                Course Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label className="text-sm font-medium text-foreground">Course</Label>
                  <p className="text-lg font-semibold text-foreground mt-1">{assignment.courseTitle}</p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-foreground">Due Date</Label>
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-gradient-to-r from-primary/5 to-primary/10 border border-primary/20">
                      <Calendar className="w-4 h-4 text-primary" />
                      <span className="font-medium">{formatDate(assignment.dueDate)}</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-foreground">Status</Label>
                    <div className="flex items-center gap-2">
                      <Badge variant={getStatusColor(assignment.status)} className="capitalize px-3 py-1">
                        {getStatusIcon(assignment.status)}
                        <span className="ml-1">{assignment.status}</span>
                      </Badge>
                      {isOverdue(assignment.dueDate, assignment.status) && (
                        <Badge variant="destructive" className="px-3 py-1">Overdue</Badge>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Assignment Description */}
          <Card className="bg-card border border-border backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-xl">
                <FileText className="w-6 h-6 text-primary" />
                Assignment Description
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="prose prose-sm max-w-none dark:prose-invert prose-headings:text-foreground prose-p:text-muted-foreground prose-strong:text-foreground prose-a:text-primary" dangerouslySetInnerHTML={{ __html: assignment.description }}/>
            </CardContent>
          </Card>

          {/* Grade & Feedback Section */}
          {assignment.status === 'graded' && (
            <Card className="bg-card border border-border backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-3 text-xl">
                  <GraduationCap className="w-6 h-6 text-primary" />
                  Grade & Feedback
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="p-6 rounded-lg bg-gradient-to-r from-green-50 to-green-100/50 dark:from-green-900/10 dark:to-green-800/10 border border-green-200/50 dark:border-green-700/50">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-sm font-medium text-foreground">Grade</Label>
                        <p className="text-3xl font-bold text-green-600 dark:text-green-400 mt-1">
                          {assignment.score != null ? `${assignment.score}%` : 'Not Graded'}
                        </p>
                      </div>
                      <div className="w-16 h-16 bg-gradient-to-br from-green-100 to-green-200 dark:from-green-900 dark:to-green-800 rounded-full flex items-center justify-center">
                        <GraduationCap className="w-8 h-8 text-green-600 dark:text-green-400" />
                      </div>
                    </div>
                  </div>
                  
                  {assignment.feedback && (
                    <div className="space-y-3">
                      <Label className="text-sm font-medium text-foreground">Feedback from your teacher</Label>
                      <div className="p-4 rounded-lg bg-gradient-to-r from-blue-50 to-blue-100/50 dark:from-blue-900/10 dark:to-blue-800/10 border border-blue-200/50 dark:border-blue-700/50">
                        <p className="text-sm text-muted-foreground leading-relaxed">{assignment.feedback}</p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Submission Information */}
          {assignment.submittedAt && (
            <Card className="bg-card border border-border backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-3 text-xl">
                  <CheckCircle className="w-6 h-6 text-primary" />
                  Submission Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2 p-3 rounded-lg bg-gradient-to-r from-primary/5 to-primary/10 border border-primary/20">
                  <Calendar className="w-4 h-4 text-primary" />
                  <span className="font-medium">Submitted on {formatDate(assignment.submittedAt)}</span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Attachments */}
          {assignment.attachments && assignment.attachments.length > 0 && (
            <Card className="bg-card border border-border backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-3 text-xl">
                  <Paperclip className="w-6 h-6 text-primary" />
                  Assignment Attachments
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {assignment.attachments.map((attachment, index) => (
                    <div key={index} className="flex items-center justify-between p-4 rounded-lg bg-gradient-to-r from-gray-50 to-gray-100/50 dark:from-gray-800/50 dark:to-gray-700/50 border border-gray-200/50 dark:border-gray-600/50 hover:shadow-md transition-all duration-200">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="w-10 h-10 bg-gradient-to-br from-primary/10 to-primary/20 rounded-lg flex items-center justify-center flex-shrink-0">
                          <FileText className="w-5 h-5 text-primary" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <span className="font-medium text-foreground truncate block" title={attachment.name}>
                            {attachment.name}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0 ml-4">
                        <Button
                          variant="outline"
                          size="sm"
                          asChild
                          className="hover:bg-primary/10 hover:border-primary/30 whitespace-nowrap"
                        >
                          <a href={attachment.url} target="_blank" rel="noopener noreferrer">
                            <Eye className="h-4 w-4 mr-2" />
                            View
                          </a>
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDownload(attachment.url, attachment.name)}
                          disabled={isDownloading === attachment.name}
                          className="hover:bg-primary/10 hover:border-primary/30 whitespace-nowrap"
                        >
                          {isDownloading === attachment.name ? (
                            <Clock className="h-4 w-4 mr-2 animate-spin" />
                          ) : (
                            <Download className="h-4 w-4 mr-2" />
                          )}
                          {isDownloading === attachment.name ? 'Downloading...' : 'Download'}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </DialogContent>
  );
});

const AssignmentSubmissionModal = memo(({ 
  assignment,
  submissionText,
  setSubmissionText,
  submissionLink,
  setSubmissionLink,
  submissionFile,
  setSubmissionFile,
  handleSubmission,
  isDownloading,
  handleDownload,
  activeTab,
  setActiveTab,
  existingFileName,
  existingFileUrl,
}: { 
  assignment: Assignment | null,
  submissionText: string,
  setSubmissionText: (value: string) => void,
  submissionLink: string,
  setSubmissionLink: (value: string) => void,
  submissionFile: File | null,
  setSubmissionFile: (file: File | null) => void,
  handleSubmission: (assignmentId: string) => void,
  isDownloading: string | null,
  handleDownload: (url: string, name: string) => void,
  activeTab: string,
  setActiveTab: (tab: string) => void,
  existingFileName: string | null,
  existingFileUrl: string | null,
}) => {
  if (!assignment) return null;

  const [pendingTab, setPendingTab] = useState<string | null>(null);
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);

  const hasUnsavedChanges = () => {
    return submissionText.trim() !== '' || submissionFile !== null || submissionLink.trim() !== '';
  };
  
  const clearSubmissions = () => {
    setSubmissionText('');
    setSubmissionFile(null);
    setSubmissionLink('');
  };

  const handleTabChange = (newTab: string) => {
    if (newTab !== activeTab && hasUnsavedChanges()) {
      setPendingTab(newTab);
      setIsConfirmDialogOpen(true);
    } else {
      setActiveTab(newTab);
    }
  };

  const handleConfirmSwitch = () => {
    if (pendingTab) {
      clearSubmissions();
      setActiveTab(pendingTab);
    }
    setIsConfirmDialogOpen(false);
    setPendingTab(null);
  };

  const handleCancelSwitch = () => {
    setIsConfirmDialogOpen(false);
    setPendingTab(null);
  };

  return (
    <>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col p-0">
        <DialogHeader className="p-6 pb-4 border-b">
          <DialogTitle>Submit Assignment: {assignment.title}</DialogTitle>
          <DialogDescription className="sr-only">
            Submission form for assignment: {assignment.title}
          </DialogDescription>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-4">
            <div className="p-4 bg-muted rounded-lg">
              <h4 className="font-medium">Assignment Details</h4>
              <div className="text-sm text-muted-foreground mt-1 prose prose-sm max-w-none dark:prose-invert" dangerouslySetInnerHTML={{ __html: assignment.description }}/>
              <p className="text-sm mt-2">
                <strong>Due:</strong> {formatDate(assignment.dueDate)}
              </p>
              {assignment.attachments && assignment.attachments.length > 0 && (
                <div className="mt-4">
                  <Label className="text-sm font-medium">Attachments</Label>
                  <div className="space-y-2 mt-1">
                    {assignment.attachments.map((attachment, index) => (
                      <div key={index} className="flex items-center justify-between p-2 border rounded bg-background">
                        <span className="text-sm">{attachment.name}</span>
                        <div className="flex items-center gap-1">
                          <a href={attachment.url} target="_blank" rel="noopener noreferrer">
                            <Button variant="ghost" size="icon">
                              <Eye className="h-4 w-4" />
                            </Button>
                          </a>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDownload(attachment.url, attachment.name)}
                            disabled={isDownloading === attachment.name}
                          >
                            {isDownloading === attachment.name ? <Clock className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
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
                      {existingFileName && !submissionFile && existingFileUrl && (
                        <div className="mt-4 p-2 border rounded bg-muted/50 text-left">
                          <p className="text-sm text-muted-foreground mb-1">Current submission:</p>
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-green-600 truncate flex-1 pr-2">{existingFileName}</span>
                            <div className="flex items-center gap-1 flex-shrink-0">
                              <a href={existingFileUrl} target="_blank" rel="noopener noreferrer">
                                <Button variant="ghost" size="icon">
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </a>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDownload(existingFileUrl, existingFileName)}
                                disabled={isDownloading === existingFileName}
                              >
                                {isDownloading === existingFileName ? <Clock className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                              </Button>
                            </div>
                          </div>
                        </div>
                      )}
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
                  disabled={!submissionFile && !existingFileName}
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
        </div>
      </DialogContent>
      <AlertDialog open={isConfirmDialogOpen} onOpenChange={setIsConfirmDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Switch Submission Type?</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved changes in the current submission tab. If you switch, your current input will be lost.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelSwitch}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmSwitch}>Switch and Discard</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
});

// Helper functions need to be available to the modals, so we define them here.
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
  if (!dateString) return 'No due date';
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

const isOverdue = (dueDate: string, status: string) => {
  return dueDate && new Date(dueDate) < new Date() && status === 'pending';
};

export const StudentAssignments = ({ userProfile }: StudentAssignmentsProps) => {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isSubmissionModalOpen, setIsSubmissionModalOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'submitted' | 'graded'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [submissionText, setSubmissionText] = useState('');
  const [submissionLink, setSubmissionLink] = useState('');
  const [submissionFile, setSubmissionFile] = useState<File | null>(null);
  const { user } = useAuth();
  const [isDownloading, setIsDownloading] = useState<string | null>(null);
  const [activeSubmissionTab, setActiveSubmissionTab] = useState('text');
  const [existingFileName, setExistingFileName] = useState<string | null>(null);
  const [existingFileUrl, setExistingFileUrl] = useState<string | null>(null);

  const handleDownload = async (url: string, name: string) => {
    setIsDownloading(name);
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Download failed: ${response.statusText}`);
        const blob = await response.blob();
        const link = document.createElement('a');
        link.href = window.URL.createObjectURL(blob);
        link.download = name;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(link.href);
    } catch (error: any) {
        toast.error("Failed to download attachment.", { description: error.message });
        console.error("Download error:", error);
    } finally {
        setIsDownloading(null);
    }
  };

  const fetchAssignments = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    setLoading(true);
    
    try {
      const { data, error } = await supabase.rpc('get_student_assignments', { p_user_id: user.id });

      if (error) {
        throw error;
      }

      const processDescription = (htmlString: string | null) => {
        if (!htmlString) return { attachments: [], cleanedHtml: '' };
        
        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlString, 'text/html');
        const links = Array.from(doc.querySelectorAll('a'));
        const foundAttachments: { url: string, name: string }[] = [];

        for (const link of links) {
          if (link.href && (link.href.includes('/assignment-assets/files/') || link.href.includes('/assignment-assets/images/'))) {
            foundAttachments.push({
              url: link.href,
              name: link.textContent || 'download',
            });
            // If the link is the only content in a paragraph, remove the paragraph. Otherwise just the link.
            if (link.parentElement?.tagName === 'P' && link.parentElement.textContent?.trim() === link.textContent?.trim()) {
              link.parentElement.remove();
            } else {
              link.remove();
            }
          }
        }
        return { attachments: foundAttachments, cleanedHtml: doc.body.innerHTML };
      };
      
      const formattedAssignments: Assignment[] = data.map((item: any) => {
        let status: Assignment['status'] = 'pending';
        if (item.submission_status === 'graded') {
          status = 'graded';
        } else if (item.submission_status === 'submitted') {
          status = 'submitted';
        }

        const { attachments, cleanedHtml } = processDescription(item.description);

        return {
          id: item.id,
          title: item.title,
          overview: item.overview,
          description: cleanedHtml,
          dueDate: item.due_date,
          status: status,
          courseTitle: item.course_title,
          courseId: item.course_id,
          submittedAt: item.submitted_at,
          gradedAt: item.graded_at,
          feedback: item.feedback,
          attachments: attachments,
          submissionId: item.submission_id,
          submissionContent: item.submission_content,
          submissionType: item.submission_type,
          score: item.grade,
        };
      });

      setAssignments(formattedAssignments);
    } catch (error: any) {
      console.error("Error fetching assignments:", error);
      toast.error("Failed to load assignments.", {
        description: error.message || "Please try reloading the page.",
      });
    }
    
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchAssignments();
  }, [fetchAssignments]);

  const filteredAssignments = assignments.filter(assignment => {
    const matchesFilter = filterStatus === 'all' || assignment.status === filterStatus;
    const matchesSearch = assignment.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         assignment.courseTitle.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const handleSubmission = async (assignmentId: string) => {
    if (!user || !selectedAssignment) return;

    let submission_type = activeSubmissionTab;
    let content: string | undefined = undefined;

    if (submission_type === 'text') {
        content = submissionText;
    } else if (submission_type === 'link') {
        content = submissionLink;
    } else if (submission_type === 'file' && submissionFile) {
        const filePath = `submission-files/${user.id}/${assignmentId}/${Date.now()}-${submissionFile.name}`;
        const { error: uploadError } = await supabase.storage
            .from('dil-lms')
            .upload(filePath, submissionFile, { upsert: true });

        if (uploadError) {
            toast.error('Failed to upload file.', { description: uploadError.message });
            return;
        }
        content = filePath;
    } else if (submission_type === 'file' && !submissionFile && selectedAssignment.submissionContent) {
        content = selectedAssignment.submissionContent;
    }

    if (content === undefined) {
        toast.error("No submission content found to save.");
        return;
    }

    const submissionData = {
        assignment_id: assignmentId,
        user_id: user.id,
        submission_type: submission_type,
        content: content,
        status: 'submitted' as const,
        submitted_at: new Date().toISOString(),
    };

    const { error } = await supabase
        .from('assignment_submissions')
        .upsert(submissionData, { onConflict: 'assignment_id,user_id' });

    if (error) {
        toast.error('Failed to submit assignment.', { description: error.message });
        console.error("Submission error:", error);
    } else {
        toast.success("Assignment submitted successfully!");
        setIsSubmissionModalOpen(false);
        fetchAssignments(); // Re-fetch assignments to show updated status
    }
  };

  const handleOpenSubmissionModal = async (assignment: Assignment) => {
    setSelectedAssignment(assignment);

    setSubmissionText('');
    setSubmissionFile(null);
    setSubmissionLink('');
    setExistingFileName(null);
    setExistingFileUrl(null);

    if (assignment.status === 'submitted' || assignment.status === 'graded') {
      const type = assignment.submissionType || 'text';
      setActiveSubmissionTab(type);
      if (type === 'text') {
        setSubmissionText(assignment.submissionContent || '');
      } else if (type === 'link') {
        setSubmissionLink(assignment.submissionContent || '');
      } else if (type === 'file' && assignment.submissionContent) {
        const fileName = assignment.submissionContent.split('/').pop() || null;
        setExistingFileName(fileName);
        
        const { data, error } = await supabase.storage
          .from('dil-lms')
          .createSignedUrl(assignment.submissionContent, 3600);
        
        if (error) {
          toast.error("Could not load existing submission file.", { description: error.message });
        } else {
          setExistingFileUrl(data.signedUrl);
        }
      }
    } else {
      setActiveSubmissionTab('text');
    }

    setIsSubmissionModalOpen(true);
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
          {assignment.overview || assignment.description.replace(/<[^>]*>?/gm, '')}
        </p>
        
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-1">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className={isOverdue(assignment.dueDate, assignment.status) ? 'text-red-600' : ''}>
                Due: {formatDate(assignment.dueDate)}
              </span>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm" onClick={() => {
              setSelectedAssignment(assignment);
              setIsDetailModalOpen(true);
            }}>
              <Eye className="h-4 w-4 mr-2" />
              View Details
            </Button>
            
            {(assignment.status === 'pending' || assignment.status === 'submitted') && (
              <Button
                size="sm"
                onClick={() => handleOpenSubmissionModal(assignment)}
              >
                <Edit className="h-4 w-4 mr-2" />
                {assignment.status === 'pending' ? 'Submit' : 'Edit Submission'}
              </Button>
            )}
          </div>
        </div>
        
        {assignment.status === 'graded' && (
          <div className="p-3 bg-muted rounded-lg space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm font-medium">Grade: </span>
                <span className="text-sm font-bold">{assignment.score != null ? `${assignment.score}%` : 'N/A'}</span>
              </div>
              <span className="text-sm text-muted-foreground">
                Graded on {assignment.gradedAt && formatDate(assignment.gradedAt)}
              </span>
            </div>
            {assignment.feedback && (
              <div>
                <span className="text-sm font-medium">Feedback: </span>
                <p className="text-sm text-muted-foreground inline">{assignment.feedback}</p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <div className="space-y-6">
        {/* Header Section */}
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-primary/5 rounded-3xl"></div>
          <div className="relative p-8 rounded-3xl">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-primary/10 to-primary/20 rounded-2xl flex items-center justify-center">
                  <ClipboardList className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-primary via-primary to-primary/80 bg-clip-text text-transparent">
                    Assignments
                  </h1>
                  <p className="text-lg text-muted-foreground font-light">
                    View and submit your course assignments.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="py-12">
          <ContentLoader message="Loading your assignments..." />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-primary/5 rounded-3xl"></div>
        <div className="relative p-8 rounded-3xl">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-primary/10 to-primary/20 rounded-2xl flex items-center justify-center">
                <ClipboardList className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-primary via-primary to-primary/80 bg-clip-text text-transparent">
                  Assignments
                </h1>
                <p className="text-lg text-muted-foreground font-light">
                  View and submit your course assignments.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by assignment or course name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-96"
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
        <Card className="bg-gradient-to-br from-card to-green-500/5 dark:bg-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Assignments</CardTitle>
            <ClipboardList className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{assignments.length}</div>
            <p className="text-xs text-muted-foreground">
              {assignments.length === 1 ? 'Assignment available' : 'Assignments available'}
            </p>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-card to-green-500/5 dark:bg-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{assignments.filter(a => a.status === 'pending').length}</div>
            <p className="text-xs text-muted-foreground">
              Awaiting submission
            </p>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-card to-green-500/5 dark:bg-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Submitted</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{assignments.filter(a => a.status === 'submitted').length}</div>
            <p className="text-xs text-muted-foreground">
              Awaiting grading
            </p>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-card to-green-500/5 dark:bg-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Graded</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{assignments.filter(a => a.status === 'graded').length}</div>
            <p className="text-xs text-muted-foreground">
              Completed assignments
            </p>
          </CardContent>
        </Card>
      </div>

      {assignments.length === 0 ? (
        <EmptyState
          title="No assignments yet"
          description="Your assignments will appear here once teachers create them"
          icon={<ClipboardList className="h-8 w-8 text-muted-foreground" />}
        />
      ) : (
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
      )}
      
      <Dialog open={isDetailModalOpen} onOpenChange={setIsDetailModalOpen}>
        <AssignmentDetailModal
          assignment={selectedAssignment}
          isDownloading={isDownloading}
          handleDownload={handleDownload}
        />
      </Dialog>
      
      <Dialog open={isSubmissionModalOpen} onOpenChange={setIsSubmissionModalOpen}>
        <AssignmentSubmissionModal 
          assignment={selectedAssignment}
          submissionText={submissionText}
          setSubmissionText={setSubmissionText}
          submissionLink={submissionLink}
          setSubmissionLink={setSubmissionLink}
          submissionFile={submissionFile}
          setSubmissionFile={setSubmissionFile}
          handleSubmission={handleSubmission}
          isDownloading={isDownloading}
          handleDownload={handleDownload}
          activeTab={activeSubmissionTab}
          setActiveTab={setActiveSubmissionTab}
          existingFileName={existingFileName}
          existingFileUrl={existingFileUrl}
        />
      </Dialog>
    </div>
  );
}; 