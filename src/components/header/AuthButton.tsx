import { memo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Settings } from 'lucide-react';

export function AuthButton() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const handleAuthAction = async () => {
    if (user) {
      await signOut();
      navigate('/'); // Redirect to home page after sign out
    } else {
      navigate('/auth');
    }
  };

    return (
    <Button onClick={handleAuthAction} variant="ghost">
      {user ? 'Logout' : 'Login'}
        </Button>
    );
  }

AuthButton.displayName = 'AuthButton';
