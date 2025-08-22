import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Shield, 
  CheckCircle, 
  XCircle, 
  Loader2, 
  Download,
  Copy,
  Smartphone,
  Key
} from 'lucide-react';
import { toast } from 'sonner';
import { useSupabaseMFA } from '@/hooks/useSupabaseMFA';
import SupabaseMFAService from '@/services/supabaseMFAService';
import { supabase } from '@/integrations/supabase/client';

interface SupabaseMFASetupProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const SupabaseMFASetup: React.FC<SupabaseMFASetupProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const { 
    setupData, 
    loading, 
    startMFASetup, 
    completeMFASetup, 
    handleExistingFactor, 
    removeExistingFactor 
  } = useSupabaseMFA();
  const [verificationCode, setVerificationCode] = useState('');
  const [step, setStep] = useState<'initial' | 'qr' | 'verification' | 'complete'>('initial');
  const [error, setError] = useState<string | null>(null);

  const handleStartSetup = async () => {
    try {
      setError(null);
      
      // Check for existing factors first
      const { hasExisting, factorId } = await handleExistingFactor();
      
      if (hasExisting) {
        // If there's an existing unverified factor, go directly to verification
        setStep('verification');
        return;
      }
      
      // Otherwise, start fresh setup
      await startMFASetup();
      setStep('qr');
    } catch (error: any) {
      console.error('Error in handleStartSetup:', error);
      setError(error.message || 'Failed to start MFA setup');
      // Clean up on error
      SupabaseMFAService.cleanupMFAData();
    }
  };

  const handleVerifyCode = async () => {
    if (!verificationCode.trim() || verificationCode.length !== 6) {
      setError('Please enter a valid 6-digit code');
      return;
    }

    try {
      setError(null);
      
      // First verify the factor with the code
      const factorId = sessionStorage.getItem('mfa_factor_id');
      if (!factorId) {
        throw new Error('No factor ID found. Please restart the setup process.');
      }
      
      // Challenge the factor
      const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
        factorId: factorId
      });
      
      if (challengeError) {
        throw challengeError;
      }

      // Verify the challenge with the code
      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId: factorId,
        challengeId: challengeData.id,
        code: verificationCode.trim()
      });

      if (verifyError) {
        throw verifyError;
      }

      // Now complete the MFA setup
      const success = await completeMFASetup();
      if (success) {
        setStep('complete');
        setTimeout(() => {
          onSuccess();
        }, 2000);
      }
    } catch (error: any) {
      console.error('Verification error:', error);
      setError(error.message || 'Failed to verify code');
      // Clean up on error
      SupabaseMFAService.cleanupMFAData();
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && verificationCode.length === 6 && !loading) {
      handleVerifyCode();
    }
  };

  const copySecret = () => {
    if (setupData?.secret) {
      navigator.clipboard.writeText(setupData.secret);
      toast.success('Secret copied to clipboard');
    }
  };

  const downloadBackupCodes = () => {
    if (setupData?.backup_codes) {
      const content = `Backup Codes for MFA:\n\n${setupData.backup_codes.join('\n')}\n\nKeep these codes safe in case you lose access to your authenticator app.`;
      const blob = new Blob([content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'mfa-backup-codes.txt';
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Backup codes downloaded');
    }
  };

  const renderStep = () => {
    switch (step) {
                          case 'initial':
         return (
           <div className="space-y-8">
             <div className="text-center">
               <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
                 <Shield className="w-10 h-10 text-primary" />
               </div>
               <h3 className="text-2xl font-semibold mb-3">Set Up Two-Factor Authentication</h3>
               <p className="text-muted-foreground text-lg">
                 Enhance your account security by enabling two-factor authentication using Supabase's native MFA.
               </p>
             </div>

             <div className="space-y-6">
               <div className="flex items-start gap-4 p-6 border-2 border-dashed border-primary/20 rounded-xl bg-primary/5">
                 <Smartphone className="w-6 h-6 text-primary mt-1" />
                 <div>
                   <h4 className="font-semibold text-lg mb-2">Authenticator App</h4>
                   <p className="text-muted-foreground">
                     Use apps like Google Authenticator, Authy, or Microsoft Authenticator
                   </p>
                 </div>
               </div>

               <div className="flex items-start gap-4 p-6 border-2 border-dashed border-primary/20 rounded-xl bg-primary/5">
                 <Key className="w-6 h-6 text-primary mt-1" />
                 <div>
                   <h4 className="font-semibold text-lg mb-2">Backup Codes</h4>
                   <p className="text-muted-foreground">
                     Save backup codes for account recovery if you lose your device
                   </p>
                 </div>
               </div>
             </div>

             <div className="space-y-3">
               <Button 
                 onClick={handleStartSetup} 
                 disabled={loading}
                 className="w-full h-12 text-lg"
                 size="lg"
               >
                 {loading ? (
                   <>
                     <Loader2 className="w-5 h-5 mr-3 animate-spin" />
                     Setting up...
                   </>
                 ) : (
                   <>
                     <Shield className="w-5 h-5 mr-3" />
                     Continue Setup
                   </>
                 )}
               </Button>
               
                               <Button 
                  variant="outline"
                  onClick={async () => {
                    try {
                      setError(null);
                      await removeExistingFactor();
                      const setupData = await startMFASetup();
                      setStep('qr');
                    } catch (error: any) {
                      console.error('Fresh setup error:', error);
                      setError(error.message || 'Failed to start fresh setup');
                    }
                  }}
                  disabled={loading}
                  className="w-full h-10"
                  size="default"
                >
                  Start Fresh Setup
                </Button>
             </div>
           </div>
         );

                           case 'qr':
          return (
           <div className="space-y-8">
             <div className="text-center">
               <h3 className="text-2xl font-semibold mb-3">Scan QR Code</h3>
               <p className="text-muted-foreground text-lg">
                 Open your authenticator app and scan the QR code below
               </p>
             </div>

             {setupData && (
               <div className="space-y-8">
                 {/* QR Code Section */}
                 <div className="flex justify-center">
                   <div className="p-6 border-2 border-dashed border-primary/20 rounded-xl bg-primary/5">
                     <img 
                       src={setupData.qr_code} 
                       alt="MFA QR Code" 
                       className="w-64 h-64"
                     />
                   </div>
                 </div>

                 {/* Manual Entry Secret Section */}
                 <div className="space-y-4">
                   <Label className="text-base font-medium">Manual Entry Secret</Label>
                   <div className="flex gap-3">
                     <Input
                       value={setupData.secret}
                       readOnly
                       className="font-mono text-base h-12"
                     />
                     <Button
                       variant="outline"
                       size="default"
                       onClick={copySecret}
                       className="px-4"
                     >
                       <Copy className="w-4 h-4 mr-2" />
                       Copy
                     </Button>
                   </div>
                   <p className="text-sm text-muted-foreground">
                     Use this secret if you can't scan the QR code
                   </p>
                 </div>

                 {/* Backup Codes Section */}
                 {setupData.backup_codes && setupData.backup_codes.length > 0 && (
                   <div className="space-y-4">
                     <Alert className="border-amber-200 bg-amber-50">
                       <Key className="w-5 h-5 text-amber-600" />
                       <AlertDescription className="text-amber-800">
                         <strong>Important:</strong> Save these backup codes in a secure location. You can use them to access your account if you lose your authenticator app.
                       </AlertDescription>
                     </Alert>
                     
                     <div className="flex items-center justify-between">
                       <Label className="text-base font-medium">Backup Codes</Label>
                       <Button
                         variant="outline"
                         size="default"
                         onClick={downloadBackupCodes}
                         className="px-4"
                       >
                         <Download className="w-4 h-4 mr-2" />
                         Download
                       </Button>
                     </div>
                     <div className="grid grid-cols-4 gap-3">
                       {setupData.backup_codes.map((code, index) => (
                         <div key={index} className="p-3 bg-muted rounded-lg text-center font-mono text-sm border-2 border-dashed border-muted-foreground/20">
                           {code}
                         </div>
                       ))}
                     </div>
                     <p className="text-sm text-muted-foreground">
                       Each code can only be used once. Store them securely and don't share them with anyone.
                     </p>
                   </div>
                 )}

                 {/* Continue Button */}
                 <div className="pt-6">
                   <Button 
                     onClick={() => setStep('verification')}
                     className="w-full h-12 text-lg"
                     size="lg"
                   >
                     <CheckCircle className="w-5 h-5 mr-3" />
                     I've Scanned the Code
                   </Button>
                 </div>
               </div>
             )}
           </div>
         );

             case 'verification':
         return (
           <div className="space-y-8">
             <div className="text-center">
               <h3 className="text-2xl font-semibold mb-3">Verify Setup</h3>
               <p className="text-muted-foreground text-lg">
                 Enter the 6-digit code from your authenticator app to complete setup
               </p>
             </div>

             <div className="space-y-6">
               <div className="space-y-4">
                 <Label htmlFor="verification-code" className="text-base font-medium">Verification Code</Label>
                 <div className="flex justify-center">
                   <Input
                     id="verification-code"
                     type="text"
                     placeholder="000000"
                     value={verificationCode}
                     onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                     onKeyPress={handleKeyPress}
                     maxLength={6}
                     className="text-center text-3xl font-mono tracking-widest h-16 w-48"
                     autoFocus
                   />
                 </div>
                 <p className="text-sm text-muted-foreground text-center">
                   Enter the 6-digit code from your authenticator app
                 </p>
               </div>

               {error && (
                 <Alert variant="destructive">
                   <XCircle className="w-5 h-5" />
                   <AlertDescription>{error}</AlertDescription>
                 </Alert>
               )}

               <div className="space-y-3">
                 <Button 
                   onClick={handleVerifyCode}
                   disabled={verificationCode.length !== 6 || loading}
                   className="w-full h-12 text-lg"
                   size="lg"
                 >
                   {loading ? (
                     <>
                       <Loader2 className="w-5 h-5 mr-3 animate-spin" />
                       Verifying...
                     </>
                   ) : (
                     <>
                       <CheckCircle className="w-5 h-5 mr-3" />
                       Verify & Complete
                     </>
                   )}
                 </Button>
                 
                                   <Button 
                    variant="outline"
                    onClick={async () => {
                      try {
                        setError(null);
                        await removeExistingFactor();
                        const setupData = await startMFASetup();
                        setStep('qr');
                      } catch (error: any) {
                        console.error('Fresh setup error:', error);
                        setError(error.message || 'Failed to start fresh setup');
                      }
                    }}
                    disabled={loading}
                    className="w-full h-10"
                    size="default"
                  >
                    Start Fresh Setup
                  </Button>
                 
                 
               </div>
             </div>
           </div>
         );

      case 'complete':
        return (
          <div className="space-y-6 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <div>
              <h3 className="text-xl font-semibold mb-2">Setup Complete!</h3>
              <p className="text-muted-foreground">
                Two-factor authentication has been successfully enabled for your account.
              </p>
            </div>
            <Badge variant="secondary" className="text-green-600 bg-green-50">
              MFA Enabled
            </Badge>
          </div>
        );

      default:
        return null;
    }
  };

  const handleClose = () => {
    // Clean up stored data when dialog is closed
    SupabaseMFAService.cleanupMFAData();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            Two-Factor Authentication Setup
          </DialogTitle>
          <DialogDescription>
            Secure your account with Supabase's native MFA
          </DialogDescription>
        </DialogHeader>

        {renderStep()}
      </DialogContent>
    </Dialog>
  );
};
