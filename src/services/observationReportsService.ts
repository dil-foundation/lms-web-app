import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface ObservationReport {
  id: string;
  observer_name: string;
  observer_role: string;
  school_name: string;
  teacher_name: string;
  observation_date: string;
  start_time: string;
  end_time: string;
  lesson_code: string;
  project_name: string;
  created_at: string;
  updated_at?: string;
  overall_score: number;
  status: 'completed' | 'draft';
  form_data: any; // Complete form data as JSON
  submitted_by: string; // User ID who submitted the report
  show_teal_observations?: boolean;
  // Additional fields for rich reporting
  observer_id?: string;
  school_id?: string;
  teacher_id?: string;
}

export interface ObservationReportInsert {
  observer_name: string;
  observer_role: string;
  school_name: string;
  teacher_name: string;
  observation_date: string;
  start_time: string;
  end_time: string;
  lesson_code: string;
  project_name: string;
  overall_score: number;
  status: 'completed' | 'draft';
  form_data: any;
  submitted_by: string;
  show_teal_observations?: boolean;
}

export interface ObservationReportUpdate {
  observer_name?: string;
  observer_role?: string;
  school_name?: string;
  teacher_name?: string;
  observation_date?: string;
  start_time?: string;
  end_time?: string;
  lesson_code?: string;
  project_name?: string;
  overall_score?: number;
  status?: 'completed' | 'draft';
  form_data?: any;
  show_teal_observations?: boolean;
  updated_at: string;
}

class ObservationReportsService {
  private static readonly TABLE_NAME = 'observation_reports';

  /**
   * Create a new observation report in the database
   */
  static async createReport(reportData: ObservationReportInsert): Promise<ObservationReport> {
    try {
      const { data, error } = await supabase
        .from(this.TABLE_NAME)
        .insert({
          ...reportData,
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) {
        console.error('Database error creating report:', error);
        throw new Error(`Failed to create report: ${error.message}`);
      }

      if (!data) {
        throw new Error('No data returned from report creation');
      }

      return this.transformDatabaseRecord(data);
    } catch (error: any) {
      console.error('Error creating observation report:', error);
      throw new Error(error.message || 'Failed to create observation report');
    }
  }

  /**
   * Get all observation reports for the current user
   */
  static async getReports(userId: string, limit = 100, offset = 0): Promise<ObservationReport[]> {
    try {
      const { data, error } = await supabase
        .from(this.TABLE_NAME)
        .select('*')
        .eq('submitted_by', userId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        console.error('Database error fetching reports:', error);
        throw new Error(`Failed to fetch reports: ${error.message}`);
      }

      return (data || []).map(this.transformDatabaseRecord);
    } catch (error: any) {
      console.error('Error fetching observation reports:', error);
      throw new Error(error.message || 'Failed to fetch observation reports');
    }
  }

  /**
   * Get a specific observation report by ID
   */
  static async getReportById(reportId: string, userId: string): Promise<ObservationReport | null> {
    try {
      const { data, error } = await supabase
        .from(this.TABLE_NAME)
        .select('*')
        .eq('id', reportId)
        .eq('submitted_by', userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // Record not found
          return null;
        }
        console.error('Database error fetching report:', error);
        throw new Error(`Failed to fetch report: ${error.message}`);
      }

      return data ? this.transformDatabaseRecord(data) : null;
    } catch (error: any) {
      console.error('Error fetching observation report by ID:', error);
      throw new Error(error.message || 'Failed to fetch observation report');
    }
  }

  /**
   * Update an existing observation report
   */
  static async updateReport(
    reportId: string, 
    updates: ObservationReportUpdate, 
    userId: string
  ): Promise<ObservationReport> {
    try {
      const { data, error } = await supabase
        .from(this.TABLE_NAME)
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', reportId)
        .eq('submitted_by', userId)
        .select()
        .single();

      if (error) {
        console.error('Database error updating report:', error);
        throw new Error(`Failed to update report: ${error.message}`);
      }

      if (!data) {
        throw new Error('Report not found or no permission to update');
      }

      return this.transformDatabaseRecord(data);
    } catch (error: any) {
      console.error('Error updating observation report:', error);
      throw new Error(error.message || 'Failed to update observation report');
    }
  }

