import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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
  Smartphone,
  Download,
  ArrowLeft,
  PlayCircle,
  FileText,
  HelpCircle,
  TrendingUp,
  Target,
  Calendar,
  BarChart3,
  GraduationCap,
  Sparkles,
  CreditCard,
  Lock
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
  teachers: { name: string; email: string; avatar_url?: string; }[];
  students: { id: string; }[];
  duration?: string;
  level?: string;
  language?: string;
  // Stripe payment fields
  payment_type?: 'free' | 'paid';
  course_price?: number; // Price in USD cents
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
  const [isStripeEnabled, setIsStripeEnabled] = useState(false);
  const [originalCourseData, setOriginalCourseData] = useState<any>(null);
  const { user } = useAuth();

  const courseId = propCourseId || paramId;

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
          console.log('Stripe integration data:', data);
          console.log('Stripe enabled:', isEnabled);
          console.log('Status:', data.status, 'Configured:', data.is_configured);
          setIsStripeEnabled(isEnabled);
        } else {
          console.log('Stripe integration not found or error occurred');
          console.log('Error details:', error);
          setIsStripeEnabled(false);
        }
      } catch (error) {
        console.error('Error checking Stripe integration:', error);
        setIsStripeEnabled(false);
      }
    };
    
    checkStripeIntegration();
  }, []);

  // Debug logging for Stripe and payment status
  useEffect(() => {
    console.log('Stripe and payment status changed:', {
      isStripeEnabled,
      coursePayment: course?.payment,
      shouldShowPaymentButton: isStripeEnabled && course?.payment?.isPaid,
      paymentDetails: course?.payment ? {
        type: course.payment.type,
        price: course.payment.price,
        priceFormatted: course.payment.priceFormatted,
        isPaid: course.payment.isPaid
      } : 'No payment data'
    });
  }, [isStripeEnabled, course?.payment]);

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

  const mapDataToCourse = (data: any, instructorExtraData?: any, progressData: any[] = [], stripeEnabled: boolean = false) => {
    const allLessons = data.sections?.flatMap((s: any) => s.lessons) || [];
    const totalLessons = allLessons.length;

    const allContentItems = allLessons.flatMap((l: any) => l.contentItems || []);
    const totalContentItems = allContentItems.length;

    const completedContentItemIds = new Set(progressData.filter(p => p.completed_at).map(p => p.lesson_content_id));
    
    let completedLessonsCount = 0;
    const completedLessonIds = new Set();
    if (allLessons.length > 0) {
      allLessons.forEach((lesson: any) => {
        const lessonContentItems = lesson.contentItems || [];
        if (lessonContentItems.length > 0 && lessonContentItems.every((ci: any) => completedContentItemIds.has(ci.id))) {
          completedLessonsCount++;
          completedLessonIds.add(lesson.id);
        }
      });
    }

    const progressPercentage = totalContentItems > 0
      ? Math.round((completedContentItemIds.size / totalContentItems) * 100)
      : 0;

    const lastAccessedProgress = [...progressData].sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())[0];
    const lastAccessedDate = lastAccessedProgress ? new Date(lastAccessedProgress.updated_at).toLocaleDateString() : "Never";

    let nextLessonTitle: string;
    if (totalLessons === 0) {
      nextLessonTitle = "No lessons yet";
    } else if (completedLessonsCount === totalLessons) {
      nextLessonTitle = "Course Complete!";
    } else {
      const firstUncompletedLesson = allLessons.find((l: any) => !completedLessonIds.has(l.id));
      nextLessonTitle = firstUncompletedLesson?.title || allLessons[0]?.title || "First Lesson";
    }

    const teacherProfile = data.members?.find((m: any) => m.role === 'teacher')?.profile;
    const previewTeacher = data.teachers?.[0];

    let teacherName: string;
    let teacherEmail: string;
    let teacherAvatar: string | null = null;

    if (previewTeacher && previewTeacher.name) {
      teacherName = previewTeacher.name;
      teacherEmail = previewTeacher.email || 'Not available';
      teacherAvatar = previewTeacher.avatar_url || null;
    } else if (teacherProfile) {
      teacherName = `${teacherProfile.first_name || ''} ${teacherProfile.last_name || ''}`.trim() || 'Teacher TBD';
      teacherEmail = teacherProfile.email || 'Not available';
      teacherAvatar = teacherProfile.avatar_url || null;
    } else {
      teacherName = 'Teacher TBD';
      teacherEmail = 'Not available';
      teacherAvatar = null;
    }

    const getInitials = (name: string) => (name.split(' ').map(n => n[0]).join('').toUpperCase() || 'T');

    return {
      id: data.id || 'preview',
      title: data.title,
      subtitle: data.subtitle,
      description: data.description,
      category: typeof data.category === 'string' ? data.category : data.category?.name,
      thumbnail: data.image || data.image_url || data.thumbnail_url,
      videoUrl: data.video_url || data.preview_video_url,
      hasValidVideo: isValidVideoUrl(data.video_url || data.preview_video_url),
      instructor: {
        name: teacherName,
        title: instructorExtraData?.email || teacherEmail,
        avatar: teacherAvatar,
        initials: getInitials(teacherName),
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
        level: typeof data.level === 'string' ? data.level : data.level?.name || "All Levels",
        language: typeof data.language === 'string' ? data.language : data.language?.name || "English",
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
      // Payment information
      payment: (() => {
        const paymentType = stripeEnabled ? (data.payment_type || 'free') : 'free';
        const price = stripeEnabled ? (data.course_price || 0) : 0;
        const priceFormatted = stripeEnabled && data.course_price ? `$${(data.course_price / 100).toFixed(2)}` : 'Free';
        const isPaid = stripeEnabled && data.payment_type === 'paid' && (data.course_price || 0) > 0;
        
        console.log('Payment calculation in mapDataToCourse:', {
          stripeEnabled,
          rawPaymentType: data.payment_type,
          rawCoursePrice: data.course_price,
          calculatedType: paymentType,
          calculatedPrice: price,
          calculatedPriceFormatted: priceFormatted,
          calculatedIsPaid: isPaid
        });
        
        return {
          type: paymentType,
          price: price,
          priceFormatted: priceFormatted,
          isPaid: isPaid
        };
      })(),
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
    const fetchAndSetCourse = async (id: string) => {
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
                *,
                contentItems:course_lesson_content(id)
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

              // Now, count all the unique students in the teacher's courses
              if (courseIds.length > 0) {
                const { data: studentMembers, error: studentCountError } = await supabase
                  .from('course_members')
                  .select('user_id')
                  .in('course_id', courseIds)
                  .eq('role', 'student');
                
                if (studentCountError) {
                  console.error("Error fetching student count:", studentCountError.message);
                } else if (studentMembers) {
                  const uniqueStudentIds = new Set(studentMembers.map(m => m.user_id));
                  studentCount = uniqueStudentIds.size;
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
            const contentItemIds = data.sections?.flatMap((s: any) => s.lessons?.flatMap((l: any) => l.contentItems?.map((ci: any) => ci.id))).filter(Boolean) || [];
            if (contentItemIds.length > 0) {
              const { data: progressData, error: progressError } = await supabase
                .from('user_content_item_progress')
                .select('*')
                .eq('user_id', user.id)
                .in('lesson_content_id', contentItemIds);

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
          console.log('Course data payment info:', {
            payment_type: data.payment_type,
            course_price: data.course_price,
            isStripeEnabled: isStripeEnabled
          });
          
          // Store original course data for re-processing
          console.log('Storing original course data:', { payment_type: data.payment_type, course_price: data.course_price });
          setOriginalCourseData({ data, instructorExtraData, userProgress });
          
          const finalCourseObject = mapDataToCourse(data, instructorExtraData, userProgress, isStripeEnabled);
          console.log('Final course payment object:', finalCourseObject.payment);
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
      // Logic for Preview Mode
      const primaryTeacher = initialCourseData.teachers?.[0];
      let instructorExtraData = {};

      if (primaryTeacher) {
        // In a real app with more complex data, you might need to fetch this.
        // For preview, we can derive it or use placeholder logic.
        // This is a simplified calculation for the preview.
        instructorExtraData = {
          email: primaryTeacher.email,
          courses: 1, // Placeholder: Represents the current course
          students: initialCourseData.students?.length || 0,
          rating: 4.8, // Placeholder rating
        };
      }
      
      // Store original course data for re-processing in preview mode too
      console.log('Storing original course data (preview mode):', { 
        payment_type: initialCourseData.payment_type, 
        course_price: initialCourseData.course_price 
      });
      setOriginalCourseData({ data: initialCourseData, instructorExtraData, userProgress: [] });
      
      const mappedCourse = mapDataToCourse(initialCourseData, instructorExtraData, [], isStripeEnabled);
      setCourse(mappedCourse);
      setIsLoading(false);
    } else if (courseId) {
      // Logic for Live Mode
      fetchAndSetCourse(courseId);
    } else {
      setIsLoading(false);
      setError("No course specified.");
    }
  }, [initialCourseData, courseId, user, isPreviewMode]);

  // Re-check Stripe status when course data changes (in case of timing issues)
  useEffect(() => {
    if (course && !isStripeEnabled) {
      console.log('Re-checking Stripe status due to course data change');
      const checkStripeIntegration = async () => {
        try {
          let { data, error } = await supabase
            .from('integrations')
            .select('status, is_configured')
            .eq('name', 'Stripe')
            .single();
          
          if (error && error.code === 'PGRST116') {
            const result = await supabase
              .from('integrations')
              .select('status, is_configured')
              .eq('name', 'stripe')
              .single();
            data = result.data;
            error = result.error;
          }
          
          if (!error && data) {
            const isEnabled = data.status === 'enabled' && data.is_configured;
            console.log('Re-check Stripe enabled:', isEnabled);
            setIsStripeEnabled(isEnabled);
          }
        } catch (error) {
          console.error('Error re-checking Stripe integration:', error);
        }
      };
      
      checkStripeIntegration();
    }
  }, [course, isStripeEnabled]);

  // Re-process course data when Stripe status changes from false to true
  useEffect(() => {
    console.log('Re-processing effect triggered:', {
      originalCourseData: !!originalCourseData,
      isStripeEnabled,
      course: !!course,
      coursePayment: course?.payment,
      shouldReprocess: originalCourseData && isStripeEnabled && course && course.payment && course.payment.type === 'free' && course.payment.price === 0
    });
    
    if (originalCourseData && isStripeEnabled && course && course.payment && course.payment.type === 'free' && course.payment.price === 0) {
      console.log('Re-processing course data with Stripe enabled using original data');
      
      // Re-process the course data with Stripe enabled using original data
      const finalCourseObject = mapDataToCourse(originalCourseData.data, originalCourseData.instructorExtraData, originalCourseData.userProgress, isStripeEnabled);
      console.log('Re-processed course payment object:', finalCourseObject.payment);
      setCourse(finalCourseObject);
    }
  }, [isStripeEnabled, originalCourseData, course]);

  // Alternative approach: Force re-process when Stripe becomes enabled
  useEffect(() => {
    if (isStripeEnabled && course && course.payment && course.payment.type === 'free' && course.payment.price === 0) {
      console.log('Alternative re-processing triggered - Stripe enabled but course shows as free');
      
      // Force update the course payment to paid if we have the original data
      if (originalCourseData && originalCourseData.data.payment_type === 'paid' && originalCourseData.data.course_price > 0) {
        console.log('Forcing payment update with original data:', {
          payment_type: originalCourseData.data.payment_type,
          course_price: originalCourseData.data.course_price
        });
        
        const updatedCourse = {
          ...course,
          payment: {
            type: 'paid',
            price: originalCourseData.data.course_price,
            priceFormatted: `$${(originalCourseData.data.course_price / 100).toFixed(2)}`,
            isPaid: true
          }
        };
        
        console.log('Updated course payment:', updatedCourse.payment);
        setCourse(updatedCourse);
      }
    }
  }, [isStripeEnabled, course, originalCourseData]);

  const handleStartLearning = () => {
    if (course) {
      navigate(`/dashboard/courses/${course.id}/content`);
    }
  };

  const handlePreview = () => {
    setIsVideoPlaying(true);
  };

  const handleProceedToPayment = () => {
    // TODO: Implement Stripe checkout flow
    toast.info("Payment integration coming soon!", {
      description: "Stripe checkout will be implemented here."
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-8 mx-auto">
        {/* Premium Header Section */}
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-primary/5 rounded-3xl"></div>
          <div className="relative p-8 rounded-3xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-primary/10 to-primary/20 rounded-2xl flex items-center justify-center shadow-lg">
                  <BookOpen className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-primary via-primary to-primary/80 bg-clip-text text-transparent" style={{ backgroundClip: 'text', WebkitBackgroundClip: 'text' }}>
                    Course Overview
                  </h1>
                  <p className="text-lg text-muted-foreground mt-2 leading-relaxed">
                    Explore course content and learning objectives
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="py-12">
          <ContentLoader message="Loading Course..." />
        </div>
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
    <div className="min-h-full bg-background overflow-x-hidden">
      {/* Premium Header */}
      {!isPreviewMode && (
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-primary/5"></div>
          <div className="relative border-b border-gray-200/50 dark:border-gray-700/50 bg-gradient-to-br from-card to-card/50 dark:bg-card">
            <div className="w-full max-w-none px-4 sm:px-6 lg:px-8 py-6">
              <Button 
                variant="outline" 
                onClick={() => navigate('/dashboard/courses')}
                className="mb-4 h-10 px-4 rounded-xl font-semibold hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all duration-300 hover:-translate-y-0.5 shadow-lg hover:shadow-xl"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Courses
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Enhanced Hero Section */}
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-900/20 dark:to-gray-800/20"></div>
        <div className="relative w-full max-w-none px-4 sm:px-6 lg:px-8 py-8 sm:py-12 lg:py-16">
          <div className="space-y-12">
            {/* Premium Course Info */}
            <div className="text-center space-y-8">
              <div>
                {course.category && (
                  <Badge className="bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary text-primary-foreground mb-6 px-4 py-2 text-sm font-medium shadow-lg">
                    {course.category}
                  </Badge>
                )}
                <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900 dark:text-gray-100 mb-6 leading-tight break-words">
                  {course.title}
                </h1>
                <p className="text-xl text-muted-foreground mb-8 max-w-4xl mx-auto leading-relaxed">
                  {course.subtitle}
                </p>
              </div>

              {/* Enhanced Course Stats */}
              <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-8 text-sm">
                <div className="flex items-center gap-2 bg-gradient-to-br from-card/80 to-card/60 dark:bg-card/80 backdrop-blur-sm px-4 py-2 rounded-xl border border-gray-200/50 dark:border-gray-600/50 shadow-lg">
                  <Users className="w-5 h-5 text-primary" />
                  <span className="font-medium text-gray-900 dark:text-gray-100">{course.stats.students.toLocaleString()} students</span>
                </div>
                <div className="flex items-center gap-2 bg-gradient-to-br from-card/80 to-card/60 dark:bg-card/80 backdrop-blur-sm px-4 py-2 rounded-xl border border-gray-200/50 dark:border-gray-600/50 shadow-lg">
                  <Clock className="w-5 h-5 text-primary" />
                  <span className="font-medium text-gray-900 dark:text-gray-100">{course.stats.duration}</span>
                </div>
                <div className="flex items-center gap-2 bg-gradient-to-br from-card/80 to-card/60 dark:bg-card/80 backdrop-blur-sm px-4 py-2 rounded-xl border border-gray-200/50 dark:border-gray-600/50 shadow-lg">
                  <BookOpen className="w-5 h-5 text-primary" />
                  <span className="font-medium text-gray-900 dark:text-gray-100">{course.stats.lessons} lessons</span>
                </div>
                {/* Course Price Display */}
                <div className="flex items-center gap-2 bg-gradient-to-br from-card/80 to-card/60 dark:bg-card/80 backdrop-blur-sm px-4 py-2 rounded-xl border border-gray-200/50 dark:border-gray-600/50 shadow-lg">
                  {course.payment.isPaid ? (
                    <>
                      <CreditCard className="w-5 h-5 text-primary" />
                      <span className="font-medium text-gray-900 dark:text-gray-100">{course.payment.priceFormatted}</span>
                    </>
                  ) : (
                    <>
                      <Award className="w-5 h-5 text-primary" />
                      <span className="font-medium text-gray-900 dark:text-gray-100">Free</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Premium Video Player */}
            <div className="mx-auto w-full sm:w-[90%]">
              <Card className="bg-gradient-to-br from-card to-card/50 dark:bg-card border border-gray-200/50 dark:border-gray-700/50 backdrop-blur-sm shadow-xl rounded-3xl overflow-hidden">
                <CardContent className="p-0">
                  {/* Enhanced Video/Image Preview */}
                  <div className="relative aspect-video bg-gray-100 rounded-t-lg overflow-hidden min-h-[200px] sm:min-h-[300px] md:min-h-[450px]">
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
                          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                            <Button 
                              onClick={handlePreview}
                              size="lg"
                              className="bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary text-white px-8 py-4 text-lg font-semibold shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-1"
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

                  {/* Enhanced Progress and CTA */}
                  <div className="p-8 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      {/* Enhanced Progress Section */}
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <span className="text-lg font-semibold text-gray-900 dark:text-gray-100">Course Progress</span>
                          <span className="text-sm text-muted-foreground">
                            {course.progress.completed}/{course.progress.total} lessons
                          </span>
                        </div>
                        
                        <Progress 
                          value={course.progress.percentage} 
                          className="h-3 bg-gray-200 dark:bg-gray-700"
                        />
                        
                        <div className="flex justify-between text-sm text-muted-foreground">
                          <span className="font-medium text-primary">{course.progress.percentage}% Complete</span>
                          <span>Last accessed: {course.progress.lastAccessed}</span>
                        </div>
                      </div>

                      {/* Enhanced CTA Section */}
                      <div className="space-y-4">
                        {/* Show different buttons based on payment status and Stripe integration */}
                        {isStripeEnabled && course.payment.isPaid ? (
                          <Button 
                            onClick={handleProceedToPayment}
                            disabled={true}
                            className="w-full bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary text-white py-4 text-lg font-semibold shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 disabled:opacity-50 disabled:cursor-not-allowed"
                            size="lg"
                          >
                            <Lock className="w-5 h-5 mr-2" />
                            Proceed to Payment
                          </Button>
                        ) : (
                          <Button 
                            onClick={handleStartLearning}
                            className="w-full bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary text-white py-4 text-lg font-semibold shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-1"
                            size="lg"
                          >
                            {course.progress.percentage > 0 ? 'Continue Learning' : 'Start Learning'}
                          </Button>
                        )}

                        {course.progress.percentage > 0 && !(isStripeEnabled && course.payment.isPaid) && (
                          <p className="text-center text-sm text-muted-foreground">
                            Next lesson: {course.progress.nextLesson}
                          </p>
                        )}

                        {isStripeEnabled && course.payment.isPaid && (
                          <p className="text-center text-sm text-muted-foreground">
                            Complete payment to access course content
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

      {/* Enhanced Course Content - McKinsey-Level Strategic Layout */}
      <div className="w-full max-w-none px-4 sm:px-6 lg:px-8 py-12">
        {/* Strategic Information Grid - Balanced Layout */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
          
          {/* Left Column - Main Content (Strategic Priority) */}
          <div className="xl:col-span-8 space-y-8 order-2 xl:order-1">
            
            {/* What You'll Learn - Strategic Outcomes First */}
            <Card className="bg-gradient-to-br from-card to-card/50 dark:bg-card border border-gray-200/50 dark:border-gray-700/50 backdrop-blur-sm rounded-2xl shadow-lg">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-3 text-xl text-gray-900 dark:text-gray-100">
                  <Target className="w-6 h-6 text-primary" />
                  Strategic Learning Outcomes
                </CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  Key competencies and skills you'll develop through this course
                </p>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {course.whatYouLearn.map((item, index) => (
                    <div key={`learn-${index}`} className="flex items-start gap-3 p-4 rounded-xl bg-gradient-to-br from-primary/5 to-primary/15 border border-primary/20 dark:border-primary/10 shadow-sm hover:shadow-md transition-all duration-300">
                      <div className="w-6 h-6 bg-primary/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-xs font-bold text-primary">{index + 1}</span>
                      </div>
                      <span className="text-sm font-medium text-gray-900 dark:text-gray-100 leading-relaxed">{item}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Course Features - Value Proposition */}
            <Card className="bg-gradient-to-br from-card to-card/50 dark:bg-card border border-gray-200/50 dark:border-gray-700/50 backdrop-blur-sm rounded-2xl shadow-lg">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-3 text-xl text-gray-900 dark:text-gray-100">
                  <Sparkles className="w-6 h-6 text-primary" />
                  Course Features & Benefits
                </CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  What makes this course unique and valuable
                </p>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {course.features.map((feature, index) => (
                    <div key={`feature-${index}`} className="flex items-start gap-3 p-4 rounded-xl bg-gradient-to-br from-primary/5 to-primary/15 border border-primary/20 dark:border-primary/10 shadow-sm hover:shadow-md transition-all duration-300">
                      <CheckCircle className="w-5 h-5 text-green-500 dark:text-green-400 mt-0.5 flex-shrink-0" />
                      <span className="text-sm font-medium text-gray-900 dark:text-gray-100 leading-relaxed">{feature}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Requirements - Prerequisites & Expectations */}
            {course.requirements && course.requirements.length > 0 && (
              <Card className="bg-gradient-to-br from-card to-card/50 dark:bg-card border border-gray-200/50 dark:border-gray-700/50 backdrop-blur-sm rounded-2xl shadow-lg">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-3 text-xl text-gray-900 dark:text-gray-100">
                    <Target className="w-6 h-6 text-primary" />
                    Prerequisites & Requirements
                  </CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    What you need to know before starting this course
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {course.requirements.map((req, index) => (
                      <div key={index} className="flex items-start gap-3 p-4 rounded-xl bg-gradient-to-br from-primary/5 to-primary/15 border border-primary/20 dark:border-primary/10 shadow-sm hover:shadow-md transition-all duration-300">
                        <div className="w-6 h-6 bg-primary/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                          <span className="text-xs font-bold text-primary">{index + 1}</span>
                        </div>
                        <span className="text-sm font-medium text-gray-900 dark:text-gray-100 leading-relaxed">{req}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Course Curriculum - Strategic Learning Path */}
            <Card className="bg-gradient-to-br from-card to-card/50 dark:bg-card border border-gray-200/50 dark:border-gray-700/50 backdrop-blur-sm rounded-2xl shadow-lg">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-3 text-xl text-gray-900 dark:text-gray-100">
                  <BookOpen className="w-6 h-6 text-primary" />
                  Strategic Learning Path
                </CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  Structured curriculum designed for optimal learning progression
                </p>
              </CardHeader>
              <CardContent>
                <Accordion type="multiple" className="w-full">
                  {course.curriculum.map((module, index) => (
                    <AccordionItem key={module.id} value={module.id} className="border border-gray-200/50 dark:border-gray-700/30 rounded-xl mb-3 last:mb-0">
                      <AccordionTrigger className="hover:no-underline px-4 py-3 rounded-xl hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-colors">
                        <div className="flex items-center gap-4 w-full">
                          <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-br from-primary/10 to-primary/20 text-primary rounded-xl text-sm font-bold shadow-sm">
                            {index + 1}
                          </div>
                          <div className="flex-1 text-left">
                            <h4 className="font-semibold text-gray-900 dark:text-gray-100 text-lg">{module.title}</h4>
                            <div className="flex items-center gap-6 text-sm text-muted-foreground mt-2">
                              <div className="flex items-center gap-2">
                                <Clock className="w-4 h-4" />
                                <span>{module.duration}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <BookOpen className="w-4 h-4" />
                                <span>{module.lessons} lessons</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="px-4 pb-4">
                        <div className="space-y-4 pt-4">
                          {module.overview && (
                            <p className="text-sm text-muted-foreground leading-relaxed bg-gray-50/50 dark:bg-gray-800/30 p-3 rounded-lg">
                              {module.overview}
                            </p>
                          )}
                          
                          <div className="space-y-3">
                            <h5 className="text-sm font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                              <PlayCircle className="w-4 h-4 text-primary" />
                              Topics covered:
                            </h5>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              {module.topics.map((topic, topicIndex) => (
                                <div key={topicIndex} className="flex items-center gap-3 p-3 rounded-lg bg-gradient-to-br from-gray-50 to-gray-100/50 dark:from-gray-800/50 dark:to-gray-700/50 border border-gray-200/50 dark:border-gray-600/50 shadow-sm">
                                  <div className="w-2 h-2 bg-primary rounded-full flex-shrink-0"></div>
                                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{topic}</span>
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

            {/* Instructor Profile - Credibility & Expertise */}
            <Card className="bg-gradient-to-br from-card to-card/50 dark:bg-card border border-gray-200/50 dark:border-gray-700/50 backdrop-blur-sm rounded-2xl shadow-lg">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-3 text-xl text-gray-900 dark:text-gray-100">
                  <GraduationCap className="w-6 h-6 text-primary" />
                  Expert Instructor
                </CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  Learn from industry professionals with proven expertise
                </p>
              </CardHeader>
              <CardContent>
                <div className="flex items-start gap-6">
                  <Avatar className="h-20 w-20 shadow-lg border-2 border-primary/20">
                    <AvatarImage 
                      src={course.instructor.avatar} 
                      alt={course.instructor.name}
                    />
                    <AvatarFallback className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground text-2xl font-bold">
                      {course.instructor.initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <h4 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
                      {course.instructor.name}
                    </h4>
                    <p className="text-muted-foreground mb-4 leading-relaxed">
                      {course.instructor.title}
                    </p>
                    <div className="flex flex-wrap gap-4 text-sm">
                      <div className="flex items-center gap-2 bg-gradient-to-br from-primary/10 to-primary/20 px-4 py-2 rounded-xl border border-primary/20 dark:border-primary/10 shadow-sm">
                        <Users className="w-4 h-4 text-primary" />
                        <span className="font-medium text-gray-900 dark:text-gray-100">{course.instructor.students.toLocaleString()} Students</span>
                      </div>
                      <div className="flex items-center gap-2 bg-gradient-to-br from-primary/10 to-primary/20 px-4 py-2 rounded-xl border border-primary/20 dark:border-primary/10 shadow-sm">
                        <BookOpen className="w-4 h-4 text-primary" />
                        <span className="font-medium text-gray-900 dark:text-gray-100">{course.instructor.courses} Courses</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Strategic Sidebar (Supporting Information) */}
          <div className="xl:col-span-4 space-y-6 order-1 xl:order-2">
            
            {/* Course Details - Key Metrics */}
            <Card className={`bg-gradient-to-br from-card to-card/50 dark:bg-card border border-gray-200/50 dark:border-gray-700/50 backdrop-blur-sm rounded-2xl shadow-lg ${!isPreviewMode ? 'xl:sticky xl:top-8' : ''}`}>
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-3 text-lg text-gray-900 dark:text-gray-100">
                  <BarChart3 className="w-5 h-5 text-primary" />
                  Course Metrics
                </CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  Key performance indicators and course statistics
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="text-center p-3 sm:p-4 rounded-xl bg-gradient-to-br from-primary/5 to-primary/15 border border-primary/20 dark:border-primary/10 shadow-sm">
                    <div className="text-sm sm:text-lg lg:text-xl font-bold text-primary mb-1 whitespace-nowrap overflow-hidden text-ellipsis" title={course.stats.level}>{course.stats.level}</div>
                    <div className="text-xs text-muted-foreground">Level</div>
                  </div>
                  <div className="text-center p-3 sm:p-4 rounded-xl bg-gradient-to-br from-primary/5 to-primary/15 border border-primary/20 dark:border-primary/10 shadow-sm">
                    <div className="text-sm sm:text-lg lg:text-xl font-bold text-primary mb-1">{course.stats.lessons}</div>
                    <div className="text-xs text-muted-foreground">Lessons</div>
                  </div>
                </div>
                
                  <div className="space-y-3">
                  <div className="flex justify-between items-center p-3 rounded-xl bg-gradient-to-br from-gray-50 to-gray-100/50 dark:from-gray-800/50 dark:to-gray-700/50 border border-gray-200/50 dark:border-gray-600/50 shadow-sm">
                      <span className="text-sm text-muted-foreground">Duration</span>
                      <span className="font-semibold text-gray-900 dark:text-gray-100">{course.stats.duration}</span>
                    </div>
                  <div className="flex justify-between items-center p-3 rounded-xl bg-gradient-to-br from-gray-50 to-gray-100/50 dark:from-gray-800/50 dark:to-gray-700/50 border border-gray-200/50 dark:border-gray-600/50 shadow-sm">
                      <span className="text-sm text-muted-foreground">Language</span>
                      <span className="font-semibold text-gray-900 dark:text-gray-100">{course.stats.language}</span>
                    </div>
                  <div className="flex justify-between items-center p-3 rounded-xl bg-gradient-to-br from-gray-50 to-gray-100/50 dark:from-gray-800/50 dark:to-gray-700/50 border border-gray-200/50 dark:border-gray-600/50 shadow-sm">
                      <span className="text-sm text-muted-foreground">Last updated</span>
                      <span className="font-semibold text-gray-900 dark:text-gray-100">{course.stats.lastUpdated}</span>
                    </div>
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions - Strategic Next Steps */}
            {!isPreviewMode && (
              <Card className="bg-gradient-to-br from-card to-card/50 dark:bg-card border border-gray-200/50 dark:border-gray-700/50 backdrop-blur-sm rounded-2xl shadow-lg">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-3 text-lg text-gray-900 dark:text-gray-100">
                    <TrendingUp className="w-5 h-5 text-primary" />
                    Next Steps
                  </CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    Recommended actions to maximize your learning
                  </p>
                </CardHeader>
                <CardContent className="space-y-3">
                  {/* Show different buttons based on payment status and Stripe integration */}
                  {isStripeEnabled && course.payment.isPaid ? (
                    <Button 
                      onClick={handleProceedToPayment}
                      disabled={true}
                      className="w-full bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary text-white py-3 text-base font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Lock className="w-4 h-4 mr-2" />
                      Proceed to Payment
                    </Button>
                  ) : (
                    <Button 
                      onClick={handleStartLearning}
                      className="w-full bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary text-white py-3 text-base font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5"
                    >
                      {course.progress.percentage > 0 ? 'Continue Learning' : 'Start Learning'}
                    </Button>
                  )}
                  
                  {course.progress.percentage > 0 && !(isStripeEnabled && course.payment.isPaid) && (
                    <div className="text-center p-3 rounded-xl bg-gradient-to-br from-green-50 to-green-100/50 dark:from-green-900/10 dark:to-green-800/10 border border-green-200/50 dark:border-green-700/30">
                      <p className="text-sm font-medium text-green-800 dark:text-green-200 mb-1">Next lesson:</p>
                      <p className="text-xs text-green-700 dark:text-green-300">{course.progress.nextLesson}</p>
                    </div>
                  )}

                  {isStripeEnabled && course.payment.isPaid && (
                    <div className="text-center p-3 rounded-xl bg-gradient-to-br from-amber-50 to-amber-100/50 dark:from-amber-900/10 dark:to-amber-800/10 border border-amber-200/50 dark:border-amber-700/30">
                      <p className="text-sm font-medium text-amber-800 dark:text-amber-200 mb-1">Payment Required</p>
                      <p className="text-xs text-amber-700 dark:text-amber-300">Complete payment to access course content</p>
                    </div>
                  )}
                </CardContent>
            </Card>
            )}

            {/* Progress Overview - Performance Metrics */}
            {!isPreviewMode && (
              <Card className="bg-gradient-to-br from-card to-card/50 dark:bg-card border border-gray-200/50 dark:border-gray-700/50 backdrop-blur-sm rounded-2xl shadow-lg">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-3 text-lg text-gray-900 dark:text-gray-100">
                    <BarChart3 className="w-5 h-5 text-primary" />
                    Your Progress
                  </CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    Track your learning journey and achievements
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-900 dark:text-gray-100">Completion</span>
                      <span className="text-sm text-muted-foreground">
                        {course.progress.completed}/{course.progress.total} lessons
                      </span>
          </div>
                    
                    <Progress 
                      value={course.progress.percentage} 
                      className="h-2 bg-gray-200 dark:bg-gray-700"
                    />
                    
                    <div className="text-center">
                      <span className="text-lg font-bold text-primary">{course.progress.percentage}% Complete</span>
                    </div>
                  </div>
                  
                  <div className="text-center p-3 rounded-xl bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-900/10 dark:to-blue-800/10 border border-blue-200/50 dark:border-blue-700/30">
                    <p className="text-xs text-blue-700 dark:text-blue-300">
                      Last accessed: {course.progress.lastAccessed}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}; 