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
  onViewSubmissions: (assessment: Assessment) => void;
  className?: string;
}

export const AssessmentTileView: React.FC<AssessmentTileViewProps> = ({
  assessments,
  onAssessmentClick,
  onGrade,
  onViewSubmissions,
  className
}) => {
  const handleGrade = (e: React.MouseEvent, assessment: Assessment) => {
    e.stopPropagation();
    onGrade(assessment);
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
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3 sm:gap-4 md:gap-5 w-full">
        {assessments.map((assessment) => (
          <Card
            key={assessment.id}
            className="group cursor-pointer hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border border-border/50 shadow-sm bg-card/95 backdrop-blur-sm dark:bg-card dark:border-border/60 hover:border-primary/40 dark:hover:border-primary/40 flex flex-col overflow-hidden min-h-[220px] sm:min-h-[240px]"
            onClick={() => onAssessmentClick(assessment)}
          >
            {/* Card Header with Icon Banner */}
            <CardHeader className="p-0 relative flex-shrink-0">
              <div className="w-full min-h-[55px] sm:min-h-[65px] flex items-center justify-center pt-3 sm:pt-4">
                <FileText className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
              </div>
              
              {/* Overlay Badges and Menu */}
              <div className="absolute top-1 sm:top-1.5 left-1 sm:left-1.5 right-1 sm:right-1.5 flex justify-between items-start gap-1">
                <div className="flex gap-1 items-center flex-shrink min-w-0">
                  {getTypeBadge(assessment.type)}
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-5 w-5 sm:h-6 sm:w-6 p-0 hover:bg-muted/80 dark:hover:bg-black/30 text-foreground rounded-md flex-shrink-0"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <MoreHorizontal className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-40">
                    <DropdownMenuItem onClick={(e) => handleViewSubmissions(e, assessment)} className="cursor-pointer">
                      <Users className="w-3.5 h-3.5 mr-2" />
                      Submissions
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={(e) => handleGrade(e, assessment)} className="cursor-pointer">
                      <CheckCircle className="w-3.5 h-3.5 mr-2" />
                      Grade
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardHeader>
            
            {/* Card Content */}
            <CardContent className="p-2.5 sm:p-3 flex flex-col flex-1">
              {/* Assessment Title with Status Badge */}
              <div className="mb-2 space-y-1 min-w-0">
                <h3 className="font-semibold text-xs sm:text-sm leading-tight line-clamp-2 group-hover:text-primary transition-colors">
                  {assessment.title}
                </h3>
                <div className="flex items-center gap-1">
                  {getStatusBadge(assessment.status)}
                </div>
                <p className="text-[10px] sm:text-xs text-muted-foreground font-medium truncate">
                  {assessment.course_name}
                </p>
              </div>

              {/* Compact Stats Grid */}
              <div className="grid grid-cols-3 gap-1.5 sm:gap-2 text-[10px] sm:text-xs text-center mb-2 py-2 bg-muted/30 dark:bg-muted/20 rounded-md">
                <div className="flex flex-col items-center justify-center gap-0.5">
                  <Users className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-primary/70" />
                  <span className="font-bold text-foreground">{assessment.submissions_count}</span>
                </div>
                <div className="flex flex-col items-center justify-center gap-0.5 border-x border-border/30">
                  <CheckCircle className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-primary/70" />
                  <span className="font-bold text-foreground">{assessment.graded_count}</span>
                </div>
                <div className="flex flex-col items-center justify-center gap-0.5">
                  <TrendingUp className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-primary/70" />
                  <span className={`font-bold ${getScoreColor(assessment.average_score)}`}>{assessment.average_score}%</span>
                </div>
              </div>

              {/* Due Date */}
              <div className="flex items-center gap-1 text-[10px] sm:text-xs text-muted-foreground mb-2 min-w-0">
                <Calendar className="w-3 h-3 sm:w-3.5 sm:h-3.5 flex-shrink-0" />
                <span className="truncate font-medium">{assessment.due_date}</span>
              </div>

              {/* Compact Action Button - Fixed at Bottom */}
              <div className="mt-auto">
                <Button
                  size="sm"
                  className="w-full h-7 sm:h-8 text-[10px] sm:text-xs font-semibold bg-[#8DC63F] hover:bg-[#7AB82F] text-white"
                  onClick={(e) => {
                    e.stopPropagation();
                    onAssessmentClick(assessment);
                  }}
                >
                  <FileText className="w-3 h-3 sm:w-3.5 sm:h-3.5 mr-1" />
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
