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
import { ObservationReports } from '@/components/admin/ObservationReports';
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
import { Database } from '@/integrations/supabase/types';
import { useTranslation } from 'react-i18next';

type Profile = Database['public']['Tables']['profiles']['Row'];

const Dashboard = () => {
  const { t } = useTranslation();
  const { user, loading: authLoading } = useAuth();
  const { profile, loading: profileLoading, error: profileError } = useUserProfile(user);
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
      return <ContentLoader message={authLoading ? t('dashboard.loading.authenticating') : t('dashboard.loading.loading_profile')} />;
    }

    if (profileError) {
      return (
        <div className="flex items-center justify-center h-full text-center">
          <div>
            <p className="text-muted-foreground">{t('dashboard.errors.unable_to_load_profile')}</p>
            <p className="mt-2 text-sm text-red-500">{t('dashboard.errors.error_message', { message: profileError })}</p>
          </div>
        </div>
      );
    }
    
    if (!profile) {
      return (
        <div className="flex items-center justify-center h-full text-center">
          <p className="text-muted-foreground">{t('dashboard.errors.profile_not_found')}</p>
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
        default: return <RolePlaceholder title={t('dashboard.placeholders.dashboard.title')} description={t('dashboard.placeholders.dashboard.description')} icon={BookOpen} />;
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
              <Route path="/courses" element={<RolePlaceholder title={t('dashboard.placeholders.student.my_courses.title')} description={t('dashboard.placeholders.student.my_courses.description')} icon={BookOpen} />} />
              <Route path="/assignments" element={<RolePlaceholder title={t('dashboard.placeholders.student.assignments.title')} description={t('dashboard.placeholders.student.assignments.description')} icon={ClipboardList} />} />
              <Route path="/progress" element={<RolePlaceholder title={t('dashboard.placeholders.student.progress_tracking.title')} description={t('dashboard.placeholders.student.progress_tracking.description')} icon={TrendingUp} />} />
              <Route path="/ai-tutor" element={<RolePlaceholder title={t('dashboard.placeholders.student.ai_tutor.title')} description={t('dashboard.placeholders.student.ai_tutor.description')} icon={GraduationCap} />} />
            </>
          )}
          {finalRole === 'teacher' && (
             <>
              <Route path="/classes" element={<RolePlaceholder title={t('dashboard.placeholders.teacher.my_classes.title')} description={t('dashboard.placeholders.teacher.my_classes.description')} icon={Users} />} />
              <Route path="/courses" element={<CourseManagement />} />
              <Route path="/courses/builder/:courseId" element={<CourseBuilder />} />
              <Route path="/student-progress" element={<RolePlaceholder title={t('dashboard.placeholders.teacher.student_progress.title')} description={t('dashboard.placeholders.teacher.student_progress.description')} icon={TrendingUp} />} />
              <Route path="/assignments" element={<RolePlaceholder title={t('dashboard.placeholders.teacher.assignment_management.title')} description={t('dashboard.placeholders.teacher.assignment_management.description')} icon={ClipboardList} />} />
              <Route path="/resources" element={<RolePlaceholder title={t('dashboard.placeholders.teacher.teaching_resources.title')} description={t('dashboard.placeholders.teacher.teaching_resources.description')} icon={Award} />} />
            </>
          )}
          {finalRole === 'admin' && (
            <>
              <Route path="/users" element={<UsersManagement />} />
              <Route path="/courses" element={<CourseManagement />} />
              <Route path="/courses/builder/:courseId" element={<CourseBuilder />} />
              <Route path="/analytics" element={<RolePlaceholder title={t('dashboard.placeholders.admin.system_analytics.title')} description={t('dashboard.placeholders.admin.system_analytics.description')} icon={BarChart3} />} />
              <Route path="/reports" element={<ReportsOverview />} />
              <Route path="/observation-reports" element={<ObservationReports />} />
              <Route path="/secure-links" element={<RolePlaceholder title={t('dashboard.placeholders.admin.secure_links.title')} description={t('dashboard.placeholders.admin.secure_links.description')} icon={Link} />} />
              <Route path="/settings" element={<RolePlaceholder title={t('dashboard.placeholders.admin.settings.title')} description={t('dashboard.placeholders.admin.settings.description')} icon={Settings} />} />
              <Route path="/security" element={<RolePlaceholder title={t('dashboard.placeholders.admin.security.title')} description={t('dashboard.placeholders.admin.security.description')} icon={Shield} />} />
              <Route path="/discussion" element={<RolePlaceholder title={t('dashboard.placeholders.admin.discussion.title')} description={t('dashboard.placeholders.admin.discussion.description')} icon={MessageSquare} />} />
              <Route path="/grade-assignments" element={<RolePlaceholder title={t('dashboard.placeholders.admin.grade_assignments.title')} description={t('dashboard.placeholders.admin.grade_assignments.description')} icon={Award} />} />
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
        
        <div className="flex flex-1 min-h-full w-full">
            <DashboardSidebar userRole={currentRole} userProfile={displayProfile}>
                <DashboardContent />
            </DashboardSidebar>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default Dashboard;
