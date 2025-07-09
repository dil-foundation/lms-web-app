
import { memo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { User } from '@supabase/supabase-js';
import { useTranslation } from 'react-i18next';

interface NavigationProps {
  user: User | null;
  isMobile?: boolean;
  onLinkClick?: () => void;
}

export const Navigation = memo(({ user, isMobile = false, onLinkClick }: NavigationProps) => {
  const { t } = useTranslation();
  const location = useLocation();
  const isHomePage = location.pathname === '/';
  const showBackToDashboard = isHomePage && localStorage.getItem('cameFromDashboard') === 'true';

  const linkClass = isMobile
    ? "block px-3 py-2 text-foreground hover:text-primary transition-colors"
    : "text-foreground hover:text-primary transition-all duration-300 relative group";

  const underlineSpan = !isMobile && (
    <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-primary transition-all duration-300 group-hover:w-full"></span>
  );

  return (
    <nav className={isMobile ? "space-y-1" : "flex items-center space-x-6"}>
      {user && showBackToDashboard && (
        <Link to="/dashboard" className={linkClass} onClick={onLinkClick}>
          {t('header.back_to_dashboard')}
          {underlineSpan}
        </Link>
      )}
      
      {user && !showBackToDashboard && !isHomePage && (
        <Link to="/dashboard" className={linkClass} onClick={onLinkClick}>
          {t('header.dashboard')}
          {underlineSpan}
        </Link>
      )}
    </nav>
  );
});

Navigation.displayName = 'Navigation';
