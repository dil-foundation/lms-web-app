import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip, Legend, Area, AreaChart } from 'recharts';
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
  PracticeStagePerformanceData,
  UserEngagementData,
  TimeUsagePatternsData,
  TopContentData,
  AnalyticsOverview
} from '@/services/reportsService';
import { 
  KeyMetricsData
} from '@/services/adminDashboardService';
import { useReportsData } from '@/hooks/useReportsData';

export const ReportsAnalytics = () => {
  // Use the custom hook for reports data management
  const {
    data,
    loading,
    error,
    refreshing,
    timeRange: dateRange,
    handleTimeRangeChange,
    handleRefresh
  } = useReportsData({
    initialTimeRange: 'thismonth',
    enableAutoRefresh: false // Disable auto-refresh for now
  });

  // Extract data from hook
  const practiceStageData = data?.practiceStagePerformance || null;
  const userEngagementData = data?.userEngagement || null;
  const timeUsageData = data?.timeUsagePatterns || null;
  const topContentData = data?.topContentAccessed || null;
  const analyticsOverview = data?.analyticsOverview || null;
  const keyMetrics = data?.keyMetrics || null;





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
                <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-primary via-primary to-primary/80 bg-clip-text text-transparent" style={{ lineHeight: '3rem' }}>
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
        <Card className="border-0 shadow-lg bg-gradient-to-br from-card to-blue-50/30 dark:to-blue-950/20">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-3 text-lg font-semibold">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <BarChart3 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              Practice Stage Performance
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Performance metrics across all learning stages
            </p>
          </CardHeader>
          <CardContent className="pt-0">

            <div className="h-[320px] practice-stage-chart">
              {(() => {
                // Create stages 1-6 with data from API or default values
                const stageNumbers = [1, 2, 3, 4, 5, 6];
                const apiStages = practiceStageData?.stages || [];
                const stageColors = ['#EF4444', '#F97316', '#F59E0B', '#10B981', '#3B82F6', '#8B5CF6'];
                
                const chartData = stageNumbers.map((stageNum, index) => {
                  // Find matching stage data from API
                  const apiStage = apiStages.find(stage => 
                    stage.stage?.toLowerCase().includes(stageNum.toString()) ||
                    stage.stage?.toLowerCase().includes(`stage ${stageNum}`) ||
                    stage.stage?.toLowerCase().includes(`stage${stageNum}`)
                  );
                  
                  return {
                    stage: `Stage ${stageNum}`,
                    performance: apiStage?.performance || apiStage?.completionRate || 0,
                    users: apiStage?.users || 0,
                    avgScore: apiStage?.avgScore || 0,
                    color: stageColors[index]
                  };
                });

                const maxValue = 100;
                const chartHeight = 240;
                const chartWidth = 500;
                const barWidth = 60;
                const barSpacing = 20;
                const startX = 60;
                const startY = 40;

                return (
                  <div className="relative w-full h-full">
                    
                    <div className="w-full h-full flex items-center justify-center bg-transparent">
                      <svg 
                        width="100%" 
                        height="100%" 
                        viewBox={`0 0 ${chartWidth + 120} ${chartHeight + 80}`} 
                        className="overflow-visible"
                        style={{ minHeight: '320px' }}
                      >
                      <defs>
                        <linearGradient id="customBarGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#3B82F6" stopOpacity={0.9}/>
                          <stop offset="100%" stopColor="#3B82F6" stopOpacity={0.4}/>
                        </linearGradient>
                        <filter id="barShadow" x="-50%" y="-50%" width="200%" height="200%">
                          <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.1"/>
                        </filter>
                      </defs>
                      
                      {/* Grid lines */}
                      {[0, 25, 50, 75, 100].map((value) => (
                        <g key={value}>
                          <line
                            x1={startX}
                            y1={startY + chartHeight - (value / maxValue) * chartHeight}
                            x2={startX + chartData.length * (barWidth + barSpacing)}
                            y2={startY + chartHeight - (value / maxValue) * chartHeight}
                            stroke="hsl(var(--muted-foreground))"
                            strokeOpacity={0.2}
                            strokeDasharray="3 3"
                          />
                          <text
                            x={startX - 10}
                            y={startY + chartHeight - (value / maxValue) * chartHeight + 4}
                            textAnchor="end"
                            fontSize="12"
                            fill="hsl(var(--muted-foreground))"
                          >
                            {value}
                          </text>
                        </g>
                      ))}
                      
                      {/* Y-axis label */}
                      <text
                        x={20}
                        y={startY + chartHeight / 2}
                        textAnchor="middle"
                        fontSize="12"
                        fill="hsl(var(--muted-foreground))"
                        transform={`rotate(-90, 20, ${startY + chartHeight / 2})`}
                      >
                        Performance (%)
                      </text>
                      
                      {/* Bars */}
                      {chartData.map((data, index) => {
                        const barHeight = data.performance > 0 ? Math.max((data.performance / maxValue) * chartHeight, 5) : 0;
                        const x = startX + index * (barWidth + barSpacing);
                        const y = startY + chartHeight - barHeight;
                        
                        return (
                          <g key={data.stage}>
                            {/* Bar */}
                            <rect
                              x={x}
                              y={y}
                              width={barWidth}
                              height={barHeight}
                              fill="url(#customBarGradient)"
                              rx={6}
                              ry={6}
                              filter="url(#barShadow)"
                              className="hover:opacity-90 transition-opacity duration-200 cursor-pointer"
                              onMouseEnter={(e) => {
                                // Show tooltip
                                const tooltip = document.getElementById(`tooltip-${index}`);
                                if (tooltip) {
                                  tooltip.style.display = 'block';
                                }
                              }}
                              onMouseLeave={(e) => {
                                // Hide tooltip
                                const tooltip = document.getElementById(`tooltip-${index}`);
                                if (tooltip) {
                                  tooltip.style.display = 'none';
                                }
                              }}
                            />
                            
                            {/* Stage label */}
                            <text
                              x={x + barWidth / 2}
                              y={startY + chartHeight + 20}
                              textAnchor="middle"
                              fontSize="12"
                              fill="hsl(var(--muted-foreground))"
                            >
                              {data.stage}
                            </text>
                            
                            {/* Tooltip */}
                            <g
                              id={`tooltip-${index}`}
                              style={{ display: 'none' }}
                              pointerEvents="none"
                            >
                              <rect
                                x={x + barWidth / 2 - 50}
                                y={y - 65}
                                width={100}
                                height={50}
                                fill="hsl(var(--background))"
                                stroke="hsl(var(--border))"
                                rx={8}
                                filter="url(#barShadow)"
                              />
                              <text
                                x={x + barWidth / 2}
                                y={y - 50}
                                textAnchor="middle"
                                fontSize="12"
                                fontWeight="600"
                                fill="hsl(var(--foreground))"
                              >
                                {data.stage}
                              </text>
                              <text
                                x={x + barWidth / 2}
                                y={y - 35}
                                textAnchor="middle"
                                fontSize="12"
                                fontWeight="600"
                    fill="#3B82F6" 
                              >
                                {data.performance.toFixed(1)}%
                              </text>
                              <text
                                x={x + barWidth / 2}
                                y={y - 20}
                                textAnchor="middle"
                                fontSize="10"
                                fill="hsl(var(--muted-foreground))"
                              >
                                {data.users} users
                              </text>
                            </g>
                          </g>
                        );
                      })}
                    </svg>
                    </div>
                  </div>
                );
              })()}
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-gradient-to-br from-card to-green-50/30 dark:to-green-950/20">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-3 text-lg font-semibold">
              <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <Users className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              User Engagement Overview
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Distribution of user activity types
            </p>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="h-[240px] mb-6">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <defs>
                    <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
                      <feDropShadow dx="0" dy="4" stdDeviation="3" floodOpacity="0.1"/>
                    </filter>
                  </defs>
                  <Pie
                    data={userEngagementData?.engagementTypes || []}
                    cx="50%"
                    cy="50%"
                    innerRadius={65}
                    outerRadius={95}
                    paddingAngle={3}
                    dataKey="value"
                    filter="url(#shadow)"
                  >
                    {(userEngagementData?.engagementTypes || []).map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={entry.color} 
                        stroke="hsl(var(--background))"
                        strokeWidth={2}
                      />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: 'hsl(var(--background))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '12px',
                      boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                      padding: '12px'
                    }}
                    formatter={(value: number) => [
                      <span style={{ color: 'hsl(var(--foreground))', fontWeight: '600' }}>
                        {value}%
                      </span>, 
                      'Engagement'
                    ]}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-3">
              {(userEngagementData?.engagementTypes || []).map((item, index) => (
                <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-4 h-4 rounded-full shadow-sm" 
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-sm font-medium text-foreground">{item.name}</span>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold text-foreground">{item.value}%</div>
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
      <Card className="border-0 shadow-lg bg-gradient-to-br from-card to-purple-50/30 dark:to-purple-950/20">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-3 text-lg font-semibold">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
              <Clock className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            </div>
            Time of Day Usage Patterns
          </CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Peak usage hours throughout the day
          </p>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart 
                data={timeUsageData?.patterns || []}
                margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
              >
                <defs>
                  <linearGradient id="lineGradient" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#8B5CF6" stopOpacity={0.8}/>
                    <stop offset="50%" stopColor="#3B82F6" stopOpacity={0.8}/>
                    <stop offset="100%" stopColor="#10B981" stopOpacity={0.8}/>
                  </linearGradient>
                  <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3B82F6" stopOpacity={0.2}/>
                    <stop offset="100%" stopColor="#3B82F6" stopOpacity={0.05}/>
                  </linearGradient>
                </defs>
                <CartesianGrid 
                  strokeDasharray="3 3" 
                  stroke="hsl(var(--muted-foreground))" 
                  opacity={0.3}
                />
                <XAxis 
                  dataKey="hour" 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                  interval={1}
                />
                <YAxis 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                  label={{ 
                    value: 'Active Users', 
                    angle: -90, 
                    position: 'insideLeft',
                    style: { textAnchor: 'middle', fontSize: '12px', fill: 'hsl(var(--muted-foreground))' }
                  }}
                />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: 'hsl(var(--background))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '12px',
                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                    padding: '12px'
                  }}
                  labelStyle={{ 
                    color: 'hsl(var(--foreground))', 
                    fontWeight: '600',
                    marginBottom: '4px'
                  }}
                  formatter={(value: number) => [
                    <span style={{ color: 'hsl(var(--foreground))', fontWeight: '600' }}>
                      {value.toLocaleString()}
                    </span>, 
                    <span style={{ color: 'hsl(var(--muted-foreground))' }}>Active Users</span>
                  ]}
                  labelFormatter={(label: string) => `${label}:00`}
                />
                <Area
                  type="monotone"
                  dataKey="users"
                  stroke="none"
                  fill="url(#areaGradient)"
                />
                <Line 
                  type="monotone" 
                  dataKey="users" 
                  stroke="url(#lineGradient)"
                  strokeWidth={3}
                  dot={{ 
                    fill: '#3B82F6', 
                    strokeWidth: 3, 
                    r: 5,
                    stroke: '#ffffff',
                    filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))'
                  }}
                  activeDot={{ 
                    r: 7, 
                    fill: '#3B82F6',
                    stroke: '#ffffff',
                    strokeWidth: 3,
                    filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.2))'
                  }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
      )}

      {/* Top Content Accessed */}
      {topContentData && (
      <Card className="border-0 shadow-lg bg-gradient-to-br from-card to-orange-50/30 dark:to-orange-950/20">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-3 text-lg font-semibold">
            <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
              <Star className="h-5 w-5 text-orange-600 dark:text-orange-400" />
            </div>
            Top Content Accessed
          </CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Most popular learning content and materials
          </p>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="space-y-3">
            {(topContentData?.content || []).slice(0, 5).map((content, index) => (
              <div key={index} className="group relative p-4 rounded-xl border-0 bg-gradient-to-r from-background to-muted/20 hover:from-muted/30 hover:to-muted/40 transition-all duration-300 shadow-sm hover:shadow-md">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 flex-1">
                    <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-gradient-to-br from-primary/10 to-primary/5 group-hover:from-primary/20 group-hover:to-primary/10 transition-colors">
                      <div className="text-lg font-bold text-primary">#{index + 1}</div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                        {content.title}
                      </h3>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge 
                          variant="outline" 
                          className="text-xs font-medium px-2 py-1 bg-primary/10 text-primary border-primary/20 hover:bg-primary/20 transition-colors"
                        >
                          {content.type}
                        </Badge>
                        <span className="text-xs text-muted-foreground font-medium">
                          {content.stage}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-center">
                      <div className="flex items-center gap-1 justify-center">
                        <Eye className="h-3 w-3 text-blue-500" />
                        <span className="text-sm font-bold text-foreground">
                          {content.accessCount.toLocaleString()}
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground font-medium">views</div>
                    </div>
                    <div className="text-center">
                      <div className="flex items-center gap-1 justify-center">
                        <Star className="h-3 w-3 text-yellow-500 fill-current" />
                        <span className="text-sm font-bold text-foreground">
                          {content.avgRating.toFixed(1)}
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground font-medium">rating</div>
                    </div>
                    <div className="text-center">
                      <div className="text-sm font-bold text-green-600 dark:text-green-400">
                        {Math.round(content.completionRate)}%
                      </div>
                      <div className="text-xs text-muted-foreground font-medium">completion</div>
                    </div>
                  </div>
                </div>
                <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
              </div>
            ))}
          </div>
          {(topContentData?.content || []).length > 5 && (
            <div className="mt-4 text-center">
              <button className="text-sm text-muted-foreground hover:text-primary transition-colors font-medium">
                View all {topContentData.content.length} items →
              </button>
            </div>
          )}
        </CardContent>
      </Card>
      )}
    </div>
  );
};