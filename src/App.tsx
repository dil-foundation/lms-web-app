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
import ScrollToTop from "@/components/ScrollToTop";

const Home = lazy(() => import("./pages/Home"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const CourseBuilder = lazy(() => import("./pages/CourseBuilder"));
const NotFound = lazy(() => import("./pages/NotFound"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const RoleSelection = lazy(() => import('./pages/RoleSelection'));
const StudentAuth = lazy(() => import('./pages/StudentAuth'));
const TeacherAuth = lazy(() => import('./pages/TeacherAuth'));
const AdminAuth = lazy(() => import('./pages/AdminAuth'));
const ProfileSettings = lazy(() => import('./pages/ProfileSettings'));
const SecureObserverFormPage = lazy(() => import('./pages/SecureObserverFormPage'));
// Layout Pages
import HomeLayout2 from './pages/HomeLayout2';
import HomeLayout3 from './pages/HomeLayout3';
import HomeLayout4 from './pages/HomeLayout4';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <ScrollToTop />
        <AuthProvider>
          <AILMSProvider>
            <ObservationReportsProvider>
              <SecureLinksProvider>
                <Suspense fallback={<div>Loading...</div>}>
                  <Routes>
                    <Route path="/" element={<Home />} />
                    <Route path="/home-layout-2" element={<HomeLayout2 />} />
                    <Route path="/home-layout-3" element={<HomeLayout3 />} />
                    <Route path="/home-layout-4" element={<HomeLayout4 />} />
                    <Route path="/auth" element={<RoleSelection />} />
                    <Route path="/auth/student" element={<StudentAuth />} />
                    <Route path="/auth/teacher" element={<TeacherAuth />} />
                    <Route path="/auth/admin" element={<AdminAuth />} />
                    <Route path="/forgot-password" element={<ForgotPassword />} />
                    <Route path="/dashboard/*" element={<Dashboard />} />
                    <Route path="/course-builder/:courseId" element={<CourseBuilder />} />
                    <Route path="/profile-settings" element={<ProfileSettings />} />
                    <Route path="/secure-form/:token" element={<SecureObserverFormPage />} />
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </Suspense>
              </SecureLinksProvider>
            </ObservationReportsProvider>
          </AILMSProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
