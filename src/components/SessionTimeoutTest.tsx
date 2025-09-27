import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useSessionTimeout } from '@/hooks/useSessionTimeout';
import { useCrossTabSessionSync } from '@/hooks/useCrossTabSessionSync';

interface SessionTimeoutTestProps {
  className?: string;
}

export const SessionTimeoutTest: React.FC<SessionTimeoutTestProps> = ({ className }) => {
  const [logs, setLogs] = useState<Array<{ timestamp: number; message: string; type: 'info' | 'success' | 'warning' | 'error' }>>([]);
  const { updateLastActivity, getSessionTimeout } = useSessionTimeout();
  
  const {
    broadcastSessionExtended,
    broadcastSessionTimeout,
    subscribeToSessionExtended,
    subscribeToSessionTimeout
  } = useCrossTabSessionSync();

  const addLog = (message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info') => {
    setLogs(prev => [...prev, { timestamp: Date.now(), message, type }]);
  };

  useEffect(() => {
    addLog('Session timeout test component initialized', 'info');
    
    // Listen for session extensions
    const unsubscribeExtended = subscribeToSessionExtended((message) => {
      addLog(`Received session extended: ${JSON.stringify(message)}`, 'success');
    });

    // Listen for session timeouts
    const unsubscribeTimeout = subscribeToSessionTimeout((message) => {
      addLog(`Received session timeout: ${JSON.stringify(message)}`, 'warning');
    });

    return () => {
      unsubscribeExtended();
      unsubscribeTimeout();
    };
  }, [subscribeToSessionExtended, subscribeToSessionTimeout]);

  const handleTestActivity = () => {
    updateLastActivity();
    addLog('Activity updated manually', 'info');
  };

  const handleTestBroadcast = (type: 'extended' | 'timeout') => {
    if (type === 'extended') {
      broadcastSessionExtended();
      addLog('Broadcasted session extended', 'info');
    } else {
      broadcastSessionTimeout();
      addLog('Broadcasted session timeout', 'warning');
    }
  };

  const clearLogs = () => {
    setLogs([]);
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          🔧 Session Timeout Test
          <Badge variant="outline">Debug Tool</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-2">
          <Button 
            size="sm" 
            onClick={handleTestActivity}
            variant="outline"
          >
            Update Activity
          </Button>
          <Button 
            size="sm" 
            onClick={() => handleTestBroadcast('extended')}
            className="bg-green-600 hover:bg-green-700"
          >
            Test Session Extended
          </Button>
          <Button 
            size="sm" 
            onClick={() => handleTestBroadcast('timeout')}
            className="bg-red-600 hover:bg-red-700"
          >
            Test Session Timeout
          </Button>
          <Button 
            size="sm" 
            onClick={clearLogs}
            variant="destructive"
          >
            Clear Logs
          </Button>
        </div>
        
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium">Debug Logs</h4>
            <span className="text-xs text-gray-500">
              Current timeout: {getSessionTimeout()} minutes
            </span>
          </div>
          <div className="max-h-64 overflow-y-auto border rounded p-2 bg-gray-50">
            {logs.length === 0 ? (
              <p className="text-sm text-gray-500">No logs yet...</p>
            ) : (
              logs.map((log, index) => (
                <div key={index} className="text-xs mb-1 flex items-center gap-2">
                  <span className="text-gray-400">
                    {new Date(log.timestamp).toLocaleTimeString()}
                  </span>
                  <Badge 
                    variant={
                      log.type === 'success' ? 'default' :
                      log.type === 'warning' ? 'secondary' : 
                      log.type === 'error' ? 'destructive' : 'outline'
                    }
                    className="text-xs"
                  >
                    {log.type}
                  </Badge>
                  <span>{log.message}</span>
                </div>
              ))
            )}
          </div>
        </div>
        
        <div className="text-xs text-gray-600 space-y-1">
          <p><strong>Instructions:</strong></p>
          <p>1. Open multiple tabs of this application</p>
          <p>2. Click "Test Session Extended" in one tab</p>
          <p>3. Check if other tabs receive the message</p>
          <p>4. Click "Test Session Timeout" to test timeout broadcast</p>
          <p>5. Monitor console logs for detailed debugging</p>
        </div>
      </CardContent>
    </Card>
  );
};
