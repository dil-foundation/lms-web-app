
import { memo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { User } from '@supabase/supabase-js';
import { Button } from '@/components/ui/button';
import { Settings } from 'lucide-react';

interface NavigationProps {
  user: User | null;
  isMobile?: boolean;
  onLinkClick?: () => void;
}

export const Navigation = memo(({ user, isMobile = false, onLinkClick }: NavigationProps) => {
  const location = useLocation();
  const isHomePage = location.pathname === '/';
  const showBackToDashboard = isHomePage && localStorage.getItem('cameFromDashboard') === 'true';

  const linkClass = isMobile
    ? "block px-3 py-2 text-foreground hover:text-primary transition-colors"
    : "text-foreground hover:text-primary transition-all duration-300 relative group";

  const underlineSpan = !isMobile && (
    <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-primary transition-all duration-300 group-hover:w-full"></span>
  );

  if (!user) {
    return null;
  }

  return (
    <nav className="flex items-center gap-2">
      <Link to="/dashboard" className="text-sm font-medium text-muted-foreground hover:text-primary px-3 py-2 rounded-md transition-colors">
        Dashboard
      </Link>
      <Link to="/dashboard/profile-settings" aria-label="Profile Settings">
        <Button variant="ghost" size="icon">
          <Settings className="h-5 w-5" />
        </Button>
      </Link>
    </nav>
  );
});

Navigation.displayName = 'Navigation';
