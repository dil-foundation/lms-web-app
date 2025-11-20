import { ReactNode } from 'react';

interface DashboardLayoutProps {
  children: ReactNode;
  className?: string;
}

export const DashboardLayout = ({ children, className = '' }: DashboardLayoutProps) => {
  return (
    <div className={`space-y-6 ${className}`}>
      {children}
    </div>
  );
};

