import {
  ArrowLeft,
  RefreshCw,
  Plus,
  Link as LinkIcon,
  CheckCircle,
  Shield,
  XCircle,
  Clock,
  Copy,
  Trash2,
} from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

interface SecureLinkManagementProps {
  onBack: () => void;
}

const StatCard = ({ title, value, icon: Icon, iconColor, bgColor }) => (
    <Card className="shadow-sm hover:shadow-md transition-shadow bg-white dark:bg-card">
        <CardContent className="p-4 flex items-center justify-between">
            <div>
                <p className="text-sm text-muted-foreground">{title}</p>
                <p className="text-2xl font-bold">{value}</p>
            </div>
            <div className={cn("p-3 rounded-lg", bgColor)}>
                <Icon className={cn("h-6 w-6", iconColor)} />
            </div>
        </CardContent>
    </Card>
);

export const SecureLinkManagement = ({ onBack }: SecureLinkManagementProps) => {
  const { t } = useTranslation();

  const mockLinks = [
    {
        role: t('observation_reports.roles.principal'),
        token: '1c87fa...',
        expiry: 'Jul 21, 2025,\n12:26 PM',
        status: t('secure_link.statuses.active'),
        usedBy: '—',
        created: 'Jul 7, 2025,\n12:26 PM',
    },
    {
        role: t('observation_reports.roles.ece_observer'),
        token: '1621b0...',
        expiry: 'Jul 12, 2025,\n03:33 PM',
        status: t('secure_link.statuses.active'),
        usedBy: '—',
        created: 'Jul 5, 2025,\n03:33 PM',
    },
  ];

  const getRoleBadgeClass = (role: string) => {
    if (role === t('observation_reports.roles.principal')) {
        return 'bg-blue-100 text-blue-800 hover:bg-blue-200 dark:bg-blue-900/50 dark:text-blue-300';
    }
    if (role === t('observation_reports.roles.ece_observer')) {
        return 'bg-green-100 text-green-800 hover:bg-green-200 dark:bg-green-900/50 dark:text-green-300';
    }
    return 'bg-gray-100 text-gray-800';
  };

  const GenerateLinkModalContent = () => {
    const { t } = useTranslation();
    const [role, setRole] = useState('');
    const [expiry, setExpiry] = useState('7');

    return (
      <>
        <DialogHeader>
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-green-100 dark:bg-green-900/20 p-2 rounded-full">
              <LinkIcon className="w-5 h-5 text-green-600" />
            </div>
            <DialogTitle className="text-xl font-bold">{t('secure_link.modal.title')}</DialogTitle>
          </div>
          <DialogDescription>
            {t('secure_link.modal.description')}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-6 py-4">
          <div className="space-y-2">
            <Label htmlFor="observer-role">{t('secure_link.modal.observer_role')}</Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger id="observer-role" className="h-11">
                <SelectValue placeholder={t('secure_link.modal.select_role_placeholder')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="principal">{t('observation_reports.roles.principal')}</SelectItem>
                <SelectItem value="ece">{t('observation_reports.roles.ece_observer')}</SelectItem>
                <SelectItem value="school-officer">{t('observation_reports.roles.school_officer')}</SelectItem>
                <SelectItem value="project-manager">{t('observation_reports.roles.project_manager')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="expiry-days">{t('secure_link.modal.expiry_days')}</Label>
            <Select value={expiry} onValueChange={setExpiry}>
              <SelectTrigger id="expiry-days" className="h-11">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">{t('secure_link.modal.days', { count: 1 })}</SelectItem>
                <SelectItem value="3">{t('secure_link.modal.days', { count: 3 })}</SelectItem>
                <SelectItem value="7">{t('secure_link.modal.days', { count: 7 })}</SelectItem>
                <SelectItem value="14">{t('secure_link.modal.days', { count: 14 })}</SelectItem>
                <SelectItem value="30">{t('secure_link.modal.days', { count: 30 })}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">{t('common.cancel')}</Button>
          </DialogClose>
          <Button type="submit" className="bg-green-600 hover:bg-green-700 text-white">
            <LinkIcon className="w-4 h-4 mr-2" />
            {t('secure_link.modal.generate_link_button')}
          </Button>
        </DialogFooter>
      </>
    );
  };

  return (
    <div className="space-y-6 mx-auto p-4 sm:p-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={onBack} className="text-muted-foreground">
          <ArrowLeft className="w-4 h-4 mr-2" />
          {t('past_reports.back_button')}
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('secure_link.title')}</h1>
          <p className="text-muted-foreground mt-1">
            {t('secure_link.description')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline">
            <RefreshCw className="w-4 h-4 mr-2" />
            {t('secure_link.refresh_button')}
          </Button>
          <Dialog>
            <DialogTrigger asChild>
              <Button className="bg-green-600 hover:bg-green-700 text-white">
                <Plus className="w-4 h-4 mr-2" />
                {t('secure_link.generate_link_button')}
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <GenerateLinkModalContent />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <StatCard title={t('secure_link.stats.total_links')} value="2" icon={LinkIcon} iconColor="text-green-600" bgColor="bg-green-100" />
        <StatCard title={t('secure_link.stats.active')} value="2" icon={CheckCircle} iconColor="text-green-600" bgColor="bg-green-100" />
        <StatCard title={t('secure_link.stats.used')} value="0" icon={Shield} iconColor="text-blue-600" bgColor="bg-blue-100" />
        <StatCard title={t('secure_link.stats.deactivated')} value="0" icon={XCircle} iconColor="text-red-600" bgColor="bg-red-100" />
        <StatCard title={t('secure_link.stats.expired')} value="0" icon={Clock} iconColor="text-orange-600" bgColor="bg-orange-100" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('secure_link.links_table.title')}</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('secure_link.links_table.role')}</TableHead>
                <TableHead>{t('secure_link.links_table.token')}</TableHead>
                <TableHead>{t('secure_link.links_table.expiry')}</TableHead>
                <TableHead>{t('secure_link.links_table.status')}</TableHead>
                <TableHead>{t('secure_link.links_table.used_by')}</TableHead>
                <TableHead>{t('secure_link.links_table.created')}</TableHead>
                <TableHead>{t('secure_link.links_table.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mockLinks.map((link, index) => (
                <TableRow key={index}>
                  <TableCell>
                    <Badge className={cn(getRoleBadgeClass(link.role))}>{link.role}</Badge>
                  </TableCell>
                  <TableCell className="font-mono">{link.token}</TableCell>
                  <TableCell>{link.expiry}</TableCell>
                  <TableCell>
                    <Badge variant={link.status === t('secure_link.statuses.active') ? 'default' : 'destructive'}>
                      {link.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{link.usedBy}</TableCell>
                  <TableCell>{link.created}</TableCell>
                  <TableCell className="flex items-center gap-2">
                    <Button variant="ghost" size="sm"><Copy className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}; 