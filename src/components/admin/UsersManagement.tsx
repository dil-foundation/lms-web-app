
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Search, Plus, Users, GraduationCap, BookOpen, MoreHorizontal, Edit, Trash2, Activity } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

interface User {
  id: string;
  name: string;
  email: string;
  role: 'student' | 'teacher' | 'admin';
  status: 'active' | 'inactive';
  joinedDate: string;
  lastActive: string;
}

// Mock data for demonstration
const mockUsers: User[] = [
  {
    id: '1',
    name: 'users_management.mock_users.user1.name',
    email: 'alice.johnson@school.edu',
    role: 'student',
    status: 'active',
    joinedDate: '2024-01-15',
    lastActive: '2024-07-04'
  },
  {
    id: '2',
    name: 'users_management.mock_users.user2.name',
    email: 'robert.smith@school.edu',
    role: 'teacher',
    status: 'active',
    joinedDate: '2023-08-20',
    lastActive: '2024-07-03'
  },
  {
    id: '3',
    name: 'users_management.mock_users.user3.name',
    email: 'emma.wilson@school.edu',
    role: 'student',
    status: 'inactive',
    joinedDate: '2024-02-10',
    lastActive: '2024-06-15'
  },
  {
    id: '4',
    name: 'users_management.mock_users.user4.name',
    email: 'michael.brown@school.edu',
    role: 'teacher',
    status: 'active',
    joinedDate: '2023-09-05',
    lastActive: '2024-07-04'
  },
  {
    id: '5',
    name: 'users_management.mock_users.user5.name',
    email: 'sarah.davis@school.edu',
    role: 'student',
    status: 'active',
    joinedDate: '2024-03-12',
    lastActive: '2024-07-02'
  }
];

export const UsersManagement = () => {
  const { t } = useTranslation();
  const [users] = useState<User[]>(mockUsers);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Calculate metrics
  const totalUsers = users.length;
  const totalStudents = users.filter(user => user.role === 'student').length;
  const totalTeachers = users.filter(user => user.role === 'teacher').length;

  // Filter users based on search and filters
  const filteredUsers = users.filter(user => {
    const matchesSearch = t(user.name).toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    const matchesStatus = statusFilter === 'all' || user.status === statusFilter;
    
    return matchesSearch && matchesRole && matchesStatus;
  });

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'admin': return 'destructive';
      case 'teacher': return 'default';
      case 'student': return 'secondary';
      default: return 'outline';
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    return status === 'active' ? 'default' : 'secondary';
  };

  return (
    <div className="space-y-6 w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('users_management.title')}</h1>
          <p className="text-muted-foreground">{t('users_management.description')}</p>
        </div>
        
        <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
          <DialogTrigger asChild>
            <Button className="w-full sm:w-auto">
              <Plus className="mr-2 h-4 w-4" />
              {t('users_management.create_user_button')}
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>{t('users_management.modal.title')}</DialogTitle>
              <DialogDescription>
                {t('users_management.modal.description')}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="firstName">{t('users_management.modal.first_name')}</Label>
                <Input id="firstName" placeholder={t('users_management.modal.first_name_placeholder')} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="lastName">{t('users_management.modal.last_name')}</Label>
                <Input id="lastName" placeholder={t('users_management.modal.last_name_placeholder')} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="email">{t('users_management.modal.email')}</Label>
                <Input id="email" type="email" placeholder={t('users_management.modal.email_placeholder')} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="role">{t('users_management.modal.role')}</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder={t('users_management.modal.role_placeholder')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="student">{t('users_management.roles.student')}</SelectItem>
                    <SelectItem value="teacher">{t('users_management.roles.teacher')}</SelectItem>
                    <SelectItem value="admin">{t('users_management.roles.admin')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="password">{t('users_management.modal.temp_password')}</Label>
                <Input id="password" type="password" placeholder={t('users_management.modal.temp_password_placeholder')} />
              </div>
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setIsCreateModalOpen(false)}>
                {t('common.cancel')}
              </Button>
              <Button onClick={() => setIsCreateModalOpen(false)}>
                {t('users_management.create_user_button')}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Metrics Cards */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('users_management.stats.total_users')}</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalUsers}</div>
            <p className="text-xs text-muted-foreground">
              {t('users_management.stats.total_users_desc')}
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('users_management.stats.total_students')}</CardTitle>
            <GraduationCap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalStudents}</div>
            <p className="text-xs text-muted-foreground">
              {t('users_management.stats.total_students_desc')}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('users_management.stats.total_teachers')}</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalTeachers}</div>
            <p className="text-xs text-muted-foreground">
              {t('users_management.stats.total_teachers_desc')}
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('users_management.stats.active_now')}</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{users.filter(u => u.status === 'active').length}</div>
            <p className="text-xs text-muted-foreground">
              {t('users_management.stats.active_now_desc')}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <CardTitle>{t('users_management.table.title')}</CardTitle>
              <CardDescription>{t('users_management.table.description')}</CardDescription>
            </div>
            <div className="flex w-full sm:w-auto flex-col sm:flex-row gap-2">
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder={t('users_management.table.search_placeholder')}
                  className="pl-9"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Select value={roleFilter} onValueChange={setRoleFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('users_management.table.filters.role_placeholder')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('users_management.table.filters.all_roles')}</SelectItem>
                    <SelectItem value="student">{t('users_management.roles.student')}</SelectItem>
                    <SelectItem value="teacher">{t('users_management.roles.teacher')}</SelectItem>
                    <SelectItem value="admin">{t('users_management.roles.admin')}</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('users_management.table.filters.status_placeholder')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('users_management.table.filters.all_statuses')}</SelectItem>
                    <SelectItem value="active">{t('users_management.statuses.active')}</SelectItem>
                    <SelectItem value="inactive">{t('users_management.statuses.inactive')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('users_management.table.columns.user')}</TableHead>
                  <TableHead>{t('users_management.table.columns.role')}</TableHead>
                  <TableHead>{t('users_management.table.columns.status')}</TableHead>
                  <TableHead>{t('users_management.table.columns.joined_date')}</TableHead>
                  <TableHead>{t('users_management.table.columns.last_active')}</TableHead>
                  <TableHead className="text-right">{t('users_management.table.columns.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="font-medium">{t(user.name)}</div>
                      <div className="text-sm text-muted-foreground">{user.email}</div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getRoleBadgeVariant(user.role)}>{t(`users_management.roles.${user.role}`)}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusBadgeVariant(user.status)}>{t(`users_management.statuses.${user.status}`)}</Badge>
                    </TableCell>
                    <TableCell>{user.joinedDate}</TableCell>
                    <TableCell>{user.lastActive}</TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">{t('users_management.table.actions.open_menu')}</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>
                            <Edit className="mr-2 h-4 w-4" />
                            <span>{t('users_management.table.actions.edit')}</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Trash2 className="mr-2 h-4 w-4" />
                            <span>{t('users_management.table.actions.delete')}</span>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
