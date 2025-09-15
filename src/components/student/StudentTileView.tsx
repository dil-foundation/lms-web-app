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
  onGrade?: (student: Student) => void;
  onEdit?: (student: Student) => void;
  onRemove?: (student: Student) => void;
  className?: string;
}

export const StudentTileView: React.FC<StudentTileViewProps> = ({
  students,
  onStudentClick,
  onMessage,
  onViewProfile,
  onGrade,
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
      onMessage(student);
    }
  };

  const handleViewProfile = (e: React.MouseEvent, student: Student) => {
    e.stopPropagation();
    if (onViewProfile) {
      onViewProfile(student);
    }
  };

  const handleGrade = (e: React.MouseEvent, student: Student) => {
    e.stopPropagation();
    if (onGrade) {
      onGrade(student);
    }
  };

  const handleEdit = (e: React.MouseEvent, student: Student) => {
    e.stopPropagation();
    if (onEdit) {
      onEdit(student);
    }
  };

  const handleRemove = (e: React.MouseEvent, student: Student) => {
    e.stopPropagation();
    if (onRemove) {
      onRemove(student);
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {students.map((student) => (
          <Card
            key={student.id}
            className="group cursor-pointer hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border border-border/50 shadow-md bg-card/95 backdrop-blur-sm dark:bg-card dark:border-border/60 hover:border-border dark:hover:border-border h-full"
            onClick={() => handleStudentClick(student)}
          >
            <CardContent className="p-4 flex flex-col h-full">
              {/* Header with status */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex flex-wrap gap-1">
                  <Badge variant="outline" className="text-xs">
                    <BookOpen className="w-3 h-3 mr-1" />
                    {student.course}
                  </Badge>
                  {student.grade && getGradeBadge(student.grade)}
                </div>
                
                {/* Status Badge */}
                <Badge 
                  variant="default" 
                  className={`text-xs ${getStatusColor(student.status)} text-white`}
                >
                  {getStatusIcon(student.status)}
                  <span className="ml-1 capitalize">{student.status}</span>
                </Badge>
              </div>

              {/* Student Info */}
              <div className="flex items-center gap-3 mb-3 flex-1">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={student.avatar_url || student.avatar} />
                  <AvatarFallback className="bg-primary/20 text-primary font-semibold">
                    {student.firstName?.[0]}{student.lastName?.[0]}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-sm leading-tight line-clamp-1 text-foreground group-hover:text-primary transition-colors">
                    {student.name}
                  </h3>
                  <p className="text-xs text-muted-foreground line-clamp-1">
                    {student.email}
                  </p>
                </div>
              </div>

              {/* Progress */}
              <div className="space-y-2 mb-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Progress</span>
                  <span className="font-medium text-primary">{student.progress}%</span>
                </div>
                <Progress 
                  value={student.progress} 
                  className="h-2"
                />
              </div>

              {/* Stats */}
              <div className="flex items-center justify-between text-xs text-muted-foreground mb-3">
                <div className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  <span>Enrolled {formatDate(student.enrolledDate)}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Activity className="w-3 h-3" />
                  <span>{student.lastActive}</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-1 mt-auto">
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1 h-7 text-xs hover:bg-primary/10 hover:text-primary transition-all duration-200 min-w-0"
                  onClick={(e) => handleMessage(e, student)}
                >
                  <Mail className="w-3 h-3 mr-1 flex-shrink-0" />
                  <span className="truncate">Message</span>
                </Button>
                
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1 h-7 text-xs hover:bg-blue-500/10 hover:text-blue-500 transition-all duration-200 min-w-0"
                  onClick={(e) => handleViewProfile(e, student)}
                >
                  <Users className="w-3 h-3 mr-1 flex-shrink-0" />
                  <span className="truncate">Profile</span>
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
                    <DropdownMenuItem onClick={(e) => handleGrade(e, student)}>
                      <Target className="w-4 h-4 mr-2" />
                      Grade
                    </DropdownMenuItem>
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
