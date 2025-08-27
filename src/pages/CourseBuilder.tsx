import { useState, useEffect, useCallback, memo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Save, Eye, Upload, Plus, GripVertical, X, ChevronDown, ChevronUp, BookOpen, Info, UploadCloud } from 'lucide-react';
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
import AccessLogService from '@/services/accessLogService';
import { CourseOverview } from './CourseOverview';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Terminal } from "lucide-react";
import { format } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import { TimePicker } from "@/components/ui/time-picker";
import { DatePicker } from "@/components/ui/date-picker";

// #region Interfaces
interface CourseSection {
  id: string;
  title: string;
  overview?: string;
  lessons: CourseLesson[];
  isCollapsed?: boolean;
}

interface CourseLesson {
  id: string;
  title: string;
  overview?: string;
  isCollapsed?: boolean;
  contentItems: LessonContentItem[];
}

interface LessonContentItem {
  id: string;
  title: string;
  content_type: 'video' | 'attachment' | 'assignment' | 'quiz';
  content_path?: string; // For video, attachment, assignment HTML
  quiz?: QuizData; // For quiz type
  due_date?: string; // Due date for assignments and quizzes
}

interface QuizData {
  id: string;
  questions: QuizQuestion[];
}

interface QuizQuestion {
  id: string;
  question_text: string;
  question_type: 'single_choice' | 'multiple_choice' | 'text_answer';
  options: QuestionOption[];
  position: number;
}

