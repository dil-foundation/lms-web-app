import { supabase } from '@/integrations/supabase/client';

export interface SecuritySetting {
  setting_key: string;
  setting_value: string;
  setting_type: 'boolean' | 'integer' | 'string';
  description: string;
}

export interface AccessLog {
  id: string;
  user_email: string;
  action: string;
  ip_address: string;
  location: string;
  status: 'success' | 'failed' | 'pending';
  created_at: string;
}

export interface SecurityAlert {
  id: string;
  alert_type: 'info' | 'warning' | 'error' | 'success';
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  is_resolved: boolean;
  created_at: string;
}

export interface SecurityStats {
  active_sessions: number;
  failed_attempts: number;
  two_fa_enabled_percentage: number;
  last_backup: string;
}

export interface PaginationParams {
  offset: number;
  limit: number;
}

const SecurityService = {
  // Get all security settings
  getSecuritySettings: async (): Promise<SecuritySetting[]> => {
    const { data, error } = await supabase.rpc('get_security_settings');
    if (error) throw new Error(error.message);
    return data || [];
  },

  // Update a security setting
  updateSecuritySetting: async (settingKey: string, settingValue: string): Promise<boolean> => {
    const { data, error } = await supabase.rpc('update_security_setting', {
      p_setting_key: settingKey,
      p_setting_value: settingValue
    });
    if (error) throw new Error(error.message);
    return data;
  },

  // Get recent access logs with pagination
  getRecentAccessLogs: async (limit: number = 50, offset: number = 0): Promise<AccessLog[]> => {
    const { data, error } = await supabase.rpc('get_recent_access_logs', {
      limit_count: limit,
      offset_count: offset
    });
    if (error) throw new Error(error.message);
    return data || [];
  },

  // Get access logs count for pagination
  getAccessLogsCount: async (): Promise<number> => {
    const { count, error } = await supabase
      .from('access_logs')
      .select('*', { count: 'exact', head: true });
    
    if (error) throw new Error(error.message);
    return count || 0;
  },

  // Get security alerts with pagination
  getSecurityAlerts: async (includeResolved: boolean = false, limit: number = 50, offset: number = 0): Promise<SecurityAlert[]> => {
    const { data, error } = await supabase.rpc('get_security_alerts', {
      include_resolved: includeResolved,
      limit_count: limit,
      offset_count: offset
    });
    if (error) throw new Error(error.message);
    return data || [];
  },

  // Get security alerts count for pagination
  getSecurityAlertsCount: async (includeResolved: boolean = false): Promise<number> => {
    let query = supabase
      .from('security_alerts')
      .select('*', { count: 'exact', head: true });
    
    if (!includeResolved) {
      query = query.eq('is_resolved', false);
    }
    
    const { count, error } = await query;
    if (error) throw new Error(error.message);
    return count || 0;
  },

  // Log access attempt
  logAccessAttempt: async (
    action: string,
    status: 'success' | 'failed' | 'pending',
    userEmail?: string,
    ipAddress?: string,
    userAgent?: string,
    location?: string,
    metadata?: Record<string, any>
  ): Promise<string> => {
    const { data, error } = await supabase.rpc('log_access_attempt', {
      p_action: action,
      p_status: status,
      p_user_email: userEmail,
      p_ip_address: ipAddress,
      p_user_agent: userAgent,
      p_location: location,
      p_metadata: metadata || {}
    });
    if (error) throw new Error(error.message);
    return data;
  },

  // Get security statistics (mock data for now, can be enhanced with real queries)
  getSecurityStats: async (): Promise<SecurityStats> => {
    try {
      const { data: activeSessionsCount, error: sessionsError } = await supabase
        .rpc('get_active_sessions_count');

      if (sessionsError) {
        console.error('Error getting active sessions count:', sessionsError);
      }

      // Get failed attempts count from access logs
      const { data: failedAttempts, error: failedError } = await supabase
        .from('access_logs')
        .select('id', { count: 'exact' })
        .eq('status', 'failed');

      if (failedError) {
        console.error('Error getting failed attempts count:', failedError);
      }

      // Get actual 2FA adoption statistics from user profiles
      const { data: twoFAStats, error: twoFAError } = await supabase
        .rpc('get_2fa_statistics');

      if (twoFAError) {
        console.error('Error getting 2FA statistics:', twoFAError);
      }

      // Use actual user 2FA adoption percentage
      const twoFAEnabledPercentage = twoFAStats && twoFAStats.length > 0 ? 
        Math.round(twoFAStats[0].two_fa_percentage) : 0;

      // Mock last backup time (you can implement actual backup tracking)
      const lastBackup = '2h ago';

      return {
        active_sessions: activeSessionsCount || 0,
        failed_attempts: failedAttempts?.length || 0,
        two_fa_enabled_percentage: twoFAEnabledPercentage,
        last_backup: lastBackup
      };
    } catch (error) {
      console.error('Error getting security stats:', error);
      // Return fallback values
      return {
        active_sessions: 0,
        failed_attempts: 0,
        two_fa_enabled_percentage: 0,
        last_backup: 'Unknown'
      };
    }
  },

  // Convert setting value to appropriate type
  parseSettingValue: (value: string, type: string): boolean | number | string => {
    switch (type) {
      case 'boolean':
        return value.toLowerCase() === 'true';
      case 'integer':
        return parseInt(value, 10);
      default:
        return value;
    }
  },

  // Convert setting value to string for storage
  stringifySettingValue: (value: boolean | number | string): string => {
    return String(value);
  },


};

export default SecurityService;
