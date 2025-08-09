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
  AlertCircle,
  Sparkles
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
    <div className="space-y-8">
      {/* Premium Header Section */}
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-primary/5 rounded-3xl"></div>
        <div className="relative p-8 rounded-3xl">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-primary/10 to-primary/20 rounded-2xl flex items-center justify-center shadow-lg">
              <Sparkles className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-primary via-primary to-primary/80 bg-clip-text text-transparent">
                Welcome back, {userProfile.first_name}!
              </h1>
              <p className="text-lg text-muted-foreground font-light">
                Continue your learning journey and track your progress.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid - Enhanced with Brand Colors */}
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

      {/* My Courses - Enhanced Premium Redesign */}
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-br from-primary/10 to-primary/20 rounded-xl flex items-center justify-center shadow-lg">
            <BookOpen className="w-4 h-4 text-primary" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">My Courses</h2>
        </div>
        
        {courses.length === 0 ? (
          <Card className="bg-gradient-to-br from-white/60 to-gray-50/60 dark:from-gray-900/60 dark:to-gray-800/60 border border-gray-200/50 dark:border-gray-700/50 rounded-3xl shadow-lg overflow-hidden">
            <CardContent className="py-16">
              <EmptyState
                title="No Courses Enrolled"
                description="Wait for the teacher to enroll you into a course"
                icon={<BookOpen className="h-12 w-12 text-muted-foreground" />}
              />
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {courses.map((course) => (
              <Card key={course.id} className="group bg-gradient-to-br from-white/60 to-gray-50/60 dark:from-gray-900/60 dark:to-gray-800/60 border border-gray-200/50 dark:border-gray-700/50 hover:shadow-2xl hover:shadow-primary/10 transition-all duration-500 hover:-translate-y-2 rounded-3xl overflow-hidden">
                <div className="relative overflow-hidden">
                  <img 
                    src={course.image_url} 
                    alt={course.title} 
                    className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-500" 
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
                </div>
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg font-bold truncate text-gray-900 dark:text-gray-100">{course.title}</CardTitle>
                  <p className="text-sm text-muted-foreground truncate leading-relaxed">{course.subtitle}</p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-900 dark:text-gray-100">Progress</span>
                      <span className="text-sm font-bold text-primary">{course.progress || 0}%</span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
                      <div 
                        className="bg-gradient-to-r from-primary to-primary/80 h-3 rounded-full transition-all duration-500 ease-out" 
                        style={{ width: `${course.progress || 0}%` }}
                      />
                    </div>
                  </div>
                  <Button asChild variant="outline" size="lg" className="w-full rounded-xl font-semibold hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all duration-300">
                    <Link to={course.progress && course.progress > 0 ? `/dashboard/courses/${course.id}/content` : `/dashboard/courses/${course.id}`}>
                      {course.progress && course.progress > 0 ? 'Continue Learning' : 'Start Course'}
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Quick Actions & Upcoming Assignments - Enhanced Premium Redesign */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <Card className="bg-gradient-to-br from-white/60 to-gray-50/60 dark:from-gray-900/60 dark:to-gray-800/60 border border-gray-200/50 dark:border-gray-700/50 hover:shadow-2xl hover:shadow-primary/5 transition-all duration-500 rounded-3xl overflow-hidden">
          <CardHeader className="pb-6">
            <CardTitle className="flex items-center gap-3 text-xl font-bold text-gray-900 dark:text-gray-100">
              <div className="w-8 h-8 bg-gradient-to-br from-orange-500/10 to-orange-500/20 rounded-xl flex items-center justify-center shadow-lg">
                <Clock className="h-4 w-4 text-orange-500" />
              </div>
              Upcoming Assignments
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {upcomingAssignments.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gradient-to-br from-green-500/10 to-green-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                  <Calendar className="h-8 w-8 text-green-500" />
                </div>
                <p className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">All Caught Up!</p>
                <p className="text-sm text-muted-foreground">No upcoming assignments</p>
              </div>
            ) : (
              <div className="space-y-4">
                {upcomingAssignments.map((assignment) => (
                  <div key={assignment.assignment_id} className="group p-4 border border-gray-200/50 dark:border-gray-700/50 rounded-2xl hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-all duration-300">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="w-10 h-10 bg-gradient-to-br from-primary/10 to-primary/20 rounded-xl flex items-center justify-center shadow-lg">
                          <FileText className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900 dark:text-gray-100">{assignment.assignment_title}</p>
                          <p className="text-sm text-muted-foreground">{assignment.course_title}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
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
                          className="mt-1"
                        >
                          {assignment.priority}
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-white/60 to-gray-50/60 dark:from-gray-900/60 dark:to-gray-800/60 border border-gray-200/50 dark:border-gray-700/50 hover:shadow-2xl hover:shadow-primary/5 transition-all duration-500 rounded-3xl overflow-hidden">
          <CardHeader className="pb-6">
            <CardTitle className="flex items-center gap-3 text-xl font-bold text-gray-900 dark:text-gray-100">
              <div className="w-8 h-8 bg-gradient-to-br from-[#1582B4]/10 to-[#1582B4]/20 rounded-xl flex items-center justify-center shadow-lg">
                <AlertCircle className="h-4 w-4 text-[#1582B4]" />
              </div>
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {recentActivity.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gradient-to-br from-[#1582B4]/10 to-[#1582B4]/20 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                  <Users className="h-8 w-8 text-[#1582B4]" />
                </div>
                <p className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">Start Learning</p>
                <p className="text-sm text-muted-foreground">Begin your journey to see updates here</p>
              </div>
            ) : (
              <div className="space-y-4">
                {recentActivity.map((activity, index) => (
                  <div key={index} className="group p-4 border border-gray-200/50 dark:border-gray-700/50 rounded-2xl hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-all duration-300">
                    <div className="flex items-start space-x-4">
                      <div className="flex-shrink-0 mt-1">
                        <div className="w-3 h-3 bg-gradient-to-r from-primary to-primary/80 rounded-full" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{activity.activity_description}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(activity.activity_time).toLocaleDateString()} • {activity.course_title}
                        </p>
                      </div>
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
