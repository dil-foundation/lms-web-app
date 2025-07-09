
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Users, BookOpen, BarChart3, Settings } from 'lucide-react';

interface AdminDashboardProps {
  userProfile: any;
}

export const AdminDashboard = ({ userProfile }: AdminDashboardProps) => {
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
            {t('admin_dashboard.title')}
          </h1>
          <p className="text-muted-foreground">
            {t('admin_dashboard.welcome', { name: userProfile?.first_name || 'Administrator' })}
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t('admin_dashboard.stats.total_users')}</p>
                <p className="text-2xl font-bold">1,234</p>
              </div>
              <Users className="h-6 w-6 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t('admin_dashboard.stats.active_teachers')}</p>
                <p className="text-2xl font-bold">87</p>
              </div>
              <Users className="h-6 w-6 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t('admin_dashboard.stats.total_courses')}</p>
                <p className="text-2xl font-bold">156</p>
              </div>
              <BookOpen className="h-6 w-6 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t('admin_dashboard.stats.system_health')}</p>
                <p className="text-2xl font-bold">98%</p>
              </div>
              <BarChart3 className="h-6 w-6 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Admin Actions */}
      <div>
        <h2 className="text-xl font-semibold mb-4">{t('admin_dashboard.actions.title')}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
          <Card className="cursor-pointer hover:shadow-md transition-shadow">
            <CardHeader>
              <CardTitle className="text-base">{t('admin_dashboard.actions.user_management.title')}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-3">{t('admin_dashboard.actions.user_management.description')}</p>
              <Button className="w-full">{t('admin_dashboard.actions.user_management.button')}</Button>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:shadow-md transition-shadow">
            <CardHeader>
              <CardTitle className="text-base">{t('admin_dashboard.actions.system_analytics.title')}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-3">{t('admin_dashboard.actions.system_analytics.description')}</p>
              <Button className="w-full">{t('admin_dashboard.actions.system_analytics.button')}</Button>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:shadow-md transition-shadow">
            <CardHeader>
              <CardTitle className="text-base">{t('admin_dashboard.actions.system_settings.title')}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-3">{t('admin_dashboard.actions.system_settings.description')}</p>
              <Button className="w-full">{t('admin_dashboard.actions.system_settings.button')}</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
