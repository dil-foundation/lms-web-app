import {
  ArrowLeft,
  Search,
  FileText,
  Calendar,
  Building,
  User,
  Eye,
  Edit,
  Download,
  Trash2,
  Clock as ClockIcon,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

interface PastReportsViewProps {
  onBack: () => void;
}

const StatCard = ({ title, value, icon: Icon, iconColor, bgColor, additionalText }: { title: string; value: string; icon: React.ElementType; iconColor: string; bgColor: string; additionalText?: string }) => (
  <Card className="shadow-sm hover:shadow-md transition-shadow bg-white dark:bg-card">
    <CardContent className="p-4 flex items-center justify-between">
      <div>
        <p className="text-sm text-muted-foreground">{title}</p>
        <p className="text-2xl font-bold">{value}</p>
        {additionalText && <p className="text-xs text-muted-foreground">{additionalText}</p>}
      </div>
      <div className={cn("p-3 rounded-lg", bgColor)}>
        <Icon className={cn("h-6 w-6", iconColor)} />
      </div>
    </CardContent>
  </Card>
);

const mockReports = [
  {
    school: 'Senior High',
    test: 'TEST',
    date: 'Jul 05, 2025',
    time: '06:15:00 - 06:45:00',
    observer: 'ECE Observer',
    observerRole: 'ECE Observer',
    avatar: 'EO',
    created: 'Created 3 days ago',
  },
  {
    school: 'Harvard University',
    test: 'Nasir Mahmood',
    date: 'Jul 05, 2025',
    time: '06:15:00 - 13:00:00',
    observer: 'Demo Admin',
    observerRole: 'Principal',
    avatar: 'DA',
    created: 'Created 3 days ago',
  },
];

const getRoleBadgeClass = (role: string) => {
  switch (role) {
    case 'Principal':
      return 'bg-blue-100 text-blue-800 hover:bg-blue-200 dark:bg-blue-900/50 dark:text-blue-300';
    case 'ECE Observer':
      return 'bg-green-100 text-green-800 hover:bg-green-200 dark:bg-green-900/50 dark:text-green-300';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

export const PastReportsView = ({ onBack }: PastReportsViewProps) => {
  const { t } = useTranslation();
  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 sm:p-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={onBack} className="text-muted-foreground">
          <ArrowLeft className="w-4 h-4 mr-2" />
          {t('past_reports.back_button')}
        </Button>
      </div>

      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t('past_reports.title')}</h1>
        <p className="text-muted-foreground mt-1">
          {t('past_reports.description')}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title={t('past_reports.stats.total_reports')} value="4" icon={FileText} iconColor="text-gray-600" bgColor="bg-gray-100" />
        <StatCard title={t('past_reports.stats.this_week')} value="4" icon={Calendar} iconColor="text-blue-600" bgColor="bg-blue-100" />
        <StatCard title={t('past_reports.stats.schools_visited')} value="3" icon={Building} iconColor="text-green-600" bgColor="bg-green-100" />
        <StatCard title={t('past_reports.stats.most_common_role')} value={t('observation_reports.roles.principal')} icon={User} iconColor="text-purple-600" bgColor="bg-purple-100" />
      </div>

      <Card className="shadow-sm">
        <CardContent className="p-4 flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input placeholder={t('past_reports.search_placeholder')} className="pl-10 h-11" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Select>
              <SelectTrigger className="h-11"><SelectValue placeholder={t('past_reports.filters.all_roles')} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('past_reports.filters.all_roles')}</SelectItem>
                <SelectItem value="principal">{t('observation_reports.roles.principal')}</SelectItem>
              </SelectContent>
            </Select>
            <Select>
              <SelectTrigger className="h-11"><SelectValue placeholder={t('past_reports.filters.all_schools')} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('past_reports.filters.all_schools')}</SelectItem>
                <SelectItem value="harvard">{t('past_reports.harvard_university')}</SelectItem>
              </SelectContent>
            </Select>
            <Select>
              <SelectTrigger className="h-11"><SelectValue placeholder={t('past_reports.filters.most_recent')} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="recent">{t('past_reports.filters.most_recent')}</SelectItem>
                <SelectItem value="oldest">{t('past_reports.filters.oldest')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-muted-foreground" />
              <h2 className="text-lg font-semibold">{t('past_reports.reports_title', { count: 4 })}</h2>
            </div>
            <p className="text-sm text-muted-foreground">{t('past_reports.reports_description')}</p>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {mockReports.map((report, index) => (
            <Card key={index} className="p-4 flex flex-col sm:flex-row items-start sm:items-center gap-4 hover:shadow-md transition-shadow">
              <Avatar className="h-12 w-12 bg-green-500 text-white font-bold text-lg">
                <AvatarFallback>{report.avatar}</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold">{report.school}</h3>
                  <span className="text-muted-foreground">•</span>
                  <p className="text-muted-foreground">{report.test}</p>
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground mt-1">
                  <div className="flex items-center gap-1.5"><Calendar className="w-4 h-4" />{report.date}</div>
                  <div className="flex items-center gap-1.5"><ClockIcon className="w-4 h-4" />{report.time}</div>
                  <div className="flex items-center gap-1.5"><User className="w-4 h-4" />{report.observer}</div>
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <Badge className={cn(getRoleBadgeClass(report.observerRole))}>{report.observerRole}</Badge>
                  <p className="text-xs text-muted-foreground">{report.created}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 mt-4 sm:mt-0">
                <Button variant="outline" size="sm"><Eye className="w-4 h-4 mr-2" />{t('common.view')}</Button>
                <Button variant="outline" size="sm"><Edit className="w-4 h-4 mr-2" />{t('common.edit')}</Button>
                <Button variant="outline" size="sm"><Download className="w-4 h-4 mr-2" />{t('common.export')}</Button>
                <Button variant="outline" size="sm" className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"><Trash2 className="w-4 h-4 mr-2" />{t('common.delete')}</Button>
              </div>
            </Card>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}; 