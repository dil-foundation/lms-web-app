import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, GraduationCap, Sun, Zap, Users, Flag, ChevronRight, Target, Sparkles, TrendingUp } from 'lucide-react';

const practiceActivities = [
  {
    id: 'daily-routine',
    title: 'Daily Routine Narration',
    description: 'Describe your daily activities in detail',
    icon: Sun,
    bgColor: 'bg-gradient-to-br from-primary to-primary/90',
  },
  {
    id: 'quick-answer',
    title: 'Quick & Answer Practice',
    description: 'Engage in interactive Q&A sessions',
    icon: Zap,
    bgColor: 'bg-gradient-to-br from-[#1582B4] to-[#1582B4]/90',
  },
  {
    id: 'roleplay-simulation',
    title: 'Roleplay Simulation',
    description: 'Practice ordering food in a restaurant',
    icon: Users,
    bgColor: 'bg-gradient-to-br from-primary to-primary/90',
  },
];

const ActivityCard = ({ activity, index }) => {
  const navigate = useNavigate();
  
  return (
    <Card 
      className="group overflow-hidden transition-all duration-500 hover:scale-[1.02] hover:shadow-2xl border-0 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border border-gray-200/60 dark:border-gray-700/60 rounded-3xl cursor-pointer shadow-lg hover:shadow-xl"
      onClick={() => navigate(`/dashboard/practice/stage-2/${activity.id}`)}
    >
      <div className={`${activity.bgColor} p-6 text-white relative overflow-hidden`}>
        <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent"></div>
        <div className="flex items-center justify-between relative z-10">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-white/20 rounded-xl shadow-sm">
              <activity.icon className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl font-semibold">{activity.title}</h3>
            </div>
          </div>
          <ChevronRight className="w-6 h-6 opacity-70 group-hover:translate-x-1 transition-transform duration-300" />
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
      {/* Premium Header Section */}
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-primary/3 to-[#1582B4]/5 rounded-3xl"></div>
        <div className="relative p-8 md:p-10 rounded-3xl">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div className="flex items-center gap-4">
              <Button 
                variant="outline" 
                size="icon"
                onClick={() => navigate('/dashboard/ai-practice')}
                className="hover:bg-primary/10 hover:border-primary/30 transition-all duration-300 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-gray-200/60 dark:border-gray-700/60 shadow-lg hover:shadow-xl hover:-translate-y-0.5"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-primary/10 to-primary/20 rounded-xl flex items-center justify-center shadow-lg">
                  <GraduationCap className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold bg-gradient-to-r from-primary via-primary/90 to-primary bg-clip-text text-transparent">Stage 2 - Elementary English</h1>
                  <p className="text-sm text-muted-foreground">A2 Elementary Level</p>
                </div>
              </div>
            </div>
            
            {/* Stage Stats */}
            <div className="flex flex-wrap gap-4">
              <div className="flex items-center gap-2 px-4 py-2 bg-white/60 dark:bg-gray-800/60 rounded-xl border border-gray-200/50 dark:border-gray-700/50 shadow-md">
                <Target className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">3 Activities</span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 bg-white/60 dark:bg-gray-800/60 rounded-xl border border-gray-200/50 dark:border-gray-700/50 shadow-md">
                <TrendingUp className="w-4 h-4 text-[#1582B4]" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Elementary</span>
              </div>
            </div>
          </div>
          
          {/* Stage Description */}
          <div className="mt-6 text-center md:text-left">
            <p className="text-muted-foreground text-lg leading-relaxed max-w-2xl">
              Communicate routine tasks in familiar, real-life contexts using basic English
            </p>
          </div>
        </div>
      </div>

      {/* Activity Cards */}
      <div className="px-6 pb-8 mt-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {practiceActivities.map((activity, index) => (
            <ActivityCard key={activity.id} activity={activity} index={index} />
          ))}
        </div>
      </div>
    </div>
  );
}; 