import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, Flag, Play, Rocket, Users, Lightbulb, ArrowRight, GraduationCap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function StageSix() {
  const navigate = useNavigate();

  const practiceActivities = [
    {
      id: 'spontaneous-speech',
      title: 'AI-Guided Spontaneous Speech',
      description: 'Practice real-time conversations with AI, focusing on natural flow and quick thinking',
      icon: Rocket,
      path: '/dashboard/practice/stage-6/spontaneous-speech',
      color: 'bg-green-500'
    },
    {
      id: 'sensitive-scenario',
      title: 'Roleplay: Handle a Sensitive Scenario',
      description: 'Simulate real-world interviews to improve fluency and confidence',
      icon: Users,
      path: '/dashboard/practice/stage-6/sensitive-scenario',
      color: 'bg-green-500'
    },
    {
      id: 'opinion-builder',
      title: 'Critical Opinion Builder',
      description: 'Develop and articulate complex opinions on various topics, supported by evidence and logic',
      icon: Lightbulb,
      path: '/dashboard/practice/stage-6/opinion-builder',
      color: 'bg-green-500'
    }
  ];

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigate('/dashboard/ai-practice')}
            className="shrink-0"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          
          <div className="text-center flex-1">
            <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-2">
              <GraduationCap className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <h1 className="text-2xl font-bold">Stage 6</h1>
            <p className="text-muted-foreground">C2 Proficiency Level</p>
          </div>
          
          <div className="w-10"></div>
        </div>

        {/* Learning Goal */}
        <Card className="mb-6 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
          <CardContent className="p-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <Flag className="h-8 w-8 text-green-600 dark:text-green-400" />
              </div>
              <h2 className="text-xl font-bold mb-3">Your Learning Goal</h2>
              <p className="text-muted-foreground leading-relaxed">
                Master real-time fluency, advanced argumentation, and nuanced emotional communication
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Practice Activities Header */}
        <div className="flex items-center space-x-2 mb-4">
          <div className="w-8 h-8 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
            <Play className="h-4 w-4 text-green-600 dark:text-green-400" />
          </div>
          <h2 className="text-lg font-semibold">Practice Activities</h2>
        </div>

        {/* Practice Activities */}
        <div className="space-y-4">
          {practiceActivities.map((activity) => (
            <Card 
              key={activity.id}
              className="overflow-hidden cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => navigate(activity.path)}
            >
              <CardContent className="p-0">
                <div className={`${activity.color} p-6 text-white`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                        <activity.icon className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <h3 className="text-xl font-semibold mb-1">{activity.title}</h3>
                        <p className="text-green-100 text-sm leading-relaxed">
                          {activity.description}
                        </p>
                      </div>
                    </div>
                    <ArrowRight className="h-6 w-6 text-white/80" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Progress Info */}
        <Card className="mt-6 bg-muted/50">
          <CardContent className="p-4">
            <div className="text-center">
              <p className="text-sm text-muted-foreground">
                Complete these activities to achieve native-level English proficiency
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 