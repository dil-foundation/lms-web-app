import React from 'react';
import { useAuth } from '@/hooks/useAuth';
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
  const { user } = useAuth();
  const userRole = user?.app_metadata?.role as UserRole;
  
  if (!userRole || !allowedRoles.includes(userRole)) {
    return <>{fallback}</>;
  }
  
  return <>{children}</>;
};
