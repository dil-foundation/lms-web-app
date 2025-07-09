
import { NavLink } from 'react-router-dom';
import { Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from '@/components/ui/sidebar';
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
  const navigationItems = getRoleNavigation(userRole);
  
  return <>
      <Sidebar className="border-r border-border">
        <UserProfileSection profile={userProfile} />
        <SidebarContent className="pt-4">
          <SidebarGroup>
            <SidebarGroupLabel className="mb-3">Navigation</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {navigationItems.length > 0
                  ? navigationItems.map(item => (
                  <SidebarMenuItem key={item.path}>
                    <SidebarMenuButton asChild>
                      <NavLink 
                        to={item.path} 
                        end={item.path === '/dashboard'}
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
                    ))
                  : Array.from({ length: 4 }).map((_, i) => (
                      <SidebarMenuItem key={`skel-${i}`}>
                        <div className="flex items-center space-x-3 px-3 py-2 mx-2 rounded-lg">
                          <Skeleton className="h-5 w-5" />
                          <Skeleton className="h-4 w-32" />
                        </div>
                      </SidebarMenuItem>
                    ))
                }
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
      </Sidebar>

      <main className="flex-1 min-h-0 overflow-y-auto">
        <div className="container mx-auto px-4 sm:px-6 py-12 h-full">
          {children}
        </div>
      </main>
    </>;
};
