import { useState, memo, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import { Menu, X, LogOut, Settings, Home } from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';
import { LanguageToggle } from './LanguageToggle';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const MobileMenu = memo(() => {
  const [isOpen, setIsOpen] = useState(false);
  const { t } = useTranslation();
  const { user, session } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error(t('mobile_menu.logout_failed'));
      console.error('Logout error:', error);
    } else {
      toast.success(t('mobile_menu.logout_success'));
      setIsOpen(false);
      navigate('/');
    }
  };


  const handleLinkClick = useCallback(() => {
    setIsOpen(false);
  }, []);

  return (
    <div className="md:hidden">
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="hover:bg-accent">
            <Menu className="h-6 w-6" />
          </Button>
        </SheetTrigger>
        <SheetContent side="right" className="w-80 p-0 flex flex-col [&>button]:hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-border">
            <h2 className="text-lg font-semibold text-foreground">{t('mobile_menu.menu_title')}</h2>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsOpen(false)}
              className="hover:bg-accent h-6 w-6"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto">
            {session && user ? (
              <div className="p-6 space-y-6">
                {/* Navigation Section */}
                <div className="space-y-1">
                  <Link
                    to="/dashboard"
                    onClick={handleLinkClick}
                    className="flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-accent transition-colors"
                  >
                    <Home className="h-5 w-5 text-muted-foreground" />
                    <span className="font-medium">{t('mobile_menu.dashboard')}</span>
                  </Link>
                </div>

                <Separator />

                {/* Account Section */}
                <div className="space-y-3">
                  <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                    {t('mobile_menu.account_title')}
                  </h3>
                  <div className="space-y-1">
                    <Link
                      to="/dashboard/profile-settings"
                      onClick={handleLinkClick}
                      className="flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-accent transition-colors"
                    >
                      <Settings className="h-5 w-5 text-muted-foreground" />
                      <span>{t('mobile_menu.profile_settings')}</span>
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-accent transition-colors w-full text-left"
                    >
                      <LogOut className="h-5 w-5 text-muted-foreground" />
                      <span>{t('mobile_menu.sign_out')}</span>
                    </button>
                  </div>
                </div>

                <Separator />

                {/* Appearance Section */}
                <div className="space-y-3">
                  <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                    {t('mobile_menu.appearance_title')}
                  </h3>
                  <div className="flex items-center justify-between px-3 py-2">
                    <span className="text-sm">{t('mobile_menu.language_label')}</span>
                    <LanguageToggle />
                  </div>
                  <div className="flex items-center justify-between px-3 py-2">
                    <span className="text-sm">{t('mobile_menu.theme_label')}</span>
                    <ThemeToggle />
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-6 space-y-6">
                {/* Guest Navigation */}
                <div className="space-y-1">
                  <Link
                    to="/"
                    onClick={handleLinkClick}
                    className="flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-accent transition-colors"
                  >
                    <Home className="h-5 w-5 text-muted-foreground" />
                    <span className="font-medium">{t('mobile_menu.home')}</span>
                  </Link>
                </div>

                <Separator />

                {/* Auth Section */}
                <div className="space-y-3">
                  <Link to="/auth" onClick={handleLinkClick}>
                    <Button className="w-full bg-primary hover:bg-primary/90 text-primary-foreground">
                      {t('mobile_menu.sign_in')}
                    </Button>
                  </Link>
                </div>

                <Separator />

                {/* Appearance Section for Guests */}
                <div className="space-y-3">
                  <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                    {t('mobile_menu.appearance_title')}
                  </h3>
                  <div className="flex items-center justify-between px-3 py-2">
                    <span className="text-sm">{t('mobile_menu.language_label')}</span>
                    <LanguageToggle />
                  </div>
                  <div className="flex items-center justify-between px-3 py-2">
                    <span className="text-sm">{t('mobile_menu.theme_label')}</span>
                    <ThemeToggle />
                  </div>
                </div>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
});

MobileMenu.displayName = 'MobileMenu';
