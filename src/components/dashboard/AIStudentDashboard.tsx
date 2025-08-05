import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Bot, 
  Brain, 
  Target, 
  Sparkles, 
  TrendingUp,
  BookOpen,
  Award,
  Clock,
  CheckCircle,
  Star,
  PlayCircle,
  Calendar,
  Mic,
  MessageCircle,
  ChevronRight,
  Flame,
  Trophy,
  ArrowRight,
  Loader2,
  XCircle
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { BASE_API_URL, API_ENDPOINTS } from '@/config/api';

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

interface ProgressData {
  current_stage: {
    id: number;
    name: string;
    subtitle: string;
    progress: number;
  };
  overall_progress: number;
  stages: Array<{
    stage_id: number;
    name: string;
    subtitle: string;
    progress: number;
    unlocked: boolean;
    completed: boolean;
  }>;
  streak_days: number;
  total_exercises_completed: number;
  total_practice_time: number;
  achievements: Array<{
    name: string;
    date: string;
    icon: string;
  }>;
}

interface PracticeActivity {
  id: string;
  title: string;
  description: string;
  stage: number;
  type: 'practice' | 'assessment';
  icon: React.ComponentType;
  route: string;
  progress?: number;
  isUnlocked: boolean;
  estimatedTime: string;
}

