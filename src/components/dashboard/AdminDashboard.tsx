
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
  ArrowUpRight, 
  ArrowDownRight,
  AlertCircle,
  CheckCircle,
  Calendar,
  Settings
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

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
}

// Mock data for comprehensive dashboard
const userGrowthData = [
  { month: 'Jan', users: 1200, teachers: 45, students: 1100, admins: 55, active: 950 },
  { month: 'Feb', users: 1350, teachers: 48, students: 1245, admins: 57, active: 1080 },
  { month: 'Mar', users: 1500, teachers: 52, students: 1385, admins: 63, active: 1200 },
  { month: 'Apr', users: 1650, teachers: 55, students: 1525, admins: 70, active: 1350 },
  { month: 'May', users: 1800, teachers: 58, students: 1665, admins: 77, active: 1480 },
  { month: 'Jun', users: 1950, teachers: 62, students: 1805, admins: 83, active: 1620 },
];

const courseAnalyticsData = [
  { course: 'JavaScript Fundamentals', enrolled: 450, completed: 351, progress: 78, rating: 4.5 },
  { course: 'React Development', enrolled: 380, completed: 274, progress: 72, rating: 4.7 },
  { course: 'Python Basics', enrolled: 520, completed: 442, progress: 85, rating: 4.3 },
  { course: 'Data Science', enrolled: 290, completed: 189, progress: 65, rating: 4.6 },
  { course: 'Machine Learning', enrolled: 210, completed: 122, progress: 58, rating: 4.4 },
];

const engagementData = [
  { day: 'Mon', activeUsers: 1200, timeSpent: 45, courses: 35, discussions: 128 },
  { day: 'Tue', activeUsers: 1350, timeSpent: 52, courses: 42, discussions: 156 },
  { day: 'Wed', activeUsers: 1180, timeSpent: 38, courses: 28, discussions: 98 },
  { day: 'Thu', activeUsers: 1420, timeSpent: 48, courses: 38, discussions: 142 },
  { day: 'Fri', activeUsers: 1280, timeSpent: 42, courses: 32, discussions: 124 },
  { day: 'Sat', activeUsers: 950, timeSpent: 35, courses: 25, discussions: 89 },
  { day: 'Sun', activeUsers: 780, timeSpent: 28, courses: 18, discussions: 67 },
];



