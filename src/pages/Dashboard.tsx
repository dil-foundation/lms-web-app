import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import React, { useState, useEffect, Suspense, lazy, useCallback, useRef } from 'react';
import { DashboardSidebar } from '@/components/DashboardSidebar';
import { SidebarProvider } from '@/components/ui/sidebar';
import { useAuth } from '@/hooks/useAuth';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useAILMS } from '@/contexts/AILMSContext';
import { useMaintenanceCheck } from '@/hooks/useMaintenanceCheck';
import MaintenancePage from '@/components/MaintenancePage';
import { BookOpen } from 'lucide-react';
import { type UserRole } from '@/config/roleNavigation';
import { ContentLoader } from '@/components/ContentLoader';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { APEX } from '@/components/ui/AIAssistant';
import { requestNotificationPermission } from '@/utils/fcm';
import { OfflineRouteGuard } from '@/components/auth/OfflineRouteGuard';
import { OfflineAwareSuspense } from '@/components/ui/OfflineAwareSuspense';
import { RoleGuard } from '@/components/auth/RoleGuard';

const AIStudentLearn = lazy(() => import('@/components/dashboard/AIStudentLearn').then(module => ({ default: module.AIStudentLearn })));
// Import StudentDashboard eagerly since it's needed for offline overview access
import { StudentDashboard } from '@/components/dashboard/StudentDashboard';
const StudentCourses = lazy(() => import('@/components/dashboard/StudentCourses').then(module => ({ default: module.StudentCourses })));
const StudentProgress = lazy(() => import('@/components/dashboard/StudentProgress').then(module => ({ default: module.StudentProgress })));
const StudentAssignments = lazy(() => import('@/components/dashboard/StudentAssignments').then(module => ({ default: module.StudentAssignments })));
const TeacherDashboard = lazy(() => import('@/components/dashboard/TeacherDashboard').then(module => ({ default: module.TeacherDashboard })));
const PrincipalDashboard = lazy(() => import('@/components/dashboard/PrincipalDashboard').then(module => ({ default: module.PrincipalDashboard })));
const SchoolOfficerDashboard = lazy(() => import('@/components/dashboard/SchoolOfficerDashboard').then(module => ({ default: module.SchoolOfficerDashboard })));
const ProgramManagerDashboard = lazy(() => import('@/components/dashboard/ProgramManagerDashboard').then(module => ({ default: module.ProgramManagerDashboard })));
const ECEObserverDashboard = lazy(() => import('@/components/dashboard/ECEObserverDashboard').then(module => ({ default: module.ECEObserverDashboard })));
const AdminDashboard = lazy(() => import('@/components/dashboard/AdminDashboard').then(module => ({ default: module.AdminDashboard })));
// Import AIStudentDashboard eagerly since it's needed for offline overview access
import { AIStudentDashboard } from '@/components/dashboard/AIStudentDashboard';
const AITeacherDashboard = lazy(() => import('@/components/dashboard/AITeacherDashboard').then(module => ({ default: module.AITeacherDashboard })));
const AIAdminDashboard = lazy(() => import('@/components/dashboard/AIAdminDashboard').then(module => ({ default: module.AIAdminDashboard })));
const AIAdminPractice = lazy(() => import('@/components/dashboard/AIAdminPractice').then(module => ({ default: module.AIAdminPractice })));
const AITeacherPractice = lazy(() => import('@/components/dashboard/AITeacherPractice').then(module => ({ default: module.AITeacherPractice })));
const AITeacherProgress = lazy(() => import('@/components/dashboard/AITeacherProgress').then(module => ({ default: module.AITeacherProgress })));
const AIStudentProgress = lazy(() => import('@/components/dashboard/AIStudentProgress').then(module => ({ default: module.AIStudentProgress })));
const AIStudentPractice = lazy(() => import('@/components/dashboard/AIStudentPractice').then(module => ({ default: module.AIStudentPractice })));
const RolePlaceholder = lazy(() => import('@/components/dashboard/RolePlaceholder').then(module => ({ default: module.RolePlaceholder })));
const TeacherMeetings = lazy(() => import('@/components/dashboard/TeacherMeetings').then(module => ({ default: module.TeacherMeetings })));
const StudentMeetings = lazy(() => import('@/components/dashboard/StudentMeetings').then(module => ({ default: module.StudentMeetings })));
// Import OfflineLearning eagerly since it's specifically for offline use
import { OfflineLearning as StudentOfflineLearning } from '@/components/student/OfflineLearning';
const UsersManagement = lazy(() => import('@/components/admin/UsersManagement').then(module => ({ default: module.UsersManagement })));
const ClassManagement = lazy(() => import('@/components/admin/ClassManagement'));
const CourseManagement = lazy(() => import('@/components/admin/CourseManagement'));
const CoursesAndCategories = lazy(() => import('./CoursesAndCategories'));
const OrdersManagement = lazy(() => import('@/components/admin/OrdersManagement'));
const ReportsAnalytics = lazy(() => import('@/components/admin/ReportsAnalytics').then(module => ({ default: module.ReportsAnalytics })));
const APEXAdmin = lazy(() => import('@/components/admin/AIAssistantAdmin').then(module => ({ default: module.APEXAdmin })));
const IRIS = lazy(() => import('@/components/admin/AIAdminAssistant').then(module => ({ default: module.IRIS })));
const IRISv2 = lazy(() => import('@/components/admin/IRISv2').then(module => ({ default: module.IRISv2 })));

