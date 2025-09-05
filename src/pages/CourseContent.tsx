import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ContentLoader } from '@/components/ContentLoader';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
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
import AccessLogService from '@/services/accessLogService';

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
  const [textAnswers, setTextAnswers] = useState<Record<string, string>>({});
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
        const textAnswersData: Record<string, string> = {};
        
        if (submission.answers) {
          Object.keys(submission.answers as Record<string, any>).forEach(questionId => {
            const answer = (submission.answers as Record<string, any>)[questionId];
            
            // Check if this is a text answer by looking at the question type
            const question = currentContentItem.quiz?.find((q: any) => q.id === questionId);
            if (question?.question_type === 'text_answer') {
              // This is a text answer
              textAnswersData[questionId] = answer;
            } else {
              // This is a multiple choice/single choice answer
              // If it's already an array, keep it; otherwise convert to array for backward compatibility
              answers[questionId] = Array.isArray(answer) ? answer : [answer];
            }
          });
        }
        
        setUserAnswers(answers);
        setTextAnswers(textAnswersData);
        setQuizResults(submission.results || {});
        setIsQuizSubmitted(true);
      } else {
        setIsQuizSubmitted(false);
        setUserAnswers({});
        setTextAnswers({});
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
    
    // Log content completion
    try {
      // Get content title from database if currentContentItem is not available
      let contentTitle = currentContentItem?.title;
      if (!contentTitle) {
        const { data: contentData } = await supabase
          .from('course_lesson_content')
          .select('title, content_type')
          .eq('id', contentId)
          .single();
        contentTitle = contentData?.title || 'Unknown Content';
      }

      await AccessLogService.logStudentCourseAction(
        user.id,
        user.email || 'unknown@email.com',
        'content_completed',
        courseId,
        contentTitle,
        {
          content_id: contentId,
          lesson_id: lessonId,
          content_type: currentContentItem?.content_type,
          duration: duration
        }
      );
    } catch (logError) {
      console.error('Error logging content completion:', logError);
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
      
      // Log course completion if progress reaches 100%
      if (newTotalProgress === 100 && prevCourse.totalProgress < 100) {
        // Use setTimeout to avoid blocking the state update
        setTimeout(async () => {
          try {
            await AccessLogService.logStudentCourseAction(
              user.id,
              user.email || 'unknown@email.com',
              'course_completed',
              courseId,
              prevCourse.title || 'Unknown Course',
              {
                total_items: allContentItems.length,
                completed_items: completedCount,
                course_id: courseId
              }
            );
          } catch (logError) {
            console.error('Error logging course completion:', logError);
          }
        }, 0);
      }
      
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
    let hasTextAnswers = false;
    
    questions.forEach((q: any) => {
        if (q.question_type === 'text_answer') {
          // For text answers, we can't auto-grade, so mark as requiring manual grading
          results[q.id] = false; // Will be updated by teacher
          hasTextAnswers = true;
        } else {
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
        }
    });
    
    // Calculate score only for auto-graded questions
    const autoGradedQuestions = questions.filter((q: any) => q.question_type !== 'text_answer');
    const score = autoGradedQuestions.length > 0 ? (correctAnswers / autoGradedQuestions.length) * 100 : 0;
    
    // Combine multiple choice/single choice answers with text answers
    const allAnswers = { ...userAnswers, ...textAnswers };
    
    // For quizzes with text answers, we'll let the database trigger handle the score
    // For regular quizzes, we can provide an immediate score
    const finalScore = hasTextAnswers ? null : score;
    
    const { data: newSubmission, error } = await supabase.from('quiz_submissions').insert({
        user_id: user.id,
        lesson_content_id: currentContentItem.id,
        lesson_id: currentLesson.id,
        course_id: course.id,
        answers: allAnswers,
        results: results,
        score: finalScore,
    }).select().single();
    
    if (error) {
        toast.error("Failed to submit quiz.", { description: error.message });
        return;
    }
    
    // Log quiz submission
    try {
      // Log as student course action (existing)
      await AccessLogService.logStudentCourseAction(
        user.id,
        user.email || 'unknown@email.com',
        'quiz_submitted',
        course.id,
        currentContentItem?.title || 'Unknown Quiz',
        {
          content_id: currentContentItem.id,
          lesson_id: currentLesson.id,
          submission_id: newSubmission.id,
          score: finalScore,
          has_text_answers: hasTextAnswers,
          correct_answers: correctAnswers,
          total_questions: questions.length
        }
      );
      
      // Also log as quiz submission (new)
      await AccessLogService.logQuizSubmission(
        user.id,
        user.email || 'unknown@email.com',
        currentContentItem.id,
        currentContentItem?.title || 'Unknown Quiz',
        course.id,
        course.title,
        finalScore
      );
    } catch (logError) {
      console.error('Error logging quiz submission:', logError);
    }
    
    setQuizResults(results);
    setIsQuizSubmitted(true);
    // Add empty text_answer_grades array to new submission
    const submissionWithGrades = {
      ...newSubmission,
      text_answer_grades: []
    };
    
    setCourse((prevCourse: any) => {
        if (!prevCourse) return null;
        const updatedModules = prevCourse.modules.map((module: any) => ({
            ...module,
            lessons: module.lessons.map((lesson: any) => ({
                ...lesson,
                contentItems: lesson.contentItems.map((item: any) => 
                    item.id === currentContentItem.id ? { ...item, submission: submissionWithGrades } : item
                ),
            })),
        }));
        return { ...prevCourse, modules: updatedModules };
    });
    await markContentAsComplete(currentContentItem.id, currentLesson.id, course.id);
    
    if (hasTextAnswers) {
      const autoGradedCount = autoGradedQuestions.length;
      const textAnswerCount = questions.length - autoGradedCount;
      
      if (autoGradedCount > 0) {
        toast.success(`Quiz submitted! Auto-graded questions: ${score.toFixed(0)}%. ${textAnswerCount} question(s) require manual grading.`);
      } else {
        toast.success(`Quiz submitted! All ${textAnswerCount} question(s) require manual grading by your teacher.`);
      }
    } else {
      toast.success(`Quiz submitted! Your score: ${score.toFixed(0)}%`);
    }
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
              
              // Fetch individual text answer grades for each submission
              if (submissionsData && submissionsData.length > 0) {
                for (const submission of submissionsData) {
                  const { data: gradesData } = await supabase.rpc('get_text_answer_grades', { submission_id: submission.id });
                  submission.text_answer_grades = gradesData || [];
                }
              }
              quizSubmissions = submissionsData || [];
            }
          }
          const transformedCourse = transformCourseData(data, userProgress, quizSubmissions);
          setCourse(transformedCourse);
          
          // Log course started if this is the first time accessing
          if (transformedCourse && userProgress.length === 0) {
            try {
              AccessLogService.logStudentCourseAction(
                user.id,
                user.email || 'unknown@email.com',
                'course_started',
                actualCourseId,
                transformedCourse.title || 'Unknown Course',
                {
                  course_id: actualCourseId,
                  total_modules: transformedCourse.modules.length,
                  total_lessons: transformedCourse.modules.flatMap((m: any) => m.lessons).length
                }
              );
            } catch (logError) {
              console.error('Error logging course started:', logError);
            }
          }
          
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
                const textAnswer = textAnswers[q.id];
                const isMultipleChoice = questionType === 'multiple_choice';
                const isTextAnswer = questionType === 'text_answer';
                
                return (
                  <div key={q.id} className="space-y-4">
                    <div className="flex items-center gap-3">
                      <h4 className="font-medium text-gray-900 dark:text-gray-100">{index + 1}. {q.question_text}</h4>
                      <Badge 
                        variant={isMultipleChoice ? 'default' : isTextAnswer ? 'outline' : 'secondary'}
                        className={`text-xs ${
                          isMultipleChoice 
                            ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 border-purple-200 dark:border-purple-700' 
                            : isTextAnswer
                            ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300 border-orange-200 dark:border-orange-700'
                            : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border-blue-200 dark:border-blue-700'
                        }`}
                      >
                        {isMultipleChoice ? 'Multiple Choice' : isTextAnswer ? 'Text Answer' : 'Single Choice'}
                      </Badge>
                    </div>
                    
                    {isTextAnswer ? (
                      <div className="space-y-3">
                        <Textarea
                          value={textAnswer || ''}
                          onChange={(e) => setTextAnswers(prev => ({ ...prev, [q.id]: e.target.value }))}
                          placeholder="Type your answer here..."
                          className="min-h-[120px] border-2 border-gray-200 dark:border-gray-700 focus:border-orange-500 focus:ring-orange-500/20"
                          disabled={hasSubmitted}
                        />
                        {hasSubmitted && !currentContentItem.submission?.manual_grading_completed && (
                          <div className="p-3 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-700 rounded-lg">
                            <div className="flex items-center gap-2 text-orange-700 dark:text-orange-300">
                              <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                              <span className="text-sm font-medium">This answer requires manual grading by your teacher</span>
                            </div>
                          </div>
                        )}
                        {hasSubmitted && currentContentItem.submission?.manual_grading_completed && (
                          <div className="space-y-3">
                            <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg">
                              <div className="flex items-center gap-2 text-green-700 dark:text-green-300">
                                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                <span className="text-sm font-medium">✓ This answer has been graded by your teacher</span>
                              </div>
                            </div>
                            
                            {/* Show individual grade and feedback if available */}
                            {currentContentItem.submission?.text_answer_grades && 
                             currentContentItem.submission.text_answer_grades.length > 0 &&
                             currentContentItem.submission.text_answer_grades.find((grade: any) => grade.question_id === q.id) && (
                              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg">
                                <div className="space-y-2">
                                  <div className="flex items-center justify-between">
                                    <span className="text-sm font-medium text-blue-700 dark:text-blue-300">Your Grade for the above question</span>
                                    <span className="text-lg font-bold text-blue-700 dark:text-blue-300">
                                      {currentContentItem.submission.text_answer_grades.find((grade: any) => grade.question_id === q.id)?.grade || 0}%
                                    </span>
                                  </div>
                                  {currentContentItem.submission.text_answer_grades.find((grade: any) => grade.question_id === q.id)?.feedback && 
                                   currentContentItem.submission.text_answer_grades.find((grade: any) => grade.question_id === q.id)?.feedback.trim() && (
                                    <div className="mt-3 p-3 bg-white dark:bg-gray-800 border border-blue-200 dark:border-blue-600 rounded-md">
                                      <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Teacher's Feedback:</div>
                                      <div className="text-sm text-gray-600 dark:text-gray-400">
                                        {currentContentItem.submission.text_answer_grades.find((grade: any) => grade.question_id === q.id)?.feedback}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ) : (
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
                                // Override default button hover to prevent color conflicts
                                "hover:bg-gray-50 hover:text-gray-900 hover:border-gray-300 dark:hover:bg-gray-800/50 dark:hover:text-gray-100 dark:hover:border-gray-600",
                                isSelected && (isMultipleChoice ? "border-purple-300 bg-purple-50 dark:bg-purple-900/20 dark:border-purple-600 hover:bg-purple-100 hover:border-purple-400 dark:hover:bg-purple-900/30 dark:hover:border-purple-500" : "border-blue-300 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-600 hover:bg-blue-100 hover:border-blue-400 dark:hover:bg-blue-900/30 dark:hover:border-blue-500"), 
                                showAsCorrect && "bg-green-100 border-green-500 dark:bg-green-900/20 dark:border-green-400 hover:bg-green-200 hover:border-green-600 dark:hover:bg-green-900/30 dark:hover:border-green-300", 
                                showAsIncorrect && "bg-red-100 border-red-500 dark:bg-red-900/20 dark:border-red-400 hover:bg-red-200 hover:border-red-600 dark:hover:bg-red-900/30 dark:hover:border-red-300"
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
                    )}
                  </div>
                );
              })}
              {!hasSubmitted && (
                <Button 
                  onClick={handleQuizSubmit} 
                  disabled={questions.length === 0 || questions.some((q: any) => {
                    const userAnswer = userAnswers[q.id];
                    const textAnswer = textAnswers[q.id];
                    const questionType = q.question_type || 'single_choice';
                    
                    if (questionType === 'text_answer') {
                      // For text answer, the answer must not be empty
                      return !textAnswer || textAnswer.trim() === '';
                    } else if (questionType === 'multiple_choice') {
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
                     {(currentContentItem.submission.score !== null || 
                       (currentContentItem.submission.manual_grading_completed && currentContentItem.submission.manual_grading_score !== null)) ? (
                       `You scored ${(currentContentItem.submission.manual_grading_score || currentContentItem.submission.score).toFixed(0)}%.`
                     ) : (
                       'Your score will be available after manual grading by your teacher.'
                     )}
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
    <div className="min-h-screen bg-background">
      {/* Premium Header Section */}
      <div className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Breadcrumb Navigation */}
            <div className="flex items-center space-x-4">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => navigate(`/dashboard/courses/${actualCourseId}`)}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                Back to Course
              </Button>
              <div className="h-4 w-px bg-border" />
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                <span className="font-medium">{currentModule?.title}</span>
                <span>•</span>
                <span>{currentLesson?.title}</span>
              </div>
            </div>
            
            {/* Progress Indicator */}
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <div className="text-sm font-semibold text-foreground">
                  {allContentItems.findIndex(item => item.id === currentContentItemId) + 1} of {allContentItems.length}
                </div>
                <div className="text-xs text-muted-foreground">Progress</div>
              </div>
              <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-primary rounded-full transition-all duration-500"
                  style={{ width: `${((allContentItems.findIndex(item => item.id === currentContentItemId) + 1) / allContentItems.length) * 100}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Layout */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          
          {/* Left Sidebar - Course Navigation */}
          <div className="lg:col-span-1">
            <div className="sticky top-24 space-y-6">
              
              {/* Course Overview Card */}
              <Card className="bg-card border-border shadow-sm">
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg font-bold text-card-foreground leading-tight">
                    {course.title}
                  </CardTitle>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Overall Progress</span>
                    <span className="text-lg font-bold text-primary">{course.totalProgress}%</span>
                  </div>
                  <Progress value={course.totalProgress} className="h-2" />
                </CardHeader>
              </Card>

              {/* Module Navigation */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide">
                  Course Modules
                </h3>
                <div className="space-y-2">
                  {course.modules.map((module: any) => {
                    const isCurrentModule = module.id === currentModule?.id;
                    const moduleProgress = Math.round((module.lessons.reduce((acc: number, lesson: any) => 
                      acc + lesson.contentItems.filter((item: any) => item.completed).length, 0) / 
                      module.lessons.reduce((acc: number, lesson: any) => acc + lesson.contentItems.length, 0)) * 100);
                    
                    return (
                      <div key={module.id} className="group">
                        <button
                          onClick={() => {
                            const firstItem = module.lessons[0]?.contentItems[0];
                            if (firstItem) handleNavigation(firstItem);
                          }}
                          className={cn(
                            "w-full text-left p-3 rounded-lg transition-all duration-200 border",
                            "hover:bg-muted/50",
                            isCurrentModule 
                              ? "bg-primary/10 border-primary/20 shadow-sm" 
                              : "bg-card border-border hover:border-primary/20"
                          )}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center space-x-2">
                              <BookOpen className={cn(
                                "w-4 h-4",
                                isCurrentModule ? "text-primary" : "text-muted-foreground"
                              )} />
                              <span className={cn(
                                "text-sm font-medium",
                                isCurrentModule ? "text-primary" : "text-foreground"
                              )}>
                                {module.title}
                              </span>
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {moduleProgress}%
                            </span>
                          </div>
                          <Progress value={moduleProgress} className="h-1" />
                        </button>
                        
                        {/* Current Module Lessons with Content Items */}
                        {isCurrentModule && (
                          <div className="mt-2 ml-6 space-y-1">
                            {module.lessons.map((lesson: any) => {
                              const isCurrentLesson = lesson.id === currentLesson?.id;
                              return (
                                <div key={lesson.id} className="space-y-1">
                                  <button
                                    onClick={() => {
                                      const firstItem = lesson.contentItems[0];
                                      if (firstItem) handleNavigation(firstItem);
                                    }}
                                    className={cn(
                                      "w-full text-left p-2 rounded-md text-sm transition-all duration-200",
                                      "hover:bg-muted/30",
                                      isCurrentLesson 
                                        ? "bg-primary/5 text-primary font-medium" 
                                        : "text-muted-foreground hover:text-foreground"
                                    )}
                                  >
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center space-x-2">
                                        <ClipboardList className="w-3 h-3" />
                                        <span className="truncate">{lesson.title}</span>
                                      </div>
                                      {isCurrentLesson && (
                                        <span className="text-xs text-muted-foreground">
                                          {lesson.contentItems.filter((item: any) => item.completed).length}/{lesson.contentItems.length}
                                        </span>
                                      )}
                                    </div>
                                  </button>
                                  
                                  {/* Show content items for current lesson */}
                                  {isCurrentLesson && (
                                    <div className="ml-4 space-y-0.5">
                                      {lesson.contentItems.map((item: any, index: number) => {
                                        const isActive = item.id === currentContentItemId;
                                        const isCompleted = item.completed;
                                        
                                        return (
                                          <button
                                            key={item.id}
                                            onClick={() => handleNavigation(item)}
                                            className={cn(
                                              "w-full text-left p-1.5 rounded text-xs transition-all duration-200 flex items-center space-x-2",
                                              "hover:bg-muted/20",
                                              isActive 
                                                ? "bg-primary/10 text-primary font-medium border-l-2 border-primary" 
                                                : "text-muted-foreground hover:text-foreground"
                                            )}
                                          >
                                            <div className="flex-shrink-0">
                                              {getContentItemIcon(item, currentContentItemId)}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                              <div className="truncate">
                                                {index + 1}. {item.title}
                                              </div>
                                            </div>
                                            {isCompleted && (
                                              <CheckCircle className="w-3 h-3 text-green-500 flex-shrink-0" />
                                            )}
                                          </button>
                                        );
                                      })}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="lg:col-span-3">
            <div className="space-y-6">
              
              {/* Content Header */}
              <Card className="bg-card border-border shadow-sm">
                <CardHeader className="pb-4">
                  <div className="flex items-start justify-between">
                                          <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <div className="w-2 h-2 bg-primary rounded-full" />
                          <span className="text-sm font-medium text-primary uppercase tracking-wide">
                            {currentContentItem?.content_type}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            • {allContentItems.findIndex(item => item.id === currentContentItemId) + 1} of {allContentItems.length}
                          </span>
                        </div>
                        <CardTitle className="text-2xl font-bold text-card-foreground leading-tight">
                          {currentContentItem?.title}
                        </CardTitle>
                        <p className="text-muted-foreground">
                          {currentLesson?.title} • {currentModule?.title}
                        </p>
                      </div>
                    
                    {/* Content Actions */}
                    <div className="flex items-center space-x-2">
                      {prevContentItem && (
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleNavigation(prevContentItem)}
                          className="hover:bg-muted"
                        >
                          <ChevronLeft className="w-4 h-4 mr-1" />
                          Previous
                        </Button>
                      )}
                      {nextContentItem && (
                        <Button 
                          size="sm"
                          onClick={() => handleNavigation(nextContentItem)}
                          className="bg-primary hover:bg-primary/90"
                        >
                          Next
                          <ChevronRight className="w-4 h-4 ml-1" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardHeader>
              </Card>

              {/* Content Display */}
              <Card className="bg-card border-border shadow-sm">
                <CardContent className="p-6">
                  {renderContent()}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
