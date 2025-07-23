import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from '@/hooks/useAuth';
import ObservationReportsService, { 
  ObservationReport as DbObservationReport,
  ObservationReportInsert,
  ObservationReportUpdate
} from '@/services/observationReportsService';

// Interface for compatibility with existing components
export interface ObservationReport {
  id: string;
  observerName: string;
  observerRole: string;
  schoolName: string;
  teacherName: string;
  observationDate: string;
  startTime: string;
  endTime: string;
  lessonCode: string;
  projectName: string;
  createdAt: string;
  overallScore: number;
  status: 'completed' | 'draft';
  formData: any; // Complete form data for detailed report view
}

interface ObservationReportsContextType {
  reports: ObservationReport[];
  addReport: (report: ObservationReport) => Promise<void>;
  deleteReport: (reportId: string) => Promise<void>;
  getReport: (reportId: string) => ObservationReport | undefined;
  updateReport: (reportId: string, updates: Partial<ObservationReport>) => Promise<void>;
  isLoading: boolean;
  error: string | null;
  refreshReports: () => Promise<void>;
  getStatistics: () => Promise<{
    totalReports: number;
    thisWeekReports: number;
    averageScore: number;
    uniqueSchools: number;
    topRole: string;
    reportsByStatus: { completed: number; draft: number };
  }>;
}

const ObservationReportsContext = createContext<ObservationReportsContextType | undefined>(undefined);

export const useObservationReports = () => {
  const context = useContext(ObservationReportsContext);
  if (!context) {
    throw new Error('useObservationReports must be used within an ObservationReportsProvider');
  }
  return context;
};

interface ObservationReportsProviderProps {
  children: ReactNode;
}

