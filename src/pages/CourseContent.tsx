import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ContentLoader } from '@/components/ContentLoader';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { 
  PlayCircle,
  CheckCircle, 
  Circle,
  BookOpen,
  FileText,
  HelpCircle,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  Timer,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

interface CourseContentProps {
  courseId?: string;
}

export const CourseContent = ({ courseId }: CourseContentProps) => {
  console.log('[CourseContent] Component rendering...');
  const { id } = useParams();
  const navigate = useNavigate();
  const [currentLessonId, setCurrentLessonId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [course, setCourse] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const lastUpdateTimeRef = useRef(0);
  const lessonRef = useRef<any>(null);

  const actualCourseId = courseId || id;

  const currentLesson = useMemo(() => {
    return course?.modules
      ?.flatMap((module: any) => module.lessons)
      ?.find((lesson: any) => lesson.id === currentLessonId) || null;
  }, [course, currentLessonId]);

  const isValidVideoUrl = (url: string | null | undefined): boolean => {
    if (!url) return false;
    const videoPatterns = [
      /^https?:\/\/(?:www\.)?youtube\.com\/embed\/[\w-]+/,
      /^https?:\/\/(?:www\.)?youtube\.com\/watch\?v=[\w-]+/,
      /^https?:\/\/youtu\.be\/[\w-]+/,
      /^https?:\/\/player\.vimeo\.com\/video\/\d+/,
      /^https?:\/\/vimeo\.com\/\d+/,
      /^https?:\/\/.*\.(mp4|webm|ogg|m4v|mov|avi|wmv|flv)(\?.*)?$/i
    ];
    const placeholderPatterns = [/dQw4w9WgXcQ/, /placeholder/i, /demo/i, /sample/i];
    const isVideo = videoPatterns.some(pattern => pattern.test(url));
    const isPlaceholder = placeholderPatterns.some(pattern => pattern.test(url));
    return isVideo && !isPlaceholder;
  };

  const transformCourseData = (data: any, progress: any[] = []) => {
    if (!data) return null;
    const totalLessons = data.sections?.reduce((acc: number, section: any) => acc + (section.lessons?.length || 0), 0) || 0;
    const completedLessonsCount = progress.filter(p => p.completed_at).length;
    
    return {
      id: data.id,
      title: data.title || "Course Title",
      totalProgress: totalLessons > 0 ? Math.round((completedLessonsCount / totalLessons) * 100) : 0,
      modules: data.sections?.map((section: any) => ({
        id: section.id,
        title: section.title,
        duration: `${(section.lessons?.length || 0) * 15}m`,
        lessons: section.lessons?.map((lesson: any) => {
          const lessonProgress = progress.find(p => p.lesson_id === lesson.id);
          let status = 'not_started';
          if (lessonProgress?.completed_at) {
            status = 'completed';
          } else if (lessonProgress?.progress_seconds > 0) {
            status = 'in_progress';
          }
          return {
          id: lesson.id,
          title: lesson.title,
            type: lesson.content_type || lesson.type || 'video',
          duration: lesson.duration || '10:00',
            completed: status === 'completed',
            status: status,
            progressSeconds: lessonProgress?.progress_seconds || 0,
          content: {
            videoUrl: lesson.video_url,
            thumbnailUrl: lesson.thumbnail_url || lesson.image_url || lesson.cover_image,
            transcript: lesson.transcript || 'No transcript available.',
              description: lesson.overview || 'No description available.',
            title: lesson.title,
            text: lesson.content || 'No content available.',
            hasValidVideo: isValidVideoUrl(lesson.video_url)
          }
          };
        }) || []
      })) || []
    };
  };

  const markLessonAsComplete = useCallback(async (lessonId: string, courseId: string) => {
    console.log(`[markLessonAsComplete] Called for lesson: ${lessonId}`);
    if (!user) {
      console.log('[markLessonAsComplete] No user, aborting.');
      return;
    }
    const { error } = await supabase.from('user_course_progress').upsert(
      { user_id: user.id, course_id: courseId, lesson_id: lessonId, completed_at: new Date().toISOString() },
      { onConflict: 'user_id,lesson_id' }
    );
    if (error) {
      toast.error("Failed to mark lesson complete.");
      console.error("[markLessonAsComplete] Error:", error.message);
      return;
    }
    console.log(`[markLessonAsComplete] Success for lesson: ${lessonId}`);
    toast.success("Lesson completed!");
    setCourse((prevCourse: any) => {
      if (!prevCourse) return null;
      let completedCount = 0;
      const totalLessons = prevCourse.modules.reduce((acc: any, module: any) => acc + module.lessons.length, 0);
      const updatedModules = prevCourse.modules.map((module: any) => ({
        ...module,
        lessons: module.lessons.map((lesson: any) => {
          let isCompleted = lesson.completed;
          if (lesson.id === lessonId) isCompleted = true;
          if (isCompleted) completedCount++;
          return { ...lesson, completed: isCompleted };
        })
      }));
      const totalProgress = totalLessons > 0 ? (completedCount / totalLessons) * 100 : 0;
      return { ...prevCourse, modules: updatedModules, totalProgress: Math.round(totalProgress) };
    });
  }, [user]);

  const handleTimeUpdate = useCallback(() => {
    const videoNode = videoRef.current;
    if (!videoNode) {
      console.log('[TimeUpdate] No video node.');
      return;
    }
  
    const { currentTime, duration } = videoNode;
    const lesson = lessonRef.current;
    
    console.log(`[TimeUpdate] Fired at: ${currentTime}s / ${duration}s`);
  
    if (!user || !duration || !isFinite(duration) || duration === 0 || !lesson) {
      console.log('[TimeUpdate] Progress save skipped:', { hasUser: !!user, hasDuration: !!duration, isFinite: isFinite(duration), duration, hasLesson: !!lesson });
      return;
    }
  
    const now = Date.now();
    if (now - lastUpdateTimeRef.current > 15000) {
      console.log('[TimeUpdate] 15-second interval reached. Attempting to save progress.');
      lastUpdateTimeRef.current = now;
      const progressData = { user_id: user.id, course_id: actualCourseId, lesson_id: lesson.id, progress_seconds: currentTime };
      
      console.log('[TimeUpdate] Upserting data to user_course_progress:', progressData);
  
      supabase.from('user_course_progress').upsert(
        progressData,
        { onConflict: 'user_id,lesson_id' }
      ).then(({ error }) => {
        if (error) {
          console.error("[TimeUpdate] Error saving progress:", error);
          toast.error("Failed to save progress", { description: error.message });
        } else {
          console.log('[TimeUpdate] Progress saved successfully!');
        }
      });
    }
  
    if ((currentTime / duration) >= 1 && !lesson.completed) {
      console.log('[TimeUpdate] Lesson completion threshold reached. Marking as complete.');
      markLessonAsComplete(lesson.id, actualCourseId);
    }
  }, [user, actualCourseId, markLessonAsComplete]);

  const handleLoadedMetadata = useCallback(() => {
    const videoNode = videoRef.current;
    if (!videoNode) {
      console.log('[LoadedMetadata] No video node.');
      return;
    }
    const lesson = lessonRef.current;
    console.log('[LoadedMetadata] Fired. Current lesson:', lesson?.title);
    if (lesson && lesson.progressSeconds > 0 && videoNode.duration > lesson.progressSeconds) {
      console.log(`[LoadedMetadata] Seeking to saved progress: ${lesson.progressSeconds}s`);
      videoNode.currentTime = lesson.progressSeconds;
    }
  }, []);

  useEffect(() => {
    lessonRef.current = currentLesson;
  }, [currentLesson]);

  useEffect(() => {
    const fetchCourseData = async () => {
      if (!actualCourseId) {
        setError("No course ID provided");
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      setError(null);
      try {
        const { data, error } = await supabase.from('courses').select(`*,sections:course_sections(*,lessons:course_lessons(*))`).eq('id', actualCourseId).single();
        if (error) throw error;
        if (data) {
          for (const section of data.sections) {
            for (const lesson of section.lessons) {
              if ((lesson.type === 'video' || lesson.content_type === 'video') && lesson.content) {
                const { data: signedUrlData, error: urlError } = await supabase.storage.from('dil-lms').createSignedUrl(lesson.content, 3600);
                if (urlError) {
                  console.error(`Failed to get signed URL for ${lesson.content}`, urlError);
                  lesson.video_url = null;
                } else {
                  lesson.video_url = signedUrlData.signedUrl;
                }
              }
            }
          }
          let userProgress = [];
          if (user) {
            const lessonIds = data.sections.flatMap((s: any) => s.lessons.map((l: any) => l.id));
            if (lessonIds.length > 0) {
              const { data: progressData, error: progressError } = await supabase.from('user_course_progress').select('lesson_id, completed_at, progress_seconds').eq('user_id', user.id).in('lesson_id', lessonIds);
              if (progressError) console.error("Failed to fetch user progress", progressError);
              else userProgress = progressData;
            }
          }
          const transformedCourse = transformCourseData(data, userProgress);
          setCourse(transformedCourse);
          if (transformedCourse?.modules?.[0]?.lessons?.[0]) {
            setCurrentLessonId(transformedCourse.modules[0].lessons[0].id);
          }
        } else {
          throw new Error("Course not found");
        }
      } catch (err: any) {
        console.error("Error fetching course data:", err);
        setError(err.message);
        toast.error("Failed to load course content", { description: err.message });
      } finally {
        setIsLoading(false);
      }
    };
    fetchCourseData();
  }, [actualCourseId, user]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <ContentLoader message="Loading course content..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen text-center p-8">
        <h2 className="text-xl font-semibold text-destructive mb-2">Failed to load course</h2>
        <p className="text-muted-foreground mb-4">{error}</p>
        <Button onClick={() => navigate(-1)}>Go Back</Button>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen text-center p-8">
        <h2 className="text-xl font-semibold text-muted-foreground">Course not found</h2>
        <p className="text-muted-foreground mb-4">The course you're looking for doesn't exist or has been moved.</p>
        <Button onClick={() => navigate(-1)}>Go Back</Button>
      </div>
    );
  }
  
  const currentModule = course.modules.find((module: any) => module.lessons.some((lesson: any) => lesson.id === currentLessonId)) || null;
  const allLessons = course.modules.flatMap((module: any) => module.lessons);
  const currentIndex = allLessons.findIndex((lesson: any) => lesson.id === currentLessonId);
  const nextLesson = currentIndex !== -1 ? allLessons[currentIndex + 1] : null;
  const prevLesson = currentIndex !== -1 ? allLessons[currentIndex - 1] : null;

  const renderLessonContent = () => {
    if (!currentLesson) {
      return (
        <div className="flex flex-col items-center justify-center h-full text-center p-8 min-h-[400px]">
          <BookOpen className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-muted-foreground">Welcome to {course.title}</h2>
          <p className="text-muted-foreground mt-2">Select a lesson from the sidebar to get started.</p>
        </div>
      );
    }
    switch (currentLesson.type) {
      case 'video':
        return (
          <div className="space-y-6">
            {currentLesson?.content.hasValidVideo ? (
              <div className="space-y-4">
                <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
                   <video 
                    ref={videoRef} 
                    controls 
                    className="w-full h-full" 
                    key={currentLesson.id}
                    src={currentLesson.content.videoUrl || ''}
                    onTimeUpdate={handleTimeUpdate}
                    onLoadedMetadata={handleLoadedMetadata}
                  />
                </div>
              </div>
            ) : currentLesson.content.thumbnailUrl ? (
              <div className="relative aspect-video bg-muted rounded-lg overflow-hidden flex items-center justify-center">
                <img src={currentLesson.content.thumbnailUrl} alt={currentLesson.title} className="max-w-full max-h-full object-contain" />
              </div>
            ) : (
              <div className="relative aspect-video bg-muted rounded-lg overflow-hidden flex items-center justify-center">
                <div className="text-center p-8">
                  <PlayCircle className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground text-lg font-medium">No video content available</p>
                  <p className="text-muted-foreground/60 text-sm mt-2">Content will be available soon</p>
                </div>
              </div>
            )}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PlayCircle className="w-5 h-5 text-green-500" />
                  Lesson Overview
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">{currentLesson.content.description}</p>
              </CardContent>
            </Card>
          </div>
        );
      case 'text':
        return (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-blue-500" />
                  {currentLesson.content.title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="prose prose-sm max-w-none dark:prose-invert" dangerouslySetInnerHTML={{ __html: currentLesson.content.text }} />
              </CardContent>
            </Card>
          </div>
        );
      case 'quiz':
        return (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <HelpCircle className="w-5 h-5 text-purple-500" />
                  Knowledge Check
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {currentLesson.content.questions.map((question: any, index: number) => (
                  <div key={question.id} className="space-y-4">
                    <div className="flex gap-3">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900 flex items-center justify-center">
                        <span className="text-sm font-semibold text-purple-600 dark:text-purple-400">{index + 1}</span>
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium mb-3">{question.question}</h4>
                        <div className="space-y-2">
                          {question.options.map((option: any, optionIndex: number) => (
                            <Button key={optionIndex} variant="outline" className="w-full justify-start h-auto p-3 text-left">
                              <div className="flex items-center gap-3">
                                <Circle className="w-4 h-4" />
                                <span>{option}</span>
                              </div>
                            </Button>
                          ))}
                        </div>
                      </div>
                    </div>
                    {index < currentLesson.content.questions.length - 1 && <Separator />}
                  </div>
                ))}
                <div className="flex gap-2 pt-4">
                  <Button className="bg-green-600 hover:bg-green-700">Submit Quiz</Button>
                  <Button variant="outline">Reset Answers</Button>
                </div>
              </CardContent>
            </Card>
          </div>
        );
      default:
        return null;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'video': return <PlayCircle className="w-4 h-4 text-red-600 dark:text-red-400" />;
      case 'text': return <FileText className="w-4 h-4 text-blue-600 dark:text-blue-400" />;
      case 'quiz': return <HelpCircle className="w-4 h-4 text-purple-600 dark:text-purple-400" />;
      default: return <Circle className="w-4 h-4 text-gray-500" />;
    }
  };

  return (
    <div className="min-h-screen bg-background w-full">
      {/* Mobile Sidebar */}
      <div className={`lg:hidden fixed inset-0 z-50 ${isSidebarOpen ? 'block' : 'hidden'}`}>
        <div className="absolute inset-0 bg-black/50" onClick={() => setIsSidebarOpen(false)} />
        <div className="relative w-80 h-full bg-background border-r border-border overflow-hidden">
          <div className="p-6 border-b border-border bg-card/50">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-foreground truncate text-lg">{course.title}</h2>
              <Button variant="ghost" size="sm" onClick={() => setIsSidebarOpen(false)} className="hover:bg-accent"><X className="w-4 h-4" /></Button>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-foreground">Course Progress</span>
                <span className="text-sm font-semibold text-green-600">{course.totalProgress}%</span>
              </div>
              <Progress value={course.totalProgress} className="h-3 bg-muted" />
              <p className="text-xs text-muted-foreground">Keep up the great work!</p>
            </div>
          </div>
          <ScrollArea className="flex-1 p-2">
            <Accordion type="multiple" defaultValue={[currentModule?.id || '']}>
              {course.modules.map((module: any) => (
                <AccordionItem key={module.id} value={module.id} className="border-none">
                  <AccordionTrigger className="hover:no-underline hover:bg-accent/50 rounded-lg px-3 py-4 transition-colors">
                    <div className="flex items-center gap-3 w-full">
                      <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg"><BookOpen className="w-4 h-4 text-blue-600 dark:text-blue-400" /></div>
                      <span className="font-semibold text-foreground">{module.title}</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pb-2">
                    <div className="space-y-2 mt-3 ml-4">
                      {module.lessons.map((lesson: any) => (
                        <Button
                          key={lesson.id}
                          variant="ghost"
                          className={`w-full justify-start h-auto p-4 rounded-xl transition-all ${lesson.id === currentLessonId ? 'bg-green-50 dark:bg-green-900/20 border-l-4 border-green-500 shadow-sm' : 'hover:bg-accent/50'}`}
                          onClick={() => { setCurrentLessonId(lesson.id); setIsSidebarOpen(false); }}
                        >
                          <div className="flex items-center gap-3 w-full">
                            <div className="flex-shrink-0">
                              {lesson.completed ? (
                                <div className="p-1 bg-green-100 dark:bg-green-900/30 rounded-full"><CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" /></div>
                              ) : lesson.status === 'in_progress' ? (
                                <div className="p-1 bg-yellow-100 dark:bg-yellow-900/30 rounded-full"><Timer className="w-4 h-4 text-yellow-600 dark:text-yellow-400" /></div>
                              ) : (
                                <div className={`p-1 rounded-full ${lesson.type === 'video' ? 'bg-red-100 dark:bg-red-900/30' : lesson.type === 'text' ? 'bg-blue-100 dark:bg-blue-900/30' : 'bg-purple-100 dark:bg-purple-900/30'}`}>{getTypeIcon(lesson.type)}</div>
                              )}
                            </div>
                            <div className="flex-1 text-left">
                              <div className={`font-medium text-sm ${lesson.id === currentLessonId ? 'text-green-700 dark:text-green-300' : 'text-foreground'}`}>{lesson.title}</div>
                              <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                                <Badge variant="outline" className={`text-xs capitalize ${lesson.type === 'video' ? 'border-red-200 text-red-600 dark:border-red-800 dark:text-red-400' : lesson.type === 'text' ? 'border-blue-200 text-blue-600 dark:border-blue-800 dark:text-blue-400' : 'border-purple-200 text-purple-600 dark:border-purple-800 dark:text-purple-400'}`}>{lesson.type}</Badge>
                              </div>
                            </div>
                          </div>
                        </Button>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </ScrollArea>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex min-h-screen">
        {/* Desktop Sidebar */}
        <div className={`hidden lg:block ${isSidebarOpen ? 'w-80' : 'w-0'} transition-all duration-300 border-r border-border bg-background overflow-hidden`}>
          <div className="p-6 border-b border-border bg-card/50">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-foreground truncate text-lg">{course.title}</h2>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-foreground">Course Progress</span>
                <span className="text-sm font-semibold text-green-600">{course.totalProgress}%</span>
              </div>
              <Progress value={course.totalProgress} className="h-3 bg-muted" />
              <p className="text-xs text-muted-foreground">Keep up the great work!</p>
            </div>
          </div>
          <ScrollArea className="flex-1 p-2">
            <Accordion type="multiple" defaultValue={[currentModule?.id || '']}>
              {course.modules.map((module: any) => (
                <AccordionItem key={module.id} value={module.id} className="border-none">
                  <AccordionTrigger className="hover:no-underline hover:bg-accent/50 rounded-lg px-3 py-4 transition-colors">
                    <div className="flex items-center gap-3 w-full">
                      <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg"><BookOpen className="w-4 h-4 text-blue-600 dark:text-blue-400" /></div>
                      <span className="font-semibold text-foreground">{module.title}</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pb-2">
                    <div className="space-y-2 mt-3 ml-4">
                      {module.lessons.map((lesson: any) => (
                        <Button
                          key={lesson.id}
                          variant="ghost"
                          className={`w-full justify-start h-auto p-4 rounded-xl transition-all ${lesson.id === currentLessonId ? 'bg-green-50 dark:bg-green-900/20 border-l-4 border-green-500 shadow-sm' : 'hover:bg-accent/50'}`}
                          onClick={() => setCurrentLessonId(lesson.id)}
                        >
                          <div className="flex items-center gap-3 w-full">
                            <div className="flex-shrink-0">
                              {lesson.completed ? (
                                <div className="p-1 bg-green-100 dark:bg-green-900/30 rounded-full"><CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" /></div>
                              ) : lesson.status === 'in_progress' ? (
                                <div className="p-1 bg-yellow-100 dark:bg-yellow-900/30 rounded-full"><Timer className="w-4 h-4 text-yellow-600 dark:text-yellow-400" /></div>
                              ) : (
                                <div className={`p-1 rounded-full ${lesson.type === 'video' ? 'bg-red-100 dark:bg-red-900/30' : lesson.type === 'text' ? 'bg-blue-100 dark:bg-blue-900/30' : 'bg-purple-100 dark:bg-purple-900/30'}`}>{getTypeIcon(lesson.type)}</div>
                              )}
                            </div>
                            <div className="flex-1 text-left">
                              <div className={`font-medium text-sm ${lesson.id === currentLessonId ? 'text-green-700 dark:text-green-300' : 'text-foreground'}`}>{lesson.title}</div>
                              <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                                <Badge variant="outline" className={`text-xs capitalize ${lesson.type === 'video' ? 'border-red-200 text-red-600 dark:border-red-800 dark:text-red-400' : lesson.type === 'text' ? 'border-blue-200 text-blue-600 dark:border-blue-800 dark:text-blue-400' : 'border-purple-200 text-purple-600 dark:border-purple-800 dark:text-purple-400'}`}>{lesson.type}</Badge>
                              </div>
                            </div>
                          </div>
                        </Button>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </ScrollArea>
        </div>
        
        {/* Content Body (Shared) */}
        <div className="flex-1 flex flex-col w-full">
          {/* Header */}
          <div className="border-b border-border bg-background p-4 lg:p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Button variant="ghost" size="sm" onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="hover:bg-accent"><Menu className="w-4 h-4" /></Button>
                <div>
                  <h1 className="font-semibold text-foreground text-base lg:text-lg">{currentLesson?.title}</h1>
                  <p className="text-sm text-muted-foreground">{currentModule?.title}</p>
                </div>
              </div>
              <div className="hidden lg:flex items-center gap-3">
                <Button variant="outline" size="sm" onClick={() => navigate(`/dashboard/courses/${actualCourseId}`)} className="hover:bg-accent"><ChevronLeft className="w-4 h-4 mr-2" />Back to Course</Button>
              </div>
            </div>
          </div>
          
          {/* Lesson Content */}
          <div className="flex-1 p-4 lg:p-6">
            <div className="max-w-4xl mx-auto">{renderLessonContent()}</div>
          </div>
          
          {/* Footer / Navigation */}
          <div className="bg-background p-4 lg:p-6 sticky bottom-0 lg:static border-t lg:border-t-0">
            <div className="flex items-center justify-between max-w-4xl mx-auto">
              <div className="flex items-center gap-2">
                {prevLesson && (
                  <Button variant="outline" onClick={() => setCurrentLessonId(prevLesson.id)} className="hover:bg-accent" size="sm" >
                    <ChevronLeft className="w-4 h-4 mr-1" /><span className="hidden sm:inline">Previous</span>
                  </Button>
                )}
              </div>
              <div className="flex items-center gap-2">
                {nextLesson && (
                  <Button className="bg-green-600 hover:bg-green-700 text-white shadow-sm" onClick={() => setCurrentLessonId(nextLesson.id)} size="sm">
                    <span className="hidden sm:inline">Next</span><ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};