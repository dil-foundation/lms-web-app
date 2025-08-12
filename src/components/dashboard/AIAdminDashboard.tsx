import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ContentLoader } from '@/components/ContentLoader';
import { toast } from 'sonner';
import { 
  Bot, 
  Brain, 
  Target, 
  Sparkles, 
  TrendingUp,
  BookOpen,
  Users,
  Clock,
  PlayCircle,
  Calendar,
  GraduationCap,
  Award,
  Shield,
  RefreshCw
} from 'lucide-react';
import { 
  adminDashboardService, 
  DashboardOverviewData, 
  KeyMetricsData, 
  LearnUsageData, 
  MostAccessedLessonsData 
} from '@/services/adminDashboardService';

interface AIAdminDashboardProps {
  userProfile: {
    id: string;
    first_name?: string;
    last_name?: string;
    role?: string;
  };
}

export const AIAdminDashboard = ({ userProfile }: AIAdminDashboardProps) => {
  // State for API data
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState('alltime');
  const [refreshing, setRefreshing] = useState(false);
  
  // API data states
  const [overviewData, setOverviewData] = useState<DashboardOverviewData | null>(null);
  const [keyMetrics, setKeyMetrics] = useState<KeyMetricsData | null>(null);
  const [learnUsage, setLearnUsage] = useState<LearnUsageData | null>(null);
  const [mostAccessedLessons, setMostAccessedLessons] = useState<MostAccessedLessonsData | null>(null);

  // Map UI time range values to API values
  const mapTimeRangeToApiValue = (uiValue: string): string => {
    const mapping: Record<string, string> = {
      'today': 'today',
      'thisweek': 'this_week',
      'thismonth': 'this_month',
      'alltime': 'all_time'
    };
    return mapping[uiValue] || 'all_time';
  };

  // Fetch all dashboard data
  const fetchDashboardData = async (showRefreshIndicator = false, customTimeRange = 'alltime') => {
    try {
      if (showRefreshIndicator) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      const apiTimeRange = mapTimeRangeToApiValue(customTimeRange);
      const data = await adminDashboardService.getAllOverviewData(apiTimeRange);
      
      setOverviewData(data.overview);
      setKeyMetrics(data.keyMetrics);
      setLearnUsage(data.learnUsage);
      setMostAccessedLessons(data.mostAccessedLessons);

      if (showRefreshIndicator) {
        toast.success('Dashboard data refreshed successfully');
      }
    } catch (err: any) {
      console.error('Error fetching dashboard data:', err);
      setError(err.message || 'Failed to load dashboard data');
      toast.error('Failed to load dashboard data', {
        description: err.message || 'Please try refreshing the page'
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Load data on component mount
  useEffect(() => {
    fetchDashboardData(); // Will use default 'alltime' parameter
  }, []);

  // Handle time range change and fetch new data
  const handleTimeRangeChange = (newTimeRange: string) => {
    setTimeRange(newTimeRange);
    console.log('Time range changed to:', newTimeRange);
    // Fetch new data with the updated time range
    fetchDashboardData(true, newTimeRange);
  };

  // Handle manual refresh
  const handleRefresh = () => {
    fetchDashboardData(true, timeRange);
  };

  // Show loading state
  if (loading && !overviewData) {
    return (
      <div className="space-y-8">
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-primary/3 to-[#1582B4]/5 rounded-3xl"></div>
          <div className="relative p-8 md:p-10 rounded-3xl">
            <ContentLoader message="Loading AI Admin Dashboard..." />
          </div>
        </div>
      </div>
    );
  }

  // Show error state
  if (error && !overviewData) {
    return (
      <div className="space-y-8">
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-primary/3 to-[#1582B4]/5 rounded-3xl"></div>
          <div className="relative p-8 md:p-10 rounded-3xl">
            <div className="text-center">
              <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Shield className="w-8 h-8 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Failed to Load Dashboard</h3>
              <p className="text-gray-600 mb-4">{error}</p>
              <button
                onClick={() => fetchDashboardData()}
                className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
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
                <Bot className="w-8 h-8 text-primary" />
              </div>
              <div>
                <h1 className="text-4xl md:text-5xl font-bold tracking-tight bg-gradient-to-r from-primary via-primary to-primary/80 bg-clip-text text-transparent">
                  AI Tutor Overview
                </h1>
                <p className="text-lg text-muted-foreground font-light mt-2">
                  Welcome back, {userProfile?.first_name || 'Administrator'}
                </p>
              </div>
            </div>
            
            {/* Filter Controls */}
            <div className="flex items-center gap-3">
              <Select value={timeRange} onValueChange={handleTimeRangeChange}>
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder="Select time range" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="thisweek">This week</SelectItem>
                  <SelectItem value="thismonth">This month</SelectItem>
                  <SelectItem value="alltime">All time</SelectItem>
                </SelectContent>
              </Select>
              
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="p-2 bg-primary/10 hover:bg-primary/20 rounded-lg transition-colors disabled:opacity-50"
                title="Refresh dashboard data"
              >
                <RefreshCw className={`w-4 h-4 text-primary ${refreshing ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* User Count Metrics */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-gradient-to-br from-card to-green-500/5 dark:bg-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {overviewData?.totalUsers?.toLocaleString() || '0'}
            </div>
            <p className="text-xs text-muted-foreground">
              Registered users
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-card to-green-500/5 dark:bg-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Students</CardTitle>
            <GraduationCap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {overviewData?.students?.toLocaleString() || '0'}
            </div>
            <p className="text-xs text-muted-foreground">
              {overviewData?.totalUsers && overviewData?.students 
                ? `${Math.round((overviewData.students / overviewData.totalUsers) * 100)}% of total users`
                : 'Student count'
              }
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-card to-green-500/5 dark:bg-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Teachers</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {overviewData?.teachers?.toLocaleString() || '0'}
            </div>
            <p className="text-xs text-muted-foreground">
              {overviewData?.totalUsers && overviewData?.teachers 
                ? `${Math.round((overviewData.teachers / overviewData.totalUsers) * 100)}% of total users`
                : 'Teacher count'
              }
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-card to-green-500/5 dark:bg-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Today</CardTitle>
            <PlayCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {overviewData?.activeUsersToday?.toLocaleString() || '0'}
            </div>
            <p className="text-xs text-muted-foreground">
              Practice lessons engagement
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Learn Feature Usage Summary */}
      <Card className="group overflow-hidden transition-all duration-500 hover:scale-[1.02] hover:shadow-2xl border-0 bg-gradient-to-br from-white via-white to-gray-50/50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800/50">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-primary/10 to-primary/20 rounded-xl flex items-center justify-center shadow-lg">
                <Brain className="w-5 h-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg font-semibold">Learn Feature Usage Summary</CardTitle>
                <p className="text-sm text-muted-foreground">AI-powered learning engagement metrics</p>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="p-4 rounded-lg border border-border hover:bg-accent/5 transition-colors">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Today's Access</span>
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 bg-[#1582B4] rounded-full"></div>
                  <span className="text-lg font-bold">
                    {learnUsage?.today?.toLocaleString() || '0'}
                  </span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Users who accessed Learn feature today
              </p>
            </div>
            <div className="p-4 rounded-lg border border-border hover:bg-accent/5 transition-colors">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">This Week</span>
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 bg-green-500 rounded-full"></div>
                  <span className="text-lg font-bold">
                    {learnUsage?.thisWeek?.toLocaleString() || '0'}
                  </span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Total weekly Learn feature engagement
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Most Accessed Content */}
      <Card className="group overflow-hidden transition-all duration-500 hover:scale-[1.02] hover:shadow-2xl border-0 bg-gradient-to-br from-white via-white to-gray-50/50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800/50">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-primary/10 to-primary/20 rounded-xl flex items-center justify-center shadow-lg">
                <Award className="w-5 h-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg font-semibold">Most Accessed Practice Lessons</CardTitle>
                <p className="text-sm text-muted-foreground">Popular AI tutor learning sessions</p>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="space-y-3">
            {mostAccessedLessons?.lessons && mostAccessedLessons.lessons.length > 0 ? (
              mostAccessedLessons.lessons.map((lesson, index) => (
                <div key={index} className="flex items-center justify-between p-4 rounded-lg border border-border hover:bg-accent/5 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-primary/10 to-primary/20 rounded-xl flex items-center justify-center text-lg shadow-sm">
                      {lesson.icon}
                    </div>
                    <div>
                      <h3 className="font-medium text-sm">{lesson.title}</h3>
                      <p className="text-xs text-muted-foreground">{lesson.stage}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold">{lesson.accessCount.toLocaleString()}</div>
                    <p className="text-xs text-muted-foreground">accesses</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">No lesson data available</p>
                <p className="text-xs text-muted-foreground mt-1">Check back later for usage statistics</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}; 