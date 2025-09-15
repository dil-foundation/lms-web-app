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
  const [isChecking, setIsChecking] = useState(false);
  const [hasCheckedRequirement, setHasCheckedRequirement] = useState(false);

  useEffect(() => {
    const checkRequirements = async () => {
      // Only check if user exists and we haven't checked yet
      if (user && !hasCheckedRequirement) {
        setIsChecking(true);
        try {
          await checkMFARequirement();
          setHasCheckedRequirement(true);
        } catch (error) {
          console.error('Error checking MFA requirement:', error);
        } finally {
          setIsChecking(false);
        }
      } else if (!user) {
        setIsChecking(false);
        setHasCheckedRequirement(false);
      }
    };

    checkRequirements();
  }, [user, checkMFARequirement, hasCheckedRequirement]);



  // Show loading while checking MFA status
  if (isChecking || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen w-full">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          <p className="text-muted-foreground">Verifying security settings...</p>
        </div>
      </div>
    );
  }

  // If MFA is not required globally, show children
  if (!isMFARequired) {
    return <>{children}</>;
  }

  // If user doesn't have MFA set up and it's required, show setup dialog
  if (isMFARequired && !mfaStatus.isSetupComplete) {
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
          onSuccess={async () => {
            setShowMFASetup(false);
            // Refresh MFA status without reloading the page
            try {
              await checkMFARequirement();
            } catch (error) {
              console.error('Error refreshing MFA status:', error);
            }
          }}
        />
      </>
    );
  }

  // If MFA is set up and required, show children
  console.log('🔐 MFA Requirement - MFA required and set up, showing children');
  return <>{children}</>;
};
