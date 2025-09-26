// Offline Course Viewer - Updated with Interactive Quiz Taking
// Displays downloaded course content when offline with full quiz functionality

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  ChevronLeft, 
  ChevronRight, 
  PlayCircle, 
  FileText, 
  HelpCircle, 
  CheckCircle, 
  Clock,
  Paperclip,
  ClipboardList,
  Download,
  Eye,
  Calendar
} from 'lucide-react';
import { useOfflineCourseData } from '@/hooks/useOfflineCourseData';
import { useOfflineProgress } from '@/hooks/useOfflineProgress';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import OfflineVideoPlayer from './OfflineVideoPlayer';
import OfflineQuizTaker from './OfflineQuizTaker';
import { toast } from 'sonner';

interface OfflineCourseViewerProps {
  courseData?: any; // Pre-loaded course data to avoid re-fetching
}

const OfflineCourseViewer: React.FC<OfflineCourseViewerProps> = ({ courseData: preloadedCourseData }) => {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const { isOnline } = useNetworkStatus();
  
  // Use pre-loaded data if available, otherwise fetch
  const { 
    course, 
    sections, 
    lessons, 
    contentItems, 
    userProgress, 
    loading, 
    error 
  } = useOfflineCourseData(courseId || '', preloadedCourseData);
  
  const { updateProgress } = useOfflineProgress();
  
  const [selectedSection, setSelectedSection] = useState<any>(null);
  const [selectedLesson, setSelectedLesson] = useState<any>(null);
  const [selectedContentItem, setSelectedContentItem] = useState<any>(null);

  // Auto-select first available content when data loads
  useEffect(() => {
    if (sections.length > 0 && !selectedSection) {
      const firstSection = sections[0];
      setSelectedSection(firstSection);
      
      if (firstSection.lessons && firstSection.lessons.length > 0) {
        const firstLesson = firstSection.lessons[0];
        setSelectedLesson(firstLesson);
        
        if (firstLesson.contentItems && firstLesson.contentItems.length > 0) {
          setSelectedContentItem(firstLesson.contentItems[0]);
        }
      }
    }
  }, [sections, selectedSection]);

  const handleContentItemClick = (contentItem: any, lesson: any, section: any) => {
    setSelectedSection(section);
    setSelectedLesson(lesson);
    setSelectedContentItem(contentItem);
    
    // Mark as viewed/in progress
    updateProgress(courseId || '', contentItem.id, 'in_progress', {
      viewedAt: new Date(),
      timeSpent: 0
    });
  };

  const renderContentByType = (content: any) => {
    if (!content) return null;

    switch (content.content_type) {
      case 'video':
        return renderVideoContent(content);
      case 'attachment':
        return renderAttachmentContent(content);
      case 'assignment':
        return renderAssignmentContent(content);
      case 'quiz':
        return renderQuizContent(content);
      default:
        return (
          <div className="text-center p-8 bg-muted/20 rounded-lg">
            <FileText className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">
              Unsupported content type: {content.content_type}
            </p>
          </div>
        );
    }
  };

  const renderVideoContent = (content: any) => {
    return (
      <div className="space-y-6">
        <OfflineVideoPlayer 
          contentId={content.id}
          title={content.title}
          courseId={courseId || ''}
        />
        {selectedLesson?.overview && (
          <Card className="bg-gradient-to-br from-card to-card/50 dark:bg-card border border-gray-200/50 dark:border-gray-700/50 rounded-3xl shadow-lg">
            <CardHeader>
              <CardTitle className="text-gray-900 dark:text-gray-100">Overview</CardTitle>
            </CardHeader>
            <CardContent className="text-gray-700 dark:text-gray-300">
              {selectedLesson.overview}
            </CardContent>
          </Card>
        )}
      </div>
    );
  };

  const renderAttachmentContent = (content: any) => {
    const fileName = content.content_path?.split('/').pop() || 'Attachment';
    
    return (
      <Card className="bg-gradient-to-br from-card to-card/50 dark:bg-card border border-gray-200/50 dark:border-gray-700/50 rounded-3xl shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-gray-100">
            <Paperclip className="w-5 h-5 text-primary" />
            Attachment
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between gap-4 p-4 border border-gray-200/50 dark:border-gray-600/50 rounded-2xl bg-gradient-to-br from-gray-50 to-gray-100/50 dark:from-gray-800/50 dark:to-gray-700/50">
            <div className="flex items-center gap-3">
              <FileText className="w-6 h-6 text-primary" />
              <span className="font-medium text-gray-900 dark:text-gray-100">{fileName}</span>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" disabled className="opacity-50">
                <Eye className="w-4 h-4 mr-2" />
                View
              </Button>
              <Button disabled className="opacity-50">
                <Download className="w-4 h-4 mr-2" />
                Download
              </Button>
            </div>
          </div>
          <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg">
            <div className="flex items-center gap-2 text-amber-700 dark:text-amber-300">
              <div className="w-2 h-2 bg-amber-500 rounded-full"></div>
              <span className="text-sm font-medium">Attachment viewing requires online connection</span>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderAssignmentContent = (content: any) => {
    return (
      <div className="space-y-6">
        <Card className="bg-gradient-to-br from-card to-card/50 dark:bg-card border border-gray-200/50 dark:border-gray-700/50 rounded-3xl shadow-lg">
          <CardHeader>
            <CardTitle className="text-gray-900 dark:text-gray-100">Assignment Details</CardTitle>
            {content.due_date && (
              <div className="flex items-center gap-2 text-sm text-yellow-600 dark:text-yellow-400">
                <Calendar className="h-4 w-4" />
                <span className="font-medium">Due:</span>
                <span>{new Date(content.due_date).toLocaleString()}</span>
              </div>
            )}
          </CardHeader>
          <CardContent>
            <div className="prose prose-sm max-w-none dark:prose-invert">
              <div dangerouslySetInnerHTML={{ 
                __html: content.content_path || 'Assignment content not available offline.'
              }} />
            </div>
          </CardContent>
        </Card>
        <div className="text-center">
          <Button disabled className="opacity-50">
            <ClipboardList className="w-4 h-4 mr-2" />
            Submit Assignment (Requires Online)
          </Button>
        </div>
      </div>
    );
  };

  const renderQuizContent = (quizContent: any) => {
    return (
      <OfflineQuizTaker
        quizContent={quizContent}
        courseId={courseId || ''}
        contentId={quizContent.id}
        onComplete={(score) => {
          console.log('[OfflineCourseViewer] Quiz completed with score:', score);
          toast.success(`Quiz completed! Score: ${score}%`);
          
          // Update progress
          updateProgress(courseId || '', quizContent.id, 'completed', {
            score,
            completedAt: new Date(),
            timeSpent: 0
          });
        }}
      />
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          <p className="text-muted-foreground">Loading course content...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <HelpCircle className="w-8 h-8 text-red-600 dark:text-red-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
            Course Not Available Offline
          </h3>
          <p className="text-muted-foreground mb-4">{error}</p>
          <Button onClick={() => navigate('/dashboard/offline-learning')}>
            <ChevronLeft className="w-4 h-4 mr-2" />
            Back to Offline Learning
          </Button>
        </div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
            <FileText className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
            Course Not Found
          </h3>
          <p className="text-muted-foreground mb-4">
            This course may not be downloaded for offline viewing.
          </p>
          <Button onClick={() => navigate('/dashboard/offline-learning')}>
            <ChevronLeft className="w-4 h-4 mr-2" />
            Back to Offline Learning
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full bg-background">
      {/* Sidebar - Course Structure */}
      <div className="w-80 border-r border-border bg-card/50">
        <div className="p-6 border-b border-border">
          <Button 
            variant="ghost" 
            onClick={() => navigate('/dashboard/offline-learning')}
            className="mb-4 -ml-2"
          >
            <ChevronLeft className="w-4 h-4 mr-2" />
            Back to Offline Learning
          </Button>
          <h1 className="text-xl font-bold text-foreground mb-2">{course.title}</h1>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span className="text-sm text-muted-foreground">Available offline</span>
          </div>
        </div>
        
        <ScrollArea className="flex-1">
          <div className="p-4 space-y-4">
            {sections.map((section: any) => (
              <div key={section.id} className="space-y-2">
                <h3 className="font-semibold text-foreground">{section.title}</h3>
                {section.lessons?.map((lesson: any) => (
                  <div key={lesson.id} className="ml-4 space-y-1">
                    <h4 className="text-sm font-medium text-muted-foreground">{lesson.title}</h4>
                    {lesson.contentItems?.map((item: any) => (
                      <button
                        key={item.id}
                        onClick={() => handleContentItemClick(item, lesson, section)}
                        className={`w-full text-left p-3 rounded-lg text-sm transition-colors ${
                          selectedContentItem?.id === item.id
                            ? 'bg-primary/10 text-primary border border-primary/20'
                            : 'hover:bg-muted/50 text-muted-foreground'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          {item.content_type === 'video' && <PlayCircle className="w-4 h-4" />}
                          {item.content_type === 'quiz' && <HelpCircle className="w-4 h-4" />}
                          {item.content_type === 'assignment' && <ClipboardList className="w-4 h-4" />}
                          {item.content_type === 'attachment' && <Paperclip className="w-4 h-4" />}
                          <span className="truncate">{item.title}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col">
        {selectedContentItem ? (
          <div className="flex-1 p-6">
            <div className="max-w-4xl mx-auto">
              <div className="mb-6">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                  <span>{selectedSection?.title}</span>
                  <ChevronRight className="w-4 h-4" />
                  <span>{selectedLesson?.title}</span>
                </div>
                <h1 className="text-2xl font-bold text-foreground">{selectedContentItem.title}</h1>
              </div>
              
              {renderContentByType(selectedContentItem)}
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                <FileText className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Select Content to View
              </h3>
              <p className="text-muted-foreground">
                Choose a lesson or content item from the sidebar to get started.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default OfflineCourseViewer;
