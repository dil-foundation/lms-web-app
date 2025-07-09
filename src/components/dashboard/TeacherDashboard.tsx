
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Users, BookOpen, ClipboardCheck, TrendingUp } from 'lucide-react';

interface TeacherDashboardProps {
  userProfile: any;
}

export const TeacherDashboard = ({ userProfile }: TeacherDashboardProps) => {
  const { t } = useTranslation();
  const getInitials = (firstName?: string, lastName?: string) => {
    return `${firstName?.charAt(0) || ''}${lastName?.charAt(0) || ''}`.toUpperCase();
  };

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="flex items-center space-x-4 mb-8">
        <Avatar className="h-16 w-16">
          <AvatarFallback className="bg-primary text-primary-foreground text-xl font-bold">
            {getInitials(userProfile?.first_name, userProfile?.last_name)}
          </AvatarFallback>
        </Avatar>
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            {t('teacher_dashboard.welcome', { name: userProfile?.first_name || 'Teacher' })}
          </h1>
          <p className="text-muted-foreground">
            {userProfile?.teacher_id ? t('teacher_dashboard.teacher_id', { id: userProfile.teacher_id }) : t('teacher_dashboard.manage_classes')}
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t('teacher_dashboard.stats.total_students')}</p>
                <p className="text-2xl font-bold">45</p>
              </div>
              <Users className="h-6 w-6 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t('teacher_dashboard.stats.active_courses')}</p>
                <p className="text-2xl font-bold">6</p>
              </div>
              <BookOpen className="h-6 w-6 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t('teacher_dashboard.stats.pending_assignments')}</p>
                <p className="text-2xl font-bold">12</p>
              </div>
              <ClipboardCheck className="h-6 w-6 text-orange-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t('teacher_dashboard.stats.avg_performance')}</p>
                <p className="text-2xl font-bold">87%</p>
              </div>
              <TrendingUp className="h-6 w-6 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-xl font-semibold mb-4">{t('teacher_dashboard.quick_actions.title')}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
          <Card className="cursor-pointer hover:shadow-md transition-shadow">
            <CardHeader>
              <CardTitle className="text-base">{t('teacher_dashboard.quick_actions.new_assignment.title')}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-3">{t('teacher_dashboard.quick_actions.new_assignment.description')}</p>
              <Button className="w-full">{t('teacher_dashboard.quick_actions.new_assignment.button')}</Button>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:shadow-md transition-shadow">
            <CardHeader>
              <CardTitle className="text-base">{t('teacher_dashboard.quick_actions.grade_submissions.title')}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-3">{t('teacher_dashboard.quick_actions.grade_submissions.description')}</p>
              <Button className="w-full">{t('teacher_dashboard.quick_actions.grade_submissions.button')}</Button>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:shadow-md transition-shadow">
            <CardHeader>
              <CardTitle className="text-base">{t('teacher_dashboard.quick_actions.class_analytics.title')}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-3">{t('teacher_dashboard.quick_actions.class_analytics.description')}</p>
              <Button className="w-full">{t('teacher_dashboard.quick_actions.class_analytics.button')}</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
