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
import { QuizRetryService } from '@/services/quizRetryService';
import { QuizRetryInterface } from '@/components/QuizRetryInterface';
import { MathExpressionInput } from '@/components/quiz/MathExpressionInput';
// import { MathQuizService } from '@/services/mathQuizService';
import { evaluateMathExpression } from '@/utils/mathEvaluation';
import CourseNotificationService from '@/services/courseNotificationService';
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
  Calendar,
  GripVertical,
  Info,
  Image as ImageIcon,
  WifiOff
} from 'lucide-react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import {
  CSS,
} from '@dnd-kit/utilities';
import { useAuth } from '@/hooks/useAuth';
import { useUserProfile } from '@/hooks/useUserProfile';
import { cn } from '@/lib/utils';
import AccessLogService from '@/services/accessLogService';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { getCourseDataLayer } from '@/services/courseDataLayer';
import StripeService from '@/services/stripeService';

interface CourseContentProps {
  courseId?: string;
}

const getBadgeVariant = (type: string): "default" | "destructive" | "outline" | "secondary" | "blue" => {
    switch (type.toLowerCase()) {
        case 'video': return 'destructive';
        case 'quiz': return 'default';
        case 'assignment': return 'blue';
        case 'attachment': return 'outline';
        case 'lesson_plan': return 'secondary';
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
      case 'lesson_plan': return <ClipboardList className="w-5 h-5 text-indigo-500" />;
      default: return <Circle className="w-5 h-5 text-gray-400" />;
    }
};

// Component for displaying quiz question images with signed URL
const QuizQuestionImage = ({ imageUrl, onClick }: { imageUrl: string, onClick: () => void }) => {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadSignedUrl = async () => {
      if (imageUrl.startsWith('http')) {
        // Already a signed URL
        setSignedUrl(imageUrl);
        setLoading(false);
      } else {
        // It's a file path, create signed URL
        try {
          const { data, error } = await supabase.storage
            .from('dil-lms')
            .createSignedUrl(imageUrl, 3600); // 1 hour expiry
          
          if (error) {
            console.error('Error creating signed URL:', error);
            setLoading(false);
            return;
          }
          
          setSignedUrl(data.signedUrl);
        } catch (error) {
          console.error('Error creating signed URL:', error);
        } finally {
          setLoading(false);
        }
      }
    };

    loadSignedUrl();
  }, [imageUrl]);

  if (loading) {
    return (
      <div className="relative w-7 h-7 sm:w-8 sm:h-8 rounded-md overflow-hidden border border-purple-200 dark:border-purple-700 bg-gray-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0">
        <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!signedUrl) {
    return (
      <div className="relative w-7 h-7 sm:w-8 sm:h-8 rounded-md overflow-hidden border border-red-200 dark:border-red-700 bg-red-50 dark:bg-red-900/20 flex items-center justify-center flex-shrink-0">
        <ImageIcon className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-red-500" />
      </div>
    );
  }

  return (
    <div 
      className="relative w-7 h-7 sm:w-8 sm:h-8 rounded-md overflow-hidden border border-purple-200 dark:border-purple-700 cursor-pointer hover:border-purple-400 dark:hover:border-purple-500 transition-colors flex-shrink-0"
      onClick={onClick}
    >
      <img 
        src={signedUrl} 
        alt="Question image" 
        className="w-full h-full object-cover"
      />
    </div>
  );
};

// SortableContentItem component for drag and drop functionality
interface SortableContentItemProps {
  item: any;
  index: number;
  isActive: boolean;
  isCompleted: boolean;
  onNavigate: (item: any) => void;
  canReorder: boolean;
}

