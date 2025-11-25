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
  Calendar,
  User,
} from 'lucide-react';
import { ClassWithMembers } from '@/services/classService';

interface ClassTileViewProps {
  classes: ClassWithMembers[];
  onView: (cls: ClassWithMembers) => void;
  onEdit: (cls: ClassWithMembers) => void;
  onDelete: (cls: ClassWithMembers) => void;
  className?: string;
}

export const ClassTileView: React.FC<ClassTileViewProps> = ({
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
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3 sm:gap-4 md:gap-5 w-full">
        {classes.map((cls) => (
          <Card
            key={cls.id}
            className="group cursor-pointer hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border border-border/50 shadow-sm bg-card/95 backdrop-blur-sm dark:bg-card dark:border-border/60 hover:border-primary/40 dark:hover:border-primary/40 flex flex-col h-full overflow-hidden"
            onClick={() => onView(cls)}
          >
            {/* Card Header with Icon Banner */}
            <CardHeader className="p-0 relative">
              <div className="w-full h-14 sm:h-16 flex items-center justify-center">
                <GraduationCap className="w-7 h-7 sm:w-8 sm:h-8 text-primary" />
              </div>
              
              {/* Overlay Badges and Menu */}
              <div className="absolute top-1 sm:top-1.5 left-1 sm:left-1.5 right-1 sm:right-1.5 flex justify-between items-start">
                <div className="flex gap-1">
                  {getGradeBadge(cls.grade)}
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-5 w-5 sm:h-6 sm:w-6 p-0 hover:bg-white/30 dark:hover:bg-black/30 text-primary rounded-md"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <MoreHorizontal className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-40">
                    <DropdownMenuItem onClick={(e) => handleView(e, cls)} className="cursor-pointer">
                      <Eye className="w-3.5 h-3.5 mr-2" />
                      View
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={(e) => handleEdit(e, cls)} className="cursor-pointer">
                      <Edit className="w-3.5 h-3.5 mr-2" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      onClick={(e) => handleDelete(e, cls)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardHeader>
            
            {/* Card Content */}
            <CardContent className="p-2 sm:p-3 flex flex-col flex-1 h-full overflow-hidden">
              <div className="flex flex-col flex-1">
                {/* Class Title and Code */}
                <div className="mb-2 space-y-1">
                  <h3 className="font-semibold text-[10px] sm:text-xs leading-tight line-clamp-2 group-hover:text-primary transition-colors min-h-[2em]">
                    {cls.name}
                  </h3>
                  <p className="text-[9px] sm:text-xs text-muted-foreground font-medium truncate">
                    {cls.code}
                  </p>
                </div>

                {/* Compact Stats Grid */}
                <div className="grid grid-cols-3 gap-1 sm:gap-1.5 text-[9px] sm:text-xs text-muted-foreground mb-2 py-1.5 px-1 bg-muted/30 dark:bg-muted/20 rounded-md">
                  <div className="flex flex-col items-center justify-center text-center">
                    <Users className="w-3 h-3 sm:w-3.5 sm:h-3.5 flex-shrink-0 mb-0.5 text-primary/70" />
                    <span className="font-bold text-foreground">{cls.students.length}</span>
                  </div>
                  <div className="flex flex-col items-center justify-center text-center border-x border-border/30">
                    <GraduationCap className="w-3 h-3 sm:w-3.5 sm:h-3.5 flex-shrink-0 mb-0.5 text-primary/70" />
                    <span className="font-bold text-foreground">{cls.teachers.length}</span>
                  </div>
                  <div className="flex flex-col items-center justify-center text-center">
                    <BookOpen className="w-3 h-3 sm:w-3.5 sm:h-3.5 flex-shrink-0 mb-0.5 text-primary/70" />
                    <span className="font-bold text-foreground">{cls.courses?.length || 0}</span>
                  </div>
                </div>

                {/* School Info */}
                <div className="flex items-center gap-1 text-[9px] sm:text-[10px] text-muted-foreground mb-2">
                  <MapPin className="w-2.5 h-2.5 sm:w-3 sm:h-3 flex-shrink-0" />
                  <span className="truncate font-medium">{cls.school}</span>
                </div>
              </div>

              {/* Teachers Avatars Section - Fixed Above Button */}
              {cls.teachers.length > 0 && (
                <div className="mt-auto pt-2 flex-shrink-0">
                  <div className="flex items-center justify-center gap-1 p-1.5 sm:p-2 bg-primary/5 dark:bg-primary/10 rounded-md border border-primary/10">
                    <User className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-primary/70 flex-shrink-0" />
                    <div className="flex -space-x-1 sm:-space-x-1.5">
                      {cls.teachers.slice(0, 2).map((teacher) => (
                        <Avatar key={teacher.id} className="h-5 w-5 sm:h-6 sm:w-6 border border-background ring-1 ring-primary/10">
                          <AvatarImage src={teacher.avatar_url} alt={teacher.name} />
                          <AvatarFallback className="text-[8px] sm:text-[9px] bg-primary/20 text-primary font-bold">
                            {teacher.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                      ))}
                      {cls.teachers.length > 2 && (
                        <div className="h-5 w-5 sm:h-6 sm:w-6 rounded-full bg-primary/10 flex items-center justify-center text-[8px] sm:text-[9px] font-bold border border-background text-primary ring-1 ring-primary/10">
                          +{cls.teachers.length - 2}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Compact Action Button - Fixed at Bottom */}
              <div className="pt-2 flex-shrink-0">
                <Button
                  size="sm"
                  className="w-full h-6 sm:h-7 text-[9px] sm:text-xs font-semibold bg-[#8DC63F] hover:bg-[#7AB82F] text-white"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleView(e, cls);
                  }}
                >
                  <Settings className="w-2.5 h-2.5 sm:w-3 sm:h-3 mr-1" />
                  Manage
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
