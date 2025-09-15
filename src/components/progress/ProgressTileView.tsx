import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { BookOpen, CheckCircle, Clock, Target, TrendingUp, Award } from 'lucide-react';
import { Link } from 'react-router-dom';

interface CourseProgress {
  course_id: string;
  title: string;
  subtitle?: string;
  image_url?: string;
  progress_percentage: number;
  total_lessons: number;
  completed_lessons: number;
  last_accessed?: string;
  is_completed?: boolean;
  level?: string;
  category?: string;
}

interface ProgressTileViewProps {
  courses: CourseProgress[];
  onCourseClick?: (course: CourseProgress) => void;
  className?: string;
}

export const ProgressTileView: React.FC<ProgressTileViewProps> = ({
  courses,
  onCourseClick,
  className
}) => {
  const handleCourseClick = (course: CourseProgress) => {
    if (onCourseClick) {
      onCourseClick(course);
    }
  };

  const getProgressColor = (progress: number) => {
    if (progress === 0) return 'bg-gray-300';
    if (progress < 30) return 'bg-red-500';
    if (progress < 60) return 'bg-yellow-500';
    if (progress < 90) return 'bg-blue-500';
    return 'bg-green-500';
  };

  const getProgressStatus = (progress: number) => {
    if (progress === 0) return 'Not Started';
    if (progress < 30) return 'Getting Started';
    if (progress < 60) return 'In Progress';
    if (progress < 90) return 'Almost There';
    if (progress < 100) return 'Nearly Complete';
    return 'Completed';
  };

  return (
    <div className={className}>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
        {courses.map((course) => (
          <Card
            key={course.course_id}
            className="group cursor-pointer hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border border-border/50 shadow-sm bg-card/95 backdrop-blur-sm dark:bg-card dark:border-border/60 hover:border-primary/30 dark:hover:border-primary/30 h-60 flex flex-col overflow-hidden"
            onClick={() => handleCourseClick(course)}
          >
            <CardContent className="p-3 flex flex-col h-full">
              {/* Compact Course Image */}
              <div className="relative mb-2">
                <div className="h-16 rounded-lg overflow-hidden bg-gradient-to-br from-muted to-muted/50">
                  {course.image_url ? (
                    <img
                      src={course.image_url}
                      alt={course.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      onError={(e) => {
                        console.log('Image failed to load:', course.image_url);
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        target.nextElementSibling?.classList.remove('hidden');
                      }}
                    />
                  ) : null}
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/10 to-primary/20 hidden">
                    <BookOpen className="w-4 h-4 text-primary/60" />
                  </div>
                  {!course.image_url && (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/10 to-primary/20">
                      <BookOpen className="w-4 h-4 text-primary/60" />
                    </div>
                  )}
                </div>
                
                {/* Compact Progress Indicator */}
                <div className="absolute bottom-0.5 left-0.5 right-0.5">
                  <div className="w-full bg-black/20 rounded-full h-1">
                    <div
                      className={`h-1 rounded-full transition-all duration-300 ${getProgressColor(course.progress_percentage)}`}
                      style={{ width: `${course.progress_percentage}%` }}
                    />
                  </div>
                </div>

                {/* Compact Completion Badge */}
                {course.is_completed && (
                  <div className="absolute top-1 right-1">
                    <div className="w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
                      <CheckCircle className="w-2.5 h-2.5 text-white" />
                    </div>
                  </div>
                )}

                {/* Compact Level Badge */}
                {course.level && (
                  <div className="absolute top-1 left-1">
                    <Badge variant="secondary" className="text-xs px-1 py-0.5">
                      {course.level}
                    </Badge>
                  </div>
                )}
              </div>

              {/* Course Title */}
              <div className="mb-2">
                <h3 className="font-medium text-xs line-clamp-1 group-hover:text-primary transition-colors">
                  {course.title}
                </h3>
                <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                  {course.subtitle || 'Course'}
                </p>
              </div>

              {/* Compact Course Stats - Horizontal Layout */}
              <div className="flex items-center justify-between text-xs text-muted-foreground mb-2 flex-1 min-h-0">
                <div className="flex items-center gap-1 min-w-0 flex-1">
                  <Target className="w-2.5 h-2.5 flex-shrink-0" />
                  <span className="truncate">{course.completed_lessons}/{course.total_lessons}</span>
                </div>
                <div className="flex items-center gap-1 min-w-0 flex-1 justify-center">
                  <Clock className="w-2.5 h-2.5 flex-shrink-0" />
                  <span className="truncate">{course.last_accessed ? 'Recent' : 'Never'}</span>
                </div>
                <div className="flex items-center gap-1 min-w-0 flex-1 justify-end">
                  <TrendingUp className="w-2.5 h-2.5 flex-shrink-0" />
                  <span className="truncate">{course.progress_percentage}%</span>
                </div>
              </div>

              {/* Progress Section */}
              <div className="space-y-1 mb-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground text-xs">Progress</span>
                  <span className="font-medium text-primary text-xs">{course.progress_percentage}%</span>
                </div>
                <Progress value={course.progress_percentage} className="h-1.5" />
              </div>

              {/* Compact Action Button */}
              <div className="mt-auto pt-1">
                <Button
                  asChild
                  size="sm"
                  className="w-full h-7 text-xs"
                >
                  <Link to={course.progress_percentage > 0 ? `/dashboard/courses/${course.course_id}/content` : `/dashboard/courses/${course.course_id}`}>
                    <div className="flex items-center gap-1">
                      {course.progress_percentage === 100 ? (
                        <>
                          <BookOpen className="w-3 h-3" />
                          Review
                        </>
                      ) : course.progress_percentage > 0 ? (
                        <>
                          <TrendingUp className="w-3 h-3" />
                          Continue
                        </>
                      ) : (
                        <>
                          <BookOpen className="w-3 h-3" />
                          Start
                        </>
                      )}
                    </div>
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
