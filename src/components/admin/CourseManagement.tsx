import {
  BookOpen,
  CheckCircle,
  Edit,
  Edit3,
  Filter,
  MoreVertical,
  Plus,
  Users,
  Eye,
  Clock,
  ListFilter,
  PlusCircle,
  Search,
  MoreHorizontal,
  Trash2,
  Upload,
  Download,
  FileSpreadsheet,
  AlertTriangle,
  CheckCircle2,
  XCircle
} from "lucide-react"
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "../ui/input"
import { useNavigate } from "react-router-dom"
import { useState, useEffect, useCallback } from "react"
import { supabase } from "@/integrations/supabase/client"
import { toast } from "sonner"
import { Skeleton } from "../ui/skeleton"
import { EmptyState } from "../EmptyState"
import { useAuth } from "@/hooks/useAuth"
import { useUserProfile } from "@/hooks/useUserProfile"
import { useViewPreferences } from '@/contexts/ViewPreferencesContext'
import { ViewToggle } from '@/components/ui/ViewToggle'
import { CourseTileView } from '@/components/course/CourseTileView'
import { CourseListView } from '@/components/course/CourseListView'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { FileUpload } from "@/components/ui/FileUpload"
import { ContentLoader } from "../ContentLoader";
import { cn } from "@/lib/utils";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { PaginationControls } from '@/components/ui/PaginationControls';
import AccessLogService from "@/services/accessLogService";
import { useBatchUpload } from "@/hooks/useBatchUpload";

type CourseStatus = "Published" | "Draft" | "Under Review" | "Rejected";

interface Course {
  id: string;
  title: string;
  status: CourseStatus;
  imageUrl: string;
  imagePath?: string;
  totalStudents: number;
  totalTeachers: number;
  totalLessons: number;
  authorName: string;
  authorId: string;
  duration: string;
}

const CourseCard = ({ course, onDelete }: { course: Course, onDelete: (course: Course) => void }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { profile } = useUserProfile();

  const isAdmin = profile?.role === 'admin' || profile?.role === 'super_user';
  const isContentCreator = profile?.role === 'content_creator';
  const isTeacher = profile?.role === 'teacher';

  // Check if user can delete the course
  // Admins/super users can delete any course
  // Content creators can delete courses they authored
  // Teachers can delete draft courses they authored
  const canDelete = profile && user && (
    (profile.role === 'admin' || profile.role === 'super_user') ||
    (profile.role === 'content_creator' && user.id === course.authorId) ||
    (profile.role === 'teacher' && course.status === 'Draft' && user.id === course.authorId)
  );

    return (
    <Card className="bg-card border border-border flex flex-col h-full">
      <CardHeader className="p-0 relative">
        <img src={course.imageUrl} alt={course.title} className="w-full h-32 sm:h-40 object-cover rounded-t-lg" />
        <Badge
          variant={
            course.status === 'Published' ? 'default' :
            course.status === 'Rejected' ? 'destructive' :
            course.status === 'Under Review' ? 'warning' :
            'blue'
          }
          className="absolute top-2 left-2 text-xs"
        >
          {course.status}
      </Badge>
      </CardHeader>
      <CardContent className="p-3 sm:p-4 space-y-2 flex-grow">
        <h3 className="font-semibold text-base sm:text-lg line-clamp-2 min-h-[3rem] sm:min-h-[3.5rem]">{course.title}</h3>
        <p className="text-xs sm:text-sm text-muted-foreground truncate">by {course.authorName}</p>
        <div className="flex justify-between text-xs sm:text-sm text-muted-foreground">
          <span className="truncate">{course.duration}</span>
          <span className="truncate">{course.totalLessons} lessons</span>
        </div>
        <div className="flex items-center justify-between gap-2 text-xs sm:text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Users className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
            <span className="truncate">{course.totalStudents} students</span>
          </div>
          <div className="flex items-center gap-2">
            <Users className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
            <span className="truncate">{course.totalTeachers} teachers</span>
          </div>
        </div>
      </CardContent>
      <CardFooter className="p-3 sm:p-4 pt-0 mt-auto">
        {(isAdmin || isContentCreator) ? (
          <Button 
            onClick={() => navigate(`/dashboard/courses/builder/${course.id}`)}
            className="w-full bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary text-white py-2 sm:py-3 text-sm sm:text-base font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5 hover:scale-105 rounded-lg sm:rounded-xl"
          >
            <Edit3 className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
            <span className="truncate">Edit Course</span>
          </Button>
        ) : (
          <Button 
            onClick={() => navigate(`/dashboard/courses/${course.id}`)}
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground py-2 sm:py-3 text-sm sm:text-base font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5 hover:scale-105 rounded-lg sm:rounded-xl"
          >
            <Eye className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
            <span className="truncate">View Course</span>
          </Button>
        )}
      </CardFooter>
    </Card>
  )
}

