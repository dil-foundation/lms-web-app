// Simple Offline Course Viewer Component
// Displays offline course content when the main CourseContent page isn't available offline

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  ArrowLeft, 
  BookOpen, 
  PlayCircle, 
  FileText, 
  HelpCircle,
  CheckCircle,
  Clock,
  Users,
  Star,
  Calendar,
  Paperclip,
  ClipboardList,
  Download,
  Eye
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

const OfflineCourseViewer: React.FC<OfflineCourseViewerProps> = ({ courseData }) => {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const { isOnline } = useNetworkStatus();
  
  // Use pre-loaded course data if available, otherwise fetch from hook
  const hookData = useOfflineCourseData(courseData ? '' : (courseId || '')); // Skip hook if we have courseData
  
  // Use progress hooks (now using useAuthSafe)
  const { markContentCompleted, submitQuizAnswers } = useOfflineProgress();
  
  // Use provided course data or hook data
  const course = courseData || hookData.course;
  const sections = courseData?.sections || hookData.sections || [];
  const lessons = sections.flatMap((s: any) => s.lessons || []);
  const contentItems = lessons.flatMap((l: any) => l.contentItems || []);
  const userProgress = hookData.userProgress || [];
  const loading = courseData ? false : hookData.loading;
  const error = courseData ? null : hookData.error;

  console.log('[OfflineCourseViewer] Data summary:', {
    hasCourseData: !!courseData,
    course: course ? { id: course.id, title: course.title } : null,
    sectionsCount: sections.length,
    lessonsCount: lessons.length,
    contentItemsCount: contentItems.length,
    loading,
    error
  });
  
  const [selectedContentId, setSelectedContentId] = useState<string | null>(null);
  const [completedItems, setCompletedItems] = useState<Set<string>>(new Set());

  // Initialize completed items from user progress
  useEffect(() => {
    const completed = new Set(
      userProgress
        .filter(p => p.completed_at)
        .map(p => p.lesson_content_id)
    );
    setCompletedItems(completed);
  }, [userProgress]);

  // Auto-select first content item
  useEffect(() => {
    if (contentItems.length > 0 && !selectedContentId) {
      setSelectedContentId(contentItems[0].id);
    }
  }, [contentItems, selectedContentId]);

  const handleContentSelect = (contentId: string) => {
    setSelectedContentId(contentId);
  };

  const handleMarkComplete = async (contentId: string) => {
    if (!courseId) return;
    
    try {
      await markContentCompleted(courseId, contentId);
      setCompletedItems(prev => new Set([...prev, contentId]));
      toast.success('Progress saved!');
    } catch (error) {
      console.error('Failed to mark content complete:', error);
      toast.error('Failed to save progress');
    }
  };

  const selectedContent = contentItems.find(item => item.id === selectedContentId);
  const selectedLesson = lessons.find(lesson => 
    lesson.content_items?.some((item: any) => item.id === selectedContentId)
  );

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
          courseId={courseId}
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
    // Handle different quiz data structures
    let questions = [];
    if (quizContent.quiz) {
      // If quiz is an object with questions array (offline structure)
      if (Array.isArray(quizContent.quiz)) {
        questions = quizContent.quiz;
      } else if (quizContent.quiz.questions) {
        questions = quizContent.quiz.questions;
      }
    }
    
    console.log('[OfflineCourseViewer] Quiz data debug:', {
      quizContent,
      quiz: quizContent.quiz,
      questionsFound: questions.length,
      questions: questions
    });
    
    if (!questions.length) {
      return (
        <div className="text-center p-8">
          <p className="text-muted-foreground">No quiz questions available.</p>
          <p className="text-xs text-muted-foreground mt-2">
            Debug: {JSON.stringify(quizContent.quiz)}
          </p>
        </div>
      );
    }

    return (
      <div className="bg-gradient-to-br from-card to-card/50 dark:bg-card border border-gray-200/50 dark:border-gray-700/50 rounded-3xl shadow-lg p-6">
        <div className="mb-6">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">Knowledge Check</h3>
          {quizContent.due_date && (
            <div className="flex items-center gap-2 text-sm text-yellow-600 dark:text-yellow-400">
              <Calendar className="h-4 w-4" />
              <span className="font-medium">Due:</span>
              <span>{new Date(quizContent.due_date).toLocaleString()}</span>
            </div>
          )}
        </div>
        
        <div className="space-y-6">
          {questions.map((q: any, index: number) => {
            const questionType = q.question_type || q.type || 'single_choice';
            const isMultipleChoice = questionType === 'multiple_choice';
            const isTextAnswer = questionType === 'text_answer';
            const isMathExpression = questionType === 'math_expression';
            
            return (
              <div key={q.id} className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <h4 className="font-medium text-gray-900 dark:text-gray-100">
                      {index + 1}. {q.question_text || q.question}
                    </h4>
                    <Badge 
                      variant={isMultipleChoice ? 'default' : isTextAnswer ? 'outline' : isMathExpression ? 'secondary' : 'secondary'}
                      className={`text-xs ${
                        isMultipleChoice 
                          ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 border-purple-200 dark:border-purple-700' 
                          : isTextAnswer
                          ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300 border-orange-200 dark:border-orange-700'
                          : isMathExpression
                          ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 border-green-200 dark:border-green-700'
                          : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border-blue-200 dark:border-blue-700'
                      }`}
                    >
                      {isMultipleChoice ? 'Multiple Choice' : isTextAnswer ? 'Text Answer' : isMathExpression ? 'Math Expression' : 'Single Choice'}
                    </Badge>
                  </div>
                  <Badge 
                    variant="outline"
                    className="text-xs bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300 border-yellow-200 dark:border-yellow-700 font-semibold"
                  >
                    {q.points || 1} {q.points === 1 ? 'point' : 'points'}
                  </Badge>
                </div>
                
                {/* Question Options */}
                {(questionType === 'single_choice' || questionType === 'multiple_choice') && q.options && (
                  <div className="space-y-3">
                    {q.options.map((option: any, optIndex: number) => (
                      <div
                        key={option.id}
                        className="flex items-center space-x-3 p-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        <input
                          type={isMultipleChoice ? 'checkbox' : 'radio'}
                          id={`${q.id}-option-${optIndex}`}
                          name={`question-${q.id}`}
                          className="h-4 w-4 text-primary focus:ring-primary border-gray-300"
                          disabled // Offline mode - for display only
                        />
                        <label 
                          htmlFor={`${q.id}-option-${optIndex}`}
                          className="flex-1 text-sm font-medium text-gray-900 dark:text-gray-100 cursor-pointer"
                        >
                          {option.option_text || option.text || option.label}
                        </label>
                      </div>
                    ))}
                  </div>
                )}

                {/* Text Answer */}
                {isTextAnswer && (
                  <div className="space-y-3">
                    <textarea
                      placeholder="Type your answer here..."
                      className="w-full min-h-[120px] p-3 border-2 border-gray-200 dark:border-gray-700 rounded-lg focus:border-orange-500 focus:ring-orange-500/20 resize-none"
                      disabled // Offline mode - for display only
                    />
                    <div className="p-3 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-700 rounded-lg">
                      <div className="flex items-center gap-2 text-orange-700 dark:text-orange-300">
                        <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                        <span className="text-sm font-medium">Quiz submission requires online connection</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Math Expression */}
                {isMathExpression && (
                  <div className="space-y-3">
                    <input
                      type="text"
                      placeholder="Enter your mathematical expression..."
                      className="w-full p-3 border-2 border-gray-200 dark:border-gray-700 rounded-lg focus:border-green-500 focus:ring-green-500/20 font-mono"
                      disabled // Offline mode - for display only
                    />
                    {q.math_hint && (
                      <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg">
                        <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300">
                          <div className="w-4 h-4">💡</div>
                          <span className="text-sm font-medium">Hint: {q.math_hint}</span>
                        </div>
                      </div>
                    )}
                    <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg">
                      <div className="flex items-center gap-2 text-green-700 dark:text-green-300">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span className="text-sm font-medium">Quiz submission requires online connection</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          
          {/* Offline Notice */}
          <div className="mt-6 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 text-amber-600 dark:text-amber-400">
                ⚠️
              </div>
              <div>
                <h4 className="font-medium text-amber-800 dark:text-amber-200">Offline Mode</h4>
                <p className="text-sm text-amber-700 dark:text-amber-300">
                  You can review quiz questions offline, but you'll need an internet connection to submit your answers and receive grades.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading course content...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="max-w-md">
          <CardContent className="p-6 text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <BookOpen className="w-8 h-8 text-red-600" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Course Not Available</h3>
            <p className="text-muted-foreground mb-4">{error}</p>
            {!isOnline && (
              <p className="text-sm text-amber-600 mb-4">
                💡 Make sure to download this course while online to access it offline.
              </p>
            )}
            <Button onClick={() => navigate('/dashboard/offline-learning')}>
              Back to Offline Learning
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="max-w-md">
          <CardContent className="p-6 text-center">
            <h3 className="text-lg font-semibold mb-2">Course Not Found</h3>
            <p className="text-muted-foreground mb-4">The requested course could not be found.</p>
            <Button onClick={() => navigate('/dashboard/offline-learning')}>
              Back to Offline Learning
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const completedCount = Array.from(completedItems).length;
  const totalCount = contentItems.length;
  const progressPercentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => navigate('/dashboard/offline-learning')}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Offline Learning
              </Button>
              <div>
                <h1 className="text-2xl font-bold">{course.title}</h1>
                <p className="text-muted-foreground">{course.subtitle}</p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm text-muted-foreground mb-1">
                {completedCount} of {totalCount} completed
              </div>
              <Progress value={progressPercentage} className="w-32" />
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Content List */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="w-5 h-5" />
                  Course Content
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="space-y-1">
                  {sections.map((section) => (
                    <div key={section.id}>
                      <div className="px-4 py-2 bg-muted/50 font-medium text-sm">
                        {section.title}
                      </div>
                      {section.lessons?.map((lesson: any) => (
                        <div key={lesson.id}>
                          <div className="px-6 py-1 text-xs text-muted-foreground font-medium">
                            {lesson.title}
                          </div>
                          {lesson.content_items?.map((item: any) => (
                            <button
                              key={item.id}
                              onClick={() => handleContentSelect(item.id)}
                              className={`w-full px-8 py-2 text-left text-sm hover:bg-muted/50 flex items-center gap-3 ${
                                selectedContentId === item.id ? 'bg-primary/10 border-r-2 border-primary' : ''
                              }`}
                            >
                              {completedItems.has(item.id) ? (
                                <CheckCircle className="w-4 h-4 text-green-500" />
                              ) : item.content_type === 'video' ? (
                                <PlayCircle className="w-4 h-4 text-red-500" />
                              ) : item.content_type === 'quiz' ? (
                                <HelpCircle className="w-4 h-4 text-primary" />
                              ) : item.content_type === 'attachment' ? (
                                <Paperclip className="w-4 h-4 text-gray-500" />
                              ) : item.content_type === 'assignment' ? (
                                <ClipboardList className="w-4 h-4 text-primary" />
                              ) : (
                                <FileText className="w-4 h-4 text-gray-500" />
                              )}
                              <span className="flex-1 truncate">{item.title}</span>
                              <Badge variant="outline" className="text-xs">
                                {item.content_type}
                              </Badge>
                            </button>
                          ))}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Content Display */}
          <div className="lg:col-span-2">
            {selectedContent ? (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>{selectedContent.title}</CardTitle>
                      <p className="text-muted-foreground text-sm">
                        {selectedLesson?.title} • {selectedContent.content_type}
                      </p>
                    </div>
                    {!completedItems.has(selectedContent.id) && (
                      <Button 
                        onClick={() => handleMarkComplete(selectedContent.id)}
                        size="sm"
                      >
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Mark Complete
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {renderContentByType(selectedContent)}
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="p-8 text-center">
                  <BookOpen className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">Select a content item from the left to view it here.</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default OfflineCourseViewer;