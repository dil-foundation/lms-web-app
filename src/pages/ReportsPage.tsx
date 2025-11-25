import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Legend, PieChart, Pie, Cell, AreaChart, Area } from 'recharts';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { PaginationControls } from '@/components/ui/PaginationControls';
import { useState, useEffect, useMemo } from 'react';
import { TeacherReportsService, TeacherReportsData } from '@/services/teacherReportsService';
import { ExportButton } from '@/components/ui/ExportButton';
import { ReportData, ExportColumn } from '@/services/universalExportService';
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

/**
 * Prepare teacher reports data for export
 */
function prepareReportDataForExport(
  reportsData: TeacherReportsData,
  user: any
): ReportData {
  const columns: ExportColumn[] = [
    { header: 'Student Name', key: 'studentName', width: 25 },
    { header: 'Email', key: 'studentEmail', width: 30 },
    { header: 'Course', key: 'courseTitle', width: 30 },
    { header: 'Progress %', key: 'completionRate', width: 15, format: (v) => `${v}%` },
    { header: 'Avg Score %', key: 'averageScore', width: 15, format: (v) => `${v}%` },
    { header: 'Assignments', key: 'assignmentsCompleted', width: 15, format: (v: any, row?: any) => row ? `${v}/${row.totalAssignments}` : String(v) },
    { header: 'Status', key: 'status', width: 15 },
    { header: 'Last Activity', key: 'lastActivity', width: 20 },
  ];

  const courseColumns: ExportColumn[] = [
    { header: 'Course Title', key: 'courseTitle', width: 40 },
    { header: 'Total Students', key: 'totalStudents', width: 15 },
    { header: 'Active Students', key: 'activeStudents', width: 15 },
    { header: 'Completion Rate %', key: 'completionRate', width: 18, format: (v) => `${v}%` },
    { header: 'Avg Score %', key: 'averageScore', width: 15, format: (v) => `${v}%` },
    { header: 'Total Assignments', key: 'totalAssignments', width: 18 },
    { header: 'Completed', key: 'completedAssignments', width: 15 },
    { header: 'Last Activity', key: 'lastActivity', width: 20 },
  ];

  const assignmentColumns: ExportColumn[] = [
    { header: 'Assignment Title', key: 'assignmentTitle', width: 35 },
    { header: 'Course', key: 'courseTitle', width: 30 },
    { header: 'Submissions', key: 'totalSubmissions', width: 15 },
    { header: 'Avg Score %', key: 'averageScore', width: 15, format: (v) => `${v}%` },
    { header: 'Completion %', key: 'completionRate', width: 15, format: (v) => `${v}%` },
    { header: 'Due Date', key: 'dueDate', width: 20 },
    { header: 'Status', key: 'status', width: 15 },
  ];

  return {
    metadata: {
      title: 'Teacher Performance Analytics Report',
      description: 'Comprehensive performance analytics for teacher dashboard',
      generatedBy: user?.email || 'Unknown',
      generatedAt: new Date(),
    },
    summary: `This report contains performance analytics for ${reportsData.overallMetrics.totalStudents} students across ${reportsData.overallMetrics.coursesPublished} courses. Overall completion rate: ${reportsData.overallMetrics.averageCompletion}%, Average score: ${reportsData.overallMetrics.averageScore}%.`,
    metrics: [
      { label: 'Total Students', value: reportsData.overallMetrics.totalStudents },
      { label: 'Active Students', value: reportsData.overallMetrics.activeStudents },
      { label: 'Average Completion', value: `${reportsData.overallMetrics.averageCompletion}%` },
      { label: 'Average Score', value: `${reportsData.overallMetrics.averageScore}%` },
      { label: 'Courses Published', value: reportsData.overallMetrics.coursesPublished },
      { label: 'Total Assignments', value: reportsData.overallMetrics.totalAssignments },
      { label: 'Total Enrollments', value: reportsData.overallMetrics.totalEnrollments },
      { label: 'Average Engagement', value: `${reportsData.overallMetrics.averageEngagement}%` },
    ],
    tables: [
      {
        title: 'Student Progress',
        columns,
        data: reportsData.studentProgress.map(student => ({
          studentName: student.studentName,
          studentEmail: student.studentEmail,
          courseTitle: student.courseTitle,
          completionRate: student.completionRate,
          averageScore: student.averageScore,
          assignmentsCompleted: student.assignmentsCompleted,
          totalAssignments: student.totalAssignments,
          status: student.status,
          lastActivity: student.lastActivity,
        })),
      },
      {
        title: 'Course Performance',
        columns: courseColumns,
        data: reportsData.coursePerformance.map(course => ({
          courseTitle: course.courseTitle,
          totalStudents: course.totalStudents,
          activeStudents: course.activeStudents,
          completionRate: course.completionRate,
          averageScore: course.averageScore,
          totalAssignments: course.totalAssignments,
          completedAssignments: course.completedAssignments,
          lastActivity: course.lastActivity,
        })),
      },
      {
        title: 'Assignment Performance',
        columns: assignmentColumns,
        data: reportsData.assignmentPerformance.map(assignment => ({
          assignmentTitle: assignment.assignmentTitle,
          courseTitle: assignment.courseTitle,
          totalSubmissions: assignment.totalSubmissions,
          averageScore: assignment.averageScore,
          completionRate: assignment.completionRate,
          dueDate: assignment.dueDate,
          status: assignment.status,
        })),
      },
      {
        title: 'Monthly Trends',
        columns: [
          { header: 'Month', key: 'month', width: 20 },
          { header: 'Enrollments', key: 'enrollments', width: 15 },
          { header: 'Completions', key: 'completions', width: 15 },
          { header: 'Avg Score', key: 'averageScore', width: 15, format: (v) => `${v}%` },
          { header: 'Active Students', key: 'activeStudents', width: 15 },
        ],
        data: reportsData.monthlyTrends,
      },
    ],
  };
}

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

  const handleItemsPerPageChange = (newPageSize: number) => {
    setPageSize(newPageSize);
    setCurrentPage(1); // Reset to first page when changing items per page
  };

  // Prepare report data for export (memoized at top level to avoid hook order issues)
  const exportReportData = useMemo(() => {
    if (!reportsData || !user) return null;
    return prepareReportDataForExport(reportsData, user);
  }, [reportsData, user]);

  // Fetch reports data from database
  const fetchReportsData = async () => {
    if (!user) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const reportsService = new TeacherReportsService(user.id);
      const data = await reportsService.fetchTeacherReports();
      setReportsData(data);
    } catch (err: any) {
      console.error('Error fetching reports data:', err);
      const errorMessage = err.message || 'Failed to fetch reports data';
      setError(errorMessage);
      toast({
        title: 'Error',
        description: `Failed to load performance analytics: ${errorMessage}`,
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
        .select('course_id, courses!inner(status)')
        .eq('user_id', user.id)
        .eq('role', 'teacher')
        .eq('courses.status', 'Published');

      if (coursesError) throw coursesError;

      const courseIds = teacherCourses.map(c => c.course_id);

      if (courseIds.length === 0) {
        setStudentsData([]);
        setTotalStudents(0);
        return;
      }

      // Use the enhanced SQL function with pagination, search, and filtering
      const { data, error } = await supabase.rpc('get_students_data', {
        p_teacher_id: user.id,
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
        avatar_url: student.avatar_url,
        enrolledDate: student.enrolled_date,
        course: student.course_title,
        progress: student.progress_percentage,
        status: student.status,
        lastActive: student.last_active,

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
      'completed': 'bg-blue-100 text-white',
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
        <ContentLoader message="Loading performance analytics..." />
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 md:space-y-8">
      {/* Premium Header Section */}
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-primary/5 rounded-2xl sm:rounded-3xl"></div>
        <div className="relative p-4 sm:p-6 md:p-8 rounded-2xl sm:rounded-3xl">
          <div className="flex items-start sm:items-center gap-2 sm:gap-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-primary/10 to-primary/20 rounded-xl sm:rounded-2xl flex items-center justify-center flex-shrink-0">
              <BarChart3 className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold tracking-tight bg-gradient-to-r from-primary via-primary to-primary/80 bg-clip-text text-transparent leading-tight" style={{ backgroundClip: 'text', WebkitBackgroundClip: 'text' }}>
                Performance Analytics
              </h1>
              <p className="text-sm sm:text-base md:text-lg text-muted-foreground font-light mt-1">
                Monitor platform performance and user engagement
              </p>
            </div>
            {exportReportData && (
              <ExportButton
                reportData={exportReportData}
                filename="teacher-performance-analytics"
                variant="outline"
                className="shrink-0"
              />
            )}
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
                <p className="text-sm font-medium text-red-800">Error loading performance analytics data</p>
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
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            <Card className="bg-gradient-to-br from-card to-green-500/5 dark:bg-card">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 sm:p-4 md:p-6">
                <CardTitle className="text-xs sm:text-sm font-medium">Total Students</CardTitle>
                <Users className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent className="p-3 sm:p-4 md:p-6 pt-0">
                <div className="text-xl sm:text-2xl font-bold">{reportsData.overallMetrics.totalStudents}</div>
                <p className="text-[10px] sm:text-xs text-muted-foreground">
                  Across {reportsData.overallMetrics.coursesPublished} courses
                </p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-card to-green-500/5 dark:bg-card">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 sm:p-4 md:p-6">
                <CardTitle className="text-xs sm:text-sm font-medium">Active Students</CardTitle>
                <Activity className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent className="p-3 sm:p-4 md:p-6 pt-0">
                <div className="text-xl sm:text-2xl font-bold">{reportsData.overallMetrics.activeStudents}</div>
                <p className="text-[10px] sm:text-xs text-muted-foreground">
                  {reportsData.overallMetrics.totalStudents > 0 
                    ? Math.round((reportsData.overallMetrics.activeStudents / reportsData.overallMetrics.totalStudents) * 100)
                        : 0}% engagement rate
                </p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-card to-green-500/5 dark:bg-card">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 sm:p-4 md:p-6">
                <CardTitle className="text-xs sm:text-sm font-medium">Avg Completion</CardTitle>
                <Target className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent className="p-3 sm:p-4 md:p-6 pt-0">
                <div className="text-xl sm:text-2xl font-bold">{reportsData.overallMetrics.averageCompletion}%</div>
                <p className="text-[10px] sm:text-xs text-muted-foreground">
                  Course completion rate
                </p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-card to-green-500/5 dark:bg-card">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 sm:p-4 md:p-6">
                <CardTitle className="text-xs sm:text-sm font-medium">Avg Score</CardTitle>
                <Award className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent className="p-3 sm:p-4 md:p-6 pt-0">
                <div className="text-xl sm:text-2xl font-bold">{reportsData.overallMetrics.averageScore}%</div>
                <p className="text-[10px] sm:text-xs text-muted-foreground">
                  Assignment performance
                </p>
              </CardContent>
            </Card>
          </div>



          {/* Main Content Tabs */}
          <Tabs defaultValue="overview" className="space-y-4">
            <TabsList className="!grid w-full grid-cols-2 lg:grid-cols-4 gap-2 lg:gap-0 h-auto lg:h-10">
              <TabsTrigger value="overview" className="text-xs sm:text-sm px-2 sm:px-3 py-2">Overview</TabsTrigger>
              <TabsTrigger value="student-management" className="text-xs sm:text-sm px-2 sm:px-3 py-2">Student Management</TabsTrigger>
              <TabsTrigger value="courses" className="text-xs sm:text-sm px-2 sm:px-3 py-2">Course Performance</TabsTrigger>
              <TabsTrigger value="assignments" className="text-xs sm:text-sm px-2 sm:px-3 py-2">Assignments</TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-4">
              <div className="grid grid-cols-1 gap-6">
                {/* Student Status Distribution */}
                <Card>
                  <CardHeader className="p-4 sm:p-6">
                    <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                      <Users className="h-4 w-4 sm:h-5 sm:w-5" />
                      Student Status Overview
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 sm:p-6 pt-0">
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
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5" />
            Monthly Progress Trends
          </CardTitle>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                    Track enrollments, completions, and performance over time
          </p>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 pt-0">
            <div className="h-[250px] sm:h-[300px]">
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
                <CardHeader className="p-4 sm:p-6">
                  <CardTitle className="text-base sm:text-lg">Student Management</CardTitle>
                </CardHeader>
                <CardContent className="p-4 sm:p-6 pt-0">
                  <div className="flex flex-col gap-3 sm:gap-4 mb-4 sm:mb-6">
                    <div className="relative flex-1">
                      <Search className="absolute left-2.5 sm:left-3 top-2.5 sm:top-3 h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search students by name or email..."
                        value={searchTerm}
                        onChange={(e) => {
                          setSearchTerm(e.target.value);
                          setCurrentPage(1); // Reset to first page when searching
                        }}
                        className="pl-8 sm:pl-10 h-9 sm:h-10 text-sm"
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
                        <SelectTrigger className="w-full sm:w-48 h-9 sm:h-10 text-sm">
                          <SelectValue placeholder="Filter by course" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all" className="text-sm">All Courses</SelectItem>
                          {uniqueCourses.map(course => (
                            <SelectItem key={course.id} value={course.id} className="text-sm">
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
                        <SelectTrigger className="w-full sm:w-32 h-9 sm:h-10 text-sm">
                          <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all" className="text-sm">All Status</SelectItem>
                          <SelectItem value="Not Started" className="text-sm">Not Started</SelectItem>
                          <SelectItem value="In Progress" className="text-sm">In Progress</SelectItem>
                          <SelectItem value="Completed" className="text-sm">Completed</SelectItem>
                          <SelectItem value="Behind" className="text-sm">Behind</SelectItem>
                        </SelectContent>
                      </Select>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" className="w-full sm:w-auto h-9 sm:h-10 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md hover:shadow-primary/10 hover:bg-primary/5 hover:border-primary/30 hover:text-primary text-sm">
                            <SortAsc className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-2" />
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

                  {/* Students List */}
                  <div className="space-y-4">
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
                        <div className="space-y-3">
                          {studentsData.map((student) => (
                            <div
                              key={student.id}
                              className="p-4 rounded-xl border bg-card/40 backdrop-blur-sm flex flex-col gap-4 lg:grid lg:grid-cols-[1.5fr,1.3fr,1fr,0.9fr]"
                            >
                              <div className="flex items-center gap-3">
                                <Avatar className="h-12 w-12">
                                  <AvatarImage 
                                    src={student.avatar_url} 
                                    alt={student.name}
                                  />
                                  <AvatarFallback className="text-base">
                                    {student.avatar}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="space-y-1">
                                  <p className="font-semibold text-base">{student.name}</p>
                                  <p className="text-xs sm:text-sm text-muted-foreground break-all">{student.email}</p>
                                </div>
                              </div>

                              <div className="flex flex-col gap-1 text-sm">
                                <p className="text-muted-foreground text-xs uppercase tracking-wide">Course</p>
                                <p className="font-medium leading-tight">{student.course}</p>
                                <p className="text-muted-foreground text-xs sm:text-sm">
                                  Enrolled: {new Date(student.enrolledDate).toLocaleDateString()}
                                </p>
                              </div>

                              <div className="flex flex-col gap-2">
                                <div className="flex items-center justify-between text-sm font-medium text-muted-foreground">
                                  <span>Progress</span>
                                  <span className="text-base text-foreground">{student.progress}%</span>
                                </div>
                                <div className="w-full bg-muted/40 rounded-full h-2 overflow-hidden">
                                  <div
                                    className="bg-primary h-2 rounded-full transition-all duration-300 ease-out"
                                    style={{ width: `${student.progress}%` }}
                                  />
                                </div>
                                <Badge
                                  className={cn(
                                    "w-fit capitalize",
                                    student.status.replace('_', ' ') === 'Completed' && 'bg-green-100 text-green-800 border-green-200',
                                    student.status.replace('_', ' ') === 'In Progress' && 'bg-blue-100 text-blue-800 border-blue-200',
                                    student.status.replace('_', ' ') === 'Not Started' && 'bg-gray-100 text-gray-800 border-gray-200',
                                    student.status.replace('_', ' ') === 'Behind' && 'bg-red-100 text-red-800 border-red-200'
                                  )}
                                >
                                  {student.status.replace('_', ' ').replace(/\b\w/g, char => char.toUpperCase())}
                                </Badge>
                              </div>

                              <div className="text-sm text-muted-foreground flex flex-col gap-1">
                                <p className="text-xs uppercase tracking-wide">Last Active</p>
                                <p className="text-base text-foreground">{student.lastActive}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                        
                        {/* Pagination */}
                        <PaginationControls
                          currentPage={currentPage}
                          totalPages={Math.ceil(totalStudents / pageSize)}
                          totalItems={totalStudents}
                          itemsPerPage={pageSize}
                          onPageChange={setCurrentPage}
                          onItemsPerPageChange={handleItemsPerPageChange}
                          itemsPerPageOptions={[5, 10, 20, 50, 100]}
                          disabled={studentsLoading}
                        />
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Courses Tab */}
            <TabsContent value="courses" className="space-y-4">
              <Card>
                <CardHeader className="p-4 sm:p-6">
                  <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                    <BookOpen className="h-4 w-4 sm:h-5 sm:w-5" />
                    Course Performance Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 sm:p-6 pt-0">
                  {reportsData.coursePerformance.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                      {reportsData.coursePerformance.map((course, index) => (
                        <Card key={index} className="p-4 sm:p-6 overflow-hidden">
                          <div className="space-y-4">
                            <div>
                              <h3 className="font-semibold text-lg break-words line-clamp-2">{course.courseTitle}</h3>
                              <p className="text-sm text-muted-foreground break-words line-clamp-3">
                                {course.courseDescription || 'No description provided.'}
                              </p>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4">
                              <div className="text-center p-3 bg-[#1582B4]/10 rounded-lg">
                                <p className="text-2xl font-bold text-[#1582B4]">{course.completionRate}%</p>
                                <p className="text-xs text-[#1582B4]">Completion</p>
                              </div>
                              <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800/30">
                                <p className="text-2xl font-bold text-green-600 dark:text-green-400">{course.averageScore}%</p>
                                <p className="text-xs text-green-600 dark:text-green-400">Avg Score</p>
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
                <CardHeader className="p-4 sm:p-6">
                  <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                    <FileText className="h-4 w-4 sm:h-5 sm:w-5" />
                    Assignment Performance
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 sm:p-6 pt-0">
                  {reportsData.assignmentPerformance.length > 0 ? (
                    <div className="space-y-3 sm:space-y-4">
                      {reportsData.assignmentPerformance.map((assignment, index) => (
                        <div key={index} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 sm:p-4 border rounded-lg gap-3 sm:gap-0">
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-sm sm:text-base truncate">{assignment.assignmentTitle}</h4>
                            <p className="text-xs sm:text-sm text-muted-foreground">
                              Due: {formatDate(assignment.dueDate)}
                            </p>
                          </div>
                          <div className="flex items-center gap-3 sm:gap-6 w-full sm:w-auto justify-between sm:justify-start">
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