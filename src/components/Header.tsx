import { useState, useEffect, memo } from 'react';
import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';
import { Logo } from './header/Logo';
import { ThemeToggle } from './header/ThemeToggle';
import { Navigation } from './header/Navigation';
import { AuthButton } from './header/AuthButton';
import { MobileMenu } from './header/MobileMenu';
import { LanguageToggle } from './header/LanguageToggle';

export const Header = memo(() => {
  const { t } = useTranslation();
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
            <div className="hidden md:ml-6 md:flex md:space-x-8">
              <Navigation user={null} />
            </div>
          </div>

          {/* Desktop Navigation - Right Aligned */}
          <div className="hidden md:flex items-center space-x-2">
            <LanguageToggle />
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
