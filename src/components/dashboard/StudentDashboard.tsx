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

interface DashboardStats {
  enrolled_courses_count: number;
  total_lessons_count: number;
  completed_lessons_count: number;
  active_discussions_count: number;
  study_streak_days: number;
  total_study_time_minutes: number;
  average_grade: number;
  upcoming_assignments_count: number;
}

interface UpcomingAssignment {
  assignment_id: string;
  assignment_title: string;
  course_title: string;
  due_date: string;
  days_remaining: number;
  priority: string;
  submission_status: string;
}

interface RecentActivity {
  activity_type: string;
  activity_description: string;
  activity_time: string;
  course_title: string;
  lesson_title: string;
}

interface StudentDashboardProps {
  userProfile: Profile;
}

export const StudentDashboard = ({ userProfile }: StudentDashboardProps) => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
  const [upcomingAssignments, setUpcomingAssignments] = useState<UpcomingAssignment[]>([]);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!userProfile?.id) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        // Fetch all dashboard data in parallel
        const [
          { data: statsData, error: statsError },
          { data: coursesData, error: coursesError },
          { data: assignmentsData, error: assignmentsError },
          { data: activityData, error: activityError }
        ] = await Promise.all([
          // Dashboard stats
          supabase.rpc('get_student_dashboard_stats', {
            student_id: userProfile.id
          }),
          // Courses with progress
          supabase.rpc('get_student_courses_with_progress', {
            student_id: userProfile.id
          }),
          // Upcoming assignments
          supabase.rpc('get_student_upcoming_assignments', {
            student_id: userProfile.id,
            days_ahead: 7
          }),
          // Recent activity
          supabase.rpc('get_student_recent_activity', {
            student_id: userProfile.id,
            days_back: 7
          })
        ]);

        // Handle errors
        if (statsError) {
          console.error("Error fetching dashboard stats:", statsError);
          toast.error("Failed to load dashboard statistics.");
        }
        if (coursesError) {
          console.error("Error fetching courses:", coursesError);
          toast.error("Failed to load your courses.");
        }
        if (assignmentsError) {
          console.error("Error fetching assignments:", assignmentsError);
        }
        if (activityError) {
          console.error("Error fetching activity:", activityError);
        }

        // Set dashboard stats
        if (statsData && statsData.length > 0) {
          setDashboardStats(statsData[0]);
        }

        // Process courses with signed URLs
        if (coursesData) {
          const coursesWithSignedUrls = await Promise.all(coursesData.map(async (course: any) => {
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

            return {
              id: course.course_id,
              title: course.title,
              subtitle: course.subtitle,
              image_url: imageUrl,
              progress: course.progress_percentage
            };
          }));
          setCourses(coursesWithSignedUrls);
        }

        // Set upcoming assignments
        if (assignmentsData) {
          setUpcomingAssignments(assignmentsData);
        }

        // Set recent activity
        if (activityData) {
          setRecentActivity(activityData);
        }

      } catch (error: any) {
        console.error("Failed to fetch dashboard data:", error);
        toast.error("Failed to load dashboard data.", { description: error.message });
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [userProfile?.id]);

  if (loading) {
    return (
      <div className="py-12">
        <ContentLoader message="Loading your dashboard..." />
      </div>
    );
  }

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
            <div className="text-2xl font-bold">{dashboardStats?.enrolled_courses_count || 0}</div>
            <p className="text-xs text-muted-foreground">
              {dashboardStats?.enrolled_courses_count === 1 ? 'Course available' : 'Courses available'}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-card to-green-500/5 dark:bg-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed Lessons</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardStats?.completed_lessons_count || 0}</div>
            <p className="text-xs text-muted-foreground">
              of {dashboardStats?.total_lessons_count || 0} total lessons
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-card to-green-500/5 dark:bg-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Discussions</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardStats?.active_discussions_count || 0}</div>
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
            <div className="text-2xl font-bold">{dashboardStats?.study_streak_days || 0}</div>
            <p className="text-xs text-muted-foreground">
              {dashboardStats?.study_streak_days === 1 ? 'Day in a row' : 'Days in a row'}
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
            {upcomingAssignments.length === 0 ? (
              <div className="text-center py-8">
                <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-sm text-muted-foreground">No upcoming assignments</p>
                <p className="text-xs text-muted-foreground mt-1">You're all caught up!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {upcomingAssignments.map((assignment) => (
                  <div key={assignment.assignment_id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="flex-shrink-0">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="font-medium">{assignment.assignment_title}</p>
                        <p className="text-sm text-muted-foreground">{assignment.course_title}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">
                        {assignment.days_remaining === 0 ? 'Due today' : 
                         assignment.days_remaining === 1 ? 'Due tomorrow' : 
                         `Due in ${assignment.days_remaining} days`}
                      </p>
                      <Badge 
                        variant={
                          assignment.priority === 'High' ? 'destructive' :
                          assignment.priority === 'Medium' ? 'secondary' :
                          'outline'
                        }
                      >
                        {assignment.priority}
                      </Badge>
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
            {recentActivity.length === 0 ? (
              <div className="text-center py-8">
                <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-sm text-muted-foreground">No recent activity</p>
                <p className="text-xs text-muted-foreground mt-1">Start learning to see updates here</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentActivity.map((activity, index) => (
                  <div key={index} className="flex items-start space-x-3 p-3 border rounded-lg">
                    <div className="flex-shrink-0 mt-1">
                      <div className="w-2 h-2 bg-primary rounded-full" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm">{activity.activity_description}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(activity.activity_time).toLocaleDateString()} • {activity.course_title}
                      </p>
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
