
import { Home, BookOpen, FileQuestion, TrendingUp, Users, Settings, BarChart3, GraduationCap, ClipboardList, Award, UserCheck, Database, Shield, MessageSquare, Link, Eye, MessageCircle, Bot, Brain, Zap, Target, Sparkles, BookCheck } from 'lucide-react';

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
        { title: 'Assessments', path: '/dashboard/grade-assignments', icon: Award },
      ];
    
    default:
      return [
        { title: 'Overview', path: '/dashboard', icon: Home },
      ];
  }
};

export const getCategorizedNavigation = (role?: UserRole, isAIMode?: boolean): NavigationCategory[] => {
  if (!role) {
    return [];
  }
  
  // AI Mode Navigation
  if (isAIMode) {
    return getAICategorizedNavigation(role);
  }
  
  // LMS Mode Navigation (existing)
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
        },
        {
          title: 'COMMUNICATION',
          items: [
            { title: 'Messages', path: '/dashboard/messages', icon: MessageSquare },
            { title: 'Discussions', path: '/dashboard/discussion', icon: MessageCircle },
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
            { title: 'Assessments', path: '/dashboard/grade-assignments', icon: Award },
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
            { title: 'Messages', path: '/dashboard/messages', icon: MessageSquare },
            { title: 'Discussion', path: '/dashboard/discussion', icon: MessageCircle },
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

export const getAICategorizedNavigation = (role: UserRole): NavigationCategory[] => {
  switch (role) {
    case 'student':
      return [
        {
          title: 'LEARNING',
          items: [
            { title: 'Overview', path: '/dashboard', icon: Bot },
            { title: 'Learn', path: '/dashboard/ai-learn', icon: BookOpen },
          ]
        },
        {
          title: 'ASSESSMENT',
          items: [
            { title: 'Practice', path: '/dashboard/ai-practice', icon: Brain },
            { title: 'Progress', path: '/dashboard/ai-progress', icon: TrendingUp },
          ]
        }
      ];
    
    case 'teacher':
      return [
        {
          title: 'LEARNING',
          items: [
            { title: 'Overview', path: '/dashboard', icon: Bot },
            { title: 'Learn', path: '/dashboard/ai-learn', icon: BookOpen },
          ]
        },
        {
          title: 'ASSESSMENT',
          items: [
            { title: 'Practice', path: '/dashboard/ai-practice', icon: Brain },
            { title: 'Progress', path: '/dashboard/ai-progress', icon: TrendingUp },
          ]
        }
      ];
    
    case 'admin':
      return [
        {
          title: 'LEARNING',
          items: [
            { title: 'Overview', path: '/dashboard', icon: Bot },
            { title: 'Learn', path: '/dashboard/ai-learn', icon: BookOpen },
          ]
        },
        {
          title: 'ASSESSMENT',
          items: [
            { title: 'Practice', path: '/dashboard/ai-practice', icon: Brain },
            { title: 'Progress', path: '/dashboard/ai-progress', icon: TrendingUp },
          ]
        }
      ];
    
    default:
      return [
        {
          title: 'AI MAIN',
          items: [
            { title: 'AI Dashboard', path: '/dashboard', icon: Bot },
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
