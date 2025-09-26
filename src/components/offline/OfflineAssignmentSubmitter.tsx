// Offline Assignment Submitter Component
// Allows submitting assignments offline and queues them for sync when online

import React, { useState, useEffect } from 'react';
import { Upload, File, X, Send, Save, Wifi, WifiOff, Calendar, CheckCircle, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { useAuthSafe } from '@/hooks/useAuthSafe';
import { offlineDatabase } from '@/services/offlineDatabase';
import { toast } from 'sonner';

interface OfflineAssignmentSubmitterProps {
  assignmentContent: any;
  courseId: string;
  contentId: string;
  onSubmit?: (submission: any) => void;
}

interface AssignmentFile {
  id: string;
  name: string;
  size: number;
  type: string;
  blob: Blob;
  uploadedAt: Date;
}

interface AssignmentSubmission {
  id: string;
  userId: string;
  courseId: string;
  contentId: string;
  textResponse: string;
  files: AssignmentFile[];
  submittedAt: Date;
  syncStatus: 'pending' | 'synced' | 'failed';
  metadata: {
    userAgent: string;
    submissionMethod: 'offline' | 'online';
  };
}

const OfflineAssignmentSubmitter: React.FC<OfflineAssignmentSubmitterProps> = ({
  assignmentContent,
  courseId,
  contentId,
  onSubmit
}) => {
  const { isOnline } = useNetworkStatus();
  const { user } = useAuthSafe();
  const [textResponse, setTextResponse] = useState('');
  const [files, setFiles] = useState<AssignmentFile[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [savedLocally, setSavedLocally] = useState(false);
  const [existingSubmission, setExistingSubmission] = useState<AssignmentSubmission | null>(null);

  // Load existing submission if available
  useEffect(() => {
    const loadExistingSubmission = async () => {
      if (!user) return;
      
      try {
        // Check if there's already a submission for this assignment
        const submissions = await offlineDatabase.getQuizSubmissions(user.id, courseId);
        const existing = submissions.find(s => s.contentId === contentId && s.type === 'assignment');
        
        if (existing) {
          setExistingSubmission(existing as any);
          setTextResponse(existing.textResponse || '');
          setFiles(existing.files || []);
          setSavedLocally(true);
          
          if (existing.syncStatus === 'synced') {
            setIsSubmitted(true);
          }
          
          toast.info('Loaded your saved assignment progress');
        }
      } catch (error) {
        console.error('[OfflineAssignmentSubmitter] Failed to load existing submission:', error);
      }
    };

    loadExistingSubmission();
  }, [user, courseId, contentId]);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files || []);
    
    selectedFiles.forEach(file => {
      // Check file size (limit to 10MB for offline storage)
      if (file.size > 10 * 1024 * 1024) {
        toast.error(`File "${file.name}" is too large. Maximum size is 10MB for offline submissions.`);
        return;
      }

      const assignmentFile: AssignmentFile = {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        name: file.name,
        size: file.size,
        type: file.type,
        blob: file,
        uploadedAt: new Date()
      };

      setFiles(prev => [...prev, assignmentFile]);
    });

    // Clear the input
    event.target.value = '';
  };

  const removeFile = (fileId: string) => {
    setFiles(prev => prev.filter(f => f.id !== fileId));
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const saveProgress = async () => {
    if (!user) return;

    try {
      const submission: AssignmentSubmission = {
        id: existingSubmission?.id || `${user.id}-${courseId}-${contentId}-${Date.now()}`,
        userId: user.id,
        courseId,
        contentId,
        textResponse,
        files,
        submittedAt: new Date(),
        syncStatus: 'pending',
        metadata: {
          userAgent: navigator.userAgent,
          submissionMethod: isOnline ? 'online' : 'offline'
        }
      };

      // Save as a special assignment submission type
      await offlineDatabase.saveQuizSubmission({
        ...submission,
        type: 'assignment',
        answers: [], // Not applicable for assignments
        score: 0, // Not applicable for assignments
        totalQuestions: 0 // Not applicable for assignments
      } as any);

      setSavedLocally(true);
      setExistingSubmission(submission);
      toast.success('Assignment progress saved locally');
    } catch (error) {
      console.error('[OfflineAssignmentSubmitter] Failed to save progress:', error);
      toast.error('Failed to save assignment progress');
    }
  };

  const submitAssignment = async () => {
    if (!user) return;
    if (!textResponse.trim() && files.length === 0) {
      toast.error('Please provide a text response or upload at least one file');
      return;
    }

    setIsSubmitting(true);
    
    try {
      const submission: AssignmentSubmission = {
        id: existingSubmission?.id || `${user.id}-${courseId}-${contentId}-${Date.now()}`,
        userId: user.id,
        courseId,
        contentId,
        textResponse,
        files,
        submittedAt: new Date(),
        syncStatus: isOnline ? 'synced' : 'pending',
        metadata: {
          userAgent: navigator.userAgent,
          submissionMethod: isOnline ? 'online' : 'offline'
        }
      };

      // Save the submission
      await offlineDatabase.saveQuizSubmission({
        ...submission,
        type: 'assignment',
        answers: [], // Not applicable for assignments
        score: 0, // Not applicable for assignments
        totalQuestions: 0 // Not applicable for assignments
      } as any);

      setIsSubmitted(true);
      
      if (isOnline) {
        toast.success('Assignment submitted successfully!');
      } else {
        toast.success('Assignment saved offline! It will be submitted when you\'re back online.');
      }
      
      onSubmit?.(submission);
      
    } catch (error) {
      console.error('[OfflineAssignmentSubmitter] Failed to submit assignment:', error);
      toast.error('Failed to submit assignment');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitted) {
    return (
      <Card className="bg-gradient-to-br from-card to-card/50 dark:bg-card border border-gray-200/50 dark:border-gray-700/50 rounded-3xl shadow-lg">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-4">
            <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
          </div>
          <CardTitle className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Assignment Submitted!
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-muted-foreground">
            Your assignment has been {isOnline ? 'submitted successfully' : 'saved offline and will be submitted when you\'re back online'}.
          </p>
          
          <div className="flex items-center justify-center gap-2 mt-4">
            {isOnline ? (
              <>
                <Wifi className="w-4 h-4 text-green-600" />
                <span className="text-sm text-green-600">Submitted successfully</span>
              </>
            ) : (
              <>
                <WifiOff className="w-4 h-4 text-orange-600" />
                <span className="text-sm text-orange-600">Saved offline - will sync when online</span>
              </>
            )}
          </div>

          {files.length > 0 && (
            <div className="mt-4 p-3 bg-muted/20 rounded-lg">
              <p className="text-sm text-muted-foreground">
                {files.length} file{files.length !== 1 ? 's' : ''} attached
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Assignment Details */}
      <Card className="bg-gradient-to-br from-card to-card/50 dark:bg-card border border-gray-200/50 dark:border-gray-700/50 rounded-3xl shadow-lg">
        <CardHeader>
          <CardTitle className="text-gray-900 dark:text-gray-100">Assignment Details</CardTitle>
          {assignmentContent.due_date && (
            <div className="flex items-center gap-2 text-sm text-yellow-600 dark:text-yellow-400">
              <Calendar className="h-4 w-4" />
              <span className="font-medium">Due:</span>
              <span>{new Date(assignmentContent.due_date).toLocaleString()}</span>
            </div>
          )}
        </CardHeader>
        <CardContent>
          <div className="prose prose-sm max-w-none dark:prose-invert">
            <div dangerouslySetInnerHTML={{ 
              __html: assignmentContent.content_path || assignmentContent.description || 'Assignment instructions not available offline.'
            }} />
          </div>
        </CardContent>
      </Card>

      {/* Network Status */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isOnline ? (
            <>
              <Wifi className="w-4 h-4 text-green-600" />
              <span className="text-sm text-green-600">Online - assignment will be submitted immediately</span>
            </>
          ) : (
            <>
              <WifiOff className="w-4 h-4 text-orange-600" />
              <span className="text-sm text-orange-600">Offline - assignment will be saved locally</span>
            </>
          )}
        </div>
        
        {savedLocally && (
          <Badge variant="outline" className="text-xs">
            <Save className="w-3 h-3 mr-1" />
            Saved locally
          </Badge>
        )}
      </div>

      {/* Submission Form */}
      <Card className="bg-gradient-to-br from-card to-card/50 dark:bg-card border border-gray-200/50 dark:border-gray-700/50 rounded-3xl shadow-lg">
        <CardHeader>
          <CardTitle className="text-gray-900 dark:text-gray-100">Your Submission</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Text Response */}
          <div className="space-y-2">
            <Label htmlFor="textResponse" className="text-sm font-medium">
              Text Response
            </Label>
            <Textarea
              id="textResponse"
              placeholder="Enter your assignment response here..."
              value={textResponse}
              onChange={(e) => setTextResponse(e.target.value)}
              className="min-h-[150px] resize-none"
            />
          </div>

          {/* File Upload */}
          <div className="space-y-4">
            <Label className="text-sm font-medium">File Attachments</Label>
            
            <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center">
              <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground mb-2">
                Drag and drop files here, or click to select
              </p>
              <Input
                type="file"
                multiple
                onChange={handleFileUpload}
                className="hidden"
                id="fileUpload"
                accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.zip"
              />
              <Button
                variant="outline"
                onClick={() => document.getElementById('fileUpload')?.click()}
                className="mt-2"
              >
                Select Files
              </Button>
              <p className="text-xs text-muted-foreground mt-2">
                Maximum file size: 10MB per file (offline limit)
              </p>
            </div>

            {/* Uploaded Files List */}
            {files.length > 0 && (
              <div className="space-y-2">
                <Label className="text-sm font-medium">Attached Files ({files.length})</Label>
                {files.map((file) => (
                  <div
                    key={file.id}
                    className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-700 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <File className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">{file.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatFileSize(file.size)} • {file.type || 'Unknown type'}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFile(file.id)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-4">
            <Button
              variant="outline"
              onClick={saveProgress}
              disabled={!textResponse.trim() && files.length === 0}
            >
              <Save className="w-4 h-4 mr-2" />
              Save Progress
            </Button>

            <Button
              onClick={submitAssignment}
              disabled={(!textResponse.trim() && files.length === 0) || isSubmitting}
              className="bg-primary hover:bg-primary/90"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Submitting...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Submit Assignment
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Offline Mode Warning */}
      {!isOnline && (
        <Card className="border-orange-200 dark:border-orange-700 bg-orange-50 dark:bg-orange-900/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-orange-700 dark:text-orange-300">
              <AlertTriangle className="w-5 h-5" />
              <div>
                <p className="font-medium">Offline Mode</p>
                <p className="text-sm text-orange-600 dark:text-orange-400">
                  Your assignment and files are being saved locally and will be submitted when you're back online.
                  Large files may take longer to sync.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default OfflineAssignmentSubmitter;
