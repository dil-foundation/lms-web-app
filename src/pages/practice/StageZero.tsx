import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, BookText, GraduationCap, Volume2, Calendar, MessageSquare, Send, ChevronRight } from 'lucide-react';

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
      className="overflow-hidden shadow-lg transition-transform duration-300 hover:scale-105 flex flex-col cursor-pointer bg-card"
      onClick={() => navigate(`/dashboard/practice/stage-0/lesson/${index + 1}`)}
    >
      <div className="bg-primary flex items-center justify-center p-8 h-40">
        <h2 className="text-5xl font-bold text-primary-foreground">{lesson.bigTitle}</h2>
      </div>
      <div className="p-6 flex flex-col flex-grow">
        <div className="flex items-center mb-4">
          <div className="p-2 bg-primary/10 rounded-full mr-3">
            <lesson.icon className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="text-lg font-bold">{lesson.title}</h3>
            <p className="text-sm text-muted-foreground">{lesson.description}</p>
          </div>
        </div>
        <Button 
          className="w-full mt-auto transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/20 hover:bg-primary hover:text-primary-foreground hover:border-primary"
          variant="outline"
        >
          Start <ChevronRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </Card>
  );
};

export const StageZero: React.FC = () => {
    const navigate = useNavigate();
    return (
        <div className="p-4 sm:p-6 lg:p-8">
            <div className="flex items-center gap-4 mb-8">
                <Button 
                    variant="outline" 
                    size="icon" 
                    onClick={() => navigate('/dashboard/ai-practice')}
                    className="transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md hover:shadow-primary/10 hover:bg-primary/5 hover:border-primary/30 hover:text-primary"
                >
                    <ArrowLeft className="h-4 w-4" />
                </Button>
                <Button 
                    variant="outline" 
                    size="lg" 
                    className="text-lg cursor-default bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20 text-primary font-semibold hover:bg-gradient-to-r hover:from-primary/5 hover:to-primary/10 hover:border-primary/20 hover:text-primary pointer-events-none select-none"
                >
                    <BookText className="mr-2 h-5 w-5" />
                    Beginner Lessons
                </Button>
            </div>

            <Card className="mb-8 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
                <CardContent className="p-8 text-center flex flex-col items-center">
                    <div className="p-4 bg-primary/20 rounded-full mb-4">
                        <GraduationCap className="h-10 w-10 text-primary" />
                    </div>
                    <h2 className="text-2xl font-bold mb-2">Welcome to your first steps in English</h2>
                    <p className="max-w-prose text-muted-foreground">
                        The lessons are designed to introduce you to the basics of English, focusing on essential vocabulary and simple sentence structures.
                    </p>
                </CardContent>
            </Card>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {lessons.map((lesson, index) => (
                    <LessonCard key={index} lesson={lesson} index={index} />
                ))}
            </div>
        </div>
    );
} 