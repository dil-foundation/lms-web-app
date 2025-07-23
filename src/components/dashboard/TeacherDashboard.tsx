
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
  ChevronsRight
} from 'lucide-react';
import { ContentLoader } from '@/components/ContentLoader';

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
  const [studentsData, setStudentsData] = useState<any[]>([]);

  // Reports tab state
  const [courseCompletionTrends, setCourseCompletionTrends] = useState<any[]>([]);
  const [quizScoresData, setQuizScoresData] = useState<any[]>([]);
  const [engagementTrendsData, setEngagementTrendsData] = useState<any[]>([]);

  // Students tab state
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCourse, setSelectedCourse] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [sortBy, setSortBy] = useState('enrolled_date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalStudents, setTotalStudents] = useState(0);
  const [studentsLoading, setStudentsLoading] = useState(false);

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
          .in('section_id', sectionIds)
          .eq('type', 'assignment');

        if (lessonsError) throw lessonsError;

        const assignmentLessonIds = assignmentLessons.map(l => l.id);

        // 4. Fetch teacher-specific stats
        const [
          { count: totalStudents, error: studentsError },
          { count: publishedCourses, error: coursesError },
          { count: totalCourses, error: totalCoursesError },
          { count: pendingAssignments, error: assignmentsError },
          { count: totalAssignments, error: totalAssignmentsError },
        ] = await Promise.all([
          // Total students enrolled in teacher's courses
          timeRange === 'alltime'
            ? supabase.from('course_members')
                .select('*', { count: 'exact', head: true })
                .in('course_id', courseIds)
                .eq('role', 'student')
            : supabase.from('course_members')
                .select('*', { count: 'exact', head: true })
                .in('course_id', courseIds)
                .eq('role', 'student')
                .gte('created_at', startDate.toISOString()),
          
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
          
          // Pending assignments for teacher's courses
          timeRange === 'alltime'
            ? supabase.from('assignment_submissions')
                .select('*', { count: 'exact', head: true })
                .in('assignment_id', assignmentLessonIds)
                .eq('status', 'pending')
            : supabase.from('assignment_submissions')
                .select('*', { count: 'exact', head: true })
                .in('assignment_id', assignmentLessonIds)
                .eq('status', 'pending')
                .gte('submitted_at', startDate.toISOString()),
          
          // Total assignments for teacher's courses
          timeRange === 'alltime'
            ? supabase.from('assignment_submissions')
                .select('*', { count: 'exact', head: true })
                .in('assignment_id', assignmentLessonIds)
            : supabase.from('assignment_submissions')
                .select('*', { count: 'exact', head: true })
                .in('assignment_id', assignmentLessonIds)
                .gte('submitted_at', startDate.toISOString()),
        ]);

        if (studentsError) throw studentsError;
        if (coursesError) throw coursesError;
        if (totalCoursesError) throw totalCoursesError;
        if (assignmentsError) throw assignmentsError;
        if (totalAssignmentsError) throw totalAssignmentsError;

        // Calculate derived metrics
        const avgCompletion = totalAssignments > 0 ? Math.round((totalAssignments - pendingAssignments) / totalAssignments * 100) : 0;
        const activeStudents = Math.floor((totalStudents ?? 0) * 0.85); // Estimate 85% active
        const avgEngagement = totalStudents > 0 ? Math.round((activeStudents / totalStudents) * 100) : 0;

        const baseStats = {
          totalStudents: totalStudents ?? 0,
          publishedCourses: publishedCourses ?? 0,
          activeCourses: publishedCourses ?? 0, // Assuming published courses are active
          totalCourses: totalCourses ?? 0,
          avgEngagement,
          avgCompletion,
          pendingAssignments: pendingAssignments ?? 0,
          totalAssignments: totalAssignments ?? 0,
          activeStudents,
        };

        setStats(baseStats);

        // Fetch chart data
        await fetchStudentEngagementData(courseIds, timeRange);
        await fetchCoursePerformanceData(courseIds);
        await fetchStudentProgressData(courseIds);
        await fetchStudentsData(courseIds);
        
        // Fetch reports data
        await fetchCourseCompletionTrends(courseIds, timeRange);
        await fetchQuizScoresData(courseIds);
        await fetchEngagementTrendsData(courseIds, timeRange);

      } catch (error: any) {
        console.error("Failed to fetch teacher dashboard stats:", error);
        toast.error("Failed to load dashboard statistics.", { description: error.message });
      } finally {
        setLoading(false);
      }
    };

    fetchTeacherData();
  }, [userProfile, timeRange]);

  // Separate useEffect for students data with filters and pagination
  useEffect(() => {
    if (userProfile?.id) {
      // Get course IDs for the teacher
      const getCourseIds = async () => {
        const { data: teacherCourses } = await supabase
          .from('course_members')
          .select('course_id')
          .eq('user_id', userProfile.id)
          .eq('role', 'teacher');
        
        if (teacherCourses) {
          const courseIds = teacherCourses.map(c => c.course_id);
          await fetchStudentsData(courseIds);
        }
      };
      
      getCourseIds();
    }
  }, [userProfile?.id, searchTerm, selectedCourse, selectedStatus, sortBy, sortOrder, currentPage, pageSize]);

  const fetchStudentEngagementData = async (courseIds: string[], range: string) => {
    try {
      // Use the dynamic SQL function
      const { data, error } = await supabase.rpc('get_student_engagement_trends', {
        teacher_id: userProfile.id,
        time_range: range
      });

      if (error) throw error;

      if (!data || data.length === 0) {
        // If no data, show meaningful empty state
        setStudentEngagementData([
          { week: 'No Activity', activeStudents: 0, completionRate: 0, timeSpent: 0 }
        ]);
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
      // Show meaningful error state
      setStudentEngagementData([
        { week: 'Data Unavailable', activeStudents: 0, completionRate: 0, timeSpent: 0 }
      ]);
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
        // If no data, show meaningful empty state
        setCoursePerformanceData([
          { course: 'No Courses Available', enrolled: 0, completed: 0, inProgress: 0, avgRating: 0 }
        ]);
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
      // Show meaningful error state
      setCoursePerformanceData([
        { course: 'Data Unavailable', enrolled: 0, completed: 0, inProgress: 0, avgRating: 0 }
      ]);
    }
  };

  const fetchStudentProgressData = async (courseIds: string[]) => {
    try {
      // Use the dynamic SQL function
      const { data, error } = await supabase.rpc('get_student_progress_distribution', {
        teacher_id: userProfile.id
      });

      if (error) throw error;

      if (!data || data.length === 0) {
        // If no data, show meaningful empty state
        setStudentProgressData([
          { name: 'No Student Activity', value: 1, color: '#6B7280' },
        ]);
        return;
      }

      // Transform the data to match the expected format
      const progressDistribution = data.map((item: any) => ({
        name: item.category_name,
        value: item.student_count,
        color: item.color_code
      }));

      setStudentProgressData(progressDistribution);
    } catch (error) {
      console.error("Failed to fetch student progress data:", error);
      // Show meaningful error state
      setStudentProgressData([
        { name: 'Data Unavailable', value: 1, color: '#6B7280' },
      ]);
    }
  };

  const fetchStudentsData = async (courseIds: string[]) => {
    try {
      setStudentsLoading(true);
      
      // Use the enhanced SQL function with pagination, search, and filtering
      const { data, error } = await supabase.rpc('get_students_data', {
        teacher_id: userProfile.id,
        search_term: searchTerm,
        course_filter: selectedCourse === 'all' ? '' : selectedCourse,
        status_filter: selectedStatus === 'all' ? '' : selectedStatus,
        sort_by: sortBy,
        sort_order: sortOrder,
        page_number: currentPage,
        page_size: pageSize
      });

      if (error) throw error;

      if (!data || data.length === 0) {
        // If no students found, show empty state
        setStudentsData([]);
        setTotalStudents(0);
        return;
      }

      // Transform the data to match the expected format
      const transformedStudents = data.map((student: any) => ({
        id: student.student_id,
        name: student.student_name,
        email: student.student_email,
        avatar: student.student_avatar,
        enrolledDate: student.enrolled_date,
        course: student.course_title,
        progress: student.progress_percentage,
        status: student.status,
        lastActive: student.last_active,
        assignments: student.assignments_completed,
      }));

      setStudentsData(transformedStudents);
      // Set total count from the first row (all rows have the same total_count)
      if (data.length > 0) {
        setTotalStudents(data[0].total_count);
      }
    } catch (error) {
      console.error("Failed to fetch students data:", error);
      // Show meaningful error state
      setStudentsData([
        {
          id: 1,
          name: 'Data Unavailable',
          email: 'error',
          avatar: 'DU',
          enrolledDate: new Date().toISOString().split('T')[0],
          course: 'Error',
          progress: 0,
          status: 'Error',
          lastActive: 'Error',
          assignments: '0/0',
        }
      ]);
      setTotalStudents(0);
    } finally {
      setStudentsLoading(false);
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
        // If no data, show meaningful empty state
        setCourseCompletionTrends([
          { month: 'No Data', 'No Courses': 0 }
        ]);
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
      // Show meaningful error state
      setCourseCompletionTrends([
        { month: 'Data Unavailable', 'Error': 0 }
      ]);
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
        // If no data, show meaningful empty state
        setQuizScoresData([
          { quiz: 'No Quizzes Available', avgScore: 0, attempts: 0, passRate: 0 }
        ]);
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
      // Show meaningful error state
      setQuizScoresData([
        { quiz: 'Data Unavailable', avgScore: 0, attempts: 0, passRate: 0 }
      ]);
    }
  };

  const fetchEngagementTrendsData = async (courseIds: string[], range: string) => {
    try {
      // Use the dynamic SQL function
      const { data, error } = await supabase.rpc('get_engagement_trends_data', {
        teacher_id: userProfile.id,
        time_range: range
      });

      if (error) throw error;

      if (!data || data.length === 0) {
        // If no data, show meaningful empty state
        setEngagementTrendsData([
          { week: 'No Activity', discussions: 0, assignments: 0, quizzes: 0, videos: 0 }
        ]);
        return;
      }

      // Transform the data to match the expected format
      const trendsData = data.map((item: any) => ({
        week: item.week_label,
        discussions: item.discussions_count,
        assignments: item.assignments_count,
        quizzes: item.quizzes_count,
        videos: item.videos_count
      }));

      setEngagementTrendsData(trendsData);
    } catch (error) {
      console.error("Failed to fetch engagement trends data:", error);
      // Show meaningful error state
      setEngagementTrendsData([
        { week: 'Data Unavailable', discussions: 0, assignments: 0, quizzes: 0, videos: 0 }
      ]);
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

  // Pagination component
  const Pagination = () => {
    const totalPages = Math.ceil(totalStudents / pageSize);
    const startItem = (currentPage - 1) * pageSize + 1;
    const endItem = Math.min(currentPage * pageSize, totalStudents);

    if (totalPages <= 1) return null;

    return (
      <div className="flex items-center justify-between px-2 py-4">
        <div className="flex-1 text-sm text-muted-foreground">
          Showing {startItem} to {endItem} of {totalStudents} results
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(1)}
            disabled={currentPage === 1}
          >
            <ChevronsLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(currentPage - 1)}
            disabled={currentPage === 1}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          
          <div className="flex items-center space-x-1">
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum;
              if (totalPages <= 5) {
                pageNum = i + 1;
              } else if (currentPage <= 3) {
                pageNum = i + 1;
              } else if (currentPage >= totalPages - 2) {
                pageNum = totalPages - 4 + i;
              } else {
                pageNum = currentPage - 2 + i;
              }
              
              return (
                <Button
                  key={pageNum}
                  variant={currentPage === pageNum ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCurrentPage(pageNum)}
                  className="w-8 h-8"
                >
                  {pageNum}
                </Button>
              );
            })}
          </div>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(currentPage + 1)}
            disabled={currentPage === totalPages}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(totalPages)}
            disabled={currentPage === totalPages}
          >
            <ChevronsRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  };



  return (
    <div className="space-y-6 p-2 sm:p-0">
      {loading ? (
        <div className="min-h-screen flex items-center justify-center">
          <ContentLoader message="Loading dashboard..." />
        </div>
      ) : (
        <>
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
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-40">
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
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        <MetricCard
          title="Total Students" 
          value={stats?.totalStudents ?? 0}
          icon={Users}
          color="text-blue-500"
        />
        <MetricCard
              title="Published Courses"
              value={stats?.publishedCourses ?? 0}
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
          title="Avg Completion"
          value={`${stats?.avgCompletion ?? 0}%`}
          icon={Target}
          color="text-orange-500"
        />
        <MetricCard
          title="Active Students"
          value={stats?.activeStudents ?? 0}
          icon={GraduationCap}
          color="text-cyan-500"
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
            <Card className="bg-gradient-to-br from-card to-green-500/5 dark:bg-card">
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
            <Card className="bg-gradient-to-br from-card to-green-500/5 dark:bg-card">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Students</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{Math.floor(studentsData.length * 0.85)}</div>
                <p className="text-xs text-muted-foreground">
                  {Math.round((Math.floor(studentsData.length * 0.85) / studentsData.length) * 100)}% of total
                </p>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-card to-green-500/5 dark:bg-card">
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
            <Card className="bg-gradient-to-br from-card to-green-500/5 dark:bg-card">
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
                      onChange={(e) => {
                        setSearchTerm(e.target.value);
                        setCurrentPage(1); // Reset to first page when searching
                      }}
                      className="pl-10"
                    />
                  </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <Select 
                    value={selectedCourse} 
                    onValueChange={(value) => {
                      setSelectedCourse(value);
                      setCurrentPage(1); // Reset to first page when filtering
                    }}
                  >
                    <SelectTrigger className="w-full sm:w-48">
                      <SelectValue placeholder="Filter by course" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Courses</SelectItem>
                      <SelectItem value="Sample Course">Sample Course</SelectItem>
                      <SelectItem value="Test course 1">Test course 1</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select 
                    value={selectedStatus} 
                    onValueChange={(value) => {
                      setSelectedStatus(value);
                      setCurrentPage(1); // Reset to first page when filtering
                    }}
                  >
                    <SelectTrigger className="w-full sm:w-32">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="Not Started">Not Started</SelectItem>
                      <SelectItem value="Active">Active</SelectItem>
                      <SelectItem value="Excellent">Excellent</SelectItem>
                      <SelectItem value="Behind">Behind</SelectItem>
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
                      <DropdownMenuItem onClick={() => { 
                        setSortBy('name'); 
                        setSortOrder('asc'); 
                        setCurrentPage(1); // Reset to first page when sorting
                      }}>
                        Name A-Z
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => { 
                        setSortBy('name'); 
                        setSortOrder('desc'); 
                        setCurrentPage(1); // Reset to first page when sorting
                      }}>
                        Name Z-A
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => { 
                        setSortBy('progress'); 
                        setSortOrder('desc'); 
                        setCurrentPage(1); // Reset to first page when sorting
                      }}>
                        Progress High-Low
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => { 
                        setSortBy('progress'); 
                        setSortOrder('asc'); 
                        setCurrentPage(1); // Reset to first page when sorting
                      }}>
                        Progress Low-High
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => { 
                        setSortBy('enrolled_date'); 
                        setSortOrder('desc'); 
                        setCurrentPage(1); // Reset to first page when sorting
                      }}>
                        Recently Enrolled
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => { 
                        setSortBy('enrolled_date'); 
                        setSortOrder('asc'); 
                        setCurrentPage(1); // Reset to first page when sorting
                      }}>
                        Oldest Enrolled
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              {/* Students Table */}
              <div className="rounded-md border">
                {studentsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <ContentLoader message="Loading students..." />
                  </div>
                ) : studentsData.length === 0 ? (
                  <div className="text-center py-12">
                    <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    {searchTerm || selectedCourse !== 'all' || selectedStatus !== 'all' ? (
                      <>
                        <h3 className="text-lg font-semibold text-muted-foreground mb-2">
                          No students found
                        </h3>
                        <p className="text-sm text-muted-foreground mb-4">
                          {searchTerm && `No students match "${searchTerm}"`}
                          {selectedCourse !== 'all' && `No students in "${selectedCourse}"`}
                          {selectedStatus !== 'all' && `No students with "${selectedStatus}" status`}
                        </p>
                        <Button 
                          variant="outline" 
                          onClick={() => {
                            setSearchTerm('');
                            setSelectedCourse('all');
                            setSelectedStatus('all');
                            setCurrentPage(1);
                          }}
                        >
                          Clear filters
                        </Button>
                      </>
                    ) : (
                      <>
                        <h3 className="text-lg font-semibold text-muted-foreground mb-2">
                          No students enrolled
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          Students will appear here once they enroll in your courses.
                        </p>
                      </>
                    )}
                  </div>
                ) : (
                  <>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Student</TableHead>
                          <TableHead>Course</TableHead>
                          <TableHead>Progress</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Last Active</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {studentsData.map((student) => (
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
                                <div className="w-full bg-muted rounded-full h-2">
                                  <div 
                                    className="bg-primary h-2 rounded-full transition-all duration-300"
                                    style={{ width: `${student.progress}%` }}
                                  />
                                </div>
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
                              <span className="text-sm text-muted-foreground">
                                {student.lastActive}
                              </span>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    
                    {/* Pagination */}
                    <Pagination />
                  </>
                )}
              </div>
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
                      {(() => {
                        // Extract all course names from the data (excluding 'month' key)
                        const courseNames = courseCompletionTrends.length > 0 
                          ? Object.keys(courseCompletionTrends[0]).filter(key => key !== 'month')
                          : [];
                        
                        // Color palette for course lines
                        const colors = ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EF4444', '#06B6D4', '#84CC16', '#F97316'];
                        
                        return courseNames.map((courseName, index) => (
                          <Line 
                            key={courseName}
                            type="monotone" 
                            dataKey={courseName} 
                            stroke={colors[index % colors.length]} 
                            strokeWidth={2} 
                            name={courseName}
                          />
                        ));
                      })()}
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


        </TabsContent>
      </Tabs>
        </>
      )}
    </div>
  );
};
