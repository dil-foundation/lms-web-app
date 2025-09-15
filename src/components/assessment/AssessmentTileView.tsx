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

interface AssessmentTileViewProps {
  assessments: Assessment[];
  onAssessmentClick: (assessment: Assessment) => void;
  onGrade: (assessment: Assessment) => void;
  onEdit: (assessment: Assessment) => void;
  onDelete: (assessment: Assessment) => void;
  onViewSubmissions: (assessment: Assessment) => void;
  className?: string;
}

export const AssessmentTileView: React.FC<AssessmentTileViewProps> = ({
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
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 w-full overflow-hidden">
        {assessments.map((assessment) => (
          <Card
            key={assessment.id}
            className="group cursor-pointer hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border border-border/50 shadow-sm bg-card/95 backdrop-blur-sm dark:bg-card dark:border-border/60 hover:border-primary/30 dark:hover:border-primary/30 h-48 flex flex-col overflow-hidden"
            onClick={() => onAssessmentClick(assessment)}
          >
            <CardHeader className="p-0 relative">
              <div className="w-full h-16 bg-gradient-to-br from-primary/10 to-primary/20">
              </div>
              <div className="absolute top-1 left-1 right-1 flex justify-between items-start">
                <div className="flex gap-2 items-center">
                  {getTypeBadge(assessment.type)}
                  <FileText className="w-4 h-4 text-primary/70" />
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
                    <DropdownMenuItem onClick={(e) => handleViewSubmissions(e, assessment)}>
                      <Users className="w-4 h-4 mr-2" />
                      View Submissions
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={(e) => handleGrade(e, assessment)}>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Grade
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={(e) => handleEdit(e, assessment)}>
                      <FileText className="w-4 h-4 mr-2" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={(e) => handleDelete(e, assessment)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <MoreHorizontal className="w-4 h-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardHeader>
            
            <CardContent className="p-3 flex flex-col h-full overflow-hidden">
              {/* Assessment Title with Status Badge */}
              <div className="mb-2">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <h3 className="font-medium text-xs line-clamp-1 group-hover:text-primary transition-colors flex-1 min-w-0">
                    {assessment.title}
                  </h3>
                  {getStatusBadge(assessment.status)}
                </div>
                <p className="text-xs text-muted-foreground truncate">{assessment.course_name}</p>
              </div>

              {/* Compact Assessment Stats - Horizontal Layout */}
              <div className="flex items-center justify-between text-xs text-muted-foreground mb-3 flex-1 min-h-0">
                <div className="flex items-center gap-1 min-w-0 flex-1">
                  <Users className="w-2.5 h-2.5 flex-shrink-0" />
                  <span className="truncate">{assessment.submissions_count}</span>
                </div>
                <div className="flex items-center gap-1 min-w-0 flex-1 justify-center">
                  <CheckCircle className="w-2.5 h-2.5 flex-shrink-0" />
                  <span className="truncate">{assessment.graded_count}</span>
                </div>
                <div className="flex items-center gap-1 min-w-0 flex-1 justify-end">
                  <TrendingUp className="w-2.5 h-2.5 flex-shrink-0" />
                  <span className={`truncate ${getScoreColor(assessment.average_score)}`}>{assessment.average_score}%</span>
                </div>
              </div>

              {/* Compact Action Button */}
              <div className="mt-auto pt-2">
                <Button
                  size="sm"
                  className="w-full h-7 text-xs"
                  onClick={(e) => {
                    e.stopPropagation();
                    onAssessmentClick(assessment);
                  }}
                >
                  <FileText className="w-3 h-3 mr-1" />
                  View
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
