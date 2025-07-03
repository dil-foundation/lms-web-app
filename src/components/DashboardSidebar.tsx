
import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { Button } from '@/components/ui/button';
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
  SidebarTrigger,
  useSidebar
} from '@/components/ui/sidebar';
import { Home, User, Menu } from 'lucide-react';

const navigationItems = [
  { title: 'Overview', path: '/dashboard', icon: Home },
  { title: 'Courses', path: '/dashboard/courses', icon: User },
  { title: 'Quizzes', path: '/dashboard/quizzes', icon: User },
  { title: 'Progress', path: '/dashboard/progress', icon: User },
];

export const DashboardSidebar = ({ children }: { children: React.ReactNode }) => {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <Sidebar className="border-r border-border">
          <SidebarContent>
            <div className="p-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Dashboard</h2>
                <SidebarTrigger />
              </div>
            </div>
            
            <SidebarGroup>
              <SidebarGroupLabel>Main Navigation</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {navigationItems.map((item) => (
                    <SidebarMenuItem key={item.path}>
                      <SidebarMenuButton asChild>
                        <NavLink 
                          to={item.path}
                          end={item.path === '/dashboard'}
                          className={({ isActive }) =>
                            `flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors ${
                              isActive 
                                ? 'bg-primary text-primary-foreground' 
                                : 'hover:bg-muted'
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

        <main className="flex-1 p-6">
          {children}
        </main>
      </div>
    </SidebarProvider>
  );
};
