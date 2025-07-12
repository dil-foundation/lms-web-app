import { memo, useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { ThemeToggle } from '../header/ThemeToggle';
import { AuthButton } from '../header/AuthButton';
import { Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { NavLink } from 'react-router-dom';
import { Logo } from '../header/Logo';
import { AILMSToggle } from '@/components/ui/AILMSToggle';
import { cn } from '@/lib/utils';

export const DashboardHeader = memo(() => {
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
        <AILMSToggle size="md" />
      </div>

      <div className="flex items-center space-x-4">
        <ThemeToggle />
        <nav className="flex items-center gap-2">
            <NavLink 
                to="/dashboard"
                end
                className={({ isActive }) => cn(
                    "text-sm font-medium transition-colors hover:text-primary",
                    isActive ? "text-primary" : "text-foreground"
                )}
            >
                Dashboard
            </NavLink>
            <NavLink to="/dashboard/profile-settings" aria-label="Profile Settings">
                <Button variant="ghost" size="icon">
                <Settings className="h-5 w-5" />
                </Button>
            </NavLink>
        </nav>
        <AuthButton />
      </div>
    </div>
  );
});

DashboardHeader.displayName = 'DashboardHeader'; 