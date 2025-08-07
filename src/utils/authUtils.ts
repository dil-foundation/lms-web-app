/**
 * Authentication utilities for API requests
 */

/**
 * Get the authentication token from localStorage
 * @returns The JWT access token or null if not found
 */
export const getAuthToken = (): string | null => {
  try {
    const authData = localStorage.getItem('sb-yfaiauooxwvekdimfeuu-auth-token');
    if (authData) {
      const parsed = JSON.parse(authData);
      return parsed.access_token || null;
    }
  } catch (error) {
    console.error('Error getting auth token:', error);
  }
  return null;
};

/**
 * Get headers with authentication for API requests
 * @returns Headers object with Content-Type and Authorization
 * @throws Error if authentication token is not found
 */
export const getAuthHeaders = (): Record<string, string> => {
  const authToken = getAuthToken();
  if (!authToken) {
    throw new Error('Authentication token not found. Please log in again.');
  }

  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${authToken}`,
  };
};

/**
 * Get headers with authentication and Accept header for API requests
 * @returns Headers object with Content-Type, Authorization, and Accept
 * @throws Error if authentication token is not found
 */
export const getAuthHeadersWithAccept = (): Record<string, string> => {
  const authToken = getAuthToken();
  if (!authToken) {
    throw new Error('Authentication token not found. Please log in again.');
  }

  return {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'Authorization': `Bearer ${authToken}`,
  };
};
