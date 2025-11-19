import { memo, useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useUserProfile } from '@/hooks/useUserProfile';
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
  const { profile } = useUserProfile();
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className={`hidden md:flex fixed top-0 left-0 right-0 z-[100] transition-all duration-300 ${isScrolled ? 'bg-background/80 backdrop-blur-lg glass border-b border-border/60' : 'bg-background border-b border-border'} items-center justify-between h-16 lg:h-20 px-3 md:px-4 lg:px-6 xl:px-8 py-2 md:py-3`}>
      <div className="flex-shrink-0">
        <Logo />
      </div>

      {/* Center Toggle - Hide for content_creator and view_only */}
      {profile?.role !== 'content_creator' && profile?.role !== 'view_only' && (
        <div className="flex items-center justify-center flex-1 px-2 md:px-4">
          <AILMSToggle size="sm" className="md:text-sm lg:text-base" onToggle={onToggle} />
        </div>
      )}

      <div className="flex items-center space-x-2 md:space-x-3 lg:space-x-4 flex-shrink-0">
        <ThemeToggle />
        {user && profile?.role !== 'view_only' && profile?.role !== 'content_creator' && <NotificationToggle />}
        <AuthButton />
      </div>
    </div>
  );
});

DashboardHeader.displayName = 'DashboardHeader'; 