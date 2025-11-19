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
  onViewSubmissions: (assessment: Assessment) => void;
  className?: string;
}

export const AssessmentCardView: React.FC<AssessmentCardViewProps> = ({
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4 sm:gap-5 md:gap-6">
        {assessments.map((assessment) => (
          <Card
            key={assessment.id}
            className="group cursor-pointer hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border border-border/50 shadow-sm bg-card/95 backdrop-blur-sm dark:bg-card dark:border-border/60 hover:border-primary/40 dark:hover:border-primary/40 flex flex-col h-full overflow-hidden"
            onClick={() => onAssessmentClick(assessment)}
          >
            <CardHeader className="p-4 sm:p-5 md:p-6 pb-3 sm:pb-4 flex-shrink-0">
              <div className="flex items-start justify-between gap-2 mb-3 sm:mb-4">
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-base sm:text-lg md:text-xl leading-tight line-clamp-2 group-hover:text-primary transition-colors mb-2 sm:mb-3">
                    {assessment.title}
                  </h3>
                  <div className="flex items-center gap-1.5 sm:gap-2 mb-2 sm:mb-3 flex-wrap">
                    {getTypeBadge(assessment.type)}
                    {getStatusBadge(assessment.status)}
                  </div>
                  <p className="text-xs sm:text-sm text-muted-foreground line-clamp-1 font-medium">
                    {assessment.course_name}
                  </p>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 w-7 sm:h-8 sm:w-8 p-0 hover:bg-muted/80 flex-shrink-0 rounded-lg"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <MoreHorizontal className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem onClick={(e) => handleViewSubmissions(e, assessment)} className="cursor-pointer">
                      <Users className="w-4 h-4 mr-2" />
                      View Submissions
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={(e) => handleGrade(e, assessment)} className="cursor-pointer">
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Grade Assessment
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardHeader>
            
            <CardContent className="p-4 sm:p-5 md:p-6 pt-0 flex flex-col flex-1 h-full">
              {/* Content Area - Flexible */}
              <div className="flex flex-col flex-1 space-y-3 sm:space-y-4">
                {/* Stats Grid - Responsive */}
                <div className="grid grid-cols-3 gap-2 sm:gap-3 p-3 sm:p-4 bg-muted/40 dark:bg-muted/20 rounded-xl border border-border/30">
                  <div className="flex flex-col items-center justify-center text-center space-y-1">
                    <Users className="w-4 h-4 sm:w-5 sm:h-5 text-primary/70 flex-shrink-0" />
                    <div className="flex flex-col">
                      <span className="text-sm sm:text-base md:text-lg font-bold text-foreground">
                        {assessment.submissions_count}
                      </span>
                      <span className="text-[10px] sm:text-xs text-muted-foreground font-medium">
                        Submissions
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col items-center justify-center text-center space-y-1 border-x border-border/30">
                    <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-primary/70 flex-shrink-0" />
                    <div className="flex flex-col">
                      <span className="text-sm sm:text-base md:text-lg font-bold text-foreground">
                        {assessment.graded_count}
                      </span>
                      <span className="text-[10px] sm:text-xs text-muted-foreground font-medium">
                        Graded
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col items-center justify-center text-center space-y-1">
                    <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-primary/70 flex-shrink-0" />
                    <div className="flex flex-col">
                      <span className={`text-sm sm:text-base md:text-lg font-bold ${getScoreColor(assessment.average_score)}`}>
                        {assessment.average_score}%
                      </span>
                      <span className="text-[10px] sm:text-xs text-muted-foreground font-medium">
                        Average
                      </span>
                    </div>
                  </div>
                </div>

                {/* Due Date Section */}
                <div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm text-muted-foreground p-2 sm:p-2.5 bg-primary/5 dark:bg-primary/10 rounded-lg border border-primary/10">
                  <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0 text-primary/70" />
                  <span className="font-semibold text-foreground">Due:</span>
                  <span className="font-medium text-foreground">{assessment.due_date}</span>
                </div>
              </div>

              {/* Action Button - Fixed at bottom */}
              <div className="mt-auto pt-3 sm:pt-4 flex-shrink-0">
                <Button
                  size="sm"
                  className="w-full h-9 sm:h-10 md:h-11 text-xs sm:text-sm font-semibold bg-[#8DC63F] hover:bg-[#7AB82F] text-white shadow-sm hover:shadow-md transition-all duration-200"
                  onClick={(e) => {
                    e.stopPropagation();
                    onAssessmentClick(assessment);
                  }}
                >
                  <FileText className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2" />
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
