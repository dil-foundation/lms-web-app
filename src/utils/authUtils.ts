import { supabase } from '@/integrations/supabase/client';

/**
 * Get authentication token for API requests
 */
export const getAuthToken = (): string | null => {
  try {
    // First try to get from local storage (Supabase auth)
    const session = JSON.parse(localStorage.getItem('sb-' + import.meta.env.VITE_SUPABASE_URL?.split('//')[1]?.split('.')[0] + '-auth-token') || '{}');
    
    if (session?.access_token) {
      return session.access_token;
    }

    // Fallback: try to get current session directly
    const currentSession = supabase.auth.getSession();
    currentSession.then(({ data: { session } }) => {
      if (session?.access_token) {
        return session.access_token;
      }
    });

    return null;
  } catch (error) {
    console.error('Error getting auth token:', error);
    return null;
  }
};

/**
 * Get user ID from current session
 */
export const getCurrentUserId = async (): Promise<string | null> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    return user?.id || null;
  } catch (error) {
    console.error('Error getting current user ID:', error);
    return null;
  }
};

/**
 * Check if user is authenticated
 */
export const isAuthenticated = async (): Promise<boolean> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    return !!user;
  } catch (error) {
    console.error('Error checking authentication:', error);
    return false;
  }
};

/**
 * Get user role from session or database
 */
export const getUserRole = async (): Promise<string | null> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    // Check user metadata first
    if (user.user_metadata?.role) {
      return user.user_metadata.role;
    }

    // Fallback: query profiles table
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    return profile?.role || 'student'; // default role
  } catch (error) {
    console.error('Error getting user role:', error);
    return null;
  }
};

export default {
  getAuthToken,
  getCurrentUserId,
  isAuthenticated,
  getUserRole
};