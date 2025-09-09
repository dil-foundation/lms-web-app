import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Bot, 
  Send, 
  Zap, 
  CheckCircle, 
  FileText, 
  Activity, 
  Shield, 
  Users, 
  BookOpen, 
  TrendingUp,
  MessageSquare,
  MessageCircle,
  BarChart3,
  Settings,
  GraduationCap,
  Clock,
  Award,
  Target,
  Brain,
  Mic,
  Calendar,
  Trophy,
  Lightbulb,
  RotateCcw,
  Unlock
} from 'lucide-react';
import { ReportsChatbot } from '@/components/reports/ReportsChatbot';

export const IRISv2 = () => {
  const [selectedPlatform, setSelectedPlatform] = useState<'ai_tutor' | 'lms'>('lms');

  // Platform-specific quick actions (AI Tutor tables)
  const aiTutorActions = [
    {
      title: "Daily Learning Analytics",
      description: "KPIs from daily analytics table",
      icon: BarChart3,
      prompt: "Show me daily learning analytics for AI Tutor platform"
    },
    {
      title: "Learning Milestones",
      description: "Achievements unlocked by users",
      icon: Trophy,
      prompt: "Give me a report on learning milestones and achievements"
    },
    {
      title: "Learning Unlocks",
      description: "Stages/topics users unlocked",
      icon: Unlock,
      prompt: "Show me learning unlocks and topic progression"
    },
    {
      title: "Exercise Progress",
      description: "Completion & accuracy by exercise",
      icon: Target,
      prompt: "Generate exercise progress and completion analytics"
    },
    {
      title: "User Progress Summary",
      description: "Overall learner progression",
      icon: TrendingUp,
      prompt: "Give me a list of students and their progress"
    },
    {
      title: "Weekly Summary",
      description: "Weekly learning highlights",
      icon: Calendar,
      prompt: "Give me this week's learning analytics summary"
    }
  ];

  const lmsActions = [
    {
      title: "Course Management",
      description: "Create & manage courses",
      icon: BookOpen,
      prompt: "Give me a list of courses and their enrollment status"
    },
    {
      title: "Student Analytics",
      description: "Track student engagement",
      icon: Users,
      prompt: "Give me a list of students registered on the platform"
    },
    {
      title: "Teacher Overview",
      description: "Review teacher activity",
      icon: GraduationCap,
      prompt: "Give me a list of teachers we have"
    },
    {
      title: "Admin Users",
      description: "View admin accounts",
      icon: Shield,
      prompt: "Show me a list of admin users"
    },
    {
      title: "Learning Outcomes",
      description: "Assess course effectiveness",
      icon: Trophy,
      prompt: "Generate learning outcomes and course effectiveness report"
    },
    {
      title: "Content Management Analytics",
      description: "Analyze course content & structure",
      icon: FileText,
      prompt: "Show me content management and course structure analytics"
    }
  ];

  const currentActions = selectedPlatform === 'ai_tutor' ? aiTutorActions : lmsActions;

  // Handle quick action clicks
  const handleQuickAction = (prompt: string) => {
    // We'll need to communicate with the ReportsChatbot component
    // For now, we can dispatch a custom event that the chatbot can listen to
    const event = new CustomEvent('quickActionSelected', { 
      detail: { prompt } 
    });
    window.dispatchEvent(event);
  };

  // Handle reset chat
  const handleResetChat = () => {
    const event = new CustomEvent('resetChatRequested');
    window.dispatchEvent(event);
  };

  return (
    <div className="space-y-6">
      {/* IRIS Header */}
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-primary/5 rounded-3xl"></div>
        <div className="relative p-8 rounded-3xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-primary/10 to-primary/20 rounded-2xl flex items-center justify-center">
                <Bot className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-primary via-primary to-primary/80 bg-clip-text text-transparent" style={{ lineHeight: '3rem' }}>
                  IRIS
                </h1>
                <p className="text-lg text-muted-foreground font-light">
                  Intelligent Response & Insight System
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 rounded-full border border-primary/20">
                <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
                <span className="text-sm font-medium text-primary">AI Powered</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleResetChat}
                className="h-8 px-3 text-xs hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30"
                title="Reset Chat"
              >
                <RotateCcw className="h-3 w-3 mr-1" />
                Reset
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main IRIS Interface */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* IRIS Chat Interface - Takes up 2 columns */}
        <div className="xl:col-span-2">
          <Card className="border-0 shadow-lg bg-gradient-to-br from-card to-card/95">
            <CardHeader className="border-b bg-gradient-to-r from-primary/5 via-transparent to-primary/5">
              <CardTitle className="flex items-center gap-3">
                <div className="w-8 h-8 bg-gradient-to-br from-primary/10 to-primary/20 rounded-lg flex items-center justify-center">
                  <Bot className="w-4 h-4 text-primary" />
                </div>
                IRIS Chat Interface
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <ReportsChatbot 
                className="h-[750px] w-full border-0 shadow-none"
                minimized={false}
              />
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions Sidebar */}
        <div className="xl:col-span-1 space-y-6">
          {/* Quick Actions */}
          <Card className="border-0 shadow-lg bg-gradient-to-br from-card to-primary/5">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-primary">
                <Zap className="w-4 h-4" />
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 p-4">
              {/* Platform Selector */}
              <div>
                <Select value={selectedPlatform} onValueChange={(value: 'ai_tutor' | 'lms') => setSelectedPlatform(value)}>
                  <SelectTrigger className="w-full bg-background border-border hover:border-primary/30 focus:border-primary">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ai_tutor" className="focus:bg-primary/10 data-[highlighted]:bg-primary/10">
                      <div className="flex items-center gap-2">
                        <Bot className="h-4 w-4 text-primary" />
                        <span>AI Tutor Platform</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="lms" className="focus:bg-secondary/10 data-[highlighted]:bg-secondary/10">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-secondary data-[highlighted]:text-secondary" />
                        <span>LMS Platform</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                {currentActions.map((action, index) => {
                  const IconComponent = action.icon;
                  return (
                    <Button 
                      key={index}
                      variant="ghost" 
                      className="w-full justify-start hover:bg-primary/10 hover:text-primary h-auto py-3 px-3 text-left"
                      onClick={() => handleQuickAction(action.prompt)}
                    >
                      <div className="flex items-start gap-3 w-full min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <IconComponent className="w-4 h-4 text-primary" />
                        </div>
                        <div className="text-left min-w-0 flex-1">
                          <div className="font-medium text-sm leading-tight">{action.title}</div>
                          <div className="text-xs text-muted-foreground leading-tight mt-0.5 break-words">{action.description}</div>
                        </div>
                      </div>
                    </Button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Capabilities */}
          <Card className="border-0 shadow-lg bg-gradient-to-br from-card to-green-50/30 dark:to-green-950/20">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-primary">
                <CheckCircle className="w-4 h-4" />
                Capabilities
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
                <span>User Analytics & Insights</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
                <span>Course Management</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
                <span>System Health Monitoring</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
                <span>Security Analysis</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
                <span>Performance Optimization</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
                <span>Report Generation</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