const CourseManagement = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { profile } = useUserProfile();
  const { preferences, setTeacherCourseView } = useViewPreferences();
  
  // Check user role for UI restrictions
  const isAdmin = profile?.role === 'admin' || profile?.role === 'super_user';
  const isContentCreator = profile?.role === 'content_creator';
  const isTeacher = profile?.role === 'teacher';
  
  // Content creators can create/edit courses like admins
  const canCreateCourses = isAdmin || isContentCreator;
  
  console.log('🔍 CourseManagement: Component rendered, role:', profile?.role, 'isAdmin:', isAdmin);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<CourseStatus | "All">("All");
  const [courseToDelete, setCourseToDelete] = useState<Course | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  // Get default items per page based on current view
  const getDefaultItemsPerPage = (view: string) => {
    switch (view) {
      case 'card': return 8;
      case 'tile': return 16; // Tile view should show 16 items per page
      case 'list': return 8;
      default: return 8;
    }
  };
  
  const [rowsPerPage, setRowsPerPage] = useState(getDefaultItemsPerPage(preferences.teacherCourseView));
  const [totalCourses, setTotalCourses] = useState(0);
  const [stats, setStats] = useState({
    total: 0,
    published: 0,
    draft: 0,
  });
  const [totalStudents, setTotalStudents] = useState(0);
  const [loadingStats, setLoadingStats] = useState(true);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  
  // Bulk upload states
  const [isBulkUploadOpen, setIsBulkUploadOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  
  // Batch upload hook
  const { 
    state: batchState, 
    resetState: resetBatchState, 
    startBatchUpload 
  } = useBatchUpload();

  const fetchStats = useCallback(async () => {
    if (!user) {
      return;
    }
    setLoadingStats(true);

    try {
      console.log('🔍 CourseManagement: fetchStats called, user:', user.id);
      
      // Get role from profiles table (not app_metadata which doesn't have it)
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (profileError) {
        console.error('❌ CourseManagement: Error fetching profile role:', profileError);
        toast.error("Could not verify user role.", { description: profileError.message });
        throw profileError;
      }

      const role = profileData?.role;
      console.log('🔍 CourseManagement: User role from profile:', role);

      if (role === 'admin' || role === 'super_user') {
        console.log('📊 CourseManagement: Fetching admin/super_user stats');
        const [totalRes, publishedRes, draftRes, studentsRes] = await Promise.all([
            supabase.from('courses').select('id', { count: 'exact', head: true }),
            supabase.from('courses').select('id', { count: 'exact', head: true }).eq('status', 'Published'),
            supabase.from('courses').select('id', { count: 'exact', head: true }).eq('status', 'Draft'),
            supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'student')
        ]);


        if (totalRes.error || publishedRes.error || draftRes.error || studentsRes.error) {
            console.error("fetchStats (Admin) - Error in Promise.all:", {
              totalError: totalRes.error,
              publishedError: publishedRes.error,
              draftError: draftRes.error,
              studentsError: studentsRes.error
            });
            throw totalRes.error || publishedRes.error || draftRes.error || studentsRes.error;
        }

        const statsToSet = {
            total: totalRes.count || 0,
            published: publishedRes.count || 0,
            draft: draftRes.count || 0,
        };
        const studentsToSet = studentsRes.count || 0;

        console.log('✅ CourseManagement: Admin stats fetched:', statsToSet, 'students:', studentsToSet);
        setStats(statsToSet);
        setTotalStudents(studentsToSet);

      } else if (role === 'teacher' || role === 'content_creator') {
        console.log('📊 CourseManagement: Fetching teacher/content_creator stats');
        
        // Build queries with proper filtering for content creators
        let totalQuery = supabase.from('courses').select('id', { count: 'exact', head: true });
        let publishedQuery = supabase.from('courses').select('id', { count: 'exact', head: true }).eq('status', 'Published');
        let draftQuery = supabase.from('courses').select('id', { count: 'exact', head: true }).eq('status', 'Draft');
        
        // Content creators should only see courses they authored (explicit filtering)
        if (role === 'content_creator') {
          totalQuery = totalQuery.eq('author_id', user.id);
          publishedQuery = publishedQuery.eq('author_id', user.id);
          draftQuery = draftQuery.eq('author_id', user.id);
        }
        // Teachers will be filtered by RLS policies (they can see courses they're members of)
        
        const [totalRes, publishedRes, draftRes] = await Promise.all([
            totalQuery,
            publishedQuery,
            draftQuery,
        ]);
        

        if (totalRes.error || publishedRes.error || draftRes.error) {
            console.error("fetchStats (Teacher) - Error fetching course counts:", { totalRes, publishedRes, draftRes });
            throw totalRes.error || publishedRes.error || draftRes.error;
        }

        const statsToSet = {
            total: totalRes.count || 0,
            published: publishedRes.count || 0,
            draft: draftRes.count || 0,
        };
        setStats(statsToSet);

        // For student count, we need the IDs of visible courses.
        let coursesQuery = supabase.from('courses').select('id');
        
        // Apply same filtering for content creators
        if (role === 'content_creator') {
          coursesQuery = coursesQuery.eq('author_id', user.id);
        }
        
        const { data: visibleCourses, error: coursesError } = await coursesQuery;
        if (coursesError) throw coursesError;

        if (visibleCourses && visibleCourses.length > 0) {
            const courseIds = visibleCourses.map(c => c.id);
            const { data: studentMembers, error: studentsError } = await supabase
                .from('course_members')
                .select('user_id')
                .in('course_id', courseIds)
                .eq('role', 'student');
            
            if (studentsError) throw studentsError;

            if (studentMembers) {
                const uniqueStudentIds = new Set(studentMembers.map(member => member.user_id));
                const studentsToSet = uniqueStudentIds.size;
                setTotalStudents(studentsToSet);
            } else {
                setTotalStudents(0);
            }
        } else {
            setTotalStudents(0);
        }
      } else {
        setStats({ total: 0, published: 0, draft: 0 });
        setTotalStudents(0);
      }
    } catch (error: any) {
      toast.error("Failed to load dashboard statistics.", { description: error.message });
      console.error("Error fetching stats:", error);
    } finally {
      setLoadingStats(false);
    }
  }, [user]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const from = (currentPage - 1) * rowsPerPage;
      const to = from + rowsPerPage - 1;

      let query = supabase
        .from('courses')
        .select(`
          id,
          title,
          status,
          image_url,
          duration,
          author_id,
          author:profiles (
            first_name,
            last_name
          ),
          members:course_members (id, role),
          sections:course_sections(lessons:course_lessons(id))
        `, { count: 'exact' });

      // Apply role-based filtering to ensure content creators only see their own courses
      if (isContentCreator && user?.id) {
        // Content creators should only see courses they authored
        query = query.eq('author_id', user.id);
      }
      // Admins and super users can see all courses (no additional filtering needed)
      // Teachers are handled by RLS policies

      if (searchQuery) {
        query = query.ilike('title', `%${searchQuery}%`);
      }

      if (statusFilter && statusFilter !== 'All') {
        query = query.eq('status', statusFilter);
      }

      const { data: coursesData, error: coursesError, count } = await query.range(from, to);

      if (coursesError) {
        throw coursesError;
      }

      if (coursesData) {
        const transformedCourses = await Promise.all(coursesData.map(async (course: any) => {
          const authorProfile = course.author as { first_name: string, last_name: string } | null;

          let imageUrl = '/placeholder.svg';
          if (course.image_url) {
            const { data: signedUrlData } = await supabase.storage.from('dil-lms').createSignedUrl(course.image_url, 60);
            if (signedUrlData) {
              imageUrl = signedUrlData.signedUrl;
            }
          }

          // Separate students and teachers from members
          const students = (course.members || []).filter((member: any) => member.role === 'student');
          const teachers = (course.members || []).filter((member: any) => member.role === 'teacher');

          return {
            id: course.id,
            title: course.title,
            status: course.status,
            imageUrl: imageUrl,
            imagePath: course.image_url,
            totalStudents: students.length,
            totalTeachers: teachers.length,
            totalLessons: (course.sections || []).reduce((acc: number, section: any) => acc + (section.lessons || []).length, 0),
            authorName: authorProfile ? `${authorProfile.first_name} ${authorProfile.last_name}`.trim() : 'N/A',
            authorId: course.author_id,
            duration: course.duration || 'N/A',
          };
        }));
        setCourses(transformedCourses);
        setTotalCourses(count || 0);
      }
    } catch (error: any) {
      toast.error("An unexpected error occurred.", { description: error.message });
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, statusFilter, currentPage, rowsPerPage, user]);

  // Update items per page when view changes
  useEffect(() => {
    const newRowsPerPage = getDefaultItemsPerPage(preferences.teacherCourseView);
    setRowsPerPage(newRowsPerPage);
    setCurrentPage(1); // Reset to first page when view changes
  }, [preferences.teacherCourseView]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter]);

  const handleCreateCourse = () => {
    // Log course creation attempt
    if (user) {
      AccessLogService.logCourseAction(
        user.id,
        user.email || 'unknown@email.com',
        'created',
        'new-course',
        'New Course'
      );
    }
    navigate('/dashboard/courses/builder/new');
  }

  const handleBulkUpload = async () => {
    if (!selectedFile) {
      toast.error("Please select a file to upload");
      return;
    }

    console.log('🚀 Starting bulk upload process...');
    console.log('📁 Selected file:', selectedFile.name);
    console.log('📊 Current batch state:', batchState);

    try {
      const result = await startBatchUpload(selectedFile);
      
      console.log('📡 Upload result received:', result);
      
      if (result && result.success) {
        console.log('✅ Upload successful, refreshing data...');
        // Refresh the course list and stats
        fetchData();
        fetchStats();
        
        // Close the dialog
        setIsBulkUploadOpen(false);
        setSelectedFile(null);
        resetBatchState();
      } else if (result && !result.success && result.errors) {
        console.log('⚠️ Validation errors occurred:', result.errors);
        // Validation errors occurred - keep dialog open to show errors
        // The errors are already set in the state by the hook
      } else {
        console.log('❌ Upload failed without specific result:', result);
      }
    } catch (error: any) {
      console.error('❌ Batch upload error:', error);
      console.error('❌ Error details:', {
        message: error.message,
        name: error.name,
        stack: error.stack
      });
      // Error handling is done in the hook
    }
  };

  const downloadTemplate = () => {
    const xlsxUrl = import.meta.env.VITE_COURSE_BULK_UPLOAD_XLSX_TEMPLATE_URL;
    
    if (xlsxUrl) {
      const link = document.createElement('a');
      link.href = xlsxUrl;
      link.download = 'course-bulk-upload-template.xlsx';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      toast.error("Template not available", { description: "Template URL not configured." });
    }
  };

  const handleDeleteConfirmed = async () => {
    if (!courseToDelete) return;

    try {
      // First, check if the course can be safely deleted
      const { data: safetyCheck, error: safetyError } = await supabase.rpc('can_delete_course', {
        course_id_to_check: courseToDelete.id
      });

      if (safetyError) {
        console.warn('Safety check failed, proceeding with deletion:', safetyError);
      } else if (safetyCheck && safetyCheck.length > 0) {
        const checkResult = safetyCheck[0];
        if (!checkResult.can_delete) {
          // Show warning but allow deletion
          console.warn('Course has student data:', {
            reason: checkResult.reason,
            studentCount: Number(checkResult.student_count),
            progressCount: Number(checkResult.progress_count),
            submissionCount: Number(checkResult.submission_count)
          });
        }
      }

      // Also delete the image from storage.
      if (courseToDelete.imagePath) {
          const { error: storageError } = await supabase.storage.from('dil-lms').remove([courseToDelete.imagePath]);
          if (storageError) {
              toast.error("Could not delete course image. The course was not deleted.", { description: storageError.message });
              setCourseToDelete(null);
              return;
          }
      }

      // Try the safe delete function first
      let deleteSuccess = false;
      try {
        const { data: deleteResult, error } = await supabase.rpc('safe_delete_course', {
          course_id_to_delete: courseToDelete.id
        });
        
        if (error) {
          console.warn('Safe delete failed, trying direct deletion:', error);
          throw error; // This will trigger the fallback
        }
        
        deleteSuccess = true;
      } catch (deleteError) {
        // If the safe delete function fails, try the direct approach as fallback
        console.warn('Safe delete failed, trying direct deletion:', deleteError);
        
        try {
          const { error: directError } = await supabase.from('courses').delete().eq('id', courseToDelete.id);
          
          if (directError) {
            toast.error("Failed to delete course.", { description: directError.message });
            return;
          }
          
          deleteSuccess = true;
        } catch (directDeleteError: any) {
          toast.error("Failed to delete course.", { description: directDeleteError.message });
          return;
        }
      }
      
      if (!deleteSuccess) {
        toast.error("Failed to delete course.");
        return;
      }
      
      toast.success(`Course "${courseToDelete.title}" deleted successfully.`);
      
      // Log course deletion
      if (user) {
        await AccessLogService.logCourseAction(
          user.id,
          user.email || 'unknown@email.com',
          'deleted',
          courseToDelete.id,
          courseToDelete.title
        );
      }
      
      // Optimistically update the UI
      setCourses(prev => prev.filter(c => c.id !== courseToDelete.id));
      // You might want to re-calculate stats here as well
      fetchStats();
    } catch (error: any) {
      toast.error("Failed to delete course.", { description: error.message });
    } finally {
      setCourseToDelete(null);
    }
  };

  const { total, published, draft } = stats;
  const totalPages = Math.ceil(totalCourses / rowsPerPage);

  const handleItemsPerPageChange = (newRowsPerPage: number) => {
    setRowsPerPage(newRowsPerPage);
    setCurrentPage(1); // Reset to first page when changing items per page
  };

  return (
    <main className="space-y-4 sm:space-y-6 md:space-y-8 p-3 sm:p-4 md:p-6 lg:p-8">
      {/* Premium Header Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-primary/5 rounded-xl sm:rounded-2xl md:rounded-3xl"></div>
        <div className="relative p-3 sm:p-4 md:p-6 lg:p-8 rounded-xl sm:rounded-2xl md:rounded-3xl">
          {/* Desktop Layout */}
          <div className="hidden lg:flex lg:items-center lg:justify-between gap-3 lg:gap-4 overflow-hidden">
            <div className="flex items-center gap-2 md:gap-3 min-w-0 flex-1 overflow-hidden max-w-[60%]">
              <div className="w-10 h-10 md:w-12 md:h-12 bg-gradient-to-br from-primary/10 to-primary/20 rounded-xl md:rounded-2xl flex items-center justify-center flex-shrink-0">
                <BookOpen className="w-5 h-5 md:w-6 md:h-6 text-primary" />
              </div>
              <div className="min-w-0 flex-1 overflow-hidden">
                <h1 className="text-xl md:text-2xl lg:text-3xl xl:text-4xl font-bold tracking-tight bg-gradient-to-r from-primary via-primary to-primary/80 bg-clip-text text-transparent leading-tight break-words">
                  Course Management
                </h1>
                <p className="text-xs md:text-sm lg:text-base xl:text-lg text-muted-foreground font-light mt-0.5 md:mt-1 break-words">
                  Manage all courses in the system
                </p>
              </div>
            </div>
            
            {/* Show action buttons for admins and content creators */}
            {canCreateCourses && (
              <div className="flex items-center gap-1.5 md:gap-2 flex-shrink-0">
                {/* Only admins can do bulk upload */}
                {isAdmin && (
                  <Button 
                    variant="outline"
                    onClick={() => setIsBulkUploadOpen(true)}
                    className="h-7 px-2 md:px-3 rounded-lg border border-input shadow-sm hover:shadow-lg transition-all duration-300 text-[10px] md:text-[11px] flex-shrink-0 whitespace-nowrap"
                  >
                    <Upload className="h-3 w-3 mr-1" />
                    <span className="hidden xl:inline">Bulk Upload</span>
                    <span className="xl:hidden">Upload</span>
                  </Button>
                )}
                <Button 
                  onClick={handleCreateCourse}
                  className="h-7 px-2 md:px-3 rounded-lg bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary text-white shadow-lg hover:shadow-xl transition-all duration-300 text-[10px] md:text-[11px] flex-shrink-0 whitespace-nowrap"
                >
                  <PlusCircle className="h-3 w-3 mr-1" />
                  <span className="hidden xl:inline">Create Course</span>
                  <span className="xl:hidden">Create</span>
                </Button>
              </div>
            )}
            
            {/* Show message for teachers (view-only) */}
            {isTeacher && !isContentCreator && (
              <div className="flex items-center gap-2 flex-shrink-0 max-w-[40%]">
                <div className="text-[10px] md:text-xs text-muted-foreground bg-muted/50 px-2 md:px-3 py-1.5 rounded-lg overflow-hidden">
                  <span className="font-medium">View Mode:</span> <span className="break-words">You can view course content</span>
                </div>
              </div>
            )}
          </div>

          {/* Mobile & Tablet Layout */}
          <div className="flex flex-col gap-3 md:gap-4 lg:hidden">
            <div className="flex items-start gap-2 md:gap-3 min-w-0">
              <div className="w-10 h-10 md:w-12 md:h-12 bg-gradient-to-br from-primary/10 to-primary/20 rounded-lg md:rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5">
                <BookOpen className="w-5 h-5 md:w-6 md:h-6 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-lg md:text-xl font-bold tracking-tight bg-gradient-to-r from-primary via-primary to-primary/80 bg-clip-text text-transparent leading-tight break-words">
                  Course Management
                </h1>
                <p className="text-xs md:text-sm text-muted-foreground font-light mt-0.5 break-words">
                  Manage all courses in the system
                </p>
              </div>
            </div>
            
            {/* Show action buttons for admins and content creators */}
            {canCreateCourses && (
              <div className="flex items-center gap-2 w-full">
                {/* Only admins can do bulk upload */}
                {isAdmin && (
                  <Button 
                    variant="outline"
                    onClick={() => setIsBulkUploadOpen(true)}
                    className="h-9 px-3 md:px-4 rounded-lg border border-input shadow-sm text-xs md:text-sm flex-1 sm:flex-none"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Bulk Upload
                  </Button>
                )}
                <Button 
                  onClick={handleCreateCourse}
                  className="h-9 px-3 md:px-4 rounded-lg bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary text-white shadow-lg text-xs md:text-sm flex-1"
                >
                  <PlusCircle className="h-4 w-4 mr-2" />
                  Create Course
                </Button>
              </div>
            )}
            
            {/* Show message for teachers (view-only) */}
            {isTeacher && !isContentCreator && (
              <div className="flex items-center gap-2 w-full">
                <div className="text-xs md:text-sm text-muted-foreground bg-muted/50 px-3 md:px-4 py-2 rounded-lg break-words w-full">
                  <span className="font-medium">View Mode:</span> You can view and access course content. Course creation and editing is restricted to administrators.
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Stats Cards - Clean Design with Responsive Layout */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-gradient-to-br from-card to-green-500/5 dark:bg-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 sm:p-4 md:p-6">
            <CardTitle className="text-xs sm:text-sm font-medium truncate">Total Courses</CardTitle>
            <BookOpen className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground flex-shrink-0" />
          </CardHeader>
          <CardContent className="p-3 sm:p-4 md:p-6 pt-0">
            <div className="text-xl sm:text-2xl font-bold">{total}</div>
            <p className="text-[10px] sm:text-xs text-muted-foreground truncate">
              All courses in system
            </p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-card to-green-500/5 dark:bg-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 sm:p-4 md:p-6">
            <CardTitle className="text-xs sm:text-sm font-medium truncate">Published</CardTitle>
            <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground flex-shrink-0" />
          </CardHeader>
          <CardContent className="p-3 sm:p-4 md:p-6 pt-0">
            <div className="text-xl sm:text-2xl font-bold">{published}</div>
            <p className="text-[10px] sm:text-xs text-muted-foreground truncate">
              Live courses
            </p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-card to-green-500/5 dark:bg-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 sm:p-4 md:p-6">
            <CardTitle className="text-xs sm:text-sm font-medium truncate">Draft Courses</CardTitle>
            <Edit3 className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground flex-shrink-0" />
          </CardHeader>
          <CardContent className="p-3 sm:p-4 md:p-6 pt-0">
            <div className="text-xl sm:text-2xl font-bold">{draft}</div>
            <p className="text-[10px] sm:text-xs text-muted-foreground truncate">
              In development
            </p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-card to-green-500/5 dark:bg-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 sm:p-4 md:p-6">
            <CardTitle className="text-xs sm:text-sm font-medium truncate">Total Students</CardTitle>
            <Users className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground flex-shrink-0" />
          </CardHeader>
          <CardContent className="p-3 sm:p-4 md:p-6 pt-0">
            <div className="text-xl sm:text-2xl font-bold">{totalStudents}</div>
            <p className="text-[10px] sm:text-xs text-muted-foreground truncate">
              Enrolled students
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Course List */}
      <Card>
        <CardHeader>
          {/* Mobile Layout - Stacked */}
          <div className="flex flex-col gap-3 sm:hidden">
            <div className="relative w-full">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search courses..."
                className="w-full rounded-lg bg-background pl-8 h-9 border border-input shadow-sm"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="gap-2 h-9 w-full rounded-lg bg-background border border-input shadow-sm">
                  <ListFilter className="h-4 w-4" />
                  <span className="whitespace-nowrap">
                    {statusFilter === 'All' ? 'All Status' : statusFilter}
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuCheckboxItem
                  checked={statusFilter === 'All'}
                  onCheckedChange={() => setStatusFilter('All')}
                >
                  All
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={statusFilter === 'Published'}
                  onCheckedChange={() => setStatusFilter('Published')}
                >
                  Published
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={statusFilter === 'Draft'}
                  onCheckedChange={() => setStatusFilter('Draft')}
                >
                  Draft
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={statusFilter === 'Under Review'}
                  onCheckedChange={() => setStatusFilter('Under Review')}
                >
                  Under Review
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={statusFilter === 'Rejected'}
                  onCheckedChange={() => setStatusFilter('Rejected')}
                >
                  Rejected
                </DropdownMenuCheckboxItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Desktop Layout - Side by Side */}
          <div className="hidden sm:flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search courses by title or instructor..."
                className="w-full rounded-lg bg-background pl-8 h-9 rounded-xl bg-background border border-input shadow-sm hover:shadow-lg hover:shadow-primary/10 transition-all duration-300 hover:-translate-y-0.5"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="gap-1 h-9 px-4 rounded-xl bg-background border border-input shadow-sm hover:shadow-lg hover:shadow-primary/10 transition-all duration-300 hover:-translate-y-0.5 hover:bg-accent/5 hover:text-foreground dark:hover:bg-gray-800">
                  <ListFilter className="h-3.5 w-3.5" />
                  <span className="whitespace-nowrap">
                    {statusFilter === 'All' ? 'All Status' : statusFilter}
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuCheckboxItem
                  checked={statusFilter === 'All'}
                  onCheckedChange={() => setStatusFilter('All')}
                >
                  All
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={statusFilter === 'Published'}
                  onCheckedChange={() => setStatusFilter('Published')}
                >
                  Published
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={statusFilter === 'Draft'}
                  onCheckedChange={() => setStatusFilter('Draft')}
                >
                  Draft
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={statusFilter === 'Under Review'}
                  onCheckedChange={() => setStatusFilter('Under Review')}
                >
                  Under Review
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={statusFilter === 'Rejected'}
                  onCheckedChange={() => setStatusFilter('Rejected')}
                >
                  Rejected
                </DropdownMenuCheckboxItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
             <div className="py-12">
                <ContentLoader message="Loading courses..." />
            </div>
          ) : courses.length > 0 ? (
            <div className="space-y-4 sm:space-y-6">
              {/* View Toggle - Improved Responsiveness */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 md:gap-6">
                <div className="min-w-0 flex-1 space-y-0.5 sm:space-y-1">
                  <h2 className="text-base sm:text-lg md:text-xl font-semibold text-foreground break-words">
                    Courses
                  </h2>
                  <p className="text-xs sm:text-sm text-muted-foreground break-words leading-relaxed">
                    Switch between different views to manage your courses
                  </p>
                </div>
                <div className="w-full sm:w-auto flex-shrink-0">
                  <ViewToggle
                    currentView={preferences.teacherCourseView}
                    onViewChange={setTeacherCourseView}
                    availableViews={['card', 'tile', 'list']}
                    showLabels={true}
                    className="w-full sm:w-auto"
                  />
                </div>
              </div>

              {/* Course Display based on selected view */}
              {preferences.teacherCourseView === 'card' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
                  {courses.map(course => (
                    <CourseCard key={course.id} course={course} onDelete={setCourseToDelete} />
                  ))}
                </div>
              )}

              {preferences.teacherCourseView === 'tile' && (
                <CourseTileView
                  courses={courses}
                  onDelete={setCourseToDelete}
                />
              )}

              {preferences.teacherCourseView === 'list' && (
                <CourseListView
                  courses={courses}
                  onDelete={setCourseToDelete}
                />
              )}
            </div>
          ) : (
            <div className="text-center py-12">
              <EmptyState
                  title="No Courses Found"
                  description={isAdmin ? "You haven't created any courses yet. Get started by creating a new one." : "No courses are available at the moment."}
              />
              {isAdmin && (
                <Button onClick={handleCreateCourse} className="mt-4 h-10 px-6 rounded-xl bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5">
                    <PlusCircle className="h-4 w-4 mr-2" />
                    Create Course
                </Button>
              )}
            </div>
          )}
            </CardContent>
            {totalPages > 1 && (
            <CardFooter>
              <PaginationControls
                currentPage={currentPage}
                totalPages={totalPages}
                totalItems={totalCourses}
                itemsPerPage={rowsPerPage}
                onPageChange={setCurrentPage}
                onItemsPerPageChange={handleItemsPerPageChange}
                itemsPerPageOptions={preferences.teacherCourseView === 'tile' ? [8, 16, 24, 32, 40] : [4, 8, 12, 16, 20]}
                disabled={loading}
                className="mt-4"
              />
            </CardFooter>
          )}
          </Card>

      <AlertDialog open={!!courseToDelete} onOpenChange={(open) => !open && setCourseToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the course
              <strong className="mx-1">"{courseToDelete?.title}"</strong>
              and all of its associated data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirmed}
              className="bg-destructive hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Upload Dialog */}
      <Dialog open={isBulkUploadOpen} onOpenChange={setIsBulkUploadOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5 text-primary" />
              Bulk Upload Courses
            </DialogTitle>
            <DialogDescription>
              Upload multiple courses at once using an Excel template. All courses will be created as drafts.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* Template Download Section */}
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-xl">
              <div className="flex items-start gap-3">
                <Download className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                <div className="flex-1">
                  <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
                    Download Template
                  </h4>
                  <p className="text-sm text-blue-800 dark:text-blue-200 mb-3">
                    Download the Excel template to see the required format and structure for bulk upload.
                  </p>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={downloadTemplate}
                    className="bg-blue-100 hover:bg-blue-200 dark:bg-blue-800 dark:hover:bg-blue-700 text-blue-700 dark:text-blue-200 border-blue-300 dark:border-blue-600"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download Template
                  </Button>
                </div>
              </div>
            </div>

            {/* File Upload Section */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                  Select Excel File
                </label>
                <FileUpload 
                  onUpload={setSelectedFile}
                  label={selectedFile ? selectedFile.name : "Choose Excel file"}
                  acceptedFileTypes={['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']}
                  disabled={batchState.isUploading || batchState.isParsing || batchState.isProcessing}
                  maxSize={10 * 1024 * 1024} // 10MB
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                  Supported format: .xlsx (Excel 2007+). Maximum file size: 10MB.
                </p>
              </div>

              {/* Upload Status */}
              {(batchState.isUploading || batchState.isParsing || batchState.isProcessing) && (
                <div className="space-y-4">
                  {/* Disclaimer */}
                  <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                      <div className="flex-1">
                        <h4 className="font-semibold text-amber-900 dark:text-amber-100 mb-1">
                          Important Notice
                        </h4>
                        <p className="text-sm text-amber-800 dark:text-amber-200">
                          <strong>Do not refresh the page or close this dialog</strong> while the upload is in progress. 
                          This may cause data loss or incomplete course creation. Please wait for the process to complete.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium">
                        {batchState.isParsing ? 'Parsing file...' : 
                         batchState.isProcessing ? `Processing batch ${batchState.currentBatch}/${batchState.totalBatches}...` : 
                         'Uploading...'}
                      </span>
                      <span className="text-muted-foreground">{batchState.progress}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-primary h-2 rounded-full transition-all duration-300"
                        style={{ width: `${batchState.progress}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Batch Progress */}
                  {batchState.isProcessing && (
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg">
                        <div className="font-medium text-blue-900 dark:text-blue-100">Current Batch</div>
                        <div className="text-2xl font-bold text-blue-600">{batchState.currentBatch}</div>
                        <div className="text-xs text-blue-700 dark:text-blue-300">of {batchState.totalBatches}</div>
                      </div>
                      <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg">
                        <div className="font-medium text-green-900 dark:text-green-100">Processed Courses</div>
                        <div className="text-2xl font-bold text-green-600">{batchState.processedCourses}</div>
                        <div className="text-xs text-green-700 dark:text-green-300">of {batchState.totalCourses}</div>
                      </div>
                    </div>
                  )}

                  {/* Parsing Status */}
                  {batchState.isParsing && (
                    <div className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                      <span>Analyzing Excel file and extracting course data...</span>
                    </div>
                  )}

                  {/* Processing Status */}
                  {batchState.isProcessing && (
                    <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-600"></div>
                      <span>Creating courses in batches of 2...</span>
                    </div>
                  )}
                </div>
              )}


              {/* Error Display */}
              {batchState.errors.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium text-red-700 dark:text-red-300">
                    <AlertTriangle className="h-4 w-4" />
                    <span>
                      {batchState.isParsing ? 'Validation Errors' : 'Processing Errors'} ({batchState.errors.length})
                    </span>
                  </div>
                  <div className="max-h-48 overflow-y-auto space-y-2 border border-red-200 rounded-lg p-3 bg-red-50 dark:bg-red-900/20">
                    {batchState.errors.map((error: any, index: number) => (
                      <div key={index} className="flex items-start gap-3 p-3 bg-white rounded border border-red-200 shadow-sm">
                        <div className="w-2 h-2 bg-red-500 rounded-full mt-1.5 flex-shrink-0"></div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-semibold text-red-700">
                              {error.batch ? `Batch ${error.batch}` : `Row ${error.row || 'N/A'}`}
                            </span>
                            {error.field && (
                              <>
                                <span className="text-xs text-gray-500">•</span>
                                <span className="text-sm font-medium text-red-600">
                                  {error.field}
                                </span>
                              </>
                            )}
                          </div>
                          <p className="text-sm text-red-600 leading-relaxed">
                            {error.message || error.error}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  {/* Validation Error Actions */}
                  {batchState.isParsing && batchState.errors.length > 0 && (
                    <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg">
                      <div className="flex items-start gap-3">
                        <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                        <div className="flex-1">
                          <h4 className="font-semibold text-amber-900 dark:text-amber-100 mb-1">
                            Fix Required
                          </h4>
                          <p className="text-sm text-amber-800 dark:text-amber-200 mb-3">
                            Please fix the validation errors in your Excel file and upload again. 
                            All courses must pass validation before they can be created.
                          </p>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => {
                              setIsBulkUploadOpen(false);
                              setSelectedFile(null);
                              resetBatchState();
                            }}
                            className="bg-amber-100 hover:bg-amber-200 dark:bg-amber-800 dark:hover:bg-amber-700 text-amber-700 dark:text-amber-200 border-amber-300 dark:border-amber-600"
                          >
                            Close and Fix File
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setIsBulkUploadOpen(false);
                setSelectedFile(null);
                resetBatchState();
              }}
              disabled={batchState.isUploading || batchState.isParsing || batchState.isProcessing}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleBulkUpload}
              disabled={!selectedFile || batchState.isUploading || batchState.isParsing || batchState.isProcessing || (batchState.isParsing && batchState.errors.length > 0)}
              className="bg-primary hover:bg-primary/90"
            >
              {(batchState.isUploading || batchState.isParsing || batchState.isProcessing) ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  {batchState.isParsing ? 'Parsing...' : 
                   batchState.isProcessing ? 'Processing...' : 
                   'Uploading...'}
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  {batchState.isParsing && batchState.errors.length > 0 ? 'Fix Errors First' : 'Upload Courses'}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  )
}

export default CourseManagement;
