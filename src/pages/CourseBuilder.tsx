import { useState, useEffect, useCallback, memo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Save, Eye, Upload, Plus, GripVertical, X, ChevronDown, ChevronUp } from 'lucide-react';
import { toast } from 'sonner';
import { FileUpload } from '@/components/ui/FileUpload';
import { RichTextEditor } from '@/components/ui/RichTextEditor';
import { MultiSelect } from '@/components/ui/MultiSelect';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  MeasuringStrategy,
  DragOverlay,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import React, { useRef } from 'react'; // Added missing import for React
import { supabase } from '@/integrations/supabase/client';
import { FileIcon } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

// #region Interfaces
interface CourseSection {
  id: string;
  title: string;
  lessons: CourseLesson[];
  isCollapsed?: boolean;
}

interface CourseLesson {
  id:string;
  title: string;
  type: 'video' | 'attachment' | 'assignment' | 'quiz';
  content?: string | File | QuizData;
  duration?: number;
  isCollapsed?: boolean;
}

interface QuizQuestion {
  id: string;
  text: string;
  options: { id: string; text: string; }[];
  correctOptionId: string;
}

interface QuizData {
  questions: QuizQuestion[];
}

interface CourseData {
  id?: string;
  title: string;
  subtitle: string;
  description: string;
  category: string;
  language: string;
  level: string;
  image?: string;
  requirements: string[];
  learningOutcomes: string[];
  sections: CourseSection[];
  instructors: { id: string; name: string; email: string }[];
  students: { id: string; name: string; email: string }[];
}
// #endregion

// #region Mock Data for Selection
const MOCK_USER_DATABASE = [
  { id: 'inst1', name: 'Dr. Evelyn Reed', email: 'e.reed@example.com', role: 'instructor' },
  { id: 'inst2', name: 'Mr. David Chen', email: 'd.chen@example.com', role: 'instructor' },
  { id: 'inst3', name: 'Prof. Ana Silva', email: 'a.silva@example.com', role: 'instructor' },
  { id: 'stu1', name: 'Ali Khan', email: 'ali.k@example.com', role: 'student' },
  { id: 'stu2', name: 'Fatima Ahmed', email: 'f.ahmed@example.com', role: 'student' },
  { id: 'stu3', name: 'Zainab Omar', email: 'z.omar@example.com', role: 'student' },
];

const MOCK_INSTRUCTORS_FOR_SELECT = MOCK_USER_DATABASE.filter(u => u.role === 'instructor').map(u => ({ label: `${u.name} (${u.email})`, value: u.id }));
const MOCK_STUDENTS_FOR_SELECT = MOCK_USER_DATABASE.filter(u => u.role === 'student').map(u => ({ label: `${u.name} (${u.email})`, value: u.id }));
// #endregion

// #region LessonItem Component
interface LessonItemProps {
  lesson: CourseLesson;
  sectionId: string;
  onUpdate: (sectionId: string, lessonId:string, updatedLesson: Partial<CourseLesson>) => void;
  onRemove: (sectionId: string, lessonId:string) => void;
  isRemovable: boolean;
  dragHandleProps: any;
  onToggleCollapse: (sectionId: string, lessonId: string) => void;
  courseId: string | undefined;
}

