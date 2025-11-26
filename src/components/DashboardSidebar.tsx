import { useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Menu, X, User, LogOut, ChevronUp } from 'lucide-react';
import { getCategorizedNavigation, type UserRole, getRoleDisplayName } from '@/config/roleNavigation';
import { UserProfileSection } from '@/components/sidebar/UserProfileSection';
import { Skeleton } from '@/components/ui/skeleton';
import { Logo } from './header/Logo';
import { ThemeToggle } from './header/ThemeToggle';
import { AuthButton } from './header/AuthButton';
import { useAILMS } from '@/contexts/AILMSContext';
import { AILMSToggle } from '@/components/ui/AILMSToggle';
import { useZoomIntegration } from '@/hooks/useZoomIntegration';
import { useAuth } from '@/hooks/useAuth';
import { useUserProfile } from '@/hooks/useUserProfile';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';



interface DashboardSidebarProps {
  children: React.ReactNode;
  userRole?: UserRole;
}

export const DashboardSidebar = ({
  children,
  userRole
}: DashboardSidebarProps) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const { isAIMode } = useAILMS();
  const { isEnabled: isZoomEnabled } = useZoomIntegration();
  const navigationCategories = getCategorizedNavigation(userRole, isAIMode, isZoomEnabled);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { profile } = useUserProfile();

  const handleSignOut = async () => {
    try {
      await signOut();
      setIsMobileMenuOpen(false);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const handleProfileSettings = () => {
    navigate('/dashboard/profile-settings');
    setIsMobileMenuOpen(false);
  };

  const getInitials = () => {
    if (profile?.first_name && profile?.last_name) {
      return `${profile.first_name.charAt(0)}${profile.last_name.charAt(0)}`.toUpperCase();
    }
    if (profile?.email) {
      return profile.email.charAt(0).toUpperCase();
    }
    return 'U';
  };

  // Render navigation items component to avoid duplication
  const NavigationItems = () => (
    <nav className="px-2 space-y-2 md:space-y-1 md:px-0">
      {navigationCategories.map(category => (
        <div key={category.title} className="mb-6 md:mb-3 lg:mb-6">
          <div className="px-4 pt-4 pb-3 md:px-2 md:pt-2.5 md:pb-1.5 lg:px-4 lg:pt-4 lg:pb-3">
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider md:text-[9px] lg:text-xs">{category.title}</h3>
          </div>
          <div className="space-y-1 md:space-y-0.5 lg:space-y-1">
            {category.items.map(item => (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === '/dashboard'}
                onClick={() => setIsMobileMenuOpen(false)}
                className={({ isActive }) => 
                  `flex items-center space-x-3 md:space-x-1.5 lg:space-x-3 px-3 py-2 mx-2 md:px-1.5 md:py-1.5 md:mx-1 lg:px-3 lg:py-2 lg:mx-2 rounded-lg transition-all duration-200 ${
                    isActive 
                      ? 'bg-primary/10 dark:bg-primary/20 text-primary dark:text-primary font-medium shadow-sm' 
                      : 'text-foreground hover:bg-primary/10 dark:hover:bg-primary/20 hover:text-primary dark:hover:text-primary'
                  }`
                }
              >
                <item.icon className="h-5 w-5 md:h-3.5 md:w-3.5 lg:h-5 lg:w-5 flex-shrink-0" />
                <span className="font-medium md:text-[11px] lg:text-sm xl:text-base min-w-0 truncate">{item.title}</span>
                {item.badge && (
                  <span className="ml-auto bg-destructive text-destructive-foreground text-xs md:text-[9px] lg:text-xs px-2 py-0.5 md:px-1 lg:px-2 rounded-full flex-shrink-0">
                    {item.badge}
                  </span>
                )}
              </NavLink>
            ))}
          </div>
        </div>
      ))}
    </nav>
  );

  return (
    <div className="flex min-h-full w-full">
      {/* Mobile Header - Visible only on mobile */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-[110] flex items-center justify-between h-16 px-3 bg-background border-b border-border">
        {/* Logo - Left */}
        <div className="flex-shrink-0 w-20">
          <Logo />
        </div>

        {/* AI/LMS Toggle - Center */}
        {userRole !== 'content_creator' && userRole !== 'view_only' && (
          <div className="absolute left-1/2 -translate-x-1/2 flex items-center justify-center">
            <AILMSToggle size="sm" />
          </div>
        )}

        {/* Menu Button - Right */}
        <Button 
          variant="ghost" 
          size="icon" 
          className="flex-shrink-0"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        >
          {isMobileMenuOpen ? (
            <X className="h-6 w-6" />
          ) : (
            <Menu className="h-6 w-6" />
          )}
        </Button>
      </div>

      {/* Mobile Navigation Sheet */}
      <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
        <SheetContent side="left" className="p-0 w-80 flex flex-col [&>button]:hidden md:hidden">
          {/* Header */}
          <div className="flex items-center justify-between h-16 p-4 border-b border-border flex-shrink-0">
            <div className="w-32">
              <Logo />
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* User Profile Section */}
          <div className="flex-shrink-0">
            <UserProfileSection />
          </div>

          {/* Scrollable Navigation */}
          <div className='flex-1 overflow-y-auto'>
            <NavigationItems />
          </div>

          {/* Enhanced Profile Section at Bottom - Sticky */}
          <div className="flex-shrink-0 border-t border-border bg-muted/30">
            {/* Profile Dropdown Toggle */}
            {isProfileDropdownOpen && user && (
              <div className="p-3 space-y-2 border-b border-border bg-card">
                <div className="px-3 py-2 rounded-lg bg-muted/50">
                  <p className="text-sm font-medium text-foreground truncate">
                    {user.email}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {getRoleDisplayName(profile?.role || 'student')}
                  </p>
                </div>

                <button
                  onClick={handleProfileSettings}
                  className="flex items-center w-full px-3 py-2 text-sm text-foreground hover:bg-primary/10 rounded-lg transition-colors"
                >
                  <User className="h-4 w-4 mr-3" />
                  Profile Settings
                </button>

                <button
                  onClick={handleSignOut}
                  className="flex items-center w-full px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg transition-colors"
                >
                  <LogOut className="h-4 w-4 mr-3" />
                  Sign Out
                </button>
              </div>
            )}

            {/* Bottom Bar with Theme Toggle and Profile Button */}
            <div className="p-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ThemeToggle />
              </div>
              
              {user && (
                <button
                  onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-muted transition-colors"
                >
                  <Avatar className="h-7 w-7">
                    <AvatarImage src={profile?.avatar_url || undefined} alt={user.email || 'User'} />
                    <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                      {getInitials()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col items-start min-w-0">
                    <span className="text-xs font-medium text-foreground truncate max-w-[120px]">
                      {profile?.first_name && profile?.last_name 
                        ? `${profile.first_name} ${profile.last_name}` 
                        : user.email?.split('@')[0]}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {getRoleDisplayName(profile?.role || 'student')}
                    </span>
                  </div>
                  <ChevronUp className={`h-4 w-4 text-muted-foreground transition-transform ${isProfileDropdownOpen ? 'rotate-180' : ''}`} />
                </button>
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Desktop Sidebar - Hidden on mobile */}
      <aside className="hidden md:block w-48 md:w-52 lg:w-64 xl:w-72 flex-shrink-0 fixed left-0 top-16 lg:top-20 h-[calc(100vh-4rem)] lg:h-[calc(100vh-5rem)] bg-background border-r border-border z-40">
        <div className="flex flex-col h-full">
          <UserProfileSection />
          <div className="flex-1 overflow-y-auto px-1 md:px-1.5 lg:px-2 pb-4">
            <NavigationItems />
          </div>
        </div>
      </aside>
      
      {/* Main Content - Single instance with responsive padding */}
      <main className="flex-1 min-h-0 bg-background overflow-auto pt-16 md:pt-0 md:ml-52 lg:ml-64 xl:ml-72">
        <div className="w-full max-w-7xl mx-auto h-full px-3 sm:px-4 md:px-4 lg:px-6 py-4 sm:py-6 md:py-6">
          {children}
        </div>
      </main>
    </div>
  );
};
