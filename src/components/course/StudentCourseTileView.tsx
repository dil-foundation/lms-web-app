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
  Eye,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useUserProfile } from '@/hooks/useUserProfile';

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
  const { profile } = useUserProfile();
  const isViewOnly = profile?.role === 'view_only';

  const handleCourseClick = (course: Course) => {
    if (onCourseClick) {
      onCourseClick(course);
    } else {
      navigate(`/dashboard/course/${course.id}`);
    }
  };

  return (
    <div className={className}>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 sm:gap-3 w-full overflow-hidden">
        {courses.map((course) => (
          <Card
            key={course.id}
            className="group cursor-pointer hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border border-border/50 shadow-sm bg-card/95 backdrop-blur-sm dark:bg-card dark:border-border/60 hover:border-primary/30 dark:hover:border-primary/30 h-56 sm:h-60 flex flex-col overflow-hidden"
            onClick={() => handleCourseClick(course)}
          >
            <CardHeader className="p-0 relative">
              <img 
                src={course.image_url} 
                alt={course.title} 
                className="w-full h-16 sm:h-20 object-cover"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = `https://api.dicebear.com/7.x/shapes/svg?seed=${course.title}&backgroundColor=6366f1&shapeColor=ffffff`;
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              {course.progress === 100 && (
                <div className="absolute top-0.5 right-0.5 sm:top-1 sm:right-1">
                  <div className="bg-green-500 text-white rounded-full p-0.5 sm:p-1 shadow-lg">
                    <BookOpen className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                  </div>
                </div>
              )}
            </CardHeader>
            
            <CardContent className="p-2 sm:p-3 flex flex-col h-full overflow-hidden">
              {/* Course Title */}
              <div className="mb-1.5 sm:mb-2">
                <h3 className="font-medium text-[10px] sm:text-xs line-clamp-1 group-hover:text-primary transition-colors">
                  {course.title}
                </h3>
                <p className="text-[9px] sm:text-xs text-muted-foreground mt-0.5 sm:mt-1 line-clamp-1">
                  {course.subtitle}
                </p>
              </div>

              {/* Compact Course Stats - Responsive Layout */}
              <div className="text-[9px] sm:text-xs text-muted-foreground mb-1.5 sm:mb-2 flex-1 min-h-0">
                {(course.total_lessons && course.total_lessons > 0) ? (
                  <div className="space-y-0.5 sm:space-y-1">
                    <div className="flex items-center justify-between gap-1">
                      <div className="flex items-center gap-0.5 sm:gap-1 min-w-0">
                        <Users className="w-2 h-2 sm:w-2.5 sm:h-2.5 flex-shrink-0" />
                        <span className="truncate text-[9px] sm:text-xs">
                          {course.completed_lessons !== undefined && course.completed_lessons !== null ? course.completed_lessons : 0}/{course.total_lessons}
                        </span>
                      </div>
                      <div className="flex items-center gap-0.5 sm:gap-1 min-w-0">
                        <BookOpen className="w-2 h-2 sm:w-2.5 sm:h-2.5 flex-shrink-0" />
                        <span className="truncate text-[9px] sm:text-xs">
                          {course.total_lessons}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-0.5 sm:gap-1 min-w-0">
                      <Clock className="w-2 h-2 sm:w-2.5 sm:h-2.5 flex-shrink-0" />
                      <span className="truncate text-[9px] sm:text-xs">
                        {course.last_accessed ? new Date(course.last_accessed).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'Never'}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-0.5 sm:gap-1">
                    <Clock className="w-2 h-2 sm:w-2.5 sm:h-2.5 flex-shrink-0" />
                    <span className="truncate text-[9px] sm:text-xs">
                      {course.last_accessed ? new Date(course.last_accessed).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'Never'}
                    </span>
                  </div>
                )}
              </div>

              {/* Progress Section */}
              {course.progress !== undefined && course.progress !== null && (
                <div className="space-y-0.5 sm:space-y-1 mb-1.5 sm:mb-2">
                  <div className="flex items-center justify-between text-[9px] sm:text-xs">
                    <span className="text-muted-foreground">Progress</span>
                    <span className="font-medium text-primary">{course.progress}%</span>
                  </div>
                  <Progress value={course.progress} className="h-1 sm:h-1.5" />
                </div>
              )}

              {/* Compact Action Button */}
              <div className="mt-auto pt-0.5 sm:pt-1">
                <Button
                  size="sm"
                  className="w-full h-6 sm:h-7 text-[10px] sm:text-xs px-1 sm:px-2"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCourseClick(course);
                  }}
                >
                  {isViewOnly ? (
                    <>
                      <Eye className="w-2.5 h-2.5 sm:w-3 sm:h-3 mr-0.5 sm:mr-1" />
                      <span className="hidden sm:inline">Preview</span>
                      <span className="sm:hidden">View</span>
                    </>
                  ) : (
                    <>
                      {course.progress === 100 ? (
                        <BookOpen className="w-2.5 h-2.5 sm:w-3 sm:h-3 mr-0.5 sm:mr-1" />
                      ) : (
                        <Play className="w-2.5 h-2.5 sm:w-3 sm:h-3 mr-0.5 sm:mr-1" />
                      )}
                      {course.progress === 100 ? 'Review' : 'Continue'}
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
