import { useState, useMemo, useEffect } from 'react';
import {
  ArrowLeft,
  Search,
  Eye,
  Edit,
  Download,
  Trash2,
  FileText,
  Calendar,
  Building,
  User,
  RefreshCw,
  AlertCircle,
  Loader2,
  Building2,
  Users,
  Plus,
  Clock,
} from 'lucide-react';
import { ViewToggle } from '@/components/ui/ViewToggle';
import { PaginationControls } from '@/components/ui/PaginationControls';
import { ObservationReportsViews } from './ObservationReportsViews';
import { useViewPreferences } from '@/contexts/ViewPreferencesContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ContentLoader } from '@/components/ContentLoader';
import { toast } from 'sonner';
import { useObservationReports, ObservationReport } from '@/contexts/ObservationReportsContext';
import { DatabaseSetupAlert } from './DatabaseSetupAlert';
import { cn } from '@/lib/utils';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface PastReportsViewProps {
  onBack: () => void;
  onViewReport?: (reportId: string) => void;
}

interface StatCardProps {
  title: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  iconColor: string;
  bgColor: string;
  additionalText?: string;
}

const StatCard = ({ title, value, icon: Icon, iconColor, bgColor, additionalText }: StatCardProps) => (
  <Card className="shadow-sm">
    <CardContent className="p-6">
      <div className="flex items-center justify-between">
      <div>
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
        <p className="text-2xl font-bold">{value}</p>
          {additionalText && (
            <p className="text-xs text-muted-foreground mt-1">{additionalText}</p>
          )}
        </div>
        <div className={cn("p-3 rounded-full", bgColor)}>
          <Icon className={cn("w-5 h-5", iconColor)} />
      </div>
      </div>
    </CardContent>
  </Card>
);

interface ReportCardProps {
  report: ObservationReport;
  onView: () => void;
  onDownload: () => void;
  onDelete: () => void;
  isDeleting?: boolean;
  isDownloading?: boolean;
}

