import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  Users, 
  BookOpen, 
  TrendingUp, 
  Activity, 
  GraduationCap, 
  Award, 
  Clock, 
  Target, 
  Search,
  RefreshCw,
  Zap,
  Database,
  Timer,
  AlertTriangle,
  CheckCircle,
  Info
} from 'lucide-react';
import { ContentLoader } from '@/components/ContentLoader';
import { toast } from 'sonner';
import { useOptimizedTeacherDashboard } from '@/hooks/useTeacherDashboardOptimized';

interface TeacherDashboardOptimizedProps {
  userProfile: {
    id: string;
    first_name?: string;
    last_name?: string;
    teacher_id?: string;
  };
}

const TeacherDashboardOptimized: React.FC<TeacherDashboardOptimizedProps> = ({ userProfile }) => {
  // Local state for filters
  const [searchQuery, setSearchQuery] = useState('');
  const [stageFilter, setStageFilter] = useState('all');
  const [showPerformanceMetrics, setShowPerformanceMetrics] = useState(true);

  // Use optimized hook with batch loading enabled
  const {
    batchData,
    overviewData,
    progressData,
    loading,
    error,
    refreshing,
    timeRange,
    performanceMetrics,
    loadTime,
    fetchBatchData,
    fetchProgressData,
    handleTimeRangeChange,
    handleRefresh,
    clearError,
    clearCache,
    getCacheStats
  } = useOptimizedTeacherDashboard({
    initialTimeRange: 'all-time',
    enableAutoRefresh: true,
    autoRefreshInterval: 300000, // 5 minutes
    useBatchLoading: true // Use single batch API call for better performance
  });

  // Performance metrics display
  const PerformanceMetricsCard = () => {
    if (!showPerformanceMetrics || !performanceMetrics) return null;

    const cacheStats = getCacheStats();

    return (
      <Card className="mb-6 border-green-200 bg-green-50">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-green-800">
            <Zap className="h-5 w-5" />
            Performance Optimization Active
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <Timer className="h-4 w-4 text-green-600" />
              <div>
                <div className="font-medium text-green-800">Load Time</div>
                <div className="text-green-600">{loadTime.toFixed(0)}ms</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Database className="h-4 w-4 text-blue-600" />
              <div>
                <div className="font-medium text-blue-800">Queries</div>
                <div className="text-blue-600">{performanceMetrics.queryCount || 1}</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-purple-600" />
              <div>
                <div className="font-medium text-purple-800">Cache Items</div>
                <div className="text-purple-600">{cacheStats.size}</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-orange-600" />
              <div>
                <div className="font-medium text-orange-800">Improvement</div>
                <div className="text-orange-600">{performanceMetrics.improvement || 'N/A'}</div>
              </div>
            </div>
          </div>
          {performanceMetrics.optimization && (
            <div className="mt-3 p-2 bg-green-100 rounded text-xs text-green-700">
              <strong>Optimization:</strong> {performanceMetrics.optimization}
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  // Error display
  if (error) {
    return (
      <div className="p-6">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className="h-6 w-6 text-red-600" />
              <h3 className="text-lg font-semibold text-red-800">Dashboard Error</h3>
            </div>
            <p className="text-red-700 mb-4">{error}</p>
            <div className="flex gap-2">
              <Button onClick={handleRefresh} variant="outline" size="sm">
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry
              </Button>
              <Button onClick={clearError} variant="ghost" size="sm">
                Dismiss
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Loading state
  if (loading && !batchData) {
    return (
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Teacher Dashboard (Optimized)
          </h1>
          <p className="text-gray-600">Loading optimized dashboard data...</p>
        </div>
        <ContentLoader />
      </div>
    );
  }

  // Use batch data if available, otherwise fall back to individual data
  const currentOverviewData = batchData?.overview || overviewData;
  const currentProgressData = batchData?.progressOverview || progressData;

  if (!currentOverviewData) {
    return (
      <div className="p-6">
        <ContentLoader />
      </div>
    );
  }

  const { engagementSummary, topUsedLessons, behaviorFlags } = currentOverviewData;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Teacher Dashboard 
            <Badge variant="secondary" className="ml-2 bg-green-100 text-green-800">
              <Zap className="h-3 w-3 mr-1" />
              Optimized
            </Badge>
          </h1>
          <p className="text-gray-600">
            Welcome back, {userProfile.first_name} {userProfile.last_name}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={timeRange} onValueChange={handleTimeRangeChange}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all-time">All Time</SelectItem>
              <SelectItem value="this-week">This Week</SelectItem>
              <SelectItem value="this-month">This Month</SelectItem>
              <SelectItem value="this-year">This Year</SelectItem>
            </SelectContent>
          </Select>
          <Button 
            onClick={handleRefresh} 
            variant="outline" 
            size="sm"
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </Button>
          <Button 
            onClick={clearCache} 
            variant="ghost" 
            size="sm"
            title="Clear cache for fresh data"
          >
            <Database className="h-4 w-4 mr-2" />
            Clear Cache
          </Button>
        </div>
      </div>

      {/* Performance Metrics */}
      <PerformanceMetricsCard />

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Students Engaged</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{engagementSummary.totalStudentsEngaged}</div>
            <p className="text-xs text-muted-foreground">
              {engagementSummary.activeStudentsToday} active today
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Time Spent</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{engagementSummary.totalTimeSpent}h</div>
            <p className="text-xs text-muted-foreground">
              Avg {engagementSummary.avgResponsesPerStudent} responses/student
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Engagement Rate</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{engagementSummary.engagementRate}%</div>
            <p className="text-xs text-muted-foreground">
              {engagementSummary.engagementTrend > 0 ? '+' : ''}{engagementSummary.engagementTrend}% from last period
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Behavior Flags</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{behaviorFlags.length}</div>
            <p className="text-xs text-muted-foreground">
              Issues requiring attention
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="progress">Student Progress</TabsTrigger>
          <TabsTrigger value="behavior">Behavior Insights</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Used Lessons */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5" />
                  Top Used Lessons
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {topUsedLessons.slice(0, 5).map((lesson, index) => (
                    <div key={lesson.id} className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">{lesson.name}</div>
                        <div className="text-sm text-gray-500">{lesson.stage}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">{lesson.accessCount}</Badge>
                        <div className={`h-2 w-2 rounded-full ${
                          lesson.trend === 'up' ? 'bg-green-500' : 
                          lesson.trend === 'down' ? 'bg-red-500' : 'bg-gray-400'
                        }`} />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Behavior Flags Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  Behavior Flags Summary
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {behaviorFlags.length === 0 ? (
                    <div className="text-center py-4 text-gray-500">
                      <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-500" />
                      No behavior issues detected
                    </div>
                  ) : (
                    behaviorFlags.map((flag, index) => (
                      <div key={index} className="flex items-start justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <div className="font-medium">{flag.title}</div>
                          <div className="text-sm text-gray-600">{flag.description}</div>
                        </div>
                        <Badge 
                          variant={flag.severity === 'error' ? 'destructive' : 
                                  flag.severity === 'warning' ? 'default' : 'secondary'}
                        >
                          {flag.count}
                        </Badge>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="progress" className="space-y-4">
          {/* Progress Overview Controls */}
          <Card>
            <CardHeader>
              <CardTitle>Student Progress Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4 mb-4">
                <div className="flex-1">
                  <Input
                    placeholder="Search students..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="max-w-sm"
                  />
                </div>
                <Select value={stageFilter} onValueChange={setStageFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Stages</SelectItem>
                    <SelectItem value="Stage 1">Stage 1</SelectItem>
                    <SelectItem value="Stage 2">Stage 2</SelectItem>
                    <SelectItem value="Stage 3">Stage 3</SelectItem>
                    <SelectItem value="Stage 4">Stage 4</SelectItem>
                    <SelectItem value="Stage 5">Stage 5</SelectItem>
                  </SelectContent>
                </Select>
                <Button 
                  onClick={() => fetchProgressData(true, searchQuery, stageFilter)}
                  variant="outline"
                  disabled={refreshing}
                >
                  <Search className="h-4 w-4 mr-2" />
                  Search
                </Button>
              </div>

              {currentProgressData && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                  <div className="text-center">
                    <div className="text-2xl font-bold">{currentProgressData.totalStudents}</div>
                    <div className="text-sm text-gray-600">Total Students</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">{currentProgressData.averageCompletion}%</div>
                    <div className="text-sm text-gray-600">Avg Completion</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">{currentProgressData.averageScore}</div>
                    <div className="text-sm text-gray-600">Avg Score</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-600">{currentProgressData.studentsAtRisk}</div>
                    <div className="text-sm text-gray-600">At Risk</div>
                  </div>
                </div>
              )}

              {/* Student Progress Table */}
              {currentProgressData && currentProgressData.students.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student</TableHead>
                      <TableHead>Stage</TableHead>
                      <TableHead>Progress</TableHead>
                      <TableHead>Avg Score</TableHead>
                      <TableHead>Last Active</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {currentProgressData.students.slice(0, 10).map((student) => (
                      <TableRow key={student.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{student.name}</div>
                            <div className="text-sm text-gray-500">{student.email}</div>
                          </div>
                        </TableCell>
                        <TableCell>{student.stage}</TableCell>
                        <TableCell>
                          <div className="w-full">
                            <Progress value={student.completionPercentage} className="w-20" />
                            <div className="text-xs text-gray-500 mt-1">
                              {student.completionPercentage}%
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{student.averageScore}</TableCell>
                        <TableCell className="text-sm">
                          {new Date(student.lastActive).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          {Object.keys(student.flags).some(key => student.flags[key as keyof typeof student.flags]) ? (
                            <Badge variant="destructive">At Risk</Badge>
                          ) : (
                            <Badge variant="secondary">Good</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  No student progress data available
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="behavior" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Detailed Behavior Insights</CardTitle>
            </CardHeader>
            <CardContent>
              {behaviorFlags.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">All Good!</h3>
                  <p className="text-gray-600">No behavioral issues detected in your students.</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {behaviorFlags.map((flag, index) => (
                    <Card key={index} className="border-l-4 border-l-orange-400">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <AlertTriangle className="h-5 w-5 text-orange-500" />
                          {flag.title}
                          <Badge variant={flag.severity === 'error' ? 'destructive' : 'default'}>
                            {flag.count} students
                          </Badge>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-gray-600 mb-4">{flag.description}</p>
                        {flag.students.length > 0 && (
                          <div className="space-y-2">
                            <h4 className="font-medium">Affected Students:</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                              {flag.students.slice(0, 6).map((student, studentIndex) => (
                                <div key={studentIndex} className="p-2 bg-gray-50 rounded text-sm">
                                  <div className="font-medium">{student.name}</div>
                                  {student.retries && (
                                    <div className="text-gray-600">Retries: {student.retries}</div>
                                  )}
                                  {student.daysStuck && (
                                    <div className="text-gray-600">Days stuck: {student.daysStuck}</div>
                                  )}
                                  {student.lastActive && (
                                    <div className="text-gray-600">Last active: {student.lastActive}</div>
                                  )}
                                </div>
                              ))}
                            </div>
                            {flag.students.length > 6 && (
                              <p className="text-sm text-gray-500">
                                +{flag.students.length - 6} more students
                              </p>
                            )}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default TeacherDashboardOptimized;
