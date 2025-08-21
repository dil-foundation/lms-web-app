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
  Search
} from 'lucide-react';
import { toast } from 'sonner';
import SecurityService, { SecuritySetting, AccessLog, SecurityAlert, SecurityStats } from '@/services/securityService';
import { ContentLoader } from '@/components/ContentLoader';
import { supabase } from '@/integrations/supabase/client';

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
  const pageSize = 5;

  // Initial load
  useEffect(() => {
    loadUsers();
  }, []);

  // Debounce search term to avoid too many API calls
  useEffect(() => {
    if (searchTerm !== '') {
      const timer = setTimeout(() => {
        setCurrentPage(1); // Reset to first page when searching
        loadUsersWithSearch();
      }, 500);

      return () => clearTimeout(timer);
    }
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
      
      const { data, error } = await supabase.rpc('disable_mfa_for_user', {
        user_id: userId
      });

      if (error) throw error;

      toast.success('MFA disabled successfully');
      // Refresh the list using the appropriate loading function
      if (searchTerm) {
        loadUsersWithSearch();
      } else if (currentPage > 1) {
        loadUsersWithPagination();
      } else {
        loadUsers();
      }
    } catch (error) {
      console.error('Error disabling MFA:', error);
      toast.error('Failed to disable MFA');
    } finally {
      setDisablingMFA(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <ContentLoader message="Loading users..." />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">
            Total users: {totalUsers} | Users with MFA: {users.filter(u => u.mfa_enabled).length}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={loadUsersWithSearch}
          disabled={loading || searchLoading || paginationLoading}
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Search Input */}
      <div className="flex items-center space-x-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Search by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <div className="border rounded-lg relative">
        {(searchLoading || paginationLoading) && (
          <div className="absolute inset-0 bg-white/80 flex items-center justify-center z-10">
            <div className="flex items-center space-x-2">
              <div className="w-6 h-6 border-2 border-green-500 border-t-transparent rounded-full animate-spin"></div>
              <span className="text-sm text-green-600 font-medium">
                {searchLoading ? 'Searching...' : 'Loading page...'}
              </span>
            </div>
          </div>
        )}
        <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>MFA Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id}>
                <TableCell>
                  <div>
                    <p className="font-medium">{user.first_name} {user.last_name}</p>
                    <p className="text-sm text-muted-foreground">{user.email}</p>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="capitalize">
                    {user.role}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    {user.mfa_enabled ? (
                      <>
                        <Shield className="w-4 h-4 text-green-500" />
                        <Badge variant="default" className="bg-green-100 text-green-800">
                          Enabled
                        </Badge>
                      </>
                    ) : (
                      <>
                        <AlertTriangle className="w-4 h-4 text-gray-400" />
                        <Badge variant="secondary">
                          Disabled
                        </Badge>
                      </>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => disableMFAForUser(user.id)}
                    disabled={disablingMFA === user.id || !user.mfa_enabled}
                  >
                    {disablingMFA === user.id ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Disabling...
                      </>
                    ) : (
                      <>
                        <Key className="w-4 h-4 mr-2" />
                        Disable MFA
                      </>
                    )}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Page {currentPage} of {totalPages}
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1 || loading || searchLoading || paginationLoading}
            >
              <ChevronLeft className="w-4 h-4" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages || loading || searchLoading || paginationLoading}
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
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
  const [securityStats, setSecurityStats] = useState<SecurityStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Access logs states
  const [accessLogs, setAccessLogs] = useState<AccessLog[]>([]);
  const [accessLogsLoading, setAccessLogsLoading] = useState(false);
  const [accessLogsHasMore, setAccessLogsHasMore] = useState(true);
  const [accessLogsOffset, setAccessLogsOffset] = useState(0);
  const accessLogsRef = useRef<HTMLDivElement>(null);

  // Security alerts states
  const [securityAlerts, setSecurityAlerts] = useState<SecurityAlert[]>([]);
  const [securityAlertsLoading, setSecurityAlertsLoading] = useState(false);
  const [securityAlertsHasMore, setSecurityAlertsHasMore] = useState(true);
  const [securityAlertsOffset, setSecurityAlertsOffset] = useState(0);
  const securityAlertsRef = useRef<HTMLDivElement>(null);

  // Load all data on component mount
  useEffect(() => {
    loadSecurityData();
  }, []);

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
          settings.find(s => s.setting_key === 'two_factor_auth_enabled_admin')?.setting_value || 'false',
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
      setHasUnsavedChanges(false);

      // Load initial data for logs and alerts
      await Promise.all([
        loadAccessLogs(true),
        loadSecurityAlerts(true)
      ]);
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

  const loadSecurityAlerts = async (reset: boolean = false) => {
    if (securityAlertsLoading) return;

    try {
      setSecurityAlertsLoading(true);
      const offset = reset ? 0 : securityAlertsOffset;
      const alerts = await SecurityService.getSecurityAlerts(false, ITEMS_PER_PAGE, offset);
      
      if (reset) {
        setSecurityAlerts(alerts);
        setSecurityAlertsOffset(ITEMS_PER_PAGE);
      } else {
        setSecurityAlerts(prev => [...prev, ...alerts]);
        setSecurityAlertsOffset(prev => prev + ITEMS_PER_PAGE);
      }

      setSecurityAlertsHasMore(alerts.length === ITEMS_PER_PAGE);
    } catch (error) {
      console.error('Error loading security alerts:', error);
      toast.error('Failed to load security alerts');
    } finally {
      setSecurityAlertsLoading(false);
    }
  };

  // Track if there are unsaved changes
  useEffect(() => {
    const initialSettings = securitySettings.reduce((acc, setting) => {
      acc[setting.setting_key] = SecurityService.parseSettingValue(setting.setting_value, setting.setting_type);
      return acc;
    }, {} as Record<string, any>);

    const isChanged = Object.keys(localSettings).some(key => {
      return localSettings[key as keyof typeof localSettings] !== initialSettings[key];
    });
    setHasUnsavedChanges(isChanged);
  }, [localSettings, securitySettings]);

  const handleLocalSettingChange = (key: keyof typeof localSettings, value: any) => {
    setLocalSettings(prev => ({ ...prev, [key]: value }));
    setHasUnsavedChanges(true);
  };

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      const savePromises = Object.entries(localSettings).map(([key, value]) =>
        SecurityService.updateSecuritySetting(key, SecurityService.stringifySettingValue(value))
      );
      await Promise.all(savePromises);
      toast.success('Security settings updated successfully!');
      setHasUnsavedChanges(false);
      loadSecurityData(); // Reload all data to ensure consistency
    } catch (error) {
      console.error('Error saving security settings:', error);
      toast.error('Failed to save security settings');
    } finally {
      setSaving(false);
    }
  };

  const handleResetSettings = () => {
    const initialSettings = securitySettings.reduce((acc, setting) => {
      acc[setting.setting_key] = SecurityService.parseSettingValue(setting.setting_value, setting.setting_type);
      return acc;
    }, {} as Record<string, any>);
    setLocalSettings(initialSettings);
    setHasUnsavedChanges(false);
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
    const securityAlertsCurrent = securityAlertsRef.current;

    const handleAccessLogsScroll = () => handleScroll(accessLogsRef, loadAccessLogs, accessLogsHasMore, accessLogsLoading);
    const handleSecurityAlertsScroll = () => handleScroll(securityAlertsRef, loadSecurityAlerts, securityAlertsHasMore, securityAlertsLoading);

    if (accessLogsCurrent) {
      accessLogsCurrent.addEventListener('scroll', handleAccessLogsScroll);
    }
    if (securityAlertsCurrent) {
      securityAlertsCurrent.addEventListener('scroll', handleSecurityAlertsScroll);
    }

    return () => {
      if (accessLogsCurrent) {
        accessLogsCurrent.removeEventListener('scroll', handleAccessLogsScroll);
      }
      if (securityAlertsCurrent) {
        securityAlertsCurrent.removeEventListener('scroll', handleSecurityAlertsScroll);
      }
    };
  }, [loadAccessLogs, accessLogsHasMore, accessLogsLoading, loadSecurityAlerts, securityAlertsHasMore, securityAlertsLoading]);

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
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

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'high':
        return <Badge variant="destructive">High</Badge>;
      case 'medium':
        return <Badge variant="secondary">Medium</Badge>;
      case 'low':
        return <Badge variant="outline">Low</Badge>;
      default:
        return null;
    }
  };

  if (loading) {
    return <ContentLoader />;
  }

  return (
    <div className="space-y-6 p-6">
      <h1 className="text-3xl font-bold">Security Settings</h1>

      {/* Security Overview */}
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
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Active Sessions</p>
              <p className="text-2xl font-bold">{securityStats?.active_sessions || 0}</p>
            </div>
            <Activity className="w-8 h-8 text-blue-500" />
          </div>
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Failed Attempts</p>
              <p className="text-2xl font-bold text-red-600">{securityStats?.failed_attempts || 0}</p>
            </div>
            <AlertTriangle className="w-8 h-8 text-red-500" />
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

      {/* Security Settings */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Authentication Settings</CardTitle>
              <CardDescription>
                Configure authentication and access control policies
              </CardDescription>
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

      {/* Security Alerts */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            Security Alerts
          </CardTitle>
          <CardDescription>
            Recent security events and system notifications
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div 
            ref={securityAlertsRef}
            className="max-h-96 overflow-y-auto space-y-3 pr-2"
          >
            {securityAlerts.length === 0 ? (
              <div className="text-center py-8">
                <AlertTriangle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No security alerts at this time</p>
              </div>
            ) : (
              <>
                {securityAlerts.map((alert) => (
                  <div key={alert.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <AlertTriangle className="w-5 h-5 text-yellow-500" />
                      <div>
                        <p className="font-medium">{alert.message}</p>
                        <p className="text-sm text-muted-foreground">{formatTimestamp(alert.created_at)}</p>
                      </div>
                    </div>
                    {getSeverityBadge(alert.severity)}
                  </div>
                ))}
                {securityAlertsLoading && (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                    <span className="ml-2 text-sm text-muted-foreground">Loading more alerts...</span>
                  </div>
                )}
                {!securityAlertsHasMore && securityAlerts.length > 0 && (
                  <div className="text-center py-4">
                    <p className="text-sm text-muted-foreground">No more alerts to load</p>
                  </div>
                )}
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* User MFA Management */}
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

      {/* Access Logs */}
      <Card>
        <CardHeader>
          <div>
            <CardTitle>Access Logs</CardTitle>
            <CardDescription>
              Recent user access and activity logs
            </CardDescription>
          </div>
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
                      <TableHead>IP Address</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Timestamp</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {accessLogs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="font-medium">{log.user_email}</TableCell>
                        <TableCell>{log.action}</TableCell>
                        <TableCell>{log.ip_address}</TableCell>
                        <TableCell>{log.location}</TableCell>
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
  );
};

export default AdminSecurity;