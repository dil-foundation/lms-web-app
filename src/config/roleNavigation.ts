
import { Home, BookOpen, FileQuestion, TrendingUp, Users, Settings, BarChart3, GraduationCap, ClipboardList, Award, UserCheck, Database, Shield, MessageSquare, Link, Eye, MessageCircle, Bot, Brain, Zap, Target, Sparkles, BookCheck, FileText, Cog, Settings2, ShieldCheck, Plug, Building2, Download, MapPin, Users2, MessageCircle as AIAssistant, Video, CreditCard, LayoutDashboard, Sparkles as SparklesIcon, Calendar, CalendarDays, Package, TrendingDown, Wrench, FileText as FileTextIcon, AlertCircle } from 'lucide-react';

export type UserRole = 'student' | 'teacher' | 'admin' | 'content_creator' | 'super_user' | 'view_only';

export interface NavigationItem {
  title: string;
  path: string;
  icon: any;
  badge?: string;
  isNew?: boolean;
  isComingSoon?: boolean;
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
        { title: 'Performance Analytics', path: '/dashboard/reports', icon: FileQuestion },
        { title: 'Discussion', path: '/dashboard/discussion', icon: MessageCircle },
      ];
    
    case 'admin':
      return [
        { title: 'Overview', path: '/dashboard', icon: Home },
        { title: 'Users', path: '/dashboard/users', icon: Users },
        { title: 'Courses', path: '/dashboard/courses', icon: BookOpen },
        { title: 'Performance Analytics', path: '/dashboard/reports', icon: FileQuestion },
        { title: 'Observation Reports', path: '/dashboard/observation-reports', icon: Eye },
        { title: 'Discussion', path: '/dashboard/discussion', icon: MessageSquare },
        { title: 'Assessments', path: '/dashboard/grade-assignments', icon: Award },
      ];
    
    case 'content_creator':
      return [
        { title: 'Overview', path: '/dashboard', icon: Home },
        { title: 'Courses', path: '/dashboard/courses', icon: BookOpen },
        { title: 'Course Categories', path: '/dashboard/course-categories', icon: BookCheck },
      ];
    
    case 'super_user':
      return [
        { title: 'Overview', path: '/dashboard', icon: Home },
        { title: 'Users', path: '/dashboard/users', icon: Users },
        { title: 'Courses', path: '/dashboard/courses', icon: BookOpen },
        { title: 'Performance Analytics', path: '/dashboard/reports', icon: FileQuestion },
        { title: 'Observation Reports', path: '/dashboard/observation-reports', icon: Eye },
        { title: 'Discussion', path: '/dashboard/discussion', icon: MessageSquare },
        { title: 'Assessments', path: '/dashboard/grade-assignments', icon: Award },
        { title: 'System Settings', path: '/dashboard/admin-settings', icon: Settings },
      ];
    
    case 'view_only':
      return [
        { title: 'Overview', path: '/dashboard', icon: Home },
        { title: 'Courses', path: '/dashboard/courses', icon: BookOpen },
      ];
    
    default:
      return [
        { title: 'Overview', path: '/dashboard', icon: Home },
      ];
  }
};

