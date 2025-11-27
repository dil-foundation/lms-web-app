import React from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
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

interface CourseTileViewProps {
  courses: Course[];
  onDelete: (course: Course) => void;
  className?: string;
}

export const CourseTileView: React.FC<CourseTileViewProps> = ({
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
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-2 sm:gap-3 md:gap-4 w-full overflow-hidden">
        {courses.map((course) => (
          <Card
            key={course.id}
            className="group cursor-pointer hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border border-border/50 shadow-sm bg-card/95 backdrop-blur-sm dark:bg-card dark:border-border/60 hover:border-primary/30 dark:hover:border-primary/30 h-[250px] sm:h-[260px] md:h-[270px] flex flex-col overflow-hidden"
            onClick={() => handleCourseClick(course)}
          >
            <CardHeader className="p-0 relative flex-shrink-0">
              <img 
                src={course.imageUrl} 
                alt={course.title} 
                className="w-full h-20 sm:h-[72px] md:h-20 object-cover"
              />
              <div className="absolute top-1 left-1 right-1 flex justify-between items-start gap-1">
                <Badge
                  variant={
                    course.status === 'Published' ? 'default' :
                    course.status === 'Rejected' ? 'destructive' :
                    course.status === 'Under Review' ? 'warning' :
                    'blue'
                  }
                  className="text-[10px] sm:text-xs px-1 sm:px-1.5 py-0.5 max-w-[70%] truncate"
                >
                  {course.status}
                </Badge>
                {!isViewOnly && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-5 w-5 sm:h-6 sm:w-6 p-0 hover:bg-white/20 text-white backdrop-blur-sm"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MoreHorizontal className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
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
            </CardHeader>
            
            <CardContent className="p-2 sm:p-2.5 md:p-3 flex flex-col justify-between h-full overflow-hidden">
              <div className="flex-shrink-0">
                {/* Course Title */}
                <div className="mb-1.5 sm:mb-2">
                  <h3 className="font-medium text-[11px] sm:text-xs md:text-sm line-clamp-2 group-hover:text-primary transition-colors leading-tight">
                    {course.title}
                  </h3>
                </div>

                {/* Compact Course Stats - Horizontal Layout */}
                <div className="space-y-0.5 sm:space-y-1 text-[10px] sm:text-xs text-muted-foreground">
                  <div className="flex items-center justify-between gap-1">
                    <div className="flex items-center gap-0.5 sm:gap-1 min-w-0">
                      <Users className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-blue-600 flex-shrink-0" />
                      <span className="truncate">{course.totalStudents}</span>
                    </div>
                    <div className="flex items-center gap-0.5 sm:gap-1 min-w-0">
                      <Users className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-green-600 flex-shrink-0" />
                      <span className="truncate">{course.totalTeachers}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-1">
                    <div className="flex items-center gap-0.5 sm:gap-1 min-w-0">
                      <BookOpen className="w-2.5 h-2.5 sm:w-3 sm:h-3 flex-shrink-0" />
                      <span className="truncate">{course.totalLessons}</span>
                    </div>
                    <div className="flex items-center gap-0.5 sm:gap-1 min-w-0">
                      <Clock className="w-2.5 h-2.5 sm:w-3 sm:h-3 flex-shrink-0" />
                      <span className="truncate text-[9px] sm:text-[10px] md:text-xs">{course.duration}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Compact Action Button */}
              <div className="mt-2 flex-shrink-0">
                <Button
                  size="sm"
                  className={`w-full h-7 sm:h-8 text-[10px] sm:text-xs ${
                    (isAdmin || isContentCreator) 
                      ? 'bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary text-white' 
                      : 'bg-primary hover:bg-primary/90 text-primary-foreground'
                  }`}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCourseClick(course);
                  }}
                >
                  <Play className="w-2.5 h-2.5 sm:w-3 sm:h-3 mr-1" />
                  <span className="truncate">{(isAdmin || isContentCreator) ? 'Manage' : 'View'}</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};