interface QuestionOption {
  id: string;
  option_text: string;
  is_correct: boolean;
  position: number;
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

// #region ContentTypeSelector Component
interface ContentTypeSelectorProps {
  onSelect: (contentType: 'video' | 'assignment' | 'quiz' | 'attachment') => void;
  onClose: () => void;
}

const ContentTypeSelector = ({ onSelect, onClose }: ContentTypeSelectorProps) => {
  const contentTypes = [
    {
      type: 'video' as const,
      label: 'Video',
      description: 'Upload video content for your lesson',
      icon: '🎥',
      color: 'from-blue-500/10 to-blue-600/10',
      borderColor: 'border-blue-200/50',
      iconBg: 'bg-blue-500/10',
      iconColor: 'text-blue-600'
    },
    {
      type: 'assignment' as const,
      label: 'Assignment',
      description: 'Create written assignments and tasks',
      icon: '📝',
      color: 'from-orange-500/10 to-orange-600/10',
      borderColor: 'border-orange-200/50',
      iconBg: 'bg-orange-500/10',
      iconColor: 'text-orange-600'
    },
    {
      type: 'quiz' as const,
      label: 'Quiz',
      description: 'Build interactive quizzes and assessments',
      icon: '❓',
      color: 'from-purple-500/10 to-purple-600/10',
      borderColor: 'border-purple-200/50',
      iconBg: 'bg-purple-500/10',
      iconColor: 'text-purple-600'
    },
    {
      type: 'attachment' as const,
      label: 'Attachment',
      description: 'Add supporting documents and files',
      icon: '📎',
      color: 'from-green-500/10 to-green-600/10',
      borderColor: 'border-green-200/50',
      iconBg: 'bg-green-500/10',
      iconColor: 'text-green-600'
    }
  ];

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl max-w-3xl w-full max-h-[80vh] overflow-hidden animate-in fade-in-0 zoom-in-95 duration-300">
        {/* Header */}
        <div className="p-4 border-b border-gray-100 dark:border-gray-800 bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1">
                Add Content to Your Lesson
              </h2>
              <p className="text-gray-600 dark:text-gray-300 text-sm">
                Choose the type of content you'd like to add to engage your students
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-8 w-8 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-300 hover:scale-105"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Content Grid */}
        <div className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {contentTypes.map((contentType) => (
              <div
                key={contentType.type}
                onClick={() => onSelect(contentType.type)}
                className={`
                  group relative p-4 rounded-xl border-2 cursor-pointer transition-all duration-300
                  hover:scale-102 hover:shadow-lg hover:-translate-y-0.5
                  ${contentType.borderColor} hover:border-current/60
                  bg-gradient-to-br ${contentType.color}
                  hover:from-current/20 hover:to-current/10
                  transform-gpu
                `}
              >
                {/* Icon */}
                <div className={`
                  w-12 h-12 rounded-xl flex items-center justify-center text-2xl mb-3
                  ${contentType.iconBg} ${contentType.iconColor}
                  group-hover:scale-105 transition-transform duration-300
                  shadow-md group-hover:shadow-lg
                `}>
                  {contentType.icon}
                </div>

                {/* Content */}
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                  {contentType.label}
                </h3>
                <p className="text-gray-600 dark:text-gray-300 text-xs leading-relaxed">
                  {contentType.description}
                </p>

                {/* Hover Effect */}
                <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                
                {/* Arrow */}
                <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-all duration-300 group-hover:translate-x-1">
                  <div className="w-8 h-8 rounded-full bg-white/90 dark:bg-gray-800/90 flex items-center justify-center shadow-md">
                    <Plus className="w-4 h-4 text-gray-600 dark:text-gray-300" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-gray-100 dark:border-gray-800 bg-gradient-to-r from-card/50 to-card/30 dark:bg-card/50">
          <p className="text-center text-gray-500 dark:text-gray-400 text-xs">
            Each content type is designed to enhance different learning styles and engagement levels
          </p>
        </div>
      </div>
    </div>
  );
};

// #endregion

// #region LessonContentItem Component
interface LessonContentItemProps {
  item: LessonContentItem;
  lessonId: string;
  sectionId: string;
  onUpdate: (lessonId: string, itemId: string, updatedItem: Partial<LessonContentItem>) => void;
  onRemove: (lessonId: string, itemId: string) => void;
  isRemovable: boolean;
  courseId: string | undefined;
}

const LessonContentItemComponent = memo(({ item, lessonId, sectionId, onUpdate, onRemove, isRemovable, courseId }: LessonContentItemProps) => {
  const [isUploading, setIsUploading] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [attachmentInfo, setAttachmentInfo] = useState<{ url: string; name: string } | null>(null);
  const [isConfirmingChange, setIsConfirmingChange] = useState(false);
  const [pendingContentType, setPendingContentType] = useState<LessonContentItem['content_type'] | null>(null);

  useEffect(() => {
    let isMounted = true;

    const getSignedUrl = async (filePath: string, type: 'video' | 'attachment') => {
      const { data, error } = await supabase.storage
        .from('dil-lms')
        .createSignedUrl(filePath, 3600);

      if (!isMounted) return;

      if (error) {

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

    if (item.content_path) {
      if (item.content_type === 'video') {
        setAttachmentInfo(null);
        getSignedUrl(item.content_path, 'video');
      } else if (item.content_type === 'attachment') {
        setVideoUrl(null);
        getSignedUrl(item.content_path, 'attachment');
      }
    } else {
      setVideoUrl(null);
      setAttachmentInfo(null);
    }

    return () => { isMounted = false; };
  }, [item.content_path, item.content_type]);

  const handleConfirmTypeChange = () => {
    if (pendingContentType) {
      onUpdate(lessonId, item.id, { content_type: pendingContentType, content_path: undefined, quiz: undefined });
      setPendingContentType(null);
    }
  };

  const handleTypeChangeRequest = (newType: 'video' | 'attachment' | 'assignment' | 'quiz') => {
    let hasContent = false;
    if (item.content_type === 'quiz') {
      hasContent = (item.quiz?.questions?.length || 0) > 0;
    } else if (item.content_type === 'assignment') {
      hasContent = !!item.content_path && item.content_path !== '<p><br></p>';
    } else { // Video or Attachment
      hasContent = !!item.content_path;
    }

    if (hasContent && newType !== item.content_type) {
      setPendingContentType(newType);
      setIsConfirmingChange(true);
    } else {
      onUpdate(lessonId, item.id, { content_type: newType, content_path: undefined, quiz: undefined });
    }
  };

  const handleVideoUpload = async (file: File) => {
    if (!file) return;

    setIsUploading(true);
    const filePath = `lesson-videos/${courseId || 'new'}/${lessonId}/${item.id}/${crypto.randomUUID()}/${file.name}`;

    try {
      const { error } = await supabase.storage.from('dil-lms').upload(filePath, file);
      if (error) throw error;
      onUpdate(lessonId, item.id, { content_path: filePath });
      toast.success('Video uploaded successfully!');
    } catch (error: any) {
      toast.error('Video upload failed.', { description: error.message });
    } finally {
      setIsUploading(false);
    }
  };

  const handleAttachmentUpload = async (file: File) => {
    if (!file) return;

    setIsUploading(true);
    const filePath = `lesson-attachments/${courseId || 'new'}/${lessonId}/${item.id}/${crypto.randomUUID()}/${file.name}`;

    try {
      const { error } = await supabase.storage.from('dil-lms').upload(filePath, file);
      if (error) throw error;
      onUpdate(lessonId, item.id, { content_path: filePath });
      toast.success('Attachment uploaded successfully!');
    } catch (error: any) {
      toast.error('Attachment upload failed.', { description: error.message });
    } finally {
      setIsUploading(false);
    }
  };

  const handleAssignmentImageUpload = useCallback(async (file: File) => {
    if (!file) throw new Error("No file selected.");
    const filePath = `assignment-assets/images/${courseId || 'new'}/${lessonId}/${item.id}/${crypto.randomUUID()}/${file.name}`;
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
  }, [courseId, lessonId, item.id]);

  const handleAssignmentFileUpload = useCallback(async (file: File) => {
    if (!file) throw new Error("No file selected.");
    const filePath = `assignment-assets/files/${courseId || 'new'}/${lessonId}/${item.id}/${crypto.randomUUID()}/${file.name}`;
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
  }, [courseId, lessonId, item.id]);
  
  // All the state and handlers for video, attachment, quiz, etc. will go here.
  // For now, it's a placeholder.
    const renderContentEditor = () => {
    switch (item.content_type) {
      case 'video':
        if (videoUrl) {
          return (
            <div className="space-y-2 mt-2">
              <video controls src={videoUrl} className="w-full rounded-lg" />
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => {
                  setVideoUrl(null);
                  onUpdate(lessonId, item.id, { content_path: undefined });
                }}
              >
                Remove Video
              </Button>
            </div>
          );
        }
        return (
          <div className="w-full">
            <div
              className={`w-full text-center p-6 border-2 border-dashed rounded-lg transition-colors cursor-pointer hover:border-primary/50 border-border`}
              onClick={() => {
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = 'video/mp4,video/quicktime';
                input.onchange = (e) => {
                  const file = (e.target as HTMLInputElement).files?.[0];
                  if (file) handleVideoUpload(file);
                };
                input.click();
              }}
            >
              <div className="flex flex-col items-center gap-2 text-muted-foreground">
                <UploadCloud className="h-8 w-8" />
                <p className="text-sm">{isUploading ? "Uploading..." : "Upload Video (MP4, MOV)"}</p>
                <p className="text-xs text-muted-foreground">Max file size: 500 MB</p>
              </div>
            </div>
          </div>
        );
      case 'attachment':
        if (attachmentInfo) {
          return (
            <div className="flex items-center justify-between p-3 rounded-lg bg-background border mt-2">
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
                  onUpdate(lessonId, item.id, { content_path: undefined });
                }}
              >
                Remove
              </Button>
            </div>
          );
        }
        return (
          <div className="w-full">
            <div
              className={`w-full text-center p-6 border-2 border-dashed rounded-lg transition-colors cursor-pointer hover:border-primary/50 border-border`}
              onClick={() => {
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = '.pdf,.doc,.docx,.xls,.xlsx,.zip';
                input.onchange = (e) => {
                  const file = (e.target as HTMLInputElement).files?.[0];
                  if (file) handleAttachmentUpload(file);
                };
                input.click();
              }}
            >
              <div className="flex flex-col items-center gap-2 text-muted-foreground">
                <UploadCloud className="h-8 w-8" />
                <p className="text-sm">{isUploading ? "Uploading..." : "Upload Attachment (PDF, DOC, ZIP)"}</p>
                <p className="text-xs text-muted-foreground">Max file size: 10 MB</p>
              </div>
            </div>
          </div>
        );
      case 'assignment':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor={`assignment-title-${item.id}`}>Assignment Title</Label>
              <Input
                id={`assignment-title-${item.id}`}
                value={item.title}
                onChange={(e) => onUpdate(lessonId, item.id, { title: e.target.value })}
                placeholder="Enter assignment title"
              />
            </div>
            <div>
              <Label htmlFor={`assignment-due-date-${item.id}`}>Due Date</Label>
              <div className="grid grid-cols-2 gap-4">
                <div className="relative">
                  <Label htmlFor={`assignment-date-${item.id}`}>Date</Label>
                  <DatePicker
                    value={item.due_date ? new Date(item.due_date) : undefined}
                    onChange={(date) => {
                      if (date) {
                        const currentTime = item.due_date ? new Date(item.due_date) : new Date();
                        const newDateTime = new Date(date);
                        newDateTime.setHours(currentTime.getHours(), currentTime.getMinutes(), 0, 0);
                        onUpdate(lessonId, item.id, { due_date: newDateTime.toISOString() });
                      } else {
                        onUpdate(lessonId, item.id, { due_date: undefined });
                      }
                    }}
                    placeholder="Select date"
                  />
                </div>
                <div className="relative">
                  <Label htmlFor={`assignment-time-${item.id}`}>Time</Label>
                  <TimePicker
                    value={item.due_date ? new Date(item.due_date).toTimeString().slice(0, 5) : ''}
                    onChange={(time) => {
                      if (item.due_date && time) {
                        const [hours, minutes] = time.split(':');
                        const newDateTime = new Date(item.due_date);
                        newDateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
                        onUpdate(lessonId, item.id, { due_date: newDateTime.toISOString() });
                      }
                    }}
                    placeholder="Select time"
                  />
                </div>
              </div>
            </div>
            <div>
              <Label htmlFor={`assignment-content-${item.id}`}>Assignment Details</Label>
              <RichTextEditor
                value={item.content_path || ''}
                onChange={(content) => onUpdate(lessonId, item.id, { content_path: content })}
                placeholder="Write the assignment details here..."
                onImageUpload={handleAssignmentImageUpload}
                onFileUpload={handleAssignmentFileUpload}
              />
            </div>
          </div>
        );
      case 'quiz':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor={`quiz-title-${item.id}`}>Quiz Title</Label>
              <Input
                id={`quiz-title-${item.id}`}
                value={item.title}
                onChange={(e) => onUpdate(lessonId, item.id, { title: e.target.value })}
                placeholder="Enter quiz title"
              />
            </div>
            <div>
              <Label htmlFor={`quiz-due-date-${item.id}`}>Due Date</Label>
              <div className="grid grid-cols-2 gap-4">
                <div className="relative">
                  <Label htmlFor={`quiz-date-${item.id}`}>Date</Label>
                  <DatePicker
                    value={item.due_date ? new Date(item.due_date) : undefined}
                    onChange={(date) => {
                      if (date) {
                        const currentTime = item.due_date ? new Date(item.due_date) : new Date();
                        const newDateTime = new Date(date);
                        newDateTime.setHours(currentTime.getHours(), currentTime.getMinutes(), 0, 0);
                        onUpdate(lessonId, item.id, { due_date: newDateTime.toISOString() });
                      } else {
                        onUpdate(lessonId, item.id, { due_date: undefined });
                      }
                    }}
                    placeholder="Select date"
                  />
                </div>
                <div className="relative">
                  <Label htmlFor={`quiz-time-${item.id}`}>Time</Label>
                  <TimePicker
                    value={item.due_date ? new Date(item.due_date).toTimeString().slice(0, 5) : ''}
                    onChange={(time) => {
                      if (item.due_date && time) {
                        const [hours, minutes] = time.split(':');
                        const newDateTime = new Date(item.due_date);
                        newDateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
                        onUpdate(lessonId, item.id, { due_date: newDateTime.toISOString() });
                      }
                    }}
                    placeholder="Select time"
                  />
                </div>
              </div>
            </div>
            <div>
              <Label htmlFor={`quiz-builder-${item.id}`}>Quiz Questions</Label>
              <QuizBuilder
                quiz={item.quiz || { id: '', questions: [] }}
                onQuizChange={(quiz) => onUpdate(lessonId, item.id, { quiz })}
              />
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  const getContentTypeIcon = (type: string) => {
    switch (type) {
      case 'video': return '🎥';
      case 'assignment': return '📝';
      case 'quiz': return '❓';
      case 'attachment': return '📎';
      default: return '📄';
    }
  };

  const getContentTypeColor = (type: string) => {
    switch (type) {
      case 'video': return 'bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-950 dark:border-blue-800 dark:text-blue-300';
      case 'assignment': return 'bg-orange-50 border-orange-200 text-orange-700 dark:bg-orange-950 dark:border-orange-800 dark:text-orange-300';
      case 'quiz': return 'bg-purple-50 border-purple-200 text-purple-700 dark:bg-purple-950 dark:border-purple-800 dark:text-purple-300';
      case 'attachment': return 'bg-green-50 border-green-200 text-green-700 dark:bg-green-950 dark:border-green-800 dark:text-green-300';
      default: return 'bg-gray-50 border-gray-200 text-gray-700 dark:bg-gray-950 dark:border-gray-800 dark:text-gray-300';
    }
  };

  return (
    <div className={`w-full p-6 rounded-2xl border-2 transition-all duration-300 hover:shadow-xl ${getContentTypeColor(item.content_type)}`}>
      <div className="flex items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-4 flex-1">
          <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-white/80 dark:bg-black/40 shadow-sm">
            <span className="text-2xl">{getContentTypeIcon(item.content_type)}</span>
          </div>
          <Input
            value={item.title}
            onChange={(e) => onUpdate(lessonId, item.id, { title: e.target.value })}
            placeholder={`${item.content_type.charAt(0).toUpperCase() + item.content_type.slice(1)} Title`}
            className="font-semibold text-lg bg-white/60 dark:bg-black/30 border-0 focus-visible:ring-2 focus-visible:ring-current/30 rounded-xl px-4 py-3 placeholder:text-gray-500 dark:placeholder:text-gray-400"
          />
        </div>
        <div className="flex items-center gap-3">
          <Select
            value={item.content_type}
            onValueChange={handleTypeChangeRequest}
          >
            <SelectTrigger className="w-[140px] h-10 rounded-xl bg-white/60 dark:bg-black/30 border-2 border-current/20 text-sm font-medium shadow-sm hover:shadow-md transition-all duration-300">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="rounded-2xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-2xl">
              <SelectItem value="video" className="rounded-xl hover:bg-blue-50 hover:text-gray-900 dark:hover:bg-blue-900/20 dark:hover:text-white transition-colors">🎥 Video</SelectItem>
              <SelectItem value="attachment" className="rounded-xl hover:bg-green-50 hover:text-gray-900 dark:hover:bg-green-900/20 dark:hover:text-white transition-colors">📎 Attachment</SelectItem>
              <SelectItem value="assignment" className="rounded-xl hover:bg-orange-50 hover:text-gray-900 dark:hover:bg-orange-900/20 dark:hover:text-white transition-colors">📝 Assignment</SelectItem>
              <SelectItem value="quiz" className="rounded-xl hover:bg-purple-50 hover:text-gray-900 dark:hover:bg-purple-900/20 dark:hover:text-white transition-colors">❓ Quiz</SelectItem>
            </SelectContent>
          </Select>
          {isRemovable && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onRemove(lessonId, item.id)}
              className="h-10 w-10 text-current/60 hover:text-current hover:bg-white/40 dark:hover:bg-black/40 rounded-xl transition-all duration-300 hover:scale-110"
            >
              <X className="w-5 h-5" />
            </Button>
          )}
        </div>
      </div>
      
      <div className="w-full bg-white/40 dark:bg-black/30 rounded-2xl p-6 border-2 border-current/10 shadow-sm relative">
        {/* Show due date for assignments and quizzes */}
        {(item.content_type === 'assignment' || item.content_type === 'quiz') && item.due_date && (
          <div className="mb-6 p-3 bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl shadow-sm">
            <div className="flex items-center gap-2 text-sm text-yellow-700 dark:text-yellow-300">
              <CalendarIcon className="h-4 w-4 flex-shrink-0" />
              <span className="font-medium">Due:</span>
              <span className="font-semibold">{format(new Date(item.due_date), "PPP 'at' p")}</span>
            </div>
          </div>
        )}
        <div className="space-y-6">
          {renderContentEditor()}
        </div>
      </div>

      <AlertDialog open={isConfirmingChange} onOpenChange={setIsConfirmingChange}>
        <AlertDialogContent className="rounded-2xl border-2 border-gray-200 dark:border-gray-700">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg font-semibold">Are you sure you want to switch content type?</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-600 dark:text-gray-400">
              Your current content will be lost. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmTypeChange} className="rounded-xl">Continue</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
});
LessonContentItemComponent.displayName = "LessonContentItem";
// #endregion

interface LessonContainerProps {
  lesson: CourseLesson;
  sectionId: string;
  onUpdate: (sectionId: string, lessonId: string, updatedLesson: Partial<CourseLesson>) => void;
  onRemove: (sectionId: string, lessonId: string) => void;
  isRemovable: boolean;
  dragHandleProps: any;
  onToggleCollapse: (sectionId: string, lessonId: string) => void;
  courseId: string | undefined;
  onUpdateContentItem: (lessonId: string, itemId: string, updatedItem: Partial<LessonContentItem>) => void;
  onRemoveContentItem: (lessonId: string, itemId: string) => void;
  onShowContentTypeSelector: (lessonId: string) => void;
}

const LessonContainer = memo(({ lesson, sectionId, onUpdate, onRemove, isRemovable, dragHandleProps, onToggleCollapse, courseId, onUpdateContentItem, onRemoveContentItem, onShowContentTypeSelector }: LessonContainerProps) => {

  return (
    <>
      <div className="p-6 rounded-2xl bg-gradient-to-br from-card to-card/50 dark:bg-card border-2 border-gray-200 dark:border-gray-700 shadow-lg hover:shadow-xl space-y-6 transition-all duration-300 group">
        {/* Lesson Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 flex-1">
            <div {...dragHandleProps} className="cursor-move pt-2.5 opacity-60 hover:opacity-100 transition-opacity hover:scale-110">
              <GripVertical className="text-primary w-5 h-5" />
            </div>
            <div className="flex-1 space-y-3">
              <Input
                value={lesson.title}
                onChange={(e) => onUpdate(sectionId, lesson.id, { title: e.target.value })}
                placeholder="Lesson Title"
                className="font-semibold text-lg border-0 bg-transparent px-0 focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-muted-foreground/60 text-gray-900 dark:text-white"
              />
              <Textarea
                value={lesson.overview || ''}
                onChange={(e) => onUpdate(sectionId, lesson.id, { overview: e.target.value })}
                placeholder="Lesson overview or summary (optional)"
                rows={2}
                className="text-sm resize-none border-0 bg-white/50 dark:bg-gray-800/50 rounded-xl px-4 py-3 focus-visible:ring-2 focus-visible:ring-primary/20 text-gray-700 dark:text-gray-300"
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isRemovable && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onRemove(sectionId, lesson.id)}
                className="h-9 w-9 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-xl transition-all duration-300 hover:scale-105"
              >
                <X className="w-4 h-4" />
              </Button>
            )}
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => onToggleCollapse(sectionId, lesson.id)}
              className="h-9 w-9 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-xl transition-all duration-300 hover:scale-105"
            >
              {lesson.isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
            </Button>
          </div>
        </div>

        {/* Content Management */}
        {!lesson.isCollapsed && (
          <div className="space-y-6 ml-8">
            {/* Add Content Button */}
            <div className="flex items-center justify-between p-6 bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 rounded-2xl border-2 border-primary/20 hover:border-primary/30 transition-all duration-300 group">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-primary/100 to-primary/200 dark:from-primary-900/30 dark:to-primary-800/30 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <Plus className="w-6 h-6 text-primary-700 dark:text-primary-300" />
                </div>
                <div>
                  <h4 className="text-lg font-semibold text-gray-900 dark:text-white">Add Content</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-300">Enhance your lesson with videos, assignments, quizzes, or attachments</p>
                </div>
              </div>
                  <Button
                onClick={() => onShowContentTypeSelector(lesson.id)}
                className="h-11 px-6 rounded-xl bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5 hover:scale-105"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Content
                  </Button>
              </div>

            {/* Existing Content Items */}
            {lesson.contentItems.length > 0 ? (
              <div className="space-y-4">
              {lesson.contentItems.map((item) => (
                <LessonContentItemComponent
                  key={item.id}
                  item={item}
                  lessonId={lesson.id}
                  sectionId={sectionId}
                  onUpdate={onUpdateContentItem}
                  onRemove={onRemoveContentItem}
                  isRemovable={true}
                  courseId={courseId}
                />
              ))}
            </div>
            ) : (
              <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 rounded-full flex items-center justify-center">
                  <Plus className="w-10 h-10 text-gray-400 dark:text-gray-500" />
                </div>
                <p className="text-lg font-medium mb-2">No content added yet</p>
                <p className="text-sm text-gray-400 dark:text-gray-500 mb-4">Click "Add Content" to get started</p>
                <Button
                  onClick={() => onShowContentTypeSelector(lesson.id)}
                  variant="outline"
                  className="h-10 px-6 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-primary hover:text-primary transition-all duration-300 hover:scale-105"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add First Content
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
});
LessonContainer.displayName = "LessonContainer";
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
      question_text: '',
      question_type: 'single_choice',
      options: [],
      position: (quiz.questions.length || 0) + 1
    };
    onQuizChange({ ...quiz, questions: [...quiz.questions, newQuestion] });
  };

  const updateQuestion = (qIndex: number, text: string) => {
    const updatedQuestions = quiz.questions.map((q, i) => i === qIndex ? { ...q, question_text: text } : q);
    onQuizChange({ ...quiz, questions: updatedQuestions });
  };
  
  const updateQuestionType = (qIndex: number, type: 'single_choice' | 'multiple_choice' | 'text_answer') => {
    const updatedQuestions = quiz.questions.map((q, i) => {
      if (i === qIndex) {
        // If switching to single choice and there are multiple correct answers, keep only the first one
        let updatedOptions = q.options;
        if (type === 'single_choice') {
          const correctOptions = q.options.filter(opt => opt.is_correct);
          if (correctOptions.length > 1) {
            updatedOptions = q.options.map((opt, optIndex) => ({
              ...opt,
              is_correct: optIndex === q.options.findIndex(o => o.is_correct)
            }));
          }
        } else if (type === 'text_answer') {
          // For text answer questions, we don't need options
          updatedOptions = [];
        }
        return { ...q, question_type: type, options: updatedOptions };
      }
      return q;
    });
    onQuizChange({ ...quiz, questions: updatedQuestions });
  };
  
  const removeQuestion = (qIndex: number) => {
    const updatedQuestions = quiz.questions.filter((_, i) => i !== qIndex);
    onQuizChange({ ...quiz, questions: updatedQuestions });
  };
  
  const addOption = (qIndex: number) => {
    const question = quiz.questions[qIndex];
    const newOption: QuestionOption = { 
      id: Date.now().toString(), 
      option_text: '', 
      is_correct: question.options.length === 0, // Default first option to correct
      position: (question.options.length || 0) + 1
    };
    const updatedQuestions = quiz.questions.map((q, i) => i === qIndex ? { ...q, options: [...q.options, newOption] } : q);
    onQuizChange({ ...quiz, questions: updatedQuestions });
  };

  const updateOption = (qIndex: number, oIndex: number, text: string) => {
    const updatedQuestions = quiz.questions.map((q, i) => i === qIndex ? {
      ...q,
      options: q.options.map((opt, j) => j === oIndex ? { ...opt, option_text: text } : opt)
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
    const question = quiz.questions[qIndex];
    const updatedQuestions = quiz.questions.map((q, i) => {
      if (i === qIndex) {
        if (q.question_type === 'single_choice') {
          // For single choice, only one option can be correct
          return { 
            ...q, 
            options: q.options.map(opt => ({...opt, is_correct: opt.id === optionId})) 
          };
        } else {
          // For multiple choice, toggle the option
          return { 
            ...q, 
            options: q.options.map(opt => 
              opt.id === optionId ? {...opt, is_correct: !opt.is_correct} : opt
            ) 
          };
        }
      }
      return q;
    });
    onQuizChange({ ...quiz, questions: updatedQuestions });
  };
  
  return (
    <div className="w-full space-y-6">
      {quiz.questions.map((question, qIndex) => (
        <Card key={question.id} className="overflow-hidden border-2 border-gray-200 dark:border-gray-700 shadow-lg hover:shadow-xl transition-all duration-300">
          <CardHeader className="bg-gradient-to-r from-purple-50 to-purple-100/50 dark:from-purple-900/10 dark:to-purple-800/10 border-b border-purple-200/50 dark:border-purple-700/30 p-6">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-semibold text-purple-700 dark:text-purple-300">
                  {qIndex + 1}
                </span>
              </div>
              <Input
                value={question.question_text}
                onChange={(e) => updateQuestion(qIndex, e.target.value)}
                placeholder={`Question ${qIndex + 1}`}
                className="flex-1 border-0 bg-white/60 dark:bg-gray-800/60 rounded-xl px-4 py-3 focus-visible:ring-2 focus-visible:ring-purple-500/20 text-gray-900 dark:text-white"
              />
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => removeQuestion(qIndex)}
                className="h-10 w-10 hover:bg-red-100 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400 rounded-xl transition-all duration-300 hover:scale-105"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
            
            {/* Question Type Selector */}
            <div className="mt-4 flex items-center gap-4">
              <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Question Type:
              </Label>
              <Select
                value={question.question_type}
                onValueChange={(value: 'single_choice' | 'multiple_choice') => updateQuestionType(qIndex, value)}
              >
                <SelectTrigger className="w-48 h-9 border-2 border-purple-200 dark:border-purple-700 rounded-lg bg-white/60 dark:bg-gray-800/60">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-2xl">
                  <SelectItem value="single_choice" className="rounded-lg hover:bg-purple-50 hover:text-gray-900 dark:hover:bg-purple-900/20 dark:hover:text-white transition-colors">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-purple-500 rounded-full"></div>
                      Single Choice
                    </div>
                  </SelectItem>
                  <SelectItem value="multiple_choice" className="rounded-lg hover:bg-purple-50 hover:text-gray-900 dark:hover:bg-purple-900/20 dark:hover:text-white transition-colors">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-purple-500 rounded"></div>
                      Multiple Choice
                    </div>
                  </SelectItem>
                  <SelectItem value="text_answer" className="rounded-lg hover:bg-purple-50 hover:text-gray-900 dark:hover:bg-purple-900/20 dark:hover:text-white transition-colors">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-purple-500 bg-purple-500"></div>
                      Text Answer
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              
              <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                {question.question_type === 'single_choice' ? (
                  <>
                    <div className="w-3 h-3 border-2 border-purple-500 rounded-full"></div>
                    <span>One correct answer</span>
                  </>
                ) : question.question_type === 'multiple_choice' ? (
                  <>
                    <div className="w-3 h-3 border-2 border-purple-500 rounded"></div>
                    <span>Multiple correct answers</span>
                  </>
                ) : (
                  <>
                    <div className="w-3 h-3 border-2 border-purple-500 bg-purple-500"></div>
                    <span>Manual grading required</span>
                  </>
                )}
              </div>
              
              {/* Question Type Badge */}
              <Badge 
                variant={question.question_type === 'single_choice' ? 'secondary' : question.question_type === 'multiple_choice' ? 'default' : 'outline'}
                className={`text-xs ${
                  question.question_type === 'single_choice' 
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border-blue-200 dark:border-blue-700' 
                    : question.question_type === 'multiple_choice'
                    ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 border-purple-200 dark:border-purple-700'
                    : 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300 border-orange-200 dark:border-orange-700'
                }`}
              >
                {question.question_type === 'single_choice' ? 'Single Choice' : question.question_type === 'multiple_choice' ? 'Multiple Choice' : 'Text Answer'}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            {question.question_type === 'text_answer' ? (
              <div className="p-6 bg-gradient-to-r from-orange-50 to-orange-100/50 dark:from-orange-900/10 dark:to-orange-800/10 rounded-xl border border-orange-200/50 dark:border-orange-700/30">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center">
                    <span className="text-sm font-semibold text-orange-700 dark:text-orange-300">📝</span>
                  </div>
                  <div>
                    <h4 className="font-semibold text-orange-900 dark:text-orange-100">Text Answer Question</h4>
                    <p className="text-sm text-orange-700 dark:text-orange-300">Students will provide written answers that require manual grading by teachers</p>
                  </div>
                </div>
                <div className="text-xs text-orange-600 dark:text-orange-400">
                  This question will appear in the manual grading queue for teachers
                </div>
              </div>
            ) : (
              <>
                {question.options.map((option, oIndex) => (
                  <div key={option.id} className="flex items-center gap-3 p-4 bg-gradient-to-r from-gray-50 to-gray-100/50 dark:from-gray-800/50 dark:to-gray-700/50 rounded-xl border border-gray-200/50 dark:border-gray-600/30 hover:border-gray-300 dark:hover:border-gray-500 transition-all duration-300">
                    <Input
                      value={option.option_text}
                      onChange={(e) => updateOption(qIndex, oIndex, e.target.value)}
                      placeholder={`Option ${oIndex + 1}`}
                      className="flex-1 border-0 bg-white/60 dark:bg-gray-800/60 rounded-xl px-4 py-3 focus-visible:ring-2 focus-visible:ring-purple-500/20 text-gray-900 dark:text-white"
                    />
                    <Button
                      variant={option.is_correct ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setCorrectOption(qIndex, option.id)}
                      className={`h-9 px-4 rounded-xl transition-all duration-300 hover:scale-105 ${
                        option.is_correct 
                          ? 'bg-green-600 hover:bg-green-700 text-white shadow-lg' 
                          : 'border-green-300 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20'
                      }`}
                    >
                      {option.is_correct ? '✓ Correct' : question.question_type === 'multiple_choice' ? 'Add Correct' : 'Mark Correct'}
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => removeOption(qIndex, oIndex)}
                      className="h-9 w-9 hover:bg-red-100 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400 rounded-xl transition-all duration-300 hover:scale-105"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => addOption(qIndex)}
                  className="w-full h-10 border-2 border-dashed border-purple-300 dark:border-purple-600 rounded-xl text-purple-600 dark:text-purple-400 hover:bg-purple-50 hover:text-purple-700 dark:hover:bg-purple-900/10 dark:hover:text-purple-300 hover:border-purple-400 dark:hover:border-purple-500 transition-all duration-300 group hover:scale-105"
                >
                  <Plus className="w-4 h-4 mr-2 group-hover:scale-110 transition-transform duration-300" />
                  Add Option
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      ))}
      <Button 
        onClick={addQuestion}
        className="w-full h-12 border-2 border-dashed border-purple-300 dark:border-purple-600 rounded-2xl text-purple-600 dark:text-purple-400 hover:bg-purple-50 hover:text-purple-700 dark:hover:bg-purple-900/10 dark:hover:text-purple-300 hover:border-purple-400 dark:hover:border-purple-500 transition-all duration-300 group hover:scale-105"
      >
        <Plus className="w-5 h-5 mr-2 group-hover:scale-110 transition-transform duration-300" />
        Add Question
      </Button>
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
  const [persistentFeedback, setPersistentFeedback] = useState<string | null>(null);
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
  const [showContentTypeSelector, setShowContentTypeSelector] = useState(false);
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null);
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
            overview: '',
            isCollapsed: false,
            contentItems: [],
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
                lessons:course_lessons (
                  *,
                  contentItems:course_lesson_content (
                    *,
                    quiz:quiz_questions(
                      *,
                      options:question_options(*)
                    )
                  )
                )
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
    
            navigate('/dashboard/courses');
            return;
          }
          
                    if (data) {
    
            if (data.review_feedback) {
              setPersistentFeedback(data.review_feedback);
            }
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
                  .map((l: any) => ({
                    ...l,
                    contentItems: l.contentItems
                      .sort((a: any, b: any) => a.position - b.position)
                      .map((ci: any) => {
                        let quizData: QuizData | undefined = undefined;
                        if (ci.content_type === 'quiz' && ci.quiz && ci.quiz.length > 0) {
                          const quizQuestions = ci.quiz.map((q: any) => ({
                            ...q,
                            question_type: q.question_type || 'single_choice', // Default for backward compatibility
                            options: q.options.sort((a: any, b: any) => a.position - b.position)
                          }));
                          quizData = { id: ci.id, questions: quizQuestions };
                        }
                        return {
                          id: ci.id,
                          title: ci.title,
                          content_type: ci.content_type,
                          content_path: ci.content_path,
                          due_date: ci.due_date,
                          quiz: quizData
                        };
                      })
                  }))
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
    } finally {
      setIsUploading(false);
    }
  };

  const saveCourseData = async (courseToSave: CourseData): Promise<string | null> => {
    if (!user) {
      toast.error("You must be logged in to save a course.");
      throw new Error("User not logged in");
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
      const { data, error } = await supabase.from('courses').update(courseDetails).eq('id', courseToSave.id!).select('id').single();
      savedCourse = data;
      courseError = error;
    } else {
      courseDetails.author_id = user.id;
      const { data, error } = await supabase.from('courses').insert(courseDetails).select('id').single();
      savedCourse = data;
      courseError = error;
    }

    if (courseError) throw courseError;
    if (!savedCourse) throw new Error("Failed to save course and retrieve its ID.");

    const currentCourseId = savedCourse.id;

    // Log course action
    if (user) {
      try {
        await AccessLogService.logCourseAction(
          user.id,
          user.email || 'unknown@email.com',
          isUpdate ? 'updated' : 'created',
          currentCourseId,
          courseToSave.title
        );
      } catch (logError) {
        console.error('Error logging course action:', logError);
      }
    }

    // A. Delete existing curriculum for this course to handle reordering/deletions
    await supabase.from('course_sections').delete().eq('course_id', currentCourseId);

    // B. Re-insert the full curriculum from the current state
    for (const [sectionIndex, section] of courseToSave.sections.entries()) {
      const { data: savedSection, error: sectionError } = await supabase
        .from('course_sections')
        .insert({ course_id: currentCourseId, title: section.title, overview: section.overview, position: sectionIndex })
        .select('id').single();
      
      if (sectionError) throw sectionError;
      if (!savedSection) throw new Error("Failed to save a course section.");

      for (const [lessonIndex, lesson] of section.lessons.entries()) {
        const { data: savedLesson, error: lessonError } = await supabase
            .from('course_lessons')
            .insert({ section_id: savedSection.id, title: lesson.title, overview: lesson.overview, position: lessonIndex })
            .select('id').single();
        
        if (lessonError) throw lessonError;
        if (!savedLesson) throw new Error("Failed to save a course lesson.");

        for (const [contentIndex, item] of lesson.contentItems.entries()) {
                            const { data: savedContent, error: contentError } = await supabase
                    .from('course_lesson_content')
                    .insert({
                        lesson_id: savedLesson.id,
                        title: item.title,
                        content_type: item.content_type,
                        content_path: item.content_path,
                        position: contentIndex,
                        due_date: item.due_date,
                    })
                    .select('id').single();

            if (contentError) throw contentError;
            if (!savedContent) throw new Error("Failed to save a lesson content item.");

            if (item.content_type === 'quiz' && item.quiz) {
                for (const [qIndex, question] of item.quiz.questions.entries()) {
                    const { data: savedQuestion, error: qError } = await supabase
                        .from('quiz_questions')
                        .insert({
                            lesson_content_id: savedContent.id,
                            question_text: question.question_text,
                            question_type: question.question_type,
                            position: qIndex,
                        })
                        .select('id').single();

                    if (qError) throw qError;
                    if (!savedQuestion) throw new Error("Failed to save a quiz question.");

                    for (const [oIndex, option] of question.options.entries()) {
                        await supabase.from('question_options').insert({
                            question_id: savedQuestion.id,
                            option_text: option.option_text,
                            is_correct: option.is_correct,
                            position: oIndex,
                        });
                    }
                }
            }
        }
      }
    }

    // Now sync the members
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

    if (desiredMembers.length > 0) {
      const { error: upsertError } = await supabase
        .from('course_members')
        .upsert(desiredMembers, { onConflict: 'course_id,user_id' });
      if (upsertError) throw new Error(`There was an issue updating course members: ${upsertError.message}`);
    }

    const { data: currentDbMembers, error: fetchError } = await supabase
      .from('course_members')
      .select('user_id')
      .eq('course_id', currentCourseId);

    if (fetchError) {
      toast.warning("Could not verify member list for cleanup.", { description: fetchError.message });
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
            toast.warning("Failed to clean up old course members.", { description: deleteError.message });
          }
        } else if (currentDbMembers.length > 0 && desiredMembers.length === 0) {
            const { error: deleteAllError } = await supabase
                .from('course_members')
                .delete()
                .eq('course_id', currentCourseId);
            if (deleteAllError) {
                 toast.warning("Failed to remove all course members.", { description: deleteAllError.message });
            }
        }
    }
    
    return currentCourseId;
  };

  const saveCourseMetadataOnly = async (courseToSave: CourseData): Promise<string | null> => {
    if (!user) {
      toast.error("You must be logged in to save a course.");
      throw new Error("User not logged in");
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
      const { data, error } = await supabase.from('courses').update(courseDetails).eq('id', courseToSave.id!).select('id').single();
      savedCourse = data;
      courseError = error;
    } else {
      courseDetails.author_id = user.id;
      const { data, error } = await supabase.from('courses').insert(courseDetails).select('id').single();
      savedCourse = data;
      courseError = error;
    }

    if (courseError) throw courseError;
    if (!savedCourse) throw new Error("Failed to save course and retrieve its ID.");

    const currentCourseId = savedCourse.id;

    // Log course action
    if (user) {
      try {
        await AccessLogService.logCourseAction(
          user.id,
          user.email || 'unknown@email.com',
          isUpdate ? 'updated' : 'created',
          currentCourseId,
          courseToSave.title
        );
      } catch (logError) {
        console.error('Error logging course action:', logError);
      }
    }

    // Sync the members (this doesn't affect curriculum)
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

    if (desiredMembers.length > 0) {
      const { error: upsertError } = await supabase
        .from('course_members')
        .upsert(desiredMembers, { onConflict: 'course_id,user_id' });
      if (upsertError) throw new Error(`There was an issue updating course members: ${upsertError.message}`);
    }

    const { data: currentDbMembers, error: fetchError } = await supabase
      .from('course_members')
      .select('user_id')
      .eq('course_id', currentCourseId);

    if (fetchError) {
      toast.warning("Could not verify member list for cleanup.", { description: fetchError.message });
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
            toast.warning("Failed to clean up old course members.", { description: deleteError.message });
          }
        } else if (currentDbMembers.length > 0 && desiredMembers.length === 0) {
            const { error: deleteAllError } = await supabase
                .from('course_members')
                .delete()
                .eq('course_id', currentCourseId);
            if (deleteAllError) {
                 toast.warning("Failed to remove all course members.", { description: deleteAllError.message });
            }
        }
    }
    
    return currentCourseId;
  };

  const updateCurriculumPreservingProgress = async (courseId: string, sections: CourseSection[]) => {
    // Get existing curriculum structure
    const { data: existingSections, error: sectionsError } = await supabase
      .from('course_sections')
      .select(`
        id,
        title,
        overview,
        position,
        course_lessons (
          id,
          title,
          overview,
          position,
          course_lesson_content (
            id,
            title,
            content_type,
            content_path,
            position,
            due_date
          )
        )
      `)
      .eq('course_id', courseId)
      .order('position');
    
    if (sectionsError) throw sectionsError;
    
    // Track which existing items we've processed to handle deletions
    const processedSectionIds = new Set<string>();
    const processedLessonIds = new Set<string>();
    const processedContentIds = new Set<string>();
    
    // Update sections
    for (const [sectionIndex, section] of sections.entries()) {
      const existingSection = existingSections?.find(s => s.position === sectionIndex);
      
      if (existingSection) {
        processedSectionIds.add(existingSection.id);
        
        // Update existing section
        await supabase
          .from('course_sections')
          .update({ title: section.title, overview: section.overview })
          .eq('id', existingSection.id);
        
        // Update lessons in this section
        for (const [lessonIndex, lesson] of section.lessons.entries()) {
          const existingLesson = existingSection.course_lessons?.find(l => l.position === lessonIndex);
          
          if (existingLesson) {
            processedLessonIds.add(existingLesson.id);
            
            // Update existing lesson
            await supabase
              .from('course_lessons')
              .update({ title: lesson.title, overview: lesson.overview })
              .eq('id', existingLesson.id);
            
            // Update content items in this lesson
            for (const [contentIndex, item] of lesson.contentItems.entries()) {
              const existingContent = existingLesson.course_lesson_content?.find(c => c.position === contentIndex);
              
              if (existingContent) {
                processedContentIds.add(existingContent.id);
                
                // Update existing content item (preserves ID and progress)
                await supabase
                  .from('course_lesson_content')
                  .update({
                    title: item.title,
                    content_type: item.content_type,
                    content_path: item.content_path,
                    due_date: item.due_date
                  })
                  .eq('id', existingContent.id);
                
                // Handle quiz updates if needed
                if (item.content_type === 'quiz' && item.quiz) {
                  // Get existing quiz questions for this content item
                  const { data: existingQuestions, error: questionsError } = await supabase
                    .from('quiz_questions')
                    .select(`
                      id,
                      question_text,
                      position,
                      question_options (
                        id,
                        option_text,
                        is_correct,
                        position
                      )
                    `)
                    .eq('lesson_content_id', existingContent.id)
                    .order('position');
                  
                  if (questionsError) throw questionsError;
                  
                  // Track which questions we've processed
                  const processedQuestionIds = new Set<string>();
                  
                  // Update or create questions
                  for (const [qIndex, question] of item.quiz.questions.entries()) {
                    const existingQuestion = existingQuestions?.find(q => q.position === qIndex);
                    
                    if (existingQuestion) {
                      processedQuestionIds.add(existingQuestion.id);
                      
                      // Update existing question
                      await supabase
                        .from('quiz_questions')
                        .update({ 
                          question_text: question.question_text,
                          question_type: question.question_type
                        })
                        .eq('id', existingQuestion.id);
                      
                      // Track which options we've processed
                      const processedOptionIds = new Set<string>();
                      
                      // Update or create options
                      for (const [oIndex, option] of question.options.entries()) {
                        const existingOption = existingQuestion.question_options?.find(opt => opt.position === oIndex);
                        
                        if (existingOption) {
                          processedOptionIds.add(existingOption.id);
                          
                          // Update existing option
                          await supabase
                            .from('question_options')
                            .update({
                              option_text: option.option_text,
                              is_correct: option.is_correct
                            })
                            .eq('id', existingOption.id);
                        } else {
                          // Create new option
                          await supabase.from('question_options').insert({
                            question_id: existingQuestion.id,
                            option_text: option.option_text,
                            is_correct: option.is_correct,
                            position: oIndex
                          });
                        }
                      }
                      
                      // Clean up deleted options
                      const optionsToDelete = existingQuestion.question_options?.filter(opt => !processedOptionIds.has(opt.id)) || [];
                      if (optionsToDelete.length > 0) {
                        const optionIdsToDelete = optionsToDelete.map(opt => opt.id);
                        await supabase.from('question_options').delete().in('id', optionIdsToDelete);
                      }
                    } else {
                      // Create new question
                      const { data: newQuestion, error: qError } = await supabase
                        .from('quiz_questions')
                        .insert({
                          lesson_content_id: existingContent.id,
                          question_text: question.question_text,
                          question_type: question.question_type,
                          position: qIndex
                        })
                        .select('id')
                        .single();
                      
                      if (qError) throw qError;
                      
                      // Create options for new question
                      for (const [oIndex, option] of question.options.entries()) {
                        await supabase.from('question_options').insert({
                          question_id: newQuestion.id,
                          option_text: option.option_text,
                          is_correct: option.is_correct,
                          position: oIndex
                        });
                      }
                    }
                  }
                  
                  // Clean up deleted questions
                  const questionsToDelete = existingQuestions?.filter(q => !processedQuestionIds.has(q.id)) || [];
                  if (questionsToDelete.length > 0) {
                    const questionIdsToDelete = questionsToDelete.map(q => q.id);
                    
                    // Delete associated options first
                    for (const questionId of questionIdsToDelete) {
                      await supabase.from('question_options').delete().eq('question_id', questionId);
                    }
                    
                    // Delete questions
                    await supabase.from('quiz_questions').delete().in('id', questionIdsToDelete);
                  }
                }
              } else {
                // Create new content item
                const { data: newContent, error: contentError } = await supabase
                  .from('course_lesson_content')
                  .insert({
                    lesson_id: existingLesson.id,
                    title: item.title,
                    content_type: item.content_type,
                    content_path: item.content_path,
                    position: contentIndex,
                    due_date: item.due_date
                  })
                  .select('id')
                  .single();
                
                if (contentError) throw contentError;
                
                // Handle quiz creation if needed
                if (item.content_type === 'quiz' && item.quiz && newContent) {
                  for (const [qIndex, question] of item.quiz.questions.entries()) {
                    const { data: savedQuestion, error: qError } = await supabase
                      .from('quiz_questions')
                      .insert({
                        lesson_content_id: newContent.id,
                        question_text: question.question_text,
                        question_type: question.question_type,
                        position: qIndex
                      })
                      .select('id')
                      .single();
                    
                    if (qError) throw qError;
                    
                    for (const [oIndex, option] of question.options.entries()) {
                      await supabase.from('question_options').insert({
                        question_id: savedQuestion.id,
                        option_text: option.option_text,
                        is_correct: option.is_correct,
                        position: oIndex
                      });
                    }
                  }
                }
              }
            }
            
            // Clean up deleted content items in this lesson
            const existingContentItems = existingLesson.course_lesson_content || [];
            const contentItemsToDelete = existingContentItems.filter(content => !processedContentIds.has(content.id));
            
            if (contentItemsToDelete.length > 0) {
              const contentIdsToDelete = contentItemsToDelete.map(c => c.id);
              
              // Delete associated quiz questions and options first
              for (const contentId of contentIdsToDelete) {
                const { data: quizQuestions } = await supabase
                  .from('quiz_questions')
                  .select('id')
                  .eq('lesson_content_id', contentId);
                
                if (quizQuestions && quizQuestions.length > 0) {
                  const questionIds = quizQuestions.map(q => q.id);
                  await supabase.from('question_options').delete().in('question_id', questionIds);
                  await supabase.from('quiz_questions').delete().in('id', questionIds);
                }
              }
              
              // Delete content items
              await supabase.from('course_lesson_content').delete().in('id', contentIdsToDelete);
            }
          } else {
            // Create new lesson
            const { data: newLesson, error: lessonError } = await supabase
              .from('course_lessons')
              .insert({
                section_id: existingSection.id,
                title: lesson.title,
                overview: lesson.overview,
                position: lessonIndex
              })
              .select('id')
              .single();
            
            if (lessonError) throw lessonError;
            
            // Create content items for new lesson
            for (const [contentIndex, item] of lesson.contentItems.entries()) {
              const { data: newContent, error: contentError } = await supabase
                .from('course_lesson_content')
                .insert({
                  lesson_id: newLesson.id,
                  title: item.title,
                  content_type: item.content_type,
                  content_path: item.content_path,
                  position: contentIndex,
                  due_date: item.due_date
                })
                .select('id')
                .single();
              
              if (contentError) throw contentError;
              
              // Handle quiz creation if needed
              if (item.content_type === 'quiz' && item.quiz && newContent) {
                for (const [qIndex, question] of item.quiz.questions.entries()) {
                  const { data: savedQuestion, error: qError } = await supabase
                    .from('quiz_questions')
                    .insert({
                      lesson_content_id: newContent.id,
                      question_text: question.question_text,
                      question_type: question.question_type,
                      position: qIndex
                    })
                    .select('id')
                    .single();
                  
                  if (qError) throw qError;
                  
                  for (const [oIndex, option] of question.options.entries()) {
                    await supabase.from('question_options').insert({
                      question_id: savedQuestion.id,
                      option_text: option.option_text,
                      is_correct: option.is_correct,
                      position: oIndex
                    });
                  }
                }
              }
            }
          }
        }
        
        // Clean up deleted lessons in this section
        const existingLessons = existingSection.course_lessons || [];
        const lessonsToDelete = existingLessons.filter(lesson => !processedLessonIds.has(lesson.id));
        
        if (lessonsToDelete.length > 0) {
          const lessonIdsToDelete = lessonsToDelete.map(l => l.id);
          
          // Delete all content items in these lessons first
          for (const lessonId of lessonIdsToDelete) {
            const { data: contentItems } = await supabase
              .from('course_lesson_content')
              .select('id')
              .eq('lesson_id', lessonId);
            
            if (contentItems && contentItems.length > 0) {
              const contentIds = contentItems.map(c => c.id);
              
              // Delete associated quiz questions and options
              for (const contentId of contentIds) {
                const { data: quizQuestions } = await supabase
                  .from('quiz_questions')
                  .select('id')
                  .eq('lesson_content_id', contentId);
                
                if (quizQuestions && quizQuestions.length > 0) {
                  const questionIds = quizQuestions.map(q => q.id);
                  await supabase.from('question_options').delete().in('question_id', questionIds);
                  await supabase.from('quiz_questions').delete().in('id', questionIds);
                }
              }
              
              await supabase.from('course_lesson_content').delete().in('id', contentIds);
            }
          }
          
          // Delete lessons
          await supabase.from('course_lessons').delete().in('id', lessonIdsToDelete);
        }
      } else {
        // Create new section
        const { data: newSection, error: sectionError } = await supabase
          .from('course_sections')
          .insert({
            course_id: courseId,
            title: section.title,
            overview: section.overview,
            position: sectionIndex
          })
          .select('id')
          .single();
        
        if (sectionError) throw sectionError;
        
        // Create lessons and content items for new section
        for (const [lessonIndex, lesson] of section.lessons.entries()) {
          const { data: newLesson, error: lessonError } = await supabase
            .from('course_lessons')
            .insert({
              section_id: newSection.id,
              title: lesson.title,
              overview: lesson.overview,
              position: lessonIndex
            })
            .select('id')
            .single();
          
          if (lessonError) throw lessonError;
          
          for (const [contentIndex, item] of lesson.contentItems.entries()) {
            const { data: newContent, error: contentError } = await supabase
              .from('course_lesson_content')
              .insert({
                lesson_id: newLesson.id,
                title: item.title,
                content_type: item.content_type,
                content_path: item.content_path,
                position: contentIndex,
                due_date: item.due_date
              })
              .select('id')
              .single();
            
            if (contentError) throw contentError;
            
            // Handle quiz creation if needed
            if (item.content_type === 'quiz' && item.quiz && newContent) {
              for (const [qIndex, question] of item.quiz.questions.entries()) {
                const { data: savedQuestion, error: qError } = await supabase
                  .from('quiz_questions')
                  .insert({
                    lesson_content_id: newContent.id,
                    question_text: question.question_text,
                    question_type: question.question_type,
                    position: qIndex
                  })
                  .select('id')
                  .single();
                
                if (qError) throw qError;
                
                for (const [oIndex, option] of question.options.entries()) {
                  await supabase.from('question_options').insert({
                    question_id: savedQuestion.id,
                    option_text: option.option_text,
                    is_correct: option.is_correct,
                    position: oIndex
                  });
                }
              }
            }
          }
        }
      }
    }
    
    // Clean up deleted sections
    const sectionsToDelete = existingSections?.filter(section => !processedSectionIds.has(section.id)) || [];
    
    if (sectionsToDelete.length > 0) {
      const sectionIdsToDelete = sectionsToDelete.map(s => s.id);
      
      // Delete all lessons in these sections first
      for (const sectionId of sectionIdsToDelete) {
        const { data: lessons } = await supabase
          .from('course_lessons')
          .select('id')
          .eq('section_id', sectionId);
        
        if (lessons && lessons.length > 0) {
          const lessonIds = lessons.map(l => l.id);
          
          // Delete all content items in these lessons
          for (const lessonId of lessonIds) {
            const { data: contentItems } = await supabase
              .from('course_lesson_content')
              .select('id')
              .eq('lesson_id', lessonId);
            
            if (contentItems && contentItems.length > 0) {
              const contentIds = contentItems.map(c => c.id);
              
              // Delete associated quiz questions and options
              for (const contentId of contentIds) {
                const { data: quizQuestions } = await supabase
                  .from('quiz_questions')
                  .select('id')
                  .eq('lesson_content_id', contentId);
                
                if (quizQuestions && quizQuestions.length > 0) {
                  const questionIds = quizQuestions.map(q => q.id);
                  await supabase.from('question_options').delete().in('question_id', questionIds);
                  await supabase.from('quiz_questions').delete().in('id', questionIds);
                }
              }
              
              await supabase.from('course_lesson_content').delete().in('id', contentIds);
            }
          }
          
          await supabase.from('course_lessons').delete().in('id', lessonIds);
        }
      }
      
      // Delete sections
      await supabase.from('course_sections').delete().in('id', sectionIdsToDelete);
    }
  };

  const saveCourseWithCurriculum = async (courseToSave: CourseData): Promise<string | null> => {
    if (!user) {
      toast.error("You must be logged in to save a course.");
      throw new Error("User not logged in");
    }

    const isUpdate = !!courseToSave.id;
    const isDraftOfPublished = !!courseToSave.published_course_id;

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
      const { data, error } = await supabase.from('courses').update(courseDetails).eq('id', courseToSave.id!).select('id').single();
      savedCourse = data;
      courseError = error;
    } else {
      courseDetails.author_id = user.id;
      const { data, error } = await supabase.from('courses').insert(courseDetails).select('id').single();
      savedCourse = data;
      courseError = error;
    }

    if (courseError) throw courseError;
    if (!savedCourse) throw new Error("Failed to save course and retrieve its ID.");

    const currentCourseId = savedCourse.id;

    // Check if this is the same course scenario (admin unpublish/republish)
    const isSameCourse = courseToSave.id === courseToSave.published_course_id;
    
    // Save curriculum if:
    // 1. This is NOT a draft of a published course (new course or teacher draft), OR
    // 2. This IS the same course scenario (admin unpublish/republish) - we need to save changes
    const shouldSaveCurriculum = !isDraftOfPublished || isSameCourse;
    
    if (shouldSaveCurriculum) {
      if (isSameCourse) {
        // For same course scenario, we need to update existing content items instead of deleting/recreating
        // to preserve student progress
        await updateCurriculumPreservingProgress(currentCourseId, courseToSave.sections);
      } else {
        // A. Delete existing curriculum for this course to handle reordering/deletions
        await supabase.from('course_sections').delete().eq('course_id', currentCourseId);

        // B. Re-insert the full curriculum from the current state
        for (const [sectionIndex, section] of courseToSave.sections.entries()) {
          const { data: savedSection, error: sectionError } = await supabase
          .from('course_sections')
          .insert({ course_id: currentCourseId, title: section.title, overview: section.overview, position: sectionIndex })
          .select('id').single();
        
        if (sectionError) throw sectionError;
        if (!savedSection) throw new Error("Failed to save a course section.");

        for (const [lessonIndex, lesson] of section.lessons.entries()) {
          const { data: savedLesson, error: lessonError } = await supabase
              .from('course_lessons')
              .insert({ section_id: savedSection.id, title: lesson.title, overview: lesson.overview, position: lessonIndex })
              .select('id').single();
          
          if (lessonError) throw lessonError;
          if (!savedLesson) throw new Error("Failed to save a course lesson.");

          for (const [contentIndex, item] of lesson.contentItems.entries()) {
            const { data: savedContent, error: contentError } = await supabase
                .from('course_lesson_content')
                .insert({
                    lesson_id: savedLesson.id,
                    title: item.title,
                    content_type: item.content_type,
                    content_path: item.content_path,
                    position: contentIndex,
                    due_date: item.due_date,
                })
                .select('id').single();

              if (contentError) throw contentError;
              if (!savedContent) throw new Error("Failed to save a lesson content item.");

              if (item.content_type === 'quiz' && item.quiz) {
                  for (const [qIndex, question] of item.quiz.questions.entries()) {
                      const { data: savedQuestion, error: qError } = await supabase
                          .from('quiz_questions')
                          .insert({
                              lesson_content_id: savedContent.id,
                              question_text: question.question_text,
                              question_type: question.question_type,
                              position: qIndex,
                          })
                          .select('id').single();

                      if (qError) throw qError;
                      if (!savedQuestion) throw new Error("Failed to save a quiz question.");

                      for (const [oIndex, option] of question.options.entries()) {
                          await supabase.from('question_options').insert({
                              question_id: savedQuestion.id,
                              option_text: option.option_text,
                              is_correct: option.is_correct,
                              position: oIndex,
                          });
                      }
                  }
              }
          }
        }
      }
      }
    } else {
      // Skipping curriculum save - preserving existing structure (teacher draft scenario)
    }

    // Sync the members
    // Sync the members
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

    if (desiredMembers.length > 0) {
      const { error: upsertError } = await supabase
        .from('course_members')
        .upsert(desiredMembers, { onConflict: 'course_id,user_id' });
      if (upsertError) throw new Error(`There was an issue updating course members: ${upsertError.message}`);
    }

    const { data: currentDbMembers, error: fetchError } = await supabase
      .from('course_members')
      .select('user_id')
      .eq('course_id', currentCourseId);

    if (fetchError) {
      toast.warning("Could not verify member list for cleanup.", { description: fetchError.message });
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
            toast.warning("Failed to clean up old course members.", { description: deleteError.message });
          }
        } else if (currentDbMembers.length > 0 && desiredMembers.length === 0) {
            const { error: deleteAllError } = await supabase
                .from('course_members')
                .delete()
                .eq('course_id', currentCourseId);
            if (deleteAllError) {
                 toast.warning("Failed to remove all course members.", { description: deleteAllError.message });
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
    } finally {
      setSaveAction(null);
    }
  };

