import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Shield,
  CheckCircle,
  XCircle,
  Loader2,
  ArrowLeft,
  Key,
  RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';
import { useSupabaseMFA } from '@/hooks/useSupabaseMFA';
import SupabaseMFAService from '@/services/supabaseMFAService';

interface SupabaseBackupCodeVerificationProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  onBack: () => void;
  userEmail: string;
  onRedirectToMFASetup?: () => void; // New prop for redirecting to MFA setup
}

export const SupabaseBackupCodeVerification: React.FC<SupabaseBackupCodeVerificationProps> = ({
  isOpen,
  onClose,
  onSuccess,
  onBack,
  userEmail,
  onRedirectToMFASetup
}) => {
  const { verifyBackupCode } = useSupabaseMFA();
  const [backupCode, setBackupCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshingSession, setIsRefreshingSession] = useState(false);

  const handleRefreshSession = async () => {
    try {
      setIsRefreshingSession(true);
      setError(null);
      
      const success = await SupabaseMFAService.refreshSession();
      
      if (success) {
        toast.success('Session refreshed successfully');
        setError(null);
      } else {
        setError('Failed to refresh session. Please try logging in again.');
      }
    } catch (err: any) {
      console.error('Error refreshing session:', err);
      setError('Session refresh failed. Please try logging in again.');
    } finally {
      setIsRefreshingSession(false);
    }
  };

  const handleVerifyBackupCode = async () => {
    if (!backupCode.trim() || backupCode.length < 8) {
      setError('Please enter a valid backup code');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // Try with session refresh first
      let success = false;
      try {
        success = await SupabaseMFAService.verifyBackupCodeWithSessionRefresh(backupCode.trim());
      } catch (sessionError: any) {
        success = await verifyBackupCode(backupCode.trim());
      }
      
      if (success) {
        toast.success('Backup code verified! You will be logged in and prompted to set up 2FA again.');
        
        // Close the backup code modal
        onClose();
        
        // Call onSuccess to complete login - MFA requirement check will handle the reset
        if (onSuccess) {
          onSuccess();
        }
      } else {
        setError('Invalid backup code. Please try again.');
      }
    } catch (err: any) {
      console.error('Error verifying backup code:', err);
      
      // Handle specific session-related errors
      if (err.message && err.message.includes('session')) {
        setError('Session expired. Please try refreshing your session or log in again.');
      } else if (err.message && err.message.includes('authenticated')) {
        setError('Authentication error. Please log in again.');
      } else if (err.message && err.message.includes('profile')) {
        setError('Unable to access user profile. Please try again or contact support.');
      } else {
        setError(err.message || 'Failed to verify backup code. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && backupCode.trim().length >= 8 && !isLoading) {
      handleVerifyBackupCode();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader className="pb-6">
          <DialogTitle className="flex items-center gap-3 text-2xl">
            <Key className="w-6 h-6 text-primary" />
            Backup Code Verification
          </DialogTitle>
          <DialogDescription className="text-base">
            Enter one of your backup codes to complete login
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div className="text-center">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Key className="w-8 h-8 text-primary" />
            </div>
            <p className="text-sm text-muted-foreground">
              Enter a backup code from your saved codes
            </p>
            <p className="text-sm font-medium text-foreground mt-1">
              {userEmail}
            </p>
          </div>

          <div className="space-y-3">
            <Label htmlFor="backup-code" className="text-base font-medium">Backup Code</Label>
            <Input
              id="backup-code"
              type="text"
              placeholder="Enter your backup code"
              value={backupCode}
              onChange={(e) => setBackupCode(e.target.value)}
              onKeyPress={handleKeyPress}
              className="text-center text-lg font-mono tracking-wider h-14"
              autoFocus
            />
            <p className="text-xs text-muted-foreground text-center">
              Backup codes are typically 8-10 characters long
            </p>
          </div>

          {error && (
            <Alert variant="destructive" className="text-base">
              <XCircle className="w-5 h-5" />
              <AlertDescription className="text-base">{error}</AlertDescription>
            </Alert>
          )}

          {/* Session refresh button for session-related errors */}
          {error && (error.includes('session') || error.includes('authentication')) && (
            <div className="text-center">
              <Button
                variant="outline"
                onClick={handleRefreshSession}
                disabled={isRefreshingSession}
                size="sm"
                className="mb-4"
              >
                {isRefreshingSession ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Refreshing Session...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Refresh Session
                  </>
                )}
              </Button>
            </div>
          )}

          <div className="flex gap-4">
            <Button
              variant="outline"
              onClick={onBack}
              disabled={isLoading}
              size="lg"
              className="flex-1"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <Button
              onClick={handleVerifyBackupCode}
              disabled={backupCode.trim().length < 8 || isLoading}
              size="lg"
              className="flex-1"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Verifying...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Verify & Login
                </>
              )}
            </Button>
          </div>

          <div className="text-center">
            <p className="text-sm text-muted-foreground">
              Don't have your backup codes?
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Contact your administrator for assistance
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
