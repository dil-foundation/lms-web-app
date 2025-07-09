import { memo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Settings } from 'lucide-react';

export const AuthButton = memo(() => {
  const { t } = useTranslation();
  const { user, session } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error(t('logout_failed'));
      console.error('Logout error:', error);
    } else {
      toast.success(t('logout_success'));
      navigate('/');
    }
  };

  if (session && user) {
    return (
      <div className="flex items-center gap-2">
        <Link to="/dashboard/profile-settings">
          <Button variant="ghost" size="icon" aria-label={t('header.settings')}>
            <Settings className="h-5 w-5" />
          </Button>
        </Link>
        <Button onClick={handleLogout} variant="outline">
          {t('header.logout')}
        </Button>
      </div>
    );
  }

  return (
    <Link to="/auth">
      <Button>{t('header.sign_in')}</Button>
    </Link>
  );
});

AuthButton.displayName = 'AuthButton';
