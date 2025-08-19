import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Shield, Key, Clock, AlertTriangle, CheckCircle, XCircle, Eye, EyeOff, Activity, Download, Upload, Save, Loader2 } from 'lucide-react';
import { ContentLoader } from '@/components/ContentLoader';
import { toast } from 'sonner';
import SecurityService, { SecuritySetting, AccessLog, SecurityAlert, SecurityStats } from '@/services/securityService';
import { useAuth } from '@/hooks/useAuth';

const ITEMS_PER_PAGE = 20;

export const AdminSecurity = () => {
  const { user } = useAuth();
  const [securitySettings, setSecuritySettings] = useState<SecuritySetting[]>([]);
  const [accessLogs, setAccessLogs] = useState<AccessLog[]>([]);
  const [securityAlerts, setSecurityAlerts] = useState<SecurityAlert[]>([]);
  const [securityStats, setSecurityStats] = useState<SecurityStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Pagination states
  const [accessLogsLoading, setAccessLogsLoading] = useState(false);
  const [securityAlertsLoading, setSecurityAlertsLoading] = useState(false);
  const [accessLogsHasMore, setAccessLogsHasMore] = useState(true);
  const [securityAlertsHasMore, setSecurityAlertsHasMore] = useState(true);
  const [accessLogsOffset, setAccessLogsOffset] = useState(0);
  const [securityAlertsOffset, setSecurityAlertsOffset] = useState(0);

  // Refs for scroll detection
  const accessLogsRef = useRef<HTMLDivElement>(null);
  const securityAlertsRef = useRef<HTMLDivElement>(null);

  // Local state for form values (not saved to database yet)
  const [localSettings, setLocalSettings] = useState({
    two_factor_auth_enabled: false,
    session_timeout_minutes: 30,
    max_login_attempts: 5
  });

  // Track if there are unsaved changes
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

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
        two_factor_auth_enabled: SecurityService.parseSettingValue(
          settings.find(s => s.setting_key === 'two_factor_auth_enabled')?.setting_value || 'false',
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

  // Scroll handlers
  const handleAccessLogsScroll = useCallback(() => {
    if (!accessLogsRef.current || accessLogsLoading || !accessLogsHasMore) return;

    const { scrollTop, scrollHeight, clientHeight } = accessLogsRef.current;
    if (scrollTop + clientHeight >= scrollHeight - 100) {
      loadAccessLogs();
    }
  }, [accessLogsLoading, accessLogsHasMore]);

  const handleSecurityAlertsScroll = useCallback(() => {
    if (!securityAlertsRef.current || securityAlertsLoading || !securityAlertsHasMore) return;

    const { scrollTop, scrollHeight, clientHeight } = securityAlertsRef.current;
    if (scrollTop + clientHeight >= scrollHeight - 100) {
      loadSecurityAlerts();
    }
  }, [securityAlertsLoading, securityAlertsHasMore]);

  // Add scroll listeners
  useEffect(() => {
    const accessLogsElement = accessLogsRef.current;
    const securityAlertsElement = securityAlertsRef.current;

    if (accessLogsElement) {
      accessLogsElement.addEventListener('scroll', handleAccessLogsScroll);
    }
    if (securityAlertsElement) {
      securityAlertsElement.addEventListener('scroll', handleSecurityAlertsScroll);
    }

    return () => {
      if (accessLogsElement) {
        accessLogsElement.removeEventListener('scroll', handleAccessLogsScroll);
      }
      if (securityAlertsElement) {
        securityAlertsElement.removeEventListener('scroll', handleSecurityAlertsScroll);
      }
    };
  }, [handleAccessLogsScroll, handleSecurityAlertsScroll]);

  const handleLocalSettingChange = (settingKey: string, value: any) => {
    setLocalSettings(prev => ({
      ...prev,
      [settingKey]: value
    }));
    setHasUnsavedChanges(true);
  };

  const handleSaveSettings = async () => {
    try {
      setSaving(true);
      
      // Save all settings to database
      const savePromises = Object.entries(localSettings).map(([key, value]) =>
        SecurityService.updateSecuritySetting(key, SecurityService.stringifySettingValue(value))
      );

      await Promise.all(savePromises);

      // Update the security settings state with new values
      setSecuritySettings(prev => 
        prev.map(setting => {
          const newValue = localSettings[setting.setting_key as keyof typeof localSettings];
          if (newValue !== undefined) {
            return {
              ...setting,
              setting_value: SecurityService.stringifySettingValue(newValue)
            };
          }
          return setting;
        })
      );

      setHasUnsavedChanges(false);
      toast.success('Security settings saved successfully');
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Failed to save security settings');
    } finally {
      setSaving(false);
    }
  };

  const handleResetSettings = () => {
    // Reset local settings to database values
    const resetLocalSettings = {
      two_factor_auth_enabled: SecurityService.parseSettingValue(
        securitySettings.find(s => s.setting_key === 'two_factor_auth_enabled')?.setting_value || 'false',
        'boolean'
      ) as boolean,
      session_timeout_minutes: SecurityService.parseSettingValue(
        securitySettings.find(s => s.setting_key === 'session_timeout_minutes')?.setting_value || '30',
        'integer'
      ) as number,
      max_login_attempts: SecurityService.parseSettingValue(
        securitySettings.find(s => s.setting_key === 'max_login_attempts')?.setting_value || '5',
        'integer'
      ) as number
    };

    setLocalSettings(resetLocalSettings);
    setHasUnsavedChanges(false);
    toast.info('Settings reset to saved values');
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
    }
  };

  const getSeverityBadge = (severity: string) => {
    const variants = {
      high: 'destructive',
      medium: 'secondary',
      low: 'default'
    } as const;
    
    return <Badge variant={variants[severity as keyof typeof variants]}>{severity}</Badge>;
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <ContentLoader message="Loading security settings..." />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Security Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Security Overview
          </CardTitle>
          <CardDescription>
            Monitor and manage system security settings and access controls
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
                <p className="text-2xl font-bold text-green-600">{securityStats?.two_fa_enabled_percentage || 0}%</p>
              </div>
              <Key className="w-8 h-8 text-green-500" />
            </div>
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
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Two-Factor Authentication</Label>
              <p className="text-sm text-muted-foreground">Require 2FA for all users</p>
            </div>
            <Switch
              checked={localSettings.two_factor_auth_enabled}
              onCheckedChange={(checked) => handleLocalSettingChange('two_factor_auth_enabled', checked)}
              disabled={saving}
            />
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
                            <span className="capitalize">{log.status}</span>
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