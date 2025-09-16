import React, { useState, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Plus, 
  Trash2, 
  GripVertical, 
  Eye, 
  EyeOff, 
  Save, 
  Send, 
  Copy,
  Settings,
  HelpCircle,
  Clock,
  Target,
  Shuffle,
  CheckCircle,
  AlertCircle,
  Users,
  X,
  Pause
} from 'lucide-react';
import { StandaloneQuizService } from '@/services/standaloneQuizService';
import { 
  QuizFormData, 
  QuestionFormData, 
  QuestionOptionFormData,
  DEFAULT_QUIZ_FORM_DATA,
  DEFAULT_QUESTION_FORM_DATA,
  StandaloneQuiz,
  StandaloneQuizQuestion,
  QuizMember
} from '@/types/standaloneQuiz';
import { MultiSelect } from '@/components/ui/MultiSelect';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

// Validation schemas
const questionOptionSchema = z.object({
  option_text: z.string().min(1, 'Option text is required'),
  is_correct: z.boolean(),
  position: z.number()
});

const questionSchema = z.object({
  question_text: z.string().min(1, 'Question text is required'),
  question_type: z.enum(['single_choice', 'multiple_choice', 'text_answer', 'math_expression']),
  position: z.number(),
  points: z.number().min(0.1, 'Points must be at least 0.1'),
  explanation: z.string().optional(),
  math_expression: z.string().optional(),
  math_tolerance: z.number().optional(),
  math_hint: z.string().optional(),
  math_allow_drawing: z.boolean().optional(),
  is_required: z.boolean(),
  options: z.array(questionOptionSchema).optional()
});

const quizSchema = z.object({
  title: z.string().min(1, 'Quiz title is required'),
  description: z.string().optional(),
  instructions: z.string().optional(),
  time_limit_minutes: z.number().nullable().optional(),
  max_attempts: z.number().min(1, 'Max attempts must be at least 1'),
  passing_score: z.number().min(0).max(100, 'Passing score must be between 0 and 100'),
  shuffle_questions: z.boolean(),
  shuffle_options: z.boolean(),
  show_correct_answers: z.boolean(),
  show_results_immediately: z.boolean(),
  allow_retake: z.boolean(),
  retry_settings: z.object({
    max_retries: z.number().min(0),
    require_teacher_approval: z.boolean(),
    allow_immediate_retry: z.boolean(),
    cooldown_minutes: z.number().min(0),
    require_study_materials: z.boolean(),
    study_materials_url: z.string().nullable().optional(),
    auto_approve_after_hours: z.number().nullable().optional()
  }),
  status: z.enum(['draft', 'published', 'archived']),
  tags: z.array(z.string()),
  estimated_duration_minutes: z.number().nullable().optional()
});

interface StandaloneQuizBuilderProps {
  quizId?: string;
  onSave?: (quiz: StandaloneQuiz) => void;
  onPublish?: (quiz: StandaloneQuiz) => void;
  onCancel?: () => void;
}

