
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { User } from '@supabase/supabase-js';
import { Button } from '@/components/ui/button';

interface AuthButtonProps {
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
  isMobile?: boolean;
  onButtonClick?: () => void;
}

export const AuthButton = ({ user, loading, signOut, isMobile = false, onButtonClick }: AuthButtonProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const isAuthPage = location.pathname.startsWith('/auth');

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
    onButtonClick?.();
  };

  if (loading) {
    return (
      <Button 
        variant="outline" 
        disabled
        className={`${isMobile ? 'w-full' : ''}`}
      >
        Loading...
      </Button>
    );
  }

  if (user) {
    return (
      <Button 
        onClick={handleSignOut}
        variant="default" 
        className={`bg-primary hover:bg-primary/90 hover-scale transition-all duration-300 ${isMobile ? 'w-full' : ''}`}
      >
        Logout
      </Button>
    );
  }

  if (!isAuthPage) {
    return (
      <Link to="/auth" onClick={onButtonClick}>
        <Button 
          variant="default" 
          className={`bg-primary hover:bg-primary/90 hover-scale transition-all duration-300 ${isMobile ? 'w-full' : ''}`}
        >
          Sign In
        </Button>
      </Link>
    );
  }

  return null;
};
