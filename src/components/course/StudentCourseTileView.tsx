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
  total_lessons?: number;
  completed_lessons?: number;
  last_accessed?: string;
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
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 w-full overflow-hidden">
        {courses.map((course) => (
          <Card
            key={course.id}
            className="group cursor-pointer hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border border-border/50 shadow-sm bg-card/95 backdrop-blur-sm dark:bg-card dark:border-border/60 hover:border-primary/30 dark:hover:border-primary/30 h-60 flex flex-col overflow-hidden"
            onClick={() => handleCourseClick(course)}
          >
            <CardHeader className="p-0 relative">
              <img 
                src={course.image_url} 
                alt={course.title} 
                className="w-full h-20 object-cover"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = `https://api.dicebear.com/7.x/shapes/svg?seed=${course.title}&backgroundColor=6366f1&shapeColor=ffffff`;
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              {course.progress === 100 && (
                <div className="absolute top-1 right-1">
                  <div className="bg-green-500 text-white rounded-full p-1 shadow-lg">
                    <BookOpen className="w-3 h-3" />
                  </div>
                </div>
              )}
            </CardHeader>
            
            <CardContent className="p-3 flex flex-col h-full overflow-hidden">
              {/* Course Title */}
              <div className="mb-2">
                <h3 className="font-medium text-xs line-clamp-1 group-hover:text-primary transition-colors">
                  {course.title}
                </h3>
                <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                  {course.subtitle}
                </p>
              </div>

              {/* Compact Course Stats - Horizontal Layout */}
              <div className="flex items-center justify-between text-xs text-muted-foreground mb-2 flex-1 min-h-0">
                <div className="flex items-center gap-1 min-w-0 flex-1">
                  <Users className="w-2.5 h-2.5 flex-shrink-0" />
                  <span className="truncate">
                    {course.completed_lessons || 0}
                  </span>
                </div>
                <div className="flex items-center gap-1 min-w-0 flex-1 justify-center">
                  <BookOpen className="w-2.5 h-2.5 flex-shrink-0" />
                  <span className="truncate">
                    {course.total_lessons || 0}
                  </span>
                </div>
                <div className="flex items-center gap-1 min-w-0 flex-1 justify-end">
                  <Clock className="w-2.5 h-2.5 flex-shrink-0" />
                  <span className="truncate">
                    {course.last_accessed ? new Date(course.last_accessed).toLocaleDateString() : 'Never'}
                  </span>
                </div>
              </div>

              {/* Progress Section */}
              <div className="space-y-1 mb-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground text-xs">Progress</span>
                  <span className="font-medium text-primary text-xs">{course.progress || 0}%</span>
                </div>
                <Progress value={course.progress || 0} className="h-1.5" />
              </div>

              {/* Compact Action Button */}
              <div className="mt-auto pt-1">
                <Button
                  size="sm"
                  className="w-full h-7 text-xs"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCourseClick(course);
                  }}
                >
                  {course.progress === 100 ? (
                    <BookOpen className="w-3 h-3 mr-1" />
                  ) : (
                    <Play className="w-3 h-3 mr-1" />
                  )}
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
