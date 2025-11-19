
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
        <div className="fixed top-0 left-0 right-0 z-[90] flex items-center justify-between h-16 p-4 bg-background border-b border-border">
          <div className="w-32">
            <Logo />
          </div>
          {userRole !== 'content_creator' && userRole !== 'view_only' && (
            <div className="flex items-center justify-center">
              <AILMSToggle size="sm" />
            </div>
          )}
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
                <UserProfileSection />
                <div className='flex-1 overflow-y-auto overflow-x-hidden'>
                  <nav className="px-2 space-y-2">
                    {navigationCategories.map(category => (
                      <div key={category.title} className="mb-6">
                        <div className="px-3 pt-4 pb-2">
                          <h3 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider leading-tight break-words">
                            {category.title}
                          </h3>
                        </div>
                        <div className="space-y-1">
                          {category.items.map(item => (
                            <NavLink
                              key={item.path}
                              to={item.path}
                              end={item.path === '/dashboard'}
                              onClick={() => setIsMobileMenuOpen(false)}
                              className={({ isActive }) => 
                                `flex items-center gap-2.5 px-2.5 py-2 mx-1.5 rounded-lg transition-all duration-200 min-w-0 ${
                                  isActive 
                                    ? 'bg-primary/10 dark:bg-primary/20 text-primary dark:text-primary font-medium shadow-sm' 
                                    : 'text-foreground hover:bg-primary/10 dark:hover:bg-primary/20 hover:text-primary dark:hover:text-primary'
                                }`
                              }
                            >
                              <item.icon className="h-4 w-4 flex-shrink-0" />
                              <span className="text-sm font-medium truncate flex-1 min-w-0">{item.title}</span>
                              {item.badge && (
                                <span className="ml-auto bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 text-[10px] px-1.5 py-0.5 rounded-full flex-shrink-0 whitespace-nowrap">
                                  {item.badge}
                                </span>
                              )}
                              {item.isNew && (
                                <span className="ml-auto bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 text-[10px] px-1.5 py-0.5 rounded-full font-medium flex-shrink-0 whitespace-nowrap">
                                  New
                                </span>
                              )}
                              {item.isComingSoon && (
                                <span className="ml-auto bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 text-[10px] px-1.5 py-0.5 rounded-full flex-shrink-0 whitespace-nowrap font-medium">
                                  Soon
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
        <main className="min-h-0 bg-background pt-16">
          <div className="w-full px-3 sm:px-4 py-4 sm:py-6">
            {children}
          </div>
        </main>
      </div>

      {/* Desktop Layout */}
      <div className="hidden md:flex min-h-full w-full">
        <div className="w-72 flex-shrink-0 fixed left-0 top-20 h-[calc(100vh-5rem)] bg-background border-r border-border z-40 overflow-x-hidden">
          <div className="flex flex-col h-full overflow-x-hidden">
            <UserProfileSection />
            <div className="flex-1 overflow-y-auto overflow-x-hidden px-2 pb-4">
              <nav className="space-y-2">
                {navigationCategories.map(category => (
                  <div key={category.title} className="mb-6">
                    <div className="px-3 pt-4 pb-2">
                      <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider leading-tight break-words">
                        {category.title}
                      </h3>
                    </div>
                    <div className="space-y-1">
                      {category.items.map(item => (
                        <NavLink
                          key={item.path}
                          to={item.path}
                          end={item.path === '/dashboard'}
                          onClick={() => setIsMobileMenuOpen(false)}
                          className={({ isActive }) => 
                            `flex items-center gap-2.5 px-2.5 py-2 mx-1.5 rounded-lg transition-all duration-200 min-w-0 ${
                              isActive 
                                ? 'bg-primary/10 dark:bg-primary/20 text-primary dark:text-primary font-medium shadow-sm' 
                                : 'text-foreground hover:bg-primary/10 dark:hover:bg-primary/20 hover:text-primary dark:hover:text-primary'
                            }`
                          }
                        >
                          <item.icon className="h-4 w-4 flex-shrink-0" />
                          <span className="text-sm font-medium truncate flex-1 min-w-0">{item.title}</span>
                          {item.badge && (
                            <span className="ml-auto bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 text-[10px] px-1.5 py-0.5 rounded-full flex-shrink-0 whitespace-nowrap">
                              {item.badge}
                            </span>
                          )}
                          {item.isNew && (
                            <span className="ml-auto bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 text-[10px] px-1.5 py-0.5 rounded-full font-medium flex-shrink-0 whitespace-nowrap">
                              New
                            </span>
                          )}
                          {item.isComingSoon && (
                            <span className="ml-auto bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 text-[10px] px-1.5 py-0.5 rounded-full flex-shrink-0 whitespace-nowrap">
                              Soon
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
        <main className="flex-1 min-h-0 bg-background overflow-auto ml-72">
          <div className="w-full max-w-7xl mx-auto h-full px-4 py-6">
            {children}
          </div>
        </main>
      </div>
    </>
  );
};
