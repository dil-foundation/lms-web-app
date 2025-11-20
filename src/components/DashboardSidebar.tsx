
import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Menu, X } from 'lucide-react';
import { getCategorizedNavigation, type UserRole } from '@/config/roleNavigation';
import { UserProfileSection } from '@/components/sidebar/UserProfileSection';
import { Skeleton } from '@/components/ui/skeleton';
import { Logo } from './header/Logo';
import { ThemeToggle } from './header/ThemeToggle';
import { AuthButton } from './header/AuthButton';
import { useAILMS } from '@/contexts/AILMSContext';
import { AILMSToggle } from '@/components/ui/AILMSToggle';
import { useZoomIntegration } from '@/hooks/useZoomIntegration';



interface DashboardSidebarProps {
  children: React.ReactNode;
  userRole?: UserRole;
}

export const DashboardSidebar = ({
  children,
  userRole
}: DashboardSidebarProps) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { isAIMode } = useAILMS();
  const { isEnabled: isZoomEnabled } = useZoomIntegration();
  const navigationCategories = getCategorizedNavigation(userRole, isAIMode, isZoomEnabled);
  const location = useLocation();

  // Render the desktop sidebar content directly to avoid function component issues

  return (
    <>
      {/* Mobile Layout */}
      <div className="md:hidden">
        {/* Fixed Header - Above Sheet Overlay */}
        <div className="fixed top-0 left-0 right-0 z-[110] flex items-center justify-between h-16 px-3 bg-background border-b border-border pointer-events-none">
          {/* Logo - Left */}
          <div className="flex-shrink-0 w-20 pointer-events-auto">
            <Logo />
          </div>

          {/* AI/LMS Toggle - Center */}
          {userRole !== 'content_creator' && userRole !== 'view_only' && (
            <div className="absolute left-1/2 -translate-x-1/2 flex items-center justify-center pointer-events-auto">
              <AILMSToggle size="sm" />
            </div>
          )}

          {/* Menu Button - Right */}
          <Button 
            variant="ghost" 
            size="icon" 
            className="flex-shrink-0 pointer-events-auto"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? (
              <X className="h-6 w-6" />
            ) : (
              <Menu className="h-6 w-6" />
            )}
          </Button>
        </div>

        {/* Sheet - Separate from Header */}
        <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
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
              <UserProfileSection />
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
                                  ? 'bg-primary/10 dark:bg-primary/20 text-primary dark:text-primary font-medium shadow-sm' 
                                  : 'text-foreground hover:bg-primary/10 dark:hover:bg-primary/20 hover:text-primary dark:hover:text-primary'
                              }`
                            }
                          >
                            <item.icon className="h-5 w-5" />
                            <span className="font-medium">{item.title}</span>
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
        
        {/* Mobile Main Content */}
        <main className="min-h-0 bg-background pt-16">
          <div className="w-full px-3 sm:px-4 py-4 sm:py-6">
            {children}
          </div>
        </main>
      </div>

      {/* Desktop Layout */}
      <div className="hidden md:flex min-h-full w-full">
        <div className="w-48 md:w-52 lg:w-64 xl:w-72 flex-shrink-0 fixed left-0 top-16 lg:top-20 h-[calc(100vh-4rem)] lg:h-[calc(100vh-5rem)] bg-background border-r border-border z-40">
          <div className="flex flex-col h-full">
            <UserProfileSection />
            <div className="flex-1 overflow-y-auto px-1 md:px-1.5 lg:px-2 pb-4">
              <nav className="space-y-1 md:space-y-1.5 lg:space-y-2">
                {navigationCategories.map(category => (
                  <div key={category.title} className="mb-3 md:mb-4 lg:mb-6">
                    <div className="px-2 md:px-2.5 lg:px-4 pt-2.5 md:pt-3 lg:pt-4 pb-1.5 md:pb-2 lg:pb-3">
                      <h3 className="text-[9px] md:text-[10px] lg:text-xs font-medium text-muted-foreground uppercase tracking-wider">{category.title}</h3>
                    </div>
                    <div className="space-y-0.5 md:space-y-0.5 lg:space-y-1">
                      {category.items.map(item => (
                        <NavLink
                          key={item.path}
                          to={item.path}
                          end={item.path === '/dashboard'}
                          onClick={() => setIsMobileMenuOpen(false)}
                          className={({ isActive }) => 
                            `flex items-center space-x-1.5 md:space-x-2 lg:space-x-3 px-1.5 md:px-2 lg:px-3 py-1.5 md:py-1.5 lg:py-2 mx-1 md:mx-1.5 lg:mx-2 rounded-lg transition-all duration-200 ${
                              isActive 
                                ? 'bg-primary/10 dark:bg-primary/20 text-primary dark:text-primary font-medium shadow-sm' 
                                : 'text-foreground hover:bg-primary/10 dark:hover:bg-primary/20 hover:text-primary dark:hover:text-primary'
                            }`
                          }
                        >
                          <item.icon className="h-3.5 w-3.5 md:h-4 md:w-4 lg:h-5 lg:w-5 flex-shrink-0" />
                          <span className="font-medium text-[11px] md:text-xs lg:text-sm xl:text-base min-w-0 truncate">{item.title}</span>
                          {item.badge && (
                            <span className="ml-auto bg-destructive text-destructive-foreground text-[9px] md:text-[10px] lg:text-xs px-1 md:px-1.5 lg:px-2 py-0.5 rounded-full flex-shrink-0">
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
          </div>
        </div>
        
        {/* Desktop Main Content */}
        <main className="flex-1 min-h-0 bg-background overflow-auto ml-48 md:ml-52 lg:ml-64 xl:ml-72">
          <div className="w-full max-w-7xl mx-auto h-full px-3 md:px-4 lg:px-6 py-4 md:py-6">
            {children}
          </div>
        </main>
      </div>
    </>
  );
};
