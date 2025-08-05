import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  TrendingUp, 
  Award, 
  Target, 
  BookOpen, 
  CheckCircle, 
  Star,
  Clock,
  Trophy,
  BarChart3,
  Map,
  Lock,
  Calendar,
  Flame,
  Timer,
  Users,
  MessageCircle,
  Brain,
  Sparkles,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { BASE_API_URL, API_ENDPOINTS } from '@/config/api';
import { Alert, AlertDescription } from '@/components/ui/alert';

// TypeScript interfaces for the actual API response
interface ApiCurrentStage {
  id: number;
  name: string;
  subtitle: string;
  progress: number;
}

interface ApiExercise {
  name: string;
  status: string;
  progress: number;
  attempts: number;
  topics: number;
  completed_topics: number;
}

interface ApiStage {
  stage_id: number;
  name: string;
  subtitle: string;
  completed: boolean;
  progress: number;
  exercises: ApiExercise[];
  started_at: string | null;
  completed_at: string | null;
  unlocked: boolean;
  total_topics: number;
  completed_topics: number;
}

interface ApiAchievement {
  name: string;
  icon: string;
  date: string;
  color: string;
  description: string;
}

interface ApiResponse {
  success: boolean;
  data: {
    current_stage: ApiCurrentStage;
    overall_progress: number;
    total_progress: number;
    streak_days: number;
    total_practice_time: number;
    total_exercises_completed: number;
    longest_streak: number;
    average_session_duration: number;
    weekly_learning_hours: number;
    monthly_learning_hours: number;
    first_activity_date: string;
    last_activity_date: string;
    stages: ApiStage[];
    achievements: ApiAchievement[];
    fluency_trend: number[];
    unlocked_content: any[];
    total_completed_stages: number;
    total_completed_exercises: number;
    total_learning_units: number;
    total_completed_units: number;
  };
  error: string | null;
  message: string;
}

// Transformed interfaces for component use
interface CurrentStage {
  number: number;
  name: string;
  description: string;
  stageProgress: number;
  overallProgress: number;
  dayStreak: number;
  completedExercises: number;
  totalPracticeTime: string;
}

interface LearningPathStage {
  id: number;
  name: string;
  description: string;
  progress: number;
  isUnlocked: boolean;
  isCompleted: boolean;
  isActive: boolean;
}

interface CompletionOverview {
  stagesCompleted: number;
  exercisesCompleted: number;
  topicsMastered: number;
}

interface Achievement {
  id: number;
  name: string;
  date: string;
  icon: string;
  isCompleted: boolean;
}

interface LearningStats {
  totalLearningTime: string;
  dayStreak: number;
  bestLearningStreak: number;
  avgLearningSession: string;
}

interface ProgressData {
  currentStage: CurrentStage;
  learningPath: LearningPathStage[];
  completionOverview: CompletionOverview;
  achievements: Achievement[];
  learningStats: LearningStats;
}

