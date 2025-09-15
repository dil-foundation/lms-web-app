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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {courses.map((course) => (
          <Card
            key={course.course_id}
            className="group cursor-pointer hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border border-border/50 shadow-md bg-card/95 backdrop-blur-sm dark:bg-card dark:border-border/60 hover:border-border dark:hover:border-border"
            onClick={() => handleCourseClick(course)}
          >
            <CardContent className="p-4">
              {/* Course Image */}
              <div className="relative mb-3">
                <div className="aspect-square rounded-lg overflow-hidden bg-gradient-to-br from-muted to-muted/50">
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
                    <BookOpen className="w-8 h-8 text-primary/60" />
                  </div>
                  {!course.image_url && (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/10 to-primary/20">
                      <BookOpen className="w-8 h-8 text-primary/60" />
                    </div>
                  )}
                </div>
                
                {/* Progress Indicator */}
                <div className="absolute bottom-1 left-1 right-1">
                  <div className="w-full bg-black/20 rounded-full h-1">
                    <div
                      className={`h-1 rounded-full transition-all duration-300 ${getProgressColor(course.progress_percentage)}`}
                      style={{ width: `${course.progress_percentage}%` }}
                    />
                  </div>
                </div>

                {/* Completion Badge */}
                {course.is_completed && (
                  <div className="absolute top-2 right-2">
                    <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                      <CheckCircle className="w-4 h-4 text-white" />
                    </div>
                  </div>
                )}

                {/* Level Badge */}
                {course.level && (
                  <div className="absolute top-2 left-2">
                    <Badge variant="secondary" className="text-xs px-1.5 py-0.5">
                      {course.level}
                    </Badge>
                  </div>
                )}
              </div>

              {/* Course Info */}
              <div className="space-y-2">
                <h3 className="font-semibold text-sm leading-tight line-clamp-2 text-foreground group-hover:text-primary transition-colors">
                  {course.title}
                </h3>
                
                {course.subtitle && (
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {course.subtitle}
                  </p>
                )}

                {/* Progress Status */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Progress</span>
                    <span className="font-medium text-primary">{course.progress_percentage}%</span>
                  </div>
                  <Progress value={course.progress_percentage} className="h-1.5" />
                  <p className="text-xs text-muted-foreground">
                    {getProgressStatus(course.progress_percentage)}
                  </p>
                </div>

                {/* Course Stats */}
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Target className="w-3 h-3" />
                    <span>{course.completed_lessons}/{course.total_lessons}</span>
                  </div>
                  
                  {course.last_accessed && (
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      <span>Recent</span>
                    </div>
                  )}
                </div>

                {/* Action Button */}
                <Button
                  asChild
                  size="sm"
                  variant="outline"
                  className="w-full h-7 text-xs hover:bg-primary hover:text-primary-foreground transition-all duration-200"
                >
                  <Link to={course.progress_percentage > 0 ? `/dashboard/courses/${course.course_id}/content` : `/dashboard/courses/${course.course_id}`}>
                    <div className="flex items-center gap-1">
                      {course.progress_percentage > 0 ? (
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
