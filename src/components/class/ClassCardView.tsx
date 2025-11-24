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
  Calendar,
} from 'lucide-react';
import { ClassWithMembers } from '@/services/classService';

interface ClassCardViewProps {
  classes: ClassWithMembers[];
  onView: (cls: ClassWithMembers) => void;
  onEdit: (cls: ClassWithMembers) => void;
  onDelete: (cls: ClassWithMembers) => void;
  className?: string;
}

export const ClassCardView: React.FC<ClassCardViewProps> = ({
  classes,
  onView,
  onEdit,
  onDelete,
  className = "",
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4 sm:gap-5 md:gap-6">
        {classes.map((cls) => (
          <Card
            key={cls.id}
            className="group cursor-pointer hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border border-border/50 shadow-sm bg-card/95 backdrop-blur-sm dark:bg-card dark:border-border/60 hover:border-primary/40 dark:hover:border-primary/40 flex flex-col h-full overflow-hidden"
            onClick={() => onView(cls)}
          >
            {/* Card Header with improved spacing */}
            <CardHeader className="p-4 sm:p-5 md:p-6 pb-3 sm:pb-4 space-y-0">
              <div className="flex items-start justify-between gap-2 mb-3 sm:mb-4">
                <div className="flex-1 min-w-0 space-y-2 sm:space-y-3">
                  {/* Class Name */}
                  <h3 className="font-bold text-base sm:text-lg md:text-xl leading-tight line-clamp-2 group-hover:text-primary transition-colors">
                    {cls.name}
                  </h3>
                  
                  {/* Class Code and Grade - Improved layout */}
                  <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                    <Badge variant="outline" className="text-[10px] sm:text-xs font-medium px-2 py-0.5 sm:px-2.5 sm:py-1">
                      {cls.code}
                    </Badge>
                    {getGradeBadge(cls.grade)}
                  </div>
                </div>

                {/* Action Menu */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 w-7 sm:h-8 sm:w-8 p-0 hover:bg-muted/80 flex-shrink-0 rounded-lg"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <MoreHorizontal className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
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
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      onClick={(e) => handleDelete(e, cls)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete Class
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* School and Board Info */}
              <div className="flex items-center gap-1.5 text-xs sm:text-sm text-muted-foreground">
                <MapPin className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
                <span className="truncate font-medium">{cls.school}</span>
                <span className="text-muted-foreground/60">•</span>
                <span className="truncate">{cls.board}</span>
              </div>
            </CardHeader>
            
            {/* Card Content */}
            <CardContent className="p-4 sm:p-5 md:p-6 pt-0 flex flex-col flex-1 h-full">
              <div className="flex flex-col flex-1 space-y-3 sm:space-y-4">
                {/* Class Description */}
                {cls.description && (
                  <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                    {cls.description}
                  </p>
                )}

                {/* Stats Section - Redesigned */}
                <div className="grid grid-cols-3 gap-2 sm:gap-3 p-3 sm:p-4 bg-muted/40 dark:bg-muted/20 rounded-xl border border-border/30">
                  {/* Students */}
                  <div className="flex flex-col items-center justify-center text-center space-y-1 sm:space-y-1.5">
                    <Users className="w-4 h-4 sm:w-5 sm:h-5 text-primary/70 flex-shrink-0" />
                    <div className="flex flex-col">
                      <span className="text-sm sm:text-base md:text-lg font-bold text-foreground">
                        {cls.students.length}
                      </span>
                      <span className="text-[10px] sm:text-xs text-muted-foreground font-medium">
                        of {cls.max_students || 30}
                      </span>
                    </div>
                  </div>

                  {/* Courses */}
                  <div className="flex flex-col items-center justify-center text-center space-y-1 sm:space-y-1.5 border-x border-border/30">
                    <BookOpen className="w-4 h-4 sm:w-5 sm:h-5 text-primary/70 flex-shrink-0" />
                    <div className="flex flex-col">
                      <span className="text-sm sm:text-base md:text-lg font-bold text-foreground">
                        {cls.courses?.length || 0}
                      </span>
                      <span className="text-[10px] sm:text-xs text-muted-foreground font-medium">
                        Courses
                      </span>
                    </div>
                  </div>

                  {/* Teachers */}
                  <div className="flex flex-col items-center justify-center text-center space-y-1 sm:space-y-1.5">
                    <GraduationCap className="w-4 h-4 sm:w-5 sm:h-5 text-primary/70 flex-shrink-0" />
                    <div className="flex flex-col">
                      <span className="text-sm sm:text-base md:text-lg font-bold text-foreground">
                        {cls.teachers.length}
                      </span>
                      <span className="text-[10px] sm:text-xs text-muted-foreground font-medium">
                        Teachers
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Teachers Avatars Section - Fixed Above Button */}
              {cls.teachers.length > 0 && (
                <div className="mt-auto pt-3 sm:pt-4 flex-shrink-0">
                  <div className="flex items-center justify-between gap-2 p-2.5 sm:p-3 bg-primary/5 dark:bg-primary/10 rounded-lg border border-primary/10">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <User className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary/70" />
                        <span className="text-[10px] sm:text-xs font-semibold text-foreground whitespace-nowrap">
                          Teachers
                        </span>
                      </div>
                    </div>
                    <div className="flex -space-x-2 flex-shrink-0">
                      {cls.teachers.slice(0, 3).map((teacher) => (
                        <Avatar key={teacher.id} className="h-7 w-7 sm:h-8 sm:w-8 border-2 border-background ring-1 ring-primary/10">
                          <AvatarImage src={teacher.avatar_url} alt={teacher.name} />
                          <AvatarFallback className="text-[10px] sm:text-xs bg-primary/20 text-primary font-bold">
                            {teacher.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                      ))}
                      {cls.teachers.length > 3 && (
                        <div className="h-7 w-7 sm:h-8 sm:w-8 rounded-full bg-primary/10 flex items-center justify-center text-[10px] sm:text-xs font-bold border-2 border-background text-primary ring-1 ring-primary/10">
                          +{cls.teachers.length - 3}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Action Button - Fixed at Bottom */}
              <div className="pt-3 sm:pt-4 flex-shrink-0">
                <Button
                  size="sm"
                  className="w-full h-9 sm:h-10 md:h-11 text-xs sm:text-sm font-semibold bg-[#8DC63F] hover:bg-[#7AB82F] text-white shadow-sm hover:shadow-md transition-all duration-200"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleView(e, cls);
                  }}
                >
                  <Settings className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2" />
                  Manage Class
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
