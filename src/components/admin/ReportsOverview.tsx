
import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Legend } from 'recharts';
import { Users, GraduationCap, BookOpen, TrendingUp, Clock, Star, Award, BarChart3 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Skeleton } from '@/components/ui/skeleton';
import { ContentLoader } from '@/components/ContentLoader';
import { Button } from '@/components/ui/button';
import { ExportButton } from '@/components/ui/ExportButton';
import { ReportData, ExportColumn } from '@/services/universalExportService';

// TypeScript interfaces for database data
interface DashboardStats {
  total_users: number;
  total_teachers: number;
  total_students: number;
  total_admins: number;
  total_courses: number;
  active_courses: number;
  completed_assignments: number;
  active_discussions: number;
  avg_engagement: number;
  new_users_this_month: number;
  course_completion_rate: number;
  total_logins: number;
  active_users_percentage: number;
  course_engagement_percentage: number;
  discussion_participation_percentage: number;
  assignment_completion_percentage: number;
}

interface UserGrowthData {
  period_label: string;
  new_users: number;
  active_users: number;
  churn_rate: number;
}

interface PlatformStatsData {
  category_name: string;
  value: number;
  color_code: string;
}

interface CourseAnalyticsData {
  course_title: string;
  enrolled_students: number;
  completion_rate: number;
  avg_rating: number;
}

interface EngagementData {
  period_label: string;
  active_users: number;
  time_spent: number;
  courses: number;
  discussions: number;
}

interface UserAnalyticsData {
  period_label: string;
  active_users: number;
  new_signups: number;
  churn_rate: number;
}

interface CoursePerformanceData {
  course_title: string;
  enrollments: number;
  completion_rate: number;
  avg_rating: number;
}

interface EngagementMetricsData {
  period_label: string;
  active_users: number;
  assignments_submitted: number;
  quiz_submissions: number;
  lessons_completed: number;
  discussions_created: number;
}

const chartConfig = {
  activeUsers: { label: 'Active Users', color: '#8884d8' },
  newSignups: { label: 'New Signups', color: '#82ca9d' },
  churnRate: { label: 'Churn Rate (%)', color: '#ffc658' },
  enrollments: { label: 'Enrollments', color: '#8884d8' },
  completionRate: { label: 'Completion Rate (%)', color: '#82ca9d' },
  avgRating: { label: 'Avg Rating', color: '#ffc658' },
  timeSpent: { label: 'Time Spent (min)', color: '#8884d8' },
  quizScore: { label: 'Quiz Score (%)', color: '#82ca9d' },
  assignmentsSubmitted: { label: 'Assignments Submitted', color: '#ff7300' },
  quizSubmissions: { label: 'Quiz Submissions', color: '#00c49f' },
  lessonsCompleted: { label: 'Lessons Completed', color: '#0088fe' },
  discussionsCreated: { label: 'Discussions Created', color: '#ffc0cb' },
};

