import { Routes, Route, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { Header } from '@/components/Header';
import { DashboardSidebar } from '@/components/DashboardSidebar';
import { StudentDashboard } from '@/components/dashboard/StudentDashboard';
import { TeacherDashboard } from '@/components/dashboard/TeacherDashboard';
import { AdminDashboard } from '@/components/dashboard/AdminDashboard';
import { RolePlaceholder } from '@/components/dashboard/RolePlaceholder';
import { RoleSwitcher } from '@/components/dashboard/RoleSwitcher';
import { UsersManagement } from '@/components/admin/UsersManagement';
import { CourseManagement } from '@/components/admin/CourseManagement';
import { ReportsOverview } from '@/components/admin/ReportsOverview';
import CourseBuilder from './CourseBuilder';
import { CourseOverview } from './CourseOverview';
import { CourseContent } from './CourseContent';
import { SidebarProvider } from '@/components/ui/sidebar';
import { useAuth } from '@/hooks/useAuth';
import { useUserProfile } from '@/hooks/useUserProfile';
import { BookOpen, Users, ClipboardList, TrendingUp, BarChart3, Settings, GraduationCap, Award, Shield, MessageSquare, Link, Eye } from 'lucide-react';
import { type UserRole } from '@/config/roleNavigation';
import ProfileSettings from './ProfileSettings';
import { ContentLoader } from '@/components/ContentLoader';

type Profile = {
  full_name: string | null;
  email: string | null;
  role: UserRole;
  [key: string]: any;
};

const Dashboard = () => {
  const { user, loading: authLoading } = useAuth();
  const { profile, loading: profileLoading, error: profileError } = useUserProfile();
  const navigate = useNavigate();
  
  const [devRole, setDevRole] = useState<UserRole | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth', { replace: true });
    }
  }, [authLoading, user, navigate]);

  const getMockProfile = (baseProfile: Profile, role: UserRole) => {
    const newProfile = { ...baseProfile, role };
    switch (role) {
      case 'student': return { ...newProfile, first_name: 'Alex', last_name: 'Student', grade: '10th' };
      case 'teacher': return { ...newProfile, first_name: 'Sarah', last_name: 'Teacher' };
      case 'admin': return { ...newProfile, first_name: 'John', last_name: 'Admin' };
      default: return newProfile;
    }
  };

  const currentRole = devRole || (profile?.role as UserRole | undefined);
  const displayProfile = profile && currentRole ? getMockProfile(profile, currentRole) : null;
  const isLoading = authLoading || (user && profileLoading);

  const DashboardContent = () => {
    if (isLoading) {
      return <ContentLoader message={authLoading ? 'Authenticating...' : 'Loading user profile...'} />;
    }

    if (profileError) {
      return (
        <div className="flex items-center justify-center h-full text-center">
          <div>
            <p className="text-muted-foreground">Unable to load user profile.</p>
            <p className="mt-2 text-sm text-red-500">Error: {profileError}</p>
          </div>
        </div>
      );
    }
    
    if (!profile) {
      return (
        <div className="flex items-center justify-center h-full text-center">
          <p className="text-muted-foreground">User profile not found.</p>
        </div>
      );
    }

    const finalRole = devRole || profile.role as UserRole;
    const finalProfile = getMockProfile(profile, finalRole);

    const DashboardOverview = () => {
      switch (finalRole) {
        case 'student': return <StudentDashboard userProfile={finalProfile} />;
        case 'teacher': return <TeacherDashboard userProfile={finalProfile} />;
        case 'admin': return <AdminDashboard userProfile={finalProfile} />;
        default: return <RolePlaceholder title="Dashboard" description="Welcome" icon={BookOpen} />;
      }
    };
    
    return (
      <div className="space-y-4">
        <RoleSwitcher currentRole={finalRole} onRoleChange={setDevRole} />
        <Routes>
          <Route path="/" element={<DashboardOverview />} />
          <Route path="/profile-settings" element={<ProfileSettings />} />
          <Route path="/course/:id" element={<CourseOverview />} />
          <Route path="/course/:id/content" element={<CourseContent />} />
          {finalRole === 'student' && (
            <>
              <Route path="/courses" element={<RolePlaceholder title="My Courses" description="View and manage your enrolled courses" icon={BookOpen} />} />
              <Route path="/assignments" element={<RolePlaceholder title="Assignments" description="View and complete your assignments" icon={ClipboardList} />} />
              <Route path="/progress" element={<RolePlaceholder title="Progress Tracking" description="Monitor your learning progress and achievements" icon={TrendingUp} />} />
              <Route path="/ai-tutor" element={<RolePlaceholder title="AI Tutor" description="Get personalized AI-powered learning assistance" icon={GraduationCap} />} />
            </>
          )}
          {finalRole === 'teacher' && (
             <>
              <Route path="/classes" element={<RolePlaceholder title="My Classes" description="Manage your classes and students" icon={Users} />} />
              <Route path="/courses" element={<CourseManagement />} />
              <Route path="/courses/builder/:courseId" element={<CourseBuilder />} />
              <Route path="/student-progress" element={<RolePlaceholder title="Student Progress" description="Monitor individual student performance" icon={TrendingUp} />} />
              <Route path="/assignments" element={<RolePlaceholder title="Assignment Management" description="Create and grade assignments" icon={ClipboardList} />} />
              <Route path="/resources" element={<RolePlaceholder title="Teaching Resources" description="Access and manage teaching materials" icon={Award} />} />
            </>
          )}
          {finalRole === 'admin' && (
            <>
              <Route path="/users" element={<UsersManagement />} />
              <Route path="/courses" element={<CourseManagement />} />
              <Route path="/courses/builder/:courseId" element={<CourseBuilder />} />
              <Route path="/analytics" element={<RolePlaceholder title="System Analytics" description="View comprehensive system analytics" icon={BarChart3} />} />
              <Route path="/reports" element={<ReportsOverview />} />
              <Route path="/observation-reports" element={<RolePlaceholder title="Observation Reports" description="View and manage observation reports" icon={Eye} />} />
              <Route path="/secure-links" element={<RolePlaceholder title="Secure Links" description="Manage secure links and access controls" icon={Link} />} />
              <Route path="/settings" element={<RolePlaceholder title="Settings" description="Configure system-wide settings" icon={Settings} />} />
              <Route path="/security" element={<RolePlaceholder title="Security" description="Manage security settings and protocols" icon={Shield} />} />
              <Route path="/discussion" element={<RolePlaceholder title="Discussion" description="Moderate discussions and forums" icon={MessageSquare} />} />
              <Route path="/grade-assignments" element={<RolePlaceholder title="Grade Assignments" description="Review and grade student assignments" icon={Award} />} />
            </>
          )}
        </Routes>
      </div>
    );
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen bg-background flex flex-col w-full">
        <Header />
        <div className="flex-1 flex min-h-0">
          <DashboardSidebar userRole={currentRole} userProfile={displayProfile}>
            <DashboardContent />
          </DashboardSidebar>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default Dashboard;
