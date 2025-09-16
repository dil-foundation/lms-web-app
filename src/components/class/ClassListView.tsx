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
}

export const ClassListView: React.FC<ClassListViewProps> = ({
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
    onDelete(cls);
  };

  return (
    <div className={className}>
      <div className="space-y-2">
        {classes.map((cls) => (
          <Card
            key={cls.id}
            className="group cursor-pointer hover:shadow-md transition-all duration-200 hover:bg-muted/50 border border-border/50 shadow-sm bg-card/95 backdrop-blur-sm dark:bg-card dark:border-border/60 hover:border-border dark:hover:border-border border-l-4 border-l-transparent hover:border-l-primary"
          >
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                {/* Class Icon */}
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-primary/10 to-primary/20 flex items-center justify-center">
                    <GraduationCap className="w-6 h-6 text-primary" />
                  </div>
                </div>

                {/* Class Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-sm group-hover:text-primary transition-colors">
                      {cls.name}
                    </h3>
                    <Badge variant="outline" className="text-xs">
                      {cls.code}
                    </Badge>
                    {getGradeBadge(cls.grade)}
                  </div>
                  <p className="text-xs text-muted-foreground mb-2">
                    {cls.school} • {cls.board}
                  </p>
                  
                  {/* Class Stats */}
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      <span>{cls.students.length}/{cls.max_students || 30} students</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <GraduationCap className="w-3 h-3" />
                      <span>{cls.teachers.length} teacher{cls.teachers.length !== 1 ? 's' : ''}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      <span className="truncate">{cls.school}</span>
                    </div>
                  </div>

                  {/* Teachers Preview */}
                  {cls.teachers.length > 0 && (
                    <div className="flex items-center gap-2 mt-2">
                      <User className="w-3 h-3 text-muted-foreground" />
                      <div className="flex -space-x-1">
                        {cls.teachers.slice(0, 4).map((teacher, index) => (
                          <Avatar key={teacher.id} className="h-5 w-5 border border-background">
                            <AvatarImage src={teacher.avatar_url} />
                            <AvatarFallback className="text-xs bg-primary/10 text-primary">
                              {teacher.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                        ))}
                        {cls.teachers.length > 4 && (
                          <div className="h-5 w-5 rounded-full bg-muted flex items-center justify-center text-xs border border-background">
                            +{cls.teachers.length - 4}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 text-xs"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleView(e, cls);
                    }}
                  >
                    <Settings className="w-3 h-3 mr-1" />
                    Manage
                  </Button>
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={(e) => handleView(e, cls)}>
                        <Eye className="w-4 h-4 mr-2" />
                        View Details
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={(e) => handleEdit(e, cls)}>
                        <Edit className="w-4 h-4 mr-2" />
                        Edit Class
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        onClick={(e) => handleDelete(e, cls)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete Class
                      </DropdownMenuItem>
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
