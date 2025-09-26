// Sync Status Indicator Component
// Shows the current sync status and allows manual sync trigger

import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff, RefreshCw, CheckCircle, AlertTriangle, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent } from '@/components/ui/card';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { backgroundSyncService, SyncStatus } from '@/services/backgroundSyncService';
import { toast } from 'sonner';

interface SyncStatusIndicatorProps {
  className?: string;
  showDetails?: boolean;
}

const SyncStatusIndicator: React.FC<SyncStatusIndicatorProps> = ({ 
  className = "", 
  showDetails = false 
}) => {
  const { isOnline } = useNetworkStatus();
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    isActive: false,
    progress: 0,
    currentItem: '',
    totalItems: 0,
    completedItems: 0
  });
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [isManualSyncing, setIsManualSyncing] = useState(false);

  useEffect(() => {
    // Subscribe to sync status updates
    const unsubscribe = backgroundSyncService.subscribeToSyncStatus((status) => {
      setSyncStatus(status);
      
      if (!status.isActive && status.completedItems > 0) {
        setLastSyncTime(new Date());
      }
    });

    return unsubscribe;
  }, []);

  const handleManualSync = async () => {
    if (!isOnline) {
      toast.error('Cannot sync while offline');
      return;
    }

    setIsManualSyncing(true);
    
    try {
      const result = await backgroundSyncService.forcSync();
      
      if (result.success) {
        toast.success(`Sync completed: ${result.syncedItems} items synced`);
      } else {
        toast.error(`Sync failed: ${result.failedItems} items failed`);
      }
    } catch (error) {
      console.error('[SyncStatusIndicator] Manual sync failed:', error);
      toast.error('Manual sync failed');
    } finally {
      setIsManualSyncing(false);
    }
  };

  const formatLastSyncTime = (date: Date): string => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  if (showDetails) {
    return (
      <Card className={`${className}`}>
        <CardContent className="pt-6">
          <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {isOnline ? (
                  <Wifi className="w-4 h-4 text-green-600" />
                ) : (
                  <WifiOff className="w-4 h-4 text-red-600" />
                )}
                <span className="font-medium">
                  {isOnline ? 'Online' : 'Offline'}
                </span>
              </div>
              
              <Button
                variant="outline"
                size="sm"
                onClick={handleManualSync}
                disabled={!isOnline || syncStatus.isActive || isManualSyncing}
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${(syncStatus.isActive || isManualSyncing) ? 'animate-spin' : ''}`} />
                Sync Now
              </Button>
            </div>

            {/* Sync Progress */}
            {syncStatus.isActive && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Syncing...</span>
                  <span className="text-muted-foreground">
                    {syncStatus.completedItems} / {syncStatus.totalItems}
                  </span>
                </div>
                <Progress value={syncStatus.progress} className="h-2" />
                <p className="text-xs text-muted-foreground">
                  {syncStatus.currentItem}
                </p>
              </div>
            )}

            {/* Last Sync Time */}
            {lastSyncTime && !syncStatus.isActive && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <span>Last synced {formatLastSyncTime(lastSyncTime)}</span>
              </div>
            )}

            {/* Offline Warning */}
            {!isOnline && (
              <div className="flex items-center gap-2 text-sm text-orange-600">
                <AlertTriangle className="w-4 h-4" />
                <span>Changes will sync when back online</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Compact version
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {syncStatus.isActive ? (
        <Badge variant="secondary" className="animate-pulse">
          <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
          Syncing...
        </Badge>
      ) : isOnline ? (
        <Badge variant="outline" className="text-green-600 border-green-200">
          <Wifi className="w-3 h-3 mr-1" />
          Online
        </Badge>
      ) : (
        <Badge variant="outline" className="text-orange-600 border-orange-200">
          <WifiOff className="w-3 h-3 mr-1" />
          Offline
        </Badge>
      )}

      {lastSyncTime && !syncStatus.isActive && (
        <span className="text-xs text-muted-foreground">
          Synced {formatLastSyncTime(lastSyncTime)}
        </span>
      )}
    </div>
  );
};

export default SyncStatusIndicator;
