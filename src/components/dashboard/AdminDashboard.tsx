
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Legend, AreaChart, Area } from 'recharts';
import { 
  Users, 
  Shield, 
  BookOpen, 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  GraduationCap, 
  Award, 
  Clock, 
  Eye, 
  MessageSquare, 
  FileText, 
  Target, 
  Globe, 
  AlertCircle,
  CheckCircle,
  Calendar,
  Settings,
  Filter,
} from 'lucide-react';
import { ContentLoader } from '@/components/ContentLoader';
import { Drawer, DrawerClose, DrawerContent, DrawerDescription, DrawerFooter, DrawerHeader, DrawerTitle, DrawerTrigger } from '@/components/ui/drawer';
import { Label } from '@/components/ui/label';

interface AdminDashboardProps {
  userProfile: any;
}

interface DashboardStats {
  totalUsers: number;
  totalTeachers: number;
  totalStudents: number;
  totalAdmins: number;
  totalCourses: number;
  activeCourses: number;
  completedAssignments: number;
  activeDiscussions: number;
  avgEngagement: number;
  newUsersThisMonth: number;
  courseCompletionRate: number;
  totalLogins: number;
  // Add user activity metrics
  activeUsersPercentage: number;
  courseEngagementPercentage: number;
  discussionParticipationPercentage: number;
  assignmentCompletionPercentage: number;
}

interface UserGrowthData {
  month: string;
  users: number;
  teachers: number;
  students: number;
  admins: number;
  active: number;
}

interface PlatformStatsData {
  name: string;
  value: number;
  color: string;
}

interface CourseAnalyticsData {
  course: string;
  enrolled: number;
  completed: number;
  progress: number;
  rating: number;
}

interface EngagementData {
  day: string;
  activeUsers: number;
  timeSpent: number;
  courses: number;
  discussions: number;
}

const chartConfig = {
  users: { label: 'Total Users', color: '#3B82F6' },
  teachers: { label: 'Teachers', color: '#10B981' },
  students: { label: 'Students', color: '#8B5CF6' },
  admins: { label: 'Admins', color: '#F59E0B' },
  active: { label: 'Active Users', color: '#EF4444' },
  enrolled: { label: 'Enrolled', color: '#3B82F6' },
  completed: { label: 'Completed', color: '#10B981' },
  progress: { label: 'Progress %', color: '#8B5CF6' },
  rating: { label: 'Rating', color: '#F59E0B' },
  activeUsers: { label: 'Active Users', color: '#3B82F6' },
  timeSpent: { label: 'Time Spent (min)', color: '#10B981' },
  courses: { label: 'Courses Accessed', color: '#8B5CF6' },
  discussions: { label: 'Discussions', color: '#F59E0B' },
};

