import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Lock, PlayCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const mockCourses = [
  {
    id: 0,
    title: 'Stage 0 – Beginner English for Urdu Speakers',
    imageUrl: '/stage0.png',
    isLocked: false,
    isAITutor: true,
  },
  {
    id: 1,
    title: 'Stage 1 – Building Confidence',
    imageUrl: '/stage1.png',
    isLocked: false,
    isAITutor: true,
  },
  {
    id: 2,
    title: 'Stage 2 – Elementary English',
    imageUrl: '/stage2.png',
    isLocked: false,
    isAITutor: true,
  },
  {
    id: 3,
    title: 'Stage 3 – Intermediate English',
    imageUrl: '/stage3.png',
    isLocked: false,
    isAITutor: true,
  },
  {
    id: 4,
    title: 'Stage 4 – Upper Intermediate',
    imageUrl: '/stage4.png',
    isLocked: false,
    isAITutor: true,
  },
  {
    id: 5,
    title: 'Stage 5 – C1 Advanced',
    imageUrl: '/stage5.png',
    isLocked: false,
    isAITutor: true,
  },
  {
    id: 6,
    title: 'Stage 6 – C2 Proficiency',
    imageUrl: '/stage6.png',
    isLocked: false,
    isAITutor: true,
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
    // TODO: Add navigation for other stages
  };

  return (
    <Card className="overflow-hidden transition-transform duration-300 hover:scale-105 hover:shadow-xl">
      <div className="relative">
        <img src={course.imageUrl} alt={course.title} className="w-full h-40 object-cover" />
        {course.isAITutor && (
          <Badge className="absolute top-2 left-2 bg-green-500 text-white">AI Tutor</Badge>
        )}
      </div>
      <CardContent className="p-4">
        <h3 className="text-lg font-semibold mb-8 h-12">{course.title}</h3>
        {course.isLocked ? (
          <Button disabled className="w-full">
            <Lock className="mr-2 h-4 w-4" />
            Locked
          </Button>
        ) : (
          <Button className="w-full bg-green-500 hover:bg-green-600" onClick={handleContinue}>
            Continue
            <PlayCircle className="ml-2 h-4 w-4" />
          </Button>
        )}
      </CardContent>
    </Card>
  );
};

export const AIStudentPractice: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-primary/5 rounded-3xl"></div>
        <div className="relative p-8 rounded-3xl">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-primary/10 to-primary/20 rounded-2xl flex items-center justify-center">
              <PlayCircle className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-primary via-primary to-primary/80 bg-clip-text text-transparent">
                Lessons
              </h1>
              <p className="text-lg text-muted-foreground font-light">
                Browse through all your course lessons
              </p>
            </div>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {mockCourses.map((course) => (
          <CourseCard key={course.title} course={course} />
        ))}
      </div>
    </div>
  );
}; 