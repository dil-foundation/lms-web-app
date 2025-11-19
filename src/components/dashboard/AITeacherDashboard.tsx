import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ContentLoader } from '@/components/ContentLoader';
import { useState } from 'react';
import { toast } from 'sonner';
import { 
  MessageCircle,
  TrendingUp,
  Users,
  Clock,
  Star,
  Activity,
  AlertTriangle,
  Timer,
  Repeat,
  UserX,
  Eye,
  GraduationCap,
  X,
  RefreshCw
} from 'lucide-react';
import { 
  TeacherEngagementData, 
  TopLesson, 
  BehaviorFlag 
} from '@/services/teacherDashboardService';
import { useTeacherDashboard } from '@/hooks/useTeacherDashboard';

interface AITeacherDashboardProps {
  userProfile: {
    id: string;
    first_name?: string;
    last_name?: string;
    teacher_id?: string;
  };
}

export const AITeacherDashboard = ({ userProfile }: AITeacherDashboardProps) => {
  const [selectedFlag, setSelectedFlag] = useState<BehaviorFlag | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Use the custom hook for dashboard data management
  const {
    data: overviewData,
    loading,
    error,
    refreshing,
    timeRange,
    handleTimeRangeChange,
    handleRefresh
  } = useTeacherDashboard({
    initialTimeRange: 'all-time',
    enableAutoRefresh: false // Disable auto-refresh for now
  });

  // Show loading state
  if (loading) {
    return <ContentLoader />;
  }

  // Show error state
  if (error && !overviewData) {
    return (
      <div className="space-y-6">
        <Alert className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/30">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Failed to load teacher dashboard data: {error}
            <Button 
              size="sm" 
              variant="outline" 
              className="ml-2" 
              onClick={handleRefresh}
            >
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const engagementData = overviewData?.engagementSummary || {
    totalStudentsEngaged: 0,
    totalTimeSpent: 0,
    avgResponsesPerStudent: 0,
    activeStudentsToday: 0,
    engagementRate: 0,
    engagementTrend: 0
  };

  const topLessons = overviewData?.topUsedLessons || [];
  const behaviorFlags = overviewData?.behaviorFlags || [];

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-primary/5 rounded-3xl"></div>
        <div className="relative p-4 sm:p-6 md:p-8 rounded-3xl">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-primary/10 to-primary/20 rounded-2xl flex items-center justify-center flex-shrink-0">
                <GraduationCap className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight bg-gradient-to-r from-primary via-primary to-primary/80 bg-clip-text text-transparent leading-tight break-words">
                  AI Teacher Dashboard
                </h1>
                <p className="text-sm sm:text-base md:text-lg text-muted-foreground font-light break-words">
                  Welcome back, {userProfile.first_name}
                </p>
              </div>
            </div>
            
            {/* Filter Controls */}
            <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto flex-shrink-0">
              <Button
                size="sm"
                variant="outline"
                onClick={handleRefresh}
                disabled={refreshing}
                className="h-8 px-2 sm:px-3 flex-shrink-0"
              >
                <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              </Button>
              <Select value={timeRange} onValueChange={handleTimeRangeChange}>
                <SelectTrigger className="w-full sm:w-32 h-8 text-xs sm:text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all-time">All Time</SelectItem>
                  <SelectItem value="this-week">This Week</SelectItem>
                  <SelectItem value="this-month">This Month</SelectItem>
                  <SelectItem value="this-year">This Year</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </div>



      {/* Learn Feature Engagement Summary */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Learn Feature Engagement Summary</h2>
        </div>
        
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="bg-gradient-to-br from-card to-green-500/5 dark:bg-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Students Engaged</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{engagementData.totalStudentsEngaged}</div>
              <p className="text-xs text-muted-foreground">
                <span className="text-green-600 font-medium">{engagementData.activeStudentsToday}</span> active today
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-card to-green-500/5 dark:bg-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Time Spent</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{engagementData.totalTimeSpent}h</div>
              <p className="text-xs text-muted-foreground">
                This month
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-card to-green-500/5 dark:bg-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg. Responses per Student</CardTitle>
              <MessageCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{engagementData.avgResponsesPerStudent}</div>
              <p className="text-xs text-muted-foreground">
                Per student this week
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-card to-green-500/5 dark:bg-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Engagement Rate</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{engagementData.engagementRate}%</div>
              <p className="text-xs text-muted-foreground">
                <span className={engagementData.engagementTrend >= 0 ? "text-green-600" : "text-red-600"}>
                  {engagementData.engagementTrend >= 0 ? '+' : ''}{engagementData.engagementTrend}%
                </span> from last week
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Top Used Practice Lessons */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star className="h-5 w-5" />
            Top Used Practice Lessons
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Lesson Name</TableHead>
                  <TableHead>Stage</TableHead>
                  <TableHead className="text-right">Access Count</TableHead>
                  <TableHead className="w-[100px]">Trend</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topLessons.length > 0 ? topLessons.map((lesson) => (
                  <TableRow key={lesson.id} className="hover:bg-muted/50">
                    <TableCell className="font-medium">{lesson.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {lesson.stage}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono">{lesson.accessCount}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {lesson.trend === 'up' && <TrendingUp className="h-4 w-4 text-green-500" />}
                        {lesson.trend === 'down' && <TrendingUp className="h-4 w-4 text-red-500 rotate-180" />}
                        {lesson.trend === 'stable' && <div className="h-4 w-4 bg-yellow-500 rounded-full" />}
                        <span className="text-xs text-muted-foreground capitalize">{lesson.trend}</span>
                      </div>
                    </TableCell>
                  </TableRow>
                )) : (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground py-6">
                      No lesson data available
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Behavior Insights / Flags */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Eye className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Behavior Insights & Flags</h2>
        </div>
        
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
          {behaviorFlags.length > 0 ? behaviorFlags.map((flag, index) => (
            <Alert key={index} className={`
              ${flag.severity === 'error' ? 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/30' : ''}
              ${flag.severity === 'warning' ? 'border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950/30' : ''}
              ${flag.severity === 'info' ? 'border-[#1582B4]/20 bg-[#1582B4]/10 dark:border-[#1582B4]/30 dark:bg-[#1582B4]/20' : ''}
            `}>
              <div className="flex items-start gap-3">
                <div className={`p-2 rounded-lg ${
                  flag.severity === 'error' ? 'bg-red-100 text-red-600 dark:bg-red-900 dark:text-red-400' : ''
                } ${
                  flag.severity === 'warning' ? 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900 dark:text-yellow-400' : ''
                } ${
                  flag.severity === 'info' ? 'bg-[#1582B4]/20 text-[#1582B4] dark:bg-[#1582B4]/20 dark:text-[#1582B4]/90' : ''
                }`}>
                  {flag.type === 'excessive_retries' && <Repeat className="h-4 w-4" />}
                  {flag.type === 'stuck_stage' && <AlertTriangle className="h-4 w-4" />}
                  {flag.type === 'no_progress' && <UserX className="h-4 w-4" />}
                </div>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium text-sm">{flag.title}</h3>
                    <Badge variant="outline" className="text-xs">
                      {flag.count} students
                    </Badge>
                  </div>
                  <AlertDescription className="text-xs">
                    {flag.description}
                  </AlertDescription>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="h-7 text-xs mt-2"
                    onClick={() => {
                      setSelectedFlag(flag);
                      setIsModalOpen(true);
                    }}
                  >
                    View Details
                  </Button>
                </div>
              </div>
            </Alert>
          )) : (
            <div className="col-span-full text-center py-8">
              <div className="text-muted-foreground">
                <Eye className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No behavior flags detected</p>
                <p className="text-sm">All students are performing well!</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Student Details Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedFlag?.type === 'excessive_retries' && <Repeat className="h-5 w-5 text-yellow-600" />}
              {selectedFlag?.type === 'stuck_stage' && <AlertTriangle className="h-5 w-5 text-red-600" />}
              {selectedFlag?.type === 'no_progress' && <UserX className="h-5 w-5 text-[#1582B4]" />}
              {selectedFlag?.title}
            </DialogTitle>
            <DialogDescription>
              {selectedFlag?.description}
            </DialogDescription>
          </DialogHeader>
          
          <div className="mt-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-sm">Affected Students ({selectedFlag?.count})</h3>
              <Badge variant="outline">
                {selectedFlag?.severity === 'error' && '🔴 High Priority'}
                {selectedFlag?.severity === 'warning' && '🟡 Medium Priority'}
                {selectedFlag?.severity === 'info' && '🔵 Low Priority'}
              </Badge>
            </div>
            
            <div className="max-h-96 overflow-y-auto border rounded-lg">
              <Table>
                <TableHeader className="sticky top-0 bg-background">
                  <TableRow>
                    <TableHead>Student Name</TableHead>
                    {selectedFlag?.type === 'stuck_stage' && <TableHead>Stage</TableHead>}
                    <TableHead>
                      {selectedFlag?.type === 'excessive_retries' && 'Retries'}
                      {selectedFlag?.type === 'stuck_stage' && 'Days Stuck'}
                      {selectedFlag?.type === 'no_progress' && 'Last Active'}
                    </TableHead>
                    <TableHead>
                      {selectedFlag?.type === 'excessive_retries' && 'Current Lesson'}
                      {selectedFlag?.type === 'stuck_stage' && 'Current Lesson'}
                      {selectedFlag?.type === 'no_progress' && 'Stage'}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selectedFlag?.students && selectedFlag.students.length > 0 ? (
                    selectedFlag.students.map((student: any, index: number) => (
                      <TableRow key={index} className="hover:bg-muted/50">
                        <TableCell className="font-medium">{student.name}</TableCell>
                        {selectedFlag?.type === 'stuck_stage' ? (
                          <TableCell>
                            <Badge variant="outline" className="text-xs">
                              {student.stage}
                            </Badge>
                          </TableCell>
                        ) : null}
                        <TableCell>
                          {selectedFlag?.type === 'excessive_retries' && (
                            <Badge variant="destructive" className="text-xs">
                              {student.retries} retries
                            </Badge>
                          )}
                          {selectedFlag?.type === 'stuck_stage' && (
                            <Badge variant="destructive" className="text-xs">
                              {student.daysStuck} days
                            </Badge>
                          )}
                          {selectedFlag?.type === 'no_progress' && (
                            <span className="text-muted-foreground text-sm">{student.lastActive}</span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {selectedFlag?.type === 'excessive_retries' && student.lesson}
                          {selectedFlag?.type === 'stuck_stage' && student.currentLesson}
                          {selectedFlag?.type === 'no_progress' && (
                            <Badge variant="outline" className="text-xs">
                              {student.stage}
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell 
                        colSpan={selectedFlag?.type === 'stuck_stage' ? 4 : 3} 
                        className="text-center text-muted-foreground py-6"
                      >
                        No detailed student information available
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}; 