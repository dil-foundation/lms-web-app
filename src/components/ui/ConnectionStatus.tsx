import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Wifi, WifiOff, AlertCircle, Loader2 } from 'lucide-react';

interface ConnectionStatusProps {
  status: 'connected' | 'connecting' | 'disconnected' | 'error';
  onReconnect?: () => void;
  showReconnectButton?: boolean;
}

export const ConnectionStatus: React.FC<ConnectionStatusProps> = ({
  status,
  onReconnect,
  showReconnectButton = true
}) => {
  const getStatusConfig = () => {
    switch (status) {
      case 'connected':
        return {
          icon: <Wifi className="h-3 w-3" />,
          label: 'Connected',
          variant: 'default' as const,
          className: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
        };
      case 'connecting':
        return {
          icon: <Loader2 className="h-3 w-3 animate-spin" />,
          label: 'Connecting...',
          variant: 'secondary' as const,
          className: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400'
        };
      case 'disconnected':
        return {
          icon: <WifiOff className="h-3 w-3" />,
          label: 'Disconnected',
          variant: 'secondary' as const,
          className: 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400'
        };
      case 'error':
        return {
          icon: <AlertCircle className="h-3 w-3" />,
          label: 'Connection Error',
          variant: 'destructive' as const,
          className: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
        };
    }
  };

  const config = getStatusConfig();

  return (
    <div className="flex items-center gap-2">
      <Badge 
        variant={config.variant} 
        className={`${config.className} text-xs font-medium`}
      >
        {config.icon}
        <span className="ml-1">{config.label}</span>
      </Badge>
      
      {showReconnectButton && status === 'error' && onReconnect && (
        <button
          onClick={onReconnect}
          className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
        >
          Reconnect
        </button>
      )}
    </div>
  );
};
