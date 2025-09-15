import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { BookOpen, CheckCircle, Flame, Target, Sparkles, TrendingUp, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
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
  <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
    {courses.length > 0 ? (
      courses.map(course => (
        <Card key={course.course_id} className="bg-card border border-border flex flex-col h-full">
          <CardHeader className="p-0 relative">
            {course.image_url ? (
              <img 
                src={course.image_url} 
                alt={course.title} 
                className="w-full h-40 object-cover rounded-t-lg"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                  target.nextElementSibling?.classList.remove('hidden');
                }}
              />
            ) : null}
            <div className={`w-full h-40 bg-gradient-to-br from-primary/10 to-primary/20 flex items-center justify-center rounded-t-lg ${course.image_url ? 'hidden' : ''}`}>
              <BookOpen className="w-8 h-8 text-primary/60" />
            </div>
            {course.progress_percentage === 100 && (
              <Badge className="absolute top-2 left-2 bg-green-500">
                <CheckCircle className="w-3 h-3 mr-1" />
                Completed
              </Badge>
            )}
            {course.progress_percentage > 0 && course.progress_percentage < 100 && (
              <Badge variant="secondary" className="absolute top-2 left-2">
                In Progress
              </Badge>
            )}
          </CardHeader>
          <CardContent className="p-4 space-y-2 flex-grow">
            <h3 className="font-semibold text-lg">{course.title}</h3>
            <p className="text-sm text-muted-foreground">{course.subtitle}</p>
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>{course.total_lessons} lessons</span>
              <span>{course.progress_percentage}% complete</span>
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
              <Link to={`/dashboard/course/${course.course_id}`}>
                {course.progress_percentage === 100 ? (
                  <>
                    <BookOpen className="w-4 h-4 mr-2" />
                    Review Course
                  </>
                ) : course.progress_percentage > 0 ? (
                  <>
                    <TrendingUp className="w-4 h-4 mr-2" />
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
              window.location.href = course.progress_percentage > 0 
                ? `/dashboard/courses/${course.course_id}/content` 
                : `/dashboard/courses/${course.course_id}`;
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
              window.location.href = course.progress_percentage > 0 
                ? `/dashboard/courses/${course.course_id}/content` 
                : `/dashboard/courses/${course.course_id}`;
            }}
          />
        )}
      </div>

    </div>
  );
}; 