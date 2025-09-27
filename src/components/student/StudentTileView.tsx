import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Users, 
  Mail, 
  Clock, 
  Target, 
  BookOpen, 
  Activity,
  CheckCircle,
  AlertCircle,
  UserX,
  MoreHorizontal
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface Student {
  id: string;
  name: string;
  firstName: string;
  lastName: string;
  email: string;
  avatar: string;
  avatar_url?: string;
  enrolledDate: string;
  course: string;
  progress: number;
  status: 'active' | 'inactive' | 'unverified';
  lastActive: string;
  grade?: string;
}

interface StudentTileViewProps {
  students: Student[];
  onStudentClick?: (student: Student) => void;
  onMessage?: (student: Student) => void;
  onViewProfile?: (student: Student) => void;
  onEdit?: (student: Student) => void;
  onRemove?: (student: Student) => void;
  className?: string;
}

export const StudentTileView: React.FC<StudentTileViewProps> = ({
  students,
  onStudentClick,
  onMessage,
  onViewProfile,
  onEdit,
  onRemove,
  className
}) => {
  const getGradeBadge = (grade: string) => {
    const gradeNum = parseInt(grade);
    if (gradeNum <= 5) return <Badge variant="default" className="bg-blue-600 text-white">Grade {grade}</Badge>;
    if (gradeNum <= 8) return <Badge variant="default" className="bg-green-600 text-white">Grade {grade}</Badge>;
    if (gradeNum <= 10) return <Badge variant="default" className="bg-yellow-600 text-white">Grade {grade}</Badge>;
    return <Badge variant="default" className="bg-purple-600 text-white">Grade {grade}</Badge>;
  };
  const handleStudentClick = (student: Student) => {
    if (onStudentClick) {
      onStudentClick(student);
    }
  };

  const handleMessage = (e: React.MouseEvent, student: Student) => {
    e.stopPropagation();
    if (onMessage) {
      // Small delay to ensure dropdown is fully closed
      setTimeout(() => {
        onMessage(student);
      }, 100);
    }
  };

  const handleViewProfile = (e: React.MouseEvent, student: Student) => {
    e.stopPropagation();
    if (onViewProfile) {
      // Small delay to ensure dropdown is fully closed
      setTimeout(() => {
        onViewProfile(student);
      }, 100);
    }
  };


  const handleEdit = (e: React.MouseEvent, student: Student) => {
    e.stopPropagation();
    if (onEdit) {
      // Small delay to ensure dropdown is fully closed
      setTimeout(() => {
        onEdit(student);
      }, 100);
    }
  };

  const handleRemove = (e: React.MouseEvent, student: Student) => {
    e.stopPropagation();
    if (onRemove) {
      // Small delay to ensure dropdown is fully closed
      setTimeout(() => {
        onRemove(student);
      }, 100);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-500';
      case 'inactive':
        return 'bg-yellow-500';
      case 'unverified':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="w-3 h-3" />;
      case 'inactive':
        return <Clock className="w-3 h-3" />;
      case 'unverified':
        return <AlertCircle className="w-3 h-3" />;
      default:
        return <UserX className="w-3 h-3" />;
    }
  };

  const getProgressColor = (progress: number) => {
    if (progress >= 80) return 'bg-green-500';
    if (progress >= 60) return 'bg-blue-500';
    if (progress >= 40) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return 'N/A';
    }
  };

  const getLastActiveText = (lastActiveDate: string): string => {
    try {
      if (!lastActiveDate || lastActiveDate === 'null' || lastActiveDate === 'undefined') return 'Never';
      
      const now = new Date();
      const lastActive = new Date(lastActiveDate);
      
      // Check if the date is valid
      if (isNaN(lastActive.getTime())) return 'Never';
      
      const diffInHours = Math.floor((now.getTime() - lastActive.getTime()) / (1000 * 60 * 60));
      
      if (diffInHours < 1) return 'Just now';
      if (diffInHours < 24) return `${diffInHours} hours ago`;
      
      const diffInDays = Math.floor(diffInHours / 24);
      if (diffInDays < 30) return `${diffInDays} days ago`;
      
      const diffInMonths = Math.floor(diffInDays / 30);
      // Ensure diffInMonths is a valid number
      if (isNaN(diffInMonths) || diffInMonths < 0) return 'Never';
      
      return `${diffInMonths} months ago`;
    } catch {
      return 'Never';
    }
  };

  return (
    <div className={className}>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
        {students.map((student) => (
          <Card
            key={student.id}
            className="group cursor-pointer hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border border-border/50 shadow-sm bg-card/95 backdrop-blur-sm dark:bg-card dark:border-border/60 hover:border-primary/30 dark:hover:border-primary/30 h-40 flex flex-col overflow-hidden"
            onClick={() => handleStudentClick(student)}
          >
            <CardContent className="p-3 flex flex-col h-full">
              {/* Compact Header with Status */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1">
                  <Badge variant="outline" className="text-xs px-1.5 py-0.5">
                    <BookOpen className="w-2.5 h-2.5 mr-1" />
                    {student.course}
                  </Badge>
                </div>
                
                {/* Compact Status Indicator */}
                <div className={`w-2 h-2 rounded-full ${getStatusColor(student.status)}`} 
                     title={`${student.status.charAt(0).toUpperCase() + student.status.slice(1)}`} />
              </div>

              {/* Compact Student Info */}
              <div className="flex items-center gap-2 mb-2 flex-1">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={student.avatar_url || student.avatar} />
                  <AvatarFallback className="bg-primary/20 text-primary font-semibold text-xs">
                    {student.firstName?.[0]}{student.lastName?.[0]}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-xs leading-tight line-clamp-1 text-foreground group-hover:text-primary transition-colors">
                    {student.name}
                  </h3>
                  <p className="text-xs text-muted-foreground line-clamp-1">
                    {student.email}
                  </p>
                </div>
              </div>

              {/* Compact Progress */}
              <div className="space-y-1 mb-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground text-xs">Progress</span>
                  <span className="font-medium text-primary text-xs">{student.progress}%</span>
                </div>
                <Progress 
                  value={student.progress} 
                  className="h-1.5"
                />
              </div>

              {/* Compact Action Buttons */}
              <div className="flex items-center gap-1 mt-auto pt-1">
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1 h-7 text-xs hover:bg-primary/10 hover:text-primary transition-all duration-200 min-w-0 px-1"
                  onClick={(e) => handleMessage(e, student)}
                >
                  <Mail className="w-3 h-3" />
                </Button>
                
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1 h-7 text-xs hover:bg-blue-500/10 hover:text-blue-500 transition-all duration-200 min-w-0 px-1"
                  onClick={(e) => handleViewProfile(e, student)}
                >
                  <Users className="w-3 h-3" />
                </Button>
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 w-7 p-0 hover:bg-muted flex-shrink-0"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <MoreHorizontal className="w-3 h-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={(e) => handleEdit(e, student)}>
                      <Users className="w-4 h-4 mr-2" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      onClick={(e) => handleRemove(e, student)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <UserX className="w-4 h-4 mr-2" />
                      Remove
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
