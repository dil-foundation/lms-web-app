
import { NavLink } from 'react-router-dom';
import { 
  Sidebar, 
  SidebarContent, 
  SidebarGroup, 
  SidebarGroupContent, 
  SidebarGroupLabel, 
  SidebarMenu, 
  SidebarMenuButton, 
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger
} from '@/components/ui/sidebar';
import { getRoleNavigation, getRoleDisplayName, type UserRole } from '@/config/roleNavigation';

interface DashboardSidebarProps {
  children: React.ReactNode;
  userRole: UserRole;
}

export const DashboardSidebar = ({ children, userRole }: DashboardSidebarProps) => {
  const navigationItems = getRoleNavigation(userRole);
  const roleDisplayName = getRoleDisplayName(userRole);

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <Sidebar className="border-r border-border w-48">
          <SidebarContent>
            <div className="p-4 pt-20">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">{roleDisplayName} Dashboard</h2>
                <SidebarTrigger />
              </div>
            </div>
            
            <SidebarGroup>
              <SidebarGroupLabel>Navigation</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {navigationItems.map((item) => (
                    <SidebarMenuItem key={item.path}>
                      <SidebarMenuButton asChild>
                        <NavLink 
                          to={item.path}
                          end={item.path === '/dashboard'}
                          className={({ isActive }) =>
                            `flex items-center space-x-3 px-3 py-2 rounded-lg transition-all duration-200 ${
                              isActive 
                                ? 'bg-primary text-primary-foreground shadow-sm font-medium' 
                                : 'hover:bg-muted hover:text-foreground'
                            }`
                          }
                        >
                          <item.icon className="h-4 w-4" />
                          <span>{item.title}</span>
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
        </Sidebar>

        <main className="flex-1 pt-16">
          <div className="p-6 max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
};
