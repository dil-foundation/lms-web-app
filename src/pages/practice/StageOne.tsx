import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, GraduationCap, Mic, Zap, Ear, Flag, ChevronRight, Target, Sparkles, TrendingUp } from 'lucide-react';

const practiceActivities = [
  {
    id: 'repeat-after-me',
    title: 'Repeat After Me',
    description: 'Practice speaking by repeating phrases with perfect pronunciation',
    icon: Mic,
    color: 'from-primary to-primary/90',
    bgColor: 'bg-gradient-to-br from-primary to-primary/90',
  },
  {
    id: 'quick-response',
    title: 'Quick Response',
    description: 'Answer simple questions quickly to build fluency',
    icon: Zap,
    color: 'from-[#1582B4] to-[#1582B4]/90',
    bgColor: 'bg-gradient-to-br from-[#1582B4] to-[#1582B4]/90',
  },
  {
    id: 'listen-and-reply',
    title: 'Listen and Reply',
    description: 'Improve listening skills by responding to audio prompts',
    icon: Ear,
    color: 'from-primary to-primary/90',
    bgColor: 'bg-gradient-to-br from-primary to-primary/90',
  },
];

const ActivityCard = ({ activity, index }) => {
  const navigate = useNavigate();
  
  return (
    <Card 
      className="group overflow-hidden transition-all duration-500 hover:scale-[1.02] hover:shadow-2xl border-0 bg-gradient-to-br from-white via-white to-gray-50/50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800/50 rounded-2xl cursor-pointer"
      onClick={() => navigate(`/dashboard/practice/stage-1/${activity.id}`)}
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

export const StageOne: React.FC = () => {
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
                className="hover:bg-primary/10 hover:border-primary/30 transition-all duration-300"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-primary/10 to-primary/20 rounded-xl flex items-center justify-center shadow-lg">
                  <GraduationCap className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-primary">Stage 1 - Building Confidence</h1>
                  <p className="text-sm text-muted-foreground">A1 Beginner Level</p>
                </div>
              </div>
            </div>
            
            {/* Stage Stats */}
            <div className="flex flex-wrap gap-4">
              <div className="flex items-center gap-2 px-4 py-2 bg-white/60 dark:bg-gray-800/60 rounded-xl border border-gray-200/50 dark:border-gray-700/50">
                <Target className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">3 Activities</span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 bg-white/60 dark:bg-gray-800/60 rounded-xl border border-gray-200/50 dark:border-gray-700/50">
                <TrendingUp className="w-4 h-4 text-[#1582B4]" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Progressive</span>
              </div>
            </div>
          </div>
          
          {/* Stage Description */}
          <div className="mt-6 text-center md:text-left">
            <p className="text-muted-foreground text-lg leading-relaxed max-w-2xl">
              Build confidence in using basic phrases and perfect your pronunciation
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