
import { NavLink } from 'react-router-dom';
import { Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from '@/components/ui/sidebar';
import { getRoleNavigation, type UserRole } from '@/config/roleNavigation';
import { UserProfileSection } from '@/components/sidebar/UserProfileSection';
import { Database } from '@/integrations/supabase/types';

type Profile = Database['public']['Tables']['profiles']['Row'];

interface DashboardSidebarProps {
  children: React.ReactNode;
  userRole: UserRole;
  userProfile: Profile;
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
                {navigationItems.map(item => <SidebarMenuItem key={item.path}>
                    <SidebarMenuButton asChild>
                      <NavLink to={item.path} end={item.path === '/dashboard'} className={({
                    isActive
                  }) => `flex items-center space-x-3 px-3 py-2 rounded-lg transition-all duration-200 ${isActive ? 'bg-primary text-primary-foreground shadow-sm font-medium' : 'hover:bg-muted hover:text-foreground'}`}>
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>)}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
      </Sidebar>

      <main className="flex-1 min-h-0">
        <div className="p-6 pt-2 max-w-7xl ms-5 h-full">
          {children}
        </div>
      </main>
    </>;
};
