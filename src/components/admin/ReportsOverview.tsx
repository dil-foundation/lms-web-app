
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Download,
  Search,
  Users,
  BookOpen,
  Activity,
  Cog,
  ShieldAlert,
  RefreshCw,
  DollarSign,
  TrendingUp,
  BarChart2,
  FileText,
  CheckCircle,
  MessageSquare,
  XCircle
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, LabelList, Cell } from 'recharts';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

const StatCard = ({ title, value, subtitle, icon: Icon }) => {
  const { t } = useTranslation();
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </CardContent>
    </Card>
  );
};


const CoursesAnalytics = () => {
  const { t } = useTranslation();

  const topCoursesData = [
    { course: 'DIL-SE', instructor: 'Nasir Mahmood', students: 2, completion: 0, status: 'published' },
    { course: 'Mathematics-SOW (2025-26)', instructor: 'Nasir Mahmood', students: 2, completion: 0, status: 'draft' },
    { course: 'TEST1', instructor: 'Nasir Mahmood', students: 1, completion: 0, status: 'published' },
    { course: 'Test1', instructor: 'Nasir Mahmood', students: 2, completion: 0, status: 'draft' },
  ];
  
  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'published': return 'bg-green-100 text-green-800 hover:bg-green-200 dark:bg-green-900/50 dark:text-green-300';
      case 'draft': return 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200 dark:bg-yellow-900/50 dark:text-yellow-300';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>{t('reports_analytics.courses.courses_analytics')}</CardTitle>
          <Button variant="outline" size="sm">
            <RefreshCw className="mr-2 h-4 w-4" />
            {t('reports_analytics.courses.refresh')}
          </Button>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <StatCard title={t('reports_analytics.courses.total_courses')} value="4" subtitle="2 published" icon={BookOpen} />
            <StatCard title={t('reports_analytics.courses.total_enrollments')} value="6" subtitle="Across all courses" icon={Users} />
            <StatCard title={t('reports_analytics.courses.completion_rate')} value="0%" subtitle="Average across courses" icon={TrendingUp} />
            <StatCard title={t('reports_analytics.courses.course_levels')} value="3/1/0" subtitle="Beginner/Intermediate/Advanced" icon={BarChart2} />
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>{t('reports_analytics.courses.top_performing_courses')}</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('reports_analytics.courses.table.course')}</TableHead>
                <TableHead>{t('reports_analytics.courses.table.instructor')}</TableHead>
                <TableHead>{t('reports_analytics.courses.table.students')}</TableHead>
                <TableHead>{t('reports_analytics.courses.table.completion')}</TableHead>
                <TableHead>{t('reports_analytics.courses.table.status')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {topCoursesData.map((course) => (
                <TableRow key={course.course}>
                  <TableCell className="font-medium">{course.course}</TableCell>
                  <TableCell>{course.instructor}</TableCell>
                  <TableCell>{course.students}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Progress value={course.completion} className="w-24" />
                      <span>{course.completion}%</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={getStatusBadgeClass(course.status)}>{course.status}</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
};

const UsersAnalytics = () => <div>Users Analytics Content</div>;
const SystemAnalytics = () => <div>System Analytics Content</div>;

const ActivityAnalytics = () => {
  const { t } = useTranslation();
  
  const recentActivityData = [
      { user: 'Demo Admin', role: 'admin', activity: 'Untitled Post', details: 'ok', course: 'DIL-SE', time: '3 days ago' },
      { user: 'Demo Admin', role: 'admin', activity: 'Untitled Post', details: 'Hi', course: 'DIL-SE', time: '4 days ago' },
      { user: 'Student2', role: 'student', activity: 'Untitled Post', details: 'Thanks Teacher', course: 'DIL-SE', time: '15 days ago' },
      { user: 'Nasir Mahmood', role: 'teacher', activity: 'THIS IS TEST ANNOUNCEMENT', details: 'BRING YOU IDS', course: 'Test1', time: '15 days ago' },
      { user: 'Nasir Mahmood', role: 'teacher', activity: 'THIS IS A TEST ANNOUNCEMENT', details: 'BRING YOU IDS to the principal\'s office to pick up...', course: 'Test1', time: '15 days ago' },
  ];

  const getRoleBadgeClass = (role) => {
    switch (role) {
      case 'admin': return 'bg-purple-100 text-purple-800';
      case 'teacher': return 'bg-blue-100 text-blue-800';
      case 'student': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>{t('reports_analytics.activity.activity_analytics')}</CardTitle>
          <Button variant="outline" size="sm">
            <RefreshCw className="mr-2 h-4 w-4" />
            {t('reports_analytics.activity.refresh')}
          </Button>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <StatCard title={t('reports_analytics.activity.lesson_completions')} value="0" subtitle="Last 30 days" icon={CheckCircle} />
            <StatCard title={t('reports_analytics.activity.quiz_attempts')} value="0" subtitle="Last 30 days" icon={FileText} />
            <StatCard title={t('reports_analytics.activity.discussion_posts')} value="6" subtitle="Last 30 days" icon={MessageSquare} />
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>{t('reports_analytics.activity.recent_activity')}</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('reports_analytics.activity.table.user')}</TableHead>
                <TableHead>{t('reports_analytics.activity.table.activity')}</TableHead>
                <TableHead>{t('reports_analytics.activity.table.course')}</TableHead>
                <TableHead>{t('reports_analytics.activity.table.time')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentActivityData.map((item, index) => (
                <TableRow key={index}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback>{item.user.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{item.user}</p>
                        <Badge className={getRoleBadgeClass(item.role)}>{item.role}</Badge>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <p className="font-medium">{item.activity}</p>
                    <p className="text-sm text-muted-foreground truncate max-w-xs">{item.details}</p>
                  </TableCell>
                  <TableCell>{item.course}</TableCell>
                  <TableCell>{item.time}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};


const PlatformAnalytics = () => {
  const { t } = useTranslation();

  const userDistributionData = [
    { name: t('reports_analytics.platform.students'), value: 3, color: '#22c55e' },
    { name: t('reports_analytics.platform.teachers'), value: 2, color: '#3b82f6' },
    { name: t('reports_analytics.platform.admins'), value: 3, color: '#8b5cf6' },
  ];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>{t('reports_analytics.platform.platform_analytics')}</CardTitle>
          <Button variant="outline" size="sm">
            <RefreshCw className="mr-2 h-4 w-4" />
            {t('reports_analytics.platform.refresh')}
          </Button>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <StatCard title={t('reports_analytics.platform.total_users')} value="8" subtitle={t('reports_analytics.platform.users_subtitle')} icon={Users} />
            <StatCard title={t('reports_analytics.platform.total_courses')} value="4" subtitle={t('reports_analytics.platform.courses_subtitle')} icon={BookOpen} />
            <StatCard title={t('reports_analytics.platform.enrollments')} value="6" subtitle={t('reports_analytics.platform.enrollments_subtitle')} icon={TrendingUp} />
            <StatCard title={t('reports_analytics.platform.total_revenue')} value="$0" subtitle={t('reports_analytics.platform.revenue_subtitle')} icon={DollarSign} />
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-5">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>{t('reports_analytics.platform.user_distribution')}</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={userDistributionData} layout="vertical" margin={{ left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" tickLine={false} axisLine={false} tick={{ fontSize: 12 }} width={80} />
                <Bar dataKey="value" barSize={20} radius={[0, 4, 4, 0]}>
                  {userDistributionData.map((entry) => (
                    <Cell key={`cell-${entry.name}`} fill={entry.color} />
                  ))}
                  <LabelList dataKey="value" position="right" offset={8} className="font-medium" />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>{t('reports_analytics.platform.platform_activity')}</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">{t('reports_analytics.platform.lesson_completions')}</p>
              <p className="text-3xl font-bold">0</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">{t('reports_analytics.platform.quiz_attempts')}</p>
              <p className="text-3xl font-bold">0</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">{t('reports_analytics.platform.discussion_posts')}</p>
              <p className="text-3xl font-bold">6</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">{t('reports_analytics.platform.badges_awarded')}</p>
              <p className="text-3xl font-bold">0</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

const AlertsAnalytics = () => {
  const { t } = useTranslation();

  const alertsData = [
    // This will be empty as per the design
  ];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>{t('reports_analytics.alerts.alerts_analytics')}</CardTitle>
          <Button variant="outline" size="sm">
            <RefreshCw className="mr-2 h-4 w-4" />
            {t('reports_analytics.alerts.refresh')}
          </Button>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <StatCard title={t('reports_analytics.alerts.total_alerts')} value="0" subtitle="0 unresolved" icon={ShieldAlert} />
            <StatCard title={t('reports_analytics.alerts.critical_alerts')} value="0" subtitle="Highest priority" icon={XCircle} />
            <StatCard title={t('reports_analytics.alerts.warnings')} value="0" subtitle="Medium priority" icon={ShieldAlert} />
            <StatCard title={t('reports_analytics.alerts.info_alerts')} value="0" subtitle="Low priority" icon={ShieldAlert} />
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>{t('reports_analytics.alerts.recent_alerts')}</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('reports_analytics.alerts.table.type')}</TableHead>
                <TableHead>{t('reports_analytics.alerts.table.title')}</TableHead>
                <TableHead>{t('reports_analytics.alerts.table.message')}</TableHead>
                <TableHead>{t('reports_analytics.alerts.table.source')}</TableHead>
                <TableHead>{t('reports_analytics.alerts.table.time')}</TableHead>
                <TableHead>{t('reports_analytics.alerts.table.status')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {alertsData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">
                    {t('reports_analytics.alerts.no_recent_alerts')}
                  </TableCell>
                </TableRow>
              ) : (
                alertsData.map((alert, index) => (
                  <TableRow key={index}>
                    {/* Data rendering here */}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export const ReportsOverview = () => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('activity');

  const renderAnalyticsContent = () => {
    switch (activeTab) {
      case 'platform':
        return <PlatformAnalytics />;
      case 'users':
        return <UsersAnalytics />;
      case 'courses':
        return <CoursesAnalytics />;
      case 'activity':
        return <ActivityAnalytics />;
      case 'system':
        return <SystemAnalytics />;
      case 'alerts':
        return <AlertsAnalytics />;
      default:
        return <PlatformAnalytics />;
    }
  };

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          {t('reports_analytics.title')}
        </h1>
        <p className="text-muted-foreground mt-1">
          {t('reports_analytics.description')}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Cog className="h-5 w-5" />
              {t('reports_analytics.report_options.title')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder={t('reports_analytics.report_options.last_30_days')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="30">
                    {t('reports_analytics.report_options.last_30_days')}
                  </SelectItem>
                  <SelectItem value="90">
                    {t('reports_analytics.report_options.last_90_days')}
                  </SelectItem>
                  <SelectItem value="365">
                    {t('reports_analytics.report_options.last_year')}
                  </SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" className="w-full">
                <Download className="mr-2 h-4 w-4 flex-shrink-0" />
                <span className="truncate">{t('reports_analytics.report_options.export_report')}</span>
              </Button>
               <Select>
                <SelectTrigger>
                  <SelectValue placeholder={t('reports_analytics.report_options.all_users')} />
                </SelectTrigger>
                <SelectContent>
                   <SelectItem value="all">
                    {t('reports_analytics.report_options.all_users')}
                  </SelectItem>
                </SelectContent>
              </Select>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder={t('reports_analytics.report_options.search_users')} className="pl-10" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
             <CardTitle className="flex items-center gap-2">
                <BarChart2 className="h-5 w-5" />
                {t('reports_analytics.report_types.title')}
             </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 gap-2 bg-transparent p-0">
                <TabsTrigger value="platform" className="bg-muted text-muted-foreground data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  {t('reports_analytics.report_types.platform')}
                </TabsTrigger>
                <TabsTrigger value="users" className="bg-muted text-muted-foreground data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  {t('reports_analytics.report_types.users')}
                </TabsTrigger>
                <TabsTrigger value="courses" className="bg-muted text-muted-foreground data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  {t('reports_analytics.report_types.courses')}
                </TabsTrigger>
                <TabsTrigger value="activity" className="bg-muted text-muted-foreground data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  {t('reports_analytics.report_types.activity')}
                </TabsTrigger>
                <TabsTrigger value="system" className="bg-muted text-muted-foreground data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  {t('reports_analytics.report_types.system')}
                </TabsTrigger>
                <TabsTrigger value="alerts" className="bg-muted text-muted-foreground data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  {t('reports_analytics.report_types.alerts')}
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </CardContent>
        </Card>
      </div>
      
      {/* Dynamic Content based on selected tab */}
      {renderAnalyticsContent()}

    </div>
  );
};
