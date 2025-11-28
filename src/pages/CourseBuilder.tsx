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
import { ArrowLeft, Save, Eye, Upload, Plus, GripVertical, X, ChevronDown, ChevronUp, BookOpen, Info, UploadCloud, FileText, RefreshCw, Calendar, Edit, Sparkles, Image as ImageIcon, Trash2, Download, CreditCard } from 'lucide-react';
import { AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { FileUpload } from '@/components/ui/FileUpload';
import { RichTextEditor } from '@/components/ui/RichTextEditor';
import { MultiSelect } from '@/components/ui/MultiSelect';
import { PDFQuizUploader } from '@/components/ui/PDFQuizUploader';
import { QuizRetrySettings } from '@/components/admin/QuizRetrySettings';
import { AIThumbnailGenerator } from '@/components/course/AIThumbnailGenerator';
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
import React, { useRef, useMemo } from 'react'; // Added missing import for React
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useAuth } from '@/contexts/AuthContext';
import { useUserProfile } from '@/hooks/useUserProfile';
import { cn } from '@/lib/utils';
import { ContentLoader } from '@/components/ContentLoader';
import AccessLogService from '@/services/accessLogService';
import CourseNotificationService from '@/services/courseNotificationService';
import { CourseOverview } from './CourseOverview';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Terminal } from "lucide-react";
import { format } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import { TimePicker } from "@/components/ui/time-picker";
import { DatePicker } from "@/components/ui/date-picker";
import { useClasses, useTeachers, useStudents, useBoards, useSchools } from '@/hooks/useClasses';
import { ClassWithMembers, CreateClassData, UpdateClassData } from '@/services/classService';

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
  content_type: 'video' | 'attachment' | 'assignment' | 'quiz' | 'lesson_plan';
  content_path?: string; // For video, attachment, assignment HTML
  quiz?: QuizData; // For quiz type
  due_date?: string; // Due date for assignments and quizzes
  retry_settings?: any; // Quiz retry settings
}

interface QuizData {
  id: string;
  questions: QuizQuestion[];
}

interface QuizQuestion {
  id: string;
  question_text: string;
  question_type: 'single_choice' | 'multiple_choice' | 'text_answer' | 'math_expression';
  options: QuestionOption[];
  position: number;
  points?: number; // Points awarded for correct answer
  // Math-specific fields
  math_expression?: string;
  math_tolerance?: number;
  math_hint?: string;
  math_allow_drawing?: boolean;
  // Image field for question
  image_url?: string;
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
  country_ids: string[];
  region_ids: string[];
  city_ids: string[];
  project_ids: string[];
  board_ids: string[];
  school_ids: string[];
  class_ids: string[];
  image?: string;
  requirements: string[];
  learningOutcomes: string[];
  sections: CourseSection[];
  teachers: { id: string; name: string; email: string; avatar_url?: string }[];
  students: { id: string; name: string; email: string; avatar_url?: string }[];
  status?: 'Draft' | 'Published' | 'Under Review' | 'Rejected';
  duration?: string;
  published_course_id?: string;
  authorId?: string;
  review_feedback?: string;
  // Stripe payment fields
  payment_type?: 'free' | 'paid';
  course_price?: number; // Price in USD cents
}

type ValidationErrors = Partial<Record<keyof Omit<CourseData, 'sections'|'teachers'|'students'|'image'|'status'|'duration'|'published_course_id'|'authorId'|'id'|'review_feedback'>, string>> & {
  payment_type?: string;
  course_price?: string;
};

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
  if (!data.country_ids || data.country_ids.length === 0) errors.country_ids = 'At least one country is required.';
  if (!data.region_ids || data.region_ids.length === 0) errors.region_ids = 'At least one region is required.';
  if (!data.city_ids || data.city_ids.length === 0) errors.city_ids = 'At least one city is required.';
  if (!data.project_ids || data.project_ids.length === 0) errors.project_ids = 'At least one project is required.';
  if (!data.board_ids || data.board_ids.length === 0) errors.board_ids = 'At least one board is required.';
  if (!data.school_ids || data.school_ids.length === 0) errors.school_ids = 'At least one school is required.';

  if (!data.requirements || data.requirements.length === 0 || data.requirements.every(r => !r.trim())) {
    errors.requirements = 'At least one requirement is required.';
  }
  if (!data.learningOutcomes || data.learningOutcomes.length === 0 || data.learningOutcomes.every(o => !o.trim())) {
    errors.learningOutcomes = 'At least one learning outcome is required.';
  }

  // Payment validation
  if (data.payment_type === 'paid' && (!data.course_price || data.course_price <= 0)) {
    errors.course_price = 'Course price is required for paid courses';
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

const MOCK_TEACHERS_FOR_SELECT = MOCK_USER_DATABASE.filter(u => u.role === 'teacher' || u.role === 'content_creator').map(u => ({ label: `${u.name} (${u.email})`, value: u.id }));
const MOCK_STUDENTS_FOR_SELECT = MOCK_USER_DATABASE.filter(u => u.role === 'student').map(u => ({ label: `${u.name} (${u.email})`, value: u.id }));

// Mock Classes Data
const MOCK_CLASSES: Class[] = [
  {
    id: 'class-1',
    name: 'Advanced Mathematics',
    description: 'Advanced calculus and linear algebra for engineering students',
    schedule: 'Mon, Wed, Fri 10:00 AM - 11:30 AM',
    capacity: 30,
    enrolled_students: 24,
    teacher: { id: 'inst1', name: 'Dr. Evelyn Reed', email: 'e.reed@example.com' },
    status: 'active',
    created_at: '2024-01-15',
    updated_at: '2024-01-20'
  },
  {
    id: 'class-2',
    name: 'Introduction to Programming',
    description: 'Basic programming concepts using Python',
    schedule: 'Tue, Thu 2:00 PM - 3:30 PM',
    capacity: 25,
    enrolled_students: 25,
    teacher: { id: 'inst2', name: 'Mr. David Chen', email: 'd.chen@example.com' },
    status: 'active',
    created_at: '2024-01-10',
    updated_at: '2024-01-18'
  },
  {
    id: 'class-3',
    name: 'Data Structures & Algorithms',
    description: 'Comprehensive study of data structures and algorithmic problem solving',
    schedule: 'Mon, Wed 1:00 PM - 2:30 PM',
    capacity: 20,
    enrolled_students: 18,
    teacher: { id: 'inst3', name: 'Prof. Ana Silva', email: 'a.silva@example.com' },
    status: 'active',
    created_at: '2024-01-12',
    updated_at: '2024-01-19'
  }
];

// Database interfaces for hierarchical data
interface Country {
  id: string;
  name: string;
  code: string;
  description?: string;
}

interface Region {
  id: string;
  name: string;
  code: string;
  country_id: string;
  description?: string;
}

interface City {
  id: string;
  name: string;
  code: string;
  country_id: string;
  region_id: string;
  description?: string;
}

interface Project {
  id: string;
  name: string;
  code: string;
  country_id: string;
  region_id: string;
  city_id: string;
  description?: string;
  status: string;
}

interface Board {
  id: string;
  name: string;
  code: string;
  country_id: string;
  region_id: string;
  city_id: string;
  project_id: string;
  description?: string;
  board_type: string;
  status: string;
}

interface School {
  id: string;
  name: string;
  code: string;
  school_type: string;
  country_id: string;
  region_id: string;
  city_id: string;
  project_id: string;
  board_id: string;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
  principal_name?: string;
  principal_email?: string;
  principal_phone?: string;
  established_year?: number;
  total_students?: number;
  total_teachers?: number;
  total_classes?: number;
  facilities?: string[];
  curriculum?: string[];
  languages_offered?: string[];
  status: string;
  accreditation_status?: string;
  created_at?: string;
  updated_at?: string;
  created_by?: string;
  updated_by?: string;
}
// #endregion

interface Profile {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  role: 'admin' | 'teacher' | 'student' | 'content_creator' | 'super_user' | 'view_only';
  avatar_url?: string;
}

interface Class {
  id: string;
  name: string;
  description: string;
  schedule: string;
  capacity: number;
  enrolled_students: number;
  teacher: { id: string; name: string; email: string; avatar_url?: string };
  status: 'active' | 'inactive' | 'completed';
  created_at: string;
  updated_at: string;
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
  onSelect: (contentType: 'video' | 'assignment' | 'quiz' | 'attachment' | 'lesson_plan') => void;
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
    },
    {
      type: 'lesson_plan' as const,
      label: 'Lesson Plan',
      description: 'Upload lesson plan documents and files',
      icon: '📋',
      color: 'from-indigo-500/10 to-indigo-600/10',
      borderColor: 'border-indigo-200/50',
      iconBg: 'bg-indigo-500/10',
      iconColor: 'text-indigo-600'
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
  canReorder?: boolean;
  dragHandleProps?: any;
  courseStatus?: 'Draft' | 'Published' | 'Under Review' | 'Rejected';
}

const LessonContentItemComponent = memo(({ item, lessonId, sectionId, onUpdate, onRemove, isRemovable, courseId, canReorder = false, dragHandleProps = {}, courseStatus }: LessonContentItemProps) => {
  const [isUploading, setIsUploading] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
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
      } else if (item.content_type === 'attachment' || item.content_type === 'lesson_plan') {
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

  const handleTypeChangeRequest = (newType: 'video' | 'attachment' | 'assignment' | 'quiz' | 'lesson_plan') => {
    let hasContent = false;
    if (item.content_type === 'quiz') {
      hasContent = (item.quiz?.questions?.length || 0) > 0;
    } else if (item.content_type === 'assignment') {
      hasContent = !!item.content_path && item.content_path !== '<p><br></p>';
    } else { // Video, Attachment, or Lesson Plan
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
      onUpdate(lessonId, item.id, { 
        content_path: filePath,
        title: file.name // Update title to show the actual file name
      });
      toast.success('Attachment uploaded successfully!');
    } catch (error: any) {
      toast.error('Attachment upload failed.', { description: error.message });
    } finally {
      setIsUploading(false);
    }
  };

  const handleLessonPlanUpload = async (file: File) => {
    if (!file) return;

    setIsUploading(true);
    const filePath = `lesson-plans/${courseId || 'new'}/${lessonId}/${item.id}/${crypto.randomUUID()}/${file.name}`;

    try {
      const { error } = await supabase.storage.from('dil-lms').upload(filePath, file);
      if (error) throw error;
      onUpdate(lessonId, item.id, { 
        content_path: filePath,
        title: file.name // Update title to show the actual file name
      });
      toast.success('Lesson plan uploaded successfully!');
    } catch (error: any) {
      toast.error('Lesson plan upload failed.', { description: error.message });
    } finally {
      setIsUploading(false);
    }
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
      const { data, error: urlError } = await supabase.storage.from('dil-lms').createSignedUrl(filePath, 60 * 60 * 24 * 365 * 1000); // 1000 years
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
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDownload(attachmentInfo.url, attachmentInfo.name)}
                  disabled={isDownloading}
                  className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                >
                  <Download className="h-4 w-4 mr-1" />
                  {isDownloading ? 'Downloading...' : 'Download'}
                </Button>
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
      case 'lesson_plan':
        if (attachmentInfo) {
          return (
            <div className="flex items-center justify-between p-3 rounded-lg bg-background border mt-2">
              <div className="flex items-center gap-3">
                <FileIcon className="h-6 w-6 text-muted-foreground" />
                <a href={attachmentInfo.url} target="_blank" rel="noopener noreferrer" className="font-medium hover:underline">
                  {attachmentInfo.name}
                </a>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDownload(attachmentInfo.url, attachmentInfo.name)}
                  disabled={isDownloading}
                  className="text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50"
                >
                  <Download className="h-4 w-4 mr-1" />
                  {isDownloading ? 'Downloading...' : 'Download'}
                </Button>
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
                  if (file) handleLessonPlanUpload(file);
                };
                input.click();
              }}
            >
              <div className="flex flex-col items-center gap-2 text-muted-foreground">
                <UploadCloud className="h-8 w-8" />
                <p className="text-sm">{isUploading ? "Uploading..." : "Upload Lesson Plan (PDF, DOC, ZIP)"}</p>
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
        console.log('🎯 COURSEBUILDER: Rendering quiz content item:', item.id, 'with retry_settings:', item.retry_settings);
        return (
          <div className="space-y-3 sm:space-y-4">
            <div>
              <Label htmlFor={`quiz-title-${item.id}`} className="text-xs sm:text-sm">Quiz Title</Label>
              <Input
                id={`quiz-title-${item.id}`}
                value={item.title}
                onChange={(e) => onUpdate(lessonId, item.id, { title: e.target.value })}
                placeholder="Enter quiz title"
                className="h-9 sm:h-10 text-sm"
              />
            </div>
            <div>
              <Label htmlFor={`quiz-due-date-${item.id}`} className="text-xs sm:text-sm">Due Date</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-3">
                <div className="relative">
                  <Label htmlFor={`quiz-date-${item.id}`} className="text-xs">Date</Label>
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
                  <Label htmlFor={`quiz-time-${item.id}`} className="text-xs">Time</Label>
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
              <Label htmlFor={`quiz-builder-${item.id}`} className="text-xs sm:text-sm">Quiz Questions</Label>
              <QuizBuilder
                quiz={item.quiz || { id: '', questions: [] }}
                onQuizChange={(quiz) => onUpdate(lessonId, item.id, { quiz })}
              />
            </div>
            
            {/* Quiz Retry Settings */}
            <div className="mt-3 sm:mt-4">
              {(() => {
                console.log('🎯 COURSEBUILDER: Rendering QuizRetrySettings for item:', item.id, 'with retry_settings:', item.retry_settings);
                return null;
              })()}
              <QuizRetrySettings
                lessonContentId={item.id}
                courseStatus={courseStatus}
                onSettingsChange={(settings) => {
                  console.log('🔄 COURSEBUILDER: QuizRetrySettings onSettingsChange called with:', settings);
                  onUpdate(lessonId, item.id, { retry_settings: settings } as any);
                }}
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
      case 'lesson_plan': return '📋';
      default: return '📄';
    }
  };

  const getContentTypeColor = (type: string) => {
    switch (type) {
      case 'video': return 'bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-950 dark:border-blue-800 dark:text-blue-300';
      case 'assignment': return 'bg-orange-50 border-orange-200 text-orange-700 dark:bg-orange-950 dark:border-orange-800 dark:text-orange-300';
      case 'quiz': return 'bg-purple-50 border-purple-200 text-purple-700 dark:bg-purple-950 dark:border-purple-800 dark:text-purple-300';
      case 'attachment': return 'bg-green-50 border-green-200 text-green-700 dark:bg-green-950 dark:border-green-800 dark:text-green-300';
      case 'lesson_plan': return 'bg-indigo-50 border-indigo-200 text-indigo-700 dark:bg-indigo-950 dark:border-indigo-800 dark:text-indigo-300';
      default: return 'bg-gray-50 border-gray-200 text-gray-700 dark:bg-gray-950 dark:border-gray-800 dark:text-gray-300';
    }
  };

  return (
    <div className={`w-full p-1.5 sm:p-2 md:p-3 lg:p-6 rounded-xl sm:rounded-2xl border-2 transition-all duration-300 hover:shadow-xl ${getContentTypeColor(item.content_type)}`}>
      <div className="flex items-center justify-between gap-1.5 sm:gap-2 mb-1.5 sm:mb-2 lg:mb-3">
        <div className="flex items-center gap-1.5 sm:gap-2 flex-1 min-w-0">
          {canReorder && (
            <div 
              {...dragHandleProps}
              className="flex items-center justify-center w-7 h-7 sm:w-7 sm:h-7 rounded-lg bg-white/60 dark:bg-black/30 hover:bg-white/80 dark:hover:bg-black/50 cursor-grab active:cursor-grabbing transition-all duration-200 shadow-sm hover:shadow-md flex-shrink-0"
            >
              <GripVertical className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-gray-600 dark:text-gray-400" />
            </div>
          )}
          <div className="flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 md:w-12 md:h-12 rounded-xl sm:rounded-2xl bg-white/80 dark:bg-black/40 shadow-sm flex-shrink-0">
            <span className="text-lg sm:text-lg md:text-2xl">{getContentTypeIcon(item.content_type)}</span>
          </div>
          <Input
            value={item.title}
            onChange={(e) => onUpdate(lessonId, item.id, { title: e.target.value })}
            placeholder={`${item.content_type.charAt(0).toUpperCase() + item.content_type.slice(1)} Title`}
            className="font-semibold text-sm sm:text-base md:text-lg bg-white/60 dark:bg-black/30 border-0 focus-visible:ring-2 focus-visible:ring-current/30 rounded-lg sm:rounded-xl px-3 py-2 sm:px-3 sm:py-2 placeholder:text-gray-500 dark:placeholder:text-gray-400"
          />
        </div>
        <div className="flex items-center gap-2 sm:gap-2 flex-shrink-0">
          <Select
            value={item.content_type}
            onValueChange={handleTypeChangeRequest}
          >
            <SelectTrigger className="w-[100px] sm:w-[110px] md:w-[140px] h-8 sm:h-8 md:h-10 rounded-lg sm:rounded-xl bg-white/60 dark:bg-black/30 border-2 border-current/20 text-xs sm:text-sm font-medium shadow-sm hover:shadow-md transition-all duration-300">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="rounded-xl sm:rounded-2xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-2xl">
              <SelectItem value="video" className="rounded-lg sm:rounded-xl hover:bg-blue-50 hover:text-gray-900 dark:hover:bg-blue-900/20 dark:hover:text-white transition-colors text-xs sm:text-sm">🎥 Video</SelectItem>
              <SelectItem value="attachment" className="rounded-lg sm:rounded-xl hover:bg-green-50 hover:text-gray-900 dark:hover:bg-green-900/20 dark:hover:text-white transition-colors text-xs sm:text-sm">📎 Attachment</SelectItem>
              <SelectItem value="assignment" className="rounded-lg sm:rounded-xl hover:bg-orange-50 hover:text-gray-900 dark:hover:bg-orange-900/20 dark:hover:text-white transition-colors text-xs sm:text-sm">📝 Assignment</SelectItem>
              <SelectItem value="quiz" className="rounded-lg sm:rounded-xl hover:bg-purple-50 hover:text-gray-900 dark:hover:bg-purple-900/20 dark:hover:text-white transition-colors text-xs sm:text-sm">❓ Quiz</SelectItem>
              <SelectItem value="lesson_plan" className="rounded-lg sm:rounded-xl hover:bg-indigo-50 hover:text-gray-900 dark:hover:bg-indigo-900/20 dark:hover:text-white transition-colors text-xs sm:text-sm">📋 Lesson Plan</SelectItem>
            </SelectContent>
          </Select>
          {isRemovable && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onRemove(lessonId, item.id)}
              className="h-8 w-8 sm:h-8 sm:w-8 md:h-10 md:w-10 text-current/60 hover:text-current hover:bg-white/40 dark:hover:bg-black/40 rounded-lg sm:rounded-xl transition-all duration-300"
            >
              <X className="w-4 h-4 sm:w-4 sm:h-4" />
            </Button>
          )}
        </div>
      </div>
      
      <div className="w-full bg-white/40 dark:bg-black/30 rounded-xl sm:rounded-2xl p-1.5 sm:p-2 md:p-3 lg:p-6 border-2 border-current/10 shadow-sm relative">
        {/* Show due date for assignments and quizzes */}
        {(item.content_type === 'assignment' || item.content_type === 'quiz') && item.due_date && (
          <div className="mb-1.5 sm:mb-2 lg:mb-3 p-1.5 sm:p-2 bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg sm:rounded-xl shadow-sm">
            <div className="flex items-center gap-1.5 sm:gap-1.5 text-xs sm:text-xs text-yellow-700 dark:text-yellow-300 flex-wrap">
              <CalendarIcon className="h-3 w-3 sm:h-3.5 sm:w-3.5 flex-shrink-0" />
              <span className="font-medium">Due:</span>
              <span className="font-semibold break-all">{format(new Date(item.due_date), "PPP 'at' p")}</span>
            </div>
          </div>
        )}
        <div className="space-y-3 sm:space-y-4">
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
  canReorderContent: boolean;
  currentUserRole: 'admin' | 'teacher' | 'student' | 'content_creator' | 'super_user' | 'view_only' | null;
  courseStatus: 'Draft' | 'Published' | 'Under Review' | 'Rejected' | undefined;
}

