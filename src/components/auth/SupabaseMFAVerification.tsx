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
  ArrowLeft 
} from 'lucide-react';
import { toast } from 'sonner';
import { useSupabaseMFA } from '@/hooks/useSupabaseMFA';
import { SupabaseBackupCodeVerification } from './SupabaseBackupCodeVerification';

interface SupabaseMFAVerificationProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  onBack: () => void;
  userEmail: string;
}

export const SupabaseMFAVerification: React.FC<SupabaseMFAVerificationProps> = ({
  isOpen,
  onClose,
  onSuccess,
  onBack,
  userEmail
}) => {
  const { verifyMFACode } = useSupabaseMFA();
  const [verificationCode, setVerificationCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showBackupCodeModal, setShowBackupCodeModal] = useState(false);

  const handleVerifyCode = async () => {
    if (!verificationCode.trim() || verificationCode.length !== 6) {
      setError('Please enter a valid 6-digit code');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const success = await verifyMFACode(verificationCode.trim());
      
      if (success) {
        toast.success('Two-factor authentication verified successfully!');
        onSuccess();
      } else {
        setError('Invalid verification code. Please try again.');
      }
    } catch (err: any) {
      console.error('Error verifying MFA code:', err);
      setError(err.message || 'Failed to verify code. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && verificationCode.length === 6 && !isLoading) {
      handleVerifyCode();
    }
  };

  const handleBackupCodeSuccess = () => {
    console.log('🔐 Backup code success handler called');
    setShowBackupCodeModal(false);
    // Call onSuccess to complete login - MFA requirement check will handle the reset
    console.log('🔐 Calling onSuccess to complete login...');
    onSuccess();
  };

  const handleBackupCodeBack = () => {
    setShowBackupCodeModal(false);
  };

  const handleRedirectToMFASetup = () => {
    setShowBackupCodeModal(false);
    // Close the current MFA verification modal
    onClose();
    // Redirect to dashboard - the MFA requirement component will show setup screen
    console.log('🔐 Backup code verified - redirecting to dashboard for MFA setup');
    window.location.href = '/dashboard';
  };

  return (
    <>
      <Dialog open={isOpen && !showBackupCodeModal} onOpenChange={onClose}>
        <DialogContent className="max-w-md">
          <DialogHeader className="pb-6">
            <DialogTitle className="flex items-center gap-3 text-2xl">
              <Shield className="w-6 h-6 text-primary" />
              Two-Factor Authentication
            </DialogTitle>
            <DialogDescription className="text-base">
              Enter the 6-digit code from your authenticator app to complete login
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Shield className="w-8 h-8 text-primary" />
              </div>
              <p className="text-sm text-muted-foreground">
                Code sent to your authenticator app
              </p>
              <p className="text-sm font-medium text-foreground mt-1">
                {userEmail}
              </p>
            </div>

            <div className="space-y-3">
              <Label htmlFor="verification-code" className="text-base font-medium">Verification Code</Label>
              <Input
                id="verification-code"
                type="text"
                placeholder="000000"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                onKeyPress={handleKeyPress}
                maxLength={6}
                className="text-center text-2xl font-mono tracking-widest h-14"
                autoFocus
              />
            </div>

            {error && (
              <Alert variant="destructive" className="text-base">
                <XCircle className="w-5 h-5" />
                <AlertDescription className="text-base">{error}</AlertDescription>
              </Alert>
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
                onClick={handleVerifyCode}
                disabled={verificationCode.length !== 6 || isLoading}
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
                Don't have access to your authenticator app?
              </p>
              <Button
                variant="link"
                onClick={() => setShowBackupCodeModal(true)}
                className="text-sm"
              >
                Use backup code
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <SupabaseBackupCodeVerification
        isOpen={showBackupCodeModal}
        onClose={() => setShowBackupCodeModal(false)}
        onSuccess={handleBackupCodeSuccess}
        onBack={handleBackupCodeBack}
        userEmail={userEmail}
        onRedirectToMFASetup={handleRedirectToMFASetup}
      />
    </>
  );
};
