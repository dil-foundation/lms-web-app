
import { Home, BookOpen, FileQuestion, TrendingUp, Users, Settings, BarChart3, GraduationCap, ClipboardList, Award, UserCheck, Database, Shield, MessageSquare, Link, Eye, MessageCircle, Bot, Brain, Zap, Target, Sparkles, BookCheck, FileText, Cog } from 'lucide-react';

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
          title: 'TEACHING TOOLS',
          items: [
            { title: 'Overview', path: '/dashboard', icon: Bot },
            { title: 'Teaching Assistant', path: '/dashboard/ai-assistant', icon: GraduationCap },
            { title: 'Content Generator', path: '/dashboard/ai-content', icon: FileText },
            { title: 'Lesson Planner', path: '/dashboard/ai-planner', icon: BookOpen },
          ]
        },
        {
          title: 'STUDENT MANAGEMENT',
          items: [
            { title: 'Smart Grading', path: '/dashboard/ai-grading', icon: Award },
            { title: 'Student Insights', path: '/dashboard/ai-insights', icon: Users },
            { title: 'AI Feedback', path: '/dashboard/ai-feedback', icon: MessageSquare },
          ]
        },
        {
          title: 'ANALYTICS',
          items: [
            { title: 'Performance Analytics', path: '/dashboard/ai-performance', icon: BarChart3 },
            { title: 'Progress Tracking', path: '/dashboard/ai-progress', icon: TrendingUp },
          ]
        },
        {
          title: 'EXPERIENCE',
          items: [
            { title: 'Learn', path: '/dashboard/ai-learn', icon: Target },
            { title: 'Practice', path: '/dashboard/ai-practice', icon: Brain },
          ]
        }
      ];
    
    case 'admin':
      return [
        {
          title: 'SYSTEM MANAGEMENT',
          items: [
            { title: 'Overview', path: '/dashboard', icon: Bot },
            { title: 'AI Management', path: '/dashboard/ai-management', icon: Settings },
            { title: 'Model Configuration', path: '/dashboard/ai-models', icon: Cog },
            { title: 'AI Training', path: '/dashboard/ai-training', icon: BookOpen },
          ]
        },
        {
          title: 'ANALYTICS & MONITORING',
          items: [
            { title: 'Platform Analytics', path: '/dashboard/ai-platform-analytics', icon: BarChart3 },
            { title: 'AI Performance', path: '/dashboard/ai-performance-admin', icon: TrendingUp },
            { title: 'Usage Reports', path: '/dashboard/ai-usage', icon: FileText },
          ]
        },
        {
          title: 'SAFETY & COMPLIANCE',
          items: [
            { title: 'Safety & Ethics', path: '/dashboard/ai-safety', icon: Shield },
          ]
        },
        {
          title: 'EXPERIENCE',
          items: [
            { title: 'Learn', path: '/dashboard/ai-learn', icon: Target },
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
