import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { ContentLoader } from '@/components/ContentLoader';
import { toast } from 'sonner';
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  Clock,
  BookOpen,
  Brain,
  Award,
  Calendar,
  Filter,
  PlayCircle,
  Target,
  Activity,
  Star,
  Eye,
  Shield,
  RefreshCw
} from 'lucide-react';
import { 
  reportsService, 
  PracticeStagePerformanceData,
  UserEngagementData,
  TimeUsagePatternsData,
  TopContentData,
  AnalyticsOverview
} from '@/services/reportsService';
import { 
  adminDashboardService,
  KeyMetricsData
} from '@/services/adminDashboardService';

export const ReportsAnalytics = () => {
  const [dateRange, setDateRange] = useState('thismonth');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // API data states
  const [practiceStageData, setPracticeStageData] = useState<PracticeStagePerformanceData | null>(null);
  const [userEngagementData, setUserEngagementData] = useState<UserEngagementData | null>(null);
  const [timeUsageData, setTimeUsageData] = useState<TimeUsagePatternsData | null>(null);
  const [topContentData, setTopContentData] = useState<TopContentData | null>(null);
  const [analyticsOverview, setAnalyticsOverview] = useState<AnalyticsOverview | null>(null);
  const [keyMetrics, setKeyMetrics] = useState<KeyMetricsData | null>(null);

  // Map UI time range values to API values
  const mapTimeRangeToApiValue = (uiValue: string): string => {
    const mapping: Record<string, string> = {
      'today': 'today',
      'thisweek': 'this_week',
      'thismonth': 'this_month',
      '7days': 'this_week',
      '30days': 'this_month',
      '3months': 'this_month', // fallback to month for 3 months
      'alltime': 'all_time'
    };
    return mapping[uiValue] || 'all_time';
  };

  // Fetch all reports data
  const fetchReportsData = async (showRefreshIndicator = false, customTimeRange = dateRange) => {
    try {
      if (showRefreshIndicator) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      const apiTimeRange = mapTimeRangeToApiValue(customTimeRange);
      
      // Fetch reports data and key metrics in parallel
      const [reportsData, dashboardData] = await Promise.all([
        reportsService.getAllReportsData(apiTimeRange),
        adminDashboardService.getAllOverviewData(apiTimeRange)
      ]);
      
      setPracticeStageData(reportsData.practiceStagePerformance);
      setUserEngagementData(reportsData.userEngagement);
      setTimeUsageData(reportsData.timeUsagePatterns);
      setTopContentData(reportsData.topContentAccessed);
      setAnalyticsOverview(reportsData.analyticsOverview);
      setKeyMetrics(dashboardData.keyMetrics);

      if (showRefreshIndicator) {
        toast.success('Reports data refreshed successfully');
      }
    } catch (err: any) {
      console.error('Error fetching reports data:', err);
      setError(err.message || 'Failed to load reports data');
      toast.error('Failed to load reports data', {
        description: err.message || 'Please try refreshing the page'
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Load data on component mount
  useEffect(() => {
    fetchReportsData();
  }, []);

  // Handle time range change and fetch new data
  const handleTimeRangeChange = (newTimeRange: string) => {
    setDateRange(newTimeRange);
    console.log('Time range changed to:', newTimeRange);
    fetchReportsData(true, newTimeRange);
  };

  // Handle manual refresh
  const handleRefresh = () => {
    fetchReportsData(true, dateRange);
  };



  const getPerformanceColor = (status: string) => {
    switch (status) {
      case 'excellent': return 'text-green-600';
      case 'good': return 'text-blue-600';
      case 'needs-attention': return 'text-orange-600';
      default: return 'text-gray-600';
    }
  };

  const getPerformanceBadge = (status: string) => {
    switch (status) {
      case 'excellent': return 'bg-green-100 text-green-700 border-green-200';
      case 'good': return 'bg-blue-100 text-white border-blue-200';
      case 'needs-attention': return 'bg-orange-100 text-orange-700 border-orange-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-primary/5 rounded-3xl"></div>
        <div className="relative p-8 rounded-3xl">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-primary/10 to-primary/20 rounded-2xl flex items-center justify-center">
                <BarChart3 className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-primary via-primary to-primary/80 bg-clip-text text-transparent">
                  Reports & Analytics
                </h1>
                <p className="text-lg text-muted-foreground font-light">
                  Comprehensive insights into student engagement and learning outcomes
                </p>
              </div>
            </div>
            
            {/* Filter Controls */}
            <div className="flex items-center gap-3">
              <Select value={dateRange} onValueChange={handleTimeRangeChange}>
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
                title="Refresh reports data"
              >
                <RefreshCw className={`w-4 h-4 text-primary ${refreshing ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Show loading state */}
      {loading && !practiceStageData && (
        <div className="space-y-6">
          <ContentLoader message="Loading Reports & Analytics..." />
        </div>
      )}

      {/* Show error state */}
      {error && !practiceStageData && (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Shield className="w-8 h-8 text-red-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Failed to Load Reports</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => fetchReportsData()}
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
          >
            Try Again
          </button>
        </div>
      )}

      {/* Key Metrics from Admin Dashboard */}
      {keyMetrics && (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-gradient-to-br from-card to-green-500/5 dark:bg-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{keyMetrics.totalUsers?.toLocaleString() || '0'}</div>
            <p className="text-xs text-muted-foreground">
              {keyMetrics.students || 0} students, {keyMetrics.teachers || 0} teachers
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-card to-green-500/5 dark:bg-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Today</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{keyMetrics.activeToday?.toLocaleString() || '0'}</div>
            <p className="text-xs text-muted-foreground">
              Users active today
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-card to-green-500/5 dark:bg-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Students</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{keyMetrics.students?.toLocaleString() || '0'}</div>
            <p className="text-xs text-muted-foreground">
              {Math.round(keyMetrics.studentsPercentage || 0)}% of total users
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-card to-green-500/5 dark:bg-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Teachers</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{keyMetrics.teachers?.toLocaleString() || '0'}</div>
            <p className="text-xs text-muted-foreground">
              {Math.round(keyMetrics.teachersPercentage || 0)}% of total users
            </p>
          </CardContent>
        </Card>
      </div>
      )}

      {/* Practice Stage Performance & User Engagement */}
      {(practiceStageData || userEngagementData) && (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Practice Stage Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] mb-4">
              <style>
                {`
                  .recharts-bar-rectangle {
                    fill: #3B82F6 !important;
                    opacity: 1 !important;
                    transition: none !important;
                  }
                  .recharts-bar-rectangle:hover {
                    fill: #3B82F6 !important;
                    opacity: 1 !important;
                    filter: none !important;
                  }
                  .recharts-active-bar .recharts-bar-rectangle {
                    fill: #3B82F6 !important;
                    opacity: 1 !important;
                    filter: none !important;
                  }
                  .recharts-bar:hover .recharts-bar-rectangle {
                    fill: #3B82F6 !important;
                    opacity: 1 !important;
                    filter: none !important;
                  }
                  .recharts-bar .recharts-bar-rectangle {
                    pointer-events: none !important;
                  }
                  .recharts-bar {
                    pointer-events: all !important;
                  }
                  .recharts-tooltip-wrapper {
                    z-index: 1000 !important;
                  }
                  .recharts-default-tooltip {
                    background-color: hsl(var(--background)) !important;
                    border: 1px solid hsl(var(--border)) !important;
                    border-radius: 8px !important;
                    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05) !important;
                  }
                  .recharts-tooltip-label {
                    color: hsl(var(--foreground)) !important;
                    font-weight: 600 !important;
                    margin-bottom: 4px !important;
                  }
                  .recharts-tooltip-item {
                    color: hsl(var(--foreground)) !important;
                  }
                  .recharts-tooltip-item-name {
                    color: hsl(var(--muted-foreground)) !important;
                  }
                  .recharts-tooltip-item-value {
                    color: hsl(var(--foreground)) !important;
                    font-weight: 600 !important;
                  }
                `}
              </style>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={practiceStageData?.stages || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="stage" />
                  <YAxis />
                  <Tooltip />
                  <Bar 
                    dataKey="performance" 
                    fill="#3B82F6" 
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              User Engagement Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[200px] mb-4">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={userEngagementData?.engagementTypes || []}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {(userEngagementData?.engagementTypes || []).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-2">
              {(userEngagementData?.engagementTypes || []).map((item, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-sm font-medium">{item.name}</span>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold">{item.value}%</div>
                    <div className="text-xs text-muted-foreground">{item.users.toLocaleString()} users</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
      )}

      {/* Time of Day Usage */}
      {timeUsageData && (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Time of Day Usage Patterns
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={timeUsageData?.patterns || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="hour" />
                <YAxis />
                <Tooltip />
                <Line 
                  type="monotone" 
                  dataKey="users" 
                  stroke="#3B82F6" 
                  strokeWidth={3}
                  dot={{ fill: '#3B82F6', strokeWidth: 2, r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
      )}

      {/* Top Content Accessed */}
      {topContentData && (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star className="h-5 w-5" />
            Top Content Accessed
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {(topContentData?.content || []).map((content, index) => (
              <div key={index} className="flex items-center justify-between p-4 rounded-lg border hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="text-2xl">{content.icon}</div>
                  <div>
                    <h3 className="font-medium">{content.title}</h3>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Badge variant="outline" className="text-xs">
                        {content.type}
                      </Badge>
                      <span>{content.stage}</span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-4">
                    <div>
                      <div className="flex items-center gap-1">
                        <Eye className="h-3 w-3" />
                        <span className="text-sm font-medium">{content.accessCount.toLocaleString()}</span>
                      </div>
                      <div className="text-xs text-muted-foreground">views</div>
                    </div>
                    <div>
                      <div className="flex items-center gap-1">
                        <Star className="h-3 w-3" />
                        <span className="text-sm font-medium">{content.avgRating.toFixed(1)}</span>
                      </div>
                      <div className="text-xs text-muted-foreground">avg score</div>
                    </div>
                    <div>
                      <div className="text-sm font-medium">{Math.round(content.completionRate)}%</div>
                      <div className="text-xs text-muted-foreground">completion</div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      )}
    </div>
  );
};