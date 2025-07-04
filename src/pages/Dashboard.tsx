
import { Routes, Route } from 'react-router-dom';
import { Header } from '@/components/Header';
import { DashboardSidebar } from '@/components/DashboardSidebar';
import { StudentDashboard } from '@/components/dashboard/StudentDashboard';
import { TeacherDashboard } from '@/components/dashboard/TeacherDashboard';
import { AdminDashboard } from '@/components/dashboard/AdminDashboard';
import { RolePlaceholder } from '@/components/dashboard/RolePlaceholder';
import { useAuth } from '@/hooks/useAuth';
import { useUserProfile } from '@/hooks/useUserProfile';
import { BookOpen, Users, ClipboardList, TrendingUp, BarChart3, Settings, GraduationCap, Award } from 'lucide-react';
import { type UserRole } from '@/config/roleNavigation';

const Dashboard = () => {
  const { user, loading: authLoading } = useAuth();
  const { profile, loading: profileLoading } = useUserProfile(user);

  // Show loading state while fetching auth and profile data
  if (authLoading || profileLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  // Redirect to auth if no user
  if (!user) {
    window.location.href = '/auth';
    return null;
  }

  // Handle case where profile is not yet available
  if (!profile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">Unable to load user profile. Please try refreshing the page.</p>
        </div>
      </div>
    );
  }

  const userRole = profile.role as UserRole;

  // Role-specific dashboard overview component
  const DashboardOverview = () => {
    switch (userRole) {
      case 'student':
        return <StudentDashboard userProfile={profile} />;
      case 'teacher':
        return <TeacherDashboard userProfile={profile} />;
      case 'admin':
        return <AdminDashboard userProfile={profile} />;
      default:
        return <RolePlaceholder title="Dashboard" description="Welcome to your dashboard" icon={BookOpen} />;
    }
  };

  // Role-specific placeholder components for different routes
  const getPlaceholderComponent = (title: string, description: string, icon: any) => {
    return () => <RolePlaceholder title={title} description={description} icon={icon} />;
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <DashboardSidebar userRole={userRole}>
        <Routes>
          <Route path="/" element={<DashboardOverview />} />
          
          {/* Student Routes */}
          {userRole === 'student' && (
            <>
              <Route path="/courses" element={<RolePlaceholder title="My Courses" description="View and manage your enrolled courses" icon={BookOpen} />} />
              <Route path="/assignments" element={<RolePlaceholder title="Assignments" description="View and complete your assignments" icon={ClipboardList} />} />
              <Route path="/progress" element={<RolePlaceholder title="Progress Tracking" description="Monitor your learning progress and achievements" icon={TrendingUp} />} />
              <Route path="/ai-tutor" element={<RolePlaceholder title="AI Tutor" description="Get personalized AI-powered learning assistance" icon={GraduationCap} />} />
            </>
          )}
          
          {/* Teacher Routes */}
          {userRole === 'teacher' && (
            <>
              <Route path="/classes" element={<RolePlaceholder title="My Classes" description="Manage your classes and students" icon={Users} />} />
              <Route path="/courses" element={<RolePlaceholder title="Course Management" description="Create and manage your courses" icon={BookOpen} />} />
              <Route path="/student-progress" element={<RolePlaceholder title="Student Progress" description="Monitor individual student performance" icon={TrendingUp} />} />
              <Route path="/assignments" element={<RolePlaceholder title="Assignment Management" description="Create and grade assignments" icon={ClipboardList} />} />
              <Route path="/resources" element={<RolePlaceholder title="Teaching Resources" description="Access and manage teaching materials" icon={Award} />} />
            </>
          )}
          
          {/* Admin Routes */}
          {userRole === 'admin' && (
            <>
              <Route path="/users" element={<RolePlaceholder title="User Management" description="Manage system users and permissions" icon={Users} />} />
              <Route path="/courses" element={<RolePlaceholder title="Course Administration" description="Oversee all courses in the system" icon={BookOpen} />} />
              <Route path="/analytics" element={<RolePlaceholder title="System Analytics" description="View comprehensive system analytics" icon={BarChart3} />} />
              <Route path="/reports" element={<RolePlaceholder title="Reports & Data" description="Generate and view system reports" icon={ClipboardList} />} />
              <Route path="/settings" element={<RolePlaceholder title="System Settings" description="Configure system-wide settings" icon={Settings} />} />
            </>
          )}
        </Routes>
      </DashboardSidebar>
    </div>
  );
};

export default Dashboard;
