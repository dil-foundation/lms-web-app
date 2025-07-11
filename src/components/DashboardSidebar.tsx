
import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from '@/components/ui/sidebar';
import { Menu, X } from 'lucide-react';
import { getCategorizedNavigation, type UserRole } from '@/config/roleNavigation';
import { UserProfileSection } from '@/components/sidebar/UserProfileSection';
import { Skeleton } from '@/components/ui/skeleton';
import { Logo } from './header/Logo';
import { ThemeToggle } from './header/ThemeToggle';
import { AuthButton } from './header/AuthButton';

type Profile = {
  first_name: string | null;
  last_name: string | null;
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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const navigationCategories = getCategorizedNavigation(userRole);

  const SidebarComponent = () => (
    <Sidebar className="border-r border-border bg-background h-full">
      <UserProfileSection profile={userProfile} />
      <SidebarContent>
        {navigationCategories.map(category => (
          <SidebarGroup key={category.title}>
            <SidebarGroupLabel className="mb-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">{category.title}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {category.items.map(item => (
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
                            {item.badge && (
                              <span className="ml-auto bg-destructive text-destructive-foreground text-xs px-2 py-1 rounded-full">
                                {item.badge}
                              </span>
                            )}
                          </div>
                        )}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
    </Sidebar>
  );

  return (
    <>
      {/* Mobile Layout */}
      <div className="md:hidden">
        <div className="sticky top-0 z-10 flex items-center justify-between h-16 p-4 bg-background border-b border-border">
          <div className="w-32">
            <Logo />
          </div>
          <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="h-6 w-6" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-80 flex flex-col [&>button]:hidden">
              <div className="flex items-center justify-between h-16 p-4 border-b border-border">
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
              <div className="flex-1 flex flex-col h-full">
                <UserProfileSection profile={userProfile} />
                <div className='flex-1 overflow-y-auto'>
                  <nav className="px-2 space-y-2">
                    {navigationCategories.map(category => (
                      <div key={category.title} className="mb-6">
                        <div className="px-4 pt-4 pb-3">
                          <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{category.title}</h3>
                        </div>
                        <div className="space-y-1">
                          {category.items.map(item => (
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
                              {item.badge && (
                                <span className="ml-auto bg-destructive text-destructive-foreground text-xs px-2 py-1 rounded-full">
                                  {item.badge}
                                </span>
                              )}
                            </NavLink>
                          ))}
                        </div>
                      </div>
                    ))}
                  </nav>
                </div>

                <div className="p-4 mt-auto border-t border-border">
                    <div className="flex items-center justify-between">
                        <ThemeToggle />
                        <AuthButton />
                    </div>
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
      <div className="hidden md:flex min-h-full w-full">
        <div className="w-72 flex-shrink-0 pt-20">
          <SidebarComponent />
        </div>
        
        {/* Desktop Main Content */}
        <main className="flex-1 min-h-0 bg-background w-full max-w-7xl mx-auto">
          <div className="w-full h-full">
            {children}
          </div>
        </main>
      </div>
    </>
  );
};
