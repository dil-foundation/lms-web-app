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

  console.log('🔐 MFAProtectedRoute: Component render', {
    hasUser: !!user,
    userId: user?.id,
    isMFAVerificationPending,
    currentPath: window.location.pathname
  });

  useEffect(() => {
    console.log('🔐 MFAProtectedRoute: Effect triggered', {
      hasUser: !!user,
      isMFAVerificationPending
    });
    
    // If user is authenticated but MFA verification is pending, redirect to auth
    if (user && isMFAVerificationPending) {
      console.log('🔐 MFAProtectedRoute: MFA verification pending, redirecting to auth');
      navigate('/auth', { replace: true });
    }
  }, [user, isMFAVerificationPending, navigate]);

  // If MFA verification is pending, don't render children
  if (isMFAVerificationPending) {
    console.log('🔐 MFAProtectedRoute: MFA verification pending, not rendering children');
    return null;
  }

  console.log('🔐 MFAProtectedRoute: Rendering children');
  return <>{children}</>;
};
