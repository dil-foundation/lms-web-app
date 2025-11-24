import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
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

interface StudentCourseListViewProps {
  courses: Course[];
  onCourseClick?: (course: Course) => void;
  className?: string;
}

export const StudentCourseListView: React.FC<StudentCourseListViewProps> = ({
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
      <div className="space-y-1.5 sm:space-y-2">
        {courses.map((course) => (
          <Card
            key={course.id}
            className="group cursor-pointer hover:shadow-md transition-all duration-200 hover:bg-muted/50 border border-border/50 shadow-sm bg-card/95 backdrop-blur-sm dark:bg-card dark:border-border/60 hover:border-border dark:hover:border-border border-l-2 sm:border-l-4 border-l-transparent hover:border-l-primary"
            onClick={() => handleCourseClick(course)}
          >
            <CardContent className="p-2.5 sm:p-3 md:p-4">
              <div className="flex items-center gap-2 sm:gap-3 md:gap-4">
                {/* Course Image */}
                <div className="relative flex-shrink-0">
                  <img 
                    src={course.image_url} 
                    alt={course.title} 
                    className="w-12 h-9 sm:w-16 sm:h-12 object-cover rounded-md sm:rounded-lg"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src = `https://api.dicebear.com/7.x/shapes/svg?seed=${course.title}&backgroundColor=6366f1&shapeColor=ffffff`;
                    }}
                  />
                  {course.progress === 100 && (
                    <div className="absolute -top-0.5 -right-0.5 sm:-top-1 sm:-right-1">
                      <div className="bg-green-500 text-white rounded-full p-0.5 sm:p-1 shadow-lg">
                        <BookOpen className="w-2 h-2 sm:w-3 sm:h-3" />
                      </div>
                    </div>
                  )}
                </div>

                {/* Course Info */}
                <div className="flex-1 grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3 items-start min-w-0">
                  <div className="col-span-1 md:col-span-2 flex flex-col justify-center min-w-0">
                    <h3 className="font-semibold text-sm sm:text-base line-clamp-1 group-hover:text-primary transition-colors">
                      {course.title}
                    </h3>
                    <p className="text-xs sm:text-sm text-muted-foreground line-clamp-1 mt-0.5 sm:mt-1">
                      {course.subtitle}
                    </p>
                  </div>
                  
                  <div className="hidden md:flex text-xs sm:text-sm text-muted-foreground flex-col justify-center space-y-0.5 sm:space-y-1">
                    {(course.total_lessons && course.total_lessons > 0) ? (
                      <>
                        <p className="flex items-center gap-1">
                          <Users className="w-2.5 h-2.5 sm:w-3 sm:h-3 flex-shrink-0" />
                          <span className="truncate">{course.completed_lessons !== undefined && course.completed_lessons !== null ? course.completed_lessons : 0}/{course.total_lessons}</span>
                        </p>
                        <p className="flex items-center gap-1">
                          <BookOpen className="w-2.5 h-2.5 sm:w-3 sm:h-3 flex-shrink-0" />
                          <span className="truncate">{course.total_lessons} lessons</span>
                        </p>
                      </>
                    ) : (
                      <p className="flex items-center gap-1">
                        <BookOpen className="w-2.5 h-2.5 sm:w-3 sm:h-3 flex-shrink-0" />
                        <span className="truncate">Loading...</span>
                      </p>
                    )}
                  </div>
                  
                  <div className="hidden lg:flex text-xs sm:text-sm text-muted-foreground flex-col justify-center space-y-0.5 sm:space-y-1">
                    <p className="flex items-center gap-1">
                      <Clock className="w-2.5 h-2.5 sm:w-3 sm:h-3 flex-shrink-0" />
                      <span className="truncate">{course.last_accessed ? new Date(course.last_accessed).toLocaleDateString() : 'Never'}</span>
                    </p>
                    {course.progress !== undefined && course.progress !== null && (
                      <p className="flex items-center gap-1">
                        <User className="w-2.5 h-2.5 sm:w-3 sm:h-3 flex-shrink-0" />
                        <span className="truncate">{course.progress}%</span>
                      </p>
                    )}
                  </div>
                </div>

                {/* Progress and Action */}
                <div className="flex items-center gap-2 sm:gap-3 md:gap-4 flex-shrink-0">
                  {course.progress !== undefined && course.progress !== null && (
                    <div className="hidden sm:block w-16 sm:w-20 md:w-24">
                      <div className="flex items-center justify-between text-[10px] sm:text-xs mb-0.5 sm:mb-1">
                        <span className="text-muted-foreground">Progress</span>
                        <span className="font-medium">{course.progress}%</span>
                      </div>
                      <Progress value={course.progress} className="h-1.5 sm:h-2" />
                    </div>
                  )}
                  
                  <Button
                    size="sm"
                    className="h-7 sm:h-8 text-[10px] sm:text-xs px-2 sm:px-3"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCourseClick(course);
                    }}
                  >
                    {course.progress === 100 ? (
                      <BookOpen className="w-2.5 h-2.5 sm:w-3 sm:h-3 mr-0.5 sm:mr-1" />
                    ) : (
                      <Play className="w-2.5 h-2.5 sm:w-3 sm:h-3 mr-0.5 sm:mr-1" />
                    )}
                    <span className="hidden sm:inline">{course.progress === 100 ? 'Review' : 'Continue'}</span>
                    <span className="sm:hidden">{course.progress === 100 ? 'Review' : 'Go'}</span>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
