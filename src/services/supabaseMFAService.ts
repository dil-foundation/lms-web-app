import { supabase } from '@/integrations/supabase/client';

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
      console.log('🔐 Getting MFA status...');
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      const { data: factors, error } = await supabase.auth.mfa.listFactors();
      if (error) throw error;

      console.log('🔐 MFA factors:', factors);
      
      const totpFactor = factors.totp?.[0];
      console.log('🔐 TOTP factor:', totpFactor);
      
      const isEnabled = totpFactor?.status === 'verified';
      const isSetupComplete = isEnabled;
      
      console.log('🔐 MFA status - isEnabled:', isEnabled, 'isSetupComplete:', isSetupComplete);

      return {
        isEnabled,
        isSetupComplete,
        factors: factors.totp || []
      };
    } catch (error) {
      console.error('Error getting MFA status:', error);
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
        console.log('Found existing unverified factor:', existingTotpFactor.id);
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
        console.log('Removing existing factor before creating new one');
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

      console.log('Enrollment response:', data);

      // The enrollment response structure is different - it returns the factor directly
      const factorId = data.id;
      if (!factorId) {
        console.error('No factor ID received from enrollment');
        throw new Error('Failed to get factor ID from enrollment');
      }

      // Store the factor ID for later use
      sessionStorage.setItem('mfa_factor_id', factorId);
      console.log('Stored factor ID:', factorId);

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

  // Verify and complete MFA setup
  completeMFASetup: async (code: string): Promise<boolean> => {
    try {
      let factorId = sessionStorage.getItem('mfa_factor_id');
      console.log('Retrieved factor ID from sessionStorage:', factorId);
      
      // Fallback: if no factor ID in sessionStorage, try to get it from current factors
      if (!factorId) {
        console.log('No factor ID in sessionStorage, trying to get from current factors...');
        const { data: factors, error: factorsError } = await supabase.auth.mfa.listFactors();
        if (factorsError) throw factorsError;

        const totpFactor = factors.totp?.[0];
        if (totpFactor && totpFactor.status === 'unverified') {
          factorId = totpFactor.id;
          console.log('Found unverified factor ID:', factorId);
        } else {
          throw new Error('No factor ID found. Please restart the MFA setup process.');
        }
      }

      console.log('Starting challenge with factor ID:', factorId);
      const { data, error } = await supabase.auth.mfa.challenge({
        factorId: factorId
      });
      
      if (error) throw error;

      console.log('Challenge successful, verifying with code:', code);
      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId: factorId,
        challengeId: data.id,
        code
      });

      if (verifyError) throw verifyError;

      // Clear the stored factor ID
      sessionStorage.removeItem('mfa_factor_id');
      console.log('MFA setup completed successfully');

      // Update user metadata to indicate MFA is enabled
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { error: updateError } = await supabase.auth.updateUser({
          data: { mfa_enabled: 'true' }
        });
        
        if (updateError) {
          console.error('Error updating user metadata:', updateError);
        }
      }

      // Save backup codes to user profile
      await SupabaseMFAService.saveBackupCodes();

      return true;
    } catch (error) {
      console.error('Error completing MFA setup:', error);
      throw error;
    }
  },

  // Verify MFA code during login
  verifyMFACode: async (code: string): Promise<boolean> => {
    try {
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

      if (verifyError) throw verifyError;

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

      return true;
    } catch (error) {
      console.error('Error disabling MFA:', error);
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
        return false;
      }

      const backupCodes = profile.two_factor_backup_codes || [];
      
      // Check if the provided code matches any backup code
      const isValidCode = backupCodes.includes(code);
      
      if (isValidCode) {
        // Remove the used backup code
        const updatedBackupCodes = backupCodes.filter(backupCode => backupCode !== code);
        
        // Update the profile with the remaining backup codes
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ two_factor_backup_codes: updatedBackupCodes })
          .eq('id', user.id);

        if (updateError) {
          console.error('Error updating backup codes after use:', updateError);
        }
      }

      return isValidCode;
    } catch (error) {
      console.error('Error verifying backup code:', error);
      throw error;
    }
  },

  // Check if MFA is required for the application based on user role
  isMFARequired: async (): Promise<boolean> => {
    try {
      console.log('🔐 Checking MFA requirement...');
      
      // Get current user to determine their role
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log('🔐 No user found, MFA not required');
        return false;
      }

      console.log('🔐 User ID:', user.id);

      // Get user's role from profiles table
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (profileError || !profile) {
        console.log('🔐 Profile error or no profile found:', profileError);
        return false;
      }

      console.log('🔐 User role:', profile.role);

      // Use the database function to check MFA requirement
      console.log('🔐 Using database function to check MFA requirement...');
      const { data, error } = await supabase.rpc('check_mfa_requirement', {
        user_role: profile.role
      });

      if (error) {
        console.log('🔐 Error calling check_mfa_requirement function:', error);
        return false;
      }
      
      const isRequired = data === true;
      console.log('🔐 MFA required for role', profile.role, ':', isRequired);
      return isRequired;
    } catch (error) {
      console.error('🔐 Error checking MFA requirement:', error);
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
        console.log('No backup codes found in sessionStorage');
        return false;
      }

      const backupCodes = JSON.parse(backupCodesJson);
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Save backup codes to user profile
      const { error } = await supabase
        .from('profiles')
        .update({ 
          two_factor_backup_codes: backupCodes,
          two_factor_setup_completed_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (error) {
        console.error('Error saving backup codes:', error);
        return false;
      }

      console.log('Backup codes saved to profile');
      return true;
    } catch (error) {
      console.error('Error saving backup codes:', error);
      return false;
    }
  },

  // Debug function to check MFA state
  debugMFAState: async (): Promise<void> => {
    try {
      console.log('=== MFA Debug Info ===');
      console.log('SessionStorage factor ID:', sessionStorage.getItem('mfa_factor_id'));
      
      const { data: factors, error } = await supabase.auth.mfa.listFactors();
      if (error) {
        console.error('Error listing factors:', error);
        return;
      }
      
      console.log('Current factors:', factors);
      console.log('TOTP factors:', factors.totp);
      console.log('=====================');
    } catch (error) {
      console.error('Debug error:', error);
    }
  },

  // Handle existing unverified factor
  handleExistingFactor: async (): Promise<{ hasExisting: boolean; factorId?: string }> => {
    try {
      console.log('handleExistingFactor: Starting check...');
      const { data: factors, error } = await supabase.auth.mfa.listFactors();
      if (error) throw error;

      console.log('handleExistingFactor: All factors:', factors);
      
      // Check both totp array and all array for TOTP factors
      let existingTotpFactor = factors.totp?.[0];
      
      // If no TOTP factor found in totp array, check the all array
      if (!existingTotpFactor && factors.all && factors.all.length > 0) {
        existingTotpFactor = factors.all.find(factor => factor.factor_type === 'totp');
        console.log('handleExistingFactor: Found TOTP factor in all array:', existingTotpFactor);
      }
      
      console.log('handleExistingFactor: Final TOTP factor:', existingTotpFactor);
      
      if (existingTotpFactor) {
        console.log('handleExistingFactor: Found factor with status:', existingTotpFactor.status);
        
        if (existingTotpFactor.status === 'unverified') {
          console.log('handleExistingFactor: Found unverified factor:', existingTotpFactor.id);
          sessionStorage.setItem('mfa_factor_id', existingTotpFactor.id);
          return { hasExisting: true, factorId: existingTotpFactor.id };
        } else if (existingTotpFactor.status === 'verified') {
          console.log('handleExistingFactor: Found verified factor - MFA already enabled');
          throw new Error('MFA is already enabled for this account');
        } else {
          console.log('handleExistingFactor: Found factor with unknown status:', existingTotpFactor.status);
          // For any other status, we should remove it and start fresh
          return { hasExisting: false };
        }
      }
      
      console.log('handleExistingFactor: No factors found');
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
        console.log('removeExistingFactor: Found TOTP factor in all array:', existingTotpFactor);
      }
      
      if (existingTotpFactor) {
        const { error: unenrollError } = await supabase.auth.mfa.unenroll({
          factorId: existingTotpFactor.id
        });
        if (unenrollError) throw unenrollError;
        console.log('Removed existing factor:', existingTotpFactor.id);
      }

      return true;
    } catch (error) {
      console.error('Error removing existing factor:', error);
      throw error;
    }
  }
};

export default SupabaseMFAService;
