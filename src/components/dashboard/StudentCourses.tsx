import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/EmptyState';
import { BookOpen, TrendingUp, Clock, Award, Play, CheckCircle, Sparkles, Users, Eye } from 'lucide-react';
import { useUserProfile } from '@/hooks/useUserProfile';
import { Badge } from '@/components/ui/badge';
import { Link, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ContentLoader } from '../ContentLoader';
import { ViewToggle, type ViewMode } from '@/components/ui/ViewToggle';
import { StudentCourseTileView } from '@/components/course/StudentCourseTileView';
import { StudentCourseListView } from '@/components/course/StudentCourseListView';
import { useViewPreferences } from '@/contexts/ViewPreferencesContext';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import { PaginationControls } from '@/components/ui/PaginationControls';

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
  total_lessons?: number;
  completed_lessons?: number;
  last_accessed?: string;
}

interface StudentCoursesProps {
  userProfile: Profile;
}

export const StudentCourses = ({ userProfile }: StudentCoursesProps) => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const { preferences, setStudentView } = useViewPreferences();
  const navigate = useNavigate();
  const { profile } = useUserProfile();
  const isViewOnly = profile?.role === 'view_only';
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  
  // Get default items per page based on current view
  const getDefaultItemsPerPage = (view: string) => {
    switch (view) {
      case 'card': return 8;
      case 'tile': return 18;
      case 'list': return 8;
      default: return 8;
    }
  };
  
  const [itemsPerPage, setItemsPerPage] = useState(getDefaultItemsPerPage(preferences.studentView));

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
            total_lessons: course.total_lessons,
            completed_lessons: course.completed_lessons,
            last_accessed: course.last_accessed,
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

  // Pagination logic
  const totalPages = Math.ceil(courses.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentCourses = courses.slice(startIndex, endIndex);

  const handleItemsPerPageChange = (newItemsPerPage: number) => {
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(1); // Reset to first page when changing items per page
  };

  // Update items per page when view changes
  useEffect(() => {
    const newItemsPerPage = getDefaultItemsPerPage(preferences.studentView);
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(1); // Reset to first page when view changes
  }, [preferences.studentView]);

  // Reset to first page when courses change
  useEffect(() => {
    setCurrentPage(1);
  }, [courses.length]);

  if (loading) {
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
                <div className="w-12 h-12 bg-gradient-to-br from-primary/10 to-primary/20 rounded-2xl flex items-center justify-center shadow-lg">
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

        <Card className="bg-gradient-to-br from-card to-card/50 dark:bg-card border border-gray-200/50 dark:border-gray-700/50 rounded-3xl shadow-lg overflow-hidden">
          <CardContent className="py-16">
            <EmptyState
              title="No Courses Enrolled"
              description="Wait for the teacher to enroll you into a course"
              icon={<BookOpen className="h-8 w-8 text-muted-foreground" />}
            />
          </CardContent>
        </Card>
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
              <div className="w-12 h-12 bg-gradient-to-br from-primary/10 to-primary/20 rounded-2xl flex items-center justify-center shadow-lg">
                <BookOpen className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-primary via-primary to-primary/80 bg-clip-text text-transparent" style={{ backgroundClip: 'text', WebkitBackgroundClip: 'text', lineHeight: '3rem' }}>
                  My Courses
                </h1>
                <p className="text-lg text-muted-foreground leading-relaxed">
                  View and manage your enrolled courses with enterprise-grade tracking
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Course Statistics Overview - Consistent with Overview Page */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
        <Card className="bg-gradient-to-br from-card to-green-500/5 dark:bg-card">
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
      
      {/* View Toggle and Course Display */}
      <div className="space-y-6">
        {/* View Toggle */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-foreground">Your Courses</h2>
            <p className="text-sm text-muted-foreground">Switch between different views to browse your courses</p>
          </div>
          <ViewToggle
            currentView={preferences.studentView}
            onViewChange={setStudentView}
            availableViews={['card', 'tile', 'list']}
          />
        </div>

        {/* Course Display based on selected view */}
        {preferences.studentView === 'card' && (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {currentCourses.map((course) => (
              <Card key={course.id} className="bg-card border border-border flex flex-col h-full">
                <CardHeader className="p-0 relative">
                  <img 
                    src={course.image_url} 
                    alt={course.title} 
                    className="w-full h-40 object-cover rounded-t-lg" 
                  />
                  {course.progress === 100 && (
                    <Badge className="absolute top-2 left-2 bg-green-500">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Completed
                    </Badge>
                  )}
                  {course.progress !== undefined && course.progress !== null && course.progress > 0 && course.progress < 100 && (
                    <Badge variant="secondary" className="absolute top-2 left-2">
                      In Progress
                    </Badge>
                  )}
                </CardHeader>
                <CardContent className="p-4 space-y-2 flex-grow">
                  <h3 className="font-semibold text-lg">{course.title}</h3>
                  <p className="text-sm text-muted-foreground">{course.subtitle}</p>
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>{course.total_lessons || 0} lessons</span>
                    {course.progress !== undefined && course.progress !== null && (
                      <span>{course.progress}% complete</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    <span>Last accessed: {course.last_accessed ? new Date(course.last_accessed).toLocaleDateString() : 'Never'}</span>
                  </div>
                </CardContent>
                <CardFooter className="p-4 pt-0 mt-auto">
                  <Button 
                    asChild
                    className="w-full bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary text-white py-3 text-base font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5 hover:scale-105 rounded-xl"
                  >
                    <Link to={course.progress && course.progress > 0 ? `/dashboard/courses/${course.id}/content` : `/dashboard/courses/${course.id}`}>
                      {isViewOnly ? (
                        <>
                          <Eye className="w-4 h-4 mr-2" />
                          Preview Course
                        </>
                      ) : course.progress === 100 ? (
                        <>
                          <BookOpen className="w-4 h-4 mr-2" />
                          Review Course
                        </>
                      ) : course.progress && course.progress > 0 ? (
                        <>
                          <Play className="w-4 h-4 mr-2" />
                          Continue Learning
                        </>
                      ) : (
                        <>
                          <BookOpen className="w-4 h-4 mr-2" />
                          Start Course
                        </>
                      )}
                    </Link>
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}

        {preferences.studentView === 'tile' && (
          <StudentCourseTileView
            courses={currentCourses}
            onCourseClick={(course) => {
              navigate(course.progress && course.progress > 0 
                ? `/dashboard/courses/${course.id}/content` 
                : `/dashboard/courses/${course.id}`);
            }}
          />
        )}

        {preferences.studentView === 'list' && (
          <StudentCourseListView
            courses={currentCourses}
            onCourseClick={(course) => {
              navigate(course.progress && course.progress > 0 
                ? `/dashboard/courses/${course.id}/content` 
                : `/dashboard/courses/${course.id}`);
            }}
          />
        )}

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <PaginationControls
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={courses.length}
            itemsPerPage={itemsPerPage}
            onPageChange={setCurrentPage}
            onItemsPerPageChange={handleItemsPerPageChange}
            itemsPerPageOptions={preferences.studentView === 'tile' ? [9, 18, 27, 36, 45] : [4, 8, 12, 16, 20]}
            disabled={loading}
            className="py-4"
          />
        )}
      </div>
    </div>
  );
}; 