import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, GraduationCap, Sun, Zap, Users, Flag, ChevronRight } from 'lucide-react';

const practiceActivities = [
  {
    id: 'daily-routine',
    title: 'Daily Routine Narration',
    description: 'Describe your daily activities in detail',
    icon: Sun,
    bgColor: 'bg-green-500',
  },
  {
    id: 'quick-answer',
    title: 'Quick & Answer Practice',
    description: 'Engage in interactive Q&A sessions',
    icon: Zap,
    bgColor: 'bg-green-500',
  },
  {
    id: 'roleplay-simulation',
    title: 'Roleplay Simulation',
    description: 'Practice ordering food in a restaurant',
    icon: Users,
    bgColor: 'bg-green-500',
  },
];

const ActivityCard = ({ activity, index }) => {
  const navigate = useNavigate();
  
  return (
    <Card 
      className="overflow-hidden shadow-lg transition-all duration-300 hover:scale-105 cursor-pointer"
      onClick={() => navigate(`/dashboard/practice/stage-2/${activity.id}`)}
    >
      <div className={`${activity.bgColor} p-6 text-white relative`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-white/20 rounded-full">
              <activity.icon className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl font-bold">{activity.title}</h3>
            </div>
          </div>
          <ChevronRight className="w-6 h-6 opacity-70" />
        </div>
      </div>
      <CardContent className="p-6">
        <p className="text-muted-foreground text-sm leading-relaxed">
          {activity.description}
        </p>
      </CardContent>
    </Card>
  );
};

export const StageTwo: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="relative flex items-center justify-center p-6 pb-4">
        <Button 
          variant="outline" 
          size="icon"
          className="absolute left-6 top-6 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md hover:shadow-primary/10 hover:bg-primary/5 hover:border-primary/30 hover:text-primary"
          onClick={() => navigate('/dashboard/ai-practice')}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        
        <div className="text-center">
          <div className="inline-block p-4 bg-green-100 dark:bg-green-900/30 rounded-full mb-4">
            <GraduationCap className="h-12 w-12 text-green-600 dark:text-green-400" />
          </div>
          <h1 className="text-3xl font-bold mb-2">Stage 2</h1>
          <p className="text-muted-foreground">A2 Elementary Level</p>
        </div>
      </div>

      {/* Learning Goal Card */}
      <div className="px-6 mb-8">
        <Card className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
          <CardContent className="p-6 text-center">
            <div className="inline-block p-3 bg-green-100 dark:bg-green-800/50 rounded-full mb-4">
              <Flag className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
            <h2 className="text-xl font-bold mb-3">Your Learning Goal</h2>
            <p className="text-muted-foreground leading-relaxed">
              Communicate routine tasks in familiar, real-life contexts using basic English
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Practice Activities Section */}
      <div className="px-6 mb-8">
        <Card className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-green-500 rounded-full">
                <div className="w-4 h-4 bg-white rounded-full flex items-center justify-center">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                </div>
              </div>
              <h3 className="text-lg font-semibold">Practice Activities</h3>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Activity Cards */}
      <div className="px-6 space-y-4 pb-8">
        {practiceActivities.map((activity, index) => (
          <ActivityCard key={activity.id} activity={activity} index={index} />
        ))}
      </div>
    </div>
  );
}; 