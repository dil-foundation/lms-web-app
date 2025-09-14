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
  Trash2
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
import AccessLogService from "@/services/accessLogService";

type CourseStatus = "Published" | "Draft" | "Under Review" | "Rejected";

interface Course {
  id: string;
  title: string;
  status: CourseStatus;
  imageUrl: string;
  imagePath?: string;
  totalStudents: number;
  totalLessons: number;
  authorName: string;
  authorId: string;
  duration: string;
}

const CourseCard = ({ course, onDelete }: { course: Course, onDelete: (course: Course) => void }) => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const canDelete = user && (
    user.app_metadata.role === 'admin' ||
    (user.app_metadata.role === 'teacher' && course.status === 'Draft' && user.id === course.authorId)
  );

    return (
    <Card className="bg-card border border-border flex flex-col h-full">
      <CardHeader className="p-0 relative">
        <img src={course.imageUrl} alt={course.title} className="w-full h-40 object-cover rounded-t-lg" />
        <Badge
          variant={
            course.status === 'Published' ? 'default' :
            course.status === 'Rejected' ? 'destructive' :
            course.status === 'Under Review' ? 'warning' :
            'blue'
          }
          className="absolute top-2 left-2"
        >
          {course.status}
      </Badge>
      </CardHeader>
      <CardContent className="p-4 space-y-2 flex-grow">
        <h3 className="font-semibold text-lg">{course.title}</h3>
        <p className="text-sm text-muted-foreground">by {course.authorName}</p>
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>{course.duration}</span>
          <span>{course.totalLessons} lessons</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Users className="h-4 w-4" />
          <span>{course.totalStudents} students</span>
        </div>
      </CardContent>
      <CardFooter className="p-4 pt-0 mt-auto">
        <Button 
          onClick={() => navigate(`/dashboard/courses/builder/${course.id}`)}
          className="w-full bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary text-white py-3 text-base font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5 hover:scale-105 rounded-xl"
        >
          <Edit3 className="w-4 h-4 mr-2" />
          Edit Course
        </Button>
      </CardFooter>
    </Card>
  )
}

