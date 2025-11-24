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
      <div className="space-y-6 sm:space-y-8 mx-auto px-2 sm:px-0">
        {/* Premium Header Section */}
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-primary/5 rounded-2xl sm:rounded-3xl"></div>
          <div className="relative p-4 sm:p-6 md:p-8 rounded-2xl sm:rounded-3xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-primary/10 to-primary/20 rounded-xl sm:rounded-2xl flex items-center justify-center shadow-lg flex-shrink-0">
                  <BookOpen className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
                </div>
                <div className="min-w-0">
                  <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight bg-gradient-to-r from-primary via-primary to-primary/80 bg-clip-text text-transparent break-words" style={{ backgroundClip: 'text', WebkitBackgroundClip: 'text' }}>
                    My Courses
                  </h1>
                  <p className="text-sm sm:text-base md:text-lg text-muted-foreground mt-1 sm:mt-2 leading-relaxed hidden sm:block">
                    View and manage your enrolled courses with enterprise-grade tracking
                  </p>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed sm:hidden">
                    Manage your enrolled courses
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
      <div className="space-y-6 sm:space-y-8 mx-auto px-2 sm:px-0">
        {/* Premium Header Section */}
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-primary/5 rounded-2xl sm:rounded-3xl"></div>
          <div className="relative p-4 sm:p-6 md:p-8 rounded-2xl sm:rounded-3xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-primary/10 to-primary/20 rounded-xl sm:rounded-2xl flex items-center justify-center shadow-lg flex-shrink-0">
                  <BookOpen className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
                </div>
                <div className="min-w-0">
                  <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight bg-gradient-to-r from-primary via-primary to-primary/80 bg-clip-text text-transparent break-words" style={{ backgroundClip: 'text', WebkitBackgroundClip: 'text' }}>
                    My Courses
                  </h1>
                  <p className="text-sm sm:text-base md:text-lg text-muted-foreground mt-1 sm:mt-2 leading-relaxed hidden sm:block">
                    View and manage your enrolled courses with enterprise-grade tracking
                  </p>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed sm:hidden">
                    Manage your enrolled courses
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <Card className="bg-gradient-to-br from-card to-card/50 dark:bg-card border border-gray-200/50 dark:border-gray-700/50 rounded-2xl sm:rounded-3xl shadow-lg overflow-hidden">
          <CardContent className="py-12 sm:py-16">
            <EmptyState
              title="No Courses Enrolled"
              description="Wait for the teacher to enroll you into a course"
              icon={<BookOpen className="h-6 w-6 sm:h-8 sm:w-8 text-muted-foreground" />}
            />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 sm:space-y-8 mx-auto px-2 sm:px-0">
      {/* Premium Header Section */}
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-primary/5 rounded-2xl sm:rounded-3xl"></div>
        <div className="relative p-4 sm:p-6 md:p-8 rounded-2xl sm:rounded-3xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-primary/10 to-primary/20 rounded-xl sm:rounded-2xl flex items-center justify-center shadow-lg flex-shrink-0">
                <BookOpen className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
              </div>
              <div className="min-w-0">
                <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight bg-gradient-to-r from-primary via-primary to-primary/80 bg-clip-text text-transparent break-words" style={{ backgroundClip: 'text', WebkitBackgroundClip: 'text' }}>
                  My Courses
                </h1>
                <p className="text-sm sm:text-base md:text-lg text-muted-foreground mt-1 sm:mt-2 leading-relaxed hidden sm:block">
                  View and manage your enrolled courses with enterprise-grade tracking
                </p>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed sm:hidden">
                  Manage your enrolled courses
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Course Statistics Overview - Consistent with Overview Page */}
      <div className="grid grid-cols-1 gap-3 sm:gap-4 md:gap-6 sm:grid-cols-3">
        <Card className="bg-gradient-to-br from-card to-green-500/5 dark:bg-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-4 sm:p-6">
            <CardTitle className="text-xs sm:text-sm font-medium">Total Courses</CardTitle>
            <BookOpen className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground flex-shrink-0" />
          </CardHeader>
          <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
            <div className="text-xl sm:text-2xl font-bold">{totalCourses}</div>
            <p className="text-[10px] sm:text-xs text-muted-foreground">Enrolled courses</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-card to-green-500/5 dark:bg-card border border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-4 sm:p-6">
            <CardTitle className="text-xs sm:text-sm font-medium">Average Progress</CardTitle>
            <TrendingUp className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground flex-shrink-0" />
          </CardHeader>
          <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
            <div className="text-xl sm:text-2xl font-bold">{averageProgress}%</div>
            <p className="text-[10px] sm:text-xs text-muted-foreground">Across all courses</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-card to-green-500/5 dark:bg-card border border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-4 sm:p-6">
            <CardTitle className="text-xs sm:text-sm font-medium">Completed</CardTitle>
            <Award className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground flex-shrink-0" />
          </CardHeader>
          <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
            <div className="text-xl sm:text-2xl font-bold">{completedCourses}</div>
            <p className="text-[10px] sm:text-xs text-muted-foreground">Fully completed</p>
          </CardContent>
        </Card>
      </div>
      
      {/* View Toggle and Course Display */}
      <div className="space-y-4 sm:space-y-6">
        {/* View Toggle */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
          <div className="min-w-0 flex-1">
            <h2 className="text-lg sm:text-xl font-semibold text-foreground break-words">Your Courses</h2>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 sm:mt-1 break-words">Switch between different views to browse your courses</p>
          </div>
          <div className="w-full sm:w-auto flex-shrink-0">
            <ViewToggle
              currentView={preferences.studentView}
              onViewChange={setStudentView}
              availableViews={['card', 'tile', 'list']}
              showLabels={true}
              className="w-full sm:w-auto"
            />
          </div>
        </div>

        {/* Course Display based on selected view */}
        {preferences.studentView === 'card' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
            {currentCourses.map((course) => (
              <Card key={course.id} className="bg-card border border-border flex flex-col h-full">
                <CardHeader className="p-0 relative">
                  <img 
                    src={course.image_url} 
                    alt={course.title} 
                    className="w-full h-32 sm:h-40 object-cover rounded-t-lg" 
                  />
                  {course.progress === 100 && (
                    <Badge className="absolute top-1.5 left-1.5 sm:top-2 sm:left-2 bg-green-500 text-[10px] sm:text-xs">
                      <CheckCircle className="w-2.5 h-2.5 sm:w-3 sm:h-3 mr-0.5 sm:mr-1" />
                      Completed
                    </Badge>
                  )}
                  {course.progress !== undefined && course.progress !== null && course.progress > 0 && course.progress < 100 && (
                    <Badge variant="secondary" className="absolute top-1.5 left-1.5 sm:top-2 sm:left-2 text-[10px] sm:text-xs">
                      In Progress
                    </Badge>
                  )}
                </CardHeader>
                <CardContent className="p-3 sm:p-4 space-y-1.5 sm:space-y-2 flex-grow">
                  <h3 className="font-semibold text-base sm:text-lg line-clamp-2">{course.title}</h3>
                  <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2">{course.subtitle}</p>
                  <div className="flex justify-between text-xs sm:text-sm text-muted-foreground flex-wrap gap-1">
                    <span>{course.total_lessons || 0} lessons</span>
                    {course.progress !== undefined && course.progress !== null && (
                      <span>{course.progress}% complete</span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm text-muted-foreground">
                    <Clock className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                    <span className="truncate">Last: {course.last_accessed ? new Date(course.last_accessed).toLocaleDateString() : 'Never'}</span>
                  </div>
                </CardContent>
                <CardFooter className="p-3 sm:p-4 pt-0 mt-auto">
                  <Button 
                    asChild
                    className="w-full bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary text-white py-2 sm:py-3 text-sm sm:text-base font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5 hover:scale-105 rounded-xl"
                  >
                    <Link to={course.progress && course.progress > 0 ? `/dashboard/courses/${course.id}/content` : `/dashboard/courses/${course.id}`}>
                      {isViewOnly ? (
                        <>
                          <Eye className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2" />
                          <span className="hidden sm:inline">Preview Course</span>
                          <span className="sm:hidden">Preview</span>
                        </>
                      ) : course.progress === 100 ? (
                        <>
                          <BookOpen className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2" />
                          <span className="hidden sm:inline">Review Course</span>
                          <span className="sm:hidden">Review</span>
                        </>
                      ) : course.progress && course.progress > 0 ? (
                        <>
                          <Play className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2" />
                          <span className="hidden sm:inline">Continue Learning</span>
                          <span className="sm:hidden">Continue</span>
                        </>
                      ) : (
                        <>
                          <BookOpen className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2" />
                          <span className="hidden sm:inline">Start Course</span>
                          <span className="sm:hidden">Start</span>
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
            className="py-3 sm:py-4"
          />
        )}
      </div>
    </div>
  );
}; 