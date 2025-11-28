import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { MultiSelect } from '@/components/ui/MultiSelect';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Search, Plus, BookOpen, Edit, Trash2, Eye, RefreshCw, Users, MoreHorizontal, MapPin, GraduationCap, Clock, Sparkles, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { useClasses, useClassesPaginated, useTeachers, useStudents, useBoards, useSchools } from '@/hooks/useClasses';
import ClassService, { ClassWithMembers, CreateClassData, UpdateClassData } from '@/services/classService';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useViewPreferences } from '@/contexts/ViewPreferencesContext';
import { ViewToggle } from '@/components/ui/ViewToggle';
import { ClassCardView } from '@/components/class/ClassCardView';
import { ClassTileView } from '@/components/class/ClassTileView';
import { ClassListView } from '@/components/class/ClassListView';
import { PaginationControls } from '@/components/ui/PaginationControls';


const ClassManagement: React.FC = () => {
  // View preferences
  const { preferences, setTeacherClassView } = useViewPreferences();
  
  // Pagination and filter state
  const [currentPage, setCurrentPage] = useState(1);
  
  // Get default items per page based on current view
  const getDefaultItemsPerPage = (view: string) => {
    switch (view) {
      case 'card': return 8;
      case 'tile': return 18;
      case 'list': return 8;
      default: return 8;
    }
  };

  // Get pagination options based on current view
  const getPaginationOptions = (view: string) => {
    if (view === 'tile') {
      return [9, 18, 27, 36, 45];
    }
    return [4, 8, 12, 16, 20];
  };
  
  const [itemsPerPage, setItemsPerPage] = useState(getDefaultItemsPerPage(preferences.teacherClassView));
  const [searchTerm, setSearchTerm] = useState('');
  const [gradeFilter, setGradeFilter] = useState('all');
  const [schoolFilter, setSchoolFilter] = useState('all');
  const [boardFilter, setBoardFilter] = useState('all');
  
  // Dialog state
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<ClassWithMembers | null>(null);
  const [viewingClass, setViewingClass] = useState<ClassWithMembers | null>(null);
  
  // Loading states for create and update operations
  const [isCreating, setIsCreating] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isLoadingViewData, setIsLoadingViewData] = useState(false);
  
  // Class deletion dependency state
  const [classDependencies, setClassDependencies] = useState<{
    courses: any[];
  } | null>(null);
  const [isCheckingClassDependencies, setIsCheckingClassDependencies] = useState(false);
  const [classToDelete, setClassToDelete] = useState<ClassWithMembers | null>(null);

  // Get user context first
  const { user } = useAuth();
  const { profile, loading: profileLoading } = useUserProfile();
  
  // Determine if current user is a teacher (use profile.role for more reliable role checking)
  const isTeacher = profile?.role === 'teacher';
  const teacherId = isTeacher ? user?.id : undefined;
  
  // Only fetch classes after profile is loaded to ensure correct filtering
  const shouldFetchClasses = !profileLoading && !!user;
  
  // Use paginated classes hook
  const paginationParams = {
    page: currentPage,
    limit: itemsPerPage,
    search: searchTerm,
    grade: gradeFilter,
    school: schoolFilter,
    board: boardFilter,
    teacherId: teacherId // Pass teacher ID to filter classes
  };
  
  const { 
    classes, 
    loading, 
    totalCount, 
    totalPages, 
    hasNextPage, 
    hasPreviousPage,
    refetch: refetchClasses 
  } = useClassesPaginated(paginationParams, shouldFetchClasses);

  // Update items per page when view changes
  useEffect(() => {
    const newItemsPerPage = getDefaultItemsPerPage(preferences.teacherClassView);
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(1); // Reset to first page when view changes
  }, [preferences.teacherClassView]);
  
  // Use other hooks for stats and form data
  const { stats, createClass, updateClass, deleteClass } = useClasses(teacherId, shouldFetchClasses);
  const { teachers, loading: teachersLoading } = useTeachers();
  const { students, loading: studentsLoading } = useStudents();
  const { boards, loading: boardsLoading } = useBoards();

  const [formData, setFormData] = useState({
    name: '',
    code: '',
    grade: '',
    school_id: '',
    board_id: '',
    description: '',
    max_students: '30',
    teachers: [] as string[],
    students: [] as string[]
  });
  const [validationErrors, setValidationErrors] = useState({
    name: '',
    code: '',
    grade: '',
    school_id: '',
    board_id: '',
    description: '',
    max_students: ''
  });

  // Use schools hook with board filtering - must be after formData declaration
  const { schools, loading: schoolsLoading } = useSchools(formData.board_id);

  // Reset to first page when filters change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, gradeFilter, schoolFilter, boardFilter]);

  // Handle member changes (teachers/students)
  const handleMembersChange = (role: 'teachers' | 'students', selectedIds: string[]) => {
    setFormData(prev => ({
      ...prev,
      [role]: selectedIds
    }));
  };

  // Handle board change - reset school selection when board changes
  const handleBoardChange = (boardId: string) => {
    setFormData(prev => ({
      ...prev,
      board_id: boardId,
      school_id: '' // Reset school selection when board changes
    }));
  };

  const handleCreate = async () => {
    // Prevent multiple submissions
    if (isCreating) return;
    
    // Validate form before submission
    if (!validateClassForm()) {
      toast.error('Please fix the validation errors before submitting');
      return;
    }

    setIsCreating(true);
    
    try {
      const classData: CreateClassData = {
        name: formData.name.trim(),
        code: formData.code.trim().toUpperCase(),
        grade: formData.grade,
        school_id: formData.school_id,
        board_id: formData.board_id,
        description: formData.description.trim(),
        max_students: parseInt(formData.max_students.trim()),
        teacher_ids: formData.teachers,
        student_ids: formData.students
      };

      const result = await createClass(classData);
      if (result) {
        setIsCreateDialogOpen(false);
        resetForm();
        refetchClasses(); // Refresh paginated data
      }
    } catch (error) {
      console.error('Error creating class:', error);
    } finally {
      setIsCreating(false);
    }
  };

  const handleEdit = async () => {
    // Prevent multiple submissions
    if (isUpdating) return;
    
    if (!editingClass) {
      toast.error('No class selected for editing');
      return;
    }

    // Validate form before submission
    if (!validateClassForm()) {
      toast.error('Please fix the validation errors before submitting');
      return;
    }

    setIsUpdating(true);
    
    try {
      const classData: UpdateClassData = {
        id: editingClass.id,
        name: formData.name.trim(),
        code: formData.code.trim().toUpperCase(),
        grade: formData.grade,
        school_id: formData.school_id,
        board_id: formData.board_id,
        description: formData.description.trim(),
        max_students: parseInt(formData.max_students.trim()),
        teacher_ids: formData.teachers,
        student_ids: formData.students
      };

      console.log('Updating class with data:', {
        classId: classData.id,
        className: classData.name,
        teacherIds: classData.teacher_ids,
        teacherCount: classData.teacher_ids.length,
        studentIds: classData.student_ids,
        studentCount: classData.student_ids.length
      });

      const result = await updateClass(classData);
      if (result) {
        setIsEditDialogOpen(false);
        setEditingClass(null);
        resetForm();
        
        // Force a fresh fetch with a small delay to ensure DB is updated
        setTimeout(() => {
          refetchClasses();
        }, 300);
      }
    } catch (error) {
      console.error('Error updating class:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  // Class dependency checking functions
  const checkClassDependencies = async (classId: string) => {
    const dependencies = {
      courses: [] as any[]
    };

    try {
      // Check courses (directly linked via class_ids array)
      const { data: coursesData, error: coursesError } = await supabase
        .from('courses')
        .select('id, title, status')
        .contains('class_ids', [classId]);
      
      if (!coursesError && coursesData) {
        dependencies.courses = coursesData;
      }

      return dependencies;
    } catch (error) {
      console.error('Error checking class dependencies:', error);
      return dependencies;
    }
  };

  const handleClassDeleteCheck = (cls: ClassWithMembers) => {
    setClassToDelete(cls);
    setIsCheckingClassDependencies(true);
    setClassDependencies(null);

    // Handle async operations internally
    checkClassDependencies(cls.id)
      .then((dependencies) => {
        setClassDependencies(dependencies);
      })
      .catch((error) => {
        console.error('Error checking class dependencies:', error);
        toast.error('Failed to check dependencies. Please try again.');
      })
      .finally(() => {
        setIsCheckingClassDependencies(false);
      });
  };

  const handleClassDeleteConfirm = async () => {
    if (!classToDelete) return;

    try {
      await deleteClass(classToDelete.id);
      toast.success('Class deleted successfully');
      refetchClasses(); // Refresh paginated data
      
      // Reset state
      setClassToDelete(null);
      setClassDependencies(null);
    } catch (error) {
      console.error('Error deleting class:', error);
      toast.error('Failed to delete class. Please try again.');
    }
  };

  const handleClassDeleteCancel = () => {
    setClassToDelete(null);
    setClassDependencies(null);
    setIsCheckingClassDependencies(false);
  };

  const handleDelete = async (classId: string) => {
    try {
      await deleteClass(classId);
      refetchClasses(); // Refresh paginated data
    } catch (error) {
      console.error('Error deleting class:', error);
      toast.error('Failed to delete class. Please try again.');
    }
  };

  const openEditDialog = async (cls: ClassWithMembers) => {
    // Small delay to ensure dropdown is fully closed
    setTimeout(async () => {
      setIsEditDialogOpen(true);
      setIsUpdating(true); // Use updating state to show loading
      
      // Fetch fresh class data to ensure we have ALL teachers and students
      try {
        console.log('Fetching fresh class data for edit, class ID:', cls.id);
        const freshClassData = await ClassService.getClassById(cls.id);
        const classToEdit = freshClassData || cls; // Fallback to cached if fetch fails
        
        console.log('Fresh class data loaded:', {
          classId: classToEdit.id,
          className: classToEdit.name,
          teachers: classToEdit.teachers.map(t => ({ id: t.id, name: `${t.first_name} ${t.last_name}` })),
          students: classToEdit.students.map(s => ({ id: s.id, name: `${s.first_name} ${s.last_name}` }))
        });
        
        setEditingClass(classToEdit);
        setFormData({
          name: classToEdit.name,
          code: classToEdit.code,
          grade: classToEdit.grade,
          school_id: classToEdit.school_id || '',
          board_id: classToEdit.board_id || '',
          description: classToEdit.description,
          max_students: String(classToEdit.max_students || 30),
          teachers: classToEdit.teachers.map(t => t.id),
          students: classToEdit.students.map(s => s.id)
        });
        
        console.log('Form data set with teacher IDs:', classToEdit.teachers.map(t => t.id));
        // Clear validation errors when opening edit dialog
        setValidationErrors({
          name: '',
          code: '',
          grade: '',
          school_id: '',
          board_id: '',
          description: '',
          max_students: ''
        });
      } catch (error) {
        console.error('Error fetching fresh class data for edit:', error);
        // Still allow editing with cached data
        setEditingClass(cls);
        setFormData({
          name: cls.name,
          code: cls.code,
          grade: cls.grade,
          school_id: cls.school_id || '',
          board_id: cls.board_id || '',
          description: cls.description,
          max_students: String(cls.max_students || 30),
          teachers: cls.teachers.map(t => t.id),
          students: cls.students.map(s => s.id)
        });
        setValidationErrors({
          name: '',
          code: '',
          grade: '',
          school_id: '',
          board_id: '',
          description: '',
          max_students: ''
        });
      } finally {
        setIsUpdating(false);
      }
    }, 100);
  };

  const openViewDialog = async (cls: ClassWithMembers) => {
    // Small delay to ensure dropdown is fully closed
    setTimeout(async () => {
      setIsViewDialogOpen(true);
      setIsLoadingViewData(true);
      
      // Fetch fresh class data to ensure we have the latest information
      try {
        const freshClassData = await ClassService.getClassById(cls.id);
        if (freshClassData) {
          setViewingClass(freshClassData);
        } else {
          setViewingClass(cls); // Fallback to cached data if fetch fails
        }
      } catch (error) {
        console.error('Error fetching fresh class data:', error);
        setViewingClass(cls); // Fallback to cached data on error
      } finally {
        setIsLoadingViewData(false);
      }
    }, 100);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      code: '',
      grade: '',
      school_id: '',
      board_id: '',
      description: '',
      max_students: '30',
      teachers: [],
      students: []
    });
    setValidationErrors({
      name: '',
      code: '',
      grade: '',
      school_id: '',
      board_id: '',
      description: '',
      max_students: ''
    });
    // Reset loading states
    setIsCreating(false);
    setIsUpdating(false);
  };

  const getGradeBadge = (grade: string) => {
    const gradeNum = parseInt(grade);
    if (gradeNum <= 5) return <Badge variant="default" className="bg-blue-600 text-white">Grade {grade}</Badge>;
    if (gradeNum <= 8) return <Badge variant="default" className="bg-green-600">Grade {grade}</Badge>;
    if (gradeNum <= 10) return <Badge variant="default" className="bg-yellow-600">Grade {grade}</Badge>;
    return <Badge variant="default" className="bg-purple-600">Grade {grade}</Badge>;
  };

  // Check if student limit is exceeded
  const isStudentLimitExceeded = () => {
    const maxStudentsNum = parseInt(formData.max_students);
    return !isNaN(maxStudentsNum) && formData.students.length > maxStudentsNum;
  };

  // Get student limit status message
  const getStudentLimitStatus = () => {
    const maxStudentsNum = parseInt(formData.max_students);
    if (isNaN(maxStudentsNum)) return null;
    
    const currentCount = formData.students.length;
    const remaining = maxStudentsNum - currentCount;
    
    if (currentCount > maxStudentsNum) {
      return {
        message: `⚠️ Exceeded limit by ${currentCount - maxStudentsNum} students (${currentCount}/${maxStudentsNum})`,
        className: "text-destructive font-medium"
      };
    } else if (remaining <= 2 && remaining > 0) {
      return {
        message: `⚠️ Only ${remaining} spots remaining (${currentCount}/${maxStudentsNum})`,
        className: "text-yellow-600 dark:text-yellow-400 font-medium"
      };
    } else {
      return {
        message: `${currentCount}/${maxStudentsNum} students selected`,
        className: "text-[#8DC63F] dark:text-[#8DC63F] font-medium"
      };
    }
  };

  // Class validation functions
  const validateClassName = (name: string): string => {
    if (!name.trim()) {
      return 'Class name is required';
    }
    if (name.trim().length < 2) {
      return 'Class name must be at least 2 characters';
    }
    if (name.trim().length > 100) {
      return 'Class name must be less than 100 characters';
    }
    if (!/^[a-zA-Z0-9\s\-'\.]+$/.test(name.trim())) {
      return 'Class name can only contain letters, numbers, spaces, hyphens, apostrophes, and periods';
    }
    return '';
  };

  const validateClassCode = (code: string): string => {
    if (!code.trim()) {
      return 'Class code is required';
    }
    if (code.trim().length < 2) {
      return 'Class code must be at least 2 characters';
    }
    if (code.trim().length > 10) {
      return 'Class code must be 10 characters or less';
    }
    if (!/^[A-Za-z0-9\-]+$/.test(code.trim())) {
      return 'Class code can only contain letters, numbers, and hyphens';
    }
    // Check for duplicates (excluding current class if editing)
    const existingClass = classes.find(cls => 
      cls.code.toLowerCase() === code.trim().toLowerCase() && 
      cls.id !== editingClass?.id
    );
    if (existingClass) {
      return 'A class with this code already exists';
    }
    return '';
  };

  const validateClassGrade = (grade: string): string => {
    if (!grade) {
      return 'Grade is required';
    }
    const gradeNum = parseInt(grade);
    if (isNaN(gradeNum) || gradeNum < 1 || gradeNum > 12) {
      return 'Grade must be between 1 and 12';
    }
    return '';
  };

  const validateClassBoard = (boardId: string): string => {
    if (!boardId) {
      return 'Board is required';
    }
    return '';
  };

  const validateClassSchool = (schoolId: string): string => {
    if (!schoolId) {
      return 'School is required';
    }
    return '';
  };

  const validateClassMaxStudents = (maxStudents: string): string => {
    if (!maxStudents.trim()) {
      return 'Max students is required';
    }
    const maxStudentsNum = parseInt(maxStudents.trim());
    if (isNaN(maxStudentsNum)) {
      return 'Max students must be a valid number';
    }
    if (maxStudentsNum < 1) {
      return 'Max students must be at least 1';
    }
    if (maxStudentsNum > 100) {
      return 'Max students must be 100 or less';
    }
    return '';
  };

  const validateClassDescription = (description: string): string => {
    if (description.trim().length > 500) {
      return 'Description must be less than 500 characters';
    }
    return '';
  };

  const validateClassForm = (): boolean => {
    const nameError = validateClassName(formData.name);
    const codeError = validateClassCode(formData.code);
    const gradeError = validateClassGrade(formData.grade);
    const boardError = validateClassBoard(formData.board_id);
    const schoolError = validateClassSchool(formData.school_id);
    const maxStudentsError = validateClassMaxStudents(formData.max_students);
    const descriptionError = validateClassDescription(formData.description);

    setValidationErrors({
      name: nameError,
      code: codeError,
      grade: gradeError,
      board_id: boardError,
      school_id: schoolError,
      max_students: maxStudentsError,
      description: descriptionError
    });

    return !nameError && !codeError && !gradeError && !boardError && !schoolError && !maxStudentsError && !descriptionError;
  };

  // Pagination handlers
  const handlePreviousPage = () => {
    if (hasPreviousPage) {
      setCurrentPage(prev => prev - 1);
    }
  };

  const handleNextPage = () => {
    if (hasNextPage) {
      setCurrentPage(prev => prev + 1);
    }
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleItemsPerPageChange = (newItemsPerPage: number) => {
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(1); // Reset to first page when changing items per page
  };



  // Show loading state
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading classes...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-primary/5 rounded-xl sm:rounded-2xl md:rounded-3xl"></div>
        <div className="relative p-3 sm:p-4 md:p-6 lg:p-8 rounded-xl sm:rounded-2xl md:rounded-3xl">
          {/* Desktop Layout */}
          <div className="hidden lg:flex lg:items-center lg:justify-between gap-3 lg:gap-4 overflow-hidden">
            <div className="flex items-center gap-2 md:gap-3 min-w-0 flex-1 overflow-hidden max-w-[60%]">
              <div className="w-12 h-12 md:w-14 md:h-14 bg-gradient-to-br from-primary/10 to-primary/20 rounded-xl md:rounded-2xl flex items-center justify-center flex-shrink-0">
                <GraduationCap className="w-6 h-6 md:w-7 md:h-7 text-primary" />
              </div>
              <div className="min-w-0 flex-1 overflow-hidden">
                <h1 className="text-xl md:text-2xl lg:text-3xl xl:text-4xl font-bold tracking-tight bg-gradient-to-r from-primary via-primary to-primary/80 bg-clip-text text-transparent leading-tight break-words">
                  Class Management
                </h1>
                <p className="text-xs md:text-sm lg:text-base xl:text-lg text-muted-foreground font-light mt-0.5 md:mt-1 break-words">
                  Manage all classes and academic sections in the system
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-1.5 md:gap-2 flex-shrink-0">
              <Badge variant="secondary" className="px-2 py-0.5 bg-primary/10 text-primary border-primary/20 text-[10px] md:text-xs whitespace-nowrap">
                <BookOpen className="h-3 w-3 mr-1" />
                <span className="hidden xl:inline">Academic Management</span>
                <span className="xl:hidden">Academic</span>
              </Badge>
              <Badge variant="outline" className="px-2 py-0.5 text-[10px] md:text-xs whitespace-nowrap">
                <Clock className="h-3 w-3 mr-1" />
                <span className="hidden xl:inline">Live Data</span>
                <span className="xl:hidden">Live</span>
              </Badge>
              <Button
                onClick={() => setIsCreateDialogOpen(true)}
                className="bg-[#8DC63F] hover:bg-[#7AB82F] text-white h-7 px-2 md:px-3 text-[10px] md:text-[11px] flex-shrink-0 whitespace-nowrap"
              >
                <Plus className="w-3 h-3 mr-1" />
                <span className="hidden xl:inline">Create Class</span>
                <span className="xl:hidden">Create</span>
              </Button>
            </div>
          </div>

          {/* Mobile & Tablet Layout */}
          <div className="flex flex-col gap-3 md:gap-4 lg:hidden">
            <div className="flex items-start gap-2 md:gap-3 min-w-0">
              <div className="w-10 h-10 md:w-12 md:h-12 bg-gradient-to-br from-primary/10 to-primary/20 rounded-lg md:rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5">
                <GraduationCap className="w-5 h-5 md:w-6 md:h-6 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-lg md:text-xl font-bold tracking-tight bg-gradient-to-r from-primary via-primary to-primary/80 bg-clip-text text-transparent leading-tight break-words">
                  Class Management
                </h1>
                <p className="text-xs md:text-sm text-muted-foreground font-light mt-0.5 break-words">
                  Manage all classes and academic sections in the system
                </p>
              </div>
            </div>
            
            <div className="flex flex-wrap items-center gap-2 w-full">
              <Badge variant="secondary" className="px-2 py-0.5 bg-primary/10 text-primary border-primary/20 text-xs whitespace-nowrap">
                <BookOpen className="h-3 w-3 mr-1" />
                <span className="hidden sm:inline">Academic Management</span>
                <span className="sm:hidden">Academic</span>
              </Badge>
              <Badge variant="outline" className="px-2 py-0.5 text-xs whitespace-nowrap">
                <Clock className="h-3 w-3 mr-1" />
                <span className="hidden sm:inline">Live Data</span>
                <span className="sm:hidden">Live</span>
              </Badge>
              <Button
                onClick={() => setIsCreateDialogOpen(true)}
                className="bg-[#8DC63F] hover:bg-[#7AB82F] text-white h-9 px-3 md:px-4 text-xs md:text-sm flex-1 sm:flex-none"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Class
              </Button>
            </div>
          </div>
        </div>
      </div>

             {/* Summary Cards */}
       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
         <Card>
           <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
             <CardTitle className="text-sm font-medium">Total Classes</CardTitle>
             <BookOpen className="h-4 w-4 text-muted-foreground" />
           </CardHeader>
           <CardContent>
             <div className="text-2xl font-bold">{stats.totalClasses}</div>
             <p className="text-xs text-muted-foreground">
               {isTeacher ? 'Classes you teach' : 'All classes in the system'}
             </p>
           </CardContent>
         </Card>

         <Card>
           <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
             <CardTitle className="text-sm font-medium">Total Schools</CardTitle>
             <GraduationCap className="h-4 w-4 text-muted-foreground" />
           </CardHeader>
           <CardContent>
             <div className="text-2xl font-bold">{stats.totalSchools}</div>
             <p className="text-xs text-muted-foreground">
               {isTeacher ? 'Schools you teach at' : 'Unique schools'}
             </p>
           </CardContent>
         </Card>

         <Card>
           <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
             <CardTitle className="text-sm font-medium">Total Boards</CardTitle>
             <Users className="h-4 w-4 text-muted-foreground" />
           </CardHeader>
           <CardContent>
             <div className="text-2xl font-bold">{stats.totalBoards}</div>
             <p className="text-xs text-muted-foreground">
               {isTeacher ? 'Boards you teach in' : 'Unique boards'}
             </p>
           </CardContent>
         </Card>


         <Card>
           <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
             <CardTitle className="text-sm font-medium">Total Students</CardTitle>
             <Users className="h-4 w-4 text-muted-foreground" />
           </CardHeader>
           <CardContent>
             <div className="text-2xl font-bold">{stats.totalStudents}</div>
             <p className="text-xs text-muted-foreground">
               {isTeacher ? 'Students in your classes' : 'Unique students'}
             </p>
           </CardContent>
         </Card>
       </div>

      {/* Search and Filters - Improved Responsiveness */}
      <Card>
        <CardHeader className="pb-3 sm:pb-4">
          <CardTitle className="text-base sm:text-lg md:text-xl">Class Directory</CardTitle>
          <CardDescription className="text-xs sm:text-sm">Search and filter classes by various criteria</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-3 sm:gap-4">
            {/* Search Bar - Full Width on Mobile */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search classes by name or code..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 h-10 sm:h-11 text-sm sm:text-base"
              />
            </div>

            {/* Filters Row - Responsive Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3">
              <Select value={gradeFilter} onValueChange={setGradeFilter}>
                <SelectTrigger className="h-10 sm:h-11 text-xs sm:text-sm bg-background border-border hover:border-primary/30 focus:border-primary dark:bg-background dark:border-border">
                  <SelectValue placeholder="All Grades" />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border dark:bg-popover dark:border-border">
                  <SelectItem value="all" className="focus:bg-accent focus:text-accent-foreground dark:focus:bg-accent dark:focus:text-accent-foreground">All Grades</SelectItem>
                  <SelectItem value="1" className="focus:bg-accent focus:text-accent-foreground dark:focus:bg-accent dark:focus:text-accent-foreground">Grade 1</SelectItem>
                  <SelectItem value="2" className="focus:bg-accent focus:text-accent-foreground dark:focus:bg-accent dark:focus:text-accent-foreground">Grade 2</SelectItem>
                  <SelectItem value="3" className="focus:bg-accent focus:text-accent-foreground dark:focus:bg-accent dark:focus:text-accent-foreground">Grade 3</SelectItem>
                  <SelectItem value="4" className="focus:bg-accent focus:text-accent-foreground dark:focus:bg-accent dark:focus:text-accent-foreground">Grade 4</SelectItem>
                  <SelectItem value="5" className="focus:bg-accent focus:text-accent-foreground dark:focus:bg-accent dark:focus:text-accent-foreground">Grade 5</SelectItem>
                  <SelectItem value="6" className="focus:bg-accent focus:text-accent-foreground dark:focus:bg-accent dark:focus:text-accent-foreground">Grade 6</SelectItem>
                  <SelectItem value="7" className="focus:bg-accent focus:text-accent-foreground dark:focus:bg-accent dark:focus:text-accent-foreground">Grade 7</SelectItem>
                  <SelectItem value="8" className="focus:bg-accent focus:text-accent-foreground dark:focus:bg-accent dark:focus:text-accent-foreground">Grade 8</SelectItem>
                  <SelectItem value="9" className="focus:bg-accent focus:text-accent-foreground dark:focus:bg-accent dark:focus:text-accent-foreground">Grade 9</SelectItem>
                  <SelectItem value="10" className="focus:bg-accent focus:text-accent-foreground dark:focus:bg-accent dark:focus:text-accent-foreground">Grade 10</SelectItem>
                  <SelectItem value="11" className="focus:bg-accent focus:text-accent-foreground dark:focus:bg-accent dark:focus:text-accent-foreground">Grade 11</SelectItem>
                  <SelectItem value="12" className="focus:bg-accent focus:text-accent-foreground dark:focus:bg-accent dark:focus:text-accent-foreground">Grade 12</SelectItem>
                </SelectContent>
              </Select>

              <Select value={boardFilter} onValueChange={setBoardFilter}>
                <SelectTrigger className="h-10 sm:h-11 text-xs sm:text-sm bg-background border-border hover:border-primary/30 focus:border-primary dark:bg-background dark:border-border">
                  <SelectValue placeholder="All Boards" />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border dark:bg-popover dark:border-border">
                  <SelectItem value="all" className="focus:bg-accent focus:text-accent-foreground dark:focus:bg-accent dark:focus:text-accent-foreground">All Boards</SelectItem>
                  {boards.map((board) => (
                    <SelectItem key={board.id} value={board.id} className="focus:bg-accent focus:text-accent-foreground dark:focus:bg-accent dark:focus:text-accent-foreground">
                      {board.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={schoolFilter} onValueChange={setSchoolFilter}>
                <SelectTrigger className="h-10 sm:h-11 text-xs sm:text-sm bg-background border-border hover:border-primary/30 focus:border-primary dark:bg-background dark:border-border">
                  <SelectValue placeholder="All Schools" />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border dark:bg-popover dark:border-border">
                  <SelectItem value="all" className="focus:bg-accent focus:text-accent-foreground dark:focus:bg-accent dark:focus:text-accent-foreground">All Schools</SelectItem>
                  {schools.map((school) => (
                    <SelectItem key={school.id} value={school.id} className="focus:bg-accent focus:text-accent-foreground dark:focus:bg-accent dark:focus:text-accent-foreground">
                      {school.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button 
                variant="outline" 
                size="icon" 
                onClick={refetchClasses}
                className="h-10 sm:h-11 w-full sm:w-10 lg:w-11"
              >
                <RefreshCw className="h-4 w-4" />
                <span className="ml-2 sm:hidden">Refresh</span>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Classes Display */}
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          {classes.length > 0 ? (
            <div>
              {/* View Toggle Section - Improved Responsiveness */}
              <div className="p-4 sm:p-5 md:p-6 lg:p-7 border-b border-border/50 bg-gradient-to-r from-muted/30 via-transparent to-muted/30">
                {/* Mobile/Tablet Layout - Stacked */}
                <div className="flex lg:hidden flex-col gap-2 sm:gap-3">
                  {/* Heading and Description */}
                  <div className="space-y-0.5">
                    <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-foreground">
                      Classes
                    </h2>
                    <p className="text-xs sm:text-sm md:text-base text-muted-foreground">
                      Switch between different views to manage your classes
                    </p>
                  </div>
                  
                  {/* View Toggle */}
                  <div className="w-full sm:w-auto">
                    <ViewToggle
                      currentView={preferences.teacherClassView}
                      onViewChange={setTeacherClassView}
                      availableViews={['card', 'tile', 'list']}
                      showLabels={true}
                      className="w-full sm:w-auto"
                    />
                  </div>
                </div>

                {/* Desktop Layout - Side by Side */}
                <div className="hidden lg:flex items-center justify-between gap-4">
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <h2 className="text-2xl font-bold text-foreground">
                      Classes
                    </h2>
                    <p className="text-base text-muted-foreground">
                      Switch between different views to manage your classes
                    </p>
                  </div>
                  
                  <div className="flex-shrink-0">
                    <ViewToggle
                      currentView={preferences.teacherClassView}
                      onViewChange={setTeacherClassView}
                      availableViews={['card', 'tile', 'list']}
                      showLabels={true}
                    />
                  </div>
                </div>
              </div>

              {/* Class Display based on selected view */}
              {preferences.teacherClassView === 'card' && (
                <div className="p-4 sm:p-5 md:p-6 lg:p-7">
                  <ClassCardView
                    classes={classes}
                    onView={openViewDialog}
                    onEdit={openEditDialog}
                    onDelete={handleClassDeleteCheck}
                  />
                </div>
              )}

              {/* Pagination for Card View */}
              {preferences.teacherClassView === 'card' && totalPages > 1 && (
                <div className="py-4 sm:py-5 border-t border-border/50 px-4 sm:px-5 md:px-6 lg:px-7 bg-muted/20">
                  <PaginationControls
                    currentPage={currentPage}
                    totalPages={totalPages}
                    totalItems={totalCount}
                    itemsPerPage={itemsPerPage}
                    onPageChange={handlePageChange}
                    onItemsPerPageChange={handleItemsPerPageChange}
                    itemsPerPageOptions={getPaginationOptions(preferences.teacherClassView)}
                    disabled={loading}
                  />
                </div>
              )}

              {/* Legacy Table View - Hidden */}
              {false && (
                <div className="p-6 pt-0">
                  <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Class Name</TableHead>
                    <TableHead>Code</TableHead>
                    <TableHead>Grade</TableHead>
                    <TableHead>School</TableHead>
                    <TableHead>Board</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {classes.map((cls) => (
                  <TableRow key={cls.id}>
                    <TableCell className="font-medium">{cls.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{cls.code}</Badge>
                    </TableCell>
                    <TableCell>{getGradeBadge(cls.grade)}</TableCell>
                    <TableCell>{cls.school}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{cls.board}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">Open menu</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openViewDialog(cls)}>
                            <Eye className="mr-2 h-4 w-4" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openEditDialog(cls)}>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit Class
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <DropdownMenuItem 
                              onSelect={(e) => {
                                e.preventDefault();
                                handleClassDeleteCheck(cls);
                              }}
                              className="text-red-600 hover:text-white hover:bg-red-600 focus:text-white focus:bg-red-600"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete Class
                            </DropdownMenuItem>
                          </AlertDialogTrigger>
                            <AlertDialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
                              <AlertDialogHeader className="flex-shrink-0">
                                <AlertDialogTitle>Delete Class</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete "{cls.name}"? This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              
                              {/* Scrollable Content Area */}
                              <div className="flex-1 overflow-y-auto min-h-0">
                                {/* Dependency Information */}
                                {isCheckingClassDependencies && (
                                  <div className="flex items-center justify-center py-8">
                                    <div className="text-center">
                                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mx-auto mb-4"></div>
                                      <p className="text-muted-foreground">Checking dependencies...</p>
                                    </div>
                                  </div>
                                )}

                                {classDependencies && !isCheckingClassDependencies && (
                                  <div className="py-4">
                                    {(() => {
                                      const totalDependencies = classDependencies.courses.length;

                                      if (totalDependencies > 0) {
                                        return (
                                          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                                            <div className="flex items-center mb-2">
                                              <div className="w-6 h-6 bg-red-600 rounded-full flex items-center justify-center mr-3">
                                                <span className="text-white text-sm font-bold">!</span>
                                              </div>
                                              <h4 className="font-semibold text-red-800">Cannot Delete Class</h4>
                                            </div>
                                            <p className="text-red-700 mb-3">
                                              This class is linked to the following entities:
                                            </p>
                                            
                                            <div className="grid grid-cols-2 gap-2 mb-4">
                                              {classDependencies.courses.length > 0 && (
                                                <div className="flex items-center text-sm">
                                                  <Badge variant="outline" className="mr-2">Courses</Badge>
                                                  <span className="font-medium">{classDependencies.courses.length}</span>
                                                </div>
                                              )}
                                            </div>

                                            <div className="bg-white p-3 rounded border">
                                              <h5 className="font-medium text-gray-800 mb-3">Remove class from courses first:</h5>
                                              <div className="space-y-3">
                                                {classDependencies.courses.length > 0 && (
                                                  <div>
                                                    <h6 className="font-medium text-red-700 mb-1">1. Remove this class from {classDependencies.courses.length} Course(s):</h6>
                                                    <ul className="text-sm text-gray-600 ml-4 space-y-1">
                                                      {classDependencies.courses.map((course) => (
                                                        <li key={course.id} className="flex items-center">
                                                          <span className="w-2 h-2 bg-red-400 rounded-full mr-2"></span>
                                                          <span className="font-medium">{course.title}</span>
                                                          <Badge variant="outline" className="ml-2 text-xs">{course.status}</Badge>
                                                        </li>
                                                      ))}
                                                    </ul>
                                                    <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded text-sm text-blue-700">
                                                      <strong>How to remove:</strong> Go to each course's "Access" tab and remove this class from the enrolled classes list.
                                                    </div>
                                                  </div>
                                                )}
                                                
                                                <div className="pt-2 border-t border-gray-200">
                                                  <h6 className="font-medium text-gray-800">2. Then delete the class</h6>
                                                </div>
                                              </div>
                                            </div>
                                          </div>
                                        );
                                      } else {
                                        return (
                                          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                                            <div className="flex items-center">
                                              <div className="w-6 h-6 bg-green-600 rounded-full flex items-center justify-center mr-3">
                                                <span className="text-white text-sm font-bold">✓</span>
                                              </div>
                                              <h4 className="font-semibold text-green-800">Safe to Delete</h4>
                                            </div>
                                            <p className="text-green-700 mt-2">
                                              This class has no linked entities and can be safely deleted.
                                            </p>
                                          </div>
                                        );
                                      }
                                    })()}
                                  </div>
                                )}
                              </div>

                              <AlertDialogFooter className="flex-shrink-0 border-t pt-4">
                                <AlertDialogCancel onClick={handleClassDeleteCancel}>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={handleClassDeleteConfirm}
                                  className="bg-red-600 hover:bg-red-700"
                                  disabled={isCheckingClassDependencies || (classDependencies && (
                                    classDependencies.courses.length
                                  ) > 0)}
                                >
                                  {isCheckingClassDependencies ? 'Checking...' : 'Delete'}
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                  ))}
                </TableBody>
              </Table>
              
              {/* Pagination */}
              {totalPages > 1 && (
                <div className="py-4 border-t">
                  <PaginationControls
                    currentPage={currentPage}
                    totalPages={totalPages}
                    totalItems={totalCount}
                    itemsPerPage={itemsPerPage}
                    onPageChange={handlePageChange}
                    onItemsPerPageChange={handleItemsPerPageChange}
                    itemsPerPageOptions={getPaginationOptions(preferences.teacherClassView)}
                    disabled={loading}
                  />
                </div>
              )}
                </div>
              )}

              {preferences.teacherClassView === 'tile' && (
                <div className="p-4 sm:p-5 md:p-6 lg:p-7">
                  <ClassTileView
                    classes={classes}
                    onView={openViewDialog}
                    onEdit={openEditDialog}
                    onDelete={handleClassDeleteCheck}
                  />
                </div>
              )}

              {preferences.teacherClassView === 'list' && (
                <div className="p-4 sm:p-5 md:p-6 lg:p-7">
                  <ClassListView
                    classes={classes}
                    onView={openViewDialog}
                    onEdit={openEditDialog}
                    onDelete={handleClassDeleteCheck}
                  />
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 px-6">
              <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
                <BookOpen className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                No classes found
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center mb-6 max-w-md">
                {searchTerm || gradeFilter !== 'all' || schoolFilter !== 'all' || boardFilter !== 'all'
                  ? 'No classes match your current search and filter criteria. Try adjusting your filters.'
                  : 'Create your first class to get started with class management.'
                }
              </p>
              {(!searchTerm && gradeFilter === 'all' && schoolFilter === 'all' && boardFilter === 'all') && (
                <Button 
                  onClick={() => setIsCreateDialogOpen(true)}
                  className="bg-[#8DC63F] hover:bg-[#7AB82F] text-white"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create Class
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Class Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={(open) => {
        setIsCreateDialogOpen(open);
        if (!open) {
          resetForm();
        }
      }}>
        <DialogContent className="max-w-5xl max-h-[90vh] flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle>Create New Class</DialogTitle>
            <DialogDescription>
              Add a new class or academic section to the system. Fill in the required information below.
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto pr-6 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 dark:scrollbar-thumb-gray-600 dark:scrollbar-track-gray-800">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4 px-2">
            <div className="space-y-2">
              <Label htmlFor="name" className={validationErrors.name ? 'text-red-500' : ''}>Class Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => {
                  const value = e.target.value;
                  setFormData({ ...formData, name: value });
                  // Real-time validation
                  const error = validateClassName(value);
                  setValidationErrors(prev => ({ ...prev, name: error }));
                }}
                placeholder="e.g., Class 10A"
                className={validationErrors.name ? 'border-red-500 focus:border-red-500' : ''}
              />
              {validationErrors.name && (
                <p className="text-sm text-red-500">{validationErrors.name}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="code" className={validationErrors.code ? 'text-red-500' : ''}>Class Code *</Label>
              <Input
                id="code"
                value={formData.code}
                onChange={(e) => {
                  const value = e.target.value.toUpperCase();
                  setFormData({ ...formData, code: value });
                  // Real-time validation
                  const error = validateClassCode(value);
                  setValidationErrors(prev => ({ ...prev, code: error }));
                }}
                placeholder="e.g., C10A-001"
                maxLength={10}
                className={validationErrors.code ? 'border-red-500 focus:border-red-500' : ''}
              />
              {validationErrors.code && (
                <p className="text-sm text-red-500">{validationErrors.code}</p>
              )}
            </div>
                         <div className="space-y-2">
               <Label htmlFor="grade" className={validationErrors.grade ? 'text-red-500' : ''}>Grade *</Label>
               <Select
                 value={formData.grade}
                 onValueChange={(value) => {
                   setFormData({ ...formData, grade: value });
                   // Real-time validation
                   const error = validateClassGrade(value);
                   setValidationErrors(prev => ({ ...prev, grade: error }));
                 }}
               >
                 <SelectTrigger className={`bg-background border-border hover:border-primary/30 focus:border-primary dark:bg-background dark:border-border ${validationErrors.grade ? 'border-red-500 focus:border-red-500 dark:border-red-500' : ''}`}>
                   <SelectValue placeholder="Select grade" />
                 </SelectTrigger>
                 <SelectContent className="bg-popover border-border dark:bg-popover dark:border-border">
                   <SelectItem value="1" className="focus:bg-accent focus:text-accent-foreground dark:focus:bg-accent dark:focus:text-accent-foreground">Grade 1</SelectItem>
                   <SelectItem value="2" className="focus:bg-accent focus:text-accent-foreground dark:focus:bg-accent dark:focus:text-accent-foreground">Grade 2</SelectItem>
                   <SelectItem value="3" className="focus:bg-accent focus:text-accent-foreground dark:focus:bg-accent dark:focus:text-accent-foreground">Grade 3</SelectItem>
                   <SelectItem value="4" className="focus:bg-accent focus:text-accent-foreground dark:focus:bg-accent dark:focus:text-accent-foreground">Grade 4</SelectItem>
                   <SelectItem value="5" className="focus:bg-accent focus:text-accent-foreground dark:focus:bg-accent dark:focus:text-accent-foreground">Grade 5</SelectItem>
                   <SelectItem value="6" className="focus:bg-accent focus:text-accent-foreground dark:focus:bg-accent dark:focus:text-accent-foreground">Grade 6</SelectItem>
                   <SelectItem value="7" className="focus:bg-accent focus:text-accent-foreground dark:focus:bg-accent dark:focus:text-accent-foreground">Grade 7</SelectItem>
                   <SelectItem value="8" className="focus:bg-accent focus:text-accent-foreground dark:focus:bg-accent dark:focus:text-accent-foreground">Grade 8</SelectItem>
                   <SelectItem value="9" className="focus:bg-accent focus:text-accent-foreground dark:focus:bg-accent dark:focus:text-accent-foreground">Grade 9</SelectItem>
                   <SelectItem value="10" className="focus:bg-accent focus:text-accent-foreground dark:focus:bg-accent dark:focus:text-accent-foreground">Grade 10</SelectItem>
                   <SelectItem value="11" className="focus:bg-accent focus:text-accent-foreground dark:focus:bg-accent dark:focus:text-accent-foreground">Grade 11</SelectItem>
                   <SelectItem value="12" className="focus:bg-accent focus:text-accent-foreground dark:focus:bg-accent dark:focus:text-accent-foreground">Grade 12</SelectItem>
                 </SelectContent>
               </Select>
               {validationErrors.grade && (
                 <p className="text-sm text-red-500">{validationErrors.grade}</p>
               )}
             </div>
             <div className="space-y-2">
               <Label htmlFor="board" className={validationErrors.board_id ? 'text-red-500' : ''}>Board *</Label>
               <Select
                 value={formData.board_id}
                 onValueChange={(boardId) => {
                   handleBoardChange(boardId);
                   // Real-time validation
                   const error = validateClassBoard(boardId);
                   setValidationErrors(prev => ({ ...prev, board_id: error }));
                 }}
               >
                 <SelectTrigger className={`bg-background border-border hover:border-primary/30 focus:border-primary dark:bg-background dark:border-border ${validationErrors.board_id ? 'border-red-500 focus:border-red-500 dark:border-red-500' : ''}`}>
                   <SelectValue placeholder="Select board" />
                 </SelectTrigger>
                 <SelectContent className="bg-popover border-border dark:bg-popover dark:border-border">
                   {boards.map((board) => (
                     <SelectItem key={board.id} value={board.id} className="focus:bg-accent focus:text-accent-foreground dark:focus:bg-accent dark:focus:text-accent-foreground">
                       {board.name}
                     </SelectItem>
                   ))}
                 </SelectContent>
               </Select>
               {validationErrors.board_id && (
                 <p className="text-sm text-red-500">{validationErrors.board_id}</p>
               )}
             </div>
             <div className="space-y-2">
               <Label htmlFor="school" className={validationErrors.school_id ? 'text-red-500' : ''}>School *</Label>
               <Select
                 value={formData.school_id}
                 onValueChange={(value) => {
                   setFormData({ ...formData, school_id: value });
                   // Real-time validation
                   const error = validateClassSchool(value);
                   setValidationErrors(prev => ({ ...prev, school_id: error }));
                 }}
                 disabled={!formData.board_id}
               >
                 <SelectTrigger className={`bg-background border-border hover:border-primary/30 focus:border-primary dark:bg-background dark:border-border ${!formData.board_id ? "opacity-50 cursor-not-allowed" : ""} ${validationErrors.school_id ? 'border-red-500 focus:border-red-500 dark:border-red-500' : ''}`}>
                   <SelectValue placeholder={!formData.board_id ? "Select a board first" : "Select school"} />
                 </SelectTrigger>
                 <SelectContent className="bg-popover border-border dark:bg-popover dark:border-border">
                   {schools.length > 0 ? (
                     schools.map((school) => (
                       <SelectItem key={school.id} value={school.id} className="focus:bg-accent focus:text-accent-foreground dark:focus:bg-accent dark:focus:text-accent-foreground">
                         {school.name}
                       </SelectItem>
                     ))
                   ) : (
                     <SelectItem value="no-schools" disabled className="focus:bg-accent focus:text-accent-foreground dark:focus:bg-accent dark:focus:text-accent-foreground">
                       {formData.board_id ? "No schools found for this board" : "Select a board first"}
                     </SelectItem>
                   )}
                 </SelectContent>
               </Select>
               {validationErrors.school_id && (
                 <p className="text-sm text-red-500">{validationErrors.school_id}</p>
               )}
             </div>
             <div className="space-y-2">
               <Label htmlFor="max_students" className={validationErrors.max_students ? 'text-red-500' : ''}>Max Students *</Label>
               <Input
                 id="max_students"
                 type="text"
                 value={formData.max_students}
                 onChange={(e) => {
                   const value = e.target.value;
                   setFormData({ ...formData, max_students: value });
                   // Real-time validation
                   const error = validateClassMaxStudents(value);
                   setValidationErrors(prev => ({ ...prev, max_students: error }));
                 }}
                 placeholder="e.g., 30"
                 className={validationErrors.max_students ? 'border-red-500 focus:border-red-500' : ''}
               />
               <p className="text-xs text-muted-foreground">Maximum number of students allowed in this class</p>
               {validationErrors.max_students && (
                 <p className="text-sm text-red-500">{validationErrors.max_students}</p>
               )}
             </div>

            
                                        <div className="space-y-2 md:col-span-2">
                 <Label htmlFor="description" className={validationErrors.description ? 'text-red-500' : ''}>Description</Label>
                 <Textarea
                   id="description"
                   value={formData.description}
                   onChange={(e) => {
                     const value = e.target.value;
                     setFormData({ ...formData, description: value });
                     // Real-time validation
                     const error = validateClassDescription(value);
                     setValidationErrors(prev => ({ ...prev, description: error }));
                   }}
                   placeholder="Class description and focus areas..."
                   rows={3}
                   className={validationErrors.description ? 'border-red-500 focus:border-red-500' : ''}
                 />
                 {validationErrors.description && (
                   <p className="text-sm text-red-500">{validationErrors.description}</p>
                 )}
                 <p className="text-xs text-muted-foreground">
                   {formData.description.length}/500 characters
                 </p>
               </div>

             {/* Access Management Section */}
             <div className="space-y-4 md:col-span-2">
               <div className="space-y-2">
                 <Label>Manage Teachers</Label>
                 <div className="space-y-2">
                   <MultiSelect
                     options={teachers.map(teacher => ({
  value: teacher.id,
  label: teacher.name,
  subLabel: teacher.email,
  imageUrl: teacher.avatar_url
}))}
                     onValueChange={(selectedIds) => handleMembersChange('teachers', selectedIds)}
                     value={formData.teachers}
                     placeholder="Search and select teachers..."
                     className="min-h-[44px] border-2 border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all duration-300"
                   />
                 </div>
                 <p className="text-xs text-muted-foreground">Teachers can edit course content, manage students, and view analytics</p>
               </div>

               <div className="space-y-2">
                 <Label>Manage Students</Label>
                 <div className="space-y-2">
                   <MultiSelect
                     options={students.map(student => ({
  value: student.id,
  label: student.name,
  subLabel: student.email,
  imageUrl: student.avatar_url
}))}
                     onValueChange={(selectedIds) => handleMembersChange('students', selectedIds)}
                     value={formData.students}
                     placeholder="Search and select students..."
                     className={`min-h-[44px] border-2 rounded-xl bg-white dark:bg-gray-800 focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all duration-300 ${
                       isStudentLimitExceeded() 
                         ? 'border-red-300 dark:border-red-600' 
                         : 'border-gray-200 dark:border-gray-700'
                     }`}
                   />
                 </div>
                 <div className="space-y-1">
                   <p className="text-xs text-muted-foreground">Students can access course content, submit assignments, and track progress</p>
                   {getStudentLimitStatus() && (
                     <p className={`text-xs ${getStudentLimitStatus()?.className}`}>
                       {getStudentLimitStatus()?.message}
                     </p>
                   )}
                 </div>
               </div>
             </div>
            </div>
          </div>
          <DialogFooter className="flex-shrink-0">
            <Button 
              variant="outline" 
              onClick={() => setIsCreateDialogOpen(false)}
              disabled={isCreating}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleCreate} 
              className="bg-[#8DC63F] hover:bg-[#7AB82F] text-white"
              disabled={isCreating || !!validationErrors.name || !!validationErrors.code || !!validationErrors.grade || !!validationErrors.board_id || !!validationErrors.school_id || !!validationErrors.max_students || !!validationErrors.description}
            >
              {isCreating ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Creating...
                </>
              ) : (
                'Create Class'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Class Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={(open) => {
        setIsEditDialogOpen(open);
        if (!open) {
          setEditingClass(null);
          resetForm();
        }
      }}>
        <DialogContent className="max-w-5xl max-h-[90vh] flex flex-col border-primary/20">
          <DialogHeader className="flex-shrink-0 border-b border-primary/10 pb-4">
            <DialogTitle className="text-primary text-xl font-semibold">Edit Class</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Update the information for {editingClass?.name || 'the class'}.
            </DialogDescription>
          </DialogHeader>
          {isUpdating && !editingClass && (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-muted-foreground">Loading class details...</p>
              </div>
            </div>
          )}
          {(!isUpdating || editingClass) && (
            <div className="flex-1 overflow-y-auto pr-6 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 dark:scrollbar-thumb-gray-600 dark:scrollbar-track-gray-800">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4 px-2">
            <div className="space-y-2">
              <Label htmlFor="edit-name" className={validationErrors.name ? 'text-red-500' : ''}>Class Name *</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => {
                  const value = e.target.value;
                  setFormData({ ...formData, name: value });
                  // Real-time validation
                  const error = validateClassName(value);
                  setValidationErrors(prev => ({ ...prev, name: error }));
                }}
                placeholder="e.g., Class 10A"
                className={validationErrors.name ? 'border-red-500 focus:border-red-500' : ''}
              />
              {validationErrors.name && (
                <p className="text-sm text-red-500">{validationErrors.name}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-code" className={validationErrors.code ? 'text-red-500' : ''}>Class Code *</Label>
              <Input
                id="edit-code"
                value={formData.code}
                onChange={(e) => {
                  const value = e.target.value.toUpperCase();
                  setFormData({ ...formData, code: value });
                  // Real-time validation
                  const error = validateClassCode(value);
                  setValidationErrors(prev => ({ ...prev, code: error }));
                }}
                placeholder="e.g., C10A-001"
                maxLength={10}
                className={validationErrors.code ? 'border-red-500 focus:border-red-500' : ''}
              />
              {validationErrors.code && (
                <p className="text-sm text-red-500">{validationErrors.code}</p>
              )}
            </div>
                         <div className="space-y-2">
               <Label htmlFor="edit-grade" className={validationErrors.grade ? 'text-red-500' : ''}>Grade *</Label>
               <Select
                 value={formData.grade}
                 onValueChange={(value) => {
                   setFormData({ ...formData, grade: value });
                   // Real-time validation
                   const error = validateClassGrade(value);
                   setValidationErrors(prev => ({ ...prev, grade: error }));
                 }}
               >
                 <SelectTrigger className={`bg-background border-border hover:border-primary/30 focus:border-primary dark:bg-background dark:border-border ${validationErrors.grade ? 'border-red-500 focus:border-red-500 dark:border-red-500' : ''}`}>
                   <SelectValue placeholder="Select grade" />
                 </SelectTrigger>
                 <SelectContent className="bg-popover border-border dark:bg-popover dark:border-border">
                   <SelectItem value="1" className="focus:bg-accent focus:text-accent-foreground dark:focus:bg-accent dark:focus:text-accent-foreground">Grade 1</SelectItem>
                   <SelectItem value="2" className="focus:bg-accent focus:text-accent-foreground dark:focus:bg-accent dark:focus:text-accent-foreground">Grade 2</SelectItem>
                   <SelectItem value="3" className="focus:bg-accent focus:text-accent-foreground dark:focus:bg-accent dark:focus:text-accent-foreground">Grade 3</SelectItem>
                   <SelectItem value="4" className="focus:bg-accent focus:text-accent-foreground dark:focus:bg-accent dark:focus:text-accent-foreground">Grade 4</SelectItem>
                   <SelectItem value="5" className="focus:bg-accent focus:text-accent-foreground dark:focus:bg-accent dark:focus:text-accent-foreground">Grade 5</SelectItem>
                   <SelectItem value="6" className="focus:bg-accent focus:text-accent-foreground dark:focus:bg-accent dark:focus:text-accent-foreground">Grade 6</SelectItem>
                   <SelectItem value="7" className="focus:bg-accent focus:text-accent-foreground dark:focus:bg-accent dark:focus:text-accent-foreground">Grade 7</SelectItem>
                   <SelectItem value="8" className="focus:bg-accent focus:text-accent-foreground dark:focus:bg-accent dark:focus:text-accent-foreground">Grade 8</SelectItem>
                   <SelectItem value="9" className="focus:bg-accent focus:text-accent-foreground dark:focus:bg-accent dark:focus:text-accent-foreground">Grade 9</SelectItem>
                   <SelectItem value="10" className="focus:bg-accent focus:text-accent-foreground dark:focus:bg-accent dark:focus:text-accent-foreground">Grade 10</SelectItem>
                   <SelectItem value="11" className="focus:bg-accent focus:text-accent-foreground dark:focus:bg-accent dark:focus:text-accent-foreground">Grade 11</SelectItem>
                   <SelectItem value="12" className="focus:bg-accent focus:text-accent-foreground dark:focus:bg-accent dark:focus:text-accent-foreground">Grade 12</SelectItem>
                 </SelectContent>
               </Select>
               {validationErrors.grade && (
                 <p className="text-sm text-red-500">{validationErrors.grade}</p>
               )}
             </div>
             <div className="space-y-2">
               <Label htmlFor="edit-board" className={validationErrors.board_id ? 'text-red-500' : ''}>Board *</Label>
               <Select
                 value={formData.board_id}
                 onValueChange={(boardId) => {
                   handleBoardChange(boardId);
                   // Real-time validation
                   const error = validateClassBoard(boardId);
                   setValidationErrors(prev => ({ ...prev, board_id: error }));
                 }}
               >
                 <SelectTrigger className={`bg-background border-border hover:border-primary/30 focus:border-primary dark:bg-background dark:border-border ${validationErrors.board_id ? 'border-red-500 focus:border-red-500 dark:border-red-500' : ''}`}>
                   <SelectValue placeholder="Select board" />
                 </SelectTrigger>
                 <SelectContent className="bg-popover border-border dark:bg-popover dark:border-border">
                   {boards.map((board) => (
                     <SelectItem key={board.id} value={board.id} className="focus:bg-accent focus:text-accent-foreground dark:focus:bg-accent dark:focus:text-accent-foreground">
                       {board.name}
                     </SelectItem>
                   ))}
                 </SelectContent>
               </Select>
               {validationErrors.board_id && (
                 <p className="text-sm text-red-500">{validationErrors.board_id}</p>
               )}
             </div>
             <div className="space-y-2">
               <Label htmlFor="edit-school" className={validationErrors.school_id ? 'text-red-500' : ''}>School *</Label>
               <Select
                 value={formData.school_id}
                 onValueChange={(value) => {
                   setFormData({ ...formData, school_id: value });
                   // Real-time validation
                   const error = validateClassSchool(value);
                   setValidationErrors(prev => ({ ...prev, school_id: error }));
                 }}
                 disabled={!formData.board_id}
               >
                 <SelectTrigger className={`bg-background border-border hover:border-primary/30 focus:border-primary dark:bg-background dark:border-border ${!formData.board_id ? "opacity-50 cursor-not-allowed" : ""} ${validationErrors.school_id ? 'border-red-500 focus:border-red-500 dark:border-red-500' : ''}`}>
                   <SelectValue placeholder={!formData.board_id ? "Select a board first" : "Select school"} />
                 </SelectTrigger>
                 <SelectContent className="bg-popover border-border dark:bg-popover dark:border-border">
                   {schools.length > 0 ? (
                     schools.map((school) => (
                       <SelectItem key={school.id} value={school.id} className="focus:bg-accent focus:text-accent-foreground dark:focus:bg-accent dark:focus:text-accent-foreground">
                         {school.name}
                       </SelectItem>
                     ))
                   ) : (
                     <SelectItem value="no-schools" disabled className="focus:bg-accent focus:text-accent-foreground dark:focus:bg-accent dark:focus:text-accent-foreground">
                       {formData.board_id ? "No schools found for this board" : "Select a board first"}
                     </SelectItem>
                   )}
                 </SelectContent>
               </Select>
               {validationErrors.school_id && (
                 <p className="text-sm text-red-500">{validationErrors.school_id}</p>
               )}
             </div>
             <div className="space-y-2">
               <Label htmlFor="edit-max_students" className={validationErrors.max_students ? 'text-red-500' : ''}>Max Students *</Label>
               <Input
                 id="edit-max_students"
                 type="text"
                 value={formData.max_students}
                 onChange={(e) => {
                   const value = e.target.value;
                   setFormData({ ...formData, max_students: value });
                   // Real-time validation
                   const error = validateClassMaxStudents(value);
                   setValidationErrors(prev => ({ ...prev, max_students: error }));
                 }}
                 placeholder="e.g., 30"
                 className={validationErrors.max_students ? 'border-red-500 focus:border-red-500' : ''}
               />
               <p className="text-xs text-muted-foreground">Maximum number of students allowed in this class</p>
               {validationErrors.max_students && (
                 <p className="text-sm text-red-500">{validationErrors.max_students}</p>
               )}
             </div>

            
                         <div className="space-y-2 md:col-span-2">
               <Label htmlFor="edit-description" className={validationErrors.description ? 'text-red-500' : ''}>Description</Label>
               <Textarea
                 id="edit-description"
                 value={formData.description}
                 onChange={(e) => {
                   const value = e.target.value;
                   setFormData({ ...formData, description: value });
                   // Real-time validation
                   const error = validateClassDescription(value);
                   setValidationErrors(prev => ({ ...prev, description: error }));
                 }}
                 placeholder="Class description and focus areas..."
                 rows={3}
                 className={validationErrors.description ? 'border-red-500 focus:border-red-500' : ''}
               />
               {validationErrors.description && (
                 <p className="text-sm text-red-500">{validationErrors.description}</p>
               )}
               <p className="text-xs text-muted-foreground">
                 {formData.description.length}/500 characters
               </p>
             </div>

             {/* Access Management Section */}
             <div className="space-y-4 md:col-span-2">
               <div className="space-y-2">
                 <Label>Manage Teachers</Label>
                 <div className="space-y-2">
                   <MultiSelect
                     options={teachers.map(teacher => ({
  value: teacher.id,
  label: teacher.name,
  subLabel: teacher.email,
  imageUrl: teacher.avatar_url
}))}
                     onValueChange={(selectedIds) => handleMembersChange('teachers', selectedIds)}
                     value={formData.teachers}
                     placeholder="Search and select teachers..."
                     className="min-h-[44px] border-2 border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all duration-300"
                   />
                 </div>
                 <p className="text-xs text-muted-foreground">Teachers can edit course content, manage students, and view analytics</p>
               </div>

               <div className="space-y-2">
                 <Label>Manage Students</Label>
                 <div className="space-y-2">
                   <MultiSelect
                     options={students.map(student => ({
  value: student.id,
  label: student.name,
  subLabel: student.email,
  imageUrl: student.avatar_url
}))}
                     onValueChange={(selectedIds) => handleMembersChange('students', selectedIds)}
                     value={formData.students}
                     placeholder="Search and select students..."
                     className={`min-h-[44px] border-2 rounded-xl bg-white dark:bg-gray-800 focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all duration-300 ${
                       isStudentLimitExceeded() 
                         ? 'border-red-300 dark:border-red-600' 
                         : 'border-gray-200 dark:border-gray-700'
                     }`}
                   />
                 </div>
                 <div className="space-y-1">
                   <p className="text-xs text-muted-foreground">Students can access course content, submit assignments, and track progress</p>
                   {getStudentLimitStatus() && (
                     <p className={`text-xs ${getStudentLimitStatus()?.className}`}>
                       {getStudentLimitStatus()?.message}
                     </p>
                   )}
                 </div>
               </div>
             </div>
            </div>
            </div>
          )}
          <DialogFooter className="flex-shrink-0 border-t border-primary/10 pt-4">
            <Button 
              variant="outline" 
              onClick={() => setIsEditDialogOpen(false)} 
              className="border-primary/20 text-primary hover:bg-primary/5"
              disabled={isUpdating || !editingClass}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleEdit} 
              className="bg-primary hover:bg-primary/90 text-white"
              disabled={isUpdating || !editingClass || !!validationErrors.name || !!validationErrors.code || !!validationErrors.grade || !!validationErrors.board_id || !!validationErrors.school_id || !!validationErrors.max_students || !!validationErrors.description}
            >
              {isUpdating ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Updating...
                </>
              ) : (
                'Update Class'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Class Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-5xl border-primary/20">
          <DialogHeader className="border-b border-primary/10 pb-4">
            <DialogTitle className="text-primary text-xl font-semibold">Class Details</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              View detailed information about {viewingClass?.name || 'the class'}.
            </DialogDescription>
          </DialogHeader>
          {isLoadingViewData && (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-muted-foreground">Loading class details...</p>
              </div>
            </div>
          )}
          {!isLoadingViewData && viewingClass && (
            <div className="space-y-6 py-4 px-2">
              {/* Basic Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Class Name</Label>
                    <p className="text-lg font-semibold">{viewingClass.name}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Class Code</Label>
                    <div className="mt-1">
                      <Badge variant="outline" className="text-sm">{viewingClass.code}</Badge>
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Grade</Label>
                    <div className="mt-1">{getGradeBadge(viewingClass.grade)}</div>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">School</Label>
                    <p className="text-lg">{viewingClass.school}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Max Students</Label>
                    <p className="text-lg font-semibold text-primary">{viewingClass.max_students || 30}</p>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Board</Label>
                    <div className="mt-1">
                      <Badge variant="outline" className="text-sm">{viewingClass.board}</Badge>
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Created</Label>
                    <p className="text-sm text-muted-foreground">{new Date(viewingClass.created_at).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Last Updated</Label>
                    <p className="text-sm text-muted-foreground">{new Date(viewingClass.updated_at).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}</p>
                  </div>
                </div>
              </div>

              {/* Description */}
              {viewingClass.description && (
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Description</Label>
                  <p className="text-sm mt-1 p-3 bg-gray-50 dark:bg-gray-800 rounded-md">{viewingClass.description}</p>
                </div>
              )}

              {/* Members Section */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Teachers ({viewingClass.teachers.length})</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {viewingClass.teachers.length > 0 ? (
                      viewingClass.teachers.map((teacher, index) => (
                        <Badge key={index} variant="default" className="bg-primary text-white">
                          {teacher.name}
                        </Badge>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground italic">No teachers assigned</p>
                    )}
                  </div>
                </div>
                
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Students ({viewingClass.students.length})</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {viewingClass.students.length > 0 ? (
                      viewingClass.students.map((student, index) => (
                        <Badge key={index} variant="outline" className="border-primary/30 text-primary">
                          {student.name}
                        </Badge>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground italic">No students enrolled</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
          <DialogFooter className="border-t border-primary/10 pt-4">
            <Button variant="outline" onClick={() => setIsViewDialogOpen(false)} className="border-primary/20 text-primary hover:bg-primary/5">
              Close
            </Button>
            {viewingClass && (
              <Button onClick={() => {
                setIsViewDialogOpen(false);
                openEditDialog(viewingClass);
              }} className="bg-primary hover:bg-primary/90 text-white">
                Edit Class
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Class Confirmation Dialog */}
      <AlertDialog open={!!classToDelete} onOpenChange={(open) => {
        if (!open) {
          handleClassDeleteCancel();
        }
      }}>
        <AlertDialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
          <AlertDialogHeader className="flex-shrink-0">
            <AlertDialogTitle>Delete Class</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{classToDelete?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          {/* Scrollable Content Area */}
          <div className="flex-1 overflow-y-auto min-h-0">
            {/* Dependency Information */}
            {isCheckingClassDependencies && (
              <div className="flex items-center justify-center py-8">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mx-auto mb-4"></div>
                  <p className="text-muted-foreground">Checking dependencies...</p>
                </div>
              </div>
            )}

            {classDependencies && !isCheckingClassDependencies && (
              <div className="py-4">
                {(() => {
                  const hasDependencies = classDependencies.courses.length > 0;
                  
                  if (hasDependencies) {
                    return (
                      <div className="space-y-4">
                        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                            <h4 className="font-semibold text-red-800 dark:text-red-200">Cannot Delete Class</h4>
                          </div>
                          <p className="text-red-700 dark:text-red-300 text-sm">
                            This class cannot be deleted because it has active dependencies:
                          </p>
                        </div>

                        {classDependencies.courses.length > 0 && (
                          <div className="space-y-2">
                            <h5 className="font-medium text-sm text-muted-foreground">Active Courses:</h5>
                            <div className="space-y-1">
                              {classDependencies.courses.map((course: any) => (
                                <div key={course.id} className="p-2 bg-muted/50 rounded text-sm">
                                  {course.title}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  } else {
                    return (
                      <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                          <h4 className="font-semibold text-green-800 dark:text-green-200">Safe to Delete</h4>
                        </div>
                        <p className="text-green-700 dark:text-green-300 text-sm">
                          This class has no active dependencies and can be safely deleted.
                        </p>
                      </div>
                    );
                  }
                })()}
              </div>
            )}
          </div>

          <AlertDialogFooter className="flex-shrink-0 border-t pt-4">
            <AlertDialogCancel onClick={handleClassDeleteCancel}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleClassDeleteConfirm}
              className="bg-red-600 hover:bg-red-700"
              disabled={isCheckingClassDependencies || (classDependencies && (
                classDependencies.courses.length
              ) > 0)}
            >
              {isCheckingClassDependencies ? 'Checking...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ClassManagement;
