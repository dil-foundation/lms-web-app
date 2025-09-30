import React, { ReactNode } from 'react';
import { useOfflineRouteGuard, UseOfflineRouteGuardOptions } from '@/hooks/useOfflineRouteGuard';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ContentLoader } from '@/components/ContentLoader';
import { 
  Wifi, 
  WifiOff, 
  Download, 
  RefreshCw, 
  AlertTriangle,
  CheckCircle,
  Signal
} from 'lucide-react';

interface OfflineRouteGuardProps extends UseOfflineRouteGuardOptions {
  children: ReactNode;
  fallback?: ReactNode;
  showConnectionStatus?: boolean;
  showLoadingState?: boolean;
}

// Connection quality indicator component
const ConnectionQualityIndicator: React.FC<{
  quality: 'excellent' | 'good' | 'poor' | 'offline';
  type: string;
}> = ({ quality, type }) => {
  const getQualityConfig = () => {
    switch (quality) {
      case 'excellent':
        return {
          icon: <Signal className="w-4 h-4" />,
          color: 'bg-green-500',
          text: 'Excellent',
          description: `Strong ${type} connection`,
        };
      case 'good':
        return {
          icon: <Wifi className="w-4 h-4" />,
          color: 'bg-blue-500',
          text: 'Good',
          description: `Stable ${type} connection`,
        };
      case 'poor':
        return {
          icon: <AlertTriangle className="w-4 h-4" />,
          color: 'bg-yellow-500',
          text: 'Poor',
          description: `Slow ${type} connection`,
        };
      case 'offline':
      default:
        return {
          icon: <WifiOff className="w-4 h-4" />,
          color: 'bg-red-500',
          text: 'Offline',
          description: 'No internet connection',
        };
    }
  };

  const config = getQualityConfig();

  return (
    <div className="flex items-center gap-2">
      <div className={`w-2 h-2 rounded-full ${config.color}`} />
      <span className="text-sm font-medium">{config.text}</span>
      <span className="text-xs text-muted-foreground">({config.description})</span>
    </div>
  );
};

// Offline access denied component
const OfflineAccessDenied: React.FC<{
  connectionType: string;
  connectionQuality: string;
  onRefresh: () => void;
  isRefreshing: boolean;
}> = ({ connectionType, connectionQuality, onRefresh, isRefreshing }) => (
  <div className="min-h-screen flex items-center justify-center bg-background p-4">
    <Card className="w-full max-w-md mx-auto">
      <CardContent className="p-8 text-center space-y-6">
        {/* Offline Icon */}
        <div className="w-16 h-16 mx-auto bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center">
          <WifiOff className="w-8 h-8 text-red-600 dark:text-red-400" />
        </div>

        {/* Title and Description */}
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-foreground">
            You're Offline
          </h2>
          <p className="text-muted-foreground">
            This page requires an internet connection. You'll be redirected to available offline content.
          </p>
        </div>

        {/* Connection Status */}
        <div className="p-4 bg-muted/50 rounded-lg space-y-3">
          <div className="flex items-center justify-center gap-2">
            <Badge variant="destructive" className="flex items-center gap-1">
              <WifiOff className="w-3 h-3" />
              Offline
            </Badge>
          </div>
          
          <ConnectionQualityIndicator 
            quality={connectionQuality as any} 
            type={connectionType} 
          />
        </div>

        {/* Available Actions */}
        <div className="space-y-3">
          <Button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="w-full"
            variant="outline"
          >
            {isRefreshing ? (
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4 mr-2" />
            )}
            Check Connection
          </Button>

          <div className="text-xs text-muted-foreground">
            You'll be automatically redirected to offline content
          </div>
        </div>
      </CardContent>
    </Card>
  </div>
);

// Connection status banner component
const ConnectionStatusBanner: React.FC<{
  isOnline: boolean;
  connectionType: string;
  connectionQuality: string;
  onRefresh: () => void;
}> = ({ isOnline, connectionType, connectionQuality }) => {
  if (isOnline && connectionQuality !== 'poor') {
    return null; // Don't show banner for good connections
  }

  return (
    <div className={`w-full p-3 ${
      isOnline 
        ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800' 
        : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
    } border-b`}>
      <div className="flex items-center justify-center max-w-7xl mx-auto">
        <div className="flex items-center gap-3">
          {isOnline ? (
            <AlertTriangle className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
          ) : (
            <WifiOff className="w-4 h-4 text-red-600 dark:text-red-400" />
          )}
          
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium">
              {isOnline ? 'Slow Connection' : 'You\'re Offline'}
            </span>
            
            <ConnectionQualityIndicator 
              quality={connectionQuality as any} 
              type={connectionType} 
            />
          </div>
        </div>
      </div>
    </div>
  );
};

// Loading state component
const OfflineGuardLoading: React.FC = () => (
  <div className="flex items-center justify-center p-8">
    <div className="text-center space-y-4">
      <div className="w-8 h-8 mx-auto">
        <RefreshCw className="w-8 h-8 animate-spin text-primary" />
      </div>
      <div className="space-y-1">
        <p className="text-sm font-medium">Checking connection...</p>
        <p className="text-xs text-muted-foreground">Please wait</p>
      </div>
    </div>
  </div>
);

export const OfflineRouteGuard: React.FC<OfflineRouteGuardProps> = ({
  children,
  fallback,
  showConnectionStatus = true,
  showLoadingState = true,
  ...guardOptions
}) => {
  const {
    isOnline,
    connectionType,
    connectionQuality,
    isProtectionEnabled,
    currentRouteAllowed,
    getOfflineStatus,
  } = useOfflineRouteGuard(guardOptions);

  // Get refresh function from network status hook
  const { refreshNetworkStatus, isChecking } = useNetworkStatus();

  const handleRefresh = () => {
    refreshNetworkStatus();
  };

  // Show loading state while checking connection (if enabled)
  if (showLoadingState && isChecking) {
    return <OfflineGuardLoading />;
  }

  // If protection is not enabled for this user, render children normally
  if (!isProtectionEnabled) {
    return (
      <>
        {showConnectionStatus && (
          <ConnectionStatusBanner
            isOnline={isOnline}
            connectionType={connectionType}
            connectionQuality={connectionQuality}
            onRefresh={handleRefresh}
          />
        )}
        {children}
      </>
    );
  }

  // If offline and current route is not allowed, show access denied or fallback
  if (!isOnline && !currentRouteAllowed) {
    if (fallback) {
      return <>{fallback}</>;
    }

    return (
      <OfflineAccessDenied
        connectionType={connectionType}
        connectionQuality={connectionQuality}
        onRefresh={handleRefresh}
        isRefreshing={isChecking}
      />
    );
  }

  // Render children with optional connection status banner
  return (
    <>
      {showConnectionStatus && (
        <ConnectionStatusBanner
          isOnline={isOnline}
          connectionType={connectionType}
          connectionQuality={connectionQuality}
          onRefresh={handleRefresh}
        />
      )}
      {children}
    </>
  );
};

export default OfflineRouteGuard;
