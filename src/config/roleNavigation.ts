
import { Home, BookOpen, FileQuestion, TrendingUp, Users, Settings, BarChart3, GraduationCap, ClipboardList, Award, UserCheck, Database } from 'lucide-react';

export type UserRole = 'student' | 'teacher' | 'admin';

export interface NavigationItem {
  title: string;
  path: string;
  icon: any;
}

export const getRoleNavigation = (role: UserRole): NavigationItem[] => {
  switch (role) {
    case 'student':
      return [
        { title: 'Overview', path: '/dashboard', icon: Home },
        { title: 'My Courses', path: '/dashboard/courses', icon: BookOpen },
        { title: 'Assignments', path: '/dashboard/assignments', icon: ClipboardList },
        { title: 'Progress', path: '/dashboard/progress', icon: TrendingUp },
        { title: 'AI Tutor', path: '/dashboard/ai-tutor', icon: GraduationCap },
      ];
    
    case 'teacher':
      return [
        { title: 'Overview', path: '/dashboard', icon: Home },
        { title: 'My Classes', path: '/dashboard/classes', icon: Users },
        { title: 'Course Management', path: '/dashboard/courses', icon: BookOpen },
        { title: 'Student Progress', path: '/dashboard/student-progress', icon: TrendingUp },
        { title: 'Assignments', path: '/dashboard/assignments', icon: ClipboardList },
        { title: 'Resources', path: '/dashboard/resources', icon: Award },
      ];
    
    case 'admin':
      return [
        { title: 'Overview', path: '/dashboard', icon: Home },
        { title: 'User Management', path: '/dashboard/users', icon: Users },
        { title: 'Course Administration', path: '/dashboard/courses', icon: BookOpen },
        { title: 'System Analytics', path: '/dashboard/analytics', icon: BarChart3 },
        { title: 'Reports', path: '/dashboard/reports', icon: FileQuestion },
        { title: 'Settings', path: '/dashboard/settings', icon: Settings },
      ];
    
    default:
      return [
        { title: 'Overview', path: '/dashboard', icon: Home },
      ];
  }
};

export const getRoleDisplayName = (role: UserRole): string => {
  switch (role) {
    case 'student':
      return 'Student';
    case 'teacher':
      return 'Teacher';
    case 'admin':
      return 'Admin';
    default:
      return 'User';
  }
};
