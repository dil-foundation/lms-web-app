// API Configuration
// Simple environment detection - defaults to production for safety
const isDevelopment = window.location.hostname === 'localhost' || 
                     window.location.hostname === '127.0.0.1' ||
                     window.location.hostname.includes('dev');

// Validate environment variables
const validateApiUrl = (url: string): string => {
  if (!url) {
    throw new Error('API URL is not configured');
  }
  
  try {
    new URL(url);
    return url;
  } catch (error) {
    throw new Error(`Invalid API URL: ${url}`);
  }
};

// Environment-specific configurations
const DEVELOPMENT_API_URL = 'https://api.dil.lms-staging.com'; // Local development server
const PRODUCTION_API_URL = 'https://api.dil.lms-staging.com'; // Production/staging server

// Custom API URL can be set via window global (for runtime configuration)
const CUSTOM_API_URL = (window as any)?.DIL_API_URL;

// Determine the API URL
let apiUrl: string;

if (CUSTOM_API_URL) {
  // Use custom URL if provided via environment variable
  apiUrl = validateApiUrl(CUSTOM_API_URL);
  console.log('Using custom API URL:', apiUrl);
} else if (isDevelopment) {
  // Use development URL
  apiUrl = DEVELOPMENT_API_URL;
  console.log('Using development API URL:', apiUrl);
} else {
  // Use production URL
  apiUrl = validateApiUrl(PRODUCTION_API_URL);
  console.log('Using production API URL:', apiUrl);
}

export const BASE_API_URL: string = apiUrl;

// WebSocket URL helper
export const getWebSocketUrl = (): string => {
  const wsUrl = BASE_API_URL.replace('http://', 'ws://').replace('https://', 'wss://');
  console.log('WebSocket URL generated:', wsUrl);
  return wsUrl;
};

// API endpoints
export const API_ENDPOINTS = {
  WEBSOCKET_LEARN: '/api/ws/learn',
  WEBSOCKET_PRACTICE: '/api/ws/practice',
  AUDIO_UPLOAD: '/api/audio/upload',
  AUDIO_PROCESS: '/api/audio/process',
} as const;

// Health check function
export const checkApiHealth = async (): Promise<boolean> => {
  try {
    const response = await fetch(`${BASE_API_URL}/health`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    return response.ok;
  } catch (error) {
    console.error('API health check failed:', error);
    return false;
  }
};

export default BASE_API_URL;