  const checkContentItemsState = async (courseId: string, label: string) => {
    try {
      // First get sections for the course
      const { data: sections, error: sectionsError } = await supabase
        .from('course_sections')
        .select('id')
        .eq('course_id', courseId);
      
      if (sectionsError) {
        return;
      }
      
      if (!sections || sections.length === 0) {
        return;
      }
      
      const sectionIds = sections.map(s => s.id);
      
      // Get lessons for these sections
      const { data: lessons, error: lessonsError } = await supabase
        .from('course_lessons')
        .select('id')
        .in('section_id', sectionIds);
      
      if (lessonsError) {
        return;
      }
      
      if (!lessons || lessons.length === 0) {
        return;
      }
      
      const lessonIds = lessons.map(l => l.id);
      
      // Get content items for these lessons
      const { data: draftContent, error: draftError } = await supabase
        .from('course_lesson_content')
        .select('id, title, content_type, lesson_id')
        .in('lesson_id', lessonIds);
      
      if (draftError) {
        // Error fetching draft content
      }

      // Check published course content items if it exists
      if (courseData.published_course_id && courseData.published_course_id !== courseId) {
        const { data: publishedSections, error: publishedSectionsError } = await supabase
          .from('course_sections')
          .select('id')
          .eq('course_id', courseData.published_course_id);
        
        if (publishedSectionsError) {
          // Error fetching published sections
        } else if (publishedSections && publishedSections.length > 0) {
          const publishedSectionIds = publishedSections.map(s => s.id);
          
          const { data: publishedLessons, error: publishedLessonsError } = await supabase
            .from('course_lessons')
            .select('id')
            .in('section_id', publishedSectionIds);
          
          if (publishedLessonsError) {
            // Error fetching published lessons
          } else if (publishedLessons && publishedLessons.length > 0) {
            const publishedLessonIds = publishedLessons.map(l => l.id);
            
            const { data: publishedContent, error: publishedError } = await supabase
              .from('course_lesson_content')
              .select('id, title, content_type, lesson_id')
              .in('lesson_id', publishedLessonIds);
            
            if (publishedError) {
              // Error fetching published content
            }
          }
        }
      }
      
      // Check student progress for published course
      if (courseData.published_course_id) {
        const { data: progressData, error: progressError } = await supabase
          .from('user_content_item_progress')
          .select('id, lesson_content_id, user_id, status, progress_data, completed_at')
          .eq('course_id', courseData.published_course_id);
        
        if (progressError) {
          // Error fetching progress
        }
      }
    } catch (error) {
      console.error(`❌ [DEBUG] ${label} - Unexpected error:`, error);
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
        // This is an update to an existing published course
        // Save metadata, members, and curriculum structure (but preserve existing content)
        await saveCourseWithCurriculum({ ...courseData, status: 'Draft' });
        
        // Check if this is the same course (admin unpublish/republish scenario)
        const isSameCourse = courseData.id === courseData.published_course_id;
        
        if (isSameCourse) {
          // For same course scenario, just update the status to Published
          // The changes are already saved in the database through saveCourseWithCurriculum
          const { error: updateError } = await supabase
            .from('courses')
            .update({ status: 'Published' })
            .eq('id', courseData.id);
            
          if (updateError) {
            throw updateError;
          }
        } else {
          // For different course scenario (teacher draft), call the RPC to sync curriculum
          const { error } = await supabase.rpc('publish_draft', {
            draft_id_in: courseData.id,
            published_id_in: courseData.published_course_id,
          });
          if (error) {
            throw error;
          }
        }
        
        // Log course publishing
        if (user) {
          try {
            await AccessLogService.logCourseAction(
              user.id,
              user.email || 'unknown@email.com',
              'published',
              courseData.id,
              courseData.title
            );
          } catch (logError) {
            console.error('Error logging course publish:', logError);
          }
        }
        
        toast.success("Course published successfully!");
        navigate('/dashboard/courses');
      } else {
        // This is a new course, safe to save everything
        const savedId = await saveCourseData({ ...courseData, status: 'Published' });
        if(savedId) {
          // Log course publishing for new course
          if (user) {
            try {
              await AccessLogService.logCourseAction(
                user.id,
                user.email || 'unknown@email.com',
                'published',
                savedId,
                courseData.title
              );
            } catch (logError) {
              console.error('Error logging course publish:', logError);
            }
          }
          
          toast.success("Course published successfully!");
          navigate('/dashboard/courses');
        }
      }
    } catch (error: any) {
      toast.error('Failed to publish course.', { description: error.message });
    } finally {
      setSaveAction(null);
    }
  };

  const handleUnpublishClick = async () => {
    if (!courseData.id) return;
    setSaveAction('unpublish');
    try {
      // When unpublishing, we need to set published_course_id to the course's own ID
      // so the system knows this is a draft of an existing published course
      const updateData: any = { 
        status: 'Draft',
        published_course_id: courseData.id // Set to self to indicate this is a draft of a published course
      };
      
      const { error } = await supabase
        .from('courses')
        .update(updateData)
        .eq('id', courseData.id);

      if (error) {
        throw error;
      }
      
      // Log course unpublishing
      if (user) {
        try {
          await AccessLogService.logCourseAction(
            user.id,
            user.email || 'unknown@email.com',
            'updated', // Using 'updated' since unpublishing changes status
            courseData.id,
            courseData.title
          );
        } catch (logError) {
          console.error('Error logging course unpublish:', logError);
        }
      }
      
      toast.success("Course unpublished and saved as a draft.");
      setCourseData(prev => ({
        ...prev, 
        status: 'Draft',
        published_course_id: courseData.id // Update local state as well
      }));
    } catch (error: any) {
      toast.error('Failed to unpublish course.', { description: error.message });
    } finally {
      setSaveAction(null);
    }
  };

  const handleDeleteConfirmed = async () => {
    if (!courseData.id) return;

    try {
      // First, check if the course can be safely deleted
      const { data: safetyCheck, error: safetyError } = await supabase.rpc('can_delete_course', {
        course_id_to_check: courseData.id
      });

      if (safetyError) {
        console.warn('Safety check failed, proceeding with deletion:', safetyError);
      } else if (safetyCheck && safetyCheck.length > 0) {
        const checkResult = safetyCheck[0];
        if (!checkResult.can_delete) {
          // Show warning but allow deletion
          console.warn('Course has student data:', {
            reason: checkResult.reason,
            studentCount: Number(checkResult.student_count),
            progressCount: Number(checkResult.progress_count),
            submissionCount: Number(checkResult.submission_count)
          });
        }
      }

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

      // Try the safe delete function first
      let deleteSuccess = false;
      try {
        const { data: deleteResult, error } = await supabase.rpc('safe_delete_course', {
          course_id_to_delete: courseData.id
        });
        
        if (error) {
          console.warn('Safe delete failed, trying direct deletion:', error);
          throw error; // This will trigger the fallback
        }
        
        deleteSuccess = true;
      } catch (deleteError) {
        // If the safe delete function fails, try the direct approach as fallback
        console.warn('Safe delete failed, trying direct deletion:', deleteError);
        
        try {
          const { error: directError } = await supabase.from('courses').delete().eq('id', courseData.id);
          
          if (directError) {
            toast.error("Failed to delete course.", { description: directError.message });
            return;
          }
          
          deleteSuccess = true;
        } catch (directDeleteError: any) {
          toast.error("Failed to delete course.", { description: directDeleteError.message });
          return;
        }
      }
      
      if (!deleteSuccess) {
        toast.error("Failed to delete course.");
        return;
      }
      
      toast.success(`Course "${courseData.title}" deleted successfully.`);
      navigate('/dashboard/courses');
    } catch (error: any) {
      toast.error("Failed to delete course.", { description: error.message });
    } finally {
      setIsDeleteDialogOpen(false);
    }
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
      
      // Log course submission for review
      if (user) {
        try {
          await AccessLogService.logCourseAction(
            user.id,
            user.email || 'unknown@email.com',
            'updated', // Using 'updated' since submission changes status
            savedId,
            courseData.title
          );
        } catch (logError) {
          console.error('Error logging course submission:', logError);
        }
      }
      
      toast.success("Course submitted for review successfully!");
      // Update the local state to reflect the new status and ID if it was a new course
      setCourseData(prev => ({ ...prev, id: savedId, status: 'Under Review' }));
    } catch (error: any) {
      toast.error('Failed to submit for review.', { description: error.message });
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
      
      // Log course approval
      if (user) {
        try {
          await AccessLogService.logCourseAction(
            user.id,
            user.email || 'unknown@email.com',
            'published', // Using 'published' since approval publishes the course
            courseData.id,
            courseData.title
          );
        } catch (logError) {
          console.error('Error logging course approval:', logError);
        }
      }
      
      setPersistentFeedback(null);
      toast.success("Course approved and published successfully!");
      navigate('/dashboard/courses');
    } catch (error: any) {
      toast.error('Failed to approve submission.', { description: error.message });
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
      
      // Log course rejection
      if (user) {
        try {
          await AccessLogService.logCourseAction(
            user.id,
            user.email || 'unknown@email.com',
            'updated', // Using 'updated' since rejection changes status
            courseData.id,
            courseData.title
          );
        } catch (logError) {
          console.error('Error logging course rejection:', logError);
        }
      }
      
      setPersistentFeedback(rejectionFeedback);
      toast.success("Submission rejected.");
      setCourseData(prev => ({ ...prev, status: 'Rejected', review_feedback: rejectionFeedback }));
      setIsRejectionDialogOpen(false);
      setRejectionFeedback("");
    } catch (error: any) {
      toast.error('Failed to reject submission.', { description: error.message });
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
    const timestamp = Date.now();
    const newSection: CourseSection = {
      id: `section-${Date.now() + 1}`,
      title: 'New Section',
      lessons: [],
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
    const timestamp = Date.now();
    const newLesson: CourseLesson = {
      id: timestamp.toString(),
      title: 'New Lesson',
      overview: '',
      isCollapsed: false,
      contentItems: []
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
  const addContentItem = (lessonId: string, contentType: 'video' | 'assignment' | 'quiz' | 'attachment' = 'video') => {
    const newContentItem: LessonContentItem = {
      id: `content-${Date.now()}`,
      title: `New ${contentType.charAt(0).toUpperCase() + contentType.slice(1)}`,
      content_type: contentType,
    };
    setCourseData(prev => ({
      ...prev,
      sections: prev.sections.map(section => ({
        ...section,
        lessons: section.lessons.map(lesson =>
          lesson.id === lessonId
            ? { ...lesson, contentItems: [...lesson.contentItems, newContentItem] }
            : lesson
        ),
      })),
    }));
  };

  const updateContentItem = useCallback((lessonId: string, itemId: string, updatedItem: Partial<LessonContentItem>) => {
    setCourseData(prev => ({
      ...prev,
      sections: prev.sections.map(section => ({
        ...section,
        lessons: section.lessons.map(lesson =>
          lesson.id === lessonId
            ? {
                ...lesson,
                contentItems: lesson.contentItems.map(item =>
                  item.id === itemId ? { ...item, ...updatedItem } : item
                ),
              }
            : lesson
        ),
      })),
    }));
  }, []);

  const removeContentItem = useCallback((lessonId: string, itemId: string) => {
    setCourseData(prev => ({
      ...prev,
      sections: prev.sections.map(section => ({
        ...section,
        lessons: section.lessons.map(lesson =>
          lesson.id === lessonId
            ? { ...lesson, contentItems: lesson.contentItems.filter(item => item.id !== itemId) }
            : lesson
        ),
      })),
    }));
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

  // Content Type Selector handlers
  const handleShowContentTypeSelector = (lessonId: string) => {
    setSelectedLessonId(lessonId);
    setShowContentTypeSelector(true);
  };

  const handleContentTypeSelect = (contentType: 'video' | 'assignment' | 'quiz' | 'attachment') => {
    if (selectedLessonId) {
      addContentItem(selectedLessonId, contentType);
      setShowContentTypeSelector(false);
      setSelectedLessonId(null);
    }
  };

  const handleCloseContentTypeSelector = () => {
    setShowContentTypeSelector(false);
    setSelectedLessonId(null);
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
                    'blue'
                  } className="text-xs">
                    {courseData.status || 'Draft'}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    Last saved: 2 minutes ago
                  </span>
                </div>
                {currentUserRole === 'teacher' && courseData.status === 'Draft' && (
                    <div className="flex items-center gap-2 mt-2 text-sm text-blue-800 bg-blue-100 border border-blue-300 rounded-lg p-3 shadow-sm">
                        <Info className="h-4 w-4 text-blue-600 flex-shrink-0" />
                        <span className="font-medium">You must submit this course for admin review and approval before it can be published.</span>
                    </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={() => setIsPreviewOpen(true)}
              className="h-9 px-4 rounded-xl bg-background border border-input shadow-sm hover:shadow-lg hover:shadow-primary/10 transition-all duration-300 hover:-translate-y-0.5 hover:bg-gray-100 hover:text-gray-900 dark:hover:bg-gray-800 dark:hover:text-white"
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
                      className="h-9 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5 text-white" 
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
        {persistentFeedback && (currentUserRole === 'admin' || (currentUserRole === 'teacher' && courseData.status !== 'Under Review')) && (
          <div className="p-6 pt-6 pb-0">
            <Alert variant="destructive">
              <Terminal className="h-4 w-4" />
              <AlertTitle>
                {currentUserRole === 'admin' ? 'Requested Changes' : 'Submission Rejected'}
              </AlertTitle>
              <AlertDescription>
                {currentUserRole === 'admin' ? (
                  <>
                    <p className="font-semibold">You have requested the following changes from the teacher:</p>
                    <p className="mt-2 p-2 bg-background rounded-md">{persistentFeedback}</p>
                    <p className="mt-2 text-sm text-muted-foreground">The teacher must address this feedback and resubmit the course for it to be approved.</p>
                  </>
                ) : (
                  <>
                    <p className="font-semibold">An admin provided the following feedback:</p>
                    <p className="mt-2 p-2 bg-background rounded-md">{persistentFeedback}</p>
                    <p className="mt-2 text-sm text-muted-foreground">Please address the feedback and resubmit the course for review.</p>
                  </>
                )}
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
            <TabsContent value="details" className="space-y-8">
              {/* Basic Information Card */}
              <Card className="overflow-hidden border-0 shadow-xl bg-gradient-to-br from-card to-card/50 dark:bg-card">
                <CardHeader className="bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 border-b border-primary/10 pb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-primary/10 to-primary/20 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                      <BookOpen className="w-6 h-6 text-primary-700 dark:text-primary-300" />
                    </div>
                  <div>
                      <CardTitle className="text-2xl font-bold bg-gradient-to-r from-gray-900 via-gray-800 to-gray-700 dark:from-white dark:via-gray-100 dark:to-gray-200 bg-clip-text text-transparent">
                        Basic Information
                      </CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">
                        Set the foundation for your course with essential details
                      </p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-8 space-y-6">
                  {/* Course Title */}
                  <div className="space-y-3">
                    <label className="block text-sm font-semibold text-gray-900 dark:text-white">
                      Course Title
                      <span className="text-red-500 ml-1">*</span>
                    </label>
                    <Input
                      value={courseData.title}
                      onChange={(e) => setCourseData(prev => ({ ...prev, title: e.target.value }))}
                      onBlur={() => handleBlur('title')}
                      placeholder="Enter an engaging course title"
                      className={cn(
                        "h-12 text-lg font-medium border-2 rounded-2xl transition-all duration-300 focus:scale-[1.02] focus:shadow-lg",
                        "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700",
                        "focus:border-primary focus:ring-4 focus:ring-primary/10",
                        "placeholder:text-gray-400 dark:placeholder:text-gray-500",
                        validationErrors.title && (touchedFields.title || courseData.id) && 
                        "border-red-500 focus:border-red-500 focus:ring-red-500/10"
                      )}
                    />
                    {validationErrors.title && (touchedFields.title || courseData.id) && (
                      <div className="flex items-center gap-2 text-red-500 text-sm">
                        <div className="w-1.5 h-1.5 bg-red-500 rounded-full"></div>
                        {validationErrors.title}
                      </div>
                    )}
                  </div>
                  
                  {/* Course Subtitle */}
                  <div className="space-y-3">
                    <label className="block text-sm font-semibold text-gray-900 dark:text-white">
                      Course Subtitle
                      <span className="text-red-500 ml-1">*</span>
                    </label>
                    <Input
                      value={courseData.subtitle}
                      onChange={(e) => setCourseData(prev => ({ ...prev, subtitle: e.target.value }))}
                      onBlur={() => handleBlur('subtitle')}
                      placeholder="Add a compelling subtitle to hook learners"
                      className={cn(
                        "h-11 text-base font-medium border-2 rounded-2xl transition-all duration-300 focus:scale-[1.02] focus:shadow-lg",
                        "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700",
                        "focus:border-primary focus:ring-4 focus:ring-primary/10",
                        "placeholder:text-gray-400 dark:placeholder:text-gray-500",
                        validationErrors.subtitle && (touchedFields.subtitle || courseData.id) && 
                        "border-red-500 focus:border-red-500 focus:ring-red-500/10"
                      )}
                    />
                    {validationErrors.subtitle && (touchedFields.subtitle || courseData.id) && (
                      <div className="flex items-center gap-2 text-red-500 text-sm">
                        <div className="w-1.5 h-1.5 bg-red-500 rounded-full"></div>
                        {validationErrors.subtitle}
                      </div>
                    )}
                  </div>
                  
                  {/* Course Description */}
                  <div className="space-y-3">
                    <label className="block text-sm font-semibold text-gray-900 dark:text-white">
                      Course Description
                      <span className="text-red-500 ml-1">*</span>
                    </label>
                    <Textarea
                      value={courseData.description}
                      onChange={(e) => setCourseData(prev => ({ ...prev, description: e.target.value }))}
                      onBlur={() => handleBlur('description')}
                      placeholder="Describe what students will learn and achieve in this course..."
                      rows={5}
                      className={cn(
                        "text-base font-medium border-2 rounded-2xl transition-all duration-300 focus:scale-[1.02] focus:shadow-lg resize-none",
                        "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700",
                        "focus:border-primary focus:ring-4 focus:ring-primary/10",
                        "placeholder:text-gray-400 dark:placeholder:text-gray-500",
                        validationErrors.description && (touchedFields.description || courseData.id) && 
                        "border-red-500 focus:border-red-500 focus:ring-red-500/10"
                      )}
                    />
                    {validationErrors.description && (touchedFields.description || courseData.id) && (
                      <div className="flex items-center gap-2 text-red-500 text-sm">
                        <div className="w-1.5 h-1.5 bg-red-500 rounded-full"></div>
                        {validationErrors.description}
                      </div>
                    )}
                  </div>
                  
                  {/* Course Metadata Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Category */}
                    <div className="space-y-3">
                      <label className="block text-sm font-semibold text-gray-900 dark:text-white">
                        Category
                        <span className="text-red-500 ml-1">*</span>
                      </label>
                      <Select
                        value={courseData.category}
                        onValueChange={(value) => {
                          setCourseData(prev => ({ ...prev, category: value }));
                          handleBlur('category');
                        }}
                      >
                        <SelectTrigger className={cn(
                          "h-11 border-2 rounded-2xl transition-all duration-300 focus:scale-[1.02] focus:shadow-lg",
                          "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700",
                          "focus:border-primary focus:ring-4 focus:ring-primary/10",
                          "text-base font-medium",
                          validationErrors.category && (touchedFields.category || courseData.id) && 
                          "border-red-500 focus:border-red-500 focus:ring-red-500/10"
                        )}>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent className="rounded-2xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-2xl">
                          {categories.map((category) => (
                            <SelectItem 
                              key={category.id} 
                              value={category.name}
                              className="rounded-xl hover:bg-primary/5 hover:text-gray-900 dark:hover:text-white focus:bg-primary/10 focus:text-gray-900 dark:focus:text-white transition-colors"
                            >
                              {category.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {validationErrors.category && (touchedFields.category || courseData.id) && (
                        <div className="flex items-center gap-2 text-red-500 text-sm">
                          <div className="w-1.5 h-1.5 bg-red-500 rounded-full"></div>
                          {validationErrors.category}
                        </div>
                      )}
                    </div>
                    
                    {/* Language */}
                    <div className="space-y-3">
                      <label className="block text-sm font-semibold text-gray-900 dark:text-white">
                        Language
                        <span className="text-red-500 ml-1">*</span>
                      </label>
                      <Select
                        value={courseData.language}
                        onValueChange={(value) => {
                          setCourseData(prev => ({ ...prev, language: value }));
                          handleBlur('language');
                        }}
                      >
                        <SelectTrigger className={cn(
                          "h-11 border-2 rounded-2xl transition-all duration-300 focus:scale-[1.02] focus:shadow-lg",
                          "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700",
                          "focus:border-primary focus:ring-4 focus:ring-primary/10",
                          "text-base font-medium",
                          validationErrors.language && (touchedFields.language || courseData.id) && 
                          "border-red-500 focus:border-red-500 focus:ring-red-500/10"
                        )}>
                          <SelectValue placeholder="Select language" />
                        </SelectTrigger>
                        <SelectContent className="rounded-2xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-2xl">
                          {languages.map((language) => (
                            <SelectItem 
                              key={language.id} 
                              value={language.name}
                              className="rounded-xl hover:bg-primary/5 hover:text-gray-900 dark:hover:text-white focus:bg-primary/10 focus:text-gray-900 dark:focus:text-white transition-colors"
                            >
                              {language.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {validationErrors.language && (touchedFields.language || courseData.id) && (
                        <div className="flex items-center gap-2 text-red-500 text-sm">
                          <div className="w-1.5 h-1.5 bg-red-500 rounded-full"></div>
                          {validationErrors.language}
                        </div>
                      )}
                    </div>
                    
                    {/* Level */}
                    <div className="space-y-3">
                      <label className="block text-sm font-semibold text-gray-900 dark:text-white">
                        Level
                        <span className="text-red-500 ml-1">*</span>
                      </label>
                      <Select
                        value={courseData.level}
                        onValueChange={(value) => {
                          setCourseData(prev => ({ ...prev, level: value }));
                          handleBlur('level');
                        }}
                      >
                        <SelectTrigger className={cn(
                          "h-11 border-2 rounded-2xl transition-all duration-300 focus:scale-[1.02] focus:shadow-lg",
                          "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700",
                          "focus:border-primary focus:ring-4 focus:ring-primary/10",
                          "text-base font-medium",
                          validationErrors.level && (touchedFields.level || courseData.id) && 
                          "border-red-500 focus:border-red-500 focus:ring-red-500/10"
                        )}>
                          <SelectValue placeholder="Select level" />
                        </SelectTrigger>
                        <SelectContent className="rounded-2xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-2xl">
                          {levels.map((level) => (
                            <SelectItem 
                              key={level.id} 
                              value={level.name}
                              className="rounded-xl hover:bg-primary/5 hover:text-gray-900 dark:hover:text-white focus:bg-primary/10 focus:text-gray-900 dark:focus:text-white transition-colors"
                            >
                              {level.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {validationErrors.level && (touchedFields.level || courseData.id) && (
                        <div className="flex items-center gap-2 text-red-500 text-sm">
                          <div className="w-1.5 h-1.5 bg-red-500 rounded-full"></div>
                          {validationErrors.level}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Course Duration */}
                  <div className="space-y-3">
                    <label className="block text-sm font-semibold text-gray-900 dark:text-white">
                      Course Duration
                    </label>
                    <Input
                      value={courseData.duration || ''}
                      onChange={(e) => setCourseData(prev => ({ ...prev, duration: e.target.value }))}
                      placeholder="e.g., 8 weeks, 6 months, 40 hours"
                      className="h-11 text-base font-medium border-2 rounded-2xl transition-all duration-300 focus:scale-[1.02] focus:shadow-lg bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 focus:border-primary focus:ring-4 focus:ring-primary/10 placeholder:text-gray-400 dark:placeholder:text-gray-500"
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Help students understand the time commitment required
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Course Image Card */}
              <Card className="overflow-hidden border-0 shadow-xl bg-gradient-to-br from-card to-card/50 dark:bg-card">
                <CardHeader className="bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 border-b border-primary/10 pb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-primary/10 to-primary/20 rounded-2xl flex items-center justify-center">
                      <Upload className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-2xl font-bold bg-gradient-to-r from-gray-900 via-gray-800 to-gray-700 dark:from-white dark:via-gray-100 dark:to-gray-200 bg-clip-text text-transparent">
                        Course Thumbnail
                      </CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">
                        Upload an engaging image that represents your course
                      </p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-8">
                  {courseData.image ? (
                    <div className="relative group">
                      <div className="relative overflow-hidden rounded-2xl border-2 border-gray-200 dark:border-gray-700">
                        <img 
                          src={courseData.image} 
                          alt="Course thumbnail" 
                          className="w-full h-64 object-cover transition-transform duration-300 group-hover:scale-105" 
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                      </div>
                      <Button
                        variant="destructive"
                        size="icon"
                        className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-all duration-300 hover:scale-110 shadow-lg"
                        onClick={() => {
                          setCourseData(prev => ({...prev, image: undefined}));
                          setImageDbPath(undefined);
                        }}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                  </div>
                  ) : (
                    <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-2xl p-12 text-center hover:border-primary/50 transition-colors duration-300 group">
                      <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-primary/10 to-primary/20 rounded-3xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                        <UploadCloud className="w-10 h-10 text-primary" />
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                        Upload Course Thumbnail
                      </h3>
                      <p className="text-gray-600 dark:text-gray-400 mb-4 max-w-md mx-auto">
                        Choose a high-quality image that will make your course stand out. 
                        Recommended size: 1200x800 pixels, JPG or PNG format.
                      </p>
                    <FileUpload 
                      onUpload={handleImageUpload} 
                        label={isUploading ? "Uploading..." : "Choose Image"}
                      acceptedFileTypes={['image/jpeg', 'image/png']}
                      disabled={isUploading}
                      maxSize={2 * 1024 * 1024} // 2MB
                    />
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="curriculum" className="space-y-8">
              {/* Course Curriculum Card */}
              <Card className="overflow-hidden border-0 shadow-xl bg-gradient-to-br from-card to-card/50 dark:bg-card">
                <CardHeader className="flex flex-row items-center justify-between bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 border-b border-primary/10 pb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-primary/10 to-primary/20 rounded-2xl flex items-center justify-center">
                      <BookOpen className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-2xl font-bold bg-gradient-to-r from-gray-900 via-gray-800 to-gray-700 dark:from-white dark:via-gray-100 dark:to-gray-200 bg-clip-text text-transparent">
                        Course Curriculum
                      </CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">
                        Structure your course with sections and lessons
                      </p>
                    </div>
                  </div>
                  <Button 
                    onClick={addSection}
                    className="h-12 px-8 rounded-2xl bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5 hover:scale-105"
                  >
                    <Plus className="w-5 h-5 mr-2" />
                    Add Section
                  </Button>
                </CardHeader>
                <CardContent className="p-8 space-y-6">
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
                            <Card className={`bg-gradient-to-br from-card to-card/50 dark:bg-card border-2 border-gray-200 dark:border-gray-700 shadow-lg hover:shadow-xl transition-all duration-300 ${activeId === section.id ? 'opacity-50 scale-95' : ''}`}>
                              <CardHeader className="flex flex-row items-start justify-between p-6 gap-4 bg-gradient-to-r from-card/50 to-card/30 dark:bg-card/50 border-b border-gray-200/50 dark:border-gray-700/30">
                                <div className="flex items-start gap-3 flex-1">
                                  <div {...dragHandleProps} className="cursor-move pt-2.5 opacity-60 hover:opacity-100 transition-opacity hover:scale-110">
                                    <GripVertical className="text-primary w-6 h-6" />
                                  </div>
                                  <div className="flex-1 space-y-3">
                                    <Input
                                      value={section.title}
                                      onChange={(e) => {
                                        const newSections = [...courseData.sections];
                                        newSections[sectionIndex].title = e.target.value;
                                        setCourseData(prev => ({ ...prev, sections: newSections }));
                                      }}
                                      className="font-semibold text-xl border-0 bg-transparent px-0 focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-muted-foreground/60 text-gray-900 dark:text-white"
                                      placeholder="Section Title"
                                    />
                                    <Textarea
                                      value={section.overview || ''}
                                      onChange={(e) => {
                                        const newSections = [...courseData.sections];
                                        newSections[sectionIndex].overview = e.target.value;
                                        setCourseData(prev => ({ ...prev, sections: newSections }));
                                      }}
                                      placeholder="Section overview or summary (optional)"
                                      rows={2}
                                      className="text-sm resize-none border-0 bg-white/50 dark:bg-gray-800/50 rounded-xl px-4 py-3 focus-visible:ring-2 focus-visible:ring-primary/20 text-gray-700 dark:text-gray-300"
                                    />
                                  </div>
                                </div>
                                <div className="flex items-center gap-3">
                                  <Button 
                                    onClick={() => addLesson(section.id)} 
                                    variant="outline"
                                    className="h-10 px-6 rounded-xl bg-white/80 dark:bg-gray-800/80 border-primary/20 text-primary hover:bg-primary hover:text-white transition-all duration-300 hover:scale-105 shadow-md"
                                  >
                                    <Plus className="w-4 h-4 mr-2" />
                                    Add Lesson
                                  </Button>
                                  {courseData.sections.length > 1 && (
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => removeSection(section.id)}
                                      className="h-10 w-10 rounded-xl hover:bg-red-100 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400 transition-all duration-300 hover:scale-105"
                                    >
                                      <X className="w-5 h-5" />
                                    </Button>
                                  )}
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    onClick={() => toggleSectionCollapse(section.id)}
                                    className="h-10 w-10 rounded-xl hover:bg-primary/10 hover:text-primary transition-all duration-300 hover:scale-105"
                                  >
                                    {section.isCollapsed ? <ChevronDown className="w-5 h-5" /> : <ChevronUp className="w-5 h-5" />}
                                  </Button>
                                </div>
                              </CardHeader>
                              {!section.isCollapsed && (
                                <CardContent className="space-y-4 pl-16 pr-6 pb-6">
                                  <SortableContext items={section.lessons.map(l => l.id)} strategy={verticalListSortingStrategy}>
                                    {section.lessons.map((lesson) => (
                                      <SortableItem key={lesson.id} id={lesson.id} type="lesson" sectionId={section.id}>
                                        {(lessonDragHandleProps) => (
                                          <div className={`${activeId === lesson.id ? 'opacity-25 scale-95' : ''} transition-all duration-300`}>
                                            <LessonContainer
                                              key={lesson.id}
                                              lesson={lesson}
                                              sectionId={section.id}
                                              onUpdate={updateLesson}
                                              onRemove={removeLesson}
                                              isRemovable={section.lessons.length > 1}
                                              dragHandleProps={lessonDragHandleProps}
                                              onToggleCollapse={toggleLessonCollapse}
                                              courseId={courseId}
                                              onUpdateContentItem={updateContentItem}
                                              onRemoveContentItem={removeContentItem}
                                              onShowContentTypeSelector={handleShowContentTypeSelector}
                                            />
                                          </div>
                                        )}
                                      </SortableItem>
                                    ))}
                                  </SortableContext>
                                  
                                  {/* Empty State for Lessons */}
                                  {section.lessons.length === 0 && (
                                    <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                                      <div className="w-20 h-20 mx-auto mb-4 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
                                        <BookOpen className="w-10 h-10" />
                                      </div>
                                      <p className="text-lg font-medium mb-2">No lessons yet</p>
                                      <p className="text-sm text-gray-400 dark:text-gray-500 mb-4">
                                        Start building your course by adding the first lesson
                                      </p>
                                      <Button 
                                        onClick={() => addLesson(section.id)} 
                                        variant="outline"
                                        className="h-10 px-6 rounded-xl bg-primary/10 border-primary/20 text-primary hover:bg-primary hover:text-white transition-all duration-300 hover:scale-105"
                                      >
                                        <Plus className="w-4 h-4 mr-2" />
                                        Add First Lesson
                                      </Button>
                                    </div>
                                  )}
                                </CardContent>
                              )}
                            </Card>
                          )}
                        </SortableItem>
                      ))}
                    </SortableContext>
                    
                    {/* Empty State for Sections */}
                    {courseData.sections.length === 0 && (
                      <div className="text-center py-16 text-gray-500 dark:text-gray-400">
                        <div className="w-24 h-24 mx-auto mb-6 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
                          <BookOpen className="w-12 h-12" />
                        </div>
                        <h3 className="text-xl font-semibold mb-3">Start Building Your Course</h3>
                        <p className="text-gray-400 dark:text-gray-500 mb-6 max-w-md mx-auto">
                          Create your first section to begin organizing your course content. 
                          You can add lessons, videos, assignments, and more.
                        </p>
                        <Button 
                          onClick={addSection}
                          className="h-12 px-8 rounded-2xl bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5 hover:scale-105"
                        >
                          <Plus className="w-5 h-5 mr-2" />
                          Create First Section
                        </Button>
                      </div>
                    )}
                    
                    <DragOverlay>
                      {activeId ? (
                        activeId.startsWith('section-') ?
                        <Card className="bg-gradient-to-br from-card to-card/50 dark:bg-card border-2 border-primary/20 shadow-2xl scale-105">
                          <CardHeader className="bg-gradient-to-r from-primary/10 to-primary/20 p-4">
                            <CardTitle className="text-lg">
                              {courseData.sections.find(s => s.id === activeId)?.title || 'Section'}
                            </CardTitle>
                          </CardHeader>
                        </Card> :
                        <div className="scale-105">
                                                <LessonContainer
                          lesson={
                            courseData.sections
                              .flatMap(s => s.lessons)
                              .find(l => l.id === activeId) || { id: '', title: '', overview: '', contentItems: [] }
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
                          onUpdateContentItem={() => {}}
                          onRemoveContentItem={() => {}}
                          onShowContentTypeSelector={() => {}}
                        />
                        </div>
                      ) : null}
                    </DragOverlay>
                  </DndContext>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="landing" className="space-y-8">
              {/* Course Requirements & Outcomes Card */}
              <Card className="overflow-hidden border-0 shadow-xl bg-gradient-to-br from-card to-card/50 dark:bg-card">
                <CardHeader className="bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 border-b border-primary/10 pb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-primary/10 to-primary/20 rounded-2xl flex items-center justify-center">
                      <Info className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-2xl font-bold bg-gradient-to-r from-gray-900 via-gray-800 to-gray-700 dark:from-white dark:via-gray-100 dark:to-gray-200 bg-clip-text text-transparent">
                        Course Landing Page
                      </CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">
                        Define what students need to know and what they'll learn
                      </p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-8 space-y-8">
                  {/* Requirements Section */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-10 h-10 bg-gradient-to-br from-orange-100 to-orange-200 dark:from-orange-900/20 dark:to-orange-800/20 rounded-xl flex items-center justify-center">
                        <BookOpen className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                      </div>
                   <div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                          Prerequisites & Requirements
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          What students should know before starting this course
                        </p>
                      </div>
                    </div>
                    
                    <div className="space-y-3">
                    {courseData.requirements.map((req, index) => (
                        <div key={index} className="group flex items-center gap-3 p-4 bg-gradient-to-r from-orange-50/50 to-orange-100/50 dark:from-orange-900/10 dark:to-orange-800/10 rounded-2xl border border-orange-200/50 dark:border-orange-700/30 hover:border-orange-300 dark:hover:border-orange-600 transition-all duration-300">
                          <div className="w-6 h-6 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center flex-shrink-0">
                            <span className="text-xs font-semibold text-orange-700 dark:text-orange-300">
                              {index + 1}
                            </span>
                          </div>
                          <Input 
                            value={req} 
                            onChange={(e) => updateArrayField('requirements', index, e.target.value)} 
                            onBlur={() => handleBlur('requirements')}
                            placeholder="e.g., Basic knowledge of JavaScript, Familiarity with HTML/CSS"
                            className="flex-1 border-0 bg-transparent text-gray-900 dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-400 focus:ring-0 focus:outline-none text-base"
                          />
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => removeArrayField('requirements', index)}
                            className="opacity-0 group-hover:opacity-100 transition-all duration-300 hover:bg-orange-200/50 dark:hover:bg-orange-700/30 rounded-xl"
                        >
                            <X className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                        </Button>
                      </div>
                    ))}
                      
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => addArrayField('requirements')}
                        className="w-full h-12 border-2 border-dashed border-orange-300 dark:border-orange-600 rounded-2xl text-orange-600 dark:text-orange-400 hover:bg-orange-50 hover:text-orange-700 dark:hover:bg-orange-900/10 dark:hover:text-orange-300 hover:border-orange-400 dark:hover:border-orange-500 transition-all duration-300 group"
                    >
                        <Plus className="w-4 h-4 mr-2 group-hover:scale-110 transition-transform duration-300" />
                      Add Requirement
                    </Button>
                      
                      {validationErrors.requirements && (touchedFields.requirements || courseData.id) && (
                        <div className="flex items-center gap-2 text-red-500 text-sm p-3 bg-red-50 dark:bg-red-900/10 rounded-xl border border-red-200 dark:border-red-800">
                          <div className="w-1.5 h-1.5 bg-red-500 rounded-full"></div>
                          {validationErrors.requirements}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Learning Outcomes Section */}
                  <div className="space-y-4 pt-6 border-t border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-10 h-10 bg-gradient-to-br from-green-100 to-green-200 dark:from-green-900/20 dark:to-green-800/20 rounded-xl flex items-center justify-center">
                        <BookOpen className="w-5 h-5 text-green-600 dark:text-green-400" />
                      </div>
                  <div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                          What You'll Learn
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          The key skills and knowledge students will gain
                        </p>
                      </div>
                    </div>
                    
                    <div className="space-y-3">
                    {courseData.learningOutcomes.map((outcome, index) => (
                        <div key={index} className="group flex items-center gap-3 p-4 bg-gradient-to-r from-green-50/50 to-green-100/50 dark:from-green-900/10 dark:to-green-800/10 rounded-2xl border border-green-200/50 dark:border-green-700/30 hover:border-green-300 dark:hover:border-green-600 transition-all duration-300">
                          <div className="w-6 h-6 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center flex-shrink-0">
                            <span className="text-xs font-semibold text-green-700 dark:text-green-300">
                              {index + 1}
                            </span>
                          </div>
                          <Input 
                            value={outcome} 
                            onChange={(e) => updateArrayField('learningOutcomes', index, e.target.value)} 
                            onBlur={() => handleBlur('learningOutcomes')}
                            placeholder="e.g., Build responsive web applications, Master modern JavaScript frameworks"
                            className="flex-1 border-0 bg-transparent text-gray-900 dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-400 focus:ring-0 focus:outline-none text-base"
                          />
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => removeArrayField('learningOutcomes', index)}
                            className="opacity-0 group-hover:opacity-100 transition-all duration-300 hover:bg-green-200/50 dark:hover:bg-green-700/30 rounded-xl"
                        >
                            <X className="h-4 w-4 text-green-600 dark:text-green-400" />
                        </Button>
                      </div>
                    ))}
                      
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => addArrayField('learningOutcomes')}
                        className="w-full h-12 border-2 border-dashed border-green-300 dark:border-green-600 rounded-2xl text-green-600 dark:text-green-400 hover:bg-green-50 hover:text-green-700 dark:hover:bg-green-900/10 dark:hover:text-green-300 hover:border-green-400 dark:hover:border-green-500 transition-all duration-300 group"
                    >
                        <Plus className="w-4 h-4 mr-2 group-hover:scale-110 transition-transform duration-300" />
                        Add Learning Outcome
                    </Button>
                      
                      {validationErrors.learningOutcomes && (touchedFields.learningOutcomes || courseData.id) && (
                        <div className="flex items-center gap-2 text-red-500 text-sm p-3 bg-red-50 dark:bg-red-900/10 rounded-xl border border-red-200 dark:border-red-800">
                          <div className="w-1.5 h-1.5 bg-red-500 rounded-full"></div>
                          {validationErrors.learningOutcomes}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Tips Section */}
                  <div className="mt-8 p-6 bg-gradient-to-r from-blue-50/50 to-indigo-50/50 dark:from-blue-900/10 dark:to-indigo-900/10 rounded-2xl border border-blue-200/50 dark:border-blue-700/30">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Info className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div className="space-y-2">
                        <h4 className="font-semibold text-blue-900 dark:text-blue-100">
                          Pro Tips for Better Engagement
                        </h4>
                        <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                          <li>• Be specific and measurable in your learning outcomes</li>
                          <li>• List realistic prerequisites to set proper expectations</li>
                          <li>• Use action verbs like "Build", "Create", "Master"</li>
                          <li>• Keep requirements and outcomes concise but comprehensive</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="access" className="space-y-6">
              {/* Teachers Management Card */}
              <Card className="overflow-hidden border-0 shadow-xl bg-gradient-to-br from-card to-card/50 dark:bg-card">
                <CardHeader className="bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 border-b border-primary/10 pb-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-primary/10 to-primary/20 rounded-xl flex items-center justify-center">
                        <BookOpen className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-xl font-bold bg-gradient-to-r from-gray-900 via-gray-800 to-gray-700 dark:from-white dark:via-gray-100 dark:to-gray-200 bg-clip-text text-transparent">
                          Manage Teachers
                        </CardTitle>
                        <p className="text-sm text-muted-foreground mt-1">
                          Add or remove teachers who can manage this course
                        </p>
                      </div>
                    </div>
                    <Badge variant="secondary" className="bg-primary/10 text-primary-700 dark:text-primary-300 border-primary/20">
                      {courseData.teachers.length} Assigned
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                  {/* Teacher Selection */}
                  <div className="space-y-3">
                    <label className="block text-sm font-semibold text-gray-900 dark:text-white">
                      Select Teachers
                    </label>
                    <div className="relative">
                  <MultiSelect
                    options={allTeachers}
                    onValueChange={(selectedIds) => handleMembersChange('teachers', selectedIds)}
                    value={courseData.teachers.map(i => i.id)}
                        placeholder="Search and select teachers..."
                        className="min-h-[44px] border-2 border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all duration-300"
                      />
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Teachers can edit course content, manage students, and view analytics
                    </p>
                  </div>

                  {/* Selected Teachers List - Compact Grid Layout */}
                  {courseData.teachers.length > 0 ? (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
                          Current Teachers
                        </h4>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleMembersChange('teachers', [])}
                          className="h-8 px-3 text-xs text-red-600 dark:text-red-400 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-900/20 dark:hover:text-red-300 rounded-lg"
                        >
                          Clear All
                        </Button>
                      </div>
                      
                      {/* Compact Grid for Large Numbers */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                    {courseData.teachers.map(user => (
                          <div key={user.id} className="flex items-center gap-3 p-3 bg-gradient-to-r from-primary/5 to-primary/10 rounded-xl border border-primary/20 hover:border-primary/30 transition-all duration-300 group hover:scale-105">
                            <div className="w-8 h-8 bg-gradient-to-br from-primary/100 to-primary-200 dark:from-primary-900/30 dark:to-primary-800/30 rounded-full flex items-center justify-center flex-shrink-0">
                              <span className="text-xs font-semibold text-primary-700 dark:text-primary-300">
                                {user.name.split(' ').map(n => n[0]).join('')}
                              </span>
                        </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-gray-900 dark:text-white text-sm truncate">{user.name}</p>
                              <p className="text-xs text-gray-600 dark:text-gray-400 truncate">{user.email}</p>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                const newTeachers = courseData.teachers.filter(t => t.id !== user.id);
                                handleMembersChange('teachers', newTeachers.map(t => t.id));
                              }}
                              className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-all duration-300 hover:bg-red-100 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400 rounded-lg"
                            >
                              <X className="w-3 h-3" />
                            </Button>
                      </div>
                    ))}
                  </div>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                      <div className="w-16 h-16 mx-auto mb-3 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
                        <BookOpen className="w-8 h-8" />
                      </div>
                      <p className="text-sm font-medium mb-1">No teachers assigned yet</p>
                      <p className="text-xs text-gray-400 dark:text-gray-500">Select teachers from the dropdown above</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Students Management Card */}
              <Card className="overflow-hidden border-0 shadow-xl bg-gradient-to-br from-card to-card/50 dark:bg-card">
                <CardHeader className="bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 border-b border-primary/10 pb-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-primary/10 to-primary/20 rounded-xl flex items-center justify-center">
                        <BookOpen className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-xl font-bold bg-gradient-to-r from-gray-900 via-gray-800 to-gray-700 dark:from-white dark:via-gray-100 dark:to-gray-200 bg-clip-text text-transparent">
                          Manage Students
                        </CardTitle>
                        <p className="text-sm text-muted-foreground mt-1">
                          Enroll or unenroll students from this course
                        </p>
                      </div>
                    </div>
                    <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 border-green-200 dark:border-green-700">
                      {courseData.students.length} Enrolled
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                  {/* Student Selection */}
                  <div className="space-y-3">
                    <label className="block text-sm font-semibold text-gray-900 dark:text-white">
                      Select Students
                    </label>
                    <div className="relative">
                   <MultiSelect
                    options={allStudents}
                    onValueChange={(selectedIds) => handleMembersChange('students', selectedIds)}
                    value={courseData.students.map(s => s.id)}
                        placeholder="Search and select students..."
                        className="min-h-[44px] border-2 border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all duration-300"
                      />
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Students can access course content, submit assignments, and track progress
                    </p>
                  </div>

                  {/* Selected Students List - Compact Grid Layout */}
                  {courseData.students.length > 0 ? (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
                          Enrolled Students
                        </h4>
                        <div className="flex items-center gap-2">

                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleMembersChange('students', [])}
                            className="h-8 px-3 text-xs text-red-600 dark:text-red-400 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-900/20 dark:hover:text-red-300 rounded-lg"
                          >
                            Clear All
                          </Button>
                        </div>
                      </div>
                      
                      {/* Compact Grid for Large Numbers */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3">
                    {courseData.students.map(user => (
                          <div key={user.id} className="flex items-center gap-3 p-3 bg-gradient-to-r from-green-50 to-green-100/50 dark:from-green-900/10 dark:to-green-800/10 rounded-xl border border-green-200/50 dark:border-green-700/30 hover:border-green-300 dark:hover:border-green-600 transition-all duration-300 group hover:scale-105">
                            <div className="w-8 h-8 bg-gradient-to-br from-green-100 to-green-200 dark:from-green-900/30 dark:to-green-800/30 rounded-full flex items-center justify-center flex-shrink-0">
                              <span className="text-xs font-semibold text-green-700 dark:text-green-300">
                                {user.name.split(' ').map(n => n[0]).join('')}
                              </span>
                        </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-gray-900 dark:text-white text-sm truncate">{user.name}</p>
                              <p className="text-xs text-gray-600 dark:text-gray-400 truncate">{user.email}</p>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                const newStudents = courseData.students.filter(s => s.id !== user.id);
                                handleMembersChange('students', newStudents.map(s => s.id));
                              }}
                              className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-all duration-300 hover:bg-red-100 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400 rounded-lg"
                            >
                              <X className="w-3 h-3" />
                            </Button>
                      </div>
                    ))}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                      <div className="w-16 h-16 mx-auto mb-3 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
                        <BookOpen className="w-8 h-8" />
                      </div>
                      <p className="text-sm font-medium mb-1">No students enrolled yet</p>
                      <p className="text-xs text-gray-400 dark:text-gray-500">Select students from the dropdown above</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Access Control Info Card - Compact */}
              <Card className="overflow-hidden border-0 shadow-xl bg-gradient-to-br from-blue-50/50 to-indigo-50/50 dark:from-blue-900/10 dark:to-indigo-900/10 border border-blue-200/50 dark:border-blue-700/30">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900/30 dark:to-blue-800/30 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Info className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div className="space-y-4">
                      <div>
                        <h3 className="text-lg font-bold text-blue-900 dark:text-blue-100 mb-2">
                          Access Control & Permissions
                        </h3>
                        <p className="text-blue-800 dark:text-blue-200 text-sm">
                          Understand how different user roles interact with your course
                        </p>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-3">
                          <h4 className="font-semibold text-blue-900 dark:text-blue-100 flex items-center gap-2 text-sm">
                            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                            Teachers ({courseData.teachers.length})
                          </h4>
                          <ul className="text-xs text-blue-800 dark:text-blue-200 space-y-1">
                            <li>• Edit course content and structure</li>
                            <li>• Manage student enrollments</li>
                            <li>• View student progress and analytics</li>
                            <li>• Grade assignments and provide feedback</li>
                          </ul>
                        </div>
                        
                        <div className="space-y-3">
                          <h4 className="font-semibold text-blue-900 dark:text-blue-100 flex items-center gap-2 text-sm">
                            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                            Students ({courseData.students.length})
                          </h4>
                          <ul className="text-xs text-blue-800 dark:text-blue-200 space-y-1">
                            <li>• Access course content and materials</li>
                            <li>• Submit assignments and take quizzes</li>
                            <li>• Track learning progress</li>
                            <li>• Participate in discussions</li>
                          </ul>
                        </div>
                      </div>
                    </div>
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
        <DialogContent className="max-w-[80vw] w-full h-[90vh] flex flex-col p-0">
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
            <Button 
              variant="ghost" 
              onClick={() => setIsRejectionDialogOpen(false)}
              className="hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              Cancel
            </Button>
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

      {/* Content Type Selector Modal */}
      {showContentTypeSelector && (
        <ContentTypeSelector
          onSelect={handleContentTypeSelect}
          onClose={handleCloseContentTypeSelector}
        />
      )}


    </div>
  );
};

export default CourseBuilder;

