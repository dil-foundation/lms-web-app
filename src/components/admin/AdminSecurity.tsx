import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Shield,
  Settings,
  Save,
  AlertTriangle,
  Activity,
  Users,
  Key,
  Loader2,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Search,
  XCircle,
  X,
  Server,
  Bell,
  FileText,
  Lock,
  Download
} from 'lucide-react';
import { toast } from 'sonner';
import SecurityService, { SecuritySetting, AccessLog, SecurityStats } from '@/services/securityService';
import SupabaseMFAService from '@/services/supabaseMFAService';
import AccessLogService from '@/services/accessLogService';
import AdminSettingsService, { type AdminSettings } from '@/services/adminSettingsService';
import { ContentLoader } from '@/components/ContentLoader';
import { supabase } from '@/integrations/supabase/client';
import { formatTimestampWithTimezone } from '@/utils/dateUtils';
import LoginSecurityAlerts from './LoginSecurityAlerts';
import exportEdgeFunctionsService from '@/services/exportEdgeFunctionsService';
import { exportMFAUsers as exportMFAUsersToExcel, exportAccessLogs as exportAccessLogsToExcel } from '@/services/excelExportService';

interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  mfa_enabled: boolean;
  created_at: string;
  total_count: number;
}

// Helper function to format role names for display
const formatRoleName = (role: string): string => {
  return role
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

const UserMFAManagement = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchLoading, setSearchLoading] = useState(false);
  const [paginationLoading, setPaginationLoading] = useState(false);
  const [disablingMFA, setDisablingMFA] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);
  const [exporting, setExporting] = useState(false);
  const pageSize = 5;

  // Initial load
  useEffect(() => {
    loadUsers();
  }, []);

  // Debounce search term to avoid too many API calls
  useEffect(() => {
    const timer = setTimeout(() => {
      setCurrentPage(1); // Reset to first page when searching
      if (searchTerm !== '') {
        loadUsersWithSearch();
      } else {
        // When search is cleared, load all users
        loadUsers();
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Load users when page changes (but not on initial load)
  useEffect(() => {
    if (currentPage > 1) {
      loadUsersWithPagination();
    }
  }, [currentPage]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.rpc('get_users_with_mfa_status', {
        search_term: searchTerm || null,
        page_number: currentPage,
        page_size: pageSize
      });

      if (error) throw error;

      if (data && data.length > 0) {
        setUsers(data);
        setTotalUsers(data[0].total_count);
        setTotalPages(Math.ceil(data[0].total_count / pageSize));
      } else {
        setUsers([]);
        setTotalUsers(0);
        setTotalPages(1);
      }
    } catch (error) {
      console.error('Error loading users:', error);
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const loadUsersWithSearch = async () => {
    try {
      setSearchLoading(true);
      const { data, error } = await supabase.rpc('get_users_with_mfa_status', {
        search_term: searchTerm || null,
        page_number: currentPage,
        page_size: pageSize
      });

      if (error) throw error;

      if (data && data.length > 0) {
        setUsers(data);
        setTotalUsers(data[0].total_count);
        setTotalPages(Math.ceil(data[0].total_count / pageSize));
      } else {
        setUsers([]);
        setTotalUsers(0);
        setTotalPages(1);
      }
    } catch (error) {
      console.error('Error loading users:', error);
      toast.error('Failed to load users');
    } finally {
      setSearchLoading(false);
    }
  };

  const loadUsersWithPagination = async () => {
    try {
      setPaginationLoading(true);
      const { data, error } = await supabase.rpc('get_users_with_mfa_status', {
        search_term: searchTerm || null,
        page_number: currentPage,
        page_size: pageSize
      });

      if (error) throw error;

      if (data && data.length > 0) {
        setUsers(data);
        setTotalUsers(data[0].total_count);
        setTotalPages(Math.ceil(data[0].total_count / pageSize));
      } else {
        setUsers([]);
        setTotalUsers(0);
        setTotalPages(1);
      }
    } catch (error) {
      console.error('Error loading users:', error);
      toast.error('Failed to load users');
    } finally {
      setPaginationLoading(false);
    }
  };

  const disableMFAForUser = async (userId: string) => {
    try {
      setDisablingMFA(userId);

      // Use the service function instead of direct RPC call
      const success = await SupabaseMFAService.disableMFAForUser(userId);

      if (success) {
        toast.success('MFA factors removed successfully. User will be prompted to set up MFA again if required for their role.');
        // Refresh the list using the appropriate loading function
        if (searchTerm) {
          loadUsersWithSearch();
        } else if (currentPage > 1) {
          loadUsersWithPagination();
        } else {
          loadUsers();
        }
      }
    } catch (error) {
      console.error('Error disabling MFA:', error);
      toast.error('Failed to disable MFA for user');
    } finally {
      setDisablingMFA(null);
    }
  };

  const handleExportMFAUsers = async () => {
    try {
      setExporting(true);
      toast.info('Exporting MFA users...');

      // Fetch all users without pagination
      const allUsers = await exportEdgeFunctionsService.exportMFAUsers(searchTerm);

      if (allUsers.length === 0) {
        toast.warning('No users found to export');
        return;
      }

      // Export to Excel
      exportMFAUsersToExcel(allUsers, `mfa-users-export-${new Date().toISOString().split('T')[0]}`);

      toast.success(`Successfully exported ${allUsers.length} users`);
    } catch (error) {
      console.error('Error exporting MFA users:', error);
      toast.error('Failed to export MFA users');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-4">
        <div className="relative flex-1 max-w-full sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Search users..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 h-9 sm:h-10 text-sm"
          />
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleExportMFAUsers}
          disabled={exporting || loading}
          className="flex items-center gap-2 h-9 sm:h-10 px-3 sm:px-4 text-xs sm:text-sm w-full sm:w-auto"
        >
          {exporting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Download className="w-4 h-4" />
          )}
          {exporting ? 'Exporting...' : 'Export to Excel'}
        </Button>
      </div>

      {loading || searchLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : (
        <>
          {users.length === 0 ? (
            <div className="text-center py-8 px-4">
              <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No users found</p>
            </div>
          ) : (
            <div className="space-y-3">
              {users.map((user) => (
                <Card key={user.id} className="border hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    {/* Mobile & Desktop Layout */}
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 md:gap-4">
                      {/* User Info */}
                      <div className="flex-1 min-w-0 space-y-2">
                        <div>
                          <div className="font-medium text-sm sm:text-base truncate">
                            {user.first_name} {user.last_name}
                          </div>
                          <div className="text-xs sm:text-sm text-muted-foreground truncate">
                            {user.email}
                          </div>
                        </div>
                        
                        {/* Role and Status - Stacked on mobile */}
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="secondary" className="text-xs">
                            {formatRoleName(user.role)}
                          </Badge>
                          {user.mfa_enabled ? (
                            <Badge className="bg-green-500 text-xs">
                              <Key className="w-3 h-3 mr-1" />
                              MFA Enabled
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-xs">
                              <Key className="w-3 h-3 mr-1" />
                              MFA Disabled
                            </Badge>
                          )}
                        </div>
                      </div>
                      
                      {/* Action Button */}
                      <div className="flex-shrink-0">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => disableMFAForUser(user.id)}
                          disabled={!user.mfa_enabled || disablingMFA === user.id}
                          className="w-full md:w-auto h-8 sm:h-9 text-xs sm:text-sm"
                        >
                          {disablingMFA === user.id ? (
                            <Loader2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2 animate-spin" />
                          ) : (
                            <XCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2" />
                          )}
                          Disable MFA
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-0">
              <p className="text-sm text-muted-foreground">
                Page {currentPage} of {totalPages} ({totalUsers} total users)
              </p>
              <div className="flex items-center gap-2 w-full sm:w-auto justify-center sm:justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1 || paginationLoading}
                  className="h-8 sm:h-9 px-2 sm:px-3 text-xs sm:text-sm flex-1 sm:flex-none"
                >
                  <ChevronLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1" />
                  <span className="hidden sm:inline">Previous</span>
                  <span className="sm:hidden">Prev</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages || paginationLoading}
                  className="h-8 sm:h-9 px-2 sm:px-3 text-xs sm:text-sm flex-1 sm:flex-none"
                >
                  <span className="hidden sm:inline">Next</span>
                  <span className="sm:hidden">Next</span>
                  <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

interface SecuritySettings {
  two_factor_auth_enabled_admin: boolean;
  two_factor_auth_enabled_teachers: boolean;
  two_factor_auth_enabled_students: boolean;
  session_timeout_minutes: number;
  max_login_attempts: number;
}

const ITEMS_PER_PAGE = 20;

const AdminSecurity = () => {
  const [securitySettings, setSecuritySettings] = useState<any[]>([]);
  const [localSettings, setLocalSettings] = useState<SecuritySettings>({
    two_factor_auth_enabled_admin: false,
    two_factor_auth_enabled_teachers: false,
    two_factor_auth_enabled_students: false,
    session_timeout_minutes: 30,
    max_login_attempts: 5
  });
  const [originalSettings, setOriginalSettings] = useState<SecuritySettings | null>(null);
  const [securityStats, setSecurityStats] = useState<SecurityStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Admin Settings state
  const [adminSettings, setAdminSettings] = useState({
    // System Settings
    systemName: 'DIL Learning Platform',
    maintenanceMode: false,
    
    // Notifications
    systemNotifications: true,
    pushNotifications: false
  });
  const [originalAdminSettings, setOriginalAdminSettings] = useState(adminSettings);
  const [adminSettingsLoading, setAdminSettingsLoading] = useState(true);
  const [adminSettingsSaving, setAdminSettingsSaving] = useState(false);
  const [adminSettingsResetting, setAdminSettingsResetting] = useState(false);

  // Access logs states
  const [accessLogs, setAccessLogs] = useState<AccessLog[]>([]);
  const [accessLogsLoading, setAccessLogsLoading] = useState(false);
  const [accessLogsHasMore, setAccessLogsHasMore] = useState(true);
  const [accessLogsOffset, setAccessLogsOffset] = useState(0);
  const [accessLogsExporting, setAccessLogsExporting] = useState(false);
  const accessLogsRef = useRef<HTMLDivElement>(null);

  // Load all data on component mount
  useEffect(() => {
    loadSecurityData();
    loadAdminSettings();
  }, []);

  // Admin Settings functions
  const loadAdminSettings = async () => {
    try {
      setAdminSettingsLoading(true);
      const dbSettings = await AdminSettingsService.getSettings();
      
      // Convert database format to component format
      const componentSettings = {
        systemName: dbSettings.system_name,
        maintenanceMode: dbSettings.maintenance_mode,
        systemNotifications: dbSettings.system_notifications,
        pushNotifications: dbSettings.push_notifications
      };
      
      setAdminSettings(componentSettings);
      setOriginalAdminSettings(componentSettings);
    } catch (error) {
      console.error('Error loading admin settings:', error);
      toast.error('Failed to load admin settings');
    } finally {
      setAdminSettingsLoading(false);
    }
  };

  const handleAdminSettingsSave = async () => {
    setAdminSettingsSaving(true);
    try {
      // Convert component format to database format
      const dbSettings = {
        system_name: adminSettings.systemName,
        maintenance_mode: adminSettings.maintenanceMode,
        system_notifications: adminSettings.systemNotifications,
        email_notifications: true, // Keep email notifications enabled in database
        push_notifications: adminSettings.pushNotifications
      };

      await AdminSettingsService.updateSettings(dbSettings);
      setOriginalAdminSettings(adminSettings);
      toast.success('Admin settings saved successfully');

      // Log admin settings update
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await AccessLogService.logAdminSettingsAction(
            user.id,
            user.email || 'unknown@email.com',
            'updated',
            'admin_settings',
            {
              system_name: adminSettings.systemName,
              maintenance_mode: adminSettings.maintenanceMode,
              system_notifications: adminSettings.systemNotifications,
              push_notifications: adminSettings.pushNotifications
            }
          );
        }
      } catch (logError) {
        console.error('Error logging admin settings update:', logError);
      }
    } catch (error) {
      console.error('Error saving admin settings:', error);
      toast.error('Failed to save admin settings');
    } finally {
      setAdminSettingsSaving(false);
    }
  };

  const handleAdminSettingsReset = async () => {
    setAdminSettingsResetting(true);
    try {
      // Load current settings from database (this will restore the original values)
      const currentSettings = await AdminSettingsService.getSettings();
      
      // Convert database format to component format
      const componentSettings = {
        systemName: currentSettings.system_name,
        maintenanceMode: currentSettings.maintenance_mode,
        systemNotifications: currentSettings.system_notifications,
        pushNotifications: currentSettings.push_notifications
      };
      
      setAdminSettings(componentSettings);
      setOriginalAdminSettings(componentSettings);
      toast.success('Admin settings reset successfully');

      // Log admin settings reset
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await AccessLogService.logAdminSettingsAction(
            user.id,
            user.email || 'unknown@email.com',
            'reset',
            'admin_settings',
            {
              system_name: currentSettings.system_name,
              maintenance_mode: currentSettings.maintenance_mode,
              system_notifications: currentSettings.system_notifications,
              push_notifications: currentSettings.push_notifications
            }
          );
        }
      } catch (logError) {
        console.error('Error logging admin settings reset:', logError);
      }
    } catch (error) {
      console.error('Error resetting admin settings:', error);
      toast.error('Failed to reset admin settings');
    } finally {
      setAdminSettingsResetting(false);
    }
  };

  // Check if there are unsaved changes for admin settings
  const hasUnsavedAdminChanges = JSON.stringify(adminSettings) !== JSON.stringify(originalAdminSettings);

  const loadSecurityData = async () => {
    try {
      setLoading(true);
      const [settings, stats] = await Promise.all([
        SecurityService.getSecuritySettings(),
        SecurityService.getSecurityStats()
      ]);

      setSecuritySettings(settings);
      setSecurityStats(stats);

      // Initialize local settings with database values
      const initialLocalSettings = {
        two_factor_auth_enabled_admin: SecurityService.parseSettingValue(
          settings.find(s => s.setting_key === 'two_factor_auth_enabled_admins')?.setting_value || 'false',
          'boolean'
        ) as boolean,
        two_factor_auth_enabled_teachers: SecurityService.parseSettingValue(
          settings.find(s => s.setting_key === 'two_factor_auth_enabled_teachers')?.setting_value || 'false',
          'boolean'
        ) as boolean,
        two_factor_auth_enabled_students: SecurityService.parseSettingValue(
          settings.find(s => s.setting_key === 'two_factor_auth_enabled_students')?.setting_value || 'false',
          'boolean'
        ) as boolean,
        session_timeout_minutes: SecurityService.parseSettingValue(
          settings.find(s => s.setting_key === 'session_timeout_minutes')?.setting_value || '30',
          'integer'
        ) as number,
        max_login_attempts: SecurityService.parseSettingValue(
          settings.find(s => s.setting_key === 'max_login_attempts')?.setting_value || '5',
          'integer'
        ) as number
      };

      setLocalSettings(initialLocalSettings);
      setOriginalSettings(initialLocalSettings);
      setHasUnsavedChanges(false);

      // Load initial data for logs
      await loadAccessLogs(true);
    } catch (error) {
      console.error('Error loading security data:', error);
      toast.error('Failed to load security data');
    } finally {
      setLoading(false);
    }
  };

  const loadAccessLogs = async (reset: boolean = false) => {
    if (accessLogsLoading) return;

    try {
      setAccessLogsLoading(true);
      const offset = reset ? 0 : accessLogsOffset;
      const logs = await SecurityService.getRecentAccessLogs(ITEMS_PER_PAGE, offset);

      if (reset) {
        setAccessLogs(logs);
        setAccessLogsOffset(ITEMS_PER_PAGE);
      } else {
        setAccessLogs(prev => [...prev, ...logs]);
        setAccessLogsOffset(prev => prev + ITEMS_PER_PAGE);
      }

      setAccessLogsHasMore(logs.length === ITEMS_PER_PAGE);
    } catch (error) {
      console.error('Error loading access logs:', error);
      toast.error('Failed to load access logs');
    } finally {
      setAccessLogsLoading(false);
    }
  };

  const handleExportAccessLogs = async () => {
    try {
      setAccessLogsExporting(true);
      toast.info('Exporting access logs...');

      // Fetch all access logs without pagination
      const allLogs = await exportEdgeFunctionsService.exportAccessLogs();

      if (allLogs.length === 0) {
        toast.warning('No access logs found to export');
        return;
      }

      // Export to Excel
      exportAccessLogsToExcel(allLogs, `access-logs-export-${new Date().toISOString().split('T')[0]}`);

      toast.success(`Successfully exported ${allLogs.length} access logs`);
    } catch (error) {
      console.error('Error exporting access logs:', error);
      toast.error('Failed to export access logs');
    } finally {
      setAccessLogsExporting(false);
    }
  };

  // Track if there are unsaved changes
  useEffect(() => {
    // Only run comparison if we have original settings loaded
    if (!originalSettings) {
      setHasUnsavedChanges(false);
      return;
    }

    const isChanged = Object.keys(localSettings).some(key => {
      const localValue = localSettings[key as keyof typeof localSettings];
      const originalValue = originalSettings[key as keyof typeof originalSettings];
      return localValue !== originalValue;
    });
    
    setHasUnsavedChanges(isChanged);
  }, [localSettings, originalSettings]);

  const handleLocalSettingChange = (key: keyof typeof localSettings, value: any) => {
    setLocalSettings(prev => ({ ...prev, [key]: value }));
    setHasUnsavedChanges(true);
  };

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      // Map local setting keys to database keys
      const keyMapping = {
        two_factor_auth_enabled_admin: 'two_factor_auth_enabled_admins',
        two_factor_auth_enabled_teachers: 'two_factor_auth_enabled_teachers',
        two_factor_auth_enabled_students: 'two_factor_auth_enabled_students',
        session_timeout_minutes: 'session_timeout_minutes',
        max_login_attempts: 'max_login_attempts'
      };

      const savePromises = Object.entries(localSettings).map(([key, value]) => {
        const databaseKey = keyMapping[key as keyof typeof keyMapping] || key;
        return SecurityService.updateSecuritySetting(databaseKey, SecurityService.stringifySettingValue(value));
      });
      await Promise.all(savePromises);
      
      // Update the original settings to match the current local settings
      setOriginalSettings({ ...localSettings });
      setHasUnsavedChanges(false);
      
      toast.success('Security settings updated successfully!');

      // Log security settings update
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await AccessLogService.logAdminSettingsAction(
            user.id,
            user.email || 'unknown@email.com',
            'updated',
            'security_settings',
            {
              two_factor_auth_enabled_admin: localSettings.two_factor_auth_enabled_admin,
              two_factor_auth_enabled_teachers: localSettings.two_factor_auth_enabled_teachers,
              two_factor_auth_enabled_students: localSettings.two_factor_auth_enabled_students,
              session_timeout_minutes: localSettings.session_timeout_minutes,
              max_login_attempts: localSettings.max_login_attempts
            }
          );
        }
      } catch (logError) {
        console.error('Error logging security settings update:', logError);
      }
    } catch (error) {
      console.error('Error saving security settings:', error);
      toast.error('Failed to save security settings');
    } finally {
      setSaving(false);
    }
  };

  const handleResetSettings = async () => {
    try {
      // Fetch fresh data from the database
      const freshSettings = await SecurityService.getSecuritySettings();
      
      // Update the security settings state with fresh data
      setSecuritySettings(freshSettings);
      
      // Initialize local settings with fresh database values
      const freshLocalSettings = {
        two_factor_auth_enabled_admin: SecurityService.parseSettingValue(
          freshSettings.find(s => s.setting_key === 'two_factor_auth_enabled_admins')?.setting_value || 'false',
          'boolean'
        ) as boolean,
        two_factor_auth_enabled_teachers: SecurityService.parseSettingValue(
          freshSettings.find(s => s.setting_key === 'two_factor_auth_enabled_teachers')?.setting_value || 'false',
          'boolean'
        ) as boolean,
        two_factor_auth_enabled_students: SecurityService.parseSettingValue(
          freshSettings.find(s => s.setting_key === 'two_factor_auth_enabled_students')?.setting_value || 'false',
          'boolean'
        ) as boolean,
        session_timeout_minutes: SecurityService.parseSettingValue(
          freshSettings.find(s => s.setting_key === 'session_timeout_minutes')?.setting_value || '30',
          'integer'
        ) as number,
        max_login_attempts: SecurityService.parseSettingValue(
          freshSettings.find(s => s.setting_key === 'max_login_attempts')?.setting_value || '5',
          'integer'
        ) as number
      };
      
      setLocalSettings(freshLocalSettings);
      setOriginalSettings(freshLocalSettings);
      setHasUnsavedChanges(false);
      
      toast.success('Settings reset successfully');

      // Log security settings reset
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await AccessLogService.logAdminSettingsAction(
            user.id,
            user.email || 'unknown@email.com',
            'reset',
            'security_settings',
            {
              two_factor_auth_enabled_admin: freshLocalSettings.two_factor_auth_enabled_admin,
              two_factor_auth_enabled_teachers: freshLocalSettings.two_factor_auth_enabled_teachers,
              two_factor_auth_enabled_students: freshLocalSettings.two_factor_auth_enabled_students,
              session_timeout_minutes: freshLocalSettings.session_timeout_minutes,
              max_login_attempts: freshLocalSettings.max_login_attempts
            }
          );
        }
      } catch (logError) {
        console.error('Error logging security settings reset:', logError);
      }
    } catch (error) {
      console.error('Error resetting settings:', error);
      toast.error('Failed to reset settings');
    }
  };

  // Scroll event listeners for infinite scrolling
  useEffect(() => {
    const handleScroll = (ref: React.RefObject<HTMLDivElement>, loadMore: () => void, hasMore: boolean, loadingState: boolean) => {
      if (ref.current) {
        const { scrollTop, scrollHeight, clientHeight } = ref.current;
        if (scrollTop + clientHeight >= scrollHeight - 50 && hasMore && !loadingState) {
          loadMore();
        }
      }
    };

    const accessLogsCurrent = accessLogsRef.current;

    const handleAccessLogsScroll = () => handleScroll(accessLogsRef, loadAccessLogs, accessLogsHasMore, accessLogsLoading);

    if (accessLogsCurrent) {
      accessLogsCurrent.addEventListener('scroll', handleAccessLogsScroll);
    }

    return () => {
      if (accessLogsCurrent) {
        accessLogsCurrent.removeEventListener('scroll', handleAccessLogsScroll);
      }
    };
  }, [loadAccessLogs, accessLogsHasMore, accessLogsLoading]);

  const formatTimestamp = (timestamp: string) => {
    return formatTimestampWithTimezone(timestamp);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <Shield className="w-4 h-4 text-green-500" />;
      case 'failed':
        return <AlertTriangle className="w-4 h-4 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      default:
        return null;
    }
  };

  if (loading || adminSettingsLoading) {
    return <ContentLoader />;
  }

  return (
    <div className="space-y-4 sm:space-y-6 p-3 sm:p-4 md:p-6">
      {/* Header */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-primary/5 rounded-xl sm:rounded-2xl md:rounded-3xl"></div>
        <div className="relative p-3 sm:p-4 md:p-6 lg:p-8 rounded-xl sm:rounded-2xl md:rounded-3xl">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
              <div className="w-10 h-10 md:w-12 md:h-12 bg-gradient-to-br from-primary/10 to-primary/20 rounded-lg md:rounded-xl flex items-center justify-center flex-shrink-0">
                <Settings className="w-5 h-5 md:w-6 md:h-6 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <h1 className="text-lg sm:text-xl md:text-2xl font-bold tracking-tight bg-gradient-to-r from-primary via-primary to-primary/80 bg-clip-text text-transparent leading-tight break-words">
                  Settings and Security
                </h1>
                <p className="text-xs sm:text-sm md:text-base text-muted-foreground font-light mt-0.5 sm:mt-1 break-words">
                  Configure system-wide settings and security policies
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Tabs: Settings and Security - Prominent Style */}
      <Tabs defaultValue="settings" className="space-y-4 sm:space-y-6">
        <div className="border-b border-border/40 pb-0 overflow-x-auto">
          <TabsList className="h-auto bg-transparent p-0 gap-1 sm:gap-2 w-full justify-start">
            <TabsTrigger 
              value="settings" 
              className="flex items-center gap-2 sm:gap-3 px-3 sm:px-4 md:px-6 py-2.5 sm:py-3 md:py-4 text-sm sm:text-base font-semibold rounded-t-lg rounded-b-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-card data-[state=active]:shadow-sm transition-all duration-200 hover:bg-muted/50 whitespace-nowrap"
            >
              <div className="w-4 h-4 sm:w-5 sm:h-5 flex items-center justify-center flex-shrink-0">
                <Settings className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <span className="hidden sm:inline">Settings</span>
            </TabsTrigger>
            <TabsTrigger 
              value="security" 
              className="flex items-center gap-2 sm:gap-3 px-3 sm:px-4 md:px-6 py-2.5 sm:py-3 md:py-4 text-sm sm:text-base font-semibold rounded-t-lg rounded-b-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-card data-[state=active]:shadow-sm transition-all duration-200 hover:bg-muted/50 whitespace-nowrap"
            >
              <div className="w-4 h-4 sm:w-5 sm:h-5 flex items-center justify-center flex-shrink-0">
                <Shield className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <span className="hidden sm:inline">Security</span>
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Settings Tab with Sub-tabs */}
        <TabsContent value="settings" className="mt-4 sm:mt-6">
          <div className="bg-card border rounded-lg p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6">
            <Tabs defaultValue="system" className="space-y-4 sm:space-y-6">
              {/* Sub-tabs - Subtle Style */}
              <div className="border-b border-border/20 -mx-3 sm:-mx-4 md:-mx-6 px-3 sm:px-4 md:px-6 overflow-x-auto">
                <TabsList className="h-auto bg-transparent p-0 gap-1 w-auto">
                  <TabsTrigger
                    value="system"
                    className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 md:px-4 py-2 sm:py-2.5 text-xs sm:text-sm font-medium rounded-t-lg rounded-b-none border-b-2 border-transparent data-[state=active]:border-primary/60 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:font-semibold transition-all duration-200 hover:bg-primary/90 hover:text-primary-foreground whitespace-nowrap"
                  >
                    <Server className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
                    <span className="hidden sm:inline">System Configuration</span>
                    <span className="sm:hidden">System</span>
                  </TabsTrigger>
                  <TabsTrigger
                    value="notifications"
                    className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 md:px-4 py-2 sm:py-2.5 text-xs sm:text-sm font-medium rounded-t-lg rounded-b-none border-b-2 border-transparent data-[state=active]:border-primary/60 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:font-semibold transition-all duration-200 hover:bg-primary/90 hover:text-primary-foreground whitespace-nowrap"
                  >
                    <Bell className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
                    <span className="hidden sm:inline">Notifications</span>
                    <span className="sm:hidden">Notify</span>
                  </TabsTrigger>
                </TabsList>
              </div>

            {/* System Configuration Sub-tab */}
            <TabsContent value="system">
              <div className="space-y-4 sm:space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
                  <div className="min-w-0 flex-1">
                    <h2 className="text-base sm:text-lg md:text-xl font-semibold break-words">System Configuration</h2>
                    <p className="text-xs sm:text-sm text-muted-foreground break-words">Configure system-wide settings and preferences</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Button 
                      variant="outline" 
                      onClick={handleAdminSettingsReset}
                      disabled={adminSettingsResetting || adminSettingsSaving || adminSettingsLoading}
                      className="h-8 sm:h-9 px-2 sm:px-3 text-xs sm:text-sm"
                    >
                      {adminSettingsResetting ? (
                        <Loader2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2 animate-spin" />
                      ) : (
                        <RefreshCw className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2" />
                      )}
                      {adminSettingsResetting ? 'Resetting...' : 'Reset'}
                    </Button>
                    <Button 
                      onClick={handleAdminSettingsSave} 
                      disabled={adminSettingsSaving || adminSettingsResetting || adminSettingsLoading || !hasUnsavedAdminChanges}
                      className="h-8 sm:h-9 px-2 sm:px-3 text-xs sm:text-sm whitespace-nowrap"
                    >
                      {adminSettingsSaving ? (
                        <Loader2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2 animate-spin" />
                      ) : (
                        <Save className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2" />
                      )}
                      <span className="hidden sm:inline">{adminSettingsSaving ? 'Saving...' : 'Save Changes'}</span>
                      <span className="sm:hidden">{adminSettingsSaving ? 'Saving...' : 'Save'}</span>
                    </Button>
                  </div>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Server className="w-5 h-5" />
                      System Configuration
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-2">
                      <Label htmlFor="systemName">System Name</Label>
                      <Input
                        id="systemName"
                        value={adminSettings.systemName}
                        onChange={(e) => setAdminSettings({...adminSettings, systemName: e.target.value})}
                        disabled={adminSettingsSaving || adminSettingsResetting}
                      />
                    </div>
                    
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label>Maintenance Mode</Label>
                          <p className="text-sm text-muted-foreground">
                            Temporarily disable access for maintenance
                          </p>
                        </div>
                        <Switch
                          checked={adminSettings.maintenanceMode}
                          onCheckedChange={(checked) => setAdminSettings({...adminSettings, maintenanceMode: checked})}
                          disabled={adminSettingsSaving || adminSettingsResetting}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Notifications Sub-tab */}
            <TabsContent value="notifications">
              <div className="space-y-4 sm:space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
                  <div className="min-w-0 flex-1">
                    <h2 className="text-base sm:text-lg md:text-xl font-semibold break-words">Notification Settings</h2>
                    <p className="text-xs sm:text-sm text-muted-foreground break-words">Configure system notification preferences</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Button 
                      variant="outline" 
                      onClick={handleAdminSettingsReset}
                      disabled={adminSettingsResetting || adminSettingsSaving || adminSettingsLoading}
                      className="h-8 sm:h-9 px-2 sm:px-3 text-xs sm:text-sm"
                    >
                      {adminSettingsResetting ? (
                        <Loader2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2 animate-spin" />
                      ) : (
                        <RefreshCw className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2" />
                      )}
                      {adminSettingsResetting ? 'Resetting...' : 'Reset'}
                    </Button>
                    <Button 
                      onClick={handleAdminSettingsSave} 
                      disabled={adminSettingsSaving || adminSettingsResetting || adminSettingsLoading || !hasUnsavedAdminChanges}
                      className="h-8 sm:h-9 px-2 sm:px-3 text-xs sm:text-sm whitespace-nowrap"
                    >
                      {adminSettingsSaving ? (
                        <Loader2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2 animate-spin" />
                      ) : (
                        <Save className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2" />
                      )}
                      <span className="hidden sm:inline">{adminSettingsSaving ? 'Saving...' : 'Save Changes'}</span>
                      <span className="sm:hidden">{adminSettingsSaving ? 'Saving...' : 'Save'}</span>
                    </Button>
                  </div>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Bell className="w-5 h-5" />
                      Notification Settings
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label>System Notifications</Label>
                          <p className="text-sm text-muted-foreground">
                            Enable system-wide notifications
                          </p>
                        </div>
                        <Switch
                          checked={adminSettings.systemNotifications}
                          onCheckedChange={(checked) => setAdminSettings({...adminSettings, systemNotifications: checked})}
                          disabled={adminSettingsSaving || adminSettingsResetting}
                        />
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label>Real Time Notifications</Label>
                          <p className="text-sm text-muted-foreground">
                            Send real-time notifications
                          </p>
                        </div>
                        <Switch
                          checked={adminSettings.pushNotifications}
                          onCheckedChange={(checked) => setAdminSettings({...adminSettings, pushNotifications: checked})}
                          disabled={adminSettingsSaving || adminSettingsResetting}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
            </Tabs>
          </div>
        </TabsContent>

        {/* Security Tab with Sub-tabs */}
        <TabsContent value="security" className="mt-4 sm:mt-6">
          <div className="bg-card border rounded-lg p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6">
            <Tabs defaultValue="overview" className="space-y-4 sm:space-y-6">
              {/* Sub-tabs - Subtle Style */}
              <div className="border-b border-border/20 -mx-3 sm:-mx-4 md:-mx-6 px-3 sm:px-4 md:px-6">
                <TabsList className="h-auto bg-transparent p-0 gap-0.5 sm:gap-1 w-full justify-start">
                  <TabsTrigger
                    value="overview"
                    className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 lg:px-4 py-2 sm:py-2.5 text-xs sm:text-sm font-medium rounded-t-lg rounded-b-none border-b-2 border-transparent data-[state=active]:border-primary/60 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:font-semibold transition-all duration-200 hover:bg-primary/90 hover:text-primary-foreground whitespace-nowrap"
                  >
                    <Activity className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
                    <span className="hidden lg:inline">Overview</span>
                  </TabsTrigger>
                  <TabsTrigger
                    value="authentication"
                    className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 lg:px-4 py-2 sm:py-2.5 text-xs sm:text-sm font-medium rounded-t-lg rounded-b-none border-b-2 border-transparent data-[state=active]:border-primary/60 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:font-semibold transition-all duration-200 hover:bg-primary/90 hover:text-primary-foreground whitespace-nowrap"
                  >
                    <Lock className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
                    <span className="hidden lg:inline">Authentication</span>
                  </TabsTrigger>
                  <TabsTrigger
                    value="mfa"
                    className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 lg:px-4 py-2 sm:py-2.5 text-xs sm:text-sm font-medium rounded-t-lg rounded-b-none border-b-2 border-transparent data-[state=active]:border-primary/60 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:font-semibold transition-all duration-200 hover:bg-primary/90 hover:text-primary-foreground whitespace-nowrap"
                  >
                    <Key className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
                    <span className="hidden lg:inline">MFA Management</span>
                  </TabsTrigger>
                  <TabsTrigger
                    value="alerts"
                    className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 lg:px-4 py-2 sm:py-2.5 text-xs sm:text-sm font-medium rounded-t-lg rounded-b-none border-b-2 border-transparent data-[state=active]:border-primary/60 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:font-semibold transition-all duration-200 hover:bg-primary/90 hover:text-primary-foreground whitespace-nowrap"
                  >
                    <AlertTriangle className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
                    <span className="hidden lg:inline">Security Alerts</span>
                  </TabsTrigger>
                  <TabsTrigger
                    value="logs"
                    className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 lg:px-4 py-2 sm:py-2.5 text-xs sm:text-sm font-medium rounded-t-lg rounded-b-none border-b-2 border-transparent data-[state=active]:border-primary/60 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:font-semibold transition-all duration-200 hover:bg-primary/90 hover:text-primary-foreground whitespace-nowrap"
                  >
                    <FileText className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
                    <span className="hidden lg:inline">Access Logs</span>
                  </TabsTrigger>
                </TabsList>
              </div>

            {/* Security Overview Sub-tab */}
            <TabsContent value="overview">
              <div className="space-y-4 sm:space-y-6">
                <div>
                  <h2 className="text-base sm:text-lg md:text-xl font-semibold break-words">Security Overview</h2>
                  <p className="text-xs sm:text-sm text-muted-foreground break-words">Current security status and key metrics</p>
                </div>

                <Card>
                  <CardHeader className="p-3 sm:p-4 md:p-6">
                    <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                      <Shield className="w-4 h-4 sm:w-5 sm:h-5" />
                      Security Overview
                    </CardTitle>
                    <CardDescription className="text-xs sm:text-sm">
                      Current security status and key metrics
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 p-3 sm:p-4 md:p-6 pt-0">
                    <div className="flex items-center justify-between p-3 sm:p-4 border rounded-lg">
                      <div>
                        <p className="text-xs sm:text-sm font-medium text-muted-foreground">Active Sessions</p>
                        <p className="text-xl sm:text-2xl font-bold">{securityStats?.active_sessions || 0}</p>
                      </div>
                      <Activity className="w-6 h-6 sm:w-8 sm:h-8 text-blue-500 flex-shrink-0" />
                    </div>
                    <div className="flex items-center justify-between p-3 sm:p-4 border rounded-lg">
                      <div>
                        <p className="text-xs sm:text-sm font-medium text-muted-foreground">2FA Enabled</p>
                        <p className="text-xl sm:text-2xl font-bold">{securityStats?.two_fa_enabled_percentage || 0}%</p>
                      </div>
                      <Shield className="w-6 h-6 sm:w-8 sm:h-8 text-green-500 flex-shrink-0" />
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Authentication Settings Sub-tab */}
            <TabsContent value="authentication">
              <div className="space-y-4 sm:space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
                  <div className="min-w-0 flex-1">
                    <h2 className="text-base sm:text-lg md:text-xl font-semibold break-words">Authentication Settings</h2>
                    <p className="text-xs sm:text-sm text-muted-foreground break-words">Configure authentication and access control policies</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 flex-shrink-0">
                    {hasUnsavedChanges && (
                      <Badge variant="secondary" className="text-orange-600 bg-orange-50 text-xs">
                        Unsaved Changes
                      </Badge>
                    )}
                    <Button
                      variant="outline"
                      onClick={handleResetSettings}
                      disabled={!hasUnsavedChanges || saving}
                      className="h-8 sm:h-9 px-2 sm:px-3 text-xs sm:text-sm"
                    >
                      Reset
                    </Button>
                    <Button
                      onClick={handleSaveSettings}
                      disabled={!hasUnsavedChanges || saving}
                      className="flex items-center gap-2 h-8 sm:h-9 px-2 sm:px-3 text-xs sm:text-sm whitespace-nowrap"
                    >
                      <Save className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      <span className="hidden sm:inline">{saving ? 'Saving...' : 'Save Changes'}</span>
                      <span className="sm:hidden">{saving ? 'Saving...' : 'Save'}</span>
                    </Button>
                  </div>
                </div>

                <Card>
                  <CardHeader className="p-3 sm:p-4 md:p-6">
                    <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                      <Lock className="w-4 h-4 sm:w-5 sm:h-5" />
                      Authentication Settings
                    </CardTitle>
                    <CardDescription className="text-xs sm:text-sm">
                      Configure authentication and access control policies
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4 sm:space-y-6 p-3 sm:p-4 md:p-6 pt-0">
                    <div className="space-y-3 sm:space-y-4">
                      <div className="space-y-1 sm:space-y-2">
                        <Label className="text-sm sm:text-base">Two-Factor Authentication</Label>
                        <p className="text-xs sm:text-sm text-muted-foreground">Require MFA for specific user roles</p>
                      </div>
                      
                      <div className="space-y-2 sm:space-y-3">
                        <div className="flex items-center justify-between gap-3 p-3 sm:p-4 border rounded-lg">
                          <div className="space-y-0.5 min-w-0 flex-1">
                            <Label className="text-sm sm:text-base font-medium">Administrators</Label>
                            <p className="text-xs sm:text-sm text-muted-foreground">Require MFA for admin users</p>
                          </div>
                          <Switch
                            checked={localSettings.two_factor_auth_enabled_admin}
                            onCheckedChange={(checked) => handleLocalSettingChange('two_factor_auth_enabled_admin', checked)}
                            disabled={saving}
                            className="flex-shrink-0"
                          />
                        </div>
                        
                        <div className="flex items-center justify-between gap-3 p-3 sm:p-4 border rounded-lg">
                          <div className="space-y-0.5 min-w-0 flex-1">
                            <Label className="text-sm sm:text-base font-medium">Teachers</Label>
                            <p className="text-xs sm:text-sm text-muted-foreground">Require MFA for teacher users</p>
                          </div>
                          <Switch
                            checked={localSettings.two_factor_auth_enabled_teachers}
                            onCheckedChange={(checked) => handleLocalSettingChange('two_factor_auth_enabled_teachers', checked)}
                            disabled={saving}
                            className="flex-shrink-0"
                          />
                        </div>
                        
                        <div className="flex items-center justify-between gap-3 p-3 sm:p-4 border rounded-lg">
                          <div className="space-y-0.5 min-w-0 flex-1">
                            <Label className="text-sm sm:text-base font-medium">Students</Label>
                            <p className="text-xs sm:text-sm text-muted-foreground">Require MFA for student users</p>
                          </div>
                          <Switch
                            checked={localSettings.two_factor_auth_enabled_students}
                            onCheckedChange={(checked) => handleLocalSettingChange('two_factor_auth_enabled_students', checked)}
                            disabled={saving}
                            className="flex-shrink-0"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm sm:text-base">Session Timeout (minutes)</Label>
                      <Select
                        value={localSettings.session_timeout_minutes.toString()}
                        onValueChange={(value) => handleLocalSettingChange('session_timeout_minutes', parseInt(value))}
                        disabled={saving}
                      >
                        <SelectTrigger className="h-9 sm:h-10 text-sm sm:text-base">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="15">15 minutes</SelectItem>
                          <SelectItem value="30">30 minutes</SelectItem>
                          <SelectItem value="60">1 hour</SelectItem>
                          <SelectItem value="120">2 hours</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm sm:text-base">Max Login Attempts</Label>
                      <Input
                        type="number"
                        value={localSettings.max_login_attempts}
                        onChange={(e) => handleLocalSettingChange('max_login_attempts', parseInt(e.target.value))}
                        min="1"
                        max="10"
                        disabled={saving}
                        className="h-9 sm:h-10 text-sm sm:text-base"
                      />
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* MFA Management Sub-tab */}
            <TabsContent value="mfa">
              <div className="space-y-4 sm:space-y-6">
                <div>
                  <h2 className="text-base sm:text-lg md:text-xl font-semibold break-words">User MFA Management</h2>
                  <p className="text-xs sm:text-sm text-muted-foreground break-words">Manage MFA settings for all users</p>
                </div>

                <Card>
                  <CardHeader className="p-3 sm:p-4 md:p-6">
                    <div>
                      <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                        <Users className="w-4 h-4 sm:w-5 sm:h-5" />
                        User MFA Management
                      </CardTitle>
                      <CardDescription className="text-xs sm:text-sm">
                        Manage MFA settings for all users. You can disable MFA for users who are having issues.
                      </CardDescription>
                    </div>
                  </CardHeader>
                  <CardContent className="p-3 sm:p-4 md:p-6 pt-0">
                    <UserMFAManagement />
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Security Alerts Sub-tab */}
            <TabsContent value="alerts">
              <div className="space-y-4 sm:space-y-6">
                <div>
                  <h2 className="text-base sm:text-lg md:text-xl font-semibold break-words">Security Alerts</h2>
                  <p className="text-xs sm:text-sm text-muted-foreground break-words">Monitor login security and blocked users</p>
                </div>
                <LoginSecurityAlerts />
              </div>
            </TabsContent>

            {/* Access Logs Sub-tab */}
            <TabsContent value="logs">
              <div className="space-y-4 sm:space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
                  <div className="min-w-0 flex-1">
                    <h2 className="text-base sm:text-lg md:text-xl font-semibold break-words">Access Logs</h2>
                    <p className="text-xs sm:text-sm text-muted-foreground break-words">Recent user access and activity logs</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleExportAccessLogs}
                      disabled={accessLogsExporting || accessLogsLoading}
                      className="flex items-center gap-2 h-8 sm:h-9 px-2 sm:px-3 text-xs sm:text-sm whitespace-nowrap"
                    >
                      {accessLogsExporting ? (
                        <Loader2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-spin" />
                      ) : (
                        <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      )}
                      <span className="hidden sm:inline">{accessLogsExporting ? 'Exporting...' : 'Export to Excel'}</span>
                      <span className="sm:hidden">{accessLogsExporting ? 'Exporting...' : 'Export'}</span>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => loadAccessLogs(true)}
                      disabled={accessLogsLoading}
                      className="flex items-center gap-2 h-8 sm:h-9 px-2 sm:px-3 text-xs sm:text-sm"
                    >
                      {accessLogsLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <RefreshCw className="w-4 h-4" />
                      )}
                      {accessLogsLoading ? 'Refreshing...' : 'Refresh'}
                    </Button>
                  </div>
                </div>

                <Card>
                  <CardHeader className="p-3 sm:p-4 md:p-6">
                    <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                      <FileText className="w-4 h-4 sm:w-5 sm:h-5" />
                      Access Logs
                    </CardTitle>
                    <CardDescription className="text-xs sm:text-sm">
                      Recent user access and activity logs
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-3 sm:p-4 md:p-6 pt-0">
                    <div 
                      ref={accessLogsRef}
                      className="max-h-96 overflow-y-auto"
                    >
                      {accessLogs.length === 0 ? (
                        <div className="text-center py-8 px-4">
                          <Activity className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                          <p className="text-muted-foreground">No access logs available</p>
                        </div>
                      ) : (
                        <>
                          <div className="space-y-3">
                            {accessLogs.map((log) => (
                              <Card key={log.id} className="border hover:shadow-md transition-shadow">
                                <CardContent className="p-3 sm:p-4">
                                  {/* Mobile & Desktop Layout */}
                                  <div className="flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-3">
                                    {/* Status Icon */}
                                    <div className="hidden sm:flex flex-shrink-0 mt-0.5">
                                      {getStatusIcon(log.status)}
                                    </div>
                                    
                                    {/* Content */}
                                    <div className="flex-1 min-w-0 space-y-2">
                                      {/* User and Status Badge */}
                                      <div className="flex flex-wrap items-center gap-2">
                                        <span className="font-medium text-sm sm:text-base truncate">
                                          {log.user_email}
                                        </span>
                                        <Badge 
                                          variant={log.status === 'success' ? 'default' : log.status === 'failed' ? 'destructive' : 'secondary'}
                                          className="text-xs flex-shrink-0"
                                        >
                                          <span className="sm:hidden mr-1">{getStatusIcon(log.status)}</span>
                                          {log.status}
                                        </Badge>
                                      </div>
                                      
                                      {/* Action */}
                                      {log.metadata?.details ? (
                                        <div className="space-y-1">
                                          <div className="font-medium text-xs sm:text-sm">{log.action}</div>
                                          <div className="text-xs text-muted-foreground">
                                            {typeof log.metadata.details === 'string' 
                                              ? log.metadata.details 
                                              : log.metadata.details.description || log.metadata.details.action || 'No additional details'
                                            }
                                          </div>
                                        </div>
                                      ) : (
                                        <div className="text-xs sm:text-sm">{log.action}</div>
                                      )}
                                      
                                      {/* Timestamp */}
                                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                        <Activity className="w-3 h-3 flex-shrink-0" />
                                        <span>{formatTimestamp(log.created_at)}</span>
                                      </div>
                                    </div>
                                  </div>
                                </CardContent>
                              </Card>
                            ))}
                          </div>
                          
                          {accessLogsLoading && (
                            <div className="flex items-center justify-center py-4">
                              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                              <span className="ml-2 text-xs sm:text-sm text-muted-foreground">Loading more logs...</span>
                            </div>
                          )}
                          {!accessLogsHasMore && accessLogs.length > 0 && (
                            <div className="text-center py-4">
                              <p className="text-xs sm:text-sm text-muted-foreground">No more logs to load</p>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
            </Tabs>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminSecurity;
