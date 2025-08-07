import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  CheckSquare,
  BookOpen,
  Clock,
  TrendingUp,
  Search,
  FileText,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { ContentLoader } from '@/components/ContentLoader';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import { useDebounce } from '@/hooks/useDebounce';

type Assignment = {
  id: string;
  title: string;
  course: string;
  course_id: string;
  type: string;
  due_date: string | null;
  submissions: number;
  graded: number;
  avg_score: number;
  status: string;
  overdue: boolean;
};

type Course = {
  id: string;
  title: string;
};

type StatCardProps = {
  title: string;
  value: string;
  icon: React.ElementType;
  color: string;
};

const StatCard = ({ title, value, icon: Icon, color }: StatCardProps) => (
  <Card className="relative overflow-hidden transition-all duration-200 hover:shadow-lg bg-gradient-to-br from-card to-green-500/5 dark:bg-card">
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
      <Icon className={`h-4 w-4 ${color}`} />
    </CardHeader>
    <CardContent>
      <div className="space-y-1">
        <div className="text-2xl font-bold">{value}</div>
      </div>
    </CardContent>
  </Card>
);

export const GradeAssignments = () => {
  const { user } = useAuth();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourse, setSelectedCourse] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  const fetchCourses = useCallback(async () => {
    if(!user) return;
    const { data, error } = await supabase
      .from('courses')
      .select('id, title')
      .in('id', (await supabase.from('course_members').select('course_id').eq('user_id', user.id).eq('role', 'teacher')).data?.map(c => c.course_id) || [])
      
    if(error) {
        console.error("Error fetching courses for teacher", error);
    } else {
        setCourses(data || []);
    }
  }, [user]);

  const fetchAssignments = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    setError(null);

    try {
      const { data, error: rpcError } = await supabase.rpc('get_teacher_assessments_data', {
        teacher_id: user.id,
        search_query: debouncedSearchTerm,
        course_filter_id: selectedCourse === 'all' ? null : selectedCourse,
      });
      
      if (rpcError) {
        throw rpcError;
      }
      
      const formattedAssignments = (data || []).map((a: any) => ({
        ...a,
        due_date: a.due_date ? new Date(a.due_date).toLocaleDateString() : 'N/A',
        overdue: a.due_date ? new Date(a.due_date) < new Date() : false,
        status: 'active', // This could be enhanced if the function provides it
        avg_score: Number(a.avg_score)
      }));

      setAssignments(formattedAssignments);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [user, debouncedSearchTerm, selectedCourse]);

  useEffect(() => {
    fetchCourses();
  }, [fetchCourses]);

  useEffect(() => {
    fetchAssignments();
  }, [fetchAssignments]);
  
  useEffect(() => {
      setCurrentPage(1);
  }, [debouncedSearchTerm, selectedCourse])


  const paginatedAssignments = assignments.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );
  const totalPages = Math.ceil(assignments.length / itemsPerPage);
  
  const statCardsData = [
      { 
        title: 'Total Assessments',
        value: assignments.length.toString(), 
        icon: CheckSquare, 
        color: 'text-blue-500' 
      },
      { 
        title: 'Pending Grading', 
        value: assignments.reduce((acc, a) => acc + (a.submissions - a.graded), 0).toString(), 
        icon: Clock, 
        color: 'text-purple-500' 
      },
      { 
        title: 'Total Submissions', 
        value: assignments.reduce((acc, a) => acc + a.submissions, 0).toString(), 
        icon: BookOpen, 
        color: 'text-green-500' 
      },
      { 
        title: 'Avg. Score', 
        value: `${(assignments.reduce((acc, a) => acc + a.avg_score, 0) / (assignments.length || 1)).toFixed(1)}%`, 
        icon: TrendingUp, 
        color: 'text-orange-500' 
      },
  ];

  if (error) {
    return <div className="p-8 text-center text-red-500">Error: {error}</div>;
  }

  return (
    <div className="space-y-6 mx-auto p-4">
      <div className="relative p-8 rounded-3xl bg-gradient-to-r from-primary/5 via-transparent to-primary/5">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-primary/10 to-primary/20 rounded-2xl flex items-center justify-center">
            <CheckSquare className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-primary via-primary to-primary/80 bg-clip-text text-transparent">
              Assessments
            </h1>
            <p className="text-lg text-muted-foreground mt-2 leading-relaxed">
              Grade quizzes and assignments for your courses
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {statCardsData.map((card) => <StatCard key={card.title} {...card} />)}
      </div>

      <Card className="bg-card border border-border">
        <CardHeader>
          <CardTitle className="text-xl font-semibold">Assessment Management</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
            <div className="relative flex-1 md:grow-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search assignment or quiz..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full rounded-xl bg-background border border-input shadow-sm hover:shadow-lg hover:shadow-primary/10 transition-all duration-300 hover:-translate-y-0.5 pl-10 h-10 md:w-[250px] lg:w-[350px]"
              />
            </div>
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <Select value={selectedCourse} onValueChange={setSelectedCourse}>
                <SelectTrigger className="w-full sm:w-[200px] h-10 rounded-xl bg-background border border-input shadow-sm hover:shadow-lg hover:shadow-primary/10 transition-all duration-300 hover:-translate-y-0.5">
                  <SelectValue placeholder="All Courses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Courses</SelectItem>
                  {courses.map((course) => (
                    <SelectItem key={course.id} value={course.id}>
                      {course.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
        <CardContent>
          {loading ? (
            <ContentLoader message="Loading assessments..." />
          ) : (
            <>
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  <h2 className="text-lg font-semibold">Assessments ({assignments.length})</h2>
                </div>
                <div className="space-y-4">
                  {paginatedAssignments.length > 0 ? (
                    paginatedAssignments.map((assignment) => (
                      <Link to={`/dashboard/grade-assignments/${assignment.id}`} key={assignment.id} className="block">
                        <Card className="hover:bg-muted/50 transition-colors">
                          <CardContent className="p-4 flex items-center gap-4">
                            <div className="bg-primary/10 text-primary p-3 rounded-lg">
                              <CheckSquare className="h-6 w-6" />
                            </div>
                            <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-4 items-center">
                              <div className="col-span-2 md:col-span-2">
                                <div className="flex items-center gap-2">
                                  <p className="font-semibold text-base">{assignment.title}</p>
                                  <Badge variant={assignment.type === 'quiz' ? 'default' : 'secondary'} className="capitalize">{assignment.type}</Badge>
                                </div>
                                <p className="text-sm text-muted-foreground">{assignment.course}</p>
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {assignment.overdue && <Badge variant="destructive">Overdue</Badge>}
                                <p className="mt-1">Due: {assignment.due_date}</p>
                              </div>
                              <div className="text-sm text-muted-foreground">
                                <p>{assignment.submissions} submissions</p>
                                <p>{assignment.graded} graded</p>
                              </div>
                              <div className="text-sm text-center">
                                  <p className="font-semibold text-base">{assignment.avg_score.toFixed(1)}%</p>
                                  <p className="text-muted-foreground">Average</p>
                              </div>
                              <div className="flex items-center gap-2 justify-self-end">
                                  <Badge>{assignment.status}</Badge>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </Link>
                    ))
                  ) : (
                    <p className="text-center text-muted-foreground py-4">No assessments found.</p>
                  )}
                </div>
              </div>
              {totalPages > 1 && (
                <Pagination className="mt-6">
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious
                        onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
                        className={currentPage === 1 ? 'pointer-events-none opacity-50' : undefined}
                      />
                    </PaginationItem>
                    <PaginationItem>
                      <span className="text-sm p-2">
                        Page {currentPage} of {totalPages}
                      </span>
                    </PaginationItem>
                    <PaginationItem>
                      <PaginationNext
                        onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
                        className={currentPage >= totalPages ? 'pointer-events-none opacity-50' : undefined}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
