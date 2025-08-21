import React, { useEffect, useState } from 'react';
import { useSupabaseMFA } from '@/hooks/useSupabaseMFA';
import { SupabaseMFASetup } from './SupabaseMFASetup';
import { useAuth } from '@/hooks/useAuth';
import { ContentLoader } from '@/components/ContentLoader';
import { supabase } from '@/integrations/supabase/client';

interface SupabaseMFARequirementProps {
  children: React.ReactNode;
}

export const SupabaseMFARequirement: React.FC<SupabaseMFARequirementProps> = ({ children }) => {
  const { user } = useAuth();
  const { mfaStatus, isMFARequired, loading, checkMFARequirement } = useSupabaseMFA();
  const [showMFASetup, setShowMFASetup] = useState(false);
  const [isChecking, setIsChecking] = useState(false); // Start as false, only check when user is authenticated

  useEffect(() => {
    const checkRequirements = async () => {
      if (user) {
        console.log('🔐 MFA Requirement Check - User found:', user.id);
        setIsChecking(true);
        try {
          // Additional debugging: Check user profile
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();
          
          console.log('🔐 User profile:', profile, 'Profile error:', profileError);
          
          // Profile should be created by database trigger
          if (profileError) {
            console.log('🔐 Profile error (should be created by trigger):', profileError);
          }
          
          // Additional debugging: Check MFA factors directly
          const { data: factors, error: factorsError } = await supabase.auth.mfa.listFactors();
          console.log('🔐 MFA factors:', factors, 'Factors error:', factorsError);
          
          await checkMFARequirement();
        } catch (error) {
          console.error('Error checking MFA requirement:', error);
        } finally {
          setIsChecking(false);
        }
      } else {
        // If no user, don't check MFA requirements
        console.log('🔐 MFA Requirement Check - No user found');
        setIsChecking(false);
      }
    };

    checkRequirements();
  }, [user, checkMFARequirement]);

  // Debug logging
  console.log('🔐 MFA Requirement Component State:', {
    user: !!user,
    userId: user?.id,
    isChecking,
    loading,
    isMFARequired,
    mfaStatus: {
      isEnabled: mfaStatus.isEnabled,
      isSetupComplete: mfaStatus.isSetupComplete,
      factors: mfaStatus.factors
    }
  });

  // Show loading while checking MFA status
  if (isChecking || loading) {
    console.log('🔐 MFA Requirement - Showing loading');
    return <ContentLoader />;
  }

  // If MFA is not required globally, show children
  if (!isMFARequired) {
    console.log('🔐 MFA Requirement - MFA not required, showing children');
    return <>{children}</>;
  }

  // If user doesn't have MFA set up and it's required, show setup dialog
  if (isMFARequired && !mfaStatus.isSetupComplete) {
    console.log('🔐 MFA Requirement - MFA required but not set up, showing setup screen');
    return (
      <>
        {/* Blocking overlay */}
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="text-center space-y-4">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
              <svg
                className="w-8 h-8 text-primary"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                />
              </svg>
            </div>
            <div>
              <h2 className="text-2xl font-bold mb-2">Two-Factor Authentication Required</h2>
              <p className="text-muted-foreground mb-4">
                Your administrator has enabled two-factor authentication for all users.
                Please set up MFA to continue.
              </p>
              <button
                onClick={() => setShowMFASetup(true)}
                className="bg-primary text-primary-foreground px-6 py-3 rounded-lg font-medium hover:bg-primary/90 transition-colors"
              >
                Set Up Two-Factor Authentication
              </button>
            </div>
          </div>
        </div>

        {/* MFA Setup Dialog */}
        <SupabaseMFASetup
          isOpen={showMFASetup}
          onClose={() => setShowMFASetup(false)}
          onSuccess={() => {
            setShowMFASetup(false);
            // Reload the page to refresh the MFA status
            window.location.reload();
          }}
        />
      </>
    );
  }

  // If MFA is set up and required, show children
  console.log('🔐 MFA Requirement - MFA required and set up, showing children');
  return <>{children}</>;
};