const CourseManagement = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { preferences, setTeacherCourseView } = useViewPreferences();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<CourseStatus | "All">("All");
  const [courseToDelete, setCourseToDelete] = useState<Course | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage] = useState(8); // Show 8 courses per page
  const [totalCourses, setTotalCourses] = useState(0);
  const [stats, setStats] = useState({
    total: 0,
    published: 0,
    draft: 0,
  });
  const [totalStudents, setTotalStudents] = useState(0);
  const [loadingStats, setLoadingStats] = useState(true);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const fetchStats = useCallback(async () => {
    if (!user) {
      return;
    }
    setLoadingStats(true);

    try {
      let role = user.app_metadata.role;

      // If role is not in metadata, fetch it from the user's profile as a fallback.
      if (!role) {
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();

        if (profileError) {
          toast.error("Could not verify user role.", { description: profileError.message });
          throw profileError;
        }

        role = profileData?.role;
      }

      if (role === 'admin') {
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

        setStats(statsToSet);
        setTotalStudents(studentsToSet);

      } else if (role === 'teacher') {
        // RLS will automatically filter to courses the teacher can access.
        const [totalRes, publishedRes, draftRes] = await Promise.all([
            supabase.from('courses').select('id', { count: 'exact', head: true }),
            supabase.from('courses').select('id', { count: 'exact', head: true }).eq('status', 'Published'),
            supabase.from('courses').select('id', { count: 'exact', head: true }).eq('status', 'Draft'),
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
        const { data: visibleCourses, error: coursesError } = await supabase.from('courses').select('id');
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
          members:course_members (id),
          sections:course_sections(lessons:course_lessons(id))
        `, { count: 'exact' });

      // RLS (Row Level Security) in Supabase is already configured to only return courses
      // that the logged-in user (teacher or admin) is allowed to see.
      // The previous client-side logic to filter courses for teachers was redundant
      // and was causing a discrepancy with the RLS policy, leading to missing courses.
      // By removing it, we rely on the RLS as the single source of truth.

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

          return {
            id: course.id,
            title: course.title,
            status: course.status,
            imageUrl: imageUrl,
            imagePath: course.image_url,
            totalStudents: (course.members || []).length,
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

  return (
    <main className="space-y-8">
      {/* Premium Header Section */}
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-primary/5 rounded-3xl"></div>
        <div className="relative p-8 rounded-3xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-primary/10 to-primary/20 rounded-2xl flex items-center justify-center">
                <BookOpen className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-primary via-primary to-primary/80 bg-clip-text text-transparent" style={{ lineHeight: '3rem' }}>
                  Course Management
                </h1>
                <p className="text-lg text-muted-foreground font-light">
                  Manage all courses in the system
                </p>
              </div>
            </div>
            
            <Button 
              onClick={handleCreateCourse}
              className="h-10 px-6 rounded-xl bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5"
            >
              <PlusCircle className="h-4 w-4 mr-2" />
              Create Course
            </Button>
          </div>
        </div>
      </div>

      {/* Stats Cards - Clean Design */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-gradient-to-br from-card to-green-500/5 dark:bg-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Courses</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{total}</div>
            <p className="text-xs text-muted-foreground">
              All courses in system
            </p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-card to-green-500/5 dark:bg-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Published</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{published}</div>
            <p className="text-xs text-muted-foreground">
              Live courses
            </p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-card to-green-500/5 dark:bg-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Draft Courses</CardTitle>
            <Edit3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{draft}</div>
            <p className="text-xs text-muted-foreground">
              In development
            </p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-card to-green-500/5 dark:bg-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Students</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalStudents}</div>
            <p className="text-xs text-muted-foreground">
              Enrolled students
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Course List */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
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
                  <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
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
            {/* Add Category Filter Here if needed */}
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
             <div className="py-12">
                <ContentLoader message="Loading courses..." />
            </div>
          ) : courses.length > 0 ? (
            <div className="space-y-6">
              {/* View Toggle */}
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-foreground">Courses</h2>
                  <p className="text-sm text-muted-foreground">Switch between different views to manage your courses</p>
                </div>
                <ViewToggle
                  currentView={preferences.teacherCourseView}
                  onViewChange={setTeacherCourseView}
                  availableViews={['card', 'tile', 'list']}
                />
              </div>

              {/* Course Display based on selected view */}
              {preferences.teacherCourseView === 'card' && (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
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
                  description="You haven't created any courses yet. Get started by creating a new one."
              />
              <Button onClick={handleCreateCourse} className="mt-4 h-10 px-6 rounded-xl bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5">
                  <PlusCircle className="h-4 w-4 mr-2" />
                  Create Course
              </Button>
            </div>
          )}
            </CardContent>
            {totalPages > 0 && (
            <CardFooter>
              <Pagination className="mt-4">
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      href="#"
                      onClick={(e) => { e.preventDefault(); setCurrentPage(p => Math.max(1, p - 1)); }}
                      className={currentPage === 1 ? "pointer-events-none opacity-50" : ""}
                    />
                  </PaginationItem>
                  {[...Array(totalPages)].map((_, i) => (
                    <PaginationItem key={i}>
                      <PaginationLink
                        href="#"
                        onClick={(e) => { e.preventDefault(); setCurrentPage(i + 1); }}
                        isActive={currentPage === i + 1}
                      >
                        {i + 1}
                      </PaginationLink>
                    </PaginationItem>
                  ))}
                  <PaginationItem>
                    <PaginationNext
                      href="#"
                      onClick={(e) => { e.preventDefault(); setCurrentPage(p => Math.min(totalPages, p + 1)); }}
                      className={currentPage === totalPages ? "pointer-events-none opacity-50" : ""}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
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
    </main>
  )
}

export default CourseManagement;
