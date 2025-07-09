import { useTranslation } from 'react-i18next';
import { useState, useEffect, useCallback, memo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Save, Eye, Upload, Plus, GripVertical, X } from 'lucide-react';
import { toast } from 'sonner';
import { FileUpload } from '@/components/ui/FileUpload';
import { RichTextEditor } from '@/components/ui/RichTextEditor';
import { MultiSelect } from '@/components/ui/MultiSelect';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';

// #region Interfaces
interface CourseSection {
  id: string;
  title: string;
  lessons: CourseLesson[];
}

interface CourseLesson {
  id:string;
  title: string;
  type: 'video' | 'attachment' | 'assignment' | 'quiz';
  content?: string | File | QuizData;
  duration?: number;
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
}

const LessonItem = memo(({ lesson, sectionId, onUpdate, onRemove }: LessonItemProps) => {
  const { t } = useTranslation();
  const [localContent, setLocalContent] = useState(typeof lesson.content === 'string' ? lesson.content : '');

  // Keep local state in sync if the prop changes from parent
  useEffect(() => {
    if (typeof lesson.content === 'string') {
      setLocalContent(lesson.content);
    }
  }, [lesson.content]);

  const handleBlur = () => {
    // Sync with parent state only when user is done editing
    onUpdate(sectionId, lesson.id, { content: localContent });
  };
  
  const renderLessonContentEditor = () => {
    switch (lesson.type) {
      case 'video':
        return <FileUpload 
                  onUpload={(file) => onUpdate(sectionId, lesson.id, { content: file })} 
                  label={t('course_builder.lessons.video_upload_label')}
                  acceptedFileTypes={['video/mp4', 'video/quicktime']}
                />;
      case 'attachment':
        return <FileUpload 
                  onUpload={(file) => onUpdate(sectionId, lesson.id, { content: file })} 
                  label={t('course_builder.lessons.attachment_upload_label')}
                  acceptedFileTypes={[
                    'application/pdf',
                    'application/msword',
                    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                    'application/vnd.ms-excel',
                    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                    'application/zip'
                  ]}
                />;
      case 'assignment':
        return (
          <RichTextEditor
            value={localContent}
            onChange={setLocalContent}
            onBlur={handleBlur}
            placeholder={t('course_builder.lessons.assignment_placeholder')}
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
        <Input
          value={lesson.title}
          onChange={(e) => onUpdate(sectionId, lesson.id, { title: e.target.value })}
          placeholder={t('course_builder.lessons.lesson_title_placeholder')}
          className="flex-1"
        />
        <div className="flex items-center gap-2 ml-4">
          <Select
            value={lesson.type}
            onValueChange={(value: 'video' | 'attachment' | 'assignment' | 'quiz') => {
              onUpdate(sectionId, lesson.id, { type: value, content: undefined });
            }}
          >
            <SelectTrigger className="w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="video">{t('course_builder.lessons.types.video')}</SelectItem>
              <SelectItem value="attachment">{t('course_builder.lessons.types.attachment')}</SelectItem>
              <SelectItem value="assignment">{t('course_builder.lessons.types.assignment')}</SelectItem>
              <SelectItem value="quiz">{t('course_builder.lessons.types.quiz')}</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onRemove(sectionId, lesson.id)}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>
      <div>
        {renderLessonContentEditor()}
      </div>
    </div>
  );
});
LessonItem.displayName = "LessonItem";
// #endregion

// #region QuizBuilder Component
const QuizBuilder = ({ quiz, onQuizChange }: { quiz: QuizData, onQuizChange: (quiz: QuizData) => void }) => {
  const { t } = useTranslation();
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
                placeholder={t('course_builder.quiz.question_placeholder', { index: qIndex + 1 })}
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
                  placeholder={t('course_builder.quiz.option_placeholder')}
                />
                <RadioGroup value={question.correctOptionId} onValueChange={(val) => setCorrectOption(qIndex, val)}>
                  <RadioGroupItem value={option.id} id={`${question.id}-${option.id}`} />
                </RadioGroup>
                <Label htmlFor={`${question.id}-${option.id}`} className="cursor-pointer text-sm">{t('course_builder.quiz.correct_label')}</Label>
                {question.options.length > 2 && (
                  <Button variant="ghost" size="icon" onClick={() => removeOption(qIndex, oIndex)}>
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={() => addOption(qIndex)}>{t('course_builder.quiz.add_option_button')}</Button>
          </CardContent>
        </Card>
      ))}
      <Button onClick={addQuestion}>{t('course_builder.quiz.add_question_button')}</Button>
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

// #region Main CourseBuilder Component
const CourseBuilder = () => {
  const { t } = useTranslation();
  const { courseId } = useParams();
  const navigate = useNavigate();
  const [isSaving, setIsSaving] = useState(false);
  const [courseData, setCourseData] = useState<CourseData | null>(null);
  const [activeTab, setActiveTab] = useState('details');

  useEffect(() => {
    // In a real app, you would fetch course data based on courseId
    if (courseId !== 'new') {
      console.log(`Fetching data for course ${courseId}...`);
      // This is mock data for an existing course
      setCourseData({
        id: courseId,
        title: 'Advanced React Patterns',
        subtitle: 'Deep dive into hooks, context, and performance optimization.',
        description: 'This course explores advanced concepts in React to build scalable and maintainable applications. We will cover topics like custom hooks, context API for state management, performance optimization techniques, and best practices for component architecture.',
        category: 'development',
        language: 'english',
        level: 'advanced',
        requirements: ['Basic understanding of React', 'Familiarity with JavaScript (ES6+)'],
        learningOutcomes: ['Build complex applications with React', 'Optimize React app performance', 'Write custom hooks for reusable logic'],
        instructors: MOCK_USER_DATABASE.filter(u => u.role === 'instructor').slice(0, 1),
        students: MOCK_USER_DATABASE.filter(u => u.role === 'student'),
        sections: [
          {
            id: 'sec1',
            title: 'Introduction to Advanced Hooks',
            lessons: [
              { id: 'les1', title: 'The power of useReducer', type: 'video', duration: 600 },
              { id: 'les2', title: 'Mastering useEffect dependencies', type: 'video', duration: 720 },
            ],
          },
          {
            id: 'sec2',
            title: 'State Management with Context',
            lessons: [
              { id: 'les3', title: 'Context vs. Redux', type: 'attachment' },
              { id: 'les4', title: 'Performance implications', type: 'video', duration: 900 },
              { id: 'les5', title: 'Quiz on State Management', type: 'quiz', content: { questions: [] } },
            ],
          },
        ],
      });
    } else {
      // Default structure for a new course
      setCourseData({
        title: '',
        subtitle: '',
        description: '',
        category: '',
        language: 'english',
        level: 'beginner',
        requirements: [],
        learningOutcomes: [],
        sections: [{ id: 'sec1', title: 'Introduction', lessons: [] }],
        instructors: [],
        students: [],
      });
    }
  }, [courseId]);

  const handleSave = async () => {
    setIsSaving(true);
    console.log('Saving course data:', courseData);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));
    toast.success(t('course_builder.messages.save_success'));
    setIsSaving(false);
    if (courseId === 'new') {
      navigate('/dashboard/courses/builder/new-course-id-from-server', { replace: true });
    }
  };

  const handlePublish = () => {
    console.log('Publishing course:', courseData);
    toast.success(t('course_builder.messages.publish_success'));
  };

  const addSection = () => {
    if (courseData) {
      const newSection: CourseSection = {
        id: `sec${Date.now()}`,
        title: `Section ${courseData.sections.length + 1}`,
        lessons: []
      };
      setCourseData({ ...courseData, sections: [...courseData.sections, newSection] });
    }
  };
  
  const removeSection = (sectionId: string) => {
    if (courseData) {
      setCourseData({ ...courseData, sections: courseData.sections.filter(s => s.id !== sectionId) });
    }
  };
  
  const addLesson = (sectionId: string) => {
    if (courseData) {
      const newLesson: CourseLesson = {
        id: `les${Date.now()}`,
        title: `New Lesson`,
        type: 'video',
      };
      const updatedSections = courseData.sections.map(s => 
        s.id === sectionId ? { ...s, lessons: [...s.lessons, newLesson] } : s
      );
      setCourseData({ ...courseData, sections: updatedSections });
    }
  };

  const updateSectionTitle = (sectionId: string, title: string) => {
    if (courseData) {
      const updatedSections = courseData.sections.map(s => 
        s.id === sectionId ? { ...s, title } : s
      );
      setCourseData({ ...courseData, sections: updatedSections });
    }
  };
  
  const updateLesson = useCallback((sectionId: string, lessonId: string, updatedLesson: Partial<CourseLesson>) => {
    if (courseData) {
      const updatedSections = courseData.sections.map(section => {
        if (section.id === sectionId) {
          return {
            ...section,
            lessons: section.lessons.map(lesson =>
              lesson.id === lessonId ? { ...lesson, ...updatedLesson } : lesson
            )
          };
        }
        return section;
      });
      setCourseData({ ...courseData, sections: updatedSections });
    }
  }, [courseData]);

  const removeLesson = useCallback((sectionId: string, lessonId: string) => {
    if (courseData) {
      const updatedSections = courseData.sections.map(section => {
        if (section.id === sectionId) {
          return {
            ...section,
            lessons: section.lessons.filter(lesson => lesson.id !== lessonId)
          };
        }
        return section;
      });
      setCourseData({ ...courseData, sections: updatedSections });
    }
  }, [courseData]);

  const handleInputChange = (field: keyof CourseData, value: any) => {
    if (courseData) {
      setCourseData({ ...courseData, [field]: value });
    }
  };
  
  const handleListChange = (field: 'requirements' | 'learningOutcomes', value: string) => {
    if (courseData) {
      const list = courseData[field] as string[];
      if (value.endsWith('\n') && value.trim() !== '') {
        const newItem = value.trim();
        if (!list.includes(newItem)) {
          setCourseData({ ...courseData, [field]: [...list, newItem] });
        }
        // This is a bit of a hacky way to clear the input, but it works
        const tempInput = document.getElementById(`${field}-input`) as HTMLInputElement;
        if(tempInput) tempInput.value = '';
      }
    }
  };

  const removeListItem = (field: 'requirements' | 'learningOutcomes', itemToRemove: string) => {
    if (courseData) {
      const list = courseData[field] as string[];
      setCourseData({ ...courseData, [field]: list.filter(item => item !== itemToRemove) });
    }
  };
  
  const handleMembersChange = (role: 'instructors' | 'students', selectedIds: string[]) => {
    if (courseData) {
      const selectedMembers = MOCK_USER_DATABASE.filter(user => selectedIds.includes(user.id) && user.role === role.slice(0, -1));
      setCourseData({ ...courseData, [role]: selectedMembers });
    }
  };

  if (!courseData) {
    return <div className="flex justify-center items-center h-screen">Loading...</div>;
  }
  
  const selectedInstructorValues = courseData.instructors.map(i => i.id);
  const selectedStudentValues = courseData.students.map(s => s.id);

  return (
    <div className="min-h-screen bg-muted/40">
      {/* Header */}
      <div className="bg-background border-b sticky top-0 z-10">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard/courses')}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-xl font-bold">{courseId === 'new' ? t('course_builder.header.create_title') : t('course_builder.header.edit_title')}</h1>
                <p className="text-sm text-muted-foreground">{courseData.title || t('course_builder.header.subtitle_new')}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={handleSave} disabled={isSaving}>
                <Save className="mr-2 h-4 w-4" />
                {isSaving ? t('course_builder.buttons.saving') : t('course_builder.buttons.save_draft')}
              </Button>
              <Button onClick={handlePublish}>
                <Eye className="mr-2 h-4 w-4" />
                {t('course_builder.buttons.publish')}
              </Button>
            </div>
          </div>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="details">{t('course_builder.tabs.details')}</TabsTrigger>
              <TabsTrigger value="curriculum">{t('course_builder.tabs.curriculum')}</TabsTrigger>
              <TabsTrigger value="settings">{t('course_builder.tabs.settings')}</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>
      
      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        <TabsContent value="details">
          <Card>
            <CardHeader>
              <CardTitle>{t('course_builder.details.title')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label htmlFor="title">{t('course_builder.details.form.title.label')}</label>
                  <Input id="title" value={courseData.title} onChange={(e) => handleInputChange('title', e.target.value)} placeholder={t('course_builder.details.form.title.placeholder')} />
                </div>
                <div className="space-y-2">
                  <label htmlFor="subtitle">{t('course_builder.details.form.subtitle.label')}</label>
                  <Input id="subtitle" value={courseData.subtitle} onChange={(e) => handleInputChange('subtitle', e.target.value)} placeholder={t('course_builder.details.form.subtitle.placeholder')} />
                </div>
              </div>
              
              <div className="space-y-2">
                <label htmlFor="description">{t('course_builder.details.form.description.label')}</label>
                <RichTextEditor
                  value={courseData.description}
                  onChange={(value) => handleInputChange('description', value)}
                  placeholder={t('course_builder.details.form.description.placeholder')}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <label>{t('course_builder.details.form.category.label')}</label>
                  <Select value={courseData.category} onValueChange={(value) => handleInputChange('category', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder={t('course_builder.details.form.category.placeholder')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="language-arts">{t('course_builder.categories.language_arts')}</SelectItem>
                      <SelectItem value="mathematics">{t('course_builder.categories.mathematics')}</SelectItem>
                      <SelectItem value="science">{t('course_builder.categories.science')}</SelectItem>
                      <SelectItem value="social-studies">{t('course_builder.categories.social_studies')}</SelectItem>
                      <SelectItem value="technology">{t('course_builder.categories.technology')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label>{t('course_builder.details.form.language.label')}</label>
                  <Select value={courseData.language} onValueChange={(value) => handleInputChange('language', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder={t('course_builder.details.form.language.placeholder')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="english">English</SelectItem>
                      <SelectItem value="urdu">Urdu</SelectItem>
                      <SelectItem value="sindhi">Sindhi</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label>{t('course_builder.details.form.level.label')}</label>
                  <Select value={courseData.level} onValueChange={(value) => handleInputChange('level', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder={t('course_builder.details.form.level.placeholder')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="beginner">{t('course_builder.levels.beginner')}</SelectItem>
                      <SelectItem value="intermediate">{t('course_builder.levels.intermediate')}</SelectItem>
                      <SelectItem value="advanced">{t('course_builder.levels.advanced')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div>
                <label>{t('course_builder.details.form.image.label')}</label>
                <FileUpload 
                  onUpload={(file) => handleInputChange('image', file.name)} 
                  label={t('course_builder.details.form.image.upload_label')}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label htmlFor="requirements-input">{t('course_builder.details.form.requirements.label')}</label>
                  <Textarea
                    id="requirements-input"
                    placeholder={t('course_builder.details.form.requirements.placeholder')}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleListChange('requirements', e.currentTarget.value); }}}
                  />
                  <div className="flex flex-wrap gap-2 mt-2">
                    {courseData.requirements.map(req => (
                      <Badge key={req} variant="secondary">
                        {req}
                        <button onClick={() => removeListItem('requirements', req)} className="ml-2 text-muted-foreground hover:text-foreground">
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <label htmlFor="learningOutcomes-input">{t('course_builder.details.form.outcomes.label')}</label>
                  <Textarea
                    id="learningOutcomes-input"
                    placeholder={t('course_builder.details.form.outcomes.placeholder')}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleListChange('learningOutcomes', e.currentTarget.value); }}}
                  />
                  <div className="flex flex-wrap gap-2 mt-2">
                    {courseData.learningOutcomes.map(outcome => (
                      <Badge key={outcome} variant="secondary">
                        {outcome}
                        <button onClick={() => removeListItem('learningOutcomes', outcome)} className="ml-2 text-muted-foreground hover:text-foreground">
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="curriculum">
          <div className="space-y-6">
            {courseData.sections.map((section, index) => (
              <Card key={section.id}>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div className="flex items-center gap-2 flex-1">
                    <GripVertical className="h-5 w-5 text-muted-foreground cursor-move" />
                    <Input
                      value={section.title}
                      onChange={(e) => updateSectionTitle(section.id, e.target.value)}
                      placeholder={t('course_builder.curriculum.section_title_placeholder')}
                      className="text-lg font-semibold"
                    />
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => removeSection(section.id)}>
                    <X className="w-4 h-4 text-muted-foreground" />
                  </Button>
                </CardHeader>
                <CardContent className="space-y-4">
                  {section.lessons.map(lesson => (
                    <LessonItem 
                      key={lesson.id} 
                      lesson={lesson} 
                      sectionId={section.id} 
                      onUpdate={updateLesson}
                      onRemove={removeLesson}
                    />
                  ))}
                  <Button variant="outline" onClick={() => addLesson(section.id)}>
                    <Plus className="mr-2 h-4 w-4" />
                    {t('course_builder.curriculum.add_lesson_button')}
                  </Button>
                </CardContent>
              </Card>
            ))}
            <Button onClick={addSection}>{t('course_builder.curriculum.add_section_button')}</Button>
          </div>
        </TabsContent>

        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle>{t('course_builder.settings.title')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <label>{t('course_builder.settings.instructors.label')}</label>
                <MultiSelect
                  options={MOCK_INSTRUCTORS_FOR_SELECT}
                  value={selectedInstructorValues}
                  onValueChange={(selected) => handleMembersChange('instructors', selected)}
                  placeholder={t('course_builder.settings.instructors.placeholder')}
                />
              </div>
              <div className="space-y-2">
                <label>{t('course_builder.settings.students.label')}</label>
                <MultiSelect
                  options={MOCK_STUDENTS_FOR_SELECT}
                  value={selectedStudentValues}
                  onValueChange={(selected) => handleMembersChange('students', selected)}
                  placeholder={t('course_builder.settings.students.placeholder')}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </div>
    </div>
  );
};
// #endregion

export default CourseBuilder;
