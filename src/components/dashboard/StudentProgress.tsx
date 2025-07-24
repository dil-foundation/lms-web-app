import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { BookOpen, CheckCircle, Flame, Target } from 'lucide-react';
import StudentDashboardService, { StudentDashboardStats, StudentCourseWithProgress } from '@/services/studentDashboardService';
import { useAuth } from '@/hooks/useAuth';
import { ContentLoader } from '@/components/ContentLoader';

const StatCard = ({ title, value, subtext, icon, progress }: { title: string, value: string | number, subtext: string, icon: React.ReactNode, progress?: number }) => (
  <Card>
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
  <Card>
    <CardHeader>
      <CardTitle>Course Progress Details</CardTitle>
    </CardHeader>
    <CardContent className="space-y-4">
      {courses.length > 0 ? (
        courses.map(course => (
          <div key={course.course_id}>
            <div className="flex justify-between items-center mb-1">
              <p className="font-medium">{course.title}</p>
              <div className="text-sm text-muted-foreground">
                <span className={`font-semibold ${course.progress_percentage > 0 ? 'text-blue-600' : ''}`}>
                  {course.progress_percentage > 0 ? `${course.progress_percentage}%` : 'Not Started'}
                </span>
              </div>
            </div>
            <div className="w-full bg-muted rounded-full h-2">
                <div 
                    className="bg-primary h-2 rounded-full transition-all duration-300"
                    style={{ width: `${course.progress_percentage}%` }}
                />
            </div>
            <div className="flex justify-between items-center mt-1 text-xs text-muted-foreground">
              <span>{course.completed_lessons} of {course.total_lessons} lessons</span>
              {course.last_accessed && <span>Last accessed: {new Date(course.last_accessed).toLocaleDateString()}</span>}
            </div>
          </div>
        ))
      ) : (
        <p className="text-center text-muted-foreground">No courses enrolled yet.</p>
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
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Learning Progress</h1>
        <p className="text-muted-foreground">Track your learning journey and achievements.</p>
      </div>

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