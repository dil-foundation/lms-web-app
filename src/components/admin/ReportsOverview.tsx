
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Legend } from 'recharts';
import { Users, GraduationCap, BookOpen, TrendingUp, Clock, Star, DollarSign, Award } from 'lucide-react';

// Mock data for demonstration
const userStatsData = [
  { month: 'Jan', activeUsers: 1200, newSignups: 150, churnRate: 5 },
  { month: 'Feb', activeUsers: 1350, newSignups: 180, churnRate: 4 },
  { month: 'Mar', activeUsers: 1500, newSignups: 200, churnRate: 3 },
  { month: 'Apr', activeUsers: 1650, newSignups: 170, churnRate: 4 },
  { month: 'May', activeUsers: 1800, newSignups: 220, churnRate: 3 },
  { month: 'Jun', activeUsers: 1950, newSignups: 190, churnRate: 2 },
];

const coursePerformanceData = [
  { course: 'JavaScript Fundamentals', enrollments: 450, completionRate: 78, avgRating: 4.5 },
  { course: 'React Development', enrollments: 380, completionRate: 72, avgRating: 4.7 },
  { course: 'Python Basics', enrollments: 520, completionRate: 85, avgRating: 4.3 },
  { course: 'Data Science', enrollments: 290, completionRate: 65, avgRating: 4.6 },
  { course: 'Machine Learning', enrollments: 210, completionRate: 58, avgRating: 4.4 },
];

const engagementData = [
  { day: 'Mon', timeSpent: 45, quizScore: 78 },
  { day: 'Tue', timeSpent: 52, quizScore: 82 },
  { day: 'Wed', timeSpent: 38, quizScore: 75 },
  { day: 'Thu', timeSpent: 48, quizScore: 80 },
  { day: 'Fri', timeSpent: 42, quizScore: 77 },
  { day: 'Sat', timeSpent: 35, quizScore: 73 },
  { day: 'Sun', timeSpent: 28, quizScore: 70 },
];

const revenueData = [
  { month: 'Jan', revenue: 15000, subscriptions: 300 },
  { month: 'Feb', revenue: 18000, subscriptions: 360 },
  { month: 'Mar', revenue: 22000, subscriptions: 440 },
  { month: 'Apr', revenue: 19500, subscriptions: 390 },
  { month: 'May', revenue: 25000, subscriptions: 500 },
  { month: 'Jun', revenue: 28000, subscriptions: 560 },
];

const categoryDistribution = [
  { name: 'Programming', value: 35, color: '#8884d8' },
  { name: 'Design', value: 25, color: '#82ca9d' },
  { name: 'Business', value: 20, color: '#ffc658' },
  { name: 'Data Science', value: 15, color: '#ff7300' },
  { name: 'Others', value: 5, color: '#00C49F' },
];

const chartConfig = {
  activeUsers: { label: 'Active Users', color: '#8884d8' },
  newSignups: { label: 'New Signups', color: '#82ca9d' },
  churnRate: { label: 'Churn Rate (%)', color: '#ffc658' },
  enrollments: { label: 'Enrollments', color: '#8884d8' },
  completionRate: { label: 'Completion Rate (%)', color: '#82ca9d' },
  avgRating: { label: 'Avg Rating', color: '#ffc658' },
  timeSpent: { label: 'Time Spent (min)', color: '#8884d8' },
  quizScore: { label: 'Quiz Score (%)', color: '#82ca9d' },
  revenue: { label: 'Revenue ($)', color: '#8884d8' },
  subscriptions: { label: 'Subscriptions', color: '#82ca9d' },
};

