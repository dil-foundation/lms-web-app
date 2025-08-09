import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, Flag, Play, Users, Lightbulb, ArrowRight, BookOpen, GraduationCap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function StageThree() {
  const navigate = useNavigate();

  const practiceActivities = [
    {
      id: 'storytelling',
      title: 'Storytelling Practice',
      description: 'Practice describing your daily activities and personal experiences in detail',
      icon: BookOpen,
      path: '/dashboard/practice/stage-3/storytelling',
      color: 'bg-green-500'
    },
    {
      id: 'group-dialogue',
      title: 'Group Dialogue with AI Persons',
      description: 'Engage in group conversations with AI personas, discussing various topics and viewpoints',
      icon: Users,
      path: '/dashboard/practice/stage-3/group-dialogue',
      color: 'bg-green-500'
    },
    {
      id: 'problem-solving',
      title: 'Problem-Solving Simulations',
      description: 'Participate in simulations of real-world scenarios, practicing problem-solving and decision-making',
      icon: Lightbulb,
      path: '/dashboard/practice/stage-3/problem-solving',
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
            className="shrink-0 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md hover:shadow-primary/10 hover:bg-primary/5 hover:border-primary/30 hover:text-primary"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          
          <div className="text-center flex-1">
            <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-2">
              <GraduationCap className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <h1 className="text-2xl font-bold">Stage 3</h1>
            <p className="text-muted-foreground">B1 Intermediate Level</p>
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
                Describe experiences, share opinions, and handle familiar topics confidently
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
                Complete these activities to improve your intermediate English skills
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 