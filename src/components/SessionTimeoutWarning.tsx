import React, { useState, useEffect } from 'react';
import { AlertTriangle, Clock, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import SessionService from '@/services/sessionService';
import { useAuth } from '@/hooks/useAuth';

interface SessionTimeoutWarningProps {
  isVisible: boolean;
  timeRemaining: number; // in seconds
  onExtendSession: () => void;
  onDismiss: () => void;
}

export const SessionTimeoutWarning: React.FC<SessionTimeoutWarningProps> = ({
  isVisible,
  timeRemaining,
  onExtendSession,
  onDismiss
}) => {
  const { session } = useAuth();
  const [isExtending, setIsExtending] = useState(false);
  const [countdown, setCountdown] = useState(timeRemaining);

  // Update countdown
  useEffect(() => {
    if (!isVisible || countdown <= 0) return;

    const interval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isVisible, countdown]);

  // Update countdown when timeRemaining prop changes
  useEffect(() => {
    setCountdown(timeRemaining);
  }, [timeRemaining]);

  const handleExtendSession = async () => {
    if (!session?.access_token) return;

    try {
      setIsExtending(true);
      
      // Update session activity in database
      await SessionService.updateSessionActivity(session.access_token);
      
      // Call the parent's extend session handler
      onExtendSession();
      
      toast.success('Session extended successfully');
    } catch (error) {
      console.error('Error extending session:', error);
      toast.error('Failed to extend session. Please log in again.');
    } finally {
      setIsExtending(false);
    }
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  if (!isVisible) return null;

  return (
    <div 
      className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={(e) => e.stopPropagation()}
      data-session-warning
    >
      <Card className="w-full max-w-md border-0 shadow-2xl bg-card/95 backdrop-blur-sm">
        <CardHeader className="text-center pb-4">
          <div className="mx-auto mb-4 w-12 h-12 bg-gradient-to-br from-destructive to-destructive/80 rounded-full flex items-center justify-center shadow-lg">
            <AlertTriangle className="w-6 h-6 text-destructive-foreground" />
          </div>
          <CardTitle className="text-xl font-semibold text-foreground">
            Session Timeout Warning
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            Your session will expire soon due to inactivity
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Countdown Timer */}
          <div className="flex items-center justify-center gap-3 p-6 bg-gradient-to-r from-destructive/10 to-destructive/5 dark:from-destructive/20 dark:to-destructive/10 rounded-xl border border-destructive/20 dark:border-destructive/30">
            <Clock className="w-6 h-6 text-destructive" />
            <div className="text-center">
              <div className="text-2xl font-mono font-bold text-destructive">
                {formatTime(countdown)}
              </div>
              <div className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                Remaining
              </div>
            </div>
          </div>
          
          {/* Message */}
          <div className="text-center space-y-2">
            <p className="text-sm text-muted-foreground leading-relaxed">
              To continue using the application, please extend your session or you will be automatically logged out.
            </p>
          </div>
          
          {/* Action Buttons */}
          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              onClick={(e) => {
                e.stopPropagation();
                onDismiss();
              }}
              className="flex-1 h-11 border-border hover:bg-muted/50 transition-colors"
            >
              Dismiss
            </Button>
            <Button
              onClick={(e) => {
                e.stopPropagation();
                handleExtendSession();
              }}
              disabled={isExtending}
              className="flex-1 h-11 bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary text-primary-foreground font-medium shadow-lg hover:shadow-xl transition-all duration-200 hover:-translate-y-0.5 border-0"
            >
              {isExtending ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Extending...
                </>
              ) : (
                'Extend Session'
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
