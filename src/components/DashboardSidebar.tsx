
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
import { Home, BookOpen, FileQuestion, TrendingUp } from 'lucide-react';

const navigationItems = [
  { title: 'Overview', path: '/dashboard', icon: Home },
  { title: 'Courses', path: '/dashboard/courses', icon: BookOpen },
  { title: 'Quizzes', path: '/dashboard/quizzes', icon: FileQuestion },
  { title: 'Progress', path: '/dashboard/progress', icon: TrendingUp },
];

export const DashboardSidebar = ({ children }: { children: React.ReactNode }) => {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <Sidebar className="border-r border-border/50 w-56 bg-card/50 backdrop-blur-sm">
          <SidebarContent>
            <div className="p-4 pt-20">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-foreground">Dashboard</h2>
                <SidebarTrigger className="h-8 w-8" />
              </div>
            </div>
            
            <SidebarGroup>
              <SidebarGroupLabel className="text-muted-foreground font-medium mb-2">Navigation</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu className="space-y-1">
                  {navigationItems.map((item) => (
                    <SidebarMenuItem key={item.path}>
                      <SidebarMenuButton asChild>
                        <NavLink 
                          to={item.path}
                          end={item.path === '/dashboard'}
                          className={({ isActive }) =>
                            `flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200 hover:bg-muted/70 ${
                              isActive 
                                ? 'bg-primary/10 text-primary border-l-4 border-primary font-semibold' 
                                : 'text-muted-foreground hover:text-foreground'
                            }`
                          }
                        >
                          <item.icon className="h-5 w-5" />
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

        <main className="flex-1 pt-16 bg-background">
          <div className="p-8 max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
};
