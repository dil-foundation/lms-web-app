import { memo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Settings } from 'lucide-react';

export const AuthButton = memo(() => {
  const { user, session } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error('Failed to log out. Please try again.');
      console.error('Logout error:', error);
    } else {
      toast.success('You have been logged out.');
      navigate('/');
    }
  };

  if (session && user) {
    return (
      <div className="flex items-center gap-2">
        <Link to="/dashboard/profile-settings">
          <Button variant="ghost" size="icon" aria-label="Settings">
            <Settings className="h-5 w-5" />
          </Button>
        </Link>
        <Button onClick={handleLogout} variant="outline">
          Logout
        </Button>
      </div>
    );
  }

  return (
    <Link to="/auth">
      <Button>Sign In</Button>
    </Link>
  );
});

AuthButton.displayName = 'AuthButton';
