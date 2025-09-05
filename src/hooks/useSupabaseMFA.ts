import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import SupabaseMFAService, { MFAStatus, MFASetupData } from '@/services/supabaseMFAService';
import { toast } from 'sonner';

export const useSupabaseMFA = () => {
  const { user } = useAuth();
  const [mfaStatus, setMfaStatus] = useState<MFAStatus>({
    isEnabled: false,
    isSetupComplete: false,
    factors: []
  });
  const [setupData, setSetupData] = useState<MFASetupData | null>(null);
  const [loading, setLoading] = useState(false);
  const [isMFARequired, setIsMFARequired] = useState(false);

  // Load MFA status
  const loadMFAStatus = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      const status = await SupabaseMFAService.getMFAStatus();
      setMfaStatus(status);
    } catch (error) {
      console.error('Error loading MFA status:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Check if MFA is required globally
  const checkMFARequirement = useCallback(async () => {
    try {
      const required = await SupabaseMFAService.checkMFARequirement();
      setIsMFARequired(required);
    } catch (error) {
      console.error('Error checking MFA requirement:', error);
      setIsMFARequired(false);
    }
  }, []);

  // Start MFA setup
  const startMFASetup = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      const data = await SupabaseMFAService.startMFASetup();
      setSetupData(data);
      return data;
    } catch (error: any) {
      console.error('Error starting MFA setup:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Complete MFA setup
  const completeMFASetup = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      await SupabaseMFAService.completeMFASetup();
      setSetupData(null);
      await loadMFAStatus();
      toast.success('MFA setup completed successfully');
      return true;
    } catch (error: any) {
      console.error('Error completing MFA setup:', error);
      toast.error(error.message || 'Failed to complete MFA setup');
      return false;
    } finally {
      setLoading(false);
    }
  }, [user, loadMFAStatus]);

  // Verify MFA code
  const verifyMFACode = useCallback(async (code: string) => {
    if (!user) return false;

    try {
      setLoading(true);
      const success = await SupabaseMFAService.verifyMFACode(code);
      if (success) {
        toast.success('MFA verification successful');
      }
      return success;
    } catch (error: any) {
      console.error('Error verifying MFA code:', error);
      toast.error(error.message || 'Failed to verify MFA code');
      return false;
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Verify backup code
  const verifyBackupCode = useCallback(async (code: string) => {
    if (!user) {
      console.error('🔐 No user found for backup code verification');
      return false;
    }

    try {
      console.log('🔐 Starting backup code verification in hook');
      setLoading(true);
      
      const success = await SupabaseMFAService.verifyBackupCode(code);
      
      if (success) {
        console.log('🔐 Backup code verification successful in hook');
        toast.success('Backup code verification successful');
      } else {
        console.log('🔐 Backup code verification failed in hook');
      }
      
      return success;
    } catch (error: any) {
      console.error('🔐 Error verifying backup code in hook:', error);
      
      // Handle session-related errors
      if (error.message && error.message.includes('session')) {
        toast.error('Session expired. Please log in again.');
      } else if (error.message && error.message.includes('authenticated')) {
        toast.error('Authentication error. Please log in again.');
      } else {
        toast.error(error.message || 'Failed to verify backup code');
      }
      
      return false;
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Disable MFA
  const disableMFA = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      await SupabaseMFAService.disableMFA();
      await loadMFAStatus();
      toast.success('MFA disabled successfully');
    } catch (error: any) {
      console.error('Error disabling MFA:', error);
      toast.error(error.message || 'Failed to disable MFA');
    } finally {
      setLoading(false);
    }
  }, [user, loadMFAStatus]);

  // Handle existing factor
  const handleExistingFactor = useCallback(async () => {
    if (!user) return { hasExisting: false };

    try {
      return await SupabaseMFAService.handleExistingFactor();
    } catch (error: any) {
      console.error('Error handling existing factor:', error);
      return { hasExisting: false };
    }
  }, [user]);

  // Remove existing factor
  const removeExistingFactor = useCallback(async () => {
    if (!user) return false;

    try {
      setLoading(true);
      const success = await SupabaseMFAService.removeExistingFactor();
      return success;
    } catch (error: any) {
      console.error('Error removing existing factor:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Load initial data
  useEffect(() => {
    if (user) {
      console.log('🔐 User found in useSupabaseMFA, loading MFA data...');
      loadMFAStatus();
      checkMFARequirement();
    } else {
      console.log('🔐 No user found in useSupabaseMFA, skipping MFA data loading');
      // Reset MFA state when no user
      setMfaStatus({
        isEnabled: false,
        isSetupComplete: false,
        factors: []
      });
      setIsMFARequired(false);
    }
  }, [user, loadMFAStatus, checkMFARequirement]);

  return {
    mfaStatus,
    setupData,
    loading,
    isMFARequired,
    startMFASetup,
    completeMFASetup,
    verifyMFACode,
    verifyBackupCode,
    disableMFA,
    handleExistingFactor,
    removeExistingFactor,
    loadMFAStatus,
    checkMFARequirement
  };
};
