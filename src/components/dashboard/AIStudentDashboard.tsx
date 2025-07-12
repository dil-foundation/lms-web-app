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
  Award,
  Clock,
  CheckCircle,
  Star,
  PlayCircle,
  Users,
  Calendar
} from 'lucide-react';

type Profile = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  role: string;
  [key: string]: any;
};

interface AIStudentDashboardProps {
  userProfile: Profile;
}

export const AIStudentDashboard = ({ userProfile }: AIStudentDashboardProps) => {
  // Mock AI data for demonstration
  const mockAIData = {
    aiSessions: 12,
    learningStreak: 7,
    skillsImproved: 5,
    studyHours: 24,
    averageScore: 87,
    recommendationsCompleted: 8,
    nextAISession: '2:30 PM',
    activeGoals: 3
  };

  const mockAIRecommendations = [
    { id: 1, title: "Practice JavaScript Functions", type: "Study", difficulty: "Medium", estimatedTime: "30 min", icon: Brain },
    { id: 2, title: "Review Math Concepts", type: "Revision", difficulty: "Easy", estimatedTime: "15 min", icon: Target },
    { id: 3, title: "Interactive Science Quiz", type: "Quiz", difficulty: "Hard", estimatedTime: "45 min", icon: Zap },
  ];

  const mockAIProgress = [
    { skill: "Problem Solving", progress: 85, trend: "up" },
    { skill: "Critical Thinking", progress: 72, trend: "up" },
    { skill: "Memory Retention", progress: 68, trend: "stable" },
    { skill: "Speed Learning", progress: 91, trend: "up" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <Bot className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              AI Learning Hub
            </h1>
            <p className="text-muted-foreground">
              Welcome back, {userProfile.first_name}! Your AI tutor is ready to help you learn.
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
            <CardTitle className="text-sm font-medium">AI Sessions</CardTitle>
            <MessageCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mockAIData.aiSessions}</div>
            <p className="text-xs text-muted-foreground">
              This week
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Learning Streak</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mockAIData.learningStreak}</div>
            <p className="text-xs text-muted-foreground">
              Days in a row
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Skills Improved</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mockAIData.skillsImproved}</div>
            <p className="text-xs text-muted-foreground">
              This month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">AI Study Hours</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mockAIData.studyHours}</div>
            <p className="text-xs text-muted-foreground">
              Hours this month
            </p>
          </CardContent>
        </Card>
      </div>

      {/* AI Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            AI Recommendations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {mockAIRecommendations.map((rec) => (
              <div key={rec.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <rec.icon className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-medium">{rec.title}</h3>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Badge variant="outline" className="text-xs">{rec.type}</Badge>
                      <span>{rec.difficulty}</span>
                      <span>•</span>
                      <span>{rec.estimatedTime}</span>
                    </div>
                  </div>
                </div>
                <Button size="sm" variant="outline">
                  <PlayCircle className="h-4 w-4 mr-2" />
                  Start
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* AI Progress Tracking */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            AI-Powered Skill Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {mockAIProgress.map((skill, index) => (
              <div key={index} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{skill.skill}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">{skill.progress}%</span>
                    {skill.trend === 'up' && <TrendingUp className="h-4 w-4 text-green-500" />}
                    {skill.trend === 'stable' && <div className="h-4 w-4 bg-yellow-500 rounded-full" />}
                  </div>
                </div>
                <Progress value={skill.progress} className="h-2" />
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
              <MessageCircle className="h-5 w-5 text-blue-500" />
              Chat with AI Tutor
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Get instant help with your questions and personalized study guidance.
            </p>
            <Button className="w-full">
              Start Chat
            </Button>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Target className="h-5 w-5 text-orange-500" />
              AI Assessment
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Take an AI-powered assessment to identify your strengths and areas for improvement.
            </p>
            <Button className="w-full" variant="outline">
              Take Assessment
            </Button>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Zap className="h-5 w-5 text-purple-500" />
              Smart Study Plan
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Generate a personalized study plan based on your learning style and goals.
            </p>
            <Button className="w-full" variant="outline">
              Generate Plan
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}; 