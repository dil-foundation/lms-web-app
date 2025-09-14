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
  onGrade: (student: Student) => void;
  onEdit: (student: Student) => void;
  onRemove: (student: Student) => void;
  className?: string;
}

export const StudentCardView: React.FC<StudentCardViewProps> = ({
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
  const handleMessage = (e: React.MouseEvent, student: Student) => {
    e.stopPropagation();
    onMessage(student);
  };

  const handleViewProfile = (e: React.MouseEvent, student: Student) => {
    e.stopPropagation();
    onViewProfile(student);
  };

  const handleGrade = (e: React.MouseEvent, student: Student) => {
    e.stopPropagation();
    onGrade(student);
  };

  const handleEdit = (e: React.MouseEvent, student: Student) => {
    e.stopPropagation();
    onEdit(student);
  };

  const handleRemove = (e: React.MouseEvent, student: Student) => {
    e.stopPropagation();
    onRemove(student);
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {students.map((student) => (
          <Card
            key={student.id}
            className="group cursor-pointer hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border border-border/50 shadow-md bg-card/95 backdrop-blur-sm dark:bg-card dark:border-border/60 hover:border-border dark:hover:border-border h-80 flex flex-col overflow-hidden"
            onClick={() => onStudentClick(student)}
          >
            <CardHeader className="p-4 pb-3">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <Avatar className="h-12 w-12 flex-shrink-0">
                    <AvatarImage src={student.avatar_url} />
                    <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">
                      {student.firstName?.[0]}{student.lastName?.[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-sm line-clamp-1 group-hover:text-primary transition-colors">
                      {student.firstName} {student.lastName}
                    </h3>
                    <p className="text-xs text-muted-foreground truncate">
                      {student.email}
                    </p>
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 w-7 p-0 hover:bg-muted flex-shrink-0"
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
                    <DropdownMenuItem onClick={(e) => handleGrade(e, student)}>
                      <Edit className="w-4 h-4 mr-2" />
                      Grade Student
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
              <div className="flex items-center justify-between">
                {getStatusBadge(student.status)}
                {student.grade && getGradeBadge(student.grade)}
              </div>
            </CardHeader>
            
            <CardContent className="p-4 pt-0 flex flex-col h-full overflow-hidden">
              {/* Student Info */}
              <div className="flex-1 flex flex-col min-h-0">
                {/* Stats */}
                <div className="space-y-2 text-xs text-muted-foreground mb-4">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-3 h-3" />
                    <span>Joined: {student.joinedDate}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-3 h-3" />
                    <span>Last active: {student.lastActive}</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-auto pt-3">
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 h-8 text-xs hover:bg-primary/10 hover:text-primary transition-all duration-200"
                    onClick={(e) => handleMessage(e, student)}
                  >
                    <Mail className="w-3 h-3 mr-1" />
                    Message
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 h-8 text-xs hover:bg-blue-500/10 hover:text-blue-500 transition-all duration-200"
                    onClick={(e) => handleViewProfile(e, student)}
                  >
                    <Users className="w-3 h-3 mr-1" />
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
