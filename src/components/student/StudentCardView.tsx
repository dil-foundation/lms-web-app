import React from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Mail, Users, Edit, Trash2, MoreHorizontal, Calendar, Clock } from 'lucide-react';

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
  onRemove: (student: Student) => void;
  className?: string;
}

export const StudentCardView: React.FC<StudentCardViewProps> = ({
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

  const handleRemove = (e: React.MouseEvent, student: Student) => {
    e.stopPropagation();
    // Small delay to ensure dropdown is fully closed
    setTimeout(() => {
      onRemove(student);
    }, 100);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge variant="outline" className="text-green-600 border-green-600 bg-green-50 dark:bg-green-900/20">Active</Badge>;
      case 'inactive':
        return <Badge variant="outline" className="text-blue-600 border-blue-600 bg-blue-50 dark:bg-blue-900/20">Inactive</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className={className}>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {students.map((student) => (
          <Card
            key={student.id}
            className="group cursor-pointer hover:shadow-xl transition-all duration-300 hover:-translate-y-2 border border-border/50 shadow-lg bg-gradient-to-br from-card to-card/50 dark:bg-card dark:border-border/60 hover:border-primary/40 dark:hover:border-primary/40 h-96 flex flex-col overflow-hidden rounded-2xl"
            onClick={() => onStudentClick(student)}
          >
            <CardHeader className="p-6 pb-4">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <Avatar className="h-16 w-16 flex-shrink-0 ring-2 ring-primary/20 group-hover:ring-primary/40 transition-all duration-300">
                    <AvatarImage src={student.avatar_url} />
                    <AvatarFallback className="bg-gradient-to-br from-primary/20 via-primary/30 to-primary/40 text-primary text-lg font-semibold">
                      {student.firstName?.[0]}{student.lastName?.[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-lg line-clamp-1 group-hover:text-primary transition-colors mb-1">
                      {student.firstName} {student.lastName}
                    </h3>
                    <p className="text-sm text-muted-foreground truncate mb-2">
                      {student.email}
                    </p>
                    <div className="flex items-center gap-2">
                      {getStatusBadge(student.status)}
                      {student.grade && getGradeBadge(student.grade)}
                    </div>
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0 hover:bg-muted flex-shrink-0"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <MoreHorizontal className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
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
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={(e) => handleRemove(e, student)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Remove Student
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardHeader>
            
            <CardContent className="p-6 pt-0 flex flex-col h-full overflow-hidden">
              {/* Detailed Student Info */}
              <div className="flex-1 flex flex-col min-h-0 space-y-4">
                {/* Detailed Stats */}
                <div className="space-y-3 text-sm text-muted-foreground">
                  <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                    <Calendar className="w-4 h-4 text-primary" />
                    <div>
                      <div className="font-medium text-foreground">Enrollment Date</div>
                      <div className="text-xs">{student.joinedDate}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                    <Clock className="w-4 h-4 text-primary" />
                    <div>
                      <div className="font-medium text-foreground">Last Activity</div>
                      <div className="text-xs">{student.lastActive}</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Enhanced Action Buttons */}
              <div className="mt-auto pt-4">
                <div className="flex gap-3">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 h-10 text-sm hover:bg-primary/10 hover:text-primary transition-all duration-200 font-medium"
                    onClick={(e) => handleMessage(e, student)}
                  >
                    <Mail className="w-4 h-4 mr-2" />
                    Message
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 h-10 text-sm hover:bg-blue-500/10 hover:text-blue-500 transition-all duration-200 font-medium"
                    onClick={(e) => handleViewProfile(e, student)}
                  >
                    <Users className="w-4 h-4 mr-2" />
                    Profile
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
