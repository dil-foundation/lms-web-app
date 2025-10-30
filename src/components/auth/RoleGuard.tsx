import React from 'react';
import { useUserProfile } from '@/hooks/useUserProfile';
import { UserRole } from '@/config/roleNavigation';

interface RoleGuardProps {
  allowedRoles: UserRole[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export const RoleGuard: React.FC<RoleGuardProps> = ({ 
  allowedRoles, 
  children, 
  fallback = (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="text-center">
        <h2 className="text-2xl font-semibold text-foreground mb-2">Access Denied</h2>
        <p className="text-muted-foreground">
          You don't have permission to access this feature.
        </p>
      </div>
    </div>
  )
}) => {
  const { profile, loading } = useUserProfile();
  const userRole = profile?.role as UserRole;
  
  console.log('🔍 RoleGuard: Checking access', { userRole, allowedRoles, loading });
  
  // Show loading state while profile is being fetched
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  // Auto-allow super_user for everything
  if (userRole === 'super_user') {
    console.log('✅ RoleGuard: Super user - access granted');
    return <>{children}</>;
  }
  
  if (!userRole || !allowedRoles.includes(userRole)) {
    console.log('❌ RoleGuard: Access denied', { userRole, allowedRoles });
    return <>{fallback}</>;
  }
  
  console.log('✅ RoleGuard: Access granted');
  return <>{children}</>;
};
