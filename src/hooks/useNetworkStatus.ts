// Network Status Detection Hook
// Provides real-time network connectivity information

import { useState, useEffect, useCallback } from 'react';

export interface NetworkStatus {
  isOnline: boolean;
  isSlowConnection: boolean;
  connectionType: 'wifi' | 'cellular' | 'ethernet' | 'unknown';
  effectiveType: 'slow-2g' | '2g' | '3g' | '4g' | 'unknown';
  downlink: number;
  rtt: number;
  saveData: boolean;
}

export interface NetworkConnection extends EventTarget {
  effectiveType: '2g' | '3g' | '4g' | 'slow-2g';
  rtt: number;
  downlink: number;
  saveData: boolean;
  type: 'bluetooth' | 'cellular' | 'ethernet' | 'none' | 'wifi' | 'wimax' | 'other' | 'unknown';
}

declare global {
  interface Navigator {
    connection?: NetworkConnection;
    mozConnection?: NetworkConnection;
    webkitConnection?: NetworkConnection;
  }
}

const getConnection = (): NetworkConnection | undefined => {
  return navigator.connection || navigator.mozConnection || navigator.webkitConnection;
};

const getConnectionType = (connection?: NetworkConnection): 'wifi' | 'cellular' | 'ethernet' | 'unknown' => {
  if (!connection) return 'unknown';
  
  switch (connection.type) {
    case 'wifi':
      return 'wifi';
    case 'cellular':
      return 'cellular';
    case 'ethernet':
      return 'ethernet';
    default:
      return 'unknown';
  }
};

const isSlowConnection = (connection?: NetworkConnection): boolean => {
  if (!connection) return false;
  
  return (
    connection.effectiveType === 'slow-2g' ||
    connection.effectiveType === '2g' ||
    connection.downlink < 1.5 ||
    connection.rtt > 300
  );
};

export const useNetworkStatus = () => {
  const [networkStatus, setNetworkStatus] = useState<NetworkStatus>(() => {
    const connection = getConnection();
    
    return {
      isOnline: navigator.onLine,
      isSlowConnection: isSlowConnection(connection),
      connectionType: getConnectionType(connection),
      effectiveType: connection?.effectiveType || 'unknown',
      downlink: connection?.downlink || 0,
      rtt: connection?.rtt || 0,
      saveData: connection?.saveData || false,
    };
  });

  const updateNetworkStatus = useCallback(() => {
    const connection = getConnection();
    
    setNetworkStatus({
      isOnline: navigator.onLine,
      isSlowConnection: isSlowConnection(connection),
      connectionType: getConnectionType(connection),
      effectiveType: connection?.effectiveType || 'unknown',
      downlink: connection?.downlink || 0,
      rtt: connection?.rtt || 0,
      saveData: connection?.saveData || false,
    });
  }, []);

  useEffect(() => {
    const handleOnline = () => {
      console.log('[Network] Connection restored');
      updateNetworkStatus();
    };

    const handleOffline = () => {
      console.log('[Network] Connection lost');
      updateNetworkStatus();
    };

    const handleConnectionChange = () => {
      console.log('[Network] Connection properties changed');
      updateNetworkStatus();
    };

    // Add event listeners
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const connection = getConnection();
    if (connection) {
      connection.addEventListener('change', handleConnectionChange);
    }

    // Cleanup
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      
      if (connection) {
        connection.removeEventListener('change', handleConnectionChange);
      }
    };
  }, [updateNetworkStatus]);

  // Utility functions
  const isWifiConnection = useCallback(() => {
    return networkStatus.connectionType === 'wifi';
  }, [networkStatus.connectionType]);

  const isCellularConnection = useCallback(() => {
    return networkStatus.connectionType === 'cellular';
  }, [networkStatus.connectionType]);

  const isEthernetConnection = useCallback(() => {
    return networkStatus.connectionType === 'ethernet';
  }, [networkStatus.connectionType]);

  const isStableConnection = useCallback(() => {
    return isWifiConnection() || isEthernetConnection();
  }, [isWifiConnection, isEthernetConnection]);

  const shouldDownloadOnCurrentConnection = useCallback((downloadOnWifiOnly: boolean = true) => {
    if (!networkStatus.isOnline) return false;
    if (!downloadOnWifiOnly) return true;
    
    // Allow both Wi-Fi and Ethernet connections for downloads (both are typically stable/fast)
    // Also allow 'unknown' connections since many browsers don't properly detect ethernet
    return isWifiConnection() || 
           networkStatus.connectionType === 'ethernet' ||
           networkStatus.connectionType === 'unknown'; // Many browsers report ethernet as 'unknown'
  }, [networkStatus.isOnline, isWifiConnection, networkStatus.connectionType]);

  const getConnectionQuality = useCallback((): 'excellent' | 'good' | 'fair' | 'poor' => {
    if (!networkStatus.isOnline) return 'poor';
    
    if (networkStatus.effectiveType === '4g' && networkStatus.downlink > 10) {
      return 'excellent';
    } else if (networkStatus.effectiveType === '4g' || networkStatus.downlink > 5) {
      return 'good';
    } else if (networkStatus.effectiveType === '3g' || networkStatus.downlink > 1.5) {
      return 'fair';
    } else {
      return 'poor';
    }
  }, [networkStatus]);

  const getConnectionDescription = useCallback((): string => {
    if (!networkStatus.isOnline) {
      return 'No internet connection';
    }

    const quality = getConnectionQuality();
    const type = networkStatus.connectionType;
    
    // Special handling for ethernet connections
    if (type === 'ethernet') {
      if (quality === 'excellent' || quality === 'good') {
        return 'Fast wired connection';
      } else if (quality === 'fair') {
        return 'Stable wired connection';
      } else {
        return 'Slow wired connection';
      }
    }
    
    if (quality === 'excellent') {
      return `Fast ${type} connection`;
    } else if (quality === 'good') {
      return `Good ${type} connection`;
    } else if (quality === 'fair') {
      return `Slow ${type} connection`;
    } else {
      return `Very slow ${type} connection`;
    }
  }, [networkStatus, getConnectionQuality]);

  return {
    ...networkStatus,
    isWifiConnection,
    isCellularConnection,
    isEthernetConnection,
    isStableConnection,
    shouldDownloadOnCurrentConnection,
    getConnectionQuality,
    getConnectionDescription,
    refresh: updateNetworkStatus,
  };
};

// Hook for simple online/offline status
export const useOnlineStatus = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
};
