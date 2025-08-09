import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip, Legend } from 'recharts';
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
  Shield
} from 'lucide-react';

export const ReportsAnalytics = () => {
  const [dateRange, setDateRange] = useState('30days');

  // Mock data for Practice Stage Performance
  const practiceStageData = [
    { stage: 'Stage 0', performance: 85, users: 234, avgScore: 8.5, status: 'good' },
    { stage: 'Stage 1', performance: 92, users: 189, avgScore: 9.2, status: 'excellent' },
    { stage: 'Stage 2', performance: 78, users: 156, avgScore: 7.8, status: 'needs-attention' },
    { stage: 'Stage 3', performance: 88, users: 143, avgScore: 8.8, status: 'good' },
    { stage: 'Stage 4', performance: 95, users: 98, avgScore: 9.5, status: 'excellent' },
    { stage: 'Stage 5', performance: 82, users: 67, avgScore: 8.2, status: 'good' },
    { stage: 'Stage 6', performance: 75, users: 45, avgScore: 7.5, status: 'needs-attention' },
  ];

  // Mock data for Learn Feature Usage
  const learnMetrics = {
    totalUsers: 1247,
    activeToday: 156,
    avgSessionTime: 24, // minutes
    completionRate: 73,
    weeklyGrowth: 12
  };

  // Mock data for User Engagement Overview
  const engagementData = [
    { name: 'Practice', value: 56, users: 561, color: '#3B82F6' },
    { name: 'Learn', value: 44, users: 437, color: '#10B981' },
  ];

  // Mock data for Time of Day Usage
  const timeUsageData = [
    { hour: '00:00', users: 12 },
    { hour: '02:00', users: 8 },
    { hour: '04:00', users: 5 },
    { hour: '06:00', users: 15 },
    { hour: '08:00', users: 45 },
    { hour: '10:00', users: 78 },
    { hour: '12:00', users: 92 },
    { hour: '14:00', users: 87 },
    { hour: '16:00', users: 134 },
    { hour: '18:00', users: 156 },
    { hour: '20:00', users: 143 },
    { hour: '22:00', users: 89 },
  ];

  // Mock data for Top Content
  const topContent = [
    { 
      title: 'Basic Conversation Starters', 
      type: 'Practice', 
      stage: 'Stage 1', 
      views: 1234, 
      avgScore: 8.7,
      icon: '💬',
      trend: 'up'
    },
    { 
      title: 'English Grammar Fundamentals', 
      type: 'Learn', 
      stage: 'Core Module', 
      views: 987, 
      avgScore: 9.2,
      icon: '📚',
      trend: 'up'
    },
    { 
      title: 'Daily Routine Vocabulary', 
      type: 'Practice', 
      stage: 'Stage 2', 
      views: 876, 
      avgScore: 8.3,
      icon: '🕐',
      trend: 'stable'
    },
    { 
      title: 'Pronunciation Practice', 
      type: 'Learn', 
      stage: 'Advanced Module', 
      views: 654, 
      avgScore: 8.9,
      icon: '🗣️',
      trend: 'up'
    },
    { 
      title: 'Quick Response Practice', 
      type: 'Practice', 
      stage: 'Stage 3', 
      views: 543, 
      avgScore: 7.8,
      icon: '⚡',
      trend: 'down'
    },
  ];

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
      case 'good': return 'bg-blue-100 text-blue-700 border-blue-200';
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
              <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder="Select time range" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7days">Last 7 days</SelectItem>
                  <SelectItem value="30days">Last 30 days</SelectItem>
                  <SelectItem value="3months">Last 3 months</SelectItem>
                  <SelectItem value="6months">Last 6 months</SelectItem>
                  <SelectItem value="1year">Last year</SelectItem>
                  <SelectItem value="alltime">All time</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </div>

      {/* Learn Feature Usage Metrics */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Learn Users</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{learnMetrics.totalUsers.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              +{learnMetrics.weeklyGrowth}% from last week
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Today</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{learnMetrics.activeToday}</div>
            <p className="text-xs text-muted-foreground">
              Currently learning
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Session Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{learnMetrics.avgSessionTime}m</div>
            <p className="text-xs text-muted-foreground">
              Per learning session
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{learnMetrics.completionRate}%</div>
            <p className="text-xs text-muted-foreground">
              Module completion
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Practice Stage Performance & User Engagement */}
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
                <BarChart data={practiceStageData}>
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
                    data={engagementData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {engagementData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-2">
              {engagementData.map((item, index) => (
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
                    <div className="text-xs text-muted-foreground">{item.users} users</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Time of Day Usage */}
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
              <LineChart data={timeUsageData}>
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

      {/* Top Content Accessed */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star className="h-5 w-5" />
            Top Content Accessed
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {topContent.map((content, index) => (
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
                        <span className="text-sm font-medium">{content.views.toLocaleString()}</span>
                      </div>
                      <div className="text-xs text-muted-foreground">views</div>
                    </div>
                    <div>
                      <div className="flex items-center gap-1">
                        <Star className="h-3 w-3" />
                        <span className="text-sm font-medium">{content.avgScore}</span>
                      </div>
                      <div className="text-xs text-muted-foreground">avg score</div>
                    </div>
                    <div className="flex items-center">
                      {content.trend === 'up' && <TrendingUp className="h-4 w-4 text-green-500" />}
                      {content.trend === 'stable' && <div className="h-4 w-4 bg-yellow-500 rounded-full" />}
                      {content.trend === 'down' && <TrendingUp className="h-4 w-4 text-red-500 rotate-180" />}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};