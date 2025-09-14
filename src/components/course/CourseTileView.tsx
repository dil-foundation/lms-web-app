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
    return user && (
      user.app_metadata.role === 'admin' ||
      (user.app_metadata.role === 'teacher' && course.status === 'Draft' && user.id === course.authorId)
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
    // Navigate to course view or content
    navigate(`/dashboard/courses/builder/${course.id}`);
  };

  const handleDelete = (e: React.MouseEvent, course: Course) => {
    e.stopPropagation();
    onDelete(course);
  };

  return (
    <div className={className}>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 w-full overflow-hidden">
        {courses.map((course) => (
          <Card
            key={course.id}
            className="group cursor-pointer hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border border-border/50 shadow-md bg-card/95 backdrop-blur-sm dark:bg-card dark:border-border/60 hover:border-border dark:hover:border-border h-full overflow-hidden"
            onClick={() => handleCourseClick(course)}
          >
            <CardHeader className="p-0 relative">
              <img 
                src={course.imageUrl} 
                alt={course.title} 
                className="w-full h-32 object-cover rounded-t-lg"
              />
              <div className="absolute top-2 left-2 right-2 flex justify-between items-start">
                <Badge
                  variant={
                    course.status === 'Published' ? 'default' :
                    course.status === 'Rejected' ? 'destructive' :
                    course.status === 'Under Review' ? 'warning' :
                    'blue'
                  }
                  className="text-xs"
                >
                  {course.status}
                </Badge>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 w-6 p-0 hover:bg-white/20 text-white"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <MoreHorizontal className="w-3 h-3" />
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
            
            <CardContent className="p-4 flex flex-col h-full overflow-hidden">
              {/* Course Title */}
              <div className="mb-3">
                <h3 className="font-semibold text-sm line-clamp-2 mb-1 group-hover:text-primary transition-colors">
                  {course.title}
                </h3>
              </div>

              {/* Course Stats */}
              <div className="space-y-2 text-xs text-muted-foreground mb-4 flex-1 min-h-0">
                <div className="flex items-center gap-2">
                  <Users className="w-3 h-3" />
                  <span>{course.totalStudents} students</span>
                </div>
                <div className="flex items-center gap-2">
                  <BookOpen className="w-3 h-3" />
                  <span>{course.totalLessons} lessons</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-3 h-3" />
                  <span>{course.duration}</span>
                </div>
                <div className="flex items-center gap-2">
                  <User className="w-3 h-3" />
                  <span className="truncate">{course.authorName}</span>
                </div>
              </div>

              {/* Action Button - Fixed positioning */}
              <div className="mt-auto pt-2">
                <Button
                  size="sm"
                  className="w-full h-8 text-xs"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCourseClick(course);
                  }}
                >
                  <Play className="w-3 h-3 mr-1" />
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