const SortableContentItem = ({ item, index, isActive, isCompleted, onNavigate, canReorder }: SortableContentItemProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ 
    id: item.id,
    disabled: !canReorder // Disable sorting if user can't reorder
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <button
        onClick={() => onNavigate(item)}
        className={cn(
          "w-full text-left p-1.5 rounded text-xs transition-all duration-200 flex items-center space-x-2 group",
          "hover:bg-muted/20",
          isActive 
            ? "bg-primary/10 text-primary font-medium border-l-2 border-primary" 
            : "text-muted-foreground hover:text-foreground"
        )}
      >
        {canReorder && (
          <div 
            {...attributes} 
            {...listeners}
            className="flex-shrink-0 p-1 hover:bg-muted/30 rounded cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <GripVertical className="w-3 h-3 text-muted-foreground" />
          </div>
        )}
        <div className="flex-shrink-0">
          {getContentItemIcon(item, isActive ? item.id : null)}
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
    </div>
  );
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
  const { profile, loading: profileLoading } = useUserProfile();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const lastUpdateTimeRef = useRef(0);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [isOfflineMode, setIsOfflineMode] = useState(false);
  const [isStripeEnabled, setIsStripeEnabled] = useState(false);
  const [isCheckingAccess, setIsCheckingAccess] = useState(true);
  
  // Data layer service
  const dataLayer = getCourseDataLayer();

  const [userAnswers, setUserAnswers] = useState<Record<string, string | string[]>>({});
  const [textAnswers, setTextAnswers] = useState<Record<string, string>>({});
  const [mathAnswers, setMathAnswers] = useState<Record<string, string>>({});
  const [mathDrawings, setMathDrawings] = useState<Record<string, string>>({});
  const [isQuizSubmitted, setIsQuizSubmitted] = useState(false);
  const [quizResults, setQuizResults] = useState<Record<string, boolean>>({});
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const [selectedImageUrl, setSelectedImageUrl] = useState<string>('');
  const [imageLoading, setImageLoading] = useState(false);

  // Memoized function to handle drawing changes
  const handleDrawingChange = useCallback((questionId: string, drawingData: string) => {
    // If drawingData is empty (cleared), just save it as is
    if (!drawingData || drawingData.trim() === '') {
      setMathDrawings(prev => ({ ...prev, [questionId]: drawingData }));
      return;
    }
    
    try {
      // Parse the drawing data to add the current text input
      const parsedDrawingData = JSON.parse(drawingData);
      const currentTextInput = mathAnswers[questionId] || '';
      
      // Add the mathExpression field to the drawing data
      const combinedData = {
        ...parsedDrawingData,
        mathExpression: currentTextInput
      };
      
      console.log('🔍 Combining drawing and text data for question', questionId, ':', combinedData);
      setMathDrawings(prev => ({ ...prev, [questionId]: JSON.stringify(combinedData) }));
    } catch (error) {
      console.error('Error parsing drawing data:', error);
      // Fallback: save as is
      setMathDrawings(prev => ({ ...prev, [questionId]: drawingData }));
    }
  }, [mathAnswers]);

  // Helper function to open image modal
  const openImageModal = async (imageUrl: string) => {
    setImageLoading(true);
    setImageModalOpen(true);
    setSelectedImageUrl(''); // Clear previous image
    
    // Check if it's already a signed URL or if we need to create one
    let signedUrl = imageUrl;
    if (!imageUrl.startsWith('http')) {
      // It's a file path, create signed URL
      try {
        const { data, error } = await supabase.storage
          .from('dil-lms')
          .createSignedUrl(imageUrl, 3600);
        
        if (error) {
          console.error('Error creating signed URL:', error);
          toast.error('Failed to load image');
          setImageLoading(false);
          setImageModalOpen(false);
          return;
        }
        
        signedUrl = data.signedUrl;
      } catch (error) {
        console.error('Error creating signed URL:', error);
        toast.error('Failed to load image');
        setImageLoading(false);
        setImageModalOpen(false);
        return;
      }
    }
    setSelectedImageUrl(signedUrl);
    setImageLoading(false);
  };

  const actualCourseId = courseId || id;

  // Check if user can reorder content (admin, super_user, teacher, content_creator only, and only in draft mode)
  const canReorderContent = (profile?.role === 'admin' || profile?.role === 'super_user' || profile?.role === 'teacher' || profile?.role === 'content_creator') && 
                           (course?.status === 'Draft' || course?.status === 'Rejected');

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Filter out quiz, assignment, and lesson_plan content items when in offline mode
  // Also hide lesson_plan content from students (only visible to teachers and admins)
  const allContentItems = useMemo(() => {
    const items = course?.modules.flatMap((m: any) => m.lessons.flatMap((l: any) => l.contentItems)) || [];
    
    console.log('🔍 CourseContent: Filtering content items', {
      totalItems: items.length,
      userRole: profile?.role,
      profileLoading,
      isOfflineMode,
      items: items.map(item => ({ id: item.id, title: item.title, content_type: item.content_type }))
    });
    
    // If profile is still loading, don't filter yet (show all content temporarily)
    if (profileLoading) {
      console.log('⏳ CourseContent: Profile still loading, showing all content temporarily');
      return items;
    }
    
    const filteredItems = items.filter((item: any) => {
      console.log('🔍 CourseContent: Filtering item', {
        id: item.id,
        title: item.title,
        content_type: item.content_type,
        isOfflineMode,
        userRole: profile?.role,
        profileLoading
      });
      
      // Hide quiz, assignment, and lesson_plan content when offline
      if (isOfflineMode) {
        const shouldHide = item.content_type !== 'quiz' && 
               item.content_type !== 'assignment' && 
               item.content_type !== 'lesson_plan';
        if (item.content_type === 'lesson_plan') {
          console.log('📴 CourseContent: Hiding lesson_plan due to offline mode');
        }
        console.log('📴 CourseContent: Offline mode - shouldHide:', shouldHide, 'for', item.content_type);
        return shouldHide;
      }
      
      // Hide lesson_plan content from students (only visible to teachers and admins)
      if (item.content_type === 'lesson_plan') {
        const isStudent = profile?.role === 'student' || !profile?.role;
        console.log('👤 CourseContent: Lesson plan visibility check', {
          itemTitle: item.title,
          userRole: profile?.role,
          isStudent,
          shouldHide: isStudent
        });
        if (isStudent) {
          console.log('🚫 CourseContent: Hiding lesson_plan from student');
          return false;
        }
      }
      
      console.log('✅ CourseContent: Keeping item', item.title, item.content_type);
      return true;
    });
    
    console.log('🔍 CourseContent: Final filtered items', {
      originalCount: items.length,
      filteredCount: filteredItems.length,
      items: filteredItems.map(item => ({ id: item.id, title: item.title, content_type: item.content_type }))
    });
    
    return filteredItems;
  }, [course, isOfflineMode, profile?.role, profileLoading]);

  const { currentModule, currentLesson, currentContentItem } = useMemo(() => {
    if (!course || !currentContentItemId) {
      return { currentModule: null, currentLesson: null, currentContentItem: null };
    }
    
    // First, try to find the content item from the filtered allContentItems
    const filteredItem = allContentItems.find((item: any) => item.id === currentContentItemId);
    if (filteredItem) {
      // Find the corresponding module and lesson for this content item
      for (const module of course.modules) {
        for (const lesson of module.lessons) {
          const contentItem = lesson.contentItems.find((item: any) => item.id === currentContentItemId);
          if (contentItem) {
            return { currentModule: module, currentLesson: lesson, currentContentItem: contentItem };
          }
        }
      }
    }
    
    // If not found in filtered items, return null (this will trigger a redirect)
    return { currentModule: null, currentLesson: null, currentContentItem: null };
  }, [course, currentContentItemId, allContentItems]);

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
      if (submission && submission.answers) {
        // Convert old single-choice format to new format if needed
        const answers: Record<string, string | string[]> = {};
        const textAnswersData: Record<string, string> = {};
        const mathAnswersData: Record<string, string> = {};
        const mathDrawingsData: Record<string, string> = {};
        
        if (submission.answers) {
          Object.keys(submission.answers as Record<string, any>).forEach(questionId => {
            const answer = (submission.answers as Record<string, any>)[questionId];
            
            // Check if this is a text answer or math expression by looking at the question type
            const question = currentContentItem.quiz?.find((q: any) => q.id === questionId);
            if (question?.question_type === 'text_answer') {
              // This is a text answer
              textAnswersData[questionId] = answer;
            } else if (question?.question_type === 'math_expression') {
              // Check if this is drawing data (JSON string with paths) or regular math expression
              if (typeof answer === 'string' && answer.startsWith('{"paths":')) {
                // This is drawing data - parse and store it
                try {
                  const drawingData = JSON.parse(answer);
                  mathDrawingsData[questionId] = answer; // Store the full JSON string
                  // If there's also a math expression in the drawing data, extract it
                  if (drawingData.mathExpression) {
                    mathAnswersData[questionId] = drawingData.mathExpression;
                    console.log('🔍 Extracted math expression for question', questionId, ':', drawingData.mathExpression);
                  } else {
                    console.log('🔍 No math expression found in drawing data for question', questionId, ':', drawingData);
                  }
                } catch (error) {
                  console.error('Error parsing drawing data:', error);
                  // Fallback: treat as regular math answer
                  mathAnswersData[questionId] = answer;
                }
              } else {
                // This is a regular math expression answer
                mathAnswersData[questionId] = answer;
              }
            } else {
              // This is a multiple choice/single choice answer
              // If it's already an array, keep it; otherwise convert to array for backward compatibility
              answers[questionId] = Array.isArray(answer) ? answer : [answer];
            }
          });
        }
        
        setUserAnswers(answers);
        setTextAnswers(textAnswersData);
        setMathAnswers(mathAnswersData);
        setMathDrawings(mathDrawingsData);
        setQuizResults(submission.results || {});
        setIsQuizSubmitted(true);
      } else {
        setIsQuizSubmitted(false);
        setUserAnswers({});
        setTextAnswers({});
        setMathAnswers({});
        setMathDrawings({});
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
            
            // Get the latest submission for this quiz (highest attempt_number)
            let submission = null;
            if (item.content_type === 'quiz') {
              const quizSubmissionsForItem = quizSubmissions.filter(s => s.lesson_content_id === item.id);
              if (quizSubmissionsForItem.length > 0) {
                // Sort by attempt_number descending to get the latest attempt
                submission = quizSubmissionsForItem.sort((a, b) => (b.attempt_number || 0) - (a.attempt_number || 0))[0];
              }
            } else {
              submission = quizSubmissions.find(s => s.lesson_content_id === item.id) || null;
            }
          
          // Handle quiz questions with question_type field
          let processedItem = { ...item };
          
          // CRITICAL FIX: Ensure signedUrl is preserved for video and attachment items
          if ((item.content_type === 'video' || item.content_type === 'attachment') && !processedItem.signedUrl) {
            console.log(`🔧 transformCourseData: signedUrl missing for ${item.content_type} ${item.id}, attempting to preserve from original data`);
            // The signedUrl might be missing from item but should be preserved
            // This is a fallback to ensure it doesn't get lost
          }
          
          if (item.content_type === 'quiz' && item.quiz) {
            processedItem.quiz = item.quiz.map((q: any) => ({
              ...q,
              question_type: q.question_type || 'single_choice', // Default for backward compatibility
              points: q.points || 1, // Default to 1 point if not specified
              // Ensure math fields are included
              math_expression: q.math_expression || null,
              math_tolerance: q.math_tolerance || null,
              math_hint: q.math_hint || null,
              math_allow_drawing: q.math_allow_drawing === true,
              // Ensure image_url is included
              image_url: q.image_url || null
            }));
          }
          
          const finalItem = {
            ...processedItem,
            completed: isCompleted,
            status: isCompleted ? 'completed' : (itemProgress ? 'in_progress' : 'not_started'),
            progressSeconds: itemProgress?.progress_data?.seconds || 0,
            submission,
          };
          
          
          return finalItem;
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
      // Check if the URL is already a blob URL (offline mode)
      const isBlobUrl = url.startsWith('blob:');
      
      let blobUrl = url;
      
      // Only fetch if it's not already a blob URL
      if (!isBlobUrl) {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const blob = await response.blob();
        blobUrl = window.URL.createObjectURL(blob);
      }
      
      // Create download link
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      
      // Only revoke the blob URL if we created it
      if (!isBlobUrl) {
        window.URL.revokeObjectURL(blobUrl);
      }
      
      toast.success('Download started!');
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Failed to download the attachment.');
    } finally {
      setIsDownloading(false);
    }
  };

  const markContentAsComplete = useCallback(async (contentId: string, lessonId: string, courseId: string, duration?: number) => {
    if (!user) return;
    
    // Skip progress tracking for view_only users
    if (profile?.role === 'view_only') {
      console.log('🔍 CourseContent: Skipping progress tracking for view_only user');
      return;
    }
    
    // Skip database update when offline
    if (!navigator.onLine) {
      console.log('🔴 CourseContent: Offline - skipping progress update');
      return;
    }
    
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

      // Skip access logging when offline
      if (navigator.onLine) {
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
      } else {
        console.log('🔴 CourseContent: Offline - skipping content completion logging');
      }
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
          // Skip course completion logging when offline
          if (!navigator.onLine) {
            console.log('🔴 CourseContent: Offline - skipping course completion logging');
            return;
          }
          
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

    // Skip progress tracking for view_only users
    if (profile?.role === 'view_only') {
      return;
    }

    const now = Date.now();
    if (now - lastUpdateTimeRef.current > 15000) {
      lastUpdateTimeRef.current = now;
      
      // Skip database update when offline
      if (!navigator.onLine) {
        console.log('🔴 CourseContent: Offline - skipping video progress update');
        return;
      }
      
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

  const handleQuizSubmit = async (retryReason?: string) => {
    if (!user || !currentContentItem || !currentLesson || !course) return;
    
    // Check if this is a retry attempt (look for attempt_number > 1 or previous attempts)
    const isRetry = currentContentItem.submission && 
                   (currentContentItem.submission.attempt_number > 1 || 
                    currentContentItem.submission.previous_attempt_id);
    
    // For retry attempts, check eligibility first
    if (isRetry) {
      const retryEligibility = await QuizRetryService.checkRetryEligibility(user.id, currentContentItem.id);
      if (!retryEligibility.canRetry) {
        toast.error("Cannot retry quiz", { description: retryEligibility.reason });
        return;
      }
    }
    
    const questions = currentContentItem.quiz || [];
    const results: Record<string, boolean> = {};
    let correctAnswers = 0;
    let hasTextAnswers = false;
    let hasMathAnswers = false;
    
    // Process all questions including math expressions
    questions.forEach((q: any) => {
        if (q.question_type === 'text_answer') {
          // For text answers, we can't auto-grade, so mark as requiring manual grading
          results[q.id] = false; // Will be updated by teacher
          hasTextAnswers = true;
        } else if (q.question_type === 'math_expression') {
          // Process math expressions
          hasMathAnswers = true;
          const userMathAnswer = mathAnswers[q.id];
          const userDrawing = mathDrawings[q.id];
          const expectedAnswer = q.math_expression;
          const tolerance = q.math_tolerance || 0.01;
          const allowDrawing = q.math_allow_drawing === true;
          
          
          console.log('🔍 MATH EXPRESSION PROCESSING:', {
            questionId: q.id,
            allowDrawing,
            userMathAnswer,
            userDrawing,
            expectedAnswer,
            hasUserDrawing: !!userDrawing,
            userDrawingLength: userDrawing?.length,
            willCheckDrawing: allowDrawing && userDrawing && userDrawing.trim() !== ''
          });
          
          // Only check for drawing if drawing is actually enabled for this question
          if (allowDrawing && userDrawing && userDrawing.trim() !== '') {
            try {
              const drawingData = JSON.parse(userDrawing);
              // Only require manual grading if there are actual drawing paths
              if (drawingData.paths && drawingData.paths.length > 0) {
                // This is a drawing answer with actual content - will be graded manually
                hasTextAnswers = true; // Use this flag to indicate manual grading needed
              } else if (userMathAnswer && expectedAnswer) {
                // Drawing is empty, but there's a text answer - auto-grade the text
                const evaluation = evaluateMathExpression(userMathAnswer, expectedAnswer, tolerance);
                results[q.id] = evaluation.isCorrect;
                if (evaluation.isCorrect) correctAnswers++;
              } else {
                results[q.id] = false;
              }
            } catch (error) {
              // If parsing fails, treat as regular math answer
              if (userMathAnswer && expectedAnswer) {
                const evaluation = evaluateMathExpression(userMathAnswer, expectedAnswer, tolerance);
                results[q.id] = evaluation.isCorrect;
                if (evaluation.isCorrect) correctAnswers++;
              } else {
                results[q.id] = false;
              }
            }
          } else if (userMathAnswer && expectedAnswer) {
            // This is a regular math expression (drawing not enabled or no drawing) - auto-grade
            const evaluation = evaluateMathExpression(userMathAnswer, expectedAnswer, tolerance);
            results[q.id] = evaluation.isCorrect;
            
            if (evaluation.isCorrect) correctAnswers++;
          } else {
            results[q.id] = false;
          }
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
    
    // Calculate score only for auto-graded questions (exclude text_answer and drawing math expressions which require manual grading)
    const autoGradedQuestions = questions.filter((q: any) => {
      if (q.question_type === 'text_answer') return false;
      if (q.question_type === 'math_expression') {
        const allowDrawing = q.math_allow_drawing === true;
        const userDrawing = mathDrawings[q.id];
        // Only check for drawing if drawing is actually enabled for this question
        if (allowDrawing && userDrawing && userDrawing.trim() !== '') {
          try {
            const drawingData = JSON.parse(userDrawing);
            // Only exclude if there are actual drawing paths
            if (drawingData.paths && drawingData.paths.length > 0) {
              return false; // Exclude drawing math expressions with actual content
            }
          } catch (error) {
            // If parsing fails, include it for auto-grading
          }
        }
      }
      return true;
    });
    
    // Calculate score based on points instead of question count
    let earnedPoints = 0;
    let totalAutoGradedPoints = 0;
    
    autoGradedQuestions.forEach((q: any) => {
      const questionPoints = q.points || 1;
      totalAutoGradedPoints += questionPoints;
      const isCorrect = results[q.id];
      if (isCorrect) {
        earnedPoints += questionPoints;
      }
    });
    
    const score = totalAutoGradedPoints > 0 ? (earnedPoints / totalAutoGradedPoints) * 100 : 0;
    
    // Combine all answer types
    const allAnswers = { ...userAnswers, ...textAnswers, ...mathAnswers, ...mathDrawings };
    
    // For quizzes with text answers, we can't auto-calculate score, so set it to null
    // For regular quizzes (including math expressions), we can provide an immediate score
    // If no auto-graded questions exist, set score to 0 as fallback
    const finalScore = hasTextAnswers ? null : (autoGradedQuestions.length > 0 ? score : 0);
    
    // Explicitly set manual grading flags based on our logic
    const manualGradingRequired = hasTextAnswers;
    const manualGradingCompleted = !hasTextAnswers;
    
    console.log('🔍 MANUAL GRADING FLAGS:', {
      hasTextAnswers,
      manualGradingRequired,
      manualGradingCompleted,
      finalScore,
      questions: questions.map(q => ({
        id: q.id,
        type: q.question_type,
        allowDrawing: q.math_allow_drawing,
        hasUserAnswer: !!mathAnswers[q.id],
        hasUserDrawing: !!mathDrawings[q.id],
        userAnswer: mathAnswers[q.id],
        userDrawing: mathDrawings[q.id]
      }))
    });
    
    
    // Note: We no longer use QuizRetryService.createQuizAttempt since we handle
    // attempt tracking directly in the quiz_submissions table with the new functions
    
    // Handle legacy quiz_submissions entry for backward compatibility
    let newSubmission = null;
    if (isRetry) {
      // For retries, update the existing submission instead of creating a new one
      console.log('🔍 UPDATING QUIZ SUBMISSION:', {
        manual_grading_required: manualGradingRequired,
        manual_grading_completed: manualGradingCompleted,
        score: finalScore
      });
      
      // Use the new function for updating submissions
      const { data: updateResult, error: updateError } = await supabase
        .rpc('update_quiz_submission_with_attempt_tracking', {
          p_submission_id: currentContentItem.submission.id,
          p_answers: allAnswers,
          p_results: results,
          p_score: finalScore,
          p_manual_grading_required: manualGradingRequired,
          p_manual_grading_completed: manualGradingCompleted,
          p_retry_reason: retryReason || null,
        })
        .single();

      if (updateError) {
        console.error("Failed to update submission with attempt tracking:", updateError);
        throw updateError;
      }

      // Get the full updated submission data
      const { data: updatedSubmission, error: fetchError } = await supabase
        .from('quiz_submissions')
        .select('*')
        .eq('id', (updateResult as any).submission_id)
        .single();
      
      if (fetchError) {
        console.error("Failed to fetch updated submission:", fetchError);
        throw fetchError;
      }
      
      newSubmission = updatedSubmission;
      console.log('✅ UPDATED SUBMISSION RESULT:', {
        id: updatedSubmission.id,
        score: updatedSubmission.score,
        manual_grading_required: updatedSubmission.manual_grading_required,
        manual_grading_completed: updatedSubmission.manual_grading_completed
      });
    } else {
      // For first attempts, create a new submission
      console.log('🔍 CREATING QUIZ SUBMISSION:', {
        manual_grading_required: manualGradingRequired,
        manual_grading_completed: manualGradingCompleted,
        score: finalScore
      });
      
      // Use the new function for proper attempt tracking
      const { data: submissionResult, error: createError } = await supabase
        .rpc('create_quiz_submission_with_attempt_tracking', {
          p_user_id: user.id,
          p_lesson_content_id: currentContentItem.id,
          p_lesson_id: currentLesson.id,
          p_course_id: course.id,
          p_answers: allAnswers,
          p_results: results,
          p_score: finalScore,
          p_manual_grading_required: manualGradingRequired,
          p_manual_grading_completed: manualGradingCompleted,
          p_retry_reason: retryReason || null,
        })
        .single();

      if (createError) {
        console.error("Failed to create submission with attempt tracking:", createError);
        throw createError;
      }

      // Get the full submission data
      const { data: createdSubmission, error: fetchError } = await supabase
        .from('quiz_submissions')
        .select('*')
        .eq('id', (submissionResult as any).submission_id)
        .single();

      if (fetchError) {
        console.error("Failed to fetch created submission:", fetchError);
        throw fetchError;
      }
      
      newSubmission = createdSubmission;
      console.log('✅ CREATED SUBMISSION RESULT:', {
        id: createdSubmission.id,
        score: createdSubmission.score,
        manual_grading_required: createdSubmission.manual_grading_required,
        manual_grading_completed: createdSubmission.manual_grading_completed
      });
    }
    
    // Save math answers to database
    // if (hasMathAnswers && newSubmission?.id) {
    //   for (const q of questions) {
    //     if (q.question_type === 'math_expression') {
    //       const userMathAnswer = mathAnswers[q.id];
    //       const expectedAnswer = q.math_expression;
    //       const tolerance = q.math_tolerance || 0.01;
          
    //       if (userMathAnswer && expectedAnswer) {
    //         const evaluation = evaluateMathExpression(userMathAnswer, expectedAnswer, tolerance);
    //         await MathQuizService.saveMathAnswer(
    //           newSubmission.id,
    //           q.id,
    //           userMathAnswer,
    //           evaluation.simplifiedAnswer,
    //           evaluation.isCorrect,
    //           evaluation.similarity
    //         );
    //       }
    //     }
    //   }
    // }
    
    // Log quiz submission (skip when offline)
    if (navigator.onLine) {
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
            submission_id: newSubmission?.id,
            score: finalScore,
            has_text_answers: hasTextAnswers,
            correct_answers: correctAnswers,
            total_questions: questions.length,
            attempt_number: newSubmission?.attempt_number || 1,
            is_retry: isRetry
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
    } else {
      console.log('🔴 CourseContent: Offline - skipping quiz submission logging');
    }
    
    setQuizResults(results);
    setIsQuizSubmitted(true);
    
    // Show appropriate message based on attempt type
    if (isRetry) {
      toast.success("Quiz retry submitted", { 
        description: `This was attempt #${newSubmission?.attempt_number || 1}` 
      });
    } else {
      toast.success("Quiz submitted successfully!");
    }
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
    
    console.log('✅ COURSE STATE UPDATE COMPLETED');
    await markContentAsComplete(currentContentItem.id, currentLesson.id, course.id);
    
    // Send notification to course teachers
    try {
      // Get course information
      const courseInfo = await CourseNotificationService.getCourseInfo(course.id);
      if (courseInfo) {
        // Get course teachers
        const teachers = await CourseNotificationService.getCourseTeachers(course.id);
        
        if (teachers.length > 0) {
          // Send notification to teachers
          await CourseNotificationService.notifyQuizSubmission({
            courseId: course.id,
            courseName: courseInfo.courseName,
            courseTitle: courseInfo.courseTitle,
            courseSubtitle: courseInfo.courseSubtitle,
            action: 'quiz_submitted',
            existingTeachers: teachers,
            quizTitle: currentContentItem?.title || 'Unknown Quiz',
            studentName: `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim() || 'Unknown Student',
            manualGradingRequired: hasTextAnswers,
            performedBy: {
              id: user.id,
              name: `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim() || 'Unknown Student',
              email: user.email || 'unknown@email.com'
            }
          });
        }
      }
    } catch (notificationError) {
      console.error('Error sending quiz submission notification:', notificationError);
      // Don't fail the submission if notification fails
    }
    
    if (hasTextAnswers) {
      const autoGradedCount = autoGradedQuestions.length;
      const textAnswerCount = questions.length - autoGradedCount;
      const autoGradedPoints = autoGradedQuestions.reduce((sum: number, q: any) => sum + (q.points || 1), 0);
      const earnedAutoGradedPoints = Math.round(((score || 0) / 100) * autoGradedPoints);
      
      if (autoGradedCount > 0) {
        toast.success(`Quiz submitted! Auto-graded: ${earnedAutoGradedPoints}/${autoGradedPoints} points (${(score || 0).toFixed(0)}%). ${textAnswerCount} question(s) require manual grading.`);
      } else {
        toast.success(`Quiz submitted! All ${textAnswerCount} question(s) require manual grading by your teacher.`);
      }
    } else {
      const totalPoints = questions.reduce((sum: number, q: any) => sum + (q.points || 1), 0);
      const earnedPoints = Math.round(((score || 0) / 100) * totalPoints);
      toast.success(`Quiz submitted! Your score: ${earnedPoints}/${totalPoints} points (${(score || 0).toFixed(0)}%)`);
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
        // Try to use the data layer first (handles online/offline automatically)
        let data: any = null;
        let error: any = null;
        
        try {
          const courseData = await dataLayer.getCourseData(actualCourseId, user?.id);
          
          
          if (courseData) {
             
            // Transform data layer format to existing format
            data = {
              id: courseData.id,
              title: courseData.title,
              subtitle: courseData.subtitle,
              description: courseData.description,
              image_url: courseData.image_url,
              instructor_name: courseData.instructor_name,
              sections: courseData.sections.map(section => ({
                id: section.id,
                title: section.title,
                description: section.description,
                order: section.order,
                lessons: section.lessons.map(lesson => ({
                  id: lesson.id,
                  title: lesson.title,
                  description: lesson.description,
                  content: lesson.content,
                  order: lesson.order,
                  duration: lesson.duration,
                  contentItems: lesson.contentItems.map(item => {
                    console.log(`🔧 CourseContent: Mapping content item ${item.id} (${item.title}):`, {
                      content_type: item.content_type,
                      hasSignedUrl: !!item.signedUrl,
                      signedUrl: item.signedUrl,
                      signedUrlPreview: item.signedUrl?.substring(0, 50)
                    });
                    
                    const mappedItem = {
                    id: item.id,
                    title: item.title,
                    content_type: item.content_type,
                    content_path: item.content_path,
                    signedUrl: item.signedUrl,
                    content: item.content,
                    order: item.order,
                    quiz: item.quiz || []
                    };
                    
                    // Debug: Verify the mapped item has signedUrl
                    if (item.content_type === 'video' || item.content_type === 'attachment' || item.content_type === 'lesson_plan') {
                      console.log(`🔧 CourseContent: Mapped item result for ${item.content_type} ${item.id}:`, {
                        hasSignedUrl: !!mappedItem.signedUrl,
                        signedUrl: mappedItem.signedUrl,
                        signedUrlPreview: mappedItem.signedUrl?.substring(0, 50)
                      });
                      
                      // CRITICAL DEBUG: Log what we're actually returning
                      console.log(`🔧 CourseContent: RETURNING MAPPED ITEM:`, JSON.stringify({
                        id: mappedItem.id,
                        title: mappedItem.title,
                        content_type: mappedItem.content_type,
                        signedUrl: mappedItem.signedUrl,
                        hasSignedUrl: !!mappedItem.signedUrl
                      }, null, 2));
                    }
                    
                    return mappedItem;
                  })
                }))
              }))
            };
             
            setIsOfflineMode(courseData.isOfflineAvailable && !navigator.onLine);
            
          } else {
            throw new Error('Course not found via data layer');
          }
        } catch (dataLayerError) {
          
          // Only fallback to Supabase if online AND we don't already have data
          if (navigator.onLine && !data) {
            const response = await supabase.from('courses').select(`*,sections:course_sections(*,lessons:course_lessons(*,contentItems:course_lesson_content(*,quiz:quiz_questions(*,points,math_expression,math_tolerance,math_hint,math_allow_drawing,image_url,options:question_options(*)))))`).eq('id', actualCourseId).single();
            data = response.data;
            error = response.error;
            setIsOfflineMode(false);
          } else if (!data) {
            // If offline and data layer failed, show appropriate error
            throw new Error('Course not available offline. Please download the course when online.');
          }
          // If we already have data from courseDataLayer, don't overwrite it
        }
        if (error) throw error;
        if (data) {
          for (const section of data.sections) {
            for (const lesson of section.lessons) {
              for (const item of lesson.contentItems) {
                if ((item.content_type === 'video' || item.content_type === 'attachment' || item.content_type === 'lesson_plan') && item.content_path) {
                  const { data: signedUrlData } = await supabase.storage.from('dil-lms').createSignedUrl(item.content_path, 3600);
                  item.signedUrl = signedUrlData?.signedUrl;
                }
              }
            }
          }
          let userProgress: any[] = [], quizSubmissions: any[] = [];
          if (user && navigator.onLine) {
            const contentItemIds = data.sections.flatMap((s: any) => s.lessons.flatMap((l: any) => l.contentItems.map((ci: any) => ci.id)));
            if (contentItemIds.length > 0) {
              const { data: progressData } = await supabase.from('user_content_item_progress').select('*').eq('user_id', user.id).in('lesson_content_id', contentItemIds);
              userProgress = progressData || [];
              const { data: submissionsData } = await supabase.from('quiz_submissions').select('*').eq('user_id', user.id).in('lesson_content_id', contentItemIds.filter((id: string) => data.sections.flatMap((s: any) => s.lessons.flatMap((l: any) => l.contentItems.filter((ci: any) => ci.content_type === 'quiz').map((ci: any) => ci.id))).includes(id)));
              
              // Fetch individual text answer grades for each submission
              if (submissionsData && submissionsData.length > 0) {
                for (const submission of submissionsData) {
                  const { data: gradesData } = await supabase.rpc('get_text_answer_grades_with_points', { submission_id: submission.id });
                  submission.text_answer_grades = gradesData || [];
                }
              }
              quizSubmissions = submissionsData || [];
            }
          } else if (!navigator.onLine) {
          }
           
          const transformedCourse = transformCourseData(data, userProgress, quizSubmissions);
           
           
          setCourse(transformedCourse);
          
          // Log course started if this is the first time accessing (skip when offline)
          if (transformedCourse && userProgress.length === 0 && navigator.onLine) {
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
            
            // Filter content items based on user role (hide lesson_plan from students)
            const filteredContentItems = allContentItems.filter((item: any) => {
              // Hide lesson_plan content from students (only visible to teachers and admins)
              if (item.content_type === 'lesson_plan') {
                const isStudent = profile?.role === 'student' || !profile?.role;
                if (isStudent) {
                  return false;
                }
              }
              return true;
            });
            
            const firstUncompleted = filteredContentItems.find((item: any) => !item.completed);
            const itemToStartWith = firstUncompleted || filteredContentItems[0];
             
             
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

  // Payment Access Control - Check if user has paid for paid courses
  useEffect(() => {
    const checkPaymentAccess = async () => {
      if (!actualCourseId || !user || !course) {
        setIsCheckingAccess(false);
        return;
      }

      // Skip payment check for admins, super_users, teachers, and content_creators
      if (profile?.role === 'admin' || profile?.role === 'super_user' || profile?.role === 'teacher' || profile?.role === 'content_creator') {
        console.log('🔓 [Access Control] Admin/Super User/Teacher/Content Creator access granted');
        setIsCheckingAccess(false);
        return;
      }

      try {
        console.log('🔒 [Access Control] Checking payment access for course:', actualCourseId);
        
        // Check if Stripe is enabled
        let { data: stripeData, error: stripeError } = await supabase
          .from('integrations')
          .select('status, is_configured')
          .eq('name', 'Stripe')
          .single();
        
        // If not found, try lowercase
        if (stripeError && stripeError.code === 'PGRST116') {
          const result = await supabase
            .from('integrations')
            .select('status, is_configured')
            .eq('name', 'stripe')
            .single();
          stripeData = result.data;
          stripeError = result.error;
        }
        
        const isStripeActive = !stripeError && stripeData && stripeData.status === 'enabled' && stripeData.is_configured;
        setIsStripeEnabled(isStripeActive);
        
        console.log('💳 [Access Control] Stripe enabled:', isStripeActive);
        
        // Fetch course payment details from database
        const { data: courseData, error: courseError } = await supabase
          .from('courses')
          .select('payment_type, course_price')
          .eq('id', actualCourseId)
          .single();
        
        if (courseError) {
          console.error('❌ [Access Control] Error fetching course payment info:', courseError);
          setIsCheckingAccess(false);
          return;
        }
        
        const isCoursePaid = isStripeActive && courseData.payment_type === 'paid' && courseData.course_price > 0;
        
        console.log('💰 [Access Control] Course payment info:', {
          payment_type: courseData.payment_type,
          course_price: courseData.course_price,
          isCoursePaid
        });
        
        // If course is paid, check if user has paid
        if (isCoursePaid) {
          console.log('🔍 [Access Control] Course is paid, verifying user payment...');
          const hasPaid = await StripeService.hasUserPaidForCourse(actualCourseId);
          
          console.log('💵 [Access Control] User payment status:', hasPaid);
          
          if (!hasPaid) {
            console.warn('⛔ [Access Control] User has not paid for this course. Redirecting to overview page.');
            toast.error('Payment Required', {
              description: 'Please purchase this course to access the content.'
            });
            navigate(`/dashboard/courses/${actualCourseId}`);
            return;
          }
          
          console.log('✅ [Access Control] Payment verified. Access granted.');
        } else {
          console.log('✅ [Access Control] Course is free. Access granted.');
        }
        
        setIsCheckingAccess(false);
      } catch (error) {
        console.error('❌ [Access Control] Error checking payment access:', error);
        setIsCheckingAccess(false);
      }
    };

    checkPaymentAccess();
  }, [actualCourseId, user, course, profile, navigate]);

  const handleLoadedMetadata = useCallback(() => {
    const videoNode = videoRef.current;
    if (videoNode && currentContentItem && currentContentItem.progressSeconds > 0 && videoNode.duration > currentContentItem.progressSeconds) {
      videoNode.currentTime = currentContentItem.progressSeconds;
    }
  }, [currentContentItem]);
  const currentIndex = useMemo(() => allContentItems.findIndex((item: any) => item.id === currentContentItemId), [allContentItems, currentContentItemId]);
  const nextContentItem = currentIndex !== -1 ? allContentItems[currentIndex + 1] : null;
  const prevContentItem = currentIndex !== -1 ? allContentItems[currentIndex - 1] : null;

  // Redirect to first available content if current item is quiz/assignment/lesson_plan and we go offline
  // Also redirect if current item is lesson_plan and user is a student
  // Also redirect if currentContentItem is null (filtered out content)
  useEffect(() => {
    console.log('🔄 CourseContent: Redirect check', {
      isOfflineMode,
      currentContentItem: currentContentItem ? {
        id: currentContentItem.id,
        title: currentContentItem.title,
        content_type: currentContentItem.content_type
      } : null,
      currentContentItemId,
      allContentItemsCount: allContentItems.length,
      userRole: profile?.role
    });
    
    const shouldRedirect = (isOfflineMode && currentContentItem && 
        (currentContentItem.content_type === 'quiz' || 
         currentContentItem.content_type === 'assignment' || 
         currentContentItem.content_type === 'lesson_plan')) ||
        (currentContentItem && currentContentItem.content_type === 'lesson_plan' && (profile?.role === 'student' || !profile?.role)) ||
        (!currentContentItem && currentContentItemId && allContentItems.length > 0); // Redirect if current item was filtered out
    
    console.log('🔄 CourseContent: Should redirect?', shouldRedirect);
    
    if (shouldRedirect) {
      // Find the first available content item
      const firstAvailableItem = allContentItems.find((item: any) => 
        item.content_type !== 'quiz' && 
        item.content_type !== 'assignment' && 
        item.content_type !== 'lesson_plan'
      );
      
      console.log('🔄 CourseContent: First available item', firstAvailableItem);
      
      if (firstAvailableItem) {
        console.log('📴 Redirecting from filtered/hidden content to first available content:', firstAvailableItem.title);
        setCurrentContentItemId(firstAvailableItem.id);
      } else {
        console.log('❌ No available content found for redirect');
      }
    }
  }, [isOfflineMode, currentContentItem, allContentItems, profile?.role, currentContentItemId]);

  // Monitor online/offline status changes and check course availability
  useEffect(() => {
    const handleOnlineStatusChange = async () => {
      const isCurrentlyOnline = navigator.onLine;
      console.log('🌐 Network status changed:', isCurrentlyOnline ? 'Online' : 'Offline');
      
      if (!isCurrentlyOnline && actualCourseId) {
        // User went offline, check if current course is available offline
        try {
          const isCourseAvailableOffline = await dataLayer.isCourseAvailableOffline(actualCourseId);
          console.log('📦 Course offline availability:', isCourseAvailableOffline);
          
          if (isCourseAvailableOffline) {
            // Course is available offline, switch to offline mode
            setIsOfflineMode(true);
            toast.info('You\'re now offline. Viewing downloaded course content.');
          } else {
            // Course is NOT available offline, redirect to offline learning page
            console.log('⚠️ Course not available offline, redirecting...');
            toast.error('This course is not available offline. Redirecting to offline learning.');
            navigate('/dashboard/offline-learning');
          }
        } catch (error) {
          console.error('Error checking course offline availability:', error);
          // If we can't check, assume it's not available and redirect
          toast.error('This course is not available offline.');
          navigate('/dashboard/offline-learning');
        }
      } else if (isCurrentlyOnline && isOfflineMode) {
        // User came back online, switch to online mode
        setIsOfflineMode(false);
        toast.success('Connection restored! You\'re back online.');
        // Optionally reload the course to get fresh data
        // fetchCourseData();
      }
    };

    window.addEventListener('online', handleOnlineStatusChange);
    window.addEventListener('offline', handleOnlineStatusChange);

    return () => {
      window.removeEventListener('online', handleOnlineStatusChange);
      window.removeEventListener('offline', handleOnlineStatusChange);
    };
  }, [actualCourseId, dataLayer, isOfflineMode, navigate]);

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

  // Handle drag end for content item reordering
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    // Only allow reordering if user has permission and course is in draft mode
    if (!canReorderContent) {
      if (course?.status === 'Published') {
        toast.error('Content reordering is disabled for published courses. Please unpublish the course to make changes.');
      } else {
        toast.error('You do not have permission to reorder content items');
      }
      return;
    }

    if (!currentLesson) return;

    const oldIndex = currentLesson.contentItems.findIndex((item: any) => item.id === active.id);
    const newIndex = currentLesson.contentItems.findIndex((item: any) => item.id === over.id);

    if (oldIndex === -1 || newIndex === -1) return;

    // Update local state immediately for better UX
    const newContentItems = arrayMove(currentLesson.contentItems, oldIndex, newIndex);
    
    setCourse((prevCourse: any) => {
      if (!prevCourse) return null;
      
      return {
        ...prevCourse,
        modules: prevCourse.modules.map((module: any) => ({
          ...module,
          lessons: module.lessons.map((lesson: any) => 
            lesson.id === currentLesson.id 
              ? { ...lesson, contentItems: newContentItems }
              : lesson
          )
        }))
      };
    });

    // Update positions in database
    try {
      const updates = newContentItems.map((item: any, index: number) => ({
        id: item.id,
        position: index + 1
      }));

      for (const update of updates) {
        const { error } = await supabase
          .from('course_lesson_content')
          .update({ position: update.position })
          .eq('id', update.id);

        if (error) {
          console.error('Error updating content item position:', error);
          toast.error('Failed to save new order');
          return;
        }
      }

      toast.success('Content order updated successfully');
    } catch (error) {
      console.error('Error updating content positions:', error);
      toast.error('Failed to save new order');
    }
  };
  
  const handleContentItemClick = (itemId: string) => {
      handleNavigation(allContentItems.find(item => item.id === itemId));
      setIsSheetOpen(false);
  }

  const renderContent = () => {
    if (!currentContentItem) return null;
    
    // Hide quiz, assignment, and lesson_plan content when offline
    if (isOfflineMode && (currentContentItem.content_type === 'quiz' || currentContentItem.content_type === 'assignment' || currentContentItem.content_type === 'lesson_plan')) {
      return (
        <div className="flex items-center justify-center min-h-[400px]">
          <Card className="bg-gradient-to-br from-card to-card/50 dark:bg-card border border-gray-200/50 dark:border-gray-700/50 rounded-3xl shadow-lg max-w-md">
            <CardContent className="pt-4 sm:pt-6 px-3 sm:px-6 pb-4 sm:pb-6">
              <div className="text-center space-y-3 sm:space-y-4">
                <div className="w-12 h-12 sm:w-16 sm:h-16 mx-auto bg-muted rounded-full flex items-center justify-center">
                  <WifiOff className="w-6 h-6 sm:w-8 sm:h-8 text-muted-foreground" />
                </div>
                <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-gray-100">
                  No offline content available
                </h3>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }
    
    // AUTOMATIC FIX: If it's a video, attachment, or lesson_plan without signedUrl and we're offline, load it directly
    if ((currentContentItem.content_type === 'video' || currentContentItem.content_type === 'attachment' || currentContentItem.content_type === 'lesson_plan') && !currentContentItem.signedUrl && isOfflineMode) {
      
      // Load content directly from IndexedDB
      const loadContentDirectly = async () => {
        try {
          const offlineDbModule = await import('../services/offlineDatabase');
          const dbUtils = offlineDbModule.getOfflineDatabase();
          
          if (currentContentItem.content_type === 'video') {
            const courseVideos = await dbUtils.getVideosByCourse(actualCourseId);
            
            if (courseVideos.length > 0) {
              const video = courseVideos[0];
              const blobUrl = URL.createObjectURL(video.blob);
              
              // Set the signedUrl directly on the currentContentItem
              currentContentItem.signedUrl = blobUrl;
              
              // Force a re-render by updating the state
              setCourse(prevCourse => ({ ...prevCourse }));
            }
          } else if (currentContentItem.content_type === 'attachment' || currentContentItem.content_type === 'lesson_plan') {
            // Get all assets for the current course
            const courseAssets = await dbUtils.getAssetsByCourse(actualCourseId);
            
            if (courseAssets.length > 0) {
              // Try to find the specific asset by ID first, then use first available
              let asset = courseAssets.find(a => a.id === currentContentItem.id);
              if (!asset) {
                asset = courseAssets[0]; // Use first asset as fallback
              }
              
              
              
              // Ensure correct MIME type for the blob
              let blobToUse = asset.blob;
              
              // Get filename from multiple sources
              const filename = asset.filename || currentContentItem.content_path?.split('/').pop() || currentContentItem.title || '';
              
              // Always check and correct MIME type, especially for incorrect ones like 'text/html'
              if (!asset.blob.type || 
                  asset.blob.type === 'application/octet-stream' || 
                  asset.blob.type === 'text/html' ||
                  asset.blob.type.startsWith('text/') && filename.toLowerCase().includes('pdf')) {
                
                let mimeType = 'application/octet-stream';
                
                // Check filename extension
                if (filename.toLowerCase().endsWith('.pdf') || filename.toLowerCase().includes('.pdf')) {
                  mimeType = 'application/pdf';
                } else if (filename.toLowerCase().endsWith('.doc') || filename.toLowerCase().endsWith('.docx')) {
                  mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
                } else if (filename.toLowerCase().endsWith('.jpg') || filename.toLowerCase().endsWith('.jpeg')) {
                  mimeType = 'image/jpeg';
                } else if (filename.toLowerCase().endsWith('.png')) {
                  mimeType = 'image/png';
                } else if (filename.toLowerCase().endsWith('.txt')) {
                  mimeType = 'text/plain';
                } else {
                  // If no extension, try to detect from content_path or assume PDF for common cases
                  const contentPath = currentContentItem.content_path || '';
                  if (contentPath.toLowerCase().includes('.pdf') || contentPath.toLowerCase().includes('pdf')) {
                    mimeType = 'application/pdf';
                  } else if (contentPath.toLowerCase().includes('task') || contentPath.toLowerCase().includes('lesson')) {
                    // Common pattern: lesson tasks are usually PDFs
                    mimeType = 'application/pdf';
                  }
                }
                
                blobToUse = new Blob([asset.blob], { type: mimeType });
              }
              
              const blobUrl = URL.createObjectURL(blobToUse);
              
              // Set the signedUrl directly on the currentContentItem
              currentContentItem.signedUrl = blobUrl;
              
              // Force a re-render by updating the state
              setCourse(prevCourse => ({ ...prevCourse }));
            }
          }
        } catch (error) {
          console.error(`AUTO-FIX failed:`, error);
        }
      };
      
      loadContentDirectly();
    }
    
    switch (currentContentItem.content_type) {
      case 'video':
        return (
          <div className="space-y-6">
            {currentContentItem.signedUrl ? (
              <div className="relative aspect-video bg-black rounded-3xl overflow-hidden shadow-2xl">
                 <video 
                   ref={videoRef} 
                   controls 
                   className="w-full h-full" 
                   key={currentContentItem.id} 
                   src={currentContentItem.signedUrl} 
                   onTimeUpdate={handleTimeUpdate} 
                   onLoadedMetadata={handleLoadedMetadata}
                   onError={(e) => {
                     console.error('🎥 Video playback error:', e);
                     console.error('🎥 Video src:', currentContentItem.signedUrl);
                     console.error('🎥 Video element:', e.target);
                   }}
                   preload="metadata"
                 >
                   <p className="text-white p-4">
                     Your browser does not support the video tag or the video format.
                     <br />
                     <a href={currentContentItem.signedUrl} target="_blank" rel="noopener noreferrer" className="text-blue-400 underline">
                       Try opening the video directly
                     </a>
                   </p>
                 </video>
              </div>
            ) : (
              <div className="relative aspect-video bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 rounded-3xl overflow-hidden shadow-xl">
                <div className="text-center p-4">
                  <PlayCircle className="w-12 h-12 sm:w-16 sm:h-16 text-muted-foreground mx-auto mb-3 sm:mb-4" />
                  <p className="text-muted-foreground text-base sm:text-lg font-medium">
                    No video content available
                    {isOfflineMode && (
                      <span className="block text-sm mt-2 text-red-500">
                        DEBUG: Offline mode - signedUrl missing for item {currentContentItem.id}
                      </span>
                    )}
                  </p>
                  
                  
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
            {(profile?.role === 'admin' || profile?.role === 'super_user' || profile?.role === 'teacher' || profile?.role === 'content_creator' || profile?.role === 'view_only') ? (
              <Card className="bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-900/20 dark:to-blue-800/20 border border-blue-200 dark:border-blue-800 rounded-2xl">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-3">
                    <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                        Preview Mode
                      </p>
                      <p className="text-sm text-blue-700 dark:text-blue-300">
                        Assignments can only be submitted by students. As {(profile?.role === 'admin' || profile?.role === 'super_user') ? 'an admin' : (profile?.role === 'content_creator') ? 'a content creator' : profile?.role === 'view_only' ? 'a viewer' : 'a teacher'}, you are viewing this in preview mode.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="text-center">
                <Button onClick={() => navigate('/dashboard/assignments')} className="bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary shadow-lg hover:shadow-xl transition-all duration-300">
                  Go to Assignments
                </Button>
              </div>
            )}
          </div>
        );
      case 'quiz':
        const questions = currentContentItem.quiz || [];
        const hasSubmitted = isQuizSubmitted || !!(currentContentItem.submission && currentContentItem.submission.id && currentContentItem.submission.score !== undefined);
        console.log('🔍 HASSUBMITTED DEBUG:', {
          isQuizSubmitted,
          hasSubmission: !!currentContentItem.submission,
          hasSubmissionId: !!(currentContentItem.submission && currentContentItem.submission.id),
          hasScore: currentContentItem.submission?.score !== undefined,
          submissionScore: currentContentItem.submission?.score,
          finalHasSubmitted: hasSubmitted
        });
        return (
          <Card className="bg-gradient-to-br from-card to-card/50 dark:bg-card border border-gray-200/50 dark:border-gray-700/50 rounded-2xl sm:rounded-3xl shadow-lg">
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="text-base sm:text-lg text-gray-900 dark:text-gray-100">Knowledge Check</CardTitle>
              {currentContentItem.due_date && (
                <div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm text-yellow-600 dark:text-yellow-400">
                  <Calendar className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
                  <span className="font-medium">Due:</span>
                  <span className="truncate">{new Date(currentContentItem.due_date).toLocaleString()}</span>
                </div>
              )}
            </CardHeader>
            <CardContent className="space-y-4 sm:space-y-6 p-4 sm:p-6 pt-0">
              {questions.map((q: any, index: number) => {
                const correctOptions = q.options.filter((opt: any) => opt.is_correct);
                const questionType = q.question_type || 'single_choice'; // Default for backward compatibility
                const userAnswer = userAnswers[q.id];
                const textAnswer = textAnswers[q.id];
                const mathAnswer = mathAnswers[q.id];
                const isMultipleChoice = questionType === 'multiple_choice';
                const isTextAnswer = questionType === 'text_answer';
                const isMathExpression = questionType === 'math_expression';
                
                return (
                  <div key={q.id} className="space-y-3 sm:space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 min-w-0 flex-1">
                        <h4 className="font-medium text-sm sm:text-base text-gray-900 dark:text-gray-100 break-words">{index + 1}. {q.question_text}</h4>
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge 
                            variant={isMultipleChoice ? 'default' : isTextAnswer ? 'outline' : isMathExpression ? 'secondary' : 'secondary'}
                            className={`text-[10px] sm:text-xs whitespace-nowrap ${
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
                          {/* Quiz Question Image */}
                          {q.image_url && (
                            <QuizQuestionImage 
                              imageUrl={q.image_url}
                              onClick={() => openImageModal(q.image_url)}
                            />
                          )}
                        </div>
                      </div>
                      {/* Points Badge - Right Corner */}
                      <Badge 
                        variant="outline"
                        className="text-[10px] sm:text-xs bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300 border-yellow-200 dark:border-yellow-700 font-semibold whitespace-nowrap self-start sm:self-auto"
                      >
                        {q.points || 1} {q.points === 1 ? 'point' : 'points'}
                      </Badge>
                    </div>
                    
                    {isMathExpression ? (
                      <>
                        <MathExpressionInput
                          questionId={q.id}
                          value={mathAnswer || ''}
                          onChange={(value) => {
                            setMathAnswers(prev => ({ ...prev, [q.id]: value }));
                            // Also update the drawing data to include the new text input
                            const currentDrawingData = mathDrawings[q.id];
                            if (currentDrawingData && currentDrawingData.trim() !== '') {
                              try {
                                const parsedDrawingData = JSON.parse(currentDrawingData);
                                const combinedData = {
                                  ...parsedDrawingData,
                                  mathExpression: value
                                };
                                setMathDrawings(prev => ({ ...prev, [q.id]: JSON.stringify(combinedData) }));
                              } catch (error) {
                                console.error('Error updating drawing data with text input:', error);
                              }
                            }
                          }}
                          disabled={hasSubmitted}
                          showValidation={!hasSubmitted}
                          expectedAnswer={q.math_expression}
                          tolerance={q.math_tolerance}
                          hint={q.math_hint}
                          allowDrawing={q.math_allow_drawing === true}
                          drawingData={mathDrawings[q.id] || ''}
                          onDrawingChange={(drawingData) => handleDrawingChange(q.id, drawingData)}
                        />
                        
                        {/* Math Expression Review Section - Show after submission */}
                        {hasSubmitted && (
                          <div className="space-y-3 sm:space-y-4 mt-3 sm:mt-4">
                            <div className="p-3 sm:p-4 bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-900/20 dark:to-blue-800/10 border-2 border-blue-200 dark:border-blue-700/50 rounded-lg sm:rounded-xl shadow-sm">
                              <h4 className="font-semibold text-sm sm:text-base text-blue-900 dark:text-blue-100 mb-2 sm:mb-3 flex items-center gap-2">
                                <div className="w-3 h-3 sm:w-4 sm:h-4 text-blue-600 dark:text-blue-400">📝</div>
                                Your Answer:
                              </h4>
                              <div className="p-2.5 sm:p-3 bg-white/60 dark:bg-gray-800/60 rounded-lg border border-blue-200/50 dark:border-blue-700/30">
                                <p className="text-gray-900 dark:text-gray-100 font-mono text-sm sm:text-base md:text-lg leading-relaxed break-words">
                                  {(() => {
                                    console.log('🔍 Displaying math answer for question', q.id, ':', mathAnswer);
                                    return mathAnswer || (
                                      <span className="text-gray-500 dark:text-gray-400 italic">No answer provided</span>
                                    );
                                  })()}
                                </p>
                              </div>
                            </div>
                            
                            {q.math_expression && (
                              <div className="p-3 sm:p-4 bg-gradient-to-br from-green-50 to-green-100/50 dark:from-green-900/20 dark:to-green-800/10 border-2 border-green-200 dark:border-green-700/50 rounded-lg sm:rounded-xl shadow-sm">
                                <h4 className="font-semibold text-sm sm:text-base text-green-900 dark:text-green-100 mb-2 sm:mb-3 flex items-center gap-2">
                                  <div className="w-3 h-3 sm:w-4 sm:h-4 text-green-600 dark:text-green-400">✅</div>
                                  Correct Answer:
                                </h4>
                                <div className="p-2.5 sm:p-3 bg-white/60 dark:bg-gray-800/60 rounded-lg border border-green-200/50 dark:border-green-700/30">
                                  <p className="text-gray-900 dark:text-gray-100 font-mono text-sm sm:text-base md:text-lg leading-relaxed break-words">
                                    {q.math_expression}
                                  </p>
                                </div>
                              </div>
                            )}
                            
                            {/* Show if answer was correct or incorrect - only for non-drawing answers */}
                            {currentContentItem.submission?.results && currentContentItem.submission.results[q.id] !== undefined && !mathDrawings[q.id] && (
                              <div className={`p-3 sm:p-4 rounded-lg sm:rounded-xl shadow-sm border-2 ${
                                currentContentItem.submission.results[q.id] 
                                  ? 'bg-gradient-to-br from-green-50 to-green-100/50 dark:from-green-900/20 dark:to-green-800/10 border-green-200 dark:border-green-700/50'
                                  : 'bg-gradient-to-br from-red-50 to-red-100/50 dark:from-red-900/20 dark:to-red-800/10 border-red-200 dark:border-red-700/50'
                              }`}>
                                <div className={`flex items-center gap-2 text-sm sm:text-base font-semibold ${
                                  currentContentItem.submission.results[q.id] 
                                    ? 'text-green-900 dark:text-green-100'
                                    : 'text-red-900 dark:text-red-100'
                                }`}>
                                  <div className={`w-3 h-3 sm:w-4 sm:h-4 ${
                                    currentContentItem.submission.results[q.id] 
                                      ? 'text-green-600 dark:text-green-400'
                                      : 'text-red-600 dark:text-red-400'
                                  }`}>
                                    {currentContentItem.submission.results[q.id] ? '✅' : '❌'}
                                  </div>
                                  {currentContentItem.submission.results[q.id] ? 'Correct!' : 'Incorrect'}
                                </div>
                                {q.math_tolerance && !mathDrawings[q.id] && (
                                  <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-2">
                                    <span className="font-medium">Tolerance used:</span> {q.math_tolerance}
                                  </div>
                                )}
                              </div>
                            )}
                            
                            {/* Show manual grading status for drawing answers */}
                            {mathDrawings[q.id] && (
                              <div className="p-3 sm:p-4 rounded-lg sm:rounded-xl shadow-sm border-2 bg-gradient-to-br from-orange-50 to-orange-100/50 dark:from-orange-900/20 dark:to-orange-800/10 border-orange-200 dark:border-orange-700/50">
                                <div className="flex items-center gap-2 text-sm sm:text-base font-semibold text-orange-900 dark:text-orange-100">
                                  <div className="w-3 h-3 sm:w-4 sm:h-4 text-orange-600 dark:text-orange-400">📝</div>
                                  {currentContentItem.submission?.manual_grading_completed ? 'Graded by Teacher' : 'Pending Manual Grading'}
                                </div>
                                {currentContentItem.submission?.manual_grading_completed && currentContentItem.submission?.manual_grading_score !== null && (
                                  <div className="text-xs sm:text-sm text-orange-700 dark:text-orange-300 mt-2">
                                    <span className="font-medium">Your Grade:</span> {currentContentItem.submission.manual_grading_score}%
                                    {(() => {
                                      const earnedPoints = Math.round((currentContentItem.submission.manual_grading_score / 100) * (q.points || 1));
                                      return (
                                        <span className="block">
                                          ({earnedPoints} out of {q.points || 1} points)
                                        </span>
                                      );
                                    })()}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </>
                    ) : isTextAnswer ? (
                      <div className="space-y-2 sm:space-y-3">
                        <Textarea
                          value={textAnswer || ''}
                          onChange={(e) => setTextAnswers(prev => ({ ...prev, [q.id]: e.target.value }))}
                          placeholder="Type your answer here..."
                          className="min-h-[100px] sm:min-h-[120px] text-sm sm:text-base border-2 border-gray-200 dark:border-gray-700 focus:border-orange-500 focus:ring-orange-500/20"
                          disabled={hasSubmitted}
                        />
                        {hasSubmitted && !currentContentItem.submission?.manual_grading_completed && (
                          <div className="p-2.5 sm:p-3 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-700 rounded-lg">
                            <div className="flex items-start sm:items-center gap-2 text-orange-700 dark:text-orange-300">
                              <div className="w-2 h-2 bg-orange-500 rounded-full flex-shrink-0 mt-1 sm:mt-0"></div>
                              <span className="text-xs sm:text-sm font-medium">This answer requires manual grading by your teacher</span>
                            </div>
                          </div>
                        )}
                        {hasSubmitted && currentContentItem.submission?.manual_grading_completed && (
                          <div className="space-y-2 sm:space-y-3">
                            <div className="p-2.5 sm:p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg">
                              <div className="flex items-start sm:items-center gap-2 text-green-700 dark:text-green-300">
                                <div className="w-2 h-2 bg-green-500 rounded-full flex-shrink-0 mt-1 sm:mt-0"></div>
                                <span className="text-xs sm:text-sm font-medium">✓ This answer has been graded by your teacher</span>
                              </div>
                            </div>
                            
                            {/* Show individual grade and feedback if available */}
                            {currentContentItem.submission?.text_answer_grades && 
                             currentContentItem.submission.text_answer_grades.length > 0 &&
                             currentContentItem.submission.text_answer_grades.find((grade: any) => grade.question_id === q.id) && (
                              <div className="p-3 sm:p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg">
                                <div className="space-y-2">
                                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                                    <span className="text-xs sm:text-sm font-medium text-blue-700 dark:text-blue-300">Your Grade for the above question</span>
                                    <div className="text-left sm:text-right">
                                      <div className="text-base sm:text-lg font-bold text-blue-700 dark:text-blue-300">
                                        {currentContentItem.submission.text_answer_grades.find((grade: any) => grade.question_id === q.id)?.earned_points || 0} / {q.points || 1} points
                                      </div>
                                      <div className="text-xs sm:text-sm text-blue-600 dark:text-blue-400">
                                        ({currentContentItem.submission.text_answer_grades.find((grade: any) => grade.question_id === q.id)?.grade || 0}%)
                                      </div>
                                    </div>
                                  </div>
                                  {currentContentItem.submission.text_answer_grades.find((grade: any) => grade.question_id === q.id)?.feedback && 
                                   currentContentItem.submission.text_answer_grades.find((grade: any) => grade.question_id === q.id)?.feedback.trim() && (
                                    <div className="mt-2 sm:mt-3 p-2.5 sm:p-3 bg-white dark:bg-gray-800 border border-blue-200 dark:border-blue-600 rounded-md">
                                      <div className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Teacher's Feedback:</div>
                                      <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 break-words">
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
                      <div className="space-y-2 sm:space-y-3">
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
                                "w-full justify-start p-3 sm:p-4 h-auto text-left transition-all duration-300 hover:shadow-md", 
                                // Override default button hover to prevent color conflicts
                                "hover:bg-gray-50 hover:text-gray-900 hover:border-gray-300 dark:hover:bg-gray-800/50 dark:hover:text-gray-100 dark:hover:border-gray-600",
                                isSelected && (isMultipleChoice ? "border-purple-300 bg-purple-50 dark:bg-purple-900/20 dark:border-purple-600 hover:bg-purple-100 hover:border-purple-400 dark:hover:bg-purple-900/30 dark:hover:border-purple-500" : "border-blue-300 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-600 hover:bg-blue-100 hover:border-blue-400 dark:hover:bg-blue-900/30 dark:hover:border-blue-500"), 
                                showAsCorrect && "bg-green-100 border-green-500 dark:bg-green-900/20 dark:border-green-400 hover:bg-green-200 hover:border-green-600 dark:hover:bg-green-900/30 dark:hover:border-green-300", 
                                showAsIncorrect && "bg-red-100 border-red-500 dark:bg-red-900/20 dark:border-red-400 hover:bg-red-200 hover:border-red-600 dark:hover:bg-red-900/30 dark:hover:border-red-300"
                              )}
                            >
                              <div className="flex items-center gap-2 sm:gap-3 w-full min-w-0">
                                {isMultipleChoice ? (
                                  // Checkbox for multiple choice
                                  <div className={`w-4 h-4 sm:w-5 sm:h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                                    isSelected 
                                      ? 'bg-purple-600 border-purple-600'
                                      : 'border-gray-300 dark:border-gray-600'
                                  }`}>
                                    {isSelected && (
                                      <svg className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                      </svg>
                                    )}
                                  </div>
                                ) : (
                                  // Radio button for single choice
                                  <div className={`w-4 h-4 sm:w-5 sm:h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                                    isSelected 
                                      ? 'bg-blue-600 border-blue-600'
                                      : 'border-gray-300 dark:border-gray-600'
                                  }`}>
                                    {isSelected && (
                                      <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-white dark:bg-gray-900" />
                                    )}
                                  </div>
                                )}
                                <span className="flex-1 text-sm sm:text-base text-gray-900 dark:text-gray-100 break-words min-w-0">{option.option_text}</span>
                                {hasSubmitted && option.is_correct && (
                                  <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-green-600 dark:text-green-400 flex-shrink-0" />
                                )}
                                {hasSubmitted && showAsIncorrect && (
                                  <XCircle className="w-4 h-4 sm:w-5 sm:h-5 text-red-600 dark:text-red-400 flex-shrink-0" />
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
                (profile?.role === 'admin' || profile?.role === 'super_user' || profile?.role === 'teacher' || profile?.role === 'content_creator' || profile?.role === 'view_only') ? (
                  <Card className="bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-900/20 dark:to-blue-800/20 border border-blue-200 dark:border-blue-800 rounded-xl sm:rounded-2xl">
                    <CardContent className="pt-4 sm:pt-6 px-3 sm:px-6 pb-3 sm:pb-6">
                      <div className="flex items-start gap-2 sm:gap-3">
                        <Info className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                        <div className="space-y-1 min-w-0">
                          <p className="text-xs sm:text-sm font-medium text-blue-900 dark:text-blue-100">
                            Preview Mode
                          </p>
                          <p className="text-xs sm:text-sm text-blue-700 dark:text-blue-300">
                            Quizzes can only be submitted by students. As {(profile?.role === 'admin' || profile?.role === 'super_user') ? 'an admin' : (profile?.role === 'content_creator') ? 'a content creator' : profile?.role === 'view_only' ? 'a viewer' : 'a teacher'}, you are viewing this in preview mode.
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <Button 
                    onClick={() => handleQuizSubmit()} 
                    disabled={questions.length === 0 || questions.some((q: any) => {
                      const userAnswer = userAnswers[q.id];
                      const textAnswer = textAnswers[q.id];
                      const mathAnswer = mathAnswers[q.id];
                      const questionType = q.question_type || 'single_choice';
                      
                      if (questionType === 'text_answer') {
                        // For text answer, the answer must not be empty
                        return !textAnswer || textAnswer.trim() === '';
                      } else if (questionType === 'math_expression') {
                        // For math expression, temporarily allow empty answers
                        return false; // Always allow submission for now
                      } else if (questionType === 'multiple_choice') {
                        // For multiple choice, at least one option must be selected
                        return !Array.isArray(userAnswer) || userAnswer.length === 0;
                      } else {
                        // For single choice, exactly one option must be selected
                        return !userAnswer || userAnswer === '';
                      }
                    })} 
                    className="w-full sm:w-auto h-10 sm:h-11 text-sm sm:text-base bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary shadow-lg hover:shadow-xl transition-all duration-300"
                  >
                    Submit Quiz
                  </Button>
                )
              )}
              {hasSubmitted && currentContentItem.submission && (
                 <div className="p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-gradient-to-br from-primary/10 to-primary/20 border border-primary/30 dark:border-primary/20 shadow-lg">
                   <h4 className="font-semibold text-sm sm:text-base text-gray-900 dark:text-gray-100">Quiz Submitted</h4>
                   <p className="text-muted-foreground text-xs sm:text-sm mt-1">
                     {currentContentItem.submission && 
                      (currentContentItem.submission.score !== null || 
                       (currentContentItem.submission.manual_grading_completed && currentContentItem.submission.manual_grading_score !== null)) ? (
                       <span>
                         You scored <span className="font-semibold text-primary">{((currentContentItem.submission.manual_grading_score ?? currentContentItem.submission.score) || 0).toFixed(0)}%</span>.
                         {(() => {
                           // Calculate total points for display
                           const totalQuestions = questions.length;
                           const totalPoints = questions.reduce((sum: number, q: any) => sum + (q.points || 1), 0);
                           const earnedPoints = Math.round((((currentContentItem.submission.manual_grading_score ?? currentContentItem.submission.score) || 0) / 100) * totalPoints);
                           return (
                             <span className="block mt-1 text-[10px] sm:text-xs">
                               ({earnedPoints} out of {totalPoints} total points)
                             </span>
                           );
                         })()}
                       </span>
                     ) : (
                       'Your score will be available after manual grading by your teacher.'
                     )}
                   </p>
                 </div>
              )}
              
              {/* Quiz Retry Interface - Only show when quiz is actually submitted with a score */}
              {hasSubmitted && user && currentContentItem.submission?.score !== undefined && (
                <>
                  {(() => {
                    const scoreToPass = currentContentItem.submission?.score ?? currentContentItem.submission?.manual_grading_score;
                    console.log('🎯 QUIZRETRYINTERFACE PROPS:', {
                      userId: user.id,
                      lessonContentId: currentContentItem.id,
                      currentScore: scoreToPass,
                      submission: currentContentItem.submission,
                      hasSubmission: !!currentContentItem.submission,
                      submissionScore: currentContentItem.submission?.score,
                      manualGradingScore: currentContentItem.submission?.manual_grading_score,
                      manualGradingRequired: currentContentItem.submission?.manual_grading_required,
                      manualGradingCompleted: currentContentItem.submission?.manual_grading_completed
                    });
                    return null;
                  })()}
                  <QuizRetryInterface
                    key={`${currentContentItem.id}-${currentContentItem.submission?.id || 'no-submission'}`}
                    userId={user.id}
                    lessonContentId={currentContentItem.id}
                    currentScore={currentContentItem.submission?.score ?? currentContentItem.submission?.manual_grading_score}
                    onRetryRequested={(reason) => {
                      console.log('🔄 RETRY QUIZ REQUESTED:', reason);
                      // Reset quiz state to allow user to answer again
                      setIsQuizSubmitted(false);
                      setUserAnswers({});
                      setTextAnswers({});
                      setMathAnswers({});
                      setMathDrawings({});
                      setQuizResults({});
                      
                      // Clear the submission from the current content item to make hasSubmitted false
                      // But keep the submission ID for retry detection
                      const submissionId = currentContentItem.submission?.id;
                      setCourse((prevCourse: any) => {
                        if (!prevCourse) return null;
                        const updatedModules = prevCourse.modules.map((module: any) => ({
                          ...module,
                          lessons: module.lessons.map((lesson: any) => ({
                            ...lesson,
                            contentItems: lesson.contentItems.map((item: any) => 
                              item.id === currentContentItem.id ? { 
                                ...item, 
                                submission: submissionId ? { id: submissionId } : null 
                              } : item
                            ),
                          })),
                        }));
                        return { ...prevCourse, modules: updatedModules };
                      });
                      
                      console.log('✅ QUIZ STATE RESET FOR RETRY');
                      console.log('🔍 AFTER RETRY RESET - CHECKING STATE:', {
                        isQuizSubmitted,
                        submissionId,
                        currentContentItemSubmission: currentContentItem.submission,
                        hasSubmission: !!currentContentItem.submission,
                        hasScore: currentContentItem.submission?.score !== undefined
                      });
                    }}
                    onRetryApproved={() => {
                      // Refresh the quiz data when retry is approved
                      window.location.reload();
                    }}
                  />
                </>
              )}
            </CardContent>
          </Card>
        );
      case 'lesson_plan':
        const handleLessonPlanInteraction = () => { 
          if (currentContentItem && !currentContentItem.completed && currentLesson) 
            markContentAsComplete(currentContentItem.id, currentLesson.id, actualCourseId); 
        };
        return (
          <Card className="bg-gradient-to-br from-card to-card/50 dark:bg-card border border-gray-200/50 dark:border-gray-700/50 rounded-3xl shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-gray-100">
                <ClipboardList className="w-5 h-5 text-indigo-600" />
                Lesson Plan
              </CardTitle>
            </CardHeader>
            <CardContent>
              {currentContentItem.signedUrl ? (
                <div className="flex items-center justify-between gap-4 p-4 border border-gray-200/50 dark:border-gray-600/50 rounded-2xl bg-gradient-to-br from-indigo-50 to-indigo-100/50 dark:from-indigo-900/20 dark:to-indigo-800/20">
                  <div className="flex items-center gap-3">
                    <FileText className="w-6 h-6 text-indigo-600" />
                    <span className="font-medium text-gray-900 dark:text-gray-100">
                      {currentContentItem.content_path?.split('/').pop() || 'Lesson Plan Document'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button asChild variant="outline" className="hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-300 transition-all duration-300">
                      <a href={currentContentItem.signedUrl} target="_blank" rel="noopener noreferrer" onClick={handleLessonPlanInteraction}>
                        View
                      </a>
                    </Button>
                    <Button onClick={() => {
                      handleLessonPlanInteraction();
                      handleDownload(currentContentItem.signedUrl, currentContentItem.content_path?.split('/').pop() || 'lesson-plan');
                    }} disabled={isDownloading} className="bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 shadow-lg hover:shadow-xl transition-all duration-300">
                      {isDownloading ? 'Downloading...' : 'Download'}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center p-8">
                  <ClipboardList className="w-12 h-12 sm:w-16 sm:h-16 text-muted-foreground mx-auto mb-3 sm:mb-4" />
                  <p className="text-muted-foreground text-base sm:text-lg font-medium">
                    Lesson plan not available
                    {isOfflineMode && (
                      <span className="block text-sm mt-2 text-red-500">
                        DEBUG: Offline mode - signedUrl missing for item {currentContentItem.id}
                      </span>
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

  const AccessCheckingSkeleton = () => (
    <div className="flex h-screen bg-background">
      <ContentLoader message="Verifying access..." />
    </div>
  );

  if (isLoading) return <PageSkeleton />;
  if (isCheckingAccess) return <AccessCheckingSkeleton />;
  if (error) return (
    <div className="flex flex-col items-center justify-center h-full text-center p-4 sm:p-8">
      <h2 className="text-lg sm:text-xl font-semibold text-destructive mb-2">Failed to load course</h2>
      <p className="text-sm sm:text-base text-muted-foreground mb-4">{error}</p>
      <Button onClick={() => navigate(-1)} className="bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary shadow-lg hover:shadow-xl transition-all duration-300">
        Go Back
      </Button>
    </div>
  );
  if (!course) return (
    <div className="flex flex-col items-center justify-center h-full text-center p-4 sm:p-8">
      <h2 className="text-lg sm:text-xl font-semibold text-muted-foreground">Course not found</h2>
      <p className="text-sm sm:text-base text-muted-foreground mb-4">The course you're looking for doesn't exist.</p>
      <Button onClick={() => navigate(-1)} className="bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary shadow-lg hover:shadow-xl transition-all duration-300">
        Go Back
      </Button>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Premium Header Section */}
      <div className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border shadow-sm">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 py-3 sm:py-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
            {/* Breadcrumb Navigation */}
            <div className="flex items-center space-x-2 sm:space-x-4 min-w-0 flex-1 w-full sm:w-auto">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => {
                  if (profile?.role === 'admin' || profile?.role === 'super_user') {
                    // For admins and super users, navigate back to the course builder page
                    navigate(`/dashboard/courses/builder/${actualCourseId}`);
                  } else {
                    // For teachers, content creators, and students, navigate to the course overview page
                    navigate(`/dashboard/courses/${actualCourseId}`);
                  }
                }}
                className="text-muted-foreground hover:text-foreground transition-colors flex-shrink-0 text-xs sm:text-sm h-8 sm:h-9"
              >
                <ChevronLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-0.5 sm:mr-1" />
                <span className="hidden sm:inline">{(profile?.role === 'admin' || profile?.role === 'super_user') ? 'Back to Course Builder' : 'Back to Course'}</span>
                <span className="sm:hidden">Back</span>
              </Button>
              <div className="h-3 sm:h-4 w-px bg-border flex-shrink-0" />
              <div className="flex items-center space-x-1 sm:space-x-2 text-xs sm:text-sm text-muted-foreground min-w-0 flex-1 overflow-hidden">
                <span className="font-medium truncate max-w-[100px] sm:max-w-[150px] md:max-w-[200px]" title={currentModule?.title}>{currentModule?.title}</span>
                <span className="flex-shrink-0">•</span>
                <span className="truncate" title={currentLesson?.title}>{currentLesson?.title}</span>
              </div>
            </div>
            
            {/* Progress Indicator */}
            <div className="flex items-center space-x-2 sm:space-x-4 w-full sm:w-auto">
              <div className="text-right flex-1 sm:flex-initial">
                <div className="text-xs sm:text-sm font-semibold text-foreground">
                  {allContentItems.findIndex(item => item.id === currentContentItemId) + 1} of {allContentItems.length}
                </div>
                <div className="text-[10px] sm:text-xs text-muted-foreground">Progress</div>
              </div>
              <div className="w-12 sm:w-16 h-1.5 sm:h-2 bg-muted rounded-full overflow-hidden">
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
      <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 py-4 sm:py-6 md:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 sm:gap-6 md:gap-8">
          
          {/* Left Sidebar - Course Navigation */}
          <div className="lg:col-span-1 hidden lg:block">
            <div className="sticky top-24 space-y-4 sm:space-y-6">
              
              {/* Course Overview Card */}
              <Card className="bg-card border-border shadow-sm">
                <CardHeader className="pb-3 sm:pb-4 p-4 sm:p-6">
                  <CardTitle className="text-base sm:text-lg font-bold text-card-foreground leading-tight">
                    {course.title}
                  </CardTitle>
                  <div className="flex items-center justify-between">
                    <span className="text-xs sm:text-sm text-muted-foreground">Overall Progress</span>
                    <span className="text-base sm:text-lg font-bold text-primary">{course.totalProgress}%</span>
                  </div>
                  <Progress value={course.totalProgress} className="h-1.5 sm:h-2" />
                </CardHeader>
              </Card>

              {/* Module Navigation */}
              <div className="space-y-2 sm:space-y-3">
                <h3 className="text-xs sm:text-sm font-semibold text-foreground uppercase tracking-wide">
                  Course Modules
                </h3>
                <div className="space-y-2">
                  {course.modules.map((module: any) => {
                    const isCurrentModule = module.id === currentModule?.id;
                    
                    // Calculate module progress based on visible items only
                    const totalVisibleItems = module.lessons.reduce((acc: number, lesson: any) => {
                      return acc + lesson.contentItems.filter((item: any) => {
                        // Hide quiz, assignment, and lesson_plan when offline
                        if (isOfflineMode && (item.content_type === 'quiz' || item.content_type === 'assignment' || item.content_type === 'lesson_plan')) {
                          return false;
                        }
                        // Hide lesson_plan content from students
                        if (item.content_type === 'lesson_plan' && (profile?.role === 'student' || !profile?.role)) {
                          return false;
                        }
                        return true;
                      }).length;
                    }, 0);
                    
                    const completedVisibleItems = module.lessons.reduce((acc: number, lesson: any) => {
                      return acc + lesson.contentItems.filter((item: any) => {
                        // Hide quiz, assignment, and lesson_plan when offline
                        if (isOfflineMode && (item.content_type === 'quiz' || item.content_type === 'assignment' || item.content_type === 'lesson_plan')) {
                          return false;
                        }
                        // Hide lesson_plan content from students
                        if (item.content_type === 'lesson_plan' && (profile?.role === 'student' || !profile?.role)) {
                          return false;
                        }
                        return item.completed;
                      }).length;
                    }, 0);
                    
                    const moduleProgress = totalVisibleItems > 0 ? Math.round((completedVisibleItems / totalVisibleItems) * 100) : 0;
                    
                    return (
                      <div key={module.id} className="group">
                        <button
                          onClick={() => {
                            // Find first visible item in the module
                            let firstVisibleItem = null;
                            for (const lesson of module.lessons) {
                              const visibleItems = lesson.contentItems.filter((item: any) => {
                                // Hide quiz, assignment, and lesson_plan when offline
                                if (isOfflineMode && (item.content_type === 'quiz' || item.content_type === 'assignment' || item.content_type === 'lesson_plan')) {
                                  return false;
                                }
                                // Hide lesson_plan content from students
                                if (item.content_type === 'lesson_plan' && (profile?.role === 'student' || !profile?.role)) {
                                  return false;
                                }
                                return true;
                              });
                              if (visibleItems.length > 0) {
                                firstVisibleItem = visibleItems[0];
                                break;
                              }
                            }
                            if (firstVisibleItem) handleNavigation(firstVisibleItem);
                          }}
                          className={cn(
                            "w-full text-left p-3 rounded-lg transition-all duration-200 border",
                            "hover:bg-muted/50",
                            isCurrentModule 
                              ? "bg-primary/10 border-primary/20 shadow-sm" 
                              : "bg-card border-border hover:border-primary/20"
                          )}
                        >
                          <div className="flex items-center justify-between mb-2 gap-2">
                            <div className="flex items-center space-x-2 min-w-0 flex-1">
                              <BookOpen className={cn(
                                "w-4 h-4 flex-shrink-0",
                                isCurrentModule ? "text-primary" : "text-muted-foreground"
                              )} />
                              <span className={cn(
                                "text-sm font-medium truncate",
                                isCurrentModule ? "text-primary" : "text-foreground"
                              )} title={module.title}>
                                {module.title}
                              </span>
                            </div>
                            <span className="text-xs text-muted-foreground flex-shrink-0">
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
                                      // Filter content items based on user role and offline status
                                      const visibleItems = lesson.contentItems.filter((item: any) => {
                                        // Hide quiz, assignment, and lesson_plan when offline
                                        if (isOfflineMode && (item.content_type === 'quiz' || item.content_type === 'assignment' || item.content_type === 'lesson_plan')) {
                                          return false;
                                        }
                                        // Hide lesson_plan content from students
                                        if (item.content_type === 'lesson_plan' && (profile?.role === 'student' || !profile?.role)) {
                                          return false;
                                        }
                                        return true;
                                      });
                                      const firstItem = visibleItems[0];
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
                                    <div className="flex items-center justify-between gap-2">
                                      <div className="flex items-center space-x-2 min-w-0 flex-1">
                                        <ClipboardList className="w-3 h-3 flex-shrink-0" />
                                        <span className="truncate" title={lesson.title}>{lesson.title}</span>
                                      </div>
                                      {isCurrentLesson && (() => {
                                        // Calculate progress based on visible items only
                                        const visibleItems = lesson.contentItems.filter((item: any) => {
                                          // Hide quiz, assignment, and lesson_plan when offline
                                          if (isOfflineMode && (item.content_type === 'quiz' || item.content_type === 'assignment' || item.content_type === 'lesson_plan')) {
                                            return false;
                                          }
                                          // Hide lesson_plan content from students
                                          if (item.content_type === 'lesson_plan' && (profile?.role === 'student' || !profile?.role)) {
                                            return false;
                                          }
                                          return true;
                                        });
                                        const completedCount = visibleItems.filter((item: any) => item.completed).length;
                                        return (
                                          <span className="text-xs text-muted-foreground flex-shrink-0">
                                            {completedCount}/{visibleItems.length}
                                          </span>
                                        );
                                      })()}
                                    </div>
                                  </button>
                                  
                                  {/* Show content items for current lesson */}
                                  {isCurrentLesson && (
                                    <div className="ml-4 space-y-0.5">
                                      {canReorderContent && (
                                        <div className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                                          <GripVertical className="w-3 h-3" />
                                          <span>Drag to reorder content items</span>
                                        </div>
                                      )}
                                      {!canReorderContent && (profile?.role === 'admin' || profile?.role === 'super_user' || profile?.role === 'teacher' || profile?.role === 'content_creator') && course?.status === 'Published' && (
                                        <div className="text-xs text-amber-600 dark:text-amber-400 mb-2 flex items-center gap-1 bg-amber-50 dark:bg-amber-900/20 px-3 py-2 rounded-lg border border-amber-200 dark:border-amber-800">
                                          <Info className="w-3 h-3" />
                                          <span>Content reordering is disabled for published courses. Unpublish the course to make changes.</span>
                                        </div>
                                      )}
                                      {canReorderContent ? (
                                        <DndContext
                                          sensors={sensors}
                                          collisionDetection={closestCenter}
                                          onDragEnd={handleDragEnd}
                                        >
                                          <SortableContext 
                                            items={lesson.contentItems
                                              .filter((item: any) => {
                                                // Hide quiz and assignment when offline
                                                if (isOfflineMode && (item.content_type === 'quiz' || item.content_type === 'assignment')) {
                                                  return false;
                                                }
                                                return true;
                                              })
                                              .map((item: any) => item.id)}
                                            strategy={verticalListSortingStrategy}
                                          >
                                            {lesson.contentItems
                                              .filter((item: any) => {
                                                // Hide quiz and assignment when offline
                                                if (isOfflineMode && (item.content_type === 'quiz' || item.content_type === 'assignment')) {
                                                  return false;
                                                }
                                                return true;
                                              })
                                              .map((item: any, index: number) => {
                                              const isActive = item.id === currentContentItemId;
                                              const isCompleted = item.completed;
                                              
                                              return (
                                                <SortableContentItem
                                                  key={item.id}
                                                  item={item}
                                                  index={index}
                                                  isActive={isActive}
                                                  isCompleted={isCompleted}
                                                  onNavigate={handleNavigation}
                                                  canReorder={canReorderContent}
                                                />
                                              );
                                            })}
                                          </SortableContext>
                                        </DndContext>
                                      ) : (
                                        // Render without drag and drop for students
                                        lesson.contentItems
                                          .filter((item: any) => {
                                            // If profile is still loading, don't filter yet
                                            if (profileLoading) {
                                              return true;
                                            }
                                            
                                            // Hide quiz, assignment, and lesson_plan when offline
                                            if (isOfflineMode && (item.content_type === 'quiz' || item.content_type === 'assignment' || item.content_type === 'lesson_plan')) {
                                              console.log('📴 CourseContent: Sidebar - Hiding item due to offline mode:', item.title, item.content_type);
                                              return false;
                                            }
                                            
                                            // Hide lesson_plan content from students (only visible to teachers and admins)
                                            if (item.content_type === 'lesson_plan' && (profile?.role === 'student' || !profile?.role)) {
                                              console.log('🚫 CourseContent: Sidebar - Hiding lesson_plan from student:', item.title, 'User role:', profile?.role);
                                              return false;
                                            }
                                            
                                            return true;
                                          })
                                          .map((item: any, index: number) => {
                                          const isActive = item.id === currentContentItemId;
                                          const isCompleted = item.completed;
                                          
                                          return (
                                            <SortableContentItem
                                              key={item.id}
                                              item={item}
                                              index={index}
                                              isActive={isActive}
                                              isCompleted={isCompleted}
                                              onNavigate={handleNavigation}
                                              canReorder={false}
                                            />
                                          );
                                        })
                                      )}
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
                        <CardTitle className="text-lg sm:text-xl md:text-2xl font-bold text-card-foreground leading-tight">
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
                <CardContent className="p-3 sm:p-4 md:p-6">
                  {renderContent()}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>

      {/* Image Modal */}
      <Dialog open={imageModalOpen} onOpenChange={(open) => {
        setImageModalOpen(open);
        if (!open) {
          setImageLoading(false);
          setSelectedImageUrl('');
        }
      }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>Question Image</DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center p-4 min-h-[300px] sm:min-h-[400px]">
            {imageLoading ? (
              <div className="flex flex-col items-center justify-center space-y-3 sm:space-y-4">
                <div className="w-10 h-10 sm:w-12 sm:h-12 border-3 sm:border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                <div className="text-center px-4">
                  <p className="text-base sm:text-lg font-medium text-foreground">Loading Image</p>
                  <p className="text-xs sm:text-sm text-muted-foreground">Please wait while we prepare the image...</p>
                </div>
              </div>
            ) : selectedImageUrl ? (
              <img 
                src={selectedImageUrl} 
                alt="Question image preview" 
                className="max-w-full max-h-[70vh] object-contain rounded-lg shadow-lg transition-opacity duration-300"
                onLoad={() => setImageLoading(false)}
                onError={() => {
                  setImageLoading(false);
                  toast.error('Failed to load image');
                }}
              />
            ) : (
              <div className="flex flex-col items-center justify-center space-y-3 sm:space-y-4">
                <div className="w-12 h-12 sm:w-16 sm:h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center">
                  <ImageIcon className="w-6 h-6 sm:w-8 sm:h-8 text-red-500" />
                </div>
                <div className="text-center px-4">
                  <p className="text-base sm:text-lg font-medium text-foreground">Image Not Available</p>
                  <p className="text-xs sm:text-sm text-muted-foreground">The image could not be loaded</p>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
