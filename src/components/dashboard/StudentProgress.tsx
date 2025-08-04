import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { BookOpen, CheckCircle, Flame, Target, Sparkles, TrendingUp } from 'lucide-react';
import StudentDashboardService, { StudentDashboardStats, StudentCourseWithProgress } from '@/services/studentDashboardService';
import { useAuth } from '@/hooks/useAuth';
import { ContentLoader } from '@/components/ContentLoader';

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
  <Card className="bg-card/80 backdrop-blur-sm border border-border/50 hover:shadow-2xl hover:shadow-primary/5 transition-all duration-500 rounded-3xl overflow-hidden">
    <CardHeader className="pb-6">
      <CardTitle className="flex items-center gap-3 text-xl font-bold">
        <div className="w-8 h-8 bg-gradient-to-br from-primary/10 to-primary/20 rounded-xl flex items-center justify-center">
          <BookOpen className="w-4 h-4 text-primary" />
        </div>
        Course Progress Details
      </CardTitle>
    </CardHeader>
    <CardContent className="space-y-6">
      {courses.length > 0 ? (
        courses.map(course => (
          <div key={course.course_id} className="group p-4 border border-border/50 rounded-2xl hover:bg-muted/30 transition-all duration-300">
            <div className="flex justify-between items-center mb-3">
              <p className="font-semibold text-foreground text-lg">{course.title}</p>
              <div className="text-sm">
                <span className={`font-bold ${course.progress_percentage > 0 ? 'text-primary' : 'text-muted-foreground'}`}>
                  {course.progress_percentage > 0 ? `${course.progress_percentage}%` : 'Not Started'}
                </span>
              </div>
            </div>
            <div className="w-full bg-muted/50 rounded-full h-3 overflow-hidden mb-3">
              <div 
                className="bg-gradient-to-r from-primary to-primary/80 h-3 rounded-full transition-all duration-500 ease-out"
                style={{ width: `${course.progress_percentage}%` }}
              />
            </div>
            <div className="flex justify-between items-center text-sm text-muted-foreground">
              <span className="font-medium">{course.completed_lessons} of {course.total_lessons} lessons</span>
              {course.last_accessed && (
                <span className="text-xs">Last accessed: {new Date(course.last_accessed).toLocaleDateString()}</span>
              )}
            </div>
          </div>
        ))
      ) : (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-gradient-to-br from-muted/20 to-muted/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <BookOpen className="h-8 w-8 text-muted-foreground" />
          </div>
          <p className="text-lg font-semibold text-foreground mb-2">No Courses Enrolled</p>
          <p className="text-sm text-muted-foreground">Start your learning journey to see progress here</p>
        </div>
      )}
    </CardContent>
  </Card>
);

export const StudentProgress = ({ userProfile }) => {
  const { user } = useAuth();
  const [stats, setStats] = useState<StudentDashboardStats | null>(null);
  const [courses, setCourses] = useState<StudentCourseWithProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-primary/10 to-primary/20 rounded-2xl flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-primary via-primary to-primary/80 bg-clip-text text-transparent">
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
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Overall Progress"
          value={`${Math.round(overallProgress)}%`}
          subtext="Across all courses"
          icon={<Target className="h-4 w-4 text-muted-foreground" />}
          progress={overallProgress}
        />
        <StatCard
          title="Courses in Progress"
          value={stats.enrolled_courses_count}
          subtext="of total courses"
          icon={<BookOpen className="h-4 w-4 text-muted-foreground" />}
        />
        <StatCard
          title="Completed Lessons"
          value={stats.completed_lessons_count}
          subtext={`of ${stats.total_lessons_count} total lessons`}
          icon={<CheckCircle className="h-4 w-4 text-muted-foreground" />}
        />
        <StatCard
          title="Study Streak"
          value={`${stats.study_streak_days} days`}
          subtext="in a row"
          icon={<Flame className="h-4 w-4 text-muted-foreground" />}
        />
      </div>

      <CourseProgressDetails courses={courses} />

    </div>
  );
}; 