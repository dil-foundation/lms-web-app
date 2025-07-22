import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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

type Assignment = {
  id: string;
  title: string;
  course: string;
  course_id: string;
  type: string;
  due_date: string;
  submissions: number;
  graded: number;
  avg_score: string;
  status: string;
  overdue: boolean;
};

type Course = {
  id: string;
  title: string;
};

type StatCard = {
  title: string;
  value: string;
  icon: React.ElementType;
};

const initialStatCards: StatCard[] = [
  {
    title: 'Total Assessments',
    value: '0',
    icon: CheckSquare,
  },
  {
    title: 'Active',
    value: '0',
    icon: BookOpen,
  },
  {
    title: 'Pending Grading',
    value: '0',
    icon: Clock,
  },
  {
    title: 'Avg. Score',
    value: '0.0%',
    icon: TrendingUp,
  },
];

export const GradeAssignments = () => {
  const { user } = useAuth();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [filteredAssignments, setFilteredAssignments] = useState<Assignment[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourse, setSelectedCourse] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [statCards, setStatCards] = useState<StatCard[]>(initialStatCards);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  const fetchAssignments = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    setError(null);

    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      const role = profile?.role;
      let courseIds: number[] = [];

      if (role === 'teacher') {
        const { data: teacherCourses, error: teacherCoursesError } = await supabase
          .from('course_members')
          .select('course_id')
          .eq('user_id', user.id);

        if (teacherCoursesError) throw teacherCoursesError;
        courseIds = teacherCourses.map((c) => c.course_id);
      } else if (role === 'admin') {
        const { data: allCourses, error: allCoursesError } = await supabase
          .from('courses')
          .select('id');

        if (allCoursesError) throw allCoursesError;
        courseIds = allCourses.map((c) => c.id);
      }

      if (courseIds.length === 0) {
        setAssignments([]);
        setLoading(false);
        return;
      }

      const { data: coursesData, error: coursesError } = await supabase
        .from('courses')
        .select('id, title')
        .in('id', courseIds);

      if (coursesError) throw coursesError;

      setCourses(coursesData);
      const courseMap = new Map(coursesData.map((c) => [c.id, c.title]));

      const { data: sectionsData, error: sectionsError } = await supabase
        .from('course_sections')
        .select('id, course_id')
        .in('course_id', courseIds);

      if (sectionsError) throw sectionsError;

      const sectionIds = sectionsData.map((s) => s.id);
      const sectionToCourseMap = new Map(sectionsData.map((s) => [s.id, s.course_id]));

      if (sectionIds.length === 0) {
        setAssignments([]);
        setLoading(false);
        return;
      }

      let lessonsQuery = supabase
        .from('course_lessons')
        .select('id, title, due_date, section_id, type')
        .in('section_id', sectionIds)
        .in('type', ['quiz', 'assignment']);

      if (debouncedSearchTerm) {
        lessonsQuery = lessonsQuery.ilike('title', `%${debouncedSearchTerm}%`);
      }

      const { data: assignmentsData, error: assignmentsError } = await lessonsQuery;

      if (assignmentsError) throw assignmentsError;

      const assignmentsWithStats = await Promise.all(
        (assignmentsData || []).map(async (a: any) => {
          const courseId = sectionToCourseMap.get(a.section_id);
          const baseDetails = {
            id: a.id,
            title: a.title,
            type: a.type,
            course: courseMap.get(courseId) || 'Unknown Course',
            course_id: courseId,
            due_date: a.due_date ? new Date(a.due_date).toLocaleDateString() : 'N/A',
            overdue: a.due_date ? new Date(a.due_date) < new Date() : false,
            status: 'active', // Placeholder
          };

          if (a.type === 'quiz') {
            const { data: submissions, error: submissionsError } = await supabase
              .from('quiz_submissions')
              .select('score')
              .eq('lesson_id', a.id);

            if (submissionsError) {
              console.error(`Error fetching submissions for quiz ${a.id}:`, submissionsError);
              return { ...baseDetails, submissions: 0, graded: 0, avg_score: '0.0%' };
            }

            const avgScore =
              submissions.length > 0
                ? submissions.reduce((acc, s) => acc + s.score, 0) / submissions.length
                : 0;

            return {
              ...baseDetails,
              submissions: submissions.length,
              graded: submissions.length, // Quizzes are auto-graded
              avg_score: `${avgScore.toFixed(1)}%`,
            };
          } else if (a.type === 'assignment') {
            const { data: submissions, error: submissionsError } = await supabase
              .from('assignment_submissions')
              .select('status, grade')
              .eq('assignment_id', a.id);

            if (submissionsError) {
              console.error(`Error fetching submissions for assignment ${a.id}:`, submissionsError);
              return { ...baseDetails, submissions: 0, graded: 0, avg_score: '0.0%' };
            }

            const gradedSubmissions = submissions.filter((s) => s.status === 'graded' && s.grade !== null);
            const avgScore =
              gradedSubmissions.length > 0
                ? gradedSubmissions.reduce((acc, s) => acc + s.grade!, 0) / gradedSubmissions.length
                : 0;
            
            return {
              ...baseDetails,
              submissions: submissions.length,
              graded: gradedSubmissions.length,
              avg_score: `${avgScore.toFixed(1)}%`,
            };
          }

          // Fallback for any other type
          return { ...baseDetails, submissions: 0, graded: 0, avg_score: '0.0%' };
        })
      );

      setAssignments(assignmentsWithStats);

      const totalAssignments = assignmentsWithStats.length;
      const activeAssignments = assignmentsWithStats.filter(a => a.status === 'active').length;
      const pendingGrading = assignmentsWithStats.reduce((acc, a) => acc + (a.submissions - a.graded), 0);
      const overallAvgScore = assignmentsWithStats.length > 0
        ? assignmentsWithStats.reduce((acc, a) => acc + parseFloat(a.avg_score), 0) / totalAssignments
        : 0;
      
      setStatCards([
        { title: 'Total Assessments', value: totalAssignments.toString(), icon: CheckSquare },
        { title: 'Active', value: activeAssignments.toString(), icon: BookOpen },
        { title: 'Pending Grading', value: pendingGrading.toString(), icon: Clock },
        { title: 'Avg. Score', value: `${overallAvgScore.toFixed(1)}%`, icon: TrendingUp },
      ]);

    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [user, debouncedSearchTerm]);

  useEffect(() => {
    fetchAssignments();
  }, [fetchAssignments]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
      setCurrentPage(1);
    }, 300);

    return () => {
      clearTimeout(timer);
    };
  }, [searchTerm]);

  useEffect(() => {
    if (selectedCourse === 'all') {
      setFilteredAssignments(assignments);
    } else {
      setFilteredAssignments(
        assignments.filter((assignment) => assignment.course === selectedCourse)
      );
    }
  }, [selectedCourse, assignments]);

  if (error) {
    return <div>Error: {error}</div>;
  }

  const paginatedAssignments = filteredAssignments.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );
  const totalPages = Math.ceil(filteredAssignments.length / itemsPerPage);

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Assessments</h1>
          <p className="text-muted-foreground">
            Grade quizzes and assignments for your courses
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((card) => (
          <Card key={card.title} className="bg-gradient-to-br from-card to-green-500/5 dark:bg-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
              <card.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{card.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="relative flex-1 md:grow-0">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search assignment or quiz..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full rounded-lg bg-background pl-8 md:w-[200px] lg:w-[320px]"
              />
            </div>
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <Select value={selectedCourse} onValueChange={(value) => {
                setSelectedCourse(value);
                setCurrentPage(1);
              }}>
                <SelectTrigger className="w-full sm:w-auto">
                  <SelectValue placeholder="All Courses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Courses</SelectItem>
                  {courses.map((course) => (
                    <SelectItem key={course.id} value={course.title}>
                      {course.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <ContentLoader message="Loading assessments..." />
          ) : (
            <>
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  <h2 className="text-lg font-semibold">Assessments ({filteredAssignments.length})</h2>
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
                                  <p className="font-semibold text-base">{assignment.avg_score}</p>
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
              {totalPages > 0 && (
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
