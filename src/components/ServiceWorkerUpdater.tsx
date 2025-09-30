import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, Download, Wifi, WifiOff } from 'lucide-react';
import { toast } from 'sonner';

interface ServiceWorkerUpdaterProps {
  registration?: ServiceWorkerRegistration;
}

export const ServiceWorkerUpdater: React.FC<ServiceWorkerUpdaterProps> = ({ 
  registration 
}) => {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isUpdating, setIsUpdating] = useState(false);

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

  useEffect(() => {
    if (registration) {
      const handleUpdateFound = () => {
        const installingWorker = registration.installing;
        if (installingWorker) {
          installingWorker.addEventListener('statechange', () => {
            if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
              setUpdateAvailable(true);
              toast.info('New app version available! Click to update.', {
                duration: 10000,
                action: {
                  label: 'Update',
                  onClick: handleUpdate
                }
              });
            }
          });
        }
      };

      registration.addEventListener('updatefound', handleUpdateFound);
      
      return () => {
        registration.removeEventListener('updatefound', handleUpdateFound);
      };
    }
  }, [registration]);

  const handleUpdate = async () => {
    if (!registration || !registration.waiting) return;

    setIsUpdating(true);
    
    try {
      // Tell the waiting service worker to skip waiting
      registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      
      // Listen for the controlling service worker to change
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        // Reload the page to get the new version
        window.location.reload();
      });
      
      toast.success('Updating app...', {
        duration: 2000
      });
    } catch (error) {
      console.error('Failed to update service worker:', error);
      toast.error('Failed to update app. Please refresh manually.');
      setIsUpdating(false);
    }
  };

  const handleForceRefresh = () => {
    window.location.reload();
  };

  // Don't render anything if no update is available and we're online
  if (!updateAvailable && isOnline) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm">
      <Card className="shadow-lg border-2">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              {isOnline ? (
                <Wifi className="w-4 h-4 text-green-600" />
              ) : (
                <WifiOff className="w-4 h-4 text-red-600" />
              )}
              <span className="font-medium text-sm">
                {updateAvailable ? 'Update Available' : 'Offline Mode'}
              </span>
            </div>
            <Badge variant={updateAvailable ? 'default' : 'secondary'} className="text-xs">
              {updateAvailable ? 'New Version' : isOnline ? 'Online' : 'Offline'}
            </Badge>
          </div>

          {updateAvailable ? (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                A new version of the app is available with improvements and bug fixes.
              </p>
              <div className="flex gap-2">
                <Button
                  onClick={handleUpdate}
                  disabled={isUpdating}
                  size="sm"
                  className="flex-1"
                >
                  {isUpdating ? (
                    <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
                  ) : (
                    <Download className="w-3 h-3 mr-1" />
                  )}
                  {isUpdating ? 'Updating...' : 'Update Now'}
                </Button>
                <Button
                  onClick={() => setUpdateAvailable(false)}
                  variant="outline"
                  size="sm"
                >
                  Later
                </Button>
              </div>
            </div>
          ) : !isOnline ? (
            <div>
              <p className="text-sm text-muted-foreground">
                You're currently offline. Some features may be limited.
              </p>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
};
