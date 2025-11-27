import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  BookOpen,
  Users,
  Clock,
  Edit,
  Eye,
  MoreHorizontal,
  Trash2,
  Play,
  Calendar,
  User,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useUserProfile } from '@/hooks/useUserProfile';

type CourseStatus = "Published" | "Draft" | "Under Review" | "Rejected";

interface Course {
  id: string;
  title: string;
  status: CourseStatus;
  imageUrl: string;
  imagePath?: string;
  totalStudents: number;
  totalTeachers: number;
  totalLessons: number;
  authorName: string;
  authorId: string;
  duration: string;
}

interface CourseListViewProps {
  courses: Course[];
  onDelete: (course: Course) => void;
  className?: string;
}

export const CourseListView: React.FC<CourseListViewProps> = ({
  courses,
  onDelete,
  className = "",
}) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { profile } = useUserProfile();
  
  const isAdmin = profile?.role === 'admin' || profile?.role === 'super_user';
  const isContentCreator = profile?.role === 'content_creator';
  const isTeacher = profile?.role === 'teacher';
  const isViewOnly = profile?.role === 'view_only';

  const getStatusColor = (status: CourseStatus) => {
    switch (status) {
      case 'Published': return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      case 'Draft': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400';
      case 'Under Review': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400';
      case 'Rejected': return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
    }
  };

  const canDelete = (course: Course) => {
    if (!profile || !user) return false;
    
    // Admins and super users can delete any course
    if (isAdmin) return true;
    
    // Content creators can delete courses they authored
    if (profile.role === 'content_creator' && user.id === course.authorId) return true;
    
    // Teachers can delete draft courses they authored
    if (profile.role === 'teacher' && course.status === 'Draft' && user.id === course.authorId) return true;
    
    return false;
  };

  const handleCourseClick = (course: Course) => {
    if (isAdmin || isContentCreator) {
      navigate(`/dashboard/courses/builder/${course.id}`);
    } else {
      navigate(`/dashboard/courses/${course.id}`);
    }
  };

  const handleEdit = (e: React.MouseEvent, course: Course) => {
    e.stopPropagation();
    navigate(`/dashboard/courses/builder/${course.id}`);
  };

  const handleView = (e: React.MouseEvent, course: Course) => {
    e.stopPropagation();
    navigate(`/dashboard/courses/${course.id}`);
  };

  const handleDelete = (e: React.MouseEvent, course: Course) => {
    e.stopPropagation();
    onDelete(course);
  };

  return (
    <div className={className}>
      <div className="space-y-2 sm:space-y-3">
        {courses.map((course) => (
          <Card
            key={course.id}
            className="group cursor-pointer hover:bg-muted/50 transition-colors border border-border/50 shadow-md bg-card/95 backdrop-blur-sm dark:bg-card dark:border-border/60 hover:border-border dark:hover:border-border overflow-hidden"
            onClick={() => handleCourseClick(course)}
          >
            <CardContent className="p-3 sm:p-3 md:p-4">
              {/* Mobile Layout - Stacked (below 640px) */}
              <div className="flex flex-col gap-3 sm:hidden">
                <div className="flex items-start gap-3">
                  {/* Course Image */}
                  <div className="relative flex-shrink-0">
                    <img 
                      src={course.imageUrl} 
                      alt={course.title} 
                      className="w-20 h-14 object-cover rounded-lg"
                    />
                    <Badge
                      variant={
                        course.status === 'Published' ? 'default' :
                        course.status === 'Rejected' ? 'destructive' :
                        course.status === 'Under Review' ? 'warning' :
                        'blue'
                      }
                      className="absolute -top-1 -right-1 text-xs px-1.5 py-0.5"
                    >
                      {course.status}
                    </Badge>
                  </div>

                  {/* Course Info */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-sm group-hover:text-primary transition-colors line-clamp-2 mb-1">
                      {course.title}
                    </h3>
                    <p className="text-xs text-muted-foreground truncate">
                      By {course.authorName}
                    </p>
                  </div>

                  {/* Actions Menu */}
                  {!isViewOnly && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0 flex-shrink-0"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {(isAdmin || isContentCreator) ? (
                          <DropdownMenuItem onClick={(e) => handleEdit(e, course)}>
                            <Edit className="w-4 h-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem onClick={(e) => handleView(e, course)} disabled className="opacity-50">
                            <Eye className="w-4 h-4 mr-2" />
                            View Only
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem onClick={(e) => handleView(e, course)}>
                          <Eye className="w-4 h-4 mr-2" />
                          View
                        </DropdownMenuItem>
                        {canDelete(course) && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              onClick={(e) => handleDelete(e, course)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>

                {/* Course Stats */}
                <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground border-t border-border/50 pt-2">
                  <div className="flex items-center gap-1">
                    <Users className="w-3 h-3 text-blue-600" />
                    <span>{course.totalStudents} students</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Users className="w-3 h-3 text-green-600" />
                    <span>{course.totalTeachers} teachers</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <BookOpen className="w-3 h-3" />
                    <span>{course.totalLessons} lessons</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    <span>{course.duration}</span>
                  </div>
                </div>

                {/* Action Button */}
                <Button
                  size="sm"
                  className={`w-full h-8 text-xs ${
                    (isAdmin || isContentCreator) 
                      ? 'bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary text-white' 
                      : 'bg-primary hover:bg-primary/90 text-primary-foreground'
                  }`}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCourseClick(course);
                  }}
                >
                  <Play className="w-3 h-3 mr-1" />
                  {(isAdmin || isContentCreator) ? 'Manage' : 'View Course'}
                </Button>
              </div>

              {/* Tablet Layout - Optimized for tablet (640px - 1024px) */}
              <div className="hidden sm:flex md:hidden items-center gap-3">
                {/* Course Image */}
                <div className="relative flex-shrink-0">
                  <img 
                    src={course.imageUrl} 
                    alt={course.title} 
                    className="w-20 h-16 object-cover rounded-lg"
                  />
                  <Badge
                    variant={
                      course.status === 'Published' ? 'default' :
                      course.status === 'Rejected' ? 'destructive' :
                      course.status === 'Under Review' ? 'warning' :
                      'blue'
                    }
                    className="absolute -top-1 -right-1 text-[10px] px-1.5 py-0.5"
                  >
                    {course.status}
                  </Badge>
                </div>

                {/* Course Info */}
                <div className="flex-1 min-w-0">
                  <div className="mb-1.5">
                    <h3 className="font-semibold text-sm group-hover:text-primary transition-colors line-clamp-1">
                      {course.title}
                    </h3>
                  </div>
                  <p className="text-xs text-muted-foreground mb-2 truncate">
                    By {course.authorName}
                  </p>
                  
                  {/* Course Stats - Compact for tablet */}
                  <div className="flex items-center gap-3 text-[11px] text-muted-foreground flex-wrap">
                    <div className="flex items-center gap-1">
                      <Users className="w-3 h-3 text-blue-600 flex-shrink-0" />
                      <span className="truncate">{course.totalStudents}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Users className="w-3 h-3 text-green-600 flex-shrink-0" />
                      <span className="truncate">{course.totalTeachers}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <BookOpen className="w-3 h-3 flex-shrink-0" />
                      <span className="truncate">{course.totalLessons}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3 flex-shrink-0" />
                      <span className="truncate">{course.duration}</span>
                    </div>
                  </div>
                </div>

                {/* Actions - Compact for tablet */}
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <Button
                    size="sm"
                    className={`h-8 px-2.5 text-xs whitespace-nowrap ${
                      (isAdmin || isContentCreator) 
                        ? 'bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary text-white' 
                        : 'bg-primary hover:bg-primary/90 text-primary-foreground'
                    }`}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCourseClick(course);
                    }}
                  >
                    <Play className="w-3 h-3 mr-1" />
                    <span className="hidden sm:inline">{(isAdmin || isContentCreator) ? 'Manage' : 'View'}</span>
                  </Button>
                  
                  {!isViewOnly && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-40">
                        {(isAdmin || isContentCreator) ? (
                          <DropdownMenuItem onClick={(e) => handleEdit(e, course)}>
                            <Edit className="w-4 h-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem onClick={(e) => handleView(e, course)} disabled className="opacity-50">
                            <Eye className="w-4 h-4 mr-2" />
                            View Only
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem onClick={(e) => handleView(e, course)}>
                          <Eye className="w-4 h-4 mr-2" />
                          View
                        </DropdownMenuItem>
                        {canDelete(course) && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              onClick={(e) => handleDelete(e, course)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              </div>

              {/* Desktop Layout - Horizontal (1024px+) */}
              <div className="hidden md:flex items-center gap-4">
                {/* Course Image */}
                <div className="relative flex-shrink-0">
                  <img 
                    src={course.imageUrl} 
                    alt={course.title} 
                    className="w-20 h-16 object-cover rounded-lg"
                  />
                  <Badge
                    variant={
                      course.status === 'Published' ? 'default' :
                      course.status === 'Rejected' ? 'destructive' :
                      course.status === 'Under Review' ? 'warning' :
                      'blue'
                    }
                    className="absolute -top-1 -right-1 text-xs px-2 py-0.5"
                  >
                    {course.status}
                  </Badge>
                </div>

                {/* Course Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-sm lg:text-base group-hover:text-primary transition-colors truncate">
                      {course.title}
                    </h3>
                  </div>
                  <p className="text-xs lg:text-sm text-muted-foreground mb-2 truncate">
                    By {course.authorName} • {course.duration}
                  </p>
                  
                  {/* Course Stats */}
                  <div className="flex items-center gap-4 lg:gap-6 text-xs lg:text-sm text-muted-foreground flex-wrap">
                    <div className="flex items-center gap-1.5">
                      <Users className="w-3 h-3 lg:w-3.5 lg:h-3.5 text-blue-600 flex-shrink-0" />
                      <span className="whitespace-nowrap">{course.totalStudents} students</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Users className="w-3 h-3 lg:w-3.5 lg:h-3.5 text-green-600 flex-shrink-0" />
                      <span className="whitespace-nowrap">{course.totalTeachers} teachers</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <BookOpen className="w-3 h-3 lg:w-3.5 lg:h-3.5 flex-shrink-0" />
                      <span className="whitespace-nowrap">{course.totalLessons} lessons</span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Button
                    size="sm"
                    className={`h-9 px-3 lg:px-4 text-xs lg:text-sm whitespace-nowrap ${
                      (isAdmin || isContentCreator) 
                        ? 'bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary text-white' 
                        : 'bg-primary hover:bg-primary/90 text-primary-foreground'
                    }`}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCourseClick(course);
                    }}
                  >
                    <Play className="w-3 h-3 lg:w-3.5 lg:h-3.5 mr-1.5" />
                    {(isAdmin || isContentCreator) ? 'Manage' : 'View Course'}
                  </Button>
                  
                  {!isViewOnly && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-9 w-9 p-0"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-44">
                        {(isAdmin || isContentCreator) ? (
                          <DropdownMenuItem onClick={(e) => handleEdit(e, course)}>
                            <Edit className="w-4 h-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem onClick={(e) => handleView(e, course)} disabled className="opacity-50">
                            <Eye className="w-4 h-4 mr-2" />
                            View Only
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem onClick={(e) => handleView(e, course)}>
                          <Eye className="w-4 h-4 mr-2" />
                          View
                        </DropdownMenuItem>
                        {canDelete(course) && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              onClick={(e) => handleDelete(e, course)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};