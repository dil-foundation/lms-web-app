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
  MoreHorizontal,
  Calendar,
  GraduationCap
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

interface StudentListViewProps {
  students: Student[];
  onStudentClick?: (student: Student) => void;
  onMessage?: (student: Student) => void;
  onViewProfile?: (student: Student) => void;
  onGrade?: (student: Student) => void;
  onEdit?: (student: Student) => void;
  onRemove?: (student: Student) => void;
  className?: string;
}

export const StudentListView: React.FC<StudentListViewProps> = ({
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
        return <CheckCircle className="w-4 h-4" />;
      case 'inactive':
        return <Clock className="w-4 h-4" />;
      case 'unverified':
        return <AlertCircle className="w-4 h-4" />;
      default:
        return <UserX className="w-4 h-4" />;
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
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
      <div className="space-y-2">
        {students.map((student) => (
          <Card
            key={student.id}
            className="group cursor-pointer hover:shadow-md transition-all duration-200 hover:bg-muted/50 border border-border/50 shadow-sm bg-card/95 backdrop-blur-sm dark:bg-card dark:border-border/60 hover:border-border dark:hover:border-border border-l-4 border-l-transparent hover:border-l-primary"
            onClick={() => handleStudentClick(student)}
          >
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                {/* Avatar */}
                <div className="flex-shrink-0">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={student.avatar_url || student.avatar} />
                    <AvatarFallback className="bg-primary/20 text-primary font-semibold">
                      {student.firstName?.[0]}{student.lastName?.[0]}
                    </AvatarFallback>
                  </Avatar>
                </div>

                {/* Student Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      {/* Name and badges */}
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-base text-foreground group-hover:text-primary transition-colors truncate">
                          {student.name}
                        </h3>
                        
                        {/* Course Badge */}
                        <Badge variant="outline" className="text-xs">
                          <BookOpen className="w-3 h-3 mr-1" />
                          {student.course}
                        </Badge>

                        {/* Grade Badge */}
                        {student.grade && getGradeBadge(student.grade)}

                        {/* Status Badge */}
                        <Badge 
                          variant="default" 
                          className={`text-xs ${getStatusColor(student.status)} text-white`}
                        >
                          {getStatusIcon(student.status)}
                          <span className="ml-1 capitalize">{student.status}</span>
                        </Badge>
                      </div>

                      {/* Email */}
                      <p className="text-sm text-muted-foreground line-clamp-1 mb-2">
                        {student.email}
                      </p>

                      {/* Student Stats */}
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          <span>Enrolled {formatDate(student.enrolledDate)}</span>
                        </div>
                        
                        <div className="flex items-center gap-1">
                          <Activity className="w-4 h-4" />
                          <span>Last active {student.lastActive}</span>
                        </div>
                      </div>
                    </div>

                    {/* Progress and Actions */}
                    <div className="flex items-center gap-4 ml-4">
                      {/* Progress */}
                      <div className="w-32">
                        <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                          <span>Progress</span>
                          <span className="font-medium text-primary">{student.progress}%</span>
                        </div>
                        <Progress 
                          value={student.progress} 
                          className="h-2"
                        />
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          className="hover:bg-primary/10 hover:text-primary transition-all duration-200"
                          onClick={(e) => handleMessage(e, student)}
                        >
                          <Mail className="w-4 h-4 mr-2" />
                          Message
                        </Button>

                        <Button
                          size="sm"
                          variant="outline"
                          className="hover:bg-blue-500/10 hover:text-blue-500 transition-all duration-200"
                          onClick={(e) => handleViewProfile(e, student)}
                        >
                          <Users className="w-4 h-4 mr-2" />
                          Profile
                        </Button>

                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0 hover:bg-muted"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <MoreHorizontal className="w-4 h-4" />
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
