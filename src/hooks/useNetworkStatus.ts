import { useState, useEffect, useCallback, useRef } from 'react';

export interface NetworkConnection {
  effectiveType?: '2g' | '3g' | '4g' | 'slow-2g';
  type?: 'bluetooth' | 'cellular' | 'ethernet' | 'mixed' | 'none' | 'other' | 'unknown' | 'wifi' | 'wimax';
  downlink?: number;
  rtt?: number;
  saveData?: boolean;
}

export interface NetworkStatus {
  isOnline: boolean;
  connectionType: string;
  connectionQuality: 'excellent' | 'good' | 'poor' | 'offline';
  isSlowConnection: boolean;
  lastChecked: Date;
  connection?: NetworkConnection;
}

const DEFAULT_NETWORK_STATUS: NetworkStatus = {
  isOnline: navigator.onLine,
  connectionType: 'unknown',
  connectionQuality: 'offline',
  isSlowConnection: false,
  lastChecked: new Date(),
};

export const useNetworkStatus = () => {
  const [networkStatus, setNetworkStatus] = useState<NetworkStatus>(DEFAULT_NETWORK_STATUS);
  const [isChecking, setIsChecking] = useState(false);
  const checkTimeoutRef = useRef<NodeJS.Timeout>();
  const intervalRef = useRef<NodeJS.Timeout>();

  // Get connection info from Navigator Connection API
  const getConnectionInfo = useCallback((): NetworkConnection | undefined => {
    const nav = navigator as any;
    const connection = nav.connection || nav.mozConnection || nav.webkitConnection;
    
    if (connection) {
      return {
        effectiveType: connection.effectiveType,
        type: connection.type,
        downlink: connection.downlink,
        rtt: connection.rtt,
        saveData: connection.saveData,
      };
    }
    
    return undefined;
  }, []);

  // Determine connection quality based on connection info
  const getConnectionQuality = useCallback((connection?: NetworkConnection, isOnline?: boolean): 'excellent' | 'good' | 'poor' | 'offline' => {
    if (!isOnline) return 'offline';
    
    if (connection) {
      const { effectiveType, downlink, rtt } = connection;
      
      // Use effective type as primary indicator
      if (effectiveType === '4g' && (downlink === undefined || downlink > 1.5)) {
        return 'excellent';
      } else if (effectiveType === '3g' || (effectiveType === '4g' && downlink && downlink <= 1.5)) {
        return 'good';
      } else if (effectiveType === '2g' || effectiveType === 'slow-2g') {
        return 'poor';
      }
      
      // Fallback to RTT and downlink
      if (rtt !== undefined && downlink !== undefined) {
        if (rtt < 150 && downlink > 2) return 'excellent';
        if (rtt < 300 && downlink > 1) return 'good';
        return 'poor';
      }
    }
    
    // Default to good if online but no detailed info
    return isOnline ? 'good' : 'offline';
  }, []);

  // Get connection type string
  const getConnectionType = useCallback((connection?: NetworkConnection): string => {
    if (!connection) return 'unknown';
    
    if (connection.type) {
      switch (connection.type) {
        case 'wifi': return 'WiFi';
        case 'ethernet': return 'Ethernet';
        case 'cellular': return `Cellular (${connection.effectiveType?.toUpperCase() || 'Unknown'})`;
        case 'bluetooth': return 'Bluetooth';
        default: return connection.type.charAt(0).toUpperCase() + connection.type.slice(1);
      }
    }
    
    return 'Unknown';
  }, []);

  // Advanced connectivity test using multiple methods
  const performConnectivityTest = useCallback(async (): Promise<boolean> => {
    const testMethods = [
      // Method 1: Fetch a small image from a reliable CDN
      async () => {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 5000);
          
          const response = await fetch('https://www.google.com/favicon.ico', {
            method: 'HEAD',
            mode: 'no-cors',
            cache: 'no-cache',
            signal: controller.signal,
          });
          
          clearTimeout(timeoutId);
          return true;
        } catch {
          return false;
        }
      },
      
      // Method 2: Try to fetch from multiple reliable endpoints
      async () => {
        const endpoints = [
          'https://www.cloudflare.com/favicon.ico',
          'https://www.github.com/favicon.ico',
        ];
        
        for (const endpoint of endpoints) {
          try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 3000);
            
            await fetch(endpoint, {
              method: 'HEAD',
              mode: 'no-cors',
              cache: 'no-cache',
              signal: controller.signal,
            });
            
            clearTimeout(timeoutId);
            return true;
          } catch {
            continue;
          }
        }
        return false;
      },
      
      // Method 3: DNS lookup test (if available)
      async () => {
        try {
          if ('dns' in navigator) {
            // @ts-ignore - DNS API is experimental
            await navigator.dns.resolve('google.com');
            return true;
          }
          return false;
        } catch {
          return false;
        }
      }
    ];

    // Run tests in parallel and return true if any succeed
    const results = await Promise.allSettled(
      testMethods.map(test => test())
    );
    
    return results.some(result => 
      result.status === 'fulfilled' && result.value === true
    );
  }, []);

  // Update network status
  const updateNetworkStatus = useCallback(async (skipConnectivityTest = false) => {
    setIsChecking(true);
    
    try {
      const basicOnlineStatus = navigator.onLine;
      const connection = getConnectionInfo();
      
      // Perform advanced connectivity test to verify actual internet access
      // IMPORTANT: We always test when not skipping, regardless of basicOnlineStatus
      // This catches cases where navigator.onLine is incorrect in either direction
      let actualOnlineStatus = basicOnlineStatus;
      
      if (!skipConnectivityTest) {
        // Always perform the test to verify actual connectivity
        const testResult = await performConnectivityTest();
        actualOnlineStatus = testResult;
        
        // Log discrepancies between navigator.onLine and actual connectivity
        if (basicOnlineStatus !== testResult) {
          console.warn(
            `⚠️ Network status mismatch detected!`,
            `\n   navigator.onLine: ${basicOnlineStatus}`,
            `\n   Actual connectivity: ${testResult}`,
            `\n   Using actual connectivity result.`
          );
        }
      }
      
      const connectionType = getConnectionType(connection);
      const connectionQuality = getConnectionQuality(connection, actualOnlineStatus);
      const isSlowConnection = connectionQuality === 'poor' || 
        (connection?.effectiveType === '2g' || connection?.effectiveType === 'slow-2g');

      const newStatus: NetworkStatus = {
        isOnline: actualOnlineStatus,
        connectionType,
        connectionQuality,
        isSlowConnection,
        lastChecked: new Date(),
        connection,
      };

      setNetworkStatus(newStatus);
      return newStatus;
    } catch (error) {
      console.error('Network status check failed:', error);
      
      // Fallback to basic navigator.onLine
      const fallbackStatus: NetworkStatus = {
        isOnline: navigator.onLine,
        connectionType: 'unknown',
        connectionQuality: navigator.onLine ? 'good' : 'offline',
        isSlowConnection: false,
        lastChecked: new Date(),
      };
      
      setNetworkStatus(fallbackStatus);
      return fallbackStatus;
    } finally {
      setIsChecking(false);
    }
  }, [getConnectionInfo, getConnectionType, getConnectionQuality, performConnectivityTest]);

  // Manual refresh function
  const refreshNetworkStatus = useCallback(() => {
    if (checkTimeoutRef.current) {
      clearTimeout(checkTimeoutRef.current);
    }
    
    checkTimeoutRef.current = setTimeout(() => {
      updateNetworkStatus(false);
    }, 100); // Debounce rapid calls
  }, [updateNetworkStatus]);

  // Set up event listeners and periodic checks
  useEffect(() => {
    // Initial check - use basic navigator.onLine for fast startup
    // Event listeners will handle any subsequent changes
    updateNetworkStatus(true);

    // Listen to online/offline events
    const handleOnline = () => {
      console.log('🟢 Network: Online event detected');
      updateNetworkStatus(false);
    };

    const handleOffline = () => {
      console.log('🔴 Network: Offline event detected');
      updateNetworkStatus(true); // Skip connectivity test when offline
    };

    // Listen to connection change events
    const handleConnectionChange = () => {
      console.log('🔄 Network: Connection change detected');
      refreshNetworkStatus();
    };

    // Add event listeners
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Connection API event listeners
    const nav = navigator as any;
    const connection = nav.connection || nav.mozConnection || nav.webkitConnection;
    if (connection) {
      connection.addEventListener('change', handleConnectionChange);
    }

    // Periodic connectivity check DISABLED to prevent unnecessary network requests
    // The online/offline event listeners and connection change events are sufficient
    // for detecting network status changes in modern browsers
    // 
    // If needed, users can manually refresh network status via refreshNetworkStatus()
    // intervalRef.current = setInterval(() => {
    //   console.log('⏰ Network: Periodic connectivity check...');
    //   updateNetworkStatus(false);
    // }, 30000);

    // Cleanup
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      
      if (connection) {
        connection.removeEventListener('change', handleConnectionChange);
      }
      
      if (checkTimeoutRef.current) {
        clearTimeout(checkTimeoutRef.current);
      }
      
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [updateNetworkStatus, refreshNetworkStatus]);

  return {
    ...networkStatus,
    isChecking,
    refreshNetworkStatus,
  };
};