  /**
   * Delete an observation report
   */
  static async deleteReport(reportId: string, userId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from(this.TABLE_NAME)
        .delete()
        .eq('id', reportId)
        .eq('submitted_by', userId);

      if (error) {
        console.error('Database error deleting report:', error);
        throw new Error(`Failed to delete report: ${error.message}`);
      }

      return true;
    } catch (error: any) {
      console.error('Error deleting observation report:', error);
      throw new Error(error.message || 'Failed to delete observation report');
    }
  }

  /**
   * Get reports with filters and pagination
   */
  static async getReportsWithFilters(
    userId: string,
    filters: {
      searchQuery?: string;
      roleFilter?: string;
      schoolFilter?: string;
      dateFrom?: string;
      dateTo?: string;
      status?: 'completed' | 'draft';
    } = {},
    sortBy: string = 'recent',
    limit = 50,
    offset = 0
  ): Promise<{ reports: ObservationReport[]; total: number }> {
    try {
      let query = supabase
        .from(this.TABLE_NAME)
        .select('*', { count: 'exact' })
        .eq('submitted_by', userId);

      // Apply filters
      if (filters.searchQuery) {
        query = query.or(
          `observer_name.ilike.%${filters.searchQuery}%,` +
          `school_name.ilike.%${filters.searchQuery}%,` +
          `teacher_name.ilike.%${filters.searchQuery}%,` +
          `lesson_code.ilike.%${filters.searchQuery}%`
        );
      }

      if (filters.roleFilter && filters.roleFilter !== 'all') {
        query = query.eq('observer_role', filters.roleFilter);
      }

      if (filters.schoolFilter && filters.schoolFilter !== 'all') {
        query = query.eq('school_name', filters.schoolFilter);
      }

      if (filters.status) {
        query = query.eq('status', filters.status);
      }

      if (filters.dateFrom) {
        query = query.gte('observation_date', filters.dateFrom);
      }

      if (filters.dateTo) {
        query = query.lte('observation_date', filters.dateTo);
      }

      // Apply sorting
      switch (sortBy) {
        case 'recent':
          query = query.order('created_at', { ascending: false });
          break;
        case 'oldest':
          query = query.order('created_at', { ascending: true });
          break;
        case 'school':
          query = query.order('school_name', { ascending: true });
          break;
        case 'observer':
          query = query.order('observer_name', { ascending: true });
          break;
        case 'score-high':
          query = query.order('overall_score', { ascending: false });
          break;
        case 'score-low':
          query = query.order('overall_score', { ascending: true });
          break;
        default:
          query = query.order('created_at', { ascending: false });
      }

      // Apply pagination
      query = query.range(offset, offset + limit - 1);

      const { data, error, count } = await query;

      if (error) {
        console.error('Database error fetching filtered reports:', error);
        throw new Error(`Failed to fetch reports: ${error.message}`);
      }

      return {
        reports: (data || []).map(this.transformDatabaseRecord),
        total: count || 0,
      };
    } catch (error: any) {
      console.error('Error fetching filtered observation reports:', error);
      throw new Error(error.message || 'Failed to fetch observation reports');
    }
  }

  /**
   * Get summary statistics for reports
   */
  static async getReportStatistics(userId: string): Promise<{
    totalReports: number;
    thisWeekReports: number;
    averageScore: number;
    uniqueSchools: number;
    topRole: string;
    reportsByStatus: { completed: number; draft: number };
  }> {
    try {
      // Get all reports for the user
      const { data: reports, error } = await supabase
        .from(this.TABLE_NAME)
        .select('*')
        .eq('submitted_by', userId);

      if (error) {
        console.error('Database error fetching report statistics:', error);
        throw new Error(`Failed to fetch statistics: ${error.message}`);
      }

      const reportsData = reports || [];
      
      // Calculate statistics
      const totalReports = reportsData.length;
      
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      const thisWeekReports = reportsData.filter(r => 
        new Date(r.created_at) >= weekAgo
      ).length;

      const averageScore = totalReports > 0 
        ? reportsData.reduce((sum, r) => sum + (r.overall_score || 0), 0) / totalReports
        : 0;

      const uniqueSchools = new Set(reportsData.map(r => r.school_name)).size;

      let topRole = 'N/A';
      if (totalReports > 0) {
        const roleCounts = reportsData.reduce((acc, report) => {
          acc[report.observer_role] = (acc[report.observer_role] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);
        
        const roleEntries = Object.entries(roleCounts);
        if (roleEntries.length > 0) {
          topRole = roleEntries.reduce((a, b) => 
            roleCounts[a[0]] > roleCounts[b[0]] ? a : b
          )[0].replace('-', ' ').toUpperCase();
        }
      }

      const reportsByStatus = reportsData.reduce((acc, report) => {
        acc[report.status] = (acc[report.status] || 0) + 1;
        return acc;
      }, { completed: 0, draft: 0 } as { completed: number; draft: number });

      return {
        totalReports,
        thisWeekReports,
        averageScore: Math.round(averageScore * 100) / 100,
        uniqueSchools,
        topRole,
        reportsByStatus,
      };
    } catch (error: any) {
      console.error('Error fetching report statistics:', error);
      throw new Error(error.message || 'Failed to fetch report statistics');
    }
  }

  /**
   * Transform database record to our interface format
   */
  private static transformDatabaseRecord(record: any): ObservationReport {
    return {
      id: record.id,
      observer_name: record.observer_name,
      observer_role: record.observer_role,
      school_name: record.school_name,
      teacher_name: record.teacher_name,
      observation_date: record.observation_date,
      start_time: record.start_time,
      end_time: record.end_time,
      lesson_code: record.lesson_code,
      project_name: record.project_name,
      created_at: record.created_at,
      updated_at: record.updated_at,
      overall_score: record.overall_score,
      status: record.status,
      form_data: record.form_data,
      submitted_by: record.submitted_by,
      show_teal_observations: record.show_teal_observations,
      observer_id: record.observer_id,
      school_id: record.school_id,
      teacher_id: record.teacher_id,
    };
  }

  /**
   * Check if the observation_reports table exists and create it if needed
   */
  static async ensureTableExists(): Promise<void> {
    try {
      // This is a utility method that could be used to create the table
      // In a real production environment, you would use migrations instead
      console.log('Table creation should be handled by database migrations');
    } catch (error: any) {
      console.error('Error ensuring table exists:', error);
    }
  }
}

export default ObservationReportsService; 