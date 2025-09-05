import { supabase } from '@/integrations/supabase/client';
import AccessLogService from '@/services/accessLogService';

export interface MFASetupData {
  qr_code: string;
  secret: string;
  backup_codes: string[];
}

export interface MFAStatus {
  isEnabled: boolean;
  isSetupComplete: boolean;
  factors: any[];
}

const SupabaseMFAService = {
  // Get MFA status for current user
      getMFAStatus: async (): Promise<MFAStatus> => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          return {
            isEnabled: false,
            isSetupComplete: false,
            factors: []
          };
        }

      // Check if MFA is disabled by admin
      if (user.app_metadata?.mfa_disabled_by_admin === 'true') {
        return {
          isEnabled: false,
          isSetupComplete: false,
          factors: []
        };
      }
      const { data: factors, error } = await supabase.auth.mfa.listFactors();
      if (error) {
        throw error;
      }
      
      const totpFactor = factors.totp?.[0];
      const isEnabled = totpFactor?.status === 'verified';
      const isSetupComplete = isEnabled;
      return {
        isEnabled,
        isSetupComplete,
        factors: factors.totp || []
      };
    } catch (error) {
      console.error('🔐 Error getting MFA status:', error);
      return {
        isEnabled: false,
        isSetupComplete: false,
        factors: []
      };
    }
  },

  // Generate backup codes
  generateBackupCodes: (): string[] => {
    const codes: string[] = [];
    for (let i = 0; i < 8; i++) {
      // Generate 8-digit backup codes
      const code = Math.floor(10000000 + Math.random() * 90000000).toString();
      codes.push(code);
    }
    return codes;
  },

  // Start MFA setup process
  startMFASetup: async (): Promise<MFASetupData> => {
    try {
      // First, check if user already has factors
      const { data: existingFactors, error: factorsError } = await supabase.auth.mfa.listFactors();
      if (factorsError) throw factorsError;

      const existingTotpFactor = existingFactors.totp?.[0];
      
      // If there's an existing unverified factor, use it
      if (existingTotpFactor && existingTotpFactor.status === 'unverified') {
        sessionStorage.setItem('mfa_factor_id', existingTotpFactor.id);
        
        // Get the QR code and secret for the existing factor
        // Note: Supabase doesn't provide a way to get QR code for existing factors
        // So we'll need to handle this differently
        return {
          qr_code: '', // We can't get QR code for existing factors
          secret: '', // We can't get secret for existing factors
          backup_codes: []
        };
      }

      // If there's a verified factor, throw an error
      if (existingTotpFactor && existingTotpFactor.status === 'verified') {
        throw new Error('MFA is already enabled for this account');
      }

      // If there are other factors, remove them first
      if (existingTotpFactor) {
        const { error: unenrollError } = await supabase.auth.mfa.unenroll({
          factorId: existingTotpFactor.id
        });
        if (unenrollError) throw unenrollError;
      }

      // Now enroll a new factor
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: 'totp'
      });
      
      if (error) throw error;

      // The enrollment response structure is different - it returns the factor directly
      const factorId = data.id;
      if (!factorId) {
        throw new Error('Failed to get factor ID from enrollment');
      }

      // Store the factor ID for later use
      sessionStorage.setItem('mfa_factor_id', factorId);

      // Generate QR code from the URI if qr_code is not properly formatted
      let qrCodeUrl = data.totp?.qr_code || '';
      if (!qrCodeUrl || qrCodeUrl.includes('\\u003c')) {
        // If QR code is escaped XML or empty, generate it from the URI
        const uri = data.totp?.uri;
        if (uri) {
          // Use Google Charts API to generate QR code
          qrCodeUrl = `https://chart.googleapis.com/chart?chs=200x200&chld=M|0&cht=qr&chl=${encodeURIComponent(uri)}`;
        }
      }

      // Generate backup codes
      const backupCodes = SupabaseMFAService.generateBackupCodes();
      
      // Store backup codes in sessionStorage for later use
      sessionStorage.setItem('mfa_backup_codes', JSON.stringify(backupCodes));

      return {
        qr_code: qrCodeUrl,
        secret: data.totp?.secret || '',
        backup_codes: backupCodes
      };
    } catch (error) {
      console.error('Error starting MFA setup:', error);
      throw error;
    }
  },

  // Complete MFA setup after verification
  completeMFASetup: async (): Promise<boolean> => {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        return false;
      }

      // Check if there's a verified factor
      const { data: factors, error: factorsError } = await supabase.auth.mfa.listFactors();
      if (factorsError) {
        return false;
      }

      const totpFactor = factors.totp?.[0];
      if (!totpFactor || totpFactor.status !== 'verified') {
        return false;
      }

      // Update user metadata to indicate MFA is enabled
      const { error: metadataError } = await supabase.auth.updateUser({
        data: { 
          mfa_enabled: 'true',
          mfa_setup_completed_at: new Date().toISOString()
        }
      });

      if (metadataError) {
        return false;
      }

      // Update profile to mark MFA setup as completed and sync metadata
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ 
          two_factor_setup_completed_at: new Date().toISOString(),
          mfa_reset_required: false,
          mfa_reset_requested_at: null,
          metadata: {
            mfa_enabled: true,
            mfa_setup_completed_at: new Date().toISOString()
          }
        })
        .eq('id', user.id);

      if (profileError) {
        return false;
      }

      // Save backup codes to database
      try {
        await SupabaseMFAService.saveBackupCodes();
      } catch (backupError) {
        // Don't fail the setup if backup codes can't be saved
      }

      return true;
    } catch (error) {
      console.error('Error completing MFA setup:', error);
      return false;
    }
  },

  // Verify MFA code during login
  verifyMFACode: async (code: string): Promise<boolean> => {
    try {
      // Get current user for logging
      const { data: { user } } = await supabase.auth.getUser();
      const userEmail = user?.email || 'unknown@email.com';
      const userId = user?.id || '';

      // Get the user's MFA factors
      const { data: factors, error: factorsError } = await supabase.auth.mfa.listFactors();
      if (factorsError) throw factorsError;

      const totpFactor = factors.totp?.[0];
      if (!totpFactor) {
        throw new Error('No TOTP factor found. Please set up MFA first.');
      }

      const { data, error } = await supabase.auth.mfa.challenge({
        factorId: totpFactor.id
      });
      
      if (error) throw error;

      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId: totpFactor.id,
        challengeId: data.id,
        code
      });

      if (verifyError) {
        // Log failed MFA verification
        await AccessLogService.logMFAVerification(
          userId,
          userEmail,
          'failed',
          'totp',
          undefined // IP address
        );
        throw verifyError;
      }

      // Log successful MFA verification
      await AccessLogService.logMFAVerification(
        userId,
        userEmail,
        'success',
        'totp',
        undefined // IP address
      );

      return true;
    } catch (error) {
      console.error('Error verifying MFA code:', error);
      throw error;
    }
  },

  // Disable MFA for current user
  disableMFA: async (): Promise<boolean> => {
    try {
      const { data: factors, error: factorsError } = await supabase.auth.mfa.listFactors();
      if (factorsError) throw factorsError;

      const totpFactor = factors.totp?.[0];
      
      if (totpFactor) {
        const { error } = await supabase.auth.mfa.unenroll({
          factorId: totpFactor.id
        });
        
        if (error) throw error;
      }

      // Update user metadata to indicate MFA is disabled
      const { error: updateError } = await supabase.auth.updateUser({
        data: { mfa_enabled: 'false' }
      });
      
      if (updateError) {
        console.error('Error updating user metadata:', updateError);
      }

      // Also update profiles metadata to sync MFA status
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { error: profileError } = await supabase
          .from('profiles')
          .update({ 
            metadata: `{"mfa_enabled": false, "mfa_disabled_at": "${new Date().toISOString()}"}`
          })
          .eq('id', user.id);
        
        if (profileError) {
          console.error('Error updating profile metadata:', profileError);
        }
      }

      return true;
    } catch (error) {
      console.error('Error disabling MFA:', error);
      throw error;
    }
  },

  // Remove MFA for a specific user (admin function)
  disableMFAForUser: async (userId: string): Promise<boolean> => {
    try {
      // Get current admin user for logging
      const { data: { user: adminUser } } = await supabase.auth.getUser();
      
      // Call the edge function to remove MFA
      const { data, error } = await supabase.functions.invoke('admin-disable-mfa', {
        body: { targetUserId: userId }
      });
  
      if (error) {
        throw error;
      }
      
      if (data && data.success) {
        // Log the MFA disable action
        if (adminUser) {
          try {
            await AccessLogService.logUserManagementAction(
              adminUser.id,
              adminUser.email || 'unknown@email.com',
              'user_deactivated', // Using deactivated as MFA is a security feature
              userId,
              data.target_user_email || 'unknown@email.com',
              {
                action: 'MFA Disabled',
                target_user_email: data.target_user_email,
                target_user_name: data.target_user_name
              }
            );
          } catch (logError) {
            console.error('Error logging MFA disable action:', logError);
          }
        }
        
        return true;
      } else {
        const errorMessage = data?.error || 'Unknown error occurred';
        throw new Error(errorMessage);
      }
    } catch (error) {
      console.error('Error removing MFA for user:', error);
      throw error;
    }
  },

  // Get backup codes for current user
  getBackupCodes: async (): Promise<string[]> => {
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Get user's backup codes from profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('two_factor_backup_codes')
        .eq('id', user.id)
        .single();

      if (profileError || !profile) {
        console.error('Error fetching profile or no profile found:', profileError);
        return [];
      }

      return profile.two_factor_backup_codes || [];
    } catch (error) {
      console.error('Error getting backup codes:', error);
      return [];
    }
  },

  // Verify backup code
  verifyBackupCode: async (code: string): Promise<boolean> => {
    try {
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) {
        throw new Error('Session error. Please try logging in again.');
      }
      
      if (!user) {
        throw new Error('User not authenticated. Please log in again.');
      }

      const userEmail = user.email || 'unknown@email.com';
      const userId = user.id;

      // Get user's backup codes from profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('two_factor_backup_codes')
        .eq('id', user.id)
        .single();

      if (profileError) {
        throw new Error('Unable to fetch user profile. Please try again.');
      }
      
      if (!profile) {
        throw new Error('User profile not found. Please contact support.');
      }

      const backupCodes = profile.two_factor_backup_codes || [];
      
      // Check if the provided code matches any backup code
      const isValidCode = backupCodes.includes(code);
      
      if (isValidCode) {
        
        // Remove the used backup code
        const updatedBackupCodes = backupCodes.filter(backupCode => backupCode !== code);
        
        // Update the profile with the remaining backup codes and mark for MFA reset
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ 
            two_factor_backup_codes: updatedBackupCodes,
            mfa_reset_required: true,
            mfa_reset_requested_at: new Date().toISOString()
          })
          .eq('id', user.id);

        if (updateError) {
          throw new Error('Failed to process backup code. Please try again.');
        }

        // Update user metadata to indicate MFA reset is required
        const { error: metadataError } = await supabase.auth.updateUser({
          data: { 
            mfa_reset_required: 'true',
            mfa_reset_requested_at: new Date().toISOString()
          }
        });

        // Log successful backup code verification
        await AccessLogService.logMFAVerification(
          userId,
          userEmail,
          'success',
          'backup_code',
          undefined // IP address
        );
      } else {
        // Log failed backup code verification
        await AccessLogService.logMFAVerification(
          userId,
          userEmail,
          'failed',
          'backup_code',
          undefined // IP address
        );
      }

      return isValidCode;
    } catch (error) {
      console.error('Error in verifyBackupCode:', error);
      
      // Check if it's a session-related error
      if (error.message && error.message.includes('session')) {
        throw new Error('Session expired. Please log in again.');
      }
      
      throw error;
    }
  },

  // Refresh user session
  refreshSession: async (): Promise<boolean> => {
    try {
      const { data, error } = await supabase.auth.refreshSession();
      
      if (error) {
        return false;
      }
      
      return !!data.session;
    } catch (error) {
      return false;
    }
  },

  // Verify backup code with session refresh
  verifyBackupCodeWithSessionRefresh: async (code: string): Promise<boolean> => {
    try {
      // First try to refresh the session
      await SupabaseMFAService.refreshSession();
      
      // Now verify the backup code
      return await SupabaseMFAService.verifyBackupCode(code);
    } catch (error) {
      console.error('Error in verifyBackupCodeWithSessionRefresh:', error);
      throw error;
    }
  },

  // Check if MFA is required for the current user
      checkMFARequirement: async (): Promise<boolean> => {
      try {
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) {
          return false;
        }

      // Get user profile to check role and MFA reset status
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role, mfa_reset_required')
        .eq('id', user.id)
        .single();

      if (profileError) {
        return false;
      }

      // If MFA reset is required, force factor removal and MFA setup
      if (profile.mfa_reset_required) {
        // Call the database function to remove factors
        const { data: resetResult, error: resetError } = await supabase
          .rpc('force_mfa_reset_for_user', { target_user_id: user.id });

        if (resetError) {
          // Even if reset fails, still force MFA setup
          return true;
        }

        // Force MFA setup regardless of the reset result
        return true;
      }

      // Use database function to check MFA requirement based on role
      const { data: mfaRequired, error: functionError } = await supabase
        .rpc('check_mfa_requirement', { user_role: profile.role });

      if (functionError) {
        return false;
      }

      return mfaRequired;
    } catch (error) {
      return false;
    }
  },

  // Clean up stored MFA data
  cleanupMFAData: (): void => {
    sessionStorage.removeItem('mfa_factor_id');
    sessionStorage.removeItem('mfa_backup_codes');
  },

  // Save backup codes to user profile
  saveBackupCodes: async (): Promise<boolean> => {
    try {
      const backupCodesJson = sessionStorage.getItem('mfa_backup_codes');
      
      if (!backupCodesJson) {
        throw new Error('No backup codes found in session storage');
      }

      const backupCodes = JSON.parse(backupCodesJson);
      
      if (!Array.isArray(backupCodes) || backupCodes.length === 0) {
        throw new Error('Invalid backup codes format');
      }
      
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) {
        throw userError;
      }
      
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Save backup codes to user profile
      const { data, error } = await supabase
        .from('profiles')
        .update({ 
          two_factor_backup_codes: backupCodes,
          two_factor_setup_completed_at: new Date().toISOString()
        })
        .eq('id', user.id)
        .select();

      if (error) {
        throw error;
      }
      
      // Clear from sessionStorage after successful save
      sessionStorage.removeItem('mfa_backup_codes');
      
      return true;
    } catch (error) {
      console.error('Error in saveBackupCodes:', error);
      throw error; // Re-throw to make the error visible
    }
  },



  // Handle existing unverified factor
  handleExistingFactor: async (): Promise<{ hasExisting: boolean; factorId?: string }> => {
    try {
      const { data: factors, error } = await supabase.auth.mfa.listFactors();
      if (error) throw error;
      
      // Check both totp array and all array for TOTP factors
      let existingTotpFactor = factors.totp?.[0];
      
      // If no TOTP factor found in totp array, check the all array
      if (!existingTotpFactor && factors.all && factors.all.length > 0) {
        existingTotpFactor = factors.all.find(factor => factor.factor_type === 'totp');
      }
      
      if (existingTotpFactor) {
        if (existingTotpFactor.status === 'unverified') {
          sessionStorage.setItem('mfa_factor_id', existingTotpFactor.id);
          return { hasExisting: true, factorId: existingTotpFactor.id };
        } else if (existingTotpFactor.status === 'verified') {
          throw new Error('MFA is already enabled for this account');
        } else {
          // For any other status, we should remove it and start fresh
          return { hasExisting: false };
        }
      }
      
      return { hasExisting: false };
    } catch (error) {
      console.error('Error checking existing factors:', error);
      return { hasExisting: false };
    }
  },

  // Remove existing factor
  removeExistingFactor: async (): Promise<boolean> => {
    try {
      const { data: factors, error } = await supabase.auth.mfa.listFactors();
      if (error) throw error;

      // Check both totp array and all array for TOTP factors
      let existingTotpFactor = factors.totp?.[0];
      
      // If no TOTP factor found in totp array, check the all array
      if (!existingTotpFactor && factors.all && factors.all.length > 0) {
        existingTotpFactor = factors.all.find(factor => factor.factor_type === 'totp');
      }
      
      if (existingTotpFactor) {
        const { error: unenrollError } = await supabase.auth.mfa.unenroll({
          factorId: existingTotpFactor.id
        });
        if (unenrollError) throw unenrollError;
      }

      return true;
    } catch (error) {
      console.error('Error removing existing factor:', error);
      throw error;
    }
  }
};

export default SupabaseMFAService;
