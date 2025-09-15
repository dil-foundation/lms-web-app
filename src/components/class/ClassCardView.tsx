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
    onView(cls);
  };

  const handleEdit = (e: React.MouseEvent, cls: ClassWithMembers) => {
    e.stopPropagation();
    onEdit(cls);
  };

  const handleDelete = (e: React.MouseEvent, cls: ClassWithMembers) => {
    e.stopPropagation();
    onDelete(cls);
  };

  return (
    <div className={className}>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {classes.map((cls) => (
          <Card
            key={cls.id}
            className="group cursor-pointer hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border border-border/50 shadow-md bg-card/95 backdrop-blur-sm dark:bg-card dark:border-border/60 hover:border-border dark:hover:border-border h-96 flex flex-col overflow-hidden"
            onClick={() => onView(cls)}
          >
            <CardHeader className="p-4 pb-3">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-sm line-clamp-1 group-hover:text-primary transition-colors mb-2">
                    {cls.name}
                  </h3>
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="outline" className="text-xs">
                      {cls.code}
                    </Badge>
                    {getGradeBadge(cls.grade)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {cls.school} • {cls.board}
                  </p>
                </div>
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
            </CardHeader>
            
            <CardContent className="p-4 pt-0 flex flex-col h-full overflow-hidden">
              {/* Content Area - Fixed height to ensure button alignment */}
              <div className="flex-1 flex flex-col min-h-0">
                {/* Class Description */}
                {cls.description && (
                  <div className="mb-3">
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {cls.description}
                    </p>
                  </div>
                )}

                {/* Class Stats */}
                <div className="space-y-2 text-xs text-muted-foreground mb-3">
                  <div className="flex items-center gap-2">
                    <Users className="w-3 h-3" />
                    <span>{cls.students.length}/{cls.max_students || 30} students</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <GraduationCap className="w-3 h-3" />
                    <span>{cls.teachers.length} teacher{cls.teachers.length !== 1 ? 's' : ''}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="w-3 h-3" />
                    <span className="truncate">{cls.school}</span>
                  </div>
                </div>

                {/* Teachers Section */}
                {cls.teachers.length > 0 && (
                  <div className="mb-3">
                    <div className="flex items-center gap-2 mb-2">
                      <User className="w-3 h-3 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">Teachers</span>
                    </div>
                    <div className="flex -space-x-1">
                      {cls.teachers.slice(0, 3).map((teacher, index) => (
                        <Avatar key={teacher.id} className="h-6 w-6 border-2 border-background">
                          <AvatarImage src={teacher.avatar_url} />
                          <AvatarFallback className="text-xs bg-primary/10 text-primary">
                            {teacher.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                      ))}
                      {cls.teachers.length > 3 && (
                        <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center text-xs border-2 border-background">
                          +{cls.teachers.length - 3}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Action Button - Always at bottom with fixed positioning */}
              <div className="mt-auto pt-4 pb-1">
                <Button
                  size="sm"
                  className="w-full h-8 text-xs"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleView(e, cls);
                  }}
                >
                  <Settings className="w-3 h-3 mr-1" />
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
