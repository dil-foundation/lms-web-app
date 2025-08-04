import { useState, useEffect, useCallback, memo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Save, Eye, Upload, Plus, GripVertical, X, ChevronDown, ChevronUp, BookOpen } from 'lucide-react';
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import { ContentLoader } from '@/components/ContentLoader';
import { CourseOverview } from './CourseOverview';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Terminal } from "lucide-react";
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";

// #region Interfaces
interface CourseSection {
  id: string;
  title: string;
  overview?: string;
  lessons: CourseLesson[];
  isCollapsed?: boolean;
}

interface CourseLesson {
  id:string;
  title: string;
  overview?: string;
  type: 'video' | 'attachment' | 'assignment' | 'quiz';
  content?: string | File | QuizData;
  duration?: number;
  due_date?: string;
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
  teachers: { id: string; name: string; email: string }[];
  students: { id: string; name: string; email: string }[];
  status?: 'Draft' | 'Published' | 'Under Review' | 'Rejected';
  duration?: string;
  published_course_id?: string;
  authorId?: string;
  review_feedback?: string;
}

type ValidationErrors = Partial<Record<keyof Omit<CourseData, 'sections'|'teachers'|'students'|'image'|'status'|'duration'|'published_course_id'|'authorId'|'id'|'review_feedback'>, string>>;

const validateCourseData = (data: CourseData): ValidationErrors => {
  const errors: ValidationErrors = {};

  if (!data.title.trim()) errors.title = 'Course title is required.';
  if (data.title.trim().length > 100) errors.title = 'Title must be 100 characters or less.';
  
  if (!data.subtitle.trim()) errors.subtitle = 'Course subtitle is required.';
  if (data.subtitle.trim().length > 150) errors.subtitle = 'Subtitle must be 150 characters or less.';

  if (!data.description.trim()) errors.description = 'Course description is required.';
  if (data.description.trim().length < 20) errors.description = 'Description must be at least 20 characters.';

  if (!data.category) errors.category = 'Category is required.';
  if (!data.language) errors.language = 'Language is required.';
  if (!data.level) errors.level = 'Level is required.';

  if (!data.requirements || data.requirements.length === 0 || data.requirements.every(r => !r.trim())) {
    errors.requirements = 'At least one requirement is required.';
  }
  if (!data.learningOutcomes || data.learningOutcomes.length === 0 || data.learningOutcomes.every(o => !o.trim())) {
    errors.learningOutcomes = 'At least one learning outcome is required.';
  }

  return errors;
};

// #endregion

// #region Mock Data for Selection
const MOCK_USER_DATABASE = [
  { id: 'inst1', name: 'Dr. Evelyn Reed', email: 'e.reed@example.com', role: 'teacher' },
  { id: 'inst2', name: 'Mr. David Chen', email: 'd.chen@example.com', role: 'teacher' },
  { id: 'inst3', name: 'Prof. Ana Silva', email: 'a.silva@example.com', role: 'teacher' },
  { id: 'stu1', name: 'Ali Khan', email: 'ali.k@example.com', role: 'student' },
  { id: 'stu2', name: 'Fatima Ahmed', email: 'f.ahmed@example.com', role: 'student' },
  { id: 'stu3', name: 'Zainab Omar', email: 'z.omar@example.com', role: 'student' },
];

const MOCK_TEACHERS_FOR_SELECT = MOCK_USER_DATABASE.filter(u => u.role === 'teacher').map(u => ({ label: `${u.name} (${u.email})`, value: u.id }));
const MOCK_STUDENTS_FOR_SELECT = MOCK_USER_DATABASE.filter(u => u.role === 'student').map(u => ({ label: `${u.name} (${u.email})`, value: u.id }));
// #endregion

