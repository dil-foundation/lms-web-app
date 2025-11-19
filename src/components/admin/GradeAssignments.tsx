import { useState, useEffect, useCallback, useRef } from 'react';
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
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-4 sm:p-6">
      <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground truncate pr-2">{title}</CardTitle>
      <Icon className={`h-3.5 w-3.5 sm:h-4 sm:w-4 ${color} flex-shrink-0`} />
    </CardHeader>
    <CardContent className="p-4 sm:p-6 pt-0">
      <div className="space-y-1">
        <div className="text-xl sm:text-2xl font-bold truncate">{value}</div>
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
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  
  // Track if we've completed initial fetch to prevent race conditions
  const hasFetchedRef = useRef(false);
  // Track if a fetch is currently in progress to prevent overlapping fetches
  const isFetchingRef = useRef(false);
  // Track the role that initiated the current fetch
  const fetchingAsAdminRef = useRef<boolean | null>(null);
  // Track the stable role (once set, doesn't flicker back to undefined)
  const stableRoleRef = useRef<'admin' | 'teacher' | null>(null);
  
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

  // Check if user is admin (includes super_user)
  const currentIsAdmin = profile?.role === 'admin' || profile?.role === 'super_user';
  
  // Track if stable role just got set (to trigger fetches)
  const [stableRoleSet, setStableRoleSet] = useState(false);

  // Once profile is defined, lock in the role (don't let it flicker)
  if (profile?.role && !stableRoleRef.current) {
    stableRoleRef.current = (profile.role === 'admin' || profile.role === 'super_user') ? 'admin' : 'teacher';
    console.log('🔒 [GradeAssignments] Locked stable role:', stableRoleRef.current, 'from profile role:', profile.role);
    // Trigger state update to cause re-fetch
    setStableRoleSet(true);
  }

  // Use stable role if available, otherwise fall back to current
  const isAdmin = stableRoleRef.current === 'admin';

  // Debug: Log component mount and user/profile changes
  useEffect(() => {
    console.log('🚀 [GradeAssignments] Component state changed:', {
      hasUser: !!user,
      userId: user?.id,
      hasProfile: profile !== undefined,
      profileRole: profile?.role,
      currentIsAdmin,
      stableRole: stableRoleRef.current,
      isAdmin,
      loading,
      assignmentsCount: assignments.length,
      hasFetchedRef: hasFetchedRef.current,
      isFetchingRef: isFetchingRef.current,
      fetchingAsAdminRef: fetchingAsAdminRef.current
    });
  }, [user, profile, currentIsAdmin, isAdmin, loading, assignments.length]);

  const fetchCourses = useCallback(async () => {
    console.log('🔍 [fetchCourses] Called with:', { 
      hasUser: !!user, 
      hasStableRole: !!stableRoleRef.current,
      stableRole: stableRoleRef.current,
      isAdmin,
      profileRole: profile?.role 
    });
    
    // Guard: Don't fetch if user isn't loaded or stable role isn't determined yet
    if (!user || !stableRoleRef.current) {
      console.log('⚠️ [fetchCourses] Blocked by guard - user or stable role not ready');
      return;
    }
    
    console.log('✅ [fetchCourses] Starting fetch as', isAdmin ? 'admin' : 'teacher');
    
    if (isAdmin) {
      // For admin, get all published courses
      const { data, error } = await supabase
        .from('courses')
        .select('id, title')
        .eq('status', 'Published')
        .order('title');
      
      if(error) {
        console.error("❌ [fetchCourses] Error fetching courses for admin", error);
      } else {
        console.log('✅ [fetchCourses] Admin courses fetched:', data?.length || 0, 'courses');
        setCourses(data || []);
      }
    } else {
      // For teacher, get only their courses
      const { data, error } = await supabase
        .from('courses')
        .select('id, title')
        .in('id', (await supabase.from('course_members').select('course_id').eq('user_id', user.id).eq('role', 'teacher')).data?.map(c => c.course_id) || [])
        
      if(error) {
          console.error("❌ [fetchCourses] Error fetching courses for teacher", error);
      } else {
          console.log('✅ [fetchCourses] Teacher courses fetched:', data?.length || 0, 'courses');
          setCourses(data || []);
      }
    }
  }, [user, isAdmin]); // Removed 'profile' - using stableRoleRef instead

  const fetchAssignments = useCallback(async () => {
    console.log('🔍 [fetchAssignments] Called with:', {
      hasUser: !!user,
      userId: user?.id,
      hasStableRole: !!stableRoleRef.current,
      stableRole: stableRoleRef.current,
      profileRole: profile?.role,
      isAdmin,
      hasFetched: hasFetchedRef.current,
      isFetching: isFetchingRef.current,
      fetchingAsAdmin: fetchingAsAdminRef.current,
      searchTerm: debouncedSearchTerm,
      selectedCourse,
      timestamp: new Date().toISOString()
    });

    // Guard: Don't fetch if user isn't loaded or stable role isn't determined yet
    if (!user || !stableRoleRef.current) {
      console.log('⚠️ [fetchAssignments] Blocked by guard - user or stable role not ready');
      return;
    }

    // Guard: Prevent overlapping fetches ONLY if the role hasn't changed
    // If role changed (teacher → admin or admin → teacher), allow the new fetch
    if (isFetchingRef.current && fetchingAsAdminRef.current === isAdmin) {
      console.log('🚫 [fetchAssignments] Blocked - fetch already in progress with same role');
      return;
    }

    // If role changed while a fetch is in progress, this new fetch will proceed
    if (isFetchingRef.current && fetchingAsAdminRef.current !== isAdmin) {
      console.log('🔄 [fetchAssignments] Role changed during fetch - allowing new fetch to proceed');
    }

    console.log('✅ [fetchAssignments] Starting fetch as', isAdmin ? 'admin' : 'teacher');
    isFetchingRef.current = true;
    fetchingAsAdminRef.current = isAdmin;

    // Capture the role at the START of this fetch (immutable for this fetch's lifetime)
    const thisFetchIsForAdmin = isAdmin;

    // Use ref to check if we have data (avoids circular dependency)
    // If we already have data, show refresh indicator instead of full loading
    if (hasFetchedRef.current) {
      console.log('🔄 [fetchAssignments] Setting refreshing state (already have data)');
      setIsRefreshing(true);
    } else {
      console.log('⏳ [fetchAssignments] Setting loading state (first fetch)');
      setLoading(true);
    }
    setError(null);

    try {
      let data: any;
      let rpcError: any;
      const startTime = Date.now();

      // Create a timeout promise (30 seconds)
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Request timeout after 30 seconds')), 30000)
      );

      if (thisFetchIsForAdmin) {
        console.log('📞 [fetchAssignments] Calling get_admin_assessments_data RPC', {
          search_query: debouncedSearchTerm,
          course_filter_id: selectedCourse === 'all' ? null : selectedCourse
        });
        // Use admin function to get all assessments with timeout
        const rpcPromise = supabase.rpc('get_admin_assessments_data', {
          search_query: debouncedSearchTerm,
          course_filter_id: selectedCourse === 'all' ? null : selectedCourse,
        });

        try {
          const result = await Promise.race([rpcPromise, timeoutPromise]);
          data = result.data;
          rpcError = result.error;
        } catch (timeoutError: any) {
          console.error('⏱️ [fetchAssignments] Request timed out:', timeoutError);
          throw timeoutError;
        }
        console.log(`📊 [fetchAssignments] Admin RPC returned in ${Date.now() - startTime}ms:`, {
          dataCount: data?.length || 0,
          hasError: !!rpcError,
          error: rpcError,
          errorDetails: rpcError ? JSON.stringify(rpcError) : null
        });
      } else {
        console.log('📞 [fetchAssignments] Calling get_teacher_assessments_data RPC', {
          teacher_id: user.id,
          search_query: debouncedSearchTerm,
          course_filter_id: selectedCourse === 'all' ? null : selectedCourse
        });
        // Use teacher function to get only their assessments with timeout
        const rpcPromise = supabase.rpc('get_teacher_assessments_data', {
          teacher_id: user.id,
          search_query: debouncedSearchTerm,
          course_filter_id: selectedCourse === 'all' ? null : selectedCourse,
        });

        try {
          const result = await Promise.race([rpcPromise, timeoutPromise]);
          data = result.data;
          rpcError = result.error;
        } catch (timeoutError: any) {
          console.error('⏱️ [fetchAssignments] Request timed out:', timeoutError);
          throw timeoutError;
        }
        console.log(`📊 [fetchAssignments] Teacher RPC returned in ${Date.now() - startTime}ms:`, {
          dataCount: data?.length || 0,
          hasError: !!rpcError,
          error: rpcError,
          errorDetails: rpcError ? JSON.stringify(rpcError) : null,
          errorMessage: rpcError?.message,
          errorCode: rpcError?.code,
          errorHint: rpcError?.hint
        });
      }
      
      if (rpcError) {
        console.error('❌ [fetchAssignments] RPC Error:', rpcError);
        throw rpcError;
      }
      
      console.log('🔄 [fetchAssignments] Formatting', data?.length || 0, 'assignments');
      const formattedAssignments = (data || []).map((a: any) => ({
        ...a,
        due_date: a.due_date ? new Date(a.due_date).toLocaleDateString() : 'N/A',
        overdue: a.due_date ? new Date(a.due_date) < new Date() : false,
        status: 'active', // This could be enhanced if the function provides it
        avg_score: Number(a.avg_score)
      }));

      console.log('✅ [fetchAssignments] Fetch returned', formattedAssignments.length, 'assignments');
      console.log('📝 [fetchAssignments] This fetch was initiated as:', thisFetchIsForAdmin ? 'admin' : 'teacher');
      console.log('📝 [fetchAssignments] Current isAdmin state is:', isAdmin);
      
      // Critical: Only update state if this fetch matches the current role
      // This prevents stale fetches from overwriting newer data
      if (thisFetchIsForAdmin !== isAdmin) {
        console.warn('⚠️ [fetchAssignments] IGNORING STALE RESULT - role changed during fetch');
        console.warn('   Fetch was for:', thisFetchIsForAdmin ? 'admin' : 'teacher');
        console.warn('   Current role:', isAdmin ? 'admin' : 'teacher');
        console.warn('   NOT updating state with stale data');
        return; // Don't update state with stale data
      }
      
      console.log('✅ [fetchAssignments] Role still matches - setting assignments to state');
      
      setAssignments(formattedAssignments);
      hasFetchedRef.current = true;
      console.log('✅ [fetchAssignments] Fetch complete successfully');
    } catch (err: any) {
      console.error('❌ [fetchAssignments] Error:', err);
      setError(err.message);
    } finally {
      console.log('🏁 [fetchAssignments] Finally block - resetting loading states and fetch flag');
      isFetchingRef.current = false;
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [user, debouncedSearchTerm, selectedCourse, isAdmin]); // Removed 'profile' - using stableRoleRef instead

  useEffect(() => {
    console.log('🔄 [useEffect-fetchCourses] Triggered');
    fetchCourses();
  }, [fetchCourses]);

  useEffect(() => {
    console.log('🔄 [useEffect-fetchAssignments] Triggered');
    fetchAssignments();
  }, [fetchAssignments]);

  // Trigger fetches when stable role gets set
  useEffect(() => {
    if (stableRoleSet && user && stableRoleRef.current) {
      console.log('🎯 [useEffect-stableRoleSet] Stable role just set, triggering fetches');
      fetchCourses();
      fetchAssignments();
    }
  }, [stableRoleSet, user, fetchCourses, fetchAssignments]);
  
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
  
  // Debug: Log pagination state
  console.log('📄 [Render] Pagination state:', {
    totalAssignments: assignments.length,
    paginatedCount: paginatedAssignments.length,
    currentPage,
    totalPages,
    itemsPerPage,
    loading,
    isRefreshing
  });

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
    return <div className="p-4 sm:p-8 text-center text-red-500 text-sm sm:text-base">Error: {error}</div>;
  }

  return (
    <div className="space-y-4 sm:space-y-6 mx-auto px-4 sm:px-0">
      <div className="relative p-4 sm:p-6 md:p-8 rounded-2xl sm:rounded-3xl bg-gradient-to-r from-primary/5 via-transparent to-primary/5">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-primary/10 to-primary/20 rounded-xl sm:rounded-2xl flex items-center justify-center flex-shrink-0">
            <CheckSquare className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight bg-gradient-to-r from-primary via-primary to-primary/80 bg-clip-text text-transparent">
              Assessments
            </h1>
            <p className="text-sm sm:text-base md:text-lg text-muted-foreground mt-1 sm:mt-2 leading-relaxed">
              {isAdmin 
                ? 'View and manage all quizzes and assignments across all courses'
                : 'Grade quizzes and assignments for your courses'
              }
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:gap-6 grid-cols-2 md:grid-cols-2 lg:grid-cols-4">
        {statCardsData.map((card) => <StatCard key={card.title} {...card} />)}
      </div>

      <Card className="bg-card border border-border">
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="text-lg sm:text-xl font-semibold">Assessment Management</CardTitle>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 pt-0">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-4 sm:mb-6">
            <div className="relative flex-1 sm:flex-initial sm:min-w-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search assignment or quiz..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full rounded-xl bg-background border border-input shadow-sm hover:shadow-lg hover:shadow-primary/10 transition-all duration-300 hover:-translate-y-0.5 pl-10 h-10 sm:w-full sm:max-w-[250px] md:w-[250px] lg:w-[350px]"
              />
            </div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4">
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
        <CardContent className="p-4 sm:p-6">
          {loading ? (
            <ContentLoader message="Loading assessments..." />
          ) : (
            <>
              <div className="space-y-4 sm:space-y-6">
                {/* View Toggle */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <FileText className="h-4 w-4 sm:h-5 sm:w-5 text-primary flex-shrink-0" />
                    <h2 className="text-base sm:text-lg font-semibold truncate">Assessments ({assignments.length})</h2>
                    {isRefreshing && (
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground flex-shrink-0 ml-2">
                        <div className="w-3 h-3 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                        <span className="hidden sm:inline">Refreshing...</span>
                      </div>
                    )}
                  </div>
                  <div className="flex-shrink-0">
                    <ViewToggle
                      currentView={preferences.assignmentView}
                      onViewChange={setAssignmentView}
                      availableViews={['card', 'tile', 'list']}
                    />
                  </div>
                </div>

                {/* Assessment Display based on selected view */}
                <div className="space-y-3 sm:space-y-4">
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
                  className="mt-4 sm:mt-6"
                />
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
