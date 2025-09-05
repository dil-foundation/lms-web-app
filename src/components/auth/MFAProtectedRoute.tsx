import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';

interface MFAProtectedRouteProps {
  children: React.ReactNode;
}

export const MFAProtectedRoute: React.FC<MFAProtectedRouteProps> = ({ children }) => {
  const { user, isMFAVerificationPending } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // If user is authenticated but MFA verification is pending, redirect to auth
    if (user && isMFAVerificationPending) {
      console.log('🔐 MFA verification pending, redirecting to auth');
      navigate('/auth', { replace: true });
    }
  }, [user, isMFAVerificationPending, navigate]);

  // If MFA verification is pending, don't render children
  if (isMFAVerificationPending) {
    return null;
  }

  return <>{children}</>;
};
