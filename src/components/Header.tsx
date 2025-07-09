import { useState, useEffect, memo } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Logo } from './header/Logo';
import { ThemeToggle } from './header/ThemeToggle';
import { Navigation } from './header/Navigation';
import { AuthButton } from './header/AuthButton';
import { MobileMenu } from './header/MobileMenu';

export const Header = memo(() => {
  const location = useLocation();
  const { user, loading, signOut } = useAuth();
  const [isScrolled, setIsScrolled] = useState(false);
  
  // Hide mobile menu on dashboard pages since DashboardSidebar handles mobile navigation
  const isDashboardPage = location.pathname.startsWith('/dashboard');

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header className={`sticky top-0 left-0 right-0 border-b border-border z-50 transition-all duration-300 ${
      isScrolled 
        ? 'bg-background/80 backdrop-blur-lg glass' 
        : 'bg-background'
    }`}>
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <Logo />
          </div>

          {/* Desktop Navigation - Right Aligned */}
          <div className="hidden md:flex items-center space-x-6">
            <ThemeToggle />
            
            <Navigation user={user} />

            <AuthButton />
          </div>

          <MobileMenu />
        </div>
      </div>
    </header>
  );
});

Header.displayName = 'Header';
