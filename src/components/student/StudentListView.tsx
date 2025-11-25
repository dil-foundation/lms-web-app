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
  onEdit?: (student: Student) => void;
  className?: string;
}

export const StudentListView: React.FC<StudentListViewProps> = ({
  students,
  onStudentClick,
  onMessage,
  onViewProfile,
  onEdit,
  className
}) => {
  const getGradeBadge = (grade: string) => {
    const gradeNum = parseInt(grade);
    if (gradeNum <= 5) return <Badge variant="default" className="bg-blue-600 text-white text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 font-medium whitespace-nowrap">Grade {grade}</Badge>;
    if (gradeNum <= 8) return <Badge variant="default" className="bg-green-600 text-white text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 font-medium whitespace-nowrap">Grade {grade}</Badge>;
    if (gradeNum <= 10) return <Badge variant="default" className="bg-yellow-600 text-white text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 font-medium whitespace-nowrap">Grade {grade}</Badge>;
    return <Badge variant="default" className="bg-purple-600 text-white text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 font-medium whitespace-nowrap">Grade {grade}</Badge>;
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
        return <AlertCircle className="w-4 h-4" />;
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
            <CardContent className="p-3 sm:p-4 md:p-5">
              {/* Mobile Layout - Stacked */}
              <div className="flex flex-col gap-3 sm:hidden">
                <div className="flex items-start gap-3">
                  {/* Avatar */}
                  <Avatar className="h-10 w-10 sm:h-12 sm:w-12 flex-shrink-0">
                    <AvatarImage src={student.avatar_url || student.avatar} />
                    <AvatarFallback className="bg-primary/20 text-primary font-semibold text-xs sm:text-sm">
                      {student.firstName?.[0]}{student.lastName?.[0]}
                    </AvatarFallback>
                  </Avatar>

                  {/* Student Info */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-xs sm:text-sm text-foreground group-hover:text-primary transition-colors line-clamp-1 mb-0.5 sm:mb-1">
                      {student.name}
                    </h3>
                    <p className="text-[10px] sm:text-xs text-muted-foreground line-clamp-1 mb-1.5 sm:mb-2">
                      {student.email}
                    </p>
                    
                    {/* Badges */}
                    <div className="flex flex-wrap items-center gap-1">
                      <Badge variant="outline" className="text-[9px] sm:text-[10px] px-1 sm:px-1.5 py-0.5">
                        <BookOpen className="w-2 h-2 sm:w-2.5 sm:h-2.5 mr-0.5 sm:mr-1" />
                        <span className="truncate max-w-[80px] sm:max-w-[100px]">{student.course}</span>
                      </Badge>
                      {student.grade && getGradeBadge(student.grade)}
                      <Badge 
                        variant="default" 
                        className={`text-[9px] sm:text-[10px] px-1 sm:px-1.5 py-0.5 ${getStatusColor(student.status)} text-white`}
                      >
                        {getStatusIcon(student.status)}
                        <span className="ml-0.5 sm:ml-1 capitalize">{student.status}</span>
                      </Badge>
                    </div>
                  </div>

                  {/* Actions Menu */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 sm:h-8 sm:w-8 p-0 hover:bg-muted flex-shrink-0"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MoreHorizontal className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={(e) => handleMessage(e, student)}>
                        <Mail className="w-4 h-4 mr-2" />
                        Message
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={(e) => handleViewProfile(e, student)}>
                        <Users className="w-4 h-4 mr-2" />
                        Profile
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={(e) => handleEdit(e, student)}>
                        <Users className="w-4 h-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {/* Progress */}
                <div className="border-t border-border/50 pt-2 sm:pt-3">
                  <div className="flex items-center justify-between text-[10px] sm:text-xs text-muted-foreground mb-1.5 sm:mb-2">
                    <span>Progress</span>
                    <span className="font-medium text-primary">{student.progress}%</span>
                  </div>
                  <Progress 
                    value={student.progress} 
                    className="h-1.5 sm:h-2"
                  />
                </div>

                {/* Stats */}
                <div className="flex items-center justify-between text-[10px] sm:text-xs text-muted-foreground border-t border-border/50 pt-2 sm:pt-3">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                    <span className="truncate">{formatDate(student.enrolledDate)}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Activity className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                    <span className="truncate">{student.lastActive}</span>
                  </div>
                </div>
              </div>

              {/* Tablet/Desktop Layout - Horizontal */}
              <div className="hidden sm:flex gap-3 md:gap-4">
                {/* Avatar */}
                <div className="flex-shrink-0">
                  <Avatar className="h-11 w-11 md:h-12 md:w-12">
                    <AvatarImage src={student.avatar_url || student.avatar} />
                    <AvatarFallback className="bg-primary/20 text-primary font-semibold text-sm">
                      {student.firstName?.[0]}{student.lastName?.[0]}
                    </AvatarFallback>
                  </Avatar>
                </div>

                {/* Student Details */}
                <div className="flex-1 min-w-0">
                  {/* Name and Email */}
                  <div className="mb-2">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <h3 className="font-semibold text-sm md:text-base text-foreground group-hover:text-primary transition-colors truncate">
                        {student.name}
                      </h3>
                      
                      {/* Action Buttons - Right side for tablet/desktop */}
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <Button
                          size="sm"
                          variant="outline"
                          className="hover:bg-primary/10 hover:text-primary transition-all duration-200 text-xs h-8 px-2 md:px-3"
                          onClick={(e) => handleMessage(e, student)}
                        >
                          <Mail className="w-3.5 h-3.5 md:w-4 md:h-4 md:mr-2" />
                          <span className="hidden md:inline">Message</span>
                        </Button>

                        <Button
                          size="sm"
                          variant="outline"
                          className="hover:bg-blue-500/10 hover:text-blue-500 transition-all duration-200 text-xs h-8 px-2 md:px-3"
                          onClick={(e) => handleViewProfile(e, student)}
                        >
                          <Users className="w-3.5 h-3.5 md:w-4 md:h-4 md:mr-2" />
                          <span className="hidden md:inline">Profile</span>
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
                            <DropdownMenuItem onClick={(e) => handleEdit(e, student)}>
                              <Users className="w-4 h-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                    
                    {/* Email */}
                    <p className="text-xs md:text-sm text-muted-foreground line-clamp-1">
                      {student.email}
                    </p>
                  </div>

                  {/* Badges Row */}
                  <div className="flex items-center gap-1.5 mb-2 flex-wrap">
                    {/* Course Badge */}
                    <Badge variant="outline" className="text-[10px] md:text-xs px-1.5 md:px-2 py-0.5">
                      <BookOpen className="w-2.5 h-2.5 md:w-3 md:h-3 mr-1" />
                      <span className="truncate max-w-[120px]">{student.course}</span>
                    </Badge>

                    {/* Grade Badge */}
                    {student.grade && getGradeBadge(student.grade)}

                    {/* Status Badge */}
                    <Badge 
                      variant="default" 
                      className={`text-[10px] md:text-xs px-1.5 md:px-2 py-0.5 ${getStatusColor(student.status)} text-white flex items-center gap-1`}
                    >
                      <span className="w-3 h-3 md:w-3.5 md:h-3.5">{getStatusIcon(student.status)}</span>
                      <span className="capitalize">{student.status}</span>
                    </Badge>
                  </div>

                  {/* Stats and Progress Row */}
                  <div className="flex items-center justify-between gap-3">
                    {/* Student Stats */}
                    <div className="flex items-center gap-3 text-xs md:text-sm text-muted-foreground flex-1 min-w-0">
                      <div className="flex items-center gap-1 min-w-0">
                        <Calendar className="w-3.5 h-3.5 md:w-4 md:h-4 flex-shrink-0" />
                        <span className="truncate">{formatDate(student.enrolledDate)}</span>
                      </div>
                      
                      <div className="flex items-center gap-1 min-w-0">
                        <Activity className="w-3.5 h-3.5 md:w-4 md:h-4 flex-shrink-0" />
                        <span className="truncate">{student.lastActive}</span>
                      </div>
                    </div>

                    {/* Progress */}
                    <div className="w-32 md:w-40 flex-shrink-0">
                      <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                        <span>Progress</span>
                        <span className="font-medium text-primary">{student.progress}%</span>
                      </div>
                      <Progress 
                        value={student.progress} 
                        className="h-2"
                      />
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
