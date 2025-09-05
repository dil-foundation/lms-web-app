import { supabase } from '@/integrations/supabase/client';
import AccessLogService from './accessLogService';

export interface LoginSecurityStatus {
  canProceed: boolean;
  isBlocked: boolean;
  blockReason?: string;
  blockedUntil?: string;
  failedAttempts: number;
  maxAttempts: number;
}

export interface LoginAttempt {
  id: string;
  email: string;
  ipAddress?: string;
  userAgent?: string;
  attemptTime: string;
  success: boolean;
  failureReason?: string;
  metadata?: Record<string, any>;
}

export interface BlockedUser {
  id: string;
  email: string;
  ipAddress?: string;
  blockReason: string;
  blockedAt: string;
  blockedUntil: string;
  attemptsCount: number;
  isActive: boolean;
  metadata?: Record<string, any>;
}

export interface SecurityStats {
  totalAttempts: number;
  failedAttempts: number;
  successfulAttempts: number;
  blockedUsersCount: number;
  uniqueIPs: number;
}

class LoginSecurityService {
  // Check if user can proceed with login attempt
  static async checkLoginSecurity(
    email: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<LoginSecurityStatus> {
    try {
      const { data, error } = await supabase.rpc('check_login_security', {
        p_email: email,
        p_ip_address: ipAddress,
        p_user_agent: userAgent
      });

      if (error) throw error;

      const result = data?.[0];
      if (!result) {
        throw new Error('Failed to check login security status');
      }

      return {
        canProceed: result.can_proceed,
        isBlocked: result.is_blocked,
        blockReason: result.block_reason,
        blockedUntil: result.blocked_until,
        failedAttempts: result.failed_attempts,
        maxAttempts: result.max_attempts
      };
    } catch (error) {
      console.error('Error checking login security:', error);
      // Default to allowing login if security check fails
      return {
        canProceed: true,
        isBlocked: false,
        failedAttempts: 0,
        maxAttempts: 5
      };
    }
  }

  // Log a login attempt
  static async logLoginAttempt(
    email: string,
    success: boolean,
    ipAddress?: string,
    userAgent?: string,
    failureReason?: string,
    metadata?: Record<string, any>
  ): Promise<string> {
    try {
      const { data, error } = await supabase.rpc('log_login_attempt', {
        p_email: email,
        p_success: success,
        p_ip_address: ipAddress,
        p_user_agent: userAgent,
        p_failure_reason: failureReason,
        p_metadata: metadata || {}
      });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error logging login attempt:', error);
      throw error;
    }
  }

  // Block a user due to too many failed attempts
  static async blockUser(
    email: string,
    ipAddress?: string,
    blockReason: string = 'Too many failed login attempts',
    blockHours: number = 24,
    attemptsCount: number = 0
  ): Promise<string> {
    try {
      const { data, error } = await supabase.rpc('block_user', {
        p_email: email,
        p_ip_address: ipAddress,
        p_block_reason: blockReason,
        p_block_hours: blockHours,
        p_attempts_count: attemptsCount
      });

      if (error) throw error;

      // Log security event
      await AccessLogService.logSecurityEvent(
        'system',
        'system@dil.com',
        'User Blocked',
        'high',
        `User ${email} blocked for ${blockHours} hours due to ${blockReason}. Attempts: ${attemptsCount}`
      );

      return data;
    } catch (error) {
      console.error('Error blocking user:', error);
      throw error;
    }
  }

  // Unblock a user
  static async unblockUser(email: string): Promise<boolean> {
    try {
      const { data, error } = await supabase.rpc('unblock_user', {
        p_email: email
      });

      if (error) throw error;

      return data;
    } catch (error) {
      console.error('Error unblocking user:', error);
      throw error;
    }
  }

  // Reset failed attempts on successful login
  static async resetFailedAttempts(email: string): Promise<boolean> {
    try {
      const { data, error } = await supabase.rpc('reset_failed_attempts', {
        p_email: email
      });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error resetting failed attempts:', error);
      throw error;
    }
  }

  // Get failed login attempts count
  static async getFailedLoginAttempts(
    email: string,
    hoursBack: number = 24
  ): Promise<number> {
    try {
      const { data, error } = await supabase.rpc('get_failed_login_attempts', {
        p_email: email,
        p_hours_back: hoursBack
      });

      if (error) throw error;
      return data || 0;
    } catch (error) {
      console.error('Error getting failed login attempts:', error);
      return 0;
    }
  }

  // Get security statistics
  static async getSecurityStats(hoursBack: number = 24): Promise<SecurityStats> {
    try {
      const { data, error } = await supabase.rpc('get_login_security_stats', {
        p_hours_back: hoursBack
      });

      if (error) throw error;

      const result = data?.[0];
      if (!result) {
        throw new Error('Failed to get security statistics');
      }

      return {
        totalAttempts: Number(result.total_attempts) || 0,
        failedAttempts: Number(result.failed_attempts) || 0,
        successfulAttempts: Number(result.successful_attempts) || 0,
        blockedUsersCount: Number(result.blocked_users_count) || 0,
        uniqueIPs: Number(result.unique_ips) || 0
      };
    } catch (error) {
      console.error('Error getting security stats:', error);
      return {
        totalAttempts: 0,
        failedAttempts: 0,
        successfulAttempts: 0,
        blockedUsersCount: 0,
        uniqueIPs: 0
      };
    }
  }

  // Get recent login attempts
  static async getRecentLoginAttempts(
    limit: number = 50,
    offset: number = 0
  ): Promise<LoginAttempt[]> {
    try {
      const { data, error } = await supabase
        .from('login_attempts')
        .select('*')
        .order('attempt_time', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        console.error('Error getting recent login attempts:', error);
        return [];
      }

      return (data || []).map(attempt => ({
        id: attempt.id,
        email: attempt.email,
        ipAddress: attempt.ip_address,
        userAgent: attempt.user_agent,
        attemptTime: attempt.attempt_time,
        success: attempt.success,
        failureReason: attempt.failure_reason,
        metadata: attempt.metadata
      }));
    } catch (error) {
      console.error('Error getting recent login attempts:', error);
      return [];
    }
  }

  // Get blocked users with pagination
  static async getBlockedUsers(limit: number = 50, offset: number = 0): Promise<BlockedUser[]> {
    try {
      const { data, error } = await supabase
        .from('blocked_users')
        .select('*')
        .eq('is_active', true)
        .order('blocked_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        console.error('Error getting blocked users:', error);
        return [];
      }

      return (data || []).map(user => ({
        id: user.id,
        email: user.email,
        ipAddress: user.ip_address,
        blockReason: user.block_reason,
        blockedAt: user.blocked_at,
        blockedUntil: user.blocked_until,
        attemptsCount: user.attempts_count,
        isActive: user.is_active,
        metadata: user.metadata
      }));
    } catch (error) {
      console.error('Error getting blocked users:', error);
      return [];
    }
  }

  // Clean up old records
  static async cleanupOldRecords(daysToKeep: number = 30): Promise<number> {
    try {
      const { data, error } = await supabase.rpc('cleanup_old_login_records', {
        p_days_to_keep: daysToKeep
      });

      if (error) throw error;
      return data || 0;
    } catch (error) {
      console.error('Error cleaning up old records:', error);
      return 0;
    }
  }

  // Handle login attempt with automatic blocking
  static async handleLoginAttempt(
    email: string,
    password: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<{
    success: boolean;
    blocked: boolean;
    blockReason?: string;
    blockedUntil?: string;
    remainingAttempts: number;
    maxAttempts: number;
  }> {
    try {
      // First, check if user is already blocked
      const securityStatus = await this.checkLoginSecurity(email, ipAddress, userAgent);
      
      if (securityStatus.isBlocked) {
        // Log the blocked attempt
        await this.logLoginAttempt(
          email,
          false,
          ipAddress,
          userAgent,
          'Account temporarily blocked',
          { blocked: true, blockReason: securityStatus.blockReason }
        );

        return {
          success: false,
          blocked: true,
          blockReason: securityStatus.blockReason,
          blockedUntil: securityStatus.blockedUntil,
          remainingAttempts: 0,
          maxAttempts: securityStatus.maxAttempts
        };
      }

      // Check if user has exceeded max attempts
      if (securityStatus.failedAttempts >= securityStatus.maxAttempts) {
        // Block the user
        await this.blockUser(
          email,
          ipAddress,
          'Too many failed login attempts',
          24, // 24 hours
          securityStatus.failedAttempts
        );

        // Log the attempt that triggered the block
        await this.logLoginAttempt(
          email,
          false,
          ipAddress,
          userAgent,
          'Account blocked due to too many failed attempts',
          { blocked: true, attemptsCount: securityStatus.failedAttempts }
        );

        return {
          success: false,
          blocked: true,
          blockReason: 'Too many failed login attempts',
          blockedUntil: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          remainingAttempts: 0,
          maxAttempts: securityStatus.maxAttempts
        };
      }

      // User can proceed with login attempt
      const remainingAttempts = securityStatus.maxAttempts - securityStatus.failedAttempts;
      
      return {
        success: true,
        blocked: false,
        remainingAttempts,
        maxAttempts: securityStatus.maxAttempts
      };
    } catch (error) {
      console.error('Error handling login attempt:', error);
      // Default to allowing login if security check fails
      return {
        success: true,
        blocked: false,
        remainingAttempts: 5,
        maxAttempts: 5
      };
    }
  }

  // Handle successful login
  static async handleSuccessfulLogin(
    email: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    try {
      // Log successful attempt
      await this.logLoginAttempt(
        email,
        true,
        ipAddress,
        userAgent,
        undefined,
        { loginMethod: 'email' }
      );

      // Reset failed attempts
      await this.resetFailedAttempts(email);

      // Log security event
      await AccessLogService.logSecurityEvent(
        'system',
        'system@dil.com',
        'Failed Attempts Reset',
        'low',
        `Failed login attempts reset for user ${email} after successful login`
      );
    } catch (error) {
      console.error('Error handling successful login:', error);
    }
  }

  // Handle failed login
  static async handleFailedLogin(
    email: string,
    reason: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<{
    blocked: boolean;
    blockReason?: string;
    blockedUntil?: string;
    remainingAttempts: number;
    maxAttempts: number;
  }> {
    try {
      console.log(`🔒 Handling failed login for ${email}: ${reason}`);
      
      // Log failed attempt first
      await this.logLoginAttempt(
        email,
        false,
        ipAddress,
        userAgent,
        reason,
        { loginMethod: 'email' }
      );

      // Get updated security status after logging the failed attempt
      const securityStatus = await this.checkLoginSecurity(email, ipAddress, userAgent);
      
      console.log(`🔒 Security status for ${email}:`, {
        failedAttempts: securityStatus.failedAttempts,
        maxAttempts: securityStatus.maxAttempts,
        isBlocked: securityStatus.isBlocked
      });
      
      // Check if this failed attempt should trigger a block
      // Note: failedAttempts now includes the attempt we just logged
      if (securityStatus.failedAttempts >= securityStatus.maxAttempts) {
        console.log(`🔒 Blocking user ${email} after ${securityStatus.failedAttempts} failed attempts`);
        
        // Block the user
        await this.blockUser(
          email,
          ipAddress,
          'Too many failed login attempts',
          24, // 24 hours
          securityStatus.failedAttempts
        );

        // Log security event
        await AccessLogService.logSecurityEvent(
          'system',
          'system@dil.com',
          'User Auto-Blocked',
          'high',
          `User ${email} automatically blocked for 24 hours after ${securityStatus.failedAttempts} failed attempts`
        );

        return {
          blocked: true,
          blockReason: 'Too many failed login attempts',
          blockedUntil: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          remainingAttempts: 0,
          maxAttempts: securityStatus.maxAttempts
        };
      }

      const remainingAttempts = securityStatus.maxAttempts - securityStatus.failedAttempts;
      console.log(`🔒 User ${email} has ${remainingAttempts} attempts remaining`);

      // Log warning if approaching limit
      if (remainingAttempts <= 2) {
        await AccessLogService.logSecurityEvent(
          'system',
          'system@dil.com',
          'Login Attempt Warning',
          'medium',
          `User ${email} has ${remainingAttempts} login attempts remaining`
        );
      }

      return {
        blocked: false,
        remainingAttempts,
        maxAttempts: securityStatus.maxAttempts
      };
    } catch (error) {
      console.error('Error handling failed login:', error);
      return {
        blocked: false,
        remainingAttempts: 5,
        maxAttempts: 5
      };
    }
  }

  // Manual trigger for blocking (for testing)
  static async triggerUserBlock(email: string, reason: string = 'Manual trigger'): Promise<boolean> {
    try {
      const { data, error } = await supabase.rpc('trigger_user_block', {
        p_email: email,
        p_reason: reason
      });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error triggering user block:', error);
      return false;
    }
  }
}

export default LoginSecurityService;
