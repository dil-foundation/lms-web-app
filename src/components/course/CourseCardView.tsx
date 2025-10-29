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
  Star,
  Award,
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
  totalLessons: number;
  authorName: string;
  authorId: string;
  duration: string;
}

interface CourseCardViewProps {
  courses: Course[];
  onDelete: (course: Course) => void;
  className?: string;
}

export const CourseCardView: React.FC<CourseCardViewProps> = ({
  courses,
  onDelete,
  className = "",
}) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { profile } = useUserProfile();
  
  const isAdmin = profile?.role === 'admin' || profile?.role === 'super_user';
  const isTeacher = profile?.role === 'teacher' || profile?.role === 'content_creator';

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
    // Content creators cannot delete courses, only admins and teachers can
    if (profile?.role === 'content_creator') return false;
    
    return profile && (
      isAdmin ||
      (profile.role === 'teacher' && course.status === 'Draft' && user?.id === course.authorId)
    );
  };

  const handleCourseClick = (course: Course) => {
    navigate(`/dashboard/courses/builder/${course.id}`);
  };

  const handleEdit = (e: React.MouseEvent, course: Course) => {
    e.stopPropagation();
    navigate(`/dashboard/courses/builder/${course.id}`);
  };

  const handleView = (e: React.MouseEvent, course: Course) => {
    e.stopPropagation();
    navigate(`/dashboard/courses/builder/${course.id}`);
  };

  const handleDelete = (e: React.MouseEvent, course: Course) => {
    e.stopPropagation();
    onDelete(course);
  };

  return (
    <div className={className}>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 w-full overflow-hidden">
        {courses.map((course) => (
          <Card
            key={course.id}
            className="group cursor-pointer hover:shadow-xl transition-all duration-300 hover:-translate-y-2 border border-border/50 shadow-lg bg-gradient-to-br from-card to-card/50 dark:bg-card dark:border-border/60 hover:border-primary/40 dark:hover:border-primary/40 h-96 flex flex-col overflow-hidden rounded-2xl"
            onClick={() => handleCourseClick(course)}
          >
            <CardHeader className="p-0 relative">
              <img 
                src={course.imageUrl} 
                alt={course.title} 
                className="w-full h-48 object-cover"
              />
              <div className="absolute top-3 left-3 right-3 flex justify-between items-start">
                <Badge
                  variant={
                    course.status === 'Published' ? 'default' :
                    course.status === 'Rejected' ? 'destructive' :
                    course.status === 'Under Review' ? 'warning' :
                    'blue'
                  }
                  className="text-sm px-3 py-1"
                >
                  {course.status}
                </Badge>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0 hover:bg-white/20 text-white"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <MoreHorizontal className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={(e) => handleEdit(e, course)}>
                      <Edit className="w-4 h-4 mr-2" />
                      Edit
                    </DropdownMenuItem>
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
              </div>
            </CardHeader>
            
            <CardContent className="p-6 flex flex-col h-full overflow-hidden">
              {/* Course Title and Author */}
              <div className="mb-4">
                <h3 className="font-bold text-lg line-clamp-2 mb-2 group-hover:text-primary transition-colors">
                  {course.title}
                </h3>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <User className="w-4 h-4" />
                  <span className="truncate">By {course.authorName}</span>
                </div>
              </div>

              {/* Detailed Course Stats */}
              <div className="space-y-3 text-sm text-muted-foreground mb-6 flex-1 min-h-0">
                <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                  <Users className="w-4 h-4 text-primary" />
                  <div>
                    <div className="font-medium text-foreground">Students Enrolled</div>
                    <div className="text-xs">{course.totalStudents} students</div>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                  <BookOpen className="w-4 h-4 text-primary" />
                  <div>
                    <div className="font-medium text-foreground">Course Content</div>
                    <div className="text-xs">{course.totalLessons} lessons</div>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                  <Clock className="w-4 h-4 text-primary" />
                  <div>
                    <div className="font-medium text-foreground">Duration</div>
                    <div className="text-xs">{course.duration}</div>
                  </div>
                </div>
              </div>

              {/* Enhanced Action Button */}
              <div className="mt-auto">
                <Button
                  size="sm"
                  className="w-full h-10 text-sm font-medium"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCourseClick(course);
                  }}
                >
                  <Play className="w-4 h-4 mr-2" />
                  Manage Course
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
