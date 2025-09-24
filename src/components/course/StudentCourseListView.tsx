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
      <div className="space-y-2">
        {courses.map((course) => (
          <Card
            key={course.id}
            className="group cursor-pointer hover:shadow-md transition-all duration-200 hover:bg-muted/50 border border-border/50 shadow-sm bg-card/95 backdrop-blur-sm dark:bg-card dark:border-border/60 hover:border-border dark:hover:border-border border-l-4 border-l-transparent hover:border-l-primary"
            onClick={() => handleCourseClick(course)}
          >
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                {/* Course Image */}
                <div className="relative">
                  <img 
                    src={course.image_url} 
                    alt={course.title} 
                    className="w-16 h-12 object-cover rounded-lg"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src = `https://api.dicebear.com/7.x/shapes/svg?seed=${course.title}&backgroundColor=6366f1&shapeColor=ffffff`;
                    }}
                  />
                  {course.progress === 100 && (
                    <div className="absolute -top-1 -right-1">
                      <div className="bg-green-500 text-white rounded-full p-1 shadow-lg">
                        <BookOpen className="w-3 h-3" />
                      </div>
                    </div>
                  )}
                </div>

                {/* Course Info */}
                <div className="flex-1 grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-3 items-start">
                  <div className="col-span-1 md:col-span-2 flex flex-col justify-center">
                    <h3 className="font-semibold text-base line-clamp-1 group-hover:text-primary transition-colors">
                      {course.title}
                    </h3>
                    <p className="text-sm text-muted-foreground line-clamp-1 mt-1">
                      {course.subtitle}
                    </p>
                  </div>
                  
                  <div className="text-sm text-muted-foreground flex flex-col justify-center space-y-1">
                    {(course.total_lessons && course.total_lessons > 0) ? (
                      <>
                        <p className="flex items-center gap-1">
                          <Users className="w-3 h-3 flex-shrink-0" />
                          <span>{course.completed_lessons !== undefined && course.completed_lessons !== null ? course.completed_lessons : 0}/{course.total_lessons} completed</span>
                        </p>
                        <p className="flex items-center gap-1">
                          <BookOpen className="w-3 h-3 flex-shrink-0" />
                          <span>{course.total_lessons} lessons</span>
                        </p>
                      </>
                    ) : (
                      <p className="flex items-center gap-1">
                        <BookOpen className="w-3 h-3 flex-shrink-0" />
                        <span>Course content loading...</span>
                      </p>
                    )}
                  </div>
                  
                  <div className="text-sm text-muted-foreground flex flex-col justify-center space-y-1">
                    <p className="flex items-center gap-1">
                      <Clock className="w-3 h-3 flex-shrink-0" />
                      <span>{course.last_accessed ? new Date(course.last_accessed).toLocaleDateString() : 'Never'}</span>
                    </p>
                    {course.progress !== undefined && course.progress !== null && (
                      <p className="flex items-center gap-1">
                        <User className="w-3 h-3 flex-shrink-0" />
                        <span>{course.progress}%</span>
                      </p>
                    )}
                  </div>
                </div>

                {/* Progress and Action */}
                <div className="flex items-center gap-4">
                  {course.progress !== undefined && course.progress !== null && (
                    <div className="w-24">
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-muted-foreground">Progress</span>
                        <span className="font-medium">{course.progress}%</span>
                      </div>
                      <Progress value={course.progress} className="h-2" />
                    </div>
                  )}
                  
                  <Button
                    size="sm"
                    className="h-8 text-xs"
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
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
