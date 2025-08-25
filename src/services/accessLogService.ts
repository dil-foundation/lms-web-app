import { supabase } from '@/integrations/supabase/client';

export interface AccessLogEntry {
  id: string;
  user_id?: string;
  user_email?: string;
  action: string;
  ip_address?: string;
  user_agent?: string;
  location?: string;
  status: 'success' | 'failed' | 'pending';
  metadata?: Record<string, any>;
  created_at: string;
}

export interface LoginLogData {
  user_id: string;
  user_email: string;
  ip_address?: string;
  user_agent?: string;
  location?: string;
  login_method?: 'email' | 'magic_link' | 'oauth';
  device_info?: {
    browser?: string;
    os?: string;
    device?: string;
  };
}

class AccessLogService {
  // Log user login with human-readable information
  static async logUserLogin(loginData: LoginLogData): Promise<void> {
    try {
      const deviceInfo = this.parseUserAgent(loginData.user_agent);
      const location = loginData.location || 'Unknown location';
      
      const metadata = {
        login_method: loginData.login_method || 'email',
        device_info: deviceInfo,
        timestamp: new Date().toISOString(),
        session_id: crypto.randomUUID()
      };

      const { error } = await supabase
        .from('access_logs')
        .insert({
          user_id: loginData.user_id,
          user_email: loginData.user_email,
          action: 'User Logged In',
          ip_address: loginData.ip_address,
          user_agent: loginData.user_agent,
          location: location,
          status: 'success',
          metadata: metadata
        });

      if (error) {
        console.error('Error logging user login:', error);
      } else {
        console.log(`🔐 Access Log: User ${loginData.user_email} logged in successfully from ${location} using ${deviceInfo.browser} on ${deviceInfo.os}`);
      }
    } catch (error) {
      console.error('Error logging user login:', error);
    }
  }

  // Log failed login attempts
  static async logFailedLogin(email: string, reason: string, ip_address?: string, user_agent?: string): Promise<void> {
    try {
      const deviceInfo = this.parseUserAgent(user_agent);
      
      const metadata = {
        failure_reason: reason,
        device_info: deviceInfo,
        timestamp: new Date().toISOString()
      };

      const { error } = await supabase
        .from('access_logs')
        .insert({
          user_email: email,
          action: 'Failed Login Attempt',
          ip_address: ip_address,
          user_agent: user_agent,
          status: 'failed',
          metadata: metadata
        });

      if (error) {
        console.error('Error logging failed login:', error);
      } else {
        console.log(`❌ Access Log: Failed login attempt for ${email} from ${ip_address || 'unknown IP'} - Reason: ${reason}`);
      }
    } catch (error) {
      console.error('Error logging failed login:', error);
    }
  }

  // Log user logout
  static async logUserLogout(user_id: string, user_email: string, ip_address?: string, user_agent?: string): Promise<void> {
    try {
      const deviceInfo = this.parseUserAgent(user_agent);
      
      const metadata = {
        device_info: deviceInfo,
        timestamp: new Date().toISOString()
      };

      const { error } = await supabase
        .from('access_logs')
        .insert({
          user_id: user_id,
          user_email: user_email,
          action: 'User Logged Out',
          ip_address: ip_address,
          user_agent: user_agent,
          status: 'success',
          metadata: metadata
        });

      if (error) {
        console.error('Error logging user logout:', error);
      } else {
        console.log(`🚪 Access Log: User ${user_email} logged out successfully`);
      }
    } catch (error) {
      console.error('Error logging user logout:', error);
    }
  }

  // Log MFA verification
  static async logMFAVerification(user_id: string, user_email: string, status: 'success' | 'failed', method: 'totp' | 'backup_code', ip_address?: string): Promise<void> {
    try {
      const metadata = {
        mfa_method: method,
        timestamp: new Date().toISOString()
      };

      const { error } = await supabase
        .from('access_logs')
        .insert({
          user_id: user_id,
          user_email: user_email,
          action: 'MFA Code Verification',
          ip_address: ip_address,
          status: status,
          metadata: metadata
        });

      if (error) {
        console.error('Error logging MFA verification:', error);
      } else {
        const statusText = status === 'success' ? 'successfully' : 'failed';
        console.log(`🔐 Access Log: MFA verification ${statusText} for ${user_email} using ${method}`);
      }
    } catch (error) {
      console.error('Error logging MFA verification:', error);
    }
  }

