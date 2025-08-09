import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/EmptyState';
import { BookOpen, TrendingUp, Clock, Award, Play, CheckCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ContentLoader } from '../ContentLoader';

type Profile = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  role: string;
  [key: string]: any;
};

interface Course {
  id: string;
  title: string;
  subtitle: string;
  image_url: string;
  progress?: number;
}

interface StudentCoursesProps {
  userProfile: Profile;
}

export const StudentCourses = ({ userProfile }: StudentCoursesProps) => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCourses = async () => {
      setLoading(true);
      
      const { data, error } = await supabase.rpc('get_student_courses_with_progress', { student_id: userProfile.id });

      if (error) {
        console.error("Error fetching student courses with progress:", error);
        toast.error("Failed to load your courses.", {
          description: "Please try reloading the page.",
        });
        setCourses([]);
      } else if (data) {
        const coursesWithSignedUrls = await Promise.all(data.map(async (course: any) => {
          let imageUrl = '/placeholder.svg';
          if (course.image_url) {
            const { data: signedUrlData } = await supabase.storage
              .from('dil-lms')
              .createSignedUrl(course.image_url, 3600);
            if (signedUrlData) {
              imageUrl = signedUrlData.signedUrl;
            }
          }
          return { 
            id: course.course_id,
            title: course.title,
            subtitle: course.subtitle,
            image_url: imageUrl,
            progress: course.progress_percentage,
          };
        }));
        setCourses(coursesWithSignedUrls);
      }
      setLoading(false);
    };

    if (userProfile.id) {
      fetchCourses();
    }
  }, [userProfile.id]);

  // Calculate course statistics
  const totalCourses = courses.length;
  const completedCourses = courses.filter(course => course.progress === 100).length;
  const averageProgress = courses.length > 0 
    ? Math.round(courses.reduce((sum, course) => sum + (course.progress || 0), 0) / courses.length)
    : 0;

  if (loading) {
    return (
      <div className="space-y-8 mx-auto">
        {/* Premium Header Section */}
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-primary/5 rounded-3xl"></div>
          <div className="relative p-8 rounded-3xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-primary/10 to-primary/20 rounded-2xl flex items-center justify-center">
                  <BookOpen className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-primary via-primary to-primary/80 bg-clip-text text-transparent" style={{ backgroundClip: 'text', WebkitBackgroundClip: 'text' }}>
                    My Courses
                  </h1>
                  <p className="text-lg text-muted-foreground mt-2 leading-relaxed">
                    View and manage your enrolled courses with enterprise-grade tracking
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="py-12">
          <ContentLoader message="Loading your courses..." />
        </div>
      </div>
    );
  }

  // Show empty state if no courses
  if (courses.length === 0) {
    return (
      <div className="space-y-8 mx-auto">
        {/* Premium Header Section */}
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-primary/5 rounded-3xl"></div>
          <div className="relative p-8 rounded-3xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-primary/10 to-primary/20 rounded-2xl flex items-center justify-center">
                  <BookOpen className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-primary via-primary to-primary/80 bg-clip-text text-transparent" style={{ backgroundClip: 'text', WebkitBackgroundClip: 'text' }}>
                    My Courses
                  </h1>
                  <p className="text-lg text-muted-foreground mt-2 leading-relaxed">
                    View and manage your enrolled courses with enterprise-grade tracking
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <EmptyState
          title="No Courses Enrolled"
          description="Wait for the teacher to enroll you into a course"
          icon={<BookOpen className="h-8 w-8 text-muted-foreground" />}
        />
      </div>
    );
  }

  return (
    <div className="space-y-8 mx-auto">
      {/* Premium Header Section */}
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-primary/5 rounded-3xl"></div>
        <div className="relative p-8 rounded-3xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-primary/10 to-primary/20 rounded-2xl flex items-center justify-center">
                <BookOpen className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-primary via-primary to-primary/80 bg-clip-text text-transparent" style={{ backgroundClip: 'text', WebkitBackgroundClip: 'text' }}>
                  My Courses
                </h1>
                <p className="text-lg text-muted-foreground mt-2 leading-relaxed">
                  View and manage your enrolled courses with enterprise-grade tracking
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Course Statistics Overview */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
        <Card className="bg-gradient-to-br from-card to-green-500/5 dark:bg-card border border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Courses</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCourses}</div>
            <p className="text-xs text-muted-foreground">Enrolled courses</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-card to-green-500/5 dark:bg-card border border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Progress</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{averageProgress}%</div>
            <p className="text-xs text-muted-foreground">Across all courses</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-card to-green-500/5 dark:bg-card border border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completedCourses}</div>
            <p className="text-xs text-muted-foreground">Fully completed</p>
          </CardContent>
        </Card>
      </div>
      
      {/* Enhanced Course Grid */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {courses.map((course) => (
          <Card key={course.id} className="group overflow-hidden hover:shadow-xl transition-all duration-300 hover:-translate-y-1 bg-card border border-border backdrop-blur-sm">
            <div className="relative overflow-hidden">
              <img 
                src={course.image_url} 
                alt={course.title} 
                className="w-full h-48 object-cover transition-transform duration-300 group-hover:scale-105" 
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              {course.progress === 100 && (
                <div className="absolute top-3 right-3">
                  <div className="bg-green-500 text-white rounded-full p-1">
                    <CheckCircle className="h-4 w-4" />
                  </div>
                </div>
              )}
            </div>
            
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-semibold leading-tight">{course.title}</CardTitle>
              <p className="text-sm text-muted-foreground leading-relaxed">{course.subtitle}</p>
            </CardHeader>
            
            <CardContent className="space-y-4">
              {/* Enhanced Progress Bar */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-muted-foreground">Progress</span>
                  <span className="text-sm font-semibold">{course.progress || 0}%</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                  <div 
                    className="bg-gradient-to-r from-primary to-primary/80 h-2 rounded-full transition-all duration-500 ease-out" 
                    style={{ width: `${course.progress || 0}%` }}
                  />
                </div>
              </div>

              {/* Action Button */}
              <Button 
                asChild 
                variant="secondary" 
                size="sm" 
                className="w-full h-10 rounded-xl bg-background border border-input shadow-sm hover:shadow-lg hover:shadow-primary/10 transition-all duration-300 hover:-translate-y-0.5 hover:bg-gray-100 dark:hover:bg-gray-800 group"
              >
                <Link to={course.progress && course.progress > 0 ? `/dashboard/courses/${course.id}/content` : `/dashboard/courses/${course.id}`}>
                  <div className="flex items-center gap-2">
                    {course.progress && course.progress > 0 ? (
                      <>
                        <Play className="h-4 w-4" />
                        Continue Learning
                      </>
                    ) : (
                      <>
                        <BookOpen className="h-4 w-4" />
                        Start Course
                      </>
                    )}
                  </div>
                </Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}; 