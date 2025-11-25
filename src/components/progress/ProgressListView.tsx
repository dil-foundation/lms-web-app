import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { BookOpen, CheckCircle, Clock, Target, TrendingUp, Award, Calendar } from 'lucide-react';
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
  author?: {
    first_name: string;
    last_name: string;
  };
}

interface ProgressListViewProps {
  courses: CourseProgress[];
  onCourseClick?: (course: CourseProgress) => void;
  className?: string;
}

export const ProgressListView: React.FC<ProgressListViewProps> = ({
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

  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <div className={className}>
      <div className="space-y-2">
        {courses.map((course) => (
          <Card
            key={course.course_id}
            className="group cursor-pointer hover:shadow-md transition-all duration-200 hover:bg-muted/50 border border-border/50 shadow-sm bg-card/95 backdrop-blur-sm dark:bg-card dark:border-border/60 hover:border-border dark:hover:border-border border-l-4 border-l-transparent hover:border-l-primary"
            onClick={() => handleCourseClick(course)}
          >
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-start sm:items-center gap-3 sm:gap-4">
                {/* Course Image */}
                <div className="relative flex-shrink-0">
                  <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-lg overflow-hidden bg-gradient-to-br from-muted to-muted/50">
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
                      <BookOpen className="w-6 h-6 text-primary/60" />
                    </div>
                    {!course.image_url && (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/10 to-primary/20">
                        <BookOpen className="w-6 h-6 text-primary/60" />
                      </div>
                    )}
                  </div>
                  
                  {/* Completion Badge */}
                  {course.is_completed && (
                    <div className="absolute -top-1 -right-1">
                      <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                        <CheckCircle className="w-3 h-3 text-white" />
                      </div>
                    </div>
                  )}
                </div>

                {/* Course Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3 sm:gap-4">
                    <div className="flex-1 min-w-0">
                      {/* Title */}
                      <div className="mb-1.5 sm:mb-2">
                        <h3 className="font-semibold text-sm sm:text-base text-foreground group-hover:text-primary transition-colors line-clamp-1 mb-1.5">
                          {course.title}
                        </h3>
                        
                        {/* Badges - Wrapped to prevent overlapping */}
                        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                          {/* Level Badge */}
                          {course.level && (
                            <Badge variant="secondary" className="text-[10px] sm:text-xs flex-shrink-0">
                              {course.level}
                            </Badge>
                          )}

                          {/* Category Badge */}
                          {course.category && (
                            <Badge variant="outline" className="text-[10px] sm:text-xs flex-shrink-0">
                              {course.category}
                            </Badge>
                          )}

                          {/* Completion Badge */}
                          {course.is_completed && (
                            <Badge variant="default" className="text-[10px] sm:text-xs bg-green-500 flex-shrink-0">
                              <Award className="w-2.5 h-2.5 sm:w-3 sm:h-3 mr-0.5 sm:mr-1" />
                              Completed
                            </Badge>
                          )}
                        </div>
                      </div>

                      {/* Subtitle */}
                      {course.subtitle && (
                        <p className="text-xs sm:text-sm text-muted-foreground line-clamp-1 mb-1.5 sm:mb-2">
                          {course.subtitle}
                        </p>
                      )}

                      {/* Course Stats */}
                      <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-3 md:gap-4 text-xs sm:text-sm text-muted-foreground mt-2">
                        <div className="flex items-center gap-1">
                          <Target className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
                          <span className="truncate">{course.completed_lessons} of {course.total_lessons} lessons</span>
                        </div>
                        
                        {course.author && (
                          <div className="flex items-center gap-1">
                            <BookOpen className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
                            <span className="truncate">{course.author.first_name} {course.author.last_name}</span>
                          </div>
                        )}

                        {course.last_accessed && (
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
                            <span className="truncate">Last accessed {formatDate(course.last_accessed)}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Progress and Action */}
                    <div className="flex flex-col items-end gap-2 sm:gap-2.5 ml-2 sm:ml-4 flex-shrink-0">
                      {/* Progress */}
                      <div className="w-36 sm:w-44 md:w-48">
                        <div className="flex items-center justify-between text-[10px] sm:text-xs text-muted-foreground mb-1">
                          <span className="truncate mr-1">{getProgressStatus(course.progress_percentage)}</span>
                          <span className="font-medium text-primary flex-shrink-0">{course.progress_percentage}%</span>
                        </div>
                        <Progress 
                          value={course.progress_percentage} 
                          className="h-1.5 sm:h-2"
                        />
                      </div>

                      {/* Action Button */}
                      <Button
                        asChild
                        size="sm"
                        variant="outline"
                        className="h-8 sm:h-9 text-[11px] sm:text-xs hover:bg-primary hover:text-primary-foreground transition-all duration-200 whitespace-nowrap"
                      >
                        <Link to={course.progress_percentage > 0 ? `/dashboard/courses/${course.course_id}/content` : `/dashboard/courses/${course.course_id}`}>
                          <div className="flex items-center gap-1.5 sm:gap-2">
                            {course.progress_percentage > 0 ? (
                              <>
                                <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                                <span className="hidden sm:inline">Continue Learning</span>
                                <span className="sm:hidden">Continue</span>
                              </>
                            ) : (
                              <>
                                <BookOpen className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                                <span className="hidden sm:inline">Start Course</span>
                                <span className="sm:hidden">Start</span>
                              </>
                            )}
                          </div>
                        </Link>
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
