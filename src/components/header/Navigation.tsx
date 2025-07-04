
import { Link, useLocation } from 'react-router-dom';
import { User } from '@supabase/supabase-js';

interface NavigationProps {
  user: User | null;
  isMobile?: boolean;
  onLinkClick?: () => void;
}

export const Navigation = ({ user, isMobile = false, onLinkClick }: NavigationProps) => {
  const location = useLocation();
  const isHomePage = location.pathname === '/';
  const showBackToDashboard = isHomePage && localStorage.getItem('cameFromDashboard') === 'true';

  const linkClass = isMobile
    ? "block px-3 py-2 text-foreground hover:text-primary transition-colors"
    : "text-foreground hover:text-primary transition-all duration-300 relative group";

  const underlineSpan = !isMobile && (
    <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-primary transition-all duration-300 group-hover:w-full"></span>
  );

  // Debug logging
  console.log('🧭 Navigation render - User:', user ? 'exists' : 'null', 'showBackToDashboard:', showBackToDashboard);

  return (
    <nav className={isMobile ? "space-y-1" : "flex items-center space-x-6"}>
      {!isHomePage && (
        <Link to="/" className={linkClass} onClick={onLinkClick}>
          Home
          {underlineSpan}
        </Link>
      )}
      
      {user && showBackToDashboard && (
        <Link to="/dashboard" className={linkClass} onClick={onLinkClick}>
          Go back to Dashboard
          {underlineSpan}
        </Link>
      )}
      
      {user && !showBackToDashboard && (
        <Link to="/dashboard" className={linkClass} onClick={onLinkClick}>
          Dashboard
          {underlineSpan}
        </Link>
      )}
    </nav>
  );
};
