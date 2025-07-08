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
                  label="Upload Video (MP4, MOV)"
                  acceptedFileTypes={['video/mp4', 'video/quicktime']}
                />;
      case 'attachment':
        return <FileUpload 
                  onUpload={(file) => onUpdate(sectionId, lesson.id, { content: file })} 
                  label="Upload Attachment (PDF, DOC, XLS, ZIP)"
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
            placeholder="Write the assignment details here..."
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
          placeholder="Lesson Title"
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
              <SelectItem value="video">Video</SelectItem>
              <SelectItem value="attachment">Attachment</SelectItem>
              <SelectItem value="assignment">Assignment</SelectItem>
              <SelectItem value="quiz">Quiz</SelectItem>
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
  const [courseData, setCourseData] = useState<CourseData>({
    title: '',
    subtitle: '',
    description: '',
    category: '',
    language: 'English',
    level: 'Beginner',
    requirements: [''],
    learningOutcomes: [''],
    sections: [],
    instructors: [],
    students: [],
  });

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
            id: '1',
            title: 'Introduction to English',
            lessons: [
              { id: '1-1', title: 'Welcome to the Course', type: 'video' },
              { id: '1-2', title: 'Basic Greetings', type: 'video' }
            ]
          }
        ]
      });
    }
  }, [courseId]);

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

  // #region Section and Lesson Handlers
  const addSection = () => {
    const newSection: CourseSection = {
      id: Date.now().toString(),
      title: 'New Section',
      lessons: []
    };
    setCourseData(prev => ({ ...prev, sections: [...prev.sections, newSection] }));
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
        section.id === sectionId ? { ...section, lessons: [...section.lessons, newLesson] } : section
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
    setCourseData(prev => ({
      ...prev,
      sections: prev.sections.map(s =>
        s.id === sectionId
          ? { ...s, lessons: s.lessons.filter(l => l.id !== lessonId) }
          : s
      ),
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
                          <SelectItem value="Language Learning">Language Learning</SelectItem>
                          <SelectItem value="Mathematics">Mathematics</SelectItem>
                          <SelectItem value="Science">Science</SelectItem>
                          <SelectItem value="Technology">Technology</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium mb-2">Language</label>
                      <Select value={courseData.language} onValueChange={(value) => setCourseData(prev => ({ ...prev, language: value }))}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="English">English</SelectItem>
                          <SelectItem value="Urdu">Urdu</SelectItem>
                          <SelectItem value="Arabic">Arabic</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium mb-2">Level</label>
                      <Select value={courseData.level} onValueChange={(value) => setCourseData(prev => ({ ...prev, level: value }))}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Beginner">Beginner</SelectItem>
                          <SelectItem value="Intermediate">Intermediate</SelectItem>
                          <SelectItem value="Advanced">Advanced</SelectItem>
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
                  <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center">
                    <Upload className="w-8 h-8 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground mb-2">Upload course thumbnail</p>
                    <Button variant="outline">Choose File</Button>
                  </div>
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
                  {courseData.sections.map((section, sectionIndex) => (
                    <Card key={section.id} className="bg-muted/50">
                      <CardHeader className="flex flex-row items-center justify-between p-4">
                        <div className="flex items-center gap-2">
                          <GripVertical className="cursor-move text-muted-foreground" />
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
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => removeSection(section.id)}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-2 pl-12 pr-4 pb-4">
                        {section.lessons.map((lesson) => (
                          <LessonItem
                            key={lesson.id}
                            lesson={lesson}
                            sectionId={section.id}
                            onUpdate={updateLesson}
                            onRemove={removeLesson}
                          />
                        ))}
                      </CardContent>
                    </Card>
                  ))}
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="landing" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Course Image</CardTitle>
                </CardHeader>
                <CardContent>
                  <FileUpload onUpload={() => { /* Implement upload logic */ }} label="Upload course thumbnail" />
                </CardContent>
              </Card>
              
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
