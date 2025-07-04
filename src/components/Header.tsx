
import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Logo } from './header/Logo';
import { ThemeToggle } from './header/ThemeToggle';
import { Navigation } from './header/Navigation';
import { AuthButton } from './header/AuthButton';
import { MobileMenu } from './header/MobileMenu';

export const Header = () => {
  const location = useLocation();
  const { user, loading, signOut } = useAuth();
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header className={`fixed top-0 left-0 right-0 border-b border-border relative z-10 transition-all duration-300 ${
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
