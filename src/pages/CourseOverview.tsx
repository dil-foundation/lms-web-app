import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { 
  Play, 
  Clock, 
  Users, 
  Star, 
  BookOpen, 
  Award, 
  CheckCircle,
  Globe,
  Smartphone,
  Download,
  ArrowLeft,
  PlayCircle,
  FileText,
  HelpCircle,
  TrendingUp,
  Target
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { ContentLoader } from '@/components/ContentLoader';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// This is a subset of the CourseData from CourseBuilder.
// In a real app, this might live in a shared types file.
interface CourseData {
  id?: string;
  title: string;
  subtitle: string;
  description: string;
  image?: string;
  requirements: string[];
  learningOutcomes: string[];
  sections: {
      id: string;
      title: string;
      lessons: { id: string; title: string; }[];
  }[];
  teachers: { name: string; }[];
  students: { id: string; }[];
  duration?: string;
  level?: string;
  language?: string;
}

interface CourseOverviewProps {
  courseId?: string;
  courseData?: CourseData;
  isPreviewMode?: boolean;
}

export const CourseOverview = ({ courseId: propCourseId, courseData: initialCourseData, isPreviewMode = false }: CourseOverviewProps) => {
  const { id: paramId } = useParams();
  const navigate = useNavigate();
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [course, setCourse] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const courseId = propCourseId || paramId;

  const mapDataToCourse = (data: any) => {
    const firstTeacher = data.teachers?.[0] || data.members?.find((m: any) => m.role === 'teacher')?.profile || { first_name: 'Instructor', last_name: 'TBD' };
    const teacherName = `${firstTeacher.first_name || ''} ${firstTeacher.last_name || ''}`.trim();
    const getInitials = (name: string) => name.split(' ').map(n => n[0]).join('').toUpperCase();
    const totalLessons = data.sections?.reduce((acc: number, section: any) => acc + (section.lessons?.length || 0), 0) || 0;

    return {
      id: data.id || 'preview',
      title: data.title,
      subtitle: data.subtitle,
      description: data.description,
      thumbnail: data.image || data.image_url || "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80",
      videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ", // Placeholder
      instructor: {
        name: teacherName,
        title: "English Language Expert",
        avatar: getInitials(teacherName),
        rating: 4.8,
        students: 12000,
        courses: 15
      },
      stats: {
        rating: 4.9,
        totalRatings: 2847,
        students: data.students?.length || data.members?.filter((m: any) => m.role === 'student').length || 0,
        duration: data.duration || "N/A",
        lessons: totalLessons,
        level: data.level || "All Levels",
        language: data.language || "English",
        lastUpdated: new Date(data.updated_at || Date.now()).toLocaleString('en-US', { month: 'long', year: 'numeric' })
      },
      progress: { // This would be fetched per-user in a real app
        completed: 0,
        total: totalLessons,
        percentage: 0,
        lastAccessed: "Never",
        nextLesson: data.sections?.[0]?.lessons?.[0]?.title || "First Lesson"
      },
      features: [
        `${data.duration || 'Comprehensive'} of on-demand video`,
        `${totalLessons} downloadable lessons`,
        "Interactive quizzes and exercises",
        "Mobile and desktop access",
        "Certificate of completion",
      ],
      whatYouLearn: data.learning_outcomes || [],
      requirements: data.requirements || [],
      curriculum: data.sections?.map((section: any, index: number) => ({
        id: section.id,
        title: section.title,
        duration: `${section.lessons?.length * 5}m`,
        lessons: section.lessons?.length || 0,
        description: `An overview of ${section.title}.`,
        topics: section.lessons?.map((lesson: any) => lesson.title) || []
      })) || []
    };
  }

  useEffect(() => {
    const fetchCourseData = async (id: string) => {
      setIsLoading(true);
      setError(null);
      try {
        const { data, error } = await supabase
          .from('courses')
          .select(`
            *,
            sections:course_sections (
              *,
              lessons:course_lessons (
                *
              )
            ),
            members:course_members (
              role,
              profile:profiles (
                *
              )
            )
          `)
          .eq('id', id)
          .single();

        if (error) throw error;
        if (data) {
          // The fetched data structure is different from the builder's state.
          // We need to resolve the image URL for the fetched course.
          if (data.image_url) {
            const { data: signedUrlData, error: urlError } = await supabase.storage.from('dil-lms').createSignedUrl(data.image_url, 3600);
            if (!urlError) {
              data.image = signedUrlData.signedUrl;
            }
          }
          setCourse(mapDataToCourse(data));
        } else {
          throw new Error("Course not found.");
        }
      } catch (err: any) {
        toast.error("Failed to load course.", { description: err.message });
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    if (initialCourseData) {
      setCourse(mapDataToCourse(initialCourseData));
      setIsLoading(false);
    } else if (courseId) {
      fetchCourseData(courseId);
    } else {
      setIsLoading(false);
      setError("No course specified.");
    }
  }, [initialCourseData, courseId]);

  const handleStartLearning = () => {
    if (course) {
      navigate(`/dashboard/course/${course.id}/content`);
    }
  };

  const handlePreview = () => {
    setIsVideoPlaying(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8 h-screen">
        <ContentLoader message="Loading Course..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-8 h-screen text-center">
        <h2 className="text-xl font-semibold text-destructive mb-2">Could not load course</h2>
        <p className="text-muted-foreground mb-4">{error}</p>
        <Button onClick={() => navigate(-1)}>Go Back</Button>
      </div>
    )
  }

  if (!course) {
    return (
      <div className="flex flex-col items-center justify-center p-8 h-screen text-center">
        <h2 className="text-xl font-semibold text-muted-foreground">Course Not Found</h2>
        <p className="text-muted-foreground mb-4">The course you are looking for does not exist or has been moved.</p>
        <Button onClick={() => navigate(-1)}>Go Back</Button>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-background">
      {/* Header */}
      {!isPreviewMode && (
        <div className="border-b border-border bg-card">
          <div className="w-full max-w-none px-4 sm:px-6 lg:px-8 py-4">
            <Button 
              variant="ghost" 
              onClick={() => navigate(-1)}
              className="mb-4"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Courses
            </Button>
          </div>
        </div>
      )}

      {/* Hero Section */}
      <div className="bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20">
        <div className="w-full max-w-none px-4 sm:px-6 lg:px-8 py-12">
          <div className="space-y-8">
            {/* Course Info */}
            <div className="text-center space-y-6">
              <div>
                <Badge className="bg-green-600 hover:bg-green-700 text-white mb-4">
                  AI Tutor Enabled
                </Badge>
                <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                  {course.title}
                </h1>
                <p className="text-lg text-muted-foreground mb-6 max-w-3xl mx-auto">
                  {course.subtitle}
                </p>
              </div>

              {/* Course Stats */}
              <div className="flex flex-wrap items-center justify-center gap-6 text-sm">
                <div className="flex items-center gap-1">
                  <Star className="w-4 h-4 text-yellow-500 fill-current" />
                  <span className="font-semibold">{course.stats.rating}</span>
                  <span className="text-muted-foreground">({course.stats.totalRatings.toLocaleString()})</span>
                </div>
                <div className="flex items-center gap-1">
                  <Users className="w-4 h-4 text-blue-500" />
                  <span>{course.stats.students.toLocaleString()} students</span>
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="w-4 h-4 text-green-500" />
                  <span>{course.stats.duration}</span>
                </div>
                <div className="flex items-center gap-1">
                  <BookOpen className="w-4 h-4 text-purple-500" />
                  <span>{course.stats.lessons} lessons</span>
                </div>
              </div>
            </div>

            {/* Full-width Video Player */}
            <div className="mx-auto">
              <Card>
                <CardContent className="p-0">
                  {/* Video/Image Preview - Full Width */}
                  <div className="relative aspect-video bg-gray-100 rounded-t-lg overflow-hidden min-h-[400px] md:min-h-[500px]">
                    {isVideoPlaying ? (
                      <iframe
                        src={course.videoUrl}
                        className="w-full h-full"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    ) : (
                      <>
                        <img 
                          src={course.thumbnail} 
                          alt={course.title}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                          <Button 
                            onClick={handlePreview}
                            size="lg"
                            className="bg-white/90 hover:bg-white text-black px-8 py-4 text-lg"
                          >
                            <Play className="w-6 h-6 mr-3" />
                            Preview Course
                          </Button>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Progress and CTA */}
                  <div className="p-6 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      {/* Progress Section */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-foreground">Course Progress</span>
                          <span className="text-sm text-muted-foreground">
                            {course.progress.completed}/{course.progress.total} lessons
                          </span>
                        </div>
                        
                        <Progress 
                          value={course.progress.percentage} 
                          className="h-2 bg-gray-200"
                        />
                        
                        <div className="flex justify-between text-sm text-muted-foreground">
                          <span>{course.progress.percentage}% Complete</span>
                          <span>Last accessed: {course.progress.lastAccessed}</span>
                        </div>
                      </div>

                      {/* CTA Section */}
                      <div className="space-y-3">
                        <Button 
                          onClick={handleStartLearning}
                          className="w-full bg-green-600 hover:bg-green-700 text-white py-3 text-lg font-semibold"
                          size="lg"
                        >
                          {course.progress.percentage > 0 ? 'Continue Learning' : 'Start Learning'}
                        </Button>

                        {course.progress.percentage > 0 && (
                          <p className="text-center text-sm text-muted-foreground">
                            Next lesson: {course.progress.nextLesson}
                          </p>
                        )}
                      </div>
                    </div>


                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>

      {/* Course Content */}
      <div className="w-full max-w-none px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          <div className="lg:col-span-3 space-y-8 order-2 lg:order-1">
            {/* What You'll Learn & Course Features */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="w-5 h-5 text-green-500" />
                  What you'll learn & course features
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {course.whatYouLearn.map((item, index) => (
                    <div key={`learn-${index}`} className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <span className="text-sm">{item}</span>
                    </div>
                  ))}
                  {course.features.map((feature, index) => (
                    <div key={`feature-${index}`} className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <span className="text-sm">{feature}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Requirements */}
            <Card>
              <CardHeader>
                <CardTitle>Requirements</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {course.requirements.map((req, index) => (
                    <div key={index} className="flex items-start gap-2">
                      <div className="w-1.5 h-1.5 bg-muted-foreground rounded-full mt-2 flex-shrink-0" />
                      <span className="text-sm">{req}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Course Curriculum */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-blue-500" />
                  Course Curriculum
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Accordion type="multiple" className="w-full">
                  {course.curriculum.map((module, index) => (
                    <AccordionItem key={module.id} value={module.id}>
                      <AccordionTrigger className="hover:no-underline">
                        <div className="flex items-center gap-3 w-full">
                          <div className="flex items-center justify-center w-8 h-8 bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 rounded-full text-sm font-semibold">
                            {index + 1}
                          </div>
                          <div className="flex-1 text-left">
                            <h4 className="font-semibold text-foreground">{module.title}</h4>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                              <div className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                <span>{module.duration}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <BookOpen className="w-3 h-3" />
                                <span>{module.lessons} lessons</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-4 pt-4">
                          <p className="text-sm text-muted-foreground">
                            {module.description}
                          </p>
                          
                          <div className="space-y-2">
                            <h5 className="text-sm font-medium text-foreground">Topics covered:</h5>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                              {module.topics.map((topic, topicIndex) => (
                                <div key={topicIndex} className="flex items-center gap-2 text-sm">
                                  {topicIndex < 2 ? (
                                    <PlayCircle className="w-4 h-4 text-green-500" />
                                  ) : topicIndex < 3 ? (
                                    <FileText className="w-4 h-4 text-blue-500" />
                                  ) : (
                                    <HelpCircle className="w-4 h-4 text-purple-500" />
                                  )}
                                  <span>{topic}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </CardContent>
            </Card>

            {/* Instructor */}
            <Card>
              <CardHeader>
                <CardTitle>Instructor</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-start gap-4">
                  <Avatar className="h-16 w-16">
                    <AvatarFallback className="bg-primary text-primary-foreground text-xl font-bold">
                      {course.instructor.avatar}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <h4 className="text-lg font-semibold text-foreground">
                      {course.instructor.name}
                    </h4>
                    <p className="text-muted-foreground mb-3">
                      {course.instructor.title}
                    </p>
                    <div className="flex flex-wrap gap-6 text-sm">
                      <div className="flex items-center gap-1">
                        <Star className="w-4 h-4 text-yellow-500" />
                        <span>{course.instructor.rating} Instructor Rating</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Users className="w-4 h-4 text-blue-500" />
                        <span>{course.instructor.students.toLocaleString()} Students</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <BookOpen className="w-4 h-4 text-purple-500" />
                        <span>{course.instructor.courses} Courses</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Course Details Sidebar */}
          <div className="lg:col-span-1 order-1 lg:order-2">
            <Card>
              <CardHeader>
                <CardTitle>Course Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Level</p>
                    <p className="font-semibold">{course.stats.level}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Duration</p>
                    <p className="font-semibold">{course.stats.duration}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Lessons</p>
                    <p className="font-semibold">{course.stats.lessons}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Language</p>
                    <p className="font-semibold flex items-center gap-1">
                      <Globe className="w-4 h-4" />
                      {course.stats.language}
                    </p>
                  </div>
                </div>

                <Separator />

                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Smartphone className="w-4 h-4 text-green-500" />
                    <span className="text-sm">Mobile and desktop access</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Download className="w-4 h-4 text-blue-500" />
                    <span className="text-sm">Downloadable content</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Award className="w-4 h-4 text-purple-500" />
                    <span className="text-sm">Certificate of completion</span>
                  </div>
                </div>

                <Separator />

                <div>
                  <p className="text-sm text-muted-foreground">Last updated</p>
                  <p className="font-semibold">{course.stats.lastUpdated}</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}; 