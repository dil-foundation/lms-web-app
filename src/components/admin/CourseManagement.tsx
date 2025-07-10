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
  MoreHorizontal
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
        <div className="absolute top-2 right-2 bg-background/80 rounded-full">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => navigate(`/dashboard/courses/builder/${course.id}`)}>Edit</DropdownMenuItem>
                <DropdownMenuItem>View Details</DropdownMenuItem>
                {canDelete && (
                   <DropdownMenuItem className="text-destructive" onClick={() => onDelete(course)}>
                    Delete
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
        </div>
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
  const [stats, setStats] = useState({
    total: 0,
    published: 0,
    draft: 0,
  });
  const [totalStudents, setTotalStudents] = useState(0);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
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
        `);

      if (searchQuery) {
        const { data: courseIds, error: searchError } = await supabase
          .rpc('get_course_ids_by_search', { search_term: searchQuery });

        if (searchError) throw searchError;

        if (courseIds && courseIds.length > 0) {
          const ids = courseIds.map(c => c.id);
          query = query.in('id', ids);
        } else {
          setCourses([]);
          setLoading(false);
          return;
        }
      }

      if (statusFilter && statusFilter !== 'All') {
        query = query.eq('status', statusFilter);
      }
      
      const { data: coursesData, error: coursesError } = await query;

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
      }
    } catch (error: any) {
      toast.error("An unexpected error occurred.", { description: error.message });
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, statusFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

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
      setStats(prev => {
        const courseStatus = courseToDelete.status;
        let newPublished = prev.published;
        let newDraft = prev.draft;

        if (courseStatus === 'Published') {
          newPublished = Math.max(0, prev.published - 1);
        } else if (courseStatus === 'Draft') {
          newDraft = Math.max(0, prev.draft - 1);
        }

        return {
          ...prev,
          total: prev.total - 1,
          published: newPublished,
          draft: newDraft
        };
      });
    }
    setCourseToDelete(null);
  };

  const { total, published, draft } = stats;

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
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Courses</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Published</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{published}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Draft Courses</CardTitle>
            <Edit3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{draft}</div>
          </CardContent>
        </Card>
        <Card>
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
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <Card key={i}>
                  <Skeleton className="w-full h-40" />
                  <CardContent className="p-4 space-y-2">
                    <Skeleton className="h-6 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                    <div className="flex justify-between">
                      <Skeleton className="h-4 w-1/4" />
                      <Skeleton className="h-4 w-1/4" />
              </div>
                    <Skeleton className="h-4 w-1/3" />
                  </CardContent>
                  <CardFooter className="p-4 pt-0">
                    <Skeleton className="h-10 w-full" />
                  </CardFooter>
                </Card>
              ))}
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
