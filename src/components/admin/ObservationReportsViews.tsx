import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Eye, Download, Trash2, MoreHorizontal, Calendar, Building, User, FileText, Clock, Star, TrendingUp } from 'lucide-react';
import { ObservationReport } from '@/contexts/ObservationReportsContext';

interface ObservationReportsViewsProps {
  reports: ObservationReport[];
  viewMode: 'card' | 'tile' | 'list';
  onView: (report: ObservationReport) => void;
  onDownload: (report: ObservationReport) => void;
  onDelete: (report: ObservationReport) => void;
  isDeleting?: (reportId: string) => boolean;
  isDownloading?: (reportId: string) => boolean;
  className?: string;
}

const getRoleIcon = (role: string) => {
  switch (role) {
    case 'principal': return User;
    case 'ece': return Building;
    case 'school-officer': return User;
    case 'project-manager': return TrendingUp;
    default: return User;
  }
};

const getRoleColor = (role: string) => {
  switch (role) {
    case 'principal': return 'from-blue-500 to-blue-600';
    case 'ece': return 'from-purple-500 to-purple-600';
    case 'school-officer': return 'from-orange-500 to-orange-600';
    case 'project-manager': return 'from-green-500 to-green-600';
    default: return 'from-gray-500 to-gray-600';
  }
};

const getScoreColor = (score: number) => {
  if (score >= 80) return 'text-[#8DC63F] dark:text-[#8DC63F]';
  if (score >= 70) return 'text-blue-600 dark:text-blue-500';
  if (score >= 60) return 'text-yellow-600 dark:text-yellow-500';
  return 'text-red-600 dark:text-red-500';
};

const getScoreGrade = (score: number) => {
  if (score >= 80) return 'A';
  if (score >= 70) return 'B+';
  if (score >= 60) return 'B';
  return 'C';
};

