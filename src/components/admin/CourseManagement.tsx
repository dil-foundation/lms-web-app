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

type CourseStatus = "Published" | "Draft" | "Under Review";

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
    <Card>
      <CardHeader className="p-0 relative">
        <img src={course.imageUrl} alt={course.title} className="w-full h-40 object-cover rounded-t-lg" />
        <Badge variant={course.status === 'Published' ? 'default' : 'secondary'} className="absolute top-2 left-2">
          {course.status}
      </Badge>
      </CardHeader>
      <CardContent className="p-4 space-y-2">
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
      <CardFooter className="p-4 pt-0">
        <Button className="w-full" onClick={() => navigate(`/dashboard/courses/builder/${course.id}`)}>
          Edit Course
        </Button>
      </CardFooter>
    </Card>
  )
}

const CourseManagement = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<CourseStatus | "All">("All");
  const [courseToDelete, setCourseToDelete] = useState<Course | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage] = useState(6); // Show 6 courses per page
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
      console.log("fetchStats: No user found, aborting.");
      return;
    }
    setLoadingStats(true);
    console.log("fetchStats: Starting for user:", user.id, "with initial app_metadata.role:", user.app_metadata.role);

    try {
      let role = user.app_metadata.role;

      // If role is not in metadata, fetch it from the user's profile as a fallback.
      if (!role) {
        console.log("fetchStats: Role not in metadata, fetching from profiles table...");
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
        console.log("fetchStats: Role fetched from profile:", role);
      }

      if (role === 'admin') {
        console.log("fetchStats: Admin role detected. Fetching admin stats.");
        const [totalRes, publishedRes, draftRes, studentsRes] = await Promise.all([
            supabase.from('courses').select('id', { count: 'exact', head: true }),
            supabase.from('courses').select('id', { count: 'exact', head: true }).eq('status', 'Published'),
            supabase.from('courses').select('id', { count: 'exact', head: true }).eq('status', 'Draft'),
            supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'student')
        ]);

        console.log("fetchStats (Admin) - Raw responses:", { totalRes, publishedRes, draftRes, studentsRes });

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

        console.log("fetchStats (Admin) - Setting stats:", statsToSet);
        console.log("fetchStats (Admin) - Setting total students:", studentsToSet);

        setStats(statsToSet);
        setTotalStudents(studentsToSet);

      } else if (role === 'teacher') {
        console.log("fetchStats: Teacher role detected. Fetching teacher stats.");
        const { data: authoredCourses, error: authoredError } = await supabase.from('courses').select('id').eq('author_id', user.id);
        if (authoredError) throw authoredError;
        console.log("fetchStats (Teacher) - Authored courses:", authoredCourses);

        const { data: memberCourses, error: memberError } = await supabase.from('course_members').select('course_id').eq('user_id', user.id).eq('role', 'teacher');
        if (memberError) throw memberError;
        console.log("fetchStats (Teacher) - Member courses:", memberCourses);

        const courseIds = [...new Set([...(authoredCourses || []).map(c => c.id), ...(memberCourses || []).map(m => m.course_id)])];
        console.log("fetchStats (Teacher) - Combined course IDs:", courseIds);

        if (courseIds.length === 0) {
          console.log("fetchStats (Teacher) - No courses found, setting stats to zero.");
          setStats({ total: 0, published: 0, draft: 0 });
          setTotalStudents(0);
        } else {
            const [totalRes, publishedRes, draftRes, studentsRes] = await Promise.all([
                supabase.from('courses').select('id', { count: 'exact', head: true }).in('id', courseIds),
                supabase.from('courses').select('id', { count: 'exact', head: true }).in('id', courseIds).eq('status', 'Published'),
                supabase.from('courses').select('id', { count: 'exact', head: true }).in('id', courseIds).eq('status', 'Draft'),
                supabase.from('course_members').select('user_id').in('course_id', courseIds).eq('role', 'student')
            ]);

            console.log("fetchStats (Teacher) - Raw responses:", { totalRes, publishedRes, draftRes, studentsRes });

            if (totalRes.error || publishedRes.error || draftRes.error || studentsRes.error) {
                 console.error("fetchStats (Teacher) - Error in Promise.all:", {
                    totalError: totalRes.error,
                    publishedError: publishedRes.error,
                    draftError: draftRes.error,
                    studentsError: studentsRes.error
                 });
                 throw totalRes.error || publishedRes.error || draftRes.error || studentsRes.error;
            }

            const uniqueStudentIds = new Set((studentsRes.data || []).map(s => s.user_id));

            const statsToSet = {
                total: totalRes.count || 0,
                published: publishedRes.count || 0,
                draft: draftRes.count || 0,
            };
            const studentsToSet = uniqueStudentIds.size;

            console.log("fetchStats (Teacher) - Setting stats:", statsToSet);
            console.log("fetchStats (Teacher) - Setting total students:", studentsToSet);

            setStats(statsToSet);
            setTotalStudents(studentsToSet);
        }
      } else {
        console.warn(`fetchStats: User has no recognized role ('admin' or 'teacher'). Role found: ${role}. Stats will be zero.`);
        setStats({ total: 0, published: 0, draft: 0 });
        setTotalStudents(0);
      }
    } catch (error: any) {
      toast.error("Failed to load dashboard statistics.", { description: error.message });
      console.error("Error fetching stats:", error);
    } finally {
      console.log("fetchStats: Finished.");
      setLoadingStats(false);
    }
  }, [user]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const fetchData = useCallback(async () => {
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
  }, [searchQuery, statusFilter, currentPage, rowsPerPage]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter]);

  const handleCreateCourse = () => {
    navigate('/dashboard/courses/builder/new');
  }

  const handleDeleteConfirmed = async () => {
    if (!courseToDelete) return;

    // Also delete the image from storage.
    if (courseToDelete.imagePath) {
        const { error: storageError } = await supabase.storage.from('dil-lms').remove([courseToDelete.imagePath]);
        if (storageError) {
            toast.error("Could not delete course image. The course was not deleted.", { description: storageError.message });
            setCourseToDelete(null);
            return;
        }
    }

    const { error } = await supabase.from('courses').delete().eq('id', courseToDelete.id);

    if (error) {
      toast.error("Failed to delete course.", { description: error.message });
    } else {
      toast.success(`Course "${courseToDelete.title}" deleted successfully.`);
      // Optimistically update the UI
      setCourses(prev => prev.filter(c => c.id !== courseToDelete.id));
      // You might want to re-calculate stats here as well
      fetchStats();
    }
    setCourseToDelete(null);
  };

  const { total, published, draft } = stats;
  const totalPages = Math.ceil(totalCourses / rowsPerPage);

  return (
    <main className="grid flex-1 items-start gap-4 p-4 sm:px-6 sm:py-0 md:gap-8">
      <div className="flex items-center">
        <h1 className="text-2xl font-bold">Course Management</h1>
        <div className="ml-auto flex items-center gap-2">
          <Button onClick={handleCreateCourse}>
            <PlusCircle className="h-4 w-4 mr-2" />
            Create Course
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-gradient-to-br from-card to-green-500/5 dark:bg-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Courses</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{total}</div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-card to-green-500/5 dark:bg-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Published</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{published}</div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-card to-green-500/5 dark:bg-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Draft Courses</CardTitle>
            <Edit3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{draft}</div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-card to-green-500/5 dark:bg-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Students</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalStudents}</div>
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
                className="w-full rounded-lg bg-background pl-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                <Button variant="outline" className="gap-1">
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
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {courses.map(course => (
                <CourseCard key={course.id} course={course} onDelete={setCourseToDelete} />
              ))}
                </div>
          ) : (
            <div className="text-center py-12">
              <EmptyState
                  title="No Courses Found"
                  description="You haven't created any courses yet. Get started by creating a new one."
              />
              <Button onClick={handleCreateCourse} className="mt-4">
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
