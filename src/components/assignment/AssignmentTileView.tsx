import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
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
  Paperclip
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {assignments.map((assignment) => (
          <Card
            key={assignment.id}
            className="group cursor-pointer hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border border-border/50 shadow-md bg-card/95 backdrop-blur-sm dark:bg-card dark:border-border/60 hover:border-border dark:hover:border-border"
            onClick={() => handleAssignmentClick(assignment)}
          >
            <CardContent className="p-4">
              {/* Header with status */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex flex-wrap gap-1">
                  {assignment.course_title && (
                    <Badge variant="outline" className="text-xs">
                      <BookOpen className="w-3 h-3 mr-1" />
                      {assignment.course_title}
                    </Badge>
                  )}
                  {assignment.submission_type && (
                    <Badge variant="secondary" className="text-xs">
                      {getSubmissionIcon(assignment.submission_type)}
                      <span className="ml-1 capitalize">{assignment.submission_type}</span>
                    </Badge>
                  )}
                </div>
                
                {/* Status Badge */}
                <Badge 
                  variant="default" 
                  className={`text-xs ${getStatusColor(assignment.status)} text-white`}
                >
                  {getStatusIcon(assignment.status)}
                  <span className="ml-1 capitalize">{assignment.status}</span>
                </Badge>
              </div>

              {/* Title */}
              <h3 className="font-semibold text-sm leading-tight line-clamp-2 text-foreground group-hover:text-primary transition-colors mb-2">
                {assignment.title}
              </h3>

              {/* Description */}
              {assignment.description && (
                <p className="text-xs text-muted-foreground line-clamp-3 mb-3">
                  {assignment.description}
                </p>
              )}

              {/* Due Date */}
              {assignment.due_date && (
                <div className="flex items-center gap-1 mb-3">
                  <Calendar className="w-3 h-3 text-muted-foreground" />
                  <span className={`text-xs ${isOverdue(assignment.due_date) ? 'text-red-500 font-medium' : 'text-muted-foreground'}`}>
                    Due {formatDate(assignment.due_date)}
                    {isOverdue(assignment.due_date) && ' (Overdue)'}
                  </span>
                </div>
              )}

              {/* Points and Grade */}
              <div className="flex items-center justify-between text-xs text-muted-foreground mb-3">
                {assignment.points && (
                  <div className="flex items-center gap-1">
                    <GraduationCap className="w-3 h-3" />
                    <span>{assignment.points} points</span>
                  </div>
                )}
                
                {assignment.grade !== undefined && (
                  <div className="flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" />
                    <span className="font-medium text-primary">{assignment.grade}/{assignment.points}</span>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-1">
                {assignment.status === 'pending' && (
                  <Button
                    size="sm"
                    className="flex-1 h-7 text-xs hover:bg-primary hover:text-primary-foreground transition-all duration-200"
                    onClick={(e) => handleSubmit(e, assignment)}
                  >
                    <Upload className="w-3 h-3 mr-1" />
                    Submit
                  </Button>
                )}
                
                {assignment.status === 'submitted' && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 h-7 text-xs hover:bg-blue-500/10 hover:text-blue-500 transition-all duration-200"
                    onClick={(e) => handleView(e, assignment)}
                  >
                    <Eye className="w-3 h-3 mr-1" />
                    View
                  </Button>
                )}
                
                {assignment.status === 'graded' && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 h-7 text-xs hover:bg-green-500/10 hover:text-green-500 transition-all duration-200"
                    onClick={(e) => handleView(e, assignment)}
                  >
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Review
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