const ActionMenu: React.FC<{
  report: ObservationReport;
  onView: (report: ObservationReport) => void;
  onDownload: (report: ObservationReport) => void;
  onDelete: (report: ObservationReport) => void;
  isDeleting?: boolean;
  isDownloading?: boolean;
  size?: 'sm' | 'default';
}> = ({ report, onView, onDownload, onDelete, isDeleting = false, isDownloading = false, size = 'default' }) => {
  const buttonSize = size === 'sm' ? 'h-7 w-7 p-0' : 'h-8 w-8 p-0';
  const iconSize = size === 'sm' ? 'h-3 w-3' : 'h-4 w-4';
  
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          size="sm"
          className={`${buttonSize} rounded-xl hover:bg-gray-100/80 hover:text-gray-900 dark:hover:bg-gray-800/80 dark:hover:text-gray-100 hover:shadow-lg transition-all duration-300`}
          onClick={(e) => e.stopPropagation()}
        >
          <MoreHorizontal className={iconSize} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48 rounded-2xl shadow-xl border border-gray-200/60 dark:border-gray-700/60">
        <DropdownMenuItem 
          onClick={(e) => {
            e.stopPropagation();
            onView(report);
          }}
          className="rounded-xl cursor-pointer"
        >
          <Eye className="mr-2 h-4 w-4" />
          View Report
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={(e) => {
            e.stopPropagation();
            onDownload(report);
          }}
          disabled={isDownloading}
          className="rounded-xl cursor-pointer"
        >
          <Download className="mr-2 h-4 w-4" />
          {isDownloading ? 'Generating...' : 'Download PDF'}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <DropdownMenuItem 
              onSelect={(e) => {
                e.preventDefault();
              }}
              className="text-red-600 rounded-xl cursor-pointer hover:bg-red-50 dark:hover:bg-red-950/20"
              disabled={isDeleting}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              {isDeleting ? 'Deleting...' : 'Delete Report'}
            </DropdownMenuItem>
          </AlertDialogTrigger>
        </AlertDialog>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export const ObservationReportsViews: React.FC<ObservationReportsViewsProps> = ({
  reports,
  viewMode,
  onView,
  onDownload,
  onDelete,
  isDeleting = () => false,
  isDownloading = () => false,
  className
}) => {
  if (viewMode === 'list') {
    return (
      <div className="mb-20">
        <Card className={className}>
          <CardContent className="p-0">
            <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Observer</TableHead>
                <TableHead>School</TableHead>
                <TableHead>Teacher</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Score</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reports.map((report) => {
                const RoleIcon = getRoleIcon(report.observerRole);
                return (
                  <TableRow key={report.id} className="hover:bg-muted/50">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/40 text-primary text-xs font-semibold">
                            {report.observerName.split(' ').map(n => n[0]).join('').toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium text-sm">{report.observerName}</div>
                          <div className="flex items-center gap-1">
                            <RoleIcon className="h-3 w-3 text-muted-foreground" />
                            <Badge variant="outline" className="text-xs">
                              {report.observerRole.replace('-', ' ').toUpperCase()}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Building className="h-3 w-3 text-muted-foreground" />
                        <span className="text-sm font-medium">{report.schoolName}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <User className="h-3 w-3 text-muted-foreground" />
                        <span className="text-sm font-medium">{report.teacherName}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3 text-muted-foreground" />
                        <span className="text-sm">{new Date(report.observationDate).toLocaleDateString()}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className={`font-bold text-lg ${getScoreColor(report.overallScore)}`}>
                          {report.overallScore}%
                        </span>
                        <Badge variant="outline" className="text-xs">
                          {getScoreGrade(report.overallScore)}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant={report.status === 'completed' ? 'default' : 'secondary'}
                        className={report.status === 'completed' ? 'bg-[#8DC63F]/20 text-[#8DC63F] dark:bg-[#8DC63F]/20 dark:text-[#8DC63F]' : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'}
                      >
                        {report.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <ActionMenu
                        report={report}
                        onView={onView}
                        onDownload={onDownload}
                        onDelete={onDelete}
                        isDeleting={isDeleting(report.id)}
                        isDownloading={isDownloading(report.id)}
                      />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (viewMode === 'tile') {
    return (
      <div className={`grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 ${className}`}>
        {reports.map((report) => {
          const RoleIcon = getRoleIcon(report.observerRole);
          const colorGradient = getRoleColor(report.observerRole);
          
          return (
            <Card 
              key={report.id} 
              className="group cursor-pointer hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border border-border/50 shadow-sm bg-card/95 backdrop-blur-sm dark:bg-card dark:border-border/60 hover:border-primary/30 dark:hover:border-primary/30 h-60 flex flex-col overflow-hidden"
            >
              <CardContent className="p-3 flex flex-col h-full">
                <div className="flex items-start justify-between mb-2">
                  <div className={`w-8 h-8 bg-gradient-to-br ${colorGradient} rounded-lg flex items-center justify-center shadow-lg`}>
                    <RoleIcon className="w-4 h-4 text-white" />
                  </div>
                  <ActionMenu
                    report={report}
                    onView={onView}
                    onDownload={onDownload}
                    onDelete={onDelete}
                    isDeleting={isDeleting(report.id)}
                    isDownloading={isDownloading(report.id)}
                    size="sm"
                  />
                </div>

                <div className="flex-1 flex flex-col space-y-1">
                  <div>
                    <h3 className="font-medium text-xs line-clamp-1 group-hover:text-primary transition-colors duration-300 mb-1">
                      {report.teacherName}
                    </h3>
                    <p className="text-xs text-muted-foreground line-clamp-1">
                      {report.schoolName}
                    </p>
                  </div>
                  
                  <div className="flex items-center gap-1">
                    <Badge variant="outline" className="text-xs font-medium">
                      {report.observerRole.replace('-', ' ').toUpperCase()}
                    </Badge>
                  </div>
                </div>

                <div className="mt-auto pt-2">
                  <div className="flex items-center justify-between mb-1">
                    <div className={`text-sm font-bold ${getScoreColor(report.overallScore)}`}>
                      {report.overallScore}%
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(report.observationDate).toLocaleDateString()}
                    </div>
                  </div>
                  
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 mb-2">
                    <div 
                      className={`h-1.5 rounded-full transition-all duration-500 ${
                        report.overallScore >= 80 ? 'bg-[#8DC63F]' :
                        report.overallScore >= 70 ? 'bg-blue-500' :
                        report.overallScore >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${report.overallScore}%` }}
                    />
                  </div>
                  
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={(e) => {
                      e.stopPropagation();
                      onView(report);
                    }}
                    className="w-full h-7 text-xs hover:bg-primary hover:text-primary-foreground transition-all duration-200"
                  >
                    <Eye className="w-3 h-3 mr-1" />
                    View
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    );
  }

  // Card view (default) - enhanced version of existing ReportCard
  return (
    <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4 sm:gap-5 md:gap-6 ${className}`}>
      {reports.map((report) => {
        const RoleIcon = getRoleIcon(report.observerRole);
        const colorGradient = getRoleColor(report.observerRole);
        const statusColor = report.status === 'completed' ? 'bg-[#8DC63F]/20 text-[#8DC63F] dark:bg-[#8DC63F]/20 dark:text-[#8DC63F]' : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
        const roleColor = {
          'principal': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
          'ece': 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
          'school-officer': 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
          'project-manager': 'bg-[#8DC63F]/20 text-[#8DC63F] dark:bg-[#8DC63F]/20 dark:text-[#8DC63F]'
        }[report.observerRole] || 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';

        return (
          <Card 
            key={report.id} 
            className="group cursor-pointer hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border border-border/50 shadow-sm bg-card/95 backdrop-blur-sm dark:bg-card dark:border-border/60 hover:border-primary/40 dark:hover:border-primary/40 flex flex-col h-full overflow-hidden"
            onClick={(e) => {
              e.stopPropagation();
              onView(report);
            }}
          >
            <CardContent className="p-4 sm:p-5 md:p-6 flex flex-col flex-1 h-full">
              {/* Header Section */}
              <div className="flex items-start justify-between gap-3 mb-4 flex-shrink-0">
                <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                  <Avatar className="w-9 h-9 sm:w-10 sm:h-10 ring-2 ring-primary/10 flex-shrink-0">
                    <AvatarFallback className="bg-gradient-to-br from-primary/20 via-primary/30 to-primary/40 text-primary font-semibold text-xs sm:text-sm shadow-lg">
                      {report.observerName.split(' ').map(n => n[0]).join('').toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-base sm:text-lg md:text-xl leading-tight truncate group-hover:text-primary transition-colors duration-300 mb-1">
                      {report.teacherName}
                    </h3>
                    <p className="text-xs sm:text-sm text-muted-foreground truncate font-medium">
                      {report.schoolName}
                    </p>
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className={`text-lg sm:text-xl md:text-2xl font-bold ${getScoreColor(report.overallScore)}`}>
                    {report.overallScore}%
                  </div>
                  <Badge variant="outline" className="text-[10px] sm:text-xs mt-1">
                    {getScoreGrade(report.overallScore)}
                  </Badge>
                </div>
              </div>

              {/* Badges Section */}
              <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap mb-4 flex-shrink-0">
                <Badge variant="outline" className={`text-[10px] sm:text-xs font-medium ${roleColor}`}>
                  {report.observerRole.replace('-', ' ').toUpperCase()}
                </Badge>
                <Badge variant="outline" className={`text-[10px] sm:text-xs font-medium ${statusColor}`}>
                  {report.status}
                </Badge>
              </div>

              {/* Content Section - Flexible */}
              <div className="flex flex-col flex-1 space-y-3 sm:space-y-4">
                {/* Observer Info Grid */}
                <div className="grid grid-cols-2 gap-2 sm:gap-3 p-3 sm:p-4 bg-muted/40 dark:bg-muted/20 rounded-xl border border-border/30">
                  <div className="flex flex-col space-y-1">
                    <div className="flex items-center gap-1.5">
                      <User className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-primary/70 flex-shrink-0" />
                      <span className="text-[10px] sm:text-xs text-muted-foreground font-medium">Observer</span>
                    </div>
                    <span className="text-xs sm:text-sm font-semibold text-foreground truncate">
                      {report.observerName.split(' ')[0]}
                    </span>
                  </div>

                  <div className="flex flex-col space-y-1">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-primary/70 flex-shrink-0" />
                      <span className="text-[10px] sm:text-xs text-muted-foreground font-medium">Date</span>
                    </div>
                    <span className="text-xs sm:text-sm font-semibold text-foreground truncate">
                      {new Date(report.observationDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                </div>

                {/* Score Progress Bar */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-xs sm:text-sm">
                    <span className="text-muted-foreground font-medium">Overall Score</span>
                    <span className={`font-bold ${getScoreColor(report.overallScore)}`}>{report.overallScore}%</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 sm:h-2.5 overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-500 ${
                        report.overallScore >= 80 ? 'bg-[#8DC63F]' :
                        report.overallScore >= 70 ? 'bg-blue-500' :
                        report.overallScore >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${report.overallScore}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Action Buttons - Fixed at Bottom */}
              <div className="mt-auto pt-3 sm:pt-4 flex-shrink-0">
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        onView(report);
                      }}
                      className="h-8 sm:h-9 md:h-10 text-xs sm:text-sm font-semibold bg-[#8DC63F] hover:bg-[#7AB82F] text-white flex-1 shadow-sm hover:shadow-md transition-all duration-200"
                    >
                      <Eye className="w-3 h-3 sm:w-3.5 sm:h-3.5 mr-1 sm:mr-1.5" />
                      View
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDownload(report);
                      }}
                      disabled={isDownloading(report.id)}
                      className="h-8 sm:h-9 md:h-10 text-xs sm:text-sm font-semibold flex-1 hover:bg-primary hover:text-primary-foreground transition-all duration-200"
                    >
                      <Download className="w-3 h-3 sm:w-3.5 sm:h-3.5 mr-1 sm:mr-1.5" />
                      {isDownloading(report.id) ? 'Gen...' : 'PDF'}
                    </Button>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(report);
                    }}
                    disabled={isDeleting(report.id)}
                    className="h-8 sm:h-9 text-xs sm:text-sm font-semibold hover:bg-red-600 hover:text-white transition-all duration-200 text-red-600 border-red-200 dark:border-red-800"
                  >
                    <Trash2 className="w-3 h-3 sm:w-3.5 sm:h-3.5 mr-1 sm:mr-1.5" />
                    {isDeleting(report.id) ? 'Deleting...' : 'Delete Report'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};
