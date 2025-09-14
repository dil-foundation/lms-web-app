import React from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  BookOpen,
  Users,
  Clock,
  Play,
  Calendar,
  User,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface Course {
  id: string;
  title: string;
  subtitle: string;
  image_url: string;
  progress?: number;
}

interface StudentCourseTileViewProps {
  courses: Course[];
  onCourseClick?: (course: Course) => void;
  className?: string;
}

export const StudentCourseTileView: React.FC<StudentCourseTileViewProps> = ({
  courses,
  onCourseClick,
  className = "",
}) => {
  const navigate = useNavigate();

  const handleCourseClick = (course: Course) => {
    if (onCourseClick) {
      onCourseClick(course);
    } else {
      navigate(`/dashboard/course/${course.id}`);
    }
  };

  return (
    <div className={className}>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {courses.map((course) => (
          <Card
            key={course.id}
            className="group cursor-pointer hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border border-border/50 shadow-md bg-card/95 backdrop-blur-sm dark:bg-card dark:border-border/60 hover:border-border dark:hover:border-border h-80 flex flex-col overflow-hidden"
            onClick={() => handleCourseClick(course)}
          >
            <CardHeader className="p-0 relative">
              <img 
                src={course.image_url} 
                alt={course.title} 
                className="w-full h-32 object-cover rounded-t-lg"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = `https://api.dicebear.com/7.x/shapes/svg?seed=${course.title}&backgroundColor=6366f1&shapeColor=ffffff`;
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              {course.progress === 100 && (
                <div className="absolute top-3 right-3">
                  <div className="bg-green-500 text-white rounded-full p-1 shadow-lg">
                    <BookOpen className="w-4 h-4" />
                  </div>
                </div>
              )}
            </CardHeader>
            
            <CardContent className="p-4 flex flex-col h-full">
              {/* Course Title */}
              <div className="mb-3">
                <h3 className="font-semibold text-sm line-clamp-2 mb-1 group-hover:text-primary transition-colors">
                  {course.title}
                </h3>
                <p className="text-xs text-muted-foreground line-clamp-2">
                  {course.subtitle}
                </p>
              </div>

              {/* Course Stats */}
              <div className="space-y-2 text-xs text-muted-foreground mb-4 flex-1 min-h-0">
                <div className="flex items-center gap-2">
                  <Users className="w-3 h-3" />
                  <span>students</span>
                </div>
                <div className="flex items-center gap-2">
                  <BookOpen className="w-3 h-3" />
                  <span>lessons</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-3 h-3" />
                  <span>duration</span>
                </div>
              </div>

              {/* Progress Bar */}
              {course.progress !== undefined && (
                <div className="mb-4">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-muted-foreground">Progress</span>
                    <span className="font-medium">{course.progress}%</span>
                  </div>
                  <Progress value={course.progress} className="h-2" />
                </div>
              )}

              {/* Action Button */}
              <div className="mt-auto pt-2">
                <Button
                  size="sm"
                  className="w-full h-8 text-xs"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCourseClick(course);
                  }}
                >
                  <Play className="w-3 h-3 mr-1" />
                  {course.progress === 100 ? 'Review' : 'Continue'}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
