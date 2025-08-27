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
  Loader2
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
    <div className="space-y-6">
      {/* Security Overview */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-primary" />
                Login Security Overview
              </CardTitle>
              <CardDescription>
                Last 24 hours security statistics and alerts
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={loadSecurityData}
              disabled={loading}
              className="flex items-center gap-2"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
              {loading ? 'Refreshing...' : 'Refresh'}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {securityStats && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 border rounded-lg">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-blue-500" />
                  <span className="text-sm font-medium">Total Attempts</span>
                </div>
                <p className="text-2xl font-bold mt-1">{securityStats.totalAttempts}</p>
              </div>
              
              <div className="p-4 border rounded-lg">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-green-500" />
                  <span className="text-sm font-medium">Successful</span>
                </div>
                <p className="text-2xl font-bold mt-1 text-green-600">{securityStats.successfulAttempts}</p>
              </div>
              
              <div className="p-4 border rounded-lg">
                <div className="flex items-center gap-2">
                  <TrendingDown className="w-4 h-4 text-red-500" />
                  <span className="text-sm font-medium">Failed</span>
                </div>
                <p className="text-2xl font-bold mt-1 text-red-600">{securityStats.failedAttempts}</p>
              </div>
              
              <div className="p-4 border rounded-lg">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-orange-500" />
                  <span className="text-sm font-medium">Blocked Users</span>
                </div>
                <p className="text-2xl font-bold mt-1 text-orange-600">{securityStats.blockedUsersCount}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Blocked Users */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-orange-500" />
                Currently Blocked Users
              </CardTitle>
              <CardDescription>
                Users who have been temporarily blocked due to security violations
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => loadBlockedUsers(true)}
              disabled={blockedUsersLoading}
              className="flex items-center gap-2"
            >
              {blockedUsersLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
              {blockedUsersLoading ? 'Refreshing...' : 'Refresh'}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div 
            ref={blockedUsersRef}
            className="max-h-96 overflow-y-auto space-y-3 pr-2"
          >
            {blockedUsers.length > 0 ? (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Email</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>Blocked Until</TableHead>
                      <TableHead>Attempts</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {blockedUsers.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">{user.email}</TableCell>
                        <TableCell>
                          <Badge variant="destructive" className="text-xs">
                            {user.blockReason}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-muted-foreground" />
                            <span className="text-sm">
                              {formatDistanceToNow(new Date(user.blockedUntil), { addSuffix: true })}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{user.attemptsCount} attempts</Badge>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleUnblockUser(user.email)}
                            disabled={unblocking === user.email}
                            className="flex items-center gap-2"
                          >
                            {unblocking === user.email ? (
                              <RefreshCw className="w-4 h-4 animate-spin" />
                            ) : (
                              <Unlock className="w-4 h-4" />
                            )}
                            {unblocking === user.email ? 'Unblocking...' : 'Unblock'}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {blockedUsersLoading && (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                    <span className="ml-2 text-sm text-muted-foreground">Loading more blocked users...</span>
                  </div>
                )}
                {!blockedUsersHasMore && blockedUsers.length > 0 && (
                  <div className="text-center py-4">
                    <p className="text-sm text-muted-foreground">No more blocked users to load</p>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No blocked users found
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Recent Login Attempts */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Eye className="w-5 h-5 text-blue-500" />
                Recent Login Attempts
              </CardTitle>
              <CardDescription>
                Latest login attempts across the system
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => loadRecentAttempts(true)}
              disabled={attemptsLoading}
              className="flex items-center gap-2"
            >
              {attemptsLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
              {attemptsLoading ? 'Refreshing...' : 'Refresh'}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div 
            ref={attemptsRef}
            className="max-h-96 overflow-y-auto space-y-3 pr-2"
          >
            {recentAttempts.length > 0 ? (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Status</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Time</TableHead>
                      <TableHead>Reason</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentAttempts.map((attempt) => (
                      <TableRow key={attempt.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getAttemptStatusIcon(attempt.success)}
                            <Badge 
                              variant={attempt.success ? 'default' : 'destructive'}
                              className="text-xs"
                            >
                              {attempt.success ? 'Success' : 'Failed'}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell className="font-medium">{attempt.email}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatDistanceToNow(new Date(attempt.attemptTime), { addSuffix: true })}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {attempt.failureReason || '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {attemptsLoading && (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                    <span className="ml-2 text-sm text-muted-foreground">Loading more attempts...</span>
                  </div>
                )}
                {!attemptsHasMore && recentAttempts.length > 0 && (
                  <div className="text-center py-4">
                    <p className="text-sm text-muted-foreground">No more attempts to load</p>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No recent login attempts found
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
