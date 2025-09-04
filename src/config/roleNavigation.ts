
import { Home, BookOpen, FileQuestion, TrendingUp, Users, Settings, BarChart3, GraduationCap, ClipboardList, Award, UserCheck, Database, Shield, MessageSquare, Link, Eye, MessageCircle, Bot, Brain, Zap, Target, Sparkles, BookCheck, FileText, Cog, Settings2, ShieldCheck, Plug, Building2, Download, MessageCircle as AIAssistant } from 'lucide-react';

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
            { title: 'IRIS', path: '/dashboard/iris', icon: Bot },
          ]
        },
        {
          title: 'MANAGEMENT',
          items: [
            { title: 'Users', path: '/dashboard/users', icon: Users },
            { title: 'Courses', path: '/dashboard/courses', icon: BookOpen },
            { title: 'Assessments', path: '/dashboard/grade-assignments', icon: Award },
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
            { title: 'Admin Settings', path: '/dashboard/admin-settings', icon: Settings },
            { title: 'APEX Admin', path: '/dashboard/apex-admin', icon: AIAssistant },
            { title: 'Security', path: '/dashboard/security', icon: Shield },
            { title: 'Integration APIs', path: '/dashboard/integration-apis', icon: Plug },
            { title: 'Multitenancy', path: '/dashboard/multitenancy', icon: Building2 },
            { title: 'Offline Learning', path: '/dashboard/offline-learning', icon: Download },
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
          title: 'MAIN',
          items: [
            { title: 'Overview', path: '/dashboard', icon: Bot },
          ]
        },
        {
          title: 'LEARNING',
          items: [
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
          title: 'MAIN',
          items: [
            { title: 'Overview', path: '/dashboard', icon: Bot },
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
    
    case 'admin':
      return [
        {
          title: 'MAIN',
          items: [
            { title: 'Overview', path: '/dashboard', icon: Bot },
          ]
        },
        {
          title: 'EXPERIENCE',
          items: [
            { title: 'Learn', path: '/dashboard/ai-learn', icon: Target },
            { title: 'Practice', path: '/dashboard/ai-practice', icon: Brain },
          ]
        },
        {
          title: 'ANALYTICS',
          items: [
            { title: 'Reports & Analytics', path: '/dashboard/ai-reports', icon: BarChart3 },
          ]
        },
        {
          title: 'SYSTEM MANAGEMENT',
          items: [
            { title: 'Admin Settings', path: '/dashboard/admin-settings', icon: Settings },
            { title: 'AI Tutor Settings', path: '/dashboard/ai-tutor-settings', icon: Settings2 },
            { title: 'AI Safety & Ethics', path: '/dashboard/ai-safety-ethics', icon: ShieldCheck },
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
