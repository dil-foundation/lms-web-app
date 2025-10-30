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
    <div className={`hidden md:flex fixed top-0 left-0 right-0 z-[100] transition-all duration-300 ${isScrolled ? 'bg-background/80 backdrop-blur-lg glass border-b border-border/60' : 'bg-background border-b border-border'} items-center justify-between h-20 px-4 sm:px-6 lg:px-8 py-3`}>
      <div>
        <Logo />
      </div>

      {/* Center Toggle - Hide for content_creator and view_only */}
      {profile?.role !== 'content_creator' && profile?.role !== 'view_only' && (
        <div className="flex items-center justify-center">
          <AILMSToggle size="md" onToggle={onToggle} />
        </div>
      )}

      <div className="flex items-center space-x-4">
        <ThemeToggle />
        {user && profile?.role !== 'view_only' && profile?.role !== 'content_creator' && <NotificationToggle />}
        <AuthButton />
      </div>
    </div>
  );
});

DashboardHeader.displayName = 'DashboardHeader'; 