const StageZero = lazy(() => import('@/pages/practice/StageZero').then(module => ({ default: module.StageZero })));
const LessonDetail = lazy(() => import('@/pages/practice/LessonDetail').then(module => ({ default: module.LessonDetail })));
const StageOne = lazy(() => import('@/pages/practice/StageOne').then(module => ({ default: module.StageOne })));
const RepeatAfterMe = lazy(() => import('@/pages/practice/RepeatAfterMe').then(module => ({ default: module.RepeatAfterMe })));
const QuickResponse = lazy(() => import('@/pages/practice/QuickResponse').then(module => ({ default: module.QuickResponse })));
const ListenAndReply = lazy(() => import('@/pages/practice/ListenAndReply').then(module => ({ default: module.ListenAndReply })));
const StageTwo = lazy(() => import('@/pages/practice/StageTwo').then(module => ({ default: module.StageTwo })));
const DailyRoutine = lazy(() => import('@/pages/practice/DailyRoutine'));
const QuickAnswer = lazy(() => import('@/pages/practice/QuickAnswer'));
const RoleplaySimulation = lazy(() => import('@/pages/practice/RoleplaySimulation'));
const StageThree = lazy(() => import('@/pages/practice/StageThree').then(module => ({ default: module.StageThree })));
const StorytellingPractice = lazy(() => import('@/pages/practice/StorytellingPractice'));
const GroupDialogue = lazy(() => import('@/pages/practice/GroupDialogue'));
const ProblemSolvingSimulations = lazy(() => import('@/pages/practice/ProblemSolvingSimulations'));
const StageFour = lazy(() => import('@/pages/practice/StageFour').then(module => ({ default: module.StageFour })));
const AbstractTopicMonologue = lazy(() => import('@/pages/practice/AbstractTopicMonologue'));
const MockInterviewPractice = lazy(() => import('@/pages/practice/MockInterviewPractice'));
const NewsSummaryChallenge = lazy(() => import('@/pages/practice/NewsSummaryChallenge'));
const StageFive = lazy(() => import('@/pages/practice/StageFive').then(module => ({ default: module.StageFive })));
const CriticalThinkingDialogues = lazy(() => import('@/pages/practice/CriticalThinkingDialogues'));
const AcademicPresentations = lazy(() => import('@/pages/practice/AcademicPresentations'));
const InDepthInterviewSimulation = lazy(() => import('@/pages/practice/InDepthInterviewSimulation'));
const StageSix = lazy(() => import('@/pages/practice/StageSix').then(module => ({ default: module.StageSix })));
const AIGuidedSpontaneousSpeech = lazy(() => import('@/pages/practice/AIGuidedSpontaneousSpeech'));
const SensitiveScenarioRoleplay = lazy(() => import('@/pages/practice/SensitiveScenarioRoleplay'));
const CriticalOpinionBuilder = lazy(() => import('@/pages/practice/CriticalOpinionBuilder'));
const ReportsOverview = lazy(() => import('@/components/admin/ReportsOverview').then(module => ({ default: module.ReportsOverview })));
const ObservationReports = lazy(() => import('@/components/admin/ObservationReports').then(module => ({ default: module.ObservationReports })));
const GradeAssignments = lazy(() => import('@/components/admin/GradeAssignments').then(module => ({ default: module.GradeAssignments })));
const AssignmentSubmissions = lazy(() => import('@/components/admin/AssignmentSubmissions').then(module => ({ default: module.AssignmentSubmissions })));
const StudentSubmissionDetail = lazy(() => import('@/components/admin/StudentSubmissionDetail').then(module => ({ default: module.StudentSubmissionDetail })));
const AdminSecurity = lazy(() => import('@/components/admin/AdminSecurity'));
const AITutorSettings = lazy(() => import('@/components/admin/AITutorSettings').then(module => ({ default: module.AITutorSettings })));
const AISafetyEthicsSettings = lazy(() => import('@/components/admin/AISafetyEthicsSettings').then(module => ({ default: module.AISafetyEthicsSettings })));
const IntegrationAPIs = lazy(() => import('@/components/admin/IntegrationAPIs').then(module => ({ default: module.IntegrationAPIs })));
const Multitenancy = lazy(() => import('@/components/admin/Multitenancy').then(module => ({ default: module.Multitenancy })));
const CourseCategories = lazy(() => import('@/components/admin/CourseCategories').then(module => ({ default: module.CourseCategories })));
const CourseBuilder = lazy(() => import('./CourseBuilder'));
const AdvancedTools = lazy(() => import('./AdvancedTools'));
const ExecutiveDashboard = lazy(() => import('./ExecutiveDashboard'));
const PolicyManagement = lazy(() => import('./PolicyManagement'));
const InventoryManagement = lazy(() => import('./InventoryManagement'));
const PredictiveIntervention = lazy(() => import('./PredictiveIntervention'));
const AIContentDevelopment = lazy(() => import('./AIContentDevelopment'));
const CalendarManagement = lazy(() => import('./CalendarManagement'));
const CourseOverview = lazy(() => import('./CourseOverview').then(module => ({ default: module.CourseOverview })));
// Import CourseContent eagerly since it might be needed for offline course viewing
import { CourseContent } from './CourseContent';
const StudentsPage = lazy(() => import('./StudentsPage'));
const ReportsPage = lazy(() => import('./ReportsPage'));
const DiscussionsPage = lazy(() => import('./DiscussionsPage'));
const DiscussionViewPage = lazy(() => import('./DiscussionViewPage').then(module => ({ default: module.DiscussionViewPage })));
const MessagesPage = lazy(() => import('./MessagesPage'));
const ProfileSettings = lazy(() => import('./ProfileSettings'));

