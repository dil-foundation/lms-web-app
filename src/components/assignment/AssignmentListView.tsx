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
  Paperclip,
  Eye,
  Edit
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
  teacher?: {
    first_name: string;
    last_name: string;
  };
}

interface AssignmentListViewProps {
  assignments: Assignment[];
  onAssignmentClick?: (assignment: Assignment) => void;
  onSubmit?: (assignment: Assignment) => void;
  onView?: (assignment: Assignment) => void;
  className?: string;
}

export const AssignmentListView: React.FC<AssignmentListViewProps> = ({
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
        return <Upload className="w-4 h-4" />;
      case 'graded':
        return <CheckCircle className="w-4 h-4" />;
      case 'overdue':
        return <AlertCircle className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  const getSubmissionIcon = (type?: string) => {
    switch (type) {
      case 'file':
        return <Paperclip className="w-4 h-4" />;
      case 'text':
        return <FileText className="w-4 h-4" />;
      case 'quiz':
        return <ClipboardList className="w-4 h-4" />;
      case 'url':
        return <BookOpen className="w-4 h-4" />;
      default:
        return <FileText className="w-4 h-4" />;
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const isOverdue = (dueDate?: string) => {
    if (!dueDate) return false;
    return new Date(dueDate) < new Date();
  };

  return (
    <div className={className}>
      <div className="space-y-2">
        {assignments.map((assignment) => (
          <Card
            key={assignment.id}
            className="group cursor-pointer hover:shadow-md transition-all duration-200 hover:bg-muted/50 border border-border/50 shadow-sm bg-card/95 backdrop-blur-sm dark:bg-card dark:border-border/60 hover:border-border dark:hover:border-border border-l-4 border-l-transparent hover:border-l-primary"
            onClick={() => handleAssignmentClick(assignment)}
          >
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                {/* Assignment Icon */}
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-primary/10 to-primary/20 flex items-center justify-center">
                    {getSubmissionIcon(assignment.submission_type)}
                  </div>
                </div>

                {/* Assignment Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      {/* Title and badges */}
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-base text-foreground group-hover:text-primary transition-colors truncate">
                          {assignment.title}
                        </h3>
                        
                        {/* Course Badge */}
                        {assignment.course_title && (
                          <Badge variant="outline" className="text-xs">
                            <BookOpen className="w-3 h-3 mr-1" />
                            {assignment.course_title}
                          </Badge>
                        )}

                        {/* Submission Type Badge */}
                        {assignment.submission_type && (
                          <Badge variant="secondary" className="text-xs">
                            {getSubmissionIcon(assignment.submission_type)}
                            <span className="ml-1 capitalize">{assignment.submission_type}</span>
                          </Badge>
                        )}

                        {/* Status Badge */}
                        <Badge 
                          variant="default" 
                          className={`text-xs ${getStatusColor(assignment.status)} text-white`}
                        >
                          {getStatusIcon(assignment.status)}
                          <span className="ml-1 capitalize">{assignment.status}</span>
                        </Badge>
                      </div>

                      {/* Description */}
                      {assignment.description && (
                        <p className="text-sm text-muted-foreground line-clamp-1 mb-2">
                          {assignment.description}
                        </p>
                      )}

                      {/* Assignment Stats */}
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        {assignment.due_date && (
                          <div className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            <span className={isOverdue(assignment.due_date) ? 'text-red-500 font-medium' : ''}>
                              Due {formatDate(assignment.due_date)}
                              {isOverdue(assignment.due_date) && ' (Overdue)'}
                            </span>
                          </div>
                        )}
                        

                        {assignment.teacher && (
                          <div className="flex items-center gap-1">
                            <BookOpen className="w-4 h-4" />
                            <span>{assignment.teacher.first_name} {assignment.teacher.last_name}</span>
                          </div>
                        )}

                        {assignment.submitted_at && (
                          <div className="flex items-center gap-1">
                            <Upload className="w-4 h-4" />
                            <span>Submitted {formatDate(assignment.submitted_at)}</span>
                          </div>
                        )}

                        {assignment.graded_at && (
                          <div className="flex items-center gap-1">
                            <CheckCircle className="w-4 h-4" />
                            <span>Graded {formatDate(assignment.graded_at)}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Grade and Actions */}
                    <div className="flex items-center gap-4 ml-4">
                      {/* Grade Display */}
                      {assignment.grade !== undefined && (
                        <div className="text-right">
                          <div className="text-lg font-bold text-primary">
                            {assignment.grade}%
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Score
                          </div>
                        </div>
                      )}

                      {/* Action Buttons */}
                      <div className="flex items-center gap-1">
                        {assignment.status === 'pending' && (
                          <Button
                            size="sm"
                            className="hover:bg-primary hover:text-primary-foreground transition-all duration-200"
                            onClick={(e) => handleSubmit(e, assignment)}
                          >
                            <Upload className="w-4 h-4 mr-2" />
                            Submit
                          </Button>
                        )}
                        
                        {assignment.status === 'submitted' && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="hover:bg-blue-500/10 hover:text-blue-500 transition-all duration-200"
                            onClick={(e) => handleView(e, assignment)}
                          >
                            <Eye className="w-4 h-4 mr-2" />
                            View
                          </Button>
                        )}
                        
                        {assignment.status === 'graded' && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="hover:bg-green-500/10 hover:text-green-500 transition-all duration-200"
                            onClick={(e) => handleView(e, assignment)}
                          >
                            <CheckCircle className="w-4 h-4 mr-2" />
                            Review
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
