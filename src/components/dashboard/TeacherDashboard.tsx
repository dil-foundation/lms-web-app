
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
  TrendingUp, 
  Activity, 
  GraduationCap, 
  Award, 
  Clock, 
  Target, 
  BarChart3,
  PieChart as PieChartIcon,
  Search,
  SortAsc,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Filter
} from 'lucide-react';
import { ContentLoader } from '@/components/ContentLoader';
import { Drawer, DrawerClose, DrawerContent, DrawerDescription, DrawerFooter, DrawerHeader, DrawerTitle, DrawerTrigger } from '@/components/ui/drawer';
import { Label } from '@/components/ui/label';

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
  totalAssignments: number;
  activeStudents: number;
}

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
  const [timeRange, setTimeRange] = useState('alltime');
  const [studentEngagementData, setStudentEngagementData] = useState<any[]>([]);
  const [coursePerformanceData, setCoursePerformanceData] = useState<any[]>([]);
  const [studentProgressData, setStudentProgressData] = useState<any[]>([]);

  // Reports tab state
  const [courseCompletionTrends, setCourseCompletionTrends] = useState<any[]>([]);
  const [quizScoresData, setQuizScoresData] = useState<any[]>([]);
  const [engagementTrendsData, setEngagementTrendsData] = useState<any[]>([]);

  // Student status counts state
  const [studentStatusCounts, setStudentStatusCounts] = useState<{
    total_students: number;
    active_students: number;
    behind_students: number;
    excellent_students: number;
    not_started_students: number;
  } | null>(null);

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
    const fetchTeacherData = async () => {
      if (!userProfile?.id) {

        setLoading(false);
        return;
      }
      

      setLoading(true);
      try {
        const { startDate, endDate } = getDateRange(timeRange);


        // 1. Find all courses this teacher is a part of
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
            totalAssignments: 0,
            activeStudents: 0,
          });
          setLoading(false);
          return;
        }

        // 2. Get course sections for teacher's courses
        const { data: sections, error: sectionsError } = await supabase
          .from('course_sections')
          .select('id, course_id')
          .in('course_id', courseIds);

        if (sectionsError) throw sectionsError;

        const sectionIds = sections.map(s => s.id);


        // 3. Get assignment lesson IDs
        const { data: assignmentLessons, error: lessonsError } = await supabase
          .from('course_lessons')
          .select('id')
          .in('section_id', sectionIds);

        if (lessonsError) throw lessonsError;

        const assignmentLessonIds = assignmentLessons.map(l => l.id);


        // 4. Fetch teacher-specific stats using the new engagement metrics function
        const { data: engagementMetrics, error: engagementError } = await supabase.rpc('get_teacher_engagement_metrics', {
          p_teacher_id: userProfile.id,
          p_time_range: timeRange
        });

        if (engagementError) throw engagementError;





        // Also fetch course counts for the dashboard
        const [
          { count: publishedCourses, error: coursesError },
          { count: totalCourses, error: totalCoursesError },
        ] = await Promise.all([
          // Published courses by this teacher
          timeRange === 'alltime'
            ? supabase.from('courses')
                .select('*', { count: 'exact', head: true })
                .in('id', courseIds)
                .eq('status', 'Published')
            : supabase.from('courses')
                .select('*', { count: 'exact', head: true })
                .in('id', courseIds)
                .eq('status', 'Published')
                .gte('created_at', startDate.toISOString()),
          
          // Total courses by this teacher
          timeRange === 'alltime'
            ? supabase.from('courses')
                .select('*', { count: 'exact', head: true })
                .in('id', courseIds)
            : supabase.from('courses')
                .select('*', { count: 'exact', head: true })
                .in('id', courseIds)
                .gte('created_at', startDate.toISOString()),
        ]);

        if (coursesError) throw coursesError;
        if (totalCoursesError) throw totalCoursesError;



        // Use real engagement metrics from SQL function
        const realStats = engagementMetrics?.[0] || {
          total_students: 0,
          active_students: 0,
          engagement_rate: 0,
          avg_completion_rate: 0,
          total_assignments: 0,
          pending_assignments: 0,
          completion_rate: 0
        };

        const baseStats = {
          totalStudents: realStats.total_students,
          publishedCourses: publishedCourses ?? 0,
          activeCourses: publishedCourses ?? 0, // Assuming published courses are active
          totalCourses: totalCourses ?? 0,
          avgEngagement: realStats.engagement_rate,
          avgCompletion: realStats.completion_rate,
          pendingAssignments: realStats.pending_assignments,
          totalAssignments: realStats.total_assignments,
          activeStudents: realStats.active_students,
        };


        setStats(baseStats);


        await fetchStudentEngagementData(courseIds, timeRange);
        await fetchCoursePerformanceData(courseIds);
        await fetchStudentProgressData(courseIds);
        

        await fetchCourseCompletionTrends(courseIds, timeRange);
        await fetchQuizScoresData(courseIds);
        await fetchEngagementTrendsData(courseIds, timeRange);
        await fetchStudentStatusCounts(courseIds);

      } catch (error: any) {
        console.error("Failed to fetch teacher dashboard stats:", error);
        toast.error("Failed to load dashboard statistics.", { description: error.message });
      } finally {
        setLoading(false);
      }
    };

    fetchTeacherData();
  }, [userProfile, timeRange]);

  const fetchStudentEngagementData = async (courseIds: string[], range: string) => {
    try {

      
      // Use the dynamic SQL function
      const { data, error } = await supabase.rpc('get_student_engagement_trends', {
        teacher_id: userProfile.id,
        time_range: range
      });



      if (error) throw error;

      if (!data || data.length === 0 || (data.length === 1 && data[0].period_label === 'No Activity')) {
        setStudentEngagementData([]);
        return;
      }

      // Transform the data to match the expected format
      const engagementData = data.map((item: any) => ({
        week: item.period_label,
        activeStudents: item.active_students,
        completionRate: item.completion_rate,
        timeSpent: item.time_spent
      }));


      setStudentEngagementData(engagementData);
    } catch (error) {
      console.error("Failed to fetch student engagement data:", error);
      setStudentEngagementData([]);
    }
  };

  const fetchCoursePerformanceData = async (courseIds: string[]) => {
    try {

      
      // Use the dynamic SQL function
      const { data, error } = await supabase.rpc('get_course_performance_data', {
        teacher_id: userProfile.id
      });



      if (error) throw error;

      if (!data || data.length === 0) {

        setCoursePerformanceData([]);
        return;
      }

      // Transform the data to match the expected format
      const coursePerformance = data.map((item: any) => ({
        course: item.course_title,
        enrolled: item.enrolled_students,
        completed: item.completed_students,
        inProgress: item.in_progress_students,
        avgRating: item.avg_rating
      }));


      setCoursePerformanceData(coursePerformance);
    } catch (error) {
      console.error("Failed to fetch course performance data:", error);
      setCoursePerformanceData([]);
    }
  };

  const fetchStudentProgressData = async (courseIds: string[]) => {
    try {
      const { data, error } = await supabase.rpc('get_student_progress_distribution', {
        p_teacher_id: userProfile.id
      });

      if (error) throw error;

      if (!data || data.length === 0) {
        setStudentProgressData([]);
        return;
      }

      const progressDistribution = data.map((item: any) => ({
        name: item.category_name,
        value: item.student_count,
        color: item.color_code
      }));

      setStudentProgressData(progressDistribution);
    } catch (error) {
      console.error("Failed to fetch student progress data:", error);
      setStudentProgressData([]);
    }
  };

  const fetchCourseCompletionTrends = async (courseIds: string[], range: string) => {
    try {

      
      // Use the dynamic SQL function
      const { data, error } = await supabase.rpc('get_course_completion_trends', {
        teacher_id: userProfile.id,
        time_range: range
      });



      if (error) throw error;

      if (!data || data.length === 0) {

        setCourseCompletionTrends([]);
        return;
      }

      // Transform the data to match the expected format
      const trendsData = data.map((item: any) => ({
        month: item.month_label,
        ...item.course_data
      }));


      setCourseCompletionTrends(trendsData);
    } catch (error) {
      console.error("Failed to fetch course completion trends:", error);
      setCourseCompletionTrends([]);
    }
  };

  const fetchQuizScoresData = async (courseIds: string[]) => {
    try {

      
      // Use the dynamic SQL function
      const { data, error } = await supabase.rpc('get_quiz_performance_data', {
        teacher_id: userProfile.id
      });



      if (error) throw error;

      if (!data || data.length === 0) {

        // Create fallback data to show chart structure
        const fallbackData = [
          { quiz: 'No Quizzes Available', avgScore: 0, attempts: 0, passRate: 0 }
        ];
        setQuizScoresData(fallbackData);
        return;
      }

      // Transform the data to match the expected format
      const quizData = data.map((item: any) => ({
        quiz: item.quiz_title,
        avgScore: item.avg_score,
        attempts: item.attempts_count,
        passRate: item.pass_rate
      }));


      setQuizScoresData(quizData);
    } catch (error) {
      console.error("Failed to fetch quiz scores data:", error);
      // Create fallback data on error
      const fallbackData = [
        { quiz: 'No Quizzes Available', avgScore: 0, attempts: 0, passRate: 0 }
      ];
      setQuizScoresData(fallbackData);
    }
  };

  const fetchEngagementTrendsData = async (courseIds: string[], range: string) => {
    try {

      
      // Use the dynamic SQL function
      const { data, error } = await supabase.rpc('get_engagement_trends_data', {
        p_teacher_id: userProfile.id,
        p_time_range: range
      });

      console.log('🔍 [DEBUG] get_engagement_trends_data response:', { data, error });

      if (error) throw error;

      if (!data || data.length === 0) {
        console.log('🔍 [DEBUG] No engagement trends data found, setting empty array');
        setEngagementTrendsData([]);
        return;
      }

      // Transform the data to match the expected format
      const trendsData = data.map((item: any) => ({
        week: item.week_label,
        assignments: item.assignments_count,
        quizzes: item.quizzes_count,
      }));

      console.log('🔍 [DEBUG] Transformed engagement trends data:', trendsData);
      setEngagementTrendsData(trendsData);
    } catch (error) {
      console.error("Failed to fetch engagement trends data:", error);
      setEngagementTrendsData([]);
    }
  };

  const fetchStudentStatusCounts = async (courseIds: string[]) => {
    try {
      console.log('🔍 [DEBUG] fetchStudentStatusCounts called with:', { courseIds, teacherId: userProfile.id });
      
      // Use the new SQL function
      const { data, error } = await supabase.rpc('get_student_status_counts', {
        teacher_id: userProfile.id
      });

      console.log('🔍 [DEBUG] get_student_status_counts response:', { data, error });

      if (error) throw error;

      if (!data || data.length === 0) {
        console.log('🔍 [DEBUG] No student status counts found, using defaults');
        setStudentStatusCounts({
          total_students: 0,
          active_students: 0,
          behind_students: 0,
          excellent_students: 0,
          not_started_students: 0
        });
        return;
      }

      const statusCounts = data[0];
      console.log('🔍 [DEBUG] Student status counts:', statusCounts);
      setStudentStatusCounts(statusCounts);
    } catch (error) {
      console.error("Failed to fetch student status counts:", error);
      setStudentStatusCounts({
        total_students: 0,
        active_students: 0,
        behind_students: 0,
        excellent_students: 0,
        not_started_students: 0
      });
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
    <Card className="relative overflow-hidden transition-all duration-200 hover:shadow-lg bg-gradient-to-br from-card to-green-500/5 dark:bg-card">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className={`h-4 w-4 ${color}`} />
      </CardHeader>
      <CardContent>
        <div className="space-y-1">
            <div className="text-2xl font-bold">{typeof value === 'number' ? value.toLocaleString() : value}</div>
        </div>
      </CardContent>
    </Card>
  );



  return (
    <div className="space-y-6">
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
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-primary/10 to-primary/20 rounded-2xl flex items-center justify-center">
                  <GraduationCap className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-primary via-primary to-primary/80 bg-clip-text text-transparent" style={{ backgroundClip: 'text', WebkitBackgroundClip: 'text' }}>
                    Teacher Dashboard
                  </h1>
                  <p className="text-lg text-muted-foreground mt-2 leading-relaxed">
                    Welcome back, {userProfile?.first_name || 'Teacher'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Select value={timeRange} onValueChange={setTimeRange}>
                  <SelectTrigger className="w-40 h-9 rounded-xl bg-background border border-input shadow-sm hover:shadow-lg hover:shadow-primary/10 transition-all duration-300 hover:-translate-y-0.5">
                    <SelectValue placeholder="Time range" />
                  </SelectTrigger>
                  <SelectContent>
                        <SelectItem value="alltime">All Time</SelectItem>
                        <SelectItem value="7days">Last 7 days</SelectItem>
                        <SelectItem value="30days">Last 30 days</SelectItem>
                    <SelectItem value="3months">Last 3 months</SelectItem>
                        <SelectItem value="6months">Last 6 months</SelectItem>
                        <SelectItem value="1year">Last 1 year</SelectItem>
                  </SelectContent>
                </Select>

                <Drawer>
                  <DrawerTrigger asChild>
                    <Button
                      variant="outline"
                      className="h-9 px-4 rounded-xl bg-background border border-input shadow-sm hover:shadow-lg hover:shadow-primary/10 transition-all duration-300 hover:-translate-y-0.5 hover:bg-accent/5 hover:text-foreground dark:hover:bg-gray-800"
                    >
                      <Filter className="h-4 w-4 mr-2" />
                      Filters
                    </Button>
                  </DrawerTrigger>
                  <DrawerContent>
                    <div className="mx-auto w-full max-w-4xl">
                      <DrawerHeader>
                        <DrawerTitle>Filter Dashboard Data</DrawerTitle>
                        <DrawerDescription>Apply filters to refine the data shown on the dashboard.</DrawerDescription>
                      </DrawerHeader>
                      <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {/* Age Group / Grade Level */}
                        <div className="space-y-2">
                          <Label htmlFor="age-group">Age Group / Grade Level</Label>
                          <Select>
                            <SelectTrigger id="age-group">
                              <SelectValue placeholder="Select age group" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="primary">Primary (Grades 1-5)</SelectItem>
                              <SelectItem value="middle">Middle (Grades 6-8)</SelectItem>
                              <SelectItem value="high">High School (Grades 9-12)</SelectItem>
                              <SelectItem value="university">University</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Location */}
                        <div className="space-y-2">
                          <Label htmlFor="location">Location</Label>
                          <Select>
                            <SelectTrigger id="location">
                              <SelectValue placeholder="Select location type" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="province">Province</SelectItem>
                              <SelectItem value="city">City</SelectItem>
                              <SelectItem value="rural">Rural</SelectItem>
                              <SelectItem value="urban">Urban</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Language Proficiency */}
                        <div className="space-y-2">
                          <Label htmlFor="language-proficiency">Language Proficiency</Label>
                          <Select>
                            <SelectTrigger id="language-proficiency">
                              <SelectValue placeholder="Select proficiency" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="beginner">Beginner</SelectItem>
                              <SelectItem value="intermediate">Intermediate</SelectItem>
                              <SelectItem value="advanced">Advanced</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {/* School Type */}
                        <div className="space-y-2">
                          <Label htmlFor="school-type">School Type</Label>
                          <Select>
                            <SelectTrigger id="school-type">
                              <SelectValue placeholder="Select school type" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="private">Private</SelectItem>
                              <SelectItem value="public">Public</SelectItem>
                              <SelectItem value="madarsa">Madarsa</SelectItem>
                              <SelectItem value="homeschool">Homeschool</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Course Level */}
                        <div className="space-y-2">
                          <Label htmlFor="course-level">Course Level</Label>
                          <Select>
                            <SelectTrigger id="course-level">
                              <SelectValue placeholder="Select course level" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="beginner">Beginner</SelectItem>
                              <SelectItem value="intermediate">Intermediate</SelectItem>
                              <SelectItem value="advanced">Advanced</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Subject */}
                        <div className="space-y-2">
                          <Label htmlFor="subject">Subject</Label>
                          <Select>
                            <SelectTrigger id="subject">
                              <SelectValue placeholder="Select subject" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="english">English</SelectItem>
                              <SelectItem value="math">Mathematics</SelectItem>
                              <SelectItem value="science">Science</SelectItem>
                              <SelectItem value="social-studies">Social Studies</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <DrawerFooter>
                        <Button className="w-full transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/20">Apply Filters</Button>
                        <DrawerClose asChild>
                          <Button variant="outline" className="w-full transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md hover:shadow-primary/10 hover:bg-primary/5 hover:border-primary/30 hover:text-primary">Clear All</Button>
                        </DrawerClose>
                      </DrawerFooter>
                    </div>
                  </DrawerContent>
                </Drawer>
              </div>
            </div>
          </div>
        </div>

        {/* Metric Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <MetricCard
            title="Total Students"
            value={stats?.totalStudents || 0}
            icon={Users}
            color="#3B82F6"
          />
          <MetricCard
            title="Published Courses"
            value={stats?.publishedCourses || 0}
            icon={BookOpen}
            color="#10B981"
          />
          <MetricCard
            title="Active Courses"
            value={stats?.activeCourses || 0}
            icon={Activity}
            color="#F59E0B"
          />
          <MetricCard
            title="Avg Engagement"
            value={`${stats?.avgEngagement || 0}%`}
            icon={TrendingUp}
            color="#8B5CF6"
          />
        </div>

        {/* Tabs Section */}
        <div className="relative">
          <div className="relative">
            <Tabs defaultValue="overview" className="space-y-6">
              <TabsList className="grid w-full grid-cols-2 md:grid-cols-3">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="performance">Performance</TabsTrigger>
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
                        {studentEngagementData.length > 0 ? (
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
                        ) : (
                          <div className="flex items-center justify-center h-full">
                            <p className="text-muted-foreground">No data to display for this period.</p>
                          </div>
                        )}
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
                        {studentProgressData.length > 0 ? (
                          <ChartContainer config={chartConfig} className="w-full h-full">
                            <ResponsiveContainer width="100%" height="100%">
                              <PieChart>
                                <Pie
                                  data={studentProgressData}
                                  cx="50%"
                                  cy="50%"
                                  labelLine={false}
                                  label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
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
                        ) : (
                          <div className="flex items-center justify-center h-full">
                            <p className="text-muted-foreground">No data to display.</p>
                          </div>
                        )}
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
                            <Legend />
                          </BarChart>
                        </ResponsiveContainer>
                      </ChartContainer>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="feedback" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BarChart3 className="h-5 w-5" />
                      Engagement Trends
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Track student engagement across different content types
                    </p>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[400px]">
                      <ChartContainer config={chartConfig} className="w-full h-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={engagementTrendsData}>
                            <defs>
                              <linearGradient id="colorAssignments" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#10B981" stopOpacity={0.8}/>
                                <stop offset="95%" stopColor="#10B981" stopOpacity={0.1}/>
                              </linearGradient>
                              <linearGradient id="colorQuizzes" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.8}/>
                                <stop offset="95%" stopColor="#F59E0B" stopOpacity={0.1}/>
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="week" />
                            <YAxis />
                            <ChartTooltip content={<ChartTooltipContent />} />
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
                            <Legend />
                          </AreaChart>
                        </ResponsiveContainer>
                      </ChartContainer>
                    </div>
                  </CardContent>
                </Card>


              </TabsContent>
            </Tabs>
          </div>
        </div>
        </>
      )}
    </div>
  );
};
