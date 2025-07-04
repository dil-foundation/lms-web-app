
import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Logo } from './header/Logo';
import { ThemeToggle } from './header/ThemeToggle';
import { Navigation } from './header/Navigation';
import { AuthButton } from './header/AuthButton';
import { MobileMenu } from './header/MobileMenu';
import { SidebarTrigger } from '@/components/ui/sidebar';

export const Header = () => {
  const location = useLocation();
  const { user, loading, signOut } = useAuth();

  // Check if we're on the dashboard route to show the sidebar trigger
  const isDashboardRoute = location.pathname.startsWith('/dashboard');

  return (
    <header className="bg-background border-b border-border">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-4">
            {isDashboardRoute && <SidebarTrigger />}
            <Logo />
          </div>

          {/* Desktop Navigation - Right Aligned */}
          <div className="hidden md:flex items-center space-x-6">
            <ThemeToggle />
            
            <Navigation user={user} />

            <AuthButton 
              user={user} 
              loading={loading} 
              signOut={signOut} 
            />
          </div>

          <MobileMenu 
            user={user} 
            loading={loading} 
            signOut={signOut} 
          />
        </div>
      </div>
    </header>
  );
};
