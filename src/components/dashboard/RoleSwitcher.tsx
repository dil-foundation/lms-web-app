
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Users, GraduationCap, Shield } from 'lucide-react';

interface RoleSwitcherProps {
  currentRole: string;
  onRoleChange: (role: 'student' | 'teacher' | 'admin') => void;
}

export const RoleSwitcher = ({ currentRole, onRoleChange }: RoleSwitcherProps) => {
  const { t } = useTranslation();
  return (
    <div className="flex items-center gap-2 p-4 bg-muted/50 rounded-lg border border-dashed border-muted-foreground/30">
      <span className="text-sm font-medium text-muted-foreground mr-2">{t('role_switcher.dev_mode')}</span>
      <Button
        variant={currentRole === 'student' ? 'default' : 'outline'}
        size="sm"
        onClick={() => onRoleChange('student')}
        className="flex items-center gap-2"
      >
        <GraduationCap className="h-4 w-4" />
        {t('role_switcher.student')}
      </Button>
      <Button
        variant={currentRole === 'teacher' ? 'default' : 'outline'}
        size="sm"
        onClick={() => onRoleChange('teacher')}
        className="flex items-center gap-2"
      >
        <Users className="h-4 w-4" />
        {t('role_switcher.teacher')}
      </Button>
      <Button
        variant={currentRole === 'admin' ? 'default' : 'outline'}
        size="sm"
        onClick={() => onRoleChange('admin')}
        className="flex items-center gap-2"
      >
        <Shield className="h-4 w-4" />
        {t('role_switcher.admin')}
      </Button>
    </div>
  );
};