  // Log course enrollment
  static async logCourseEnrollment(user_id: string, user_email: string, course_id: string, course_title: string, status: 'success' | 'failed'): Promise<void> {
    try {
      const metadata = {
        course_id: course_id,
        course_title: course_title,
        timestamp: new Date().toISOString()
      };

      const { error } = await supabase
        .from('access_logs')
        .insert({
          user_id: user_id,
          user_email: user_email,
          action: 'Course Enrollment',
          status: status,
          metadata: metadata
        });

      if (error) {
        console.error('Error logging course enrollment:', error);
      } else {
        const statusText = status === 'success' ? 'successfully enrolled in' : 'failed to enroll in';
        console.log(`📚 Access Log: User ${user_email} ${statusText} course: ${course_title}`);
      }
    } catch (error) {
      console.error('Error logging course enrollment:', error);
    }
  }

  // Log assignment submission
  static async logAssignmentSubmission(user_id: string, user_email: string, assignment_id: string, assignment_title: string, status: 'success' | 'failed'): Promise<void> {
    try {
      const metadata = {
        assignment_id: assignment_id,
        assignment_title: assignment_title,
        timestamp: new Date().toISOString()
      };

      const { error } = await supabase
        .from('access_logs')
        .insert({
          user_id: user_id,
          user_email: user_email,
          action: 'Assignment Submission',
          status: status,
          metadata: metadata
        });

      if (error) {
        console.error('Error logging assignment submission:', error);
      } else {
        const statusText = status === 'success' ? 'successfully submitted' : 'failed to submit';
        console.log(`📝 Access Log: User ${user_email} ${statusText} assignment: ${assignment_title}`);
      }
    } catch (error) {
      console.error('Error logging assignment submission:', error);
    }
  }

  // Log practice session completion
  static async logPracticeSession(user_id: string, user_email: string, stage_id: number, exercise_id: number, exercise_name: string, score?: number, status: 'started' | 'completed' | 'failed'): Promise<void> {
    try {
      const metadata = {
        stage_id: stage_id,
        exercise_id: exercise_id,
        exercise_name: exercise_name,
        score: score,
        timestamp: new Date().toISOString()
      };

      const { error } = await supabase
        .from('access_logs')
        .insert({
          user_id: user_id,
          user_email: user_email,
          action: `Practice Session ${status.charAt(0).toUpperCase() + status.slice(1)}`,
          status: status === 'failed' ? 'failed' : 'success',
          metadata: metadata
        });

      if (error) {
        console.error('Error logging practice session:', error);
      } else {
        const scoreText = score ? ` with score ${score}%` : '';
        console.log(`🎯 Access Log: User ${user_email} ${status} practice session: ${exercise_name} (Stage ${stage_id})${scoreText}`);
      }
    } catch (error) {
      console.error('Error logging practice session:', error);
    }
  }

  // Log profile update
  static async logProfileUpdate(user_id: string, user_email: string, fields_updated: string[], status: 'success' | 'failed'): Promise<void> {
    try {
      const metadata = {
        fields_updated: fields_updated,
        timestamp: new Date().toISOString()
      };

      const { error } = await supabase
        .from('access_logs')
        .insert({
          user_id: user_id,
          user_email: user_email,
          action: 'Profile Update',
          status: status,
          metadata: metadata
        });

      if (error) {
        console.error('Error logging profile update:', error);
      } else {
        const statusText = status === 'success' ? 'successfully updated' : 'failed to update';
        console.log(`👤 Access Log: User ${user_email} ${statusText} profile fields: ${fields_updated.join(', ')}`);
      }
    } catch (error) {
      console.error('Error logging profile update:', error);
    }
  }

  // Log role change
  static async logRoleChange(user_id: string, user_email: string, old_role: string, new_role: string, changed_by: string): Promise<void> {
    try {
      const metadata = {
        old_role: old_role,
        new_role: new_role,
        changed_by: changed_by,
        timestamp: new Date().toISOString()
      };

      const { error } = await supabase
        .from('access_logs')
        .insert({
          user_id: user_id,
          user_email: user_email,
          action: 'Role Change',
          status: 'success',
          metadata: metadata
        });

      if (error) {
        console.error('Error logging role change:', error);
      } else {
        console.log(`🔄 Access Log: User ${user_email} role changed from ${old_role} to ${new_role} by ${changed_by}`);
      }
    } catch (error) {
      console.error('Error logging role change:', error);
    }
  }

