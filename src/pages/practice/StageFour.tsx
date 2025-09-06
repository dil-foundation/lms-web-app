import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, GraduationCap, MessageSquare, Zap, Users, Flag, ChevronRight, Target, Sparkles, TrendingUp } from 'lucide-react';

const practiceActivities = [
  {
    id: 'abstract-topic',
    title: 'Abstract Topic Monologue',
    description: 'Practice speaking on complex abstract topics',
    icon: MessageSquare,
    bgColor: 'bg-gradient-to-br from-primary to-primary/90',
  },
  {
    id: 'mock-interview',
    title: 'Mock Interview Practice',
    description: 'Master professional interview scenarios',
    icon: Zap,
    bgColor: 'bg-gradient-to-br from-[#1582B4] to-[#1582B4]/90',
  },
  {
    id: 'news-summary',
    title: 'News Summary Challenge',
    description: 'Analyze and summarize complex news articles',
    icon: Users,
    bgColor: 'bg-gradient-to-br from-primary to-primary/90',
  },
];

const ActivityCard = ({ activity, index }) => {
  const navigate = useNavigate();
  
  return (
    <Card 
      className="group overflow-hidden transition-all duration-500 hover:scale-[1.02] hover:shadow-2xl border-0 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border border-gray-200/60 dark:border-gray-700/60 rounded-3xl cursor-pointer shadow-lg hover:shadow-xl"
      onClick={() => navigate(`/dashboard/practice/stage-4/${activity.id}`)}
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

export const StageFour: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      {/* Premium Header Section */}
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-primary/5 rounded-3xl"></div>
        <div className="relative p-6 sm:p-8 md:p-10 rounded-3xl">
          <div className="flex">
            <Button 
              variant="outline" 
              size="icon"
              onClick={() => navigate('/dashboard/ai-practice')}
              className="hover:bg-primary/10 hover:border-primary/30 transition-all duration-300 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-gray-200/60 dark:border-gray-700/60 shadow-lg hover:shadow-xl hover:-translate-y-0.5"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </div>
          <div className="mt-4 flex flex-col sm:flex-row items-center justify-center gap-3 text-center">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-primary/10 to-primary/20 rounded-xl flex items-center justify-center shadow-lg">
              <GraduationCap className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-primary via-primary/90 to-primary bg-clip-text text-transparent">Stage 4 - Upper Intermediate</h1>
              <p className="text-xs sm:text-sm text-muted-foreground">B2 Upper Intermediate Level</p>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-3 sm:gap-4">
            <div className="flex items-center gap-2 px-3 py-2 sm:px-4 bg-white/60 dark:bg-gray-800/60 rounded-xl border border-gray-200/50 dark:border-gray-700/50 shadow-md">
              <Target className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">3 Activities</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-2 sm:px-4 bg-white/60 dark:bg-gray-800/60 rounded-xl border border-gray-200/50 dark:border-gray-700/50 shadow-md">
              <TrendingUp className="w-4 h-4 text-[#1582B4]" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Upper Intermediate</span>
            </div>
          </div>
          <div className="mt-5 text-center">
            <p className="text-muted-foreground text-base sm:text-lg leading-relaxed max-w-2xl mx-auto">
              Express complex ideas fluently and handle most situations confidently
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