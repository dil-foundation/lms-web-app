import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import React, { useState, useEffect, Suspense, lazy } from 'react';
import { DashboardSidebar } from '@/components/DashboardSidebar';
import { SidebarProvider } from '@/components/ui/sidebar';
import { useAuth } from '@/hooks/useAuth';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useAILMS } from '@/contexts/AILMSContext';
import { BookOpen } from 'lucide-react';
import { type UserRole } from '@/config/roleNavigation';
import { ContentLoader } from '@/components/ContentLoader';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { requestNotificationPermission } from '@/utils/fcm';

const AIStudentLearn = lazy(() => import('@/components/dashboard/AIStudentLearn').then(module => ({ default: module.AIStudentLearn })));
const StudentDashboard = lazy(() => import('@/components/dashboard/StudentDashboard').then(module => ({ default: module.StudentDashboard })));
const StudentCourses = lazy(() => import('@/components/dashboard/StudentCourses').then(module => ({ default: module.StudentCourses })));
const StudentProgress = lazy(() => import('@/components/dashboard/StudentProgress').then(module => ({ default: module.StudentProgress })));
const StudentAssignments = lazy(() => import('@/components/dashboard/StudentAssignments').then(module => ({ default: module.StudentAssignments })));
const TeacherDashboard = lazy(() => import('@/components/dashboard/TeacherDashboard').then(module => ({ default: module.TeacherDashboard })));
const AdminDashboard = lazy(() => import('@/components/dashboard/AdminDashboard').then(module => ({ default: module.AdminDashboard })));
const AIStudentDashboard = lazy(() => import('@/components/dashboard/AIStudentDashboard').then(module => ({ default: module.AIStudentDashboard })));
const AITeacherDashboard = lazy(() => import('@/components/dashboard/AITeacherDashboard').then(module => ({ default: module.AITeacherDashboard })));
const AIAdminDashboard = lazy(() => import('@/components/dashboard/AIAdminDashboard').then(module => ({ default: module.AIAdminDashboard })));
const AIAdminPractice = lazy(() => import('@/components/dashboard/AIAdminPractice').then(module => ({ default: module.AIAdminPractice })));
const AITeacherPractice = lazy(() => import('@/components/dashboard/AITeacherPractice').then(module => ({ default: module.AITeacherPractice })));
const AITeacherProgress = lazy(() => import('@/components/dashboard/AITeacherProgress').then(module => ({ default: module.AITeacherProgress })));
const AIStudentProgress = lazy(() => import('@/components/dashboard/AIStudentProgress').then(module => ({ default: module.AIStudentProgress })));
const AIStudentPractice = lazy(() => import('@/components/dashboard/AIStudentPractice').then(module => ({ default: module.AIStudentPractice })));
const RolePlaceholder = lazy(() => import('@/components/dashboard/RolePlaceholder').then(module => ({ default: module.RolePlaceholder })));
const UsersManagement = lazy(() => import('@/components/admin/UsersManagement').then(module => ({ default: module.UsersManagement })));
const CourseManagement = lazy(() => import('@/components/admin/CourseManagement'));
const ReportsAnalytics = lazy(() => import('@/components/admin/ReportsAnalytics').then(module => ({ default: module.ReportsAnalytics })));

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
const AdminAssessments = lazy(() => import('@/components/admin/AdminAssessments').then(module => ({ default: module.AdminAssessments })));
const AssignmentSubmissions = lazy(() => import('@/components/admin/AssignmentSubmissions').then(module => ({ default: module.AssignmentSubmissions })));
const StudentSubmissionDetail = lazy(() => import('@/components/admin/StudentSubmissionDetail').then(module => ({ default: module.StudentSubmissionDetail })));
const AdminSettings = lazy(() => import('@/components/admin/AdminSettings'));
const AdminSecurity = lazy(() => import('@/components/admin/AdminSecurity'));
const AITutorSettings = lazy(() => import('@/components/admin/AITutorSettings').then(module => ({ default: module.AITutorSettings })));
const AISafetyEthicsSettings = lazy(() => import('@/components/admin/AISafetyEthicsSettings').then(module => ({ default: module.AISafetyEthicsSettings })));
const IntegrationAPIs = lazy(() => import('@/components/admin/IntegrationAPIs').then(module => ({ default: module.IntegrationAPIs })));
const Multitenancy = lazy(() => import('@/components/admin/Multitenancy').then(module => ({ default: module.Multitenancy })));
const OfflineLearning = lazy(() => import('@/components/admin/OfflineLearning').then(module => ({ default: module.OfflineLearning })));
const CourseBuilder = lazy(() => import('./CourseBuilder'));
const CourseOverview = lazy(() => import('./CourseOverview').then(module => ({ default: module.CourseOverview })));
const CourseContent = lazy(() => import('./CourseContent').then(module => ({ default: module.CourseContent })));
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
  const navigate = useNavigate();
  const location = useLocation();

  const resetToDashboard = () => {
    navigate('/dashboard');
  };
  
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth', { replace: true });
    }
  }, [authLoading, user, navigate]);

  useEffect(() => {
    if (profile) {
      requestNotificationPermission();
    }
  }, [profile]);

  const currentRole = profile?.role as UserRole | undefined
  ;
  
  // Debug logging
  useEffect(() => {
    // Dashboard component mounted successfully
  }, []);
  
  const displayProfile = profile && currentRole ? {
    ...profile,
    full_name: `${profile.first_name || ''} ${profile.last_name || ''}`.trim(),
    role: currentRole,
  } : null;
  
  const isLoading = authLoading || (user && profileLoading);

  const DashboardContent = () => {
    // Removed loading state to prevent flash

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
          case 'admin': return <AIAdminDashboard userProfile={finalProfile} />;
          default: return <RolePlaceholder title="AI Dashboard" description="Welcome to AI Mode" icon={BookOpen} />;
        }
      } else {
      switch (finalRole) {
        case 'student': return <StudentDashboard userProfile={finalProfile} />;
        case 'teacher': return <TeacherDashboard userProfile={finalProfile} />;
        case 'admin': return <AdminDashboard userProfile={finalProfile} />;
        default: return <RolePlaceholder title="Dashboard" description="Welcome" icon={BookOpen} />;
        }
    }
  };

  return (
    <div className="p-0 sm:p-0 lg:p-0 h-full">
      <Suspense fallback={<div className="flex items-center justify-center h-full"><ContentLoader /></div>}>
        <Routes>
          <Route path="/" element={<DashboardOverview />} />
          <Route path="/profile-settings" element={<ProfileSettings />} />
          <Route path="/courses/:id" element={<CourseOverview />} />
          <Route path="/courses/:id/content" element={<CourseContent key={location.pathname} />} />
          {finalRole === 'student' && (
                    <>
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
                        </>
                      )}
                    </>
                  )}
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
                          <Route path="/courses/builder/:courseId" element={<CourseBuilder />} />
                          <Route path="/students" element={<StudentsPage />} />
                          <Route path="/reports" element={<ReportsPage />} />
                          <Route path="/grade-assignments" element={<GradeAssignments />} />
                          <Route path="/grade-assignments/:id" element={<AssignmentSubmissions />} />
                          <Route path="/grade-assignments/:assignmentId/student/:studentId" element={<StudentSubmissionDetail />} />
                          <Route path="/messages" element={<MessagesPage />} />
                          <Route path="/discussion" element={<DiscussionsPage />} />
                          <Route path="/discussion/:id" element={<DiscussionViewPage />} />
                        </>
                      )}
                    </>
                  )}
          {finalRole === 'admin' && (
                    <>
                      {isAIMode ? (
                        <>

                          <Route path="/ai-learn" element={<AIStudentLearn />} />
                          <Route path="/ai-practice" element={<AIAdminPractice />} />
                          <Route path="/ai-reports" element={<ReportsAnalytics />} />
                          <Route path="/ai-tutor-settings" element={<AITutorSettings userProfile={finalProfile} />} />
                          <Route path="/ai-safety-ethics" element={<AISafetyEthicsSettings userProfile={finalProfile} />} />
                          <Route path="/admin-settings" element={<AdminSettings />} />
                          <Route path="/test-admin-settings" element={<AdminSettings />} />
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
                          <Route path="/courses" element={<CourseManagement />} />
                          <Route path="/courses/builder/:courseId" element={<CourseBuilder />} />
                          <Route path="/reports" element={<ReportsOverview />} />
                          <Route path="/observation-reports" element={<ObservationReports />} />
                          <Route path="/messages" element={<MessagesPage />} />
                          <Route path="/discussion" element={<DiscussionsPage />} />
                          <Route path="/discussion/:id" element={<DiscussionViewPage />} />
                          <Route path="/grade-assignments" element={<AdminAssessments />} />
                          <Route path="/grade-assignments/:id" element={<AssignmentSubmissions />} />
                          <Route path="/grade-assignments/:assignmentId/student/:studentId" element={<StudentSubmissionDetail />} />
                          <Route path="/admin-settings" element={<AdminSettings />} />
                          <Route path="/test-admin-settings" element={<AdminSettings />} />
                          <Route path="/security" element={<AdminSecurity />} />
                          <Route path="/integration-apis" element={<IntegrationAPIs userProfile={finalProfile} />} />
                          <Route path="/multitenancy" element={<Multitenancy userProfile={finalProfile} />} />
                          <Route path="/offline-learning" element={<OfflineLearning userProfile={finalProfile} />} />
                        </>
                      )}
                    </>
                  )}
        </Routes>
      </Suspense>
    </div>
    );
  };

  return (
    <SidebarProvider>
      <div className="bg-background flex flex-col w-full h-screen">
        <DashboardHeader onToggle={resetToDashboard} />
        <div className="flex flex-1 w-full">
            <DashboardSidebar userRole={currentRole} userProfile={displayProfile}>
                <DashboardContent />
            </DashboardSidebar>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default Dashboard;
