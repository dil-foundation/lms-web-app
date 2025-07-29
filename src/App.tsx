import { BrowserRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import Home from "./pages/Home";
import Dashboard from "./pages/Dashboard";
import CourseBuilder from "./pages/CourseBuilder";
import NotFound from "./pages/NotFound";
import ForgotPassword from "./pages/ForgotPassword";
import RoleSelection from './pages/RoleSelection';
import StudentAuth from './pages/StudentAuth';
import TeacherAuth from './pages/TeacherAuth';
import AdminAuth from './pages/AdminAuth';
import ProfileSettings from './pages/ProfileSettings';
import SecureObserverFormPage from './pages/SecureObserverFormPage';
import { AuthProvider } from "@/contexts/AuthContext";
import { AILMSProvider } from "@/contexts/AILMSContext";
import { ObservationReportsProvider } from "@/contexts/ObservationReportsContext";
import { SecureLinksProvider } from "@/contexts/SecureLinksContext";
import ScrollToTop from "@/components/ScrollToTop";

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
              </SecureLinksProvider>
            </ObservationReportsProvider>
          </AILMSProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
