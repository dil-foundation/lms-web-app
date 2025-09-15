import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useViewPreferences } from '@/contexts/ViewPreferencesContext';
import { ViewToggle } from '@/components/ui/ViewToggle';
import { AssessmentCardView } from '@/components/assessment/AssessmentCardView';
import { AssessmentTileView } from '@/components/assessment/AssessmentTileView';
import { AssessmentListView } from '@/components/assessment/AssessmentListView';
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
import { PaginationControls } from '@/components/ui/PaginationControls';
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
  const { profile } = useUserProfile();
  const { preferences, setAssignmentView } = useViewPreferences();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourse, setSelectedCourse] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  // Get default items per page based on current view
  const getDefaultItemsPerPage = (view: string) => {
    switch (view) {
      case 'card': return 8;
      case 'tile': return 18; // Tile view should show 18 items per page for consistency
      case 'list': return 8;
      default: return 8;
    }
  };
  
  const [itemsPerPage, setItemsPerPage] = useState(getDefaultItemsPerPage(preferences.assignmentView));

  // Check if user is admin
  const isAdmin = profile?.role === 'admin';

  const fetchCourses = useCallback(async () => {
    if(!user) return;
    
    if (isAdmin) {
      // For admin, get all published courses
      const { data, error } = await supabase
        .from('courses')
        .select('id, title')
        .eq('status', 'Published')
        .order('title');
      
      if(error) {
        console.error("Error fetching courses for admin", error);
      } else {
        setCourses(data || []);
      }
    } else {
      // For teacher, get only their courses
      const { data, error } = await supabase
        .from('courses')
        .select('id, title')
        .in('id', (await supabase.from('course_members').select('course_id').eq('user_id', user.id).eq('role', 'teacher')).data?.map(c => c.course_id) || [])
        
      if(error) {
          console.error("Error fetching courses for teacher", error);
      } else {
          setCourses(data || []);
      }
    }
  }, [user, isAdmin]);

  const fetchAssignments = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    setError(null);

    try {
      let data, rpcError;
      
      if (isAdmin) {
        // Use admin function to get all assessments
        const result = await supabase.rpc('get_admin_assessments_data', {
          search_query: debouncedSearchTerm,
          course_filter_id: selectedCourse === 'all' ? null : selectedCourse,
        });
        data = result.data;
        rpcError = result.error;
      } else {
        // Use teacher function to get only their assessments
        const result = await supabase.rpc('get_teacher_assessments_data', {
          teacher_id: user.id,
          search_query: debouncedSearchTerm,
          course_filter_id: selectedCourse === 'all' ? null : selectedCourse,
        });
        data = result.data;
        rpcError = result.error;
      }
      
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
  }, [user, debouncedSearchTerm, selectedCourse, isAdmin]);

  useEffect(() => {
    fetchCourses();
  }, [fetchCourses]);

  useEffect(() => {
    fetchAssignments();
  }, [fetchAssignments]);
  
  // Update items per page when view changes
  useEffect(() => {
    const newItemsPerPage = getDefaultItemsPerPage(preferences.assignmentView);
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(1); // Reset to first page when view changes
  }, [preferences.assignmentView]);
  
  useEffect(() => {
      setCurrentPage(1);
  }, [debouncedSearchTerm, selectedCourse])


  const paginatedAssignments = assignments.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );
  const totalPages = Math.ceil(assignments.length / itemsPerPage);

  const handleItemsPerPageChange = (newItemsPerPage: number) => {
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(1); // Reset to first page when changing items per page
  };
  
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
    <div className="space-y-6 mx-auto">
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
              {isAdmin 
                ? 'View and manage all quizzes and assignments across all courses'
                : 'Grade quizzes and assignments for your courses'
              }
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
              <div className="space-y-6">
                {/* View Toggle */}
                <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  <h2 className="text-lg font-semibold">Assessments ({assignments.length})</h2>
                </div>
                  <ViewToggle
                    currentView={preferences.assignmentView}
                    onViewChange={setAssignmentView}
                    availableViews={['card', 'tile', 'list']}
                  />
                </div>

                {/* Assessment Display based on selected view */}
                <div className="space-y-4">
                  {paginatedAssignments.length > 0 ? (
                    <>
                      {preferences.assignmentView === 'card' && (
                        <AssessmentCardView
                          assessments={paginatedAssignments.map(assignment => ({
                            id: assignment.id,
                            title: assignment.title,
                            type: assignment.type as 'quiz' | 'assignment',
                            course_name: assignment.course,
                            due_date: assignment.due_date,
                            status: assignment.overdue ? 'overdue' : (assignment.status as 'active' | 'inactive'),
                            submissions_count: assignment.submissions,
                            graded_count: assignment.graded,
                            average_score: assignment.avg_score
                          }))}
                          onAssessmentClick={(assessment) => {
                            window.location.href = `/dashboard/grade-assignments/${assessment.id}`;
                          }}
                          onGrade={(assessment) => {
                            window.location.href = `/dashboard/grade-assignments/${assessment.id}`;
                          }}
                          onEdit={(assessment) => {
                            // Handle edit functionality
                          }}
                          onDelete={(assessment) => {
                            // Handle delete functionality
                          }}
                          onViewSubmissions={(assessment) => {
                            window.location.href = `/dashboard/grade-assignments/${assessment.id}`;
                          }}
                        />
                      )}

                      {preferences.assignmentView === 'tile' && (
                        <AssessmentTileView
                          assessments={paginatedAssignments.map(assignment => ({
                            id: assignment.id,
                            title: assignment.title,
                            type: assignment.type as 'quiz' | 'assignment',
                            course_name: assignment.course,
                            due_date: assignment.due_date,
                            status: assignment.overdue ? 'overdue' : (assignment.status as 'active' | 'inactive'),
                            submissions_count: assignment.submissions,
                            graded_count: assignment.graded,
                            average_score: assignment.avg_score
                          }))}
                          onAssessmentClick={(assessment) => {
                            window.location.href = `/dashboard/grade-assignments/${assessment.id}`;
                          }}
                          onGrade={(assessment) => {
                            window.location.href = `/dashboard/grade-assignments/${assessment.id}`;
                          }}
                          onEdit={(assessment) => {
                            // Handle edit functionality
                          }}
                          onDelete={(assessment) => {
                            // Handle delete functionality
                          }}
                          onViewSubmissions={(assessment) => {
                            window.location.href = `/dashboard/grade-assignments/${assessment.id}`;
                          }}
                        />
                      )}

                      {preferences.assignmentView === 'list' && (
                        <AssessmentListView
                          assessments={paginatedAssignments.map(assignment => ({
                            id: assignment.id,
                            title: assignment.title,
                            type: assignment.type as 'quiz' | 'assignment',
                            course_name: assignment.course,
                            due_date: assignment.due_date,
                            status: assignment.overdue ? 'overdue' : (assignment.status as 'active' | 'inactive'),
                            submissions_count: assignment.submissions,
                            graded_count: assignment.graded,
                            average_score: assignment.avg_score
                          }))}
                          onAssessmentClick={(assessment) => {
                            window.location.href = `/dashboard/grade-assignments/${assessment.id}`;
                          }}
                          onGrade={(assessment) => {
                            window.location.href = `/dashboard/grade-assignments/${assessment.id}`;
                          }}
                          onEdit={(assessment) => {
                            // Handle edit functionality
                          }}
                          onDelete={(assessment) => {
                            // Handle delete functionality
                          }}
                          onViewSubmissions={(assessment) => {
                            window.location.href = `/dashboard/grade-assignments/${assessment.id}`;
                          }}
                        />
                      )}
                    </>
                  ) : (
                    <p className="text-center text-muted-foreground py-4">No assessments found.</p>
                  )}
                </div>
              </div>
              {totalPages > 1 && (
                <PaginationControls
                  currentPage={currentPage}
                  totalPages={totalPages}
                  totalItems={assignments.length}
                  itemsPerPage={itemsPerPage}
                  onPageChange={setCurrentPage}
                  onItemsPerPageChange={handleItemsPerPageChange}
                  itemsPerPageOptions={preferences.assignmentView === 'tile' ? [9, 18, 27, 36, 45] : [4, 8, 12, 16, 20]}
                  disabled={loading}
                  className="mt-6"
                />
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
