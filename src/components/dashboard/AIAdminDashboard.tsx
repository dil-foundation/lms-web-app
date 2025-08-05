import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
  Shield
} from 'lucide-react';

interface AIAdminDashboardProps {
  userProfile: {
    id: string;
    first_name?: string;
    last_name?: string;
    role?: string;
  };
}

export const AIAdminDashboard = ({ userProfile }: AIAdminDashboardProps) => {
  // Mock data for the new overview metrics
  const overviewData = {
    totalUsers: 1247,
    students: 985,
    teachers: 247,
    admins: 15,
    activeUsersToday: 89,
    learnFeatureUsage: {
      today: 156,
      thisWeek: 892
    },
    mostAccessedLessons: [
      { title: "Basic Conversation Starters", stage: "Stage 1", accessCount: 234, icon: "💬" },
      { title: "Daily Routine Vocabulary", stage: "Stage 2", accessCount: 189, icon: "🕐" },
      { title: "Workplace Communication", stage: "Stage 4", accessCount: 167, icon: "💼" },
      { title: "Academic Presentations", stage: "Stage 5", accessCount: 143, icon: "🎓" },
      { title: "Quick Response Practice", stage: "Stage 3", accessCount: 128, icon: "⚡" }
    ]
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
                <Shield className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-primary via-primary to-primary/80 bg-clip-text text-transparent">
                  Admin dashboard
                </h1>
                <p className="text-lg text-muted-foreground font-light">
                  Welcome back, {userProfile?.first_name || 'Administrator'}
                </p>
              </div>
            </div>
            
            {/* Filter Controls */}
            <div className="flex items-center gap-3">
              <Select defaultValue="alltime">
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder="Select time range" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="yesterday">Yesterday</SelectItem>
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

      {/* User Count Metrics */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-gradient-to-br from-card to-green-500/5 dark:bg-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overviewData.totalUsers.toLocaleString()}</div>
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
            <div className="text-2xl font-bold">{overviewData.students.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              {Math.round((overviewData.students / overviewData.totalUsers) * 100)}% of total users
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-card to-green-500/5 dark:bg-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Teachers</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overviewData.teachers.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              {Math.round((overviewData.teachers / overviewData.totalUsers) * 100)}% of total users
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-card to-green-500/5 dark:bg-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Today</CardTitle>
            <PlayCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overviewData.activeUsersToday}</div>
            <p className="text-xs text-muted-foreground">
              Practice lessons engagement
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Learn Feature Usage Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            Learn Feature Usage Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Today's Access</span>
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 bg-blue-500 rounded-full"></div>
                  <span className="text-lg font-bold">{overviewData.learnFeatureUsage.today}</span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Users who accessed Learn feature today
              </p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">This Week</span>
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 bg-green-500 rounded-full"></div>
                  <span className="text-lg font-bold">{overviewData.learnFeatureUsage.thisWeek.toLocaleString()}</span>
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
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5" />
            Most Accessed Practice Lessons
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {overviewData.mostAccessedLessons.map((lesson, index) => (
              <div key={index} className="flex items-center justify-between p-3 rounded-lg border hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center text-lg">
                    {lesson.icon}
                  </div>
                  <div>
                    <h3 className="font-medium text-sm">{lesson.title}</h3>
                    <p className="text-xs text-muted-foreground">{lesson.stage}</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold">{lesson.accessCount}</div>
                  <p className="text-xs text-muted-foreground">accesses</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}; 