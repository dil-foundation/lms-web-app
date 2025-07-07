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
import { toast } from 'sonner';
import { FullScreenLoader } from '@/components/FullScreenLoader';

const Dashboard = () => {
  const { user, loading: authLoading } = useAuth();
  const { profile, loading: profileLoading, error: profileError } = useUserProfile(user);
  const navigate = useNavigate();
  
  // Dev mode state for role switching
  const [devRole, setDevRole] = useState<UserRole | null>(null);

  // Use a combined loading state to prevent flicker
  if (authLoading || (user && profileLoading)) {
    return <FullScreenLoader message={authLoading ? 'Authenticating...' : 'Loading user profile...'} />;
  }

  // If loading is done and there's still no user, redirect
  if (!user) {
    window.location.href = '/auth';
    return null;
  }

  // If loading is done and there's no profile, show an error
  if (!profile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">Unable to load user profile.</p>
          <p className="mt-2 text-sm text-red-500">Error: {profileError || 'Profile not found.'}</p>
        </div>
      </div>
    );
  }

  // Use dev role if set, otherwise use actual user role
  const userRole = devRole || (profile.role as UserRole);

  // Create a mock profile for different roles
  const getMockProfile = (role: UserRole) => {
    const baseProfile = { ...profile, role };
    
    switch (role) {
      case 'student':
        return { 
          ...baseProfile, 
          first_name: 'Alex', 
          last_name: 'Student',
          grade: '10th'
        };
      case 'teacher':
        return { 
          ...baseProfile, 
          first_name: 'Sarah', 
          last_name: 'Teacher'
        };
      case 'admin':
        return { 
          ...baseProfile, 
          first_name: 'John', 
          last_name: 'Admin'
        };
      default:
        return baseProfile;
    }
  };

  const displayProfile = getMockProfile(userRole);

  // Role-specific dashboard overview component
  const DashboardOverview = () => {
    switch (userRole) {
      case 'student':
        return <StudentDashboard userProfile={displayProfile} />;
      case 'teacher':
        return <TeacherDashboard userProfile={displayProfile} />;
      case 'admin':
        return <AdminDashboard userProfile={displayProfile} />;
      default:
        return <RolePlaceholder title="Dashboard" description="Welcome to your dashboard" icon={BookOpen} />;
    }
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen bg-background flex flex-col w-full">
        <Header />
        
        <div className="flex-1">
          <div className="flex min-h-full w-full">
            <DashboardSidebar userRole={userRole} userProfile={displayProfile}>
              <div className="space-y-4">
                {/* Development Role Switcher */}
                <RoleSwitcher 
                  currentRole={userRole}
                  onRoleChange={setDevRole}
                />
                
                <Routes>
                  <Route path="/" element={<DashboardOverview />} />
                  <Route path="/profile-settings" element={<ProfileSettings />} />
                  
                  {/* Universal Course Routes */}
                  <Route path="/course/:id" element={<CourseOverview />} />
                  <Route path="/course/:id/content" element={<CourseContent />} />
                  
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
            </DashboardSidebar>
          </div>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default Dashboard;