export const getCategorizedNavigation = (role?: UserRole, isAIMode?: boolean, isZoomEnabled?: boolean): NavigationCategory[] => {
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
          title: 'DASHBOARD',
          items: [
            { title: 'Overview', path: '/dashboard', icon: Home },
            { title: 'My Courses', path: '/dashboard/courses', icon: BookOpen },
          ]
        },
        {
          title: 'LEARNING',
          items: [
            { title: 'Assignments', path: '/dashboard/assignments', icon: ClipboardList },
            { title: 'Offline Learning', path: '/dashboard/offline-learning', icon: Download },
          ]
        },
        {
          title: 'PROGRESS & ANALYTICS',
          items: [
            { title: 'Progress', path: '/dashboard/progress', icon: TrendingUp },
          ]
        },
        {
          title: 'COMMUNICATION & ENGAGEMENT',
          items: [
            { title: 'Messages', path: '/dashboard/messages', icon: MessageSquare },
            { title: 'Discussion Forums', path: '/dashboard/discussion', icon: MessageCircle },
            ...(isZoomEnabled ? [{ title: 'Meetings', path: '/dashboard/meetings', icon: Video }] : []),
          ]
        }
      ];
    
    case 'teacher':
      return [
        {
          title: 'DASHBOARD',
          items: [
            { title: 'Overview', path: '/dashboard', icon: Home },
            { title: 'My Courses', path: '/dashboard/courses', icon: BookOpen },
          ]
        },
        {
          title: 'CLASSROOM MANAGEMENT',
          items: [
            { title: 'Classes', path: '/dashboard/classes', icon: Calendar },
            { title: 'Students', path: '/dashboard/students', icon: Users },
            { title: 'Assessments', path: '/dashboard/grade-assignments', icon: Award },
          ]
        },
        {
          title: 'ANALYTICS & INSIGHTS',
          items: [
            { title: 'Performance Analytics', path: '/dashboard/reports', icon: FileQuestion },
          ]
        },
        {
          title: 'COMMUNICATION & ENGAGEMENT',
          items: [
            { title: 'Messages', path: '/dashboard/messages', icon: MessageSquare },
            { title: 'Discussion Forums', path: '/dashboard/discussion', icon: MessageCircle },
            ...(isZoomEnabled ? [{ title: 'Meetings', path: '/dashboard/meetings', icon: Video }] : []),
          ]
        }
      ];
    
    case 'admin':
      return [
        {
          title: 'DASHBOARD',
          items: [
            { title: 'Overview', path: '/dashboard', icon: Home },
            { title: 'IRIS', path: '/dashboard/iris', icon: Bot, badge: 'AI Insights' },
          ]
        },
        {
          title: 'ACADEMIC MANAGEMENT',
          items: [
            { title: 'AI Content Development', path: '/dashboard/ai-content-development', icon: SparklesIcon, isNew: true },
            { title: 'Courses & Categories', path: '/dashboard/courses', icon: BookOpen },
            { title: 'Classes', path: '/dashboard/classes', icon: Calendar },
            { title: 'Calendar Management', path: '/dashboard/calendar-management', icon: CalendarDays, isComingSoon: true },
            { title: 'Users & Permissions', path: '/dashboard/users', icon: Users },
            { title: 'Assessments', path: '/dashboard/grade-assignments', icon: Award },
          ]
        },
        {
          title: 'COMMUNICATION & ENGAGEMENT',
          items: [
            { title: 'Messages', path: '/dashboard/messages', icon: MessageSquare },
            { title: 'Discussion Forums', path: '/dashboard/discussion', icon: MessageCircle },
            ...(isZoomEnabled ? [{ title: 'Meetings', path: '/dashboard/meetings', icon: Video }] : []),
          ]
        },
        {
          title: 'BUSINESS OPERATIONS',
          items: [
            { title: 'Orders & Enrollment', path: '/dashboard/orders', icon: CreditCard },
            { title: 'Inventory Management', path: '/dashboard/inventory-management', icon: Package, isComingSoon: true },
          ]
        },
        {
          title: 'ANALYTICS & INSIGHTS',
          items: [
            { title: 'Performance Analytics', path: '/dashboard/reports', icon: FileQuestion },
            { title: 'Predictive Intervention System', path: '/dashboard/predictive-intervention', icon: TrendingDown, isComingSoon: true },
            { title: 'Observation Reports', path: '/dashboard/observation-reports', icon: Eye },
          ]
        },
        {
          title: 'SUPPORT & ADMINISTRATION',
          items: [
            { title: 'APEX', path: '/dashboard/apex-admin', icon: AIAssistant, badge: 'AI Support' },
            { title: 'Settings & Security', path: '/dashboard/admin-settings', icon: Settings },
            { title: 'Integration APIs', path: '/dashboard/integration-apis', icon: Plug },
            { title: 'Advanced Tools', path: '/dashboard/advanced-tools', icon: Wrench },
          ]
        }
      ];
    
    case 'content_creator':
      return [
        {
          title: 'MAIN',
          items: [
            { title: 'Overview', path: '/dashboard', icon: Home },
          ]
        },
        {
          title: 'CONTENT',
          items: [
            { title: 'Courses', path: '/dashboard/courses', icon: BookOpen },
            { title: 'Course Categories', path: '/dashboard/course-categories', icon: BookCheck },
          ]
        }
      ];
    
    case 'super_user':
      return [
        {
          title: 'DASHBOARD',
          items: [
            { title: 'Overview', path: '/dashboard', icon: Home },
            { title: 'Executive Dashboard', path: '/dashboard/executive-dashboard', icon: LayoutDashboard, isComingSoon: true },
            { title: 'IRIS', path: '/dashboard/iris', icon: Bot, badge: 'AI Insights' },
          ]
        },
        {
          title: 'ACADEMIC MANAGEMENT',
          items: [
            { title: 'AI Content Development', path: '/dashboard/ai-content-development', icon: SparklesIcon, isNew: true },
            { title: 'Courses & Categories', path: '/dashboard/courses', icon: BookOpen },
            { title: 'Classes', path: '/dashboard/classes', icon: Calendar },
            { title: 'Calendar Management', path: '/dashboard/calendar-management', icon: CalendarDays, isComingSoon: true },
            { title: 'Users & Permissions', path: '/dashboard/users', icon: Users },
            { title: 'Assessments', path: '/dashboard/grade-assignments', icon: Award },
          ]
        },
        {
          title: 'COMMUNICATION & ENGAGEMENT',
          items: [
            { title: 'Messages', path: '/dashboard/messages', icon: MessageSquare },
            { title: 'Discussion Forums', path: '/dashboard/discussion', icon: MessageCircle },
            ...(isZoomEnabled ? [{ title: 'Meetings', path: '/dashboard/meetings', icon: Video }] : []),
          ]
        },
        {
          title: 'BUSINESS OPERATIONS',
          items: [
            { title: 'Orders & Enrollment', path: '/dashboard/orders', icon: CreditCard },
            { title: 'Inventory Management', path: '/dashboard/inventory-management', icon: Package, isComingSoon: true },
          ]
        },
        {
          title: 'ANALYTICS & INSIGHTS',
          items: [
            { title: 'Performance Analytics', path: '/dashboard/reports', icon: FileQuestion },
            { title: 'Predictive Intervention System', path: '/dashboard/predictive-intervention', icon: TrendingDown, isComingSoon: true },
            { title: 'Observation Reports', path: '/dashboard/observation-reports', icon: Eye },
          ]
        },
        {
          title: 'SUPPORT & ADMINISTRATION',
          items: [
            { title: 'APEX', path: '/dashboard/apex-admin', icon: AIAssistant, badge: 'AI Support' },
            { title: 'Settings & Security', path: '/dashboard/admin-settings', icon: Settings },
            { title: 'Integration APIs', path: '/dashboard/integration-apis', icon: Plug },
            { title: 'Advanced Tools', path: '/dashboard/advanced-tools', icon: Wrench },
          ]
        }
      ];
    
    case 'view_only':
      return [
        {
          title: 'MAIN',
          items: [
            { title: 'Overview', path: '/dashboard', icon: Home },
          ]
        },
        {
          title: 'CONTENT',
          items: [
            { title: 'Courses', path: '/dashboard/courses', icon: BookOpen },
            { title: 'Course Categories', path: '/dashboard/course-categories', icon: BookCheck },
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
            { title: 'Performance Analytics', path: '/dashboard/ai-reports', icon: BarChart3 },
          ]
        },
        {
          title: 'SYSTEM MANAGEMENT',
          items: [
            { title: 'AI Tutor Settings', path: '/dashboard/ai-tutor-settings', icon: Settings2 },
            { title: 'AI Safety & Ethics', path: '/dashboard/ai-safety-ethics', icon: ShieldCheck },
          ]
        }
      ];
    
    case 'content_creator':
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
        }
      ];
    
    case 'super_user':
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
            { title: 'Performance Analytics', path: '/dashboard/ai-reports', icon: BarChart3 },
          ]
        },
        {
          title: 'SYSTEM MANAGEMENT',
          items: [
            { title: 'AI Tutor Settings', path: '/dashboard/ai-tutor-settings', icon: Settings2 },
            { title: 'AI Safety & Ethics', path: '/dashboard/ai-safety-ethics', icon: ShieldCheck },
          ]
        }
      ];
    
    case 'view_only':
      return [
        {
          title: 'MAIN',
          items: [
            { title: 'Overview', path: '/dashboard', icon: Bot },
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
    case 'content_creator':
      return 'Content Creator';
    case 'super_user':
      return 'Super User';
    case 'view_only':
      return 'View Only';
    default:
      return 'User';
  }
};
