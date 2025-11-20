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
  Sparkles,
  Play,
  Eye,
  Star,
  Timer,
  Activity
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { offlineStateManager } from '@/utils/offlineStateManager';
import { useUserProfile } from '@/hooks/useUserProfile';
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
  total_lessons?: number;
  completed_lessons?: number;
  last_accessed?: string;
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
  const { profile } = useUserProfile();
  const isViewOnly = profile?.role === 'view_only';

  // Register cleanup callback to clear cached data when going offline
  useEffect(() => {
    const unregister = offlineStateManager.registerCleanup(() => {
      console.log('🔴 StudentDashboard: Clearing cached course data (offline)');
      setCourses([]);
      setDashboardStats(null);
      setUpcomingAssignments([]);
      setRecentActivity([]);
    });

    return unregister;
  }, []);

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!userProfile?.id) {
        setLoading(false);
        return;
      }

      // Skip fetch when offline to prevent failed requests
      if (!navigator.onLine) {
        console.log('🔴 StudentDashboard: Offline - skipping dashboard data fetch');
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

        // Process courses with signed URLs (only when online)
        if (coursesData) {
          const coursesWithSignedUrls = await Promise.all(coursesData.map(async (course: any) => {
            let imageUrl = '/placeholder.svg';
            // Only create signed URLs if online
            if (course.image_url && navigator.onLine) {
              try {
                const { data: signedUrlData, error } = await supabase.storage
                  .from('dil-lms')
                  .createSignedUrl(course.image_url, 60);

                if (error) {
                  console.error(`Failed to get signed URL for course image: ${course.image_url}`, error);
                } else {
                  imageUrl = signedUrlData.signedUrl;
                }
              } catch (error) {
                console.log('🔴 StudentDashboard: Failed to create signed URL (might be offline):', error);
                // Keep placeholder image
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
              last_accessed: course.last_accessed
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
        <div className="relative p-4 sm:p-6 md:p-8 rounded-3xl">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-primary/10 to-primary/20 rounded-2xl flex items-center justify-center shadow-lg flex-shrink-0">
              <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight bg-gradient-to-r from-primary via-primary to-primary/80 bg-clip-text text-transparent leading-tight">
                Welcome back, {userProfile.first_name}!
              </h1>
              <p className="text-sm sm:text-base md:text-lg text-muted-foreground font-light">
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

      {/* My Courses - Overview Style */}
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-primary/10 to-primary/20 rounded-xl flex items-center justify-center shadow-lg flex-shrink-0">
              <BookOpen className="w-4 h-4 text-primary" />
            </div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">My Courses</h2>
          </div>
          <Link to="/dashboard/courses">
            <Button variant="outline" size="sm" className="hover:bg-primary hover:text-primary-foreground transition-all duration-200 text-sm">
              <span className="hidden sm:inline">View All</span>
              <span className="sm:hidden">All</span>
              <BookOpen className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        </div>
        
        {courses.length === 0 ? (
          <Card className="bg-gradient-to-br from-card to-card/50 dark:bg-card border border-gray-200/50 dark:border-gray-700/50 rounded-3xl shadow-lg overflow-hidden">
            <CardContent className="py-16">
              <EmptyState
                title="No Courses Enrolled"
                description="Wait for the teacher to enroll you into a course"
                icon={<BookOpen className="h-12 w-12 text-muted-foreground" />}
              />
            </CardContent>
          </Card>
        ) : (
          <Card className="bg-gradient-to-br from-card to-card/50 dark:bg-card border border-gray-200/50 dark:border-gray-700/50 rounded-3xl shadow-lg overflow-hidden">
            <CardContent className="p-6">
              <div className="space-y-4">
                {courses.slice(0, 4).map((course, index) => {
                  const getLastAccessedText = (lastAccessed: string | undefined) => {
                    if (!lastAccessed) return 'Never';
                    const date = new Date(lastAccessed);
                    const now = new Date();
                    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
                    
                    if (diffInHours < 1) return 'Just now';
                    if (diffInHours < 24) return `${diffInHours}h ago`;
                    const diffInDays = Math.floor(diffInHours / 24);
                    if (diffInDays < 7) return `${diffInDays}d ago`;
                    const diffInWeeks = Math.floor(diffInDays / 7);
                    if (diffInWeeks < 4) return `${diffInWeeks}w ago`;
                    return date.toLocaleDateString();
                  };

                  const getProgressStatus = (progress: number | undefined) => {
                    if (!progress || progress === 0) return { icon: Play, text: 'Not Started', color: 'text-muted-foreground' };
                    if (progress === 100) return { icon: CheckCircle, text: 'Completed', color: 'text-green-600' };
                    return { icon: Activity, text: 'In Progress', color: 'text-primary' };
                  };

                  const status = getProgressStatus(course.progress);

                  return (
                    <div key={course.id} className={`group flex items-start gap-4 p-4 rounded-2xl hover:bg-muted/50 transition-all duration-200 ${index !== courses.slice(0, 4).length - 1 ? 'border-b border-border/50 pb-4' : ''}`}>
                      {/* Course Image with Status Badge */}
                      <div className="flex-shrink-0 relative">
                        <div className="w-14 h-14 rounded-xl overflow-hidden bg-muted shadow-sm">
                          {course.image_url ? (
                            <img 
                              src={course.image_url} 
                              alt={course.title} 
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.style.display = 'none';
                                target.nextElementSibling?.classList.remove('hidden');
                              }}
                            />
                          ) : null}
                          <div className={`w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/10 to-primary/20 ${course.image_url ? 'hidden' : ''}`}>
                            <BookOpen className="w-6 h-6 text-primary/60" />
                          </div>
                        </div>
                        {/* Progress Status Badge */}
                        <div className={`absolute -top-1 -right-1 w-5 h-5 rounded-full bg-background border-2 border-background flex items-center justify-center shadow-sm`}>
                          <status.icon className={`w-3 h-3 ${status.color}`} />
                        </div>
                      </div>

                      {/* Course Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-sm text-foreground truncate group-hover:text-primary transition-colors mb-1">
                              {course.title}
                            </h3>
                            <p className="text-xs text-muted-foreground truncate">{course.subtitle}</p>
                          </div>
                          {course.progress !== undefined && course.progress !== null && (
                            <div className="flex items-center gap-2 ml-3 flex-shrink-0">
                              <span className="text-xs font-medium text-primary">
                                {course.progress}%
                              </span>
                              {course.progress === 100 && (
                                <Star className="w-3 h-3 text-yellow-500 fill-current" />
                              )}
                            </div>
                          )}
                        </div>

                        {/* Course Metrics */}
                        <div className="flex items-center gap-4 mb-3 text-xs text-muted-foreground">
                          {course.total_lessons && (
                            <div className="flex items-center gap-1">
                              <BookOpen className="w-3 h-3" />
                              <span>{course.completed_lessons !== undefined && course.completed_lessons !== null ? course.completed_lessons : 0}/{course.total_lessons} lessons</span>
                            </div>
                          )}
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            <span>Last: {getLastAccessedText(course.last_accessed)}</span>
                          </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="w-full bg-muted rounded-full h-2 overflow-hidden mb-3">
                          <div 
                            className="bg-gradient-to-r from-primary to-primary/80 h-2 rounded-full transition-all duration-500" 
                            style={{ width: `${course.progress || 0}%` }}
                          />
                        </div>

                        {/* Action Button */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className={`text-xs font-medium ${status.color}`}>
                              {status.text}
                            </span>
                          </div>
                          <Link to={course.progress && course.progress > 0 ? `/dashboard/courses/${course.id}/content` : `/dashboard/courses/${course.id}`}>
                            <Button 
                              size="sm" 
                              variant="outline"
                              className="h-7 px-3 text-xs hover:bg-primary hover:text-primary-foreground transition-all duration-200"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {isViewOnly ? (
                                <>
                                  Preview
                                  <Eye className="w-3 h-3 ml-1" />
                                </>
                              ) : (
                                <>
                                  {course.progress && course.progress > 0 ? 'Continue' : 'Start'}
                                  {course.progress && course.progress > 0 ? (
                                    <Play className="w-3 h-3 ml-1" />
                                  ) : (
                                    <Eye className="w-3 h-3 ml-1" />
                                  )}
                                </>
                              )}
                            </Button>
                          </Link>
                        </div>
                      </div>
                    </div>
                  );
                })}
                
                {/* Show More Link */}
                {courses.length > 4 && (
                  <div className="pt-2 border-t border-border/50">
                    <Link to="/dashboard/courses">
                      <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors py-2">
                        <span>View {courses.length - 4} more courses</span>
                        <TrendingUp className="w-4 h-4" />
                      </div>
                    </Link>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Quick Actions & Upcoming Assignments - Enhanced Premium Redesign */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        {/* Upcoming Assignments - Enhanced Apple Style */}
        <Card className="group relative bg-gradient-to-br from-card to-card/50 dark:bg-card border border-gray-200/60 dark:border-gray-700/60 hover:border-gray-300/80 dark:hover:border-gray-600/80 hover:shadow-2xl hover:shadow-primary/10 transition-all duration-500 rounded-3xl overflow-hidden backdrop-blur-sm">
          {/* Subtle accent line */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-orange-400 via-orange-500 to-orange-600 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          
          <CardHeader className="pb-6 relative">
            <CardTitle className="flex items-center gap-3 text-xl font-bold text-gray-900 dark:text-gray-100">
              <div className="w-10 h-10 bg-gradient-to-br from-orange-400/20 via-orange-500/30 to-orange-600/20 rounded-2xl flex items-center justify-center shadow-lg ring-1 ring-orange-500/20 group-hover:ring-orange-500/40 transition-all duration-300">
                <Clock className="h-5 w-5 text-orange-600 dark:text-orange-500" />
              </div>
              <span className="bg-gradient-to-r from-gray-900 to-gray-700 dark:from-gray-100 dark:to-gray-300 bg-clip-text text-transparent">
                Upcoming Assignments
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {upcomingAssignments.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-20 h-20 bg-gradient-to-br from-green-400/20 via-green-500/30 to-green-600/20 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl ring-1 ring-green-500/20 group-hover:ring-green-500/40 transition-all duration-300">
                  <Calendar className="h-10 w-10 text-green-600 dark:text-green-500" />
                </div>
                <p className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-3 bg-gradient-to-r from-green-600 to-green-700 dark:from-green-400 dark:to-green-500 bg-clip-text text-transparent">
                  All Caught Up!
                </p>
                <p className="text-sm text-muted-foreground font-medium">No upcoming assignments</p>
              </div>
            ) : (
              <div className="space-y-4">
                {upcomingAssignments.map((assignment) => (
                  <div key={assignment.assignment_id} className="group/item p-5 border border-gray-200/60 dark:border-gray-700/60 rounded-2xl hover:bg-gradient-to-r hover:from-gray-50/80 hover:to-white/60 dark:hover:from-gray-800/80 dark:hover:to-gray-700/60 hover:border-gray-300/80 dark:hover:border-gray-600/80 hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-primary/20 via-primary/30 to-primary/40 rounded-2xl flex items-center justify-center shadow-lg ring-1 ring-primary/20 group-hover/item:ring-primary/40 transition-all duration-300">
                          <FileText className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900 dark:text-gray-100 text-base">{assignment.assignment_title}</p>
                          <p className="text-sm text-muted-foreground font-medium">{assignment.course_title}</p>
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
                          className="mt-2 font-medium shadow-sm"
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

        {/* Recent Activity - Enhanced Apple Style */}
        <Card className="group relative bg-gradient-to-br from-card to-card/50 dark:bg-card border border-gray-200/60 dark:border-gray-700/60 hover:border-gray-300/80 dark:hover:border-gray-600/80 hover:shadow-2xl hover:shadow-blue-500/10 transition-all duration-500 rounded-3xl overflow-hidden backdrop-blur-sm">
          {/* Subtle accent line */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-400 via-blue-500 to-blue-600 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          
          <CardHeader className="pb-6 relative">
            <CardTitle className="flex items-center gap-3 text-xl font-bold text-gray-900 dark:text-gray-100">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-400/20 via-blue-500/30 to-blue-600/20 rounded-2xl flex items-center justify-center shadow-lg ring-1 ring-blue-500/20 group-hover:ring-blue-500/40 transition-all duration-300">
                <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-500" />
              </div>
              <span className="bg-gradient-to-r from-gray-900 to-gray-700 dark:from-gray-100 dark:to-gray-300 bg-clip-text text-transparent">
                Recent Activity
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {recentActivity.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-20 h-20 bg-gradient-to-br from-blue-400/20 via-blue-500/30 to-blue-600/20 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl ring-1 ring-blue-500/20 group-hover:ring-blue-500/40 transition-all duration-300">
                  <Users className="h-10 w-10 text-blue-600 dark:text-blue-500" />
                </div>
                <p className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-3 bg-gradient-to-r from-blue-600 to-blue-700 dark:from-blue-400 dark:to-blue-500 bg-clip-text text-transparent">
                  Start Learning
                </p>
                <p className="text-sm text-muted-foreground font-medium">Begin your journey to see updates here</p>
              </div>
            ) : (
              <div className="space-y-4">
                {recentActivity.map((activity, index) => (
                  <div key={index} className="group/item p-5 border border-gray-200/60 dark:border-gray-700/60 rounded-2xl hover:bg-gradient-to-r hover:from-gray-50/80 hover:to-white/60 dark:hover:from-gray-800/80 dark:hover:to-gray-700/60 hover:border-gray-300/80 dark:hover:border-gray-600/80 hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
                    <div className="flex items-start space-x-4">
                      <div className="flex-shrink-0 mt-1">
                        <div className="w-4 h-4 bg-gradient-to-r from-primary via-primary/90 to-primary/80 rounded-full shadow-lg ring-2 ring-primary/20 group-hover/item:ring-primary/40 transition-all duration-300" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100 leading-relaxed">{activity.activity_description}</p>
                        <p className="text-xs text-muted-foreground mt-2 font-medium flex items-center gap-2">
                          <Calendar className="h-3 w-3" />
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
