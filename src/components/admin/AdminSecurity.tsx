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
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Search users..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleExportMFAUsers}
          disabled={exporting || loading}
          className="flex items-center gap-2"
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
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>MFA Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8">
                    <p className="text-muted-foreground">No users found</p>
                  </TableCell>
                </TableRow>
              ) : (
                users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{user.first_name} {user.last_name}</div>
                        <div className="text-sm text-muted-foreground">{user.email}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{formatRoleName(user.role)}</Badge>
                    </TableCell>
                    <TableCell>
                      {user.mfa_enabled ? (
                        <Badge className="bg-green-500">Enabled</Badge>
                      ) : (
                        <Badge variant="outline">Disabled</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => disableMFAForUser(user.id)}
                        disabled={!user.mfa_enabled || disablingMFA === user.id}
                      >
                        {disablingMFA === user.id ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <XCircle className="w-4 h-4 mr-2" />
                        )}
                        Disable MFA
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Page {currentPage} of {totalPages} ({totalUsers} total users)
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1 || paginationLoading}
                >
                  <ChevronLeft className="w-4 h-4" />
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages || paginationLoading}
                >
                  Next
                  <ChevronRight className="w-4 h-4" />
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
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-primary/10 to-primary/20 rounded-xl flex items-center justify-center">
            <Settings className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Settings and Security</h1>
            <p className="text-muted-foreground">Configure system-wide settings and security policies</p>
          </div>
        </div>
      </div>

      {/* Main Tabs: Settings and Security - Prominent Style */}
      <Tabs defaultValue="settings" className="space-y-6">
        <div className="border-b border-border/40 pb-0">
          <TabsList className="h-auto bg-transparent p-0 gap-2 w-full justify-start">
            <TabsTrigger 
              value="settings" 
              className="flex items-center gap-3 px-6 py-4 text-base font-semibold rounded-t-lg rounded-b-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-card data-[state=active]:shadow-sm transition-all duration-200 hover:bg-muted/50"
            >
              <div className="w-5 h-5 flex items-center justify-center">
                <Settings className="w-5 h-5" />
              </div>
              Settings
            </TabsTrigger>
            <TabsTrigger 
              value="security" 
              className="flex items-center gap-3 px-6 py-4 text-base font-semibold rounded-t-lg rounded-b-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-card data-[state=active]:shadow-sm transition-all duration-200 hover:bg-muted/50"
            >
              <div className="w-5 h-5 flex items-center justify-center">
                <Shield className="w-5 h-5" />
              </div>
              Security
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Settings Tab with Sub-tabs */}
        <TabsContent value="settings" className="mt-6">
          <div className="bg-card border rounded-lg p-6 space-y-6">
            <Tabs defaultValue="system" className="space-y-6">
              {/* Sub-tabs - Subtle Style */}
              <div className="border-b border-border/20 -mx-6 px-6">
                <TabsList className="h-auto bg-transparent p-0 gap-1 w-auto">
                  <TabsTrigger
                    value="system"
                    className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-t-lg rounded-b-none border-b-2 border-transparent data-[state=active]:border-primary/60 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:font-semibold transition-all duration-200 hover:bg-primary/90 hover:text-primary-foreground"
                  >
                    <Server className="w-4 h-4" />
                    System Configuration
                  </TabsTrigger>
                  <TabsTrigger
                    value="notifications"
                    className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-t-lg rounded-b-none border-b-2 border-transparent data-[state=active]:border-primary/60 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:font-semibold transition-all duration-200 hover:bg-primary/90 hover:text-primary-foreground"
                  >
                    <Bell className="w-4 h-4" />
                    Notifications
                  </TabsTrigger>
                </TabsList>
              </div>

            {/* System Configuration Sub-tab */}
            <TabsContent value="system">
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-semibold">System Configuration</h2>
                    <p className="text-sm text-muted-foreground">Configure system-wide settings and preferences</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button 
                      variant="outline" 
                      onClick={handleAdminSettingsReset}
                      disabled={adminSettingsResetting || adminSettingsSaving || adminSettingsLoading}
                    >
                      {adminSettingsResetting ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <RefreshCw className="w-4 h-4 mr-2" />
                      )}
                      {adminSettingsResetting ? 'Resetting...' : 'Reset'}
                    </Button>
                    <Button 
                      onClick={handleAdminSettingsSave} 
                      disabled={adminSettingsSaving || adminSettingsResetting || adminSettingsLoading || !hasUnsavedAdminChanges}
                    >
                      {adminSettingsSaving ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Save className="w-4 h-4 mr-2" />
                      )}
                      {adminSettingsSaving ? 'Saving...' : 'Save Changes'}
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
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-semibold">Notification Settings</h2>
                    <p className="text-sm text-muted-foreground">Configure system notification preferences</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button 
                      variant="outline" 
                      onClick={handleAdminSettingsReset}
                      disabled={adminSettingsResetting || adminSettingsSaving || adminSettingsLoading}
                    >
                      {adminSettingsResetting ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <RefreshCw className="w-4 h-4 mr-2" />
                      )}
                      {adminSettingsResetting ? 'Resetting...' : 'Reset'}
                    </Button>
                    <Button 
                      onClick={handleAdminSettingsSave} 
                      disabled={adminSettingsSaving || adminSettingsResetting || adminSettingsLoading || !hasUnsavedAdminChanges}
                    >
                      {adminSettingsSaving ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Save className="w-4 h-4 mr-2" />
                      )}
                      {adminSettingsSaving ? 'Saving...' : 'Save Changes'}
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
        <TabsContent value="security" className="mt-6">
          <div className="bg-card border rounded-lg p-6 space-y-6">
            <Tabs defaultValue="overview" className="space-y-6">
              {/* Sub-tabs - Subtle Style */}
              <div className="border-b border-border/20 -mx-6 px-6 overflow-x-auto">
                <TabsList className="h-auto bg-transparent p-0 gap-1 w-auto min-w-full">
                  <TabsTrigger
                    value="overview"
                    className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-t-lg rounded-b-none border-b-2 border-transparent data-[state=active]:border-primary/60 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:font-semibold transition-all duration-200 hover:bg-primary/90 hover:text-primary-foreground whitespace-nowrap"
                  >
                    <Activity className="w-4 h-4" />
                    Overview
                  </TabsTrigger>
                  <TabsTrigger
                    value="authentication"
                    className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-t-lg rounded-b-none border-b-2 border-transparent data-[state=active]:border-primary/60 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:font-semibold transition-all duration-200 hover:bg-primary/90 hover:text-primary-foreground whitespace-nowrap"
                  >
                    <Lock className="w-4 h-4" />
                    Authentication
                  </TabsTrigger>
                  <TabsTrigger
                    value="mfa"
                    className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-t-lg rounded-b-none border-b-2 border-transparent data-[state=active]:border-primary/60 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:font-semibold transition-all duration-200 hover:bg-primary/90 hover:text-primary-foreground whitespace-nowrap"
                  >
                    <Key className="w-4 h-4" />
                    MFA Management
                  </TabsTrigger>
                  <TabsTrigger
                    value="alerts"
                    className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-t-lg rounded-b-none border-b-2 border-transparent data-[state=active]:border-primary/60 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:font-semibold transition-all duration-200 hover:bg-primary/90 hover:text-primary-foreground whitespace-nowrap"
                  >
                    <AlertTriangle className="w-4 h-4" />
                    Security Alerts
                  </TabsTrigger>
                  <TabsTrigger
                    value="logs"
                    className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-t-lg rounded-b-none border-b-2 border-transparent data-[state=active]:border-primary/60 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:font-semibold transition-all duration-200 hover:bg-primary/90 hover:text-primary-foreground whitespace-nowrap"
                  >
                    <FileText className="w-4 h-4" />
                    Access Logs
                  </TabsTrigger>
                </TabsList>
              </div>

            {/* Security Overview Sub-tab */}
            <TabsContent value="overview">
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-semibold">Security Overview</h2>
                  <p className="text-sm text-muted-foreground">Current security status and key metrics</p>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Shield className="w-5 h-5" />
                      Security Overview
                    </CardTitle>
                    <CardDescription>
                      Current security status and key metrics
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Active Sessions</p>
                        <p className="text-2xl font-bold">{securityStats?.active_sessions || 0}</p>
                      </div>
                      <Activity className="w-8 h-8 text-blue-500" />
                    </div>
                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">2FA Enabled</p>
                        <p className="text-2xl font-bold">{securityStats?.two_fa_enabled_percentage || 0}%</p>
                      </div>
                      <Shield className="w-8 h-8 text-green-500" />
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Authentication Settings Sub-tab */}
            <TabsContent value="authentication">
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-semibold">Authentication Settings</h2>
                    <p className="text-sm text-muted-foreground">Configure authentication and access control policies</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {hasUnsavedChanges && (
                      <Badge variant="secondary" className="text-orange-600 bg-orange-50">
                        Unsaved Changes
                      </Badge>
                    )}
                    <Button
                      variant="outline"
                      onClick={handleResetSettings}
                      disabled={!hasUnsavedChanges || saving}
                    >
                      Reset
                    </Button>
                    <Button
                      onClick={handleSaveSettings}
                      disabled={!hasUnsavedChanges || saving}
                      className="flex items-center gap-2"
                    >
                      <Save className="w-4 h-4" />
                      {saving ? 'Saving...' : 'Save Changes'}
                    </Button>
                  </div>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle>Authentication Settings</CardTitle>
                    <CardDescription>
                      Configure authentication and access control policies
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>Two-Factor Authentication</Label>
                        <p className="text-sm text-muted-foreground">Require MFA for specific user roles</p>
                      </div>
                      
                      <div className="space-y-3">
                        <div className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="space-y-0.5">
                            <Label className="text-base font-medium">Administrators</Label>
                            <p className="text-sm text-muted-foreground">Require MFA for admin users</p>
                          </div>
                          <Switch
                            checked={localSettings.two_factor_auth_enabled_admin}
                            onCheckedChange={(checked) => handleLocalSettingChange('two_factor_auth_enabled_admin', checked)}
                            disabled={saving}
                          />
                        </div>
                        
                        <div className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="space-y-0.5">
                            <Label className="text-base font-medium">Teachers</Label>
                            <p className="text-sm text-muted-foreground">Require MFA for teacher users</p>
                          </div>
                          <Switch
                            checked={localSettings.two_factor_auth_enabled_teachers}
                            onCheckedChange={(checked) => handleLocalSettingChange('two_factor_auth_enabled_teachers', checked)}
                            disabled={saving}
                          />
                        </div>
                        
                        <div className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="space-y-0.5">
                            <Label className="text-base font-medium">Students</Label>
                            <p className="text-sm text-muted-foreground">Require MFA for student users</p>
                          </div>
                          <Switch
                            checked={localSettings.two_factor_auth_enabled_students}
                            onCheckedChange={(checked) => handleLocalSettingChange('two_factor_auth_enabled_students', checked)}
                            disabled={saving}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Session Timeout (minutes)</Label>
                      <Select
                        value={localSettings.session_timeout_minutes.toString()}
                        onValueChange={(value) => handleLocalSettingChange('session_timeout_minutes', parseInt(value))}
                        disabled={saving}
                      >
                        <SelectTrigger>
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
                      <Label>Max Login Attempts</Label>
                      <Input
                        type="number"
                        value={localSettings.max_login_attempts}
                        onChange={(e) => handleLocalSettingChange('max_login_attempts', parseInt(e.target.value))}
                        min="1"
                        max="10"
                        disabled={saving}
                      />
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* MFA Management Sub-tab */}
            <TabsContent value="mfa">
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-semibold">User MFA Management</h2>
                  <p className="text-sm text-muted-foreground">Manage MFA settings for all users</p>
                </div>

                <Card>
                  <CardHeader>
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Users className="w-5 h-5" />
                        User MFA Management
                      </CardTitle>
                      <CardDescription>
                        Manage MFA settings for all users. You can disable MFA for users who are having issues.
                      </CardDescription>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <UserMFAManagement />
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Security Alerts Sub-tab */}
            <TabsContent value="alerts">
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-semibold">Security Alerts</h2>
                  <p className="text-sm text-muted-foreground">Monitor login security and blocked users</p>
                </div>
                <LoginSecurityAlerts />
              </div>
            </TabsContent>

            {/* Access Logs Sub-tab */}
            <TabsContent value="logs">
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-semibold">Access Logs</h2>
                    <p className="text-sm text-muted-foreground">Recent user access and activity logs</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleExportAccessLogs}
                      disabled={accessLogsExporting || accessLogsLoading}
                      className="flex items-center gap-2"
                    >
                      {accessLogsExporting ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Download className="w-4 h-4" />
                      )}
                      {accessLogsExporting ? 'Exporting...' : 'Export to Excel'}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => loadAccessLogs(true)}
                      disabled={accessLogsLoading}
                      className="flex items-center gap-2"
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
                  <CardHeader>
                    <CardTitle>Access Logs</CardTitle>
                    <CardDescription>
                      Recent user access and activity logs
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div 
                      ref={accessLogsRef}
                      className="max-h-96 overflow-y-auto"
                    >
                      {accessLogs.length === 0 ? (
                        <div className="text-center py-8">
                          <Activity className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                          <p className="text-muted-foreground">No access logs available</p>
                        </div>
                      ) : (
                        <>
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>User</TableHead>
                                <TableHead>Action</TableHead>
                                <TableHead>Timestamp</TableHead>
                                <TableHead>Status</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {accessLogs.map((log) => (
                                <TableRow key={log.id}>
                                  <TableCell className="font-medium">{log.user_email}</TableCell>
                                  <TableCell>
                                    {log.metadata?.details ? (
                                      <div className="space-y-1">
                                        <div className="font-medium">{log.action}</div>
                                        <div className="text-sm text-muted-foreground">
                                          {typeof log.metadata.details === 'string' 
                                            ? log.metadata.details 
                                            : log.metadata.details.description || log.metadata.details.action || 'No additional details'
                                          }
                                        </div>
                                      </div>
                                    ) : (
                                      log.action
                                    )}
                                  </TableCell>
                                  <TableCell>{formatTimestamp(log.created_at)}</TableCell>
                                  <TableCell>
                                    <div className="flex items-center gap-2">
                                      {getStatusIcon(log.status)}
                                      <Badge variant={log.status === 'success' ? 'default' : log.status === 'failed' ? 'destructive' : 'secondary'}>
                                        {log.status}
                                      </Badge>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                          {accessLogsLoading && (
                            <div className="flex items-center justify-center py-4">
                              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                              <span className="ml-2 text-sm text-muted-foreground">Loading more logs...</span>
                            </div>
                          )}
                          {!accessLogsHasMore && accessLogs.length > 0 && (
                            <div className="text-center py-4">
                              <p className="text-sm text-muted-foreground">No more logs to load</p>
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
