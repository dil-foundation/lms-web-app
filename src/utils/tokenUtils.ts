/**
 * Utility functions for JWT token validation
 */

interface JWTPayload {
  exp: number;
  iat: number;
  sub: string;
  email?: string;
  [key: string]: any;
}

/**
 * Decode JWT token without verification (client-side only)
 * Note: This is for checking expiry, not for security validation
 */
export const decodeJWT = (token: string): JWTPayload | null => {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }
    
    const payload = parts[1];
    const decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(decoded);
  } catch (error) {
    console.error('Error decoding JWT:', error);
    return null;
  }
};

/**
 * Check if a JWT token is expired
 */
export const isTokenExpired = (token: string): boolean => {
  const payload = decodeJWT(token);
  if (!payload || !payload.exp) {
    return true; // Consider invalid if no expiry
  }
  
  const currentTime = Math.floor(Date.now() / 1000);
  return payload.exp < currentTime;
};

/**
 * Check if a JWT token expires within a certain buffer time (in seconds)
 */
export const isTokenExpiringSoon = (token: string, bufferSeconds: number = 300): boolean => {
  const payload = decodeJWT(token);
  if (!payload || !payload.exp) {
    return true; // Consider invalid if no expiry
  }
  
  const currentTime = Math.floor(Date.now() / 1000);
  return payload.exp < (currentTime + bufferSeconds);
};

/**
 * Get token expiry time as Date object
 */
export const getTokenExpiry = (token: string): Date | null => {
  const payload = decodeJWT(token);
  if (!payload || !payload.exp) {
    return null;
  }
  
  return new Date(payload.exp * 1000);
};

/**
 * Get time remaining until token expires (in seconds)
 */
export const getTokenTimeRemaining = (token: string): number => {
  const payload = decodeJWT(token);
  if (!payload || !payload.exp) {
    return 0;
  }
  
  const currentTime = Math.floor(Date.now() / 1000);
  return Math.max(0, payload.exp - currentTime);
};