const ReportCard = ({ 
  report, 
  onView, 
  onDownload, 
  onDelete, 
  isDeleting = false,
  isDownloading = false
}: ReportCardProps) => {
  const statusColor = report.status === 'completed' ? 'bg-[#8DC63F]/20 text-[#8DC63F] dark:bg-[#8DC63F]/20 dark:text-[#8DC63F]' : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
  const roleColor = {
    'principal': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    'ece': 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
    'school-officer': 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
    'project-manager': 'bg-[#8DC63F]/20 text-[#8DC63F] dark:bg-[#8DC63F]/20 dark:text-[#8DC63F]'
  }[report.observerRole] || 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';

  return (
    <Card className="bg-gradient-to-br from-card to-primary/5 dark:bg-card hover:shadow-lg hover:shadow-primary/10 transition-all duration-300 hover:-translate-y-0.5 border border-border/50">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-start gap-4 mb-4">
              <Avatar className="w-12 h-12 ring-2 ring-primary/10">
                <AvatarFallback className="bg-gradient-to-br from-primary/10 to-primary/20 text-primary font-semibold text-lg">
                  {report.observerName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                </AvatarFallback>
              </Avatar>
              
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-3">
                  <h3 className="font-bold text-lg text-foreground">{report.observerName}</h3>
                  <Badge className={cn("text-xs font-semibold px-3 py-1 rounded-full", roleColor)}>
                    {report.observerRole.replace('-', ' ').toUpperCase()}
                  </Badge>
                  <Badge className={cn("text-xs font-semibold px-3 py-1 rounded-full", statusColor)}>
                    {report.status.toUpperCase()}
                  </Badge>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Building className="w-4 h-4 text-primary" />
                    <span><strong>School:</strong> {report.schoolName}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-primary" />
                    <span><strong>Teacher:</strong> {report.teacherName}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-primary" />
                    <span><strong>Date:</strong> {new Date(report.observationDate).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-primary" />
                    <span>{report.startTime} - {report.endTime}</span>
                  </div>
                </div>
                
                <div className="mt-4 flex flex-wrap gap-4 text-sm text-muted-foreground">
                  <span><strong>Lesson:</strong> {report.lessonCode}</span>
                  <span><strong>Project:</strong> {report.projectName}</span>
                  {report.overallScore && (
                    <span className="font-semibold text-primary"><strong>Score:</strong> {report.overallScore}%</span>
                  )}
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-4 ml-6">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={onView}
              className="h-10 w-10 p-0 rounded-xl border-2 hover:border-[#8DC63F]/40 hover:bg-[#8DC63F]/5 transition-all duration-300"
            >
              <Eye className="w-4 h-4" />
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={onDownload} 
              disabled={isDownloading}
              className="h-10 w-10 p-0 rounded-xl border-2 hover:border-[#8DC63F]/40 hover:bg-[#8DC63F]/5 transition-all duration-300"
            >
              {isDownloading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={onDelete}
              disabled={isDeleting}
              className="h-10 w-10 p-0 rounded-xl hover:bg-red-50 text-red-600 hover:text-red-700 transition-all duration-300 dark:hover:bg-red-900/20 dark:text-red-400"
            >
              {isDeleting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4" />
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export const PastReportsView = ({ onBack, onViewReport }: PastReportsViewProps) => {
  const { reports, deleteReport, isLoading, error, getStatistics } = useObservationReports();
  const { preferences, setObservationReportsView } = useViewPreferences();
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [schoolFilter, setSchoolFilter] = useState('all');
  const [sortBy, setSortBy] = useState('recent');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  // Get default items per page based on current view
  const getDefaultItemsPerPage = (view: string) => {
    switch (view) {
      case 'card': return 8;
      case 'tile': return 18;
      case 'list': return 8;
      default: return 8;
    }
  };
  
  const [itemsPerPage, setItemsPerPage] = useState(getDefaultItemsPerPage(preferences.observationReportsView));
  const [statistics, setStatistics] = useState({
    totalReports: 0,
    thisWeekReports: 0,
    averageScore: 0,
    uniqueSchools: 0,
    topRole: 'N/A',
    reportsByStatus: { completed: 0, draft: 0 },
  });
  const [statsLoading, setStatsLoading] = useState(true);

  // Generate HTML content for PDF
  const generateReportHTML = (report: ObservationReport): string => {
    const formData = report.formData || {};
    
    // Calculate performance categories from form data
    const categories = {
      instruction: {
        score: formData.clearInstructions ? (parseInt(formData.clearInstructions) / 5) * 100 : 60,
        weight: 25,
      },
      engagement: {
        score: formData.studentEngagement ? (parseInt(formData.studentEngagement) / 5) * 100 : 70,
        weight: 30,
      },
      environment: {
        score: formData.classroomDisplays ? (parseInt(formData.classroomDisplays) / 5) * 100 : 65,
        weight: 20,
      },
      resources: {
        score: 70,
        weight: 15,
      },
      fidelity: {
        score: formData.fidelityScore ? (parseInt(formData.fidelityScore) / 5) * 100 : 80,
        weight: 10,
      }
    };

    const strengths = formData.strengths || [
      "Professional conduct observed during lesson delivery",
      "Good classroom management and organization",
      "Appropriate use of available learning materials"
    ];

    const improvements = formData.improvements || [
      "Consider implementing more interactive teaching methods",
      "Increase student participation opportunities",
      "Enhance assessment and feedback mechanisms"
    ];

    return `
      <div style="font-family: Arial, sans-serif; color: #333; line-height: 1.6;">
        <!-- Header -->
        <div style="text-align: center; margin-bottom: 30px; border-bottom: 3px solid #8DC63F; padding-bottom: 20px;">
          <h1 style="color: #8DC63F; margin: 0; font-size: 28px;">Observation Report</h1>
          <p style="color: #666; margin: 5px 0;">Performance Assessment and Analysis</p>
        </div>

        <!-- Observer Information -->
        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
          <h2 style="color: #8DC63F; margin-top: 0;">Observation Details</h2>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
            <div><strong>Observer:</strong> ${report.observerName}</div>
            <div><strong>Role:</strong> ${report.observerRole.replace('-', ' ').toUpperCase()}</div>
            <div><strong>School:</strong> ${report.schoolName}</div>
            <div><strong>Teacher:</strong> ${report.teacherName}</div>
            <div><strong>Date:</strong> ${new Date(report.observationDate).toLocaleDateString()}</div>
            <div><strong>Time:</strong> ${report.startTime} - ${report.endTime}</div>
            <div><strong>Lesson Code:</strong> ${report.lessonCode}</div>
            <div><strong>Project:</strong> ${report.projectName}</div>
          </div>
        </div>

        <!-- Overall Score -->
        <div style="text-align: center; margin: 30px 0; padding: 20px; background: linear-gradient(135deg, #8DC63F20, #8DC63F10); border-radius: 12px;">
          <h2 style="color: #8DC63F; margin: 0;">Overall Score</h2>
          <div style="font-size: 48px; font-weight: bold; color: #8DC63F; margin: 10px 0;">${report.overallScore}%</div>
          <div style="color: #666;">
            Grade: ${report.overallScore >= 80 ? 'A' : report.overallScore >= 70 ? 'B+' : report.overallScore >= 60 ? 'B' : 'C'} | 
            Status: ${report.status.toUpperCase()}
          </div>
        </div>

        <!-- Performance Categories -->
        <div style="margin: 30px 0;">
          <h2 style="color: #22C55E; margin-bottom: 20px;">Performance Metrics</h2>
          ${Object.entries(categories).map(([key, category]: [string, any]) => `
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 15px; border: 1px solid #e5e7eb; border-radius: 8px; margin-bottom: 10px;">
              <div>
                <div style="font-weight: bold; text-transform: capitalize;">${key}</div>
                <div style="color: #666; font-size: 14px;">Weight: ${category.weight}%</div>
              </div>
              <div style="text-align: right;">
                <div style="font-size: 24px; font-weight: bold; color: #22C55E;">${category.score.toFixed(1)}%</div>
                <div style="color: #666; font-size: 12px;">Performance Score</div>
              </div>
            </div>
          `).join('')}
        </div>

        <!-- Key Strengths -->
        <div style="margin: 30px 0;">
          <h2 style="color: #22C55E; margin-bottom: 15px;">Key Strengths</h2>
          <ul style="padding-left: 20px;">
            ${strengths.map((strength: string) => `<li style="margin-bottom: 8px;">${strength}</li>`).join('')}
          </ul>
        </div>

        <!-- Improvement Opportunities -->
        <div style="margin: 30px 0;">
          <h2 style="color: #22C55E; margin-bottom: 15px;">Improvement Opportunities</h2>
          <ul style="padding-left: 20px;">
            ${improvements.map((improvement: string) => `<li style="margin-bottom: 8px;">${improvement}</li>`).join('')}
          </ul>
        </div>

        ${formData.showTealObservations ? `
          <!-- TEAL Assessment -->
          <div style="margin: 30px 0; page-break-inside: avoid;">
            <h2 style="color: #22C55E; margin-bottom: 15px;">TEAL Implementation Analysis</h2>
            <div style="background: #f8f9fa; padding: 20px; border-radius: 8px;">
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                <div><strong>Video Content:</strong> ${formData.tealVideoContent === 'yes' ? '✓ Utilized' : '✗ Not Used'}</div>
                <div><strong>Guiding Question:</strong> ${formData.tealGuidingQuestion === 'yes' ? '✓ On Board' : '✗ Missing'}</div>
                <div><strong>Think-Pair-Share:</strong> ${formData.tealThinkPairShare === 'yes' ? '✓ Conducted' : '✗ Not Done'}</div>
                <div><strong>Collaborative Learning:</strong> ${formData.tealCollaborative === 'yes' ? '✓ Conducted' : '✗ Not Done'}</div>
              </div>
              <div style="margin-top: 15px;">
                <strong>Device Engagement Score:</strong> ${formData.tealDeviceEngagement ? parseFloat(formData.tealDeviceEngagement).toFixed(1) : '3.0'}/5.0
              </div>
            </div>
          </div>
        ` : ''}

        <!-- Footer -->
        <div style="margin-top: 40px; padding-top: 20px; border-top: 2px solid #e5e7eb; text-align: center; color: #666; font-size: 12px;">
          <p>Generated on ${new Date().toLocaleString()}</p>
          <p>Observation Report - Confidential</p>
        </div>
      </div>
    `;
  };

  // Load statistics on component mount
  useEffect(() => {
    const loadStatistics = async () => {
      setStatsLoading(true);
      try {
        const stats = await getStatistics();
        setStatistics(stats);
      } catch (err) {
        console.error('Failed to load statistics:', err);
      } finally {
        setStatsLoading(false);
      }
    };

    if (!isLoading) {
      loadStatistics();
    }
  }, [isLoading, getStatistics]);

  // Filter and sort reports
  const filteredAndSortedReports = useMemo(() => {
    let filtered = reports.filter(report => {
      const matchesSearch = 
        report.observerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        report.schoolName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        report.teacherName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        report.lessonCode.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesRole = roleFilter === 'all' || report.observerRole === roleFilter;
      const matchesSchool = schoolFilter === 'all' || report.schoolName === schoolFilter;
      
      return matchesSearch && matchesRole && matchesSchool;
    });

    // Sort reports
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'recent':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case 'oldest':
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case 'school':
          return a.schoolName.localeCompare(b.schoolName);
        case 'observer':
          return a.observerName.localeCompare(b.observerName);
        case 'score-high':
          return (b.overallScore || 0) - (a.overallScore || 0);
        case 'score-low':
          return (a.overallScore || 0) - (b.overallScore || 0);
    default:
          return 0;
      }
    });

    return filtered;
  }, [reports, searchQuery, roleFilter, schoolFilter, sortBy]);

  // Pagination logic
  const totalPages = Math.ceil(filteredAndSortedReports.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedReports = filteredAndSortedReports.slice(startIndex, endIndex);

  const handleItemsPerPageChange = (newItemsPerPage: number) => {
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(1); // Reset to first page when changing items per page
  };

  // Update items per page when view changes
  useEffect(() => {
    const newItemsPerPage = getDefaultItemsPerPage(preferences.observationReportsView);
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(1); // Reset to first page when view changes
  }, [preferences.observationReportsView]);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, roleFilter, schoolFilter, sortBy]);

  // Get unique roles and schools for filters
  const uniqueRoles = Array.from(new Set(reports.map(r => r.observerRole)));
  const uniqueSchools = Array.from(new Set(reports.map(r => r.schoolName)));

  const handleViewReport = (report: ObservationReport) => {
    if (onViewReport) {
      onViewReport(report.id);
    } else {
      toast.info('Report viewing functionality will be implemented');
    }
  };

  const handleDownloadReport = async (report: ObservationReport) => {
    if (downloadingId) return; // Prevent multiple downloads

    setDownloadingId(report.id);
    toast.info('Generating PDF... This may take a moment');

    try {
      // Create a temporary container for the report content
      const reportElement = document.createElement('div');
      reportElement.style.width = '210mm'; // A4 width
      reportElement.style.minHeight = '297mm'; // A4 height
      reportElement.style.padding = '20px';
      reportElement.style.backgroundColor = 'white';
      reportElement.style.fontFamily = 'Arial, sans-serif';
      reportElement.style.color = 'black';
      reportElement.style.position = 'fixed';
      reportElement.style.top = '-9999px';
      reportElement.style.left = '-9999px';

      // Generate the report content HTML
      const reportHTML = generateReportHTML(report);
      reportElement.innerHTML = reportHTML;

      // Temporarily add to DOM
      document.body.appendChild(reportElement);

      // Generate canvas from HTML
      const canvas = await html2canvas(reportElement, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        width: reportElement.scrollWidth,
        height: reportElement.scrollHeight,
      });

      // Remove from DOM
      document.body.removeChild(reportElement);

      // Create PDF
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      
      const imgWidth = 210; // A4 width in mm
      const pageHeight = 295; // A4 height in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      // Add first page
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      // Add additional pages if needed
      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      // Generate filename
      const observerName = report.observerName.replace(/[^a-zA-Z0-9]/g, '_');
      const schoolName = report.schoolName.replace(/[^a-zA-Z0-9]/g, '_');
      const date = new Date(report.observationDate).toISOString().split('T')[0];
      const filename = `Observation_Report_${observerName}_${schoolName}_${date}.pdf`;

      // Save the PDF
      pdf.save(filename);
      toast.success('PDF downloaded successfully!');

    } catch (error) {
      console.error('Error exporting PDF:', error);
      toast.error('Failed to generate PDF. Please try again.');
    } finally {
      setDownloadingId(null);
    }
  };

  const handleDeleteReport = async (report: ObservationReport) => {
    if (deletingId) return; // Prevent multiple deletions

    const confirmed = window.confirm(
      `Are you sure you want to delete the observation report for ${report.teacherName} at ${report.schoolName}?`
    );

    if (!confirmed) return;

    setDeletingId(report.id);
    try {
      await deleteReport(report.id);
      toast.success('Report deleted successfully');
      
      // Refresh statistics after deletion
      try {
        const newStats = await getStatistics();
        setStatistics(newStats);
      } catch (err) {
        console.error('Failed to refresh statistics:', err);
      }
    } catch (error: any) {
      console.error('Error deleting report:', error);
      toast.error(error.message || 'Failed to delete report');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-8 mx-auto">
      {/* Premium Header Section */}
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-primary/5 rounded-3xl"></div>
        <div className="relative p-8 rounded-3xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 flex-1 max-w-2xl">
              <div className="w-12 h-12 bg-gradient-to-br from-primary/10 to-primary/20 rounded-2xl flex items-center justify-center">
                <FileText className="w-6 h-6 text-primary" />
              </div>
              <div className="flex-1">
                <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-primary via-primary to-primary/80 bg-clip-text text-transparent" style={{ backgroundClip: 'text', WebkitBackgroundClip: 'text' }}>
                  Past Observation Reports
                </h1>
                <p className="text-lg text-muted-foreground font-light pr-8">
                  Review and analyze previously submitted observation reports with comprehensive analytics
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2 flex-shrink-0 ml-8">
              <Button 
                variant="outline" 
                onClick={onBack}
                className="h-10 px-6 rounded-xl bg-background border border-input shadow-sm hover:shadow-lg hover:shadow-primary/10 transition-all duration-300 hover:-translate-y-0.5 hover:bg-accent/5 hover:text-foreground dark:hover:bg-gray-800"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Reporting
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="text-center py-12">
          <ContentLoader />
          <p className="text-muted-foreground mt-4">Loading your reports...</p>
        </div>
      )}

      {/* Error State */}
      {error && !isLoading && (
        <DatabaseSetupAlert error={error} />
      )}

      {/* Only show content when not loading */}
      {!isLoading && (
        <>
          {/* Statistics Cards Section */}
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="bg-gradient-to-br from-card to-[#8DC63F]/5 dark:bg-card">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Reports</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {statsLoading ? '...' : statistics.totalReports}
                </div>
                <p className="text-xs text-muted-foreground">
                  All submitted reports
                </p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-card to-[#8DC63F]/5 dark:bg-card">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">This Week</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {statsLoading ? '...' : statistics.thisWeekReports}
      </div>
                <p className="text-xs text-muted-foreground">
                  Reports submitted this week
                </p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-card to-[#8DC63F]/5 dark:bg-card">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Schools Visited</CardTitle>
                <Building2 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {statsLoading ? '...' : statistics.uniqueSchools}
      </div>
                <p className="text-xs text-muted-foreground">
                  Unique schools observed
                </p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-card to-[#8DC63F]/5 dark:bg-card">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Top Role</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {statsLoading ? '...' : statistics.topRole}
                </div>
                <p className="text-xs text-muted-foreground">
                  Most common observer role
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Filters and Search Section */}
          <Card className="bg-gradient-to-br from-card to-primary/5 dark:bg-card">
            <CardContent className="p-6">
              <div className="flex flex-col lg:flex-row gap-6 items-start lg:items-center justify-between">
                <div className="flex flex-col sm:flex-row gap-4 flex-1">
                  <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      placeholder="Search reports by observer, school, or teacher..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 h-11 rounded-xl border-2 focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all duration-300"
                    />
                  </div>
                  
                  <Select value={roleFilter} onValueChange={setRoleFilter}>
                    <SelectTrigger className="w-[180px] h-11 rounded-xl border-2 focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all duration-300">
                      <SelectValue placeholder="Filter by role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Roles</SelectItem>
                      {uniqueRoles.map(role => (
                        <SelectItem key={role} value={role}>
                          {role.replace('-', ' ').toUpperCase()}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select value={schoolFilter} onValueChange={setSchoolFilter}>
                    <SelectTrigger className="w-[200px] h-11 rounded-xl border-2 focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all duration-300">
                      <SelectValue placeholder="Filter by school" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Schools</SelectItem>
                      {uniqueSchools.map(school => (
                        <SelectItem key={school} value={school}>
                          {school}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-[160px] h-11 rounded-xl border-2 focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all duration-300">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="recent">Most Recent</SelectItem>
                    <SelectItem value="oldest">Oldest First</SelectItem>
                    <SelectItem value="school">School Name</SelectItem>
                    <SelectItem value="observer">Observer Name</SelectItem>
                    <SelectItem value="score-high">Highest Score</SelectItem>
                    <SelectItem value="score-low">Lowest Score</SelectItem>
                  </SelectContent>
                </Select>
              </div>

            </CardContent>
          </Card>

          {/* View Toggle Section */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-semibold text-foreground">Reports</h3>
              <span className="text-sm text-muted-foreground">
                ({filteredAndSortedReports.length} {filteredAndSortedReports.length === 1 ? 'report' : 'reports'})
              </span>
            </div>
            <ViewToggle
              currentView={preferences.observationReportsView}
              onViewChange={setObservationReportsView}
              availableViews={['card', 'tile', 'list']}
            />
          </div>

          {/* Reports List */}
          {paginatedReports.length === 0 ? (
            <Card className="bg-gradient-to-br from-card to-primary/5 dark:bg-card border-2 border-dashed border-primary/20">
              <CardContent className="text-center py-16">
                <div className="w-16 h-16 bg-gradient-to-br from-primary/10 to-primary/20 rounded-3xl flex items-center justify-center mx-auto mb-6">
                  <FileText className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-xl font-bold mb-3">
                  {reports.length === 0 ? 'No Reports Found' : 'No Matching Reports'}
                </h3>
                <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                  {reports.length === 0 
                    ? 'You haven\'t submitted any observation reports yet. Start by creating your first report.' 
                    : 'Try adjusting your search criteria or filters to find the reports you\'re looking for.'
                  }
                </p>
                {reports.length === 0 && (
                  <Button 
                    onClick={onBack} 
                    className="bg-primary hover:bg-primary/90 text-primary-foreground h-11 px-8 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-0.5"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Create Your First Report
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <>
              <ObservationReportsViews
                reports={paginatedReports}
                viewMode={preferences.observationReportsView}
                onView={handleViewReport}
                onDownload={handleDownloadReport}
                onDelete={handleDeleteReport}
                isDeleting={(reportId) => deletingId === reportId}
                isDownloading={(reportId) => downloadingId === reportId}
              />
              
              {/* Pagination */}
              {totalPages > 1 && (
                <PaginationControls
                  currentPage={currentPage}
                  totalPages={totalPages}
                  totalItems={filteredAndSortedReports.length}
                  itemsPerPage={itemsPerPage}
                  onPageChange={setCurrentPage}
                  onItemsPerPageChange={handleItemsPerPageChange}
                  itemsPerPageOptions={preferences.observationReportsView === 'tile' ? [9, 18, 27, 36, 45] : [4, 8, 12, 16, 20]}
                  disabled={isLoading}
                  className="mt-6"
                />
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}; 