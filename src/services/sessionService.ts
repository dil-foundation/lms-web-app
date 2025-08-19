import { supabase } from '@/integrations/supabase/client';

export interface UserSession {
  id: string;
  user_id: string;
  session_token: string;
  ip_address?: string;
  user_agent?: string;
  location?: string;
  is_active: boolean;
  last_activity: string;
  created_at: string;
  expires_at: string;
}

export interface ActiveSession {
  user_id: string;
  user_email: string;
  ip_address?: string;
  location?: string;
  last_activity: string;
  created_at: string;
}

class SessionService {
  // Create a new user session
  static async createSession(
    userId: string,
    sessionToken: string,
    ipAddress?: string,
    userAgent?: string,
    location?: string,
    sessionDurationHours: number = 24
  ): Promise<string> {
    try {
      const { data, error } = await supabase.rpc('create_user_session', {
        p_user_id: userId,
        p_session_token: sessionToken,
        p_ip_address: ipAddress,
        p_user_agent: userAgent,
        p_location: location,
        p_session_duration_hours: sessionDurationHours
      });

      if (error) {
        console.error('Error creating session:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error creating session:', error);
      throw error;
    }
  }

  // Update session activity
  static async updateSessionActivity(sessionToken: string): Promise<boolean> {
    try {
      const { data, error } = await supabase.rpc('update_session_activity', {
        p_session_token: sessionToken
      });

      if (error) {
        console.error('Error updating session activity:', error);
        return false;
      }

      return data;
    } catch (error) {
      console.error('Error updating session activity:', error);
      return false;
    }
  }

  // Deactivate a session (logout)
  static async deactivateSession(sessionToken: string): Promise<boolean> {
    try {
      const { data, error } = await supabase.rpc('deactivate_session', {
        p_session_token: sessionToken
      });

      if (error) {
        console.error('Error deactivating session:', error);
        return false;
      }

      return data;
    } catch (error) {
      console.error('Error deactivating session:', error);
      return false;
    }
  }

  // Get active sessions count
  static async getActiveSessionsCount(): Promise<number> {
    try {
      const { data, error } = await supabase.rpc('get_active_sessions_count');

      if (error) {
        console.error('Error getting active sessions count:', error);
        return 0;
      }

      return data || 0;
    } catch (error) {
      console.error('Error getting active sessions count:', error);
      return 0;
    }
  }

  // Get active sessions details
  static async getActiveSessions(): Promise<ActiveSession[]> {
    try {
      const { data, error } = await supabase.rpc('get_active_sessions');

      if (error) {
        console.error('Error getting active sessions:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error getting active sessions:', error);
      return [];
    }
  }

  // Clean up expired sessions
  static async cleanupExpiredSessions(): Promise<number> {
    try {
      const { data, error } = await supabase.rpc('cleanup_expired_sessions');

      if (error) {
        console.error('Error cleaning up expired sessions:', error);
        return 0;
      }

      return data || 0;
    } catch (error) {
      console.error('Error cleaning up expired sessions:', error);
      return 0;
    }
  }

  // Get user's current session
  static async getCurrentSession(userId: string): Promise<UserSession | null> {
    try {
      const { data, error } = await supabase
        .from('user_sessions')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error) {
        console.error('Error getting current session:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error getting current session:', error);
      return null;
    }
  }
}

export default SessionService;
