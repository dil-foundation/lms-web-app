import React from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Mail, Users, Edit, MoreHorizontal, Calendar, Clock } from 'lucide-react';

interface Student {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  avatar_url?: string;
  status: 'active' | 'inactive';
  joinedDate: string;
  lastActive: string;
  grade?: string;
}

interface StudentCardViewProps {
  students: Student[];
  onStudentClick: (student: Student) => void;
  onMessage: (student: Student) => void;
  onViewProfile: (student: Student) => void;
  onEdit: (student: Student) => void;
  className?: string;
}

export const StudentCardView: React.FC<StudentCardViewProps> = ({
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
  const handleMessage = (e: React.MouseEvent, student: Student) => {
    e.stopPropagation();
    // Small delay to ensure dropdown is fully closed
    setTimeout(() => {
      onMessage(student);
    }, 100);
  };

  const handleViewProfile = (e: React.MouseEvent, student: Student) => {
    e.stopPropagation();
    // Small delay to ensure dropdown is fully closed
    setTimeout(() => {
      onViewProfile(student);
    }, 100);
  };


  const handleEdit = (e: React.MouseEvent, student: Student) => {
    e.stopPropagation();
    // Small delay to ensure dropdown is fully closed
    setTimeout(() => {
      onEdit(student);
    }, 100);
  };


  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge variant="outline" className="text-green-600 border-green-600 bg-green-50 dark:bg-green-900/20 text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 font-medium whitespace-nowrap">Active</Badge>;
      case 'inactive':
        return <Badge variant="outline" className="text-blue-600 border-blue-600 bg-blue-50 dark:bg-blue-900/20 text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 font-medium whitespace-nowrap">Inactive</Badge>;
      default:
        return <Badge variant="outline" className="text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 font-medium whitespace-nowrap">{status}</Badge>;
    }
  };

  return (
    <div className={className}>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 md:gap-5 lg:gap-6">
        {students.map((student) => (
          <Card
            key={student.id}
            className="group cursor-pointer hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border border-border/50 shadow-lg bg-gradient-to-br from-card to-card/50 dark:bg-card dark:border-border/60 hover:border-primary/40 dark:hover:border-primary/40 flex flex-col overflow-hidden rounded-xl sm:rounded-2xl"
            onClick={() => onStudentClick(student)}
          >
            <CardHeader className="p-3 sm:p-4 md:p-5 lg:p-6 pb-2 sm:pb-3 md:pb-4">
              <div className="flex flex-col gap-3 sm:gap-4">
                {/* Top Row: Menu Button */}
                <div className="flex justify-end">
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
                    <DropdownMenuContent align="end" className="w-44">
                      <DropdownMenuItem onClick={(e) => handleViewProfile(e, student)}>
                        <Users className="w-4 h-4 mr-2" />
                        View Profile
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={(e) => handleMessage(e, student)}>
                        <Mail className="w-4 h-4 mr-2" />
                        Send Message
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={(e) => handleEdit(e, student)}>
                        <Edit className="w-4 h-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {/* Avatar */}
                <div className="flex justify-center">
                  <Avatar className="h-16 w-16 sm:h-20 sm:w-20 md:h-24 md:w-24 ring-2 ring-primary/20 group-hover:ring-primary/40 transition-all duration-300">
                    <AvatarImage src={student.avatar_url} />
                    <AvatarFallback className="bg-gradient-to-br from-primary/20 via-primary/30 to-primary/40 text-primary text-lg sm:text-xl md:text-2xl font-semibold">
                      {student.firstName?.[0]}{student.lastName?.[0]}
                    </AvatarFallback>
                  </Avatar>
                </div>

                {/* Name and Email */}
                <div className="text-center">
                  <h3 className="font-bold text-sm sm:text-base md:text-lg group-hover:text-primary transition-colors mb-1 sm:mb-1.5 leading-snug">
                    {student.firstName} {student.lastName}
                  </h3>
                  <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed break-words">
                    {student.email}
                  </p>
                </div>

                {/* Badges Row */}
                <div className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2">
                  {getStatusBadge(student.status)}
                  {student.grade && getGradeBadge(student.grade)}
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="p-3 sm:p-4 md:p-5 lg:p-6 pt-0 flex flex-col flex-1 overflow-hidden">
              {/* Student Info */}
              <div className="flex-1 flex flex-col min-h-0 space-y-2 sm:space-y-3 md:space-y-4">
                {/* Enrollment Date */}
                <div className="flex items-center gap-2 sm:gap-3 p-2 sm:p-2.5 md:p-3 bg-muted/30 rounded-lg">
                  <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-foreground text-xs sm:text-sm truncate">Enrollment Date</div>
                    <div className="text-[10px] sm:text-xs text-muted-foreground truncate">{student.joinedDate}</div>
                  </div>
                </div>

                {/* Last Activity */}
                <div className="flex items-center gap-2 sm:gap-3 p-2 sm:p-2.5 md:p-3 bg-muted/30 rounded-lg">
                  <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-foreground text-xs sm:text-sm truncate">Last Activity</div>
                    <div className="text-[10px] sm:text-xs text-muted-foreground truncate">{student.lastActive}</div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-border/50">
                <div className="flex flex-col gap-1.5 sm:gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full h-8 sm:h-9 md:h-10 text-[10px] sm:text-xs md:text-sm hover:bg-primary/10 hover:text-primary hover:border-primary/30 transition-all duration-200 font-medium px-2 sm:px-3"
                    onClick={(e) => handleMessage(e, student)}
                  >
                    <Mail className="w-3 h-3 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4 mr-1 flex-shrink-0" />
                    <span className="truncate">Message</span>
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full h-8 sm:h-9 md:h-10 text-[10px] sm:text-xs md:text-sm hover:bg-blue-500/10 hover:text-blue-500 hover:border-blue-500/30 transition-all duration-200 font-medium px-2 sm:px-3"
                    onClick={(e) => handleViewProfile(e, student)}
                  >
                    <Users className="w-3 h-3 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4 mr-1 flex-shrink-0" />
                    <span className="truncate">Profile</span>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
