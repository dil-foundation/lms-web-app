import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { BookOpen, CheckCircle, Flame, Target, Sparkles, TrendingUp } from 'lucide-react';
import { Link } from 'react-router-dom';
import StudentDashboardService, { StudentDashboardStats, StudentCourseWithProgress } from '@/services/studentDashboardService';
import { useAuth } from '@/hooks/useAuth';
import { ContentLoader } from '@/components/ContentLoader';
import { useViewPreferences } from '@/contexts/ViewPreferencesContext';
import { ViewToggle } from '@/components/ui/ViewToggle';
import { ProgressTileView } from '@/components/progress/ProgressTileView';
import { ProgressListView } from '@/components/progress/ProgressListView';

const StatCard = ({ title, value, subtext, icon, progress }: { title: string, value: string | number, subtext: string, icon: React.ReactNode, progress?: number }) => (
  <Card className="bg-gradient-to-br from-card to-green-500/5 dark:bg-card">
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium">{title}</CardTitle>
      {icon}
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold">{value}</div>
      <p className="text-xs text-muted-foreground">{subtext}</p>
      {progress !== undefined && (
        <div className="w-full bg-muted rounded-full h-2 mt-2">
          <div 
            className="bg-primary h-2 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
    </CardContent>
  </Card>
);

const CourseProgressDetails = ({ courses }: { courses: StudentCourseWithProgress[] }) => (
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
    {courses.length > 0 ? (
      courses.map(course => (
        <Card key={course.course_id} className="group cursor-pointer hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border border-border/50 shadow-md bg-card/95 backdrop-blur-sm dark:bg-card dark:border-border/60 hover:border-border dark:hover:border-border h-80 flex flex-col overflow-hidden">
          <Link to={`/dashboard/course/${course.course_id}`} className="block h-full flex flex-col">
          <CardHeader className="p-4 pb-3">
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1 min-w-0">
                <CardTitle className="text-base font-semibold line-clamp-2 group-hover:text-primary transition-colors mb-2">
                  {course.title}
                </CardTitle>
                <p className="text-xs text-muted-foreground line-clamp-1 mb-3">
                  Last accessed: {course.last_accessed ? new Date(course.last_accessed).toLocaleDateString() : 'Never'}
                </p>
              </div>
            </div>
            
            {/* Progress Status Badge */}
            <div className="flex flex-wrap gap-2 mb-3">
              {course.progress_percentage === 100 ? (
                <div className="flex items-center gap-1 text-xs text-green-600">
                  <CheckCircle className="w-3 h-3" />
                  <span>Completed</span>
                </div>
              ) : course.progress_percentage > 0 ? (
                <div className="flex items-center gap-1 text-xs text-primary">
                  <TrendingUp className="w-3 h-3" />
                  <span>In Progress</span>
                </div>
              ) : (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <BookOpen className="w-3 h-3" />
                  <span>Not Started</span>
                </div>
              )}
            </div>
          </CardHeader>
          
          <CardContent className="p-4 pt-0 flex flex-col flex-1 overflow-hidden">
            {/* Progress Bar */}
            <div className="flex-1 flex flex-col min-h-0">
              <div className="space-y-3 mb-4">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-muted-foreground">Progress</span>
                  <span className="font-medium">{course.progress_percentage}%</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div 
                    className="bg-gradient-to-r from-primary to-primary/80 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${course.progress_percentage}%` }}
                  />
                </div>
                <div className="text-xs text-muted-foreground">
                  {course.completed_lessons} of {course.total_lessons} lessons
                </div>
              </div>
            </div>

            {/* Action Button */}
            <div className="mt-auto pt-3">
              <Link to={`/dashboard/course/${course.course_id}`}>
                <Button
                  size="sm"
                  className="w-full h-8 text-xs hover:bg-primary hover:text-primary-foreground transition-all duration-200"
                  onClick={(e) => {
                    e.stopPropagation();
                  }}
                >
                  <BookOpen className="w-3 h-3 mr-1" />
                  View Course
                </Button>
              </Link>
            </div>
          </CardContent>
          </Link>
        </Card>
      ))
    ) : (
      <div className="col-span-full text-center py-8">
        <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
          <BookOpen className="w-8 h-8 text-muted-foreground" />
        </div>
        <p className="text-muted-foreground">No courses found</p>
      </div>
    )}
  </div>
);

export const StudentProgress = ({ userProfile }) => {
  const { user } = useAuth();
  const [stats, setStats] = useState<StudentDashboardStats | null>(null);
  const [courses, setCourses] = useState<StudentCourseWithProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { preferences, setProgressView } = useViewPreferences();

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      try {
        setLoading(true);
        const [statsData, coursesData] = await Promise.all([
          StudentDashboardService.getStats(user.id),
          StudentDashboardService.getCoursesWithProgress(user.id)
        ]);
        setStats(statsData);
        setCourses(coursesData);
        console.log('Fetched courses with progress:', coursesData);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user]);

  if (loading) {
    return <ContentLoader message="Loading student progress..." />;
  }

  if (error) {
    return <div className="text-red-500 text-center">Error: {error}</div>;
  }

  if (!stats) {
    return <div className="text-center">No progress data available.</div>;
  }

  const overallProgress = stats.total_lessons_count > 0 
    ? (stats.completed_lessons_count / stats.total_lessons_count) * 100 
    : 0;

  return (
    <div className="space-y-8">
      {/* Premium Header Section */}
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-primary/5 rounded-3xl"></div>
        <div className="relative p-8 rounded-3xl">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-14 h-14 bg-gradient-to-br from-primary/10 to-primary/20 rounded-2xl flex items-center justify-center shadow-lg">
              <TrendingUp className="w-7 h-7 text-primary" />
            </div>
            <div>
              <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-primary via-primary to-primary/80 bg-clip-text text-transparent" style={{ lineHeight: '3rem' }}>
                Learning Progress
              </h1>
              <p className="text-lg text-muted-foreground font-light">
                Track your learning journey and achievements.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid - Preserving Clean Design */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Overall Progress"
          value={`${Math.round(overallProgress)}%`}
          subtext="Across all courses"
          icon={<Target className="h-4 w-4 text-primary" />}
          progress={overallProgress}
        />
        <StatCard
          title="Courses in Progress"
          value={stats.enrolled_courses_count}
          subtext="of total courses"
          icon={<BookOpen className="h-4 w-4 text-primary" />}
        />
        <StatCard
          title="Completed Lessons"
          value={stats.completed_lessons_count}
          subtext={`of ${stats.total_lessons_count} total lessons`}
          icon={<CheckCircle className="h-4 w-4 text-primary" />}
        />
        <StatCard
          title="Study Streak"
          value={`${stats.study_streak_days} days`}
          subtext="in a row"
          icon={<Flame className="h-4 w-4 text-primary" />}
        />
      </div>

      {/* View Toggle and Progress Display */}
      <div className="space-y-6">
        {/* View Toggle */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-foreground">Course Progress</h2>
            <p className="text-sm text-muted-foreground">Switch between different views to track your progress</p>
          </div>
          <ViewToggle
            currentView={preferences.progressView}
            onViewChange={setProgressView}
            availableViews={['card', 'tile', 'list']}
          />
        </div>

        {/* Progress Display based on selected view */}
        {preferences.progressView === 'card' && (
          <CourseProgressDetails courses={courses} />
        )}

        {preferences.progressView === 'tile' && (
          <ProgressTileView
            courses={courses.map(course => ({
              course_id: course.course_id,
              title: course.title,
              subtitle: course.subtitle,
              image_url: course.image_url,
              progress_percentage: course.progress_percentage,
              total_lessons: course.total_lessons,
              completed_lessons: course.completed_lessons,
              last_accessed: course.last_accessed,
              is_completed: course.progress_percentage === 100,
              level: 'Beginner', // Default level
              category: 'General' // Default category
            }))}
            onCourseClick={(course) => {
              // Handle course click if needed
            }}
          />
        )}

        {preferences.progressView === 'list' && (
          <ProgressListView
            courses={courses.map(course => ({
              course_id: course.course_id,
              title: course.title,
              subtitle: course.subtitle,
              image_url: course.image_url,
              progress_percentage: course.progress_percentage,
              total_lessons: course.total_lessons,
              completed_lessons: course.completed_lessons,
              last_accessed: course.last_accessed,
              is_completed: course.progress_percentage === 100,
              level: 'Beginner', // Default level
              category: 'General' // Default category
            }))}
            onCourseClick={(course) => {
              // Handle course click if needed
            }}
          />
        )}
      </div>

    </div>
  );
}; 