const platformStatsData = [
  { name: 'Active Courses', value: 68, color: '#3B82F6' },
  { name: 'Completed Courses', value: 145, color: '#10B981' },
  { name: 'Draft Courses', value: 23, color: '#F59E0B' },
  { name: 'Archived Courses', value: 34, color: '#6B7280' },
];

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
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('6months');

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      try {
        const [
          { count: totalUsers, error: usersError },
          { count: totalTeachers, error: teachersError },
          { count: totalStudents, error: studentsError },
          { count: totalAdmins, error: adminsError },
          { count: totalCourses, error: coursesError },
          { count: activeCourses, error: activeCoursesError },
        ] = await Promise.all([
          supabase.from('profiles').select('*', { count: 'exact', head: true }),
          supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'teacher'),
          supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'student'),
          supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'admin'),
          supabase.from('courses').select('*', { count: 'exact', head: true }),
          supabase.from('courses').select('*', { count: 'exact', head: true }).eq('status', 'Published'),
        ]);

        if (usersError) throw usersError;
        if (teachersError) throw teachersError;
        if (studentsError) throw studentsError;
        if (adminsError) throw adminsError;
        if (coursesError) throw coursesError;
        if (activeCoursesError) throw activeCoursesError;

        // Use actual database values, defaulting to 0 if not available
        const baseStats = {
          totalUsers: totalUsers ?? 0,
          totalTeachers: totalTeachers ?? 0,
          totalStudents: totalStudents ?? 0,
          totalAdmins: totalAdmins ?? 0,
          totalCourses: totalCourses ?? 0,
          activeCourses: activeCourses ?? 0,
          completedAssignments: 0, // Not available from database
          activeDiscussions: 0, // Not available from database
          avgEngagement: 0, // Not available from database
          newUsersThisMonth: 0, // Not available from database
          courseCompletionRate: 0, // Not available from database
          totalLogins: 0, // Not available from database
        };

        setStats(baseStats);

      } catch (error: any) {
        console.error("Failed to fetch dashboard stats:", error);
        toast.error("Failed to load dashboard statistics.", { description: error.message });
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  const getInitials = (firstName?: string, lastName?: string) => {
    return `${firstName?.charAt(0) || ''}${lastName?.charAt(0) || ''}`.toUpperCase();
  };

  const MetricCard = ({ 
    title, 
    value, 
    change, 
    icon: Icon, 
    color, 
    isLoading, 
    trend,
    subtitle 
  }: { 
    title: string; 
    value: string | number; 
    change?: string; 
    icon: any; 
    color: string; 
    isLoading: boolean; 
    trend?: 'up' | 'down' | 'neutral';
    subtitle?: string;
  }) => (
    <Card className="relative overflow-hidden transition-all duration-200 hover:shadow-lg">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className={`h-4 w-4 ${color}`} />
      </CardHeader>
      <CardContent>
        <div className="space-y-1">
          {isLoading ? (
            <Skeleton className="h-8 w-20" />
          ) : (
            <div className="text-2xl font-bold">{typeof value === 'number' ? value.toLocaleString() : value}</div>
          )}
          {subtitle && (
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          )}
          {change && (
            <p className="text-xs flex items-center gap-1">
              {trend === 'up' && <ArrowUpRight className="h-3 w-3 text-green-500" />}
              {trend === 'down' && <ArrowDownRight className="h-3 w-3 text-red-500" />}
              <span className={trend === 'up' ? 'text-green-500' : trend === 'down' ? 'text-red-500' : 'text-muted-foreground'}>
                {change}
              </span>
              <span className="text-muted-foreground">from last month</span>
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );



  return (
    <div className="space-y-6 p-2 sm:p-0">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center space-x-4">
          <Avatar className="h-12 w-12">
            <AvatarFallback className="bg-primary text-primary-foreground font-bold">
              {getInitials(userProfile?.first_name, userProfile?.last_name)}
            </AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-3xl font-bold">Admin Dashboard</h1>
            <p className="text-muted-foreground">Welcome back, {userProfile?.first_name || 'Administrator'}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Time range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7days">Last 7 days</SelectItem>
              <SelectItem value="30days">Last 30 days</SelectItem>
              <SelectItem value="3months">Last 3 months</SelectItem>
              <SelectItem value="6months">Last 6 months</SelectItem>
              <SelectItem value="1year">Last year</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        <MetricCard
          title="Total Users"
          value={stats?.totalUsers ?? 0}
          change="+12.5%"
          icon={Users}
          color="text-blue-500"
          isLoading={loading}
          trend="up"
          subtitle="All registered users"
        />
        <MetricCard
          title="Active Courses"
          value={stats?.activeCourses ?? 0}
          change="+8.2%"
          icon={BookOpen}
          color="text-green-500"
          isLoading={loading}
          trend="up"
          subtitle="Published courses"
        />
        <MetricCard
          title="Engagement Rate"
          value={`${stats?.avgEngagement ?? 0}%`}
          change="+5.1%"
          icon={Activity}
          color="text-purple-500"
          isLoading={loading}
          trend="up"
          subtitle="Average user engagement"
        />
        <MetricCard
          title="Course Completion"
          value={`${stats?.courseCompletionRate ?? 0}%`}
          change="+3.2%"
          icon={Award}
          color="text-orange-500"
          isLoading={loading}
          trend="up"
          subtitle="Overall completion rate"
        />
        <MetricCard
          title="New Users"
          value={stats?.newUsersThisMonth ?? 0}
          change="+18.3%"
          icon={TrendingUp}
          color="text-cyan-500"
          isLoading={loading}
          trend="up"
          subtitle="This month"
        />
        <MetricCard
          title="Total Logins"
          value={stats?.totalLogins ?? 0}
          change="+7.4%"
          icon={Eye}
          color="text-indigo-500"
          isLoading={loading}
          trend="up"
          subtitle="All time logins"
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
                    <span className="text-sm font-medium">Active Users</span>
                    <div className="flex items-center gap-2">
                      <Progress value={85} className="w-20" />
                      <span className="text-sm">85%</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Course Engagement</span>
                    <div className="flex items-center gap-2">
                      <Progress value={72} className="w-20" />
                      <span className="text-sm">72%</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Discussion Participation</span>
                    <div className="flex items-center gap-2">
                      <Progress value={64} className="w-20" />
                      <span className="text-sm">64%</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Assignment Completion</span>
                    <div className="flex items-center gap-2">
                      <Progress value={78} className="w-20" />
                      <span className="text-sm">78%</span>
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
    </div>
  );
};
