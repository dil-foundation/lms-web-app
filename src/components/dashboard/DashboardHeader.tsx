import { memo, useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { ThemeToggle } from '../header/ThemeToggle';
import { NotificationToggle } from '../header/NotificationToggle';
import { AuthButton } from '../header/AuthButton';
import { Logo } from '../header/Logo';
import { AILMSToggle } from '@/components/ui/AILMSToggle';

interface DashboardHeaderProps {
  onToggle?: () => void;
}

export const DashboardHeader = memo(({ onToggle }: DashboardHeaderProps) => {
  const { user } = useAuth();
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className={`hidden md:flex sticky top-0 z-50 transition-all duration-300 ${isScrolled ? 'bg-background/80 backdrop-blur-lg' : ''} items-center justify-between h-20 border-b border-border px-4 sm:px-6 lg:px-8 py-3`}>
      <div>
        <Logo />
      </div>

      {/* Center Toggle */}
      <div className="flex items-center justify-center">
        <AILMSToggle size="md" onToggle={onToggle} />
      </div>

      <div className="flex items-center space-x-4">
        <ThemeToggle />
        <NotificationToggle />
        <AuthButton />
      </div>
    </div>
  );
});

DashboardHeader.displayName = 'DashboardHeader'; 