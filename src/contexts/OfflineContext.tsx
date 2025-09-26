import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { offlineDatabase } from '@/services/offlineDatabase';

interface OfflineContextType {
  isOnline: boolean;
  isOfflineCapable: boolean;
  offlineData: {
    courses: any[];
    progress: any[];
    settings: any;
  };
  refreshOfflineData: () => Promise<void>;
  getOfflineFallback: (dataType: string, fallbackData?: any) => any;
}

const OfflineContext = createContext<OfflineContextType | undefined>(undefined);

interface OfflineProviderProps {
  children: ReactNode;
}

export const OfflineProvider: React.FC<OfflineProviderProps> = ({ children }) => {
  const { isOnline } = useNetworkStatus();
  const [isOfflineCapable, setIsOfflineCapable] = useState(false);
  const [offlineData, setOfflineData] = useState({
    courses: [],
    progress: [],
    settings: null
  });

  // Check if the app has offline capabilities (service worker + cached data)
  useEffect(() => {
    checkOfflineCapabilities();
  }, []);

  // Load offline data when going offline or on mount
  useEffect(() => {
    if (!isOnline) {
      refreshOfflineData();
    }
  }, [isOnline]);

  const checkOfflineCapabilities = async () => {
    try {
      // Check if service worker is available
      const swAvailable = 'serviceWorker' in navigator;
      
      // Check if we have cached data
      const courses = await offlineDatabase.getAllCourses();
      const hasCachedData = courses.length > 0;
      
      setIsOfflineCapable(swAvailable && hasCachedData);
    } catch (error) {
      console.error('Failed to check offline capabilities:', error);
      setIsOfflineCapable(false);
    }
  };

  const refreshOfflineData = async () => {
    try {
      const [courses, progress, settings] = await Promise.all([
        offlineDatabase.getAllCourses(),
        offlineDatabase.getAllProgress(),
        offlineDatabase.getSettings()
      ]);

      setOfflineData({
        courses,
        progress,
        settings
      });
    } catch (error) {
      console.error('Failed to refresh offline data:', error);
    }
  };

  const getOfflineFallback = (dataType: string, fallbackData: any = null) => {
    if (isOnline) {
      return null; // Use network data when online
    }

    switch (dataType) {
      case 'courses':
        return offlineData.courses.length > 0 ? offlineData.courses : fallbackData;
      case 'progress':
        return offlineData.progress.length > 0 ? offlineData.progress : fallbackData;
      case 'settings':
        return offlineData.settings || fallbackData;
      default:
        return fallbackData;
    }
  };

  const value: OfflineContextType = {
    isOnline,
    isOfflineCapable,
    offlineData,
    refreshOfflineData,
    getOfflineFallback
  };

  return (
    <OfflineContext.Provider value={value}>
      {children}
    </OfflineContext.Provider>
  );
};

export const useOfflineContext = (): OfflineContextType => {
  const context = useContext(OfflineContext);
  if (!context) {
    throw new Error('useOfflineContext must be used within an OfflineProvider');
  }
  return context;
};

// Higher-order component to make any component offline-aware
export const withOfflineSupport = <P extends object>(
  Component: React.ComponentType<P>
) => {
  const OfflineAwareComponent: React.FC<P> = (props) => {
    const { isOnline, getOfflineFallback } = useOfflineContext();
    
    return (
      <Component 
        {...props} 
        isOnline={isOnline}
        getOfflineFallback={getOfflineFallback}
      />
    );
  };

  OfflineAwareComponent.displayName = `withOfflineSupport(${Component.displayName || Component.name})`;
  
  return OfflineAwareComponent;
};
