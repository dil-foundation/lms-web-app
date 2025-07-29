import { useState, memo, useCallback } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import { Menu, X, LogOut, Settings, Home, Layout } from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const layouts = [
  { id: '/', name: 'Classic Layout', description: 'Traditional hero-first design' },
  { id: '/home-layout-2', name: 'Modern Grid', description: 'Feature-focused grid layout' },
  { id: '/home-layout-3', name: 'Story Flow', description: 'Narrative-driven experience' },
  { id: '/home-layout-4', name: 'Interactive', description: 'Dynamic animated layout' }
];

export const MobileMenu = memo(() => {
  const [isOpen, setIsOpen] = useState(false);
  const { user, session } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error('Failed to log out. Please try again.');
      console.error('Logout error:', error);
    } else {
      toast.success('You have been logged out.');
      setIsOpen(false);
      navigate('/');
    }
  };

  const handleLinkClick = useCallback(() => {
    setIsOpen(false);
  }, []);

  const isOnHomePage = layouts.some(layout => layout.id === location.pathname);
  const currentLayout = layouts.find(layout => layout.id === location.pathname) || layouts[0];

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
            <h2 className="text-lg font-semibold text-foreground">Menu</h2>
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
                    <span className="font-medium">Dashboard</span>
                  </Link>
                </div>

                <Separator />

                {/* Account Section */}
                <div className="space-y-3">
                  <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                    Account
                  </h3>
                  <div className="space-y-1">
                    <Link
                      to="/dashboard/profile-settings"
                      onClick={handleLinkClick}
                      className="flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-accent transition-colors"
                    >
                      <Settings className="h-5 w-5 text-muted-foreground" />
                      <span>Profile Settings</span>
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-accent transition-colors w-full text-left"
                    >
                      <LogOut className="h-5 w-5 text-muted-foreground" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>

                <Separator />

                {/* Appearance Section */}
                <div className="space-y-3">
                  <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                    Appearance
                  </h3>
                  <div className="flex items-center justify-between px-3 py-2">
                    <span className="text-sm">Theme</span>
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
                    <span className="font-medium">Home</span>
                  </Link>
                </div>

                {/* Layout Switcher for Home Pages */}
                {isOnHomePage && (
                  <>
                    <Separator />
                    <div className="space-y-3">
                      <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                        <Layout className="h-4 w-4" />
                        Page Layouts
                      </h3>
                      <div className="space-y-1">
                        {layouts.map((layout) => (
                          <button
                            key={layout.id}
                            onClick={() => {
                              navigate(layout.id);
                              handleLinkClick();
                            }}
                            className={`w-full text-left px-3 py-3 rounded-lg hover:bg-accent transition-colors ${
                              location.pathname === layout.id ? 'bg-primary/10 border border-primary/20' : ''
                            }`}
                          >
                            <div className="flex flex-col">
                              <span className="font-medium text-sm">{layout.name}</span>
                              <span className="text-xs text-muted-foreground">{layout.description}</span>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                <Separator />

                {/* Auth Section */}
                <div className="space-y-3">
                  <Link to="/auth" onClick={handleLinkClick}>
                    <Button className="w-full bg-primary hover:bg-primary/90 text-primary-foreground">
                      Sign In
                    </Button>
                  </Link>
                </div>

                <Separator />

                {/* Appearance Section for Guests */}
                <div className="space-y-3">
                  <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                    Appearance
                  </h3>
                  <div className="flex items-center justify-between px-3 py-2">
                    <span className="text-sm">Theme</span>
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