export const StandaloneQuizBuilder: React.FC<StandaloneQuizBuilderProps> = ({
  quizId,
  onSave,
  onPublish,
  onCancel
}) => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [activeTab, setActiveTab] = useState('basic');
  const [questions, setQuestions] = useState<any[]>([]);
  const [selectedTeachers, setSelectedTeachers] = useState<string[]>([]);
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isDirty }
  } = useForm<QuizFormData>({
    resolver: zodResolver(quizSchema),
    defaultValues: DEFAULT_QUIZ_FORM_DATA
  });

  // Note: We're managing questions through local state instead of form fields
  // const { fields: questionFields, append: appendQuestion, remove: removeQuestionField } = useFieldArray({
  //   control,
  //   name: 'questions' as any
  // });

  // Load existing quiz if editing
  useEffect(() => {
    if (quizId) {
      loadQuiz();
    }
  }, [quizId]);

  const loadQuiz = async () => {
    if (!quizId) return;
    
    setLoading(true);
    try {
      const quiz = await StandaloneQuizService.getQuizWithQuestions(quizId);
      
      // Set form values
      Object.keys(quiz).forEach(key => {
        if (key !== 'questions' && key !== 'id' && key !== 'created_at' && key !== 'updated_at' && key !== 'published_at') {
          setValue(key as keyof QuizFormData, quiz[key as keyof QuizFormData] as any);
        }
      });
      
      setQuestions(quiz.questions || []);
    } catch (error) {
      console.error('Error loading quiz:', error);
      toast.error('Failed to load quiz');
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data: QuizFormData) => {
    console.log('onSubmit called with data:', data);
    setSaving(true);
    try {
      let quiz: StandaloneQuiz;
      
      if (quizId) {
        // Update existing quiz
        quiz = await StandaloneQuizService.updateQuiz(quizId, data);
        // Save questions for existing quiz
        await saveQuestions(quizId);
      } else {
        // Create new quiz
        quiz = await StandaloneQuizService.createQuiz(data);
        // Save questions for new quiz
        await saveQuestions(quiz.id);
        // Save quiz members for new quiz
        await saveQuizMembers(quiz.id);
      }
      
      toast.success('Quiz saved successfully');
      onSave?.(quiz);
    } catch (error) {
      console.error('Error saving quiz:', error);
      toast.error('Failed to save quiz');
    } finally {
      setSaving(false);
    }
  };

  const onPublishQuiz = async () => {
    const data = watch();
    
    // Check if quiz has questions
    if (questions.length === 0) {
      toast.error('Please add at least one question before publishing');
      return;
    }
    
    // Validate that all questions have required fields
    const hasInvalidQuestions = questions.some(question => {
      if (!question.question_text.trim()) return true;
      if ((question.question_type === 'single_choice' || question.question_type === 'multiple_choice') && 
          (!question.options || question.options.length === 0)) return true;
      if (question.question_type === 'math_expression' && !question.math_expression?.trim()) return true;
      return false;
    });
    
    if (hasInvalidQuestions) {
      toast.error('Please complete all questions before publishing');
      return;
    }
    
    setPublishing(true);
    try {
      let quiz: StandaloneQuiz;
      
      if (quizId) {
        // Update existing quiz
        quiz = await StandaloneQuizService.updateQuiz(quizId, data);
        // Save questions for existing quiz
        await saveQuestions(quizId);
        // Publish the quiz (sets status to 'published' and published_at timestamp)
        quiz = await StandaloneQuizService.publishQuiz(quizId);
      } else {
        // Create new quiz
        quiz = await StandaloneQuizService.createQuiz(data);
        // Save questions for new quiz
        await saveQuestions(quiz.id);
        // Save quiz members for new quiz
        await saveQuizMembers(quiz.id);
        // Publish the quiz (sets status to 'published' and published_at timestamp)
        quiz = await StandaloneQuizService.publishQuiz(quiz.id);
      }
      
      toast.success('Quiz published successfully');
      onPublish?.(quiz);
    } catch (error) {
      console.error('Error publishing quiz:', error);
      toast.error('Failed to publish quiz');
    } finally {
      setPublishing(false);
    }
  };

  const onUnpublishQuiz = async () => {
    if (!quizId) return;
    
    setPublishing(true);
    try {
      const quiz = await StandaloneQuizService.unpublishQuiz(quizId);
      toast.success('Quiz unpublished successfully');
      // Update the form status
      setValue('status', 'draft');
      onPublish?.(quiz);
    } catch (error) {
      console.error('Error unpublishing quiz:', error);
      toast.error('Failed to unpublish quiz');
    } finally {
      setPublishing(false);
    }
  };

  const addQuestion = () => {
    const newQuestion: QuestionFormData = {
      ...DEFAULT_QUESTION_FORM_DATA,
      position: questions.length + 1
    };
    setQuestions([...questions, newQuestion as any]);
  };

  const removeQuestion = (index: number) => {
    setQuestions(questions.filter((_, i) => i !== index));
  };

  const updateQuestion = (index: number, question: Partial<any>) => {
    const updatedQuestions = [...questions];
    updatedQuestions[index] = { ...updatedQuestions[index], ...question };
    setQuestions(updatedQuestions);
  };

  const addOption = (questionIndex: number) => {
    const question = questions[questionIndex];
    const currentOptions = question.options || [];
    
    const newOption = {
      option_text: '',
      is_correct: false,
      position: currentOptions.length + 1
    };
    
    // Create a new array instead of mutating the existing one
    const newOptions = [...currentOptions, newOption];
    updateQuestion(questionIndex, { options: newOptions });
  };

  const removeOption = (questionIndex: number, optionIndex: number) => {
    const question = questions[questionIndex];
    if (question.options) {
      // Create a new array without the removed option
      const newOptions = question.options.filter((_, i) => i !== optionIndex);
      updateQuestion(questionIndex, { options: newOptions });
    }
  };

  const updateOption = (questionIndex: number, optionIndex: number, option: Partial<any>) => {
    const question = questions[questionIndex];
    if (question.options) {
      // Create a new array with the updated option
      const newOptions = question.options.map((opt, i) => 
        i === optionIndex ? { ...opt, ...option } : opt
      );
      updateQuestion(questionIndex, { options: newOptions });
    }
  };

  const setCorrectOption = (questionIndex: number, optionIndex: number) => {
    const question = questions[questionIndex];
    if (question.options) {
      // Create a new options array to avoid mutation
      const newOptions = question.options.map((opt, i) => {
        if (question.question_type === 'single_choice') {
          // For single choice, only the selected option is correct
          return { ...opt, is_correct: i === optionIndex };
        } else {
          // For multiple choice, toggle the selected option
          if (i === optionIndex) {
            return { ...opt, is_correct: !opt.is_correct };
          }
          return { ...opt }; // Keep other options unchanged
        }
      });
      
      updateQuestion(questionIndex, { options: newOptions });
    }
  };

  const saveQuestions = async (quizId: string) => {
    if (questions.length === 0) return;

    try {
      // First, delete existing questions for this quiz (if updating)
      if (quizId) {
        await StandaloneQuizService.deleteAllQuestions(quizId);
      }

      // Save each question
      for (let i = 0; i < questions.length; i++) {
        const question = questions[i];
        const questionData = {
          question_text: question.question_text,
          question_type: question.question_type,
          position: i + 1,
          points: question.points,
          explanation: question.explanation || null,
          math_expression: question.math_expression || null,
          math_tolerance: question.math_tolerance || null,
          math_hint: question.math_hint || null,
          math_allow_drawing: question.math_allow_drawing || false,
          is_required: question.is_required || true
        };

        const savedQuestion = await StandaloneQuizService.createQuestion(quizId, questionData);

        // Save options if this is a choice question
        if ((question.question_type === 'single_choice' || question.question_type === 'multiple_choice') && question.options) {
          for (let j = 0; j < question.options.length; j++) {
            const option = question.options[j];
            const optionData = {
              option_text: option.option_text,
              is_correct: option.is_correct,
              position: j + 1
            };
            await StandaloneQuizService.createOption(savedQuestion.id, optionData);
          }
        }
      }
    } catch (error) {
      console.error('Error saving questions:', error);
      throw error;
    }
  };

  const saveQuizMembers = async (quizId: string) => {
    try {
      // Save selected teachers
      for (const teacherId of selectedTeachers) {
        await StandaloneQuizService.addQuizMember(quizId, teacherId, 'teacher');
      }

      // Save selected students
      for (const studentId of selectedStudents) {
        await StandaloneQuizService.addQuizMember(quizId, studentId, 'student');
      }
    } catch (error) {
      console.error('Error saving quiz members:', error);
      throw error;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">
            {quizId ? 'Edit Quiz' : 'Create New Quiz'}
          </h1>
          <p className="text-muted-foreground">
            {quizId ? 'Update your quiz settings and questions' : 'Build a comprehensive quiz with multiple question types'}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          {watch('status') !== 'published' && (
            <Button 
              onClick={() => {
                console.log('Save Draft button clicked');
                console.log('Form errors:', errors);
                console.log('Form is dirty:', isDirty);
                console.log('Current form values:', watch());
                
                // Test if validation is the issue
                const formData = watch();
                console.log('Form data for validation test:', formData);
                
                // Try to validate manually
                try {
                  const validatedData = quizSchema.parse(formData);
                  console.log('Validation passed:', validatedData);
                  onSubmit(validatedData as QuizFormData);
                } catch (validationError) {
                  console.error('Validation failed:', validationError);
                }
              }} 
              disabled={saving}
              className="flex items-center gap-2"
              variant="default"
            >
              <Save className="h-4 w-4" />
              {saving ? 'Saving...' : 'Save Draft'}
            </Button>
          )}
          <Button 
            onClick={watch('status') === 'published' ? onUnpublishQuiz : onPublishQuiz}
            disabled={publishing || questions.length === 0}
            className={`flex items-center gap-2 ${
              watch('status') === 'published' 
                ? "h-9 px-4 rounded-xl bg-gradient-to-r from-yellow-600 to-yellow-700 hover:from-yellow-700 hover:to-yellow-800 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5" 
                : "h-9 px-4 rounded-xl bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5"
            }`}
          >
            {watch('status') === 'published' ? (
              <Pause className="h-4 w-4" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            {publishing 
              ? (watch('status') === 'published' ? 'Unpublishing...' : 'Publishing...') 
              : (watch('status') === 'published' ? 'Unpublish' : 'Publish')
            }
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="basic">Basic Info</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
          <TabsTrigger value="questions">Questions</TabsTrigger>
          <TabsTrigger value="access">Access</TabsTrigger>
          <TabsTrigger value="preview">Preview</TabsTrigger>
        </TabsList>

        <TabsContent value="basic" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
              <CardDescription>
                Set the basic details for your quiz
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="title">Quiz Title *</Label>
                <Input
                  id="title"
                  {...register('title')}
                  placeholder="Enter quiz title"
                />
                {errors.title && (
                  <p className="text-sm text-red-500 mt-1">{errors.title.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  {...register('description')}
                  placeholder="Describe what this quiz covers"
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="instructions">Instructions</Label>
                <Textarea
                  id="instructions"
                  {...register('instructions')}
                  placeholder="Provide instructions for students"
                  rows={3}
                />
              </div>

            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Quiz Settings</CardTitle>
              <CardDescription>
                Configure timing, attempts, and scoring options
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="time_limit_minutes">Time Limit (minutes)</Label>
                  <Input
                    id="time_limit_minutes"
                    type="number"
                    {...register('time_limit_minutes', { valueAsNumber: true })}
                    placeholder="No limit"
                  />
                </div>

                <div>
                  <Label htmlFor="max_attempts">Max Attempts</Label>
                  <Input
                    id="max_attempts"
                    type="number"
                    {...register('max_attempts', { valueAsNumber: true })}
                    min="1"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="passing_score">Passing Score (%)</Label>
                <Input
                  id="passing_score"
                  type="number"
                  {...register('passing_score', { valueAsNumber: true })}
                  min="0"
                  max="100"
                />
              </div>

              <Separator />

              <div className="space-y-4">
                <h4 className="font-medium">Display Options</h4>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Shuffle Questions</Label>
                    <p className="text-sm text-muted-foreground">
                      Randomize the order of questions for each attempt
                    </p>
                  </div>
                  <Switch
                    checked={watch('shuffle_questions')}
                    onCheckedChange={(checked) => setValue('shuffle_questions', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Shuffle Options</Label>
                    <p className="text-sm text-muted-foreground">
                      Randomize the order of answer options
                    </p>
                  </div>
                  <Switch
                    checked={watch('shuffle_options')}
                    onCheckedChange={(checked) => setValue('shuffle_options', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Show Correct Answers</Label>
                    <p className="text-sm text-muted-foreground">
                      Display correct answers after submission
                    </p>
                  </div>
                  <Switch
                    checked={watch('show_correct_answers')}
                    onCheckedChange={(checked) => setValue('show_correct_answers', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Show Results Immediately</Label>
                    <p className="text-sm text-muted-foreground">
                      Display results right after submission
                    </p>
                  </div>
                  <Switch
                    checked={watch('show_results_immediately')}
                    onCheckedChange={(checked) => setValue('show_results_immediately', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Allow Retake</Label>
                    <p className="text-sm text-muted-foreground">
                      Allow students to retake the quiz
                    </p>
                  </div>
                  <Switch
                    checked={watch('allow_retake')}
                    onCheckedChange={(checked) => setValue('allow_retake', checked)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="questions" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Questions</CardTitle>
                  <CardDescription>
                    Add and manage quiz questions
                  </CardDescription>
                </div>
                <Button onClick={addQuestion} className="flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  Add Question
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {questions.length === 0 ? (
                <div className="text-center py-8">
                  <HelpCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">No questions yet</h3>
                  <p className="text-muted-foreground mb-4">
                    Add your first question to get started
                  </p>
                  <Button onClick={addQuestion}>
                    Add Question
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {questions.map((question, questionIndex) => (
                    <QuestionEditor
                      key={questionIndex}
                      question={question}
                      questionIndex={questionIndex}
                      onUpdate={(updatedQuestion) => updateQuestion(questionIndex, updatedQuestion)}
                      onRemove={() => removeQuestion(questionIndex)}
                      onAddOption={() => addOption(questionIndex)}
                      onRemoveOption={(optionIndex) => removeOption(questionIndex, optionIndex)}
                      onUpdateOption={(optionIndex, option) => updateOption(questionIndex, optionIndex, option)}
                      onSetCorrectOption={(optionIndex) => setCorrectOption(questionIndex, optionIndex)}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="access" className="space-y-6">
          <QuizAccessTab 
            quizId={quizId} 
            onTeachersChange={setSelectedTeachers}
            onStudentsChange={setSelectedStudents}
            selectedTeachers={selectedTeachers}
            selectedStudents={selectedStudents}
          />
        </TabsContent>

        <TabsContent value="preview" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Quiz Preview</CardTitle>
              <CardDescription>
                Preview how your quiz will appear to students
              </CardDescription>
            </CardHeader>
            <CardContent>
              <QuizPreview quiz={watch()} questions={questions} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

// Question Editor Component
interface QuestionEditorProps {
  question: any;
  questionIndex: number;
  onUpdate: (question: Partial<any>) => void;
  onRemove: () => void;
  onAddOption: () => void;
  onRemoveOption: (optionIndex: number) => void;
  onUpdateOption: (optionIndex: number, option: Partial<any>) => void;
  onSetCorrectOption: (optionIndex: number) => void;
}

const QuestionEditor: React.FC<QuestionEditorProps> = ({
  question,
  questionIndex,
  onUpdate,
  onRemove,
  onAddOption,
  onRemoveOption,
  onUpdateOption,
  onSetCorrectOption
}) => {
  const [showMathSettings, setShowMathSettings] = useState(false);

  const questionTypes = [
    { value: 'single_choice', label: 'Single Choice', icon: '🔘' },
    { value: 'multiple_choice', label: 'Multiple Choice', icon: '☑️' },
    { value: 'text_answer', label: 'Text Answer', icon: '📝' },
    { value: 'math_expression', label: 'Math Expression', icon: '🧮' }
  ];

  return (
    <Card className="border-l-4 border-l-primary">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <GripVertical className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Question {questionIndex + 1}</span>
          </div>
          <Button variant="ghost" size="sm" onClick={onRemove}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label>Question Text</Label>
          <Textarea
            value={question.question_text}
            onChange={(e) => onUpdate({ question_text: e.target.value })}
            placeholder="Enter your question here..."
            rows={3}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Question Type</Label>
            <Select
              value={question.question_type}
              onValueChange={(value) => {
                onUpdate({ question_type: value as any });
                setShowMathSettings(value === 'math_expression');
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {questionTypes.map(type => (
                  <SelectItem key={type.value} value={type.value}>
                    <span className="flex items-center gap-2">
                      <span>{type.icon}</span>
                      {type.label}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Points</Label>
            <Input
              type="number"
              value={question.points}
              onChange={(e) => onUpdate({ points: parseFloat(e.target.value) || 1 })}
              min="0.1"
              step="0.1"
            />
          </div>
        </div>

        {(question.question_type === 'single_choice' || question.question_type === 'multiple_choice') && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Answer Options</Label>
              <Button variant="outline" size="sm" onClick={onAddOption}>
                <Plus className="h-4 w-4 mr-1" />
                Add Option
              </Button>
            </div>
            
            {question.options?.map((option: any, optionIndex: number) => (
              <div key={optionIndex} className="flex items-center gap-2">
                <Button
                  variant={option.is_correct ? "default" : "outline"}
                  size="sm"
                  onClick={() => onSetCorrectOption(optionIndex)}
                  className="flex-shrink-0"
                >
                  {option.is_correct ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                </Button>
                <Input
                  value={option.option_text}
                  onChange={(e) => onUpdateOption(optionIndex, { option_text: e.target.value })}
                  placeholder="Enter option text..."
                />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onRemoveOption(optionIndex)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}

        {question.question_type === 'math_expression' && (
          <div className="space-y-3">
            <div>
              <Label>Correct Math Expression</Label>
              <Input
                value={question.math_expression || ''}
                onChange={(e) => onUpdate({ math_expression: e.target.value })}
                placeholder="e.g., x^2 + 2x + 1"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Tolerance</Label>
                <Input
                  type="number"
                  value={question.math_tolerance || 0.0001}
                  onChange={(e) => onUpdate({ math_tolerance: parseFloat(e.target.value) || 0.0001 })}
                  step="0.0001"
                />
              </div>
              <div>
                <Label>Hint</Label>
                <Input
                  value={question.math_hint || ''}
                  onChange={(e) => onUpdate({ math_hint: e.target.value })}
                  placeholder="Optional hint for students"
                />
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                checked={question.math_allow_drawing || false}
                onCheckedChange={(checked) => onUpdate({ math_allow_drawing: checked })}
              />
              <Label>Allow Drawing</Label>
            </div>
          </div>
        )}

        <div>
          <Label>Explanation (Optional)</Label>
          <Textarea
            value={question.explanation || ''}
            onChange={(e) => onUpdate({ explanation: e.target.value })}
            placeholder="Explain the correct answer..."
            rows={2}
          />
        </div>
      </CardContent>
    </Card>
  );
};

// Quiz Preview Component
interface QuizPreviewProps {
  quiz: any;
  questions: any[];
}

const QuizPreview: React.FC<QuizPreviewProps> = ({ quiz, questions }) => {
  return (
    <div className="space-y-6">
      <div className="border rounded-lg p-6">
        <h2 className="text-xl font-bold mb-2">{quiz.title || 'Quiz Title'}</h2>
        {quiz.description && (
          <p className="text-muted-foreground mb-4">{quiz.description}</p>
        )}
        
        <div className="flex flex-wrap gap-2 mb-4">
          {quiz.time_limit_minutes && (
            <Badge variant="outline">
              <Clock className="h-3 w-3 mr-1" />
              {quiz.time_limit_minutes} min
            </Badge>
          )}
          <Badge variant="outline">
            <Target className="h-3 w-3 mr-1" />
            {quiz.passing_score || 70}% to pass
          </Badge>
        </div>

        {quiz.instructions && (
          <div className="bg-muted p-4 rounded-lg">
            <h4 className="font-medium mb-2">Instructions</h4>
            <p className="text-sm">{quiz.instructions}</p>
          </div>
        )}
      </div>

      <div className="space-y-4">
        <h3 className="font-medium">Questions ({questions.length})</h3>
        {questions.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">
            No questions added yet
          </p>
        ) : (
          questions.map((question, index) => (
            <div key={index} className="border rounded-lg p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">Q{index + 1}</span>
                  <Badge variant="secondary">{question.points} pts</Badge>
                </div>
                <Badge variant="outline">{question.question_type.replace('_', ' ')}</Badge>
              </div>
              
              <p className="mb-3">{question.question_text}</p>
              
              {question.question_type === 'single_choice' && question.options && (
                <div className="space-y-2">
                  {question.options.map((option: any, optIndex: number) => (
                    <div key={optIndex} className="flex items-center gap-2">
                      <div className={`w-4 h-4 rounded-full border-2 ${option.is_correct ? 'border-green-500 bg-green-500' : 'border-gray-300'}`} />
                      <span className={option.is_correct ? 'text-green-600 font-medium' : ''}>
                        {option.option_text}
                      </span>
                    </div>
                  ))}
                </div>
              )}
              
              {question.question_type === 'multiple_choice' && question.options && (
                <div className="space-y-2">
                  {question.options.map((option: any, optIndex: number) => (
                    <div key={optIndex} className="flex items-center gap-2">
                      <div className={`w-4 h-4 rounded border-2 ${option.is_correct ? 'border-green-500 bg-green-500' : 'border-gray-300'}`} />
                      <span className={option.is_correct ? 'text-green-600 font-medium' : ''}>
                        {option.option_text}
                      </span>
                    </div>
                  ))}
                </div>
              )}
              
              {question.question_type === 'text_answer' && (
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
              )}
              
              {question.question_type === 'math_expression' && (
                <div className="bg-muted p-3 rounded">
                  <p className="text-sm text-muted-foreground">Math expression input will appear here</p>
                  {question.math_expression && (
                    <p className="text-sm mt-2">
                      <strong>Correct answer:</strong> {question.math_expression}
                    </p>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

// Quiz Access Tab Component
interface QuizAccessTabProps {
  quizId?: string;
  onTeachersChange?: (teacherIds: string[]) => void;
  onStudentsChange?: (studentIds: string[]) => void;
  selectedTeachers?: string[];
  selectedStudents?: string[];
}

const QuizAccessTab: React.FC<QuizAccessTabProps> = ({ 
  quizId, 
  onTeachersChange, 
  onStudentsChange, 
  selectedTeachers = [], 
  selectedStudents = [] 
}) => {
  const [teachers, setTeachers] = useState<{ id: string; name: string; email: string; avatar_url?: string }[]>([]);
  const [students, setStudents] = useState<{ id: string; name: string; email: string; avatar_url?: string }[]>([]);
  const [allTeachers, setAllTeachers] = useState<{ label: string; value: string; subLabel?: string; imageUrl?: string }[]>([]);
  const [allStudents, setAllStudents] = useState<{ label: string; value: string; subLabel?: string; imageUrl?: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (quizId) {
      loadQuizMembers();
    }
    loadAllUsers();
  }, [quizId]);

  useEffect(() => {
    if (!quizId && allTeachers.length > 0 && allStudents.length > 0) {
      // For new quizzes, initialize with selected users from props
      updateDisplayFromSelectedIds();
    }
  }, [selectedTeachers, selectedStudents, allTeachers, allStudents, quizId]);

  const updateDisplayFromSelectedIds = () => {
    if (allTeachers.length === 0 || allStudents.length === 0) return;
    
    // Update teachers display from selected IDs
    const selectedTeacherProfiles = allTeachers.filter(t => selectedTeachers.includes(t.value));
    setTeachers(selectedTeacherProfiles.map(t => ({
      id: t.value,
      name: t.label,
      email: t.subLabel || '',
      avatar_url: t.imageUrl
    })));

    // Update students display from selected IDs
    const selectedStudentProfiles = allStudents.filter(s => selectedStudents.includes(s.value));
    setStudents(selectedStudentProfiles.map(s => ({
      id: s.value,
      name: s.label,
      email: s.subLabel || '',
      avatar_url: s.imageUrl
    })));
  };

  const loadAllUsers = async () => {
    try {
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email, avatar_url, role')
        .in('role', ['teacher', 'student']);

      if (error) throw error;

      const teacherProfiles = profiles.filter(p => p.role === 'teacher');
      const studentProfiles = profiles.filter(p => p.role === 'student');

      setAllTeachers(teacherProfiles.map(p => ({
        label: `${p.first_name} ${p.last_name}`,
        value: p.id,
        subLabel: p.email,
        imageUrl: p.avatar_url
      })));

      setAllStudents(studentProfiles.map(p => ({
        label: `${p.first_name} ${p.last_name}`,
        value: p.id,
        subLabel: p.email,
        imageUrl: p.avatar_url
      })));
    } catch (error) {
      console.error('Error loading users:', error);
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const loadQuizMembers = async () => {
    if (!quizId) {
      // For new quizzes, just clear the members and don't set loading to false
      // as loadAllUsers will handle that
      setTeachers([]);
      setStudents([]);
      return;
    }
    
    try {
      setLoading(true);
      const members = await StandaloneQuizService.getQuizMembers(quizId);
      
      const teacherMembers = members
        .filter(m => m.role === 'teacher')
        .map(m => ({
          id: m.user_id,
          name: `${m.profile.first_name} ${m.profile.last_name}`,
          email: m.profile.email,
          avatar_url: m.profile.avatar_url
        }));

      const studentMembers = members
        .filter(m => m.role === 'student')
        .map(m => ({
          id: m.user_id,
          name: `${m.profile.first_name} ${m.profile.last_name}`,
          email: m.profile.email,
          avatar_url: m.profile.avatar_url
        }));

      setTeachers(teacherMembers);
      setStudents(studentMembers);
    } catch (error) {
      console.error('Error loading quiz members:', error);
      toast.error('Failed to load quiz members');
    } finally {
      setLoading(false);
    }
  };

  const handleTeachersChange = async (selectedIds: string[]) => {
    if (quizId) {
      // For existing quizzes, save to database
      try {
        // Get current teacher IDs
        const currentTeacherIds = teachers.map(t => t.id);
        
        // Find teachers to add
        const teachersToAdd = selectedIds.filter(id => !currentTeacherIds.includes(id));
        
        // Find teachers to remove
        const teachersToRemove = currentTeacherIds.filter(id => !selectedIds.includes(id));

        // Add new teachers
        for (const teacherId of teachersToAdd) {
          await StandaloneQuizService.addQuizMember(quizId, teacherId, 'teacher');
        }

        // Remove teachers
        for (const teacherId of teachersToRemove) {
          await StandaloneQuizService.removeQuizMember(quizId, teacherId);
        }

        // Reload members
        await loadQuizMembers();
        toast.success('Teachers updated successfully');
      } catch (error) {
        console.error('Error updating teachers:', error);
        toast.error('Failed to update teachers');
      }
    } else {
      // For new quizzes, just update the parent component
      onTeachersChange?.(selectedIds);
    }
  };

  const handleStudentsChange = async (selectedIds: string[]) => {
    if (quizId) {
      // For existing quizzes, save to database
      try {
        // Get current student IDs
        const currentStudentIds = students.map(s => s.id);
        
        // Find students to add
        const studentsToAdd = selectedIds.filter(id => !currentStudentIds.includes(id));
        
        // Find students to remove
        const studentsToRemove = currentStudentIds.filter(id => !selectedIds.includes(id));

        // Add new students
        for (const studentId of studentsToAdd) {
          await StandaloneQuizService.addQuizMember(quizId, studentId, 'student');
        }

        // Remove students
        for (const studentId of studentsToRemove) {
          await StandaloneQuizService.removeQuizMember(quizId, studentId);
        }

        // Reload members
        await loadQuizMembers();
        toast.success('Students updated successfully');
      } catch (error) {
        console.error('Error updating students:', error);
        toast.error('Failed to update students');
      }
    } else {
      // For new quizzes, just update the parent component
      onStudentsChange?.(selectedIds);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Quiz Access Management
          </CardTitle>
          <CardDescription>
            Manage which teachers and students have access to this quiz
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {!quizId && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Select teachers and students who will have access to this quiz. These selections will be saved when you save the quiz.
              </AlertDescription>
            </Alert>
          )}
          <>
              {/* Teachers Section */}
              <div className="space-y-4">
                <div>
                  <Label className="text-base font-medium">Teachers</Label>
                  <p className="text-sm text-muted-foreground mb-3">
                    Teachers can view, edit, and manage this quiz
                  </p>
                  <MultiSelect
                    options={allTeachers}
                    onValueChange={handleTeachersChange}
                    value={quizId ? teachers.map(t => t.id) : selectedTeachers}
                    placeholder="Search and select teachers..."
                    className="min-h-[44px] border-2 border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all duration-300"
                  />
                </div>

                {/* Current Teachers */}
                {teachers.length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Current Teachers ({teachers.length})</Label>
                    <div className="space-y-2">
                      {teachers.map(teacher => (
                        <div key={teacher.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg group">
                          <div className="flex items-center gap-3">
                            {teacher.avatar_url ? (
                              <img
                                src={teacher.avatar_url}
                                alt={teacher.name}
                                className="w-8 h-8 rounded-full object-cover"
                              />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                                <Users className="w-4 h-4 text-primary" />
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-gray-900 dark:text-white text-sm truncate">{teacher.name}</p>
                              <p className="text-xs text-gray-600 dark:text-gray-400 truncate">{teacher.email}</p>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleTeachersChange(teachers.filter(t => t.id !== teacher.id).map(t => t.id))}
                            className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-all duration-300 hover:bg-red-100 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400 rounded-lg"
                          >
                            <X className="w-3 h-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <Separator />

              {/* Students Section */}
              <div className="space-y-4">
                <div>
                  <Label className="text-base font-medium">Students</Label>
                  <p className="text-sm text-muted-foreground mb-3">
                    Students can take this quiz and view their results
                  </p>
                  <MultiSelect
                    options={allStudents}
                    onValueChange={handleStudentsChange}
                    value={quizId ? students.map(s => s.id) : selectedStudents}
                    placeholder="Search and select students..."
                    className="min-h-[44px] border-2 border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all duration-300"
                  />
                </div>

                {/* Current Students */}
                {students.length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Current Students ({students.length})</Label>
                    <div className="space-y-2">
                      {students.map(student => (
                        <div key={student.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg group">
                          <div className="flex items-center gap-3">
                            {student.avatar_url ? (
                              <img
                                src={student.avatar_url}
                                alt={student.name}
                                className="w-8 h-8 rounded-full object-cover"
                              />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                                <Users className="w-4 h-4 text-primary" />
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-gray-900 dark:text-white text-sm truncate">{student.name}</p>
                              <p className="text-xs text-gray-600 dark:text-gray-400 truncate">{student.email}</p>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleStudentsChange(students.filter(s => s.id !== student.id).map(s => s.id))}
                            className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-all duration-300 hover:bg-red-100 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400 rounded-lg"
                          >
                            <X className="w-3 h-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Access Control Info */}
              <Card className="overflow-hidden border-0 shadow-xl bg-gradient-to-br from-blue-50/50 to-indigo-50/50 dark:from-blue-900/10 dark:to-indigo-900/10 border border-blue-200/50 dark:border-blue-700/30">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                      <AlertCircle className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="font-medium text-blue-900 dark:text-blue-100">Access Control</h4>
                      <p className="text-sm text-blue-700 dark:text-blue-300">
                        Only the selected teachers and students will have access to this quiz. 
                        Teachers can manage the quiz, while students can take it and view results.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
        </CardContent>
      </Card>
    </div>
  );
};