export const ObservationReportsProvider: React.FC<ObservationReportsProviderProps> = ({ children }) => {
  const { user } = useAuth();
  const [reports, setReports] = useState<ObservationReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Transform database record to component interface
  const transformDbRecord = (dbRecord: DbObservationReport): ObservationReport => ({
    id: dbRecord.id,
    observerName: dbRecord.observer_name,
    observerRole: dbRecord.observer_role,
    schoolName: dbRecord.school_name,
    teacherName: dbRecord.teacher_name,
    observationDate: dbRecord.observation_date,
    startTime: dbRecord.start_time,
    endTime: dbRecord.end_time,
    lessonCode: dbRecord.lesson_code,
    projectName: dbRecord.project_name,
    createdAt: dbRecord.created_at,
    overallScore: dbRecord.overall_score,
    status: dbRecord.status,
    formData: dbRecord.form_data,
  });

  // Transform component interface to database record
  const transformToDbRecord = (report: ObservationReport): ObservationReportInsert => ({
    observer_name: report.observerName,
    observer_role: report.observerRole,
    school_name: report.schoolName,
    teacher_name: report.teacherName,
    observation_date: report.observationDate,
    start_time: report.startTime,
    end_time: report.endTime,
    lesson_code: report.lessonCode,
    project_name: report.projectName,
    overall_score: report.overallScore,
    status: report.status,
    form_data: report.formData,
    submitted_by: user?.id || '',
    show_teal_observations: report.formData?.showTealObservations || false,
  });

  // Load reports from database
  const loadReports = async () => {
    if (!user?.id) {
      setReports([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    
    try {
      const dbReports = await ObservationReportsService.getReports(user.id);
      const transformedReports = dbReports.map(transformDbRecord);
      setReports(transformedReports);
    } catch (err) {
      let errorMessage = err instanceof Error ? err.message : 'Failed to load reports';
      
      // Handle specific database table not found error
      if (errorMessage.includes('relation "public.observation_reports" does not exist')) {
        errorMessage = 'Database table not set up yet. Please run the database migration to create the observation_reports table.';
      }
      
      setError(errorMessage);
      console.error('Error loading reports:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Load reports when user changes or component mounts
  useEffect(() => {
    loadReports();
  }, [user?.id]);

  const addReport = async (report: ObservationReport): Promise<void> => {
    if (!user?.id) {
      throw new Error('User not authenticated');
    }

    try {
      const dbRecord = transformToDbRecord(report);
      const createdReport = await ObservationReportsService.createReport(dbRecord);
      const transformedReport = transformDbRecord(createdReport);
      
      // Update local state
      setReports(prev => [transformedReport, ...prev]);
    } catch (err) {
      let errorMessage = err instanceof Error ? err.message : 'Failed to create report';
      
      // Handle specific database table not found error
      if (errorMessage.includes('relation "public.observation_reports" does not exist')) {
        errorMessage = 'Database table not set up yet. Please run the database migration to create the observation_reports table.';
      }
      
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  const deleteReport = async (reportId: string): Promise<void> => {
    if (!user?.id) {
      throw new Error('User not authenticated');
    }

    try {
      await ObservationReportsService.deleteReport(reportId, user.id);
      
      // Update local state
      setReports(prev => prev.filter(report => report.id !== reportId));
    } catch (err) {
      let errorMessage = err instanceof Error ? err.message : 'Failed to delete report';
      
      // Handle specific database table not found error
      if (errorMessage.includes('relation "public.observation_reports" does not exist')) {
        errorMessage = 'Database table not set up yet. Please run the database migration to create the observation_reports table.';
      }
      
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  const getReport = (reportId: string): ObservationReport | undefined => {
    return reports.find(report => report.id === reportId);
  };

  const updateReport = async (reportId: string, updates: Partial<ObservationReport>): Promise<void> => {
    if (!user?.id) {
      throw new Error('User not authenticated');
    }

    try {
      // Transform updates to database format
      const dbUpdates: ObservationReportUpdate = {
        updated_at: new Date().toISOString(),
      };

      if (updates.observerName) dbUpdates.observer_name = updates.observerName;
      if (updates.observerRole) dbUpdates.observer_role = updates.observerRole;
      if (updates.schoolName) dbUpdates.school_name = updates.schoolName;
      if (updates.teacherName) dbUpdates.teacher_name = updates.teacherName;
      if (updates.observationDate) dbUpdates.observation_date = updates.observationDate;
      if (updates.startTime) dbUpdates.start_time = updates.startTime;
      if (updates.endTime) dbUpdates.end_time = updates.endTime;
      if (updates.lessonCode) dbUpdates.lesson_code = updates.lessonCode;
      if (updates.projectName) dbUpdates.project_name = updates.projectName;
      if (updates.overallScore !== undefined) dbUpdates.overall_score = updates.overallScore;
      if (updates.status) dbUpdates.status = updates.status;
      if (updates.formData) {
        dbUpdates.form_data = updates.formData;
        dbUpdates.show_teal_observations = updates.formData.showTealObservations || false;
      }

      const updatedReport = await ObservationReportsService.updateReport(reportId, dbUpdates, user.id);
      const transformedReport = transformDbRecord(updatedReport);

      // Update local state
      setReports(prev => 
        prev.map(report => 
          report.id === reportId 
            ? { ...report, ...transformedReport }
            : report
        )
      );
    } catch (err) {
      let errorMessage = err instanceof Error ? err.message : 'Failed to update report';
      
      // Handle specific database table not found error
      if (errorMessage.includes('relation "public.observation_reports" does not exist')) {
        errorMessage = 'Database table not set up yet. Please run the database migration to create the observation_reports table.';
      }
      
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  const refreshReports = async (): Promise<void> => {
    await loadReports();
  };

  const getStatistics = async () => {
    if (!user?.id) {
      throw new Error('User not authenticated');
    }

    try {
      return await ObservationReportsService.getReportStatistics(user.id);
    } catch (err) {
      let errorMessage = err instanceof Error ? err.message : 'Failed to get statistics';
      
      // Handle specific database table not found error
      if (errorMessage.includes('relation "public.observation_reports" does not exist')) {
        errorMessage = 'Database table not set up yet. Please run the database migration to create the observation_reports table.';
      }
      
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  const value: ObservationReportsContextType = {
    reports,
    addReport,
    deleteReport,
    getReport,
    updateReport,
    isLoading,
    error,
    refreshReports,
    getStatistics,
  };

  return (
    <ObservationReportsContext.Provider value={value}>
      {children}
    </ObservationReportsContext.Provider>
  );
}; 