
import React, { useState, useCallback, useEffect, useRef } from 'react';
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
import { Search, Plus, Users, GraduationCap, BookOpen, MoreHorizontal, Edit, Trash2, Shield, Upload, Download, FileSpreadsheet } from 'lucide-react';
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
import { PaginationControls } from '@/components/ui/PaginationControls';
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
  role: 'student' | 'teacher' | 'admin' | 'content_creator' | 'super_user' | 'view_only';
  status: 'active' | 'inactive' | 'unverified';
  joinedDate: string;
  lastActive: string;
  grade?: string;
  teacherId?: string;
  avatar_url?: string;
  gender?: string;
  schoolName?: string;
  project?: string;
  city?: string;
}

const initialNewUserState = {
  firstName: '',
  lastName: '',
  email: '',
  role: 'student' as 'student' | 'teacher' | 'admin' | 'content_creator' | 'view_only',
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

// Helper function to format role names for display
const formatRoleName = (role: string): string => {
  return role
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

export const UsersManagement = () => {
  console.log('🚀 UsersManagement: Component mounted/rendered');
  
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  
  // Add abort controller for request cancellation
  const abortControllerRef = useRef<AbortController | null>(null);

  const [newUser, setNewUser] = useState(initialNewUserState);
  const [validationErrors, setValidationErrors] = useState(initialValidationErrors);
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [isDeletingUser, setIsDeletingUser] = useState(false);
  const [userToEdit, setUserToEdit] = useState<User | null>(null);
  const [editValidationErrors, setEditValidationErrors] = useState(initialValidationErrors);
  const [isUpdatingUser, setIsUpdatingUser] = useState(false);
  
  // Bulk upload state
  const [isBulkUploadModalOpen, setIsBulkUploadModalOpen] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<any>(null);

  // Bulk upload with passwords state
  const [isBulkUploadWithPasswordsModalOpen, setIsBulkUploadWithPasswordsModalOpen] = useState(false);
  const [uploadedPasswordFile, setUploadedPasswordFile] = useState<File | null>(null);
  const [isUploadingWithPasswords, setIsUploadingWithPasswords] = useState(false);
  const [uploadPasswordResult, setUploadPasswordResult] = useState<any>(null);


  const [uploadProgress, setUploadProgress] = useState(0);
  
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(8); // Consistent with list view default
  const [totalUsers, setTotalUsers] = useState(0);
  const [stats, setStats] = useState({
    students: 0,
    teachers: 0,
    admins: 0,
    content_creators: 0,
    view_only: 0,
  });
  const [loadingStats, setLoadingStats] = useState(true);
  
  const totalPages = Math.ceil(totalUsers / rowsPerPage);

  const handleItemsPerPageChange = (newRowsPerPage: number) => {
    setRowsPerPage(newRowsPerPage);
    setCurrentPage(1); // Reset to first page when changing items per page
  };

  const fetchStats = useCallback(async () => {
    setLoadingStats(true);
    try {
      const [
        { count: students, error: studentsError },
        { count: teachers, error: teachersError },
        { count: admins, error: adminsError },
        { count: content_creators, error: contentCreatorsError },
        { count: view_only, error: viewOnlyError }
      ] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'student'),
        supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'teacher'),
        supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'admin'),
        supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'content_creator'),
        supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'view_only')
      ]);

      if (studentsError || teachersError || adminsError || contentCreatorsError || viewOnlyError) {
        throw studentsError || teachersError || adminsError || contentCreatorsError || viewOnlyError;
      }
      
      setStats({
        students: students || 0,
        teachers: teachers || 0,
        admins: admins || 0,
        content_creators: content_creators || 0,
        view_only: view_only || 0,
      });

    } catch (error: any) {
      // Only show error toast if it's not a cancellation
      if (error.name !== 'AbortError') {
        toast.error("Failed to load statistics.", { description: error.message });
        console.error("Error fetching stats:", error);
      }
    } finally {
      setLoadingStats(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  // Cleanup effect to cancel ongoing requests
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const fetchUsers = useCallback(async () => {
    console.log('🔍 UsersManagement: fetchUsers called');
    console.log('🔍 UsersManagement: Params:', { currentPage, rowsPerPage, searchTerm, roleFilter });
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
      
      console.log('🔍 UsersManagement: get-users response:', { data, error });
      
      if (error) throw new Error(error.message);
      
      const { users: fetchedUsers, count } = data;
      console.log('🔍 UsersManagement: Fetched users count:', count, 'Users:', fetchedUsers?.length);

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
          lastActive: user.last_active_at || null,
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
      // Only show error toast if it's not a cancellation
      if (error.name !== 'AbortError') {
        toast.error("Failed to fetch user data.", {
          description: error.message,
        });
        console.error("Error fetching users:", error);
      }
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
          redirectTo: `${window.location.origin}/dashboard/profile-settings?source=reset`,
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
      
      // Refresh data with proper error handling and coordination
      try {
        setLoading(true);
        setLoadingStats(true);
        
        // Add a small delay to prevent rapid successive requests
        await new Promise(resolve => setTimeout(resolve, 100));
        
        await Promise.all([fetchUsers(), fetchStats()]);
      } catch (error) {
        console.error("Error refreshing data after user deletion:", error);
        // Don't show error toast here as the deletion was successful
      } finally {
        setTimeout(() => {
          setLoading(false);
          setLoadingStats(false);
        }, 500);
      }
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
      
      // Refresh user list with proper error handling
      try {
        setLoading(true);
        
        // Add a small delay to prevent rapid successive requests
        await new Promise(resolve => setTimeout(resolve, 100));
        
        await fetchUsers();
      } catch (error) {
        console.error("Error refreshing data after user update:", error);
        // Don't show error toast here as the update was successful
      } finally {
        setTimeout(() => {
          setLoading(false);
        }, 500);
      }
    } catch (error: any) {
      toast.error("Failed to update user.", { description: error.message });
    } finally {
      setIsUpdatingUser(false);
    }
  };

  const handleResetPassword = async (user: User) => {
    try {
      console.log("🔍 DEBUG: Starting password reset for user:", user.email);
      
      const { data, error } = await supabase.functions.invoke('reset-user-password', {
        body: { email: user.email },
      });

      console.log("🔍 DEBUG: Supabase function response:", { data, error });

      if (error) {
        console.log("🔍 DEBUG: Error object structure:", {
          message: error.message,
          context: error.context,
          details: error.details,
          status: error.status,
          statusText: error.statusText
        });
        
        // Handle Supabase function errors
        let errorMessage = "Failed to send reset link.";
        let errorDescription = error.message;
        
        // Try to extract the actual error from the response body
        if (error.context && error.context instanceof Response) {
          try {
            console.log("🔍 DEBUG: Attempting to read response body from context");
            const responseText = await error.context.text();
            console.log("🔍 DEBUG: Response body text:", responseText);
            
            const errorData = JSON.parse(responseText);
            console.log("🔍 DEBUG: Parsed error data:", errorData);
            
            if (errorData.error) {
              errorDescription = errorData.error;
              console.log("🔍 DEBUG: Using extracted error from response body:", errorDescription);
            }
          } catch (parseError) {
            console.log("🔍 DEBUG: Failed to parse response body:", parseError);
          }
        }
        
        // Check if the error contains the rate limiting message
        if (errorDescription?.includes("For security purposes, you can only request this after")) {
          errorMessage = "Rate limit exceeded";
          errorDescription = "Please wait a moment before requesting another password reset. This is a security measure to prevent spam.";
        } else if (errorDescription?.includes("Email is required")) {
          errorMessage = "Invalid request";
          errorDescription = "Email address is required to send the reset link.";
        } else if (errorDescription?.includes("User not found")) {
          errorMessage = "User not found";
          errorDescription = "No user found with this email address.";
        }
        
        console.log("🔍 DEBUG: Showing error toast:", { errorMessage, errorDescription });
        toast.error(errorMessage, { description: errorDescription });
        return;
      }

      console.log("🔍 DEBUG: Password reset successful");
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
      console.error("🔍 DEBUG: Catch block error:", error);
      console.log("🔍 DEBUG: Error object structure in catch:", {
        message: error.message,
        context: error.context,
        details: error.details,
        status: error.status,
        statusText: error.statusText,
        stack: error.stack
      });
      
      // Handle network or other errors
      let errorMessage = "Failed to send reset link.";
      let errorDescription = error.message;
      
      // Check if it's a Supabase function error with JSON response
      if (error.message?.includes("Edge Function returned a non-2xx status code")) {
        console.log("🔍 DEBUG: Detected Edge Function error, trying to extract details");
        
        // Try to extract the actual error from the response
        try {
          // The error might be in error.context or error.details
          const errorData = error.context || error.details || {};
          console.log("🔍 DEBUG: Error data extracted:", errorData);
          
          if (errorData.error) {
            errorDescription = errorData.error;
            console.log("🔍 DEBUG: Using extracted error:", errorDescription);
          }
        } catch (parseError) {
          console.log("🔍 DEBUG: Failed to parse error data:", parseError);
          // If parsing fails, use the original message
          errorDescription = error.message;
        }
      }
      
      // Handle specific error messages with user-friendly descriptions
      if (errorDescription?.includes("For security purposes, you can only request this after")) {
        errorMessage = "Rate limit exceeded";
        errorDescription = "Please wait a moment before requesting another password reset. This is a security measure to prevent spam.";
        console.log("🔍 DEBUG: Detected rate limit error, showing user-friendly message");
      } else if (errorDescription?.includes("Email is required")) {
        errorMessage = "Invalid request";
        errorDescription = "Email address is required to send the reset link.";
      } else if (errorDescription?.includes("User not found")) {
        errorMessage = "User not found";
        errorDescription = "No user found with this email address.";
      }
      
      console.log("🔍 DEBUG: Final error toast:", { errorMessage, errorDescription });
      toast.error(errorMessage, { description: errorDescription });
    }
  };

  // Bulk upload functions
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.name.endsWith('.xlsx')) {
        setUploadedFile(file);
        setUploadResult(null);
      } else {
        toast.error("Invalid file format", { description: "Please upload an XLSX file." });
      }
    }
    // Reset the input value to allow selecting the same file again
    event.target.value = '';
  };

  const handleBulkUpload = async () => {
    if (!uploadedFile) {
      toast.error("No file selected", { description: "Please select a file to upload." });
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      const formData = new FormData();
      formData.append('file', uploadedFile);

      let responseData = null;
      let supabaseError = null;
      
      try {
        const { data, error } = await supabase.functions.invoke('bulk-upload-users', {
          body: formData,
        });

        if (error) {
          supabaseError = error;
          // Try to extract response data from error object
          try {
            if (error.context instanceof Response) {
              const responseText = await error.context.clone().text();
              const parsed = JSON.parse(responseText);
              if (parsed.errors) {
                responseData = parsed;
              } else if (parsed.error && typeof parsed.error === 'string') {
                // Check if error field contains nested parsing errors
                const wrappedMatch = parsed.error.match(/Failed to parse XLSX file: (.+)/);
                if (wrappedMatch) {
                  try {
                    const nestedParsed = JSON.parse(wrappedMatch[1]);
                    if (nestedParsed.parsingErrors) {
                      responseData = {
                        success: false,
                        totalRows: 0,
                        createdUsers: 0,
                        errors: nestedParsed.parsingErrors,
                        message: 'Validation failed: Missing required fields'
                      };
                    }
                  } catch {
                    // Not a parsing error
                  }
                }
              }
            } else if (error.message) {
              try {
                // Try direct parse first
                const parsed = JSON.parse(error.message);
                if (parsed.errors || parsed.parsingErrors) {
                  responseData = parsed.errors ? parsed : { errors: parsed.parsingErrors, success: false, totalRows: 0, createdUsers: 0, message: 'Validation failed: Missing required fields' };
                }
              } catch {
                // If direct parse fails, check if it's wrapped in error message
                // e.g., "Failed to parse XLSX file: {\"parsingErrors\":[...]}"
                const wrappedMatch = error.message.match(/Failed to parse XLSX file: (.+)/);
                if (wrappedMatch) {
                  try {
                    const nestedParsed = JSON.parse(wrappedMatch[1]);
                    if (nestedParsed.parsingErrors || nestedParsed.errors) {
                      responseData = nestedParsed.errors 
                        ? nestedParsed 
                        : { errors: nestedParsed.parsingErrors, success: false, totalRows: 0, createdUsers: 0, message: 'Validation failed: Missing required fields' };
                    }
                  } catch {
                    // Not JSON, continue with normal error handling
                  }
                }
              }
            }
          } catch {
            // Continue with normal error handling
          }
        } else {
          responseData = data;
        }
      } catch (caughtError: any) {
        console.log('=== CAUGHT ERROR DEBUG ===');
        console.log('Caught error:', caughtError);
        console.log('Error context:', caughtError.context);
        console.log('Error status:', caughtError.status);
        console.log('Error response:', caughtError.response);
        console.log('Error message:', caughtError.message);
        console.log('=== END CAUGHT ERROR ===');
        
        supabaseError = caughtError;
        
        // Try to extract response data from caught error
        try {
          if (caughtError.context instanceof Response) {
            const responseText = await caughtError.context.clone().text();
            const parsed = JSON.parse(responseText);
            if (parsed.errors) {
              responseData = parsed;
            } else if (parsed.error && typeof parsed.error === 'string') {
              // Check if error field contains nested parsing errors
              const wrappedMatch = parsed.error.match(/Failed to parse XLSX file: (.+)/);
              if (wrappedMatch) {
                try {
                  const nestedParsed = JSON.parse(wrappedMatch[1]);
                  if (nestedParsed.parsingErrors) {
                    responseData = {
                      success: false,
                      totalRows: 0,
                      createdUsers: 0,
                      errors: nestedParsed.parsingErrors,
                      message: 'Validation failed: Missing required fields'
                    };
                  }
                } catch {
                  // Not a parsing error
                }
              }
            }
          } else if (caughtError.message) {
            try {
              // Try direct parse first
              const parsed = JSON.parse(caughtError.message);
              if (parsed.errors || parsed.parsingErrors) {
                responseData = parsed.errors ? parsed : { errors: parsed.parsingErrors, success: false, totalRows: 0, createdUsers: 0, message: 'Validation failed: Missing required fields' };
              }
            } catch {
              // If direct parse fails, check if it's wrapped in error message
              const wrappedMatch = caughtError.message.match(/Failed to parse XLSX file: (.+)/);
              if (wrappedMatch) {
                try {
                  const nestedParsed = JSON.parse(wrappedMatch[1]);
                  if (nestedParsed.parsingErrors || nestedParsed.errors) {
                    responseData = nestedParsed.errors 
                      ? nestedParsed 
                      : { errors: nestedParsed.parsingErrors, success: false, totalRows: 0, createdUsers: 0, message: 'Validation failed: Missing required fields' };
                  }
                } catch {
                  // Not JSON, continue
                }
              }
            }
          }
        } catch {
          // Continue with normal error handling
        }
      }

      // If we have response data, process it
      if (responseData) {
        // Check if responseData has an error field with nested parsing errors
        if (responseData.error && typeof responseData.error === 'string') {
          const wrappedMatch = responseData.error.match(/Failed to parse XLSX file: (.+)/);
          if (wrappedMatch) {
            try {
              const nestedParsed = JSON.parse(wrappedMatch[1]);
              if (nestedParsed.parsingErrors) {
                responseData = {
                  success: false,
                  totalRows: 0,
                  createdUsers: 0,
                  errors: nestedParsed.parsingErrors,
                  message: 'Validation failed: Missing required fields'
                };
              }
            } catch {
              // Not a parsing error, continue with original responseData
            }
          }
        }
        
        setUploadResult(responseData);
        
        if (responseData.createdUsers > 0) {
          setLoading(true);
          setLoadingStats(true);
          await Promise.all([fetchUsers(), fetchStats()]);
          setTimeout(() => {
            setLoading(false);
            setLoadingStats(false);
          }, 500);
        }
        
        if (responseData.success === true) {
          toast.success("Bulk upload completed!", { 
            description: `Successfully created ${responseData.createdUsers} users. User list has been refreshed.` 
          });
          
          if (currentUser) {
            await AccessLogService.logUserManagementAction(
              currentUser.id,
              currentUser.email || 'unknown@email.com',
              'user_created',
              undefined,
              'multiple',
              {
                total_rows: responseData.totalRows,
                created_users: responseData.createdUsers,
                file_name: uploadedFile.name
              }
            );
          }
          
          setIsBulkUploadModalOpen(false);
          setUploadedFile(null);
          setUploadResult(null);
        } else {
          toast.error("Upload completed with errors", { 
            description: `Created ${responseData.createdUsers} users with ${responseData.errors?.length || 0} errors.` 
          });
        }
      } else if (supabaseError) {
        // Try to extract response data from error context
        try {
          if (supabaseError.context instanceof Response) {
            const responseText = await supabaseError.context.clone().text();
            responseData = JSON.parse(responseText);
          } else if (typeof supabaseError.context === 'string') {
            responseData = JSON.parse(supabaseError.context);
          } else if (supabaseError.context && typeof supabaseError.context === 'object') {
            responseData = supabaseError.context;
          } else if (supabaseError.message) {
            try {
              // Try direct parse first
              const parsed = JSON.parse(supabaseError.message);
              if (parsed.errors || parsed.parsingErrors) {
                responseData = parsed.errors ? parsed : { errors: parsed.parsingErrors, success: false, totalRows: 0, createdUsers: 0, message: 'Validation failed: Missing required fields' };
              }
            } catch {
              // If direct parse fails, check if it's wrapped in error message
              const wrappedMatch = supabaseError.message.match(/Failed to parse XLSX file: (.+)/);
              if (wrappedMatch) {
                try {
                  const nestedParsed = JSON.parse(wrappedMatch[1]);
                  if (nestedParsed.parsingErrors || nestedParsed.errors) {
                    responseData = nestedParsed.errors 
                      ? nestedParsed 
                      : { errors: nestedParsed.parsingErrors, success: false, totalRows: 0, createdUsers: 0, message: 'Validation failed: Missing required fields' };
                  }
                } catch {
                  // Not JSON, continue
                }
              }
            }
          }
        } catch (parseError) {
          // Failed to parse error context
        }
        
        if (responseData && responseData.errors) {
          setUploadResult(responseData);
          const errorCount = responseData.errors?.length || 0;
          toast.error("Upload failed with validation errors", { 
            description: errorCount > 0 
              ? `Found ${errorCount} validation error${errorCount > 1 ? 's' : ''}. Please fix them and try again.`
              : 'Please check the errors and try again.'
          });
        } else {
          throw supabaseError;
        }
      }
    } catch (error: any) {
      // Try to extract response data from the error
      let responseData = null;
      try {
        if (error.context instanceof Response) {
          const responseText = await error.context.clone().text();
          const parsed = JSON.parse(responseText);
          if (parsed.errors) {
            responseData = parsed;
          } else if (parsed.error && typeof parsed.error === 'string') {
            // Check if error field contains nested parsing errors
            const wrappedMatch = parsed.error.match(/Failed to parse XLSX file: (.+)/);
            if (wrappedMatch) {
              try {
                const nestedParsed = JSON.parse(wrappedMatch[1]);
                if (nestedParsed.parsingErrors) {
                  responseData = {
                    success: false,
                    totalRows: 0,
                    createdUsers: 0,
                    errors: nestedParsed.parsingErrors,
                    message: 'Validation failed: Missing required fields'
                  };
                }
              } catch {
                // Not a parsing error
              }
            }
          } else {
            responseData = parsed;
          }
        } else if (error.context) {
          if (typeof error.context === 'string') {
            responseData = JSON.parse(error.context);
          } else if (error.context && typeof error.context === 'object') {
            responseData = error.context;
          }
        } else if (error.message) {
          try {
            // Try direct parse first
            const parsed = JSON.parse(error.message);
            if (parsed.errors || parsed.parsingErrors) {
              responseData = parsed.errors ? parsed : { errors: parsed.parsingErrors, success: false, totalRows: 0, createdUsers: 0, message: 'Validation failed: Missing required fields' };
            }
          } catch {
            // If direct parse fails, check if it's wrapped in error message
            const wrappedMatch = error.message.match(/Failed to parse XLSX file: (.+)/);
            if (wrappedMatch) {
              try {
                const nestedParsed = JSON.parse(wrappedMatch[1]);
                if (nestedParsed.parsingErrors || nestedParsed.errors) {
                  responseData = nestedParsed.errors 
                    ? nestedParsed 
                    : { errors: nestedParsed.parsingErrors, success: false, totalRows: 0, createdUsers: 0, message: 'Validation failed: Missing required fields' };
                }
              } catch {
                // Not JSON, continue
              }
            }
          }
        }
      } catch (parseError) {
        // Failed to parse error context
      }
      
      if (responseData && responseData.errors) {
        setUploadResult(responseData);
        const errorCount = responseData.errors?.length || 0;
        toast.error("Upload failed with validation errors", { 
          description: errorCount > 0 
            ? `Found ${errorCount} validation error${errorCount > 1 ? 's' : ''}. Please fix them and try again.`
            : 'Please check the errors and try again.'
        });
      } else {
        toast.error("Upload failed", { description: error.message || 'An unexpected error occurred' });
      }
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const downloadTemplate = () => {
    const xlsxUrl = import.meta.env.VITE_BULK_UPLOAD_XLSX_TEMPLATE_URL;
    
    if (xlsxUrl) {
      const link = document.createElement('a');
      link.href = xlsxUrl;
      link.download = 'bulk-upload-template.xlsx';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      toast.error("Template not available", { description: "Template URL not configured." });
    }
  };

  const downloadPasswordTemplate = () => {
    const xlsxUrl = import.meta.env.VITE_BULK_UPLOAD_PASSWORD_XLSX_TEMPLATE_URL;
    
    if (xlsxUrl) {
      const link = document.createElement('a');
      link.href = xlsxUrl;
      link.download = 'bulk-upload-password-template.xlsx';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      toast.error("Template not available", { description: "Password template URL not configured." });
    }
  };

  // Bulk upload with passwords functions
  const handlePasswordFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.name.endsWith('.xlsx')) {
        setUploadedPasswordFile(file);
        setUploadPasswordResult(null);
      } else {
        toast.error("Invalid file format", { description: "Please upload an XLSX file." });
      }
    }
    // Reset the input value to allow selecting the same file again
    event.target.value = '';
  };

  const handleBulkUploadWithPasswords = async () => {
    if (!uploadedPasswordFile) {
      toast.error("No file selected", { description: "Please select a file to upload." });
      return;
    }

    setIsUploadingWithPasswords(true);
    setUploadProgress(0);

    try {
      const formData = new FormData();
      formData.append('file', uploadedPasswordFile);

      let responseData = null;
      let supabaseError = null;
      
      try {
        const { data, error } = await supabase.functions.invoke('bulk-upload-users-with-passwords', {
          body: formData,
        });

        if (error) {
          supabaseError = error;
          // Try to extract response data from error object
          try {
            if (error.context instanceof Response) {
              const responseText = await error.context.clone().text();
              const parsed = JSON.parse(responseText);
              if (parsed.errors) {
                responseData = parsed;
              } else if (parsed.error && typeof parsed.error === 'string') {
                // Check if error field contains nested parsing errors
                const wrappedMatch = parsed.error.match(/Failed to parse XLSX file: (.+)/);
                if (wrappedMatch) {
                  try {
                    const nestedParsed = JSON.parse(wrappedMatch[1]);
                    if (nestedParsed.parsingErrors) {
                      responseData = {
                        success: false,
                        totalRows: 0,
                        createdUsers: 0,
                        errors: nestedParsed.parsingErrors,
                        message: 'Validation failed: Missing required fields'
                      };
                    }
                  } catch {
                    // Not a parsing error
                  }
                }
              }
            } else if (error.message) {
              try {
                // Try direct parse first
                const parsed = JSON.parse(error.message);
                if (parsed.errors || parsed.parsingErrors) {
                  responseData = parsed.errors ? parsed : { errors: parsed.parsingErrors, success: false, totalRows: 0, createdUsers: 0, message: 'Validation failed: Missing required fields' };
                }
              } catch {
                // If direct parse fails, check if it's wrapped in error message
                // e.g., "Failed to parse XLSX file: {\"parsingErrors\":[...]}"
                const wrappedMatch = error.message.match(/Failed to parse XLSX file: (.+)/);
                if (wrappedMatch) {
                  try {
                    const nestedParsed = JSON.parse(wrappedMatch[1]);
                    if (nestedParsed.parsingErrors || nestedParsed.errors) {
                      responseData = nestedParsed.errors 
                        ? nestedParsed 
                        : { errors: nestedParsed.parsingErrors, success: false, totalRows: 0, createdUsers: 0, message: 'Validation failed: Missing required fields' };
                    }
                  } catch {
                    // Not JSON, continue with normal error handling
                  }
                }
              }
            }
          } catch {
            // Continue with normal error handling
          }
        } else {
          responseData = data;
        }
      } catch (caughtError: any) {
        console.log('=== CAUGHT ERROR DEBUG (WITH PASSWORDS) ===');
        console.log('Caught error:', caughtError);
        console.log('Error context:', caughtError.context);
        console.log('Error status:', caughtError.status);
        console.log('Error response:', caughtError.response);
        console.log('Error message:', caughtError.message);
        console.log('=== END CAUGHT ERROR ===');
        
        supabaseError = caughtError;
        
        // Try to extract response data from caught error
        try {
          if (caughtError.context instanceof Response) {
            const responseText = await caughtError.context.clone().text();
            const parsed = JSON.parse(responseText);
            if (parsed.errors) {
              responseData = parsed;
            } else if (parsed.error && typeof parsed.error === 'string') {
              // Check if error field contains nested parsing errors
              const wrappedMatch = parsed.error.match(/Failed to parse XLSX file: (.+)/);
              if (wrappedMatch) {
                try {
                  const nestedParsed = JSON.parse(wrappedMatch[1]);
                  if (nestedParsed.parsingErrors) {
                    responseData = {
                      success: false,
                      totalRows: 0,
                      createdUsers: 0,
                      errors: nestedParsed.parsingErrors,
                      message: 'Validation failed: Missing required fields'
                    };
                  }
                } catch {
                  // Not a parsing error
                }
              }
            }
          } else if (caughtError.message) {
            try {
              // Try direct parse first
              const parsed = JSON.parse(caughtError.message);
              if (parsed.errors || parsed.parsingErrors) {
                responseData = parsed.errors ? parsed : { errors: parsed.parsingErrors, success: false, totalRows: 0, createdUsers: 0, message: 'Validation failed: Missing required fields' };
              }
            } catch {
              // If direct parse fails, check if it's wrapped in error message
              const wrappedMatch = caughtError.message.match(/Failed to parse XLSX file: (.+)/);
              if (wrappedMatch) {
                try {
                  const nestedParsed = JSON.parse(wrappedMatch[1]);
                  if (nestedParsed.parsingErrors || nestedParsed.errors) {
                    responseData = nestedParsed.errors 
                      ? nestedParsed 
                      : { errors: nestedParsed.parsingErrors, success: false, totalRows: 0, createdUsers: 0, message: 'Validation failed: Missing required fields' };
                  }
                } catch {
                  // Not JSON, continue
                }
              }
            }
          }
        } catch {
          // Continue with normal error handling
        }
      }

      // Process response data similar to existing bulk upload
      if (responseData) {
        // Check if responseData has an error field with nested parsing errors
        if (responseData.error && typeof responseData.error === 'string') {
          const wrappedMatch = responseData.error.match(/Failed to parse XLSX file: (.+)/);
          if (wrappedMatch) {
            try {
              const nestedParsed = JSON.parse(wrappedMatch[1]);
              if (nestedParsed.parsingErrors) {
                responseData = {
                  success: false,
                  totalRows: 0,
                  createdUsers: 0,
                  errors: nestedParsed.parsingErrors,
                  message: 'Validation failed: Missing required fields'
                };
              }
            } catch {
              // Not a parsing error, continue with original responseData
            }
          }
        }
        
        setUploadPasswordResult(responseData);
        
        if (responseData.createdUsers > 0) {
          setLoading(true);
          setLoadingStats(true);
          await Promise.all([fetchUsers(), fetchStats()]);
          setTimeout(() => {
            setLoading(false);
            setLoadingStats(false);
          }, 500);
        }
        
        if (responseData.success === true) {
          toast.success("Bulk upload with passwords completed!", { 
            description: `Successfully created ${responseData.createdUsers} users with passwords. User list has been refreshed.` 
          });
          
          if (currentUser) {
            await AccessLogService.logUserManagementAction(
              currentUser.id,
              currentUser.email || 'unknown@email.com',
              'user_created',
              undefined,
              'multiple',
              {
                total_rows: responseData.totalRows,
                created_users: responseData.createdUsers,
                file_name: uploadedPasswordFile.name,
                upload_type: 'bulk_with_passwords'
              }
            );
          }
          
          setIsBulkUploadWithPasswordsModalOpen(false);
          setUploadedPasswordFile(null);
          setUploadPasswordResult(null);
        } else {
          toast.error("Upload completed with errors", { 
            description: `Created ${responseData.createdUsers} users with ${responseData.errors?.length || 0} errors.` 
          });
        }
      } else if (supabaseError) {
        // Try to extract response data from error context
        try {
          if (supabaseError.context instanceof Response) {
            const responseText = await supabaseError.context.clone().text();
            responseData = JSON.parse(responseText);
          } else if (typeof supabaseError.context === 'string') {
            responseData = JSON.parse(supabaseError.context);
          } else if (supabaseError.context && typeof supabaseError.context === 'object') {
            responseData = supabaseError.context;
          } else if (supabaseError.message) {
            try {
              // Try direct parse first
              const parsed = JSON.parse(supabaseError.message);
              if (parsed.errors || parsed.parsingErrors) {
                responseData = parsed.errors ? parsed : { errors: parsed.parsingErrors, success: false, totalRows: 0, createdUsers: 0, message: 'Validation failed: Missing required fields' };
              }
            } catch {
              // If direct parse fails, check if it's wrapped in error message
              const wrappedMatch = supabaseError.message.match(/Failed to parse XLSX file: (.+)/);
              if (wrappedMatch) {
                try {
                  const nestedParsed = JSON.parse(wrappedMatch[1]);
                  if (nestedParsed.parsingErrors || nestedParsed.errors) {
                    responseData = nestedParsed.errors 
                      ? nestedParsed 
                      : { errors: nestedParsed.parsingErrors, success: false, totalRows: 0, createdUsers: 0, message: 'Validation failed: Missing required fields' };
                  }
                } catch {
                  // Not JSON, continue
                }
              }
            }
          }
        } catch (parseError) {
          // Failed to parse error context
        }
        
        if (responseData && responseData.errors) {
          setUploadPasswordResult(responseData);
          const errorCount = responseData.errors?.length || 0;
          toast.error("Upload failed with validation errors", { 
            description: errorCount > 0 
              ? `Found ${errorCount} validation error${errorCount > 1 ? 's' : ''}. Please fix them and try again.`
              : 'Please check the errors and try again.'
          });
        } else {
          throw supabaseError;
        }
      }
    } catch (error: any) {
      // Try to extract response data from the error
      let responseData = null;
      try {
        if (error.context instanceof Response) {
          const responseText = await error.context.clone().text();
          const parsed = JSON.parse(responseText);
          if (parsed.errors) {
            responseData = parsed;
          } else if (parsed.error && typeof parsed.error === 'string') {
            // Check if error field contains nested parsing errors
            const wrappedMatch = parsed.error.match(/Failed to parse XLSX file: (.+)/);
            if (wrappedMatch) {
              try {
                const nestedParsed = JSON.parse(wrappedMatch[1]);
                if (nestedParsed.parsingErrors) {
                  responseData = {
                    success: false,
                    totalRows: 0,
                    createdUsers: 0,
                    errors: nestedParsed.parsingErrors,
                    message: 'Validation failed: Missing required fields'
                  };
                }
              } catch {
                // Not a parsing error
              }
            }
          } else {
            responseData = parsed;
          }
        } else if (error.context) {
          if (typeof error.context === 'string') {
            responseData = JSON.parse(error.context);
          } else if (error.context && typeof error.context === 'object') {
            responseData = error.context;
          }
        } else if (error.message) {
          try {
            // Try direct parse first
            const parsed = JSON.parse(error.message);
            if (parsed.errors || parsed.parsingErrors) {
              responseData = parsed.errors ? parsed : { errors: parsed.parsingErrors, success: false, totalRows: 0, createdUsers: 0, message: 'Validation failed: Missing required fields' };
            }
          } catch {
            // If direct parse fails, check if it's wrapped in error message
            const wrappedMatch = error.message.match(/Failed to parse XLSX file: (.+)/);
            if (wrappedMatch) {
              try {
                const nestedParsed = JSON.parse(wrappedMatch[1]);
                if (nestedParsed.parsingErrors || nestedParsed.errors) {
                  responseData = nestedParsed.errors 
                    ? nestedParsed 
                    : { errors: nestedParsed.parsingErrors, success: false, totalRows: 0, createdUsers: 0, message: 'Validation failed: Missing required fields' };
                }
              } catch {
                // Not JSON, continue
              }
            }
          }
        }
      } catch (parseError) {
        // Failed to parse error context
      }
      
      if (responseData && responseData.errors) {
        setUploadPasswordResult(responseData);
        const errorCount = responseData.errors?.length || 0;
        toast.error("Upload failed with validation errors", { 
          description: errorCount > 0 
            ? `Found ${errorCount} validation error${errorCount > 1 ? 's' : ''}. Please fix them and try again.`
            : 'Please check the errors and try again.'
        });
      } else {
        toast.error("Upload failed", { description: error.message || 'An unexpected error occurred' });
      }
    } finally {
      setIsUploadingWithPasswords(false);
      setUploadProgress(0);
    }
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'admin': return 'destructive';
      case 'teacher': return 'default';
      case 'student': return 'blue';
      case 'content_creator': return 'outline';
      case 'super_user': return 'destructive'; // Keep for display if super_user exists
      case 'view_only': return 'info'; // Better contrast with blue background and white text
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
        <div className="relative p-4 sm:p-6 md:p-8 rounded-3xl">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-primary/10 to-primary/20 rounded-2xl flex items-center justify-center flex-shrink-0">
                <Users className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight bg-gradient-to-r from-primary via-primary to-primary/80 bg-clip-text text-transparent leading-tight break-words">
                  Users Management
                </h1>
                <p className="text-sm sm:text-base md:text-lg text-muted-foreground font-light break-words">
                  Manage all users in the system
                </p>
              </div>
            </div>
            
            <div className="flex gap-2 sm:gap-3 w-full sm:w-auto flex-shrink-0">
              <Dialog open={isBulkUploadModalOpen} onOpenChange={setIsBulkUploadModalOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="h-9 sm:h-10 px-2 sm:px-3 md:px-6 rounded-xl shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-0.5 text-xs sm:text-sm flex-shrink-0">
                    <Upload className="sm:mr-2 h-4 w-4" />
                    <span className="hidden sm:inline">Bulk Upload</span>
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[600px] max-h-[80vh] flex flex-col">
                  <DialogHeader>
                    <DialogTitle>Bulk Upload Users</DialogTitle>
                    <DialogDescription>
                      Upload multiple users at once using XLSX files. Download the template first to ensure proper formatting.
                    </DialogDescription>
                    <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="flex items-start gap-2">
                        <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center mt-0.5">
                          <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                          </svg>
                        </div>
                        <div className="text-sm text-blue-800">
                          <p className="font-medium mb-1">Important Note:</p>
                          <p>Maximum <strong>1000 users</strong> allowed per upload. For larger datasets, please split your file into multiple uploads.</p>
                        </div>
                      </div>
                    </div>
                  </DialogHeader>
                  <div className="flex-1 overflow-y-auto pr-2">
                    <div className="space-y-6">
                    {/* Template Downloads */}
                    <div className="space-y-3">
                      <Label className="text-sm font-medium">Download Template</Label>
                      <div className="flex gap-3">
                        <Button 
                          variant="outline" 
                          onClick={downloadTemplate}
                          className="flex-1"
                        >
                          <FileSpreadsheet className="mr-2 h-4 w-4" />
                          Download XLSX Template
                        </Button>
                      </div>
                    </div>

                    {/* File Upload */}
                    <div className="space-y-3">
                      <Label className="text-sm font-medium">Upload File</Label>
                      <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                        <input
                          type="file"
                          accept=".xlsx"
                          onChange={handleFileUpload}
                          className="hidden"
                          id="file-upload"
                        />
                        <label htmlFor="file-upload" className="cursor-pointer">
                          <Upload className="mx-auto h-12 w-12 text-gray-400" />
                          <p className="mt-2 text-sm text-gray-600">
                            Click to upload or drag and drop
                          </p>
                          <p className="text-xs text-gray-500">
                            XLSX files only
                          </p>
                        </label>
                      </div>
                      {uploadedFile && (
                        <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                          <div className="flex items-center gap-2">
                            <FileSpreadsheet className="h-4 w-4 text-green-600" />
                            <span className="text-sm text-green-800">{uploadedFile.name}</span>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setUploadedFile(null)}
                            className="text-red-600 hover:text-red-700"
                          >
                            Remove
                          </Button>
                        </div>
                      )}
                    </div>

                    {/* Upload Results */}
                    {uploadResult && (
                      <div className="space-y-3">
                        <Label className="text-sm font-medium">Upload Results</Label>
                        <div className={`p-4 rounded-lg border ${
                          (uploadResult.success === true) ? 'bg-green-50 border-green-200' : 
                          (uploadResult.createdUsers > 0 && (!uploadResult.errors || uploadResult.errors.length === 0)) ? 'bg-green-50 border-green-200' :
                          uploadResult.createdUsers > 0 ? 'bg-yellow-50 border-yellow-200' : 'bg-red-50 border-red-200'
                        }`}>
                          <div className="flex items-center gap-2 mb-3">
                            {(uploadResult.success === true || (uploadResult.createdUsers > 0 && (!uploadResult.errors || uploadResult.errors.length === 0))) ? (
                              <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                                <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                              </div>
                            ) : uploadResult.createdUsers > 0 ? (
                              <div className="w-5 h-5 bg-yellow-500 rounded-full flex items-center justify-center">
                                <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                </svg>
                              </div>
                            ) : (
                              <div className="w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
                                <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                </svg>
                              </div>
                            )}
                            <span className={`text-sm font-medium ${
                              (uploadResult.success === true || (uploadResult.createdUsers > 0 && (!uploadResult.errors || uploadResult.errors.length === 0))) ? 'text-green-800' : 
                              uploadResult.createdUsers > 0 ? 'text-yellow-800' : 'text-red-800'
                            }`}>
                              {uploadResult.message}
                            </span>
                          </div>
                          <div className="text-sm text-gray-600">
                            <div className="grid grid-cols-2 gap-4 mb-3">
                              <div>
                                <span className="font-medium">Total rows:</span> {uploadResult.totalRows}
                              </div>
                              <div>
                                <span className="font-medium">Created users:</span> {uploadResult.createdUsers}
                              </div>
                              {uploadResult.skippedUsers > 0 && (
                                <div className="col-span-2">
                                  <span className="font-medium text-yellow-600">Skipped users:</span> {uploadResult.skippedUsers} (already exist)
                                </div>
                              )}
                            </div>
                                                        
                            
                                            {/* Always show errors if they exist */}
                {uploadResult.errors && uploadResult.errors.length > 0 && (
                  <div className="mt-4">
                                <div className="flex items-center gap-2 mb-3">
                                  <div className="w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
                                    <svg className="w-2 h-2 text-white" fill="currentColor" viewBox="0 0 20 20">
                                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                    </svg>
                                  </div>
                                  <p className="font-medium text-red-700">Validation Errors ({uploadResult.errors.length})</p>
                                </div>
                                <div className="max-h-48 overflow-y-auto space-y-2 border border-red-200 rounded-lg p-3 bg-red-50">
                                  {uploadResult.errors.map((error: any, index: number) => (
                                    <div key={index} className="flex items-start gap-3 p-3 bg-white rounded border border-red-200 shadow-sm">
                                      <div className="w-2 h-2 bg-red-500 rounded-full mt-1.5 flex-shrink-0"></div>
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                          <span className="text-sm font-semibold text-red-700">
                                            Row {error.row}
                                          </span>
                                          <span className="text-xs text-gray-500">•</span>
                                          <span className="text-sm font-medium text-red-600">
                                            {error.field}
                                          </span>
                                        </div>
                                        <p className="text-sm text-red-600 leading-relaxed">
                                          {error.message}
                                        </p>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                  </div>
                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setIsBulkUploadModalOpen(false);
                        setUploadedFile(null);
                        setUploadResult(null);
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleBulkUpload}
                      disabled={!uploadedFile || isUploading}
                    >
                      {isUploading ? "Uploading..." : "Upload Users"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              <Dialog open={isBulkUploadWithPasswordsModalOpen} onOpenChange={setIsBulkUploadWithPasswordsModalOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="h-9 sm:h-10 px-2 sm:px-3 md:px-6 rounded-xl shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-0.5 text-xs sm:text-sm flex-1 sm:flex-none flex-shrink-0">
                    <Upload className="sm:mr-2 h-4 w-4" />
                    <span className="hidden md:inline">Bulk Upload with Passwords</span>
                    <span className="hidden sm:inline md:hidden">Upload Passwords</span>
                    <span className="sm:hidden">Passwords</span>
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[600px] max-h-[80vh] flex flex-col">
                  <DialogHeader>
                    <DialogTitle>Bulk Upload Users with Passwords</DialogTitle>
                    <DialogDescription>
                      Upload users with predefined passwords. Users will be created as verified with the provided passwords.
                    </DialogDescription>
                    <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                      <div className="flex items-start gap-2">
                        <div className="w-5 h-5 bg-amber-500 rounded-full flex items-center justify-center mt-0.5">
                          <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                          </svg>
                        </div>
                        <div className="text-sm text-amber-800">
                          <p className="font-medium mb-1">Important Notes:</p>
                          <ul className="list-disc list-inside space-y-1">
                            <li>Maximum <strong>1000 users</strong> allowed per upload</li>
                            <li>Users will be created as <strong>verified</strong> with provided passwords</li>
                            <li>No email verification will be sent</li>
                            <li>Required columns: First Name, Last Name, Email Address, Password, Role</li>
                            <li>Optional columns: Class/Grade, Teacher ID, Gender, School Name, Project, City</li>
                            <li>Role values: student, teacher, admin, content_creator, view_only, super_user</li>
                            <li>Students require Class/Grade, Teachers require Teacher ID</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </DialogHeader>
                  <div className="flex-1 overflow-y-auto pr-2">
                    <div className="space-y-6">
                      {/* Template Downloads */}
                      <div className="space-y-3">
                        <Label className="text-sm font-medium">Download Template</Label>
                        <div className="flex gap-3">
                          <Button 
                            variant="outline" 
                            onClick={downloadPasswordTemplate}
                            className="flex-1"
                          >
                            <FileSpreadsheet className="mr-2 h-4 w-4" />
                            Download Template
                          </Button>
                        </div>
                      </div>

                      {/* File Upload */}
                      <div className="space-y-3">
                        <Label className="text-sm font-medium">Upload File</Label>
                        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                          <input
                            type="file"
                            accept=".xlsx"
                            onChange={handlePasswordFileUpload}
                            className="hidden"
                            id="password-file-upload"
                          />
                          <label htmlFor="password-file-upload" className="cursor-pointer">
                            <Upload className="mx-auto h-12 w-12 text-gray-400" />
                            <p className="mt-2 text-sm text-gray-600">
                              Click to upload or drag and drop
                            </p>
                            <p className="text-xs text-gray-500">
                              XLSX files only
                            </p>
                          </label>
                        </div>
                        {uploadedPasswordFile && (
                          <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                            <div className="flex items-center gap-2">
                              <FileSpreadsheet className="h-4 w-4 text-green-600" />
                              <span className="text-sm text-green-800">{uploadedPasswordFile.name}</span>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setUploadedPasswordFile(null)}
                              className="text-red-600 hover:text-red-700"
                            >
                              Remove
                            </Button>
                          </div>
                        )}
                      </div>

                      {/* Upload Results */}
                      {uploadPasswordResult && (
                        <div className="space-y-3">
                          <Label className="text-sm font-medium">Upload Results</Label>
                          <div className={`p-4 rounded-lg border ${
                            (uploadPasswordResult.success === true) ? 'bg-green-50 border-green-200' : 
                            (uploadPasswordResult.createdUsers > 0 && (!uploadPasswordResult.errors || uploadPasswordResult.errors.length === 0)) ? 'bg-green-50 border-green-200' :
                            uploadPasswordResult.createdUsers > 0 ? 'bg-yellow-50 border-yellow-200' : 'bg-red-50 border-red-200'
                          }`}>
                            <div className="flex items-center gap-2 mb-3">
                              {(uploadPasswordResult.success === true || (uploadPasswordResult.createdUsers > 0 && (!uploadPasswordResult.errors || uploadPasswordResult.errors.length === 0))) ? (
                                <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                  </svg>
                                </div>
                              ) : uploadPasswordResult.createdUsers > 0 ? (
                                <div className="w-5 h-5 bg-yellow-500 rounded-full flex items-center justify-center">
                                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                  </svg>
                                </div>
                              ) : (
                                <div className="w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
                                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                  </svg>
                                </div>
                              )}
                              <span className={`text-sm font-medium ${
                                (uploadPasswordResult.success === true || (uploadPasswordResult.createdUsers > 0 && (!uploadPasswordResult.errors || uploadPasswordResult.errors.length === 0))) ? 'text-green-800' : 
                                uploadPasswordResult.createdUsers > 0 ? 'text-yellow-800' : 'text-red-800'
                              }`}>
                                {uploadPasswordResult.message}
                              </span>
                            </div>
                            <div className="text-sm text-gray-600">
                              <div className="grid grid-cols-2 gap-4 mb-3">
                                <div>
                                  <span className="font-medium">Total rows:</span> {uploadPasswordResult.totalRows}
                                </div>
                                <div>
                                  <span className="font-medium">Created users:</span> {uploadPasswordResult.createdUsers}
                                </div>
                                {uploadPasswordResult.skippedUsers > 0 && (
                                  <div className="col-span-2">
                                    <span className="font-medium text-yellow-600">Skipped users:</span> {uploadPasswordResult.skippedUsers} (already exist)
                                  </div>
                                )}
                              </div>
                              
                              {/* Always show errors if they exist */}
                              {uploadPasswordResult.errors && uploadPasswordResult.errors.length > 0 && (
                                <div className="mt-4">
                                  <div className="flex items-center gap-2 mb-3">
                                    <div className="w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
                                      <svg className="w-2 h-2 text-white" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                      </svg>
                                    </div>
                                    <p className="font-medium text-red-700">Validation Errors ({uploadPasswordResult.errors.length})</p>
                                  </div>
                                  <div className="max-h-48 overflow-y-auto space-y-2 border border-red-200 rounded-lg p-3 bg-red-50">
                                    {uploadPasswordResult.errors.map((error: any, index: number) => (
                                      <div key={index} className="flex items-start gap-3 p-3 bg-white rounded border border-red-200 shadow-sm">
                                        <div className="w-2 h-2 bg-red-500 rounded-full mt-1.5 flex-shrink-0"></div>
                                        <div className="flex-1 min-w-0">
                                          <div className="flex items-center gap-2 mb-1">
                                            <span className="text-sm font-semibold text-red-700">
                                              Row {error.row}
                                            </span>
                                            <span className="text-xs text-gray-500">•</span>
                                            <span className="text-sm font-medium text-red-600">
                                              {error.field}
                                            </span>
                                          </div>
                                          <p className="text-sm text-red-600 leading-relaxed">
                                            {error.message}
                                          </p>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setIsBulkUploadWithPasswordsModalOpen(false);
                        setUploadedPasswordFile(null);
                        setUploadPasswordResult(null);
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleBulkUploadWithPasswords}
                      disabled={!uploadedPasswordFile || isUploadingWithPasswords}
                    >
                      {isUploadingWithPasswords ? "Uploading..." : "Upload Users with Passwords"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              <Dialog open={isCreateModalOpen} onOpenChange={(isOpen) => {
                setIsCreateModalOpen(isOpen);
                if (!isOpen) {
                  setNewUser(initialNewUserState);
                  setValidationErrors(initialValidationErrors);
                }
              }}>
                <DialogTrigger asChild>
                  <Button className="h-10 px-6 rounded-xl bg-gradient-to-r from-[#8DC63F] to-[#7AB82F] hover:from-[#7AB82F] hover:to-[#6AA325] text-white shadow-md hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5 font-semibold">
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
                      onValueChange={(value: 'student' | 'teacher' | 'admin' | 'content_creator' | 'view_only') => setNewUser(prev => ({ ...prev, role: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="student">Student</SelectItem>
                        <SelectItem value="teacher">Teacher</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="content_creator">Content Creator</SelectItem>
                        <SelectItem value="view_only">View Only</SelectItem>
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
      </div>

      {/* Metrics Cards */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
        <Card className="bg-gradient-to-br from-card to-green-500/5 dark:bg-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loadingStats ? <Skeleton className="h-8 w-1/2" /> : <div className="text-2xl font-bold">{stats.students + stats.teachers + stats.admins + stats.content_creators + stats.view_only}</div>}
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
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>User Directory</CardTitle>
              <CardDescription>
                Search and filter users by name or email
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setLoading(true);
                setLoadingStats(true);
                Promise.all([fetchUsers(), fetchStats()]);
              }}
              disabled={loading || loadingStats}
              className="flex items-center gap-2 h-8 px-3 rounded-lg"
            >
              <svg
                className={`h-3 w-3 ${loading || loadingStats ? 'animate-spin' : ''}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              Refresh
            </Button>
          </div>
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
                <SelectItem value="content_creator">Content Creators</SelectItem>
                <SelectItem value="view_only">View Only</SelectItem>
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
                          {formatRoleName(user.role)}
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
                        {user.lastActive ? new Date(user.lastActive).toLocaleDateString() : "Never"}
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
                            <DropdownMenuItem onClick={() => setTimeout(() => setUserToEdit(user), 100)}>
                              <Edit className="mr-2 h-4 w-4" />
                              <span>Edit User</span>
                            </DropdownMenuItem>
                            {/* Hide reset password option for super users */}
                            {user.role !== 'super_user' && (
                              <DropdownMenuItem onClick={() => handleResetPassword(user)}>
                                Reset Password
                              </DropdownMenuItem>
                            )}
                            {/* Hide delete user option for super users */}
                            {user.role !== 'super_user' && (
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => setTimeout(() => setUserToDelete(user), 100)}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                <span>Delete User</span>
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {!loading && totalPages > 1 && (
            <PaginationControls
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={totalUsers}
              itemsPerPage={rowsPerPage}
              onPageChange={setCurrentPage}
              onItemsPerPageChange={handleItemsPerPageChange}
              itemsPerPageOptions={[5, 10, 20, 50, 100]}
              disabled={loading}
              className="mt-4"
            />
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
                onValueChange={(value: 'student' | 'teacher' | 'admin' | 'content_creator' | 'view_only') =>
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
                  <SelectItem value="content_creator">Content Creator</SelectItem>
                  <SelectItem value="view_only">View Only</SelectItem>
                  {/* Super User cannot be assigned through UI - must be done via database */}
                  {userToEdit?.role === 'super_user' && (
                    <SelectItem value="super_user" disabled>Super User (System Admin - Database Only)</SelectItem>
                  )}
                </SelectContent>
              </Select>
              {userToEdit?.role === 'super_user' && (
                <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                  ⚠️ Super User role can only be changed via database. This is the system administrator account.
                </p>
              )}
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