const LessonContainer = memo(({ lesson, sectionId, onUpdate, onRemove, isRemovable, dragHandleProps, onToggleCollapse, courseId, onUpdateContentItem, onRemoveContentItem, onShowContentTypeSelector, canReorderContent, currentUserRole, courseStatus }: LessonContainerProps) => {
  return (
    <>
      <div className="p-1.5 sm:p-2 md:p-3 lg:p-6 rounded-xl sm:rounded-2xl bg-gradient-to-br from-card to-card/50 dark:bg-card border-2 border-gray-200 dark:border-gray-700 shadow-lg hover:shadow-xl space-y-2 sm:space-y-3 lg:space-y-4 transition-all duration-300 group">
        {/* Lesson Header */}
        <div className="flex items-start justify-between gap-1.5 sm:gap-2">
          <div className="flex items-start gap-1.5 sm:gap-2 flex-1 min-w-0">
            <div {...dragHandleProps} className="cursor-move pt-2 sm:pt-2 opacity-60 hover:opacity-100 transition-opacity hover:scale-110 flex-shrink-0">
              <GripVertical className="text-primary w-4 h-4 sm:w-4 sm:h-4" />
            </div>
            <div className="flex-1 space-y-1.5 sm:space-y-2 min-w-0">
              <Input
                value={lesson.title}
                onChange={(e) => onUpdate(sectionId, lesson.id, { title: e.target.value })}
                placeholder="Lesson Title"
                className="font-semibold text-sm sm:text-base md:text-lg border-0 bg-transparent px-0 focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-muted-foreground/60 text-gray-900 dark:text-white"
              />
              <Textarea
                value={lesson.overview || ''}
                onChange={(e) => onUpdate(sectionId, lesson.id, { overview: e.target.value })}
                placeholder="Lesson overview or summary (optional)"
                rows={2}
                className="text-xs sm:text-sm resize-none border-0 bg-white/50 dark:bg-gray-800/50 rounded-lg sm:rounded-xl px-3 sm:px-3 py-2 sm:py-2 focus-visible:ring-2 focus-visible:ring-primary/20 text-gray-700 dark:text-gray-300"
              />
            </div>
          </div>
          <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
            {isRemovable && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onRemove(sectionId, lesson.id)}
                className="h-7 w-7 sm:h-8 sm:w-8 md:h-9 md:w-9 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg sm:rounded-xl transition-all duration-300"
              >
                <X className="w-3 h-3 sm:w-4 sm:h-4" />
              </Button>
            )}
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => onToggleCollapse(sectionId, lesson.id)}
              className="h-7 w-7 sm:h-8 sm:w-8 md:h-9 md:w-9 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg sm:rounded-xl transition-all duration-300"
            >
              {lesson.isCollapsed ? <ChevronDown className="w-3 h-3 sm:w-4 sm:h-4" /> : <ChevronUp className="w-3 h-3 sm:w-4 sm:h-4" />}
            </Button>
          </div>
        </div>

        {/* Content Management */}
        {!lesson.isCollapsed && (
          <div className="space-y-2 sm:space-y-3 ml-0 sm:ml-0 md:ml-0 lg:ml-4">
            {/* Add Content Button */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-1.5 sm:p-2 md:p-3 lg:p-6 bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 rounded-xl sm:rounded-2xl border-2 border-primary/20 hover:border-primary/30 transition-all duration-300 group gap-2 sm:gap-2">
              <div className="flex items-start sm:items-center gap-2 sm:gap-2 min-w-0 flex-1">
                <div className="w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 lg:w-12 lg:h-12 bg-gradient-to-br from-primary/100 to-primary/200 dark:from-primary-900/30 dark:to-primary-800/30 rounded-xl sm:rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300 flex-shrink-0">
                  <Plus className="w-4 h-4 sm:w-4 sm:h-4 md:w-6 md:h-6 text-primary-700 dark:text-primary-300" />
                </div>
                <div className="min-w-0">
                  <h4 className="text-sm sm:text-base md:text-lg font-semibold text-gray-900 dark:text-white">Add Content</h4>
                  <p className="text-xs sm:text-xs text-gray-600 dark:text-gray-300 hidden sm:block">Enhance your lesson with videos, assignments, quizzes, or attachments</p>
                </div>
              </div>
                  <Button
                onClick={() => onShowContentTypeSelector(lesson.id)}
                className="h-9 sm:h-9 md:h-11 px-4 sm:px-4 md:px-6 rounded-lg sm:rounded-xl bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary text-white shadow-lg hover:shadow-xl transition-all duration-300 text-xs sm:text-sm w-full sm:w-auto"
              >
                <Plus className="w-3 h-3 sm:w-4 sm:h-4 mr-1.5 sm:mr-1.5" />
                Add Content
                  </Button>
              </div>

            {/* Existing Content Items */}
            {lesson.contentItems.length > 0 ? (
              <div className="space-y-3">
                {canReorderContent && (
                  <div className="text-xs text-muted-foreground mb-1.5 flex items-center gap-1">
                    <GripVertical className="w-3 h-3" />
                    <span>Drag to reorder content items</span>
                  </div>
                )}
                {!canReorderContent && (currentUserRole === 'admin' || currentUserRole === 'super_user' || currentUserRole === 'teacher' || currentUserRole === 'content_creator') && courseStatus === 'Published' && (
                  <div className="text-xs text-amber-600 dark:text-amber-400 mb-1.5 flex items-center gap-1 bg-amber-50 dark:bg-amber-900/20 px-2.5 sm:px-2.5 py-1.5 sm:py-1.5 rounded-lg border border-amber-200 dark:border-amber-800">
                    <Info className="w-3 h-3" />
                    <span>Content reordering is disabled for published courses. Unpublish the course to make changes.</span>
                  </div>
                )}
                {canReorderContent ? (
                  <SortableContext 
                    items={lesson.contentItems.map(item => item.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    {lesson.contentItems.map((item) => (
                      <SortableContentItemComponent
                        key={item.id}
                        item={item}
                        lessonId={lesson.id}
                        sectionId={sectionId}
                        onUpdate={onUpdateContentItem}
                        onRemove={onRemoveContentItem}
                        isRemovable={true}
                        courseId={courseId}
                        canReorder={canReorderContent}
                        courseStatus={courseStatus}
                      />
                    ))}
                  </SortableContext>
                ) : (
                  lesson.contentItems.map((item) => (
                    <LessonContentItemComponent
                      key={item.id}
                      item={item}
                      lessonId={lesson.id}
                      sectionId={sectionId}
                      onUpdate={onUpdateContentItem}
                      onRemove={onRemoveContentItem}
                      isRemovable={true}
                      courseId={courseId}
                      canReorder={false}
                      courseStatus={courseStatus}
                    />
                  ))
                )}
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

// #region SortableContentItem Component
interface SortableContentItemProps {
  item: LessonContentItem;
  lessonId: string;
  sectionId: string;
  onUpdate: (lessonId: string, itemId: string, updatedItem: Partial<LessonContentItem>) => void;
  onRemove: (lessonId: string, itemId: string) => void;
  isRemovable: boolean;
  courseId: string | undefined;
  canReorder: boolean;
  courseStatus?: 'Draft' | 'Published' | 'Under Review' | 'Rejected';
}

const SortableContentItemComponent = memo(({ item, lessonId, sectionId, onUpdate, onRemove, isRemovable, courseId, canReorder, courseStatus }: SortableContentItemProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ 
    id: item.id,
    disabled: !canReorder,
    data: {
      type: 'contentItem',
      sectionId: sectionId,
      lessonId: lessonId
    }
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <LessonContentItemComponent
        item={item}
        lessonId={lessonId}
        sectionId={sectionId}
        onUpdate={onUpdate}
        onRemove={onRemove}
        isRemovable={isRemovable}
        courseId={courseId}
        canReorder={canReorder}
        dragHandleProps={canReorder ? { ...attributes, ...listeners } : {}}
        courseStatus={courseStatus}
      />
    </div>
  );
});

SortableContentItemComponent.displayName = "SortableContentItemComponent";
// #endregion

// #region QuizBuilder Component
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
      <div className="relative w-8 h-8 rounded-md overflow-hidden border border-purple-200 dark:border-purple-700 bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
        <div className="w-3 h-3 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!signedUrl) {
    return (
      <div className="relative w-8 h-8 rounded-md overflow-hidden border border-red-200 dark:border-red-700 bg-red-50 dark:bg-red-900/20 flex items-center justify-center">
        <X className="w-3 h-3 text-red-500" />
      </div>
    );
  }

  return (
    <div 
      className="relative w-8 h-8 rounded-md overflow-hidden border border-purple-200 dark:border-purple-700 cursor-pointer hover:border-purple-400 dark:hover:border-purple-500 transition-colors"
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

const QuizBuilder = ({ quiz, onQuizChange }: { quiz: QuizData, onQuizChange: (quiz: QuizData) => void }) => {
  const [showPDFUploader, setShowPDFUploader] = useState(false);
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const [selectedImageUrl, setSelectedImageUrl] = useState<string>('');
  const [imageLoading, setImageLoading] = useState(false);
  
  const addQuestion = () => {
    const newQuestion: QuizQuestion = {
      id: Date.now().toString(),
      question_text: '',
      question_type: 'single_choice',
      options: [],
      position: (quiz.questions.length || 0) + 1,
      points: 1 // Default points
    };
    onQuizChange({ ...quiz, questions: [...quiz.questions, newQuestion] });
  };

  const handlePDFQuizExtracted = (extractedQuiz: QuizData) => {
    // Merge extracted questions with existing ones
    const mergedQuiz: QuizData = {
      id: quiz.id || extractedQuiz.id,
      questions: [
        ...quiz.questions,
        ...extractedQuiz.questions.map(q => ({
          ...q,
          position: quiz.questions.length + q.position
        }))
      ]
    };
    onQuizChange(mergedQuiz);
    setShowPDFUploader(false);
  };

  const updateQuestion = (qIndex: number, text: string) => {
    const updatedQuestions = quiz.questions.map((q, i) => i === qIndex ? { ...q, question_text: text } : q);
    onQuizChange({ ...quiz, questions: updatedQuestions });
  };
  
  const updateQuestionType = (qIndex: number, type: 'single_choice' | 'multiple_choice' | 'text_answer' | 'math_expression') => {
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
        } else if (type === 'math_expression') {
          // For math expression questions, we don't need options
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

  const updateMathExpression = (qIndex: number, expression: string) => {
    const updatedQuestions = quiz.questions.map((q, i) => 
      i === qIndex ? { ...q, math_expression: expression } : q
    );
    onQuizChange({ ...quiz, questions: updatedQuestions });
  };

  const updateMathTolerance = (qIndex: number, tolerance: number) => {
    const updatedQuestions = quiz.questions.map((q, i) => 
      i === qIndex ? { ...q, math_tolerance: tolerance } : q
    );
    onQuizChange({ ...quiz, questions: updatedQuestions });
  };

  const updateMathHint = (qIndex: number, hint: string) => {
    const updatedQuestions = quiz.questions.map((q, i) => 
      i === qIndex ? { ...q, math_hint: hint } : q
    );
    onQuizChange({ ...quiz, questions: updatedQuestions });
  };

  const updateMathAllowDrawing = (qIndex: number, allowDrawing: boolean) => {
    const updatedQuestions = quiz.questions.map((q, i) => 
      i === qIndex ? { ...q, math_allow_drawing: allowDrawing } : q
    );
    onQuizChange({ ...quiz, questions: updatedQuestions });
  };

  const updateQuestionPoints = (qIndex: number, points: number) => {
    const updatedQuestions = quiz.questions.map((q, i) => 
      i === qIndex ? { ...q, points: points } : q
    );
    onQuizChange({ ...quiz, questions: updatedQuestions });
  };

  const handleImageUpload = async (qIndex: number, file: File) => {
    try {
      // Create a unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `quiz-question-${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `quiz-images/${fileName}`;

      // Upload to Supabase storage
      const { data, error } = await supabase.storage
        .from('dil-lms')
        .upload(filePath, file);

      if (error) {
        toast.error('Failed to upload image');
        return;
      }

      // Store the file path instead of public URL for later signed URL generation
      // Update the question with the file path
      const updatedQuestions = quiz.questions.map((q, i) => 
        i === qIndex ? { ...q, image_url: filePath } : q
      );
      onQuizChange({ ...quiz, questions: updatedQuestions });

      toast.success('Image uploaded successfully');
    } catch (error) {
      console.error('Error uploading image:', error);
      toast.error('Failed to upload image');
    }
  };

  const removeImage = (qIndex: number) => {
    const updatedQuestions = quiz.questions.map((q, i) => 
      i === qIndex ? { ...q, image_url: undefined } : q
    );
    onQuizChange({ ...quiz, questions: updatedQuestions });
    toast.success('Image removed');
  };

  const getSignedImageUrl = async (filePath: string): Promise<string | null> => {
    try {
      const { data, error } = await supabase.storage
        .from('dil-lms')
        .createSignedUrl(filePath, 3600); // 1 hour expiry
      
      if (error) {
        console.error('Error creating signed URL:', error);
        return null;
      }
      
      return data.signedUrl;
    } catch (error) {
      console.error('Error creating signed URL:', error);
      return null;
    }
  };

  const openImageModal = async (imageUrl: string) => {
    setImageLoading(true);
    setImageModalOpen(true);
    setSelectedImageUrl(''); // Clear previous image
    
    // Check if it's already a signed URL or if we need to create one
    let signedUrl = imageUrl;
    if (!imageUrl.startsWith('http')) {
      // It's a file path, create signed URL
      const url = await getSignedImageUrl(imageUrl);
      if (url) {
        signedUrl = url;
      } else {
        toast.error('Failed to load image');
        setImageLoading(false);
        setImageModalOpen(false);
        return;
      }
    }
    setSelectedImageUrl(signedUrl);
    setImageLoading(false);
  };
  
  return (
    <div className="w-full space-y-4 sm:space-y-6">
      {/* PDF Import Section - Show when there are no questions */}
      {quiz.questions.length === 0 && (
        <Card className="border-2 border-dashed border-purple-300 dark:border-purple-600 bg-purple-50/30 dark:bg-purple-900/10">
          <CardContent className="p-4 sm:p-6 md:p-8 text-center">
            <FileText className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 mx-auto mb-3 sm:mb-4 text-purple-500" />
            <h3 className="text-base sm:text-lg md:text-xl font-semibold mb-1 sm:mb-2 text-purple-700 dark:text-purple-300">
              Import Quiz from PDF
            </h3>
            <p className="text-xs sm:text-sm md:text-base text-purple-600 dark:text-purple-400 mb-4 sm:mb-6">
              Upload a PDF file and let our system extract quiz questions automatically
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-2 sm:gap-4">
              <Dialog open={showPDFUploader} onOpenChange={setShowPDFUploader}>
                <DialogTrigger asChild>
                  <Button className="bg-purple-600 hover:bg-purple-700 text-white h-9 sm:h-10 text-xs sm:text-sm w-full sm:w-auto">
                    <Upload className="w-3 h-3 sm:w-4 sm:h-4 mr-2" />
                    Import from PDF
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-[95vw] sm:max-w-4xl max-h-[90vh] overflow-hidden">
                  <PDFQuizUploader 
                    onQuizExtracted={handlePDFQuizExtracted}
                    onClose={() => setShowPDFUploader(false)}
                  />
                </DialogContent>
              </Dialog>
              <Button variant="outline" onClick={addQuestion} className="h-9 sm:h-10 text-xs sm:text-sm w-full sm:w-auto">
                <Plus className="w-3 h-3 sm:w-4 sm:h-4 mr-2" />
                Create Manually
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
      
      {quiz.questions.map((question, qIndex) => (
        <Card key={question.id} className="overflow-hidden border-2 border-gray-200 dark:border-gray-700 shadow-lg hover:shadow-xl transition-all duration-300">
          <CardHeader className="bg-gradient-to-r from-purple-50 to-purple-100/50 dark:from-purple-900/10 dark:to-purple-800/10 border-b border-purple-200/50 dark:border-purple-700/30 p-2 sm:p-3 md:p-6">
            <div className="flex items-start sm:items-center gap-2 sm:gap-2">
              <div className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-xs sm:text-sm font-semibold text-purple-700 dark:text-purple-300">
                  {qIndex + 1}
                </span>
              </div>
              <div className="flex-1 text-gray-900 dark:text-white min-w-0">
              <Input
                value={question.question_text}
                onChange={(e) => updateQuestion(qIndex, e.target.value)}
                placeholder={`Question ${qIndex + 1}`}
                className="w-full border border-purple-200 dark:border-purple-700 bg-white dark:bg-gray-800 rounded-lg sm:rounded-xl px-3 py-2 sm:px-4 sm:py-3 focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:border-purple-500 placeholder:text-gray-500 dark:placeholder:text-gray-400 text-gray-900 dark:text-white hover:border-purple-300 dark:hover:border-purple-600 transition-colors text-sm sm:text-base"
              />
              </div>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => removeQuestion(qIndex)}
                className="h-8 w-8 sm:h-9 sm:w-9 md:h-10 md:w-10 hover:bg-red-100 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400 rounded-lg sm:rounded-xl transition-all duration-300 flex-shrink-0"
              >
                <X className="w-4 h-4 sm:w-5 sm:h-5" />
              </Button>
            </div>
            
            {/* Question Type Selector */}
            <div className="mt-2 sm:mt-3 flex flex-col sm:flex-row sm:flex-wrap items-start sm:items-center gap-2 sm:gap-3">
              <Label className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap">
                Question Type:
              </Label>
              <Select
                value={question.question_type}
                onValueChange={(value: 'single_choice' | 'multiple_choice' | 'text_answer' | 'math_expression') => updateQuestionType(qIndex, value)}
              >
                <SelectTrigger className="w-full sm:w-44 md:w-48 h-8 sm:h-9 border-2 border-purple-200 dark:border-purple-700 rounded-lg bg-white/60 dark:bg-gray-800/60 text-xs sm:text-sm">
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
                  <SelectItem value="math_expression" className="rounded-lg hover:bg-purple-50 hover:text-gray-900 dark:hover:bg-purple-900/20 dark:hover:text-white transition-colors">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-green-500 bg-green-500"></div>
                      Math Expression
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              
              {/* Points Input */}
              <div className="flex items-center gap-2">
                <Label className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap">
                  Points:
                </Label>
                <Input
                  type="number"
                  min="1"
                  step="1"
                  value={question.points || 1}
                  onChange={(e) => updateQuestionPoints(qIndex, parseInt(e.target.value) || 1)}
                  className="w-16 sm:w-20 h-8 sm:h-9 border-2 border-purple-200 dark:border-purple-700 rounded-lg bg-white/60 dark:bg-gray-800/60 text-center text-sm"
                />
              </div>
              
              <div className="hidden lg:flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
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
                ) : question.question_type === 'text_answer' ? (
                  <>
                    <div className="w-3 h-3 border-2 border-purple-500 bg-purple-500"></div>
                    <span>Manual grading required</span>
                  </>
                ) : (
                  <>
                    <div className="w-3 h-3 border-2 border-green-500 bg-green-500"></div>
                    <span>Mathematical expression</span>
                  </>
                )}
              </div>
              
              {/* Question Type Badge */}
              <Badge 
                variant={question.question_type === 'single_choice' ? 'secondary' : question.question_type === 'multiple_choice' ? 'default' : question.question_type === 'math_expression' ? 'secondary' : 'outline'}
                className={`text-[10px] sm:text-xs hidden sm:inline-flex ${
                  question.question_type === 'single_choice' 
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border-blue-200 dark:border-blue-700' 
                    : question.question_type === 'multiple_choice'
                    ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 border-purple-200 dark:border-purple-700'
                    : question.question_type === 'math_expression'
                    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 border-green-200 dark:border-green-700'
                    : 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300 border-orange-200 dark:border-orange-700'
                }`}
              >
                {question.question_type === 'single_choice' ? 'Single Choice' : question.question_type === 'multiple_choice' ? 'Multiple Choice' : question.question_type === 'math_expression' ? 'Math Expression' : 'Text Answer'}
              </Badge>
              
              {/* Compact Image Upload Button */}
              {question.image_url ? (
                <div className="flex items-center gap-2">
                  <QuizQuestionImage 
                    imageUrl={question.image_url}
                    onClick={() => openImageModal(question.image_url!)}
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeImage(qIndex)}
                    className="h-6 w-6 p-0 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              ) : (
                <label className="cursor-pointer">
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/gif"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file && file.size <= 5 * 1024 * 1024) {
                        handleImageUpload(qIndex, file);
                      } else if (file) {
                        toast.error('File size must be less than 5MB');
                      }
                    }}
                    className="hidden"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-6 px-2 text-xs border-purple-200 dark:border-purple-700 text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20"
                    asChild
                  >
                    <span>
                      <ImageIcon className="w-3 h-3 mr-1" />
                      Image
                    </span>
                  </Button>
                </label>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-2 sm:p-3 md:p-6 space-y-3 sm:space-y-4">
            {question.question_type === 'text_answer' ? (
              <div className="p-2 sm:p-3 md:p-6 bg-gradient-to-r from-orange-50 to-orange-100/50 dark:from-orange-900/10 dark:to-orange-800/10 rounded-lg sm:rounded-xl border border-orange-200/50 dark:border-orange-700/30">
                <div className="flex items-start sm:items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
                  <div className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-xs sm:text-sm font-semibold text-orange-700 dark:text-orange-300">📝</span>
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-semibold text-sm sm:text-base text-orange-900 dark:text-orange-100">Text Answer Question</h4>
                    <p className="text-xs sm:text-sm text-orange-700 dark:text-orange-300">Students will provide written answers that require manual grading by teachers</p>
                  </div>
                </div>
                <div className="text-[10px] sm:text-xs text-orange-600 dark:text-orange-400">
                  This question will appear in the manual grading queue for teachers
                </div>
              </div>
            ) : question.question_type === 'math_expression' ? (
              <div className="p-3 sm:p-4 md:p-6 bg-gradient-to-r from-green-50 to-green-100/50 dark:from-green-900/10 dark:to-green-800/10 rounded-lg sm:rounded-xl border border-green-200/50 dark:border-green-700/30">
                <div className="flex items-start sm:items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
                  <div className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-xs sm:text-sm font-semibold text-green-700 dark:text-green-300">🧮</span>
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-semibold text-sm sm:text-base text-green-900 dark:text-green-100">Math Expression Question</h4>
                    <p className="text-xs sm:text-sm text-green-700 dark:text-green-300">Students will input mathematical expressions using LaTeX notation</p>
                  </div>
                </div>
                
                <div className="space-y-3 sm:space-y-4">
                  <div>
                    <Label htmlFor={`math-expression-${qIndex}`} className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">
                      Expected Answer (LaTeX)
                    </Label>
                    <Input
                      id={`math-expression-${qIndex}`}
                      value={question.math_expression || ''}
                      onChange={(e) => updateMathExpression(qIndex, e.target.value)}
                      placeholder="e.g., \\frac{x^2 + 1}{x - 1}"
                      className="mt-1 font-mono text-xs sm:text-sm"
                    />
                    <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Enter the correct mathematical expression in LaTeX format
                    </p>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <div>
                      <Label htmlFor={`math-tolerance-${qIndex}`} className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">
                        Tolerance (0.01 = 1%)
                      </Label>
                      <Input
                        id={`math-tolerance-${qIndex}`}
                        type="number"
                        step="0.01"
                        min="0"
                        max="1"
                        value={question.math_tolerance || 0.01}
                        onChange={(e) => updateMathTolerance(qIndex, parseFloat(e.target.value) || 0.01)}
                        className="mt-1 text-sm"
                      />
                    </div>
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id={`math-allow-drawing-${qIndex}`}
                        checked={question.math_allow_drawing === true}
                        onChange={(e) => updateMathAllowDrawing(qIndex, e.target.checked)}
                        className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                      />
                      <Label htmlFor={`math-allow-drawing-${qIndex}`} className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">
                        Allow Drawing
                      </Label>
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor={`math-hint-${qIndex}`} className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">
                      Hint (Optional)
                    </Label>
                    <Textarea
                      id={`math-hint-${qIndex}`}
                      value={question.math_hint || ''}
                      onChange={(e) => updateMathHint(qIndex, e.target.value)}
                      placeholder="e.g., Remember to simplify fractions to their lowest terms"
                      className="mt-1 text-xs sm:text-sm"
                      rows={2}
                    />
                  </div>
                </div>
                
                <div className="text-[10px] sm:text-xs text-green-600 dark:text-green-400 mt-3">
                  This question will be automatically graded based on mathematical equivalence
                </div>
              </div>
            ) : (
              <>
                {question.options.map((option, oIndex) => (
                  <div key={option.id} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-2 p-2 sm:p-3 bg-gradient-to-r from-gray-50 to-gray-100/50 dark:from-gray-800/50 dark:to-gray-700/50 rounded-lg sm:rounded-xl border border-gray-200/50 dark:border-gray-600/30 hover:border-gray-300 dark:hover:border-gray-500 transition-all duration-300">
                    <div className="flex-1 text-gray-900 dark:text-white min-w-0">
                    <Input
                      value={option.option_text}
                      onChange={(e) => updateOption(qIndex, oIndex, e.target.value)}
                      placeholder={`Option ${oIndex + 1}`}
                      className="w-full border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 rounded-lg sm:rounded-xl px-3 py-2 sm:px-4 sm:py-3 focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:border-purple-500 placeholder:text-gray-500 dark:placeholder:text-gray-400 text-gray-900 dark:text-white hover:border-gray-300 dark:hover:border-gray-500 transition-colors text-sm"
                    />
                    </div>
                    <div className="flex items-center gap-2 self-stretch sm:self-auto">
                    <Button
                      variant={option.is_correct ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setCorrectOption(qIndex, option.id)}
                      className={`h-8 sm:h-9 px-3 sm:px-4 rounded-lg sm:rounded-xl transition-all duration-300 text-xs sm:text-sm flex-1 sm:flex-initial ${
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
                      className="h-8 w-8 sm:h-9 sm:w-9 hover:bg-red-100 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400 rounded-lg sm:rounded-xl transition-all duration-300 flex-shrink-0"
                    >
                      <X className="w-3 h-3 sm:w-4 sm:h-4" />
                    </Button>
                    </div>
                  </div>
                ))}
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => addOption(qIndex)}
                  className="w-full h-9 sm:h-10 border-2 border-dashed border-purple-300 dark:border-purple-600 rounded-lg sm:rounded-xl text-purple-600 dark:text-purple-400 hover:bg-purple-50 hover:text-purple-700 dark:hover:bg-purple-900/10 dark:hover:text-purple-300 hover:border-purple-400 dark:hover:border-purple-500 transition-all duration-300 group text-xs sm:text-sm"
                >
                  <Plus className="w-3 h-3 sm:w-4 sm:h-4 mr-2 group-hover:scale-110 transition-transform duration-300" />
                  Add Option
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      ))}
      {/* Add Question Section */}
      {quiz.questions.length > 0 ? (
        <div className="flex flex-col lg:flex-row gap-2 sm:gap-4">
      <Button 
        onClick={addQuestion}
            className="w-full lg:flex-1 h-10 sm:h-11 md:h-12 border-2 border-dashed border-purple-300 dark:border-purple-600 rounded-xl sm:rounded-2xl text-purple-600 dark:text-purple-400 hover:bg-purple-50 hover:text-purple-700 dark:hover:bg-purple-900/10 dark:hover:text-purple-300 hover:border-purple-400 dark:hover:border-purple-500 transition-all duration-300 group text-xs sm:text-sm"
      >
        <Plus className="w-4 h-4 sm:w-5 sm:h-5 mr-2 group-hover:scale-110 transition-transform duration-300" />
            Add Question Manually
      </Button>
          <Dialog open={showPDFUploader} onOpenChange={setShowPDFUploader}>
            <DialogTrigger asChild>
              <Button 
                variant="outline"
                className="w-full lg:flex-1 h-10 sm:h-11 md:h-12 border-2 border-dashed border-blue-300 dark:border-blue-600 rounded-xl sm:rounded-2xl text-blue-600 dark:text-blue-400 hover:bg-blue-50 hover:text-blue-700 dark:hover:bg-blue-900/10 dark:hover:text-blue-300 hover:border-blue-400 dark:hover:border-blue-500 transition-all duration-300 group text-xs sm:text-sm"
              >
                <Upload className="w-4 h-4 sm:w-5 sm:h-5 mr-2 group-hover:scale-110 transition-transform duration-300" />
                Import More from PDF
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-[95vw] sm:max-w-4xl max-h-[90vh] overflow-hidden">
              <PDFQuizUploader 
                onQuizExtracted={handlePDFQuizExtracted}
                onClose={() => setShowPDFUploader(false)}
              />
            </DialogContent>
          </Dialog>
        </div>
      ) : null}
      
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
          <div className="flex items-center justify-center p-4 min-h-[400px]">
            {imageLoading ? (
              <div className="flex flex-col items-center justify-center space-y-4">
                <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                <div className="text-center">
                  <p className="text-lg font-medium text-foreground">Loading Image</p>
                  <p className="text-sm text-muted-foreground">Please wait while we prepare the image...</p>
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
              <div className="flex flex-col items-center justify-center space-y-4">
                <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center">
                  <ImageIcon className="w-8 h-8 text-red-500" />
                </div>
                <div className="text-center">
                  <p className="text-lg font-medium text-foreground">Image Not Available</p>
                  <p className="text-sm text-muted-foreground">The image could not be loaded</p>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
// #endregion

const CourseBuilder = () => {
  const { courseId } = useParams();
  const { user } = useAuth();
  const { profile, loading: profileLoading } = useUserProfile();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('details');
  const [saveAction, setSaveAction] = useState<null | 'draft' | 'publish' | 'unpublish' | 'review' | 'approve' | 'reject'>(null);
  const isSaving = saveAction !== null;
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isCreateDraftConfirmOpen, setIsCreateDraftConfirmOpen] = useState(false);
  const [isRejectionDialogOpen, setIsRejectionDialogOpen] = useState(false);
  const [rejectionFeedback, setRejectionFeedback] = useState("");
  const [isStripeEnabled, setIsStripeEnabled] = useState(false);
  const [priceInputValue, setPriceInputValue] = useState('');
  const [persistentFeedback, setPersistentFeedback] = useState<string | null>(null);
  const [isSchoolRemovalDialogOpen, setIsSchoolRemovalDialogOpen] = useState(false);
  const [schoolsToRemove, setSchoolsToRemove] = useState<string[]>([]);
  const [affectedClasses, setAffectedClasses] = useState<ClassWithMembers[]>([]);
  const [affectedTeachers, setAffectedTeachers] = useState<{ id: string; name: string; email: string; avatar_url?: string }[]>([]);
  const [affectedStudents, setAffectedStudents] = useState<{ id: string; name: string; email: string; avatar_url?: string }[]>([]);
  
  // Hierarchical removal dialog states
  const [isCountryRemovalDialogOpen, setIsCountryRemovalDialogOpen] = useState(false);
  const [countriesToRemove, setCountriesToRemove] = useState<string[]>([]);
  const [affectedRegions, setAffectedRegions] = useState<Region[]>([]);
  const [affectedCities, setAffectedCities] = useState<City[]>([]);
  const [affectedProjects, setAffectedProjects] = useState<Project[]>([]);
  const [affectedBoards, setAffectedBoards] = useState<Board[]>([]);
  const [affectedSchools, setAffectedSchools] = useState<School[]>([]);
  const [affectedClassesFromHierarchy, setAffectedClassesFromHierarchy] = useState<ClassWithMembers[]>([]);
  const [affectedTeachersFromHierarchy, setAffectedTeachersFromHierarchy] = useState<{ id: string; name: string; email: string; avatar_url?: string }[]>([]);
  const [affectedStudentsFromHierarchy, setAffectedStudentsFromHierarchy] = useState<{ id: string; name: string; email: string; avatar_url?: string }[]>([]);
  
  // Region removal dialog states
  const [isRegionRemovalDialogOpen, setIsRegionRemovalDialogOpen] = useState(false);
  const [regionsToRemove, setRegionsToRemove] = useState<string[]>([]);
  const [affectedCitiesFromRegion, setAffectedCitiesFromRegion] = useState<City[]>([]);
  const [affectedProjectsFromRegion, setAffectedProjectsFromRegion] = useState<Project[]>([]);
  const [affectedBoardsFromRegion, setAffectedBoardsFromRegion] = useState<Board[]>([]);
  const [affectedSchoolsFromRegion, setAffectedSchoolsFromRegion] = useState<School[]>([]);
  const [affectedClassesFromRegion, setAffectedClassesFromRegion] = useState<ClassWithMembers[]>([]);
  const [affectedTeachersFromRegion, setAffectedTeachersFromRegion] = useState<{ id: string; name: string; email: string; avatar_url?: string }[]>([]);
  const [affectedStudentsFromRegion, setAffectedStudentsFromRegion] = useState<{ id: string; name: string; email: string; avatar_url?: string }[]>([]);
  
  // City removal dialog states
  const [isCityRemovalDialogOpen, setIsCityRemovalDialogOpen] = useState(false);
  const [citiesToRemove, setCitiesToRemove] = useState<string[]>([]);
  const [affectedProjectsFromCity, setAffectedProjectsFromCity] = useState<Project[]>([]);
  const [affectedBoardsFromCity, setAffectedBoardsFromCity] = useState<Board[]>([]);
  const [affectedSchoolsFromCity, setAffectedSchoolsFromCity] = useState<School[]>([]);
  const [affectedClassesFromCity, setAffectedClassesFromCity] = useState<ClassWithMembers[]>([]);
  const [affectedTeachersFromCity, setAffectedTeachersFromCity] = useState<{ id: string; name: string; email: string; avatar_url?: string }[]>([]);
  const [affectedStudentsFromCity, setAffectedStudentsFromCity] = useState<{ id: string; name: string; email: string; avatar_url?: string }[]>([]);
  
  // Project removal dialog states
  const [isProjectRemovalDialogOpen, setIsProjectRemovalDialogOpen] = useState(false);
  const [projectsToRemove, setProjectsToRemove] = useState<string[]>([]);
  const [affectedBoardsFromProject, setAffectedBoardsFromProject] = useState<Board[]>([]);
  const [affectedSchoolsFromProject, setAffectedSchoolsFromProject] = useState<School[]>([]);
  const [affectedClassesFromProject, setAffectedClassesFromProject] = useState<ClassWithMembers[]>([]);
  const [affectedTeachersFromProject, setAffectedTeachersFromProject] = useState<{ id: string; name: string; email: string; avatar_url?: string }[]>([]);
  const [affectedStudentsFromProject, setAffectedStudentsFromProject] = useState<{ id: string; name: string; email: string; avatar_url?: string }[]>([]);
  
  // Board removal dialog states
  const [isBoardRemovalDialogOpen, setIsBoardRemovalDialogOpen] = useState(false);
  const [boardsToRemove, setBoardsToRemove] = useState<string[]>([]);
  const [affectedSchoolsFromBoard, setAffectedSchoolsFromBoard] = useState<School[]>([]);
  const [affectedClassesFromBoard, setAffectedClassesFromBoard] = useState<ClassWithMembers[]>([]);
  const [affectedTeachersFromBoard, setAffectedTeachersFromBoard] = useState<{ id: string; name: string; email: string; avatar_url?: string }[]>([]);
  const [affectedStudentsFromBoard, setAffectedStudentsFromBoard] = useState<{ id: string; name: string; email: string; avatar_url?: string }[]>([]);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const preDragLessonStatesRef = useRef<Record<string, boolean>>({});
  const [activeId, setActiveId] = useState<string | null>(null);
  const [categories, setCategories] = useState<{ id: number; name: string; }[]>([]);
  const [languages, setLanguages] = useState<{ id: number; name: string; }[]>([]);
  const [levels, setLevels] = useState<{ id: number; name: string; }[]>([]);
  const [allTeachers, setAllTeachers] = useState<{ label: string; value: string; }[]>([]);
  const [allStudents, setAllStudents] = useState<{ label: string; value: string; }[]>([]);
  const [userProfiles, setUserProfiles] = useState<Profile[]>([]);
  const [currentUserRole, setCurrentUserRole] = useState<'student' | 'teacher' | 'admin' | 'content_creator' | 'super_user' | 'view_only' | null>(null);
  
  // Hierarchical data state
  const [countries, setCountries] = useState<Country[]>([]);
  const [regions, setRegions] = useState<Region[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [boards, setBoards] = useState<Board[]>([]);
  const [schools, setSchools] = useState<School[]>([]);
  const [isLoadingHierarchicalData, setIsLoadingHierarchicalData] = useState(false);
  
  // Class management state
  const [isClassCreateDialogOpen, setIsClassCreateDialogOpen] = useState(false);
  const [isClassEditDialogOpen, setIsClassEditDialogOpen] = useState(false);
  const [isClassViewDialogOpen, setIsClassViewDialogOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<ClassWithMembers | null>(null);
  const [viewingClass, setViewingClass] = useState<ClassWithMembers | null>(null);
  const [classFormData, setClassFormData] = useState({
    name: '',
    code: '',
    grade: '',
    school_id: '',
    board_id: '',
    description: '',
    max_students: '30',
    teachers: [] as string[],
    students: [] as string[]
  });
  
  // Selected classes for course enrollment
  const [selectedClasses, setSelectedClasses] = useState<string[]>([]);
  

  // Class management hooks
  // Determine if current user is a teacher (use profile.role for more reliable role checking)
  const isTeacher = profile?.role === 'teacher';
  const teacherId = isTeacher ? user?.id : undefined;
  
  // Only fetch classes after profile is loaded to ensure correct filtering
  const shouldFetchClasses = !profileLoading && !!user;
  
  const { classes: dbClasses, loading: classesLoading, stats: classStats, createClass, updateClass, deleteClass, refetch: refetchClasses } = useClasses(teacherId, shouldFetchClasses);
  const { teachers: classTeachers, loading: classTeachersLoading } = useTeachers();
  const { students: classStudents, loading: classStudentsLoading } = useStudents();
  const { boards: classBoards, loading: classBoardsLoading } = useBoards();
  const { schools: classSchools, loading: classSchoolsLoading } = useSchools(classFormData.board_id);
  
  
  // Filter classes to show only selected ones
  const enrolledClasses = dbClasses.filter(cls => selectedClasses.includes(cls.id));
  
  // Debug: Log enrolled classes info
  console.log('Debug - selectedClasses:', selectedClasses);
  console.log('Debug - dbClasses count:', dbClasses.length);
  console.log('Debug - enrolledClasses count:', enrolledClasses.length);
  console.log('Debug - enrolledClasses:', enrolledClasses);


  // Handle class selection for course enrollment
  const handleClassSelection = (classIds: string[]) => {
    setSelectedClasses(classIds);
    
    // Update course data with selected class IDs
    setCourseData(prev => ({
      ...prev,
      class_ids: classIds
    }));
    
    // Get all teachers and students from selected classes
    const selectedClassObjects = dbClasses.filter(cls => classIds.includes(cls.id));
    const allTeachers = selectedClassObjects.flatMap(cls => cls.teachers);
    const allStudents = selectedClassObjects.flatMap(cls => cls.students);
    
    // Remove duplicates based on ID
    const uniqueTeachers = allTeachers.filter((teacher, index, self) => 
      index === self.findIndex(t => t.id === teacher.id)
    );
    const uniqueStudents = allStudents.filter((student, index, self) => 
      index === self.findIndex(s => s.id === student.id)
    );
    
    // Update course data with teachers and students from selected classes
    // BUT preserve any additional teachers/students that are not from ANY classes
    setCourseData(prev => {
      // Get ALL class teacher/student IDs from dbClasses (not just current ones)
      const allClassTeacherIds = dbClasses.flatMap(cls => cls.teachers.map(t => t.id));
      const allClassStudentIds = dbClasses.flatMap(cls => cls.students.map(s => s.id));
      
      // Preserve teachers and students that are NOT from ANY classes (manually added members)
      const additionalTeachers = prev.teachers.filter(teacher => !allClassTeacherIds.includes(teacher.id));
      const additionalStudents = prev.students.filter(student => !allClassStudentIds.includes(student.id));
      
      // Merge NEW class members with additional members
      const mergedTeachers = [...uniqueTeachers, ...additionalTeachers];
      const mergedStudents = [...uniqueStudents, ...additionalStudents];
      
      // Remove duplicates from merged arrays
      const finalTeachers = mergedTeachers.filter((teacher, index, self) => 
        index === self.findIndex(t => t.id === teacher.id)
      );
      const finalStudents = mergedStudents.filter((student, index, self) => 
        index === self.findIndex(s => s.id === student.id)
      );
      
      console.log('Debug - Class selection update:', {
        selectedClassIds: classIds,
        uniqueTeachersFromClasses: uniqueTeachers.length,
        uniqueStudentsFromClasses: uniqueStudents.length,
        additionalTeachers: additionalTeachers.length,
        additionalStudents: additionalStudents.length,
        finalTeachers: finalTeachers.length,
        finalStudents: finalStudents.length
      });
      
      return {
        ...prev,
        teachers: finalTeachers,
        students: finalStudents
      };
    });
  };

  // Refresh course teachers and students from enrolled classes
  const refreshCourseMembers = () => {
    if (selectedClasses.length > 0) {
      handleClassSelection(selectedClasses);
    }
  };
  
  const [isUploading, setIsUploading] = useState(false);
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});
  const [touchedFields, setTouchedFields] = useState<Partial<Record<keyof ValidationErrors, boolean>>>({});
  const [imageDbPath, setImageDbPath] = useState<string | undefined>();
  const [isLoadingPage, setIsLoadingPage] = useState(true);
  const [showContentTypeSelector, setShowContentTypeSelector] = useState(false);
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null);
  const [classes, setClasses] = useState<Class[]>(MOCK_CLASSES);
  const [courseData, setCourseData] = useState<CourseData>(() => ({
    title: '',
    subtitle: '',
    description: '',
    category: '',
    language: 'English',
    level: 'Beginner',
    country_ids: [],
    region_ids: [],
    city_ids: [],
    project_ids: [],
    board_ids: [],
    school_ids: [],
    class_ids: [],
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
    // Stripe payment fields
    payment_type: 'free',
    course_price: 0,
  }));

  // Filter classes based on selected schools
  const filteredClasses = useMemo(() => {
    if (courseData.school_ids.length === 0) {
      return [];
    }
    return dbClasses.filter(cls => courseData.school_ids.includes(cls.school_id));
  }, [dbClasses, courseData.school_ids]);

  const handleBlur = (field: keyof ValidationErrors) => {
    setTouchedFields(prev => ({ ...prev, [field]: true }));
  };

  useEffect(() => {
    // Real-time validation as user types
    setValidationErrors(validateCourseData(courseData));
  }, [courseData]);

  // Check Stripe integration status
  useEffect(() => {
    const checkStripeIntegration = async () => {
      try {
        console.log('Checking Stripe integration...');
        
        // Try both 'Stripe' and 'stripe' to handle case sensitivity
        let { data, error } = await supabase
          .from('integrations')
          .select('status, is_configured')
          .eq('name', 'Stripe')
          .single();
        
        // If not found, try lowercase
        if (error && error.code === 'PGRST116') {
          console.log('Trying lowercase "stripe"...');
          const result = await supabase
            .from('integrations')
            .select('status, is_configured')
            .eq('name', 'stripe')
            .single();
          data = result.data;
          error = result.error;
        }
        
        console.log('Stripe integration data:', data);
        console.log('Stripe integration error:', error);
        
        if (!error && data) {
          const isEnabled = data.status === 'enabled' && data.is_configured;
          console.log('Stripe enabled:', isEnabled);
          setIsStripeEnabled(isEnabled);
        } else {
          console.log('Stripe integration not found or error occurred');
          setIsStripeEnabled(false);
        }
      } catch (error) {
        console.error('Error checking Stripe integration:', error);
        setIsStripeEnabled(false);
      }
    };
    
    checkStripeIntegration();
  }, []);

  // Sync price input value with course data
  useEffect(() => {
    if (courseData.course_price && courseData.course_price > 0) {
      setPriceInputValue((courseData.course_price / 100).toString());
    } else {
      setPriceInputValue('');
    }
  }, [courseData.course_price]);

  // Reset price input when switching to free course
  useEffect(() => {
    if (courseData.payment_type === 'free') {
      setPriceInputValue('');
    }
  }, [courseData.payment_type]);

  // Create a hash of the selected classes' member data to detect changes
  const selectedClassesMembersHash = useMemo(() => {
    if (selectedClasses.length === 0 || dbClasses.length === 0) return '';
    
    const selectedClassObjects = dbClasses.filter(cls => selectedClasses.includes(cls.id));
    const hashData = selectedClassObjects.map(cls => ({
      id: cls.id,
      teachers: cls.teachers.map(t => t.id).sort(),
      students: cls.students.map(s => s.id).sort()
    }));
    
    return JSON.stringify(hashData);
  }, [selectedClasses, dbClasses]);
  
  // Effect to detect member changes in selected classes and refresh course members
  useEffect(() => {
    if (selectedClasses.length > 0 && dbClasses.length > 0) {
      refreshCourseMembers();
    }
  }, [selectedClassesMembersHash]);

  // Reset selected classes when schools change (only for new courses)
  useEffect(() => {
    // Only reset if we're creating a new course, not loading an existing one
    if (!courseId || courseId === 'new') {
      setSelectedClasses([]);
      setCourseData(prev => ({
        ...prev,
        teachers: [],
        students: []
      }));
    }
  }, [courseData.school_ids, courseId]);

  // Functions to fetch hierarchical data from database
  const fetchCountries = async () => {
    try {
      const { data, error } = await supabase
        .from('countries')
        .select('id, name, code, description')
        .order('name');
      
      if (error) throw error;
      setCountries(data || []);
    } catch (error) {
      console.error('Error fetching countries:', error);
      toast.error('Failed to load countries');
    }
  };

  const fetchRegions = async (countryId: string): Promise<Region[]> => {
    if (!countryId) {
      setRegions([]);
      return [];
    }
    
    try {
      const { data, error } = await supabase
        .from('regions')
        .select('id, name, code, country_id, description')
        .eq('country_id', countryId)
        .order('name');
      
      if (error) throw error;
      const regions = data || [];
      setRegions(regions);
      return regions;
    } catch (error) {
      console.error('Error fetching regions:', error);
      toast.error('Failed to load regions');
      return [];
    }
  };

  const fetchCities = async (regionId: string): Promise<City[]> => {
    if (!regionId) {
      setCities([]);
      return [];
    }
    
    try {
      const { data, error } = await supabase
        .from('cities')
        .select('id, name, code, country_id, region_id, description')
        .eq('region_id', regionId)
        .order('name');
      
      if (error) throw error;
      const cities = data || [];
      setCities(cities);
      return cities;
    } catch (error) {
      console.error('Error fetching cities:', error);
      toast.error('Failed to load cities');
      return [];
    }
  };

  const fetchProjects = async (cityId: string): Promise<Project[]> => {
    if (!cityId) {
      setProjects([]);
      return [];
    }
    
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('id, name, code, country_id, region_id, city_id, description, status')
        .eq('city_id', cityId)
        .eq('status', 'active')
        .order('name');
      
      if (error) throw error;
      const projects = data || [];
      setProjects(projects);
      return projects;
    } catch (error) {
      console.error('Error fetching projects:', error);
      toast.error('Failed to load projects');
      return [];
    }
  };

  const fetchBoards = async (projectId: string): Promise<Board[]> => {
    if (!projectId) {
      setBoards([]);
      return [];
    }
    
    try {
      const { data, error } = await supabase
        .from('boards')
        .select('id, name, code, country_id, region_id, city_id, project_id, description, board_type, status')
        .eq('project_id', projectId)
        .eq('status', 'active')
        .order('name');
      
      if (error) throw error;
      const boards = data || [];
      setBoards(boards);
      return boards;
    } catch (error) {
      console.error('Error fetching boards:', error);
      toast.error('Failed to load boards');
      return [];
    }
  };

  const fetchSchools = async (boardId: string): Promise<School[]> => {
    if (!boardId) {
      setSchools([]);
      return [];
    }
    
    try {
      const { data, error } = await supabase
        .from('schools')
        .select('id, name, code, school_type, country_id, region_id, city_id, project_id, board_id, address, phone, email, website, principal_name, principal_email, principal_phone, established_year, total_students, total_teachers, total_classes, facilities, curriculum, languages_offered, status, accreditation_status, created_at, updated_at, created_by, updated_by')
        .eq('board_id', boardId)
        .eq('status', 'active')
        .order('name');
      
      if (error) throw error;
      const schools = data || [];
      setSchools(schools);
      return schools;
    } catch (error) {
      console.error('Error fetching schools:', error);
      toast.error('Failed to load schools');
      return [];
    }
  };

  // Cascading dropdown handlers
  const handleCountryChange = async (countryIds: string[]) => {
    const currentCountryIds = courseData.country_ids;
    const removedCountryIds = currentCountryIds.filter(id => !countryIds.includes(id));
    
    if (removedCountryIds.length > 0) {
      // Find all affected data from the hierarchy
      const affectedRegionsList = regions.filter(region => 
        removedCountryIds.includes(region.country_id) && courseData.region_ids.includes(region.id)
      );
      const affectedCitiesList = cities.filter(city => 
        removedCountryIds.includes(city.country_id) && courseData.city_ids.includes(city.id)
      );
      const affectedProjectsList = projects.filter(project => 
        removedCountryIds.includes(project.country_id) && courseData.project_ids.includes(project.id)
      );
      const affectedBoardsList = boards.filter(board => 
        removedCountryIds.includes(board.country_id) && courseData.board_ids.includes(board.id)
      );
      const affectedSchoolsList = schools.filter(school => 
        removedCountryIds.includes(school.country_id) && courseData.school_ids.includes(school.id)
      );
      const affectedClassesList = dbClasses.filter(cls => 
        selectedClasses.includes(cls.id) && 
        (affectedSchoolsList.some(school => school.id === cls.school_id) || 
         affectedBoardsList.some(board => board.id === cls.board_id))
      );
      
      const allAffectedTeachers = affectedClassesList.flatMap(cls => cls.teachers);
      const allAffectedStudents = affectedClassesList.flatMap(cls => cls.students);
      
      // Remove duplicates
      const uniqueAffectedTeachers = allAffectedTeachers.filter((teacher, index, self) => 
        index === self.findIndex(t => t.id === teacher.id)
      );
      const uniqueAffectedStudents = allAffectedStudents.filter((student, index, self) => 
        index === self.findIndex(s => s.id === student.id)
      );
      
      // Set the data for the confirmation dialog
      setCountriesToRemove(removedCountryIds);
      setAffectedRegions(affectedRegionsList);
      setAffectedCities(affectedCitiesList);
      setAffectedProjects(affectedProjectsList);
      setAffectedBoards(affectedBoardsList);
      setAffectedSchools(affectedSchoolsList);
      setAffectedClassesFromHierarchy(affectedClassesList);
      setAffectedTeachersFromHierarchy(uniqueAffectedTeachers);
      setAffectedStudentsFromHierarchy(uniqueAffectedStudents);
      setIsCountryRemovalDialogOpen(true);
    } else {
      setCourseData(prev => ({ 
        ...prev, 
        country_ids: countryIds,
        region_ids: [],
        city_ids: [],
        project_ids: [],
        board_ids: [],
        school_ids: []
      }));
      setRegions([]);
      setCities([]);
      setProjects([]);
      setBoards([]);
      setSchools([]);
    }
    
    if (countryIds.length > 0) {
      // Fetch regions for all selected countries
      const allRegions: Region[] = [];
      for (const countryId of countryIds) {
        const regions = await fetchRegions(countryId);
        allRegions.push(...regions);
      }
      setRegions(allRegions);
    }
  };

  const handleRegionChange = async (regionIds: string[]) => {
    const currentRegionIds = courseData.region_ids;
    const removedRegionIds = currentRegionIds.filter(id => !regionIds.includes(id));
    
    if (removedRegionIds.length > 0) {
      // Find all affected data from the hierarchy
      const affectedCitiesList = cities.filter(city => 
        removedRegionIds.includes(city.region_id) && courseData.city_ids.includes(city.id)
      );
      const affectedProjectsList = projects.filter(project => 
        removedRegionIds.includes(project.region_id) && courseData.project_ids.includes(project.id)
      );
      const affectedBoardsList = boards.filter(board => 
        removedRegionIds.includes(board.region_id) && courseData.board_ids.includes(board.id)
      );
      const affectedSchoolsList = schools.filter(school => 
        removedRegionIds.includes(school.region_id) && courseData.school_ids.includes(school.id)
      );
      const affectedClassesList = dbClasses.filter(cls => 
        selectedClasses.includes(cls.id) && 
        (affectedSchoolsList.some(school => school.id === cls.school_id) || 
         affectedBoardsList.some(board => board.id === cls.board_id))
      );
      
      const allAffectedTeachers = affectedClassesList.flatMap(cls => cls.teachers);
      const allAffectedStudents = affectedClassesList.flatMap(cls => cls.students);
      
      // Remove duplicates
      const uniqueAffectedTeachers = allAffectedTeachers.filter((teacher, index, self) => 
        index === self.findIndex(t => t.id === teacher.id)
      );
      const uniqueAffectedStudents = allAffectedStudents.filter((student, index, self) => 
        index === self.findIndex(s => s.id === student.id)
      );
      
      // Set the data for the confirmation dialog
      setRegionsToRemove(removedRegionIds);
      setAffectedCitiesFromRegion(affectedCitiesList);
      setAffectedProjectsFromRegion(affectedProjectsList);
      setAffectedBoardsFromRegion(affectedBoardsList);
      setAffectedSchoolsFromRegion(affectedSchoolsList);
      setAffectedClassesFromRegion(affectedClassesList);
      setAffectedTeachersFromRegion(uniqueAffectedTeachers);
      setAffectedStudentsFromRegion(uniqueAffectedStudents);
      setIsRegionRemovalDialogOpen(true);
    } else {
      setCourseData(prev => ({ 
        ...prev, 
        region_ids: regionIds,
        city_ids: [],
        project_ids: [],
        board_ids: [],
        school_ids: []
      }));
      setCities([]);
      setProjects([]);
      setBoards([]);
      setSchools([]);
    }
    
    if (regionIds.length > 0) {
      // Fetch cities for all selected regions
      const allCities: City[] = [];
      for (const regionId of regionIds) {
        const cities = await fetchCities(regionId);
        allCities.push(...cities);
      }
      setCities(allCities);
    }
  };

  const handleCityChange = async (cityIds: string[]) => {
    const currentCityIds = courseData.city_ids;
    const removedCityIds = currentCityIds.filter(id => !cityIds.includes(id));
    
    if (removedCityIds.length > 0) {
      // Find all affected data from the hierarchy
      const affectedProjectsList = projects.filter(project => 
        removedCityIds.includes(project.city_id) && courseData.project_ids.includes(project.id)
      );
      const affectedBoardsList = boards.filter(board => 
        removedCityIds.includes(board.city_id) && courseData.board_ids.includes(board.id)
      );
      const affectedSchoolsList = schools.filter(school => 
        removedCityIds.includes(school.city_id) && courseData.school_ids.includes(school.id)
      );
      const affectedClassesList = dbClasses.filter(cls => 
        selectedClasses.includes(cls.id) && 
        (affectedSchoolsList.some(school => school.id === cls.school_id) || 
         affectedBoardsList.some(board => board.id === cls.board_id))
      );
      
      const allAffectedTeachers = affectedClassesList.flatMap(cls => cls.teachers);
      const allAffectedStudents = affectedClassesList.flatMap(cls => cls.students);
      
      // Remove duplicates
      const uniqueAffectedTeachers = allAffectedTeachers.filter((teacher, index, self) => 
        index === self.findIndex(t => t.id === teacher.id)
      );
      const uniqueAffectedStudents = allAffectedStudents.filter((student, index, self) => 
        index === self.findIndex(s => s.id === student.id)
      );
      
      // Set the data for the confirmation dialog
      setCitiesToRemove(removedCityIds);
      setAffectedProjectsFromCity(affectedProjectsList);
      setAffectedBoardsFromCity(affectedBoardsList);
      setAffectedSchoolsFromCity(affectedSchoolsList);
      setAffectedClassesFromCity(affectedClassesList);
      setAffectedTeachersFromCity(uniqueAffectedTeachers);
      setAffectedStudentsFromCity(uniqueAffectedStudents);
      setIsCityRemovalDialogOpen(true);
    } else {
      setCourseData(prev => ({ 
        ...prev, 
        city_ids: cityIds,
        project_ids: [],
        board_ids: [],
        school_ids: []
      }));
      setProjects([]);
      setBoards([]);
      setSchools([]);
    }
    
    if (cityIds.length > 0) {
      // Fetch projects for all selected cities
      const allProjects: Project[] = [];
      for (const cityId of cityIds) {
        const projects = await fetchProjects(cityId);
        allProjects.push(...projects);
      }
      setProjects(allProjects);
    }
  };

  const handleProjectChange = async (projectIds: string[]) => {
    const currentProjectIds = courseData.project_ids;
    const removedProjectIds = currentProjectIds.filter(id => !projectIds.includes(id));
    
    if (removedProjectIds.length > 0) {
      // Find all affected data from the hierarchy
      const affectedBoardsList = boards.filter(board => 
        removedProjectIds.includes(board.project_id) && courseData.board_ids.includes(board.id)
      );
      const affectedSchoolsList = schools.filter(school => 
        removedProjectIds.includes(school.project_id) && courseData.school_ids.includes(school.id)
      );
      const affectedClassesList = dbClasses.filter(cls => 
        selectedClasses.includes(cls.id) && 
        (affectedSchoolsList.some(school => school.id === cls.school_id) || 
         affectedBoardsList.some(board => board.id === cls.board_id))
      );
      
      const allAffectedTeachers = affectedClassesList.flatMap(cls => cls.teachers);
      const allAffectedStudents = affectedClassesList.flatMap(cls => cls.students);
      
      // Remove duplicates
      const uniqueAffectedTeachers = allAffectedTeachers.filter((teacher, index, self) => 
        index === self.findIndex(t => t.id === teacher.id)
      );
      const uniqueAffectedStudents = allAffectedStudents.filter((student, index, self) => 
        index === self.findIndex(s => s.id === student.id)
      );
      
      // Set the data for the confirmation dialog
      setProjectsToRemove(removedProjectIds);
      setAffectedBoardsFromProject(affectedBoardsList);
      setAffectedSchoolsFromProject(affectedSchoolsList);
      setAffectedClassesFromProject(affectedClassesList);
      setAffectedTeachersFromProject(uniqueAffectedTeachers);
      setAffectedStudentsFromProject(uniqueAffectedStudents);
      setIsProjectRemovalDialogOpen(true);
    } else {
      setCourseData(prev => ({ 
        ...prev, 
        project_ids: projectIds,
        board_ids: [],
        school_ids: []
      }));
      setBoards([]);
      setSchools([]);
    }
    
    if (projectIds.length > 0) {
      // Fetch boards for all selected projects
      const allBoards: Board[] = [];
      for (const projectId of projectIds) {
        const boards = await fetchBoards(projectId);
        allBoards.push(...boards);
      }
      setBoards(allBoards);
    }
  };

  const handleBoardChange = async (boardIds: string[]) => {
    const currentBoardIds = courseData.board_ids;
    const removedBoardIds = currentBoardIds.filter(id => !boardIds.includes(id));
    
    if (removedBoardIds.length > 0) {
      // Find all affected data from the hierarchy
      const affectedSchoolsList = schools.filter(school => 
        removedBoardIds.includes(school.board_id) && courseData.school_ids.includes(school.id)
      );
      const affectedClassesList = dbClasses.filter(cls => 
        selectedClasses.includes(cls.id) && 
        (affectedSchoolsList.some(school => school.id === cls.school_id) || 
         removedBoardIds.includes(cls.board_id))
      );
      
      const allAffectedTeachers = affectedClassesList.flatMap(cls => cls.teachers);
      const allAffectedStudents = affectedClassesList.flatMap(cls => cls.students);
      
      // Remove duplicates
      const uniqueAffectedTeachers = allAffectedTeachers.filter((teacher, index, self) => 
        index === self.findIndex(t => t.id === teacher.id)
      );
      const uniqueAffectedStudents = allAffectedStudents.filter((student, index, self) => 
        index === self.findIndex(s => s.id === student.id)
      );
      
      // Set the data for the confirmation dialog
      setBoardsToRemove(removedBoardIds);
      setAffectedSchoolsFromBoard(affectedSchoolsList);
      setAffectedClassesFromBoard(affectedClassesList);
      setAffectedTeachersFromBoard(uniqueAffectedTeachers);
      setAffectedStudentsFromBoard(uniqueAffectedStudents);
      setIsBoardRemovalDialogOpen(true);
    } else {
      setCourseData(prev => ({ 
        ...prev, 
        board_ids: boardIds,
        school_ids: []
      }));
      setSchools([]);
    }
    
    if (boardIds.length > 0) {
      // Fetch schools for all selected boards
      const allSchools: School[] = [];
      for (const boardId of boardIds) {
        const schools = await fetchSchools(boardId);
        allSchools.push(...schools);
      }
      setSchools(allSchools);
    }
  };

  const handleSchoolChange = (schoolIds: string[]) => {
    const currentSchoolIds = courseData.school_ids;
    const removedSchoolIds = currentSchoolIds.filter(id => !schoolIds.includes(id));
    
    // If schools are being removed, show confirmation dialog
    if (removedSchoolIds.length > 0) {
      // Find affected classes, teachers, and students
      const affectedClassesList = dbClasses.filter(cls => 
        removedSchoolIds.includes(cls.school_id) && selectedClasses.includes(cls.id)
      );
      
      const allAffectedTeachers = affectedClassesList.flatMap(cls => cls.teachers);
      const allAffectedStudents = affectedClassesList.flatMap(cls => cls.students);
      
      // Remove duplicates
      const uniqueAffectedTeachers = allAffectedTeachers.filter((teacher, index, self) => 
        index === self.findIndex(t => t.id === teacher.id)
      );
      const uniqueAffectedStudents = allAffectedStudents.filter((student, index, self) => 
        index === self.findIndex(s => s.id === student.id)
      );
      
      // Set the data for the confirmation dialog
      setSchoolsToRemove(removedSchoolIds);
      setAffectedClasses(affectedClassesList);
      setAffectedTeachers(uniqueAffectedTeachers);
      setAffectedStudents(uniqueAffectedStudents);
      setIsSchoolRemovalDialogOpen(true);
    } else {
      // No schools being removed, proceed normally
      setCourseData(prev => ({ 
        ...prev, 
        school_ids: schoolIds
      }));
    }
  };

  // Handle school removal confirmation
  const handleConfirmSchoolRemoval = () => {
    // Remove affected classes from selected classes
    const affectedClassIds = affectedClasses.map(cls => cls.id);
    const updatedSelectedClasses = selectedClasses.filter(id => !affectedClassIds.includes(id));
    setSelectedClasses(updatedSelectedClasses);
    
    // Update course data with new school IDs and class IDs
    setCourseData(prev => {
      const updatedTeachers = prev.teachers.filter(teacher => 
        !affectedTeachers.some(affected => affected.id === teacher.id)
      );
      const updatedStudents = prev.students.filter(student => 
        !affectedStudents.some(affected => affected.id === student.id)
      );
      
      return {
        ...prev,
        school_ids: courseData.school_ids.filter(id => !schoolsToRemove.includes(id)),
        class_ids: updatedSelectedClasses,
        teachers: updatedTeachers,
        students: updatedStudents
      };
    });
    
    // Close dialog and reset state
    setIsSchoolRemovalDialogOpen(false);
    setSchoolsToRemove([]);
    setAffectedClasses([]);
    setAffectedTeachers([]);
    setAffectedStudents([]);
    
    toast.success(`Removed ${schoolsToRemove.length} school(s) and associated classes, teachers, and students.`);
  };

  // Handle school removal cancellation
  const handleCancelSchoolRemoval = () => {
    // Close dialog and reset state without making changes
    setIsSchoolRemovalDialogOpen(false);
    setSchoolsToRemove([]);
    setAffectedClasses([]);
    setAffectedTeachers([]);
    setAffectedStudents([]);
  };

  // Handle country removal confirmation
  const handleConfirmCountryRemoval = () => {
    // Remove affected classes from selected classes
    const affectedClassIds = affectedClassesFromHierarchy.map(cls => cls.id);
    const updatedSelectedClasses = selectedClasses.filter(id => !affectedClassIds.includes(id));
    setSelectedClasses(updatedSelectedClasses);
    
    // Update course data with new country IDs and remove only affected items
    setCourseData(prev => {
      const updatedTeachers = prev.teachers.filter(teacher => 
        !affectedTeachersFromHierarchy.some(affected => affected.id === teacher.id)
      );
      const updatedStudents = prev.students.filter(student => 
        !affectedStudentsFromHierarchy.some(affected => affected.id === student.id)
      );
      
      // Get IDs of affected items to remove
      const affectedRegionIds = affectedRegions.map(region => region.id);
      const affectedCityIds = affectedCities.map(city => city.id);
      const affectedProjectIds = affectedProjects.map(project => project.id);
      const affectedBoardIds = affectedBoards.map(board => board.id);
      const affectedSchoolIds = affectedSchools.map(school => school.id);
      
      return {
        ...prev,
        country_ids: courseData.country_ids.filter(id => !countriesToRemove.includes(id)),
        region_ids: prev.region_ids.filter(id => !affectedRegionIds.includes(id)),
        city_ids: prev.city_ids.filter(id => !affectedCityIds.includes(id)),
        project_ids: prev.project_ids.filter(id => !affectedProjectIds.includes(id)),
        board_ids: prev.board_ids.filter(id => !affectedBoardIds.includes(id)),
        school_ids: prev.school_ids.filter(id => !affectedSchoolIds.includes(id)),
        class_ids: updatedSelectedClasses,
        teachers: updatedTeachers,
        students: updatedStudents
      };
    });
    
    // Update state arrays to remove affected items
    setRegions(prev => prev.filter(region => !affectedRegions.some(affected => affected.id === region.id)));
    setCities(prev => prev.filter(city => !affectedCities.some(affected => affected.id === city.id)));
    setProjects(prev => prev.filter(project => !affectedProjects.some(affected => affected.id === project.id)));
    setBoards(prev => prev.filter(board => !affectedBoards.some(affected => affected.id === board.id)));
    setSchools(prev => prev.filter(school => !affectedSchools.some(affected => affected.id === school.id)));
    
    // Close dialog and reset state
    setIsCountryRemovalDialogOpen(false);
    setCountriesToRemove([]);
    setAffectedRegions([]);
    setAffectedCities([]);
    setAffectedProjects([]);
    setAffectedBoards([]);
    setAffectedSchools([]);
    setAffectedClassesFromHierarchy([]);
    setAffectedTeachersFromHierarchy([]);
    setAffectedStudentsFromHierarchy([]);
    
    toast.success(`Removed ${countriesToRemove.length} country/countries and associated data.`);
  };

  // Handle country removal cancellation
  const handleCancelCountryRemoval = () => {
    // Close dialog and reset state without making changes
    setIsCountryRemovalDialogOpen(false);
    setCountriesToRemove([]);
    setAffectedRegions([]);
    setAffectedCities([]);
    setAffectedProjects([]);
    setAffectedBoards([]);
    setAffectedSchools([]);
    setAffectedClassesFromHierarchy([]);
    setAffectedTeachersFromHierarchy([]);
    setAffectedStudentsFromHierarchy([]);
  };

  // Handle region removal confirmation
  const handleConfirmRegionRemoval = () => {
    // Remove affected classes from selected classes
    const affectedClassIds = affectedClassesFromRegion.map(cls => cls.id);
    const updatedSelectedClasses = selectedClasses.filter(id => !affectedClassIds.includes(id));
    setSelectedClasses(updatedSelectedClasses);
    
    // Update course data with new region IDs and remove only affected items
    setCourseData(prev => {
      const updatedTeachers = prev.teachers.filter(teacher => 
        !affectedTeachersFromRegion.some(affected => affected.id === teacher.id)
      );
      const updatedStudents = prev.students.filter(student => 
        !affectedStudentsFromRegion.some(affected => affected.id === student.id)
      );
      
      // Get IDs of affected items to remove
      const affectedCityIds = affectedCitiesFromRegion.map(city => city.id);
      const affectedProjectIds = affectedProjectsFromRegion.map(project => project.id);
      const affectedBoardIds = affectedBoardsFromRegion.map(board => board.id);
      const affectedSchoolIds = affectedSchoolsFromRegion.map(school => school.id);
      
      return {
        ...prev,
        region_ids: courseData.region_ids.filter(id => !regionsToRemove.includes(id)),
        city_ids: prev.city_ids.filter(id => !affectedCityIds.includes(id)),
        project_ids: prev.project_ids.filter(id => !affectedProjectIds.includes(id)),
        board_ids: prev.board_ids.filter(id => !affectedBoardIds.includes(id)),
        school_ids: prev.school_ids.filter(id => !affectedSchoolIds.includes(id)),
        class_ids: updatedSelectedClasses,
        teachers: updatedTeachers,
        students: updatedStudents
      };
    });
    
    // Update state arrays to remove affected items
    setCities(prev => prev.filter(city => !affectedCitiesFromRegion.some(affected => affected.id === city.id)));
    setProjects(prev => prev.filter(project => !affectedProjectsFromRegion.some(affected => affected.id === project.id)));
    setBoards(prev => prev.filter(board => !affectedBoardsFromRegion.some(affected => affected.id === board.id)));
    setSchools(prev => prev.filter(school => !affectedSchoolsFromRegion.some(affected => affected.id === school.id)));
    
    // Close dialog and reset state
    setIsRegionRemovalDialogOpen(false);
    setRegionsToRemove([]);
    setAffectedCitiesFromRegion([]);
    setAffectedProjectsFromRegion([]);
    setAffectedBoardsFromRegion([]);
    setAffectedSchoolsFromRegion([]);
    setAffectedClassesFromRegion([]);
    setAffectedTeachersFromRegion([]);
    setAffectedStudentsFromRegion([]);
    
    toast.success(`Removed ${regionsToRemove.length} region(s) and associated data.`);
  };

  // Handle region removal cancellation
  const handleCancelRegionRemoval = () => {
    // Close dialog and reset state without making changes
    setIsRegionRemovalDialogOpen(false);
    setRegionsToRemove([]);
    setAffectedCitiesFromRegion([]);
    setAffectedProjectsFromRegion([]);
    setAffectedBoardsFromRegion([]);
    setAffectedSchoolsFromRegion([]);
    setAffectedClassesFromRegion([]);
    setAffectedTeachersFromRegion([]);
    setAffectedStudentsFromRegion([]);
  };

  // Handle city removal confirmation
  const handleConfirmCityRemoval = () => {
    // Remove affected classes from selected classes
    const affectedClassIds = affectedClassesFromCity.map(cls => cls.id);
    const updatedSelectedClasses = selectedClasses.filter(id => !affectedClassIds.includes(id));
    setSelectedClasses(updatedSelectedClasses);
    
    // Update course data with new city IDs and remove only affected items
    setCourseData(prev => {
      const updatedTeachers = prev.teachers.filter(teacher => 
        !affectedTeachersFromCity.some(affected => affected.id === teacher.id)
      );
      const updatedStudents = prev.students.filter(student => 
        !affectedStudentsFromCity.some(affected => affected.id === student.id)
      );
      
      // Get IDs of affected items to remove
      const affectedProjectIds = affectedProjectsFromCity.map(project => project.id);
      const affectedBoardIds = affectedBoardsFromCity.map(board => board.id);
      const affectedSchoolIds = affectedSchoolsFromCity.map(school => school.id);
      
      return {
        ...prev,
        city_ids: courseData.city_ids.filter(id => !citiesToRemove.includes(id)),
        project_ids: prev.project_ids.filter(id => !affectedProjectIds.includes(id)),
        board_ids: prev.board_ids.filter(id => !affectedBoardIds.includes(id)),
        school_ids: prev.school_ids.filter(id => !affectedSchoolIds.includes(id)),
        class_ids: updatedSelectedClasses,
        teachers: updatedTeachers,
        students: updatedStudents
      };
    });
    
    // Update state arrays to remove affected items
    setProjects(prev => prev.filter(project => !affectedProjectsFromCity.some(affected => affected.id === project.id)));
    setBoards(prev => prev.filter(board => !affectedBoardsFromCity.some(affected => affected.id === board.id)));
    setSchools(prev => prev.filter(school => !affectedSchoolsFromCity.some(affected => affected.id === school.id)));
    
    // Close dialog and reset state
    setIsCityRemovalDialogOpen(false);
    setCitiesToRemove([]);
    setAffectedProjectsFromCity([]);
    setAffectedBoardsFromCity([]);
    setAffectedSchoolsFromCity([]);
    setAffectedClassesFromCity([]);
    setAffectedTeachersFromCity([]);
    setAffectedStudentsFromCity([]);
    
    toast.success(`Removed ${citiesToRemove.length} city/cities and associated data.`);
  };

  // Handle city removal cancellation
  const handleCancelCityRemoval = () => {
    // Close dialog and reset state without making changes
    setIsCityRemovalDialogOpen(false);
    setCitiesToRemove([]);
    setAffectedProjectsFromCity([]);
    setAffectedBoardsFromCity([]);
    setAffectedSchoolsFromCity([]);
    setAffectedClassesFromCity([]);
    setAffectedTeachersFromCity([]);
    setAffectedStudentsFromCity([]);
  };

  // Handle project removal confirmation
  const handleConfirmProjectRemoval = () => {
    // Remove affected classes from selected classes
    const affectedClassIds = affectedClassesFromProject.map(cls => cls.id);
    const updatedSelectedClasses = selectedClasses.filter(id => !affectedClassIds.includes(id));
    setSelectedClasses(updatedSelectedClasses);
    
    // Update course data with new project IDs and remove only affected items
    setCourseData(prev => {
      const updatedTeachers = prev.teachers.filter(teacher => 
        !affectedTeachersFromProject.some(affected => affected.id === teacher.id)
      );
      const updatedStudents = prev.students.filter(student => 
        !affectedStudentsFromProject.some(affected => affected.id === student.id)
      );
      
      // Get IDs of affected items to remove
      const affectedBoardIds = affectedBoardsFromProject.map(board => board.id);
      const affectedSchoolIds = affectedSchoolsFromProject.map(school => school.id);
      
      return {
        ...prev,
        project_ids: courseData.project_ids.filter(id => !projectsToRemove.includes(id)),
        board_ids: prev.board_ids.filter(id => !affectedBoardIds.includes(id)),
        school_ids: prev.school_ids.filter(id => !affectedSchoolIds.includes(id)),
        class_ids: updatedSelectedClasses,
        teachers: updatedTeachers,
        students: updatedStudents
      };
    });
    
    // Update state arrays to remove affected items
    setBoards(prev => prev.filter(board => !affectedBoardsFromProject.some(affected => affected.id === board.id)));
    setSchools(prev => prev.filter(school => !affectedSchoolsFromProject.some(affected => affected.id === school.id)));
    
    // Close dialog and reset state
    setIsProjectRemovalDialogOpen(false);
    setProjectsToRemove([]);
    setAffectedBoardsFromProject([]);
    setAffectedSchoolsFromProject([]);
    setAffectedClassesFromProject([]);
    setAffectedTeachersFromProject([]);
    setAffectedStudentsFromProject([]);
    
    toast.success(`Removed ${projectsToRemove.length} project(s) and associated data.`);
  };

  // Handle project removal cancellation
  const handleCancelProjectRemoval = () => {
    // Close dialog and reset state without making changes
    setIsProjectRemovalDialogOpen(false);
    setProjectsToRemove([]);
    setAffectedBoardsFromProject([]);
    setAffectedSchoolsFromProject([]);
    setAffectedClassesFromProject([]);
    setAffectedTeachersFromProject([]);
    setAffectedStudentsFromProject([]);
  };

  // Handle board removal confirmation
  const handleConfirmBoardRemoval = () => {
    // Remove affected classes from selected classes
    const affectedClassIds = affectedClassesFromBoard.map(cls => cls.id);
    const updatedSelectedClasses = selectedClasses.filter(id => !affectedClassIds.includes(id));
    setSelectedClasses(updatedSelectedClasses);
    
    // Update course data with new board IDs and remove only affected items
    setCourseData(prev => {
      const updatedTeachers = prev.teachers.filter(teacher => 
        !affectedTeachersFromBoard.some(affected => affected.id === teacher.id)
      );
      const updatedStudents = prev.students.filter(student => 
        !affectedStudentsFromBoard.some(affected => affected.id === student.id)
      );
      
      // Get IDs of affected items to remove
      const affectedSchoolIds = affectedSchoolsFromBoard.map(school => school.id);
      
      return {
        ...prev,
        board_ids: courseData.board_ids.filter(id => !boardsToRemove.includes(id)),
        school_ids: prev.school_ids.filter(id => !affectedSchoolIds.includes(id)),
        class_ids: updatedSelectedClasses,
        teachers: updatedTeachers,
        students: updatedStudents
      };
    });
    
    // Update state arrays to remove affected items
    setSchools(prev => prev.filter(school => !affectedSchoolsFromBoard.some(affected => affected.id === school.id)));
    
    // Close dialog and reset state
    setIsBoardRemovalDialogOpen(false);
    setBoardsToRemove([]);
    setAffectedSchoolsFromBoard([]);
    setAffectedClassesFromBoard([]);
    setAffectedTeachersFromBoard([]);
    setAffectedStudentsFromBoard([]);
    
    toast.success(`Removed ${boardsToRemove.length} board(s) and associated data.`);
  };

  // Handle board removal cancellation
  const handleCancelBoardRemoval = () => {
    // Close dialog and reset state without making changes
    setIsBoardRemovalDialogOpen(false);
    setBoardsToRemove([]);
    setAffectedSchoolsFromBoard([]);
    setAffectedClassesFromBoard([]);
    setAffectedTeachersFromBoard([]);
    setAffectedStudentsFromBoard([]);
  };

  // Class management handlers
  const handleClassMembersChange = (role: 'teachers' | 'students', selectedIds: string[]) => {
    setClassFormData(prev => ({
      ...prev,
      [role]: selectedIds
    }));
  };

  const handleClassBoardChange = (boardId: string) => {
    setClassFormData(prev => ({
      ...prev,
      board_id: boardId,
      school_id: '' // Reset school selection when board changes
    }));
  };

  const handleClassCreate = async () => {
    if (!classFormData.name || !classFormData.code || !classFormData.grade || !classFormData.school_id || !classFormData.board_id || !classFormData.max_students) {
      toast.error('Please fill in all required fields');
      return;
    }

    const maxStudentsNum = parseInt(classFormData.max_students);
    if (isNaN(maxStudentsNum) || maxStudentsNum < 1 || maxStudentsNum > 100) {
      toast.error('Max students must be a valid number between 1 and 100');
      return;
    }

    const classData: CreateClassData = {
      name: classFormData.name,
      code: classFormData.code.toUpperCase(),
      grade: classFormData.grade,
      school_id: classFormData.school_id,
      board_id: classFormData.board_id,
      description: classFormData.description,
      max_students: maxStudentsNum,
      teacher_ids: classFormData.teachers,
      student_ids: classFormData.students
    };

    const result = await createClass(classData);
    if (result) {
      setIsClassCreateDialogOpen(false);
      resetClassForm();
      
      // Note: The newly created class will be available in the dropdown for selection
      // Users can then select it to automatically add its teachers and students
    }
  };

  const handleClassEdit = async () => {
    if (!editingClass || !classFormData.name || !classFormData.code || !classFormData.grade || !classFormData.school_id || !classFormData.board_id || !classFormData.max_students) {
      toast.error('Please fill in all required fields');
      return;
    }

    const maxStudentsNum = parseInt(classFormData.max_students);
    if (isNaN(maxStudentsNum) || maxStudentsNum < 1 || maxStudentsNum > 100) {
      toast.error('Max students must be a valid number between 1 and 100');
      return;
    }

    const classData: UpdateClassData = {
      id: editingClass.id,
      name: classFormData.name,
      code: classFormData.code.toUpperCase(),
      grade: classFormData.grade,
      school_id: classFormData.school_id,
      board_id: classFormData.board_id,
      description: classFormData.description,
      max_students: maxStudentsNum,
      teacher_ids: classFormData.teachers,
      student_ids: classFormData.students
    };

    const result = await updateClass(classData);
    if (result) {
      setIsClassEditDialogOpen(false);
      setEditingClass(null);
      resetClassForm();
    }
  };

  const handleClassDelete = async (classId: string) => {
    const success = await deleteClass(classId);
    if (success) {
      // Remove the deleted class from selected classes if it was enrolled
      if (selectedClasses.includes(classId)) {
        const newSelectedClasses = selectedClasses.filter(id => id !== classId);
        setSelectedClasses(newSelectedClasses);
        // Immediately update course members since we're removing the class
        handleClassSelection(newSelectedClasses);
      }
    }
  };

  const openClassEditDialog = (cls: ClassWithMembers) => {
    setEditingClass(cls);
    setClassFormData({
      name: cls.name,
      code: cls.code,
      grade: cls.grade,
      school_id: cls.school_id || '',
      board_id: cls.board_id || '',
      description: cls.description,
      max_students: String(cls.max_students || 30),
      teachers: cls.teachers.map(t => t.id),
      students: cls.students.map(s => s.id)
    });
    setIsClassEditDialogOpen(true);
  };

  const openClassViewDialog = (cls: ClassWithMembers) => {
    setViewingClass(cls);
    setIsClassViewDialogOpen(true);
  };

  const resetClassForm = () => {
    setClassFormData({
      name: '',
      code: '',
      grade: '',
      school_id: '',
      board_id: '',
      description: '',
      max_students: '30',
      teachers: [],
      students: []
    });
  };

  const getGradeBadge = (grade: string) => {
    const gradeNum = parseInt(grade);
    if (gradeNum <= 5) return <Badge variant="default" className="bg-blue-600 text-white">Grade {grade}</Badge>;
    if (gradeNum <= 8) return <Badge variant="default" className="bg-green-600">Grade {grade}</Badge>;
    if (gradeNum <= 10) return <Badge variant="default" className="bg-yellow-600">Grade {grade}</Badge>;
    return <Badge variant="default" className="bg-purple-600">Grade {grade}</Badge>;
  };

  // Check if student limit is exceeded
  const isStudentLimitExceeded = () => {
    const maxStudentsNum = parseInt(classFormData.max_students);
    return !isNaN(maxStudentsNum) && classFormData.students.length > maxStudentsNum;
  };

  // Get student limit status message
  const getStudentLimitStatus = () => {
    const maxStudentsNum = parseInt(classFormData.max_students);
    if (isNaN(maxStudentsNum)) return null;
    
    const currentCount = classFormData.students.length;
    const remaining = maxStudentsNum - currentCount;
    
    if (currentCount > maxStudentsNum) {
      return {
        message: `⚠️ Exceeded limit by ${currentCount - maxStudentsNum} students (${currentCount}/${maxStudentsNum})`,
        className: "text-red-600 font-medium"
      };
    } else if (remaining <= 2 && remaining > 0) {
      return {
        message: `⚠️ Only ${remaining} spots remaining (${currentCount}/${maxStudentsNum})`,
        className: "text-yellow-600 font-medium"
      };
    } else {
      return {
        message: `${currentCount}/${maxStudentsNum} students selected`,
        className: "text-green-600 font-medium"
      };
    }
  };

  useEffect(() => {
        const initializeCourseBuilder = async () => {
      setIsLoadingPage(true);
      try {
        const [usersRes, catRes, langRes, levelRes, countriesRes] = await Promise.all([
          supabase.from('profiles').select('*'),
          supabase.from('course_categories').select('id, name'),
          supabase.from('course_languages').select('id, name'),
          supabase.from('course_levels').select('id, name'),
          supabase.from('countries').select('id, name, code, description').order('name'),
        ]);

        if (usersRes.error) throw usersRes.error;
        if (catRes.error) throw catRes.error;
        if (langRes.error) throw langRes.error;
        if (levelRes.error) throw levelRes.error;
        if (countriesRes.error) throw countriesRes.error;
        
        const fetchedProfiles = usersRes.data as Profile[];
        
        const fetchedCategories = catRes.data as { id: number; name: string; }[];
        const fetchedLanguages = langRes.data as { id: number; name: string; }[];
        const fetchedLevels = levelRes.data as { id: number; name: string; }[];
        const fetchedCountries = countriesRes.data as Country[];

        setUserProfiles(fetchedProfiles);
        setCategories(fetchedCategories);
        setLanguages(fetchedLanguages);
        setLevels(fetchedLevels);
        setCountries(fetchedCountries);
        
        const teachers = fetchedProfiles
          .filter(p => p.role === 'teacher' || p.role === 'content_creator')
          .map(p => ({ 
            label: `${p.first_name} ${p.last_name}`, 
            value: p.id,
            subLabel: p.email,
            imageUrl: p.avatar_url,
          }));

        const students = fetchedProfiles
          .filter(p => p.role === 'student')
          .map(p => ({ 
            label: `${p.first_name} ${p.last_name}`,
            value: p.id,
            subLabel: p.email,
            imageUrl: p.avatar_url,
          }));

        setAllTeachers(teachers);
        setAllStudents(students);
        
        const userProfile = fetchedProfiles.find(p => p.id === user?.id);
        if(userProfile) {
            setCurrentUserRole(userProfile.role);
        }
        
        if (courseId && courseId !== 'new') {
          console.log('🔄 COURSE LOADING STARTED - Loading course with ID:', courseId);
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
                    retry_settings,
                    quiz:quiz_questions(
                      *,
                      math_expression,
                      math_tolerance,
                      math_hint,
                      math_allow_drawing,
                      image_url,
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
            console.error('❌ ERROR loading course:', error);
            toast.error("Failed to load course data.");
    
            navigate('/dashboard/courses');
            return;
          }

          console.log('📊 RAW COURSE DATA FROM DATABASE:', data);
          console.log('📊 COURSE SECTIONS FROM DATABASE:', data?.sections);
          console.log('📊 QUIZ CONTENT ITEMS WITH RETRY SETTINGS FROM DATABASE:', data?.sections?.map(s => 
            s.lessons?.map(l => 
              l.contentItems?.filter(ci => ci.content_type === 'quiz' && ci.retry_settings)
            )
          ));
          
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
              .filter((m: any) => (m.role === 'teacher' || m.role === 'content_creator') && m.profile)
              .map((m: any) => ({ 
                id: m.profile.id, 
                name: `${m.profile.first_name} ${m.profile.last_name}`, 
                email: m.profile.email,
                avatar_url: m.profile.avatar_url 
              }));
            
            const courseStudents = data.members
              .filter((m: any) => m.role === 'student' && m.profile)
              .map((m: any) => ({ 
                id: m.profile.id, 
                name: `${m.profile.first_name} ${m.profile.last_name}`, 
                email: m.profile.email,
                avatar_url: m.profile.avatar_url 
              }));

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
              country_ids: data.country_ids || [],
              region_ids: data.region_ids || [],
              city_ids: data.city_ids || [],
              project_ids: data.project_ids || [],
              board_ids: data.board_ids || [],
              school_ids: data.school_ids || [],
              class_ids: data.class_ids || [],
              duration: data.duration || '',
              requirements: data.requirements || [''],
              learningOutcomes: data.learning_outcomes || [''],
              status: data.status || 'Draft',
              published_course_id: data.published_course_id,
              review_feedback: data.review_feedback,
              // Stripe payment fields
              payment_type: data.payment_type || 'free',
              course_price: data.course_price || 0,
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
                            options: q.options.sort((a: any, b: any) => a.position - b.position),
                            // Ensure points field is included
                            points: q.points || 1,
                            // Ensure math fields are included
                            math_expression: q.math_expression || null,
                            math_tolerance: q.math_tolerance || null,
                            math_hint: q.math_hint || null,
                            math_allow_drawing: q.math_allow_drawing === true,
                            // Store the file path (not signed URL) - signed URLs will be generated in the component
                            image_url: q.image_url || null
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
            console.log('✅ PROCESSED COURSE DATA WITH RETRY SETTINGS:', finalCourseData.sections?.map(s => 
              s.lessons?.map(l => 
                l.contentItems?.filter(ci => ci.content_type === 'quiz' && ci.retry_settings)
              )
            ));
            console.log('📋 ALL QUIZ CONTENT ITEMS:', finalCourseData.sections?.map(s => 
              s.lessons?.map(l => 
                l.contentItems?.filter(ci => ci.content_type === 'quiz')
              )
            ));
            console.log('🔄 SETTING COURSE DATA WITH RETRY SETTINGS...');
            setCourseData(finalCourseData);
            console.log('✅ COURSE DATA SET SUCCESSFULLY');
            setSelectedClasses(finalCourseData.class_ids || []);
            
            // Force reload classes to ensure enrolled classes are available
            if (finalCourseData.class_ids && finalCourseData.class_ids.length > 0) {
              refetchClasses();
            }
            
            // Load hierarchical data if course has location data
            if (finalCourseData.country_ids.length > 0) {
              // Fetch regions for all selected countries
              const allRegions: Region[] = [];
              for (const countryId of finalCourseData.country_ids) {
                const regions = await fetchRegions(countryId);
                allRegions.push(...regions);
              }
              setRegions(allRegions);
            }
            if (finalCourseData.region_ids.length > 0) {
              // Fetch cities for all selected regions
              const allCities: City[] = [];
              for (const regionId of finalCourseData.region_ids) {
                const cities = await fetchCities(regionId);
                allCities.push(...cities);
              }
              setCities(allCities);
            }
            if (finalCourseData.city_ids.length > 0) {
              // Fetch projects for all selected cities
              const allProjects: Project[] = [];
              for (const cityId of finalCourseData.city_ids) {
                const projects = await fetchProjects(cityId);
                allProjects.push(...projects);
              }
              setProjects(allProjects);
            }
            if (finalCourseData.project_ids.length > 0) {
              // Fetch boards for all selected projects
              const allBoards: Board[] = [];
              for (const projectId of finalCourseData.project_ids) {
                const boards = await fetchBoards(projectId);
                allBoards.push(...boards);
              }
              setBoards(allBoards);
            }
            if (finalCourseData.board_ids.length > 0) {
              // Fetch schools for all selected boards
              const allSchools: School[] = [];
              for (const boardId of finalCourseData.board_ids) {
                const schools = await fetchSchools(boardId);
                allSchools.push(...schools);
              }
              setSchools(allSchools);
            }
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
      // Store all selected IDs as arrays
      country_ids: courseToSave.country_ids,
      region_ids: courseToSave.region_ids,
      city_ids: courseToSave.city_ids,
      project_ids: courseToSave.project_ids,
      board_ids: courseToSave.board_ids,
      school_ids: courseToSave.school_ids,
      class_ids: courseToSave.class_ids,
      // Stripe payment fields
      payment_type: courseToSave.payment_type || 'free',
      course_price: courseToSave.course_price || 0,
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
                  // Math question processing
                    const { data: savedQuestion, error: qError } = await supabase
                        .from('quiz_questions')
                        .insert({
                            lesson_content_id: savedContent.id,
                            question_text: question.question_text,
                            question_type: question.question_type,
                            position: qIndex,
                            points: question.points || 1,
                            math_expression: question.math_expression || null,
                            math_tolerance: question.math_tolerance || null,
                            math_hint: question.math_hint || null,
                            math_allow_drawing: question.math_allow_drawing === true,
                            image_url: question.image_url || null
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

                // Save quiz retry settings if they exist
                if (item.retry_settings) {
                    // Clean up retry settings to only include valid properties
                    const cleanRetrySettings = {
                        allowRetries: item.retry_settings.allowRetries,
                        maxRetries: item.retry_settings.maxRetries,
                        retryCooldownHours: item.retry_settings.retryCooldownHours,
                        retryThreshold: item.retry_settings.retryThreshold
                    };
                    console.log('Saving quiz retry settings in saveCourseData for content item:', savedContent.id, cleanRetrySettings);
                    const { error: retryError } = await supabase
                        .from('course_lesson_content')
                        .update({ retry_settings: cleanRetrySettings })
                        .eq('id', savedContent.id);

                    if (retryError) {
                        console.error('Error saving quiz retry settings:', retryError);
                        // Don't throw error here as it's not critical for course saving
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

    // Get current members for comparison
    const { data: currentDbMembers, error: fetchError } = await supabase
      .from('course_members')
      .select('user_id, role')
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

    if (desiredMembers.length > 0) {
      const { error: upsertError } = await supabase
        .from('course_members')
        .upsert(desiredMembers, { onConflict: 'course_id,user_id' });
      if (upsertError) throw new Error(`There was an issue updating course members: ${upsertError.message}`);
    }

    // Send notifications for teacher changes
    try {
      const currentTeacherIds = currentDbMembers
        ?.filter(member => member.role === 'teacher' || member.role === 'content_creator')
        .map(member => member.user_id) || [];
      
      const newTeacherIds = courseToSave.teachers
        .filter(teacher => !currentTeacherIds.includes(teacher.id))
        .map(teacher => teacher.id);
      
      const existingTeacherIds = courseToSave.teachers
        .filter(teacher => currentTeacherIds.includes(teacher.id))
        .map(teacher => teacher.id);

      // Get teacher details for notifications
      const newTeachers = await CourseNotificationService.getTeacherDetails(newTeacherIds);
      const existingTeachers = await CourseNotificationService.getTeacherDetails(existingTeacherIds);

      // Send notifications
      if (newTeachers.length > 0 || existingTeachers.length > 0) {
        await CourseNotificationService.notifyCourseMemberChanges(
          currentCourseId,
          newTeachers,
          existingTeachers,
          {
            id: user.id,
            name: user.user_metadata?.full_name || user.email || 'Unknown User',
            email: user.email || 'unknown@email.com'
          }
        );
      }
    } catch (notificationError) {
      console.error('Error sending course notifications:', notificationError);
      // Don't throw error to avoid breaking the main course operation
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
      // Store all selected IDs as arrays
      country_ids: courseToSave.country_ids,
      region_ids: courseToSave.region_ids,
      city_ids: courseToSave.city_ids,
      project_ids: courseToSave.project_ids,
      board_ids: courseToSave.board_ids,
      school_ids: courseToSave.school_ids,
      class_ids: courseToSave.class_ids,
      // Stripe payment fields
      payment_type: courseToSave.payment_type || 'free',
      course_price: courseToSave.course_price || 0,
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
                const contentUpdateData: any = {
                  title: item.title,
                  content_type: item.content_type,
                  content_path: item.content_path,
                  due_date: item.due_date
                };

                // Include retry settings if they exist
                if (item.retry_settings) {
                  // Clean up retry settings to only include valid properties
                  const cleanRetrySettings = {
                    allowRetries: item.retry_settings.allowRetries,
                    maxRetries: item.retry_settings.maxRetries,
                    retryCooldownHours: item.retry_settings.retryCooldownHours,
                    retryThreshold: item.retry_settings.retryThreshold
                  };
                  contentUpdateData.retry_settings = cleanRetrySettings;
                  console.log('Saving retry settings for content item:', item.id, cleanRetrySettings);
                }

                await supabase
                  .from('course_lesson_content')
                  .update(contentUpdateData)
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
                          question_type: question.question_type,
                          points: question.points || 1,
                          math_expression: question.math_expression || null,
                          math_tolerance: question.math_tolerance || null,
                          math_hint: question.math_hint || null,
                          math_allow_drawing: question.math_allow_drawing === true,
                          image_url: question.image_url || null
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
                          position: qIndex,
                          points: question.points || 1,
                          math_expression: question.math_expression || null,
                          math_tolerance: question.math_tolerance || null,
                          math_hint: question.math_hint || null,
                          math_allow_drawing: question.math_allow_drawing === true,
                          image_url: question.image_url || null
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
                        position: qIndex,
                        points: question.points || 1,
                        math_expression: question.math_expression || null,
                        math_tolerance: question.math_tolerance || null,
                        math_hint: question.math_hint || null,
                        math_allow_drawing: question.math_allow_drawing || false,
                        image_url: question.image_url || null
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
                      position: qIndex,
                      points: question.points || 1,
                      math_expression: question.math_expression || null,
                      math_tolerance: question.math_tolerance || null,
                      math_hint: question.math_hint || null,
                      math_allow_drawing: question.math_allow_drawing || false,
                      image_url: question.image_url || null
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
                    position: qIndex,
                    points: question.points || 1,
                    math_expression: question.math_expression || null,
                    math_tolerance: question.math_tolerance || null,
                    math_hint: question.math_hint || null,
                    math_allow_drawing: question.math_allow_drawing || false,
                    image_url: question.image_url || null
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
    console.log('saveCourseWithCurriculum called with retry settings:', courseToSave.sections?.map(s => 
      s.lessons?.map(l => 
        l.contentItems?.filter(ci => ci.content_type === 'quiz' && ci.retry_settings)
      )
    ));
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
      // Store all selected IDs as arrays
      country_ids: courseToSave.country_ids,
      region_ids: courseToSave.region_ids,
      city_ids: courseToSave.city_ids,
      project_ids: courseToSave.project_ids,
      board_ids: courseToSave.board_ids,
      school_ids: courseToSave.school_ids,
      class_ids: courseToSave.class_ids,
      // Stripe payment fields
      payment_type: courseToSave.payment_type || 'free',
      course_price: courseToSave.course_price || 0,
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
    
    // Always save curriculum - the key is HOW we save it to preserve student progress
    const shouldSaveCurriculum = true;
    
    if (shouldSaveCurriculum) {
      if (isSameCourse) {
        // For same course scenario, we need to update existing content items instead of deleting/recreating
        // to preserve student progress
        await updateCurriculumPreservingProgress(currentCourseId, courseToSave.sections);
      } else if (isDraftOfPublished && !isSameCourse) {
        // For draft of published course, we also need to preserve progress by updating existing content
        // instead of deleting/recreating
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
                              points: question.points || 1,
                              math_expression: question.math_expression || null,
                              math_tolerance: question.math_tolerance || null,
                              math_hint: question.math_hint || null,
                              math_allow_drawing: question.math_allow_drawing === true,
                              image_url: question.image_url || null
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

                  // Save quiz retry settings if they exist
                  if (item.retry_settings) {
                      // Clean up retry settings to only include valid properties
                      const cleanRetrySettings = {
                          allowRetries: item.retry_settings.allowRetries,
                          maxRetries: item.retry_settings.maxRetries,
                          retryCooldownHours: item.retry_settings.retryCooldownHours,
                          retryThreshold: item.retry_settings.retryThreshold
                      };
                      console.log('Saving quiz retry settings in saveCourseWithCurriculum for content item:', savedContent.id, cleanRetrySettings);
                      const { error: retryError } = await supabase
                          .from('course_lesson_content')
                          .update({ retry_settings: cleanRetrySettings })
                          .eq('id', savedContent.id);

                      if (retryError) {
                          console.error('Error saving quiz retry settings:', retryError);
                          // Don't throw error here as it's not critical for course saving
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
      .select('user_id, role')
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

    // Send notifications for teacher changes
    try {
      const currentTeacherIds = currentDbMembers
        ?.filter(member => member.role === 'teacher' || member.role === 'content_creator')
        .map(member => member.user_id) || [];
      
      const newTeacherIds = courseToSave.teachers
        .filter(teacher => !currentTeacherIds.includes(teacher.id))
        .map(teacher => teacher.id);
      
      const existingTeacherIds = courseToSave.teachers
        .filter(teacher => currentTeacherIds.includes(teacher.id))
        .map(teacher => teacher.id);

      // Get teacher details for notifications
      const newTeachers = await CourseNotificationService.getTeacherDetails(newTeacherIds);
      const existingTeachers = await CourseNotificationService.getTeacherDetails(existingTeacherIds);

      // Send notifications
      if (newTeachers.length > 0 || existingTeachers.length > 0) {
        await CourseNotificationService.notifyCourseMemberChanges(
          currentCourseId,
          newTeachers,
          existingTeachers,
          {
            id: user.id,
            name: user.user_metadata?.full_name || user.email || 'Unknown User',
            email: user.email || 'unknown@email.com'
          }
        );
      }
    } catch (notificationError) {
      console.error('Error sending course notifications:', notificationError);
      // Don't throw error to avoid breaking the main course operation
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
      
      // Check if this is a draft of a published course (has published_course_id)
      // If so, use saveCourseWithCurriculum to preserve student progress
      if (courseToSave.published_course_id && courseToSave.id) {
        console.log('Saving draft of published course - using saveCourseWithCurriculum to preserve progress');
        const savedId = await saveCourseWithCurriculum(courseToSave);
        if (savedId) {
          toast.success("Draft saved successfully!");
          setCourseData(prev => ({...prev, id: savedId, status: 'Draft'}));
          if (courseId === 'new' && savedId) {
            navigate(`/dashboard/courses/builder/${savedId}`, { replace: true });
          }
        }
      } else {
        // For new courses or drafts without published_course_id, use regular saveCourseData
        const savedId = await saveCourseData(courseToSave);
        if (savedId) {
          toast.success("Draft saved successfully!");
          setCourseData(prev => ({...prev, id: savedId, status: 'Draft'}));
          if (courseId === 'new' && savedId) {
            navigate(`/dashboard/courses/builder/${savedId}`, { replace: true });
          }
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
        console.log('Publishing course with retry settings:', courseData.sections?.map(s => 
          s.lessons?.map(l => 
            l.contentItems?.filter(ci => ci.content_type === 'quiz' && ci.retry_settings)
          )
        ));
        console.log('About to call saveCourseWithCurriculum...');
        await saveCourseWithCurriculum({ ...courseData, status: 'Draft' });
        console.log('saveCourseWithCurriculum completed');
        
        // Check if this is the same course (admin unpublish/republish scenario)
        const isSameCourse = courseData.id === courseData.published_course_id;
        
        if (isSameCourse) {
          // For same course scenario, just update the status to Published
          // The changes are already saved in the database through saveCourseWithCurriculum
          console.log('Publishing same course - curriculum and retry settings should already be saved');
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

        // Send notifications to students and teachers about course publication
        try {
          const studentIds = courseData.students.map(student => student.id);
          const teacherIds = courseData.teachers.map(teacher => teacher.id);
          
          if (studentIds.length > 0 || teacherIds.length > 0) {
            const studentDetails = studentIds.length > 0 ? await CourseNotificationService.getStudentDetails(studentIds) : [];
            const teacherDetails = teacherIds.length > 0 ? await CourseNotificationService.getTeacherDetails(teacherIds) : [];
            
            await CourseNotificationService.notifyCoursePublication(
              courseData.id,
              studentDetails,
              teacherDetails,
              {
                id: user.id,
                name: user.user_metadata?.full_name || user.email || 'Unknown User',
                email: user.email || 'unknown@email.com'
              }
            );
          }
        } catch (notificationError) {
          console.error('Error sending course publication notifications:', notificationError);
          // Don't throw error to avoid breaking the main course operation
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

          // Send notifications to students and teachers about course publication
          try {
            const studentIds = courseData.students.map(student => student.id);
            const teacherIds = courseData.teachers.map(teacher => teacher.id);
            
            if (studentIds.length > 0 || teacherIds.length > 0) {
              const studentDetails = studentIds.length > 0 ? await CourseNotificationService.getStudentDetails(studentIds) : [];
              const teacherDetails = teacherIds.length > 0 ? await CourseNotificationService.getTeacherDetails(teacherIds) : [];
              
              await CourseNotificationService.notifyCoursePublication(
                savedId,
                studentDetails,
                teacherDetails,
                {
                  id: user.id,
                  name: user.user_metadata?.full_name || user.email || 'Unknown User',
                  email: user.email || 'unknown@email.com'
                }
              );
            }
          } catch (notificationError) {
            console.error('Error sending course publication notifications:', notificationError);
            // Don't throw error to avoid breaking the main course operation
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
            'unpublished',
            courseData.id,
            courseData.title
          );
        } catch (logError) {
          console.error('Error logging course unpublish:', logError);
        }
      }

      // Send notifications to teachers and students about course unpublishing
      try {
        const teacherIds = courseData.teachers.map(teacher => teacher.id);
        const studentIds = courseData.students.map(student => student.id);
        
        if (teacherIds.length > 0 || studentIds.length > 0) {
          const teacherDetails = teacherIds.length > 0 ? await CourseNotificationService.getTeacherDetails(teacherIds) : [];
          const studentDetails = studentIds.length > 0 ? await CourseNotificationService.getStudentDetails(studentIds) : [];
          
          await CourseNotificationService.notifyCourseUnpublished({
            courseId: courseData.id,
            courseName: courseData.title,
            courseTitle: courseData.title,
            courseSubtitle: courseData.subtitle,
            action: 'course_unpublished',
            existingTeachers: teacherDetails,
            students: studentDetails,
            performedBy: {
              id: user.id,
              name: user.user_metadata?.full_name || user.email || 'Unknown User',
              email: user.email || 'unknown@email.com'
            }
          });
        }
      } catch (notificationError) {
        console.error('Error sending course unpublish notifications:', notificationError);
        // Don't throw error to avoid breaking the main course operation
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
      
      // Log course deletion
      if (user) {
        try {
          await AccessLogService.logCourseAction(
            user.id,
            user.email || 'unknown@email.com',
            'deleted',
            courseData.id,
            courseData.title
          );
        } catch (logError) {
          console.error('Error logging course deletion:', logError);
        }
      }

      // Send notifications to teachers and students about course deletion
      try {
        const teacherIds = courseData.teachers.map(teacher => teacher.id);
        const studentIds = courseData.students.map(student => student.id);
        
        if (teacherIds.length > 0 || studentIds.length > 0) {
          const teacherDetails = teacherIds.length > 0 ? await CourseNotificationService.getTeacherDetails(teacherIds) : [];
          const studentDetails = studentIds.length > 0 ? await CourseNotificationService.getStudentDetails(studentIds) : [];
          
          await CourseNotificationService.notifyCourseDeleted({
            courseId: courseData.id,
            courseName: courseData.title,
            courseTitle: courseData.title,
            courseSubtitle: courseData.subtitle,
            action: 'course_deleted',
            existingTeachers: teacherDetails,
            students: studentDetails,
            performedBy: {
              id: user.id,
              name: user.user_metadata?.full_name || user.email || 'Unknown User',
              email: user.email || 'unknown@email.com'
            }
          });
        }
      } catch (notificationError) {
        console.error('Error sending course deletion notifications:', notificationError);
        // Don't throw error to avoid breaking the main course operation
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
      const courseToSave = { ...courseData, status: 'Draft' as const };
      
      // Check if this is a draft of a published course (has published_course_id)
      // If so, use saveCourseWithCurriculum to preserve student progress
      let savedId: string | null;
      if (courseToSave.published_course_id && courseToSave.id) {
        console.log('Submitting draft of published course for review - using saveCourseWithCurriculum to preserve progress');
        savedId = await saveCourseWithCurriculum(courseToSave);
      } else {
        // For new courses or drafts without published_course_id, use regular saveCourseData
        savedId = await saveCourseData(courseToSave);
      }
      
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
            'submitted_for_review',
            savedId,
            courseData.title
          );
        } catch (logError) {
          console.error('Error logging course submission:', logError);
        }
      }

      // Send notifications to all admins and super users about course submission for review
      try {
        await CourseNotificationService.notifyAdminsCourseSubmittedForReview({
          courseId: savedId,
          courseName: courseData.title,
          courseTitle: courseData.title,
          courseSubtitle: courseData.subtitle,
          action: 'course_submitted_for_review',
          performedBy: {
            id: user.id,
            name: user.user_metadata?.full_name || user.email || 'Unknown User',
            email: user.email || 'unknown@email.com'
          }
        });
      } catch (notificationError) {
        console.error('Error sending course submission notifications to admins and super users:', notificationError);
        // Don't throw error to avoid breaking the main course operation
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
            'approved',
            courseData.id,
            courseData.title
          );
        } catch (logError) {
          console.error('Error logging course approval:', logError);
        }
      }

      // Send notifications to course teachers about course approval
      try {
        await CourseNotificationService.notifyTeachersCourseApproved({
          courseId: courseData.id,
          courseName: courseData.title,
          courseTitle: courseData.title,
          courseSubtitle: courseData.subtitle,
          action: 'course_approved',
          existingTeachers: courseData.teachers,
          performedBy: {
            id: user.id,
            name: user.user_metadata?.full_name || user.email || 'Unknown Admin',
            email: user.email || 'unknown@email.com'
          }
        });
      } catch (notificationError) {
        console.error('Error sending course approval notifications to teachers:', notificationError);
        // Don't throw error to avoid breaking the main course operation
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
            'rejected',
            courseData.id,
            courseData.title
          );
        } catch (logError) {
          console.error('Error logging course rejection:', logError);
        }
      }

      // Send notifications to course teachers about course rejection
      try {
        await CourseNotificationService.notifyTeachersCourseRejected({
          courseId: courseData.id,
          courseName: courseData.title,
          courseTitle: courseData.title,
          courseSubtitle: courseData.subtitle,
          action: 'course_rejected',
          existingTeachers: courseData.teachers,
          performedBy: {
            id: user.id,
            name: user.user_metadata?.full_name || user.email || 'Unknown Admin',
            email: user.email || 'unknown@email.com'
          },
          rejectionFeedback: rejectionFeedback
        });
      } catch (notificationError) {
        console.error('Error sending course rejection notifications to teachers:', notificationError);
        // Don't throw error to avoid breaking the main course operation
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

        // Handle content item reordering within a lesson
        if (activeType === 'contentItem') {
          const sourceSectionId = active.data.current?.sectionId;
          const sourceSectionIndex = newSections.findIndex(s => s.id === sourceSectionId);
          
          if (sourceSectionIndex > -1) {
            const sourceSection = newSections[sourceSectionIndex];
            const sourceLesson = sourceSection.lessons.find(lesson => 
              lesson.contentItems.some(item => item.id === activeId)
            );
            
            if (sourceLesson) {
              const oldIndex = sourceLesson.contentItems.findIndex(item => item.id === activeId);
              const newIndex = sourceLesson.contentItems.findIndex(item => item.id === overId);
              
              if (oldIndex !== -1 && newIndex !== -1) {
                const reorderedContentItems = arrayMove(sourceLesson.contentItems, oldIndex, newIndex);
                const updatedLesson = {
                  ...sourceLesson,
                  contentItems: reorderedContentItems.map((item, index) => ({
                    ...item,
                    position: index + 1
                  }))
                };
                
                newSections[sourceSectionIndex] = {
                  ...sourceSection,
                  lessons: sourceSection.lessons.map(lesson => 
                    lesson.id === sourceLesson.id ? updatedLesson : lesson
                  )
                };
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
  const addContentItem = (lessonId: string, contentType: 'video' | 'assignment' | 'quiz' | 'attachment' | 'lesson_plan' = 'video') => {
    const getDisplayName = (type: string) => {
      switch (type) {
        case 'lesson_plan': return 'Lesson Plan';
        default: return type.charAt(0).toUpperCase() + type.slice(1);
      }
    };
    
    const newContentItem: LessonContentItem = {
      id: `content-${Date.now()}`,
      title: `New ${getDisplayName(contentType)}`,
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
    console.log('🔄 COURSEBUILDER: updateContentItem called with:', { lessonId, itemId, updatedItem });
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
        .map(user => ({ 
          id: user.id, 
          name: `${user.first_name} ${user.last_name}`, 
          email: user.email,
          avatar_url: user.avatar_url 
        }));
    
    setCourseData(prev => {
      // Get current class members to preserve them
      const currentClassIds = prev.class_ids || [];
      const currentClassObjects = dbClasses.filter(cls => currentClassIds.includes(cls.id));
      const classTeacherIds = currentClassObjects.flatMap(cls => cls.teachers.map(t => t.id));
      const classStudentIds = currentClassObjects.flatMap(cls => cls.students.map(s => s.id));
      
      if (role === 'teachers') {
        // Preserve class teachers and add manually selected teachers
        const classTeachers = prev.teachers.filter(teacher => classTeacherIds.includes(teacher.id));
        const mergedTeachers = [...classTeachers, ...selectedUsers];
        
        // Remove duplicates
        const finalTeachers = mergedTeachers.filter((teacher, index, self) => 
          index === self.findIndex(t => t.id === teacher.id)
        );
        
        return {
          ...prev,
          teachers: finalTeachers
        };
      } else {
        // Preserve class students and add manually selected students
        const classStudents = prev.students.filter(student => classStudentIds.includes(student.id));
        const mergedStudents = [...classStudents, ...selectedUsers];
        
        // Remove duplicates
        const finalStudents = mergedStudents.filter((student, index, self) => 
          index === self.findIndex(s => s.id === student.id)
        );
        
        return {
          ...prev,
          students: finalStudents
        };
      }
    });
  };

  // Content Type Selector handlers
  const handleShowContentTypeSelector = (lessonId: string) => {
    setSelectedLessonId(lessonId);
    setShowContentTypeSelector(true);
  };

  const handleContentTypeSelect = (contentType: 'video' | 'assignment' | 'quiz' | 'attachment' | 'lesson_plan') => {
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
    currentUserRole === 'admin' || currentUserRole === 'super_user' ||
    (currentUserRole === 'content_creator' && user.id === courseData.authorId) ||
    (currentUserRole === 'teacher' && user.id === courseData.authorId && (courseData.status === 'Draft' || courseData.status === 'Rejected'))
  );

  // Check if user can reorder content items (admin, super_user, teacher, and content_creator only, and only in draft mode)
  const canReorderContent = (currentUserRole === 'admin' || currentUserRole === 'super_user' || currentUserRole === 'teacher' || currentUserRole === 'content_creator') && 
                           (courseData.status === 'Draft' || courseData.status === 'Rejected');

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
        <div className="relative flex flex-col lg:flex-row items-start lg:items-center justify-between p-3 sm:p-4 md:p-6 w-full gap-3 sm:gap-4">
          <div className="flex items-start gap-2 sm:gap-4 w-full lg:w-auto">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/dashboard/courses')}
              className="h-8 w-8 sm:h-10 sm:w-10 rounded-xl bg-background border border-input shadow-sm hover:shadow-lg hover:shadow-primary/10 transition-all duration-300 hover:-translate-y-0.5 flex-shrink-0"
            >
              <ArrowLeft className="w-3 h-3 sm:w-4 sm:h-4" />
            </Button>
            <div className="flex items-start gap-2 sm:gap-3 min-w-0 flex-1">
              <div className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 bg-gradient-to-br from-primary/10 to-primary/20 rounded-xl sm:rounded-2xl flex items-center justify-center flex-shrink-0">
                <BookOpen className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <h1 className="text-base sm:text-xl md:text-2xl font-bold tracking-tight bg-gradient-to-r from-primary via-primary to-primary/80 bg-clip-text text-transparent truncate" style={{ backgroundClip: 'text', WebkitBackgroundClip: 'text' }}>
                  {courseData.title || 'New Course'}
                </h1>
                <div className="flex items-center gap-2 sm:gap-3 mt-1 sm:mt-2 flex-wrap">
                  <Badge variant={
                    courseData.status === 'Published' ? 'default' :
                    courseData.status === 'Under Review' ? 'outline' :
                    courseData.status === 'Rejected' ? 'destructive' :
                    'blue'
                  } className="text-[10px] sm:text-xs">
                    {courseData.status || 'Draft'}
                  </Badge>
                  <span className="text-xs sm:text-sm text-muted-foreground hidden sm:inline">
                    Last saved: 2 minutes ago
                  </span>
                </div>
                {currentUserRole === 'teacher' && courseData.status === 'Draft' && (
                    <div className="flex items-center gap-2 mt-2 text-xs sm:text-sm text-blue-800 bg-blue-100 border border-blue-300 rounded-lg p-2 sm:p-3 shadow-sm">
                        <Info className="h-3 w-3 sm:h-4 sm:w-4 text-blue-600 flex-shrink-0" />
                        <span className="font-medium">You must submit this course for admin review and approval before it can be published.</span>
                    </div>
                )}
                {currentUserRole === 'content_creator' && courseData.status === 'Draft' && (
                    <div className="flex items-center gap-2 mt-2 text-xs sm:text-sm text-green-800 bg-green-100 border border-green-300 rounded-lg p-2 sm:p-3 shadow-sm">
                        <Info className="h-3 w-3 sm:h-4 sm:w-4 text-green-600 flex-shrink-0" />
                        <span className="font-medium">You can publish this course directly when ready, or save it as a draft to continue editing later.</span>
                    </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 w-full lg:w-auto flex-wrap">
            <Button
              variant="outline"
              onClick={() => setIsPreviewOpen(true)}
              className="h-8 sm:h-9 px-2.5 sm:px-3 md:px-4 rounded-lg sm:rounded-xl bg-background border border-input shadow-sm hover:shadow-lg hover:shadow-primary/10 transition-all duration-300 hover:-translate-y-0.5 hover:bg-gray-100 hover:text-gray-900 dark:hover:bg-gray-800 dark:hover:text-white text-xs sm:text-sm flex-shrink-0"
            >
              <Eye className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-1.5" />
              <span className="hidden sm:inline">Preview</span>
            </Button>

            {/* Teacher Buttons */}
            {currentUserRole === 'teacher' && (
              <>
                {(courseData.status === 'Draft' || courseData.status === 'Rejected') && (
                  <>
                    <Button 
                      onClick={handleSaveDraftClick} 
                      disabled={isSaving}
                      className="h-8 sm:h-9 px-2.5 sm:px-3 md:px-4 rounded-lg sm:rounded-xl bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5 text-xs sm:text-sm flex-shrink-0 whitespace-nowrap"
                    >
                      <Save className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-1.5" />
                      <span className="hidden md:inline">{saveAction === 'draft' ? 'Saving...' : (courseData.id ? 'Update Draft' : 'Save Draft')}</span>
                      <span className="md:hidden">{saveAction === 'draft' ? 'Saving...' : 'Save'}</span>
                    </Button>
                    <Button 
                      onClick={handleSubmitForReview} 
                      className="h-8 sm:h-9 px-2.5 sm:px-3 md:px-4 rounded-lg sm:rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5 text-white text-xs sm:text-sm flex-shrink-0 whitespace-nowrap" 
                      disabled={isSaving || !isFormValid}
                    >
                      <span className="hidden md:inline">{saveAction === 'review' ? 'Submitting...' : 'Submit for Review'}</span>
                      <span className="md:hidden">{saveAction === 'review' ? 'Submitting...' : 'Submit'}</span>
                    </Button>
                  </>
                )}
                {courseData.status === 'Published' && (
                   <Button 
                     onClick={handleSaveDraftClick} 
                     disabled={isSaving}
                     className="h-8 sm:h-9 px-2.5 sm:px-3 md:px-4 rounded-lg sm:rounded-xl bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5 text-xs sm:text-sm flex-shrink-0 whitespace-nowrap"
                   >
                      <Save className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-1.5" />
                      <span className="hidden md:inline">{saveAction === 'draft' ? 'Creating...' : 'Create New Draft'}</span>
                      <span className="md:hidden">{saveAction === 'draft' ? 'Creating...' : 'New Draft'}</span>
                    </Button>
                )}
              </>
            )}

            {/* Content Creator Buttons */}
            {currentUserRole === 'content_creator' && (
              <>
                {(courseData.status === 'Draft' || courseData.status === 'Rejected') && (
                   <Button 
                     onClick={handleSaveDraftClick} 
                     disabled={isSaving}
                     className="h-8 sm:h-9 px-2.5 sm:px-3 md:px-4 rounded-lg sm:rounded-xl bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5 text-xs sm:text-sm flex-shrink-0 whitespace-nowrap"
                   >
                    <Save className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-1.5" />
                    <span className="hidden md:inline">{saveAction === 'draft' ? 'Saving...' : (courseData.id ? 'Update Draft' : 'Save Draft')}</span>
                    <span className="md:hidden">{saveAction === 'draft' ? 'Saving...' : 'Save'}</span>
                  </Button>
                )}
                {courseData.status === 'Published' ? (
                  <>
                    {/* Only show unpublish button if content creator is the author of the course */}
                    {courseData.authorId === user?.id && (
                      <Button 
                        onClick={handleUnpublishClick} 
                        className="h-8 sm:h-9 px-2.5 sm:px-3 md:px-4 rounded-lg sm:rounded-xl bg-gradient-to-r from-yellow-600 to-yellow-700 hover:from-yellow-700 hover:to-yellow-800 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5 text-xs sm:text-sm flex-shrink-0 whitespace-nowrap" 
                        disabled={isSaving}
                      >
                        {saveAction === 'unpublish' ? 'Unpublishing...' : 'Unpublish'}
                      </Button>
                    )}
                  </>
                ) : (
                  (courseData.status === 'Draft' || courseData.status === 'Rejected') && (
                    <Button 
                      onClick={handlePublishClick} 
                      className="h-8 sm:h-9 px-2.5 sm:px-3 md:px-4 rounded-lg sm:rounded-xl bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5 text-xs sm:text-sm flex-shrink-0 whitespace-nowrap" 
                      disabled={isSaving || !isFormValid}
                    >
                      {saveAction === 'publish' ? 'Publishing...' : 'Publish'}
                    </Button>
                  )
                )}
              </>
            )}

            {/* Admin Buttons */}
            {(currentUserRole === 'admin' || currentUserRole === 'super_user') && (
              <>
                {(courseData.status === 'Draft' || courseData.status === 'Rejected') && (
                   <Button 
                     onClick={handleSaveDraftClick} 
                     disabled={isSaving}
                     className="h-8 sm:h-9 px-2.5 sm:px-3 md:px-4 rounded-lg sm:rounded-xl bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5 text-xs sm:text-sm flex-shrink-0 whitespace-nowrap"
                   >
                    <Save className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-1.5" />
                    <span className="hidden md:inline">{saveAction === 'draft' ? 'Saving...' : (courseData.id ? 'Update Draft' : 'Save Draft')}</span>
                    <span className="md:hidden">{saveAction === 'draft' ? 'Saving...' : 'Save'}</span>
                  </Button>
                )}
                {courseData.status === 'Published' ? (
                  <>
                    <Button 
                      onClick={handleUnpublishClick} 
                      className="h-8 sm:h-9 px-2.5 sm:px-3 md:px-4 rounded-lg sm:rounded-xl bg-gradient-to-r from-yellow-600 to-yellow-700 hover:from-yellow-700 hover:to-yellow-800 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5 text-xs sm:text-sm flex-shrink-0 whitespace-nowrap" 
                      disabled={isSaving}
                    >
                      {saveAction === 'unpublish' ? 'Unpublishing...' : 'Unpublish'}
                    </Button>
                  </>
                ) : (
                  (courseData.status === 'Draft' || courseData.status === 'Rejected') && (
                    <Button 
                      onClick={handlePublishClick} 
                      className="h-8 sm:h-9 px-2.5 sm:px-3 md:px-4 rounded-lg sm:rounded-xl bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5 text-xs sm:text-sm flex-shrink-0 whitespace-nowrap" 
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
                      className="h-8 sm:h-9 px-2.5 sm:px-3 md:px-4 rounded-lg sm:rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5 text-xs sm:text-sm flex-shrink-0 whitespace-nowrap"
                    >
                        {saveAction === 'reject' ? 'Rejecting...' : 'Reject'}
                    </Button>
                    <Button 
                      onClick={handleApproveSubmission} 
                      className="h-8 sm:h-9 px-2.5 sm:px-3 md:px-4 rounded-lg sm:rounded-xl bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5 text-xs sm:text-sm flex-shrink-0 whitespace-nowrap" 
                      disabled={isSaving}
                    >
                      <span className="hidden md:inline">{saveAction === 'approve' ? 'Approving...' : 'Approve & Publish'}</span>
                      <span className="md:hidden">{saveAction === 'approve' ? 'Approving...' : 'Approve'}</span>
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
                  className="h-8 sm:h-9 px-2.5 sm:px-3 md:px-4 rounded-lg sm:rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5 text-xs sm:text-sm flex-shrink-0 whitespace-nowrap"
                >
                    Delete
                </Button>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
            <div className="flex-1">
        {persistentFeedback && ((currentUserRole === 'admin' || currentUserRole === 'super_user') || ((currentUserRole === 'teacher' || currentUserRole === 'content_creator') && courseData.status !== 'Under Review')) && (
          <div className="p-6 pt-6 pb-0">
            <Alert variant="destructive">
              <Terminal className="h-4 w-4" />
              <AlertTitle>
                {(currentUserRole === 'admin' || currentUserRole === 'super_user') ? 'Requested Changes' : 'Submission Rejected'}
              </AlertTitle>
              <AlertDescription>
                {(currentUserRole === 'admin' || currentUserRole === 'super_user') ? (
                  <>
                    <p className="font-semibold">You have requested the following changes from the content creator:</p>
                    <p className="mt-2 p-2 bg-background rounded-md">{persistentFeedback}</p>
                    <p className="mt-2 text-sm text-muted-foreground">The content creator must address this feedback and resubmit the course for it to be approved.</p>
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
          <div className="relative border-b bg-card overflow-x-auto">
            <div className="absolute inset-0 bg-gradient-to-r from-primary/3 via-transparent to-primary/3"></div>
            <div className="relative min-w-max">
              <TabsList className="w-full justify-start rounded-none h-12 sm:h-14 bg-transparent p-0 border-none">
                <TabsTrigger
                  value="details"
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary/10 data-[state=active]:to-primary/5 px-3 sm:px-6 h-12 sm:h-14 text-xs sm:text-sm font-medium transition-all duration-300 hover:bg-primary/5 hover:border-primary/50 data-[state=active]:text-primary data-[state=active]:font-semibold whitespace-nowrap"
                >
                  Course Details
                </TabsTrigger>
                <TabsTrigger
                  value="curriculum"
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary/10 data-[state=active]:to-primary/5 px-3 sm:px-6 h-12 sm:h-14 text-xs sm:text-sm font-medium transition-all duration-300 hover:bg-primary/5 hover:border-primary/50 data-[state=active]:text-primary data-[state=active]:font-semibold whitespace-nowrap"
                >
                  Curriculum
                </TabsTrigger>
                <TabsTrigger
                  value="landing"
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary/10 data-[state=active]:to-primary/5 px-3 sm:px-6 h-12 sm:h-14 text-xs sm:text-sm font-medium transition-all duration-300 hover:bg-primary/5 hover:border-primary/50 data-[state=active]:text-primary data-[state=active]:font-semibold whitespace-nowrap"
                >
                  Landing Page
                </TabsTrigger>
                <TabsTrigger
                  value="access"
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary/10 data-[state=active]:to-primary/5 px-3 sm:px-6 h-12 sm:h-14 text-xs sm:text-sm font-medium transition-all duration-300 hover:bg-primary/5 hover:border-primary/50 data-[state=active]:text-primary data-[state=active]:font-semibold whitespace-nowrap"
                >
                  Access
                </TabsTrigger>
              </TabsList>
            </div>
          </div>

          <div className="p-3 sm:p-4 md:p-6">
            <TabsContent value="details" className="space-y-4 sm:space-y-6 md:space-y-8">
              {/* Basic Information Card */}
              <Card className="overflow-hidden border-0 shadow-xl bg-gradient-to-br from-card to-card/50 dark:bg-card">
                <CardHeader className="bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 border-b border-primary/10 p-4 sm:p-5 md:pb-6">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 bg-gradient-to-br from-primary/10 to-primary/20 rounded-xl sm:rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300 flex-shrink-0">
                      <BookOpen className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-primary-700 dark:text-primary-300" />
                    </div>
                  <div className="min-w-0">
                      <CardTitle className="text-lg sm:text-xl md:text-2xl font-bold bg-gradient-to-r from-gray-900 via-gray-800 to-gray-700 dark:from-white dark:via-gray-100 dark:to-gray-200 bg-clip-text text-transparent">
                        Basic Information
                      </CardTitle>
                      <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 sm:mt-1">
                        Set the foundation for your course with essential details
                      </p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-4 sm:p-6 md:p-8 space-y-4 sm:space-y-6">
                  {/* Course Title */}
                  <div className="space-y-2 sm:space-y-3">
                    <label className="block text-xs sm:text-sm font-semibold text-gray-900 dark:text-white">
                      Course Title
                      <span className="text-red-500 ml-1">*</span>
                    </label>
                    <Input
                      value={courseData.title}
                      onChange={(e) => setCourseData(prev => ({ ...prev, title: e.target.value }))}
                      onBlur={() => handleBlur('title')}
                      placeholder="Enter an engaging course title"
                      className={cn(
                        "h-10 sm:h-11 md:h-12 text-sm sm:text-base md:text-lg font-medium border-2 rounded-xl sm:rounded-2xl transition-all duration-300 focus:shadow-lg",
                        "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700",
                        "focus:border-primary focus:ring-4 focus:ring-primary/10",
                        "placeholder:text-gray-400 dark:placeholder:text-gray-500",
                        validationErrors.title && (touchedFields.title || courseData.id) && 
                        "border-red-500 focus:border-red-500 focus:ring-red-500/10"
                      )}
                    />
                    {validationErrors.title && (touchedFields.title || courseData.id) && (
                      <div className="flex items-center gap-2 text-red-500 text-xs sm:text-sm">
                        <div className="w-1.5 h-1.5 bg-red-500 rounded-full"></div>
                        {validationErrors.title}
                      </div>
                    )}
                  </div>
                  
                  {/* Course Subtitle */}
                  <div className="space-y-2 sm:space-y-3">
                    <label className="block text-xs sm:text-sm font-semibold text-gray-900 dark:text-white">
                      Course Subtitle
                      <span className="text-red-500 ml-1">*</span>
                    </label>
                    <Input
                      value={courseData.subtitle}
                      onChange={(e) => setCourseData(prev => ({ ...prev, subtitle: e.target.value }))}
                      onBlur={() => handleBlur('subtitle')}
                      placeholder="Add a compelling subtitle to hook learners"
                      className={cn(
                        "h-10 sm:h-11 text-sm sm:text-base font-medium border-2 rounded-xl sm:rounded-2xl transition-all duration-300 focus:shadow-lg",
                        "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700",
                        "focus:border-primary focus:ring-4 focus:ring-primary/10",
                        "placeholder:text-gray-400 dark:placeholder:text-gray-500",
                        validationErrors.subtitle && (touchedFields.subtitle || courseData.id) && 
                        "border-red-500 focus:border-red-500 focus:ring-red-500/10"
                      )}
                    />
                    {validationErrors.subtitle && (touchedFields.subtitle || courseData.id) && (
                      <div className="flex items-center gap-2 text-red-500 text-xs sm:text-sm">
                        <div className="w-1.5 h-1.5 bg-red-500 rounded-full"></div>
                        {validationErrors.subtitle}
                      </div>
                    )}
                  </div>
                  
                  {/* Course Description */}
                  <div className="space-y-2 sm:space-y-3">
                    <label className="block text-xs sm:text-sm font-semibold text-gray-900 dark:text-white">
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
                        "text-sm sm:text-base font-medium border-2 rounded-xl sm:rounded-2xl transition-all duration-300 focus:shadow-lg resize-none",
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
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-5 md:gap-6">
                    {/* Category */}
                    <div className="space-y-2 sm:space-y-3">
                      <label className="block text-xs sm:text-sm font-semibold text-gray-900 dark:text-white">
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
                          "h-10 sm:h-11 border-2 rounded-xl sm:rounded-2xl transition-all duration-300 focus:scale-[1.02] focus:shadow-lg",
                          "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700",
                          "focus:border-primary focus:ring-4 focus:ring-primary/10",
                          "text-sm sm:text-base font-medium",
                          validationErrors.category && (touchedFields.category || courseData.id) && 
                          "border-red-500 focus:border-red-500 focus:ring-red-500/10"
                        )}>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl sm:rounded-2xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-2xl">
                          {categories.map((category) => (
                            <SelectItem 
                              key={category.id} 
                              value={category.name}
                              className="rounded-lg sm:rounded-xl hover:bg-primary/5 hover:text-gray-900 dark:hover:text-white focus:bg-primary/10 focus:text-gray-900 dark:focus:text-white transition-colors text-sm sm:text-base"
                            >
                              {category.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {validationErrors.category && (touchedFields.category || courseData.id) && (
                        <div className="flex items-center gap-2 text-red-500 text-xs sm:text-sm">
                          <div className="w-1.5 h-1.5 bg-red-500 rounded-full"></div>
                          {validationErrors.category}
                        </div>
                      )}
                    </div>
                    
                    {/* Language */}
                    <div className="space-y-2 sm:space-y-3">
                      <label className="block text-xs sm:text-sm font-semibold text-gray-900 dark:text-white">
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
                          "h-10 sm:h-11 border-2 rounded-xl sm:rounded-2xl transition-all duration-300 focus:scale-[1.02] focus:shadow-lg",
                          "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700",
                          "focus:border-primary focus:ring-4 focus:ring-primary/10",
                          "text-sm sm:text-base font-medium",
                          validationErrors.language && (touchedFields.language || courseData.id) && 
                          "border-red-500 focus:border-red-500 focus:ring-red-500/10"
                        )}>
                          <SelectValue placeholder="Select language" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl sm:rounded-2xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-2xl">
                          {languages.map((language) => (
                            <SelectItem 
                              key={language.id} 
                              value={language.name}
                              className="rounded-lg sm:rounded-xl hover:bg-primary/5 hover:text-gray-900 dark:hover:text-white focus:bg-primary/10 focus:text-gray-900 dark:focus:text-white transition-colors text-sm sm:text-base"
                            >
                              {language.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {validationErrors.language && (touchedFields.language || courseData.id) && (
                        <div className="flex items-center gap-2 text-red-500 text-xs sm:text-sm">
                          <div className="w-1.5 h-1.5 bg-red-500 rounded-full"></div>
                          {validationErrors.language}
                        </div>
                      )}
                    </div>
                    
                    {/* Level */}
                    <div className="space-y-2 sm:space-y-3">
                      <label className="block text-xs sm:text-sm font-semibold text-gray-900 dark:text-white">
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
                          "h-10 sm:h-11 border-2 rounded-xl sm:rounded-2xl transition-all duration-300 focus:scale-[1.02] focus:shadow-lg",
                          "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700",
                          "focus:border-primary focus:ring-4 focus:ring-primary/10",
                          "text-sm sm:text-base font-medium",
                          validationErrors.level && (touchedFields.level || courseData.id) && 
                          "border-red-500 focus:border-red-500 focus:ring-red-500/10"
                        )}>
                          <SelectValue placeholder="Select level" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl sm:rounded-2xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-2xl">
                          {levels.map((level) => (
                            <SelectItem 
                              key={level.id} 
                              value={level.name}
                              className="rounded-lg sm:rounded-xl hover:bg-primary/5 hover:text-gray-900 dark:hover:text-white focus:bg-primary/10 focus:text-gray-900 dark:focus:text-white transition-colors text-sm sm:text-base"
                            >
                              {level.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {validationErrors.level && (touchedFields.level || courseData.id) && (
                        <div className="flex items-center gap-2 text-red-500 text-xs sm:text-sm">
                          <div className="w-1.5 h-1.5 bg-red-500 rounded-full"></div>
                          {validationErrors.level}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Location and Board Information Grid */}
                  <div className="grid grid-cols-1 gap-4 sm:gap-5 md:gap-6">
                    {/* Country */}
                    <div className="space-y-2 sm:space-y-3">
                      <label className="block text-xs sm:text-sm font-semibold text-gray-900 dark:text-white">
                        Countries
                        <span className="text-red-500 ml-1">*</span>
                      </label>
                      <MultiSelect
                        options={countries.map(country => ({
                          value: country.id,
                          label: country.name,
                          subLabel: country.description || '',
                          imageUrl: undefined
                        }))}
                        onValueChange={handleCountryChange}
                        value={courseData.country_ids}
                        placeholder="Search and select countries..."
                        className={cn(
                          "min-h-[44px] border-2 border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all duration-300",
                          validationErrors.country_ids && (touchedFields.country_ids || courseData.id) && 
                          "border-red-500 focus:border-red-500 focus:ring-red-500/10"
                        )}
                      />
                      {validationErrors.country_ids && (touchedFields.country_ids || courseData.id) && (
                        <div className="flex items-center gap-2 text-red-500 text-xs sm:text-sm">
                          <div className="w-1.5 h-1.5 bg-red-500 rounded-full"></div>
                          {validationErrors.country_ids}
                        </div>
                      )}
                    </div>

                    {/* Region */}
                    <div className="space-y-2 sm:space-y-3">
                      <label className="block text-xs sm:text-sm font-semibold text-gray-900 dark:text-white">
                        Regions
                        <span className="text-red-500 ml-1">*</span>
                      </label>
                      <div className={courseData.country_ids.length === 0 ? "opacity-50 pointer-events-none" : ""}>
                        <MultiSelect
                          options={regions.map(region => ({
                            value: region.id,
                            label: region.name,
                            subLabel: region.description || '',
                            imageUrl: undefined
                          }))}
                          onValueChange={handleRegionChange}
                          value={courseData.region_ids}
                          placeholder={courseData.country_ids.length > 0 ? "Search and select regions..." : "Select countries first"}
                          className={cn(
                            "min-h-[44px] border-2 border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all duration-300",
                            validationErrors.region_ids && (touchedFields.region_ids || courseData.id) && 
                            "border-red-500 focus:border-red-500 focus:ring-red-500/10"
                          )}
                        />
                      </div>
                      {validationErrors.region_ids && (touchedFields.region_ids || courseData.id) && (
                        <div className="flex items-center gap-2 text-red-500 text-sm">
                          <div className="w-1.5 h-1.5 bg-red-500 rounded-full"></div>
                          {validationErrors.region_ids}
                        </div>
                      )}
                    </div>

                    {/* City */}
                    <div className="space-y-3">
                      <label className="block text-sm font-semibold text-gray-900 dark:text-white">
                        Cities
                        <span className="text-red-500 ml-1">*</span>
                      </label>
                      <div className={courseData.region_ids.length === 0 ? "opacity-50 pointer-events-none" : ""}>
                        <MultiSelect
                          options={cities.map(city => ({
                            value: city.id,
                            label: city.name,
                            subLabel: city.description || '',
                            imageUrl: undefined
                          }))}
                          onValueChange={handleCityChange}
                          value={courseData.city_ids}
                          placeholder={courseData.region_ids.length > 0 ? "Search and select cities..." : "Select regions first"}
                          className={cn(
                            "min-h-[44px] border-2 border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all duration-300",
                            validationErrors.city_ids && (touchedFields.city_ids || courseData.id) && 
                            "border-red-500 focus:border-red-500 focus:ring-red-500/10"
                          )}
                        />
                      </div>
                      {validationErrors.city_ids && (touchedFields.city_ids || courseData.id) && (
                        <div className="flex items-center gap-2 text-red-500 text-sm">
                          <div className="w-1.5 h-1.5 bg-red-500 rounded-full"></div>
                          {validationErrors.city_ids}
                        </div>
                      )}
                    </div>

                    {/* Project */}
                    <div className="space-y-3">
                      <label className="block text-sm font-semibold text-gray-900 dark:text-white">
                        Projects
                        <span className="text-red-500 ml-1">*</span>
                      </label>
                      <div className={courseData.city_ids.length === 0 ? "opacity-50 pointer-events-none" : ""}>
                        <MultiSelect
                          options={projects.map(project => ({
                            value: project.id,
                            label: project.name,
                            subLabel: project.description || '',
                            imageUrl: undefined
                          }))}
                          onValueChange={handleProjectChange}
                          value={courseData.project_ids}
                          placeholder={courseData.city_ids.length > 0 ? "Search and select projects..." : "Select cities first"}
                          className={cn(
                            "min-h-[44px] border-2 border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all duration-300",
                            validationErrors.project_ids && (touchedFields.project_ids || courseData.id) && 
                            "border-red-500 focus:border-red-500 focus:ring-red-500/10"
                          )}
                        />
                      </div>
                      {validationErrors.project_ids && (touchedFields.project_ids || courseData.id) && (
                        <div className="flex items-center gap-2 text-red-500 text-sm">
                          <div className="w-1.5 h-1.5 bg-red-500 rounded-full"></div>
                          {validationErrors.project_ids}
                        </div>
                      )}
                    </div>

                    {/* Board */}
                    <div className="space-y-3">
                      <label className="block text-sm font-semibold text-gray-900 dark:text-white">
                        Boards
                        <span className="text-red-500 ml-1">*</span>
                      </label>
                      <div className={courseData.project_ids.length === 0 ? "opacity-50 pointer-events-none" : ""}>
                        <MultiSelect
                          options={boards.map(board => ({
                            value: board.id,
                            label: board.name,
                            subLabel: board.description || '',
                            imageUrl: undefined
                          }))}
                          onValueChange={handleBoardChange}
                          value={courseData.board_ids}
                          placeholder={courseData.project_ids.length > 0 ? "Search and select boards..." : "Select projects first"}
                          className={cn(
                            "min-h-[44px] border-2 border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all duration-300",
                            validationErrors.board_ids && (touchedFields.board_ids || courseData.id) && 
                            "border-red-500 focus:border-red-500 focus:ring-red-500/10"
                          )}
                        />
                      </div>
                      {validationErrors.board_ids && (touchedFields.board_ids || courseData.id) && (
                        <div className="flex items-center gap-2 text-red-500 text-sm">
                          <div className="w-1.5 h-1.5 bg-red-500 rounded-full"></div>
                          {validationErrors.board_ids}
                        </div>
                      )}
                    </div>

                    {/* Schools */}
                    <div className="space-y-3">
                      <label className="block text-sm font-semibold text-gray-900 dark:text-white">
                        Schools
                        <span className="text-red-500 ml-1">*</span>
                      </label>
                      <div className={courseData.board_ids.length === 0 ? "opacity-50 pointer-events-none" : ""}>
                        <MultiSelect
                          options={schools.map(school => ({
                            value: school.id,
                            label: school.name,
                            subLabel: `${school.school_type} • ${school.code}`,
                            imageUrl: undefined
                          }))}
                          onValueChange={handleSchoolChange}
                          value={courseData.school_ids}
                          placeholder={courseData.board_ids.length > 0 ? "Search and select schools..." : "Select boards first"}
                          className={cn(
                            "min-h-[44px] border-2 border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all duration-300",
                            validationErrors.school_ids && (touchedFields.school_ids || courseData.id) && 
                            "border-red-500 focus:border-red-500 focus:ring-red-500/10"
                          )}
                        />
                      </div>
                      {validationErrors.school_ids && (touchedFields.school_ids || courseData.id) && (
                        <div className="flex items-center gap-2 text-red-500 text-sm">
                          <div className="w-1.5 h-1.5 bg-red-500 rounded-full"></div>
                          {validationErrors.school_ids}
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

                  {/* Payment Settings - Only show when Stripe is enabled */}
                  {isStripeEnabled && (
                    <div className="space-y-6 border-t pt-6">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Payment Settings</h3>
                      
                      {/* Payment Type Dropdown */}
                      <div className="space-y-3">
                        <label className="block text-sm font-semibold text-gray-900 dark:text-white">
                          Course Type
                        </label>
                        <Select
                          value={courseData.payment_type || 'free'}
                          onValueChange={(value: 'free' | 'paid') => {
                            setCourseData(prev => ({
                              ...prev,
                              payment_type: value,
                              course_price: value === 'free' ? 0 : prev.course_price || 0
                            }));
                          }}
                        >
                          <SelectTrigger className="h-11 text-base font-medium border-2 rounded-2xl transition-all duration-300 focus:scale-[1.02] focus:shadow-lg bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 focus:border-primary focus:ring-4 focus:ring-primary/10">
                            <SelectValue placeholder="Select course type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="free">Free Course</SelectItem>
                            <SelectItem value="paid">Paid Course</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      {/* Course Price Field - Only show for paid courses */}
                      {courseData.payment_type === 'paid' && (
                        <div className="space-y-3">
                          <label className="block text-sm font-semibold text-gray-900 dark:text-white">
                            Course Price (USD)
                          </label>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400">$</span>
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              placeholder="0.00"
                              value={priceInputValue}
                              onChange={(e) => {
                                const inputValue = e.target.value;
                                setPriceInputValue(inputValue);
                                
                                // Allow empty input for editing
                                if (inputValue === '') {
                                  setCourseData(prev => ({
                                    ...prev,
                                    course_price: 0
                                  }));
                                  return;
                                }
                                
                                const value = parseFloat(inputValue);
                                if (!isNaN(value) && value >= 0) {
                                  setCourseData(prev => ({
                                    ...prev,
                                    course_price: Math.round(value * 100) // Convert to cents
                                  }));
                                }
                              }}
                              className="h-11 text-base font-medium border-2 rounded-2xl transition-all duration-300 focus:scale-[1.02] focus:shadow-lg bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 focus:border-primary focus:ring-4 focus:ring-primary/10 placeholder:text-gray-400 dark:placeholder:text-gray-500 pl-8"
                            />
                          </div>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            Enter the price in USD (e.g., 9.99 for $9.99)
                          </p>
                          {validationErrors.course_price && (
                            <p className="text-sm text-red-500">{validationErrors.course_price}</p>
                          )}
                        </div>
                      )}
                      
                      {/* Payment Info Display */}
                      {courseData.payment_type === 'paid' && courseData.course_price && courseData.course_price > 0 && (
                        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                          <div className="flex items-center space-x-2">
                            <CreditCard className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                            <span className="text-sm font-medium text-blue-800 dark:text-blue-200">
                              This course will be sold for ${(courseData.course_price / 100).toFixed(2)} USD
                            </span>
                          </div>
                          <p className="text-xs text-blue-600 dark:text-blue-300 mt-1">
                            Students will need to purchase this course to access the content.
                          </p>
                        </div>
                      )}
                    </div>
                  )}
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

              {/* AI Thumbnail Generator */}
              <Card className="border-2 border-dashed border-primary/20 bg-gradient-to-br from-primary/5 via-transparent to-primary/5 dark:from-primary/10 dark:via-transparent dark:to-primary/10">
                <CardHeader className="p-4 sm:p-5 md:p-6">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 bg-gradient-to-br from-primary/20 to-primary/30 rounded-xl sm:rounded-2xl flex items-center justify-center flex-shrink-0">
                      <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <CardTitle className="text-base sm:text-xl md:text-2xl font-bold bg-gradient-to-r from-primary via-primary/80 to-primary/60 bg-clip-text text-transparent">
                        AI Thumbnail Generator
                      </CardTitle>
                      <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 sm:mt-1">
                        Let AI create a professional thumbnail based on your course content
                      </p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-4 sm:p-6 md:p-8">
                  <AIThumbnailGenerator
                    courseId={courseData.id || ''}
                    courseTitle={courseData.title}
                    courseDescription={courseData.description}
                    currentThumbnail={courseData.image}
                    courseStatus={courseData.status}
                    onThumbnailGenerated={(imageUrl) => {
                      setCourseData(prev => ({ ...prev, image: imageUrl }));
                      toast.success('AI thumbnail applied to your course!');
                    }}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="curriculum" className="space-y-2 sm:space-y-3 md:space-y-8">
              {/* Course Curriculum Card */}
              <Card className="overflow-hidden border-0 shadow-xl bg-gradient-to-br from-card to-card/50 dark:bg-card">
                <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 border-b border-primary/10 p-2 sm:p-2.5 lg:pb-6 gap-2 sm:gap-3">
                  <div className="flex items-center gap-2 sm:gap-2 min-w-0 flex-1">
                    <div className="w-8 h-8 sm:w-9 sm:h-9 md:w-12 md:h-12 bg-gradient-to-br from-primary/10 to-primary/20 rounded-xl sm:rounded-2xl flex items-center justify-center flex-shrink-0">
                      <BookOpen className="w-4 h-4 sm:w-4 sm:h-4 md:w-6 md:h-6 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <CardTitle className="text-lg sm:text-xl md:text-2xl font-bold bg-gradient-to-r from-gray-900 via-gray-800 to-gray-700 dark:from-white dark:via-gray-100 dark:to-gray-200 bg-clip-text text-transparent">
                        Course Curriculum
                      </CardTitle>
                      <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 sm:mt-1">
                        Structure your course with sections and lessons
                      </p>
                    </div>
                  </div>
                  <Button 
                    onClick={addSection}
                    className="h-9 sm:h-10 md:h-12 px-4 sm:px-6 md:px-8 rounded-xl sm:rounded-2xl bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5 text-xs sm:text-sm w-full sm:w-auto"
                  >
                    <Plus className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                    Add Section
                  </Button>
                </CardHeader>
                <CardContent className="p-1.5 sm:p-2 md:p-3 lg:p-8 space-y-3 sm:space-y-4">
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
                              <CardHeader className="flex flex-col sm:flex-row items-start justify-between p-2 sm:p-2 md:p-6 gap-2 sm:gap-3 bg-gradient-to-r from-card/50 to-card/30 dark:bg-card/50 border-b border-gray-200/50 dark:border-gray-700/30">
                                <div className="flex items-start gap-2 sm:gap-2 flex-1 w-full">
                                  <div {...dragHandleProps} className="cursor-move pt-2 sm:pt-2 opacity-60 hover:opacity-100 transition-opacity hover:scale-110 flex-shrink-0">
                                    <GripVertical className="text-primary w-4 h-4 sm:w-4 sm:h-4 md:w-6 md:h-6" />
                                  </div>
                                  <div className="flex-1 space-y-1.5 sm:space-y-2 min-w-0">
                                    <Input
                                      value={section.title}
                                      onChange={(e) => {
                                        const newSections = [...courseData.sections];
                                        newSections[sectionIndex].title = e.target.value;
                                        setCourseData(prev => ({ ...prev, sections: newSections }));
                                      }}
                                      className="font-semibold text-base sm:text-lg md:text-xl border-0 bg-transparent px-0 focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-muted-foreground/60 text-gray-900 dark:text-white"
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
                                      className="text-xs sm:text-sm resize-none border-0 bg-white/50 dark:bg-gray-800/50 rounded-lg sm:rounded-xl px-3 sm:px-4 py-2 sm:py-3 focus-visible:ring-2 focus-visible:ring-primary/20 text-gray-700 dark:text-gray-300"
                                    />
                                  </div>
                                </div>
                                <div className="flex items-center gap-2 sm:gap-2 w-full sm:w-auto">
                                  <Button 
                                    onClick={() => addLesson(section.id)} 
                                    variant="outline"
                                    className="h-8 sm:h-9 md:h-10 px-3 sm:px-3 md:px-6 rounded-lg sm:rounded-xl bg-white/80 dark:bg-gray-800/80 border-primary/20 text-primary hover:bg-primary hover:text-white transition-all duration-300 text-xs sm:text-sm flex-1 sm:flex-initial"
                                  >
                                    <Plus className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-1.5" />
                                    Add Lesson
                                  </Button>
                                  {courseData.sections.length > 1 && (
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => removeSection(section.id)}
                                      className="h-8 w-8 sm:h-9 sm:w-9 md:h-10 md:w-10 rounded-lg sm:rounded-xl hover:bg-red-100 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400 transition-all duration-300 flex-shrink-0"
                                    >
                                      <X className="w-4 h-4 sm:w-5 sm:h-5" />
                                    </Button>
                                  )}
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    onClick={() => toggleSectionCollapse(section.id)}
                                    className="h-8 w-8 sm:h-9 sm:w-9 md:h-10 md:w-10 rounded-lg sm:rounded-xl hover:bg-primary/10 hover:text-primary transition-all duration-300 flex-shrink-0"
                                  >
                                    {section.isCollapsed ? <ChevronDown className="w-4 h-4 sm:w-5 sm:h-5" /> : <ChevronUp className="w-4 h-4 sm:w-5 sm:h-5" />}
                                  </Button>
                                </div>
                              </CardHeader>
                              {!section.isCollapsed && (
                                <CardContent className="space-y-2 px-2 sm:px-2 md:px-6 pb-2 sm:pb-4">
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
                                              canReorderContent={canReorderContent}
                                              currentUserRole={currentUserRole}
                                              courseStatus={courseData.status}
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
                            canReorderContent={true}
                            currentUserRole={currentUserRole}
                            courseStatus={courseData.status}
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
              {/* Classes Management Card */}
              <Card className="overflow-hidden border-0 shadow-xl bg-gradient-to-br from-card to-card/50 dark:bg-card">
                <CardHeader className="bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 border-b border-primary/10 pb-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-purple-100 to-purple-200 dark:from-purple-900/20 dark:to-purple-800/20 rounded-xl flex items-center justify-center">
                        <BookOpen className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                      </div>
                      <div>
                        <CardTitle className="text-xl font-bold bg-gradient-to-r from-gray-900 via-gray-800 to-gray-700 dark:from-white dark:via-gray-100 dark:to-gray-200 bg-clip-text text-transparent">
                          Manage Classes
                        </CardTitle>
                        <p className="text-sm text-muted-foreground mt-1">
                          Organize students into classes with specific schedules and teachers
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 border-purple-200 dark:border-purple-700">
                        {enrolledClasses.length} Classes
                      </Badge>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setIsClassCreateDialogOpen(true)}
                        className="h-8 px-3 text-xs bg-purple-50 hover:bg-purple-100 dark:bg-purple-900/20 dark:hover:bg-purple-900/30 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-700 rounded-lg"
                      >
                        <Plus className="w-3 h-3 mr-1" />
                        Add Class
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-6 space-y-4">

                  {/* Select Classes for Course Enrollment */}
                  <div className="space-y-3">
                    <label className="block text-sm font-semibold text-gray-900 dark:text-white">
                      Select Classes for Course Enrollment
                    </label>
                    <div className="relative">
                      <div className={courseData.school_ids.length === 0 ? "opacity-50 pointer-events-none" : ""}>
                        <MultiSelect
                          options={filteredClasses.map(cls => ({
                            value: cls.id,
                            label: cls.name,
                            subLabel: `${cls.school} • Grade ${cls.grade} • ${cls.code} • ${cls.teachers.length} Teachers • ${cls.students.length} Students`,
                            imageUrl: undefined
                          }))}
                          onValueChange={handleClassSelection}
                          value={selectedClasses}
                          placeholder={courseData.school_ids.length > 0 ? "Search and select classes to enroll for this course..." : "Select schools first to see available classes"}
                          className="min-h-[44px] border-2 border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all duration-300"
                        />
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {courseData.school_ids.length > 0 
                        ? "Choose which classes will have access to this course. Students and teachers from selected classes will be automatically enrolled."
                        : "Please select schools first to see available classes for enrollment."
                      }
                    </p>
                  </div>

                  {/* Classes List */}
                  {classesLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
                      <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">Loading classes...</span>
                    </div>
                  ) : enrolledClasses.length > 0 || selectedClasses.length > 0 ? (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
                          Enrolled Classes
                        </h4>
                      </div>
                      
                      {/* Classes Grid */}
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {enrolledClasses.map(classItem => (
                          <div key={classItem.id} className="group p-4 bg-gradient-to-r from-purple-50/50 to-purple-100/50 dark:from-purple-900/10 dark:to-purple-800/10 rounded-xl border border-purple-200/50 dark:border-purple-700/30 hover:border-purple-300 dark:hover:border-purple-600 transition-all duration-300 hover:scale-[1.02]">
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex-1 min-w-0">
                                <h5 className="font-semibold text-gray-900 dark:text-white text-sm truncate mb-1">
                                  {classItem.name}
                                </h5>
                                <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2 mb-2">
                                  {classItem.description}
                                </p>
                                <div className="flex items-center gap-2 mb-2">
                                  {getGradeBadge(classItem.grade)}
                                  <Badge variant="outline" className="text-xs">
                                    {classItem.code}
                                  </Badge>
                                  <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                                    {classItem.school}
                                  </Badge>
                                </div>
                              </div>
                              <div className="flex items-center gap-1 ml-2">
                                <Badge 
                                  variant={classItem.status === 'active' ? 'default' : 'secondary'}
                                  className={`text-xs ${
                                    classItem.status === 'active' 
                                      ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' 
                                      : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
                                  }`}
                                >
                                  {classItem.status}
                                </Badge>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => {
                                    const newSelectedClasses = selectedClasses.filter(id => id !== classItem.id);
                                    handleClassSelection(newSelectedClasses);
                                  }}
                                  className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-all duration-300 hover:bg-red-100 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400 rounded-lg"
                                  title="Remove from enrolled classes"
                                >
                                  <X className="w-3 h-3" />
                                </Button>
                              </div>
                            </div>
                            
                            {/* Class Stats */}
                            <div className="flex items-center justify-between text-xs">
                              <div className="flex items-center gap-4">
                                <span className="text-gray-600 dark:text-gray-400">
                                  {classItem.teachers.length} Teachers
                                </span>
                                <span className="text-gray-600 dark:text-gray-400">
                                  {classItem.students.length} Students
                                </span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => openClassViewDialog(classItem)}
                                  className="h-6 px-2 text-xs text-purple-600 dark:text-purple-400 hover:bg-purple-100 dark:hover:bg-purple-900/20 rounded-lg"
                                >
                                  <Eye className="w-3 h-3 mr-1" />
                                  View
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => openClassEditDialog(classItem)}
                                  className="h-6 px-2 text-xs text-purple-600 dark:text-purple-400 hover:bg-purple-100 dark:hover:bg-purple-900/20 rounded-lg"
                                >
                                  <Edit className="w-3 h-3 mr-1" />
                                  Edit
                                </Button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                      
                      {/* Show missing classes if any */}
                      {selectedClasses.length > enrolledClasses.length && (
                        <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg">
                          <div className="flex items-center gap-2 text-yellow-800 dark:text-yellow-200">
                            <AlertTriangle className="w-4 h-4" />
                            <span className="text-sm font-medium">Some enrolled classes could not be loaded</span>
                          </div>
                          <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-1">
                            Class IDs: {selectedClasses.filter(id => !enrolledClasses.some(cls => cls.id === id)).join(', ')}
                          </p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                      <div className="w-16 h-16 mx-auto mb-3 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
                        <BookOpen className="w-8 h-8" />
                      </div>
                      <p className="text-sm font-medium mb-1">No classes enrolled yet</p>
                      <p className="text-xs text-gray-400 dark:text-gray-500">
                        {dbClasses.length > 0 
                          ? "Select classes from the dropdown above to enroll them for this course"
                          : "Create your first class to organize students"
                        }
                      </p>
                    </div>
                  )}

                  {/* Class Management Info */}
                  <div className="mt-6 p-4 bg-gradient-to-r from-purple-50/50 to-indigo-50/50 dark:from-purple-900/10 dark:to-indigo-900/10 rounded-xl border border-purple-200/50 dark:border-purple-700/30">
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Info className="w-3 h-3 text-purple-600 dark:text-purple-400" />
                      </div>
                      <div className="space-y-2">
                        <h4 className="font-semibold text-purple-900 dark:text-purple-100 text-sm">
                          Class Management Benefits
                        </h4>
                        <ul className="text-xs text-purple-800 dark:text-purple-200 space-y-1">
                          <li>• Organize students into manageable groups with specific schedules</li>
                          <li>• Assign dedicated teachers to each class for better instruction</li>
                          <li>• Track enrollment capacity and manage class sizes</li>
                          <li>• Monitor class-specific progress and engagement</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

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
                            <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden">
                              {user.avatar_url ? (
                                <img 
                                  src={user.avatar_url} 
                                  alt={user.name}
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    // Fallback to initials if image fails to load
                                    const target = e.target as HTMLImageElement;
                                    target.style.display = 'none';
                                    target.nextElementSibling?.classList.remove('hidden');
                                  }}
                                />
                              ) : null}
                              <div className={`w-full h-full bg-gradient-to-br from-primary/100 to-primary-200 dark:from-primary-900/30 dark:to-primary-800/30 rounded-full flex items-center justify-center ${user.avatar_url ? 'hidden' : ''}`}>
                                <span className="text-xs font-semibold text-primary-700 dark:text-primary-300">
                                  {user.name.split(' ').map(n => n[0]).join('')}
                                </span>
                              </div>
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
                            <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden">
                              {user.avatar_url ? (
                                <img 
                                  src={user.avatar_url} 
                                  alt={user.name}
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    // Fallback to initials if image fails to load
                                    const target = e.target as HTMLImageElement;
                                    target.style.display = 'none';
                                    target.nextElementSibling?.classList.remove('hidden');
                                  }}
                                />
                              ) : null}
                              <div className={`w-full h-full bg-gradient-to-br from-green-100 to-green-200 dark:from-green-900/30 dark:to-green-800/30 rounded-full flex items-center justify-center ${user.avatar_url ? 'hidden' : ''}`}>
                                <span className="text-xs font-semibold text-green-700 dark:text-green-300">
                                  {user.name.split(' ').map(n => n[0]).join('')}
                                </span>
                              </div>
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
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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

                        <div className="space-y-3">
                          <h4 className="font-semibold text-blue-900 dark:text-blue-100 flex items-center gap-2 text-sm">
                            <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                            Classes ({enrolledClasses.length})
                          </h4>
                          <ul className="text-xs text-blue-800 dark:text-blue-200 space-y-1">
                            <li>• Organize students into groups</li>
                            <li>• Set specific schedules and capacity</li>
                            <li>• Assign dedicated teachers</li>
                            <li>• Track class-specific progress</li>
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

      {/* Create Class Dialog */}
      <Dialog open={isClassCreateDialogOpen} onOpenChange={setIsClassCreateDialogOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh] flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle>Create New Class</DialogTitle>
            <DialogDescription>
              Add a new class or academic section to the system. Fill in the required information below.
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto pr-6 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 dark:scrollbar-thumb-gray-600 dark:scrollbar-track-gray-800">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4 px-2">
              <div className="space-y-2">
                <Label htmlFor="class-name">Class Name *</Label>
                <Input
                  id="class-name"
                  value={classFormData.name}
                  onChange={(e) => setClassFormData({ ...classFormData, name: e.target.value })}
                  placeholder="e.g., Class 10A"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="class-code">Class Code *</Label>
                <Input
                  id="class-code"
                  value={classFormData.code}
                  onChange={(e) => setClassFormData({ ...classFormData, code: e.target.value })}
                  placeholder="e.g., C10A-001"
                  maxLength={10}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="class-grade">Grade *</Label>
                <Select
                  value={classFormData.grade}
                  onValueChange={(value) => setClassFormData({ ...classFormData, grade: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select grade" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Grade 1</SelectItem>
                    <SelectItem value="2">Grade 2</SelectItem>
                    <SelectItem value="3">Grade 3</SelectItem>
                    <SelectItem value="4">Grade 4</SelectItem>
                    <SelectItem value="5">Grade 5</SelectItem>
                    <SelectItem value="6">Grade 6</SelectItem>
                    <SelectItem value="7">Grade 7</SelectItem>
                    <SelectItem value="8">Grade 8</SelectItem>
                    <SelectItem value="9">Grade 9</SelectItem>
                    <SelectItem value="10">Grade 10</SelectItem>
                    <SelectItem value="11">Grade 11</SelectItem>
                    <SelectItem value="12">Grade 12</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="class-board">Board *</Label>
                <Select
                  value={classFormData.board_id}
                  onValueChange={handleClassBoardChange}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select board" />
                  </SelectTrigger>
                  <SelectContent>
                    {classBoards.map((board) => (
                      <SelectItem key={board.id} value={board.id}>
                        {board.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="class-school">School *</Label>
                <Select
                  value={classFormData.school_id}
                  onValueChange={(value) => setClassFormData({ ...classFormData, school_id: value })}
                  disabled={!classFormData.board_id}
                >
                  <SelectTrigger className={!classFormData.board_id ? "opacity-50 cursor-not-allowed" : ""}>
                    <SelectValue placeholder={!classFormData.board_id ? "Select a board first" : "Select school"} />
                  </SelectTrigger>
                  <SelectContent>
                    {classSchools.length > 0 ? (
                      classSchools.map((school) => (
                        <SelectItem key={school.id} value={school.id}>
                          {school.name}
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="" disabled>
                        {classFormData.board_id ? "No schools found for this board" : "Select a board first"}
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="class-max-students">Max Students *</Label>
                <Input
                  id="class-max-students"
                  type="text"
                  value={classFormData.max_students}
                  onChange={(e) => setClassFormData({ ...classFormData, max_students: e.target.value })}
                  placeholder="e.g., 30"
                />
                <p className="text-xs text-muted-foreground">Maximum number of students allowed in this class</p>
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="class-description">Description</Label>
                <Textarea
                  id="class-description"
                  value={classFormData.description}
                  onChange={(e) => setClassFormData({ ...classFormData, description: e.target.value })}
                  placeholder="Class description and focus areas..."
                  rows={3}
                />
              </div>

              {/* Access Management Section */}
              <div className="space-y-4 md:col-span-2">
                <div className="space-y-2">
                  <Label>Manage Teachers</Label>
                  <div className="space-y-2">
                    <MultiSelect
                      options={classTeachers.map(teacher => ({
                        value: teacher.id,
                        label: teacher.name,
                        subLabel: teacher.email,
                        imageUrl: teacher.avatar_url
                      }))}
                      onValueChange={(selectedIds) => handleClassMembersChange('teachers', selectedIds)}
                      value={classFormData.teachers}
                      placeholder="Search and select teachers..."
                      className="min-h-[44px] border-2 border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all duration-300"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">Teachers can edit course content, manage students, and view analytics</p>
                </div>

                <div className="space-y-2">
                  <Label>Manage Students</Label>
                  <div className="space-y-2">
                    <MultiSelect
                      options={classStudents.map(student => ({
                        value: student.id,
                        label: student.name,
                        subLabel: student.email,
                        imageUrl: student.avatar_url
                      }))}
                      onValueChange={(selectedIds) => handleClassMembersChange('students', selectedIds)}
                      value={classFormData.students}
                      placeholder="Search and select students..."
                      className={`min-h-[44px] border-2 rounded-xl bg-white dark:bg-gray-800 focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all duration-300 ${
                        isStudentLimitExceeded() 
                          ? 'border-red-300 dark:border-red-600' 
                          : 'border-gray-200 dark:border-gray-700'
                      }`}
                    />
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Students can access course content, submit assignments, and track progress</p>
                    {getStudentLimitStatus() && (
                      <p className={`text-xs ${getStudentLimitStatus()?.className}`}>
                        {getStudentLimitStatus()?.message}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter className="flex-shrink-0">
            <Button variant="outline" onClick={() => setIsClassCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleClassCreate} className="bg-green-600 hover:bg-green-700">
              Create Class
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Class Dialog */}
      <Dialog open={isClassEditDialogOpen} onOpenChange={setIsClassEditDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle>Edit Class</DialogTitle>
            <DialogDescription>
              Update the information for {editingClass?.name}.
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 dark:scrollbar-thumb-gray-600 dark:scrollbar-track-gray-800">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-class-name">Class Name *</Label>
                <Input
                  id="edit-class-name"
                  value={classFormData.name}
                  onChange={(e) => setClassFormData({ ...classFormData, name: e.target.value })}
                  placeholder="e.g., Class 10A"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-class-code">Class Code *</Label>
                <Input
                  id="edit-class-code"
                  value={classFormData.code}
                  onChange={(e) => setClassFormData({ ...classFormData, code: e.target.value })}
                  placeholder="e.g., C10A-001"
                  maxLength={10}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-class-grade">Grade *</Label>
                <Select
                  value={classFormData.grade}
                  onValueChange={(value) => setClassFormData({ ...classFormData, grade: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select grade" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Grade 1</SelectItem>
                    <SelectItem value="2">Grade 2</SelectItem>
                    <SelectItem value="3">Grade 3</SelectItem>
                    <SelectItem value="4">Grade 4</SelectItem>
                    <SelectItem value="5">Grade 5</SelectItem>
                    <SelectItem value="6">Grade 6</SelectItem>
                    <SelectItem value="7">Grade 7</SelectItem>
                    <SelectItem value="8">Grade 8</SelectItem>
                    <SelectItem value="9">Grade 9</SelectItem>
                    <SelectItem value="10">Grade 10</SelectItem>
                    <SelectItem value="11">Grade 11</SelectItem>
                    <SelectItem value="12">Grade 12</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-class-board">Board *</Label>
                <Select
                  value={classFormData.board_id}
                  onValueChange={handleClassBoardChange}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select board" />
                  </SelectTrigger>
                  <SelectContent>
                    {classBoards.map((board) => (
                      <SelectItem key={board.id} value={board.id}>
                        {board.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-class-school">School *</Label>
                <Select
                  value={classFormData.school_id}
                  onValueChange={(value) => setClassFormData({ ...classFormData, school_id: value })}
                  disabled={!classFormData.board_id}
                >
                  <SelectTrigger className={!classFormData.board_id ? "opacity-50 cursor-not-allowed" : ""}>
                    <SelectValue placeholder={!classFormData.board_id ? "Select a board first" : "Select school"} />
                  </SelectTrigger>
                  <SelectContent>
                    {classSchools.length > 0 ? (
                      classSchools.map((school) => (
                        <SelectItem key={school.id} value={school.id}>
                          {school.name}
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="" disabled>
                        {classFormData.board_id ? "No schools found for this board" : "Select a board first"}
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-class-max-students">Max Students *</Label>
                <Input
                  id="edit-class-max-students"
                  type="text"
                  value={classFormData.max_students}
                  onChange={(e) => setClassFormData({ ...classFormData, max_students: e.target.value })}
                  placeholder="e.g., 30"
                />
                <p className="text-xs text-muted-foreground">Maximum number of students allowed in this class</p>
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="edit-class-description">Description</Label>
                <Textarea
                  id="edit-class-description"
                  value={classFormData.description}
                  onChange={(e) => setClassFormData({ ...classFormData, description: e.target.value })}
                  placeholder="Class description and focus areas..."
                  rows={3}
                />
              </div>

              {/* Access Management Section */}
              <div className="space-y-4 md:col-span-2">
                <div className="space-y-2">
                  <Label>Manage Teachers</Label>
                  <div className="space-y-2">
                    <MultiSelect
                      options={classTeachers.map(teacher => ({
                        value: teacher.id,
                        label: teacher.name,
                        subLabel: teacher.email,
                        imageUrl: teacher.avatar_url
                      }))}
                      onValueChange={(selectedIds) => handleClassMembersChange('teachers', selectedIds)}
                      value={classFormData.teachers}
                      placeholder="Search and select teachers..."
                      className="min-h-[44px] border-2 border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all duration-300"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">Teachers can edit course content, manage students, and view analytics</p>
                </div>

                <div className="space-y-2">
                  <Label>Manage Students</Label>
                  <div className="space-y-2">
                    <MultiSelect
                      options={classStudents.map(student => ({
                        value: student.id,
                        label: student.name,
                        subLabel: student.email,
                        imageUrl: student.avatar_url
                      }))}
                      onValueChange={(selectedIds) => handleClassMembersChange('students', selectedIds)}
                      value={classFormData.students}
                      placeholder="Search and select students..."
                      className={`min-h-[44px] border-2 rounded-xl bg-white dark:bg-gray-800 focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all duration-300 ${
                        isStudentLimitExceeded() 
                          ? 'border-red-300 dark:border-red-600' 
                          : 'border-gray-200 dark:border-gray-700'
                      }`}
                    />
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Students can access course content, submit assignments, and track progress</p>
                    {getStudentLimitStatus() && (
                      <p className={`text-xs ${getStudentLimitStatus()?.className}`}>
                        {getStudentLimitStatus()?.message}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter className="flex-shrink-0">
            <Button variant="outline" onClick={() => setIsClassEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleClassEdit} className="bg-blue-600 hover:bg-blue-700 text-white">
              Update Class
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Class Dialog */}
      <Dialog open={isClassViewDialogOpen} onOpenChange={setIsClassViewDialogOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Class Details</DialogTitle>
            <DialogDescription>
              View detailed information about {viewingClass?.name}.
            </DialogDescription>
          </DialogHeader>
          {viewingClass && (
            <div className="space-y-6 py-4">
              {/* Basic Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Class Name</Label>
                    <p className="text-lg font-semibold">{viewingClass.name}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Class Code</Label>
                    <div className="mt-1">
                      <Badge variant="outline" className="text-sm">{viewingClass.code}</Badge>
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Grade</Label>
                    <div className="mt-1">{getGradeBadge(viewingClass.grade)}</div>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">School</Label>
                    <p className="text-lg">{viewingClass.school}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Max Students</Label>
                    <p className="text-lg font-semibold text-blue-600">{viewingClass.max_students || 30}</p>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Board</Label>
                    <div className="mt-1">
                      <Badge variant="outline" className="text-sm">{viewingClass.board}</Badge>
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Created</Label>
                    <p className="text-sm text-muted-foreground">{new Date(viewingClass.created_at).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Last Updated</Label>
                    <p className="text-sm text-muted-foreground">{new Date(viewingClass.updated_at).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}</p>
                  </div>
                </div>
              </div>

              {/* Description */}
              {viewingClass.description && (
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Description</Label>
                  <p className="text-sm mt-1 p-3 bg-gray-50 dark:bg-gray-800 rounded-md">{viewingClass.description}</p>
                </div>
              )}

              {/* Members Section */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Teachers ({viewingClass.teachers.length})</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {viewingClass.teachers.length > 0 ? (
                      viewingClass.teachers.map((teacher, index) => (
                        <Badge key={index} variant="default" className="bg-green-600 text-white">
                          {teacher.name}
                        </Badge>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground italic">No teachers assigned</p>
                    )}
                  </div>
                </div>
                
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Students ({viewingClass.students.length})</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {viewingClass.students.length > 0 ? (
                      viewingClass.students.map((student, index) => (
                        <Badge key={index} variant="outline" className="border-blue-300 text-blue-700">
                          {student.name}
                        </Badge>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground italic">No students enrolled</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsClassViewDialogOpen(false)}>
              Close
            </Button>
            {viewingClass && (
              <Button onClick={() => {
                setIsClassViewDialogOpen(false);
                openClassEditDialog(viewingClass);
              }} className="bg-blue-600 hover:bg-blue-700 text-white">
                Edit Class
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* School Removal Confirmation Dialog */}
      <AlertDialog open={isSchoolRemovalDialogOpen} onOpenChange={setIsSchoolRemovalDialogOpen}>
        <AlertDialogContent className="max-w-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-blue-600">
              <AlertTriangle className="h-5 w-5" />
              Confirm School Removal
            </AlertDialogTitle>
            <AlertDialogDescription className="text-gray-600 dark:text-gray-300">
              {affectedClasses.length === 0 && affectedTeachers.length === 0 && affectedStudents.length === 0 
                ? "Removing these schools will not affect any classes, teachers, or students in the course access tab."
                : "Removing these schools will also remove the associated classes, teachers, and students from the course access tab."
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <div className="max-h-[60vh] overflow-y-auto space-y-4 pr-2">
            {/* Schools to be removed */}
            <div>
              <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                Schools to be removed ({schoolsToRemove.length}):
              </h4>
              <div className="flex flex-wrap gap-2">
                {schoolsToRemove.map(schoolId => {
                  const school = schools.find(s => s.id === schoolId);
                  return school ? (
                    <Badge key={schoolId} variant="destructive" className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                      {school.name}
                    </Badge>
                  ) : null;
                })}
              </div>
            </div>

            {/* Affected classes */}
            {affectedClasses.length > 0 && (
              <div>
                <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                  Classes that will be removed ({affectedClasses.length}):
                </h4>
                <div className="max-h-32 overflow-y-auto space-y-1">
                  {affectedClasses.map(cls => (
                    <div key={cls.id} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded-md">
                      <span className="text-sm font-medium text-gray-900 dark:text-white">{cls.name}</span>
                      <Badge variant="outline" className="text-xs">
                        {cls.teachers.length} teachers, {cls.students.length} students
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Affected teachers */}
            {affectedTeachers.length > 0 && (
              <div>
                <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                  Teachers that will be removed ({affectedTeachers.length}):
                </h4>
                <div className="max-h-32 overflow-y-auto flex flex-wrap gap-2">
                  {affectedTeachers.map(teacher => (
                    <Badge key={teacher.id} variant="outline" className="bg-orange-50 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400 border-orange-200 dark:border-orange-700">
                      {teacher.name}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Affected students */}
            {affectedStudents.length > 0 && (
              <div>
                <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                  Students that will be removed ({affectedStudents.length}):
                </h4>
                <div className="max-h-32 overflow-y-auto flex flex-wrap gap-2">
                  {affectedStudents.map(student => (
                    <Badge key={student.id} variant="outline" className="bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400 border-blue-200 dark:border-blue-700">
                      {student.name}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Safe removal message (only shown when no data is affected) */}
            {affectedClasses.length === 0 && affectedTeachers.length === 0 && affectedStudents.length === 0 && (
              <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-md">
                <p className="text-sm text-green-800 dark:text-green-200">
                  <strong>Safe to remove:</strong> No classes, teachers, or students will be affected by removing these schools.
                </p>
              </div>
            )}
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelSchoolRemoval}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmSchoolRemoval}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {affectedClasses.length === 0 && affectedTeachers.length === 0 && affectedStudents.length === 0 
                ? "Remove Schools" 
                : "Remove Schools & Associated Data"
              }
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Country Removal Confirmation Dialog */}
      <AlertDialog open={isCountryRemovalDialogOpen} onOpenChange={setIsCountryRemovalDialogOpen}>
        <AlertDialogContent className="max-w-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-blue-600">
              <AlertTriangle className="h-5 w-5" />
              Confirm Country Removal
            </AlertDialogTitle>
            <AlertDialogDescription className="text-gray-600 dark:text-gray-300">
              {affectedRegions.length === 0 && affectedCities.length === 0 && affectedProjects.length === 0 && affectedBoards.length === 0 && affectedSchools.length === 0 && affectedClassesFromHierarchy.length === 0
                ? "Removing these countries will not affect any regions, cities, projects, boards, schools, classes, teachers, or students in the course access tab."
                : "Removing these countries will also remove the associated regions, cities, projects, boards, schools, classes, teachers, and students from the course access tab."
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <div className="max-h-[60vh] overflow-y-auto space-y-4 pr-2">
            {/* Countries to be removed */}
            <div>
              <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                Countries to be removed ({countriesToRemove.length}):
              </h4>
              <div className="flex flex-wrap gap-2">
                {countriesToRemove.map(countryId => {
                  const country = countries.find(c => c.id === countryId);
                  return country ? (
                    <Badge key={countryId} variant="destructive" className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                      {country.name}
                    </Badge>
                  ) : null;
                })}
              </div>
            </div>

            {/* Affected regions */}
            {affectedRegions.length > 0 && (
              <div>
                <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                  Regions that will be removed ({affectedRegions.length}):
                </h4>
                <div className="max-h-32 overflow-y-auto flex flex-wrap gap-2">
                  {affectedRegions.map(region => (
                    <Badge key={region.id} variant="outline" className="bg-purple-50 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400 border-purple-200 dark:border-purple-700">
                      {region.name}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Affected cities */}
            {affectedCities.length > 0 && (
              <div>
                <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                  Cities that will be removed ({affectedCities.length}):
                </h4>
                <div className="max-h-32 overflow-y-auto flex flex-wrap gap-2">
                  {affectedCities.map(city => (
                    <Badge key={city.id} variant="outline" className="bg-indigo-50 text-indigo-700 dark:bg-indigo-900/20 dark:text-indigo-400 border-indigo-200 dark:border-indigo-700">
                      {city.name}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Affected projects */}
            {affectedProjects.length > 0 && (
              <div>
                <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                  Projects that will be removed ({affectedProjects.length}):
                </h4>
                <div className="max-h-32 overflow-y-auto flex flex-wrap gap-2">
                  {affectedProjects.map(project => (
                    <Badge key={project.id} variant="outline" className="bg-teal-50 text-teal-700 dark:bg-teal-900/20 dark:text-teal-400 border-teal-200 dark:border-teal-700">
                      {project.name}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Affected boards */}
            {affectedBoards.length > 0 && (
              <div>
                <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                  Boards that will be removed ({affectedBoards.length}):
                </h4>
                <div className="max-h-32 overflow-y-auto flex flex-wrap gap-2">
                  {affectedBoards.map(board => (
                    <Badge key={board.id} variant="outline" className="bg-cyan-50 text-cyan-700 dark:bg-cyan-900/20 dark:text-cyan-400 border-cyan-200 dark:border-cyan-700">
                      {board.name}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Affected schools */}
            {affectedSchools.length > 0 && (
              <div>
                <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                  Schools that will be removed ({affectedSchools.length}):
                </h4>
                <div className="max-h-32 overflow-y-auto flex flex-wrap gap-2">
                  {affectedSchools.map(school => (
                    <Badge key={school.id} variant="outline" className="bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400 border-emerald-200 dark:border-emerald-700">
                      {school.name}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Affected classes */}
            {affectedClassesFromHierarchy.length > 0 && (
              <div>
                <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                  Classes that will be removed ({affectedClassesFromHierarchy.length}):
                </h4>
                <div className="max-h-32 overflow-y-auto space-y-1">
                  {affectedClassesFromHierarchy.map(cls => (
                    <div key={cls.id} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded-md">
                      <span className="text-sm font-medium text-gray-900 dark:text-white">{cls.name}</span>
                      <Badge variant="outline" className="text-xs">
                        {cls.teachers.length} teachers, {cls.students.length} students
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Affected teachers */}
            {affectedTeachersFromHierarchy.length > 0 && (
              <div>
                <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                  Teachers that will be removed ({affectedTeachersFromHierarchy.length}):
                </h4>
                <div className="max-h-32 overflow-y-auto flex flex-wrap gap-2">
                  {affectedTeachersFromHierarchy.map(teacher => (
                    <Badge key={teacher.id} variant="outline" className="bg-orange-50 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400 border-orange-200 dark:border-orange-700">
                      {teacher.name}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Affected students */}
            {affectedStudentsFromHierarchy.length > 0 && (
              <div>
                <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                  Students that will be removed ({affectedStudentsFromHierarchy.length}):
                </h4>
                <div className="max-h-32 overflow-y-auto flex flex-wrap gap-2">
                  {affectedStudentsFromHierarchy.map(student => (
                    <Badge key={student.id} variant="outline" className="bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400 border-blue-200 dark:border-blue-700">
                      {student.name}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Safe removal message (only shown when no data is affected) */}
            {affectedRegions.length === 0 && affectedCities.length === 0 && affectedProjects.length === 0 && affectedBoards.length === 0 && affectedSchools.length === 0 && affectedClassesFromHierarchy.length === 0 && affectedTeachersFromHierarchy.length === 0 && affectedStudentsFromHierarchy.length === 0 && (
              <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-md">
                <p className="text-sm text-green-800 dark:text-green-200">
                  <strong>Safe to remove:</strong> No regions, cities, projects, boards, schools, classes, teachers, or students will be affected by removing these countries.
                </p>
              </div>
            )}
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelCountryRemoval}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmCountryRemoval}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {affectedRegions.length === 0 && affectedCities.length === 0 && affectedProjects.length === 0 && affectedBoards.length === 0 && affectedSchools.length === 0 && affectedClassesFromHierarchy.length === 0
                ? "Remove Countries" 
                : "Remove Countries & Associated Data"
              }
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Region Removal Confirmation Dialog */}
      <AlertDialog open={isRegionRemovalDialogOpen} onOpenChange={setIsRegionRemovalDialogOpen}>
        <AlertDialogContent className="max-w-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-blue-600">
              <AlertTriangle className="h-5 w-5" />
              Confirm Region Removal
            </AlertDialogTitle>
            <AlertDialogDescription className="text-gray-600 dark:text-gray-300">
              {affectedCitiesFromRegion.length === 0 && affectedProjectsFromRegion.length === 0 && affectedBoardsFromRegion.length === 0 && affectedSchoolsFromRegion.length === 0 && affectedClassesFromRegion.length === 0
                ? "Removing these regions will not affect any cities, projects, boards, schools, classes, teachers, or students in the course access tab."
                : "Removing these regions will also remove the associated cities, projects, boards, schools, classes, teachers, and students from the course access tab."
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <div className="max-h-[60vh] overflow-y-auto space-y-4 pr-2">
            {/* Regions to be removed */}
            <div>
              <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                Regions to be removed ({regionsToRemove.length}):
              </h4>
              <div className="flex flex-wrap gap-2">
                {regionsToRemove.map(regionId => {
                  const region = regions.find(r => r.id === regionId);
                  return region ? (
                    <Badge key={regionId} variant="destructive" className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                      {region.name}
                    </Badge>
                  ) : null;
                })}
              </div>
            </div>

            {/* Affected cities */}
            {affectedCitiesFromRegion.length > 0 && (
              <div>
                <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                  Cities that will be removed ({affectedCitiesFromRegion.length}):
                </h4>
                <div className="max-h-32 overflow-y-auto flex flex-wrap gap-2">
                  {affectedCitiesFromRegion.map(city => (
                    <Badge key={city.id} variant="outline" className="bg-indigo-50 text-indigo-700 dark:bg-indigo-900/20 dark:text-indigo-400 border-indigo-200 dark:border-indigo-700">
                      {city.name}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Affected projects */}
            {affectedProjectsFromRegion.length > 0 && (
              <div>
                <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                  Projects that will be removed ({affectedProjectsFromRegion.length}):
                </h4>
                <div className="max-h-32 overflow-y-auto flex flex-wrap gap-2">
                  {affectedProjectsFromRegion.map(project => (
                    <Badge key={project.id} variant="outline" className="bg-teal-50 text-teal-700 dark:bg-teal-900/20 dark:text-teal-400 border-teal-200 dark:border-teal-700">
                      {project.name}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Affected boards */}
            {affectedBoardsFromRegion.length > 0 && (
              <div>
                <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                  Boards that will be removed ({affectedBoardsFromRegion.length}):
                </h4>
                <div className="max-h-32 overflow-y-auto flex flex-wrap gap-2">
                  {affectedBoardsFromRegion.map(board => (
                    <Badge key={board.id} variant="outline" className="bg-cyan-50 text-cyan-700 dark:bg-cyan-900/20 dark:text-cyan-400 border-cyan-200 dark:border-cyan-700">
                      {board.name}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Affected schools */}
            {affectedSchoolsFromRegion.length > 0 && (
              <div>
                <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                  Schools that will be removed ({affectedSchoolsFromRegion.length}):
                </h4>
                <div className="max-h-32 overflow-y-auto flex flex-wrap gap-2">
                  {affectedSchoolsFromRegion.map(school => (
                    <Badge key={school.id} variant="outline" className="bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400 border-emerald-200 dark:border-emerald-700">
                      {school.name}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Affected classes */}
            {affectedClassesFromRegion.length > 0 && (
              <div>
                <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                  Classes that will be removed ({affectedClassesFromRegion.length}):
                </h4>
                <div className="max-h-32 overflow-y-auto space-y-1">
                  {affectedClassesFromRegion.map(cls => (
                    <div key={cls.id} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded-md">
                      <span className="text-sm font-medium text-gray-900 dark:text-white">{cls.name}</span>
                      <Badge variant="outline" className="text-xs">
                        {cls.teachers.length} teachers, {cls.students.length} students
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Affected teachers */}
            {affectedTeachersFromRegion.length > 0 && (
              <div>
                <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                  Teachers that will be removed ({affectedTeachersFromRegion.length}):
                </h4>
                <div className="max-h-32 overflow-y-auto flex flex-wrap gap-2">
                  {affectedTeachersFromRegion.map(teacher => (
                    <Badge key={teacher.id} variant="outline" className="bg-orange-50 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400 border-orange-200 dark:border-orange-700">
                      {teacher.name}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Affected students */}
            {affectedStudentsFromRegion.length > 0 && (
              <div>
                <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                  Students that will be removed ({affectedStudentsFromRegion.length}):
                </h4>
                <div className="max-h-32 overflow-y-auto flex flex-wrap gap-2">
                  {affectedStudentsFromRegion.map(student => (
                    <Badge key={student.id} variant="outline" className="bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400 border-blue-200 dark:border-blue-700">
                      {student.name}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Safe removal message (only shown when no data is affected) */}
            {affectedCitiesFromRegion.length === 0 && affectedProjectsFromRegion.length === 0 && affectedBoardsFromRegion.length === 0 && affectedSchoolsFromRegion.length === 0 && affectedClassesFromRegion.length === 0 && affectedTeachersFromRegion.length === 0 && affectedStudentsFromRegion.length === 0 && (
              <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-md">
                <p className="text-sm text-green-800 dark:text-green-200">
                  <strong>Safe to remove:</strong> No cities, projects, boards, schools, classes, teachers, or students will be affected by removing these regions.
                </p>
              </div>
            )}
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelRegionRemoval}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmRegionRemoval}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {affectedCitiesFromRegion.length === 0 && affectedProjectsFromRegion.length === 0 && affectedBoardsFromRegion.length === 0 && affectedSchoolsFromRegion.length === 0 && affectedClassesFromRegion.length === 0
                ? "Remove Regions" 
                : "Remove Regions & Associated Data"
              }
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* City Removal Confirmation Dialog */}
      <AlertDialog open={isCityRemovalDialogOpen} onOpenChange={setIsCityRemovalDialogOpen}>
        <AlertDialogContent className="max-w-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-blue-600">
              <AlertTriangle className="h-5 w-5" />
              Confirm City Removal
            </AlertDialogTitle>
            <AlertDialogDescription className="text-gray-600 dark:text-gray-300">
              {affectedProjectsFromCity.length === 0 && affectedBoardsFromCity.length === 0 && affectedSchoolsFromCity.length === 0 && affectedClassesFromCity.length === 0
                ? "Removing these cities will not affect any projects, boards, schools, classes, teachers, or students in the course access tab."
                : "Removing these cities will also remove the associated projects, boards, schools, classes, teachers, and students from the course access tab."
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <div className="max-h-[60vh] overflow-y-auto space-y-4 pr-2">
            {/* Cities to be removed */}
            <div>
              <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                Cities to be removed ({citiesToRemove.length}):
              </h4>
              <div className="flex flex-wrap gap-2">
                {citiesToRemove.map(cityId => {
                  const city = cities.find(c => c.id === cityId);
                  return city ? (
                    <Badge key={cityId} variant="destructive" className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                      {city.name}
                    </Badge>
                  ) : null;
                })}
              </div>
            </div>

            {/* Affected projects */}
            {affectedProjectsFromCity.length > 0 && (
              <div>
                <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                  Projects that will be removed ({affectedProjectsFromCity.length}):
                </h4>
                <div className="max-h-32 overflow-y-auto flex flex-wrap gap-2">
                  {affectedProjectsFromCity.map(project => (
                    <Badge key={project.id} variant="outline" className="bg-teal-50 text-teal-700 dark:bg-teal-900/20 dark:text-teal-400 border-teal-200 dark:border-teal-700">
                      {project.name}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Affected boards */}
            {affectedBoardsFromCity.length > 0 && (
              <div>
                <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                  Boards that will be removed ({affectedBoardsFromCity.length}):
                </h4>
                <div className="max-h-32 overflow-y-auto flex flex-wrap gap-2">
                  {affectedBoardsFromCity.map(board => (
                    <Badge key={board.id} variant="outline" className="bg-cyan-50 text-cyan-700 dark:bg-cyan-900/20 dark:text-cyan-400 border-cyan-200 dark:border-cyan-700">
                      {board.name}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Affected schools */}
            {affectedSchoolsFromCity.length > 0 && (
              <div>
                <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                  Schools that will be removed ({affectedSchoolsFromCity.length}):
                </h4>
                <div className="max-h-32 overflow-y-auto flex flex-wrap gap-2">
                  {affectedSchoolsFromCity.map(school => (
                    <Badge key={school.id} variant="outline" className="bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400 border-emerald-200 dark:border-emerald-700">
                      {school.name}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Affected classes */}
            {affectedClassesFromCity.length > 0 && (
              <div>
                <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                  Classes that will be removed ({affectedClassesFromCity.length}):
                </h4>
                <div className="max-h-32 overflow-y-auto space-y-1">
                  {affectedClassesFromCity.map(cls => (
                    <div key={cls.id} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded-md">
                      <span className="text-sm font-medium text-gray-900 dark:text-white">{cls.name}</span>
                      <Badge variant="outline" className="text-xs">
                        {cls.teachers.length} teachers, {cls.students.length} students
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Affected teachers */}
            {affectedTeachersFromCity.length > 0 && (
              <div>
                <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                  Teachers that will be removed ({affectedTeachersFromCity.length}):
                </h4>
                <div className="max-h-32 overflow-y-auto flex flex-wrap gap-2">
                  {affectedTeachersFromCity.map(teacher => (
                    <Badge key={teacher.id} variant="outline" className="bg-orange-50 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400 border-orange-200 dark:border-orange-700">
                      {teacher.name}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Affected students */}
            {affectedStudentsFromCity.length > 0 && (
              <div>
                <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                  Students that will be removed ({affectedStudentsFromCity.length}):
                </h4>
                <div className="max-h-32 overflow-y-auto flex flex-wrap gap-2">
                  {affectedStudentsFromCity.map(student => (
                    <Badge key={student.id} variant="outline" className="bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400 border-blue-200 dark:border-blue-700">
                      {student.name}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Safe removal message (only shown when no data is affected) */}
            {affectedProjectsFromCity.length === 0 && affectedBoardsFromCity.length === 0 && affectedSchoolsFromCity.length === 0 && affectedClassesFromCity.length === 0 && affectedTeachersFromCity.length === 0 && affectedStudentsFromCity.length === 0 && (
              <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-md">
                <p className="text-sm text-green-800 dark:text-green-200">
                  <strong>Safe to remove:</strong> No projects, boards, schools, classes, teachers, or students will be affected by removing these cities.
                </p>
              </div>
            )}
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelCityRemoval}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmCityRemoval}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {affectedProjectsFromCity.length === 0 && affectedBoardsFromCity.length === 0 && affectedSchoolsFromCity.length === 0 && affectedClassesFromCity.length === 0
                ? "Remove Cities" 
                : "Remove Cities & Associated Data"
              }
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Project Removal Confirmation Dialog */}
      <AlertDialog open={isProjectRemovalDialogOpen} onOpenChange={setIsProjectRemovalDialogOpen}>
        <AlertDialogContent className="max-w-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-blue-600">
              <AlertTriangle className="h-5 w-5" />
              Confirm Project Removal
            </AlertDialogTitle>
            <AlertDialogDescription className="text-gray-600 dark:text-gray-300">
              {affectedBoardsFromProject.length === 0 && affectedSchoolsFromProject.length === 0 && affectedClassesFromProject.length === 0
                ? "Removing these projects will not affect any boards, schools, classes, teachers, or students in the course access tab."
                : "Removing these projects will also remove the associated boards, schools, classes, teachers, and students from the course access tab."
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <div className="max-h-[60vh] overflow-y-auto space-y-4 pr-2">
            {/* Projects to be removed */}
            <div>
              <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                Projects to be removed ({projectsToRemove.length}):
              </h4>
              <div className="flex flex-wrap gap-2">
                {projectsToRemove.map(projectId => {
                  const project = projects.find(p => p.id === projectId);
                  return project ? (
                    <Badge key={projectId} variant="destructive" className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                      {project.name}
                    </Badge>
                  ) : null;
                })}
              </div>
            </div>

            {/* Affected boards */}
            {affectedBoardsFromProject.length > 0 && (
              <div>
                <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                  Boards that will be removed ({affectedBoardsFromProject.length}):
                </h4>
                <div className="max-h-32 overflow-y-auto flex flex-wrap gap-2">
                  {affectedBoardsFromProject.map(board => (
                    <Badge key={board.id} variant="outline" className="bg-cyan-50 text-cyan-700 dark:bg-cyan-900/20 dark:text-cyan-400 border-cyan-200 dark:border-cyan-700">
                      {board.name}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Affected schools */}
            {affectedSchoolsFromProject.length > 0 && (
              <div>
                <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                  Schools that will be removed ({affectedSchoolsFromProject.length}):
                </h4>
                <div className="max-h-32 overflow-y-auto flex flex-wrap gap-2">
                  {affectedSchoolsFromProject.map(school => (
                    <Badge key={school.id} variant="outline" className="bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400 border-emerald-200 dark:border-emerald-700">
                      {school.name}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Affected classes */}
            {affectedClassesFromProject.length > 0 && (
              <div>
                <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                  Classes that will be removed ({affectedClassesFromProject.length}):
                </h4>
                <div className="max-h-32 overflow-y-auto space-y-1">
                  {affectedClassesFromProject.map(cls => (
                    <div key={cls.id} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded-md">
                      <span className="text-sm font-medium text-gray-900 dark:text-white">{cls.name}</span>
                      <Badge variant="outline" className="text-xs">
                        {cls.teachers.length} teachers, {cls.students.length} students
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Affected teachers */}
            {affectedTeachersFromProject.length > 0 && (
              <div>
                <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                  Teachers that will be removed ({affectedTeachersFromProject.length}):
                </h4>
                <div className="max-h-32 overflow-y-auto flex flex-wrap gap-2">
                  {affectedTeachersFromProject.map(teacher => (
                    <Badge key={teacher.id} variant="outline" className="bg-orange-50 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400 border-orange-200 dark:border-orange-700">
                      {teacher.name}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Affected students */}
            {affectedStudentsFromProject.length > 0 && (
              <div>
                <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                  Students that will be removed ({affectedStudentsFromProject.length}):
                </h4>
                <div className="max-h-32 overflow-y-auto flex flex-wrap gap-2">
                  {affectedStudentsFromProject.map(student => (
                    <Badge key={student.id} variant="outline" className="bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400 border-blue-200 dark:border-blue-700">
                      {student.name}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Safe removal message (only shown when no data is affected) */}
            {affectedBoardsFromProject.length === 0 && affectedSchoolsFromProject.length === 0 && affectedClassesFromProject.length === 0 && affectedTeachersFromProject.length === 0 && affectedStudentsFromProject.length === 0 && (
              <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-md">
                <p className="text-sm text-green-800 dark:text-green-200">
                  <strong>Safe to remove:</strong> No boards, schools, classes, teachers, or students will be affected by removing these projects.
                </p>
              </div>
            )}
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelProjectRemoval}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmProjectRemoval}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {affectedBoardsFromProject.length === 0 && affectedSchoolsFromProject.length === 0 && affectedClassesFromProject.length === 0
                ? "Remove Projects" 
                : "Remove Projects & Associated Data"
              }
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Board Removal Confirmation Dialog */}
      <AlertDialog open={isBoardRemovalDialogOpen} onOpenChange={setIsBoardRemovalDialogOpen}>
        <AlertDialogContent className="max-w-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-blue-600">
              <AlertTriangle className="h-5 w-5" />
              Confirm Board Removal
            </AlertDialogTitle>
            <AlertDialogDescription className="text-gray-600 dark:text-gray-300">
              {affectedSchoolsFromBoard.length === 0 && affectedClassesFromBoard.length === 0
                ? "Removing these boards will not affect any schools, classes, teachers, or students in the course access tab."
                : "Removing these boards will also remove the associated schools, classes, teachers, and students from the course access tab."
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <div className="max-h-[60vh] overflow-y-auto space-y-4 pr-2">
            {/* Boards to be removed */}
            <div>
              <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                Boards to be removed ({boardsToRemove.length}):
              </h4>
              <div className="flex flex-wrap gap-2">
                {boardsToRemove.map(boardId => {
                  const board = boards.find(b => b.id === boardId);
                  return board ? (
                    <Badge key={boardId} variant="destructive" className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                      {board.name}
                    </Badge>
                  ) : null;
                })}
              </div>
            </div>

            {/* Affected schools */}
            {affectedSchoolsFromBoard.length > 0 && (
              <div>
                <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                  Schools that will be removed ({affectedSchoolsFromBoard.length}):
                </h4>
                <div className="max-h-32 overflow-y-auto flex flex-wrap gap-2">
                  {affectedSchoolsFromBoard.map(school => (
                    <Badge key={school.id} variant="outline" className="bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400 border-emerald-200 dark:border-emerald-700">
                      {school.name}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Affected classes */}
            {affectedClassesFromBoard.length > 0 && (
              <div>
                <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                  Classes that will be removed ({affectedClassesFromBoard.length}):
                </h4>
                <div className="max-h-32 overflow-y-auto space-y-1">
                  {affectedClassesFromBoard.map(cls => (
                    <div key={cls.id} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded-md">
                      <span className="text-sm font-medium text-gray-900 dark:text-white">{cls.name}</span>
                      <Badge variant="outline" className="text-xs">
                        {cls.teachers.length} teachers, {cls.students.length} students
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Affected teachers */}
            {affectedTeachersFromBoard.length > 0 && (
              <div>
                <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                  Teachers that will be removed ({affectedTeachersFromBoard.length}):
                </h4>
                <div className="max-h-32 overflow-y-auto flex flex-wrap gap-2">
                  {affectedTeachersFromBoard.map(teacher => (
                    <Badge key={teacher.id} variant="outline" className="bg-orange-50 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400 border-orange-200 dark:border-orange-700">
                      {teacher.name}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Affected students */}
            {affectedStudentsFromBoard.length > 0 && (
              <div>
                <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                  Students that will be removed ({affectedStudentsFromBoard.length}):
                </h4>
                <div className="max-h-32 overflow-y-auto flex flex-wrap gap-2">
                  {affectedStudentsFromBoard.map(student => (
                    <Badge key={student.id} variant="outline" className="bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400 border-blue-200 dark:border-blue-700">
                      {student.name}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Safe removal message (only shown when no data is affected) */}
            {affectedSchoolsFromBoard.length === 0 && affectedClassesFromBoard.length === 0 && affectedTeachersFromBoard.length === 0 && affectedStudentsFromBoard.length === 0 && (
              <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-md">
                <p className="text-sm text-green-800 dark:text-green-200">
                  <strong>Safe to remove:</strong> No schools, classes, teachers, or students will be affected by removing these boards.
                </p>
              </div>
            )}
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelBoardRemoval}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmBoardRemoval}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {affectedSchoolsFromBoard.length === 0 && affectedClassesFromBoard.length === 0
                ? "Remove Boards" 
                : "Remove Boards & Associated Data"
              }
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
};

export default CourseBuilder;

