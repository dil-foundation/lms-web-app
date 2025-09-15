import React from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
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

interface AssessmentCardViewProps {
  assessments: Assessment[];
  onAssessmentClick: (assessment: Assessment) => void;
  onGrade: (assessment: Assessment) => void;
  onEdit: (assessment: Assessment) => void;
  onDelete: (assessment: Assessment) => void;
  onViewSubmissions: (assessment: Assessment) => void;
  className?: string;
}

export const AssessmentCardView: React.FC<AssessmentCardViewProps> = ({
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
        return <Badge variant="outline" className="text-green-600 border-green-600 bg-green-50 dark:bg-green-900/20">Quiz</Badge>;
      case 'assignment':
        return <Badge variant="outline" className="text-blue-600 border-blue-600 bg-blue-50 dark:bg-blue-900/20">Assignment</Badge>;
      default:
        return <Badge variant="outline">{type}</Badge>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge variant="outline" className="text-green-600 border-green-600 bg-green-50 dark:bg-green-900/20">Active</Badge>;
      case 'inactive':
        return <Badge variant="outline" className="text-gray-600 border-gray-600 bg-gray-50 dark:bg-gray-900/20">Inactive</Badge>;
      case 'overdue':
        return <Badge variant="outline" className="text-red-600 border-red-600 bg-red-50 dark:bg-red-900/20">Overdue</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className={className}>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {assessments.map((assessment) => (
          <Card
            key={assessment.id}
            className="group cursor-pointer hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border border-border/50 shadow-md bg-card/95 backdrop-blur-sm dark:bg-card dark:border-border/60 hover:border-primary/30 dark:hover:border-primary/30 h-96 flex flex-col overflow-hidden"
            onClick={() => onAssessmentClick(assessment)}
          >
            <CardHeader className="p-6 pb-4">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-lg line-clamp-1 group-hover:text-primary transition-colors mb-3">
                    {assessment.title}
                  </h3>
                  <div className="flex items-center gap-2 mb-3">
                    {getTypeBadge(assessment.type)}
                    {getStatusBadge(assessment.status)}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {assessment.course_name}
                  </p>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0 hover:bg-muted flex-shrink-0"
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
            </CardHeader>
            
            <CardContent className="p-6 pt-0 flex flex-col h-full overflow-hidden">
              {/* Content Area - Fixed height to ensure button alignment */}
              <div className="flex-1 flex flex-col min-h-0">
                {/* Detailed Assessment Stats - Horizontal Layout */}
                <div className="p-3 bg-muted/30 rounded-lg mb-4">
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <div className="flex items-center gap-1 w-1/3">
                      <Users className="w-4 h-4 flex-shrink-0" />
                      <span className="font-medium text-foreground truncate">{assessment.submissions_count}</span>
                    </div>
                    <div className="flex items-center gap-1 w-1/3 justify-center">
                      <CheckCircle className="w-4 h-4 flex-shrink-0" />
                      <span className="font-medium text-foreground">{assessment.graded_count}</span>
                    </div>
                    <div className="flex items-center gap-1 w-1/3 justify-end">
                      <TrendingUp className="w-4 h-4 flex-shrink-0" />
                      <span className={`font-medium text-foreground truncate ${getScoreColor(assessment.average_score)}`}>{assessment.average_score}%</span>
                    </div>
                  </div>
                </div>

                {/* Due Date Section */}
                <div className="mb-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="w-4 h-4" />
                    <span className="font-medium">Due Date:</span>
                    <span className="font-medium text-foreground">{assessment.due_date}</span>
                  </div>
                </div>
              </div>

              {/* Action Button - Always at bottom with fixed positioning */}
              <div className="mt-auto pt-6 pb-1">
                <Button
                  size="sm"
                  className="w-full h-10 text-sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onAssessmentClick(assessment);
                  }}
                >
                  <FileText className="w-4 h-4 mr-2" />
                  View Assessment
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