export const ReportsOverview = () => {
  const { t } = useTranslation();
  const [timeRange, setTimeRange] = useState('6months');

  const summaryCards = [
    {
      title: t('reports_overview.summary.total_active_users'),
      value: '1,950',
      change: '+12.5%',
      icon: Users,
      color: 'text-blue-600'
    },
    {
      title: t('reports_overview.summary.total_courses'),
      value: '248',
      change: '+8.2%',
      icon: BookOpen,
      color: 'text-green-600'
    },
    {
      title: t('reports_overview.summary.avg_completion_rate'),
      value: '72%',
      change: '+5.1%',
      icon: Award,
      color: 'text-purple-600'
    },
    {
      title: t('reports_overview.summary.monthly_revenue'),
      value: '$28,000',
      change: '+15.8%',
      icon: DollarSign,
      color: 'text-emerald-600'
    }
  ];

  return (
    <div className="space-y-6 p-2 sm:p-0">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">{t('reports_overview.title')}</h1>
          <p className="text-muted-foreground text-sm sm:text-base">{t('reports_overview.description')}</p>
        </div>
        <Select value={timeRange} onValueChange={setTimeRange}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder={t('reports_overview.time_range_placeholder')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7days">{t('reports_overview.time_ranges.last_7_days')}</SelectItem>
            <SelectItem value="30days">{t('reports_overview.time_ranges.last_30_days')}</SelectItem>
            <SelectItem value="3months">{t('reports_overview.time_ranges.last_3_months')}</SelectItem>
            <SelectItem value="6months">{t('reports_overview.time_ranges.last_6_months')}</SelectItem>
            <SelectItem value="1year">{t('reports_overview.time_ranges.last_year')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4 sm:gap-6">
        {summaryCards.map((card, index) => (
          <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
              <card.icon className={`h-4 w-4 ${card.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-xl sm:text-2xl font-bold">{card.value}</div>
              <p className="text-xs text-muted-foreground">
                <span className="text-green-600">{card.change}</span> {t('reports_overview.from_last_period')}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Reports Tabs */}
      <Tabs defaultValue="users" className="space-y-6">
        <div className="overflow-x-auto">
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 min-w-fit">
            <TabsTrigger value="users" className="text-xs sm:text-sm">{t('reports_overview.tabs.user_analytics')}</TabsTrigger>
            <TabsTrigger value="courses" className="text-xs sm:text-sm">{t('reports_overview.tabs.course_performance')}</TabsTrigger>
            <TabsTrigger value="engagement" className="text-xs sm:text-sm">{t('reports_overview.tabs.engagement')}</TabsTrigger>
            <TabsTrigger value="revenue" className="text-xs sm:text-sm">{t('reports_overview.tabs.revenue')}</TabsTrigger>
          </TabsList>
        </div>

        {/* User Analytics Tab */}
        <TabsContent value="users" className="space-y-6">
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg sm:text-xl">{t('reports_overview.user_analytics.growth_trends')}</CardTitle>
              </CardHeader>
              <CardContent className="p-2 sm:p-6">
                <div className="w-full h-[250px] sm:h-[300px]">
                  <ChartContainer config={chartConfig} className="w-full h-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={userStatsData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis 
                          dataKey="month" 
                          tick={{ fontSize: 12 }}
                          interval={0}
                        />
                        <YAxis tick={{ fontSize: 12 }} />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Line 
                          type="monotone" 
                          dataKey="activeUsers" 
                          stroke="var(--color-activeUsers)" 
                          strokeWidth={2}
                          name={t('reports_overview.user_analytics.active_users')}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="newSignups" 
                          stroke="var(--color-newSignups)" 
                          strokeWidth={2}
                          name={t('reports_overview.user_analytics.new_signups')}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg sm:text-xl">{t('reports_overview.user_analytics.category_distribution')}</CardTitle>
              </CardHeader>
              <CardContent className="p-2 sm:p-6">
                <div className="w-full h-[250px] sm:h-[300px]">
                  <ChartContainer config={chartConfig} className="w-full h-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Pie data={categoryDistribution} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
                          {categoryDistribution.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Course Performance Tab */}
        <TabsContent value="courses" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg sm:text-xl">{t('reports_overview.course_performance.title')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="w-full h-[300px] sm:h-[400px]">
                <ChartContainer config={chartConfig} className="w-full h-full">
                  <ResponsiveContainer>
                    <BarChart data={coursePerformanceData} layout="vertical" margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" tick={{ fontSize: 12 }} />
                      <YAxis 
                        dataKey="course" 
                        type="category" 
                        tick={{ fontSize: 12 }} 
                        width={120}
                      />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Legend />
                      <Bar 
                        dataKey="enrollments" 
                        fill="var(--color-enrollments)" 
                        radius={[0, 4, 4, 0]} 
                        name={t('reports_overview.course_performance.enrollments')}
                      />
                      <Bar 
                        dataKey="completionRate" 
                        fill="var(--color-completionRate)" 
                        radius={[0, 4, 4, 0]} 
                        name={t('reports_overview.course_performance.completion_rate')}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Engagement Tab */}
        <TabsContent value="engagement" className="space-y-6">
           <Card>
            <CardHeader>
              <CardTitle className="text-lg sm:text-xl">{t('reports_overview.engagement.title')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="w-full h-[300px] sm:h-[400px]">
                <ChartContainer config={chartConfig} className="w-full h-full">
                  <ResponsiveContainer>
                    <LineChart data={engagementData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                      <YAxis yAxisId="left" orientation="left" stroke="var(--color-timeSpent)" tick={{ fontSize: 12 }} />
                      <YAxis yAxisId="right" orientation="right" stroke="var(--color-quizScore)" tick={{ fontSize: 12 }} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Legend />
                      <Line 
                        yAxisId="left"
                        type="monotone" 
                        dataKey="timeSpent" 
                        stroke="var(--color-timeSpent)" 
                        strokeWidth={2}
                        name={t('reports_overview.engagement.time_spent')}
                      />
                      <Line 
                        yAxisId="right"
                        type="monotone" 
                        dataKey="quizScore" 
                        stroke="var(--color-quizScore)"
                        strokeWidth={2} 
                        name={t('reports_overview.engagement.quiz_score')}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Revenue Tab */}
        <TabsContent value="revenue" className="space-y-6">
           <Card>
            <CardHeader>
              <CardTitle className="text-lg sm:text-xl">{t('reports_overview.revenue.title')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="w-full h-[300px] sm:h-[400px]">
                <ChartContainer config={chartConfig} className="w-full h-full">
                  <ResponsiveContainer>
                    <BarChart data={revenueData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                      <YAxis yAxisId="left" orientation="left" stroke="var(--color-revenue)" tick={{ fontSize: 12 }} />
                      <YAxis yAxisId="right" orientation="right" stroke="var(--color-subscriptions)" tick={{ fontSize: 12 }} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Legend />
                      <Bar 
                        yAxisId="left"
                        dataKey="revenue" 
                        fill="var(--color-revenue)" 
                        radius={[4, 4, 0, 0]}
                        name={t('reports_overview.revenue.revenue')}
                      />
                      <Bar 
                        yAxisId="right"
                        dataKey="subscriptions" 
                        fill="var(--color-subscriptions)" 
                        radius={[4, 4, 0, 0]} 
                        name={t('reports_overview.revenue.subscriptions')}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
