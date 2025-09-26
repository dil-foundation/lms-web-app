import React, { Suspense } from 'react';
import { AlertTriangle, Wifi } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useLocation } from 'react-router-dom';

interface OfflineAwareSuspenseProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  offlineFallback?: React.ReactNode;
  allowOfflineRoutes?: string[];
}

/**
 * A Suspense wrapper that provides better offline handling for lazy-loaded components
 */
export const OfflineAwareSuspense: React.FC<OfflineAwareSuspenseProps> = ({
  children,
  fallback,
  offlineFallback,
  allowOfflineRoutes = ['/dashboard/offline-learning', '/dashboard/courses/:id/content']
}) => {
  const [isOnline, setIsOnline] = React.useState(navigator.onLine);
  const [hasError, setHasError] = React.useState(false);
  const location = useLocation();

  React.useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setHasError(false);
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const defaultFallback = (
    <div className="flex items-center justify-center h-64">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        <p className="text-muted-foreground">Loading...</p>
      </div>
    </div>
  );

  const defaultOfflineFallback = (
    <Card className="max-w-md mx-auto mt-8">
      <CardContent className="p-6 text-center">
        <div className="w-16 h-16 bg-orange-100 dark:bg-orange-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <AlertTriangle className="w-8 h-8 text-orange-600" />
        </div>
        <h3 className="text-lg font-semibold mb-2">Content Not Available Offline</h3>
        <p className="text-muted-foreground mb-4">
          This page requires an internet connection to load. Please check your connection and try again.
        </p>
        <Button 
          onClick={() => window.location.reload()} 
          variant="outline"
          className="w-full"
        >
          <Wifi className="w-4 h-4 mr-2" />
          Try Again
        </Button>
      </CardContent>
    </Card>
  );

  // Check if current route is allowed offline
  const isCurrentRouteAllowedOffline = React.useMemo(() => {
    const currentPath = location.pathname;
    return allowOfflineRoutes.some(pattern => {
      const regex = new RegExp(`^${pattern.replace(/:[a-zA-Z0-9_]+/g, '[^/]+')}$`);
      return regex.test(currentPath);
    });
  }, [location.pathname, allowOfflineRoutes]);

  // If offline but current route is allowed offline, use normal Suspense
  if (!isOnline && isCurrentRouteAllowedOffline) {
    return (
      <Suspense fallback={fallback || defaultFallback}>
        {children}
      </Suspense>
    );
  }

  // If offline and we have a specific offline fallback, show it
  if (!isOnline && offlineFallback) {
    return <>{offlineFallback}</>;
  }

  // If offline and no specific fallback, show default offline message
  if (!isOnline) {
    return defaultOfflineFallback;
  }

  // Online - use normal Suspense behavior
  return (
    <Suspense fallback={fallback || defaultFallback}>
      {children}
    </Suspense>
  );
};
