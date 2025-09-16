import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { FileText, Calendar, Users, CheckCircle, MoreHorizontal, Clock, TrendingUp } from 'lucide-react';

interface Assessment {
  id: string;
  title: string;
  type: 'quiz' | 'assignment';
  course_name: string;
  due_date: string;
  status: 'active' | 'inactive' | 'overdue';
  submissions_count: number;
  graded_count: number;
  average_score: number;
}

interface AssessmentListViewProps {
  assessments: Assessment[];
  onAssessmentClick: (assessment: Assessment) => void;
  onGrade: (assessment: Assessment) => void;
  onEdit: (assessment: Assessment) => void;
  onDelete: (assessment: Assessment) => void;
  onViewSubmissions: (assessment: Assessment) => void;
  className?: string;
}

export const AssessmentListView: React.FC<AssessmentListViewProps> = ({
  assessments,
  onAssessmentClick,
  onGrade,
  onEdit,
  onDelete,
  onViewSubmissions,
  className
}) => {
  const handleGrade = (e: React.MouseEvent, assessment: Assessment) => {
    e.stopPropagation();
    onGrade(assessment);
  };

  const handleEdit = (e: React.MouseEvent, assessment: Assessment) => {
    e.stopPropagation();
    onEdit(assessment);
  };

  const handleDelete = (e: React.MouseEvent, assessment: Assessment) => {
    e.stopPropagation();
    onDelete(assessment);
  };

  const handleViewSubmissions = (e: React.MouseEvent, assessment: Assessment) => {
    e.stopPropagation();
    onViewSubmissions(assessment);
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'quiz':
        return <Badge variant="outline" className="text-green-600 border-green-600 bg-green-50 dark:bg-green-900/20 text-xs">Quiz</Badge>;
      case 'assignment':
        return <Badge variant="outline" className="text-blue-600 border-blue-600 bg-blue-50 dark:bg-blue-900/20 text-xs">Assignment</Badge>;
      default:
        return <Badge variant="outline" className="text-xs">{type}</Badge>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge variant="outline" className="text-green-600 border-green-600 bg-green-50 dark:bg-green-900/20 text-xs">Active</Badge>;
      case 'inactive':
        return <Badge variant="outline" className="text-gray-600 border-gray-600 bg-gray-50 dark:bg-gray-900/20 text-xs">Inactive</Badge>;
      case 'overdue':
        return <Badge variant="outline" className="text-red-600 border-red-600 bg-red-50 dark:bg-red-900/20 text-xs">Overdue</Badge>;
      default:
        return <Badge variant="outline" className="text-xs">{status}</Badge>;
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className={className}>
      <div className="space-y-2">
        {assessments.map((assessment) => (
          <Card
            key={assessment.id}
            className="group cursor-pointer hover:shadow-md transition-all duration-200 hover:bg-muted/50 border border-border/50 shadow-sm bg-card/95 backdrop-blur-sm dark:bg-card dark:border-border/60 hover:border-border dark:hover:border-border border-l-4 border-l-transparent hover:border-l-primary"
          >
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                {/* Assessment Icon */}
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-primary/10 to-primary/20 flex items-center justify-center">
                    <FileText className="w-6 h-6 text-primary" />
                  </div>
                </div>

                {/* Assessment Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-sm group-hover:text-primary transition-colors">
                      {assessment.title}
                    </h3>
                    {getTypeBadge(assessment.type)}
                    {getStatusBadge(assessment.status)}
                  </div>
                  <p className="text-xs text-muted-foreground mb-2">
                    {assessment.course_name}
                  </p>
                  
                  {/* Assessment Stats */}
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      <span>{assessment.submissions_count} submissions</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" />
                      <span>{assessment.graded_count} graded</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <TrendingUp className="w-3 h-3" />
                      <span className={`font-medium ${getScoreColor(assessment.average_score)}`}>
                        {assessment.average_score}% avg
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      <span>Due: {assessment.due_date}</span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 text-xs"
                    onClick={(e) => {
                      e.stopPropagation();
                      onAssessmentClick(assessment);
                    }}
                  >
                    <FileText className="w-3 h-3 mr-1" />
                    View
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
                      <DropdownMenuItem onClick={(e) => handleViewSubmissions(e, assessment)}>
                        <Users className="w-4 h-4 mr-2" />
                        View Submissions
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={(e) => handleGrade(e, assessment)}>
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Grade Assessment
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={(e) => handleEdit(e, assessment)}>
                        <FileText className="w-4 h-4 mr-2" />
                        Edit Assessment
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={(e) => handleDelete(e, assessment)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <MoreHorizontal className="w-4 h-4 mr-2" />
                        Delete Assessment
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
