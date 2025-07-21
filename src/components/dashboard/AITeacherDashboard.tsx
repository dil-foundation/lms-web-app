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
  BookCheck,
  Settings
} from 'lucide-react';

interface AITeacherDashboardProps {
  userProfile: {
    id: string;
    first_name?: string;
    last_name?: string;
    teacher_id?: string;
  };
}

export const AITeacherDashboard = ({ userProfile }: AITeacherDashboardProps) => {
  // Mock AI data for demonstration
  const mockAIData = {
    aiAssistantUsage: 45,
    contentGenerated: 23,
    studentsHelped: 127,
    gradingAutomated: 89,
    averageEfficiency: 78,
    totalAIInteractions: 156,
    timesSaved: 12.5,
    aiRecommendations: 8
  };

  const mockAITasks = [
    { id: 1, title: "Generate Quiz Questions", type: "Content", status: "Ready", estimatedTime: "2 min", icon: FileText },
    { id: 2, title: "Analyze Student Performance", type: "Analytics", status: "In Progress", estimatedTime: "5 min", icon: BarChart3 },
    { id: 3, title: "Create Lesson Summary", type: "Content", status: "Ready", estimatedTime: "3 min", icon: BookOpen },
    { id: 4, title: "Grade Essay Assignments", type: "Grading", status: "Waiting", estimatedTime: "8 min", icon: BookCheck },
  ];

  const mockStudentInsights = [
    { name: "Sarah Johnson", issue: "Struggling with Algebra", suggestion: "Additional practice problems", confidence: 85 },
    { name: "Mike Chen", issue: "Excellent progress", suggestion: "Advanced challenges", confidence: 92 },
    { name: "Emma Davis", issue: "Needs encouragement", suggestion: "Positive reinforcement", confidence: 78 },
    { name: "Alex Rodriguez", issue: "Learning style mismatch", suggestion: "Visual learning materials", confidence: 81 },
  ];

  const mockAIFeatures = [
    { name: "Smart Grading", usage: 89, trend: "up" },
    { name: "Content Generation", usage: 76, trend: "up" },
    { name: "Student Analytics", usage: 82, trend: "stable" },
    { name: "Lesson Planning", usage: 67, trend: "up" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <Bot className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              AI Teaching Assistant
            </h1>
            <p className="text-muted-foreground">
              Welcome, {userProfile.first_name}! Your AI assistant is ready to help you teach more effectively.
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
        <Card className="relative overflow-hidden bg-gradient-to-br from-card to-green-500/5 dark:bg-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">AI Interactions</CardTitle>
            <MessageCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mockAIData.totalAIInteractions}</div>
            <p className="text-xs text-muted-foreground">
              This week
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-card to-green-500/5 dark:bg-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Content Generated</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mockAIData.contentGenerated}</div>
            <p className="text-xs text-muted-foreground">
              Items this month
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-card to-green-500/5 dark:bg-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Students Helped</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mockAIData.studentsHelped}</div>
            <p className="text-xs text-muted-foreground">
              Total interactions
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-card to-green-500/5 dark:bg-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Time Saved</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mockAIData.timesSaved}h</div>
            <p className="text-xs text-muted-foreground">
              This week
            </p>
          </CardContent>
        </Card>
      </div>

      {/* AI Tasks Queue */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            AI Task Queue
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {mockAITasks.map((task) => (
              <div key={task.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <task.icon className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-medium">{task.title}</h3>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Badge variant="outline" className="text-xs">{task.type}</Badge>
                      <span>{task.estimatedTime}</span>
                      <span>•</span>
                      <Badge 
                        variant={task.status === 'Ready' ? 'default' : task.status === 'In Progress' ? 'secondary' : 'outline'}
                        className="text-xs"
                      >
                        {task.status}
                      </Badge>
                    </div>
                  </div>
                </div>
                <Button size="sm" variant="outline" disabled={task.status === 'In Progress'}>
                  {task.status === 'In Progress' ? 'Processing...' : 'Start'}
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Student Insights */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            AI Student Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {mockStudentInsights.map((insight, index) => (
              <div key={index} className="p-4 border rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-medium">{insight.name}</h3>
                  <Badge variant="outline" className="text-xs">
                    {insight.confidence}% confidence
                  </Badge>
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    <span className="font-medium">Issue:</span> {insight.issue}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    <span className="font-medium">AI Suggestion:</span> {insight.suggestion}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* AI Feature Usage */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            AI Feature Usage
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {mockAIFeatures.map((feature, index) => (
              <div key={index} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{feature.name}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">{feature.usage}%</span>
                    {feature.trend === 'up' && <TrendingUp className="h-4 w-4 text-green-500" />}
                    {feature.trend === 'stable' && <div className="h-4 w-4 bg-yellow-500 rounded-full" />}
                  </div>
                </div>
                <Progress value={feature.usage} className="h-2" />
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
              <Brain className="h-5 w-5 text-blue-500" />
              AI Teaching Assistant
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Get help with lesson planning, content creation, and teaching strategies.
            </p>
            <Button className="w-full">
              Start Chat
            </Button>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Zap className="h-5 w-5 text-orange-500" />
              Content Generator
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Generate quizzes, worksheets, and lesson materials automatically.
            </p>
            <Button className="w-full" variant="outline">
              Generate Content
            </Button>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <BookCheck className="h-5 w-5 text-purple-500" />
              Smart Grading
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Automatically grade assignments and provide detailed feedback.
            </p>
            <Button className="w-full" variant="outline">
              Grade Assignments
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}; 