const LessonItem = memo(({ lesson, sectionId, onUpdate, onRemove, isRemovable, dragHandleProps, onToggleCollapse, courseId }: LessonItemProps) => {
  const [localContent, setLocalContent] = useState(typeof lesson.content === 'string' ? lesson.content : '');
  const [isUploading, setIsUploading] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [attachmentInfo, setAttachmentInfo] = useState<{ url: string; name: string } | null>(null);
  const [isConfirmingChange, setIsConfirmingChange] = useState(false);
  const [pendingLessonType, setPendingLessonType] = useState<CourseLesson['type'] | null>(null);

  // Keep local state in sync if the prop changes from parent
  useEffect(() => {
    // If the parent content is a string, sync it to local state.
    // If it's not a string (e.g., undefined, QuizData), reset local state to empty string.
    setLocalContent(typeof lesson.content === 'string' ? lesson.content : '');
  }, [lesson.content]);

  useEffect(() => {
    let isMounted = true;

    const getSignedUrl = async (filePath: string, type: 'video' | 'attachment') => {
      const { data, error } = await supabase.storage
        .from('dil-lms')
        .createSignedUrl(filePath, 3600);

      if (!isMounted) return;

      if (error) {
        console.error(`Error creating signed URL for ${type}:`, error);
        toast.error(`Could not load ${type} preview.`);
      } else if (data) {
        if (type === 'video') {
          setVideoUrl(data.signedUrl);
        } else {
          const name = filePath.split('/').pop() || 'file';
          setAttachmentInfo({ url: data.signedUrl, name });
        }
      }
    };

    if (typeof lesson.content === 'string' && lesson.content) {
      if (lesson.type === 'video') {
        setAttachmentInfo(null);
        getSignedUrl(lesson.content, 'video');
      } else if (lesson.type === 'attachment') {
        setVideoUrl(null);
        getSignedUrl(lesson.content, 'attachment');
      }
    } else {
      setVideoUrl(null);
      setAttachmentInfo(null);
    }

    return () => { isMounted = false; };
  }, [lesson.content, lesson.type]);

  const handleConfirmTypeChange = () => {
    if (pendingLessonType) {
      onUpdate(sectionId, lesson.id, { type: pendingLessonType, content: undefined });
      setPendingLessonType(null);
    }
  };

  const handleTypeChangeRequest = (newType: 'video' | 'attachment' | 'assignment' | 'quiz') => {
    let hasContent = false;
    if (lesson.content) {
      if (lesson.type === 'quiz') {
        hasContent = (lesson.content as QuizData)?.questions?.length > 0;
      } else if (lesson.type === 'assignment') {
        const contentStr = lesson.content as string;
        hasContent = contentStr && contentStr !== '<p><br></p>';
      } else { // Video or Attachment
        hasContent = !!lesson.content;
      }
    }

    if (hasContent && newType !== lesson.type) {
      setPendingLessonType(newType);
      setIsConfirmingChange(true);
    } else {
      onUpdate(sectionId, lesson.id, { type: newType, content: undefined });
    }
  };

  const handleVideoUpload = async (file: File) => {
    if (!file) return;

    setIsUploading(true);
    const filePath = `lesson-videos/${courseId || 'new'}/${lesson.id}/${crypto.randomUUID()}/${file.name}`;

    try {
      const { error } = await supabase.storage.from('dil-lms').upload(filePath, file);
      if (error) throw error;
      onUpdate(sectionId, lesson.id, { content: filePath });
      toast.success('Video uploaded successfully!');
    } catch (error: any) {
      toast.error('Video upload failed.', { description: error.message });
      console.error(error);
    } finally {
      setIsUploading(false);
    }
  };

  const handleAttachmentUpload = async (file: File) => {
    if (!file) return;

    setIsUploading(true);
    const filePath = `lesson-attachments/${courseId || 'new'}/${lesson.id}/${crypto.randomUUID()}/${file.name}`;

    try {
      const { error } = await supabase.storage.from('dil-lms').upload(filePath, file);
      if (error) throw error;
      onUpdate(sectionId, lesson.id, { content: filePath });
      toast.success('Attachment uploaded successfully!');
    } catch (error: any) {
      toast.error('Attachment upload failed.', { description: error.message });
      console.error(error);
    } finally {
      setIsUploading(false);
    }
  };

  const handleAssignmentImageUpload = useCallback(async (file: File) => {
    if (!file) {
      toast.error("No file selected.");
      throw new Error("No file selected.");
    }
    const filePath = `assignment-assets/images/${courseId || 'new'}/${lesson.id}/${crypto.randomUUID()}/${file.name}`;
    try {
      const { error: uploadError } = await supabase.storage.from('dil-lms').upload(filePath, file);
      if (uploadError) throw uploadError;
      const { data, error: urlError } = await supabase.storage.from('dil-lms').createSignedUrl(filePath, 3600 * 24 * 7); // 7 days
      if (urlError) throw urlError;
      return data.signedUrl;
    } catch (error: any) {
      toast.error('Image upload failed.', { description: error.message });
      throw error;
    }
  }, [courseId, lesson.id]);

  const handleAssignmentFileUpload = useCallback(async (file: File) => {
    if (!file) {
      toast.error("No file selected.");
      throw new Error("No file selected.");
    }
    const filePath = `assignment-assets/files/${courseId || 'new'}/${lesson.id}/${crypto.randomUUID()}/${file.name}`;
    try {
      const { error: uploadError } = await supabase.storage.from('dil-lms').upload(filePath, file);
      if (uploadError) throw uploadError;
      const { data, error: urlError } = await supabase.storage.from('dil-lms').createSignedUrl(filePath, 3600 * 24 * 7); // 7 days
      if (urlError) throw urlError;
      return data.signedUrl;
    } catch (error: any) {
      toast.error('File upload failed.', { description: error.message });
      throw error;
    }
  }, [courseId, lesson.id]);

  const handleBlur = () => {
    // Sync with parent state only when user is done editing
    onUpdate(sectionId, lesson.id, { content: localContent });
  };
  
  const renderLessonContentEditor = () => {
    switch (lesson.type) {
      case 'video':
        if (videoUrl) {
          return (
            <div className="space-y-2">
              <video controls src={videoUrl} className="w-full rounded-lg" />
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => {
                  setVideoUrl(null);
                  onUpdate(sectionId, lesson.id, { content: undefined });
                  // We might want to delete the file from storage here as well
                }}
              >
                Remove Video
              </Button>
            </div>
          );
        }
        return <FileUpload 
                  onUpload={handleVideoUpload} 
                  label={isUploading ? "Uploading..." : "Upload Video (MP4, MOV)"}
                  acceptedFileTypes={['video/mp4', 'video/quicktime']}
                  disabled={isUploading}
                />;
      case 'attachment':
        if (attachmentInfo) {
          return (
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border">
              <div className="flex items-center gap-3">
                <FileIcon className="h-6 w-6 text-muted-foreground" />
                <a href={attachmentInfo.url} target="_blank" rel="noopener noreferrer" className="font-medium hover:underline">
                  {attachmentInfo.name}
                </a>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setAttachmentInfo(null);
                  onUpdate(sectionId, lesson.id, { content: undefined });
                }}
              >
                Remove
              </Button>
            </div>
          );
        }
        return <FileUpload 
                  onUpload={handleAttachmentUpload}
                  label={isUploading ? "Uploading..." : "Upload Attachment (PDF, DOC, ZIP)"}
                  acceptedFileTypes={[
                    'application/pdf',
                    'application/msword',
                    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                    'application/vnd.ms-excel',
                    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                    'application/zip'
                  ]}
                  disabled={isUploading}
                />;
      case 'assignment':
        return (
          <RichTextEditor
            value={localContent}
            onChange={setLocalContent}
            onBlur={handleBlur}
            placeholder="Write the assignment details here..."
            onImageUpload={handleAssignmentImageUpload}
            onFileUpload={handleAssignmentFileUpload}
          />
        );
      case 'quiz':
        return (
          <QuizBuilder
            quiz={typeof lesson.content === 'object' && lesson.content && 'questions' in lesson.content ? lesson.content as QuizData : { questions: [] }}
            onQuizChange={(content) => onUpdate(sectionId, lesson.id, { content })}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="p-4 rounded-lg bg-background border space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 flex-1">
          <div {...dragHandleProps} className="cursor-move">
            <GripVertical className="text-muted-foreground" />
          </div>
          <Input
            value={lesson.title}
            onChange={(e) => onUpdate(sectionId, lesson.id, { title: e.target.value })}
            placeholder="Lesson Title"
            className="flex-1"
          />
        </div>
        <div className="flex items-center gap-2 ml-4">
          <Select
            value={lesson.type}
            onValueChange={handleTypeChangeRequest}
          >
            <SelectTrigger className="w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="video">Video</SelectItem>
              <SelectItem value="attachment">Attachment</SelectItem>
              <SelectItem value="assignment">Assignment</SelectItem>
              <SelectItem value="quiz">Quiz</SelectItem>
            </SelectContent>
          </Select>
          {isRemovable && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onRemove(sectionId, lesson.id)}
            >
              <X className="w-4 h-4" />
            </Button>
          )}
          <Button variant="ghost" size="icon" onClick={() => onToggleCollapse(sectionId, lesson.id)}>
            {lesson.isCollapsed ? <ChevronDown className="w-5 h-5" /> : <ChevronUp className="w-5 h-5" />}
          </Button>
        </div>
      </div>
      {!lesson.isCollapsed && (
        <div>
          {renderLessonContentEditor()}
        </div>
      )}

      <AlertDialog open={isConfirmingChange} onOpenChange={setIsConfirmingChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure you want to switch lesson type?</AlertDialogTitle>
            <AlertDialogDescription>
              Your current lesson content will be lost. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPendingLessonType(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmTypeChange}>Continue</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
});
LessonItem.displayName = "LessonItem";
// #endregion