  // Log course creation/modification
  static async logCourseAction(user_id: string, user_email: string, action: 'created' | 'updated' | 'deleted' | 'published', course_id: string, course_title: string): Promise<void> {
    try {
      const metadata = {
        course_id: course_id,
        course_title: course_title,
        timestamp: new Date().toISOString()
      };

      const { error } = await supabase
        .from('access_logs')
        .insert({
          user_id: user_id,
          user_email: user_email,
          action: `Course ${action.charAt(0).toUpperCase() + action.slice(1)}`,
          status: 'success',
          metadata: metadata
        });

      if (error) {
        console.error('Error logging course action:', error);
      } else {
        console.log(`📖 Access Log: User ${user_email} ${action} course: ${course_title}`);
      }
    } catch (error) {
      console.error('Error logging course action:', error);
    }
  }

  // Log admin actions
  static async logAdminAction(user_id: string, user_email: string, action: string, details: Record<string, any> = {}, target_user_id?: string, target_user_email?: string): Promise<void> {
    try {
      const metadata = {
        target_user_id: target_user_id,
        target_user_email: target_user_email,
        details: details,
        timestamp: new Date().toISOString()
      };

      const { error } = await supabase
        .from('access_logs')
        .insert({
          user_id: user_id,
          user_email: user_email,
          action: `Admin Action: ${action}`,
          status: 'success',
          metadata: metadata
        });

      if (error) {
        console.error('Error logging admin action:', error);
      } else {
        const targetText = target_user_email ? ` on ${target_user_email}` : '';
        console.log(`⚡ Access Log: Admin ${user_email} performed ${action}${targetText}`);
      }
    } catch (error) {
      console.error('Error logging admin action:', error);
    }
  }

  // Log security events
  static async logSecurityEvent(user_id: string, user_email: string, event_type: string, severity: 'low' | 'medium' | 'high', details: string): Promise<void> {
    try {
      const metadata = {
        event_type: event_type,
        details: details,
        severity: severity,
        timestamp: new Date().toISOString()
      };

      const { error } = await supabase
        .from('access_logs')
        .insert({
          user_id: user_id,
          user_email: user_email,
          action: `Security Event: ${event_type}`,
          status: 'success',
          metadata: metadata
        });

      if (error) {
        console.error('Error logging security event:', error);
      } else {
        const severityIcon = severity === 'high' ? '🚨' : severity === 'medium' ? '⚠️' : 'ℹ️';
        console.log(`${severityIcon} Security Log: ${event_type} for user ${user_email} - ${details}`);
      }
    } catch (error) {
      console.error('Error logging security event:', error);
    }
  }

  // Get recent access logs with pagination
  static async getRecentAccessLogs(limit: number = 50, offset: number = 0): Promise<AccessLogEntry[]> {
    try {
      const { data, error } = await supabase.rpc('get_recent_access_logs', {
        limit_count: limit,
        offset_count: offset
      });

      if (error) {
        console.error('Error getting recent access logs:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error getting recent access logs:', error);
      return [];
    }
  }

  // Parse user agent string to extract device information
  private static parseUserAgent(userAgent?: string): { browser?: string; os?: string; device?: string } {
    if (!userAgent) {
      return { browser: 'Unknown', os: 'Unknown', device: 'Unknown' };
    }

    const ua = userAgent.toLowerCase();
    
    // Browser detection
    let browser = 'Unknown';
    if (ua.includes('chrome')) browser = 'Chrome';
    else if (ua.includes('firefox')) browser = 'Firefox';
    else if (ua.includes('safari')) browser = 'Safari';
    else if (ua.includes('edge')) browser = 'Edge';
    else if (ua.includes('opera')) browser = 'Opera';

    // OS detection
    let os = 'Unknown';
    if (ua.includes('windows')) os = 'Windows';
    else if (ua.includes('mac')) os = 'macOS';
    else if (ua.includes('linux')) os = 'Linux';
    else if (ua.includes('android')) os = 'Android';
    else if (ua.includes('ios')) os = 'iOS';

    // Device detection
    let device = 'Desktop';
    if (ua.includes('mobile')) device = 'Mobile';
    else if (ua.includes('tablet')) device = 'Tablet';

    return { browser, os, device };
  }

  // Get client IP address (this would need to be implemented based on your setup)
  static async getClientIP(): Promise<string | undefined> {
    try {
      // This is a placeholder - in a real implementation, you'd get this from your server
      // For now, we'll return undefined and let the caller handle it
      return undefined;
    } catch (error) {
      console.error('Error getting client IP:', error);
      return undefined;
    }
  }
}

export default AccessLogService;
