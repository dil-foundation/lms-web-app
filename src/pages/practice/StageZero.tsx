import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, BookText, GraduationCap, Volume2, Calendar, MessageSquare, Send, ChevronRight, Target, Sparkles } from 'lucide-react';

const lessons = [
  {
    icon: BookText,
    bigTitle: 'Alphabet',
    title: 'Lesson 1: The English Alphabet',
    description: 'Learn the basics of the English alphabet.',
  },
  {
    icon: Volume2,
    bigTitle: 'Sounds',
    title: 'Lesson 2: Phonics & Sounds',
    description: 'Understand confusing English sounds.',
  },
  {
    icon: Calendar,
    bigTitle: 'Numbers',
    title: 'Lesson 3: Numbers & Days',
    description: 'Learn numbers, days, colors, and common words.',
  },
  {
    icon: MessageSquare,
    bigTitle: 'Phrases',
    title: 'Lesson 4: Sight Words & Phrases',
    description: 'Know basic English phrases used every day.',
  },
  {
    icon: Send,
    bigTitle: 'UI Words',
    title: 'Lesson 5: App Navigation Words',
    description: 'Learn English words used in the app UI.',
  },
];

const LessonCard = ({ lesson, index }) => {
  const navigate = useNavigate();
  return (
    <Card 
      className="group overflow-hidden transition-all duration-500 hover:scale-[1.02] hover:shadow-2xl border-0 bg-gradient-to-br from-white via-white to-gray-50/50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800/50 rounded-2xl cursor-pointer h-full flex flex-col"
      onClick={() => navigate(`/dashboard/practice/stage-0/lesson/${index + 1}`)}
    >
      <div className="bg-gradient-to-br from-primary to-primary/90 flex items-center justify-center p-8 h-40 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-transparent"></div>
        <h2 className="text-5xl font-bold text-white relative z-10">{lesson.bigTitle}</h2>
        <div className="absolute top-4 right-4 opacity-20">
          <Sparkles className="w-8 h-8 text-white" />
        </div>
      </div>
      <div className="p-6 flex flex-col flex-1">
        <div className="flex items-center mb-4 flex-1">
          <div className="p-3 bg-gradient-to-br from-primary/10 to-primary/20 rounded-xl mr-4 shadow-sm">
            <lesson.icon className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{lesson.title}</h3>
            <p className="text-sm text-muted-foreground mt-1">{lesson.description}</p>
          </div>
        </div>
        <div className="mt-auto pt-2">
          <Button 
            className="w-full bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5 border-0"
            variant="outline"
          >
            Start Lesson
            <ChevronRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </div>
    </Card>
  );
};

export const StageZero: React.FC = () => {
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
                                    <BookText className="w-6 h-6 text-primary" />
                                </div>
                                <div>
                                    <h1 className="text-2xl font-bold text-primary">Stage 0 - Beginner</h1>
                                    <p className="text-sm text-muted-foreground">Foundation English for Urdu Speakers</p>
                                </div>
                            </div>
                        </div>
                        
                        {/* Stage Stats */}
                        <div className="flex flex-wrap gap-4">
                            <div className="flex items-center gap-2 px-4 py-2 bg-white/60 dark:bg-gray-800/60 rounded-xl border border-gray-200/50 dark:border-gray-700/50">
                                <Target className="w-4 h-4 text-primary" />
                                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">5 Lessons</span>
                            </div>
                            <div className="flex items-center gap-2 px-4 py-2 bg-white/60 dark:bg-gray-800/60 rounded-xl border border-gray-200/50 dark:border-gray-700/50">
                                <Sparkles className="w-4 h-4 text-[#1582B4]" />
                                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">AI Guided</span>
                            </div>
                        </div>
                    </div>
                    
                    {/* Stage Description */}
                    <div className="mt-6 text-center md:text-left">
                        <p className="text-muted-foreground text-lg leading-relaxed max-w-2xl">
                            The lessons are designed to introduce you to the basics of English, focusing on essential vocabulary and simple sentence structures.
                        </p>
                    </div>
                </div>
            </div>

            {/* Lessons Grid */}
            <div className="px-6 pb-8 mt-8">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {lessons.map((lesson, index) => (
                        <LessonCard key={index} lesson={lesson} index={index} />
                    ))}
                </div>
            </div>
        </div>
    );
} 