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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {classes.map((cls) => (
          <Card
            key={cls.id}
            className="group cursor-pointer hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border border-border/50 shadow-md bg-card/95 backdrop-blur-sm dark:bg-card dark:border-border/60 hover:border-primary/30 dark:hover:border-primary/30 h-96 flex flex-col overflow-hidden"
            onClick={() => onView(cls)}
          >
            <CardHeader className="p-6 pb-4">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-lg line-clamp-1 group-hover:text-primary transition-colors mb-3">
                    {cls.name}
                  </h3>
                  <div className="flex items-center gap-2 mb-3">
                    <Badge variant="outline" className="text-sm">
                      {cls.code}
                    </Badge>
                    {getGradeBadge(cls.grade)}
                  </div>
                  <p className="text-sm text-muted-foreground">
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
            
            <CardContent className="p-6 pt-0 flex flex-col h-full overflow-hidden">
              {/* Fixed height sections for consistent alignment across cards */}
              <div className="flex-1 flex flex-col min-h-0">
                {/* Class Description - Fixed height */}
                <div className="h-16 mb-4">
                  {cls.description && (
                    <p className="text-sm text-muted-foreground line-clamp-3">
                      {cls.description}
                    </p>
                  )}
                </div>

                {/* Detailed Class Stats - Fixed height */}
                <div className="h-16 mb-4">
                  <div className="p-3 bg-muted/30 rounded-lg h-full">
                    <div className="flex items-center justify-between text-sm text-muted-foreground h-full">
                      <div className="flex items-center gap-1 w-1/3">
                        <Users className="w-4 h-4 flex-shrink-0" />
                        <span className="font-medium text-foreground truncate">{cls.students.length}/{cls.max_students || 30}</span>
                      </div>
                      <div className="flex items-center gap-1 w-1/3 justify-center">
                        <GraduationCap className="w-4 h-4 flex-shrink-0" />
                        <span className="font-medium text-foreground">{cls.teachers.length}</span>
                      </div>
                      <div className="flex items-center gap-1 w-1/3 justify-end">
                        <MapPin className="w-4 h-4 flex-shrink-0" />
                        <span className="font-medium text-foreground truncate">{cls.school}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Teachers Section - Fixed height */}
                <div className="h-12 mb-4">
                  {cls.teachers.length > 0 && (
                    <div className="flex items-center gap-3 h-full">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm font-medium text-muted-foreground">Teachers</span>
                      </div>
                      <div className="flex -space-x-2">
                        {cls.teachers.slice(0, 4).map((teacher, index) => (
                          <Avatar key={teacher.id} className="h-8 w-8 border-2 border-background">
                            <AvatarImage src={teacher.avatar_url} />
                            <AvatarFallback className="text-sm bg-primary/10 text-primary">
                              {teacher.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                        ))}
                        {cls.teachers.length > 4 && (
                          <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-sm border-2 border-background">
                            +{cls.teachers.length - 4}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Button - Fixed height and position */}
              <div className="h-12 pt-2">
                <Button
                  size="sm"
                  className="w-full h-10 text-sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleView(e, cls);
                  }}
                >
                  <Settings className="w-4 h-4 mr-2" />
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
