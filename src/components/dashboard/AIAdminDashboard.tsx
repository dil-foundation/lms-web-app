import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Bot, 
  Brain, 
  Zap, 
  Target, 
  Sparkles, 
  MessageCircle,
  TrendingUp,
  BookOpen,
  Users,
  Clock,
  CheckCircle,
  Star,
  PlayCircle,
  FileText,
  BarChart3,
  Settings,
  Shield,
  AlertTriangle,
  Activity,
  Database,
  Server,
  Cpu,
  HardDrive
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
  // Mock AI data for demonstration
  const mockAIData = {
    totalAIUsers: 1247,
    aiSystemUptime: 99.8,
    dailyInteractions: 8943,
    modelsDeployed: 12,
    avgResponseTime: 1.2,
    totalCost: 2847.50,
    safetyScore: 96,
    userSatisfaction: 4.7
  };

  const mockAIModels = [
    { name: "GPT-4o Mini", type: "Language Model", status: "Active", usage: 87, performance: "Excellent" },
    { name: "Claude 3.5 Sonnet", type: "Language Model", status: "Active", usage: 92, performance: "Excellent" },
    { name: "Vision AI", type: "Image Analysis", status: "Active", usage: 45, performance: "Good" },
    { name: "Speech-to-Text", type: "Audio Processing", status: "Maintenance", usage: 0, performance: "N/A" },
  ];

  const mockAIAlerts = [
    { id: 1, type: "warning", message: "High API usage detected", timestamp: "2 min ago", severity: "Medium" },
    { id: 2, type: "info", message: "New AI model deployed successfully", timestamp: "1 hour ago", severity: "Low" },
    { id: 3, type: "error", message: "Safety filter triggered 3 times", timestamp: "3 hours ago", severity: "High" },
  ];

  const mockUsageStats = [
    { category: "Content Generation", usage: 89, trend: "up" },
    { category: "Student Support", usage: 76, trend: "up" },
    { category: "Grading & Assessment", usage: 82, trend: "stable" },
    { category: "Analytics & Insights", usage: 67, trend: "up" },
  ];

  const mockSystemHealth = [
    { component: "AI API Gateway", status: "healthy", uptime: 99.9 },
    { component: "Model Servers", status: "healthy", uptime: 99.8 },
    { component: "Data Pipeline", status: "warning", uptime: 97.2 },
    { component: "Safety Systems", status: "healthy", uptime: 100 },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <Bot className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              AI Platform Control Center
            </h1>
            <p className="text-muted-foreground">
              Welcome, {userProfile.first_name}! Monitor and manage your AI infrastructure.
            </p>
          </div>
        </div>
        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
          <Sparkles className="h-3 w-3 mr-1" />
          AI Mode Active
        </Badge>
      </div>

      {/* AI Stats Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="relative overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active AI Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mockAIData.totalAIUsers.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              +12% from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Uptime</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mockAIData.aiSystemUptime}%</div>
            <p className="text-xs text-muted-foreground">
              Last 30 days
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Daily Interactions</CardTitle>
            <MessageCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mockAIData.dailyInteractions.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Today
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Safety Score</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mockAIData.safetyScore}/100</div>
            <p className="text-xs text-muted-foreground">
              AI Safety Rating
            </p>
          </CardContent>
        </Card>
      </div>

      {/* AI Models Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            AI Models Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {mockAIModels.map((model, index) => (
              <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Server className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-medium">{model.name}</h3>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Badge variant="outline" className="text-xs">{model.type}</Badge>
                      <span>{model.usage}% usage</span>
                      <span>•</span>
                      <span>{model.performance}</span>
                    </div>
                  </div>
                </div>
                <Badge 
                  variant={model.status === 'Active' ? 'default' : model.status === 'Maintenance' ? 'secondary' : 'outline'}
                  className="text-xs"
                >
                  {model.status}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* System Health */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            System Health Monitor
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {mockSystemHealth.map((system, index) => (
              <div key={index} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{system.component}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">{system.uptime}%</span>
                    <Badge 
                      variant={system.status === 'healthy' ? 'default' : 'secondary'}
                      className="text-xs"
                    >
                      {system.status}
                    </Badge>
                  </div>
                </div>
                <Progress value={system.uptime} className="h-2" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* AI Alerts */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            AI System Alerts
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {mockAIAlerts.map((alert) => (
              <div key={alert.id} className="p-4 border rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {alert.type === 'error' && <AlertTriangle className="h-4 w-4 text-red-500" />}
                    {alert.type === 'warning' && <AlertTriangle className="h-4 w-4 text-yellow-500" />}
                    {alert.type === 'info' && <CheckCircle className="h-4 w-4 text-blue-500" />}
                    <span className="text-sm font-medium">{alert.message}</span>
                  </div>
                  <Badge 
                    variant={alert.severity === 'High' ? 'destructive' : alert.severity === 'Medium' ? 'secondary' : 'outline'}
                    className="text-xs"
                  >
                    {alert.severity}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">{alert.timestamp}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Usage Statistics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            AI Usage Statistics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {mockUsageStats.map((stat, index) => (
              <div key={index} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{stat.category}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">{stat.usage}%</span>
                    {stat.trend === 'up' && <TrendingUp className="h-4 w-4 text-green-500" />}
                    {stat.trend === 'stable' && <div className="h-4 w-4 bg-yellow-500 rounded-full" />}
                  </div>
                </div>
                <Progress value={stat.usage} className="h-2" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Settings className="h-5 w-5 text-blue-500" />
              AI Configuration
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Configure AI models, parameters, and system settings.
            </p>
            <Button className="w-full">
              Open Settings
            </Button>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Shield className="h-5 w-5 text-orange-500" />
              Safety & Ethics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Monitor AI safety measures and ethical compliance.
            </p>
            <Button className="w-full" variant="outline">
              Review Safety
            </Button>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-purple-500" />
              Analytics Dashboard
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              View detailed AI usage analytics and performance metrics.
            </p>
            <Button className="w-full" variant="outline">
              View Analytics
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}; 