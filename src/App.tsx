import React, { Suspense, lazy, useEffect, useState } from "react";
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
import { SupabaseMFARequirement } from "@/components/auth/SupabaseMFARequirement";
import { MFAProtectedRoute } from "@/components/auth/MFAProtectedRoute";
import ErrorBoundary from "@/components/ErrorBoundary";
import { setupOfflineRequestHandler } from "@/utils/offlineRequestHandler";
import { offlineStateManager } from "@/utils/offlineStateManager";
import { registerServiceWorker } from "@/utils/serviceWorker";
import { ServiceWorkerUpdater } from "@/components/ServiceWorkerUpdater";
import { initOfflineDatabase } from "@/services/offlineDatabase";


// Component to handle session timeout and activity tracking
const SessionTimeoutTracker = () => {
  useSessionTimeout(); // Just initialize the session timeout tracking

  return null; // No UI needed since we removed the warning dialog
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
  const [swRegistration, setSwRegistration] = useState<ServiceWorkerRegistration | undefined>();

  // Setup global offline request handler and state manager on app initialization
  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Setup offline infrastructure
        setupOfflineRequestHandler();
        offlineStateManager.setup();
        
        // Initialize offline database
        try {
          await initOfflineDatabase();
          console.log('📦 App: Offline database initialized successfully');
        } catch (dbError) {
          console.error('❌ App: Failed to initialize offline database:', dbError);
          // Continue with app initialization even if database fails
        }
        
        // Register service worker for app asset caching
        registerServiceWorker({
          onSuccess: (registration) => {
            console.log('🎯 App: Service worker registered successfully - app assets cached for offline use');
            setSwRegistration(registration);
          },
          onUpdate: (registration) => {
            console.log('🔄 App: New service worker available - app will update on next reload');
            setSwRegistration(registration);
          },
          onOfflineReady: () => {
            console.log('📱 App: App is ready for offline use');
          }
        });
      } catch (error) {
        console.error('❌ App: Failed to initialize offline features:', error);
      }
    };

    initializeApp();
  }, []);

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
          
          {/* Service Worker Update Notification */}
          <ServiceWorkerUpdater registration={swRegistration} />
          
        </TooltipProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
};

const App = () => {
  return <AppContent />;
};

export default App;
