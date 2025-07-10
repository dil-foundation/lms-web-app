
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Users, BookOpen, ClipboardCheck, FileSearch } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface TeacherDashboardProps {
  userProfile: {
    id: string;
    first_name?: string;
    last_name?: string;
    teacher_id?: string;
  };
}

interface DashboardStats {
  totalStudents: number;
  publishedCourses: number;
}

export const TeacherDashboard = ({ userProfile }: TeacherDashboardProps) => {
  const [stats, setStats] = useState<DashboardStats>({ totalStudents: 0, publishedCourses: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      if (!userProfile?.id) {
        setLoading(false);
        return;
      }
      
      setLoading(true);
      try {
        // 1. Find all courses this teacher is a part of.
        const { data: teacherCourses, error: teacherCoursesError } = await supabase
          .from('course_members')
          .select('course_id')
          .eq('user_id', userProfile.id)
          .eq('role', 'teacher');

        if (teacherCoursesError) throw teacherCoursesError;

        const courseIds = teacherCourses.map(c => c.course_id);

        if (courseIds.length === 0) {
          setStats({ totalStudents: 0, publishedCourses: 0 });
          setLoading(false);
          return;
        }

        // 2. Fetch stats based on those courses.
        const [
          { count: totalStudents, error: studentsError },
          { count: publishedCourses, error: coursesError },
        ] = await Promise.all([
          supabase.from('course_members').select('*', { count: 'exact', head: true }).in('course_id', courseIds).eq('role', 'student'),
          supabase.from('courses').select('*', { count: 'exact', head: true }).in('id', courseIds).eq('status', 'Published'),
        ]);

        if (studentsError) throw studentsError;
        if (coursesError) throw coursesError;

        setStats({
          totalStudents: totalStudents ?? 0,
          publishedCourses: publishedCourses ?? 0,
        });

      } catch (error: any) {
        console.error("Failed to fetch teacher dashboard stats:", error);
        toast.error("Failed to load dashboard statistics.", { description: error.message });
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [userProfile]);

  const getInitials = (firstName?: string, lastName?: string) => {
    return `${firstName?.charAt(0) || ''}${lastName?.charAt(0) || ''}`.toUpperCase();
  };

  const StatCard = ({ title, value, icon, isLoading }: { title: string; value: number | string; icon: React.ReactNode; isLoading: boolean; }) => (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            {isLoading ? <Skeleton className="h-7 w-16 mt-1" /> : <p className="text-2xl font-bold">{value}</p>}
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
            Welcome, {userProfile?.first_name || 'Teacher'}!
          </h1>
          <p className="text-muted-foreground">
            {userProfile?.teacher_id ? `Teacher ID: ${userProfile.teacher_id}` : 'Manage your classes and students'}
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard 
          title="Total Students" 
          value={stats.totalStudents} 
          icon={<Users className="h-6 w-6 text-blue-500" />} 
          isLoading={loading}
        />
        <StatCard 
          title="Published Courses" 
          value={stats.publishedCourses} 
          icon={<BookOpen className="h-6 w-6 text-green-500" />} 
          isLoading={loading}
        />
        <StatCard 
          title="Pending Assignments" 
          value={0}
          icon={<ClipboardCheck className="h-6 w-6 text-orange-500" />} 
          isLoading={false}
        />
        <StatCard 
          title="Under Review Courses" 
          value={0}
          icon={<FileSearch className="h-6 w-6 text-purple-500" />} 
          isLoading={false}
        />
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
          <Card className="cursor-pointer hover:shadow-md transition-shadow">
            <CardHeader>
              <CardTitle className="text-base">Create New Assignment</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-3">Set up assignments for your students</p>
              <Button className="w-full">Create</Button>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:shadow-md transition-shadow">
            <CardHeader>
              <CardTitle className="text-base">Grade Submissions</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-3">Review and grade pending work</p>
              <Button className="w-full">Review</Button>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:shadow-md transition-shadow">
            <CardHeader>
              <CardTitle className="text-base">Class Analytics</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-3">View detailed class performance</p>
              <Button className="w-full">Analyze</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