const Dashboard = () => {
  const { user, loading: authLoading } = useAuth();
  const { profile, loading: profileLoading, error: profileError } = useUserProfile();
  const { isAIMode } = useAILMS();
  const { isMaintenanceMode, loading: maintenanceLoading } = useMaintenanceCheck();
  const navigate = useNavigate();
  const location = useLocation();
  const [loadingTimeout, setLoadingTimeout] = useState(false);
  const [debouncedLoading, setDebouncedLoading] = useState(false);
  const loadingTimeoutRef = useRef<NodeJS.Timeout>();
  const debounceTimeoutRef = useRef<NodeJS.Timeout>();

  const resetToDashboard = useCallback(() => {
    navigate('/dashboard');
  }, [navigate]);
  
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth', { replace: true });
    }
  }, [authLoading, user, navigate]);

  // Check for maintenance mode (only for students and teachers)
  // Allow admin, super_user, content_creator, and view_only to bypass maintenance mode
  useEffect(() => {
    const adminPortalRoles = ['admin', 'super_user', 'content_creator', 'view_only'];
    if (!maintenanceLoading && isMaintenanceMode && !adminPortalRoles.includes(profile?.role || '')) {
      // Don't redirect, just show maintenance page
      return;
    }
  }, [maintenanceLoading, isMaintenanceMode, profile?.role]);

  useEffect(() => {
    if (profile) {
      requestNotificationPermission();
    }
  }, [profile]);

  const currentRole = profile?.role as UserRole | undefined;
  
  // Debug logging for role
  useEffect(() => {
    console.log('🔍 Dashboard: Profile state changed');
    console.log('🔍 Dashboard: profile?.role:', profile?.role);
    console.log('🔍 Dashboard: currentRole:', currentRole);
    console.log('🔍 Dashboard: Full profile:', profile);
  }, [profile, currentRole]);
  
  const isLoading = authLoading || (user && profileLoading) || maintenanceLoading;

  // Debounce loading state to prevent rapid re-renders
  useEffect(() => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }
    
    debounceTimeoutRef.current = setTimeout(() => {
      setDebouncedLoading(isLoading);
    }, 150); // 150ms debounce

    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, [isLoading]);

  // Add timeout for loading states
  useEffect(() => {
    if (loadingTimeoutRef.current) {
      clearTimeout(loadingTimeoutRef.current);
    }
    
    if (debouncedLoading) {
      loadingTimeoutRef.current = setTimeout(() => {
        console.warn('Dashboard loading timeout - showing fallback');
        setLoadingTimeout(true);
      }, 10000); // 10 second timeout
    } else {
      setLoadingTimeout(false);
    }

    return () => {
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
      }
    };
  }, [debouncedLoading]);

  // Debug logging
  console.log('Dashboard loading states:', {
    authLoading,
    profileLoading,
    maintenanceLoading,
    isLoading,
    debouncedLoading,
    user: !!user,
    profile: !!profile,
    profileError
  });

  const DashboardContent = () => {
    // Show loading state while data is being fetched
    if (debouncedLoading && !loadingTimeout) {
      return (
        <div className="flex items-center justify-center h-full text-center">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            <p className="text-muted-foreground">Loading dashboard...</p>
          </div>
        </div>
      );
    }

    // Show timeout fallback if loading takes too long
    if (loadingTimeout && isLoading) {
      return (
        <div className="flex items-center justify-center h-full text-center">
          <div className="flex flex-col items-center gap-4">
            <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-foreground">Loading is taking longer than expected</h3>
              <p className="text-muted-foreground mt-2">Please check your connection and try refreshing the page.</p>
              <button 
                onClick={() => window.location.reload()} 
                className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
              >
                Refresh Page
              </button>
            </div>
          </div>
        </div>
      );
    }

    // Check for maintenance mode (only for students and teachers)
    // Allow admin portal users (admin, super_user, content_creator, view_only) to bypass maintenance mode
    const adminPortalRoles = ['admin', 'super_user', 'content_creator', 'view_only'];
    if (!maintenanceLoading && isMaintenanceMode && !adminPortalRoles.includes(profile?.role || '')) {
      console.log('🚧 Dashboard: Maintenance mode active, blocking access for role:', profile?.role);
      return <MaintenancePage />;
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
      if (isAIMode) {
        switch (finalRole) {
          case 'student': return <AIStudentDashboard userProfile={finalProfile} />;
          case 'teacher': return <AITeacherDashboard userProfile={finalProfile} />;
          case 'principal': return <PrincipalDashboard userProfile={finalProfile} />;
          case 'admin': return <AIAdminDashboard userProfile={finalProfile} />;
          case 'content_creator': return <AIAdminDashboard userProfile={finalProfile} />;
          case 'super_user': return <AIAdminDashboard userProfile={finalProfile} />;
          case 'view_only': return <AIAdminDashboard userProfile={finalProfile} />;
          default: return <RolePlaceholder title="AI Dashboard" description="Welcome to AI Mode" icon={BookOpen} />;
        }
      } else {
      switch (finalRole) {
        case 'student': return <StudentDashboard userProfile={finalProfile} />;
        case 'teacher': return <TeacherDashboard userProfile={finalProfile} />;
        case 'principal': return <PrincipalDashboard userProfile={finalProfile} />;
        case 'admin': return <AdminDashboard userProfile={finalProfile} />;
        case 'content_creator': return <AdminDashboard userProfile={finalProfile} />;
        case 'super_user': return <AdminDashboard userProfile={finalProfile} />;
        case 'view_only': return <AdminDashboard userProfile={finalProfile} />;
        default: return <RolePlaceholder title="Dashboard" description="Welcome" icon={BookOpen} />;
        }
    }
  };

  return (
    <div className="p-0 sm:p-0 lg:p-0 h-full">
      {finalRole === 'student' ? (
        <OfflineRouteGuard 
          userRole={finalRole}
          onRedirect={(from, to, reason) => {
            console.log(`🔄 Student redirected from ${from} to ${to} due to ${reason}`);
          }}
        >
          <OfflineAwareSuspense 
            allowOfflineRoutes={['/dashboard/offline-learning', '/dashboard/courses/:id/content']}
            fallback={
              <div className="flex items-center justify-center h-full">
                <div className="flex flex-col items-center gap-4">
                  <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                  <p className="text-muted-foreground">Loading page...</p>
                </div>
              </div>
            }
          >
            <Routes>
              <Route path="/" element={<DashboardOverview />} />
              <Route path="/profile-settings" element={<ProfileSettings />} />
              <Route path="/courses/:id" element={<CourseOverview />} />
              <Route path="/courses/:id/content" element={<CourseContent key={location.pathname} />} />
              
              {isAIMode ? (
                <>
                  <Route path="/ai-learn" element={<AIStudentLearn />} />
                  <Route path="/ai-practice" element={<AIStudentPractice />} />
                  <Route path="/ai-progress" element={<AIStudentProgress />} />
                  <Route path="/practice/stage-0" element={<StageZero />} />
                  <Route path="/practice/stage-0/lesson/:lessonId" element={<LessonDetail />} />
                  <Route path="/practice/stage-1" element={<StageOne />} />
                  <Route path="/practice/stage-1/repeat-after-me" element={<RepeatAfterMe />} />
                  <Route path="/practice/stage-1/quick-response" element={<QuickResponse />} />
                  <Route path="/practice/stage-1/listen-and-reply" element={<ListenAndReply />} />
                  <Route path="/practice/stage-2" element={<StageTwo />} />
                  <Route path="/practice/stage-2/daily-routine" element={<DailyRoutine />} />
                  <Route path="/practice/stage-2/quick-answer" element={<QuickAnswer />} />
                  <Route path="/practice/stage-2/roleplay-simulation" element={<RoleplaySimulation />} />
                  <Route path="/practice/stage-3" element={<StageThree />} />
                  <Route path="/practice/stage-3/storytelling" element={<StorytellingPractice />} />
                  <Route path="/practice/stage-3/group-dialogue" element={<GroupDialogue />} />
                  <Route path="/practice/stage-3/problem-solving" element={<ProblemSolvingSimulations />} />
                  <Route path="/practice/stage-4" element={<StageFour />} />
                  <Route path="/practice/stage-4/abstract-topic" element={<AbstractTopicMonologue />} />
                  <Route path="/practice/stage-4/mock-interview" element={<MockInterviewPractice />} />
                  <Route path="/practice/stage-4/news-summary" element={<NewsSummaryChallenge />} />
                  <Route path="/practice/stage-5" element={<StageFive />} />
                  <Route path="/practice/stage-5/critical-thinking" element={<CriticalThinkingDialogues />} />
                  <Route path="/practice/stage-5/academic-presentations" element={<AcademicPresentations />} />
                  <Route path="/practice/stage-5/indepth-interview" element={<InDepthInterviewSimulation />} />
                  <Route path="/practice/stage-6" element={<StageSix />} />
                  <Route path="/practice/stage-6/spontaneous-speech" element={<AIGuidedSpontaneousSpeech />} />
                  <Route path="/practice/stage-6/sensitive-scenario" element={<SensitiveScenarioRoleplay />} />
                  <Route path="/practice/stage-6/opinion-builder" element={<CriticalOpinionBuilder />} />
                </>
              ) : (
                <>
                  <Route path="/courses" element={<StudentCourses userProfile={finalProfile} />} />
                  <Route path="/assignments" element={<StudentAssignments userProfile={finalProfile} />} />
                  <Route path="/progress" element={<StudentProgress userProfile={finalProfile} />} />
                  <Route path="/messages" element={<MessagesPage />} />
                  <Route path="/discussion" element={<DiscussionsPage />} />
                  <Route path="/discussion/:id" element={<DiscussionViewPage />} />
                  <Route path="/meetings" element={<StudentMeetings userProfile={finalProfile} />} />
                  <Route path="/offline-learning" element={<StudentOfflineLearning userProfile={finalProfile} />} />
                </>
              )}
            </Routes>
          </OfflineAwareSuspense>
        </OfflineRouteGuard>
      ) : (
        <OfflineAwareSuspense 
          allowOfflineRoutes={[]} // Teachers/admins have no offline restrictions
          fallback={
            <div className="flex items-center justify-center h-full">
              <div className="flex flex-col items-center gap-4">
                <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                <p className="text-muted-foreground">Loading page...</p>
              </div>
            </div>
          }
        >
          <Routes>
            {/* Common routes for all users */}
            <Route path="/" element={<DashboardOverview />} />
            <Route path="/profile-settings" element={<ProfileSettings />} />
            <Route path="/courses/:id" element={<CourseOverview />} />
            <Route path="/courses/:id/content" element={<CourseContent key={location.pathname} />} />
            
            {/* Teacher routes */}
            {finalRole === 'teacher' && (
                    <>
                      {isAIMode ? (
                        <>
                          <Route path="/ai-learn" element={<AIStudentLearn />} />
                          <Route path="/ai-practice" element={<AITeacherPractice />} />
                          <Route path="/ai-progress" element={<AITeacherProgress />} />
                          <Route path="/practice/stage-0" element={<StageZero />} />
                          <Route path="/practice/stage-0/lesson/:lessonId" element={<LessonDetail />} />
                          <Route path="/practice/stage-1" element={<StageOne />} />
                          <Route path="/practice/stage-1/repeat-after-me" element={<RepeatAfterMe />} />
                          <Route path="/practice/stage-1/quick-response" element={<QuickResponse />} />
                          <Route path="/practice/stage-1/listen-and-reply" element={<ListenAndReply />} />
                          <Route path="/practice/stage-2" element={<StageTwo />} />
                          <Route path="/practice/stage-2/daily-routine" element={<DailyRoutine />} />
                          <Route path="/practice/stage-2/quick-answer" element={<QuickAnswer />} />
                          <Route path="/practice/stage-2/roleplay-simulation" element={<RoleplaySimulation />} />
                          <Route path="/practice/stage-3" element={<StageThree />} />
                          <Route path="/practice/stage-3/storytelling" element={<StorytellingPractice />} />
                          <Route path="/practice/stage-3/group-dialogue" element={<GroupDialogue />} />
                          <Route path="/practice/stage-3/problem-solving" element={<ProblemSolvingSimulations />} />
                          <Route path="/practice/stage-4" element={<StageFour />} />
                          <Route path="/practice/stage-4/abstract-topic" element={<AbstractTopicMonologue />} />
                          <Route path="/practice/stage-4/mock-interview" element={<MockInterviewPractice />} />
                          <Route path="/practice/stage-4/news-summary" element={<NewsSummaryChallenge />} />
                          <Route path="/practice/stage-5" element={<StageFive />} />
                          <Route path="/practice/stage-5/critical-thinking" element={<CriticalThinkingDialogues />} />
                          <Route path="/practice/stage-5/academic-presentations" element={<AcademicPresentations />} />
                          <Route path="/practice/stage-5/indepth-interview" element={<InDepthInterviewSimulation />} />
                          <Route path="/practice/stage-6" element={<StageSix />} />
                          <Route path="/practice/stage-6/spontaneous-speech" element={<AIGuidedSpontaneousSpeech />} />
                          <Route path="/practice/stage-6/sensitive-scenario" element={<SensitiveScenarioRoleplay />} />
                          <Route path="/practice/stage-6/opinion-builder" element={<CriticalOpinionBuilder />} />
                        </>
                                            ) : (
                        <>
                          <Route path="/courses" element={<CourseManagement />} />
                          <Route path="/courses/builder/new" element={
                            <RoleGuard allowedRoles={['admin', 'super_user', 'content_creator']}>
                              <CourseBuilder />
                            </RoleGuard>
                          } />
                          <Route path="/courses/builder/:courseId" element={
                            <RoleGuard allowedRoles={['admin', 'super_user', 'content_creator']}>
                              <CourseBuilder />
                            </RoleGuard>
                          } />
                          <Route path="/students" element={<StudentsPage />} />
                          <Route path="/classes" element={<ClassManagement />} />
                          <Route path="/reports" element={<ReportsPage />} />
                          <Route path="/grade-assignments" element={<GradeAssignments />} />
                          <Route path="/grade-assignments/:id" element={<AssignmentSubmissions />} />
                          <Route path="/grade-assignments/:assignmentId/student/:studentId" element={<StudentSubmissionDetail />} />
                          <Route path="/messages" element={<MessagesPage />} />
                          <Route path="/discussion" element={<DiscussionsPage />} />
                          <Route path="/discussion/:id" element={<DiscussionViewPage />} />
                          <Route path="/meetings" element={<TeacherMeetings userProfile={finalProfile} />} />
                        </>
                      )}
                    </>
                  )}
          {/* Dashboard Preview Routes - For Design Review */}
          <Route path="/preview/principal" element={<PrincipalDashboard userProfile={finalProfile} />} />
          <Route path="/preview/school-officer" element={<SchoolOfficerDashboard userProfile={finalProfile} />} />
          <Route path="/preview/program-manager" element={<ProgramManagerDashboard userProfile={finalProfile} />} />
          <Route path="/preview/ece-observer" element={<ECEObserverDashboard userProfile={finalProfile} />} />
          
          {(finalRole === 'admin' || finalRole === 'super_user' || finalRole === 'content_creator' || finalRole === 'view_only') && (
                    <>
                      {isAIMode ? (
                        <>

                          <Route path="/ai-learn" element={<AIStudentLearn />} />
                          <Route path="/ai-practice" element={<AIAdminPractice />} />
                          <Route path="/ai-reports" element={<ReportsAnalytics />} />
                          <Route path="/ai-tutor-settings" element={<AITutorSettings userProfile={finalProfile} />} />
                          <Route path="/ai-safety-ethics" element={<AISafetyEthicsSettings userProfile={finalProfile} />} />
                          <Route path="/admin-settings" element={<AdminSecurity />} />
                          <Route path="/test-admin-settings" element={<AdminSecurity />} />
                          {/* Practice Stage Routes for Admin Viewing */}
                          <Route path="/practice/stage-0" element={<StageZero />} />
                          <Route path="/practice/stage-0/lesson/:lessonId" element={<LessonDetail />} />
                          <Route path="/practice/stage-1" element={<StageOne />} />
                          <Route path="/practice/stage-1/repeat-after-me" element={<RepeatAfterMe />} />
                          <Route path="/practice/stage-1/quick-response" element={<QuickResponse />} />
                          <Route path="/practice/stage-1/listen-and-reply" element={<ListenAndReply />} />
                          <Route path="/practice/stage-2" element={<StageTwo />} />
                          <Route path="/practice/stage-2/daily-routine" element={<DailyRoutine />} />
                          <Route path="/practice/stage-2/quick-answer" element={<QuickAnswer />} />
                          <Route path="/practice/stage-2/roleplay-simulation" element={<RoleplaySimulation />} />
                          <Route path="/practice/stage-3" element={<StageThree />} />
                          <Route path="/practice/stage-3/storytelling" element={<StorytellingPractice />} />
                          <Route path="/practice/stage-3/group-dialogue" element={<GroupDialogue />} />
                          <Route path="/practice/stage-3/problem-solving" element={<ProblemSolvingSimulations />} />
                          <Route path="/practice/stage-4" element={<StageFour />} />
                          <Route path="/practice/stage-4/abstract-topic" element={<AbstractTopicMonologue />} />
                          <Route path="/practice/stage-4/mock-interview" element={<MockInterviewPractice />} />
                          <Route path="/practice/stage-4/news-summary" element={<NewsSummaryChallenge />} />
                          <Route path="/practice/stage-5" element={<StageFive />} />
                          <Route path="/practice/stage-5/critical-thinking" element={<CriticalThinkingDialogues />} />
                          <Route path="/practice/stage-5/academic-presentations" element={<AcademicPresentations />} />
                          <Route path="/practice/stage-5/indepth-interview" element={<InDepthInterviewSimulation />} />
                          <Route path="/practice/stage-6" element={<StageSix />} />
                          <Route path="/practice/stage-6/spontaneous-speech" element={<AIGuidedSpontaneousSpeech />} />
                          <Route path="/practice/stage-6/sensitive-scenario" element={<SensitiveScenarioRoleplay />} />
                          <Route path="/practice/stage-6/opinion-builder" element={<CriticalOpinionBuilder />} />
                        </>
                      ) : (
                        <>
                          <Route path="/users" element={<UsersManagement />} />
                          <Route path="/classes" element={<ClassManagement />} />
                          <Route path="/courses" element={<CoursesAndCategories />} />
                          <Route path="/course-categories" element={<CourseCategories />} />
                          <Route path="/orders" element={<OrdersManagement />} />
                          <Route path="/courses/builder/new" element={<CourseBuilder />} />
                          <Route path="/courses/builder/:courseId" element={<CourseBuilder />} />
                          <Route path="/reports" element={<ReportsOverview />} />
                          <Route path="/observation-reports" element={<ObservationReports />} />
                          <Route path="/messages" element={<MessagesPage />} />
                          <Route path="/discussion" element={<DiscussionsPage />} />
                          <Route path="/discussion/:id" element={<DiscussionViewPage />} />
                          <Route path="/meetings" element={<TeacherMeetings userProfile={finalProfile} />} />
                          <Route path="/grade-assignments" element={<GradeAssignments />} />
                          <Route path="/grade-assignments/:id" element={<AssignmentSubmissions />} />
                          <Route path="/grade-assignments/:assignmentId/student/:studentId" element={<StudentSubmissionDetail />} />
                          <Route path="/admin-settings" element={<AdminSecurity />} />
                          <Route path="/apex-admin" element={<APEXAdmin />} />
                          <Route path="/iris" element={<IRISv2 />} />
                          <Route path="/test-admin-settings" element={<AdminSecurity />} />
                          <Route path="/security" element={<AdminSecurity />} />
                          <Route path="/integration-apis" element={<IntegrationAPIs userProfile={finalProfile} />} />
                          <Route path="/advanced-tools" element={<AdvancedTools />} />
                          <Route path="/executive-dashboard" element={<ExecutiveDashboard />} />
                          <Route path="/policy-management" element={<PolicyManagement />} />
                          <Route path="/inventory-management" element={<InventoryManagement />} />
                          <Route path="/predictive-intervention" element={<PredictiveIntervention />} />
                          <Route path="/ai-content-development" element={<AIContentDevelopment />} />
                          <Route path="/calendar-management" element={<CalendarManagement />} />
                        </>
                      )}
                    </>
                  )}
          </Routes>
        </OfflineAwareSuspense>
      )}
    </div>
  );
  };

  return (
    <SidebarProvider>
      <div className="bg-background w-full h-screen">
        <DashboardHeader onToggle={resetToDashboard} />
        <div className="pt-20 h-full">
            <DashboardSidebar userRole={currentRole}>
                <DashboardContent />
            </DashboardSidebar>
        </div>
        <APEX />
      </div>
    </SidebarProvider>
  );
};

export default Dashboard;