interface Profile {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  role: 'admin' | 'teacher' | 'student';
  avatar_url?: string;
}

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
  const [isUploading, setIsUploading] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [attachmentInfo, setAttachmentInfo] = useState<{ url: string; name: string } | null>(null);
  const [isConfirmingChange, setIsConfirmingChange] = useState(false);
  const [pendingLessonType, setPendingLessonType] = useState<CourseLesson['type'] | null>(null);

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
    const MAX_IMAGE_SIZE = 20 * 1024 * 1024; // 20MB
    if (file.size > MAX_IMAGE_SIZE) {
        toast.error(`Image size cannot exceed 20MB.`);
        throw new Error("File too large");
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
    const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
    if (file.size > MAX_FILE_SIZE) {
        toast.error(`File size cannot exceed 50MB.`);
        throw new Error("File too large");
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
    onUpdate(sectionId, lesson.id, { content: typeof lesson.content === 'string' ? lesson.content : '' });
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
                  maxSize={500 * 1024 * 1024} // 500MB
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
                  maxSize={10 * 1024 * 1024} // 10MB
                />;
      case 'assignment':
        return (
          <RichTextEditor
            value={typeof lesson.content === 'string' ? lesson.content : ''}
            onChange={(content) => onUpdate(sectionId, lesson.id, { content })}
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
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-2 flex-1">
          <div {...dragHandleProps} className="cursor-move pt-2.5">
            <GripVertical className="text-muted-foreground" />
          </div>
          <div className="flex-1 space-y-1">
            <Input
              value={lesson.title}
              onChange={(e) => onUpdate(sectionId, lesson.id, { title: e.target.value })}
              placeholder="Lesson Title"
              className="font-semibold"
            />
            <Textarea
              value={lesson.overview || ''}
              onChange={(e) => onUpdate(sectionId, lesson.id, { overview: e.target.value })}
              placeholder="Lesson overview (optional, e.g., 'Video - 5min')"
              rows={1}
              className="text-sm resize-none"
            />
             {(lesson.type === 'assignment' || lesson.type === 'quiz') && (
              <div className="pt-1">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !lesson.due_date && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {lesson.due_date ? `Due: ${format(new Date(lesson.due_date), "PPP")}` : <span>Set Due Date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={lesson.due_date ? new Date(lesson.due_date) : undefined}
                      onSelect={(date) => onUpdate(sectionId, lesson.id, { due_date: date?.toISOString() })}
                      initialFocus
                      defaultMonth={lesson.due_date ? new Date(lesson.due_date) : new Date()}
                      classNames={{
                        day_today: "text-foreground font-semibold"
                      }}
                      disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 ml-4">
          <Select
            value={lesson.type}
            onValueChange={handleTypeChangeRequest}
          >
                                    <SelectTrigger className="w-[120px] h-9 rounded-xl bg-background border border-input shadow-sm hover:shadow-lg hover:shadow-primary/10 transition-all duration-300 hover:-translate-y-0.5">
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

const CourseBuilder = () => {
  const { courseId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('details');
  const [saveAction, setSaveAction] = useState<null | 'draft' | 'publish' | 'unpublish' | 'review' | 'approve' | 'reject'>(null);
  const isSaving = saveAction !== null;
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isCreateDraftConfirmOpen, setIsCreateDraftConfirmOpen] = useState(false);
  const [isRejectionDialogOpen, setIsRejectionDialogOpen] = useState(false);
  const [rejectionFeedback, setRejectionFeedback] = useState("");
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const preDragLessonStatesRef = useRef<Record<string, boolean>>({});
  const [activeId, setActiveId] = useState<string | null>(null);
  const [categories, setCategories] = useState<{ id: number; name: string; }[]>([]);
  const [languages, setLanguages] = useState<{ id: number; name: string; }[]>([]);
  const [levels, setLevels] = useState<{ id: number; name: string; }[]>([]);
  const [allTeachers, setAllTeachers] = useState<{ label: string; value: string; }[]>([]);
  const [allStudents, setAllStudents] = useState<{ label: string; value: string; }[]>([]);
  const [userProfiles, setUserProfiles] = useState<Profile[]>([]);
  const [currentUserRole, setCurrentUserRole] = useState<'student' | 'teacher' | 'admin' | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});
  const [touchedFields, setTouchedFields] = useState<Partial<Record<keyof ValidationErrors, boolean>>>({});
  const [imageDbPath, setImageDbPath] = useState<string | undefined>();
  const [isLoadingPage, setIsLoadingPage] = useState(true);
  const [courseData, setCourseData] = useState<CourseData>(() => ({
    title: '',
    subtitle: '',
    description: '',
    category: '',
    language: 'English',
    level: 'Beginner',
    duration: '',
    requirements: [''],
    learningOutcomes: [''],
    status: 'Draft',
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
    teachers: [],
    students: [],
    review_feedback: '',
  }));

  const handleBlur = (field: keyof ValidationErrors) => {
    setTouchedFields(prev => ({ ...prev, [field]: true }));
  };

  useEffect(() => {
    // Real-time validation as user types
    setValidationErrors(validateCourseData(courseData));
  }, [courseData]);

  useEffect(() => {
    const initializeCourseBuilder = async () => {
      setIsLoadingPage(true);
      try {
        const [usersRes, catRes, langRes, levelRes] = await Promise.all([
          supabase.from('profiles').select('*'),
          supabase.from('course_categories').select('id, name'),
          supabase.from('course_languages').select('id, name'),
          supabase.from('course_levels').select('id, name'),
        ]);

        if (usersRes.error) throw usersRes.error;
        if (catRes.error) throw catRes.error;
        if (langRes.error) throw langRes.error;
        if (levelRes.error) throw levelRes.error;
        
        const fetchedProfiles = usersRes.data as Profile[];
        
        const fetchedCategories = catRes.data as { id: number; name: string; }[];
        const fetchedLanguages = langRes.data as { id: number; name: string; }[];
        const fetchedLevels = levelRes.data as { id: number; name: string; }[];

        setUserProfiles(fetchedProfiles);
        setCategories(fetchedCategories);
        setLanguages(fetchedLanguages);
        setLevels(fetchedLevels);
        
        const getAvatarUrl = async (avatarPath?: string): Promise<string | undefined> => {
            if (!avatarPath) return undefined;
            
            const { data, error } = await supabase.storage
                .from('dil-lms-avatars')
                .createSignedUrl(avatarPath, 3600); // 1-hour expiry
                
            if (error) {
                console.error("Error creating signed URL for avatar:", error);
                return undefined;
            }
            return data.signedUrl;
        };

        const profilesWithAvatars = await Promise.all(
            fetchedProfiles.map(async (p) => ({
                ...p,
                avatarUrl: await getAvatarUrl((p as any).avatar_url),
            }))
        );

        setUserProfiles(fetchedProfiles);
        
        const teachers = fetchedProfiles
          .filter(p => p.role === 'teacher')
          .map(p => ({ 
            label: `${p.first_name} ${p.last_name}`, 
            value: p.id,
            subLabel: p.email,
          }));

        const students = fetchedProfiles
          .filter(p => p.role === 'student')
          .map(p => ({ 
            label: `${p.first_name} ${p.last_name}`,
            value: p.id,
            subLabel: p.email,
          }));

        setAllTeachers(teachers);
        setAllStudents(students);
        
        const userProfile = fetchedProfiles.find(p => p.id === user?.id);
        if(userProfile) {
            setCurrentUserRole(userProfile.role);
        }
        
        if (courseId && courseId !== 'new') {
          const { data, error } = await supabase
            .from('courses')
            .select(`
              *,
              review_feedback,
              published_course_id,
              sections:course_sections (
                *,
                lessons:course_lessons (*)
              ),
              members:course_members (
                role,
                profile:profiles (*)
              )
            `)
            .eq('id', courseId)
            .single();

          if (error) {
            toast.error("Failed to load course data.");
            console.error("Error loading course data:", error);
            navigate('/dashboard/courses');
            return;
          }
          
          if (data) {
            let displayImageUrl: string | undefined = undefined;
            if (data.image_url) {
              setImageDbPath(data.image_url);
              const { data: signedUrlData, error: urlError } = await supabase.storage.from('dil-lms').createSignedUrl(data.image_url, 3600);
              if (!urlError) {
                displayImageUrl = signedUrlData.signedUrl;
              }
            }
            
            const courseTeachers = data.members
              .filter((m: any) => m.role === 'teacher' && m.profile)
              .map((m: any) => ({ id: m.profile.id, name: `${m.profile.first_name} ${m.profile.last_name}`, email: m.profile.email }));
            
            const courseStudents = data.members
              .filter((m: any) => m.role === 'student' && m.profile)
              .map((m: any) => ({ id: m.profile.id, name: `${m.profile.first_name} ${m.profile.last_name}`, email: m.profile.email }));

            const finalCourseData: CourseData = {
              id: data.id,
              title: data.title,
              subtitle: data.subtitle || '',
              description: data.description || '',
              image: displayImageUrl,
              authorId: data.author_id,
              category: fetchedCategories.find(c => c.id === data.category_id)?.name || '',
              language: fetchedLanguages.find(l => l.id === data.language_id)?.name || '',
              level: fetchedLevels.find(l => l.id === data.level_id)?.name || '',
              duration: data.duration || '',
              requirements: data.requirements || [''],
              learningOutcomes: data.learning_outcomes || [''],
              status: data.status || 'Draft',
              published_course_id: data.published_course_id,
              review_feedback: data.review_feedback,
              sections: data.sections.sort((a: any, b: any) => a.position - b.position).map((s: any) => ({
                ...s,
                lessons: s.lessons
                  .sort((a: any, b: any) => a.position - b.position)
                  .map((l: any) => {
                    if (l.type === 'quiz' && typeof l.content === 'string') {
                      try {
                        return { ...l, content: JSON.parse(l.content) };
                      } catch (e) {
                        console.error(`Failed to parse quiz content for lesson ${l.id}:`, l.content, e);
                        // If parsing fails, return a default structure to avoid crashing the UI
                        return { ...l, content: { questions: [] } };
                      }
                    }
                    return l;
                  }),
              })),
              teachers: courseTeachers,
              students: courseStudents,
            };
            setCourseData(finalCourseData);
          }
        }
      } catch (error: any) {
        toast.error("Failed to initialize course builder.", {
          description: error.message,
        });
        console.error("Initialization error:", error);
        navigate('/dashboard/courses');
      } finally {
        setIsLoadingPage(false);
      }
    };

    initializeCourseBuilder();
  }, [courseId, navigate, user]);

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
      
      setImageDbPath(filePath);

      const { data: signedUrlData, error: signedUrlError } = await supabase.storage.from('dil-lms').createSignedUrl(filePath, 3600); // 1 hour expiry

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

  const saveCourseData = async (courseToSave: CourseData): Promise<string | null> => {
    if (!user) {
      toast.error("You must be logged in to save a course.");
      throw new Error("User not logged in");
    }

    if (!courseToSave.title.trim()) {
      toast.error("Course title is required.");
      throw new Error("Course title is required");
    }

    const isUpdate = !!courseToSave.id;

    const courseDetails: any = {
      title: courseToSave.title,
      subtitle: courseToSave.subtitle,
      description: courseToSave.description,
      category_id: categories.find(c => c.name === courseToSave.category)?.id,
      language_id: languages.find(l => l.name === courseToSave.language)?.id,
      level_id: levels.find(l => l.name === courseToSave.level)?.id,
      image_url: imageDbPath,
      duration: courseToSave.duration,
      requirements: courseToSave.requirements.filter(r => r.trim() !== ''),
      learning_outcomes: courseToSave.learningOutcomes.filter(o => o.trim() !== ''),
      status: courseToSave.status,
      published_course_id: courseToSave.published_course_id,
    };

    let savedCourse: { id: string } | null = null;
    let courseError: any = null;

    if (isUpdate) {
      // UPDATE existing course. author_id is immutable and not sent.
      const { data, error } = await supabase
        .from('courses')
        .update(courseDetails)
        .eq('id', courseToSave.id!)
        .select('id')
        .single();
      savedCourse = data;
      courseError = error;
    } else {
      // INSERT new course. author_id is required for RLS policy.
      courseDetails.author_id = user.id;
      const { data, error } = await supabase
        .from('courses')
        .insert(courseDetails)
        .select('id')
        .single();
      savedCourse = data;
      courseError = error;
    }

    if (courseError) throw courseError;
    if (!savedCourse) throw new Error("Failed to save course and retrieve its ID.");

    const currentCourseId = savedCourse.id;

    // First, manage the curriculum. The user's membership is still intact at this point,
    // so RLS policies on sections and lessons that check for membership will pass.
    await supabase.from('course_sections').delete().eq('course_id', currentCourseId);

    for (const [sectionIndex, section] of courseToSave.sections.entries()) {
      const { data: savedSection, error: sectionError } = await supabase
        .from('course_sections')
        .insert({ course_id: currentCourseId, title: section.title, overview: section.overview, position: sectionIndex })
        .select('id')
        .single();
      
      if (sectionError) throw sectionError;
      if (!savedSection) throw new Error("Failed to save a course section.");

      for (const [lessonIndex, lesson] of section.lessons.entries()) {
        let contentToSave: string | undefined;
        if (typeof lesson.content === 'string') {
          contentToSave = lesson.content;
        } else if (lesson.type === 'quiz' && typeof lesson.content === 'object' && lesson.content) {
          contentToSave = JSON.stringify(lesson.content);
        }
        
        await supabase.from('course_lessons').insert({
          section_id: savedSection.id,
          title: lesson.title,
          type: lesson.type,
          overview: lesson.overview,
          content: contentToSave,
          position: lessonIndex,
          due_date: lesson.due_date
        });
      }
    }

    // Now that curriculum is saved, sync the members as the final step using
    // a safe "UPSERT then DELETE" strategy to avoid RLS policy violations.

    // Step 1: Prepare the final list of members from the UI state.
    const membersMap = new Map<string, { role: 'teacher' | 'student' }>();
    courseToSave.teachers.forEach(t => membersMap.set(t.id, { role: 'teacher' }));
    courseToSave.students.forEach(s => {
      if (!membersMap.has(s.id)) {
        membersMap.set(s.id, { role: 'student' });
      }
    });

    const desiredMembers = Array.from(membersMap.entries()).map(([user_id, { role }]) => ({
      course_id: currentCourseId,
      user_id,
      role: role as 'teacher' | 'student'
    }));

    // Step 2: UPSERT the desired members. This adds new members and updates existing ones.
    // The user's own membership is preserved throughout this, so RLS checks should pass.
    if (desiredMembers.length > 0) {
      const { error: upsertError } = await supabase
        .from('course_members')
        .upsert(desiredMembers, {
          onConflict: 'course_id,user_id' // This tells Supabase how to find duplicates
        });

      if (upsertError) {
        throw new Error(`There was an issue updating course members: ${upsertError.message}`);
      }
    }

    // Step 3: DELETE members who are in the DB but no longer in the desired list.
    const { data: currentDbMembers, error: fetchError } = await supabase
      .from('course_members')
      .select('user_id')
      .eq('course_id', currentCourseId);

    if (fetchError) {
      // If we can't fetch, we shouldn't proceed with deletes.
      // The upsert already handled additions/updates, so it's safer to stop here.
      toast.warning("Could not verify member list for cleanup. Some old members may remain.", {
        description: fetchError.message
      });
    } else {
        const desiredMemberIds = new Set(desiredMembers.map(m => m.user_id));
        const membersToRemove = currentDbMembers
          .filter(dbMember => !desiredMemberIds.has(dbMember.user_id))
          .map(dbMember => dbMember.user_id);
    
        if (membersToRemove.length > 0) {
          const { error: deleteError } = await supabase
            .from('course_members')
            .delete()
            .eq('course_id', currentCourseId)
            .in('user_id', membersToRemove);
          
          if (deleteError) {
            // This delete is non-critical for the main save, so we'll toast a warning instead of throwing.
            toast.warning("Failed to clean up old course members.", {
              description: deleteError.message
            });
          }
        } else if (currentDbMembers.length > 0 && desiredMembers.length === 0) {
            // Handle case where all members are removed.
            const { error: deleteAllError } = await supabase
                .from('course_members')
                .delete()
                .eq('course_id', currentCourseId);
            if (deleteAllError) {
                 toast.warning("Failed to remove all course members.", {
                    description: deleteAllError.message
                });
            }
        }
    }
    
    return currentCourseId;
  };

  const handleConfirmCreateDraft = async () => {
    setSaveAction('draft');
    try {
        const draftToCreate: CourseData = {
            ...courseData,
            id: undefined, // This makes it a new course row
            status: 'Draft',
            published_course_id: courseData.id, // Link back to the published course
        };
        const newDraftId = await saveCourseData(draftToCreate);
        if (newDraftId) {
            toast.success("New draft created successfully.", {
                description: "You are now editing the new draft copy."
            });
            navigate(`/dashboard/courses/builder/${newDraftId}`, { replace: true });
        }
    } catch (error: any) {
        toast.error('Failed to create a new draft.', { description: error.message });
        console.error(error);
    } finally {
        setSaveAction(null);
    }
  }

  const handleSaveDraftClick = async () => {
    // If we are editing a course that is currently 'Published', show confirmation dialog.
    if (courseData.status === 'Published') {
      setIsCreateDraftConfirmOpen(true);
      return;
    }
    
    // If the status is already 'Draft' (or it's a new course), just save/update it.
    setSaveAction('draft');
    try {
      const courseToSave = { ...courseData, status: 'Draft' as const };
      const savedId = await saveCourseData(courseToSave);
      if (savedId) {
        toast.success("Draft saved successfully!");
        setCourseData(prev => ({...prev, id: savedId, status: 'Draft'}));
        if (courseId === 'new' && savedId) {
          navigate(`/dashboard/courses/builder/${savedId}`, { replace: true });
        }
      }
    } catch (error: any) {
      toast.error('Failed to save draft.', { description: error.message });
      console.error(error);
    } finally {
      setSaveAction(null);
    }
  };

  const handlePublishClick = async () => {
    const errors = validateCourseData(courseData);
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      toast.error("Cannot publish course", {
        description: "Please fix the validation errors highlighted on the form.",
      });
      // Find the first tab with an error and switch to it
      if (errors.title || errors.subtitle || errors.description || errors.category || errors.language || errors.level) {
        setActiveTab('details');
      } else if (errors.requirements || errors.learningOutcomes) {
        setActiveTab('landing');
      }
      return;
    }

    setSaveAction('publish');
    try {
      if (courseData.published_course_id && courseData.id) {
        // First, save any pending changes to the draft.
        await saveCourseData({ ...courseData, status: 'Draft' });
        
        // Then, call the RPC to publish.
        const { error } = await supabase.rpc('publish_draft', {
          draft_id_in: courseData.id,
          published_id_in: courseData.published_course_id,
        });
        if (error) throw error;
        
        toast.success("Course published successfully!");
        navigate('/dashboard/courses');
      } else {
        const savedId = await saveCourseData({ ...courseData, status: 'Published' });
        if(savedId) {
          toast.success("Course published successfully!");
          navigate('/dashboard/courses');
        }
      }
    } catch (error: any) {
      toast.error('Failed to publish course.', { description: error.message });
      console.error(error);
    } finally {
      setSaveAction(null);
    }
  };

  const handleUnpublishClick = async () => {
    if (!courseData.id) return;
    setSaveAction('unpublish');
    try {
      const { error } = await supabase
        .from('courses')
        .update({ status: 'Draft' })
        .eq('id', courseData.id);

      if (error) throw error;

      toast.success("Course unpublished and saved as a draft.");
      setCourseData(prev => ({...prev, status: 'Draft'}));
    } catch (error: any) {
      toast.error('Failed to unpublish course.', { description: error.message });
      console.error(error);
    } finally {
      setSaveAction(null);
    }
  };

  const handleDeleteConfirmed = async () => {
    if (!courseData.id) return;

    // Only delete assets if the course is not a draft of an existing published course.
    // If published_course_id exists, it means this draft shares assets with a published version.
    if (imageDbPath && !courseData.published_course_id) {
        const { error: storageError } = await supabase.storage.from('dil-lms').remove([imageDbPath]);
        if (storageError) {
            toast.error("Could not delete course image. The course record was not deleted.", { description: storageError.message });
            setIsDeleteDialogOpen(false);
            return;
        }
    }

    const { error } = await supabase.from('courses').delete().eq('id', courseData.id);
    
    if (error) {
      toast.error("Failed to delete course.", { description: error.message });
    } else {
      toast.success(`Course "${courseData.title}" deleted successfully.`);
      navigate('/dashboard/courses');
    }
    setIsDeleteDialogOpen(false);
  };

  const handleSubmitForReview = async () => {
    setSaveAction('review');
    try {
      // First, ensure the course is saved as a draft. This will create a new one if it's new,
      // or update the existing one.
      const savedId = await saveCourseData({ ...courseData, status: 'Draft' });
      
      if (!savedId) {
        throw new Error("Failed to save the course before submitting for review.");
      }
      
      // Now that we're sure we have a saved course, call the RPC.
      const { error } = await supabase.rpc('submit_for_review', { course_id_in: savedId });
      if (error) throw error;
      
      toast.success("Course submitted for review successfully!");
      // Update the local state to reflect the new status and ID if it was a new course
      setCourseData(prev => ({ ...prev, id: savedId, status: 'Under Review' }));
    } catch (error: any) {
      toast.error('Failed to submit for review.', { description: error.message });
      console.error(error);
    } finally {
      setSaveAction(null);
    }
  };

  const handleApproveSubmission = async () => {
    if (!courseData.id) return;
    setSaveAction('approve');
    try {
      const { error } = await supabase.rpc('approve_submission', { course_id_in: courseData.id });
      if (error) throw error;
      
      toast.success("Course approved and published successfully!");
      navigate('/dashboard/courses');
    } catch (error: any) {
      toast.error('Failed to approve submission.', { description: error.message });
      console.error(error);
    } finally {
      setSaveAction(null);
    }
  };

  const handleRejectSubmission = async () => {
    if (!courseData.id || !rejectionFeedback.trim()) {
      toast.error("Rejection feedback cannot be empty.");
      return;
    }
    setSaveAction('reject');
    try {
      const { error } = await supabase.rpc('reject_submission', {
        course_id_in: courseData.id,
        feedback: rejectionFeedback,
      });
      if (error) throw error;
      
      toast.success("Submission rejected.");
      setCourseData(prev => ({ ...prev, status: 'Rejected', review_feedback: rejectionFeedback }));
      setIsRejectionDialogOpen(false);
      setRejectionFeedback("");
    } catch (error: any) {
      toast.error('Failed to reject submission.', { description: error.message });
      console.error(error);
    } finally {
      setSaveAction(null);
    }
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

  const handleMembersChange = (role: 'teachers' | 'students', selectedIds: string[]) => {
    const selectedUsers = userProfiles
        .filter(user => selectedIds.includes(user.id))
        .map(user => ({ id: user.id, name: `${user.first_name} ${user.last_name}`, email: user.email }));
    
    setCourseData(prev => ({
        ...prev,
        [role]: selectedUsers
    }));
  };

  const canDelete = user && courseData.id && courseData.authorId && (
    currentUserRole === 'admin' ||
    (currentUserRole === 'teacher' && user.id === courseData.authorId && (courseData.status === 'Draft' || courseData.status === 'Rejected'))
  );

  const isFormValid = Object.keys(validationErrors).length === 0;

  if (isLoadingPage) {
    return (
        <div className="flex items-center justify-center h-full w-full min-h-[calc(100vh-8rem)]">
            <ContentLoader message="Loading Course Builder..." />
        </div>
    );
  }

  return (
    <div className="min-h-screen bg-background w-full">
      {/* Premium Header Section */}
      <div className="relative border-b bg-card">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-primary/5"></div>
        <div className="relative flex items-center justify-between p-6 w-full">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/dashboard/courses')}
                                      className="h-10 w-10 rounded-xl bg-background border border-input shadow-sm hover:shadow-lg hover:shadow-primary/10 transition-all duration-300 hover:-translate-y-0.5"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-primary/10 to-primary/20 rounded-2xl flex items-center justify-center">
                <BookOpen className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-primary via-primary to-primary/80 bg-clip-text text-transparent" style={{ backgroundClip: 'text', WebkitBackgroundClip: 'text' }}>
                  {courseData.title || 'New Course'}
                </h1>
                <div className="flex items-center gap-3 mt-2">
                  <Badge variant={
                    courseData.status === 'Published' ? 'default' :
                    courseData.status === 'Under Review' ? 'outline' :
                    courseData.status === 'Rejected' ? 'destructive' :
                    'secondary'
                  } className="text-xs">
                    {courseData.status || 'Draft'}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    Last saved: 2 minutes ago
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={() => setIsPreviewOpen(true)}
                                      className="h-9 px-4 rounded-xl bg-background border border-input shadow-sm hover:shadow-lg hover:shadow-primary/10 transition-all duration-300 hover:-translate-y-0.5"
            >
              <Eye className="w-4 h-4 mr-2" />
              Preview
            </Button>

            {/* Teacher Buttons */}
            {currentUserRole === 'teacher' && (
              <>
                {(courseData.status === 'Draft' || courseData.status === 'Rejected') && (
                  <>
                    <Button 
                      onClick={handleSaveDraftClick} 
                      disabled={isSaving}
                      className="h-9 px-4 rounded-xl bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5"
                    >
                      <Save className="w-4 h-4 mr-2" />
                      {saveAction === 'draft' ? 'Saving...' : (courseData.id ? 'Update Draft' : 'Save Draft')}
                    </Button>
                    <Button 
                      onClick={handleSubmitForReview} 
                      className="h-9 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5" 
                      disabled={isSaving || !isFormValid}
                    >
                      {saveAction === 'review' ? 'Submitting...' : 'Submit for Review'}
                    </Button>
                  </>
                )}
                {courseData.status === 'Published' && (
                   <Button 
                     onClick={handleSaveDraftClick} 
                     disabled={isSaving}
                     className="h-9 px-4 rounded-xl bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5"
                   >
                      <Save className="w-4 h-4 mr-2" />
                      {saveAction === 'draft' ? 'Creating...' : 'Create New Draft'}
                    </Button>
                )}
              </>
            )}

            {/* Admin Buttons */}
            {currentUserRole === 'admin' && (
              <>
                {(courseData.status === 'Draft' || courseData.status === 'Rejected') && (
                   <Button 
                     onClick={handleSaveDraftClick} 
                     disabled={isSaving}
                     className="h-9 px-4 rounded-xl bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5"
                   >
                    <Save className="w-4 h-4 mr-2" />
                    {saveAction === 'draft' ? 'Saving...' : (courseData.id ? 'Update Draft' : 'Save Draft')}
                  </Button>
                )}
                {courseData.status === 'Published' ? (
                  <>
                    <Button 
                      onClick={handleSaveDraftClick} 
                      disabled={isSaving}
                      className="h-9 px-4 rounded-xl bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5"
                    >
                       <Save className="w-4 h-4 mr-2" />
                       {saveAction === 'draft' ? 'Creating...' : 'Create New Draft'}
                     </Button>
                    <Button 
                      onClick={handleUnpublishClick} 
                      className="h-9 px-4 rounded-xl bg-gradient-to-r from-yellow-600 to-yellow-700 hover:from-yellow-700 hover:to-yellow-800 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5" 
                      disabled={isSaving}
                    >
                      {saveAction === 'unpublish' ? 'Unpublishing...' : 'Unpublish'}
                    </Button>
                  </>
                ) : (
                  (courseData.status === 'Draft' || courseData.status === 'Rejected') && (
                    <Button 
                      onClick={handlePublishClick} 
                      className="h-9 px-4 rounded-xl bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5" 
                      disabled={isSaving || !isFormValid}
                    >
                      {saveAction === 'publish' ? 'Publishing...' : 'Publish'}
                    </Button>
                  )
                )}
                {courseData.status === 'Under Review' && (
                  <>
                    <Button 
                      onClick={() => setIsRejectionDialogOpen(true)} 
                      variant="destructive" 
                      disabled={isSaving}
                      className="h-9 px-4 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5"
                    >
                        {saveAction === 'reject' ? 'Rejecting...' : 'Reject'}
                    </Button>
                    <Button 
                      onClick={handleApproveSubmission} 
                      className="h-9 px-4 rounded-xl bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5" 
                      disabled={isSaving}
                    >
                      {saveAction === 'approve' ? 'Approving...' : 'Approve & Publish'}
                    </Button>
                  </>
                )}
              </>
            )}
            
            {canDelete && (
                <Button 
                  variant="destructive" 
                  onClick={() => setIsDeleteDialogOpen(true)} 
                  disabled={isSaving}
                  className="h-9 px-4 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5"
                >
                    Delete
                </Button>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1">
        {courseData.status === 'Rejected' && courseData.review_feedback && (
          <div className="p-6 pt-6 pb-0">
            <Alert variant="destructive">
              <Terminal className="h-4 w-4" />
              <AlertTitle>Submission Rejected</AlertTitle>
              <AlertDescription>
                <p className="font-semibold">An admin provided the following feedback:</p>
                <p className="mt-2 p-2 bg-background rounded-md">{courseData.review_feedback}</p>
                <p className="mt-2 text-sm text-muted-foreground">Please address the feedback and resubmit the course for review.</p>
              </AlertDescription>
            </Alert>
          </div>
        )}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full">
          {/* Premium Tabs Section */}
          <div className="relative border-b bg-card">
            <div className="absolute inset-0 bg-gradient-to-r from-primary/3 via-transparent to-primary/3"></div>
            <div className="relative">
              <TabsList className="w-full justify-start rounded-none h-14 bg-transparent p-0 border-none">
                <TabsTrigger
                  value="details"
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary/10 data-[state=active]:to-primary/5 px-6 h-14 text-sm font-medium transition-all duration-300 hover:bg-primary/5 hover:border-primary/50 data-[state=active]:text-primary data-[state=active]:font-semibold"
                >
                  Course Details
                </TabsTrigger>
                <TabsTrigger
                  value="curriculum"
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary/10 data-[state=active]:to-primary/5 px-6 h-14 text-sm font-medium transition-all duration-300 hover:bg-primary/5 hover:border-primary/50 data-[state=active]:text-primary data-[state=active]:font-semibold"
                >
                  Curriculum
                </TabsTrigger>
                <TabsTrigger
                  value="landing"
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary/10 data-[state=active]:to-primary/5 px-6 h-14 text-sm font-medium transition-all duration-300 hover:bg-primary/5 hover:border-primary/50 data-[state=active]:text-primary data-[state=active]:font-semibold"
                >
                  Landing Page
                </TabsTrigger>
                <TabsTrigger
                  value="access"
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary/10 data-[state=active]:to-primary/5 px-6 h-14 text-sm font-medium transition-all duration-300 hover:bg-primary/5 hover:border-primary/50 data-[state=active]:text-primary data-[state=active]:font-semibold"
                >
                  Access
                </TabsTrigger>
              </TabsList>
            </div>
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
                      onBlur={() => handleBlur('title')}
                      placeholder="Enter course title"
                      className={cn(validationErrors.title && touchedFields.title && "border-red-500 focus-visible:ring-red-500")}
                    />
                    {validationErrors.title && touchedFields.title && <p className="text-sm text-red-500 mt-1">{validationErrors.title}</p>}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-2">Course Subtitle</label>
                    <Input
                      value={courseData.subtitle}
                      onChange={(e) => setCourseData(prev => ({ ...prev, subtitle: e.target.value }))}
                      onBlur={() => handleBlur('subtitle')}
                      placeholder="Enter course subtitle"
                      className={cn(validationErrors.subtitle && touchedFields.subtitle && "border-red-500 focus-visible:ring-red-500")}
                    />
                    {validationErrors.subtitle && touchedFields.subtitle && <p className="text-sm text-red-500 mt-1">{validationErrors.subtitle}</p>}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-2">Course Description</label>
                    <Textarea
                      value={courseData.description}
                      onChange={(e) => setCourseData(prev => ({ ...prev, description: e.target.value }))}
                      onBlur={() => handleBlur('description')}
                      placeholder="Describe your course"
                      rows={4}
                      className={cn(validationErrors.description && touchedFields.description && "border-red-500 focus-visible:ring-red-500")}
                    />
                    {validationErrors.description && touchedFields.description && <p className="text-sm text-red-500 mt-1">{validationErrors.description}</p>}
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Category</label>
                      <Select
                        value={courseData.category}
                        onValueChange={(value) => {
                          setCourseData(prev => ({ ...prev, category: value }));
                          handleBlur('category');
                        }}
                      >
                        <SelectTrigger className={cn("h-9 rounded-xl bg-background border border-input shadow-sm hover:shadow-lg hover:shadow-primary/10 transition-all duration-300 hover:-translate-y-0.5", validationErrors.category && touchedFields.category && "border-red-500 focus:ring-red-500")}>
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
                      {validationErrors.category && touchedFields.category && <p className="text-sm text-red-500 mt-1">{validationErrors.category}</p>}
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium mb-2">Language</label>
                      <Select
                        value={courseData.language}
                        onValueChange={(value) => {
                          setCourseData(prev => ({ ...prev, language: value }));
                          handleBlur('language');
                        }}
                      >
                        <SelectTrigger className={cn("h-9 rounded-xl bg-background border border-input shadow-sm hover:shadow-lg hover:shadow-primary/10 transition-all duration-300 hover:-translate-y-0.5", validationErrors.language && touchedFields.language && "border-red-500 focus:ring-red-500")}>
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
                      {validationErrors.language && touchedFields.language && <p className="text-sm text-red-500 mt-1">{validationErrors.language}</p>}
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium mb-2">Level</label>
                      <Select
                        value={courseData.level}
                        onValueChange={(value) => {
                          setCourseData(prev => ({ ...prev, level: value }));
                          handleBlur('level');
                        }}
                      >
                        <SelectTrigger className={cn("h-9 rounded-xl bg-background border border-input shadow-sm hover:shadow-lg hover:shadow-primary/10 transition-all duration-300 hover:-translate-y-0.5", validationErrors.level && touchedFields.level && "border-red-500 focus:ring-red-500")}>
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
                      {validationErrors.level && touchedFields.level && <p className="text-sm text-red-500 mt-1">{validationErrors.level}</p>}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Course Duration</label>
                    <Input
                      value={courseData.duration || ''}
                      onChange={(e) => setCourseData(prev => ({ ...prev, duration: e.target.value }))}
                      placeholder="e.g., 8 weeks"
                    />
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
                        onClick={() => {
                          setCourseData(prev => ({...prev, image: undefined}));
                          setImageDbPath(undefined);
                        }}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                  </div>
                  ) : (
                    <FileUpload 
                      onUpload={handleImageUpload} 
                      label={isUploading ? "Uploading..." : "Upload course thumbnail (JPG, PNG)"}
                      acceptedFileTypes={['image/jpeg', 'image/png']}
                      disabled={isUploading}
                      maxSize={2 * 1024 * 1024} // 2MB
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
                            <Card className={`bg-card border border-border ${activeId === section.id ? 'opacity-50' : ''}`}>
                              <CardHeader className="flex flex-row items-start justify-between p-4 gap-4">
                                <div className="flex items-start gap-2 flex-1">
                                  <div {...dragHandleProps} className="cursor-move pt-2.5">
                                    <GripVertical className="text-muted-foreground" />
                                  </div>
                                  <div className="flex-1 space-y-1">
                                    <Input
                                      value={section.title}
                                      onChange={(e) => {
                                        const newSections = [...courseData.sections];
                                        newSections[sectionIndex].title = e.target.value;
                                        setCourseData(prev => ({ ...prev, sections: newSections }));
                                      }}
                                      className="font-semibold"
                                    />
                                    <Textarea
                                      value={section.overview || ''}
                                      onChange={(e) => {
                                        const newSections = [...courseData.sections];
                                        newSections[sectionIndex].overview = e.target.value;
                                        setCourseData(prev => ({ ...prev, sections: newSections }));
                                      }}
                                      placeholder="Section overview or summary (optional)"
                                      rows={1}
                                      className="text-sm resize-none"
                                    />
                                  </div>
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
                        <Card className="bg-card border border-border">
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
                        <Input value={req} onChange={(e) => updateArrayField('requirements', index, e.target.value)} onBlur={() => handleBlur('requirements')} />
                        <Button variant="ghost" size="icon" onClick={() => removeArrayField('requirements', index)}>
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                    <Button variant="outline" size="sm" onClick={() => addArrayField('requirements')}>Add Requirement</Button>
                    {validationErrors.requirements && touchedFields.requirements && <p className="text-sm text-red-500 mt-1">{validationErrors.requirements}</p>}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-2">What you'll learn</label>
                    {courseData.learningOutcomes.map((outcome, index) => (
                      <div key={index} className="flex items-center gap-2 mb-2">
                        <Input value={outcome} onChange={(e) => updateArrayField('learningOutcomes', index, e.target.value)} onBlur={() => handleBlur('learningOutcomes')} />
                        <Button variant="ghost" size="icon" onClick={() => removeArrayField('learningOutcomes', index)}>
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                    <Button variant="outline" size="sm" onClick={() => addArrayField('learningOutcomes')}>Add Outcome</Button>
                    {validationErrors.learningOutcomes && touchedFields.learningOutcomes && <p className="text-sm text-red-500 mt-1">{validationErrors.learningOutcomes}</p>}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="access" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Manage Teachers</CardTitle>
                  <p className="text-sm text-muted-foreground">Add or remove teachers who can manage this course.</p>
                </CardHeader>
                <CardContent>
                  <MultiSelect
                    options={allTeachers}
                    onValueChange={(selectedIds) => handleMembersChange('teachers', selectedIds)}
                    value={courseData.teachers.map(i => i.id)}
                    placeholder="Select teachers"
                  />
                  <div className="space-y-2 mt-4">
                    {courseData.teachers.map(user => (
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
                    options={allStudents}
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

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the course
              <strong className="mx-1">"{courseData.title}"</strong>
              and all of its associated data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirmed}
              className="bg-destructive hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={isCreateDraftConfirmOpen} onOpenChange={setIsCreateDraftConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Create a New Draft?</AlertDialogTitle>
            <AlertDialogDescription>
              This course is already published. Saving a draft will create a new, separate copy for editing.
              <br /><br />
              Your changes will not affect the live, published version until you explicitly publish this new draft.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmCreateDraft}>Create Draft</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-screen-lg h-[90vh] flex flex-col p-0">
          <DialogHeader className="p-6 pb-0">
            <DialogTitle>Course Preview</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto">
            <CourseOverview courseData={courseData} isPreviewMode={true} />
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isRejectionDialogOpen} onOpenChange={setIsRejectionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Submission</DialogTitle>
            <DialogDescription>
              Please provide feedback for the teacher explaining why the submission is being rejected. This feedback will be visible to them.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Textarea
              placeholder="Enter rejection feedback..."
              value={rejectionFeedback}
              onChange={(e) => setRejectionFeedback(e.target.value)}
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsRejectionDialogOpen(false)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={handleRejectSubmission}
              disabled={!rejectionFeedback.trim()}
            >
              Confirm Rejection
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CourseBuilder;
