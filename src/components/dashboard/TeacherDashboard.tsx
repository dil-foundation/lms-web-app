
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
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Legend, AreaChart, Area } from 'recharts';
import { 
  Users, 
  BookOpen, 
  ClipboardCheck, 
  FileSearch, 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  GraduationCap, 
  Award, 
  Clock, 
  MessageSquare, 
  Star, 
  Target, 
  ArrowUpRight, 
  ArrowDownRight,
  CheckCircle,
  Calendar,
  BarChart3,
  PieChart as PieChartIcon,
  Search,
  Filter,
  SortAsc,
  Mail,
  Phone,
  MapPin,
  Eye,
  Download,
  FileText,
  MoreHorizontal
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface TeacherDashboardProps {
  userProfile: {
    id: string;
    first_name?: string;
    last_name?: string;
    teacher_id?: string;
  };
}

interface DashboardStats {
  totalStudents: number;
  publishedCourses: number;
  activeCourses: number;
  totalCourses: number;
  avgEngagement: number;
  avgCompletion: number;
  pendingAssignments: number;
  avgRating: number;
  totalAssignments: number;
  activeStudents: number;
}

// Mock data for comprehensive teacher dashboard
const studentEngagementData = [
  { week: 'Week 1', activeStudents: 85, completionRate: 78, timeSpent: 45 },
  { week: 'Week 2', activeStudents: 92, completionRate: 82, timeSpent: 52 },
  { week: 'Week 3', activeStudents: 88, completionRate: 75, timeSpent: 38 },
  { week: 'Week 4', activeStudents: 96, completionRate: 88, timeSpent: 58 },
  { week: 'Week 5', activeStudents: 90, completionRate: 85, timeSpent: 48 },
  { week: 'Week 6', activeStudents: 94, completionRate: 90, timeSpent: 55 },
];

const coursePerformanceData = [
  { course: 'JavaScript Basics', enrolled: 45, completed: 38, inProgress: 7, avgRating: 4.5 },
  { course: 'React Fundamentals', enrolled: 32, completed: 28, inProgress: 4, avgRating: 4.7 },
  { course: 'Node.js Backend', enrolled: 28, completed: 22, inProgress: 6, avgRating: 4.3 },
  { course: 'Database Design', enrolled: 35, completed: 29, inProgress: 6, avgRating: 4.6 },
];

const assignmentData = [
  { assignment: 'HTML/CSS Project', submitted: 42, pending: 3, graded: 39, avgScore: 87 },
  { assignment: 'JavaScript Quiz', submitted: 38, pending: 7, graded: 31, avgScore: 92 },
  { assignment: 'React Component', submitted: 28, pending: 4, graded: 24, avgScore: 89 },
  { assignment: 'Final Project', submitted: 15, pending: 20, graded: 10, avgScore: 94 },
];

const studentProgressData = [
  { name: 'Excellent (90-100%)', value: 35, color: '#10B981' },
  { name: 'Good (80-89%)', value: 45, color: '#3B82F6' },
  { name: 'Average (70-79%)', value: 15, color: '#F59E0B' },
  { name: 'Needs Help (<70%)', value: 5, color: '#EF4444' },
];

const recentFeedbackData = [
  { day: 'Mon', ratings: 12, avgRating: 4.5, comments: 8 },
  { day: 'Tue', ratings: 18, avgRating: 4.7, comments: 12 },
  { day: 'Wed', ratings: 8, avgRating: 4.2, comments: 5 },
  { day: 'Thu', ratings: 15, avgRating: 4.6, comments: 10 },
  { day: 'Fri', ratings: 22, avgRating: 4.8, comments: 16 },
  { day: 'Sat', ratings: 5, avgRating: 4.3, comments: 3 },
  { day: 'Sun', ratings: 3, avgRating: 4.1, comments: 2 },
];

// Mock student data
const studentsData = [
  {
    id: 1,
    name: 'Alice Johnson',
    email: 'alice.johnson@email.com',
    avatar: 'AJ',
    enrolledDate: '2024-01-15',
    course: 'JavaScript Basics',
    progress: 85,
    status: 'Active',
    lastActive: '2 hours ago',
    grade: 'A-',
    assignments: '8/10',
    phone: '+1 (555) 123-4567',
    location: 'New York, NY'
  },
  {
    id: 2,
    name: 'Bob Smith',
    email: 'bob.smith@email.com',
    avatar: 'BS',
    enrolledDate: '2024-01-20',
    course: 'React Fundamentals',
    progress: 72,
    status: 'Active',
    lastActive: '1 day ago',
    grade: 'B+',
    assignments: '6/8',
    phone: '+1 (555) 234-5678',
    location: 'San Francisco, CA'
  },
  {
    id: 3,
    name: 'Carol Williams',
    email: 'carol.williams@email.com',
    avatar: 'CW',
    enrolledDate: '2024-02-01',
    course: 'Node.js Backend',
    progress: 45,
    status: 'Behind',
    lastActive: '3 days ago',
    grade: 'C+',
    assignments: '3/6',
    phone: '+1 (555) 345-6789',
    location: 'Chicago, IL'
  },
  {
    id: 4,
    name: 'David Brown',
    email: 'david.brown@email.com',
    avatar: 'DB',
    enrolledDate: '2024-01-10',
    course: 'Database Design',
    progress: 92,
    status: 'Excellent',
    lastActive: '30 minutes ago',
    grade: 'A',
    assignments: '10/10',
    phone: '+1 (555) 456-7890',
    location: 'Austin, TX'
  },
  {
    id: 5,
    name: 'Eva Martinez',
    email: 'eva.martinez@email.com',
    avatar: 'EM',
    enrolledDate: '2024-02-15',
    course: 'JavaScript Basics',
    progress: 58,
    status: 'Active',
    lastActive: '5 hours ago',
    grade: 'B-',
    assignments: '5/10',
    phone: '+1 (555) 567-8901',
    location: 'Miami, FL'
  },
  {
    id: 6,
    name: 'Frank Wilson',
    email: 'frank.wilson@email.com',
    avatar: 'FW',
    enrolledDate: '2024-01-25',
    course: 'React Fundamentals',
    progress: 88,
    status: 'Active',
    lastActive: '1 hour ago',
    grade: 'A-',
    assignments: '7/8',
    phone: '+1 (555) 678-9012',
    location: 'Seattle, WA'
  }
];

// Mock reports data
const courseCompletionTrends = [
  { month: 'Jan', 'JavaScript Basics': 78, 'React Fundamentals': 82, 'Node.js Backend': 65, 'Database Design': 88 },
  { month: 'Feb', 'JavaScript Basics': 82, 'React Fundamentals': 85, 'Node.js Backend': 70, 'Database Design': 90 },
  { month: 'Mar', 'JavaScript Basics': 85, 'React Fundamentals': 88, 'Node.js Backend': 75, 'Database Design': 92 },
  { month: 'Apr', 'JavaScript Basics': 88, 'React Fundamentals': 90, 'Node.js Backend': 78, 'Database Design': 94 },
  { month: 'May', 'JavaScript Basics': 90, 'React Fundamentals': 92, 'Node.js Backend': 82, 'Database Design': 96 },
  { month: 'Jun', 'JavaScript Basics': 92, 'React Fundamentals': 94, 'Node.js Backend': 85, 'Database Design': 98 },
];

const quizScoresData = [
  { quiz: 'HTML/CSS Basics', avgScore: 87, attempts: 45, passRate: 92 },
  { quiz: 'JavaScript Fundamentals', avgScore: 82, attempts: 38, passRate: 89 },
  { quiz: 'React Components', avgScore: 79, attempts: 32, passRate: 84 },
  { quiz: 'API Integration', avgScore: 85, attempts: 28, passRate: 90 },
  { quiz: 'Database Queries', avgScore: 91, attempts: 35, passRate: 95 },
];

const engagementTrendsData = [
  { week: 'Week 1', discussions: 125, assignments: 89, quizzes: 156, videos: 234 },
  { week: 'Week 2', discussions: 142, assignments: 95, quizzes: 178, videos: 267 },
  { week: 'Week 3', discussions: 118, assignments: 82, quizzes: 145, videos: 201 },
  { week: 'Week 4', discussions: 156, assignments: 108, quizzes: 189, videos: 289 },
  { week: 'Week 5', discussions: 134, assignments: 92, quizzes: 167, videos: 245 },
  { week: 'Week 6', discussions: 148, assignments: 101, quizzes: 176, videos: 278 },
];

const chartConfig = {
  activeStudents: { label: 'Active Students', color: '#3B82F6' },
  completionRate: { label: 'Completion Rate (%)', color: '#10B981' },
  timeSpent: { label: 'Time Spent (min)', color: '#8B5CF6' },
  enrolled: { label: 'Enrolled', color: '#3B82F6' },
  completed: { label: 'Completed', color: '#10B981' },
  inProgress: { label: 'In Progress', color: '#F59E0B' },
  avgRating: { label: 'Avg Rating', color: '#EF4444' },
  submitted: { label: 'Submitted', color: '#10B981' },
  pending: { label: 'Pending', color: '#F59E0B' },
  graded: { label: 'Graded', color: '#3B82F6' },
  avgScore: { label: 'Avg Score', color: '#8B5CF6' },
  ratings: { label: 'Ratings Count', color: '#3B82F6' },
  comments: { label: 'Comments', color: '#10B981' },
};

export const TeacherDashboard = ({ userProfile }: TeacherDashboardProps) => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('4weeks');

  // Students tab state
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCourse, setSelectedCourse] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Filter and sort students
  const filteredStudents = studentsData
    .filter(student => {
      const matchesSearch = student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          student.email.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCourse = selectedCourse === 'all' || student.course === selectedCourse;
      const matchesStatus = selectedStatus === 'all' || student.status === selectedStatus;
      return matchesSearch && matchesCourse && matchesStatus;
    })
    .sort((a, b) => {
      let aValue = a[sortBy as keyof typeof a];
      let bValue = b[sortBy as keyof typeof b];
      
      if (sortBy === 'progress') {
        aValue = a.progress;
        bValue = b.progress;
      } else if (sortBy === 'enrolledDate') {
        aValue = new Date(a.enrolledDate).getTime();
        bValue = new Date(b.enrolledDate).getTime();
      }
      
      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

  // Get unique courses and statuses for filters
  const uniqueCourses = [...new Set(studentsData.map(student => student.course))];
  const uniqueStatuses = [...new Set(studentsData.map(student => student.status))];

  useEffect(() => {
    const fetchStats = async () => {
      if (!userProfile?.id) {
        setLoading(false);
        return;
      }
      
      setLoading(true);
      try {
        // 1. Find all courses this teacher is a part of.
        const { data: teacherCourses, error: teacherCoursesError } = await supabase
          .from('course_members')
          .select('course_id')
          .eq('user_id', userProfile.id)
          .eq('role', 'teacher');

        if (teacherCoursesError) throw teacherCoursesError;

        const courseIds = teacherCourses.map(c => c.course_id);

        if (courseIds.length === 0) {
          setStats({
            totalStudents: 0,
            publishedCourses: 0,
            activeCourses: 0,
            totalCourses: 0,
            avgEngagement: 0,
            avgCompletion: 0,
            pendingAssignments: 0,
            avgRating: 0,
            totalAssignments: 0,
            activeStudents: 0,
          });
          setLoading(false);
          return;
        }

        // 2. Fetch stats based on those courses.
        const [
          { count: totalStudents, error: studentsError },
          { count: publishedCourses, error: coursesError },
          { count: totalCourses, error: totalCoursesError },
        ] = await Promise.all([
          supabase.from('course_members').select('*', { count: 'exact', head: true }).in('course_id', courseIds).eq('role', 'student'),
          supabase.from('courses').select('*', { count: 'exact', head: true }).in('id', courseIds).eq('status', 'Published'),
          supabase.from('courses').select('*', { count: 'exact', head: true }).in('id', courseIds),
        ]);

        if (studentsError) throw studentsError;
        if (coursesError) throw coursesError;
        if (totalCoursesError) throw totalCoursesError;

        // Use real database values, defaulting to 0 for unavailable metrics
        const baseStats = {
          totalStudents: totalStudents ?? 0,
          publishedCourses: publishedCourses ?? 0,
          activeCourses: publishedCourses ?? 0, // Assuming published courses are active
          totalCourses: totalCourses ?? 0,
          avgEngagement: 0, // Not available from database
          avgCompletion: 0, // Not available from database
          pendingAssignments: 0, // Not available from database
          avgRating: 0, // Not available from database
          totalAssignments: 0, // Not available from database
          activeStudents: Math.floor((totalStudents ?? 0) * 0.85), // Estimate 85% active
        };

        setStats(baseStats);

      } catch (error: any) {
        console.error("Failed to fetch teacher dashboard stats:", error);
        toast.error("Failed to load dashboard statistics.", { description: error.message });
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [userProfile]);

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
            <h1 className="text-3xl font-bold">Teacher Dashboard</h1>
            <p className="text-muted-foreground">Welcome back, {userProfile?.first_name || 'Teacher'}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
            <CheckCircle className="h-3 w-3 mr-1" />
            {stats?.totalCourses || 0} Courses
          </Badge>
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Time range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1week">Last week</SelectItem>
              <SelectItem value="2weeks">Last 2 weeks</SelectItem>
              <SelectItem value="4weeks">Last 4 weeks</SelectItem>
              <SelectItem value="3months">Last 3 months</SelectItem>
              <SelectItem value="semester">This semester</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        <MetricCard
          title="Total Students" 
          value={stats?.totalStudents ?? 0}
          change="+8.2%"
          icon={Users}
          color="text-blue-500"
          isLoading={loading}
          trend="up"
          subtitle="Across all courses"
        />
        <MetricCard
          title="Active Courses"
          value={stats?.activeCourses ?? 0}
          change="+2"
          icon={BookOpen}
          color="text-green-500"
          isLoading={loading}
          trend="up"
          subtitle="Currently published"
        />
        <MetricCard
          title="Engagement Rate"
          value={`${stats?.avgEngagement ?? 0}%`}
          change="+5.3%"
          icon={Activity}
          color="text-purple-500"
          isLoading={loading}
          trend="up"
          subtitle="Student participation"
        />
        <MetricCard
          title="Avg Completion"
          value={`${stats?.avgCompletion ?? 0}%`}
          change="+3.1%"
          icon={Target}
          color="text-orange-500"
          isLoading={loading}
          trend="up"
          subtitle="Course completion rate"
        />
        <MetricCard
          title="Active Students"
          value={stats?.activeStudents ?? 0}
          change="+6.8%"
          icon={GraduationCap}
          color="text-cyan-500"
          isLoading={loading}
          trend="up"
          subtitle="Recently active"
        />
        <MetricCard
          title="Avg Rating"
          value={`${stats?.avgRating ?? 0}/5`}
          change="+0.2"
          icon={Star}
          color="text-yellow-500"
          isLoading={loading}
          trend="up"
          subtitle="Student feedback"
        />
      </div>

      {/* Charts and Analytics */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="students">Students</TabsTrigger>
          <TabsTrigger value="feedback">Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Student Engagement Trends
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ChartContainer config={chartConfig} className="w-full h-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={studentEngagementData}>
                        <defs>
                          <linearGradient id="colorEngagement" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="week" />
                        <YAxis />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Area 
                          type="monotone" 
                          dataKey="activeStudents" 
                          stroke="#3B82F6" 
                          fillOpacity={1} 
                          fill="url(#colorEngagement)"
                          name="Active Students"
                        />
                        <Line 
                          type="monotone" 
                          dataKey="completionRate" 
                          stroke="#10B981" 
                          strokeWidth={2}
                          name="Completion Rate %"
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
                  <PieChartIcon className="h-5 w-5" />
                  Student Progress Distribution
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ChartContainer config={chartConfig} className="w-full h-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={studentProgressData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name.split(' ')[0]} ${(percent * 100).toFixed(0)}%`}
                          outerRadius={100}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {studentProgressData.map((entry, index) => (
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

        <TabsContent value="performance" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Course Performance Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[400px]">
                <ChartContainer config={chartConfig} className="w-full h-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={coursePerformanceData} margin={{ top: 20, right: 30, left: 20, bottom: 80 }}>
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
                      <Bar dataKey="inProgress" fill="#F59E0B" name="In Progress" />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="students" className="space-y-6">
          {/* Students Summary Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Students</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{studentsData.length}</div>
                <p className="text-xs text-muted-foreground">
                  Across all courses
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Students</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{studentsData.filter(s => s.status === 'Active').length}</div>
                <p className="text-xs text-muted-foreground">
                  {Math.round((studentsData.filter(s => s.status === 'Active').length / studentsData.length) * 100)}% of total
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg Progress</CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {Math.round(studentsData.reduce((acc, s) => acc + s.progress, 0) / studentsData.length)}%
                </div>
                <p className="text-xs text-muted-foreground">
                  Course completion
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">At Risk</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{studentsData.filter(s => s.status === 'Behind').length}</div>
                <p className="text-xs text-muted-foreground">
                  Students behind schedule
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Search and Filter Controls */}
          <Card>
            <CardHeader>
              <CardTitle>Student Management</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row gap-4 mb-6">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search students by name or email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <Select value={selectedCourse} onValueChange={setSelectedCourse}>
                    <SelectTrigger className="w-full sm:w-48">
                      <SelectValue placeholder="Filter by course" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Courses</SelectItem>
                      {uniqueCourses.map(course => (
                        <SelectItem key={course} value={course}>{course}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                    <SelectTrigger className="w-full sm:w-32">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      {uniqueStatuses.map(status => (
                        <SelectItem key={status} value={status}>{status}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" className="w-full sm:w-auto">
                        <SortAsc className="h-4 w-4 mr-2" />
                        Sort
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => { setSortBy('name'); setSortOrder('asc'); }}>
                        Name A-Z
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => { setSortBy('name'); setSortOrder('desc'); }}>
                        Name Z-A
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => { setSortBy('progress'); setSortOrder('desc'); }}>
                        Progress High-Low
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => { setSortBy('progress'); setSortOrder('asc'); }}>
                        Progress Low-High
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => { setSortBy('enrolledDate'); setSortOrder('desc'); }}>
                        Recently Enrolled
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => { setSortBy('enrolledDate'); setSortOrder('asc'); }}>
                        Oldest Enrolled
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              {/* Students Table */}
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student</TableHead>
                      <TableHead>Course</TableHead>
                      <TableHead>Progress</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Grade</TableHead>
                      <TableHead>Last Active</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredStudents.map((student) => (
                      <TableRow key={student.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center space-x-3">
                            <Avatar className="h-8 w-8">
                              <AvatarFallback className="text-xs">
                                {student.avatar}
                              </AvatarFallback>
                            </Avatar>
      <div>
                              <div className="font-medium">{student.name}</div>
                              <div className="text-sm text-muted-foreground">{student.email}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <div className="font-medium">{student.course}</div>
                            <div className="text-muted-foreground">
                              Enrolled: {new Date(student.enrolledDate).toLocaleDateString()}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium">{student.progress}%</span>
                            </div>
                            <Progress value={student.progress} className="h-2" />
                            <div className="text-xs text-muted-foreground">
                              {student.assignments}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              student.status === 'Active' ? 'default' :
                              student.status === 'Excellent' ? 'secondary' :
                              student.status === 'Behind' ? 'destructive' :
                              'outline'
                            }
                          >
                            {student.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className="font-medium">{student.grade}</span>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-muted-foreground">
                            {student.lastActive}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0">
                                <span className="sr-only">Open menu</span>
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem>
                                <Eye className="mr-2 h-4 w-4" />
                                View Profile
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <Mail className="mr-2 h-4 w-4" />
                                Send Message
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <FileText className="mr-2 h-4 w-4" />
                                View Progress
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              
              {filteredStudents.length === 0 && (
                <div className="text-center py-8">
                  <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No students found matching your criteria.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="feedback" className="space-y-6">
          {/* Course Completion Trends */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Course Completion Trends
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Track completion rates across all courses over time
              </p>
            </CardHeader>
            <CardContent>
              <div className="h-[400px]">
                <ChartContainer config={chartConfig} className="w-full h-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={courseCompletionTrends}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Line type="monotone" dataKey="JavaScript Basics" stroke="#3B82F6" strokeWidth={2} name="JavaScript Basics" />
                      <Line type="monotone" dataKey="React Fundamentals" stroke="#10B981" strokeWidth={2} name="React Fundamentals" />
                      <Line type="monotone" dataKey="Node.js Backend" stroke="#F59E0B" strokeWidth={2} name="Node.js Backend" />
                      <Line type="monotone" dataKey="Database Design" stroke="#8B5CF6" strokeWidth={2} name="Database Design" />
                      <Legend />
                    </LineChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Quiz Performance */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="h-5 w-5" />
                  Quiz Performance Analysis
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[350px]">
                  <ChartContainer config={chartConfig} className="w-full h-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={quizScoresData} margin={{ top: 20, right: 30, left: 20, bottom: 80 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis 
                          dataKey="quiz" 
                          angle={-45}
                          textAnchor="end"
                          height={80}
                          interval={0}
                        />
                        <YAxis />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Bar dataKey="avgScore" fill="#3B82F6" name="Average Score" />
                        <Bar dataKey="passRate" fill="#10B981" name="Pass Rate %" />
                      </BarChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                </div>
              </CardContent>
            </Card>

            {/* Quiz Statistics */}
            <Card>
              <CardHeader>
                <CardTitle>Quiz Statistics Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {quizScoresData.map((quiz, index) => (
                    <div key={index} className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">{quiz.quiz}</span>
                        <span className="text-sm text-muted-foreground">{quiz.attempts} attempts</span>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <div className="text-2xl font-bold text-blue-600">{quiz.avgScore}%</div>
                          <div className="text-xs text-muted-foreground">Average Score</div>
                        </div>
                        <div>
                          <div className="text-2xl font-bold text-green-600">{quiz.passRate}%</div>
                          <div className="text-xs text-muted-foreground">Pass Rate</div>
                        </div>
                      </div>
                      <Progress value={quiz.passRate} className="h-2" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Student Engagement Trends */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Student Engagement Over Time
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Weekly engagement metrics across different activity types
              </p>
            </CardHeader>
            <CardContent>
              <div className="h-[400px]">
                <ChartContainer config={chartConfig} className="w-full h-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={engagementTrendsData}>
                      <defs>
                        <linearGradient id="colorDiscussions" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.8}/>
                          <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.1}/>
                        </linearGradient>
                        <linearGradient id="colorAssignments" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10B981" stopOpacity={0.8}/>
                          <stop offset="95%" stopColor="#10B981" stopOpacity={0.1}/>
                        </linearGradient>
                        <linearGradient id="colorQuizzes" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.8}/>
                          <stop offset="95%" stopColor="#F59E0B" stopOpacity={0.1}/>
                        </linearGradient>
                        <linearGradient id="colorVideos" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.8}/>
                          <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0.1}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="week" />
                      <YAxis />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Area 
                        type="monotone" 
                        dataKey="discussions" 
                        stackId="1"
                        stroke="#3B82F6" 
                        fill="url(#colorDiscussions)"
                        name="Discussions"
                      />
                      <Area 
                        type="monotone" 
                        dataKey="assignments" 
                        stackId="1"
                        stroke="#10B981" 
                        fill="url(#colorAssignments)"
                        name="Assignments"
                      />
                      <Area 
                        type="monotone" 
                        dataKey="quizzes" 
                        stackId="1"
                        stroke="#F59E0B" 
                        fill="url(#colorQuizzes)"
                        name="Quizzes"
                      />
                      <Area 
                        type="monotone" 
                        dataKey="videos" 
                        stackId="1"
                        stroke="#8B5CF6" 
                        fill="url(#colorVideos)"
                        name="Videos"
                      />
                      <Legend />
                    </AreaChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </div>
            </CardContent>
          </Card>

          {/* Performance Comparison */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Course Performance Comparison
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Compare key metrics across your courses
              </p>
            </CardHeader>
            <CardContent>
              <div className="h-[400px]">
                <ChartContainer config={chartConfig} className="w-full h-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={coursePerformanceData} margin={{ top: 20, right: 30, left: 20, bottom: 80 }}>
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
                      <Bar dataKey="inProgress" fill="#F59E0B" name="In Progress" />
                      <Legend />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </div>
            </CardContent>
          </Card>

          {/* Export Options */}
          <Card>
            <CardHeader>
              <CardTitle>Export Reports</CardTitle>
              <p className="text-sm text-muted-foreground">
                Download detailed reports for your records
              </p>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-3">
                <Button variant="outline" className="flex items-center gap-2">
                  <Download className="h-4 w-4" />
                  Student Progress Report
                </Button>
                <Button variant="outline" className="flex items-center gap-2">
                  <Download className="h-4 w-4" />
                  Course Analytics
                </Button>
                <Button variant="outline" className="flex items-center gap-2">
                  <Download className="h-4 w-4" />
                  Engagement Summary
                </Button>
                <Button variant="outline" className="flex items-center gap-2">
                  <Download className="h-4 w-4" />
                  Quiz Performance
                </Button>
        </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
