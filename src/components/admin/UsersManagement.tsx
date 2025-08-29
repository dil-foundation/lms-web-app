
import React, { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Search, Plus, Users, GraduationCap, BookOpen, MoreHorizontal, Edit, Trash2, Shield } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { ContentLoader } from '../ContentLoader';
import { Skeleton } from '../ui/skeleton';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import { 
  validateFirstName, 
  validateLastName, 
  validateEmail, 
  validateGrade,
  validateTeacherId,
} from '@/utils/validation';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import AccessLogService from '@/services/accessLogService';
import { useAuth } from '@/hooks/useAuth';

interface User {
  id: string;
  name: string;
  firstName: string;
  lastName: string;
  email: string;
  role: 'student' | 'teacher' | 'admin';
  status: 'active' | 'inactive' | 'unverified';
  joinedDate: string;
  lastActive: string;
  grade?: string;
  teacherId?: string;
  avatar_url?: string;
}

const initialNewUserState = {
  firstName: '',
  lastName: '',
  email: '',
  role: 'student' as 'student' | 'teacher' | 'admin',
  grade: '',
  teacherId: '',
};

const initialValidationErrors = {
  firstName: '',
  lastName: '',
  email: '',
  grade: '',
  teacherId: '',
};

export const UsersManagement = () => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const [newUser, setNewUser] = useState(initialNewUserState);
  const [validationErrors, setValidationErrors] = useState(initialValidationErrors);
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [isDeletingUser, setIsDeletingUser] = useState(false);
  const [userToEdit, setUserToEdit] = useState<User | null>(null);
  const [editValidationErrors, setEditValidationErrors] = useState(initialValidationErrors);
  const [isUpdatingUser, setIsUpdatingUser] = useState(false);
  
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage] = useState(10);
  const [totalUsers, setTotalUsers] = useState(0);
  const [stats, setStats] = useState({
    students: 0,
    teachers: 0,
    admins: 0,
  });
  const [loadingStats, setLoadingStats] = useState(true);
  
  const totalPages = Math.ceil(totalUsers / rowsPerPage);

  const fetchStats = useCallback(async () => {
    setLoadingStats(true);
    try {
      const [
        { count: students, error: studentsError },
        { count: teachers, error: teachersError },
        { count: admins, error: adminsError }
      ] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'student'),
        supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'teacher'),
        supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'admin')
      ]);

      if (studentsError || teachersError || adminsError) {
        throw studentsError || teachersError || adminsError;
      }
      
      setStats({
        students: students || 0,
        teachers: teachers || 0,
        admins: admins || 0,
      });

    } catch (error: any) {
      toast.error("Failed to load statistics.", { description: error.message });
      console.error("Error fetching stats:", error);
    } finally {
      setLoadingStats(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('get-users', {
        body: {
          page: currentPage,
          rowsPerPage,
          searchTerm,
          roleFilter
        }
      });
      
      if (error) throw new Error(error.message);
      
      const { users: fetchedUsers, count } = data;

      if (fetchedUsers) {
        const transformedUsers: User[] = fetchedUsers.map((user: any) => ({
          id: user.id,
          name: `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email,
          firstName: user.first_name || '',
          lastName: user.last_name || '',
          email: user.email,
          role: user.role,
          status: user.email_confirmed_at ? 'active' : 'unverified',
          joinedDate: user.created_at,
          lastActive: user.last_active_at || user.updated_at,
          grade: user.grade,
          teacherId: user.teacher_id,
          avatar_url: user.avatar_url,
        }));
        setUsers(transformedUsers);
        setTotalUsers(count || 0);
      } else {
        setUsers([]);
        setTotalUsers(0);
      }
    } catch (error: any) {
      toast.error("Failed to fetch user data.", {
        description: error.message,
      });
      console.error("Error fetching users:", error);
    } finally {
      setLoading(false);
    }
  }, [currentPage, rowsPerPage, searchTerm, roleFilter]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);
  
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, roleFilter]);

  const handleFieldValidation = (field: string, value: string) => {
    let validation;
    switch (field) {
      case 'firstName':
        validation = validateFirstName(value);
        break;
      case 'lastName':
        validation = validateLastName(value);
        break;
      case 'email':
        validation = validateEmail(value);
        break;
      case 'grade':
        validation = validateGrade(value);
        break;
      case 'teacherId':
        validation = validateTeacherId(value);
        break;
      default:
        validation = { isValid: true, error: null };
    }
    setValidationErrors(prev => ({ ...prev, [field]: validation.isValid ? '' : validation.error }));
  };

  const handleCreateUser = async () => {
    let hasErrors = false;
    const { firstName, lastName, email, role, grade, teacherId } = newUser;

    const firstNameValidation = validateFirstName(firstName);
    if (!firstNameValidation.isValid) {
      setValidationErrors(prev => ({ ...prev, firstName: firstNameValidation.error! }));
      hasErrors = true;
    }

    const lastNameValidation = validateLastName(lastName);
    if (!lastNameValidation.isValid) {
      setValidationErrors(prev => ({ ...prev, lastName: lastNameValidation.error! }));
      hasErrors = true;
    }

    const emailValidation = validateEmail(email);
    if (!emailValidation.isValid) {
      setValidationErrors(prev => ({ ...prev, email: emailValidation.error! }));
      hasErrors = true;
    }
    
    if (role === 'student') {
      const gradeValidation = validateGrade(grade);
      if (!gradeValidation.isValid) {
        setValidationErrors(prev => ({ ...prev, grade: gradeValidation.error! }));
        hasErrors = true;
      }
    } else if (role === 'teacher') {
      const teacherIdValidation = validateTeacherId(teacherId);
      if (!teacherIdValidation.isValid) {
        setValidationErrors(prev => ({ ...prev, teacherId: teacherIdValidation.error! }));
        hasErrors = true;
      }
    }

    if (hasErrors) {
      toast.error("Please fix the errors before creating the user.");
      return;
    }

    setIsCreatingUser(true);

    try {
      const { error } = await supabase.functions.invoke('invite-user', {
        body: {
          email: newUser.email,
          role: newUser.role,
          firstName: newUser.firstName,
          lastName: newUser.lastName,
          grade: newUser.role === 'student' ? newUser.grade : undefined,
          teacherId: newUser.role === 'teacher' ? newUser.teacherId : undefined,
          redirectTo: `${window.location.origin}/dashboard/profile-settings`,
        },
      });

      if (error) throw error;

      toast.success("Invitation sent successfully!", { description: `An invitation email has been sent to ${newUser.email}.` });
      
      // Log user creation
      if (currentUser) {
        await AccessLogService.logUserManagementAction(
          currentUser.id,
          currentUser.email || 'unknown@email.com',
          'user_invited',
          undefined,
          newUser.email,
          {
            invited_user_email: newUser.email,
            invited_user_role: newUser.role,
            invited_user_name: `${newUser.firstName} ${newUser.lastName}`.trim()
          }
        );
      }
      
      setIsCreateModalOpen(false);
      setNewUser(initialNewUserState);
      setValidationErrors(initialValidationErrors);
      fetchUsers();
      fetchStats();

    } catch (error: any) {
      toast.error("Failed to create user.", { description: error.message });
      console.error("Error creating user:", error);
    } finally {
      setIsCreatingUser(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!userToDelete) return;
    setIsDeletingUser(true);
    try {
      const { error } = await supabase.functions.invoke('delete-user', {
        body: { userId: userToDelete.id },
      });

      if (error) throw error;

      toast.success("User deleted successfully!", { description: `${userToDelete.name} has been removed from the system.` });
      
      // Log user deletion
      if (currentUser) {
        await AccessLogService.logUserManagementAction(
          currentUser.id,
          currentUser.email || 'unknown@email.com',
          'user_deleted',
          userToDelete.id,
          userToDelete.email,
          {
            deleted_user_email: userToDelete.email,
            deleted_user_name: userToDelete.name,
            deleted_user_role: userToDelete.role
          }
        );
      }
      
      setUserToDelete(null);
      fetchUsers(); // Refresh the list
      fetchStats(); // Refresh the stats
    } catch (error: any) {
      toast.error("Failed to delete user.", { description: error.message });
      console.error("Error deleting user:", error);
    } finally {
      setIsDeletingUser(false);
    }
  };

  const handleUpdateUser = async () => {
    if (!userToEdit) return;
    setIsUpdatingUser(true);
    
    // Add validation here based on role, similar to create user
    
    try {
      const { error } = await supabase.functions.invoke('update-user', {
        body: {
          userId: userToEdit.id,
          firstName: userToEdit.firstName,
          lastName: userToEdit.lastName,
          role: userToEdit.role,
          grade: userToEdit.role === 'student' ? userToEdit.grade : undefined,
          teacherId: userToEdit.role === 'teacher' ? userToEdit.teacherId : undefined,
        },
      });

      if (error) throw error;
      
      toast.success("User updated successfully!");
      
      // Log user update
      if (currentUser && userToEdit) {
        await AccessLogService.logUserManagementAction(
          currentUser.id,
          currentUser.email || 'unknown@email.com',
          'user_updated',
          userToEdit.id,
          userToEdit.email,
          {
            updated_user_email: userToEdit.email,
            updated_user_name: userToEdit.name,
            updated_user_role: userToEdit.role
          }
        );
      }
      
      setUserToEdit(null);
      fetchUsers();
    } catch (error: any) {
      toast.error("Failed to update user.", { description: error.message });
    } finally {
      setIsUpdatingUser(false);
    }
  };

  const handleResetPassword = async (user: User) => {
    try {
      const { error } = await supabase.functions.invoke('reset-user-password', {
        body: { email: user.email },
      });

      if (error) throw error;

      toast.success("Password reset email sent!", { description: `A reset link has been sent to ${user.name}.` });
      
      // Log password reset
      if (currentUser) {
        await AccessLogService.logUserManagementAction(
          currentUser.id,
          currentUser.email || 'unknown@email.com',
          'password_reset_sent',
          user.id,
          user.email,
          {
            target_user_email: user.email,
            target_user_name: user.name
          }
        );
      }
    } catch (error: any) {
      toast.error("Failed to send reset link.", { description: error.message });
      console.error("Error sending reset link:", error);
    }
  };


  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'admin': return 'destructive';
      case 'teacher': return 'default';
      case 'student': return 'blue';
      default: return 'outline';
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'active':
        return 'default';
      case 'unverified':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  return (
    <div className="space-y-8 w-full">
      {/* Premium Header Section */}
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-primary/5 rounded-3xl"></div>
        <div className="relative p-8 rounded-3xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-primary/10 to-primary/20 rounded-2xl flex items-center justify-center">
                <Users className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-primary via-primary to-primary/80 bg-clip-text text-transparent" style={{ lineHeight: '3rem' }}>
                  Users Management
                </h1>
                <p className="text-lg text-muted-foreground font-light">
                  Manage all users in the system
                </p>
              </div>
            </div>
            
            <Dialog open={isCreateModalOpen} onOpenChange={(isOpen) => {
              setIsCreateModalOpen(isOpen);
              if (!isOpen) {
                setNewUser(initialNewUserState);
                setValidationErrors(initialValidationErrors);
              }
            }}>
              <DialogTrigger asChild>
                <Button className="h-10 px-6 rounded-xl bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5">
                  <Plus className="mr-2 h-4 w-4" />
                  Create User
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Create New User</DialogTitle>
                  <DialogDescription>
                    Invite a new user to the system. They will receive a magic link to get started.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="firstName">First Name</Label>
                      <Input 
                        id="firstName" 
                        placeholder="Enter first name" 
                        value={newUser.firstName}
                        onChange={(e) => {
                          setNewUser(prev => ({ ...prev, firstName: e.target.value }));
                          handleFieldValidation('firstName', e.target.value);
                        }}
                        className={validationErrors.firstName ? 'border-destructive' : ''}
                      />
                      {validationErrors.firstName && <p className="text-xs text-destructive">{validationErrors.firstName}</p>}
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="lastName">Last Name</Label>
                      <Input 
                        id="lastName" 
                        placeholder="Enter last name" 
                        value={newUser.lastName}
                        onChange={(e) => {
                          setNewUser(prev => ({ ...prev, lastName: e.target.value }));
                          handleFieldValidation('lastName', e.target.value);
                        }}
                        className={validationErrors.lastName ? 'border-destructive' : ''}
                      />
                      {validationErrors.lastName && <p className="text-xs text-destructive">{validationErrors.lastName}</p>}
                    </div>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="email">Email</Label>
                    <Input 
                      id="email" 
                      type="email" 
                      placeholder="Enter email address"
                      value={newUser.email}
                      onChange={(e) => {
                        setNewUser(prev => ({ ...prev, email: e.target.value }));
                        handleFieldValidation('email', e.target.value);
                      }}
                      className={validationErrors.email ? 'border-destructive' : ''}
                    />
                    {validationErrors.email && <p className="text-xs text-destructive">{validationErrors.email}</p>}
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="role">Role</Label>
                    <Select
                      value={newUser.role}
                      onValueChange={(value: 'student' | 'teacher' | 'admin') => setNewUser(prev => ({ ...prev, role: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="student">Student</SelectItem>
                        <SelectItem value="teacher">Teacher</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {newUser.role === 'student' && (
                    <div className="grid gap-2">
                      <Label htmlFor="grade">Grade</Label>
                      <Select
                        value={newUser.grade}
                        onValueChange={(value) => {
                          setNewUser(prev => ({ ...prev, grade: value }));
                          handleFieldValidation('grade', value);
                        }}
                      >
                        <SelectTrigger className={validationErrors.grade ? 'border-destructive' : ''}>
                          <SelectValue placeholder="Select a grade" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">1st Grade</SelectItem>
                          <SelectItem value="2">2nd Grade</SelectItem>
                          <SelectItem value="3">3rd Grade</SelectItem>
                          <SelectItem value="4">4th Grade</SelectItem>
                          <SelectItem value="5">5th Grade</SelectItem>
                          <SelectItem value="6">6th Grade</SelectItem>
                          <SelectItem value="7">7th Grade</SelectItem>
                          <SelectItem value="8">8th Grade</SelectItem>
                          <SelectItem value="9">9th Grade</SelectItem>
                          <SelectItem value="10">10th Grade</SelectItem>
                          <SelectItem value="11">11th Grade</SelectItem>
                          <SelectItem value="12">12th Grade</SelectItem>
                        </SelectContent>
                      </Select>
                      {validationErrors.grade && <p className="text-xs text-destructive">{validationErrors.grade}</p>}
                    </div>
                  )}

                  {newUser.role === 'teacher' && (
                    <div className="grid gap-2">
                      <Label htmlFor="teacherId">Teacher ID</Label>
                      <Input 
                        id="teacherId" 
                        placeholder="Enter Teacher ID" 
                        value={newUser.teacherId}
                        onChange={(e) => {
                          setNewUser(prev => ({ ...prev, teacherId: e.target.value }));
                          handleFieldValidation('teacherId', e.target.value);
                        }}
                        className={validationErrors.teacherId ? 'border-destructive' : ''}
                      />
                      {validationErrors.teacherId && <p className="text-xs text-destructive">{validationErrors.teacherId}</p>}
                    </div>
                  )}
                </div>
                <div className="flex justify-end space-x-2">
                  <Button 
                    variant="outline" 
                    onClick={() => setIsCreateModalOpen(false)}
                    className="hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  >
                    Cancel
                  </Button>
                  <Button onClick={handleCreateUser} disabled={isCreatingUser}>
                    {isCreatingUser ? "Sending Invite..." : "Send Invite"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
        <Card className="bg-gradient-to-br from-card to-green-500/5 dark:bg-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loadingStats ? <Skeleton className="h-8 w-1/2" /> : <div className="text-2xl font-bold">{stats.students + stats.teachers + stats.admins}</div>}
            <p className="text-xs text-muted-foreground">
              All users in the system
            </p>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-card to-green-500/5 dark:bg-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Students</CardTitle>
            <GraduationCap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loadingStats ? <Skeleton className="h-8 w-1/2" /> : <div className="text-2xl font-bold">{stats.students}</div>}
            <p className="text-xs text-muted-foreground">
              Active and inactive students
            </p>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-card to-green-500/5 dark:bg-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Teachers</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loadingStats ? <Skeleton className="h-8 w-1/2" /> : <div className="text-2xl font-bold">{stats.teachers}</div>}
            <p className="text-xs text-muted-foreground">
              Teaching staff members
            </p>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-card to-green-500/5 dark:bg-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Admins</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loadingStats ? <Skeleton className="h-8 w-1/2" /> : <div className="text-2xl font-bold">{stats.admins}</div>}
            <p className="text-xs text-muted-foreground">
              System administrators
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filter Controls */}
      <Card>
        <CardHeader>
          <CardTitle>User Directory</CardTitle>
          <CardDescription>
            Search and filter users by name or email
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 h-9 rounded-xl bg-background border border-input shadow-sm hover:shadow-lg hover:shadow-primary/10 transition-all duration-300 hover:-translate-y-0.5"
              />
            </div>
            
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-full sm:w-[150px] h-9 rounded-xl bg-background border border-input shadow-sm hover:shadow-lg hover:shadow-primary/10 transition-all duration-300 hover:-translate-y-0.5">
                <SelectValue placeholder="Role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="student">Students</SelectItem>
                <SelectItem value="teacher">Teachers</SelectItem>
                <SelectItem value="admin">Admins</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Users Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden md:table-cell">Joined</TableHead>
                  <TableHead className="hidden md:table-cell">Last Active</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6}>
                      <ContentLoader message="Loading users..." />
                    </TableCell>
                  </TableRow>
                ) : (
                  users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center space-x-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage 
                              src={user.avatar_url} 
                              alt={user.name}
                            />
                            <AvatarFallback className="text-xs bg-primary/10 text-primary">
                              {user.firstName && user.lastName 
                                ? `${user.firstName[0]}${user.lastName[0]}`.toUpperCase()
                                : user.email ? user.email[0].toUpperCase() : 'U'
                              }
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium">{user.name}</div>
                            <div className="text-sm text-muted-foreground">{user.email}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getRoleBadgeVariant(user.role)}>
                          {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusBadgeVariant(user.status)}>
                          {user.status.charAt(0).toUpperCase() + user.status.slice(1)}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-muted-foreground">
                        {new Date(user.joinedDate).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-muted-foreground">
                        {new Date(user.lastActive).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <span className="sr-only">Open menu</span>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setUserToEdit(user)}>
                              <Edit className="mr-2 h-4 w-4" />
                              <span>Edit User</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleResetPassword(user)}>
                              Reset Password
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => setUserToDelete(user)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              <span>Delete User</span>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {!loading && totalPages > 0 && (
             <Pagination className="mt-4">
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious 
                    href="#" 
                    onClick={(e) => {
                      e.preventDefault();
                      setCurrentPage(prev => Math.max(1, prev - 1));
                    }}
                    className={currentPage === 1 ? "pointer-events-none opacity-50" : ""}
                  />
                </PaginationItem>
                
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                  <PaginationItem key={page}>
                    <PaginationLink 
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        setCurrentPage(page);
                      }}
                      isActive={currentPage === page}
                    >
                      {page}
                    </PaginationLink>
                  </PaginationItem>
                ))}

                <PaginationItem>
                  <PaginationNext 
                    href="#" 
                    onClick={(e) => {
                      e.preventDefault();
                      setCurrentPage(prev => Math.min(totalPages, prev + 1));
                    }}
                    className={currentPage === totalPages ? "pointer-events-none opacity-50" : ""}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          )}

          {!loading && users.length === 0 && (
            <div className="text-center py-8">
              <Users className="mx-auto h-12 w-12 text-muted-foreground/50" />
              <h3 className="mt-4 text-lg font-semibold">No users found</h3>
              <p className="text-muted-foreground">
                Try adjusting your search or filter criteria.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
      
      <AlertDialog open={!!userToDelete} onOpenChange={(isOpen) => !isOpen && setUserToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the user <strong className="font-bold">{userToDelete?.name}</strong>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteUser}
              disabled={isDeletingUser}
              className="bg-destructive hover:bg-destructive/90"
            >
              {isDeletingUser ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={!!userToEdit} onOpenChange={(isOpen) => !isOpen && setUserToEdit(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>Update the user's details below.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-firstname">First Name</Label>
                <Input
                  id="edit-firstname"
                  value={userToEdit?.firstName || ''}
                  onChange={(e) => setUserToEdit(prev => prev ? { ...prev, firstName: e.target.value } : null)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-lastname">Last Name</Label>
                <Input
                  id="edit-lastname"
                  value={userToEdit?.lastName || ''}
                  onChange={(e) => setUserToEdit(prev => prev ? { ...prev, lastName: e.target.value } : null)}
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-email">Email</Label>
              <Input id="edit-email" value={userToEdit?.email || ''} disabled />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-role">Role</Label>
              <Select
                value={userToEdit?.role}
                onValueChange={(value: 'student' | 'teacher' | 'admin') =>
                  setUserToEdit(prev => prev ? { ...prev, role: value } : null)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="student">Student</SelectItem>
                  <SelectItem value="teacher">Teacher</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {userToEdit?.role === 'student' && (
              <div className="grid gap-2">
                <Label htmlFor="edit-grade">Grade</Label>
                <Select
                  value={userToEdit.grade || ''}
                  onValueChange={(value) => setUserToEdit(prev => prev ? { ...prev, grade: value } : null)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a grade" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1st Grade</SelectItem>
                    <SelectItem value="2">2nd Grade</SelectItem>
                    <SelectItem value="3">3rd Grade</SelectItem>
                    <SelectItem value="4">4th Grade</SelectItem>
                    <SelectItem value="5">5th Grade</SelectItem>
                    <SelectItem value="6">6th Grade</SelectItem>
                    <SelectItem value="7">7th Grade</SelectItem>
                    <SelectItem value="8">8th Grade</SelectItem>
                    <SelectItem value="9">9th Grade</SelectItem>
                    <SelectItem value="10">10th Grade</SelectItem>
                    <SelectItem value="11">11th Grade</SelectItem>
                    <SelectItem value="12">12th Grade</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            {userToEdit?.role === 'teacher' && (
              <div className="grid gap-2">
                <Label htmlFor="edit-teacherid">Teacher ID</Label>
                <Input
                  id="edit-teacherid"
                  value={userToEdit.teacherId || ''}
                  onChange={(e) => setUserToEdit(prev => prev ? { ...prev, teacherId: e.target.value } : null)}
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUserToEdit(null)}>Cancel</Button>
            <Button onClick={handleUpdateUser} disabled={isUpdatingUser}>
              {isUpdatingUser ? "Updating..." : "Update User"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
