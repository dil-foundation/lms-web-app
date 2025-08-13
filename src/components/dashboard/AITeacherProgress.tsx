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
  const [lessonFilter, setLessonFilter] = useState('all');
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  const [selectedStudent, setSelectedStudent] = useState<StudentProgressData | null>(null);
  const [studentDetailData, setStudentDetailData] = useState<StudentDetailData | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [progressOverviewData, setProgressOverviewData] = useState<TeacherProgressOverviewData | null>(null);
  const [timeRange, setTimeRange] = useState('all_time');
  const [refreshing, setRefreshing] = useState(false);

  // Fetch progress overview data
  const fetchProgressData = async (showRefreshIndicator = false, customTimeRange = 'all_time') => {
    try {
      if (showRefreshIndicator) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      console.log('🔄 Fetching teacher progress data with timeRange:', customTimeRange);
      
      const data = await teacherDashboardService.getProgressOverviewData(customTimeRange);
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
    await fetchProgressData(true, newTimeRange);
  };

  // Handle refresh
  const handleRefresh = async () => {
    await fetchProgressData(true, timeRange);
  };

  const stages = ['Stage 1', 'Stage 2', 'Stage 3', 'Stage 4', 'Stage 5', 'Stage 6'];
  const lessons = [
    'Daily Routine Conversations',
    'Quick Response Practice',
    'Critical Thinking Dialogues',
    'Mock Interview Practice',
    'Academic Presentations',
    'Abstract Topic Monologue'
  ];

  // Initial data fetch
  useEffect(() => {
    fetchProgressData();
  }, []);

  useEffect(() => {
    let filtered = students;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(student =>
        student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.email.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Stage filter
    if (stageFilter !== 'all') {
      filtered = filtered.filter(student => student.stage === stageFilter);
    }

    // Lesson filter (in real implementation, this would filter by current/last lesson)
    if (lessonFilter !== 'all') {
      // Mock implementation - would need lesson data
      filtered = filtered;
    }

    setFilteredStudents(filtered);
  }, [students, searchTerm, stageFilter, lessonFilter]);

  const handleViewStudentDetail = async (student: StudentProgress) => {
    setSelectedStudent(student);
    setLoading(true);
    
    // Mock detailed data - Replace with actual API call
    const mockDetailData: StudentDetailData = {
      student,
      lessonHistory: [
        // Stage 1 lessons
        {
          lessonId: '1',
          lessonName: 'Basic Greetings',
          stage: 'Stage 1',
          completedAt: '2024-01-08',
          score: 92,
          attempts: 1,
          timeSpent: 25,
          aiScore: 90,
          feedback: 'Excellent pronunciation! Keep up the good work.',
          status: 'completed'
        },
        {
          lessonId: '2',
          lessonName: 'Daily Routine Conversations',
          stage: 'Stage 1',
          completedAt: '2024-01-10',
          score: 85,
          attempts: 2,
          timeSpent: 45,
          aiScore: 87,
          feedback: 'Good use of vocabulary! Work on pronunciation.',
          status: 'completed'
        },
        {
          lessonId: '3',
          lessonName: 'Numbers and Time',
          stage: 'Stage 1',
          completedAt: '2024-01-11',
          score: 88,
          attempts: 1,
          timeSpent: 30,
          aiScore: 89,
          feedback: 'Great understanding of time expressions.',
          status: 'completed'
        },
        // Stage 2 lessons
        {
          lessonId: '4',
          lessonName: 'Quick Response Practice',
          stage: 'Stage 2',
          completedAt: '2024-01-12',
          score: 78,
          attempts: 3,
          timeSpent: 38,
          aiScore: 80,
          feedback: 'Response time improved. Keep practicing fluency.',
          status: 'completed'
        },
        {
          lessonId: '5',
          lessonName: 'Listen and Reply',
          stage: 'Stage 2',
          completedAt: '2024-01-14',
          score: 82,
          attempts: 2,
          timeSpent: 35,
          aiScore: 83,
          feedback: 'Good listening comprehension skills.',
          status: 'completed'
        },
        {
          lessonId: '6',
          lessonName: 'Vocabulary Building',
          stage: 'Stage 2',
          completedAt: '',
          score: 0,
          attempts: 0,
          timeSpent: 0,
          aiScore: 0,
          feedback: 'Not started yet.',
          status: 'not_started'
        },
        // Stage 3 lessons
        {
          lessonId: '7',
          lessonName: 'Critical Thinking Dialogues',
          stage: 'Stage 3',
          completedAt: '',
          score: 0,
          attempts: 1,
          timeSpent: 15,
          aiScore: 0,
          feedback: 'In progress - shows potential for complex reasoning.',
          status: 'in_progress'
        },
        {
          lessonId: '8',
          lessonName: 'Problem Solving Discussions',
          stage: 'Stage 3',
          completedAt: '',
          score: 0,
          attempts: 0,
          timeSpent: 0,
          aiScore: 0,
          feedback: 'Not started yet.',
          status: 'not_started'
        }
      ],
      scoreHistory: [
        { date: '2024-01-10', score: 85, lesson: 'Daily Routine Conversations' },
        { date: '2024-01-12', score: 78, lesson: 'Quick Response Practice' },
        { date: '2024-01-14', score: 82, lesson: 'Listen and Reply' }
      ],
      feedbackTrail: [
        { date: '2024-01-10', feedback: 'Good use of vocabulary! Work on pronunciation.', lesson: 'Daily Routine Conversations' },
        { date: '2024-01-12', feedback: 'Response time improved. Keep practicing fluency.', lesson: 'Quick Response Practice' },
        { date: '2024-01-14', feedback: 'Great improvement in confidence level!', lesson: 'Listen and Reply' }
      ],
      insights: {
        strengths: ['Vocabulary usage', 'Listening comprehension', 'Consistent practice'],
        improvements: ['Pronunciation clarity', 'Grammar accuracy', 'Speaking confidence'],
        recommendations: ['Practice pronunciation exercises daily', 'Focus on grammar drills', 'Join speaking practice groups']
      }
    };

    setTimeout(() => {
      setStudentDetailData(mockDetailData);
      setLoading(false);
      setIsDetailModalOpen(true);
    }, 500);
  };

  const handleExportData = (format: 'csv' | 'pdf', scope: 'all' | 'individual', studentId?: string) => {
    // Mock export functionality
    const fileName = scope === 'all' 
      ? `ai-student-progress-report.${format}`
      : `student-${studentId}-progress.${format}`;
    
    toast.success(`Exporting ${fileName}...`, {
      description: `${format.toUpperCase()} report will be downloaded shortly.`
    });
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
              <Button 
                variant="outline" 
                size="sm" 
                className="h-9 px-4 rounded-xl gap-2 bg-background border border-input shadow-sm hover:shadow-lg hover:shadow-primary/10 transition-all duration-300 hover:-translate-y-0.5 hover:bg-accent/5 hover:text-foreground dark:hover:bg-gray-800"
                onClick={() => handleExportData('pdf', 'all')}
              >
                <FileText className="h-4 w-4" />
                Export PDF
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
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
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
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Lesson Filter</label>
              <Select value={lessonFilter} onValueChange={setLessonFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Lessons" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Lessons</SelectItem>
                  {lessons.map(lesson => (
                    <SelectItem key={lesson} value={lesson}>{lesson}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-end">
              <Button 
                variant="outline" 
                className="w-full transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md hover:shadow-primary/10 hover:bg-primary/5 hover:border-primary/30 hover:text-primary"
                onClick={() => {
                  setSearchTerm('');
                  setStageFilter('all');
                  setLessonFilter('all');
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
        <Card>
          <CardHeader>
            <CardTitle>Student Progress Overview</CardTitle>
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
                  {filteredStudents.map((student) => (
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
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredStudents.map((student) => (
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
          ))}
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
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
                          <Progress value={selectedStudent?.completionPercentage} className="h-3" />
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
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Recent Activity</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span>Last Active</span>
                          <span>{new Date(selectedStudent?.lastActive || '').toLocaleDateString()}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>Enrolled Since</span>
                          <span>{new Date(selectedStudent?.enrolledDate || '').toLocaleDateString()}</span>
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
                                          <Progress value={stageProgress} className="h-2" />
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
              <Button 
                variant="outline" 
                onClick={() => selectedStudent && handleExportData('pdf', 'individual', selectedStudent.id)}
                className="transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md hover:shadow-primary/10 hover:bg-primary/5 hover:border-primary/30 hover:text-primary"
              >
                <Download className="h-4 w-4 mr-2" />
                Export Report
              </Button>
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