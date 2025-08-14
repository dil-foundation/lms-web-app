import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Pagination, 
  PaginationContent, 
  PaginationItem, 
  PaginationLink, 
  PaginationNext, 
  PaginationPrevious, 
  PaginationEllipsis 
} from '@/components/ui/pagination';
import { 
  Users, 
  Search, 
  Filter, 
  Download, 
  Eye, 
  TrendingUp, 
  TrendingDown, 
  Calendar, 
  Clock,
  Star,
  Target,
  CheckCircle,
  AlertTriangle,
  BarChart3,
  FileText,
  User,
  GraduationCap,
  BookOpen,
  MessageCircle,
  Award,
  Activity,
  RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { useUserProfile } from '@/hooks/useUserProfile';
import { 
  teacherDashboardService, 
  TeacherProgressOverviewData, 
  StudentProgressData 
} from '@/services/teacherDashboardService';

interface StudentProgress {
  id: string;
  name: string;
  email: string;
  stage: string;
  completionPercentage: number;
  averageScore: number;
  lastActive: string;
  enrolledDate: string;
  totalLessons: number;
  completedLessons: number;
  aiTutorFeedback: {
    summary: string;
    sentiment: 'positive' | 'neutral' | 'negative';
    lastFeedback: string;
  };
  performance: {
    trend: 'up' | 'down' | 'stable';
    strugglingAreas: string[];
    strongAreas: string[];
  };
  flags: {
    excessive_retries?: number;
    stuck_days?: number;
    inactive_days?: number;
  };
}

interface LessonPerformance {
  lessonId: string;
  lessonName: string;
  stage: string;
  completedAt: string;
  score: number;
  attempts: number;
  timeSpent: number;
  aiScore: number;
  feedback: string;
  status: 'completed' | 'in_progress' | 'not_started';
}

interface StudentDetailData {
  student: StudentProgress;
  lessonHistory: LessonPerformance[];
  scoreHistory: { date: string; score: number; lesson: string }[];
  feedbackTrail: { date: string; feedback: string; lesson: string }[];
  insights: {
    strengths: string[];
    improvements: string[];
    recommendations: string[];
  };
}

export const AITeacherProgress = () => {
  const { user } = useAuth();
  const { profile } = useUserProfile();
  const [students, setStudents] = useState<StudentProgressData[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<StudentProgressData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [stageFilter, setStageFilter] = useState('all');

  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  const [selectedStudent, setSelectedStudent] = useState<StudentProgressData | null>(null);
  const [studentDetailData, setStudentDetailData] = useState<StudentDetailData | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [progressOverviewData, setProgressOverviewData] = useState<TeacherProgressOverviewData | null>(null);
  const [timeRange, setTimeRange] = useState('all_time');
  const [refreshing, setRefreshing] = useState(false);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Fetch progress overview data
  const fetchProgressData = async (
    showRefreshIndicator = false, 
    customTimeRange = 'all_time',
    customSearchQuery?: string,
    customStageFilter?: string
  ) => {
    try {
      if (showRefreshIndicator) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      console.log('🔄 Fetching teacher progress data with filters:', {
        timeRange: customTimeRange,
        searchQuery: customSearchQuery,
        stageFilter: customStageFilter
      });
      
      const data = await teacherDashboardService.getProgressOverviewData(
        customTimeRange,
        customSearchQuery,
        customStageFilter
      );
      setProgressOverviewData(data);
      setStudents(data.students);
      setFilteredStudents(data.students);
      
      console.log('✅ Successfully loaded teacher progress data');
      
    } catch (error: any) {
      console.error('❌ Error fetching teacher progress data:', error);
      setError(error.message || 'Failed to load progress data');
      toast.error('Failed to load progress data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Handle time range change
  const handleTimeRangeChange = async (newTimeRange: string) => {
    setTimeRange(newTimeRange);
    await fetchProgressData(true, newTimeRange, searchTerm, stageFilter);
  };

  // Handle refresh
  const handleRefresh = async () => {
    await fetchProgressData(true, timeRange, searchTerm, stageFilter);
  };

  const stages = ['Stage 1', 'Stage 2', 'Stage 3', 'Stage 4', 'Stage 5', 'Stage 6'];

  // Initial data fetch
  useEffect(() => {
    fetchProgressData();
  }, []);

  // Handle filter changes by calling API
  useEffect(() => {
    // Debounce search to avoid too many API calls
    const timeoutId = setTimeout(() => {
      if (students.length > 0) { // Only call API if we have initial data
        fetchProgressData(true, timeRange, searchTerm, stageFilter);
      }
    }, 500); // 500ms debounce

    return () => clearTimeout(timeoutId);
  }, [searchTerm, stageFilter]);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, stageFilter]);

  // Pagination calculations
  const totalPages = Math.ceil(filteredStudents.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedStudents = filteredStudents.slice(startIndex, endIndex);

  // Handle page change
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    // Scroll to top of table for better UX
    document.querySelector('.student-progress-table')?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleViewStudentDetail = async (student: StudentProgressData) => {
    try {
      setSelectedStudent(student);
      setLoading(true);
      
      console.log('🔄 Fetching detailed data for student:', student.id);
      
      // Call the real API to get student detail data
      const apiData = await teacherDashboardService.getStudentDetail(student.id);
      
      // Transform API data to match our component structure
      const detailData: StudentDetailData = {
        student: {
          ...student,
          // Update student data with API response
          completionPercentage: apiData.progress_overview?.overall_progress_percentage || student.completionPercentage,
          enrolledDate: apiData.basic_info?.first_activity_date || student.enrolledDate,
          lastActive: apiData.basic_info?.last_activity_date || student.lastActive,
          totalLessons: apiData.exercise_progress?.length || student.totalLessons,
          completedLessons: apiData.progress_overview?.total_exercises_completed || student.completedLessons,
          totalTimeMinutes: apiData.progress_overview?.total_time_spent_minutes || 0,
          streakDays: apiData.progress_overview?.streak_days || 0,
          longestStreak: apiData.progress_overview?.longest_streak || 0,
          performanceLevel: apiData.performance_insights?.performance_level || 'Beginner',
          learningPace: apiData.performance_insights?.learning_pace || 'Steady',
          consistency: apiData.performance_insights?.consistency || 'Regular',
          performance: {
            trend: student.performance.trend,
            strugglingAreas: apiData.performance_insights?.improvement_areas || [],
            strongAreas: apiData.performance_insights?.strength_areas || []
          }
        },
        lessonHistory: (apiData.exercise_progress || []).map((exercise: any) => ({
          lessonId: `${exercise.stage_id}-${exercise.exercise_id}`,
          lessonName: exercise.exercise_name,
          stage: `Stage ${exercise.stage_id}`,
          completedAt: exercise.completed_at || '',
          score: Math.round(exercise.average_score * 10) / 10,
          attempts: exercise.attempts,
          timeSpent: exercise.time_spent_minutes,
          aiScore: Math.round(exercise.best_score * 10) / 10,
          feedback: exercise.mature ? 'Exercise mastered!' : 'Keep practicing to improve',
          status: exercise.completed_at ? 'completed' : (exercise.attempts > 0 ? 'in_progress' : 'not_started')
        })),
        scoreHistory: (apiData.topic_progress || [])
          .filter((topic: any) => topic.score !== null && topic.completed)
          .slice(-10) // Show last 10 completed topics
          .map((topic: any) => ({
            date: topic.started_at?.split('T')[0] || '',
            score: topic.score,
            lesson: `Stage ${topic.stage_id} - Exercise ${topic.exercise_id}`
          })),
        feedbackTrail: (apiData.exercise_progress || [])
          .filter((exercise: any) => exercise.attempts > 0)
          .slice(-5) // Show last 5 exercises with attempts
          .map((exercise: any) => ({
            date: exercise.last_attempt_at?.split('T')[0] || '',
            feedback: exercise.mature 
              ? `Excellent work! You've mastered ${exercise.exercise_name} with an average score of ${exercise.average_score}.`
              : `Continue practicing ${exercise.exercise_name}. Current average: ${exercise.average_score}. Best score: ${exercise.best_score}.`,
            lesson: exercise.exercise_name
          })),
        insights: {
          strengths: apiData.performance_insights?.strength_areas || [],
          improvements: apiData.performance_insights?.improvement_areas || [],
          recommendations: apiData.performance_insights?.recommendations || []
        }
      };

      setStudentDetailData(detailData);
      setIsDetailModalOpen(true);
      
      console.log('✅ Successfully loaded student detail data');
      
    } catch (error: any) {
      console.error('❌ Error fetching student detail:', error);
      toast.error('Failed to load student details', {
        description: error.message || 'Unable to fetch detailed student information.'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleExportData = async (format: 'csv' | 'pdf', scope: 'all' | 'individual', studentId?: string) => {
    try {
      const fileName = scope === 'all' 
        ? `ai-student-progress-report-${new Date().toISOString().split('T')[0]}.${format}`
        : `student-${studentId}-progress-${new Date().toISOString().split('T')[0]}.${format}`;
      
      // Show loading toast
      toast.loading(`Preparing ${format.toUpperCase()} export...`, {
        description: 'This may take a few moments.'
      });

      if (format === 'csv' && scope === 'all') {
        // Use the API for CSV export with current filters
        const blob = await teacherDashboardService.exportProgressData(
          timeRange, 
          'csv', 
          searchTerm, 
          stageFilter
        );
        
        // Create download link
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);

        toast.dismiss();
        toast.success(`${fileName} downloaded successfully!`, {
          description: 'Your progress report is ready.'
        });
      } else {
        // For individual student exports or PDF (not implemented yet)
        toast.dismiss();
        toast.info('Export feature coming soon', {
          description: `${format.toUpperCase()} export for ${scope === 'individual' ? 'individual students' : 'all data'} will be available in a future update.`
        });
      }
    } catch (error: any) {
      console.error('Export failed:', error);
      toast.dismiss();
      toast.error('Export failed', {
        description: error.message || 'Unable to export data. Please try again.'
      });
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up': return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'down': return <TrendingDown className="h-4 w-4 text-red-500" />;
      default: return <div className="h-4 w-4 bg-yellow-500 rounded-full" />;
    }
  };

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case 'positive': return 'text-green-600 dark:text-green-400';
      case 'negative': return 'text-red-600 dark:text-red-400';
      default: return 'text-yellow-600 dark:text-yellow-400';
    }
  };

  const getProgressColor = (percentage: number) => {
    if (percentage >= 80) return 'bg-green-500';
    if (percentage >= 60) return 'bg-[#1582B4]';
    if (percentage >= 40) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  if (loading && students.length === 0) {
    return (
      <div className="space-y-8">
        {/* Premium Header Section */}
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-primary/5 rounded-3xl"></div>
          <div className="relative p-8 md:p-10 rounded-3xl">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-gradient-to-br from-primary/10 to-primary/20 rounded-2xl flex items-center justify-center shadow-lg">
                  <BarChart3 className="w-8 h-8 text-primary" />
                </div>
                <div>
                  <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-primary leading-[1.2]">
                    Student Progress
                  </h1>
                  <p className="text-lg text-muted-foreground font-light mt-4 leading-relaxed">
                    AI-powered learning analytics
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse bg-gradient-to-br from-card to-green-500/5 dark:bg-card">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="h-4 bg-muted rounded w-3/4"></div>
                <div className="h-4 w-4 bg-muted rounded"></div>
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-muted rounded w-1/2 mb-2"></div>
                <div className="h-3 bg-muted rounded w-full"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // Show error state
  if (error && !progressOverviewData) {
    return (
      <div className="space-y-6">
        <Alert className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/30">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Failed to load student progress data: {error}
            <Button 
              size="sm" 
              variant="outline" 
              className="ml-2" 
              onClick={() => fetchProgressData()}
            >
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Premium Header Section */}
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-primary/3 to-[#1582B4]/5 rounded-3xl"></div>
        <div className="relative p-8 md:p-10 rounded-3xl">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-gradient-to-br from-primary/10 to-primary/20 rounded-2xl flex items-center justify-center shadow-lg">
                <BarChart3 className="w-8 h-8 text-primary" />
              </div>
              <div>
                <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-primary leading-[1.2]">
                  Student Progress
                </h1>
                <p className="text-lg text-muted-foreground font-light mt-4 leading-relaxed">
                  Welcome {profile?.first_name || 'Teacher'} - AI-powered learning analytics for {students.length} students
                </p>
              </div>
            </div>
            
            {/* Action Controls */}
            <div className="flex items-center gap-3">
              <Button
                size="sm"
                variant="outline"
                onClick={handleRefresh}
                disabled={refreshing}
                className="gap-2 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md hover:shadow-primary/10 hover:bg-primary/5 hover:border-primary/30 hover:text-primary"
              >
                <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Select value={timeRange} onValueChange={handleTimeRangeChange}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all_time">All Time</SelectItem>
                  <SelectItem value="this_week">This Week</SelectItem>
                  <SelectItem value="this_month">This Month</SelectItem>
                  <SelectItem value="this_year">This Year</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setViewMode(viewMode === 'table' ? 'cards' : 'table')}
                className="h-9 px-4 rounded-xl bg-background border border-input shadow-sm hover:shadow-lg hover:shadow-primary/10 transition-all duration-300 hover:-translate-y-0.5 hover:bg-accent/5 hover:text-foreground dark:hover:bg-gray-800"
              >
                {viewMode === 'table' ? 'Card View' : 'Table View'}
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                className="h-9 px-4 rounded-xl gap-2 bg-background border border-input shadow-sm hover:shadow-lg hover:shadow-primary/10 transition-all duration-300 hover:-translate-y-0.5 hover:bg-accent/5 hover:text-foreground dark:hover:bg-gray-800"
                onClick={() => handleExportData('csv', 'all')}
              >
                <Download className="h-4 w-4" />
                Export CSV
              </Button>

            </div>
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-gradient-to-br from-card to-green-500/5 dark:bg-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Students</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{progressOverviewData?.totalStudents || 0}</div>
            <p className="text-xs text-muted-foreground">
              Enrolled in AI courses
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-card to-green-500/5 dark:bg-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Average Completion</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{progressOverviewData?.averageCompletion || 0}%</div>
            <p className="text-xs text-muted-foreground">
              Across all students
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-card to-green-500/5 dark:bg-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Average Score</CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{progressOverviewData?.averageScore || 0}</div>
            <p className="text-xs text-muted-foreground">
              AI assessment score
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-card to-green-500/5 dark:bg-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Students at Risk</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{progressOverviewData?.studentsAtRisk || 0}</div>
            <p className="text-xs text-muted-foreground">
              Need attention
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="bg-gradient-to-br from-card to-green-500/5 dark:bg-card border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg font-semibold">
            <Filter className="h-5 w-5 text-primary" />
            Filters & Search
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-3">
              <label className="text-sm font-medium text-muted-foreground">Search Students</label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 h-11 rounded-xl border-2 focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </div>
            
            <div className="space-y-3">
              <label className="text-sm font-medium text-muted-foreground">Stage Filter</label>
              <Select value={stageFilter} onValueChange={setStageFilter}>
                <SelectTrigger className="h-11 rounded-xl border-2 focus:border-primary/50 focus:ring-2 focus:ring-primary/20">
                  <SelectValue placeholder="All Stages" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Stages</SelectItem>
                  {stages.map(stage => (
                    <SelectItem key={stage} value={stage}>{stage}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-end">
              <Button 
                variant="outline" 
                className="w-full transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md hover:shadow-primary/10 hover:bg-primary/5 hover:border-primary/30 hover:text-primary"
                onClick={async () => {
                  setSearchTerm('');
                  setStageFilter('all');
                  // Immediately fetch data with cleared filters
                  await fetchProgressData(true, timeRange, '', 'all');
                }}
              >
                Clear Filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Student Data */}
      {viewMode === 'table' ? (
        <Card className="student-progress-table">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <CardTitle className="flex items-center gap-2">
              Student Progress Overview
              {refreshing && (
                <RefreshCw className="h-4 w-4 animate-spin text-primary" />
              )}
            </CardTitle>
            <div className="text-sm text-muted-foreground">
              {refreshing ? (
                "Loading..."
              ) : (
                `Showing ${startIndex + 1}-${Math.min(endIndex, filteredStudents.length)} of ${filteredStudents.length} students`
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead>Stage</TableHead>
                    <TableHead>Avg Score</TableHead>
                    <TableHead>AI Feedback</TableHead>
                    <TableHead>Last Active</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {refreshing ? (
                    // Loading skeleton rows
                    [...Array(itemsPerPage)].map((_, index) => (
                      <TableRow key={`skeleton-${index}`} className="animate-pulse">
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 bg-muted rounded-full"></div>
                            <div>
                              <div className="h-4 bg-muted rounded w-24 mb-1"></div>
                              <div className="h-3 bg-muted rounded w-32"></div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="h-6 bg-muted rounded w-16"></div>
                        </TableCell>
                        <TableCell>
                          <div className="h-6 bg-muted rounded w-12"></div>
                        </TableCell>
                        <TableCell>
                          <div className="h-4 bg-muted rounded w-40"></div>
                        </TableCell>
                        <TableCell>
                          <div className="h-4 bg-muted rounded w-20"></div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="h-8 bg-muted rounded w-10 ml-auto"></div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    paginatedStudents.map((student) => (
                      <TableRow key={student.id} className="hover:bg-muted/50">
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-10 w-10">
                              <AvatarFallback>
                                {student.name.split(' ').map(n => n[0]).join('')}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="font-medium">{student.name}</div>
                              <div className="text-sm text-muted-foreground">{student.email}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{student.stage}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="text-lg font-semibold">{student.averageScore}</div>
                            <Star className="h-4 w-4 text-yellow-500" />
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className={`text-sm ${getSentimentColor(student.aiTutorFeedback.sentiment)}`}>
                            {student.aiTutorFeedback.summary.substring(0, 50)}...
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {new Date(student.lastActive).toLocaleDateString()}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center gap-2 justify-end">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleViewStudentDetail(student)}
                              className="transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md hover:shadow-primary/10 hover:bg-primary/5 hover:border-primary/30 hover:text-primary"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
            
            {/* Pagination for Table View */}
            {totalPages > 1 && (
              <div className="flex justify-center pt-4 border-t">
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious 
                        onClick={() => currentPage > 1 && handlePageChange(currentPage - 1)}
                        className={currentPage <= 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                      />
                    </PaginationItem>
                    
                    {/* Page Numbers */}
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                      // Show first page, last page, current page, and pages around current
                      const showPage = page === 1 || 
                                      page === totalPages || 
                                      Math.abs(page - currentPage) <= 1;
                      
                      if (!showPage) {
                        // Show ellipsis for gaps
                        if (page === 2 && currentPage > 4) {
                          return (
                            <PaginationItem key={`ellipsis-${page}`}>
                              <PaginationEllipsis />
                            </PaginationItem>
                          );
                        }
                        if (page === totalPages - 1 && currentPage < totalPages - 3) {
                          return (
                            <PaginationItem key={`ellipsis-${page}`}>
                              <PaginationEllipsis />
                            </PaginationItem>
                          );
                        }
                        return null;
                      }
                      
                      return (
                        <PaginationItem key={page}>
                          <PaginationLink
                            onClick={() => handlePageChange(page)}
                            isActive={currentPage === page}
                            className="cursor-pointer"
                          >
                            {page}
                          </PaginationLink>
                        </PaginationItem>
                      );
                    })}
                    
                    <PaginationItem>
                      <PaginationNext 
                        onClick={() => currentPage < totalPages && handlePageChange(currentPage + 1)}
                        className={currentPage >= totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Cards View Header */}
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              Student Progress Overview
              {refreshing && (
                <RefreshCw className="h-4 w-4 animate-spin text-primary" />
              )}
            </h3>
            <div className="text-sm text-muted-foreground">
              {refreshing ? (
                "Loading..."
              ) : (
                `Showing ${startIndex + 1}-${Math.min(endIndex, filteredStudents.length)} of ${filteredStudents.length} students`
              )}
            </div>
          </div>
          
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {refreshing ? (
              // Loading skeleton cards
              [...Array(itemsPerPage)].map((_, index) => (
                <Card key={`skeleton-card-${index}`} className="animate-pulse">
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 bg-muted rounded-full"></div>
                      <div className="flex-1">
                        <div className="h-4 bg-muted rounded w-24 mb-2"></div>
                        <div className="h-3 bg-muted rounded w-32"></div>
                      </div>
                      <div className="h-6 bg-muted rounded w-16"></div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="h-4 bg-muted rounded w-20"></div>
                    <div className="space-y-2">
                      <div className="h-3 bg-muted rounded w-16"></div>
                      <div className="h-4 bg-muted rounded w-full"></div>
                    </div>
                    <div className="flex items-center justify-between pt-2">
                      <div className="h-3 bg-muted rounded w-24"></div>
                      <div className="h-8 bg-muted rounded w-10"></div>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              paginatedStudents.map((student) => (
            <Card key={student.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <Avatar className="h-12 w-12">
                    <AvatarFallback>
                      {student.name.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="font-semibold">{student.name}</div>
                    <div className="text-sm text-muted-foreground">{student.email}</div>
                  </div>
                  <Badge variant="outline">{student.stage}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-2">
                  <Star className="h-4 w-4 text-yellow-500" />
                  <span className="font-semibold">{student.averageScore}</span>
                  <span className="text-sm text-muted-foreground">avg score</span>
                </div>
                
                <div className="text-sm">
                  <div className={`font-medium ${getSentimentColor(student.aiTutorFeedback.sentiment)}`}>
                    AI Feedback:
                  </div>
                  <div className="text-muted-foreground">
                    {student.aiTutorFeedback.summary.substring(0, 80)}...
                  </div>
                </div>
                
                {Object.keys(student.flags).length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {student.flags.excessive_retries && (
                      <Badge variant="destructive" className="text-xs">
                        High Retries
                      </Badge>
                    )}
                    {student.flags.stuck_days && (
                      <Badge variant="destructive" className="text-xs">
                        Stuck {student.flags.stuck_days}d
                      </Badge>
                    )}
                    {student.flags.inactive_days && (
                      <Badge variant="secondary" className="text-xs">
                        Inactive {student.flags.inactive_days}d
                      </Badge>
                    )}
                  </div>
                )}
                
                <div className="flex items-center justify-between pt-2">
                  <div className="text-xs text-muted-foreground">
                    Last active: {new Date(student.lastActive).toLocaleDateString()}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleViewStudentDetail(student)}
                      className="transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md hover:shadow-primary/10 hover:bg-primary/5 hover:border-primary/30 hover:text-primary"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
              ))
            )}
          </div>
          
          {/* Pagination for Cards View */}
          {totalPages > 1 && (
            <div className="flex justify-center pt-6">
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious 
                      onClick={() => currentPage > 1 && handlePageChange(currentPage - 1)}
                      className={currentPage <= 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                    />
                  </PaginationItem>
                  
                  {/* Page Numbers */}
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                    // Show first page, last page, current page, and pages around current
                    const showPage = page === 1 || 
                                    page === totalPages || 
                                    Math.abs(page - currentPage) <= 1;
                    
                    if (!showPage) {
                      // Show ellipsis for gaps
                      if (page === 2 && currentPage > 4) {
                        return (
                          <PaginationItem key={`ellipsis-${page}`}>
                            <PaginationEllipsis />
                          </PaginationItem>
                        );
                      }
                      if (page === totalPages - 1 && currentPage < totalPages - 3) {
                        return (
                          <PaginationItem key={`ellipsis-${page}`}>
                            <PaginationEllipsis />
                          </PaginationItem>
                        );
                      }
                      return null;
                    }
                    
                    return (
                      <PaginationItem key={page}>
                        <PaginationLink
                          onClick={() => handlePageChange(page)}
                          isActive={currentPage === page}
                          className="cursor-pointer"
                        >
                          {page}
                        </PaginationLink>
                      </PaginationItem>
                    );
                  })}
                  
                  <PaginationItem>
                    <PaginationNext 
                      onClick={() => currentPage < totalPages && handlePageChange(currentPage + 1)}
                      className={currentPage >= totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </div>
      )}

      {/* Student Detail Modal */}
      <Dialog open={isDetailModalOpen} onOpenChange={setIsDetailModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <Avatar className="h-10 w-10">
                <AvatarFallback>
                  {selectedStudent?.name.split(' ').map(n => n[0]).join('')}
                </AvatarFallback>
              </Avatar>
              <div>
                <div>{selectedStudent?.name}</div>
                <div className="text-sm text-muted-foreground font-normal">
                  {selectedStudent?.email}
                </div>
              </div>
            </DialogTitle>
            <DialogDescription>
              Detailed progress analysis and performance timeline
            </DialogDescription>
          </DialogHeader>
          
          {studentDetailData && (
            <div className="overflow-y-auto max-h-[calc(90vh-180px)]">
              <Tabs defaultValue="overview" className="space-y-4">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="lessons">Lessons</TabsTrigger>
                  <TabsTrigger value="performance">Performance</TabsTrigger>
                  <TabsTrigger value="insights">Insights</TabsTrigger>
                </TabsList>
                
                                 <TabsContent value="overview" className="space-y-4">
                   <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                     <Card>
                       <CardHeader>
                         <CardTitle className="text-lg">Current Progress</CardTitle>
                       </CardHeader>
                       <CardContent className="space-y-4">
                         <div>
                           <div className="flex items-center justify-between mb-2">
                             <span>Overall Completion</span>
                             <span className="font-semibold">{selectedStudent?.completionPercentage}%</span>
                           </div>
                           <Progress value={selectedStudent?.completionPercentage} className="h-3 bg-muted" />
                         </div>
                         <div className="flex items-center justify-between">
                           <span>Current Stage</span>
                           <Badge variant="outline">{selectedStudent?.stage}</Badge>
                         </div>
                         <div className="flex items-center justify-between">
                           <span>Average Score</span>
                           <div className="flex items-center gap-1">
                             <Star className="h-4 w-4 text-yellow-500" />
                             <span className="font-semibold">{selectedStudent?.averageScore}</span>
                           </div>
                         </div>
                         <div className="flex items-center justify-between">
                           <span>Exercises Completed</span>
                           <span className="font-semibold">{selectedStudent?.completedLessons}</span>
                         </div>
                       </CardContent>
                     </Card>
                     
                     <Card>
                       <CardHeader>
                         <CardTitle className="text-lg">Learning Activity</CardTitle>
                       </CardHeader>
                       <CardContent className="space-y-3">
                         <div className="flex items-center justify-between">
                           <span>Last Active</span>
                           <span>{new Date(selectedStudent?.lastActive || '').toLocaleDateString()}</span>
                         </div>
                         <div className="flex items-center justify-between">
                           <span>Started Learning</span>
                           <span>{new Date(selectedStudent?.enrolledDate || '').toLocaleDateString()}</span>
                         </div>
                         <div className="flex items-center justify-between">
                           <span>Total Time</span>
                           <span className="font-semibold">
                             {studentDetailData?.student ? 
                               `${Math.floor((studentDetailData.student as any).totalTimeMinutes / 60)}h ${(studentDetailData.student as any).totalTimeMinutes % 60}m` 
                               : '0h 0m'
                             }
                           </span>
                         </div>
                         <div className="flex items-center justify-between">
                           <span>Learning Streak</span>
                           <span className="font-semibold">
                             {(studentDetailData?.student as any)?.streakDays || 0} days
                           </span>
                         </div>
                       </CardContent>
                     </Card>

                     <Card>
                       <CardHeader>
                         <CardTitle className="text-lg">Performance Level</CardTitle>
                       </CardHeader>
                       <CardContent className="space-y-3">
                         <div className="flex items-center justify-between">
                           <span>Current Level</span>
                           <Badge variant="secondary">
                             {(studentDetailData?.student as any)?.performanceLevel || 'Beginner'}
                           </Badge>
                         </div>
                         <div className="flex items-center justify-between">
                           <span>Learning Pace</span>
                           <span className="text-sm">
                             {(studentDetailData?.student as any)?.learningPace || 'Steady'}
                           </span>
                         </div>
                         <div className="flex items-center justify-between">
                           <span>Consistency</span>
                           <span className="text-sm">
                             {(studentDetailData?.student as any)?.consistency || 'Regular'}
                           </span>
                         </div>
                         <div className="flex items-center justify-between">
                           <span>Performance Trend</span>
                           <div className="flex items-center gap-1">
                             {getTrendIcon(selectedStudent?.performance.trend || 'stable')}
                             <span className="capitalize">{selectedStudent?.performance.trend}</span>
                           </div>
                         </div>
                       </CardContent>
                     </Card>
                   </div>
                  
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Latest AI Tutor Feedback</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className={`text-sm ${getSentimentColor(selectedStudent?.aiTutorFeedback.sentiment || 'neutral')}`}>
                        <div className="font-medium mb-2">Overall Assessment:</div>
                        <div className="mb-3">{selectedStudent?.aiTutorFeedback.summary}</div>
                        <div className="font-medium mb-2">Latest Feedback:</div>
                        <div className="italic">"{selectedStudent?.aiTutorFeedback.lastFeedback}"</div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
                
                <TabsContent value="lessons" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Stage Progression & Lessons</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {(() => {
                        // Group lessons by stage
                        const lessonsByStage = studentDetailData.lessonHistory.reduce((acc, lesson) => {
                          if (!acc[lesson.stage]) {
                            acc[lesson.stage] = [];
                          }
                          acc[lesson.stage].push(lesson);
                          return acc;
                        }, {} as Record<string, typeof studentDetailData.lessonHistory>);

                        const stageOrder = ['Stage 1', 'Stage 2', 'Stage 3', 'Stage 4', 'Stage 5', 'Stage 6'];
                        const sortedStages = stageOrder.filter(stage => lessonsByStage[stage]);

                        return (
                          <Accordion type="single" collapsible className="w-full">
                            {sortedStages.map((stage) => {
                              const stageLessons = lessonsByStage[stage];
                              const completedLessons = stageLessons.filter(l => l.status === 'completed').length;
                              const totalLessons = stageLessons.length;
                              const stageProgress = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;
                              const averageScore = stageLessons.filter(l => l.status === 'completed').length > 0 
                                ? Math.round(stageLessons.filter(l => l.status === 'completed').reduce((sum, l) => sum + l.score, 0) / stageLessons.filter(l => l.status === 'completed').length)
                                : 0;

                              return (
                                <AccordionItem key={stage} value={stage}>
                                  <AccordionTrigger className="hover:no-underline">
                                    <div className="flex items-center justify-between w-full pr-4">
                                      <div className="flex items-center gap-3">
                                        <Badge variant="outline" className="text-sm">{stage}</Badge>
                                        <div className="text-left">
                                          <div className="font-medium">{stage} - English Learning</div>
                                          <div className="text-sm text-muted-foreground">
                                            {completedLessons}/{totalLessons} lessons completed
                                          </div>
                                        </div>
                                      </div>
                                      <div className="flex items-center gap-4">
                                        <div className="text-right">
                                          <div className="text-sm font-medium">{stageProgress}% Complete</div>
                                          {averageScore > 0 && (
                                            <div className="text-sm text-muted-foreground">Avg: {averageScore}</div>
                                          )}
                                        </div>
                                                                                 <div className="w-24">
                                           <Progress value={stageProgress} className="h-2 bg-muted" />
                                         </div>
                                      </div>
                                    </div>
                                  </AccordionTrigger>
                                  <AccordionContent>
                                    <div className="space-y-3 pt-2">
                                      {stageLessons.map((lesson, lessonIndex) => (
                                        <div key={lessonIndex} className="flex items-center justify-between p-4 rounded-lg border bg-muted/20 hover:bg-muted/40 transition-colors">
                                          <div className="flex items-center gap-4">
                                            <div className="flex-shrink-0">
                                              {lesson.status === 'completed' && (
                                                <CheckCircle className="h-5 w-5 text-green-500" />
                                              )}
                                              {lesson.status === 'in_progress' && (
                                                <Clock className="h-5 w-5 text-[#1582B4]" />
                                              )}
                                              {lesson.status === 'not_started' && (
                                                <div className="h-5 w-5 rounded-full border-2 border-muted-foreground" />
                                              )}
                                            </div>
                                            <div>
                                              <div className="font-medium">{lesson.lessonName}</div>
                                              <div className="text-sm text-muted-foreground mt-1">
                                                {lesson.feedback}
                                              </div>
                                            </div>
                                          </div>
                                          <div className="flex items-center gap-4 text-sm">
                                            {lesson.status === 'completed' && (
                                              <>
                                                <div className="text-center">
                                                  <div className="flex items-center gap-1">
                                                    <Star className="h-4 w-4 text-yellow-500" />
                                                    <span className="font-semibold">{lesson.score}</span>
                                                  </div>
                                                  <div className="text-muted-foreground">Score</div>
                                                </div>
                                                <div className="text-center">
                                                  <div className="font-semibold">{lesson.attempts}</div>
                                                  <div className="text-muted-foreground">Attempts</div>
                                                </div>
                                                <div className="text-center">
                                                  <div className="font-semibold">{lesson.timeSpent}min</div>
                                                  <div className="text-muted-foreground">Time</div>
                                                </div>
                                                <div className="text-center">
                                                  <div className="font-semibold">
                                                    {new Date(lesson.completedAt).toLocaleDateString()}
                                                  </div>
                                                  <div className="text-muted-foreground">Completed</div>
                                                </div>
                                              </>
                                            )}
                                            {lesson.status === 'in_progress' && (
                                              <Badge variant="secondary" className="text-xs">
                                                In Progress
                                              </Badge>
                                            )}
                                            {lesson.status === 'not_started' && (
                                              <Badge variant="outline" className="text-xs">
                                                Not Started
                                              </Badge>
                                            )}
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </AccordionContent>
                                </AccordionItem>
                              );
                            })}
                          </Accordion>
                        );
                      })()}
                    </CardContent>
                  </Card>
                </TabsContent>
                
                <TabsContent value="performance" className="space-y-4">
                  <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Score History</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {studentDetailData.scoreHistory.map((entry, index) => (
                            <div key={index} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                              <div>
                                <div className="font-medium text-sm">{entry.lesson}</div>
                                <div className="text-xs text-muted-foreground">{new Date(entry.date).toLocaleDateString()}</div>
                              </div>
                              <div className="flex items-center gap-1">
                                <span className="font-semibold">{entry.score}</span>
                                <Star className="h-4 w-4 text-yellow-500" />
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Feedback Trail</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {studentDetailData.feedbackTrail.map((entry, index) => (
                            <div key={index} className="p-3 bg-muted/50 rounded-lg">
                              <div className="text-sm font-medium mb-1">{entry.lesson}</div>
                              <div className="text-xs text-muted-foreground mb-2">{new Date(entry.date).toLocaleDateString()}</div>
                              <div className="text-sm italic">"{entry.feedback}"</div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>
                
                <TabsContent value="insights" className="space-y-4">
                  <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg text-green-600">Strengths</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ul className="space-y-2">
                          {studentDetailData.insights.strengths.map((strength, index) => (
                            <li key={index} className="flex items-center gap-2 text-sm">
                              <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                              {strength}
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg text-orange-600">Areas for Improvement</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ul className="space-y-2">
                          {studentDetailData.insights.improvements.map((improvement, index) => (
                            <li key={index} className="flex items-center gap-2 text-sm">
                              <AlertTriangle className="h-4 w-4 text-orange-500 flex-shrink-0" />
                              {improvement}
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg text-[#1582B4]">Recommendations</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ul className="space-y-2">
                          {studentDetailData.insights.recommendations.map((recommendation, index) => (
                            <li key={index} className="flex items-center gap-2 text-sm">
                              <Target className="h-4 w-4 text-[#1582B4] flex-shrink-0" />
                              {recommendation}
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          )}
          
                     <div className="flex justify-between items-center pt-4 border-t">
             <div className="text-sm text-muted-foreground">
               Last updated: {new Date().toLocaleDateString()}
             </div>
             <div className="flex gap-2">
               <Button onClick={() => setIsDetailModalOpen(false)}>
                 Close
               </Button>
             </div>
           </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};