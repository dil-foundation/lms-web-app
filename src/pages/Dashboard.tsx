
import { Routes, Route } from 'react-router-dom';
import { Header } from '@/components/Header';
import { DashboardSidebar } from '@/components/DashboardSidebar';
import { EmptyState } from '@/components/EmptyState';
import { Home, BookOpen, FileQuestion, TrendingUp } from 'lucide-react';

const DashboardOverview = () => (
  <EmptyState
    title="Dashboard Overview"
    description="Your learning dashboard will appear here. Track your progress, view recent activities, and access quick actions."
    icon={<Home className="h-6 w-6" />}
  />
);

const DashboardCourses = () => (
  <EmptyState
    title="Your Courses"
    description="Explore and manage your enrolled courses. Track completion status and access course materials."
    icon={<BookOpen className="h-6 w-6" />}
  />
);

const DashboardQuizzes = () => (
  <EmptyState
    title="Quiz Center"
    description="Take quizzes to test your knowledge and track your performance across different topics."
    icon={<FileQuestion className="h-6 w-6" />}
  />
);

const DashboardProgress = () => (
  <EmptyState
    title="Learning Progress"
    description="Monitor your learning journey with detailed analytics, achievements, and performance metrics."
    icon={<TrendingUp className="h-6 w-6" />}
  />
);

const Dashboard = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <DashboardSidebar>
        <Routes>
          <Route path="/" element={<DashboardOverview />} />
          <Route path="/courses" element={<DashboardCourses />} />
          <Route path="/quizzes" element={<DashboardQuizzes />} />
          <Route path="/progress" element={<DashboardProgress />} />
        </Routes>
      </DashboardSidebar>
    </div>
  );
};

export default Dashboard;
