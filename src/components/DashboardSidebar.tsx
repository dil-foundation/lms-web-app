
import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from '@/components/ui/sidebar';
import { Menu, X } from 'lucide-react';
import { getRoleNavigation, type UserRole } from '@/config/roleNavigation';
import { UserProfileSection } from '@/components/sidebar/UserProfileSection';
import { Skeleton } from '@/components/ui/skeleton';

type Profile = {
  full_name: string | null;
  email: string | null;
  role: UserRole;
  [key: string]: any;
};

interface DashboardSidebarProps {
  children: React.ReactNode;
  userRole?: UserRole;
  userProfile: Profile | null;
}

export const DashboardSidebar = ({
  children,
  userRole,
  userProfile
}: DashboardSidebarProps) => {
  const { t } = useTranslation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const navigationItems = getRoleNavigation(t, userRole);

  const SidebarComponent = () => (
    <Sidebar className="border-r border-border bg-background">
      <UserProfileSection profile={userProfile} />
      <SidebarContent className="pt-4">
        <SidebarGroup>
          <SidebarGroupLabel className="mb-3">{t('dashboard_sidebar.navigation')}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigationItems.map(item => (
                <SidebarMenuItem key={item.path}>
                  <SidebarMenuButton asChild>
                    <NavLink 
                      to={item.path} 
                      end={item.path === '/dashboard'}
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      {({ isActive }) => (
                        <div className={`flex items-center space-x-3 px-3 py-2 mx-2 rounded-lg transition-all duration-200 ${
                          isActive 
                            ? 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 font-medium shadow-sm' 
                            : 'text-foreground hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-foreground'
                        }`}>
                          <item.icon className="h-5 w-5" />
                          <span className="font-medium">{item.title}</span>
                        </div>
                      )}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );

  return (
    <>
      {/* Mobile Layout */}
      <div className="lg:hidden">
        <div className="flex items-center justify-between bg-background border-b border-border p-4">
          <h2 className="text-lg font-semibold text-foreground">{t('dashboard_sidebar.dashboard')}</h2>
          <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="h-6 w-6" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-80 [&>button]:hidden">
              <div className="flex items-center justify-between p-4 border-b border-border">
                <h2 className="text-lg font-semibold">{t('dashboard_sidebar.menu')}</h2>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
              <div className="h-full">
                <UserProfileSection profile={userProfile} />
                <div className="pt-4">
                  <div className="px-4 pb-3">
                    <h3 className="text-sm font-medium text-muted-foreground">{t('dashboard_sidebar.navigation')}</h3>
                  </div>
                  <nav className="space-y-1 px-2">
                    {navigationItems.map(item => (
                      <NavLink
                        key={item.path}
                        to={item.path}
                        end={item.path === '/dashboard'}
                        onClick={() => setIsMobileMenuOpen(false)}
                        className={({ isActive }) => 
                          `flex items-center space-x-3 px-3 py-2 mx-2 rounded-lg transition-all duration-200 ${
                            isActive 
                              ? 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 font-medium shadow-sm' 
                              : 'text-foreground hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-foreground'
                          }`
                        }
                      >
                        <item.icon className="h-5 w-5" />
                        <span className="font-medium">{item.title}</span>
                      </NavLink>
                    ))}
                  </nav>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
        
        {/* Mobile Main Content */}
        <main className="min-h-0 bg-background">
          <div className="w-full px-3 sm:px-4 py-4 sm:py-6">
            {children}
          </div>
        </main>
      </div>

      {/* Desktop Layout */}
      <div className="hidden lg:flex min-h-full w-full">
        <div className="w-64 flex-shrink-0">
          <SidebarComponent />
        </div>
        
        {/* Desktop Main Content */}
        <main className="flex-1 min-h-0 bg-background w-full">
          <div className="w-full h-full px-4 sm:px-6 lg:px-8 py-12 max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </>
  );
};