export const AIStudentDashboard = ({ userProfile }: AIStudentDashboardProps) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [progressData, setProgressData] = useState<ProgressData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Define practice activities for Stage 1 and Stage 2
  const practiceActivities: PracticeActivity[] = [
    {
      id: 'stage1-repeat',
      title: 'Repeat After Me',
      description: 'Practice pronunciation with clear audio examples',
      stage: 1,
      type: 'practice',
      icon: Mic,
      route: '/dashboard/practice/stage-1/repeat-after-me',
      isUnlocked: true,
      estimatedTime: '15 min'
    },
    {
      id: 'stage1-quick-response',
      title: 'Quick Response',
      description: 'Build confidence with rapid response exercises',
      stage: 1,
      type: 'practice',
      icon: MessageCircle,
      route: '/dashboard/practice/stage-1/quick-response',
      isUnlocked: true,
      estimatedTime: '20 min'
    },
    {
      id: 'stage2-daily-routine',
      title: 'Daily Routine',
      description: 'Learn essential daily conversation phrases',
      stage: 2,
      type: 'practice',
      icon: Calendar,
      route: '/dashboard/practice/stage-2/daily-routine',
      isUnlocked: true,
      estimatedTime: '25 min'
    },
    {
      id: 'stage2-listen-reply',
      title: 'Listen and Reply',
      description: 'Improve listening comprehension and response skills',
      stage: 2,
      type: 'practice',
      icon: Brain,
      route: '/dashboard/practice/stage-1/listen-and-reply',
      isUnlocked: true,
      estimatedTime: '30 min'
    }
  ];

  // Fetch progress data
  const fetchProgressData = async () => {
    if (!user?.id) {
      setError('User ID not available');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`${BASE_API_URL}${API_ENDPOINTS.COMPREHENSIVE_PROGRESS}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: user.id
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch progress data: ${response.status}`);
      }

      const apiResponse = await response.json();
      
      if (!apiResponse.success) {
        throw new Error(apiResponse.error || 'Failed to fetch progress data');
      }

      setProgressData(apiResponse.data);
    } catch (err) {
      console.error('Error fetching progress data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load progress data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProgressData();
  }, [user?.id]);

  const handleActivityClick = (activity: PracticeActivity) => {
    navigate(activity.route);
  };

  const getStageProgress = (stageId: number) => {
    if (!progressData) return 0;
    const stage = progressData.stages.find(s => s.stage_id === stageId);
    return stage ? Math.round(stage.progress) : 0;
  };

  const isStageUnlocked = (stageId: number) => {
    if (!progressData) return stageId <= 1; // Stage 1 always unlocked
    const stage = progressData.stages.find(s => s.stage_id === stageId);
    return stage ? stage.unlocked : false;
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center py-12">
          <div className="flex items-center gap-3">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <span className="text-lg">Loading your AI learning overview...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <div className="text-center space-y-4">
                             <div className="text-red-500">
                 <div className="flex justify-center mb-4">
                   <XCircle size={48} />
                 </div>
                 <h3 className="text-lg font-semibold">Unable to load progress data</h3>
                 <p className="text-sm text-muted-foreground mt-2">{error}</p>
               </div>
              <Button onClick={fetchProgressData} className="mt-4">
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentStage = progressData?.current_stage;
  const overallProgress = progressData?.overall_progress || 0;
  const streak = progressData?.streak_days || 0;
  const practiceTime = progressData?.total_practice_time || 0;
  const exercisesCompleted = progressData?.total_exercises_completed || 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-primary/5 rounded-3xl"></div>
        <div className="relative p-8 rounded-3xl">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-primary/10 to-primary/20 rounded-2xl flex items-center justify-center">
                <Bot className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-primary via-primary to-primary/80 bg-clip-text text-transparent">
                  AI Overview
                </h1>
                <p className="text-lg text-muted-foreground font-light">
                  Welcome back, {userProfile.first_name}! Track your learning progress.
                </p>
              </div>
            </div>
            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
              <Sparkles className="h-3 w-3 mr-1" />
              AI Learning Active
            </Badge>
          </div>
        </div>
      </div>

             {/* Progress Summary Cards */}
       <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
         <Card className="bg-gradient-to-br from-card to-green-500/5">
           <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
             <CardTitle className="text-sm font-medium">Current Stage</CardTitle>
             <Target className="h-4 w-4 text-muted-foreground" />
           </CardHeader>
           <CardContent>
             <div className="text-2xl font-bold">{currentStage?.name || 'Loading...'}</div>
             <p className="text-xs text-muted-foreground">
               {Math.round(currentStage?.progress || 0)}% complete
             </p>
             <Progress value={currentStage?.progress || 0} className="h-1 mt-2" />
           </CardContent>
         </Card>

         <Card className="bg-gradient-to-br from-card to-green-500/5">
           <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
             <CardTitle className="text-sm font-medium">Overall Progress</CardTitle>
             <TrendingUp className="h-4 w-4 text-muted-foreground" />
           </CardHeader>
           <CardContent>
             <div className="text-2xl font-bold">{Math.round(overallProgress)}%</div>
             <p className="text-xs text-muted-foreground">
               Learning journey
             </p>
             <Progress value={overallProgress} className="h-1 mt-2" />
           </CardContent>
         </Card>

         <Card className="bg-gradient-to-br from-card to-green-500/5">
           <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
             <CardTitle className="text-sm font-medium">Learning Streak</CardTitle>
             <Flame className="h-4 w-4 text-muted-foreground" />
           </CardHeader>
           <CardContent>
             <div className="text-2xl font-bold">{streak}</div>
             <p className="text-xs text-muted-foreground">
               Days in a row
             </p>
           </CardContent>
         </Card>

         <Card className="bg-gradient-to-br from-card to-green-500/5">
           <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
             <CardTitle className="text-sm font-medium">Practice Time</CardTitle>
             <Clock className="h-4 w-4 text-muted-foreground" />
           </CardHeader>
           <CardContent>
             <div className="text-2xl font-bold">{(practiceTime / 60).toFixed(1)}h</div>
             <p className="text-xs text-muted-foreground">
               Total practice
             </p>
           </CardContent>
         </Card>
       </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Continue Learning */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PlayCircle className="h-5 w-5 text-green-500" />
              Continue Learning
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-medium">{currentStage?.name}</h3>
                <Badge variant="secondary">{Math.round(currentStage?.progress || 0)}%</Badge>
              </div>
              <p className="text-sm text-muted-foreground mb-3">
                {currentStage?.subtitle}
              </p>
                             <Button 
                 className="w-full bg-green-500 hover:bg-green-600" 
                 onClick={() => {
                   const stageId = currentStage?.id;
                   if (stageId) {
                     navigate(`/dashboard/practice/stage-${stageId}`);
                   } else {
                     navigate('/dashboard/ai-practice');
                   }
                 }}
               >
                 Continue Learning
                 <ArrowRight className="ml-2 h-4 w-4" />
               </Button>
            </div>
          </CardContent>
        </Card>

        {/* Learning Stats */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-yellow-500" />
              Learning Stats
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span className="text-sm">Exercises Completed</span>
              </div>
              <span className="font-semibold">{exercisesCompleted}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Star className="h-4 w-4 text-yellow-500" />
                <span className="text-sm">Achievements</span>
              </div>
              <span className="font-semibold">{progressData?.achievements?.length || 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-blue-500" />
                <span className="text-sm">Active Stages</span>
              </div>
              <span className="font-semibold">
                {progressData?.stages?.filter(s => s.unlocked).length || 0}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Featured Practice Activities */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            Featured Practice Activities
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Start practicing with these interactive exercises
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {practiceActivities.map((activity) => {
              const stageProgress = getStageProgress(activity.stage);
              const isUnlocked = isStageUnlocked(activity.stage);
              
              return (
                <div
                  key={activity.id}
                  className={`p-4 border rounded-lg transition-all hover:shadow-md ${
                    isUnlocked 
                      ? 'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800' 
                      : 'opacity-50 cursor-not-allowed'
                  }`}
                  onClick={() => isUnlocked && handleActivityClick(activity)}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${
                        activity.stage === 1 ? 'bg-blue-100 dark:bg-blue-900' : 'bg-green-100 dark:bg-green-900'
                      }`}>
                        <activity.icon className={`h-4 w-4 ${
                          activity.stage === 1 ? 'text-blue-600 dark:text-blue-400' : 'text-green-600 dark:text-green-400'
                        }`} />
                      </div>
                      <div>
                        <h3 className="font-medium">{activity.title}</h3>
                        <p className="text-sm text-muted-foreground">{activity.description}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge variant="outline" className="mb-1">
                        Stage {activity.stage}
                      </Badge>
                      <p className="text-xs text-muted-foreground">{activity.estimatedTime}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Progress value={stageProgress} className="h-1 w-20" />
                      <span className="text-xs text-muted-foreground">{stageProgress}%</span>
                    </div>
                    {isUnlocked && (
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          
                     <div className="mt-6 text-center">
             <Button variant="outline" onClick={() => navigate('/dashboard/ai-practice')}>
               View All Practice Activities
               <ArrowRight className="ml-2 h-4 w-4" />
             </Button>
           </div>
        </CardContent>
      </Card>

      
    </div>
  );
}; 