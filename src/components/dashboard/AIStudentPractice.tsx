import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Lock, PlayCircle, Sparkles, Target, TrendingUp, BookOpen, Users, Award } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const mockCourses = [
  {
    id: 0,
    title: 'Stage 0 – Beginner English for Urdu Speakers',
    imageUrl: '/stage0.png',
    isLocked: false,
    isAITutor: true,
    description: 'Foundation skills for Urdu speakers',
    progress: 85,
    lessons: 12,
    duration: '4 weeks'
  },
  {
    id: 1,
    title: 'Stage 1 – Building Confidence',
    imageUrl: '/stage1.png',
    isLocked: false,
    isAITutor: true,
    description: 'Develop speaking confidence',
    progress: 72,
    lessons: 15,
    duration: '5 weeks'
  },
  {
    id: 2,
    title: 'Stage 2 – Elementary English',
    imageUrl: '/stage2.png',
    isLocked: false,
    isAITutor: true,
    description: 'Essential conversation skills',
    progress: 65,
    lessons: 18,
    duration: '6 weeks'
  },
  {
    id: 3,
    title: 'Stage 3 – Intermediate English',
    imageUrl: '/stage3.png',
    isLocked: false,
    isAITutor: true,
    description: 'Advanced communication techniques',
    progress: 58,
    lessons: 20,
    duration: '7 weeks'
  },
  {
    id: 4,
    title: 'Stage 4 – Upper Intermediate',
    imageUrl: '/stage4.png',
    isLocked: false,
    isAITutor: true,
    description: 'Professional English mastery',
    progress: 45,
    lessons: 22,
    duration: '8 weeks'
  },
  {
    id: 5,
    title: 'Stage 5 – C1 Advanced',
    imageUrl: '/stage5.png',
    isLocked: false,
    isAITutor: true,
    description: 'Academic and business English',
    progress: 32,
    lessons: 25,
    duration: '10 weeks'
  },
  {
    id: 6,
    title: 'Stage 6 – C2 Proficiency',
    imageUrl: '/stage6.png',
    isLocked: false,
    isAITutor: true,
    description: 'Native-level proficiency',
    progress: 18,
    lessons: 30,
    duration: '12 weeks'
  },
];

const CourseCard = ({ course }) => {
  const navigate = useNavigate();

  const handleContinue = () => {
    if (course.id === 0) {
      navigate('/dashboard/practice/stage-0');
    } else if (course.id === 1) {
      navigate('/dashboard/practice/stage-1');
    } else if (course.id === 2) {
      navigate('/dashboard/practice/stage-2');
    } else if (course.id === 3) {
      navigate('/dashboard/practice/stage-3');
    } else if (course.id === 4) {
      navigate('/dashboard/practice/stage-4');
    } else if (course.id === 5) {
      navigate('/dashboard/practice/stage-5');
    } else if (course.id === 6) {
      navigate('/dashboard/practice/stage-6');
    }
  };

  return (
    <Card className="group overflow-hidden transition-all duration-500 hover:scale-[1.02] hover:shadow-2xl border-0 bg-gradient-to-br from-white via-white to-gray-50/50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800/50 rounded-2xl h-full flex flex-col">
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
        <img src={course.imageUrl} alt={course.title} className="w-full h-48 object-cover transition-transform duration-500 group-hover:scale-105" />
        {course.isAITutor && (
          <Badge className="absolute top-3 left-3 bg-gradient-to-r from-primary to-primary/90 text-white border-0 shadow-lg">
            <Sparkles className="w-3 h-3 mr-1" />
            AI Tutor
          </Badge>
        )}
        <div className="absolute bottom-3 right-3">
          <div className="flex items-center gap-1 text-white/90 text-xs font-medium">
            <BookOpen className="w-3 h-3" />
            {course.lessons} lessons
          </div>
        </div>
      </div>
      <CardContent className="p-6 flex-1 flex flex-col">
        <div className="space-y-4 flex-1 flex flex-col">
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2 line-clamp-2 leading-tight">
              {course.title}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
              {course.description}
            </p>
          </div>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
              <span>Progress</span>
              <span className="font-medium">{course.progress}%</span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div 
                className="bg-gradient-to-r from-primary to-primary/90 h-2 rounded-full transition-all duration-500"
                style={{ width: `${course.progress}%` }}
              ></div>
            </div>
            <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
              <span>Duration</span>
              <span className="font-medium">{course.duration}</span>
            </div>
          </div>
          
          <div className="mt-auto pt-2">
            {course.isLocked ? (
              <Button disabled className="w-full h-11 bg-gray-100 text-gray-400 border-0 shadow-sm">
                <Lock className="mr-2 h-4 w-4" />
                Locked
              </Button>
            ) : (
              <Button 
                className="w-full h-11 bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5 border-0" 
                onClick={handleContinue}
              >
                Continue
                <PlayCircle className="ml-2 h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export const AIStudentPractice: React.FC = () => {
  return (
    <div className="space-y-8">
      {/* Premium Header Section */}
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-primary/3 to-[#1582B4]/5 rounded-3xl"></div>
        <div className="relative p-8 md:p-10 rounded-3xl">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-gradient-to-br from-primary/10 to-primary/20 rounded-2xl flex items-center justify-center shadow-lg">
                <PlayCircle className="w-8 h-8 text-primary" />
              </div>
              <div>
                <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-primary leading-[1.2]">
                  Practice Hub
                </h1>
                <p className="text-lg text-muted-foreground font-light mt-4 leading-relaxed">
                  Master English through structured AI-guided practice sessions
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Course Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {mockCourses.map((course) => (
          <CourseCard key={course.title} course={course} />
        ))}
      </div>
    </div>
  );
}; 