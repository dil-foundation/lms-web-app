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
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 w-full overflow-hidden">
        {classes.map((cls) => (
          <Card
            key={cls.id}
            className="group cursor-pointer hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border border-border/50 shadow-sm bg-card/95 backdrop-blur-sm dark:bg-card dark:border-border/60 hover:border-primary/30 dark:hover:border-primary/30 h-44 flex flex-col overflow-hidden"
            onClick={() => onView(cls)}
          >
            <CardHeader className="p-0 relative">
              <div className="w-full h-16 bg-gradient-to-br from-primary/10 to-primary/20 flex items-center justify-center">
                <GraduationCap className="w-8 h-8 text-primary" />
              </div>
              <div className="absolute top-1 left-1 right-1 flex justify-between items-start">
                <div className="flex gap-1">
                  {getGradeBadge(cls.grade)}
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-5 w-5 p-0 hover:bg-white/20 text-primary"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <MoreHorizontal className="w-3 h-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={(e) => handleView(e, cls)}>
                      <Eye className="w-4 h-4 mr-2" />
                      View
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={(e) => handleEdit(e, cls)}>
                      <Edit className="w-4 h-4 mr-2" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      onClick={(e) => handleDelete(e, cls)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardHeader>
            
            <CardContent className="p-3 flex flex-col h-full overflow-hidden">
              {/* Class Title */}
              <div className="mb-2">
                <h3 className="font-medium text-xs line-clamp-2 group-hover:text-primary transition-colors">
                  {cls.name}
                </h3>
                <p className="text-xs text-muted-foreground mt-1 truncate">{cls.code}</p>
              </div>

              {/* Compact Class Stats - Horizontal Layout */}
              <div className="flex items-center justify-between text-xs text-muted-foreground mb-3 flex-1 min-h-0">
                <div className="flex items-center gap-1 min-w-0 flex-1">
                  <Users className="w-2.5 h-2.5 flex-shrink-0" />
                  <span className="truncate">{cls.students.length}</span>
                </div>
                <div className="flex items-center gap-1 min-w-0 flex-1 justify-center">
                  <GraduationCap className="w-2.5 h-2.5 flex-shrink-0" />
                  <span className="truncate">{cls.teachers.length}</span>
                </div>
                <div className="flex items-center gap-1 min-w-0 flex-1 justify-end">
                  <MapPin className="w-2.5 h-2.5 flex-shrink-0" />
                  <span className="truncate">{cls.board}</span>
                </div>
              </div>

              {/* Compact Action Button */}
              <div className="mt-auto pt-1">
                <Button
                  size="sm"
                  className="w-full h-7 text-xs"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleView(e, cls);
                  }}
                >
                  <Settings className="w-3 h-3 mr-1" />
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
