/**
 * Global offline request handler utility
 * This provides a centralized way to handle offline scenarios for any service
 */

// Global flag to track if we've already set up offline handling
let isOfflineHandlerSetup = false;

// Store original fetch function
const originalFetch = window.fetch;

/**
 * Enhanced fetch wrapper that respects offline status
 */
const offlineAwareFetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
  // Check if we're offline
  if (!navigator.onLine) {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    
    // Special handling for Supabase storage requests
    if (url.includes('supabase.co/storage') || url.includes('.supabase.co')) {
      console.log(`🔴 OfflineHandler: Blocked Supabase storage request - ${url}`);
      // Return a more specific error for storage requests
      const error = new Error(`Storage request blocked: Device is offline`);
      error.name = 'NetworkError';
      throw error;
    }
    
    console.log(`🔴 OfflineHandler: Blocked request to ${url} - device is offline`);
    
    // Return a rejected promise that mimics network failure
    throw new Error(`Network request failed: Device is offline. URL: ${url}`);
  }

  // If online, proceed with normal fetch
  return originalFetch(input, init);
};

/**
 * Setup global offline request handling
 * This intercepts all network requests when offline
 */
export const setupOfflineRequestHandler = (): void => {
  if (isOfflineHandlerSetup) {
    console.log('🔄 OfflineHandler: Already setup, skipping...');
    return;
  }

  console.log('🛡️ OfflineHandler: Setting up global offline request protection');

  // Replace global fetch with offline-aware version
  window.fetch = offlineAwareFetch;

  // Listen for online/offline events
  const handleOffline = () => {
    console.log('🔴 OfflineHandler: Device went offline - all network requests will be blocked');
  };

  const handleOnline = () => {
    console.log('🟢 OfflineHandler: Device back online - network requests resumed');
  };

  window.addEventListener('offline', handleOffline);
  window.addEventListener('online', handleOnline);

  isOfflineHandlerSetup = true;

  // Cleanup function (for potential future use)
  return () => {
    window.fetch = originalFetch;
    window.removeEventListener('offline', handleOffline);
    window.removeEventListener('online', handleOnline);
    isOfflineHandlerSetup = false;
  };
};

/**
 * Check if a request should be allowed when offline
 * This can be extended to allow certain critical requests
 */
export const isRequestAllowedOffline = (url: string): boolean => {
  // Allow requests to local storage, cache API, etc.
  const allowedPatterns = [
    /^blob:/,
    /^data:/,
    /localhost/,
    /127\.0\.0\.1/,
    /^file:/
  ];

  return allowedPatterns.some(pattern => pattern.test(url));
};

/**
 * Utility to safely make requests with offline awareness
 */
export const safeRequest = async <T>(
  requestFn: () => Promise<T>,
  fallbackValue?: T,
  context?: string
): Promise<T | undefined> => {
  if (!navigator.onLine) {
    console.log(`🔴 SafeRequest: Skipping ${context || 'request'} - offline`);
    return fallbackValue;
  }

  try {
    return await requestFn();
  } catch (error) {
    console.error(`❌ SafeRequest: Error in ${context || 'request'}:`, error);
    return fallbackValue;
  }
};
