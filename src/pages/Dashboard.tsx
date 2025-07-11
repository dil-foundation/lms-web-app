import { Routes, Route, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { DashboardSidebar } from '@/components/DashboardSidebar';
import { StudentDashboard } from '@/components/dashboard/StudentDashboard';
import { StudentCourses } from '@/components/dashboard/StudentCourses';
import { StudentProgress } from '@/components/dashboard/StudentProgress';
import { StudentAssignments } from '@/components/dashboard/StudentAssignments';
import { TeacherDashboard } from '@/components/dashboard/TeacherDashboard';
import { AdminDashboard } from '@/components/dashboard/AdminDashboard';
import { RolePlaceholder } from '@/components/dashboard/RolePlaceholder';
import { UsersManagement } from '@/components/admin/UsersManagement';
import CourseManagement from '@/components/admin/CourseManagement';
import { ReportsOverview } from '@/components/admin/ReportsOverview';
import { ObservationReports } from '@/components/admin/ObservationReports';
import { Discussions } from '@/components/admin/Discussions';
import { DiscussionView } from '@/components/admin/DiscussionView';
import { GradeAssignments } from '@/components/admin/GradeAssignments';
import { AssignmentSubmissions } from '@/components/admin/AssignmentSubmissions';
import { AdminSettings } from '@/components/admin/AdminSettings';
import { AdminSecurity } from '@/components/admin/AdminSecurity';
import CourseBuilder from './CourseBuilder';
import { CourseOverview } from './CourseOverview';
import { CourseContent } from './CourseContent';
import StudentsPage from './StudentsPage';
import ReportsPage from './ReportsPage';
import DiscussionsPage from './DiscussionsPage';
import MessagesPage from './MessagesPage';
import { SidebarProvider } from '@/components/ui/sidebar';
import { useAuth } from '@/hooks/useAuth';
import { useUserProfile } from '@/hooks/useUserProfile';
import { BookOpen, Users, ClipboardList, TrendingUp, BarChart3, Settings, GraduationCap, Award, Shield, MessageSquare, Link, Eye, FileText, MessageCircle } from 'lucide-react';
import { type UserRole } from '@/config/roleNavigation';
import ProfileSettings from './ProfileSettings';
import { ContentLoader } from '@/components/ContentLoader';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { Logo } from '@/components/header/Logo';

type Profile = {
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  role: UserRole;
  [key: string]: any;
};

const Dashboard = () => {
  const { user, loading: authLoading } = useAuth();
  const { profile, loading: profileLoading, error: profileError } = useUserProfile();
  const navigate = useNavigate();
  
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth', { replace: true });
    }
  }, [authLoading, user, navigate]);

  const currentRole = profile?.role as UserRole | undefined;
  
  const displayProfile = profile && currentRole ? {
    ...profile,
    full_name: `${profile.first_name || ''} ${profile.last_name || ''}`.trim(),
    role: currentRole,
  } : null;
  
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

    const finalRole = profile.role as UserRole;
    const finalProfile = { ...profile, role: finalRole, id: profile.id };

  const DashboardOverview = () => {
      switch (finalRole) {
        case 'student': return <StudentDashboard userProfile={finalProfile} />;
        case 'teacher': return <TeacherDashboard userProfile={finalProfile} />;
        case 'admin': return <AdminDashboard userProfile={finalProfile} />;
        default: return <RolePlaceholder title="Dashboard" description="Welcome" icon={BookOpen} />;
    }
  };

  return (
              <div className="space-y-4 p-4 sm:p-6 lg:p-8 pt-0">
                <Routes>
                  <Route path="/" element={<DashboardOverview />} />
                  <Route path="/profile-settings" element={<ProfileSettings />} />
                  <Route path="/course/:id" element={<CourseOverview />} />
                  <Route path="/course/:id/content" element={<CourseContent />} />
          {finalRole === 'student' && (
                    <>
                      <Route path="/courses" element={<StudentCourses userProfile={finalProfile} />} />
                      <Route path="/assignments" element={<StudentAssignments userProfile={finalProfile} />} />
                      <Route path="/progress" element={<StudentProgress userProfile={finalProfile} />} />
                      <Route path="/ai-tutor" element={<RolePlaceholder title="AI Tutor" description="Get personalized AI-powered learning assistance" icon={GraduationCap} />} />
                    </>
                  )}
          {finalRole === 'teacher' && (
                    <>
                      <Route path="/courses" element={<CourseManagement />} />
                      <Route path="/courses/builder/:courseId" element={<CourseBuilder />} />
                      <Route path="/students" element={<StudentsPage />} />
                      <Route path="/reports" element={<ReportsPage />} />
                      <Route path="/messages" element={<MessagesPage />} />
                      <Route path="/discussion" element={<DiscussionsPage />} />
                    </>
                  )}
          {finalRole === 'admin' && (
                    <>
                      <Route path="/users" element={<UsersManagement />} />
                      <Route path="/courses" element={<CourseManagement />} />
                      <Route path="/courses/builder/:courseId" element={<CourseBuilder />} />
                      <Route path="/analytics" element={<RolePlaceholder title="System Analytics" description="View comprehensive system analytics" icon={BarChart3} />} />
                      <Route path="/reports" element={<ReportsOverview />} />
              <Route path="/observation-reports" element={<ObservationReports />} />
                      <Route path="/secure-links" element={<RolePlaceholder title="Secure Links" description="Manage secure links and access controls" icon={Link} />} />
                      <Route path="/settings" element={<AdminSettings />} />
                      <Route path="/security" element={<AdminSecurity />} />
                      <Route path="/discussion" element={<Discussions />} />
                      <Route path="/discussion/:discussionId" element={<DiscussionView />} />
                      <Route path="/grade-assignments" element={<GradeAssignments />} />
                      <Route path="/grade-assignments/:assignmentId" element={<AssignmentSubmissions />} />
                    </>
                  )}
                </Routes>
              </div>
    );
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen bg-background flex flex-col w-full">
        <DashboardHeader />
        <div className="flex flex-1 min-h-full w-full ">
            <DashboardSidebar userRole={currentRole} userProfile={displayProfile}>
                <DashboardContent />
            </DashboardSidebar>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default Dashboard;
