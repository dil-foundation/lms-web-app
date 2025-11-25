import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Shield,
  AlertTriangle,
  Clock,
  Users,
  RefreshCw,
  Unlock,
  Eye,
  TrendingUp,
  TrendingDown,
  Loader2,
  Download
} from 'lucide-react';
import { toast } from 'sonner';
import LoginSecurityService, {
  SecurityStats,
  BlockedUser,
  LoginAttempt
} from '@/services/loginSecurityService';
import { formatDistanceToNow } from 'date-fns';
import { useAuth } from '@/hooks/useAuth';
import AccessLogService from '@/services/accessLogService';
import exportEdgeFunctionsService from '@/services/exportEdgeFunctionsService';
import { exportBlockedUsers as exportBlockedUsersToExcel, exportLoginAttempts as exportLoginAttemptsToExcel } from '@/services/excelExportService';

const LoginSecurityAlerts = () => {
  const { user } = useAuth();
  const [securityStats, setSecurityStats] = useState<SecurityStats | null>(null);
  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([]);
  const [recentAttempts, setRecentAttempts] = useState<LoginAttempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [unblocking, setUnblocking] = useState<string | null>(null);

  // Pagination states for recent login attempts
  const [attemptsLoading, setAttemptsLoading] = useState(false);
  const [attemptsHasMore, setAttemptsHasMore] = useState(true);
  const [attemptsOffset, setAttemptsOffset] = useState(0);
  const attemptsRef = useRef<HTMLDivElement>(null);

  // Pagination states for blocked users
  const [blockedUsersLoading, setBlockedUsersLoading] = useState(false);
  const [blockedUsersHasMore, setBlockedUsersHasMore] = useState(true);
  const [blockedUsersOffset, setBlockedUsersOffset] = useState(0);
  const blockedUsersRef = useRef<HTMLDivElement>(null);

  // Export states
  const [exportingBlockedUsers, setExportingBlockedUsers] = useState(false);
  const [exportingLoginAttempts, setExportingLoginAttempts] = useState(false);

  const ITEMS_PER_PAGE = 20;

  useEffect(() => {
    loadSecurityData();
  }, []);

  // Scroll event listeners for infinite scrolling
  useEffect(() => {
    const handleAttemptsScroll = () => {
      if (attemptsRef.current) {
        const { scrollTop, scrollHeight, clientHeight } = attemptsRef.current;
        if (scrollTop + clientHeight >= scrollHeight - 50 && attemptsHasMore && !attemptsLoading) {
          loadRecentAttempts();
        }
      }
    };

    const handleBlockedUsersScroll = () => {
      if (blockedUsersRef.current) {
        const { scrollTop, scrollHeight, clientHeight } = blockedUsersRef.current;
        if (scrollTop + clientHeight >= scrollHeight - 50 && blockedUsersHasMore && !blockedUsersLoading) {
          loadBlockedUsers();
        }
      }
    };

    const attemptsCurrent = attemptsRef.current;
    const blockedUsersCurrent = blockedUsersRef.current;

    if (attemptsCurrent) {
      attemptsCurrent.addEventListener('scroll', handleAttemptsScroll);
    }
    if (blockedUsersCurrent) {
      blockedUsersCurrent.addEventListener('scroll', handleBlockedUsersScroll);
    }

    return () => {
      if (attemptsCurrent) {
        attemptsCurrent.removeEventListener('scroll', handleAttemptsScroll);
      }
      if (blockedUsersCurrent) {
        blockedUsersCurrent.removeEventListener('scroll', handleBlockedUsersScroll);
      }
    };
  }, [attemptsHasMore, attemptsLoading, blockedUsersHasMore, blockedUsersLoading]);

  const loadSecurityData = async () => {
    setLoading(true);
    try {
      const stats = await LoginSecurityService.getSecurityStats(24);
      setSecurityStats(stats);
      
      // Load initial data for both tables
      await Promise.all([
        loadBlockedUsers(true),
        loadRecentAttempts(true)
      ]);
    } catch (error) {
      console.error('Error loading security data:', error);
      toast.error('Failed to load security data');
    } finally {
      setLoading(false);
    }
  };

  const loadBlockedUsers = async (reset: boolean = false) => {
    if (blockedUsersLoading) return;

    try {
      setBlockedUsersLoading(true);
      const offset = reset ? 0 : blockedUsersOffset;
      const blocked = await LoginSecurityService.getBlockedUsers(ITEMS_PER_PAGE, offset);
      
      if (reset) {
        setBlockedUsers(blocked);
        setBlockedUsersOffset(ITEMS_PER_PAGE);
      } else {
        setBlockedUsers(prev => [...prev, ...blocked]);
        setBlockedUsersOffset(prev => prev + ITEMS_PER_PAGE);
      }

      setBlockedUsersHasMore(blocked.length === ITEMS_PER_PAGE);
    } catch (error) {
      console.error('Error loading blocked users:', error);
      toast.error('Failed to load blocked users');
    } finally {
      setBlockedUsersLoading(false);
    }
  };

  const loadRecentAttempts = async (reset: boolean = false) => {
    if (attemptsLoading) return;

    try {
      setAttemptsLoading(true);
      const offset = reset ? 0 : attemptsOffset;
      const attempts = await LoginSecurityService.getRecentLoginAttempts(ITEMS_PER_PAGE, offset);
      
      if (reset) {
        setRecentAttempts(attempts);
        setAttemptsOffset(ITEMS_PER_PAGE);
      } else {
        setRecentAttempts(prev => [...prev, ...attempts]);
        setAttemptsOffset(prev => prev + ITEMS_PER_PAGE);
      }

      setAttemptsHasMore(attempts.length === ITEMS_PER_PAGE);
    } catch (error) {
      console.error('Error loading recent attempts:', error);
      toast.error('Failed to load recent attempts');
    } finally {
      setAttemptsLoading(false);
    }
  };

  const handleUnblockUser = async (email: string) => {
    setUnblocking(email);
    try {
      await LoginSecurityService.unblockUser(email);

      // Log admin unblock action in access logs
      if (user) {
        await AccessLogService.logSecurityEvent(
          user.id,
          user.email || 'unknown@email.com',
          'Admin Unblocked User',
          'medium',
          `Admin ${user.email} unblocked user ${email} from login restrictions`
        );
      }

      toast.success(`User ${email} has been unblocked`);
      // Refresh blocked users data
      await loadBlockedUsers(true);
      // Refresh security stats
      const stats = await LoginSecurityService.getSecurityStats(24);
      setSecurityStats(stats);
    } catch (error) {
      console.error('Error unblocking user:', error);
      toast.error('Failed to unblock user');
    } finally {
      setUnblocking(null);
    }
  };

  const handleExportBlockedUsers = async () => {
    try {
      setExportingBlockedUsers(true);
      toast.info('Exporting blocked users...');

      // Fetch all blocked users without pagination
      const allBlockedUsers = await exportEdgeFunctionsService.exportBlockedUsers();

      if (allBlockedUsers.length === 0) {
        toast.warning('No blocked users found to export');
        return;
      }

      // Export to Excel
      exportBlockedUsersToExcel(allBlockedUsers, `blocked-users-export-${new Date().toISOString().split('T')[0]}`);

      toast.success(`Successfully exported ${allBlockedUsers.length} blocked users`);
    } catch (error) {
      console.error('Error exporting blocked users:', error);
      toast.error('Failed to export blocked users');
    } finally {
      setExportingBlockedUsers(false);
    }
  };

  const handleExportLoginAttempts = async () => {
    try {
      setExportingLoginAttempts(true);
      toast.info('Exporting login attempts...');

      // Fetch all login attempts without pagination (no time filter)
      const allAttempts = await exportEdgeFunctionsService.exportLoginAttempts();

      if (allAttempts.length === 0) {
        toast.warning('No login attempts found to export');
        return;
      }

      // Export to Excel
      exportLoginAttemptsToExcel(allAttempts, `login-attempts-export-${new Date().toISOString().split('T')[0]}`);

      toast.success(`Successfully exported ${allAttempts.length} login attempts`);
    } catch (error) {
      console.error('Error exporting login attempts:', error);
      toast.error('Failed to export login attempts');
    } finally {
      setExportingLoginAttempts(false);
    }
  };

  const getSeverityColor = (attempts: number, maxAttempts: number) => {
    const ratio = attempts / maxAttempts;
    if (ratio >= 0.8) return 'destructive';
    if (ratio >= 0.6) return 'warning';
    return 'default';
  };

  const getAttemptStatusIcon = (success: boolean) => {
    return success ? (
      <div className="w-2 h-2 bg-green-500 rounded-full" />
    ) : (
      <div className="w-2 h-2 bg-red-500 rounded-full" />
    );
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Login Security Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center py-8">
              <div className="flex flex-col items-center space-y-2">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Loading security data...</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Security Overview */}
      <Card>
        <CardHeader className="p-3 sm:p-4 md:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
            <div className="min-w-0 flex-1">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <Shield className="w-4 h-4 sm:w-5 sm:h-5 text-primary flex-shrink-0" />
                <span>Login Security Overview</span>
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                Last 24 hours security statistics and alerts
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={loadSecurityData}
              disabled={loading}
              className="flex items-center gap-2 h-8 sm:h-9 px-2 sm:px-3 text-xs sm:text-sm flex-shrink-0"
            >
              {loading ? (
                <Loader2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              )}
              {loading ? 'Refreshing...' : 'Refresh'}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-3 sm:p-4 md:p-6 pt-0">
          {securityStats && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              <div className="p-3 sm:p-4 border rounded-lg">
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-500 flex-shrink-0" />
                  <span className="text-xs sm:text-sm font-medium">Total Attempts</span>
                </div>
                <p className="text-xl sm:text-2xl font-bold mt-1">{securityStats.totalAttempts}</p>
              </div>
              
              <div className="p-3 sm:p-4 border rounded-lg">
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <TrendingUp className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-green-500 flex-shrink-0" />
                  <span className="text-xs sm:text-sm font-medium">Successful</span>
                </div>
                <p className="text-xl sm:text-2xl font-bold mt-1 text-green-600">{securityStats.successfulAttempts}</p>
              </div>
              
              <div className="p-3 sm:p-4 border rounded-lg">
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <TrendingDown className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-red-500 flex-shrink-0" />
                  <span className="text-xs sm:text-sm font-medium">Failed</span>
                </div>
                <p className="text-xl sm:text-2xl font-bold mt-1 text-red-600">{securityStats.failedAttempts}</p>
              </div>
              
              <div className="p-3 sm:p-4 border rounded-lg">
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <AlertTriangle className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-orange-500 flex-shrink-0" />
                  <span className="text-xs sm:text-sm font-medium">Blocked Users</span>
                </div>
                <p className="text-xl sm:text-2xl font-bold mt-1 text-orange-600">{securityStats.blockedUsersCount}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Blocked Users */}
      <Card>
        <CardHeader className="p-3 sm:p-4 md:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
            <div className="min-w-0 flex-1">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 text-orange-500 flex-shrink-0" />
                <span>Currently Blocked Users</span>
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                Users who have been temporarily blocked due to security violations
              </CardDescription>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportBlockedUsers}
                disabled={exportingBlockedUsers || blockedUsersLoading}
                className="flex items-center gap-2 h-8 sm:h-9 px-2 sm:px-3 text-xs sm:text-sm"
              >
                {exportingBlockedUsers ? (
                  <Loader2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-spin" />
                ) : (
                  <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                )}
                <span className="hidden sm:inline">{exportingBlockedUsers ? 'Exporting...' : 'Export'}</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => loadBlockedUsers(true)}
                disabled={blockedUsersLoading}
                className="flex items-center gap-2 h-8 sm:h-9 px-2 sm:px-3 text-xs sm:text-sm"
              >
                {blockedUsersLoading ? (
                  <Loader2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-spin" />
                ) : (
                  <RefreshCw className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                )}
                <span className="hidden sm:inline">{blockedUsersLoading ? 'Refreshing...' : 'Refresh'}</span>
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-3 sm:p-4 md:p-6 pt-0">
          <div 
            ref={blockedUsersRef}
            className="max-h-96 overflow-y-auto"
          >
            {blockedUsers.length > 0 ? (
              <>
                <div className="space-y-3">
                  {blockedUsers.map((user) => (
                    <Card key={user.id} className="border hover:shadow-md transition-shadow">
                      <CardContent className="p-3 sm:p-4">
                        <div className="flex flex-col sm:flex-row sm:items-start gap-3">
                          {/* User Info */}
                          <div className="flex-1 min-w-0 space-y-2">
                            <div className="font-medium text-sm sm:text-base truncate">
                              {user.email}
                            </div>
                            
                            {/* Badges and Info */}
                            <div className="flex flex-wrap items-center gap-2">
                              <Badge variant="destructive" className="text-xs">
                                {user.blockReason}
                              </Badge>
                              <Badge variant="outline" className="text-xs">
                                {user.attemptsCount} attempts
                              </Badge>
                            </div>
                            
                            {/* Time Info */}
                            <div className="flex items-center gap-1.5 text-xs sm:text-sm text-muted-foreground">
                              <Clock className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                              <span>
                                Blocked until {formatDistanceToNow(new Date(user.blockedUntil), { addSuffix: true })}
                              </span>
                            </div>
                          </div>
                          
                          {/* Action Button */}
                          <div className="flex-shrink-0">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleUnblockUser(user.email)}
                              disabled={unblocking === user.email}
                              className="w-full sm:w-auto h-8 sm:h-9 text-xs sm:text-sm"
                            >
                              {unblocking === user.email ? (
                                <RefreshCw className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 animate-spin" />
                              ) : (
                                <Unlock className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5" />
                              )}
                              {unblocking === user.email ? 'Unblocking...' : 'Unblock'}
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
                
                {blockedUsersLoading && (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                    <span className="ml-2 text-xs sm:text-sm text-muted-foreground">Loading more blocked users...</span>
                  </div>
                )}
                {!blockedUsersHasMore && blockedUsers.length > 0 && (
                  <div className="text-center py-4">
                    <p className="text-xs sm:text-sm text-muted-foreground">No more blocked users to load</p>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-8 px-4">
                <AlertTriangle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground text-sm">No blocked users found</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Recent Login Attempts */}
      <Card>
        <CardHeader className="p-3 sm:p-4 md:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
            <div className="min-w-0 flex-1">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <Eye className="w-4 h-4 sm:w-5 sm:h-5 text-blue-500 flex-shrink-0" />
                <span>Recent Login Attempts</span>
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                Latest login attempts across the system
              </CardDescription>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportLoginAttempts}
                disabled={exportingLoginAttempts || attemptsLoading}
                className="flex items-center gap-2 h-8 sm:h-9 px-2 sm:px-3 text-xs sm:text-sm"
              >
                {exportingLoginAttempts ? (
                  <Loader2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-spin" />
                ) : (
                  <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                )}
                <span className="hidden sm:inline">{exportingLoginAttempts ? 'Exporting...' : 'Export'}</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => loadRecentAttempts(true)}
                disabled={attemptsLoading}
                className="flex items-center gap-2 h-8 sm:h-9 px-2 sm:px-3 text-xs sm:text-sm"
              >
                {attemptsLoading ? (
                  <Loader2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-spin" />
                ) : (
                  <RefreshCw className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                )}
                <span className="hidden sm:inline">{attemptsLoading ? 'Refreshing...' : 'Refresh'}</span>
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-3 sm:p-4 md:p-6 pt-0">
          <div 
            ref={attemptsRef}
            className="max-h-96 overflow-y-auto"
          >
            {recentAttempts.length > 0 ? (
              <>
                <div className="space-y-3">
                  {recentAttempts.map((attempt) => (
                    <Card key={attempt.id} className="border hover:shadow-md transition-shadow">
                      <CardContent className="p-3 sm:p-4">
                        <div className="flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-3">
                          {/* Status Indicator (hidden on mobile, visible on desktop) */}
                          <div className="hidden sm:flex flex-shrink-0 mt-0.5">
                            {getAttemptStatusIcon(attempt.success)}
                          </div>
                          
                          {/* Content */}
                          <div className="flex-1 min-w-0 space-y-2">
                            {/* Email and Status Badge */}
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-medium text-sm sm:text-base truncate">
                                {attempt.email}
                              </span>
                              <Badge 
                                variant={attempt.success ? 'default' : 'destructive'}
                                className="text-xs flex-shrink-0"
                              >
                                <span className="sm:hidden mr-1">{getAttemptStatusIcon(attempt.success)}</span>
                                {attempt.success ? 'Success' : 'Failed'}
                              </Badge>
                            </div>
                            
                            {/* Time */}
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                              <Clock className="w-3 h-3 flex-shrink-0" />
                              <span>{formatDistanceToNow(new Date(attempt.attemptTime), { addSuffix: true })}</span>
                            </div>
                            
                            {/* Failure Reason (if any) */}
                            {attempt.failureReason && (
                              <div className="text-xs text-muted-foreground">
                                <span className="font-medium">Reason:</span> {attempt.failureReason}
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
                
                {attemptsLoading && (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                    <span className="ml-2 text-xs sm:text-sm text-muted-foreground">Loading more attempts...</span>
                  </div>
                )}
                {!attemptsHasMore && recentAttempts.length > 0 && (
                  <div className="text-center py-4">
                    <p className="text-xs sm:text-sm text-muted-foreground">No more attempts to load</p>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-8 px-4">
                <Eye className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground text-sm">No recent login attempts found</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Security Alerts */}
      {securityStats && securityStats.failedAttempts > 0 && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Security Alert:</strong> {securityStats.failedAttempts} failed login attempts detected in the last 24 hours. 
            {securityStats.blockedUsersCount > 0 && (
              <span> {securityStats.blockedUsersCount} user(s) have been automatically blocked.</span>
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* No Security Issues */}
      {securityStats && securityStats.failedAttempts === 0 && securityStats.blockedUsersCount === 0 && (
        <Alert>
          <Shield className="h-4 w-4" />
          <AlertDescription>
            <strong>All Clear:</strong> No security issues detected in the last 24 hours. 
            All login attempts were successful.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};

export default LoginSecurityAlerts;