// #region SortableItem Component
const SortableItem = ({ id, children, type, sectionId }: { id: string, children: (dragHandleProps: any) => React.ReactNode, type: 'section' | 'lesson', sectionId?: string }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ 
    id,
    data: {
      type,
      sectionId
    }
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 'auto',
    opacity: isDragging ? 0.8 : 1,
  };

  return (
    <div ref={setNodeRef} style={style}>
      {children({ ...attributes, ...listeners })}
    </div>
  );
};
// #endregion

// #region QuizBuilder Component
const QuizBuilder = ({ quiz, onQuizChange }: { quiz: QuizData, onQuizChange: (quiz: QuizData) => void }) => {
  const addQuestion = () => {
    const newQuestion: QuizQuestion = {
      id: Date.now().toString(),
      text: '',
      options: [{ id: '1', text: '' }, { id: '2', text: '' }],
      correctOptionId: '1'
    };
    onQuizChange({ ...quiz, questions: [...quiz.questions, newQuestion] });
  };

  const updateQuestion = (qIndex: number, text: string) => {
    const updatedQuestions = quiz.questions.map((q, i) => i === qIndex ? { ...q, text } : q);
    onQuizChange({ ...quiz, questions: updatedQuestions });
  };
  
  const removeQuestion = (qIndex: number) => {
    const updatedQuestions = quiz.questions.filter((_, i) => i !== qIndex);
    onQuizChange({ ...quiz, questions: updatedQuestions });
  };
  
  const addOption = (qIndex: number) => {
    const newOption = { id: Date.now().toString(), text: '' };
    const updatedQuestions = quiz.questions.map((q, i) => i === qIndex ? { ...q, options: [...q.options, newOption] } : q);
    onQuizChange({ ...quiz, questions: updatedQuestions });
  };

  const updateOption = (qIndex: number, oIndex: number, text: string) => {
    const updatedQuestions = quiz.questions.map((q, i) => i === qIndex ? {
      ...q,
      options: q.options.map((opt, j) => j === oIndex ? { ...opt, text } : opt)
    } : q);
    onQuizChange({ ...quiz, questions: updatedQuestions });
  };

  const removeOption = (qIndex: number, oIndex: number) => {
    const updatedQuestions = quiz.questions.map((q, i) => i === qIndex ? {
      ...q,
      options: q.options.filter((_, j) => j !== oIndex)
    } : q);
    onQuizChange({ ...quiz, questions: updatedQuestions });
  };

  const setCorrectOption = (qIndex: number, optionId: string) => {
    const updatedQuestions = quiz.questions.map((q, i) => i === qIndex ? { ...q, correctOptionId: optionId } : q);
    onQuizChange({ ...quiz, questions: updatedQuestions });
  };
  
  return (
    <div className="space-y-4">
      {quiz.questions.map((question, qIndex) => (
        <Card key={question.id}>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Input
                value={question.text}
                onChange={(e) => updateQuestion(qIndex, e.target.value)}
                placeholder={`Question ${qIndex + 1}`}
              />
              <Button variant="ghost" size="icon" onClick={() => removeQuestion(qIndex)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {question.options.map((option, oIndex) => (
              <div key={option.id} className="flex items-center gap-2">
                <Input
                  value={option.text}
                  onChange={(e) => updateOption(qIndex, oIndex, e.target.value)}
                  placeholder={`Option ${oIndex + 1}`}
                />
                <Button
                  variant={question.correctOptionId === option.id ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setCorrectOption(qIndex, option.id)}
                >
                  Correct
                </Button>
                <Button variant="ghost" size="icon" onClick={() => removeOption(qIndex, oIndex)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={() => addOption(qIndex)}>
              Add Option
            </Button>
          </CardContent>
        </Card>
      ))}
      <Button onClick={addQuestion}>Add Question</Button>
    </div>
  );
};
// #endregion

// #region Mock Data
const MOCK_INSTRUCTORS = [
  { id: 'inst1', name: 'Dr. Evelyn Reed', email: 'e.reed@example.com' },
  { id: 'inst2', name: 'Mr. David Chen', email: 'd.chen@example.com' },
  { id: 'inst3', name: 'Prof. Maria Garcia', email: 'm.garcia@example.com' },
  { id: 'inst4', name: 'Dr. James Wilson', email: 'j.wilson@example.com' },
  { id: 'inst5', name: 'Ms. Sarah Thompson', email: 's.thompson@example.com' },
  { id: 'inst6', name: 'Mr. Robert Brown', email: 'r.brown@example.com' },
  { id: 'inst7', name: 'Dr. Emily Davis', email: 'e.davis@example.com' },
  { id: 'inst8', name: 'Mr. Michael Lee', email: 'm.lee@example.com' },
  { id: 'inst9', name: 'Dr. Samantha White', email: 's.white@example.com' },
  { id: 'inst10', name: 'Mr. David Taylor', email: 'd.taylor@example.com' },
];

const MOCK_STUDENTS = [
  { id: 'stu1', name: 'Ali Khan', email: 'ali.k@example.com' },
  { id: 'stu2', name: 'Fatima Ahmed', email: 'f.ahmed@example.com' },
  { id: 'stu3', name: 'Zainab Omar', email: 'z.omar@example.com' },
  { id: 'stu4', name: 'Ahmed Ali', email: 'ahmed.ali@example.com' },
  { id: 'stu5', name: 'Sara Khan', email: 'sara.k@example.com' },
  { id: 'stu6', name: 'Hassan Ahmed', email: 'hassan.ahmed@example.com' }
];

const CourseBuilder = () => {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('details');
  const [isSaving, setIsSaving] = useState(false);
  const preDragLessonStatesRef = useRef<Record<string, boolean>>({});
  const [activeId, setActiveId] = useState<string | null>(null);
  const [categories, setCategories] = useState<{ id: number; name: string; }[]>([]);
  const [languages, setLanguages] = useState<{ id: number; name: string; }[]>([]);
  const [levels, setLevels] = useState<{ id: number; name: string; }[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [courseData, setCourseData] = useState<CourseData>(() => ({
    title: '',
    subtitle: '',
    description: '',
    category: '',
    language: 'English',
    level: 'Beginner',
    requirements: [''],
    learningOutcomes: [''],
    sections: [
      {
        id: `section-${Date.now()}`,
        title: 'New Section',
        isCollapsed: false,
        lessons: [
          {
            id: `lesson-${Date.now() + 1}`,
            title: 'New Lesson',
            type: 'video',
            content: undefined,
          },
        ],
      },
    ],
    instructors: [],
    students: [],
  }));

  useEffect(() => {
    const fetchDropdownData = async () => {
      // Fetch Categories
      const { data: catData, error: catError } = await supabase.from('course_categories').select('id, name');
      if (catError) {
        console.error('Error fetching categories: ', catError);
        toast.error('Failed to load course categories.');
      } else if (catData) {
        setCategories(catData as any);
      }

      // Fetch Languages
      const { data: langData, error: langError } = await supabase.from('course_languages').select('id, name');
      if (langError) {
        console.error('Error fetching languages: ', langError);
        toast.error('Failed to load course languages.');
      } else if (langData) {
        setLanguages(langData as any);
      }

      // Fetch Levels
      const { data: levelData, error: levelError } = await supabase.from('course_levels').select('id, name');
      if (levelError) {
        console.error('Error fetching levels: ', levelError);
        toast.error('Failed to load course levels.');
      } else if (levelData) {
        setLevels(levelData as any);
      }
    };

    fetchDropdownData();
  }, []);

  // Mock course data loading
  useEffect(() => {
    if (courseId && courseId !== 'new') {
      // Mock loading existing course data
      setCourseData({
        title: 'Stage 0 - Beginner English for Urdu Speakers',
        subtitle: 'Master English fundamentals with native Urdu instruction',
        description: 'A comprehensive English learning course designed specifically for Urdu speakers...',
        category: 'Language Learning',
        language: 'English',
        level: 'Beginner',
        requirements: ['Basic Urdu literacy', 'Willingness to practice daily'],
        learningOutcomes: ['Speak basic English confidently', 'Understand common English phrases', 'Write simple sentences'],
        instructors: [
          { id: 'inst1', name: 'Dr. Evelyn Reed', email: 'e.reed@example.com' },
          { id: 'inst2', name: 'Mr. David Chen', email: 'd.chen@example.com' }
        ],
        students: [
          { id: 'stu1', name: 'Ali Khan', email: 'ali.k@example.com' },
          { id: 'stu2', name: 'Fatima Ahmed', email: 'f.ahmed@example.com' },
          { id: 'stu3', name: 'Zainab Omar', email: 'z.omar@example.com' }
        ],
        sections: [
          {
            id: 'section-1',
            title: 'Introduction to English',
            isCollapsed: false,
            lessons: [
              { id: 'lesson-1-1', title: 'Welcome to the Course', type: 'video' },
              { id: 'lesson-1-2', title: 'Basic Greetings', type: 'video' }
            ]
          }
        ]
      });
    }
  }, [courseId]);

  const handleImageUpload = async (file: File) => {
    if (!file) return;

    setIsUploading(true);
    // Use a more robust naming convention to avoid collisions
    const fileExt = file.name.split('.').pop();
    const fileName = `${crypto.randomUUID()}.${fileExt}`;
    const filePath = `course-thumbnails/${fileName}`;

    try {
      const { error: uploadError } = await supabase.storage
        .from('dil-lms')
        .upload(filePath, file);

      if (uploadError) {
        throw uploadError;
      }

      const { data: signedUrlData, error: signedUrlError } = await supabase.storage
        .from('dil-lms')
        .createSignedUrl(filePath, 3600); // 1 hour expiry

      if (signedUrlError) {
        throw signedUrlError;
      }
      
      setCourseData(prev => ({ ...prev, image: signedUrlData.signedUrl }));
      toast.success('Image uploaded successfully!');

    } catch (error: any) {
      toast.error('Image upload failed.', { description: error.message });
      console.error(error);
    } finally {
      setIsUploading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    // Mock save operation
    console.log('Saving course data:', courseData);
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsSaving(false);
    toast.success('Course saved successfully!');
  };

  const handlePublish = () => {
    toast.success('Course published successfully!');
  };

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    setActiveId(active.id.toString());
    const activeType = active.data.current?.type;

    if (activeType === 'section') {
      setCourseData((prev) => ({
        ...prev,
        sections: prev.sections.map((s) => ({ ...s, isCollapsed: true })),
      }));
    } else if (activeType === 'lesson') {
      const sectionId = active.data.current?.sectionId;
      preDragLessonStatesRef.current = {}; // Clear previous states

      setCourseData(prev => {
        const section = prev.sections.find(s => s.id === sectionId);
        if (section) {
          for (const lesson of section.lessons) {
            preDragLessonStatesRef.current[lesson.id] = !!lesson.isCollapsed;
          }
        }
        
        return {
          ...prev,
          sections: prev.sections.map(s => {
            if (s.id === sectionId) {
              return {
                ...s,
                lessons: s.lessons.map(l => ({ ...l, isCollapsed: true }))
              };
            }
            return s;
          })
        };
      })
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = event;

    setCourseData(prev => {
      let newSections = [...prev.sections]; // Create a mutable copy

      if (over && active.id !== over.id) {
        const activeType = active.data.current?.type;
        const overType = over.data.current?.type;
        const activeId = active.id.toString();
        const overId = over.id.toString();

        if (activeType === 'section' && overType === 'section') {
          const oldIndex = newSections.findIndex((s) => s.id === activeId);
          const newIndex = newSections.findIndex((s) => s.id === overId);
          if (oldIndex !== -1 && newIndex !== -1) {
            newSections = arrayMove(newSections, oldIndex, newIndex);
          }
        }

        if (activeType === 'lesson') {
          const sourceSectionId = active.data.current?.sectionId;
          const sourceSectionIndex = newSections.findIndex(s => s.id === sourceSectionId);

          // Determine destination section
          let destSectionId = overId;
          if (overType === 'lesson') {
            destSectionId = over.data.current?.sectionId;
          }
          const destSectionIndex = newSections.findIndex(s => s.id === destSectionId);

          if (sourceSectionIndex > -1 && destSectionIndex > -1) {
            const sourceSection = newSections[sourceSectionIndex];
            const destSection = newSections[destSectionIndex];
            const lessonToMoveIndex = sourceSection.lessons.findIndex(l => l.id === activeId);
            const lessonToMove = sourceSection.lessons[lessonToMoveIndex];

            if (sourceSectionId === destSectionId) {
              // Reordering within the same section
              if (overType === 'lesson') {
                const overLessonIndex = destSection.lessons.findIndex(l => l.id === overId);
                if (lessonToMoveIndex > -1 && overLessonIndex > -1) {
                  const reorderedLessons = arrayMove(sourceSection.lessons, lessonToMoveIndex, overLessonIndex);
                  newSections[sourceSectionIndex] = { ...sourceSection, lessons: reorderedLessons };
                }
              }
            } else {
              // Moving to a different section
              if (sourceSection.lessons.length <= 1) {
                toast.info("Each section must have at least one lesson.");
              } else {
                // Remove from source
                sourceSection.lessons.splice(lessonToMoveIndex, 1);

                // Add to destination
                let overLessonIndex = destSection.lessons.length; // Default to end
                if (overType === 'lesson') {
                    overLessonIndex = destSection.lessons.findIndex(l => l.id === overId);
                }
                destSection.lessons.splice(overLessonIndex, 0, lessonToMove);
                newSections[destSectionIndex].isCollapsed = false; // Expand destination
              }
            }
          }
        }
      }
      
      // Restore lesson states if a lesson was dragged
      const activeType = active.data.current?.type;
      if (activeType === 'lesson') {
        const sectionId = active.data.current?.sectionId;
        const sectionIndex = newSections.findIndex(s => s.id === sectionId);
        if (sectionIndex !== -1) {
          const sectionToRestore = newSections[sectionIndex];
          newSections[sectionIndex] = {
            ...sectionToRestore,
            lessons: sectionToRestore.lessons.map(l => ({
              ...l,
              isCollapsed: preDragLessonStatesRef.current[l.id] ?? false
            }))
          };
        }
        preDragLessonStatesRef.current = {}; // Clear ref
      }

      return { ...prev, sections: newSections };
    });
  };

  // #region Section and Lesson Handlers
  const addSection = () => {
    const newLesson = {
      id: `lesson-${Date.now()}`,
      title: 'New Lesson',
      type: 'video' as const,
      content: undefined,
    };
    const newSection: CourseSection = {
      id: `section-${Date.now() + 1}`,
      title: 'New Section',
      lessons: [newLesson],
      isCollapsed: false,
    };
    setCourseData(prev => ({ ...prev, sections: [...prev.sections, newSection] }));
  };

  const toggleSectionCollapse = (sectionId: string) => {
    setCourseData(prev => ({
      ...prev,
      sections: prev.sections.map(s =>
        s.id === sectionId ? { ...s, isCollapsed: !s.isCollapsed } : s
      )
    }));
  };

  const toggleLessonCollapse = (sectionId: string, lessonId: string) => {
    setCourseData(prev => ({
      ...prev,
      sections: prev.sections.map(s =>
        s.id === sectionId
          ? {
            ...s,
            lessons: s.lessons.map(l =>
              l.id === lessonId ? { ...l, isCollapsed: !l.isCollapsed } : l
            ),
          }
          : s
      ),
    }));
  };

  const removeSection = (sectionId: string) => {
    setCourseData(prev => ({
      ...prev,
      sections: prev.sections.filter(s => s.id !== sectionId)
    }));
  };

  const addLesson = (sectionId: string) => {
    const newLesson: CourseLesson = {
      id: Date.now().toString(),
      title: 'New Lesson',
      type: 'video',
      content: undefined
    };
    setCourseData(prev => ({
      ...prev,
      sections: prev.sections.map(section =>
        section.id === sectionId ? { ...section, lessons: [...section.lessons, newLesson], isCollapsed: false } : section
      )
    }));
  };

  const updateLesson = useCallback((sectionId: string, lessonId: string, updatedLesson: Partial<CourseLesson>) => {
    setCourseData(prev => ({
      ...prev,
      sections: prev.sections.map(section =>
        section.id === sectionId
          ? {
              ...section,
              lessons: section.lessons.map(lesson =>
                lesson.id === lessonId ? { ...lesson, ...updatedLesson } : lesson
              ),
            }
          : section
      ),
    }));
  }, []);

  const removeLesson = useCallback((sectionId: string, lessonId: string) => {
    setCourseData(prev => {
      const section = prev.sections.find(s => s.id === sectionId);
      if (section && section.lessons.length <= 1) {
        toast.info("Each section must have at least one lesson.");
        return prev;
      }
      return {
        ...prev,
        sections: prev.sections.map(s =>
          s.id === sectionId
            ? { ...s, lessons: s.lessons.filter(l => l.id !== lessonId) }
            : s
        ),
      };
    });
  }, []);
  // #endregion

  // #region Array Field Handlers (for Course Details)
  const updateArrayField = useCallback((field: 'requirements' | 'learningOutcomes', index: number, value: string) => {
    setCourseData(prev => ({ ...prev, [field]: prev[field].map((item, i) => i === index ? value : item) }));
  }, []);

  const addArrayField = useCallback((field: 'requirements' | 'learningOutcomes') => {
    setCourseData(prev => ({ ...prev, [field]: [...prev[field], ''] }));
  }, []);

  const removeArrayField = useCallback((field: 'requirements' | 'learningOutcomes', index: number) => {
    setCourseData(prev => ({ ...prev, [field]: prev[field].filter((_, i) => i !== index) }));
  }, []);
  // #endregion

  const handleMembersChange = (role: 'instructors' | 'students', selectedIds: string[]) => {
    const selectedUsers = MOCK_USER_DATABASE
        .filter(user => selectedIds.includes(user.id))
        .map(user => ({ id: user.id, name: user.name, email: user.email }));
    
    setCourseData(prev => ({
        ...prev,
        [role]: selectedUsers
    }));
  };


  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard/courses')}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-xl font-semibold text-card-foreground">
                {courseData.title || 'New Course'}
              </h1>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="secondary">Draft</Badge>
                <span className="text-sm text-muted-foreground">
                  Last saved: 2 minutes ago
                </span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button variant="outline">
              <Eye className="w-4 h-4 mr-2" />
              Preview
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              <Save className="w-4 h-4 mr-2" />
              {isSaving ? 'Saving...' : 'Save'}
            </Button>
            <Button onClick={handlePublish} className="bg-green-600 hover:bg-green-700">
              Publish
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full">
          <div className="border-b">
            <TabsList className="w-full justify-start rounded-none h-12 bg-transparent p-0">
              <TabsTrigger value="details" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary">
                Course Details
              </TabsTrigger>
              <TabsTrigger value="curriculum" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary">
                Curriculum
              </TabsTrigger>
              <TabsTrigger value="landing" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary">
                Landing Page
              </TabsTrigger>
              <TabsTrigger value="group" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary">
                Group
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="p-6">
            <TabsContent value="details" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Basic Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Course Title</label>
                    <Input
                      value={courseData.title}
                      onChange={(e) => setCourseData(prev => ({ ...prev, title: e.target.value }))}
                      placeholder="Enter course title"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-2">Course Subtitle</label>
                    <Input
                      value={courseData.subtitle}
                      onChange={(e) => setCourseData(prev => ({ ...prev, subtitle: e.target.value }))}
                      placeholder="Enter course subtitle"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-2">Course Description</label>
                    <Textarea
                      value={courseData.description}
                      onChange={(e) => setCourseData(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Describe your course"
                      rows={4}
                    />
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Category</label>
                      <Select value={courseData.category} onValueChange={(value) => setCourseData(prev => ({ ...prev, category: value }))}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          {categories.map((category) => (
                            <SelectItem key={category.id} value={category.name}>
                              {category.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium mb-2">Language</label>
                      <Select value={courseData.language} onValueChange={(value) => setCourseData(prev => ({ ...prev, language: value }))}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select language" />
                        </SelectTrigger>
                        <SelectContent>
                          {languages.map((language) => (
                            <SelectItem key={language.id} value={language.name}>
                              {language.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium mb-2">Level</label>
                      <Select value={courseData.level} onValueChange={(value) => setCourseData(prev => ({ ...prev, level: value }))}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select level" />
                        </SelectTrigger>
                        <SelectContent>
                          {levels.map((level) => (
                            <SelectItem key={level.id} value={level.name}>
                              {level.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Course Image</CardTitle>
                </CardHeader>
                <CardContent>
                  {courseData.image ? (
                    <div className="relative group">
                      <img src={courseData.image} alt="Course thumbnail" className="rounded-lg w-full h-auto object-cover" />
                      <Button
                        variant="destructive"
                        size="icon"
                        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => setCourseData(prev => ({...prev, image: undefined}))}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ) : (
                    <FileUpload 
                      onUpload={handleImageUpload} 
                      label={isUploading ? "Uploading..." : "Upload course thumbnail"}
                      disabled={isUploading}
                    />
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="curriculum" className="space-y-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>Course Curriculum</CardTitle>
                  <Button onClick={addSection}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Section
                  </Button>
                </CardHeader>
                <CardContent className="space-y-4">
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragStart={handleDragStart}
                    onDragEnd={handleDragEnd}
                    measuring={{
                      droppable: {
                        strategy: MeasuringStrategy.Always,
                      },
                    }}
                  >
                    <SortableContext
                      items={courseData.sections.map(s => s.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      {courseData.sections.map((section, sectionIndex) => (
                        <SortableItem key={section.id} id={section.id} type="section">
                          {(dragHandleProps) => (
                            <Card className={`bg-muted/50 ${activeId === section.id ? 'opacity-50' : ''}`}>
                              <CardHeader className="flex flex-row items-center justify-between p-4">
                                <div className="flex items-center gap-2">
                                  <div {...dragHandleProps} className="cursor-move">
                                    <GripVertical className="text-muted-foreground" />
                                  </div>
                                  <Input
                                    value={section.title}
                                    onChange={(e) => {
                                      const newSections = [...courseData.sections];
                                      newSections[sectionIndex].title = e.target.value;
                                      setCourseData(prev => ({ ...prev, sections: newSections }));
                                    }}
                                    className="text-lg font-semibold border-none focus-visible:ring-0"
                                  />
                                </div>
                                <div className="flex items-center gap-2">
                                  <Button onClick={() => addLesson(section.id)} variant="outline">
                                    <Plus className="w-4 h-4 mr-2" />
                                    Lesson
                                  </Button>
                                  {courseData.sections.length > 1 && (
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => removeSection(section.id)}
                                    >
                                      <X className="w-4 h-4" />
                                    </Button>
                                  )}
                                  <Button variant="ghost" size="icon" onClick={() => toggleSectionCollapse(section.id)}>
                                    {section.isCollapsed ? <ChevronDown className="w-5 h-5" /> : <ChevronUp className="w-5 h-5" />}
                                  </Button>
                                </div>
                              </CardHeader>
                              {!section.isCollapsed && (
                                <CardContent className="space-y-2 pl-12 pr-4 pb-4">
                                  <SortableContext items={section.lessons.map(l => l.id)} strategy={verticalListSortingStrategy}>
                                    {section.lessons.map((lesson) => (
                                      <SortableItem key={lesson.id} id={lesson.id} type="lesson" sectionId={section.id}>
                                        {(lessonDragHandleProps) => (
                                          <div className={`${activeId === lesson.id ? 'opacity-25' : ''}`}>
                                            <LessonItem
                                              key={lesson.id}
                                              lesson={lesson}
                                              sectionId={section.id}
                                              onUpdate={updateLesson}
                                              onRemove={removeLesson}
                                              isRemovable={section.lessons.length > 1}
                                              dragHandleProps={lessonDragHandleProps}
                                              onToggleCollapse={toggleLessonCollapse}
                                              courseId={courseId}
                                            />
                                          </div>
                                        )}
                                      </SortableItem>
                                    ))}
                                  </SortableContext>
                                </CardContent>
                              )}
                            </Card>
                          )}
                        </SortableItem>
                      ))}
                    </SortableContext>
                    <DragOverlay>
                      {activeId ? (
                        activeId.startsWith('section-') ?
                        <Card className="bg-muted/50">
                          <CardHeader>{courseData.sections.find(s => s.id === activeId)?.title}</CardHeader>
                        </Card> :
                        <LessonItem
                          lesson={
                            courseData.sections
                              .flatMap(s => s.lessons)
                              .find(l => l.id === activeId) || { id: '', title: '', type: 'video' }
                          }
                          sectionId={
                            courseData.sections.find(s => s.lessons.some(l => l.id === activeId))?.id || ''
                          }
                          onUpdate={() => {}}
                          onRemove={() => {}}
                          isRemovable={false}
                          dragHandleProps={{}}
                          onToggleCollapse={() => {}}
                          courseId={courseId}
                        />
                      ) : null}
                    </DragOverlay>
                  </DndContext>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="landing" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Course Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                   <div>
                    <label className="block text-sm font-medium mb-2">Requirements</label>
                    {courseData.requirements.map((req, index) => (
                      <div key={index} className="flex items-center gap-2 mb-2">
                        <Input value={req} onChange={(e) => updateArrayField('requirements', index, e.target.value)} />
                        <Button variant="ghost" size="icon" onClick={() => removeArrayField('requirements', index)}>
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                    <Button variant="outline" size="sm" onClick={() => addArrayField('requirements')}>Add Requirement</Button>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-2">What you'll learn</label>
                    {courseData.learningOutcomes.map((outcome, index) => (
                      <div key={index} className="flex items-center gap-2 mb-2">
                        <Input value={outcome} onChange={(e) => updateArrayField('learningOutcomes', index, e.target.value)} />
                        <Button variant="ghost" size="icon" onClick={() => removeArrayField('learningOutcomes', index)}>
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                    <Button variant="outline" size="sm" onClick={() => addArrayField('learningOutcomes')}>Add Outcome</Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="group" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Manage Instructors</CardTitle>
                  <p className="text-sm text-muted-foreground">Add or remove instructors who can manage this course.</p>
                </CardHeader>
                <CardContent>
                  <MultiSelect
                    options={MOCK_INSTRUCTORS_FOR_SELECT}
                    onValueChange={(selectedIds) => handleMembersChange('instructors', selectedIds)}
                    value={courseData.instructors.map(i => i.id)}
                    placeholder="Select instructors"
                  />
                  <div className="space-y-2 mt-4">
                    {courseData.instructors.map(user => (
                      <div key={user.id} className="flex items-center justify-between p-2 rounded-md border bg-muted/20">
                        <div>
                          <p className="font-medium">{user.name}</p>
                          <p className="text-sm text-muted-foreground">{user.email}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Manage Students</CardTitle>
                  <p className="text-sm text-muted-foreground">Enroll or unenroll students from this course.</p>
                </CardHeader>
                <CardContent>
                   <MultiSelect
                    options={MOCK_STUDENTS_FOR_SELECT}
                    onValueChange={(selectedIds) => handleMembersChange('students', selectedIds)}
                    value={courseData.students.map(s => s.id)}
                    placeholder="Select students"
                  />
                  <div className="space-y-2 mt-4">
                    {courseData.students.map(user => (
                      <div key={user.id} className="flex items-center justify-between p-2 rounded-md border bg-muted/20">
                        <div>
                          <p className="font-medium">{user.name}</p>
                          <p className="text-sm text-muted-foreground">{user.email}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  );
};

export default CourseBuilder;
