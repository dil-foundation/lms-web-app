
import { useState, useEffect } from 'react';
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
    <div className="space-y-8">
      {/* Premium Header Section */}
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-primary/5 rounded-3xl"></div>
        <div className="relative p-8 rounded-3xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-primary/10 to-primary/20 rounded-2xl flex items-center justify-center">
                <BarChart3 className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-primary via-primary to-primary/80 bg-clip-text text-transparent" style={{ backgroundClip: 'text', WebkitBackgroundClip: 'text', lineHeight: '3rem' }}>
                  Reports & Analytics
                </h1>
                <p className="text-lg text-muted-foreground font-light">
                  Monitor platform performance and user engagement
                </p>
              </div>
            </div>
            
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
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {summaryCards.map((card, index) => (
          <Card key={index} className="bg-gradient-to-br from-card to-green-500/5 dark:bg-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
              <card.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{card.value}</div>
              <div className="flex items-center gap-2 mt-2">
                <div className="flex items-center gap-1 text-sm text-green-600 dark:text-green-400">
                  <TrendingUp className="w-4 h-4" />
                  <span className="font-medium">{card.change}</span>
                </div>
                <span className="text-xs text-muted-foreground">vs last period</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

             {/* Main Reports Tabs */}
       <Tabs defaultValue="users" className="space-y-6">
         <div className="overflow-x-auto">
           <TabsList className="grid w-full grid-cols-3 min-w-fit">
             <TabsTrigger value="users" className="text-xs sm:text-sm">User Analytics</TabsTrigger>
             <TabsTrigger value="courses" className="text-xs sm:text-sm">Course Performance</TabsTrigger>
             <TabsTrigger value="engagement" className="text-xs sm:text-sm">Engagement</TabsTrigger>
           </TabsList>
         </div>

        {/* Filter Loading Overlay */}
        {filterLoading && (
                      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-10 flex items-center justify-center rounded-lg">
            <ContentLoader message="Loading reports..." />
          </div>
        )}

        {/* User Analytics Tab */}
        <TabsContent value="users" className="space-y-6 relative">
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg sm:text-xl">User Growth Trends</CardTitle>
              </CardHeader>
              <CardContent className="p-2 sm:p-6">
                <div className="w-full h-[350px] sm:h-[400px]">
                  <ChartContainer config={chartConfig} className="w-full h-full">
                    <LineChart 
                      data={processedUserAnalyticsData} 
                      width={600} 
                      height={350} 
                      margin={{ top: 5, right: 10, left: 10, bottom: 120 }}
                    >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis 
                          dataKey="period_label" 
                          tick={{ fontSize: 10 }}
                          interval={0}
                          angle={-45}
                          textAnchor="end"
                          height={120}
                          minTickGap={5}
                          dy={15}
                          dx={-5}
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
                        <YAxis tick={{ fontSize: 12 }} />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Line 
                          type="monotone" 
                          dataKey="active_users" 
                          stroke="var(--color-activeUsers)" 
                          strokeWidth={2}
                          name="Active Users"
                        />
                        <Line 
                          type="monotone" 
                          dataKey="new_signups" 
                          stroke="var(--color-newSignups)" 
                          strokeWidth={2}
                          name="New Signups"
                        />
                      </LineChart>
                  </ChartContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg sm:text-xl">Platform Distribution</CardTitle>
              </CardHeader>
              <CardContent className="p-2 sm:p-6">
                <div className="w-full h-[250px] sm:h-[300px]">
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
                          outerRadius="80%"
                          fill="#8884d8"
                          dataKey="value"
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
        <TabsContent value="courses" className="space-y-6 relative">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg sm:text-xl">Top Performing Courses</CardTitle>
            </CardHeader>
            <CardContent className="p-2 sm:p-6">
              <div className="w-full h-[350px] sm:h-[400px]">
                <ChartContainer config={chartConfig} className="w-full h-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart 
                      data={coursePerformanceData} 
                      margin={{ top: 20, right: 10, left: 10, bottom: 80 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="course_title" 
                        angle={-45}
                        textAnchor="end"
                        height={80}
                        interval={0}
                        tick={{ fontSize: 10 }}
                      />
                      <YAxis tick={{ fontSize: 12 }} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Legend />
                      <Bar dataKey="enrollments" fill="var(--color-enrollments)" name="Enrollments" />
                      <Bar dataKey="completion_rate" fill="var(--color-completionRate)" name="Completion Rate %" />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Engagement Tab */}
        <TabsContent value="engagement" className="space-y-6 relative">
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg sm:text-xl">Platform Activity Overview</CardTitle>
              </CardHeader>
              <CardContent className="p-2 sm:p-6">
                <div className="w-full h-[250px] sm:h-[300px]">
                  <ChartContainer config={chartConfig} className="w-full h-full">
                    <BarChart 
                      data={processedEngagementMetricsData} 
                      width={500} 
                      height={250} 
                      margin={{ top: 5, right: 10, left: 10, bottom: 80 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="period_label" 
                        tick={{ fontSize: 10 }}
                        interval={0}
                        angle={-45}
                        textAnchor="end"
                        height={80}
                        minTickGap={20}
                        dy={10}
                      />
                      <YAxis tick={{ fontSize: 12 }} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="active_users" fill="var(--color-activeUsers)" name="Active Users" />
                      <Bar dataKey="assignments_submitted" fill="var(--color-assignmentsSubmitted)" name="Assignments Submitted" />
                      <Bar dataKey="quiz_submissions" fill="var(--color-quizSubmissions)" name="Quiz Submissions" />
                      <Bar dataKey="lessons_completed" fill="var(--color-lessonsCompleted)" name="Lessons Completed" />
                      <Bar dataKey="discussions_created" fill="var(--color-discussionsCreated)" name="Discussions Created" />
                    </BarChart>
                  </ChartContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg sm:text-xl">Learning Activity Trends</CardTitle>
              </CardHeader>
              <CardContent className="p-2 sm:p-6">
                <div className="w-full h-[250px] sm:h-[300px]">
                  <ChartContainer config={chartConfig} className="w-full h-full">
                    <LineChart 
                      data={processedEngagementMetricsData} 
                      width={500} 
                      height={250} 
                      margin={{ top: 5, right: 10, left: 10, bottom: 80 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="period_label" 
                        tick={{ fontSize: 10 }}
                        interval={0}
                        angle={-45}
                        textAnchor="end"
                        height={80}
                        minTickGap={20}
                        dy={10}
                      />
                      <YAxis tick={{ fontSize: 12 }} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Line 
                        type="monotone" 
                        dataKey="quiz_submissions" 
                        stroke="var(--color-quizSubmissions)" 
                        strokeWidth={2}
                        name="Quiz Submissions"
                      />
                      <Line 
                        type="monotone" 
                        dataKey="lessons_completed" 
                        stroke="var(--color-lessonsCompleted)" 
                        strokeWidth={2}
                        name="Lessons Completed"
                      />
                    </LineChart>
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
