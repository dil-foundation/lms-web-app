import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
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
  Users,
  GraduationCap,
  MapPin,
  BookOpen,
  Edit,
  Eye,
  MoreHorizontal,
  Trash2,
  Settings,
  User,
} from 'lucide-react';
import { ClassWithMembers } from '@/services/classService';

interface ClassListViewProps {
  classes: ClassWithMembers[];
  onView: (cls: ClassWithMembers) => void;
  onEdit: (cls: ClassWithMembers) => void;
  onDelete: (cls: ClassWithMembers) => void;
  className?: string;
  canDelete?: boolean; // Only admins can delete classes
}

export const ClassListView: React.FC<ClassListViewProps> = ({
  classes,
  onView,
  onEdit,
  onDelete,
  className = "",
  canDelete = true, // Default to true for backwards compatibility
}) => {
  const getGradeBadge = (grade: string) => {
    const gradeColors: { [key: string]: string } = {
      '1': 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400',
      '2': 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
      '3': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400',
      '4': 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400',
      '5': 'bg-pink-100 text-pink-800 dark:bg-pink-900/20 dark:text-pink-400',
      '6': 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/20 dark:text-indigo-400',
      '7': 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400',
      '8': 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400',
      '9': 'bg-teal-100 text-teal-800 dark:bg-teal-900/20 dark:text-teal-400',
      '10': 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/20 dark:text-cyan-400',
      '11': 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-400',
      '12': 'bg-violet-100 text-violet-800 dark:bg-violet-900/20 dark:text-violet-400',
    };
    
    return (
      <Badge className={`text-xs ${gradeColors[grade] || 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400'}`}>
        Grade {grade}
      </Badge>
    );
  };

  const handleView = (e: React.MouseEvent, cls: ClassWithMembers) => {
    e.stopPropagation();
    // Small delay to ensure dropdown is fully closed
    setTimeout(() => onView(cls), 100);
  };

  const handleEdit = (e: React.MouseEvent, cls: ClassWithMembers) => {
    e.stopPropagation();
    // Small delay to ensure dropdown is fully closed
    setTimeout(() => onEdit(cls), 100);
  };

  const handleDelete = (e: React.MouseEvent, cls: ClassWithMembers) => {
    e.stopPropagation();
    // Small delay to ensure dropdown is fully closed
    setTimeout(() => onDelete(cls), 100);
  };

  return (
    <div className={className}>
      <div className="space-y-3 sm:space-y-4 md:space-y-5">
        {classes.map((cls) => (
          <Card
            key={cls.id}
            className="group cursor-pointer hover:shadow-lg transition-all duration-200 hover:bg-muted/50 border border-border/50 shadow-sm bg-card/95 backdrop-blur-sm dark:bg-card dark:border-border/60 hover:border-primary/30 dark:hover:border-primary/30 border-l-4 border-l-transparent hover:border-l-primary"
            onClick={() => onView(cls)}
          >
            <CardContent className="p-4 sm:p-5 md:p-6">
              <div className="flex flex-col sm:flex-row items-start gap-3 sm:gap-4">
                {/* Class Icon */}
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 rounded-lg sm:rounded-xl bg-gradient-to-br from-primary/10 via-primary/15 to-primary/20 flex items-center justify-center">
                    <GraduationCap className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 text-primary" />
                  </div>
                </div>

                {/* Class Info */}
                <div className="flex-1 min-w-0 w-full sm:w-auto">
                  {/* Title Row */}
                  <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mb-2">
                    <h3 className="font-bold text-sm sm:text-base md:text-lg group-hover:text-primary transition-colors">
                      {cls.name}
                    </h3>
                    <Badge variant="outline" className="text-[10px] sm:text-xs font-medium">
                      {cls.code}
                    </Badge>
                    {getGradeBadge(cls.grade)}
                  </div>

                  {/* School and Board */}
                  <div className="flex items-center gap-1.5 text-xs sm:text-sm text-muted-foreground mb-3">
                    <MapPin className="w-3 h-3 sm:w-3.5 sm:h-3.5 flex-shrink-0" />
                    <span className="truncate font-medium">{cls.school}</span>
                    <span className="text-muted-foreground/60">•</span>
                    <span className="truncate">{cls.board}</span>
                  </div>
                  
                  {/* Class Stats - Compact Inline */}
                  <div className="flex items-center gap-3 sm:gap-4 mb-3 text-xs sm:text-sm text-muted-foreground flex-wrap">
                    <div className="flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary flex-shrink-0" />
                      <span className="font-semibold text-foreground">{cls.students.length}/{cls.max_students || 30}</span>
                      <span>Students</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <GraduationCap className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary flex-shrink-0" />
                      <span className="font-semibold text-foreground">{cls.teachers.length}</span>
                      <span>Teachers</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <BookOpen className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary flex-shrink-0" />
                      <span className="font-semibold text-foreground">{cls.courses?.length || 0}</span>
                      <span>Courses</span>
                    </div>
                  </div>

                  {/* Teachers Preview */}
                  {cls.teachers.length > 0 && (
                    <div className="flex items-center gap-2 p-2 sm:p-2.5 bg-primary/5 dark:bg-primary/10 rounded-lg border border-primary/10">
                      <User className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-primary/70 flex-shrink-0" />
                      <span className="text-[10px] sm:text-xs font-semibold text-foreground">Teachers:</span>
                      <div className="flex -space-x-1.5 sm:-space-x-2">
                        {cls.teachers.slice(0, 5).map((teacher) => (
                          <Avatar key={teacher.id} className="h-6 w-6 sm:h-7 sm:w-7 border-2 border-background ring-1 ring-primary/10">
                            <AvatarImage src={teacher.avatar_url} alt={teacher.name} />
                            <AvatarFallback className="text-[9px] sm:text-[10px] bg-primary/20 text-primary font-bold">
                              {teacher.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                        ))}
                        {cls.teachers.length > 5 && (
                          <div className="h-6 w-6 sm:h-7 sm:w-7 rounded-full bg-primary/10 flex items-center justify-center text-[9px] sm:text-[10px] font-bold border-2 border-background text-primary ring-1 ring-primary/10">
                            +{cls.teachers.length - 5}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex sm:flex-col items-center gap-2 w-full sm:w-auto sm:ml-auto">
                  <Button
                    size="sm"
                    className="flex-1 sm:flex-none h-9 sm:h-10 text-xs sm:text-sm font-semibold bg-[#8DC63F] hover:bg-[#7AB82F] text-white shadow-sm hover:shadow-md"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleView(e, cls);
                    }}
                  >
                    <Settings className="w-3 h-3 sm:w-3.5 sm:h-3.5 mr-1.5" />
                    Manage
                  </Button>
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-9 w-9 sm:h-10 sm:w-10 p-0 hover:bg-muted/80"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuItem onClick={(e) => handleView(e, cls)} className="cursor-pointer">
                        <Eye className="w-4 h-4 mr-2" />
                        View Details
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={(e) => handleEdit(e, cls)} className="cursor-pointer">
                        <Edit className="w-4 h-4 mr-2" />
                        Edit Class
                      </DropdownMenuItem>
                      {canDelete && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            onClick={(e) => handleDelete(e, cls)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete Class
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
