import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Legend, PieChart, Pie, Cell, AreaChart, Area } from 'recharts';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useState, useEffect } from 'react';
import { TeacherReportsService, TeacherReportsData } from '@/services/teacherReportsService';
import { 
  TrendingUp, 
  Activity, 
  Award, 
  BarChart3, 
  FileText,
  Users,
  BookOpen,
  Target,
  Clock,
  ChevronRight,
  AlertCircle,
  CheckCircle,
  Info,
  UserCheck,
  Calendar,
  Mail,
  Eye,
  Filter,
  Search,
  MoreHorizontal,
  ArrowUpRight,
  ArrowDownRight,
  SortAsc,
  ChevronLeft,
  ChevronsLeft,
  ChevronsRight
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { supabase } from '@/integrations/supabase/client';
import { ContentLoader } from '@/components/ContentLoader';
import { cn } from '@/lib/utils';

const chartConfig = {
  completion: {
    label: "Completion Rate",
    color: "hsl(var(--chart-1))",
  },
  engagement: {
    label: "Engagement Score",
    color: "hsl(var(--chart-2))",
  },
};

export default function ReportsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  
  // State management
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reportsData, setReportsData] = useState<TeacherReportsData | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [courseFilter, setCourseFilter] = useState('all');

  // Student management state
  const [studentsData, setStudentsData] = useState<any[]>([]);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [totalStudents, setTotalStudents] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sortBy, setSortBy] = useState('enrolled_date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Fetch reports data from database
  const fetchReportsData = async () => {
    if (!user) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // Get teacher's courses
      const { data: teacherCourses, error: coursesError } = await supabase
        .from('course_members')
        .select('course_id')
        .eq('user_id', user.id)
        .eq('role', 'teacher');

      if (coursesError) throw coursesError;

      const courseIds = teacherCourses.map(c => c.course_id);

      if (courseIds.length === 0) {
        setReportsData({
          overallMetrics: {
            totalStudents: 0,
            activeStudents: 0,
            averageCompletion: 0,
            averageScore: 0,
            coursesPublished: 0,
            totalAssignments: 0,
            totalEnrollments: 0,
            averageEngagement: 0
          },
          coursePerformance: [],
          studentProgress: [],
          assignmentPerformance: [],
          monthlyTrends: [],
          studentStatusDistribution: [],
          keyInsights: []
        });
        setLoading(false);
        return;
      }

      // Get course sections for teacher's courses
      const { data: sections, error: sectionsError } = await supabase
        .from('course_sections')
        .select('id, course_id')
        .in('course_id', courseIds);

      if (sectionsError) throw sectionsError;

      const sectionIds = sections.map(s => s.id);

      // Get lessons for teacher's courses
      const { data: lessons, error: lessonsError } = await supabase
        .from('course_lessons')
        .select('id')
        .in('section_id', sectionIds);

      if (lessonsError) throw lessonsError;
      const lessonIds = lessons?.map(l => l.id) ?? [];

      // Get assignment content item IDs
      const { data: assignmentContents, error: assignmentContentsError } = await supabase
        .from('course_lesson_content')
        .select('id')
        .in('lesson_id', lessonIds)
        .eq('content_type', 'assignment');
      
      if (assignmentContentsError) throw assignmentContentsError;

      const assignmentContentIds = assignmentContents?.map(ac => ac.id) ?? [];

      // Fetch metrics using the same approach as TeacherDashboard
      const [
        { count: totalStudents, error: studentsError },
        { count: publishedCourses, error: publishedCoursesError },
        { count: totalCourses, error: totalCoursesError },
        { count: pendingAssignments, error: pendingAssignmentsError },
        { count: totalAssignments, error: totalAssignmentsError },
      ] = await Promise.all([
        // Total students enrolled in teacher's courses
        supabase.from('course_members')
          .select('*', { count: 'exact', head: true })
          .in('course_id', courseIds)
          .eq('role', 'student'),
        
        // Published courses by this teacher
        supabase.from('courses')
          .select('*', { count: 'exact', head: true })
          .in('id', courseIds)
          .eq('status', 'Published'),
        
        // Total courses by this teacher
        supabase.from('courses')
          .select('*', { count: 'exact', head: true })
          .in('id', courseIds),
        
        // Pending assignments for teacher's courses
        supabase.from('assignment_submissions')
          .select('*', { count: 'exact', head: true })
          .in('assignment_id', assignmentContentIds)
          .eq('status', 'pending'),
        
        // Total assignments for teacher's courses
        supabase.from('assignment_submissions')
          .select('*', { count: 'exact', head: true })
          .in('assignment_id', assignmentContentIds),
      ]);

      if (studentsError) throw studentsError;
      if (publishedCoursesError) throw publishedCoursesError;
      if (totalCoursesError) throw totalCoursesError;
      if (pendingAssignmentsError) throw pendingAssignmentsError;
      if (totalAssignmentsError) throw totalAssignmentsError;

      // Calculate derived metrics using the same logic as TeacherDashboard
      const avgCompletion = totalAssignments > 0 ? Math.round((totalAssignments - pendingAssignments) / totalAssignments * 100) : 0;
      const activeStudents = Math.floor((totalStudents ?? 0) * 0.85); // Estimate 85% active
      const avgEngagement = totalStudents > 0 ? Math.round((activeStudents / totalStudents) * 100) : 0;

      // Get chart data from TeacherReportsService
      const reportsService = new TeacherReportsService(user.id);
      const chartData = await reportsService.fetchTeacherReports();

      // Create reports data structure with correct metrics but keep chart data
      const reportsData = {
        overallMetrics: {
          totalStudents: totalStudents ?? 0,
          activeStudents,
          averageCompletion: avgCompletion,
          averageScore: chartData.overallMetrics.averageScore, // Keep from service for accuracy
          coursesPublished: publishedCourses ?? 0,
          totalAssignments: totalAssignments ?? 0,
          totalEnrollments: totalStudents ?? 0,
          averageEngagement: avgEngagement
        },
        coursePerformance: chartData.coursePerformance,
        studentProgress: chartData.studentProgress,
        assignmentPerformance: chartData.assignmentPerformance,
        monthlyTrends: chartData.monthlyTrends,
        studentStatusDistribution: chartData.studentStatusDistribution,
        keyInsights: chartData.keyInsights
      };

      setReportsData(reportsData);
    } catch (err: any) {
      console.error('Error fetching reports data:', err);
      const errorMessage = err.message || 'Failed to fetch reports data';
      setError(errorMessage);
      toast({
        title: 'Error',
        description: `Failed to load reports: ${errorMessage}`,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReportsData();
  }, [user]);

  // Fetch students data when filters change
  useEffect(() => {
    if (user?.id) {
      fetchStudentsData();
    }
  }, [user?.id, searchTerm, courseFilter, statusFilter, sortBy, sortOrder, currentPage, pageSize]);

  const fetchStudentsData = async () => {
    if (!user?.id) return;
    
    try {
      setStudentsLoading(true);
      
      // Get teacher's course IDs
      const { data: teacherCourses, error: coursesError } = await supabase
        .from('course_members')
        .select('course_id')
        .eq('user_id', user.id)
        .eq('role', 'teacher');

      if (coursesError) throw coursesError;

      const courseIds = teacherCourses.map(c => c.course_id);

      if (courseIds.length === 0) {
        setStudentsData([]);
        setTotalStudents(0);
        return;
      }

      // Use the enhanced SQL function with pagination, search, and filtering
      const { data, error } = await supabase.rpc('get_students_data', {
        teacher_id: user.id,
        search_term: searchTerm,
        course_filter: courseFilter === 'all' ? '' : courseFilter,
        status_filter: statusFilter === 'all' ? '' : statusFilter,
        sort_by: sortBy,
        sort_order: sortOrder,
        page_number: currentPage,
        page_size: pageSize
      });

      if (error) throw error;

      if (!data || data.length === 0) {
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
      setStudentsData([]);
      setTotalStudents(0);
    } finally {
      setStudentsLoading(false);
    }
  };

  // Filter students based on search and filters
  const filteredStudents = reportsData?.studentProgress.filter(student => {
    const matchesSearch = student.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         student.courseTitle.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || student.status === statusFilter;
    const matchesCourse = courseFilter === 'all' || student.courseId === courseFilter;
    
    return matchesSearch && matchesStatus && matchesCourse;
  }) || [];

  // Get unique courses for filter
  const uniqueCourses = reportsData?.coursePerformance.map(course => ({
    id: course.courseId,
    title: course.courseTitle
  })) || [];

  // Calculate trend indicators
  const getTrendIndicator = (current: number, previous: number) => {
    const change = current - previous;
    const percentage = previous > 0 ? (change / previous) * 100 : 0;
    
    if (change > 0) {
      return { icon: ArrowUpRight, color: 'text-green-600', value: `+${Math.round(percentage)}%` };
    } else if (change < 0) {
      return { icon: ArrowDownRight, color: 'text-red-600', value: `${Math.round(percentage)}%` };
    }
    return { icon: null, color: 'text-gray-600', value: '0%' };
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getStatusColor = (status: string) => {
    const colors = {
      'active': 'bg-green-100 text-green-800',
      'completed': 'bg-blue-100 text-blue-800',
      'at-risk': 'bg-orange-100 text-orange-800',
      'inactive': 'bg-red-100 text-red-800'
    };
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <ContentLoader message="Loading reports..." />
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
                <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-primary via-primary to-primary/80 bg-clip-text text-transparent" style={{ backgroundClip: 'text', WebkitBackgroundClip: 'text' }}>
                  Reports & Analytics
                </h1>
                <p className="text-lg text-muted-foreground font-light">
                  Monitor platform performance and user engagement
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <AlertCircle className="h-5 w-5 text-red-500" />
              <div>
                <p className="text-sm font-medium text-red-800">Error loading reports data</p>
                <p className="text-sm text-red-600">{error}</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={fetchReportsData}
                  className="mt-2"
                  disabled={loading}
                >
                  Try Again
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {reportsData && (
        <>
          {/* Key Metrics - Clean Design */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="bg-gradient-to-br from-card to-green-500/5 dark:bg-card">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Students</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{reportsData.overallMetrics.totalStudents}</div>
                <p className="text-xs text-muted-foreground">
                  Across {reportsData.overallMetrics.coursesPublished} courses
                </p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-card to-blue-500/5 dark:bg-card">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Students</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{reportsData.overallMetrics.activeStudents}</div>
                <p className="text-xs text-muted-foreground">
                  {reportsData.overallMetrics.totalStudents > 0 
                    ? Math.round((reportsData.overallMetrics.activeStudents / reportsData.overallMetrics.totalStudents) * 100)
                        : 0}% engagement rate
                </p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-card to-orange-500/5 dark:bg-card">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg Completion</CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{reportsData.overallMetrics.averageCompletion}%</div>
                <p className="text-xs text-muted-foreground">
                  Course completion rate
                </p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-card to-purple-500/5 dark:bg-card">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg Score</CardTitle>
                <Award className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{reportsData.overallMetrics.averageScore}%</div>
                <p className="text-xs text-muted-foreground">
                  Assignment performance
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Key Insights */}
          {reportsData.keyInsights.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Key Insights
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Important trends and recommendations for your courses
                </p>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {reportsData.keyInsights.map((insight, index) => (
                    <div key={index} className="flex items-start gap-3 p-4 rounded-lg border bg-card/50">
                      <div className={`p-2 rounded-full ${insight.color.replace('text-', 'bg-')} bg-opacity-10`}>
                        {insight.icon === 'TrendingUp' && <TrendingUp className="h-4 w-4" />}
                        {insight.icon === 'AlertCircle' && <AlertCircle className="h-4 w-4" />}
                        {insight.icon === 'CheckCircle' && <CheckCircle className="h-4 w-4" />}
                        {insight.icon === 'Award' && <Award className="h-4 w-4" />}
                      </div>
                      <div className="flex-1 space-y-1">
                        <h4 className="font-medium text-sm">{insight.title}</h4>
                        <p className="text-xs text-muted-foreground">{insight.description}</p>
                        {insight.action && (
                          <Button variant="ghost" size="sm" className="h-6 px-2 text-xs">
                            {insight.action}
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Main Content Tabs */}
          <Tabs defaultValue="overview" className="space-y-4">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="student-management">Student Management</TabsTrigger>
              <TabsTrigger value="courses">Course Performance</TabsTrigger>
              <TabsTrigger value="assignments">Assignments</TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Course Performance Overview */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BookOpen className="h-5 w-5" />
                      Course Performance
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {reportsData.coursePerformance.length > 0 ? (
                      <div className="space-y-4">
                        {reportsData.coursePerformance.map((course, index) => (
                          <div key={index} className="space-y-3 p-3 rounded-lg border">
                            <div className="flex justify-between items-start">
                              <div>
                                <h4 className="font-medium">{course.courseTitle}</h4>
                                <p className="text-sm text-muted-foreground">{course.courseDescription}</p>
                              </div>
                              <Badge variant={course.completionRate >= 80 ? 'default' : 'secondary'}>
                                {course.completionRate}% complete
                      </Badge>
                    </div>
                            <div className="w-full bg-muted rounded-full h-2">
                              <div 
                                className="bg-primary h-2 rounded-full transition-all duration-300"
                                style={{ width: `${course.completionRate}%` }}
                              />
                            </div>
                            <div className="grid grid-cols-3 gap-4 text-sm">
                              <div>
                                <p className="text-muted-foreground">Students</p>
                                <p className="font-medium">{course.totalStudents}</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">Active</p>
                                <p className="font-medium">{course.activeStudents}</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">Avg Score</p>
                                <p className="font-medium">{course.averageScore}%</p>
                              </div>
                            </div>
                            <div className="text-xs text-muted-foreground">
                              Last activity: {formatDate(course.lastActivity)}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No courses found. Create and publish courses to see performance data.</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Student Status Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Student Status Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
                    {reportsData.studentStatusDistribution.length > 0 ? (
              <div>
                <div className="h-[200px] mb-4">
                  <ChartContainer config={chartConfig} className="w-full h-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                                  data={reportsData.studentStatusDistribution}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={2}
                                  dataKey="count"
                        >
                                  {reportsData.studentStatusDistribution.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <ChartTooltip content={<ChartTooltipContent />} />
                      </PieChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                </div>
                <div className="space-y-2">
                          {reportsData.studentStatusDistribution.map((item, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: item.color }}
                        />
                                <span className="text-sm">{item.status}</span>
                              </div>
                              <div className="text-right">
                                <span className="text-sm font-medium">{item.count}</span>
                                <span className="text-xs text-muted-foreground ml-1">({item.percentage}%)</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No student data available. Enroll students to see their status distribution.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Monthly Trends */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Monthly Progress Trends
          </CardTitle>
          <p className="text-sm text-muted-foreground">
                    Track enrollments, completions, and performance over time
          </p>
        </CardHeader>
        <CardContent>
            <div className="h-[300px]">
              <ChartContainer config={chartConfig} className="w-full h-full">
                <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={reportsData.monthlyTrends}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <ChartTooltip content={<ChartTooltipContent />} />
                          <Area 
                      type="monotone" 
                            dataKey="enrollments" 
                            stackId="1"
                      stroke="#3B82F6" 
                            fill="#3B82F6"
                            fillOpacity={0.6}
                            name="Enrollments" 
                          />
                          <Area 
                            type="monotone" 
                            dataKey="completions" 
                            stackId="1"
                            stroke="#10B981" 
                            fill="#10B981"
                            fillOpacity={0.6}
                            name="Completions" 
                    />
                    <Line 
                      type="monotone" 
                            dataKey="averageScore" 
                            stroke="#F59E0B" 
                      strokeWidth={2} 
                            name="Avg Score %" 
                    />
                    <Legend />
                        </AreaChart>
                </ResponsiveContainer>
              </ChartContainer>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Student Management Tab */}
            <TabsContent value="student-management" className="space-y-4">
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
                        value={courseFilter} 
                        onValueChange={(value) => {
                          setCourseFilter(value);
                          setCurrentPage(1); // Reset to first page when filtering
                        }}
                      >
                        <SelectTrigger className="w-full sm:w-48">
                          <SelectValue placeholder="Filter by course" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Courses</SelectItem>
                          {uniqueCourses.map(course => (
                            <SelectItem key={course.id} value={course.id}>
                              {course.title}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Select 
                        value={statusFilter} 
                        onValueChange={(value) => {
                          setStatusFilter(value);
                          setCurrentPage(1); // Reset to first page when filtering
                        }}
                      >
                        <SelectTrigger className="w-full sm:w-32">
                          <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Status</SelectItem>
                          <SelectItem value="Not Started">Not Started</SelectItem>
                          <SelectItem value="In Progress">In Progress</SelectItem>
                          <SelectItem value="Completed">Completed</SelectItem>
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
                        {searchTerm || courseFilter !== 'all' || statusFilter !== 'all' ? (
                          <>
                            <h3 className="text-lg font-semibold text-muted-foreground mb-2">
                              No students found
                            </h3>
                            <p className="text-sm text-muted-foreground mb-4">
                              {searchTerm && `No students match "${searchTerm}"`}
                              {courseFilter !== 'all' && `No students in "${courseFilter}"`}
                              {statusFilter !== 'all' && `No students with "${statusFilter}" status`}
                            </p>
                            <Button 
                              variant="outline" 
                              onClick={() => {
                                setSearchTerm('');
                                setCourseFilter('all');
                                setStatusFilter('all');
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
                                    className={cn(
                                      "capitalize",
                                      student.status.replace('_', ' ') === 'Completed' && 'bg-blue-100 text-blue-800',
                                      student.status.replace('_', ' ') === 'In Progress' && 'bg-green-100 text-green-800',
                                      student.status.replace('_', ' ') === 'Not Started' && 'bg-gray-100 text-gray-800',
                                      student.status.replace('_', ' ') === 'Behind' && 'bg-red-100 text-red-800'
                                    )}
                                  >
                                    {student.status.replace('_', ' ').replace(/\b\w/g, char => char.toUpperCase())}
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

            {/* Courses Tab */}
            <TabsContent value="courses" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BookOpen className="h-5 w-5" />
                    Course Performance Details
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {reportsData.coursePerformance.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {reportsData.coursePerformance.map((course, index) => (
                        <Card key={index} className="p-6">
                          <div className="space-y-4">
                            <div>
                              <h3 className="font-semibold text-lg">{course.courseTitle}</h3>
                              <p className="text-sm text-muted-foreground">{course.courseDescription}</p>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4">
                              <div className="text-center p-3 bg-blue-50 rounded-lg">
                                <p className="text-2xl font-bold text-blue-600">{course.completionRate}%</p>
                                <p className="text-xs text-blue-600">Completion</p>
                              </div>
                              <div className="text-center p-3 bg-green-50 rounded-lg">
                                <p className="text-2xl font-bold text-green-600">{course.averageScore}%</p>
                                <p className="text-xs text-green-600">Avg Score</p>
                              </div>
                            </div>
                            
                            <div className="space-y-2">
                              <div className="flex justify-between text-sm">
                                <span>Total Students:</span>
                                <span className="font-medium">{course.totalStudents}</span>
                              </div>
                              <div className="flex justify-between text-sm">
                                <span>Active Students:</span>
                                <span className="font-medium">{course.activeStudents}</span>
                              </div>
                              <div className="flex justify-between text-sm">
                                <span>Assignments:</span>
                                <span className="font-medium">{course.totalAssignments}</span>
                              </div>
                              <div className="flex justify-between text-sm">
                                <span>Submissions:</span>
                                <span className="font-medium">{course.completedAssignments}</span>
                              </div>
                            </div>
                            
                            <div className="w-full bg-muted rounded-full h-2">
                              <div 
                                className="bg-primary h-2 rounded-full transition-all duration-300"
                                style={{ width: `${course.completionRate}%` }}
                              />
                            </div>
                            
                            <div className="text-xs text-muted-foreground">
                              Last activity: {formatDate(course.lastActivity)}
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No courses found. Create and publish courses to see performance data.</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Assignments Tab */}
            <TabsContent value="assignments" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Assignment Performance
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {reportsData.assignmentPerformance.length > 0 ? (
                    <div className="space-y-4">
                      {reportsData.assignmentPerformance.map((assignment, index) => (
                        <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                          <div className="flex-1">
                            <h4 className="font-medium">{assignment.assignmentTitle}</h4>
                            <p className="text-sm text-muted-foreground">
                              Due: {formatDate(assignment.dueDate)}
                            </p>
                          </div>
                          <div className="flex items-center gap-6">
                            <div className="text-center">
                              <p className="text-sm text-muted-foreground">Submissions</p>
                              <p className="font-medium">{assignment.totalSubmissions}</p>
                            </div>
                            <div className="text-center">
                              <p className="text-sm text-muted-foreground">Avg Score</p>
                              <p className="font-medium">{assignment.averageScore}%</p>
                            </div>
                            <div className="text-center">
                              <p className="text-sm text-muted-foreground">Completion</p>
                              <p className="font-medium">{assignment.completionRate}%</p>
                            </div>
                            <Badge variant={
                              assignment.status === 'completed' ? 'default' :
                              assignment.status === 'overdue' ? 'destructive' :
                              assignment.status === 'upcoming' ? 'secondary' : 'outline'
                            }>
                              {assignment.status.charAt(0).toUpperCase() + assignment.status.slice(1)}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No assignments found. Create assignments to see performance data.</p>
            </div>
          )}
        </CardContent>
      </Card>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
} 