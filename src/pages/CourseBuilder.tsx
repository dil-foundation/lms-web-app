
import { useState, useEffect } from 'react';
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

interface CourseSection {
  id: string;
  title: string;
  lessons: CourseLesson[];
}

interface CourseLesson {
  id: string;
  title: string;
  type: 'video' | 'article' | 'quiz';
  duration?: number;
}

interface CourseData {
  id?: string;
  title: string;
  subtitle: string;
  description: string;
  category: string;
  language: string;
  level: string;
  price: number;
  image?: string;
  requirements: string[];
  learningOutcomes: string[];
  targetAudience: string;
  sections: CourseSection[];
}

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
    price: 0,
    requirements: [''],
    learningOutcomes: [''],
    targetAudience: '',
    sections: []
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
        price: 49,
        requirements: ['Basic Urdu literacy', 'Willingness to practice daily'],
        learningOutcomes: ['Speak basic English confidently', 'Understand common English phrases', 'Write simple sentences'],
        targetAudience: 'Native Urdu speakers wanting to learn English',
        sections: [
          {
            id: '1',
            title: 'Introduction to English',
            lessons: [
              { id: '1-1', title: 'Welcome to the Course', type: 'video', duration: 5 },
              { id: '1-2', title: 'Basic Greetings', type: 'video', duration: 10 }
            ]
          }
        ]
      });
    }
  }, [courseId]);

  const handleSave = async () => {
    setIsSaving(true);
    // Mock save operation
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsSaving(false);
    toast.success('Course saved successfully!');
  };

  const handlePublish = () => {
    toast.success('Course published successfully!');
  };

  const addSection = () => {
    const newSection: CourseSection = {
      id: Date.now().toString(),
      title: 'New Section',
      lessons: []
    };
    setCourseData(prev => ({
      ...prev,
      sections: [...prev.sections, newSection]
    }));
  };

  const addLesson = (sectionId: string) => {
    const newLesson: CourseLesson = {
      id: Date.now().toString(),
      title: 'New Lesson',
      type: 'video'
    };
    setCourseData(prev => ({
      ...prev,
      sections: prev.sections.map(section =>
        section.id === sectionId
          ? { ...section, lessons: [...section.lessons, newLesson] }
          : section
      )
    }));
  };

  const updateArrayField = (field: 'requirements' | 'learningOutcomes', index: number, value: string) => {
    setCourseData(prev => ({
      ...prev,
      [field]: prev[field].map((item, i) => i === index ? value : item)
    }));
  };

  const addArrayField = (field: 'requirements' | 'learningOutcomes') => {
    setCourseData(prev => ({
      ...prev,
      [field]: [...prev[field], '']
    }));
  };

  const removeArrayField = (field: 'requirements' | 'learningOutcomes', index: number) => {
    setCourseData(prev => ({
      ...prev,
      [field]: prev[field].filter((_, i) => i !== index)
    }));
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => navigate('/dashboard/courses')}
            >
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
              <TabsTrigger value="pricing" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary">
                Pricing
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="p-6">
            {/* Course Details Tab */}
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

            {/* Curriculum Tab */}
            <TabsContent value="curriculum" className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold">Course Curriculum</h2>
                <Button onClick={addSection}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Section
                </Button>
              </div>

              <div className="space-y-4">
                {courseData.sections.map((section, sectionIndex) => (
                  <Card key={section.id}>
                    <CardHeader className="pb-3">
                      <div className="flex items-center gap-2">
                        <GripVertical className="w-4 h-4 text-muted-foreground cursor-move" />
                        <Input
                          value={section.title}
                          onChange={(e) => {
                            setCourseData(prev => ({
                              ...prev,
                              sections: prev.sections.map((s, i) =>
                                i === sectionIndex ? { ...s, title: e.target.value } : s
                              )
                            }));
                          }}
                          className="font-medium"
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => addLesson(section.id)}
                        >
                          <Plus className="w-4 h-4 mr-1" />
                          Lesson
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {section.lessons.map((lesson, lessonIndex) => (
                        <div key={lesson.id} className="flex items-center gap-2 p-2 border rounded">
                          <GripVertical className="w-4 h-4 text-muted-foreground cursor-move" />
                          <Input
                            value={lesson.title}
                            onChange={(e) => {
                              setCourseData(prev => ({
                                ...prev,
                                sections: prev.sections.map(s =>
                                  s.id === section.id
                                    ? {
                                        ...s,
                                        lessons: s.lessons.map((l, i) =>
                                          i === lessonIndex ? { ...l, title: e.target.value } : l
                                        )
                                      }
                                    : s
                                )
                              }));
                            }}
                            className="flex-1"
                          />
                          <Select value={lesson.type} onValueChange={(value: 'video' | 'article' | 'quiz') => {
                            setCourseData(prev => ({
                              ...prev,
                              sections: prev.sections.map(s =>
                                s.id === section.id
                                  ? {
                                      ...s,
                                      lessons: s.lessons.map((l, i) =>
                                        i === lessonIndex ? { ...l, type: value } : l
                                      )
                                    }
                                  : s
                              )
                            }));
                          }}>
                            <SelectTrigger className="w-24">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="video">Video</SelectItem>
                              <SelectItem value="article">Article</SelectItem>
                              <SelectItem value="quiz">Quiz</SelectItem>
                            </SelectContent>
                          </Select>
                          <Badge variant="secondary">{lesson.type}</Badge>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            {/* Landing Page Tab */}
            <TabsContent value="landing" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>What will students learn?</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {courseData.learningOutcomes.map((outcome, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <Input
                        value={outcome}
                        onChange={(e) => updateArrayField('learningOutcomes', index, e.target.value)}
                        placeholder="Students will be able to..."
                      />
                      {courseData.learningOutcomes.length > 1 && (
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => removeArrayField('learningOutcomes', index)}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                  <Button variant="outline" onClick={() => addArrayField('learningOutcomes')}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Learning Outcome
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Course Requirements</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {courseData.requirements.map((requirement, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <Input
                        value={requirement}
                        onChange={(e) => updateArrayField('requirements', index, e.target.value)}
                        placeholder="What are the requirements or prerequisites?"
                      />
                      {courseData.requirements.length > 1 && (
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => removeArrayField('requirements', index)}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                  <Button variant="outline" onClick={() => addArrayField('requirements')}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Requirement
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Target Audience</CardTitle>
                </CardHeader>
                <CardContent>
                  <Textarea
                    value={courseData.targetAudience}
                    onChange={(e) => setCourseData(prev => ({ ...prev, targetAudience: e.target.value }))}
                    placeholder="Who is this course for?"
                    rows={3}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            {/* Pricing Tab */}
            <TabsContent value="pricing" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Course Price</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Price (USD)</label>
                      <Input
                        type="number"
                        value={courseData.price}
                        onChange={(e) => setCourseData(prev => ({ ...prev, price: Number(e.target.value) }))}
                        placeholder="0"
                      />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Set your course price. You can offer discounts and promotions later.
                    </p>
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
