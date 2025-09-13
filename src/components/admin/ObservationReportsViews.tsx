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
  if (score >= 80) return 'text-green-600 dark:text-green-500';
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
                        className={report.status === 'completed' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'}
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
    );
  }

  if (viewMode === 'tile') {
    return (
      <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 ${className}`}>
        {reports.map((report) => {
          const RoleIcon = getRoleIcon(report.observerRole);
          const colorGradient = getRoleColor(report.observerRole);
          
          return (
            <Card 
              key={report.id} 
              className="group relative bg-gradient-to-br from-card to-card/50 dark:bg-card border border-gray-200/60 dark:border-gray-700/60 hover:border-gray-300/80 dark:hover:border-gray-600/80 hover:shadow-2xl hover:shadow-primary/10 transition-all duration-500 rounded-3xl overflow-hidden backdrop-blur-sm cursor-pointer hover:-translate-y-1 h-64 flex flex-col"
            >
              <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${colorGradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
              
              <CardContent className="p-4 flex flex-col h-full">
                <div className="flex items-start justify-between mb-3">
                  <div className={`w-10 h-10 bg-gradient-to-br ${colorGradient} rounded-xl flex items-center justify-center shadow-lg`}>
                    <RoleIcon className="w-5 h-5 text-white" />
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

                <div className="flex-1 flex flex-col space-y-2">
                  <div>
                    <h3 className="font-bold text-sm text-gray-900 dark:text-gray-100 truncate group-hover:text-primary transition-colors duration-300 mb-1">
                      {report.teacherName}
                    </h3>
                    <p className="text-xs text-muted-foreground line-clamp-1 leading-relaxed">
                      {report.schoolName}
                    </p>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs font-medium shadow-sm border-gray-300/60 dark:border-gray-600/60 bg-gray-50/80 dark:bg-gray-800/80">
                      {report.observerRole.replace('-', ' ').toUpperCase()}
                    </Badge>
                  </div>
                </div>

                <div className="flex items-center justify-between mt-3 pt-2 border-t border-border/50">
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    <span className="font-medium">{new Date(report.observationDate).toLocaleDateString()}</span>
                  </div>
                  <div className={`text-xs font-bold ${getScoreColor(report.overallScore)}`}>
                    {report.overallScore}%
                  </div>
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
    <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 ${className}`}>
      {reports.map((report) => {
        const RoleIcon = getRoleIcon(report.observerRole);
        const colorGradient = getRoleColor(report.observerRole);
        const statusColor = report.status === 'completed' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
        const roleColor = {
          'principal': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
          'ece': 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
          'school-officer': 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
          'project-manager': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
        }[report.observerRole] || 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';

        return (
          <Card key={report.id} className="group relative bg-gradient-to-br from-card to-card/50 dark:bg-card border border-gray-200/60 dark:border-gray-700/60 hover:border-gray-300/80 dark:hover:border-gray-600/80 hover:shadow-2xl hover:shadow-primary/10 transition-all duration-500 rounded-3xl overflow-hidden backdrop-blur-sm cursor-pointer hover:-translate-y-1 h-80 flex flex-col w-full">
            <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${colorGradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
            
            <CardContent className="p-4 flex flex-col h-full w-full overflow-hidden">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <Avatar className="w-10 h-10 ring-2 ring-primary/10 flex-shrink-0">
                    <AvatarFallback className="bg-gradient-to-br from-primary/20 via-primary/30 to-primary/40 text-primary font-semibold text-sm shadow-lg">
                      {report.observerName.split(' ').map(n => n[0]).join('').toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-sm text-gray-900 dark:text-gray-100 truncate group-hover:text-primary transition-colors duration-300 mb-1">
                      {report.teacherName}
                    </h3>
                    <p className="text-xs text-muted-foreground truncate mb-1">
                      {report.schoolName}
                    </p>
                    <div className="flex items-center gap-1 flex-wrap">
                      <Badge variant="outline" className={`text-xs font-medium ${roleColor}`}>
                        {report.observerRole.replace('-', ' ').toUpperCase()}
                      </Badge>
                      <Badge variant="outline" className={`text-xs font-medium ${statusColor}`}>
                        {report.status}
                      </Badge>
                    </div>
                  </div>
                </div>
                <div className="text-right flex-shrink-0 ml-2">
                  <div className={`text-lg font-bold ${getScoreColor(report.overallScore)}`}>
                    {report.overallScore}%
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {getScoreGrade(report.overallScore)}
                  </Badge>
                </div>
              </div>

              <div className="flex-1 flex flex-col space-y-2 overflow-hidden">
                {/* Report Details */}
                <div className="space-y-1 text-xs text-muted-foreground">
                  <div className="flex items-center gap-2 min-w-0">
                    <User className="h-3 w-3 flex-shrink-0" />
                    <span className="truncate">{report.observerName}</span>
                  </div>
                  <div className="flex items-center gap-2 min-w-0">
                    <Calendar className="h-3 w-3 flex-shrink-0" />
                    <span className="truncate">{new Date(report.observationDate).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center gap-2 min-w-0">
                    <Clock className="h-3 w-3 flex-shrink-0" />
                    <span className="truncate">{report.startTime} - {report.endTime}</span>
                  </div>
                  <div className="flex items-center gap-2 min-w-0">
                    <FileText className="h-3 w-3 flex-shrink-0" />
                    <span className="truncate">{report.lessonCode}</span>
                  </div>
                </div>

                {/* Project Information */}
                {report.projectName && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground pt-2 border-t border-border/50 min-w-0">
                    <Star className="h-3 w-3 flex-shrink-0" />
                    <span className="truncate">Project: {report.projectName}</span>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-1 pt-3 border-t border-border/50 w-full">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={(e) => {
                    e.stopPropagation();
                    onView(report);
                  }}
                  className="flex-1 h-7 text-xs hover:bg-primary hover:text-primary-foreground transition-all duration-200 min-w-0"
                >
                  <Eye className="w-3 h-3 mr-1" />
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
                  className="flex-1 h-7 text-xs hover:bg-primary hover:text-primary-foreground transition-all duration-200 min-w-0"
                >
                  <Download className="w-3 h-3 mr-1" />
                  {isDownloading(report.id) ? 'Gen...' : 'PDF'}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(report);
                  }}
                  disabled={isDeleting(report.id)}
                  className="flex-1 h-7 text-xs hover:bg-red-600 hover:text-white transition-all duration-200 text-red-600 border-red-200 hover:border-red-600 min-w-0"
                >
                  <Trash2 className="w-3 h-3 mr-1" />
                  {isDeleting(report.id) ? 'Del...' : 'Delete'}
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};
