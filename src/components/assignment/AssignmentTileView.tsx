import React from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  ClipboardList, 
  Calendar, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  FileText, 
  Upload,
  BookOpen,
  GraduationCap,
  Paperclip,
  Eye
} from 'lucide-react';

interface Assignment {
  id: string;
  title: string;
  description?: string;
  due_date?: string;
  course_title?: string;
  course_id?: string;
  status: 'pending' | 'submitted' | 'graded' | 'overdue';
  submission_type?: 'file' | 'text' | 'quiz' | 'url';
  points?: number;
  grade?: number;
  feedback?: string;
  created_at: string;
  submitted_at?: string;
  graded_at?: string;
}

interface AssignmentTileViewProps {
  assignments: Assignment[];
  onAssignmentClick?: (assignment: Assignment) => void;
  onSubmit?: (assignment: Assignment) => void;
  onView?: (assignment: Assignment) => void;
  className?: string;
}

export const AssignmentTileView: React.FC<AssignmentTileViewProps> = ({
  assignments,
  onAssignmentClick,
  onSubmit,
  onView,
  className
}) => {
  const handleAssignmentClick = (assignment: Assignment) => {
    if (onAssignmentClick) {
      onAssignmentClick(assignment);
    }
  };

  const handleSubmit = (e: React.MouseEvent, assignment: Assignment) => {
    e.stopPropagation();
    if (onSubmit) {
      onSubmit(assignment);
    }
  };

  const handleView = (e: React.MouseEvent, assignment: Assignment) => {
    e.stopPropagation();
    if (onView) {
      onView(assignment);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'submitted':
        return 'bg-blue-500';
      case 'graded':
        return 'bg-green-500';
      case 'overdue':
        return 'bg-red-500';
      default:
        return 'bg-yellow-500';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'submitted':
        return <Upload className="w-3 h-3" />;
      case 'graded':
        return <CheckCircle className="w-3 h-3" />;
      case 'overdue':
        return <AlertCircle className="w-3 h-3" />;
      default:
        return <Clock className="w-3 h-3" />;
    }
  };

  const getSubmissionIcon = (type?: string) => {
    switch (type) {
      case 'file':
        return <Paperclip className="w-3 h-3" />;
      case 'text':
        return <FileText className="w-3 h-3" />;
      case 'quiz':
        return <ClipboardList className="w-3 h-3" />;
      case 'url':
        return <BookOpen className="w-3 h-3" />;
      default:
        return <FileText className="w-3 h-3" />;
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  };

  const isOverdue = (dueDate?: string) => {
    if (!dueDate) return false;
    return new Date(dueDate) < new Date();
  };

  return (
    <div className={className}>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2.5 sm:gap-3 w-full overflow-hidden">
        {assignments.map((assignment) => (
          <Card
            key={assignment.id}
            className="group cursor-pointer hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border border-border/50 shadow-sm bg-card/95 backdrop-blur-sm dark:bg-card dark:border-border/60 hover:border-primary/30 dark:hover:border-primary/30 h-56 sm:h-60 flex flex-col overflow-hidden rounded-lg sm:rounded-xl"
            onClick={() => handleAssignmentClick(assignment)}
          >
            <CardHeader className="p-0 relative">
              <div className="w-full h-14 sm:h-16 bg-gradient-to-br from-primary/10 to-primary/20 flex items-center justify-center">
                <ClipboardList className="w-6 h-6 sm:w-8 sm:h-8 text-primary" />
              </div>
              <div className="absolute top-1 left-1 right-1 flex justify-between items-start">
                <div className="flex gap-1 sm:gap-2 items-center">
                  {assignment.submission_type && (
                    <Badge variant="outline" className="text-[10px] sm:text-xs px-1 py-0.5">
                      {getSubmissionIcon(assignment.submission_type)}
                    </Badge>
                  )}
                </div>
                <Badge 
                  variant="default" 
                  className={`text-[10px] sm:text-xs px-1 py-0.5 ${getStatusColor(assignment.status)} text-white`}
                >
                  {getStatusIcon(assignment.status)}
                </Badge>
              </div>
            </CardHeader>
            
            <CardContent className="p-2.5 sm:p-3 flex flex-col h-full overflow-hidden">
              {/* Assignment Title */}
              <div className="mb-1.5 sm:mb-2">
                <h3 className="font-medium text-[10px] sm:text-xs line-clamp-1 group-hover:text-primary transition-colors">
                  {assignment.title}
                </h3>
                <p className="text-[9px] sm:text-xs text-muted-foreground mt-0.5 sm:mt-1 line-clamp-1">
                  {assignment.course_title}
                </p>
              </div>

              {/* Compact Assignment Stats - Horizontal Layout */}
              <div className="flex items-center justify-between text-[9px] sm:text-xs text-muted-foreground mb-1.5 sm:mb-2 flex-1 min-h-0">
                <div className="flex items-center gap-0.5 sm:gap-1 min-w-0 flex-1">
                  <Calendar className="w-2 h-2 sm:w-2.5 sm:h-2.5 flex-shrink-0" />
                  <span className="truncate">{assignment.due_date ? formatDate(assignment.due_date) : 'No due date'}</span>
                </div>
                <div className="flex items-center gap-0.5 sm:gap-1 min-w-0 flex-1 justify-center">
                  <GraduationCap className="w-2 h-2 sm:w-2.5 sm:h-2.5 flex-shrink-0" />
                  <span className="truncate">{assignment.points || 0} pts</span>
                </div>
                <div className="flex items-center gap-0.5 sm:gap-1 min-w-0 flex-1 justify-end">
                  <CheckCircle className="w-2 h-2 sm:w-2.5 sm:h-2.5 flex-shrink-0" />
                  <span className="truncate">{assignment.grade !== undefined ? `${assignment.grade}/${assignment.points}` : 'Not graded'}</span>
                </div>
              </div>

              {/* Status Badge */}
              <div className="mb-1.5 sm:mb-2">
                <Badge 
                  variant="outline" 
                  className={`text-[9px] sm:text-xs px-1.5 py-0.5 ${isOverdue(assignment.due_date) ? 'text-red-600 border-red-600 bg-red-50 dark:bg-red-900/20' : 'text-muted-foreground'}`}
                >
                  {assignment.status === 'overdue' ? 'Overdue' : assignment.status.charAt(0).toUpperCase() + assignment.status.slice(1)}
                </Badge>
              </div>

              {/* Compact Action Button */}
              <div className="mt-auto pt-0.5 sm:pt-1">
                {assignment.status === 'pending' && (
                  <Button
                    size="sm"
                    className="w-full h-6 sm:h-7 text-[10px] sm:text-xs"
                    onClick={(e) => handleSubmit(e, assignment)}
                  >
                    <Upload className="w-2.5 h-2.5 sm:w-3 sm:h-3 mr-0.5 sm:mr-1" />
                    Submit
                  </Button>
                )}
                
                {assignment.status === 'submitted' && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full h-6 sm:h-7 text-[10px] sm:text-xs"
                    onClick={(e) => handleView(e, assignment)}
                  >
                    <Eye className="w-2.5 h-2.5 sm:w-3 sm:h-3 mr-0.5 sm:mr-1" />
                    View
                  </Button>
                )}
                
                {assignment.status === 'graded' && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full h-6 sm:h-7 text-[10px] sm:text-xs"
                    onClick={(e) => handleView(e, assignment)}
                  >
                    <CheckCircle className="w-2.5 h-2.5 sm:w-3 sm:h-3 mr-0.5 sm:mr-1" />
                    View Grade
                  </Button>
                )}
                
                {assignment.status === 'overdue' && (
                  <Button
                    size="sm"
                    className="w-full h-6 sm:h-7 text-[10px] sm:text-xs bg-red-500 hover:bg-red-600 text-white"
                    onClick={(e) => handleSubmit(e, assignment)}
                  >
                    <Upload className="w-2.5 h-2.5 sm:w-3 sm:h-3 mr-0.5 sm:mr-1" />
                    Submit Now
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
