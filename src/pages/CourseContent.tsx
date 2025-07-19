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
  Paperclip,
  ClipboardList,
  XCircle,
  CalendarClock,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

interface CourseContentProps {
  courseId?: string;
}

export const CourseContent = ({ courseId }: CourseContentProps) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [currentLessonId, setCurrentLessonId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [course, setCourse] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [openAccordionItems, setOpenAccordionItems] = useState<string[]>([]);
  const [userAnswers, setUserAnswers] = useState<Record<string, string>>({});
  const [isQuizSubmitted, setIsQuizSubmitted] = useState(false);
  const [quizResults, setQuizResults] = useState<Record<string, boolean>>({});
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

  const { mainContentHtml, attachments } = useMemo(() => {
    if (currentLesson?.type !== 'assignment' || !currentLesson?.content?.text || typeof currentLesson.content.text !== 'string') {
      return { mainContentHtml: '', attachments: [] };
    }

    const htmlString = currentLesson.content.text;
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlString, 'text/html');
    const links = Array.from(doc.querySelectorAll('a'));
    const foundAttachments: { url: string, name: string }[] = [];

    for (const link of links) {
      if (link.href.includes('/assignment-assets/files/')) {
        foundAttachments.push({
          url: link.href,
          name: link.textContent || 'download',
        });
        if (link.parentElement?.tagName === 'P' && link.parentElement.childNodes.length === 1) {
          link.parentElement.remove();
        } else {
          link.remove();
        }
      }
    }

    return { mainContentHtml: doc.body.innerHTML, attachments: foundAttachments };
  }, [currentLesson]);

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

  const transformCourseData = (data: any, progress: any[] = [], quizSubmissions: any[] = []) => {
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
          const quizSubmission = quizSubmissions.find(s => s.lesson_id === lesson.id);

          let status = 'not_started';
          if (lessonProgress?.completed_at) {
            status = 'completed';
          } else if (lessonProgress?.progress_seconds > 0) {
            status = 'in_progress';
          }

          const type = lesson.content_type || lesson.type || 'video';
          let lessonSpecificContent = {};
          if (type === 'quiz') {
            // After fetch, lesson.content for quizzes is already an object
            if (typeof lesson.content === 'object' && lesson.content?.questions) {
              lessonSpecificContent = lesson.content;
            } else {
              lessonSpecificContent = { questions: [] };
            }
          } else {
            // For other types, content is a string (html, path, etc.)
            lessonSpecificContent = { text: lesson.content || 'No content available.' };
          }

          return {
            id: lesson.id,
            title: lesson.title,
            type: type,
            duration: lesson.duration || '10:00',
            completed: status === 'completed',
            status: status,
            due_date: lesson.due_date,
            progressSeconds: lessonProgress?.progress_seconds || 0,
            submission: quizSubmission,
            content: {
              videoUrl: lesson.video_url,
              thumbnailUrl: lesson.thumbnail_url || lesson.image_url || lesson.cover_image,
              transcript: lesson.transcript || 'No transcript available.',
              description: lesson.overview || 'No description available.',
              title: lesson.title,
              ...lessonSpecificContent,
              hasValidVideo: isValidVideoUrl(lesson.video_url),
              attachmentUrl: lesson.attachment_url,
              attachmentFilename: lesson.attachment_filename,
            },
          };
        }) || []
      })) || []
    };
  };

  const handleDownload = async (url: string, filename: string) => {
    if (!url) {
      toast.error('No attachment URL found.');
      return;
    }
    setIsDownloading(true);
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const blob = await response.blob();
      const link = document.createElement('a');
      link.href = window.URL.createObjectURL(blob);
      link.download = filename;
      
      document.body.appendChild(link);
      link.click();
      
      link.parentNode?.removeChild(link);
      window.URL.revokeObjectURL(link.href);
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Failed to download the attachment.');
    } finally {
      setIsDownloading(false);
    }
  };

  const handleNavigation = (lesson: any) => {
    if (!lesson) return;

    const moduleForLesson = course.modules.find((m: any) => m.lessons.some((l: any) => l.id === lesson.id));
    
    if (moduleForLesson && !openAccordionItems.includes(moduleForLesson.id)) {
      setOpenAccordionItems(prev => [...prev, moduleForLesson.id]);
    }

    // Delay setting the current lesson to allow the accordion animation to start smoothly
    setTimeout(() => {
      setCurrentLessonId(lesson.id);
    }, 50);
  };

  const markLessonAsComplete = useCallback(async (lessonId: string, courseId: string, duration?: number) => {
    if (!user) {
      return;
    }

    const upsertData: {
      user_id: string;
      course_id: string;
      lesson_id: string;
      completed_at: string;
      progress_seconds?: number;
    } = {
      user_id: user.id,
      course_id: courseId,
      lesson_id: lessonId,
      completed_at: new Date().toISOString(),
    };

    if (duration) {
      upsertData.progress_seconds = duration;
    }

    const { error } = await supabase.from('user_course_progress').upsert(
      upsertData,
      { onConflict: 'user_id,lesson_id' }
    );
    if (error) {
      toast.error("Failed to mark lesson complete.");
      return;
    }
    toast.success("Lesson completed!");
    setCourse((prevCourse: any) => {
      if (!prevCourse) return null;
      let completedCount = 0;
      const totalLessons = prevCourse.modules.reduce((acc: any, module: any) => acc + module.lessons.length, 0);
      const updatedModules = prevCourse.modules.map((module: any) => ({
        ...module,
        lessons: module.lessons.map((lesson: any) => {
          const newLesson = { ...lesson };
          if (lesson.id === lessonId) {
            newLesson.completed = true;
            newLesson.status = 'completed';
            if (duration) {
              newLesson.progressSeconds = duration;
            }
          }
          if (newLesson.completed) completedCount++;
          return newLesson;
        })
      }));
      const totalProgress = totalLessons > 0 ? (completedCount / totalLessons) * 100 : 0;
      return { ...prevCourse, modules: updatedModules, totalProgress: Math.round(totalProgress) };
    });
  }, [user]);

  const handleTimeUpdate = useCallback(() => {
    const videoNode = videoRef.current;
    if (!videoNode) {
      return;
    }
  
    const { currentTime, duration } = videoNode;
    const lesson = lessonRef.current;
    
    if (!user || !duration || !isFinite(duration) || duration === 0 || !lesson) {
      return;
    }
  
    const now = Date.now();
    if (now - lastUpdateTimeRef.current > 15000) {
      lastUpdateTimeRef.current = now;
      const progressData = { user_id: user.id, course_id: actualCourseId, lesson_id: lesson.id, progress_seconds: currentTime };
      
      supabase.from('user_course_progress').upsert(
        progressData,
        { onConflict: 'user_id,lesson_id' }
      ).then(({ error }) => {
        if (error) {
          toast.error("Failed to save progress", { description: error.message });
        }
      });
    }
  
    if ((currentTime / duration) >= 1 && !lesson.completed) {
      markLessonAsComplete(lesson.id, actualCourseId, duration);
    }
  }, [user, actualCourseId, markLessonAsComplete]);

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
                  lesson.video_url = null;
                } else {
                  lesson.video_url = signedUrlData.signedUrl;
                }
              } else if ((lesson.type === 'attachment' || lesson.content_type === 'attachment') && lesson.content) {
                const { data: signedUrlData, error: urlError } = await supabase.storage.from('dil-lms').createSignedUrl(lesson.content, 3600);
                if (urlError) {
                  lesson.attachment_url = null;
                  lesson.attachment_filename = null;
                } else {
                  lesson.attachment_url = signedUrlData.signedUrl;
                  lesson.attachment_filename = lesson.content.split('/').pop();
                }
              } else if (lesson.type === 'quiz' && typeof lesson.content === 'string') {
                try {
                  lesson.content = JSON.parse(lesson.content);
                } catch (e) {
                  console.error("Failed to parse quiz content:", e);
                  lesson.content = { questions: [] }; // Set a default value
                }
              }
            }
          }
          let userProgress = [];
          let quizSubmissions = [];
          if (user) {
            const lessonIds = data.sections.flatMap((s: any) => s.lessons.map((l: any) => l.id));
            if (lessonIds.length > 0) {
              const { data: progressData, error: progressError } = await supabase.from('user_course_progress').select('lesson_id, completed_at, progress_seconds').eq('user_id', user.id).in('lesson_id', lessonIds);
              if (progressError) {
                // console.error("Failed to fetch user progress", progressError);
              } else {
                userProgress = progressData || [];
              }
            }

            const quizLessonIds = data.sections.flatMap((s: any) => s.lessons).filter((l: any) => l.type === 'quiz').map((l: any) => l.id);
            if (quizLessonIds.length > 0) {
                const { data: submissionsData, error: submissionsError } = await supabase
                    .from('quiz_submissions')
                    .select('*')
                    .eq('user_id', user.id)
                    .in('lesson_id', quizLessonIds);

                if (submissionsError) {
                    console.error("Failed to fetch quiz submissions", submissionsError);
                } else {
                    quizSubmissions = submissionsData || [];
                }
            }
          }
          const transformedCourse = transformCourseData(data, userProgress, quizSubmissions);
          setCourse(transformedCourse);
          if (transformedCourse) {
            const allLessons = transformedCourse.modules.flatMap((m: any) => m.lessons);
            const firstUncompletedLesson = allLessons.find((l: any) => !l.completed);
            
            let lessonToStartWith;
            if (firstUncompletedLesson) {
              lessonToStartWith = firstUncompletedLesson;
            } else if (allLessons.length > 0) {
              lessonToStartWith = allLessons[0];
            }

            if (lessonToStartWith) {
              setCurrentLessonId(lessonToStartWith.id);
              const moduleForLesson = transformedCourse.modules.find((m: any) => m.lessons.some((l: any) => l.id === lessonToStartWith.id));
              if (moduleForLesson) {
                setOpenAccordionItems([moduleForLesson.id]);
              }
            }
          }
        } else {
          throw new Error("Course not found");
        }
      } catch (err: any) {
        setError(err.message);
        toast.error("Failed to load course content", { description: err.message });
      } finally {
        setIsLoading(false);
      }
    };
    fetchCourseData();
  }, [actualCourseId, user]);

  useEffect(() => {
    // Reset quiz state when lesson changes
    if (currentLesson?.type === 'quiz') {
      setIsQuizSubmitted(false);
      setUserAnswers({});
      setQuizResults({});
    }
  }, [currentLesson]);

  const handleLoadedMetadata = useCallback(() => {
    const videoNode = videoRef.current;
    if (!videoNode) {
      return;
    }
    const lesson = lessonRef.current;
    if (lesson && lesson.progressSeconds > 0 && videoNode.duration > lesson.progressSeconds) {
      videoNode.currentTime = lesson.progressSeconds;
    }
  }, []);

  const handleQuizSubmit = async () => {
    if (!user || !currentLesson || !course || currentLesson.submission) return;

    const results: Record<string, boolean> = {};
    let correctAnswers = 0;
    const totalQuestions = currentLesson.content.questions.length;

    currentLesson.content.questions.forEach((q: any) => {
        const isCorrect = userAnswers[q.id] === q.correctOptionId;
        results[q.id] = isCorrect;
        if (isCorrect) {
            correctAnswers++;
        }
    });

    const score = totalQuestions > 0 ? (correctAnswers / totalQuestions) * 100 : 0;

    const submissionData = {
        user_id: user.id,
        lesson_id: currentLesson.id,
        course_id: course.id,
        answers: userAnswers,
        results: results,
        score: score,
    };

    const { data: newSubmission, error } = await supabase.from('quiz_submissions').insert(submissionData).select().single();

    if (error) {
        toast.error("Failed to submit quiz.", { description: error.message });
        return;
    }

    setQuizResults(results);
    setIsQuizSubmitted(true);
    
    setCourse((prevCourse: any) => {
        if (!prevCourse) return null;
        const updatedModules = prevCourse.modules.map((module: any) => ({
            ...module,
            lessons: module.lessons.map((lesson: any) => 
                lesson.id === currentLesson.id ? { ...lesson, submission: newSubmission } : lesson
            ),
        }));
        return { ...prevCourse, modules: updatedModules };
    });

    await markLessonAsComplete(currentLesson.id, course.id);
    toast.success(`Quiz submitted! Your score: ${score.toFixed(0)}%`);
  };

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
      case 'assignment':
        return (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-2">
                  <CardTitle className="flex items-center gap-2">
                    <ClipboardList className="w-5 h-5 text-indigo-500" />
                    Assignment Details
                  </CardTitle>
                  {currentLesson.due_date && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted px-3 py-1.5 rounded-full">
                      <CalendarClock className="w-4 h-4" />
                      <span>Due: {format(new Date(currentLesson.due_date), 'PPP')}</span>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="prose prose-sm max-w-none dark:prose-invert" dangerouslySetInnerHTML={{ __html: mainContentHtml }} />
              </CardContent>
            </Card>

            {attachments.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Paperclip className="w-5 h-5 text-gray-500" />
                    Attached Files
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {attachments.map((att, index) => (
                    <div key={index} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <FileText className="w-6 h-6 text-muted-foreground" />
                        <span className="font-medium">{att.name}</span>
                      </div>
                      <div className="flex items-center gap-2 self-end sm:self-center">
                        <a href={att.url} target="_blank" rel="noopener noreferrer">
                          <Button variant="outline">View</Button>
                        </a>
                        <Button onClick={() => handleDownload(att.url, att.name)} disabled={isDownloading}>
                          {isDownloading ? 'Downloading...' : 'Download'}
                        </Button>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            <div className="text-center">
              <Button onClick={() => navigate('/dashboard/assignments')}>Go to Assignments</Button>
            </div>
          </div>
        );
      case 'attachment':
        const handleAttachmentInteraction = () => {
          if (currentLesson && !currentLesson.completed) {
            markLessonAsComplete(currentLesson.id, actualCourseId);
          }
        };

        return (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Paperclip className="w-5 h-5 text-gray-500" />
                  Attachment
                </CardTitle>
              </CardHeader>
              <CardContent>
                {currentLesson.content.attachmentUrl ? (
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <FileText className="w-6 h-6 text-muted-foreground" />
                      <span className="font-medium">{currentLesson.content.attachmentFilename || 'Attachment'}</span>
                    </div>
                    <div className="flex items-center gap-2 self-end sm:self-center">
                      <a href={currentLesson.content.attachmentUrl} target="_blank" rel="noopener noreferrer" onClick={handleAttachmentInteraction}>
                        <Button variant="outline">View</Button>
                      </a>
                      <Button onClick={() => {
                        handleAttachmentInteraction();
                        handleDownload(currentLesson.content.attachmentUrl, currentLesson.content.attachmentFilename);
                      }} disabled={isDownloading}>
                        {isDownloading ? 'Downloading...' : 'Download'}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <p className="text-muted-foreground">Attachment not available.</p>
                )}
                {currentLesson.content.description && currentLesson.content.description !== 'No description available.' && (
                  <div className="mt-6">
                    <h3 className="font-semibold mb-2">Description</h3>
                    <p className="text-muted-foreground">{currentLesson.content.description}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        );
      case 'quiz':
        return (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-2">
                  <CardTitle className="flex items-center gap-2">
                    <HelpCircle className="w-5 h-5 text-purple-500" />
                    Knowledge Check
                  </CardTitle>
                  {currentLesson.due_date && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted px-3 py-1.5 rounded-full">
                      <CalendarClock className="w-4 h-4" />
                      <span>Due: {format(new Date(currentLesson.due_date), 'PPP')}</span>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {currentLesson.content.questions?.map((question: any, index: number) => (
                  <div key={question.id} className="space-y-4">
                    <div className="flex gap-3">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900 flex items-center justify-center">
                        <span className="text-sm font-semibold text-purple-600 dark:text-purple-400">{index + 1}</span>
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium mb-3">{question.text}</h4>
                        <div className="space-y-2">
                          {question.options?.map((option: any) => {
                            const hasSubmitted = !!currentLesson.submission;
                            const submittedAnswers = hasSubmitted ? currentLesson.submission.answers : userAnswers;
                            const isSelected = submittedAnswers[question.id] === option.id;
                            const isCorrect = question.correctOptionId === option.id;
                            
                            const showAsCorrect = (isQuizSubmitted || hasSubmitted) && isCorrect;
                            const showAsIncorrect = (isQuizSubmitted || hasSubmitted) && isSelected && !isCorrect;

                            let icon = <Circle className="w-4 h-4" />;
                            if (showAsCorrect) {
                                icon = <CheckCircle className="w-4 h-4 text-green-600" />;
                            } else if (showAsIncorrect) {
                                icon = <XCircle className="w-4 h-4 text-red-600" />;
                            } else if (isSelected) {
                                icon = <CheckCircle className="w-4 h-4 text-purple-600" />;
                            }

                            return (
                              <div key={option.id}>
                                <Button
                                  variant={isSelected && !(isQuizSubmitted || hasSubmitted) ? "secondary" : "outline"}
                                  className={cn(
                                    "w-full justify-start h-auto p-3 text-left",
                                    showAsCorrect && "border-green-500 bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-300",
                                    showAsIncorrect && "border-red-500 bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-300",
                                    (isQuizSubmitted || hasSubmitted) && !isSelected && !isCorrect && "opacity-60"
                                  )}
                                  onClick={() => !(isQuizSubmitted || hasSubmitted) && setUserAnswers(prev => ({...prev, [question.id]: option.id}))}
                                >
                                  <div className="flex items-center gap-3">
                                    {icon}
                                    <span>{option.text}</span>
                                  </div>
                                </Button>
                                {showAsCorrect && <p className="text-sm text-green-600 mt-1 pl-8">Correct Answer</p>}
                                {showAsIncorrect && <p className="text-sm text-red-600 mt-1 pl-8">Wrong Answer</p>}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                    {index < currentLesson.content.questions.length - 1 && <Separator />}
                  </div>
                ))}
                {!currentLesson.submission && (
                  <div className="flex gap-2 pt-4">
                    <Button 
                      className="bg-green-600 hover:bg-green-700" 
                      onClick={handleQuizSubmit}
                      disabled={isQuizSubmitted || Object.keys(userAnswers).length !== currentLesson.content.questions.length}
                    >
                      {isQuizSubmitted ? 'Submitted' : 'Submit Quiz'}
                    </Button>
                  </div>
                )}
                {currentLesson.submission && (
                    <div className="pt-4">
                        <div className="p-4 rounded-lg bg-muted border">
                            <h4 className="font-semibold">Quiz Submitted</h4>
                            <p className="text-muted-foreground text-sm mt-1">
                                You scored {currentLesson.submission.score.toFixed(0)}%. This lesson is now complete.
                            </p>
                        </div>
                    </div>
                )}
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
      case 'attachment': return <Paperclip className="w-4 h-4 text-gray-600 dark:text-gray-400" />;
      case 'assignment': return <ClipboardList className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />;
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
            <Accordion type="multiple" value={openAccordionItems} onValueChange={setOpenAccordionItems}>
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
                          onClick={() => { handleNavigation(lesson); setIsSidebarOpen(false); }}
                        >
                          <div className="flex items-center gap-3 w-full">
                            <div className="flex-shrink-0">
                              {lesson.completed ? (
                                <div className="p-1 bg-green-100 dark:bg-green-900/30 rounded-full"><CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" /></div>
                              ) : lesson.status === 'in_progress' ? (
                                <div className="p-1 bg-yellow-100 dark:bg-yellow-900/30 rounded-full"><Timer className="w-4 h-4 text-yellow-600 dark:text-yellow-400" /></div>
                              ) : (
                                <div className={`p-1 rounded-full ${lesson.type === 'video' ? 'bg-red-100 dark:bg-red-900/30' : lesson.type === 'text' ? 'bg-blue-100 dark:bg-blue-900/30' : lesson.type === 'attachment' ? 'bg-gray-100 dark:bg-gray-900/30' : lesson.type === 'assignment' ? 'bg-indigo-100 dark:bg-indigo-900/30' : 'bg-purple-100 dark:bg-purple-900/30'}`}>{getTypeIcon(lesson.type)}</div>
                              )}
                            </div>
                            <div className="flex-1 text-left">
                              <div className={`font-medium text-sm ${lesson.id === currentLessonId ? 'text-green-700 dark:text-green-300' : 'text-foreground'}`}>{lesson.title}</div>
                              <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                                <Badge variant="outline" className={`text-xs capitalize ${lesson.type === 'video' ? 'border-red-200 text-red-600 dark:border-red-800 dark:text-red-400' : lesson.type === 'text' ? 'border-blue-200 text-blue-600 dark:border-blue-800 dark:text-blue-400' : lesson.type === 'attachment' ? 'border-gray-200 text-gray-600 dark:border-gray-800 dark:text-gray-400' : lesson.type === 'assignment' ? 'border-indigo-200 text-indigo-600 dark:border-indigo-800 dark:text-indigo-400' : 'border-purple-200 text-purple-600 dark:border-purple-800 dark:text-purple-400'}`}>{lesson.type}</Badge>
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
            <Accordion type="multiple" value={openAccordionItems} onValueChange={setOpenAccordionItems}>
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
                          onClick={() => handleNavigation(lesson)}
                        >
                          <div className="flex items-center gap-3 w-full">
                            <div className="flex-shrink-0">
                              {lesson.completed ? (
                                <div className="p-1 bg-green-100 dark:bg-green-900/30 rounded-full"><CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" /></div>
                              ) : lesson.status === 'in_progress' ? (
                                <div className="p-1 bg-yellow-100 dark:bg-yellow-900/30 rounded-full"><Timer className="w-4 h-4 text-yellow-600 dark:text-yellow-400" /></div>
                              ) : (
                                <div className={`p-1 rounded-full ${lesson.type === 'video' ? 'bg-red-100 dark:bg-red-900/30' : lesson.type === 'text' ? 'bg-blue-100 dark:bg-blue-900/30' : lesson.type === 'attachment' ? 'bg-gray-100 dark:bg-gray-900/30' : lesson.type === 'assignment' ? 'bg-indigo-100 dark:bg-indigo-900/30' : 'bg-purple-100 dark:bg-purple-900/30'}`}>{getTypeIcon(lesson.type)}</div>
                              )}
                            </div>
                            <div className="flex-1 text-left">
                              <div className={`font-medium text-sm ${lesson.id === currentLessonId ? 'text-green-700 dark:text-green-300' : 'text-foreground'}`}>{lesson.title}</div>
                              <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                                <Badge variant="outline" className={`text-xs capitalize ${lesson.type === 'video' ? 'border-red-200 text-red-600 dark:border-red-800 dark:text-red-400' : lesson.type === 'text' ? 'border-blue-200 text-blue-600 dark:border-blue-800 dark:text-blue-400' : lesson.type === 'attachment' ? 'border-gray-200 text-gray-600 dark:border-gray-800 dark:text-gray-400' : lesson.type === 'assignment' ? 'border-indigo-200 text-indigo-600 dark:border-indigo-800 dark:text-indigo-400' : 'border-purple-200 text-purple-600 dark:border-purple-800 dark:text-purple-400'}`}>{lesson.type}</Badge>
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
                  <Button variant="outline" onClick={() => handleNavigation(prevLesson)} className="hover:bg-accent" size="sm" >
                    <ChevronLeft className="w-4 h-4 mr-1" /><span className="hidden sm:inline">Previous</span>
                  </Button>
                )}
              </div>
              <div className="flex items-center gap-2">
                {nextLesson && (
                  <Button className="bg-green-600 hover:bg-green-700 text-white shadow-sm" onClick={() => handleNavigation(nextLesson)} size="sm">
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