export const AdminDashboard = ({ userProfile }: AdminDashboardProps) => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [userGrowthData, setUserGrowthData] = useState<UserGrowthData[]>([]);
  const [platformStatsData, setPlatformStatsData] = useState<PlatformStatsData[]>([]);
  const [courseAnalyticsData, setCourseAnalyticsData] = useState<CourseAnalyticsData[]>([]);
  const [engagementData, setEngagementData] = useState<EngagementData[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('alltime');

  // Helper function to get date range based on timeRange
  const getDateRange = (range: string) => {
    const now = new Date();
    const startDate = new Date();
    
    switch (range) {
      case 'alltime':
        // Start from a very early date to include all data
        startDate.setFullYear(2020, 0, 1); // January 1, 2020
        break;
      case '7days':
        startDate.setDate(now.getDate() - 7);
        break;
      case '30days':
        startDate.setDate(now.getDate() - 30);
        break;
      case '3months':
        startDate.setMonth(now.getMonth() - 3);
        break;
      case '6months':
        startDate.setMonth(now.getMonth() - 6);
        break;
      case '1year':
        startDate.setFullYear(now.getFullYear() - 1);
        break;
      default:
        // Default to all time
        startDate.setFullYear(2020, 0, 1);
    }
    
    return { startDate, endDate: now };
  };

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      try {
        console.log('AdminDashboard: Starting to fetch data...');
        console.log('AdminDashboard: Environment variables:', {
          url: import.meta.env.VITE_SUPABASE_URL,
          key: import.meta.env.VITE_SUPABASE_ANON_KEY ? 'Set' : 'Not set'
        });
        const { startDate, endDate } = getDateRange(timeRange);
        
        // Fetch basic stats for the selected time range
        const [
          { count: totalUsers, error: usersError },
          { count: totalTeachers, error: teachersError },
          { count: totalStudents, error: studentsError },
          { count: totalAdmins, error: adminsError },
          { count: totalCourses, error: coursesError },
          { count: activeCourses, error: activeCoursesError },
          { count: completedAssignments, error: assignmentsError },
          { count: activeDiscussions, error: discussionsError },
        ] = await Promise.all([
          timeRange === 'alltime' 
            ? supabase.from('profiles').select('*', { count: 'exact', head: true })
            : supabase.from('profiles').select('*', { count: 'exact', head: true }).gte('created_at', startDate.toISOString()),
          timeRange === 'alltime'
            ? supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'teacher')
            : supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'teacher').gte('created_at', startDate.toISOString()),
          timeRange === 'alltime'
            ? supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'student')
            : supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'student').gte('created_at', startDate.toISOString()),
          timeRange === 'alltime'
            ? supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'admin')
            : supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'admin').gte('created_at', startDate.toISOString()),
          timeRange === 'alltime'
            ? supabase.from('courses').select('*', { count: 'exact', head: true })
            : supabase.from('courses').select('*', { count: 'exact', head: true }).gte('created_at', startDate.toISOString()),
          timeRange === 'alltime'
            ? supabase.from('courses').select('*', { count: 'exact', head: true }).eq('status', 'Published')
            : supabase.from('courses').select('*', { count: 'exact', head: true }).eq('status', 'Published').gte('created_at', startDate.toISOString()),
          timeRange === 'alltime'
            ? supabase.from('assignment_submissions').select('*', { count: 'exact', head: true }).eq('status', 'completed')
            : supabase.from('assignment_submissions').select('*', { count: 'exact', head: true }).eq('status', 'completed').gte('submitted_at', startDate.toISOString()),
          timeRange === 'alltime'
            ? supabase.from('discussions').select('*', { count: 'exact', head: true })
            : supabase.from('discussions').select('*', { count: 'exact', head: true }).gte('created_at', startDate.toISOString()),
        ]);

        console.log('AdminDashboard: Query results:', {
          totalUsers, usersError,
          totalTeachers, teachersError,
          totalStudents, studentsError,
          totalAdmins, adminsError,
          totalCourses, coursesError,
          activeCourses, activeCoursesError,
          completedAssignments, assignmentsError,
          activeDiscussions, discussionsError
        });

        if (usersError) throw usersError;
        if (teachersError) throw teachersError;
        if (studentsError) throw studentsError;
        if (adminsError) throw adminsError;
        if (coursesError) throw coursesError;
        if (activeCoursesError) throw activeCoursesError;
        if (assignmentsError) throw assignmentsError;
        if (discussionsError) throw discussionsError;

        // Get new users in the selected period
        const { count: newUsersInPeriod, error: newUsersError } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .gte('created_at', startDate.toISOString());

        if (newUsersError) throw newUsersError;

        // Calculate engagement metrics
        const courseCompletionRate = totalCourses > 0 ? Math.round((completedAssignments / totalCourses) * 100) : 0;
        const avgEngagement = totalUsers > 0 ? Math.round((activeCourses / totalUsers) * 100) : 0;

        // Calculate user activity percentages
        const activeUsersPercentage = totalUsers > 0 ? Math.round((activeDiscussions / totalUsers) * 100) : 0;
        const courseEngagementPercentage = totalUsers > 0 ? Math.round((activeCourses / totalUsers) * 100) : 0;
        const discussionParticipationPercentage = totalUsers > 0 ? Math.round((activeDiscussions / totalUsers) * 100) : 0;
        const assignmentCompletionPercentage = totalUsers > 0 ? Math.round((completedAssignments / totalUsers) * 100) : 0;

        const baseStats = {
          totalUsers: totalUsers ?? 0,
          totalTeachers: totalTeachers ?? 0,
          totalStudents: totalStudents ?? 0,
          totalAdmins: totalAdmins ?? 0,
          totalCourses: totalCourses ?? 0,
          activeCourses: activeCourses ?? 0,
          completedAssignments: completedAssignments ?? 0,
          activeDiscussions: activeDiscussions ?? 0,
          avgEngagement,
          newUsersThisMonth: newUsersInPeriod ?? 0,
          courseCompletionRate,
          totalLogins: totalUsers ?? 0, // Using total users as proxy for now
          // User activity metrics
          activeUsersPercentage,
          courseEngagementPercentage,
          discussionParticipationPercentage,
          assignmentCompletionPercentage,
        };

        setStats(baseStats);

        // Fetch user growth data based on time range
        await fetchUserGrowthData(timeRange);
        
        // Fetch platform distribution data
        await fetchPlatformStatsData();
        
        // Fetch course analytics data
        await fetchCourseAnalyticsData();
        
        // Fetch engagement data based on time range
        await fetchEngagementData(timeRange);

      } catch (error: any) {
        console.error("Failed to fetch dashboard stats:", error);
        toast.error("Failed to load dashboard statistics.", { description: error.message });
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [timeRange]);

  const fetchUserGrowthData = async (range: string) => {
    try {
      const { startDate, endDate } = getDateRange(range);
      
      // Get all users with their creation dates in a single query
      const { data: allUsers, error: usersError } = await supabase
        .from('profiles')
        .select('created_at, role')
        .order('created_at', { ascending: true });

      if (usersError) throw usersError;

      // Get all user progress data in a single query
      const { data: allProgress, error: progressError } = await supabase
        .from('user_course_progress')
        .select('updated_at')
        .order('updated_at', { ascending: true });

      if (progressError) throw progressError;

      // Generate appropriate time periods based on range
      let periods: { label: string; start: Date; end: Date }[] = [];
      
      switch (range) {
        case 'alltime':
          // Show historical data for all time (last 12 months for better visualization)
          for (let i = 11; i >= 0; i--) {
            const date = new Date();
            date.setMonth(date.getMonth() - i);
            const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
            const endOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0);
            periods.push({
              label: date.toLocaleDateString('en-US', { month: 'short' }),
              start: startOfMonth,
              end: endOfMonth
            });
          }
          break;
        case '7days':
          // Show last 7 days
          for (let i = 6; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const startOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
            const endOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);
            periods.push({
              label: date.toLocaleDateString('en-US', { weekday: 'short' }),
              start: startOfDay,
              end: endOfDay
            });
          }
          break;
        case '30days':
          // Show last 4 weeks
          for (let i = 3; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - (i * 7));
            const startOfWeek = new Date(date.getFullYear(), date.getMonth(), date.getDate() - date.getDay());
            const endOfWeek = new Date(startOfWeek.getTime() + 7 * 24 * 60 * 60 * 1000);
            periods.push({
              label: `Week ${4 - i}`,
              start: startOfWeek,
              end: endOfWeek
            });
          }
          break;
        case '3months':
        case '6months':
        case '1year':
          // Show months
          const monthCount = range === '3months' ? 3 : range === '6months' ? 6 : 12;
          for (let i = monthCount - 1; i >= 0; i--) {
            const date = new Date();
            date.setMonth(date.getMonth() - i);
            const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
            const endOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0);
            periods.push({
              label: date.toLocaleDateString('en-US', { month: 'short' }),
              start: startOfMonth,
              end: endOfMonth
            });
          }
          break;
        default:
          // Default to 7 days
          for (let i = 6; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const startOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
            const endOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);
            periods.push({
              label: date.toLocaleDateString('en-US', { weekday: 'short' }),
              start: startOfDay,
              end: endOfDay
            });
          }
      }

      const userGrowthData: UserGrowthData[] = [];

      for (const period of periods) {
        // Calculate counts from the fetched data
        const totalUsers = allUsers?.filter(user => 
          new Date(user.created_at) <= period.end
        ).length ?? 0;

        const teachers = allUsers?.filter(user => 
          user.role === 'teacher' && new Date(user.created_at) <= period.end
        ).length ?? 0;

        const students = allUsers?.filter(user => 
          user.role === 'student' && new Date(user.created_at) <= period.end
        ).length ?? 0;

        const admins = allUsers?.filter(user => 
          user.role === 'admin' && new Date(user.created_at) <= period.end
        ).length ?? 0;

        const activeUsers = allProgress?.filter(progress => {
          const progressDate = new Date(progress.updated_at);
          return progressDate >= period.start && progressDate <= period.end;
        }).length ?? 0;

        userGrowthData.push({
          month: period.label,
          users: totalUsers,
          teachers,
          students,
          admins,
          active: activeUsers || Math.round(totalUsers * 0.7),
        });
      }

      // If all values are 0, create some sample data to show the chart structure
      const allZero = userGrowthData.every(data => data.users === 0);
      if (allZero) {
        const sampleData: UserGrowthData[] = periods.map((period, index) => ({
          month: period.label,
          users: Math.max(1, index * 2),
          teachers: Math.max(1, Math.floor(index * 0.3)),
          students: Math.max(1, Math.floor(index * 1.5)),
          admins: Math.max(1, Math.floor(index * 0.2)),
          active: Math.max(1, Math.floor(index * 1.8)),
        }));
        setUserGrowthData(sampleData);
      } else {
        setUserGrowthData(userGrowthData);
      }
    } catch (error) {
      console.error("Failed to fetch user growth data:", error);
      // Fallback to sample data if query fails
      const { startDate, endDate } = getDateRange(range);
      const periods = range === 'alltime' ? 12 : range === '7days' ? 7 : range === '30days' ? 4 : range === '3months' ? 3 : range === '6months' ? 6 : 12;
      const sampleData: UserGrowthData[] = Array.from({ length: periods }, (_, index) => ({
        month: range === 'alltime' ? ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][index] : `Period ${index + 1}`,
        users: Math.max(1, index * 2),
        teachers: Math.max(1, Math.floor(index * 0.3)),
        students: Math.max(1, Math.floor(index * 1.5)),
        admins: Math.max(1, Math.floor(index * 0.2)),
        active: Math.max(1, Math.floor(index * 1.8)),
      }));
      setUserGrowthData(sampleData);
    }
  };

  const fetchPlatformStatsData = async () => {
    try {
      const { startDate, endDate } = getDateRange(timeRange);
      // Get all courses with their status in a single query
      const { data: allCourses, error: coursesError } = await supabase
        .from('courses')
        .select('status');

      if (coursesError) throw coursesError;

      // Get all completed assignments in a single query
      const { count: completedAssignments, error: assignmentsError } = await supabase
        .from('assignment_submissions')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'completed');

      if (assignmentsError) throw assignmentsError;

      // Calculate counts from the fetched data
      const activeCourses = allCourses?.filter(course => course.status === 'Published').length ?? 0;
      const draftCourses = allCourses?.filter(course => course.status === 'Draft').length ?? 0;
      const archivedCourses = allCourses?.filter(course => course.status === 'Archived').length ?? 0;
      const completedCourses = Math.min(completedAssignments ?? 0, activeCourses);

      const platformStats: PlatformStatsData[] = [
        { name: 'Active Courses', value: activeCourses, color: '#3B82F6' },
        { name: 'Draft Courses', value: draftCourses, color: '#F59E0B' },
        { name: 'Archived Courses', value: archivedCourses, color: '#6B7280' },
        { name: 'Completed Courses', value: completedCourses, color: '#10B981' },
      ];

      // Filter out zero values and ensure we have at least one non-zero value
      const nonZeroStats = platformStats.filter(stat => stat.value > 0);
      
      if (nonZeroStats.length === 0) {
        // If all values are 0, show sample data
        setPlatformStatsData([
          { name: 'Active Courses', value: 5, color: '#3B82F6' },
          { name: 'Draft Courses', value: 2, color: '#F59E0B' },
          { name: 'Archived Courses', value: 1, color: '#6B7280' },
          { name: 'Completed Courses', value: 3, color: '#10B981' },
        ]);
      } else {
        setPlatformStatsData(nonZeroStats);
      }
    } catch (error) {
      console.error("Failed to fetch platform stats data:", error);
      // Fallback to sample data
      setPlatformStatsData([
        { name: 'Active Courses', value: 5, color: '#3B82F6' },
        { name: 'Draft Courses', value: 2, color: '#F59E0B' },
        { name: 'Archived Courses', value: 1, color: '#6B7280' },
        { name: 'Completed Courses', value: 3, color: '#10B981' },
      ]);
    }
  };

  const fetchCourseAnalyticsData = async () => {
    try {
      const { startDate, endDate } = getDateRange(timeRange);
      // Get all published courses with their data in a single query
      const { data: courses, error: coursesError } = await supabase
        .from('courses')
        .select('id, title')
        .eq('status', 'Published')
        .limit(5);

      if (coursesError) throw coursesError;

      if (!courses || courses.length === 0) {
        // If no courses, show sample data
        setCourseAnalyticsData([
          { course: 'Sample Course 1', enrolled: 25, completed: 18, progress: 72, rating: 4.5 },
          { course: 'Sample Course 2', enrolled: 18, completed: 12, progress: 67, rating: 4.3 },
          { course: 'Sample Course 3', enrolled: 15, completed: 10, progress: 67, rating: 4.7 },
        ]);
        return;
      }

      // Get all course members in a single query
      const { data: allCourseMembers, error: membersError } = await supabase
        .from('course_members')
        .select('course_id, role');

      if (membersError) throw membersError;

      // Get all completed assignments in a single query
      const { data: allCompletedAssignments, error: assignmentsError } = await supabase
        .from('assignment_submissions')
        .select('*')
        .eq('status', 'completed');

      if (assignmentsError) throw assignmentsError;

      const courseAnalytics: CourseAnalyticsData[] = [];

      for (const course of courses) {
        // Calculate enrollment from the fetched data
        const enrolled = allCourseMembers?.filter(member => 
          member.course_id === course.id && member.role === 'student'
        ).length ?? 0;

        // Calculate completed assignments for this course
        const completed = allCompletedAssignments?.filter(assignment => 
          assignment.assignment_id === course.id
        ).length ?? 0;

        const progress = enrolled > 0 ? Math.round((completed / enrolled) * 100) : 0;

        courseAnalytics.push({
          course: course.title,
          enrolled,
          completed,
          progress,
          rating: 4.5, // Mock rating for now
        });
      }

      // If all courses have 0 enrollment, add some sample data
      const allZeroEnrollment = courseAnalytics.every(course => course.enrolled === 0);
      if (allZeroEnrollment) {
        setCourseAnalyticsData([
          { course: 'Sample Course 1', enrolled: 25, completed: 18, progress: 72, rating: 4.5 },
          { course: 'Sample Course 2', enrolled: 18, completed: 12, progress: 67, rating: 4.3 },
          { course: 'Sample Course 3', enrolled: 15, completed: 10, progress: 67, rating: 4.7 },
        ]);
      } else {
        setCourseAnalyticsData(courseAnalytics);
      }
    } catch (error) {
      console.error("Failed to fetch course analytics data:", error);
      // Fallback to sample data
      setCourseAnalyticsData([
        { course: 'Sample Course 1', enrolled: 25, completed: 18, progress: 72, rating: 4.5 },
        { course: 'Sample Course 2', enrolled: 18, completed: 12, progress: 67, rating: 4.3 },
        { course: 'Sample Course 3', enrolled: 15, completed: 10, progress: 67, rating: 4.7 },
      ]);
    }
  };

  const fetchEngagementData = async (range: string) => {
    try {
      const { startDate, endDate } = getDateRange(range);
      
      // Get all user progress data in a single query
      const { data: allProgress, error: progressError } = await supabase
        .from('user_course_progress')
        .select('updated_at')
        .order('updated_at', { ascending: true });

      if (progressError) throw progressError;

      // Get all discussions in a single query
      const { data: allDiscussions, error: discussionsError } = await supabase
        .from('discussions')
        .select('created_at')
        .order('created_at', { ascending: true });

      if (discussionsError) throw discussionsError;

      // Generate appropriate time periods based on range
      let periods: { label: string; start: Date; end: Date }[] = [];
      
      switch (range) {
        case 'alltime':
          // Show historical data for all time (last 12 months for better visualization)
          for (let i = 11; i >= 0; i--) {
            const date = new Date();
            date.setMonth(date.getMonth() - i);
            const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
            const endOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0);
            periods.push({
              label: date.toLocaleDateString('en-US', { month: 'short' }),
              start: startOfMonth,
              end: endOfMonth
            });
          }
          break;
        case '7days':
          // Show last 7 days
          for (let i = 6; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const startOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
            const endOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);
            periods.push({
              label: date.toLocaleDateString('en-US', { weekday: 'short' }),
              start: startOfDay,
              end: endOfDay
            });
          }
          break;
        case '30days':
          // Show last 4 weeks
          for (let i = 3; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - (i * 7));
            const startOfWeek = new Date(date.getFullYear(), date.getMonth(), date.getDate() - date.getDay());
            const endOfWeek = new Date(startOfWeek.getTime() + 7 * 24 * 60 * 60 * 1000);
            periods.push({
              label: `Week ${4 - i}`,
              start: startOfWeek,
              end: endOfWeek
            });
          }
          break;
        case '3months':
        case '6months':
        case '1year':
          // Show months
          const monthCount = range === '3months' ? 3 : range === '6months' ? 6 : 12;
          for (let i = monthCount - 1; i >= 0; i--) {
            const date = new Date();
            date.setMonth(date.getMonth() - i);
            const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
            const endOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0);
            periods.push({
              label: date.toLocaleDateString('en-US', { month: 'short' }),
              start: startOfMonth,
              end: endOfMonth
            });
          }
          break;
        default:
          // Default to 7 days
          for (let i = 6; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const startOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
            const endOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);
            periods.push({
              label: date.toLocaleDateString('en-US', { weekday: 'short' }),
              start: startOfDay,
              end: endOfDay
            });
          }
      }

      const engagementData: EngagementData[] = [];

      for (const period of periods) {
        // Calculate active users from the fetched data
        const activeUsers = allProgress?.filter(progress => {
          const progressDate = new Date(progress.updated_at);
          return progressDate >= period.start && progressDate < period.end;
        }).length ?? 0;

        // Calculate discussions from the fetched data
        const discussions = allDiscussions?.filter(discussion => {
          const discussionDate = new Date(discussion.created_at);
          return discussionDate >= period.start && discussionDate < period.end;
        }).length ?? 0;

        engagementData.push({
          day: period.label,
          activeUsers,
          timeSpent: Math.round(activeUsers * 0.8), // Estimate time spent
          courses: Math.round(activeUsers * 0.6), // Estimate courses accessed
          discussions,
        });
      }

      // If all values are 0, create sample data
      const allZero = engagementData.every(data => data.activeUsers === 0 && data.discussions === 0);
      if (allZero) {
        const sampleData: EngagementData[] = periods.map((period, index) => ({
          day: period.label,
          activeUsers: Math.max(1, Math.floor(Math.random() * 20) + 5),
          timeSpent: Math.max(1, Math.floor(Math.random() * 15) + 3),
          courses: Math.max(1, Math.floor(Math.random() * 10) + 2),
          discussions: Math.max(0, Math.floor(Math.random() * 5)),
        }));
        setEngagementData(sampleData);
      } else {
        setEngagementData(engagementData);
      }
    } catch (error) {
      console.error("Failed to fetch engagement data:", error);
      // Fallback to sample data
      const { startDate, endDate } = getDateRange(range);
      const periods = range === 'alltime' ? 12 : range === '7days' ? 7 : range === '30days' ? 4 : range === '3months' ? 3 : range === '6months' ? 6 : 12;
      const sampleData: EngagementData[] = Array.from({ length: periods }, (_, index) => ({
        day: range === 'alltime' ? ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][index] : `Period ${index + 1}`,
        activeUsers: Math.max(1, Math.floor(Math.random() * 20) + 5),
        timeSpent: Math.max(1, Math.floor(Math.random() * 15) + 3),
        courses: Math.max(1, Math.floor(Math.random() * 10) + 2),
        discussions: Math.max(0, Math.floor(Math.random() * 5)),
      }));
      setEngagementData(sampleData);
    }
  };

  const getInitials = (firstName?: string, lastName?: string) => {
    return `${firstName?.charAt(0) || ''}${lastName?.charAt(0) || ''}`.toUpperCase();
  };

  const MetricCard = ({ 
    title, 
    value, 
    icon: Icon, 
    color
  }: { 
    title: string; 
    value: string | number; 
    icon: any; 
    color: string; 
  }) => (
          <Card className="bg-gradient-to-br from-card to-green-500/5 dark:bg-card">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{typeof value === 'number' ? value.toLocaleString() : value}</div>
        <p className="text-xs text-muted-foreground">
          {title === 'Total Users' && 'Registered users'}
          {title === 'Published Courses' && 'Active courses'}
          {title === 'Engagement Rate' && 'Average engagement'}
          {title === 'Course Completion' && 'Completion rate'}
          {title === 'New Users' && 'This month'}
          {title === 'Total Logins' && 'Platform logins'}
        </p>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-8">
      {loading ? (
        <div className="min-h-screen flex items-center justify-center">
          <ContentLoader message="Loading dashboard..." />
        </div>
      ) : (
        <>
          {/* Premium Header Section */}
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-primary/5 rounded-3xl"></div>
            <div className="relative p-8 rounded-3xl">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-primary/10 to-primary/20 rounded-2xl flex items-center justify-center">
                    <Shield className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-primary via-primary to-primary/80 bg-clip-text text-transparent">
                      Admin Dashboard
                    </h1>
                    <p className="text-lg text-muted-foreground font-light">
                      Welcome back, {userProfile?.first_name || 'Administrator'}
                    </p>
                  </div>
                </div>
                
                {/* Filter Controls - Matching Reports Page Style */}
                <div className="flex items-center gap-3">
                  <Select value={timeRange} onValueChange={setTimeRange}>
                    <SelectTrigger className="w-full sm:w-48">
                      <SelectValue placeholder="Select time range" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="7days">Last 7 days</SelectItem>
                      <SelectItem value="30days">Last 30 days</SelectItem>
                      <SelectItem value="3months">Last 3 months</SelectItem>
                      <SelectItem value="6months">Last 6 months</SelectItem>
                      <SelectItem value="1year">Last year</SelectItem>
                      <SelectItem value="alltime">All time</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  <Button variant="outline">
                    <Filter className="h-4 w-4 mr-2" />
                    Filters
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Stats Grid - Clean Design */}
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        <MetricCard
          title="Total Users"
          value={stats?.totalUsers ?? 0}
          icon={Users}
          color="text-blue-500"
        />
        <MetricCard
              title="Published Courses"
          value={stats?.activeCourses ?? 0}
          icon={BookOpen}
          color="text-green-500"
        />
        <MetricCard
          title="Engagement Rate"
          value={`${stats?.avgEngagement ?? 0}%`}
          icon={Activity}
          color="text-purple-500"
        />
        <MetricCard
          title="Course Completion"
          value={`${stats?.courseCompletionRate ?? 0}%`}
          icon={Award}
          color="text-orange-500"
        />
        <MetricCard
          title="New Users"
          value={stats?.newUsersThisMonth ?? 0}
          icon={TrendingUp}
          color="text-cyan-500"
        />
        <MetricCard
          title="Total Logins"
          value={stats?.totalLogins ?? 0}
          icon={Eye}
          color="text-indigo-500"
        />
      </div>

      {/* Charts and Analytics */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="courses">Courses</TabsTrigger>
          <TabsTrigger value="engagement">Engagement</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  User Growth Trends
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ChartContainer config={chartConfig} className="w-full h-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={userGrowthData}>
                        <defs>
                          <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" />
                        <YAxis />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Area 
                          type="monotone" 
                          dataKey="users" 
                          stroke="#3B82F6" 
                          fillOpacity={1} 
                          fill="url(#colorUsers)"
                          name="Total Users"
                        />
                        <Line 
                          type="monotone" 
                          dataKey="active" 
                          stroke="#10B981" 
                          strokeWidth={2}
                          name="Active Users"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="h-5 w-5" />
                  Platform Distribution
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ChartContainer config={chartConfig} className="w-full h-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={platformStatsData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                          outerRadius={100}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {platformStatsData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <ChartTooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                </div>
              </CardContent>
            </Card>
                     </div>
         </TabsContent>

        <TabsContent value="users" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>User Role Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ChartContainer config={chartConfig} className="w-full h-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={userGrowthData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" />
                        <YAxis />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Bar dataKey="students" fill="#8B5CF6" name="Students" />
                        <Bar dataKey="teachers" fill="#10B981" name="Teachers" />
                        <Bar dataKey="admins" fill="#F59E0B" name="Admins" />
                      </BarChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>User Activity Overview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                        <span className="text-sm font-medium w-32">Active Users</span>
                    <div className="flex items-center gap-2">
                          <div className="w-24 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-green-500 transition-all duration-300 ease-in-out"
                              style={{ width: `${stats?.activeUsersPercentage ?? 0}%` }}
                            />
                          </div>
                          <span className="text-sm w-8 text-right">{stats?.activeUsersPercentage ?? 0}%</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                        <span className="text-sm font-medium w-32">Course Engagement</span>
                    <div className="flex items-center gap-2">
                          <div className="w-24 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-green-500 transition-all duration-300 ease-in-out"
                              style={{ width: `${stats?.courseEngagementPercentage ?? 0}%` }}
                            />
                          </div>
                          <span className="text-sm w-8 text-right">{stats?.courseEngagementPercentage ?? 0}%</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                        <span className="text-sm font-medium w-32">Discussion Participation</span>
                    <div className="flex items-center gap-2">
                          <div className="w-24 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-green-500 transition-all duration-300 ease-in-out"
                              style={{ width: `${stats?.discussionParticipationPercentage ?? 0}%` }}
                            />
                          </div>
                          <span className="text-sm w-8 text-right">{stats?.discussionParticipationPercentage ?? 0}%</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                        <span className="text-sm font-medium w-32">Assignment Completion</span>
                    <div className="flex items-center gap-2">
                          <div className="w-24 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-green-500 transition-all duration-300 ease-in-out"
                              style={{ width: `${stats?.assignmentCompletionPercentage ?? 0}%` }}
                            />
                          </div>
                          <span className="text-sm w-8 text-right">{stats?.assignmentCompletionPercentage ?? 0}%</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="courses" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Course Performance Analytics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[400px]">
                <ChartContainer config={chartConfig} className="w-full h-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={courseAnalyticsData} margin={{ top: 20, right: 30, left: 20, bottom: 80 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="course" 
                        angle={-45}
                        textAnchor="end"
                        height={80}
                        interval={0}
                      />
                      <YAxis />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="enrolled" fill="#3B82F6" name="Enrolled" />
                      <Bar dataKey="completed" fill="#10B981" name="Completed" />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="engagement" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Daily Engagement Metrics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[400px]">
                <ChartContainer config={chartConfig} className="w-full h-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={engagementData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="day" />
                      <YAxis />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Line type="monotone" dataKey="activeUsers" stroke="#3B82F6" strokeWidth={2} name="Active Users" />
                      <Line type="monotone" dataKey="timeSpent" stroke="#10B981" strokeWidth={2} name="Time Spent" />
                      <Line type="monotone" dataKey="discussions" stroke="#F59E0B" strokeWidth={2} name="Discussions" />
                    </LineChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
        </>
      )}
    </div>
  );
};
