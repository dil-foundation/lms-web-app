// Network Status Banner Component
// Shows connection status and offline capabilities

import React from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Wifi, 
  WifiOff, 
  Signal, 
  SignalLow, 
  SignalMedium, 
  SignalHigh,
  Download,
  RefreshCw
} from 'lucide-react';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { cn } from '@/lib/utils';

interface NetworkStatusBannerProps {
  className?: string;
  showDetails?: boolean;
  onRetry?: () => void;
}

export const NetworkStatusBanner: React.FC<NetworkStatusBannerProps> = ({
  className,
  showDetails = false,
  onRetry
}) => {
  const networkStatus = useNetworkStatus();

  const getSignalIcon = () => {
    if (!networkStatus.isOnline) {
      return <WifiOff className="h-4 w-4" />;
    }

    const quality = networkStatus.getConnectionQuality();
    switch (quality) {
      case 'excellent':
        return <SignalHigh className="h-4 w-4 text-green-600" />;
      case 'good':
        return <SignalMedium className="h-4 w-4 text-blue-600" />;
      case 'fair':
        return <Signal className="h-4 w-4 text-yellow-600" />;
      case 'poor':
        return <SignalLow className="h-4 w-4 text-red-600" />;
      default:
        return <Wifi className="h-4 w-4" />;
    }
  };

  const getStatusColor = () => {
    if (!networkStatus.isOnline) return 'destructive';
    
    const quality = networkStatus.getConnectionQuality();
    switch (quality) {
      case 'excellent':
      case 'good':
        return 'default';
      case 'fair':
        return 'secondary';
      case 'poor':
        return 'destructive';
      default:
        return 'default';
    }
  };

  const getConnectionTypeIcon = () => {
    switch (networkStatus.connectionType) {
      case 'wifi':
        return <Wifi className="h-3 w-3" />;
      case 'cellular':
        return <Signal className="h-3 w-3" />;
      default:
        return null;
    }
  };

  // Don't show banner if online and not showing details
  if (networkStatus.isOnline && !showDetails) {
    return null;
  }

  return (
    <Alert 
      className={cn(
        "border-l-4 transition-all duration-300",
        networkStatus.isOnline 
          ? "border-l-green-500 bg-green-50 dark:bg-green-950" 
          : "border-l-red-500 bg-red-50 dark:bg-red-950",
        className
      )}
      variant={networkStatus.isOnline ? "default" : "destructive"}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          {getSignalIcon()}
          
          <div className="flex-1">
            <AlertDescription className="font-medium">
              {networkStatus.isOnline ? (
                <span className="text-green-800 dark:text-green-200">
                  {networkStatus.getConnectionDescription()}
                </span>
              ) : (
                <span className="text-red-800 dark:text-red-200">
                  You're offline - Some features may be limited
                </span>
              )}
            </AlertDescription>
            
            {showDetails && networkStatus.isOnline && (
              <div className="flex items-center space-x-4 mt-2 text-xs text-muted-foreground">
                <div className="flex items-center space-x-1">
                  {getConnectionTypeIcon()}
                  <span className="capitalize">{networkStatus.connectionType}</span>
                </div>
                
                <Badge variant="outline" className="text-xs">
                  {networkStatus.effectiveType.toUpperCase()}
                </Badge>
                
                {networkStatus.downlink > 0 && (
                  <span>{networkStatus.downlink.toFixed(1)} Mbps</span>
                )}
                
                {networkStatus.rtt > 0 && (
                  <span>{networkStatus.rtt}ms</span>
                )}
                
                {networkStatus.saveData && (
                  <Badge variant="secondary" className="text-xs">
                    <Download className="h-3 w-3 mr-1" />
                    Data Saver
                  </Badge>
                )}
              </div>
            )}
          </div>
        </div>

        {!networkStatus.isOnline && onRetry && (
          <Button 
            variant="outline" 
            size="sm"
            onClick={onRetry}
            className="ml-4"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        )}
      </div>
    </Alert>
  );
};

// Compact network status indicator for headers/toolbars
export const NetworkStatusIndicator: React.FC<{
  className?: string;
  showLabel?: boolean;
}> = ({ className, showLabel = false }) => {
  const networkStatus = useNetworkStatus();

  return (
    <div className={cn("flex items-center space-x-2", className)}>
      {networkStatus.isOnline ? (
        <>
          <div className="flex items-center space-x-1">
            {networkStatus.connectionType === 'wifi' ? (
              <Wifi className="h-4 w-4 text-green-600" />
            ) : (
              <Signal className="h-4 w-4 text-green-600" />
            )}
            {showLabel && (
              <span className="text-sm text-green-600 font-medium">Online</span>
            )}
          </div>
          
          <Badge 
            variant="outline" 
            className={cn(
              "text-xs",
              networkStatus.isSlowConnection && "border-yellow-500 text-yellow-700"
            )}
          >
            {networkStatus.effectiveType.toUpperCase()}
          </Badge>
        </>
      ) : (
        <div className="flex items-center space-x-1">
          <WifiOff className="h-4 w-4 text-red-600" />
          {showLabel && (
            <span className="text-sm text-red-600 font-medium">Offline</span>
          )}
        </div>
      )}
    </div>
  );
};
