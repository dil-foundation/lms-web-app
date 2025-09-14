import React, { Suspense, lazy } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { AuthProvider } from "@/contexts/AuthContext";
import { AILMSProvider } from "@/contexts/AILMSContext";
import { ObservationReportsProvider } from "@/contexts/ObservationReportsContext";
import { SecureLinksProvider } from "@/contexts/SecureLinksContext";
import { NotificationProvider } from "@/contexts/NotificationContext";
import { APEXProvider } from "@/contexts/AIAssistantContext";
import { ViewPreferencesProvider } from "@/contexts/ViewPreferencesContext";
import ScrollToTop from "@/components/ScrollToTop";
import { useSessionTimeout } from "@/hooks/useSessionTimeout";
import { SessionTimeoutWarning } from "@/components/SessionTimeoutWarning";
import { SupabaseMFARequirement } from "@/components/auth/SupabaseMFARequirement";
import { MFAProtectedRoute } from "@/components/auth/MFAProtectedRoute";
import ErrorBoundary from "@/components/ErrorBoundary";


// Component to handle session timeout and activity tracking
const SessionTimeoutTracker = () => {
  const {
    showWarning,
    warningTimeRemaining,
    handleExtendSession,
    handleDismissWarning
  } = useSessionTimeout();



  return (
    <>

      
      <SessionTimeoutWarning
        isVisible={showWarning}
        timeRemaining={warningTimeRemaining}
        onExtendSession={handleExtendSession}
        onDismiss={handleDismissWarning}
      />
    </>
  );
};

const Home = lazy(() => import("./pages/Home"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const CourseBuilder = lazy(() => import("./pages/CourseBuilder"));
const NotFound = lazy(() => import("./pages/NotFound"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const RoleSelection = lazy(() => import('./pages/RoleSelection'));
const StudentAuth = lazy(() => import('./pages/StudentAuth'));
const TeacherAuth = lazy(() => import('./pages/TeacherAuth'));
const AdminAuth = lazy(() => import('./pages/AdminAuth'));
const SecureObserverFormPage = lazy(() => import('./pages/SecureObserverFormPage'));
// Layout Pages
import HomeLayout2 from './pages/HomeLayout2';
import HomeLayout3 from './pages/HomeLayout3';
import HomeLayout4 from './pages/HomeLayout4';
import ProfileSettings from "./pages/ProfileSettings";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
    },
  },
});

const AppContent = () => {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <ScrollToTop />
            <AuthProvider>
              <SessionTimeoutTracker />
              <AILMSProvider>
                <ObservationReportsProvider>
                  <SecureLinksProvider>
                    {/* Temporarily disabled ErrorBoundary to prevent notification service error display */}
                    {/* <ErrorBoundary fallback={
                      <div className="flex items-center justify-center h-screen">
                        <div className="text-center">
                          <h2 className="text-xl font-semibold mb-2">Notification Service Unavailable</h2>
                          <p className="text-muted-foreground">Some features may not work properly, but you can continue using the app.</p>
                        </div>
                      </div>
                    }> */}
                      <NotificationProvider>
                        <ViewPreferencesProvider>
                          <APEXProvider>
                        <Suspense fallback={null}>
                          <Routes>
                      {/* Public routes - no MFA requirement */}
                      <Route path="/" element={<Home />} />
                      <Route path="/home-layout-2" element={<HomeLayout2 />} />
                      <Route path="/home-layout-3" element={<HomeLayout3 />} />
                      <Route path="/home-layout-4" element={<HomeLayout4 />} />
                      <Route path="/auth" element={<RoleSelection />} />
                      <Route path="/auth/student" element={<StudentAuth />} />
                      <Route path="/auth/teacher" element={<TeacherAuth />} />
                      <Route path="/auth/admin" element={<AdminAuth />} />
                      <Route path="/forgot-password" element={<ForgotPassword />} />
                      <Route path="/secure-form/:token" element={<SecureObserverFormPage />} />
                      
                                                {/* Protected routes - with MFA requirement */}
                          <Route path="/dashboard/*" element={
                            <MFAProtectedRoute>
                              <SupabaseMFARequirement>
                                <Dashboard />
                              </SupabaseMFARequirement>
                            </MFAProtectedRoute>
                          } />
                          <Route path="/course-builder/:courseId" element={
                            <MFAProtectedRoute>
                              <SupabaseMFARequirement>
                                <CourseBuilder />
                              </SupabaseMFARequirement>
                            </MFAProtectedRoute>
                          } />
                          <Route path="/profile-settings" element={
                            <MFAProtectedRoute>
                              <SupabaseMFARequirement>
                                <ProfileSettings />
                              </SupabaseMFARequirement>
                            </MFAProtectedRoute>
                          } />
                      <Route path="*" element={<NotFound />} />
                          </Routes>
                        </Suspense>
                          </APEXProvider>
                        </ViewPreferencesProvider>
                      </NotificationProvider>
                    {/* </ErrorBoundary> */}
                  </SecureLinksProvider>
                </ObservationReportsProvider>
              </AILMSProvider>
            </AuthProvider>
          </BrowserRouter>
        </TooltipProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
};

const App = () => {
  return <AppContent />;
};

export default App;
