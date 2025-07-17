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
import { useAuth } from '@/hooks/useAuth';

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
  const { user } = useAuth();

  const courseId = propCourseId || paramId;

  // Helper function to determine if a URL is a valid video
  const isValidVideoUrl = (url: string | null | undefined): boolean => {
    if (!url) return false;
    
    // Check for common video platforms and valid video URLs
    const videoPatterns = [
      /^https?:\/\/(?:www\.)?youtube\.com\/embed\/[\w-]+/,
      /^https?:\/\/(?:www\.)?youtube\.com\/watch\?v=[\w-]+/,
      /^https?:\/\/youtu\.be\/[\w-]+/,
      /^https?:\/\/player\.vimeo\.com\/video\/\d+/,
      /^https?:\/\/vimeo\.com\/\d+/,
      /^https?:\/\/.*\.(mp4|webm|ogg|m4v|mov|avi|wmv|flv)(\?.*)?$/i
    ];
    
    // Exclude placeholder/demo URLs
    const placeholderPatterns = [
      /dQw4w9WgXcQ/, // Rick Roll placeholder
      /placeholder/i,
      /demo/i,
      /sample/i
    ];
    
    const isVideo = videoPatterns.some(pattern => pattern.test(url));
    const isPlaceholder = placeholderPatterns.some(pattern => pattern.test(url));
    
    return isVideo && !isPlaceholder;
  };

  const mapDataToCourse = (data: any, instructorExtraData?: any, progressData: any[] = []) => {
    const teacherProfile = data.members?.find((m: any) => m.role === 'teacher')?.profile;
    const firstTeacher = teacherProfile || { first_name: 'Instructor', last_name: 'TBD', email: 'Not available' };
    const teacherName = `${firstTeacher.first_name || ''} ${firstTeacher.last_name || ''}`.trim();
    const getInitials = (name: string) => name.split(' ').map(n => n[0]).join('').toUpperCase();
    const totalLessons = data.sections?.reduce((acc: number, section: any) => acc + (section.lessons?.length || 0), 0) || 0;

    const completedLessonsCount = progressData.filter(p => p.completed_at).length;
    const progressPercentage = totalLessons > 0 ? Math.round((completedLessonsCount / totalLessons) * 100) : 0;
    
    const lastAccessedProgress = [...progressData].sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())[0];
    const lastAccessedDate = lastAccessedProgress ? new Date(lastAccessedProgress.updated_at).toLocaleDateString() : "Never";

    const allLessons = data.sections?.flatMap((s: any) => s.lessons) || [];
    let nextLessonTitle: string;

    if (totalLessons === 0) {
      nextLessonTitle = "No lessons yet";
    } else {
      const completedLessonIds = new Set(progressData.filter(p => p.completed_at).map(p => p.lesson_id));
      if (completedLessonsCount === totalLessons && totalLessons > 0) {
        nextLessonTitle = "Course Complete!";
      } else {
        const firstUncompletedLesson = allLessons.find((l: any) => !completedLessonIds.has(l.id));
        nextLessonTitle = firstUncompletedLesson?.title || allLessons[0]?.title || "First Lesson";
      }
    }

    return {
      id: data.id || 'preview',
      title: data.title,
      subtitle: data.subtitle,
      description: data.description,
      category: data.category?.name,
      thumbnail: data.image || data.image_url || data.thumbnail_url,
      videoUrl: data.video_url || data.preview_video_url,
      hasValidVideo: isValidVideoUrl(data.video_url || data.preview_video_url),
      instructor: {
        name: teacherName,
        title: instructorExtraData?.email || firstTeacher.email || "Email not available",
        avatar: getInitials(teacherName),
        rating: instructorExtraData?.rating || 4.8,
        students: instructorExtraData?.students || 0,
        courses: instructorExtraData?.courses || 0
      },
      stats: {
        rating: 4.9,
        totalRatings: 2847,
        students: data.students?.length || data.members?.filter((m: any) => m.role === 'student').length || 0,
        duration: data.duration || "N/A",
        lessons: totalLessons,
        level: data.level?.name || "All Levels",
        language: data.language?.name || "English",
        lastUpdated: new Date(data.updated_at || Date.now()).toLocaleString('en-US', { month: 'long', year: 'numeric' })
      },
      progress: {
        completed: completedLessonsCount,
        total: totalLessons,
        percentage: progressPercentage,
        lastAccessed: lastAccessedDate,
        nextLesson: nextLessonTitle
      },
      features: [
        `${data.duration || 'Comprehensive'} of on-demand video`,
        `${totalLessons} downloadable lessons`
      ],
      whatYouLearn: data.learning_outcomes || [],
      requirements: data.requirements || [],
      curriculum: data.sections?.map((section: any, index: number) => ({
        id: section.id,
        title: section.title,
        overview: section.overview,
        duration: `${section.lessons?.length * 5}m`,
        lessons: section.lessons?.length || 0,
        description: section.overview || `An overview of ${section.title}.`,
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
            ),
            category:course_categories(name),
            language:course_languages(name),
            level:course_levels(name)
          `)
          .eq('id', id)
          .single();

        if (error) throw error;
        if (data) {
          const teacherProfile = data.members?.find((m: any) => m.role === 'teacher')?.profile;
          let instructorExtraData = {};

          if (teacherProfile) {
            // First, get all the course_ids for the current instructor
            const { data: teacherCourseMemberships, error: membershipsError } = await supabase
              .from('course_members')
              .select('course_id')
              .eq('user_id', teacherProfile.id)
              .eq('role', 'teacher');

            let coursesCount = 0;
            let studentCount = 0;

            if (membershipsError) {
              console.error("Error fetching teacher's courses:", membershipsError.message);
            } else if (teacherCourseMemberships && teacherCourseMemberships.length > 0) {
              const courseIds = teacherCourseMemberships.map(m => m.course_id);

              // Count only the published courses
              const { count: publishedCoursesCount, error: coursesError } = await supabase
                .from('courses')
                .select('id', { count: 'exact', head: true })
                .in('id', courseIds)
                .eq('status', 'Published');

              if (coursesError) {
                console.error("Error fetching published courses count:", coursesError.message);
              } else {
                coursesCount = publishedCoursesCount || 0;
              }

              // Now, count all the students in the teacher's courses
              if (courseIds.length > 0) {
                const { count, error: studentCountError } = await supabase
                  .from('course_members')
                  .select('id', { count: 'exact', head: true })
                  .in('course_id', courseIds)
                  .eq('role', 'student');
                
                if (studentCountError) {
                  console.error("Error fetching student count:", studentCountError.message);
                } else {
                  studentCount = count || 0;
                }
              }
            }
            
            instructorExtraData = {
              email: teacherProfile.email,
              courses: coursesCount,
              students: studentCount,
              rating: teacherProfile.rating || 4.8,
            };
          }
          
          let userProgress: any[] = [];
          if (user && !isPreviewMode) {
              const lessonIds = data.sections?.flatMap((s: any) => s.lessons?.map((l: any) => l.id)).filter(Boolean) || [];
              if (lessonIds.length > 0) {
                  const { data: progressData, error: progressError } = await supabase
                      .from('user_course_progress')
                      .select('*')
                      .eq('user_id', user.id)
                      .in('lesson_id', lessonIds);
                  if (progressError) {
                      console.error("Failed to fetch user progress:", progressError.message);
                      toast.warning("Could not load your course progress.");
                  } else {
                      userProgress = progressData || [];
                  }
              }
          }

          if (data.image_url) {
            const { data: signedUrlData, error: urlError } = await supabase.storage.from('dil-lms').createSignedUrl(data.image_url, 3600);
            if (!urlError) {
              data.image = signedUrlData.signedUrl;
            }
          }
          const finalCourseObject = mapDataToCourse(data, instructorExtraData, userProgress);
          setCourse(finalCourseObject);
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
  }, [initialCourseData, courseId, user, isPreviewMode]);

  const handleStartLearning = () => {
    if (course) {
      navigate(`/dashboard/courses/${course.id}/content`);
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
              onClick={() => navigate('/dashboard/courses')}
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
                {course.category && (
                  <Badge className="bg-blue-600 hover:bg-blue-700 text-white mb-4">
                    {course.category}
                  </Badge>
                )}
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
                    {course.hasValidVideo && course.videoUrl ? (
                      // Valid video available
                      isVideoPlaying ? (
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
                      )
                    ) : course.thumbnail ? (
                      // Image only available
                      <img 
                        src={course.thumbnail} 
                        alt={course.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      // No content available
                      <div className="w-full h-full flex items-center justify-center bg-muted">
                        <div className="text-center p-8">
                          <PlayCircle className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                          <p className="text-muted-foreground text-lg font-medium">No preview available</p>
                          <p className="text-muted-foreground/60 text-sm mt-2">Course content will be available soon</p>
                        </div>
                      </div>
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

            {/* Requirements - only show if there are requirements */}
            {course.requirements && course.requirements.length > 0 && (
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
            )}

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
                          {module.overview && (
                            <p className="text-sm text-muted-foreground">
                              {module.overview}
                            </p>
                          )}
                          
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