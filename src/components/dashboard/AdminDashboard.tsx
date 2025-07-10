
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Users, Shield } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface AdminDashboardProps {
  userProfile: any;
}

interface DashboardStats {
  totalUsers: number;
  totalTeachers: number;
  totalStudents: number;
  totalAdmins: number;
}

export const AdminDashboard = ({ userProfile }: AdminDashboardProps) => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      try {
        const [
          { count: totalUsers, error: usersError },
          { count: totalTeachers, error: teachersError },
          { count: totalStudents, error: studentsError },
          { count: totalAdmins, error: adminsError },
        ] = await Promise.all([
          supabase.from('profiles').select('*', { count: 'exact', head: true }),
          supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'teacher'),
          supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'student'),
          supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'admin'),
        ]);

        if (usersError) throw usersError;
        if (teachersError) throw teachersError;
        if (studentsError) throw studentsError;
        if (adminsError) throw adminsError;

        setStats({
          totalUsers: totalUsers ?? 0,
          totalTeachers: totalTeachers ?? 0,
          totalStudents: totalStudents ?? 0,
          totalAdmins: totalAdmins ?? 0,
        });

      } catch (error: any) {
        console.error("Failed to fetch dashboard stats:", error);
        toast.error("Failed to load dashboard statistics.", { description: error.message });
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  const getInitials = (firstName?: string, lastName?: string) => {
    return `${firstName?.charAt(0) || ''}${lastName?.charAt(0) || ''}`.toUpperCase();
  };

  const StatCard = ({ title, value, icon, isLoading }: { title: string, value: number, icon: React.ReactNode, isLoading: boolean }) => (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            {isLoading ? <Skeleton className="h-7 w-16 mt-1" /> : <p className="text-2xl font-bold">{value.toLocaleString()}</p>}
          </div>
          {icon}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="flex items-center space-x-4 mb-8">
        <Avatar className="h-16 w-16">
          <AvatarFallback className="bg-primary text-primary-foreground text-xl font-bold">
            {getInitials(userProfile?.first_name, userProfile?.last_name)}
          </AvatarFallback>
        </Avatar>
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Admin Dashboard
          </h1>
          <p className="text-muted-foreground">
            Welcome, {userProfile?.first_name || 'Administrator'}
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard 
          title="Total Users" 
          value={stats?.totalUsers ?? 0} 
          isLoading={loading}
          icon={<Users className="h-6 w-6 text-blue-500" />} 
        />
        <StatCard 
          title="Total Teachers" 
          value={stats?.totalTeachers ?? 0} 
          isLoading={loading}
          icon={<Users className="h-6 w-6 text-green-500" />} 
        />
        <StatCard 
          title="Total Admins" 
          value={stats?.totalAdmins ?? 0} 
          isLoading={loading}
          icon={<Shield className="h-6 w-6 text-purple-500" />} 
        />
        <StatCard 
          title="Total Students" 
          value={stats?.totalStudents ?? 0} 
          isLoading={loading}
          icon={<Users className="h-6 w-6 text-orange-500" />} 
        />
      </div>

      {/* Admin Actions */}
      <div>
        <h2 className="text-xl font-semibold mb-4">System Management</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
          <Card className="cursor-pointer hover:shadow-md transition-shadow">
            <CardHeader>
              <CardTitle className="text-base">User Management</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-3">Manage users, roles, and permissions</p>
              <Button className="w-full">Manage</Button>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:shadow-md transition-shadow">
            <CardHeader>
              <CardTitle className="text-base">System Analytics</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-3">View system performance and usage</p>
              <Button className="w-full">View</Button>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:shadow-md transition-shadow">
            <CardHeader>
              <CardTitle className="text-base">System Settings</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-3">Configure system-wide settings</p>
              <Button className="w-full">Configure</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