export const AIStudentProgress: React.FC = () => {
  const { user } = useAuth();
  const [progressData, setProgressData] = useState<ProgressData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Map icon strings to actual icon components
  const getIconComponent = (iconName: string) => {
    const iconMap: { [key: string]: React.ComponentType<any> } = {
      'flame': Flame,
      'trophy': Trophy,
      'star': Star,
      'award': Award,
      'target': Target,
    };
    return iconMap[iconName.toLowerCase()] || Flame;
  };

  // Transform API response to component format
  const transformApiResponse = (apiData: ApiResponse['data']): ProgressData => {
    // Transform current stage (API values are already percentages)
    const currentStage: CurrentStage = {
      number: apiData.current_stage.id,
      name: apiData.current_stage.name,
      description: apiData.current_stage.subtitle,
      stageProgress: Math.round(apiData.current_stage.progress * 10) / 10,
      overallProgress: Math.round(apiData.overall_progress * 10) / 10,
      dayStreak: apiData.streak_days,
      completedExercises: apiData.total_exercises_completed,
      totalPracticeTime: `${(apiData.total_practice_time / 60).toFixed(1)}h`
    };

    // Transform learning path stages (API values are already percentages)
    const learningPath: LearningPathStage[] = apiData.stages.map(stage => ({
      id: stage.stage_id,
      name: stage.name,
      description: stage.subtitle,
      progress: Math.round(stage.progress * 10) / 10,
      isUnlocked: stage.unlocked,
      isCompleted: stage.completed,
      isActive: stage.stage_id === apiData.current_stage.id
    }));

    // Transform completion overview
    const completionOverview: CompletionOverview = {
      stagesCompleted: apiData.total_completed_stages,
      exercisesCompleted: apiData.total_completed_exercises,
      topicsMastered: apiData.total_completed_units
    };

    // Transform achievements
    const achievements: Achievement[] = apiData.achievements.map((achievement, index) => ({
      id: index + 1,
      name: achievement.name,
      date: achievement.date,
      icon: achievement.icon,
      isCompleted: true
    }));

    // Transform learning stats
    const learningStats: LearningStats = {
      totalLearningTime: `${(apiData.total_practice_time / 60).toFixed(1)}h`,
      dayStreak: apiData.streak_days,
      bestLearningStreak: apiData.longest_streak,
      avgLearningSession: `${Math.round(apiData.average_session_duration)}m`
    };

    return {
      currentStage,
      learningPath,
      completionOverview,
      achievements,
      learningStats
    };
  };

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
        throw new Error(`Failed to fetch progress data: ${response.status} ${response.statusText}`);
      }

      const apiResponse: ApiResponse = await response.json();
      
      if (!apiResponse.success) {
        throw new Error(apiResponse.error || 'Failed to fetch progress data');
      }

      const transformedData = transformApiResponse(apiResponse.data);
      setProgressData(transformedData);
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

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center py-12">
          <div className="flex items-center gap-3">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <span className="text-lg">Loading your progress...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {error}
            <Button 
              variant="outline" 
              size="sm" 
              className="ml-2"
              onClick={fetchProgressData}
            >
              Try Again
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!progressData) {
    return (
      <div className="space-y-6">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            No progress data available.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const { currentStage, learningPath, completionOverview, achievements, learningStats } = progressData;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-primary/5 rounded-3xl"></div>
        <div className="relative p-8 rounded-3xl">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-primary/10 to-primary/20 rounded-2xl flex items-center justify-center">
                <BarChart3 className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-primary via-primary to-primary/80 bg-clip-text text-transparent">
                  Learning Progress
                </h1>
                <p className="text-lg text-muted-foreground font-light">
                  Track your journey through language learning stages and achievements.
                </p>
              </div>
            </div>
            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
              <Sparkles className="h-3 w-3 mr-1" />
              Stage {currentStage.number}
            </Badge>
          </div>
        </div>
      </div>

      {/* Current Stage Stats Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="relative overflow-hidden bg-gradient-to-br from-card to-green-500/5 dark:bg-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Stage Progress</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{currentStage.stageProgress}%</div>
            <p className="text-xs text-muted-foreground">
              Current stage completion
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-card to-green-500/5 dark:bg-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overall Progress</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{currentStage.overallProgress}%</div>
            <p className="text-xs text-muted-foreground">
              Total learning progress
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-card to-green-500/5 dark:bg-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Day Streak</CardTitle>
            <Flame className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{currentStage.dayStreak}</div>
            <p className="text-xs text-muted-foreground">
              Days in a row
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-card to-green-500/5 dark:bg-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Practice Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{currentStage.totalPracticeTime}</div>
            <p className="text-xs text-muted-foreground">
              Total time spent
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Current Stage Details */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Current Stage: {currentStage.name}
          </CardTitle>
        </CardHeader>
        <CardContent>
                     <div className="space-y-4">
             <div className="flex items-center justify-between">
               <div>
                 <h3 className="font-semibold">{currentStage.description}</h3>
                 <p className="text-sm text-muted-foreground">
                   You're currently working on building your daily conversation skills.
                 </p>
               </div>
               <div className="text-right">
                 <div className="text-2xl font-bold text-primary">{currentStage.completedExercises}</div>
                 <div className="text-sm text-muted-foreground">Exercises Completed</div>
               </div>
             </div>
           </div>
        </CardContent>
      </Card>

      {/* Learning Path */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Map className="h-5 w-5" />
            Learning Path
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {learningPath.map((stage, index) => (
              <div 
                key={stage.id}
                className={`flex items-center justify-between p-4 border rounded-lg transition-colors ${
                  stage.isActive 
                    ? 'bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800' 
                    : stage.isUnlocked
                    ? 'hover:bg-gray-50 dark:hover:bg-gray-800'
                    : 'opacity-50 bg-gray-50 dark:bg-gray-900'
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
                    stage.isActive 
                      ? 'bg-green-500 text-white' 
                      : stage.isCompleted
                      ? 'bg-green-400 text-white'
                      : stage.isUnlocked
                      ? 'bg-primary/10 text-primary'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                  }`}>
                    {stage.isCompleted ? <CheckCircle className="h-5 w-5" /> : 
                     !stage.isUnlocked ? <Lock className="h-5 w-5" /> : 
                     stage.id}
                  </div>
                  <div>
                    <h3 className="font-semibold">{stage.name}</h3>
                    <p className="text-sm text-muted-foreground">{stage.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  {stage.isActive && (
                    <Badge variant="default" className="bg-green-500 text-white">
                      Active
                    </Badge>
                  )}
                                     <div className="text-right min-w-[80px]">
                     <div className="font-semibold">{stage.progress}%</div>
                     <div className="w-20 mt-1">
                       <Progress 
                         value={stage.progress} 
                         className="h-2 bg-gray-200 dark:bg-gray-700 [&>div]:bg-green-500"
                       />
                     </div>
                   </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Completion Overview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5" />
              Completion Overview
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
                                      <div className="flex items-center gap-4">
               <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center">
                 <Target className="h-6 w-6 text-purple-600 dark:text-purple-400" />
               </div>
               <div className="flex-1">
                 <div className="flex items-center justify-between">
                   <span className="font-medium">Stages Completed</span>
                   <span className="text-2xl font-bold">{completionOverview.stagesCompleted}</span>
                 </div>
               </div>
             </div>

             <div className="flex items-center gap-4">
               <div className="w-12 h-12 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center">
                 <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
               </div>
               <div className="flex-1">
                 <div className="flex items-center justify-between">
                   <span className="font-medium">Exercises Completed</span>
                   <span className="text-2xl font-bold">{completionOverview.exercisesCompleted}</span>
                 </div>
               </div>
             </div>

             <div className="flex items-center gap-4">
               <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900 rounded-lg flex items-center justify-center">
                 <BookOpen className="h-6 w-6 text-orange-600 dark:text-orange-400" />
               </div>
               <div className="flex-1">
                 <div className="flex items-center justify-between">
                   <span className="font-medium">Topics Mastered</span>
                   <span className="text-2xl font-bold">{completionOverview.topicsMastered}</span>
                 </div>
               </div>
             </div>
          </CardContent>
        </Card>

        {/* Learning Statistics */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Learning Statistics
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center">
                <Clock className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className="font-medium">Total Learning Time</span>
                  <span className="text-2xl font-bold">{learningStats.totalLearningTime}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900 rounded-lg flex items-center justify-center">
                <Flame className="h-6 w-6 text-orange-600 dark:text-orange-400" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className="font-medium">Current Streak</span>
                  <span className="text-2xl font-bold">{learningStats.dayStreak}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-yellow-100 dark:bg-yellow-900 rounded-lg flex items-center justify-center">
                <Trophy className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className="font-medium">Best Streak</span>
                  <span className="text-2xl font-bold">{learningStats.bestLearningStreak}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
                <Timer className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className="font-medium">Avg. Session</span>
                  <span className="text-2xl font-bold">{learningStats.avgLearningSession}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Achievements */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5" />
            Recent Achievements
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {achievements.length > 0 ? achievements.map((achievement) => {
              const IconComponent = getIconComponent(achievement.icon);
              return (
                <div key={achievement.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-orange-500 rounded-lg flex items-center justify-center">
                      <IconComponent className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold">{achievement.name}</h3>
                      <p className="text-sm text-muted-foreground">{achievement.date}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="default" className="bg-green-100 text-green-800">
                      Completed
                    </Badge>
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  </div>
                </div>
              );
            }) : (
              <div className="text-center py-8">
                <Trophy className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <p className="text-muted-foreground">No achievements yet. Keep learning to earn your first achievement!</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}; 