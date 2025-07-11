
import { Home, BookOpen, FileQuestion, TrendingUp, Users, Settings, BarChart3, GraduationCap, ClipboardList, Award, UserCheck, Database, Shield, MessageSquare, Link, Eye, MessageCircle } from 'lucide-react';

export type UserRole = 'student' | 'teacher' | 'admin';

export interface NavigationItem {
  title: string;
  path: string;
  icon: any;
  badge?: string;
}

export interface NavigationCategory {
  title: string;
  items: NavigationItem[];
}

export const getRoleNavigation = (role?: UserRole): NavigationItem[] => {
  if (!role) {
    return [];
  }
  
  switch (role) {
    case 'student':
      return [
        { title: 'Overview', path: '/dashboard', icon: Home },
        { title: 'My Courses', path: '/dashboard/courses', icon: BookOpen },
        { title: 'Assignments', path: '/dashboard/assignments', icon: ClipboardList },
        { title: 'Progress', path: '/dashboard/progress', icon: TrendingUp },
      ];
    
    case 'teacher':
      return [
        { title: 'Overview', path: '/dashboard', icon: Home },
        { title: 'My Courses', path: '/dashboard/courses', icon: BookOpen },
        { title: 'Students', path: '/dashboard/students', icon: Users },
        { title: 'Reports', path: '/dashboard/reports', icon: FileQuestion },
        { title: 'Messages', path: '/dashboard/messages', icon: MessageSquare },
        { title: 'Discussion', path: '/dashboard/discussion', icon: MessageCircle },
      ];
    
    case 'admin':
      return [
        { title: 'Overview', path: '/dashboard', icon: Home },
        { title: 'Users', path: '/dashboard/users', icon: Users },
        { title: 'Courses', path: '/dashboard/courses', icon: BookOpen },
        { title: 'Reports', path: '/dashboard/reports', icon: FileQuestion },
        { title: 'Observation Reports', path: '/dashboard/observation-reports', icon: Eye },
        { title: 'Settings', path: '/dashboard/settings', icon: Settings },
        { title: 'Security', path: '/dashboard/security', icon: Shield },
        { title: 'Discussion', path: '/dashboard/discussion', icon: MessageSquare },
        { title: 'Grade Assignments', path: '/dashboard/grade-assignments', icon: Award },
      ];
    
    default:
      return [
        { title: 'Overview', path: '/dashboard', icon: Home },
      ];
  }
};

export const getCategorizedNavigation = (role?: UserRole): NavigationCategory[] => {
  if (!role) {
    return [];
  }
  
  switch (role) {
    case 'student':
      return [
        {
          title: 'LEARNING',
          items: [
            { title: 'Overview', path: '/dashboard', icon: Home },
            { title: 'My Courses', path: '/dashboard/courses', icon: BookOpen },
            { title: 'Assignments', path: '/dashboard/assignments', icon: ClipboardList },
          ]
        },
        {
          title: 'PROGRESS',
          items: [
            { title: 'Progress', path: '/dashboard/progress', icon: TrendingUp },
          ]
        }
      ];
    
    case 'teacher':
      return [
        {
          title: 'MAIN',
          items: [
            { title: 'Overview', path: '/dashboard', icon: Home },
            { title: 'My Courses', path: '/dashboard/courses', icon: BookOpen },
          ]
        },
        {
          title: 'CLASSROOM',
          items: [
            { title: 'Students', path: '/dashboard/students', icon: Users },
            { title: 'Reports', path: '/dashboard/reports', icon: FileQuestion },
          ]
        },
        {
          title: 'COMMUNICATION',
          items: [
            { title: 'Messages', path: '/dashboard/messages', icon: MessageSquare },
            { title: 'Discussion', path: '/dashboard/discussion', icon: MessageCircle },
          ]
        }
      ];
    
    case 'admin':
      return [
        {
          title: 'MAIN',
          items: [
            { title: 'Overview', path: '/dashboard', icon: Home },
          ]
        },
        {
          title: 'MANAGEMENT',
          items: [
            { title: 'Users', path: '/dashboard/users', icon: Users },
            { title: 'Courses', path: '/dashboard/courses', icon: BookOpen },
            { title: 'Discussion', path: '/dashboard/discussion', icon: MessageSquare },
            { title: 'Grade Assignments', path: '/dashboard/grade-assignments', icon: Award },
          ]
        },
        {
          title: 'ANALYTICS',
          items: [
            { title: 'Reports', path: '/dashboard/reports', icon: FileQuestion },
            { title: 'Observation Reports', path: '/dashboard/observation-reports', icon: Eye },
          ]
        },
        {
          title: 'SYSTEM',
          items: [
            { title: 'Settings', path: '/dashboard/settings', icon: Settings },
            { title: 'Security', path: '/dashboard/security', icon: Shield },
          ]
        }
      ];
    
    default:
      return [
        {
          title: 'MAIN',
          items: [
            { title: 'Overview', path: '/dashboard', icon: Home },
          ]
        }
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