export const ReportsOverview = () => {
  const [timeRange, setTimeRange] = useState('alltime');
  const [loading, setLoading] = useState(true);
  const [filterLoading, setFilterLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  
  // State for dashboard data
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [userGrowthData, setUserGrowthData] = useState<UserGrowthData[]>([]);
  const [platformStatsData, setPlatformStatsData] = useState<PlatformStatsData[]>([]);
  const [courseAnalyticsData, setCourseAnalyticsData] = useState<CourseAnalyticsData[]>([]);
  const [engagementData, setEngagementData] = useState<EngagementData[]>([]);
  const [userAnalyticsData, setUserAnalyticsData] = useState<UserAnalyticsData[]>([]);
  const [coursePerformanceData, setCoursePerformanceData] = useState<CoursePerformanceData[]>([]);
  const [engagementMetricsData, setEngagementMetricsData] = useState<EngagementMetricsData[]>([]);

  const { user } = useAuth();

  // Track screen size for responsive chart sizing
  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < 640);
    };

    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  // Fetch dashboard stats
  const fetchDashboardStats = async () => {
    try {
      const { data, error } = await supabase
        .rpc('get_admin_dashboard_stats', { time_range: timeRange });

      if (error) throw error;
      setStats(data?.[0] || null);
    } catch (err: any) {
      console.error('Error fetching dashboard stats:', err);
      setError(err.message);
    }
  };

  // Fetch user growth data
  const fetchUserGrowthData = async () => {
    try {
      const { data, error } = await supabase
        .rpc('get_user_growth_data', { time_range: timeRange });

      if (error) throw error;
      setUserGrowthData(data || []);
    } catch (err: any) {
      console.error('Error fetching user growth data:', err);
      setError(err.message);
    }
  };

  // Fetch platform stats data
  const fetchPlatformStatsData = async () => {
    try {
      const { data, error } = await supabase
        .rpc('get_platform_stats_data');

      if (error) throw error;
      setPlatformStatsData(data || []);
    } catch (err: any) {
      console.error('Error fetching platform stats data:', err);
      setError(err.message);
    }
  };

  // Fetch course analytics data
  const fetchCourseAnalyticsData = async () => {
    try {
      const { data, error } = await supabase
        .rpc('get_course_analytics_data');

      if (error) throw error;
      setCourseAnalyticsData(data || []);
    } catch (err: any) {
      console.error('Error fetching course analytics data:', err);
      setError(err.message);
    }
  };

  // Fetch engagement data
  const fetchEngagementData = async () => {
    try {
      const { data, error } = await supabase
        .rpc('get_engagement_data', { time_range: timeRange });

      if (error) throw error;
      setEngagementData(data || []);
    } catch (err: any) {
      console.error('Error fetching engagement data:', err);
      setError(err.message);
    }
  };

  // Fetch user analytics data
  const fetchUserAnalyticsData = async () => {
    try {
      const { data, error } = await supabase
        .rpc('get_user_analytics_data', { time_range: timeRange });

      if (error) throw error;
      setUserAnalyticsData(data || []);
    } catch (err: any) {
      console.error('Error fetching user analytics data:', err);
      setError(err.message);
    }
  };

  // Fetch course performance data
  const fetchCoursePerformanceData = async () => {
    try {
      console.log('🔍 [DEBUG] fetchCoursePerformanceData called');
      
      const { data, error } = await supabase
        .rpc('get_admin_course_analytics');

      console.log('🔍 [DEBUG] get_admin_course_analytics response:', { data, error });

      if (error) throw error;
      
      // Transform the data to match the expected interface
      const transformedData = data?.map((item: any) => ({
        course_title: item.course_title,
        enrollments: item.enrolled_students,
        completion_rate: item.completion_rate,
        avg_rating: item.average_score || 0
      })) || [];

      console.log('🔍 [DEBUG] Transformed course performance data:', transformedData);
      setCoursePerformanceData(transformedData);
    } catch (err: any) {
      console.error('Error fetching course performance data:', err);
      setError(err.message);
    }
  };

  // Fetch engagement metrics data
  const fetchEngagementMetricsData = async () => {
    try {
      const { data, error } = await supabase
        .rpc('get_engagement_metrics_data', { time_range: timeRange });

      if (error) throw error;
      setEngagementMetricsData(data || []);
    } catch (err: any) {
      console.error('Error fetching engagement metrics data:', err);
      setError(err.message);
    }
  };

  // Fetch all data
  const fetchAllData = async (isFilterChange = false) => {
    if (isFilterChange) {
      setFilterLoading(true);
    } else {
      setLoading(true);
    }
    setError(null);
    
    try {
      await Promise.all([
        fetchDashboardStats(),
        fetchUserGrowthData(),
        fetchPlatformStatsData(),
        fetchCourseAnalyticsData(),
        fetchEngagementData(),
        fetchUserAnalyticsData(),
        fetchCoursePerformanceData(),
        fetchEngagementMetricsData()
      ]);
    } catch (err: any) {
      console.error('Error fetching data:', err);
      setError(err.message);
    } finally {
      if (isFilterChange) {
        setFilterLoading(false);
      } else {
        setLoading(false);
      }
    }
  };

  // Fetch data when timeRange changes
  useEffect(() => {
    if (user) {
      if (loading) {
        // Initial load
        fetchAllData(false);
      } else {
        // Filter change
        fetchAllData(true);
      }
    }
  }, [timeRange, user]);

  // Retry function for error state
  const handleRetry = () => {
    fetchAllData(false);
  };

  // Process user analytics data to limit data points for better display
  const processedUserAnalyticsData = userAnalyticsData.length > 12 
    ? userAnalyticsData.slice(-12) // Show only last 12 data points if too many
    : userAnalyticsData;

  // Process engagement metrics data based on time range
  const processedEngagementMetricsData = (() => {
    const dataLength = engagementMetricsData.length;
    if (timeRange === '7days' && dataLength > 7) {
      return engagementMetricsData.slice(-7); // Show last 7 days
    } else if (timeRange === '30days' && dataLength > 30) {
      return engagementMetricsData.slice(-30); // Show last 30 days
    } else if (timeRange === '3months' && dataLength > 90) {
      return engagementMetricsData.slice(-90); // Show last 90 days
    } else if (timeRange === '6months' && dataLength > 180) {
      return engagementMetricsData.slice(-180); // Show last 180 days
    } else if (timeRange === '1year' && dataLength > 365) {
      return engagementMetricsData.slice(-365); // Show last 365 days
    } else if (timeRange === 'alltime' && dataLength > 30) {
      return engagementMetricsData.slice(-30); // Show last 30 days for alltime
    }
    return engagementMetricsData;
  })();

  // Prepare report data for export
  const exportReportData = useMemo((): ReportData | null => {
    if (!stats) return null;

    const timeRangeLabels: Record<string, string> = {
      '7days': 'Last 7 Days',
      '30days': 'Last 30 Days',
      '3months': 'Last 3 Months',
      '6months': 'Last 6 Months',
      '1year': 'Last Year',
      'alltime': 'All Time',
    };

    return {
      metadata: {
        title: 'Admin Performance Analytics Report',
        description: 'Comprehensive platform performance and analytics report',
        generatedBy: user?.email || 'Unknown',
        generatedAt: new Date(),
        timeRange: timeRangeLabels[timeRange] || timeRange,
      },
      summary: `This report contains comprehensive analytics for the platform. Total users: ${stats.total_users}, Total courses: ${stats.total_courses}, Engagement rate: ${stats.avg_engagement}%.`,
      metrics: [
        { label: 'Total Users', value: stats.total_users },
        { label: 'Total Teachers', value: stats.total_teachers },
        { label: 'Total Students', value: stats.total_students },
        { label: 'Total Admins', value: stats.total_admins },
        { label: 'Total Courses', value: stats.total_courses },
        { label: 'Active Courses', value: stats.active_courses },
        { label: 'Completed Assignments', value: stats.completed_assignments },
        { label: 'Active Discussions', value: stats.active_discussions },
        { label: 'Average Engagement', value: `${stats.avg_engagement}%` },
        { label: 'New Users This Month', value: stats.new_users_this_month },
        { label: 'Course Completion Rate', value: `${stats.course_completion_rate}%` },
        { label: 'Total Logins', value: stats.total_logins },
        { label: 'Active Users Percentage', value: `${stats.active_users_percentage}%` },
        { label: 'Course Engagement Percentage', value: `${stats.course_engagement_percentage}%` },
        { label: 'Discussion Participation', value: `${stats.discussion_participation_percentage}%` },
        { label: 'Assignment Completion', value: `${stats.assignment_completion_percentage}%` },
      ],
      tables: [
        {
          title: 'User Growth Trends',
          columns: [
            { header: 'Period', key: 'period_label', width: 20 },
            { header: 'New Users', key: 'new_users', width: 15 },
            { header: 'Active Users', key: 'active_users', width: 15 },
            { header: 'Churn Rate %', key: 'churn_rate', width: 15, format: (v) => `${v}%` },
          ],
          data: userGrowthData,
        },
        {
          title: 'Platform Statistics',
          columns: [
            { header: 'Category', key: 'category_name', width: 30 },
            { header: 'Value', key: 'value', width: 15 },
          ],
          data: platformStatsData,
        },
        {
          title: 'Course Analytics',
          columns: [
            { header: 'Course Title', key: 'course_title', width: 40 },
            { header: 'Enrolled Students', key: 'enrolled_students', width: 18 },
            { header: 'Completion Rate %', key: 'completion_rate', width: 18, format: (v) => `${v}%` },
            { header: 'Avg Rating', key: 'avg_rating', width: 15 },
          ],
          data: courseAnalyticsData,
        },
        {
          title: 'Course Performance',
          columns: [
            { header: 'Course Title', key: 'course_title', width: 40 },
            { header: 'Enrollments', key: 'enrollments', width: 15 },
            { header: 'Completion Rate %', key: 'completion_rate', width: 18, format: (v) => `${v}%` },
            { header: 'Avg Rating', key: 'avg_rating', width: 15 },
          ],
          data: coursePerformanceData,
        },
        {
          title: 'Engagement Data',
          columns: [
            { header: 'Period', key: 'period_label', width: 20 },
            { header: 'Active Users', key: 'active_users', width: 15 },
            { header: 'Time Spent (min)', key: 'time_spent', width: 18 },
            { header: 'Courses', key: 'courses', width: 15 },
            { header: 'Discussions', key: 'discussions', width: 15 },
          ],
          data: engagementData,
        },
        {
          title: 'User Analytics',
          columns: [
            { header: 'Period', key: 'period_label', width: 20 },
            { header: 'Active Users', key: 'active_users', width: 15 },
            { header: 'New Signups', key: 'new_signups', width: 15 },
            { header: 'Churn Rate %', key: 'churn_rate', width: 15, format: (v) => `${v}%` },
          ],
          data: userAnalyticsData,
        },
        {
          title: 'Engagement Metrics',
          columns: [
            { header: 'Period', key: 'period_label', width: 20 },
            { header: 'Active Users', key: 'active_users', width: 15 },
            { header: 'Assignments Submitted', key: 'assignments_submitted', width: 20 },
            { header: 'Quiz Submissions', key: 'quiz_submissions', width: 18 },
            { header: 'Lessons Completed', key: 'lessons_completed', width: 18 },
            { header: 'Discussions Created', key: 'discussions_created', width: 18 },
          ],
          data: engagementMetricsData,
        },
      ],
    };
  }, [stats, userGrowthData, platformStatsData, courseAnalyticsData, coursePerformanceData, engagementData, userAnalyticsData, engagementMetricsData, timeRange, user]);

  // Debug: Log the data being passed to the chart
  console.log('User Analytics Data:', processedUserAnalyticsData);
  console.log('Data length:', processedUserAnalyticsData.length);
  console.log('Engagement Metrics Data:', processedEngagementMetricsData);
  console.log('Engagement Metrics Data length:', processedEngagementMetricsData.length);

  // Generate summary cards from stats
  const summaryCards = [
    {
      title: 'Total Users',
      value: stats?.total_users?.toLocaleString() || '0',
      change: stats?.active_users_percentage ? `+${stats.active_users_percentage}%` : '+0%',
      icon: Users,
      color: 'text-blue-600'
    },
    {
      title: 'Total Courses',
      value: stats?.total_courses?.toString() || '0',
      change: stats?.active_courses ? `+${Math.round((stats.active_courses / stats.total_courses) * 100)}%` : '+0%',
      icon: BookOpen,
      color: 'text-green-600'
    },
    {
      title: 'Engagement Rate',
      value: `${stats?.avg_engagement || 0}%`,
      change: stats?.avg_engagement ? `+${stats.avg_engagement}%` : '+0%',
      icon: Award,
      color: 'text-purple-600'
    }
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <ContentLoader message="Loading reports..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h3 className="text-red-800 font-medium">Error loading dashboard data</h3>
          <p className="text-red-600 text-sm mt-1">{error}</p>
          <button 
            onClick={handleRetry}
            className="mt-2 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3 sm:space-y-4 md:space-y-6 px-3 sm:px-4 md:px-0">
      {/* Premium Header Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-primary/5 rounded-lg sm:rounded-xl md:rounded-2xl lg:rounded-3xl"></div>
        <div className="relative p-3 sm:p-4 md:p-6 lg:p-8 rounded-lg sm:rounded-xl md:rounded-2xl lg:rounded-3xl">
          {/* Desktop Layout: Side by side */}
          <div className="hidden lg:flex lg:items-center lg:justify-between gap-4">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-9 h-9 sm:w-10 sm:h-10 md:w-12 md:h-12 bg-gradient-to-br from-primary/10 to-primary/20 rounded-xl sm:rounded-2xl flex items-center justify-center flex-shrink-0">
                <BarChart3 className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight bg-gradient-to-r from-primary via-primary to-primary/80 bg-clip-text text-transparent" style={{ backgroundClip: 'text', WebkitBackgroundClip: 'text' }}>
                  Performance Analytics
                </h1>
                <p className="text-sm sm:text-base md:text-lg text-muted-foreground mt-1 sm:mt-2 leading-relaxed">
                  Monitor platform performance and user engagement
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
              {exportReportData && (
                <ExportButton
                  reportData={exportReportData}
                  filename="admin-performance-analytics"
                  variant="outline"
                  className="shrink-0"
                />
              )}
              
              <Select value={timeRange} onValueChange={setTimeRange}>
                <SelectTrigger className="w-40 sm:w-48 flex-shrink-0">
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
            </div>
          </div>

          {/* Mobile & Tablet Layout: Stacked */}
          <div className="flex flex-col gap-3 lg:hidden">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-9 h-9 sm:w-10 sm:h-10 bg-gradient-to-br from-primary/10 to-primary/20 rounded-xl flex items-center justify-center flex-shrink-0">
                <BarChart3 className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight bg-gradient-to-r from-primary via-primary to-primary/80 bg-clip-text text-transparent" style={{ backgroundClip: 'text', WebkitBackgroundClip: 'text' }}>
                  Performance Analytics
                </h1>
                <p className="text-xs sm:text-sm md:text-base text-muted-foreground mt-0.5 sm:mt-1 leading-tight sm:leading-relaxed">
                  Monitor platform performance and user engagement
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2 sm:gap-3 w-full">
              {exportReportData && (
                <ExportButton
                  reportData={exportReportData}
                  filename="admin-performance-analytics"
                  variant="outline"
                  className="shrink-0"
                />
              )}
              
              <Select value={timeRange} onValueChange={setTimeRange}>
                <SelectTrigger className="flex-1">
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
            </div>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-6">
        {summaryCards.map((card, index) => (
          <Card key={index} className="bg-gradient-to-br from-card to-green-500/5 dark:bg-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 sm:p-4 md:p-6">
              <CardTitle className="text-xs sm:text-sm font-medium">{card.title}</CardTitle>
              <card.icon className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground flex-shrink-0" />
            </CardHeader>
            <CardContent className="p-3 sm:p-4 md:p-6 pt-0">
              <div className="text-xl sm:text-2xl font-bold">{card.value}</div>
              <div className="flex items-center gap-2 mt-2">
                <div className="flex items-center gap-1 text-xs sm:text-sm text-green-600 dark:text-green-400">
                  <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                  <span className="font-medium">{card.change}</span>
                </div>
                <span className="text-[10px] sm:text-xs text-muted-foreground">vs last period</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

             {/* Main Reports Tabs */}
       <Tabs defaultValue="users" className="space-y-3 sm:space-y-4 md:space-y-6">
         <div className="overflow-x-auto -mx-3 sm:mx-0 px-3 sm:px-0">
           <TabsList className="grid w-full grid-cols-3 gap-1 sm:gap-2 h-auto p-1 sm:p-1.5 bg-muted/50">
             <TabsTrigger 
               value="users" 
               className="text-[10px] sm:text-xs md:text-sm px-2 sm:px-3 md:px-4 py-2 sm:py-2.5 data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-md sm:rounded-lg whitespace-nowrap"
             >
               <span className="hidden sm:inline">User Analytics</span>
               <span className="sm:hidden">Users</span>
             </TabsTrigger>
             <TabsTrigger 
               value="courses" 
               className="text-[10px] sm:text-xs md:text-sm px-2 sm:px-3 md:px-4 py-2 sm:py-2.5 data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-md sm:rounded-lg whitespace-nowrap"
             >
               <span className="hidden sm:inline">Course Performance</span>
               <span className="sm:hidden">Courses</span>
             </TabsTrigger>
             <TabsTrigger 
               value="engagement" 
               className="text-[10px] sm:text-xs md:text-sm px-2 sm:px-3 md:px-4 py-2 sm:py-2.5 data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-md sm:rounded-lg whitespace-nowrap"
             >
               Engagement
             </TabsTrigger>
           </TabsList>
         </div>

        {/* Filter Loading Overlay */}
        {filterLoading && (
                      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-10 flex items-center justify-center rounded-lg">
            <ContentLoader message="Loading reports..." />
          </div>
        )}

        {/* User Analytics Tab */}
        <TabsContent value="users" className="space-y-3 sm:space-y-4 md:space-y-6 relative">
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-3 sm:gap-4 md:gap-6">
            <Card className="border-0 shadow-sm sm:shadow-lg bg-gradient-to-br from-card to-blue-50/30 dark:to-blue-950/20">
              <CardHeader className="pb-3 sm:pb-4 p-3 sm:p-4 md:p-6">
                <CardTitle className="text-sm sm:text-base md:text-lg font-semibold">User Growth Trends</CardTitle>
              </CardHeader>
              <CardContent className="p-3 sm:p-4 md:p-6 pt-0">
                <div className="w-full h-[320px] sm:h-[360px] md:h-[400px]">
                  <ChartContainer config={chartConfig} className="w-full h-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart 
                        data={processedUserAnalyticsData} 
                        margin={{ top: 10, right: 15, left: 0, bottom: 60 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                        <XAxis 
                          dataKey="period_label" 
                          tick={{ fontSize: 9 }}
                          interval={0}
                          angle={-45}
                          textAnchor="end"
                          height={60}
                          minTickGap={5}
                          dy={8}
                          allowDataOverflow={false}
                          tickFormatter={(value) => {
                            // Convert date to appropriate format based on time range
                            if (value && typeof value === 'string' && value.includes('-')) {
                              const date = new Date(value);
                              if (timeRange === '7days') {
                                // Show day names for 7 days
                                return date.toLocaleDateString('en-US', { weekday: 'short' }); // Returns "Mon", "Tue", etc.
                              } else {
                                // Show dates for longer periods
                                return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }); // Returns "Jul 16", "Jul 17", etc.
                              }
                            }
                            return value;
                          }}
                        />
                        <YAxis tick={{ fontSize: 11 }} width={35} />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Line 
                          type="monotone" 
                          dataKey="active_users" 
                          stroke="var(--color-activeUsers)" 
                          strokeWidth={3}
                          name="Active Users"
                          dot={{ r: 4 }}
                          activeDot={{ r: 6 }}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="new_signups" 
                          stroke="var(--color-newSignups)" 
                          strokeWidth={3}
                          name="New Signups"
                          dot={{ r: 4 }}
                          activeDot={{ r: 6 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm sm:shadow-lg bg-gradient-to-br from-card to-green-50/30 dark:to-green-950/20">
              <CardHeader className="pb-3 sm:pb-4 p-3 sm:p-4 md:p-6">
                <CardTitle className="text-sm sm:text-base md:text-lg font-semibold">Platform Distribution</CardTitle>
              </CardHeader>
              <CardContent className="p-3 sm:p-4 md:p-6 pt-0">
                <div className="w-full h-[280px] sm:h-[320px] md:h-[360px]">
                  <ChartContainer config={chartConfig} className="w-full h-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={platformStatsData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ category_name, value }) => {
                            return window.innerWidth > 640 ? `${category_name} ${value}` : `${value}`;
                          }}
                          outerRadius="75%"
                          innerRadius="35%"
                          fill="#8884d8"
                          dataKey="value"
                          paddingAngle={2}
                        >
                          {platformStatsData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color_code} />
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

        {/* Course Performance Tab */}
        <TabsContent value="courses" className="space-y-3 sm:space-y-4 md:space-y-6 relative">
          <Card className="border-0 shadow-sm sm:shadow-lg bg-gradient-to-br from-card to-purple-50/30 dark:to-purple-950/20">
            <CardHeader className="pb-3 sm:pb-4 p-3 sm:p-4 md:p-6">
              <CardTitle className="text-sm sm:text-base md:text-lg font-semibold">Top Performing Courses</CardTitle>
            </CardHeader>
            <CardContent className="p-3 sm:p-4 md:p-6 pt-0">
              <div className="w-full h-[360px] sm:h-[380px] md:h-[420px]">
                <ChartContainer config={chartConfig} className="w-full h-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart 
                      data={coursePerformanceData} 
                      margin={{ 
                        top: isMobile ? 55 : 65, 
                        right: isMobile ? 10 : 15, 
                        left: 0, 
                        bottom: isMobile ? 55 : 60 
                      }}
                    >
                      <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                      <XAxis 
                        dataKey="course_title" 
                        angle={isMobile ? -50 : -45}
                        textAnchor="end"
                        height={60}
                        interval={0}
                        tick={{ fontSize: isMobile ? 7 : 9 }}
                        dy={8}
                      />
                      <YAxis tick={{ fontSize: isMobile ? 9 : 11 }} width={isMobile ? 30 : 35} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Legend 
                        wrapperStyle={{ 
                          fontSize: isMobile ? '8px' : '10px',
                          paddingBottom: isMobile ? '10px' : '12px',
                          display: 'flex',
                          justifyContent: 'center',
                          gap: isMobile ? '8px' : '12px'
                        }}
                        iconSize={isMobile ? 8 : 10}
                        iconType="rect"
                        layout="horizontal"
                        align="center"
                        verticalAlign="top"
                      />
                      <Bar dataKey="enrollments" fill="var(--color-enrollments)" name="Enrollments" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="completion_rate" fill="var(--color-completionRate)" name="Completion %" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Engagement Tab */}
        <TabsContent value="engagement" className="space-y-3 sm:space-y-4 md:space-y-6 relative">
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-3 sm:gap-4 md:gap-6">
            <Card className="border-0 shadow-sm sm:shadow-lg bg-gradient-to-br from-card to-orange-50/30 dark:to-orange-950/20">
              <CardHeader className="pb-3 sm:pb-4 p-3 sm:p-4 md:p-6">
                <CardTitle className="text-sm sm:text-base md:text-lg font-semibold">Platform Activity Overview</CardTitle>
              </CardHeader>
              <CardContent className="p-3 sm:p-4 md:p-6 pt-0">
                <div className="w-full h-[280px] sm:h-[320px] md:h-[360px]">
                  <ChartContainer config={chartConfig} className="w-full h-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart 
                        data={processedEngagementMetricsData} 
                        margin={{ top: 10, right: 15, left: 0, bottom: 60 }}
                      >
                      <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                      <XAxis 
                        dataKey="period_label" 
                        tick={{ fontSize: 9 }}
                        interval={0}
                        angle={-45}
                        textAnchor="end"
                        height={60}
                        minTickGap={5}
                        dy={8}
                      />
                      <YAxis tick={{ fontSize: 11 }} width={35} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="active_users" fill="var(--color-activeUsers)" name="Active Users" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="assignments_submitted" fill="var(--color-assignmentsSubmitted)" name="Assignments Submitted" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="quiz_submissions" fill="var(--color-quizSubmissions)" name="Quiz Submissions" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="lessons_completed" fill="var(--color-lessonsCompleted)" name="Lessons Completed" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="discussions_created" fill="var(--color-discussionsCreated)" name="Discussions Created" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm sm:shadow-lg bg-gradient-to-br from-card to-teal-50/30 dark:to-teal-950/20">
              <CardHeader className="pb-3 sm:pb-4 p-3 sm:p-4 md:p-6">
                <CardTitle className="text-sm sm:text-base md:text-lg font-semibold">Learning Activity Trends</CardTitle>
              </CardHeader>
              <CardContent className="p-3 sm:p-4 md:p-6 pt-0">
                <div className="w-full h-[280px] sm:h-[320px] md:h-[360px]">
                  <ChartContainer config={chartConfig} className="w-full h-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart 
                        data={processedEngagementMetricsData} 
                        margin={{ top: 10, right: 15, left: 0, bottom: 60 }}
                      >
                      <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                      <XAxis 
                        dataKey="period_label" 
                        tick={{ fontSize: 9 }}
                        interval={0}
                        angle={-45}
                        textAnchor="end"
                        height={60}
                        minTickGap={5}
                        dy={8}
                      />
                      <YAxis tick={{ fontSize: 11 }} width={35} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Line 
                        type="monotone" 
                        dataKey="quiz_submissions" 
                        stroke="var(--color-quizSubmissions)" 
                        strokeWidth={3}
                        name="Quiz Submissions"
                        dot={{ r: 4 }}
                        activeDot={{ r: 6 }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="lessons_completed" 
                        stroke="var(--color-lessonsCompleted)" 
                        strokeWidth={3}
                        name="Lessons Completed"
                        dot={{ r: 4 }}
                        activeDot={{ r: 6 }}
                      />
                    </LineChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

      </Tabs>


    </div>
  );
};
