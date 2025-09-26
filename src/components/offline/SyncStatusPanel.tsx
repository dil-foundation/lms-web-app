// Sync Status Panel Component
// Displays detailed synchronization status and controls

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  RefreshCw, 
  CheckCircle, 
  AlertCircle, 
  Clock, 
  Wifi,
  WifiOff,
  Play,
  Pause,
  Settings,
  Info,
  X
} from 'lucide-react';
import { syncEngine, SyncStatus } from '@/services/syncEngine';
import { offlineProgressTracker } from '@/services/offlineProgressTracker';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface SyncStatusPanelProps {
  className?: string;
  showDetails?: boolean;
  autoRefresh?: boolean;
}

export const SyncStatusPanel: React.FC<SyncStatusPanelProps> = ({
  className,
  showDetails = true,
  autoRefresh = true
}) => {
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(syncEngine.getCurrentStatus());
  const [pendingItems, setPendingItems] = useState({ progress: 0, submissions: 0, total: 0 });
  const [isManualSyncing, setIsManualSyncing] = useState(false);
  const { isOnline, getConnectionDescription } = useNetworkStatus();

  // Subscribe to sync status updates
  useEffect(() => {
    const unsubscribe = syncEngine.subscribeToStatus((status) => {
      setSyncStatus(status);
    });

    return unsubscribe;
  }, []);

  // Fetch pending items
  const fetchPendingItems = async () => {
    try {
      const pending = await offlineProgressTracker.getPendingSyncItems();
      setPendingItems({
        progress: pending.progress.length,
        submissions: pending.submissions.length,
        total: pending.total
      });
    } catch (error) {
      console.error('Failed to fetch pending items:', error);
    }
  };

  // Auto-refresh pending items
  useEffect(() => {
    fetchPendingItems();

    if (autoRefresh) {
      const interval = setInterval(fetchPendingItems, 10000); // Every 10 seconds
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  const handleManualSync = async () => {
    if (!isOnline) {
      toast.error('Cannot sync while offline');
      return;
    }

    try {
      setIsManualSyncing(true);
      await offlineProgressTracker.syncAllPending();
      await fetchPendingItems();
    } catch (error) {
      toast.error('Sync failed');
    } finally {
      setIsManualSyncing(false);
    }
  };

  const getSyncStatusColor = () => {
    if (syncStatus.isRunning) return 'text-blue-600';
    if (syncStatus.failedItems > 0) return 'text-red-600';
    if (pendingItems.total > 0) return 'text-yellow-600';
    return 'text-green-600';
  };

  const getSyncStatusIcon = () => {
    if (syncStatus.isRunning) {
      return <RefreshCw className="h-5 w-5 animate-spin text-blue-600" />;
    }
    if (syncStatus.failedItems > 0) {
      return <AlertCircle className="h-5 w-5 text-red-600" />;
    }
    if (pendingItems.total > 0) {
      return <Clock className="h-5 w-5 text-yellow-600" />;
    }
    return <CheckCircle className="h-5 w-5 text-green-600" />;
  };

  const getSyncStatusText = () => {
    if (syncStatus.isRunning) {
      return `Syncing... (${syncStatus.completedItems}/${syncStatus.totalItems})`;
    }
    if (syncStatus.failedItems > 0) {
      return `${syncStatus.failedItems} items failed to sync`;
    }
    if (pendingItems.total > 0) {
      return `${pendingItems.total} items pending sync`;
    }
    return 'All data synced';
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span>Sync Status</span>
            {getSyncStatusIcon()}
          </div>
          
          <div className="flex items-center space-x-2">
            {/* Network status indicator */}
            {isOnline ? (
              <Badge variant="outline" className="text-xs">
                <Wifi className="h-3 w-3 mr-1" />
                Online
              </Badge>
            ) : (
              <Badge variant="secondary" className="text-xs">
                <WifiOff className="h-3 w-3 mr-1" />
                Offline
              </Badge>
            )}
            
            <Button
              variant="ghost"
              size="sm"
              onClick={fetchPendingItems}
              disabled={syncStatus.isRunning}
            >
              <RefreshCw className={cn("h-4 w-4", syncStatus.isRunning && "animate-spin")} />
            </Button>
          </div>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Main status */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div>
              <p className={cn("font-medium", getSyncStatusColor())}>
                {getSyncStatusText()}
              </p>
              <p className="text-sm text-muted-foreground">
                {isOnline ? getConnectionDescription() : 'No internet connection'}
              </p>
            </div>
          </div>

          {pendingItems.total > 0 && isOnline && (
            <Button
              onClick={handleManualSync}
              disabled={syncStatus.isRunning || isManualSyncing}
              size="sm"
            >
              {isManualSyncing ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Play className="h-4 w-4 mr-2" />
              )}
              Sync Now
            </Button>
          )}
        </div>

        {/* Progress bar for active sync */}
        {syncStatus.isRunning && (
          <div className="space-y-2">
            <Progress value={syncStatus.progress} className="h-2" />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>
                {syncStatus.completedItems} of {syncStatus.totalItems} items
              </span>
              <span>{syncStatus.progress}%</span>
            </div>
            {syncStatus.currentItem && (
              <p className="text-xs text-muted-foreground">
                Current: {syncStatus.currentItem}
              </p>
            )}
          </div>
        )}

        {/* Pending items breakdown */}
        {showDetails && pendingItems.total > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium flex items-center space-x-2">
              <Info className="h-4 w-4" />
              <span>Pending Items</span>
            </h4>
            
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Progress Updates:</span>
                <Badge variant="secondary">{pendingItems.progress}</Badge>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Quiz Submissions:</span>
                <Badge variant="secondary">{pendingItems.submissions}</Badge>
              </div>
            </div>
          </div>
        )}

        {/* Error details */}
        {showDetails && syncStatus.errors.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium flex items-center space-x-2 text-red-600">
              <AlertCircle className="h-4 w-4" />
              <span>Recent Errors</span>
            </h4>
            
            <ScrollArea className="h-32">
              <div className="space-y-2">
                {syncStatus.errors.slice(0, 5).map((error, index) => (
                  <div key={index} className="p-2 bg-red-50 dark:bg-red-950 rounded text-xs">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="font-medium text-red-800 dark:text-red-200">
                          {error.type} - {error.itemId}
                        </p>
                        <p className="text-red-700 dark:text-red-300 mt-1">
                          {error.error}
                        </p>
                      </div>
                      <span className="text-red-600 dark:text-red-400 text-xs">
                        {error.timestamp.toLocaleTimeString()}
                      </span>
                    </div>
                  </div>
                ))}
                
                {syncStatus.errors.length > 5 && (
                  <p className="text-xs text-muted-foreground text-center">
                    +{syncStatus.errors.length - 5} more errors
                  </p>
                )}
              </div>
            </ScrollArea>
          </div>
        )}

        {/* Offline mode info */}
        {!isOnline && (
          <div className="flex items-start space-x-3 p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
            <WifiOff className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm">
              <p className="font-medium text-blue-800 dark:text-blue-200">
                Working Offline
              </p>
              <p className="text-blue-700 dark:text-blue-300">
                Your progress is being saved locally and will sync when you're back online.
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// Compact sync status for headers/toolbars
export const CompactSyncStatus: React.FC<{
  className?: string;
  onClick?: () => void;
}> = ({ className, onClick }) => {
  const [pendingCount, setPendingCount] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const { isOnline } = useNetworkStatus();

  useEffect(() => {
    const unsubscribe = syncEngine.subscribeToStatus((status) => {
      setIsRunning(status.isRunning);
    });

    const fetchPending = async () => {
      const pending = await offlineProgressTracker.getPendingSyncItems();
      setPendingCount(pending.total);
    };

    fetchPending();
    const interval = setInterval(fetchPending, 30000); // Every 30 seconds

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, []);

  if (!isOnline && pendingCount === 0) return null;

  return (
    <Button
      variant="ghost"
      size="sm"
      className={cn("h-8 px-2", className)}
      onClick={onClick}
    >
      {isRunning ? (
        <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
      ) : pendingCount > 0 ? (
        <Clock className="h-4 w-4 mr-1" />
      ) : (
        <CheckCircle className="h-4 w-4 mr-1" />
      )}
      
      <span className="text-xs">
        {isRunning ? 'Syncing...' : pendingCount > 0 ? `${pendingCount} pending` : 'Synced'}
      </span>
    </Button>
  );
};

// Floating sync status indicator
export const FloatingSyncStatus: React.FC<{
  className?: string;
  onSync?: () => void;
}> = ({ className, onSync }) => {
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(syncEngine.getCurrentStatus());
  const [pendingCount, setPendingCount] = useState(0);
  const { isOnline } = useNetworkStatus();

  useEffect(() => {
    const unsubscribe = syncEngine.subscribeToStatus(setSyncStatus);

    const fetchPending = async () => {
      const pending = await offlineProgressTracker.getPendingSyncItems();
      setPendingCount(pending.total);
    };

    fetchPending();
    const interval = setInterval(fetchPending, 15000); // Every 15 seconds

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, []);

  // Only show if there's something to sync or sync is running
  if (!syncStatus.isRunning && pendingCount === 0) return null;

  return (
    <div className={cn(
      "fixed bottom-20 right-4 z-40",
      "animate-in slide-in-from-bottom-2 fade-in-0 duration-300",
      className
    )}>
      <Card className="shadow-lg border-l-4 border-l-blue-500 max-w-xs">
        <CardContent className="p-3">
          <div className="flex items-center space-x-3">
            {syncStatus.isRunning ? (
              <RefreshCw className="h-4 w-4 text-blue-600 animate-spin flex-shrink-0" />
            ) : (
              <Clock className="h-4 w-4 text-yellow-600 flex-shrink-0" />
            )}
            
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">
                {syncStatus.isRunning ? 'Syncing data...' : `${pendingCount} items to sync`}
              </p>
              
              {syncStatus.isRunning && (
                <div className="mt-1">
                  <Progress value={syncStatus.progress} className="h-1" />
                  <p className="text-xs text-muted-foreground mt-1">
                    {syncStatus.completedItems}/{syncStatus.totalItems}
                  </p>
                </div>
              )}
            </div>

            {onSync && !syncStatus.isRunning && isOnline && (
              <Button variant="ghost" size="sm" onClick={onSync}>
                <Play className="h-3 w-3" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
