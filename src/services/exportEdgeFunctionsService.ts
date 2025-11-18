import { supabase } from '@/integrations/supabase/client';

/**
 * Export Edge Functions Service
 * Handles calls to edge functions for exporting security data without pagination
 */

const EDGE_FUNCTIONS_URL = import.meta.env.VITE_SUPABASE_URL + '/functions/v1';

/**
 * Get authorization headers for edge function calls
 */
const getAuthHeaders = async () => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    throw new Error('No active session');
  }

  return {
    'Authorization': `Bearer ${session.access_token}`,
    'Content-Type': 'application/json',
  };
};

/**
 * Export all MFA users without pagination
 * @param searchTerm - Optional search term to filter results
 * @returns Array of users with MFA status
 */
export const exportMFAUsers = async (searchTerm?: string) => {
  try {
    const headers = await getAuthHeaders();

    const response = await fetch(`${EDGE_FUNCTIONS_URL}/export-mfa-users`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ searchTerm: searchTerm || '' }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to export MFA users');
    }

    const data = await response.json();
    return data.users || [];
  } catch (error) {
    console.error('Error exporting MFA users:', error);
    throw error;
  }
};

/**
 * Export all blocked users without pagination
 * @returns Array of currently blocked users
 */
export const exportBlockedUsers = async () => {
  try {
    const headers = await getAuthHeaders();

    const response = await fetch(`${EDGE_FUNCTIONS_URL}/export-blocked-users`, {
      method: 'POST',
      headers,
      body: JSON.stringify({}),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to export blocked users');
    }

    const data = await response.json();
    return data.users || [];
  } catch (error) {
    console.error('Error exporting blocked users:', error);
    throw error;
  }
};

/**
 * Export all login attempts without pagination
 * @param searchTerm - Optional search term to filter by email
 * @returns Array of login attempts
 */
export const exportLoginAttempts = async (searchTerm?: string) => {
  try {
    const headers = await getAuthHeaders();

    const response = await fetch(`${EDGE_FUNCTIONS_URL}/export-login-attempts`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ searchTerm: searchTerm || '' }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to export login attempts');
    }

    const data = await response.json();
    return data.attempts || [];
  } catch (error) {
    console.error('Error exporting login attempts:', error);
    throw error;
  }
};

/**
 * Export all access logs without pagination
 * @param searchTerm - Optional search term to filter by email or action
 * @returns Array of access logs
 */
export const exportAccessLogs = async (searchTerm?: string) => {
  try {
    const headers = await getAuthHeaders();

    const response = await fetch(`${EDGE_FUNCTIONS_URL}/export-access-logs`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ searchTerm: searchTerm || '' }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to export access logs');
    }

    const data = await response.json();
    return data.logs || [];
  } catch (error) {
    console.error('Error exporting access logs:', error);
    throw error;
  }
};

const exportEdgeFunctionsService = {
  exportMFAUsers,
  exportBlockedUsers,
  exportLoginAttempts,
  exportAccessLogs,
};

export default exportEdgeFunctionsService;
