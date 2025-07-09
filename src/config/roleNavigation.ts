
import { TFunction } from 'i18next';
import { Home, BookOpen, FileQuestion, TrendingUp, Users, Settings, BarChart3, GraduationCap, ClipboardList, Award, UserCheck, Database, Shield, MessageSquare, Link, Eye } from 'lucide-react';

export type UserRole = 'student' | 'teacher' | 'admin';

export interface NavigationItem {
  title: string;
  path: string;
  icon: any;
  badge?: string;
}

export const getRoleNavigation = (t: TFunction, role?: UserRole): NavigationItem[] => {
  if (!role) {
    return [];
  }
  
  switch (role) {
    case 'student':
      return [
        { title: t('navigation.student.overview'), path: '/dashboard', icon: Home },
        { title: t('navigation.student.my_courses'), path: '/dashboard/courses', icon: BookOpen },
        { title: t('navigation.student.assignments'), path: '/dashboard/assignments', icon: ClipboardList },
        { title: t('navigation.student.progress'), path: '/dashboard/progress', icon: TrendingUp },
        { title: t('navigation.student.ai_tutor'), path: '/dashboard/ai-tutor', icon: GraduationCap },
      ];
    
    case 'teacher':
      return [
        { title: t('navigation.teacher.overview'), path: '/dashboard', icon: Home },
        { title: t('navigation.teacher.my_classes'), path: '/dashboard/classes', icon: Users },
        { title: t('navigation.teacher.course_management'), path: '/dashboard/courses', icon: BookOpen },
        { title: t('navigation.teacher.student_progress'), path: '/dashboard/student-progress', icon: TrendingUp },
        { title: t('navigation.teacher.assignments'), path: '/dashboard/assignments', icon: ClipboardList },
        { title: t('navigation.teacher.resources'), path: '/dashboard/resources', icon: Award },
      ];
    
    case 'admin':
      return [
        { title: t('navigation.admin.overview'), path: '/dashboard', icon: Home },
        { title: t('navigation.admin.users'), path: '/dashboard/users', icon: Users },
        { title: t('navigation.admin.courses'), path: '/dashboard/courses', icon: BookOpen },
        { title: t('navigation.admin.reports'), path: '/dashboard/reports', icon: FileQuestion },
        { title: t('navigation.admin.observation_reports'), path: '/dashboard/observation-reports', icon: Eye },
        { title: t('navigation.admin.settings'), path: '/dashboard/settings', icon: Settings },
        { title: t('navigation.admin.security'), path: '/dashboard/security', icon: Shield },
        { title: t('navigation.admin.discussion'), path: 'dashboard/discussion', icon: MessageSquare },
        { title: t('navigation.admin.grade_assignments'), path: '/dashboard/grade-assignments', icon: Award },
      ];
    
    default:
      return [
        { title: t('navigation.default.overview'), path: '/dashboard', icon: Home },
      ];
  }
};

export const getRoleDisplayName = (t: TFunction, role: UserRole): string => {
  switch (role) {
    case 'student':
      return t('roles.student');
    case 'teacher':
      return t('roles.teacher');
    case 'admin':
      return t('roles.admin');
    default:
      return t('roles.user');
  }
};
