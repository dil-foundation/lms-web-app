import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ContentLoader } from '@/components/ContentLoader';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet"
import { 
  PlayCircle,
  CheckCircle, 
  Circle,
  BookOpen,
  HelpCircle,
  ChevronLeft,
  ChevronRight,
  Menu,
  Paperclip,
  ClipboardList,
  XCircle,
  FileText,
  Timer,
  Sparkles,
  Calendar
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';

interface CourseContentProps {
  courseId?: string;
}

const getBadgeVariant = (type: string): "default" | "destructive" | "outline" | "secondary" | "blue" => {
    switch (type.toLowerCase()) {
        case 'video': return 'destructive';
        case 'quiz': return 'default';
        case 'assignment': return 'blue';
        case 'attachment': return 'outline';
        default: return 'secondary';
    }
}

const getContentItemIcon = (item: any, currentContentItemId: string | null) => {
    const isCurrent = item.id === currentContentItemId;

    if (item.status === 'completed') {
      return <CheckCircle className="w-5 h-5 text-green-500" />;
    }
    if (isCurrent || item.status === 'in_progress') {
        return <Timer className="w-5 h-5 text-yellow-500" />;
    }
    
    switch (item.content_type) {
      case 'video': return <PlayCircle className="w-5 h-5 text-red-500" />;
      case 'attachment': return <Paperclip className="w-5 h-5 text-gray-500" />;
      case 'assignment': return <ClipboardList className="w-5 h-5 text-primary" />;
      case 'quiz': return <HelpCircle className="w-5 h-5 text-primary" />;
      default: return <Circle className="w-5 h-5 text-gray-400" />;
    }
};

const CourseNavigationSidebar = ({ course, openSectionIds, setOpenSectionIds, currentContentItemId, onContentItemClick }: any) => {
    return (
        <>
            <div className="p-4 space-y-4 border-b border-gray-200/50 dark:border-gray-700/50">
                 <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">{course.title}</h2>
                 <Card className="bg-gradient-to-br from-card to-card/50 dark:bg-card border border-gray-200/50 dark:border-gray-700/50 rounded-2xl shadow-lg">
                    <CardContent className="pt-4">
                        <div className="flex justify-between items-center mb-2">
                           <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">Course Progress</span>
                           <span className="text-lg font-bold text-primary">{course.totalProgress}%</span>
                        </div>
                        <Progress value={course.totalProgress} className="h-2 bg-gray-200 dark:bg-gray-700" />
                        <p className="text-xs text-muted-foreground font-medium mt-2">Keep up the great work!</p>
                    </CardContent>
                 </Card>
            </div>
            <ScrollArea className="flex-1 p-2">
                <Accordion type="multiple" value={openSectionIds} onValueChange={setOpenSectionIds} className="w-full">
                    {course.modules.map((module: any) => (
                        <AccordionItem key={module.id} value={module.id} className="border-b border-gray-200/50 dark:border-gray-700/50">
                            <AccordionTrigger className="hover:no-underline px-2 py-3 text-base font-semibold hover:bg-gray-50/50 dark:hover:bg-gray-800/50 rounded-xl transition-all duration-300">
                                <div className="flex items-center gap-3">
                                    <BookOpen className="w-5 h-5 text-primary" />
                                    <span className="text-gray-900 dark:text-gray-100">{module.title}</span>
                                </div>
                            </AccordionTrigger>
                            <AccordionContent className="pt-1 pb-0 pl-3">
                                <div className="space-y-2 py-2">
                                {module.lessons.map((lesson: any) => (
                                    <div key={lesson.id}>
                                        <h4 className="font-semibold text-sm text-muted-foreground px-2 py-2">{lesson.title}</h4>
                                        <div className="space-y-1 pl-3 border-l-2 border-dashed border-gray-300/50 dark:border-gray-600/50 ml-3">
                                            {lesson.contentItems.map((item: any) => {
                                                const isCurrent = item.id === currentContentItemId;
                                                return (
                                                <div
                                                    key={item.id}
                                                    className={cn(
                                                    "relative flex items-center gap-4 py-3 px-3 rounded-xl cursor-pointer transition-all duration-300 hover:shadow-md",
                                                    isCurrent 
                                                        ? "bg-gradient-to-r from-primary/10 to-primary/20 border border-primary/30 dark:border-primary/20 shadow-lg" 
                                                        : "hover:bg-gray-50/50 dark:hover:bg-gray-800/50",
                                                    )}
                                                    onClick={() => onContentItemClick(item.id)}
                                                >
                                                    {isCurrent && <div className="absolute left-0 top-1 bottom-1 w-1 bg-primary rounded-r-full"></div>}
                                                    <div className="flex-shrink-0 ml-1">
                                                    {getContentItemIcon(item, currentContentItemId)}
                                                    </div>
                                                    <div className="flex-1 flex flex-col overflow-hidden">
                                                        <span className={cn(
                                                            "font-medium text-sm leading-tight truncate", 
                                                            isCurrent ? "text-primary" : "text-gray-900 dark:text-gray-100"
                                                        )}>
                                                            {item.title}
                                                        </span>
                                                        {(item.content_type === 'assignment' || item.content_type === 'quiz') && item.due_date && (
                                                            <div className="flex items-center gap-1 mt-1">
                                                                <Calendar className="h-3 w-3 text-yellow-500" />
                                                                <span className="text-xs text-yellow-600 dark:text-yellow-400 truncate">
                                                                    {new Date(item.due_date).toLocaleDateString()}
                                                                </span>
                                                            </div>
                                                        )}
                                                    </div>
                                                    <Badge variant={getBadgeVariant(item.content_type)} className="capitalize text-xs h-6 px-2.5 flex-shrink-0">
                                                        {item.content_type === 'attachment' ? 'File' : item.content_type}
                                                    </Badge>
                                                </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                    ))}
                                </div>
                            </AccordionContent>
                        </AccordionItem>
                    ))}
                </Accordion>
            </ScrollArea>
        </>
    )
}


export const CourseContent = ({ courseId }: CourseContentProps) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [currentContentItemId, setCurrentContentItemId] = useState<string | null>(null);
  const [course, setCourse] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [openSectionIds, setOpenSectionIds] = useState<string[]>([]);
  const { user } = useAuth();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const lastUpdateTimeRef = useRef(0);
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  const [userAnswers, setUserAnswers] = useState<Record<string, string | string[]>>({});
  const [isQuizSubmitted, setIsQuizSubmitted] = useState(false);
  const [quizResults, setQuizResults] = useState<Record<string, boolean>>({});

  const actualCourseId = courseId || id;

  const { currentModule, currentLesson, currentContentItem } = useMemo(() => {
    if (!course || !currentContentItemId) {
      return { currentModule: null, currentLesson: null, currentContentItem: null };
    }
    for (const module of course.modules) {
      for (const lesson of module.lessons) {
        const contentItem = lesson.contentItems.find((item: any) => item.id === currentContentItemId);
        if (contentItem) {
          return { currentModule: module, currentLesson: lesson, currentContentItem: contentItem };
        }
      }
    }
    return { currentModule: null, currentLesson: null, currentContentItem: null };
  }, [course, currentContentItemId]);

  const { mainContentHtml, attachments } = useMemo(() => {
    if (currentContentItem?.content_type !== 'assignment' || !currentContentItem?.content_path || typeof currentContentItem.content_path !== 'string') {
      return { mainContentHtml: currentContentItem?.content_path || '', attachments: [] };
    }

    const htmlString = currentContentItem.content_path;
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlString, 'text/html');
    const links = Array.from(doc.querySelectorAll('a'));
    const foundAttachments: { url: string, name: string }[] = [];

    for (const link of links) {
      if (link.href.includes('supabase.co')) { 
        foundAttachments.push({
          url: link.href,
          name: link.textContent || link.href.split('/').pop() || 'download',
        });
        if (link.parentElement?.tagName === 'P' && link.parentElement.childNodes.length === 1) {
            link.parentElement.remove();
        } else {
            link.remove();
        }
      }
    }

    return { mainContentHtml: doc.body.innerHTML, attachments: foundAttachments };
  }, [currentContentItem]);

  useEffect(() => {
    if (currentContentItem?.content_type === 'quiz') {
      const submission = currentContentItem.submission;
      if (submission) {
        // Convert old single-choice format to new format if needed
        const answers: Record<string, string | string[]> = {};
        if (submission.answers) {
          Object.keys(submission.answers as Record<string, any>).forEach(questionId => {
            const answer = (submission.answers as Record<string, any>)[questionId];
            // If it's already an array, keep it; otherwise convert to array for backward compatibility
            answers[questionId] = Array.isArray(answer) ? answer : [answer];
          });
        }
        setUserAnswers(answers);
        setQuizResults(submission.results || {});
        setIsQuizSubmitted(true);
      } else {
        setIsQuizSubmitted(false);
        setUserAnswers({});
        setQuizResults({});
      }
    }
  }, [currentContentItem]);

  const transformCourseData = (data: any, progress: any[] = [], quizSubmissions: any[] = []) => {
    if (!data) return null;
    let totalItems = 0;
    let completedItems = 0;
    const modules = data.sections?.sort((a:any, b:any) => a.position - b.position).map((section: any) => {
      const lessons = section.lessons?.sort((a:any, b:any) => a.position - b.position).map((lesson: any) => {
        const contentItems = lesson.contentItems?.sort((a:any, b:any) => a.position - b.position).map((item: any) => {
          totalItems++;
          const itemProgress = progress.find(p => p.lesson_content_id === item.id);
          const isCompleted = !!itemProgress?.completed_at;
          if (isCompleted) completedItems++;
          let submission = quizSubmissions.find(s => s.lesson_content_id === item.id) || null;
          
          // Handle quiz questions with question_type field
          let processedItem = { ...item };
          if (item.content_type === 'quiz' && item.quiz) {
            processedItem.quiz = item.quiz.map((q: any) => ({
              ...q,
              question_type: q.question_type || 'single_choice' // Default for backward compatibility
            }));
          }
          
          return {
            ...processedItem,
            completed: isCompleted,
            status: isCompleted ? 'completed' : (itemProgress ? 'in_progress' : 'not_started'),
            progressSeconds: itemProgress?.progress_data?.seconds || 0,
            submission,
          };
        }) || [];
        const allContentItemsCompleted = contentItems.length > 0 && contentItems.every((ci: any) => ci.completed);
        return { ...lesson, contentItems, completed: allContentItemsCompleted };
      }) || [];
      return { id: section.id, title: section.title, lessons };
    }) || [];
    return {
      id: data.id,
      title: data.title || "Course Title",
      totalProgress: totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0,
      modules,
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
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
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

  const markContentAsComplete = useCallback(async (contentId: string, lessonId: string, courseId: string, duration?: number) => {
    if (!user) return;
    const { error } = await supabase.from('user_content_item_progress').upsert(
      {
        user_id: user.id,
        course_id: courseId,
        lesson_id: lessonId,
        lesson_content_id: contentId,
        completed_at: new Date().toISOString(),
        progress_data: duration ? { seconds: duration } : undefined,
        status: 'completed',
      },
      { onConflict: 'user_id,lesson_content_id' }
    );
    if (error) {
      toast.error("Failed to mark content complete.");
      return;
    }
    toast.success("Content completed!");
    setCourse((prevCourse: any) => {
      if (!prevCourse) return null;
      let newTotalProgress = prevCourse.totalProgress;
      const newModules = prevCourse.modules.map((m:any) => ({
        ...m,
        lessons: m.lessons.map((l:any) => ({
          ...l,
          contentItems: l.contentItems.map((ci:any) => {
            if (ci.id === contentId && !ci.completed) {
               return {...ci, completed: true, status: 'completed'};
            }
            return ci;
          })
        }))
      }));

      const allContentItems = newModules.flatMap((m: any) => m.lessons.flatMap((l: any) => l.contentItems));
      const completedCount = allContentItems.filter((ci:any) => ci.completed).length;
      newTotalProgress = allContentItems.length > 0 ? Math.round((completedCount / allContentItems.length) * 100) : 0;
      
      return {...prevCourse, modules: newModules, totalProgress: newTotalProgress};
    });
  }, [user]);

  const handleTimeUpdate = useCallback(() => {
    const videoNode = videoRef.current;
    if (!videoNode || !user || !currentContentItem || !currentLesson) return;
    const { currentTime, duration } = videoNode;
    if (!duration || !isFinite(duration) || duration === 0) return;

    const now = Date.now();
    if (now - lastUpdateTimeRef.current > 15000) {
      lastUpdateTimeRef.current = now;
      supabase.from('user_content_item_progress').upsert({
        user_id: user.id,
        course_id: actualCourseId,
        lesson_id: currentLesson.id,
        lesson_content_id: currentContentItem.id,
        progress_data: { seconds: currentTime },
        status: 'in_progress',
      }, { onConflict: 'user_id,lesson_content_id' }).then(({ error }) => {
        if (error) toast.error("Failed to save progress", { description: error.message });
      });
    }

    if ((currentTime / duration) >= 0.95 && !currentContentItem.completed) {
      markContentAsComplete(currentContentItem.id, currentLesson.id, actualCourseId, duration);
    }
  }, [user, actualCourseId, currentContentItem, currentLesson, markContentAsComplete]);

  const handleQuizSubmit = async () => {
    if (!user || !currentContentItem || !currentLesson || !course || (currentContentItem.submission && currentContentItem.submission.id)) return;
    const questions = currentContentItem.quiz || [];
    const results: Record<string, boolean> = {};
    let correctAnswers = 0;
    questions.forEach((q: any) => {
        const correctOptions = q.options.filter((opt: any) => opt.is_correct);
        const userAnswer = userAnswers[q.id] as string | string[] | undefined;
        
        let isCorrect = false;
        if (q.question_type === 'multiple_choice') {
          // For multiple choice, check if all correct options are selected and no incorrect ones
          if (Array.isArray(userAnswer)) {
            const selectedOptionIds = new Set(userAnswer);
            const correctOptionIds = new Set(correctOptions.map((opt: any) => opt.id as string));
            isCorrect = correctOptions.length > 0 && 
                       correctOptionIds.size === selectedOptionIds.size &&
                       [...correctOptionIds].every((id: string) => selectedOptionIds.has(id));
          }
        } else {
          // For single choice, check if the selected option is correct
          const correctOption = correctOptions[0]; // Single choice has only one correct option
          isCorrect = userAnswer === correctOption?.id;
        }
        
        results[q.id] = isCorrect;
        if (isCorrect) correctAnswers++;
    });
    const score = questions.length > 0 ? (correctAnswers / questions.length) * 100 : 0;
    const { data: newSubmission, error } = await supabase.from('quiz_submissions').insert({
        user_id: user.id,
        lesson_content_id: currentContentItem.id,
        lesson_id: currentLesson.id,
        course_id: course.id,
        answers: userAnswers,
        results: results,
        score: score,
    }).select().single();
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
            lessons: module.lessons.map((lesson: any) => ({
                ...lesson,
                contentItems: lesson.contentItems.map((item: any) => 
                    item.id === currentContentItem.id ? { ...item, submission: newSubmission } : item
                ),
            })),
        }));
        return { ...prevCourse, modules: updatedModules };
    });
    await markContentAsComplete(currentContentItem.id, currentLesson.id, course.id);
    toast.success(`Quiz submitted! Your score: ${score.toFixed(0)}%`);
  };

  useEffect(() => {
    const fetchCourseData = async () => {
      if (!actualCourseId) {
        setError("No course ID provided");
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      try {
        const { data, error } = await supabase.from('courses').select(`*,sections:course_sections(*,lessons:course_lessons(*,contentItems:course_lesson_content(*,quiz:quiz_questions(*,options:question_options(*)))))`).eq('id', actualCourseId).single();
        if (error) throw error;
        if (data) {
          for (const section of data.sections) {
            for (const lesson of section.lessons) {
              for (const item of lesson.contentItems) {
                if ((item.content_type === 'video' || item.content_type === 'attachment') && item.content_path) {
                  const { data: signedUrlData } = await supabase.storage.from('dil-lms').createSignedUrl(item.content_path, 3600);
                  item.signedUrl = signedUrlData?.signedUrl;
                }
              }
            }
          }
          let userProgress: any[] = [], quizSubmissions: any[] = [];
          if (user) {
            const contentItemIds = data.sections.flatMap((s: any) => s.lessons.flatMap((l: any) => l.contentItems.map((ci: any) => ci.id)));
            if (contentItemIds.length > 0) {
              const { data: progressData } = await supabase.from('user_content_item_progress').select('*').eq('user_id', user.id).in('lesson_content_id', contentItemIds);
              userProgress = progressData || [];
              const { data: submissionsData } = await supabase.from('quiz_submissions').select('*').eq('user_id', user.id).in('lesson_content_id', contentItemIds.filter((id: string) => data.sections.flatMap((s: any) => s.lessons.flatMap((l: any) => l.contentItems.filter((ci: any) => ci.content_type === 'quiz').map((ci: any) => ci.id))).includes(id)));
              quizSubmissions = submissionsData || [];
            }
          }
          const transformedCourse = transformCourseData(data, userProgress, quizSubmissions);
          setCourse(transformedCourse);
          if (transformedCourse) {
            const allContentItems = transformedCourse.modules.flatMap((m: any) => m.lessons.flatMap((l: any) => l.contentItems));
            const firstUncompleted = allContentItems.find((item: any) => !item.completed);
            const itemToStartWith = firstUncompleted || allContentItems[0];
            if (itemToStartWith) {
              setCurrentContentItemId(itemToStartWith.id);
              let sectionIdToOpen;
              for (const module of transformedCourse.modules) {
                  for (const lesson of module.lessons) {
                      if (lesson.contentItems.some((ci: any) => ci.id === itemToStartWith.id)) {
                          sectionIdToOpen = module.id;
                          break;
                      }
                  }
                  if (sectionIdToOpen) break;
              }
              if (sectionIdToOpen) setOpenSectionIds([sectionIdToOpen]);
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

  const handleLoadedMetadata = useCallback(() => {
    const videoNode = videoRef.current;
    if (videoNode && currentContentItem && currentContentItem.progressSeconds > 0 && videoNode.duration > currentContentItem.progressSeconds) {
      videoNode.currentTime = currentContentItem.progressSeconds;
    }
  }, [currentContentItem]);

  const allContentItems = useMemo(() => course?.modules.flatMap((m: any) => m.lessons.flatMap((l: any) => l.contentItems)) || [], [course]);
  const currentIndex = useMemo(() => allContentItems.findIndex((item: any) => item.id === currentContentItemId), [allContentItems, currentContentItemId]);
  const nextContentItem = currentIndex !== -1 ? allContentItems[currentIndex + 1] : null;
  const prevContentItem = currentIndex !== -1 ? allContentItems[currentIndex - 1] : null;

  const handleNavigation = (item: any) => {
    if (!item) return;
    setCurrentContentItemId(item.id);
     if (course) {
        let sectionIdToOpen;
        for (const module of course.modules) {
            for (const lesson of module.lessons) {
                if (lesson.contentItems.some((ci: any) => ci.id === item.id)) {
                    sectionIdToOpen = module.id;
                    break;
                }
            }
            if (sectionIdToOpen) break;
        }
        if (sectionIdToOpen && !openSectionIds.includes(sectionIdToOpen)) {
            setOpenSectionIds(prev => [...prev, sectionIdToOpen]);
        }
    }
  };
  
  const handleContentItemClick = (itemId: string) => {
      handleNavigation(allContentItems.find(item => item.id === itemId));
      setIsSheetOpen(false);
  }

  const renderContent = () => {
    if (!currentContentItem) return null;
    switch (currentContentItem.content_type) {
      case 'video':
        return (
          <div className="space-y-6">
            {currentContentItem.signedUrl ? (
              <div className="relative aspect-video bg-black rounded-3xl overflow-hidden shadow-2xl">
                 <video ref={videoRef} controls className="w-full h-full" key={currentContentItem.id} src={currentContentItem.signedUrl} onTimeUpdate={handleTimeUpdate} onLoadedMetadata={handleLoadedMetadata} />
              </div>
            ) : (
              <div className="relative aspect-video bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 rounded-3xl overflow-hidden flex items-center justify-center shadow-xl">
                <div className="text-center p-8">
                  <PlayCircle className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground text-lg font-medium">No video content available</p>
                </div>
              </div>
            )}
            <Card className="bg-gradient-to-br from-card to-card/50 dark:bg-card border border-gray-200/50 dark:border-gray-700/50 rounded-3xl shadow-lg">
              <CardHeader>
                <CardTitle className="text-gray-900 dark:text-gray-100">Overview</CardTitle>
              </CardHeader>
              <CardContent className="text-gray-700 dark:text-gray-300">{currentLesson?.overview}</CardContent>
            </Card>
          </div>
        );
      case 'attachment':
        const handleAttachmentInteraction = () => { if (currentContentItem && !currentContentItem.completed && currentLesson) markContentAsComplete(currentContentItem.id, currentLesson.id, actualCourseId); };
        return (
          <Card className="bg-gradient-to-br from-card to-card/50 dark:bg-card border border-gray-200/50 dark:border-gray-700/50 rounded-3xl shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-gray-100">
                <Paperclip className="w-5 h-5 text-primary" />
                Attachment
              </CardTitle>
            </CardHeader>
            <CardContent>
              {currentContentItem.signedUrl ? (
                <div className="flex items-center justify-between gap-4 p-4 border border-gray-200/50 dark:border-gray-600/50 rounded-2xl bg-gradient-to-br from-gray-50 to-gray-100/50 dark:from-gray-800/50 dark:to-gray-700/50">
                  <div className="flex items-center gap-3">
                    <FileText className="w-6 h-6 text-primary" />
                    <span className="font-medium text-gray-900 dark:text-gray-100">{currentContentItem.content_path?.split('/').pop()}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button asChild variant="outline" className="hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all duration-300">
                      <a href={currentContentItem.signedUrl} target="_blank" rel="noopener noreferrer" onClick={handleAttachmentInteraction}>
                        View
                      </a>
                    </Button>
                    <Button onClick={() => {
                      handleAttachmentInteraction();
                      handleDownload(currentContentItem.signedUrl, currentContentItem.content_path?.split('/').pop() || 'download');
                    }} disabled={isDownloading} className="bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary shadow-lg hover:shadow-xl transition-all duration-300">
                      {isDownloading ? 'Downloading...' : 'Download'}
                    </Button>
                  </div>
                </div>
              ) : <p className="text-muted-foreground">Attachment not available.</p>}
            </CardContent>
          </Card>
        );
      case 'assignment':
        return (
          <div className="space-y-6">
            <Card className="bg-gradient-to-br from-card to-card/50 dark:bg-card border border-gray-200/50 dark:border-gray-700/50 rounded-3xl shadow-lg">
              <CardHeader>
                <CardTitle className="text-gray-900 dark:text-gray-100">Assignment Details</CardTitle>
                {currentContentItem.due_date && (
                  <div className="flex items-center gap-2 text-sm text-yellow-600 dark:text-yellow-400">
                    <Calendar className="h-4 w-4" />
                    <span className="font-medium">Due:</span>
                    <span>{new Date(currentContentItem.due_date).toLocaleString()}</span>
                  </div>
                )}
              </CardHeader>
              <CardContent>
                <div className="prose prose-sm max-w-none dark:prose-invert" dangerouslySetInnerHTML={{ __html: mainContentHtml }} />
              </CardContent>
            </Card>
            {attachments.length > 0 && (
              <Card className="bg-gradient-to-br from-card to-card/50 dark:bg-card border border-gray-200/50 dark:border-gray-700/50 rounded-3xl shadow-lg">
                <CardHeader>
                  <CardTitle className="text-gray-900 dark:text-gray-100">Attached Files</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {attachments.map((att, index) => (
                    <div key={index} className="flex items-center justify-between gap-4 p-4 border border-gray-200/50 dark:border-gray-600/50 rounded-2xl bg-gradient-to-br from-gray-50 to-gray-100/50 dark:from-gray-800/50 dark:to-gray-700/50">
                      <div className="flex items-center gap-3">
                        <FileText className="w-6 h-6 text-primary" />
                        <span className="font-medium text-gray-900 dark:text-gray-100">{att.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button asChild variant="outline" className="hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all duration-300">
                          <a href={att.url} target="_blank" rel="noopener noreferrer">View</a>
                        </Button>
                        <Button onClick={() => handleDownload(att.url, att.name)} disabled={isDownloading} className="bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary shadow-lg hover:shadow-xl transition-all duration-300">
                          {isDownloading ? 'Downloading...' : 'Download'}
                        </Button>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
            <div className="text-center">
              <Button onClick={() => navigate('/dashboard/assignments')} className="bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary shadow-lg hover:shadow-xl transition-all duration-300">
                Go to Assignments
              </Button>
            </div>
          </div>
        );
      case 'quiz':
        const questions = currentContentItem.quiz || [];
        const hasSubmitted = isQuizSubmitted || !!(currentContentItem.submission && currentContentItem.submission.id);
        return (
          <Card className="bg-gradient-to-br from-card to-card/50 dark:bg-card border border-gray-200/50 dark:border-gray-700/50 rounded-3xl shadow-lg">
            <CardHeader>
              <CardTitle className="text-gray-900 dark:text-gray-100">Knowledge Check</CardTitle>
              {currentContentItem.due_date && (
                <div className="flex items-center gap-2 text-sm text-yellow-600 dark:text-yellow-400">
                  <Calendar className="h-4 w-4" />
                  <span className="font-medium">Due:</span>
                  <span>{new Date(currentContentItem.due_date).toLocaleString()}</span>
                </div>
              )}
            </CardHeader>
            <CardContent className="space-y-6">
              {questions.map((q: any, index: number) => {
                const correctOptions = q.options.filter((opt: any) => opt.is_correct);
                const questionType = q.question_type || 'single_choice'; // Default for backward compatibility
                const userAnswer = userAnswers[q.id];
                const isMultipleChoice = questionType === 'multiple_choice';
                
                return (
                  <div key={q.id} className="space-y-4">
                    <div className="flex items-center gap-3">
                      <h4 className="font-medium text-gray-900 dark:text-gray-100">{index + 1}. {q.question_text}</h4>
                      <Badge 
                        variant={isMultipleChoice ? 'default' : 'secondary'}
                        className={`text-xs ${
                          isMultipleChoice 
                            ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 border-purple-200 dark:border-purple-700' 
                            : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border-blue-200 dark:border-blue-700'
                        }`}
                      >
                        {isMultipleChoice ? 'Multiple Choice' : 'Single Choice'}
                      </Badge>
                    </div>
                    <div className="space-y-2">
                      {q.options.sort((a:any,b:any) => a.position-b.position).map((option: any) => {
                        let isSelected = false;
                        if (isMultipleChoice) {
                          isSelected = Array.isArray(userAnswer) && userAnswer.includes(option.id);
                        } else {
                          isSelected = userAnswer === option.id;
                        }
                        
                        const showAsCorrect = hasSubmitted && option.is_correct;
                        const showAsIncorrect = hasSubmitted && isSelected && !option.is_correct;
                        
                        const handleOptionClick = () => {
                          if (isMultipleChoice) {
                            setUserAnswers(prev => {
                              const currentAnswers = Array.isArray(prev[q.id]) ? prev[q.id] as string[] : [];
                              const newAnswers = isSelected 
                                ? currentAnswers.filter(id => id !== option.id)
                                : [...currentAnswers, option.id];
                              return { ...prev, [q.id]: newAnswers };
                            });
                          } else {
                            setUserAnswers(prev => ({ ...prev, [q.id]: option.id }));
                          }
                        };
                        
                        return (
                          <Button 
                            key={option.id} 
                            variant="outline" 
                            disabled={hasSubmitted} 
                            onClick={handleOptionClick}
                            className={cn(
                              "w-full justify-start p-4 h-auto text-left transition-all duration-300 hover:shadow-md", 
                              isSelected && (isMultipleChoice ? "border-purple-300 bg-purple-50 dark:bg-purple-900/20 dark:border-purple-600" : "border-blue-300 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-600"), 
                              showAsCorrect && "bg-green-100 border-green-500 dark:bg-green-900/20 dark:border-green-400", 
                              showAsIncorrect && "bg-red-100 border-red-500 dark:bg-red-900/20 dark:border-red-400"
                            )}
                          >
                            <div className="flex items-center gap-3 w-full">
                              {isMultipleChoice ? (
                                // Checkbox for multiple choice
                                <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                                  isSelected 
                                    ? 'bg-purple-600 border-purple-600'
                                    : 'border-gray-300 dark:border-gray-600'
                                }`}>
                                  {isSelected && (
                                    <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                    </svg>
                                  )}
                                </div>
                              ) : (
                                // Radio button for single choice
                                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                                  isSelected 
                                    ? 'bg-blue-600 border-blue-600'
                                    : 'border-gray-300 dark:border-gray-600'
                                }`}>
                                  {isSelected && (
                                    <div className="w-2 h-2 rounded-full bg-white" />
                                  )}
                                </div>
                              )}
                              <span className="flex-1 text-gray-900 dark:text-gray-100">{option.option_text}</span>
                              {hasSubmitted && option.is_correct && (
                                <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0" />
                              )}
                              {hasSubmitted && showAsIncorrect && (
                                <XCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0" />
                              )}
                            </div>
                          </Button>
                        )
                      })}
                    </div>
                  </div>
                );
              })}
              {!hasSubmitted && (
                <Button 
                  onClick={handleQuizSubmit} 
                  disabled={questions.length === 0 || questions.some((q: any) => {
                    const userAnswer = userAnswers[q.id];
                    const questionType = q.question_type || 'single_choice';
                    
                    if (questionType === 'multiple_choice') {
                      // For multiple choice, at least one option must be selected
                      return !Array.isArray(userAnswer) || userAnswer.length === 0;
                    } else {
                      // For single choice, exactly one option must be selected
                      return !userAnswer || userAnswer === '';
                    }
                  })} 
                  className="bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary shadow-lg hover:shadow-xl transition-all duration-300"
                >
                  Submit Quiz
                </Button>
              )}
              {hasSubmitted && currentContentItem.submission && (
                 <div className="p-4 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/20 border border-primary/30 dark:border-primary/20 shadow-lg">
                   <h4 className="font-semibold text-gray-900 dark:text-gray-100">Quiz Submitted</h4>
                   <p className="text-muted-foreground text-sm mt-1">
                     You scored {currentContentItem.submission.score ? currentContentItem.submission.score.toFixed(0) : '0'}%.
                   </p>
                 </div>
              )}
            </CardContent>
          </Card>
        );
      default: return <div className="text-muted-foreground">Unsupported content type.</div>;
    }
  };

  const PageSkeleton = () => (
    <div className="flex h-screen bg-background">
      <ContentLoader message="Loading course..." />
    </div>
  );

  if (isLoading) return <PageSkeleton />;
  if (error) return (
    <div className="flex flex-col items-center justify-center h-full text-center p-8">
      <h2 className="text-xl font-semibold text-destructive mb-2">Failed to load course</h2>
      <p className="text-muted-foreground mb-4">{error}</p>
      <Button onClick={() => navigate(-1)} className="bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary shadow-lg hover:shadow-xl transition-all duration-300">
        Go Back
      </Button>
    </div>
  );
  if (!course) return (
    <div className="flex flex-col items-center justify-center h-full text-center p-8">
      <h2 className="text-xl font-semibold text-muted-foreground">Course not found</h2>
      <p className="text-muted-foreground mb-4">The course you're looking for doesn't exist.</p>
      <Button onClick={() => navigate(-1)} className="bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary shadow-lg hover:shadow-xl transition-all duration-300">
        Go Back
      </Button>
    </div>
  );

  return (
    <div className="flex h-full bg-background">
      <div className="hidden lg:flex flex-col w-80 border-r border-gray-200/50 dark:border-gray-700/50 bg-gradient-to-br from-card to-card/50 dark:bg-card">
        <CourseNavigationSidebar
            course={course}
            openSectionIds={openSectionIds}
            setOpenSectionIds={setOpenSectionIds}
            currentContentItemId={currentContentItemId}
            onContentItemClick={(itemId: string) => handleNavigation(allContentItems.find(item => item.id === itemId))}
        />
       </div>
       <div className="flex-1 flex flex-col w-full">
          <div className="relative border-b border-gray-200/50 dark:border-gray-700/50 p-4 bg-gradient-to-br from-card to-card/50 dark:bg-card">
              <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
                        <SheetTrigger asChild>
                            <Button variant="outline" size="icon" className="lg:hidden hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all duration-300">
                              <Menu className="w-5 h-5" />
                            </Button>
                        </SheetTrigger>
                        <SheetContent side="left" className="w-80 p-0 flex flex-col bg-gradient-to-br from-card to-card/50 dark:bg-card">
                           <CourseNavigationSidebar
                                course={course}
                                openSectionIds={openSectionIds}
                                setOpenSectionIds={setOpenSectionIds}
                                currentContentItemId={currentContentItemId}
                                onContentItemClick={handleContentItemClick}
                            />
                        </SheetContent>
                      </Sheet>
                      <div>
                          <h1 className="font-bold text-xl md:text-2xl text-gray-900 dark:text-gray-100">{currentContentItem?.title}</h1>
                          <p className="text-muted-foreground text-sm mt-1">{currentLesson?.title}</p>
                      </div>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => navigate(`/dashboard/courses/${actualCourseId}`)} className="hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all duration-300">
                    <ChevronLeft className="w-4 h-4 mr-2" />Back to Course
                  </Button>
              </div>
          </div>
          <ScrollArea className="flex-1">
            <div className="p-4 md:p-6">
                <div className="max-w-5xl mx-auto space-y-8">{renderContent()}</div>
            </div>
          </ScrollArea>
          <div className="bg-gradient-to-br from-card to-card/50 dark:bg-card p-4 sticky bottom-0 border-t border-gray-200/50 dark:border-gray-700/50">
            <div className="flex items-center justify-between max-w-5xl mx-auto">
              <div>{prevContentItem && (
                <Button variant="outline" onClick={() => handleNavigation(prevContentItem)} className="hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all duration-300">
                  <ChevronLeft className="w-4 h-4 mr-2" />Previous
                </Button>
              )}</div>
              <div>{nextContentItem && (
                <Button onClick={() => handleNavigation(nextContentItem)} className="bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary shadow-lg hover:shadow-xl transition-all duration-300">
                  Next<ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              )}</div>
            </div>
          </div>
        </div>
    </div>
  );
};
