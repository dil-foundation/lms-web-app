// Offline Indicator Component
// Shows offline status and cached data information

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { 
  WifiOff, 
  Download, 
  Clock, 
  AlertCircle,
  CheckCircle,
  RefreshCw
} from 'lucide-react';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { useSyncStatus } from '@/hooks/useOfflineData';
import { cn } from '@/lib/utils';

interface OfflineIndicatorProps {
  className?: string;
  variant?: 'compact' | 'detailed' | 'banner';
  showSyncStatus?: boolean;
  onSync?: () => void;
}

export const OfflineIndicator: React.FC<OfflineIndicatorProps> = ({
  className,
  variant = 'compact',
  showSyncStatus = true,
  onSync
}) => {
  const { isOnline, getConnectionDescription } = useNetworkStatus();
  const { pendingSync, hasPendingSync } = useSyncStatus();

  if (variant === 'compact') {
    return (
      <div className={cn("flex items-center space-x-2", className)}>
        {!isOnline && (
          <Badge variant="destructive" className="flex items-center space-x-1">
            <WifiOff className="h-3 w-3" />
            <span>Offline</span>
          </Badge>
        )}
        
        {showSyncStatus && hasPendingSync && (
          <Badge variant="secondary" className="flex items-center space-x-1">
            <Clock className="h-3 w-3" />
            <span>{pendingSync.total} pending</span>
          </Badge>
        )}
      </div>
    );
  }

  if (variant === 'banner') {
    if (isOnline && !hasPendingSync) return null;

    return (
      <Card className={cn("border-l-4", className, {
        "border-l-red-500 bg-red-50 dark:bg-red-950": !isOnline,
        "border-l-yellow-500 bg-yellow-50 dark:bg-yellow-950": isOnline && hasPendingSync
      })}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {!isOnline ? (
                <WifiOff className="h-5 w-5 text-red-600" />
              ) : (
                <Clock className="h-5 w-5 text-yellow-600" />
              )}
              
              <div>
                <p className="font-medium">
                  {!isOnline ? 'You\'re offline' : 'Sync pending'}
                </p>
                <p className="text-sm text-muted-foreground">
                  {!isOnline 
                    ? 'Some features may be limited. Your progress is saved locally.'
                    : `${pendingSync.total} items waiting to sync when connection improves.`
                  }
                </p>
              </div>
            </div>

            {onSync && hasPendingSync && isOnline && (
              <Button variant="outline" size="sm" onClick={onSync}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Sync Now
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Detailed variant
  return (
    <Card className={cn("", className)}>
      <CardContent className="p-4">
        <div className="space-y-4">
          {/* Connection Status */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {isOnline ? (
                <CheckCircle className="h-5 w-5 text-green-600" />
              ) : (
                <WifiOff className="h-5 w-5 text-red-600" />
              )}
              
              <div>
                <p className="font-medium">
                  {isOnline ? 'Connected' : 'Offline'}
                </p>
                <p className="text-sm text-muted-foreground">
                  {isOnline ? getConnectionDescription() : 'No internet connection'}
                </p>
              </div>
            </div>

            <Badge variant={isOnline ? "default" : "destructive"}>
              {isOnline ? 'Online' : 'Offline'}
            </Badge>
          </div>

          {/* Sync Status */}
          {showSyncStatus && (
            <div className="border-t pt-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  {hasPendingSync ? (
                    <Clock className="h-5 w-5 text-yellow-600" />
                  ) : (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  )}
                  
                  <div>
                    <p className="font-medium">
                      {hasPendingSync ? 'Sync Pending' : 'All Synced'}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {hasPendingSync 
                        ? `${pendingSync.progress} progress items, ${pendingSync.quizSubmissions} quiz submissions`
                        : 'All your data is up to date'
                      }
                    </p>
                  </div>
                </div>

                {onSync && hasPendingSync && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={onSync}
                    disabled={!isOnline}
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Sync
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Offline Features Info */}
          {!isOnline && (
            <div className="border-t pt-4">
              <div className="flex items-start space-x-3">
                <Download className="h-5 w-5 text-blue-600 mt-0.5" />
                <div>
                  <p className="font-medium text-blue-600">Offline Features Available</p>
                  <ul className="text-sm text-muted-foreground mt-1 space-y-1">
                    <li>• View downloaded courses</li>
                    <li>• Take quizzes (synced later)</li>
                    <li>• Track progress locally</li>
                    <li>• Access cached content</li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

// Simple status badge for headers/toolbars
export const OfflineStatusBadge: React.FC<{
  className?: string;
}> = ({ className }) => {
  const { isOnline } = useNetworkStatus();
  const { hasPendingSync } = useSyncStatus();

  if (isOnline && !hasPendingSync) return null;

  return (
    <div className={cn("flex items-center space-x-1", className)}>
      {!isOnline && (
        <Badge variant="destructive" className="text-xs">
          <WifiOff className="h-3 w-3 mr-1" />
          Offline
        </Badge>
      )}
      
      {hasPendingSync && (
        <Badge variant="secondary" className="text-xs">
          <Clock className="h-3 w-3 mr-1" />
          Sync pending
        </Badge>
      )}
    </div>
  );
};

// Floating offline indicator
export const FloatingOfflineIndicator: React.FC<{
  className?: string;
  onSync?: () => void;
}> = ({ className, onSync }) => {
  const { isOnline } = useNetworkStatus();
  const { hasPendingSync, pendingSync } = useSyncStatus();

  if (isOnline && !hasPendingSync) return null;

  return (
    <div className={cn(
      "fixed bottom-4 right-4 z-50 max-w-sm",
      "animate-in slide-in-from-bottom-2 fade-in-0 duration-300",
      className
    )}>
      <Card className="shadow-lg border-l-4 border-l-yellow-500">
        <CardContent className="p-3">
          <div className="flex items-center space-x-3">
            {!isOnline ? (
              <WifiOff className="h-4 w-4 text-red-600 flex-shrink-0" />
            ) : (
              <Clock className="h-4 w-4 text-yellow-600 flex-shrink-0" />
            )}
            
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">
                {!isOnline ? 'Working offline' : 'Sync pending'}
              </p>
              <p className="text-xs text-muted-foreground">
                {!isOnline 
                  ? 'Your progress is saved locally'
                  : `${pendingSync.total} items to sync`
                }
              </p>
            </div>

            {onSync && hasPendingSync && isOnline && (
              <Button variant="ghost" size="sm" onClick={onSync}>
                <RefreshCw className="h-3 w-3" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
