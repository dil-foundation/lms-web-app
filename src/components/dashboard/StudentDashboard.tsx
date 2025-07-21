import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { EmptyState } from '@/components/EmptyState';
import { 
  BookOpen, 
  Target, 
  CheckCircle, 
  Award, 
  Clock, 
  MessageSquare,
  TrendingUp,
  Calendar,
  Users,
  PlayCircle,
  FileText,
  AlertCircle
} from 'lucide-react';
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

interface StudentDashboardProps {
  userProfile: Profile;
}

export const StudentDashboard = ({ userProfile }: StudentDashboardProps) => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  // Mock data for demo purposes - replace with real data from your backend
  const mockStats = {
    totalLessons: courses.length * 12, // Estimate 12 lessons per course
    completedLessons: 0,
    activeDiscussions: 0,
    upcomingDeadlines: 0,
    studyStreak: 0,
    totalStudyTime: 0,
    averageGrade: 0,
    recentActivity: []
  };

  const mockUpcomingAssignments = [
    // Empty for demonstration of empty state
  ];

  const mockRecentActivity = [
    // Empty for demonstration of empty state
  ];

  useEffect(() => {
    const fetchCourses = async () => {
      setLoading(true);
      
      const { data, error } = await supabase.rpc('get_student_courses');

      if (error) {
        console.error("Error fetching student courses:", error);
        toast.error("Failed to load your courses.", {
          description: "Please try reloading the page.",
        });
      } else if (data) {
        const coursesWithDetails = await Promise.all(data.map(async (course) => {
          let imageUrl = '/placeholder.svg';
          if (course.image_url) {
            const { data: signedUrlData, error } = await supabase.storage
              .from('dil-lms')
              .createSignedUrl(course.image_url, 60);

            if (error) {
              console.error(`Failed to get signed URL for course image: ${course.image_url}`, error);
            } else {
              imageUrl = signedUrlData.signedUrl;
            }
          }

          let progress = 0;
          const { data: sections, error: sectionsError } = await supabase
            .from('course_sections')
            .select('lessons:course_lessons(id)')
            .eq('course_id', course.id);

          if (sectionsError) {
            console.error(`Error fetching lessons for course ${course.id}:`, sectionsError);
          } else {
            const lessonIds = sections.flatMap(s => s.lessons.map(l => l.id));
            const totalLessons = lessonIds.length;

            if (totalLessons > 0) {
              const { data: completedLessons, error: progressError } = await supabase
                .from('user_course_progress')
                .select('lesson_id', { count: 'exact' })
                .eq('user_id', userProfile.id)
                .in('lesson_id', lessonIds)
                .not('completed_at', 'is', null);

              if (progressError) {
                console.error(`Error fetching progress for course ${course.id}:`, progressError);
              } else if (completedLessons) {
                progress = Math.round((completedLessons.length / totalLessons) * 100);
              }
            }
          }

          return { ...course, image_url: imageUrl, progress };
        }));
        setCourses(coursesWithDetails);
      }
      setLoading(false);
    };

    fetchCourses();
  }, []);

  if (loading) {
    return (
      <div className="py-12">
        <ContentLoader message="Loading your dashboard..." />
      </div>
    );
  }

  // Show empty state only in the courses section, not the entire dashboard

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Welcome back, {userProfile.first_name}!
        </h1>
        <p className="text-muted-foreground">
          Continue your learning journey and track your progress.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-gradient-to-br from-card to-green-500/5 dark:bg-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Enrolled Courses</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{courses.length}</div>
            <p className="text-xs text-muted-foreground">
              {courses.length === 1 ? 'Course available' : 'Courses available'}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-card to-green-500/5 dark:bg-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed Lessons</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mockStats.completedLessons}</div>
            <p className="text-xs text-muted-foreground">
              of {mockStats.totalLessons} total lessons
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-card to-green-500/5 dark:bg-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Discussions</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mockStats.activeDiscussions}</div>
            <p className="text-xs text-muted-foreground">
              Discussions you're participating in
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-card to-green-500/5 dark:bg-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Study Streak</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mockStats.studyStreak}</div>
            <p className="text-xs text-muted-foreground">
              {mockStats.studyStreak === 1 ? 'Day in a row' : 'Days in a row'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* My Courses */}
      <div className="space-y-4">
        <h2 className="text-2xl font-semibold tracking-tight">My Courses</h2>
        
        {courses.length === 0 ? (
          <Card>
            <CardContent className="py-12">
              <EmptyState
                title="No Courses Enrolled"
                description="Wait for the teacher to enroll you into a course"
                icon={<BookOpen className="h-8 w-8 text-muted-foreground" />}
              />
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {courses.map((course) => (
              <Card key={course.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                <img 
                  src={course.image_url} 
                  alt={course.title} 
                  className="w-full h-40 object-cover" 
                />
                <CardHeader>
                  <CardTitle className="truncate">{course.title}</CardTitle>
                  <p className="text-sm text-muted-foreground truncate">{course.subtitle}</p>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="w-full bg-muted rounded-full h-2.5">
                    <div 
                      className="bg-primary h-2.5 rounded-full transition-all" 
                      style={{ width: `${course.progress || 0}%` }}
                    />
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">{course.progress || 0}% Complete</span>
                    <Button asChild variant="secondary" size="sm">
                      <Link to={course.progress && course.progress > 0 ? `/dashboard/courses/${course.id}/content` : `/dashboard/courses/${course.id}`}>
                        {course.progress && course.progress > 0 ? 'Continue' : 'Start Course'}
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Quick Actions & Upcoming Assignments */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Upcoming Assignments
            </CardTitle>
          </CardHeader>
          <CardContent>
            {mockUpcomingAssignments.length === 0 ? (
              <div className="text-center py-8">
                <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-sm text-muted-foreground">No upcoming assignments</p>
                <p className="text-xs text-muted-foreground mt-1">You're all caught up!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {mockUpcomingAssignments.map((assignment, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="flex-shrink-0">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="font-medium">{assignment.title}</p>
                        <p className="text-sm text-muted-foreground">{assignment.course}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">{assignment.dueDate}</p>
                      <Badge variant="outline">{assignment.priority}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            {mockRecentActivity.length === 0 ? (
              <div className="text-center py-8">
                <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-sm text-muted-foreground">No recent activity</p>
                <p className="text-xs text-muted-foreground mt-1">Start learning to see updates here</p>
              </div>
            ) : (
              <div className="space-y-3">
                {mockRecentActivity.map((activity, index) => (
                  <div key={index} className="flex items-start space-x-3 p-3 border rounded-lg">
                    <div className="flex-shrink-0 mt-1">
                      <div className="w-2 h-2 bg-primary rounded-full" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm">{activity.description}</p>
                      <p className="text-xs text-muted-foreground mt-1">{activity.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
