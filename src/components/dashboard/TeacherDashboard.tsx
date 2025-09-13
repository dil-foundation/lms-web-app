
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Legend, AreaChart, Area } from 'recharts';
import { 
  Users, 
  BookOpen, 
  TrendingUp, 
  Activity, 
  GraduationCap, 
  Award, 
  Clock, 
  Target, 
  BarChart3,
  PieChart as PieChartIcon,
  Search,
  SortAsc,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Filter,
  X
} from 'lucide-react';
import { ContentLoader } from '@/components/ContentLoader';
import { Drawer, DrawerClose, DrawerContent, DrawerDescription, DrawerFooter, DrawerHeader, DrawerTitle, DrawerTrigger } from '@/components/ui/drawer';
import { Label } from '@/components/ui/label';

interface TeacherDashboardProps {
  userProfile: {
    id: string;
    first_name?: string;
    last_name?: string;
    teacher_id?: string;
  };
}

interface DashboardStats {
  totalStudents: number;
  publishedCourses: number;
  activeCourses: number;
  totalCourses: number;
  avgEngagement: number;
  avgCompletion: number;
  pendingAssignments: number;
  totalAssignments: number;
  activeStudents: number;
}

const chartConfig = {
  activeStudents: { label: 'Active Students', color: '#3B82F6' },
  completionRate: { label: 'Completion Rate (%)', color: '#10B981' },
  timeSpent: { label: 'Time Spent (min)', color: '#8B5CF6' },
  enrolled: { label: 'Enrolled', color: '#3B82F6' },
  completed: { label: 'Completed', color: '#10B981' },
  inProgress: { label: 'In Progress', color: '#F59E0B' },
  avgRating: { label: 'Avg Rating', color: '#EF4444' },
  submitted: { label: 'Submitted', color: '#10B981' },
  pending: { label: 'Pending', color: '#F59E0B' },
  graded: { label: 'Graded', color: '#3B82F6' },
  avgScore: { label: 'Avg Score', color: '#8B5CF6' },
  ratings: { label: 'Ratings Count', color: '#3B82F6' },
  comments: { label: 'Comments', color: '#10B981' },
};

// Filter data interfaces
interface Country {
  id: string;
  name: string;
  code: string;
}

interface Region {
  id: string;
  name: string;
  code: string;
  country_id: string;
}

interface City {
  id: string;
  name: string;
  code: string;
  country_id: string;
  region_id: string;
}

interface Project {
  id: string;
  name: string;
  code: string;
  country_id: string;
  region_id: string;
  city_id: string;
}

interface Board {
  id: string;
  name: string;
  code: string;
  country_id: string;
  region_id: string;
  city_id: string;
  project_id: string;
}

interface School {
  id: string;
  name: string;
  code: string;
  school_type: string;
  country_id: string;
  region_id: string;
  city_id: string;
  project_id: string;
  board_id: string;
}

interface Class {
  id: string;
  name: string;
  code: string;
  grade: string;
  school_id: string;
  board_id: string;
}

interface FilterState {
  country: string;
  region: string;
  city: string;
  project: string;
  board: string;
  school: string;
  class: string;
}

export const TeacherDashboard = ({ userProfile }: TeacherDashboardProps) => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('30days');
  const [studentEngagementData, setStudentEngagementData] = useState<any[]>([]);
  const [coursePerformanceData, setCoursePerformanceData] = useState<any[]>([]);
  const [studentProgressData, setStudentProgressData] = useState<any[]>([]);

  // Reports tab state
  const [courseCompletionTrends, setCourseCompletionTrends] = useState<any[]>([]);
  const [quizScoresData, setQuizScoresData] = useState<any[]>([]);
  const [engagementTrendsData, setEngagementTrendsData] = useState<any[]>([]);

  // Student status counts state
  const [studentStatusCounts, setStudentStatusCounts] = useState<{
    total_students: number;
    active_students: number;
    behind_students: number;
    excellent_students: number;
    not_started_students: number;
  } | null>(null);

  // Filter data states
  const [countries, setCountries] = useState<Country[]>([]);
  const [regions, setRegions] = useState<Region[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [boards, setBoards] = useState<Board[]>([]);
  const [schools, setSchools] = useState<School[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);

  // Filter loading states
  const [filterLoading, setFilterLoading] = useState({
    countries: false,
    regions: false,
    cities: false,
    projects: false,
    boards: false,
    schools: false,
    classes: false,
  });

  // Filter values state
  const [filters, setFilters] = useState<FilterState>({
    country: 'all',
    region: 'all',
    city: 'all',
    project: 'all',
    board: 'all',
    school: 'all',
    class: 'all',
  });

  // Applied filters state (what's actually being used for data fetching)
  const [appliedFilters, setAppliedFilters] = useState<FilterState>({
    country: 'all',
    region: 'all',
    city: 'all',
    project: 'all',
    board: 'all',
    school: 'all',
    class: 'all',
  });

  // Helper function to get date range based on timeRange
  const getDateRange = (range: string) => {
    const now = new Date();
    const startDate = new Date();
    
    switch (range) {
      case '7days':
        startDate.setDate(now.getDate() - 7);
        break;
      case '30days':
        startDate.setDate(now.getDate() - 30);
        break;
      case '3months':
        startDate.setMonth(now.getMonth() - 3);
        break;
      case '6months':
        startDate.setMonth(now.getMonth() - 6);
        break;
      case '1year':
        startDate.setFullYear(now.getFullYear() - 1);
        break;
      default:
        // Default to all time
        startDate.setFullYear(2020, 0, 1);
    }
    
    return { startDate, endDate: now };
  };

  // Filter data fetching functions
  const fetchCountries = async () => {
    setFilterLoading(prev => ({ ...prev, countries: true }));
    try {
      const { data, error } = await supabase
        .from('countries')
        .select('id, name, code')
        .order('name', { ascending: true });

      if (error) throw error;
      setCountries(data || []);
    } catch (error) {
      console.error('Failed to fetch countries:', error);
      toast.error('Failed to load countries');
    } finally {
      setFilterLoading(prev => ({ ...prev, countries: false }));
    }
  };

  const fetchRegions = async (countryId?: string) => {
    setFilterLoading(prev => ({ ...prev, regions: true }));
    try {
      let query = supabase
        .from('regions')
        .select('id, name, code, country_id')
        .order('name', { ascending: true });

      if (countryId && countryId !== 'all') {
        query = query.eq('country_id', countryId);
      }

      const { data, error } = await query;

      if (error) throw error;
      setRegions(data || []);
    } catch (error) {
      console.error('Failed to fetch regions:', error);
      toast.error('Failed to load regions');
    } finally {
      setFilterLoading(prev => ({ ...prev, regions: false }));
    }
  };

  const fetchCities = async (countryId?: string, regionId?: string) => {
    setFilterLoading(prev => ({ ...prev, cities: true }));
    try {
      let query = supabase
        .from('cities')
        .select('id, name, code, country_id, region_id')
        .order('name', { ascending: true });

      if (countryId && countryId !== 'all') {
        query = query.eq('country_id', countryId);
      }
      if (regionId && regionId !== 'all') {
        query = query.eq('region_id', regionId);
      }

      const { data, error } = await query;

      if (error) throw error;
      setCities(data || []);
    } catch (error) {
      console.error('Failed to fetch cities:', error);
      toast.error('Failed to load cities');
    } finally {
      setFilterLoading(prev => ({ ...prev, cities: false }));
    }
  };

  const fetchProjects = async (countryId?: string, regionId?: string, cityId?: string) => {
    setFilterLoading(prev => ({ ...prev, projects: true }));
    try {
      let query = supabase
        .from('projects')
        .select('id, name, code, country_id, region_id, city_id')
        .order('name', { ascending: true });

      if (countryId && countryId !== 'all') {
        query = query.eq('country_id', countryId);
      }
      if (regionId && regionId !== 'all') {
        query = query.eq('region_id', regionId);
      }
      if (cityId && cityId !== 'all') {
        query = query.eq('city_id', cityId);
      }

      const { data, error } = await query;

      if (error) throw error;
      setProjects(data || []);
    } catch (error) {
      console.error('Failed to fetch projects:', error);
      toast.error('Failed to load projects');
    } finally {
      setFilterLoading(prev => ({ ...prev, projects: false }));
    }
  };

  const fetchBoards = async (countryId?: string, regionId?: string, cityId?: string, projectId?: string) => {
    setFilterLoading(prev => ({ ...prev, boards: true }));
    try {
      let query = supabase
        .from('boards')
        .select('id, name, code, country_id, region_id, city_id, project_id')
        .order('name', { ascending: true });

      if (countryId && countryId !== 'all') {
        query = query.eq('country_id', countryId);
      }
      if (regionId && regionId !== 'all') {
        query = query.eq('region_id', regionId);
      }
      if (cityId && cityId !== 'all') {
        query = query.eq('city_id', cityId);
      }
      if (projectId && projectId !== 'all') {
        query = query.eq('project_id', projectId);
      }

      const { data, error } = await query;

      if (error) throw error;
      setBoards(data || []);
    } catch (error) {
      console.error('Failed to fetch boards:', error);
      toast.error('Failed to load boards');
    } finally {
      setFilterLoading(prev => ({ ...prev, boards: false }));
    }
  };

  const fetchSchools = async (countryId?: string, regionId?: string, cityId?: string, projectId?: string, boardId?: string) => {
    setFilterLoading(prev => ({ ...prev, schools: true }));
    try {
      let query = supabase
        .from('schools')
        .select('id, name, code, school_type, country_id, region_id, city_id, project_id, board_id')
        .order('name', { ascending: true });

      if (countryId && countryId !== 'all') {
        query = query.eq('country_id', countryId);
      }
      if (regionId && regionId !== 'all') {
        query = query.eq('region_id', regionId);
      }
      if (cityId && cityId !== 'all') {
        query = query.eq('city_id', cityId);
      }
      if (projectId && projectId !== 'all') {
        query = query.eq('project_id', projectId);
      }
      if (boardId && boardId !== 'all') {
        query = query.eq('board_id', boardId);
      }

      const { data, error } = await query;

      if (error) throw error;
      setSchools(data || []);
    } catch (error) {
      console.error('Failed to fetch schools:', error);
      toast.error('Failed to load schools');
    } finally {
      setFilterLoading(prev => ({ ...prev, schools: false }));
    }
  };

  const fetchClasses = async (schoolId?: string, boardId?: string) => {
    setFilterLoading(prev => ({ ...prev, classes: true }));
    try {
      let query = supabase
        .from('classes')
        .select('id, name, code, grade, school_id, board_id')
        .order('grade', { ascending: true });

      if (schoolId && schoolId !== 'all') {
        query = query.eq('school_id', schoolId);
      }
      if (boardId && boardId !== 'all') {
        query = query.eq('board_id', boardId);
      }

      const { data, error } = await query;

      if (error) throw error;
      setClasses(data || []);
    } catch (error) {
      console.error('Failed to fetch classes:', error);
      toast.error('Failed to load classes');
    } finally {
      setFilterLoading(prev => ({ ...prev, classes: false }));
    }
  };

  // Filter change handlers with cascading logic
  const handleFilterChange = (filterType: keyof FilterState, value: string) => {
    setFilters(prev => {
      const newFilters = { ...prev, [filterType]: value };
      
      // Reset dependent filters when parent changes
      switch (filterType) {
        case 'country':
          newFilters.region = 'all';
          newFilters.city = 'all';
          newFilters.project = 'all';
          newFilters.board = 'all';
          newFilters.school = 'all';
          newFilters.class = 'all';
          break;
        case 'region':
          newFilters.city = 'all';
          newFilters.project = 'all';
          newFilters.board = 'all';
          newFilters.school = 'all';
          newFilters.class = 'all';
          break;
        case 'city':
          newFilters.project = 'all';
          newFilters.board = 'all';
          newFilters.school = 'all';
          newFilters.class = 'all';
          break;
        case 'project':
          newFilters.board = 'all';
          newFilters.school = 'all';
          newFilters.class = 'all';
          break;
        case 'board':
          newFilters.school = 'all';
          newFilters.class = 'all';
          break;
        case 'school':
          newFilters.class = 'all';
          break;
      }
      
      return newFilters;
    });

    // Fetch dependent data based on the change
    switch (filterType) {
      case 'country':
        fetchRegions(value !== 'all' ? value : undefined);
        fetchCities(value !== 'all' ? value : undefined);
        fetchProjects(value !== 'all' ? value : undefined);
        fetchBoards(value !== 'all' ? value : undefined);
        fetchSchools(value !== 'all' ? value : undefined);
        fetchClasses();
        break;
      case 'region':
        fetchCities(filters.country !== 'all' ? filters.country : undefined, value !== 'all' ? value : undefined);
        fetchProjects(filters.country !== 'all' ? filters.country : undefined, value !== 'all' ? value : undefined);
        fetchBoards(filters.country !== 'all' ? filters.country : undefined, value !== 'all' ? value : undefined);
        fetchSchools(filters.country !== 'all' ? filters.country : undefined, value !== 'all' ? value : undefined);
        fetchClasses();
        break;
      case 'city':
        fetchProjects(filters.country !== 'all' ? filters.country : undefined, filters.region !== 'all' ? filters.region : undefined, value !== 'all' ? value : undefined);
        fetchBoards(filters.country !== 'all' ? filters.country : undefined, filters.region !== 'all' ? filters.region : undefined, value !== 'all' ? value : undefined);
        fetchSchools(filters.country !== 'all' ? filters.country : undefined, filters.region !== 'all' ? filters.region : undefined, value !== 'all' ? value : undefined);
        fetchClasses();
        break;
      case 'project':
        fetchBoards(filters.country !== 'all' ? filters.country : undefined, filters.region !== 'all' ? filters.region : undefined, filters.city !== 'all' ? filters.city : undefined, value !== 'all' ? value : undefined);
        fetchSchools(filters.country !== 'all' ? filters.country : undefined, filters.region !== 'all' ? filters.region : undefined, filters.city !== 'all' ? filters.city : undefined, value !== 'all' ? value : undefined);
        fetchClasses();
        break;
      case 'board':
        fetchSchools(filters.country !== 'all' ? filters.country : undefined, filters.region !== 'all' ? filters.region : undefined, filters.city !== 'all' ? filters.city : undefined, filters.project !== 'all' ? filters.project : undefined, value !== 'all' ? value : undefined);
        fetchClasses(undefined, value !== 'all' ? value : undefined);
        break;
      case 'school':
        fetchClasses(value !== 'all' ? value : undefined, filters.board !== 'all' ? filters.board : undefined);
        break;
    }
  };

  // Clear all filters function
  const clearAllFilters = () => {
    const clearedFilters = {
      country: 'all',
      region: 'all',
      city: 'all',
      project: 'all',
      board: 'all',
      school: 'all',
      class: 'all',
    };
    
    setFilters(clearedFilters);
    setAppliedFilters(clearedFilters);
    
    // Reset all dependent data to show all options
    fetchRegions();
    fetchCities();
    fetchProjects();
    fetchBoards();
    fetchSchools();
    fetchClasses();
  };

  // Apply filters function
  const applyFilters = () => {
    // Apply the current filter selections to the applied filters
    setAppliedFilters(filters);
    toast.success('Filters applied successfully');
  };

  // Initialize filter data on component mount
  useEffect(() => {
    fetchCountries();
    fetchRegions();
    fetchCities();
    fetchProjects();
    fetchBoards();
    fetchSchools();
    fetchClasses();
  }, []);

  useEffect(() => {
    const fetchTeacherData = async () => {
      if (!userProfile?.id) {

        setLoading(false);
        return;
      }
      

      setLoading(true);
      try {
        const { startDate, endDate } = getDateRange(timeRange);


        // 1. Find all courses this teacher is a part of
        const { data: teacherCourses, error: teacherCoursesError } = await supabase
          .from('course_members')
          .select('course_id')
          .eq('user_id', userProfile.id)
          .eq('role', 'teacher');

        if (teacherCoursesError) throw teacherCoursesError;

        const courseIds = teacherCourses.map(c => c.course_id);


        if (courseIds.length === 0) {

          setStats({
            totalStudents: 0,
            publishedCourses: 0,
            activeCourses: 0,
            totalCourses: 0,
            avgEngagement: 0,
            avgCompletion: 0,
            pendingAssignments: 0,
            totalAssignments: 0,
            activeStudents: 0,
          });
          setLoading(false);
          return;
        }

        // 2. Get course sections for teacher's courses
        const { data: sections, error: sectionsError } = await supabase
          .from('course_sections')
          .select('id, course_id')
          .in('course_id', courseIds);

        if (sectionsError) throw sectionsError;

        const sectionIds = sections.map(s => s.id);


        // 3. Get assignment lesson IDs
        const { data: assignmentLessons, error: lessonsError } = await supabase
          .from('course_lessons')
          .select('id')
          .in('section_id', sectionIds);

        if (lessonsError) throw lessonsError;

        const assignmentLessonIds = assignmentLessons.map(l => l.id);


        // 4. Fetch teacher-specific stats using the new engagement metrics function with filters
        const filterParams: any = {
          p_teacher_id: userProfile.id,
          p_time_range: timeRange
        };
        
        // Add filter parameters if they are not 'all'
        if (appliedFilters.country !== 'all') filterParams.filter_country_id = appliedFilters.country;
        if (appliedFilters.region !== 'all') filterParams.filter_region_id = appliedFilters.region;
        if (appliedFilters.city !== 'all') filterParams.filter_city_id = appliedFilters.city;
        if (appliedFilters.project !== 'all') filterParams.filter_project_id = appliedFilters.project;
        if (appliedFilters.board !== 'all') filterParams.filter_board_id = appliedFilters.board;
        if (appliedFilters.school !== 'all') filterParams.filter_school_id = appliedFilters.school;
        if (appliedFilters.class !== 'all') filterParams.filter_class_id = appliedFilters.class;

        const { data: engagementMetrics, error: engagementError } = await supabase.rpc('get_teacher_engagement_metrics_with_filters', filterParams);

        if (engagementError) throw engagementError;





        // Also fetch course counts for the dashboard
        const [
          { count: publishedCourses, error: coursesError },
          { count: totalCourses, error: totalCoursesError },
        ] = await Promise.all([
          // Published courses by this teacher
          supabase.from('courses')
            .select('*', { count: 'exact', head: true })
            .in('id', courseIds)
            .eq('status', 'Published')
            .gte('created_at', startDate.toISOString()),
          
          // Total courses by this teacher
          supabase.from('courses')
            .select('*', { count: 'exact', head: true })
            .in('id', courseIds)
            .gte('created_at', startDate.toISOString()),
        ]);

        if (coursesError) throw coursesError;
        if (totalCoursesError) throw totalCoursesError;



        // Use real engagement metrics from SQL function
        const realStats = engagementMetrics?.[0] || {
          total_students: 0,
          active_students: 0,
          engagement_rate: 0,
          avg_completion_rate: 0,
          total_assignments: 0,
          pending_assignments: 0,
          completion_rate: 0
        };

        const baseStats = {
          totalStudents: realStats.total_students,
          publishedCourses: publishedCourses ?? 0,
          activeCourses: publishedCourses ?? 0, // Assuming published courses are active
          totalCourses: totalCourses ?? 0,
          avgEngagement: realStats.engagement_rate,
          avgCompletion: realStats.completion_rate,
          pendingAssignments: realStats.pending_assignments,
          totalAssignments: realStats.total_assignments,
          activeStudents: realStats.active_students,
        };


        setStats(baseStats);


        await fetchStudentEngagementData(courseIds, timeRange, appliedFilters);
        await fetchCoursePerformanceData(courseIds, appliedFilters);
        await fetchStudentProgressData(courseIds, appliedFilters);
        

        await fetchCourseCompletionTrends(courseIds, timeRange, appliedFilters);
        await fetchQuizScoresData(courseIds, appliedFilters);
        await fetchEngagementTrendsData(courseIds, timeRange, appliedFilters);
        await fetchStudentStatusCounts(courseIds, appliedFilters);

      } catch (error: any) {
        console.error("Failed to fetch teacher dashboard stats:", error);
        toast.error("Failed to load dashboard statistics.", { description: error.message });
      } finally {
        setLoading(false);
      }
    };

    fetchTeacherData();
  }, [userProfile, timeRange, appliedFilters]);

  const fetchStudentEngagementData = async (courseIds: string[], range: string, currentFilters?: FilterState) => {
    try {

      
      // Use the dynamic SQL function with filters
      const filterParams: any = {
        p_teacher_id: userProfile.id,
        p_time_range: range
      };
      
      if (currentFilters) {
        if (currentFilters.class !== 'all') filterParams.filter_class_id = currentFilters.class;
        if (currentFilters.school !== 'all') filterParams.filter_school_id = currentFilters.school;
        if (currentFilters.board !== 'all') filterParams.filter_board_id = currentFilters.board;
        if (currentFilters.project !== 'all') filterParams.filter_project_id = currentFilters.project;
        if (currentFilters.city !== 'all') filterParams.filter_city_id = currentFilters.city;
        if (currentFilters.region !== 'all') filterParams.filter_region_id = currentFilters.region;
        if (currentFilters.country !== 'all') filterParams.filter_country_id = currentFilters.country;
      }

      const { data, error } = await supabase.rpc('get_student_engagement_trends_with_filters', filterParams);



      if (error) throw error;

      if (!data || data.length === 0 || (data.length === 1 && data[0].period_label === 'No Activity')) {
        setStudentEngagementData([]);
        return;
      }

      // Transform the data to match the expected format
      const engagementData = data.map((item: any) => ({
        week: item.period_label,
        activeStudents: item.active_students,
        completionRate: item.completion_rate,
        timeSpent: item.time_spent
      }));

      // Check if all values are zero or empty
      const hasValidData = engagementData.some(item => 
        item.activeStudents > 0 || item.completionRate > 0 || item.timeSpent > 0
      );

      if (!hasValidData) {
        setStudentEngagementData([]);
        return;
      }

      setStudentEngagementData(engagementData);
    } catch (error) {
      console.error("Failed to fetch student engagement data:", error);
      setStudentEngagementData([]);
    }
  };

  const fetchCoursePerformanceData = async (courseIds: string[], currentFilters?: FilterState) => {
    try {

      
      // Use the dynamic SQL function with filters
      const filterParams: any = {
        p_teacher_id: userProfile.id
      };
      
      if (currentFilters) {
        if (currentFilters.class !== 'all') filterParams.filter_class_id = currentFilters.class;
        if (currentFilters.school !== 'all') filterParams.filter_school_id = currentFilters.school;
        if (currentFilters.board !== 'all') filterParams.filter_board_id = currentFilters.board;
        if (currentFilters.project !== 'all') filterParams.filter_project_id = currentFilters.project;
        if (currentFilters.city !== 'all') filterParams.filter_city_id = currentFilters.city;
        if (currentFilters.region !== 'all') filterParams.filter_region_id = currentFilters.region;
        if (currentFilters.country !== 'all') filterParams.filter_country_id = currentFilters.country;
      }

      const { data, error } = await supabase.rpc('get_course_performance_data_with_filters', filterParams);



      if (error) throw error;

      if (!data || data.length === 0) {
        setCoursePerformanceData([]);
        return;
      }

      // Transform the data to match the expected format
      const coursePerformance = data.map((item: any) => ({
        course: item.course_title,
        enrolled: item.total_students,
        completed: Math.round((item.completion_rate / 100) * item.total_students),
        inProgress: item.total_students - Math.round((item.completion_rate / 100) * item.total_students),
        avgRating: item.average_score
      }));

      // Check if all values are zero or empty
      const hasValidData = coursePerformance.some(item => 
        item.enrolled > 0 || item.completed > 0 || item.inProgress > 0
      );

      if (!hasValidData) {
        setCoursePerformanceData([]);
        return;
      }

      setCoursePerformanceData(coursePerformance);
    } catch (error) {
      console.error("Failed to fetch course performance data:", error);
      setCoursePerformanceData([]);
    }
  };

  const fetchStudentProgressData = async (courseIds: string[], currentFilters?: FilterState) => {
    try {
      // Use the filtered version of the function
      const filterParams: any = {
        p_teacher_id: userProfile.id
      };
      
      if (currentFilters) {
        if (currentFilters.class !== 'all') filterParams.filter_class_id = currentFilters.class;
        if (currentFilters.school !== 'all') filterParams.filter_school_id = currentFilters.school;
        if (currentFilters.board !== 'all') filterParams.filter_board_id = currentFilters.board;
        if (currentFilters.project !== 'all') filterParams.filter_project_id = currentFilters.project;
        if (currentFilters.city !== 'all') filterParams.filter_city_id = currentFilters.city;
        if (currentFilters.region !== 'all') filterParams.filter_region_id = currentFilters.region;
        if (currentFilters.country !== 'all') filterParams.filter_country_id = currentFilters.country;
      }

      const { data, error } = await supabase.rpc('get_student_progress_distribution_with_filters', filterParams);

      if (error) throw error;

      if (!data || data.length === 0) {
        setStudentProgressData([]);
        return;
      }

      const progressDistribution = data.map((item: any) => ({
        name: item.category_name,
        value: item.student_count,
        color: item.color_code
      }));

      // Check if all values are zero or empty
      const hasValidData = progressDistribution.some(item => item.value > 0);

      if (!hasValidData) {
        setStudentProgressData([]);
        return;
      }

      setStudentProgressData(progressDistribution);
    } catch (error) {
      console.error("Failed to fetch student progress data:", error);
      setStudentProgressData([]);
    }
  };

  const fetchCourseCompletionTrends = async (courseIds: string[], range: string, currentFilters?: FilterState) => {
    try {
      // Use the filtered version of the function
      const filterParams: any = {
        p_teacher_id: userProfile.id,
        p_time_range: range
      };
      
      if (currentFilters) {
        if (currentFilters.class !== 'all') filterParams.filter_class_id = currentFilters.class;
        if (currentFilters.school !== 'all') filterParams.filter_school_id = currentFilters.school;
        if (currentFilters.board !== 'all') filterParams.filter_board_id = currentFilters.board;
        if (currentFilters.project !== 'all') filterParams.filter_project_id = currentFilters.project;
        if (currentFilters.city !== 'all') filterParams.filter_city_id = currentFilters.city;
        if (currentFilters.region !== 'all') filterParams.filter_region_id = currentFilters.region;
        if (currentFilters.country !== 'all') filterParams.filter_country_id = currentFilters.country;
      }

      const { data, error } = await supabase.rpc('get_course_completion_trends_with_filters', filterParams);

      if (error) throw error;

      if (!data || data.length === 0) {
        setCourseCompletionTrends([]);
        return;
      }

      // Transform the data to match the expected format
      const trendsData = data.map((item: any) => ({
        month: item.month_label,
        ...item.course_data
      }));

      setCourseCompletionTrends(trendsData);
    } catch (error) {
      console.error("Failed to fetch course completion trends:", error);
      setCourseCompletionTrends([]);
    }
  };

  const fetchQuizScoresData = async (courseIds: string[], currentFilters?: FilterState) => {
    try {
      // Use the filtered version of the function
      const filterParams: any = {
        p_teacher_id: userProfile.id
      };
      
      if (currentFilters) {
        if (currentFilters.class !== 'all') filterParams.filter_class_id = currentFilters.class;
        if (currentFilters.school !== 'all') filterParams.filter_school_id = currentFilters.school;
        if (currentFilters.board !== 'all') filterParams.filter_board_id = currentFilters.board;
        if (currentFilters.project !== 'all') filterParams.filter_project_id = currentFilters.project;
        if (currentFilters.city !== 'all') filterParams.filter_city_id = currentFilters.city;
        if (currentFilters.region !== 'all') filterParams.filter_region_id = currentFilters.region;
        if (currentFilters.country !== 'all') filterParams.filter_country_id = currentFilters.country;
      }

      const { data, error } = await supabase.rpc('get_quiz_performance_data_with_filters', filterParams);

      if (error) throw error;

      if (!data || data.length === 0) {
        setQuizScoresData([]);
        return;
      }

      // Transform the data to match the expected format
      const quizData = data.map((item: any) => ({
        quiz: item.quiz_title,
        avgScore: item.avg_score,
        attempts: item.attempts_count,
        passRate: item.pass_rate
      }));

      setQuizScoresData(quizData);
    } catch (error) {
      console.error("Failed to fetch quiz scores data:", error);
      setQuizScoresData([]);
    }
  };

  const fetchEngagementTrendsData = async (courseIds: string[], range: string, currentFilters?: FilterState) => {
    try {
      // Use the filtered version of the function
      const filterParams: any = {
        p_teacher_id: userProfile.id,
        p_time_range: range
      };
      
      if (currentFilters) {
        if (currentFilters.class !== 'all') filterParams.filter_class_id = currentFilters.class;
        if (currentFilters.school !== 'all') filterParams.filter_school_id = currentFilters.school;
        if (currentFilters.board !== 'all') filterParams.filter_board_id = currentFilters.board;
        if (currentFilters.project !== 'all') filterParams.filter_project_id = currentFilters.project;
        if (currentFilters.city !== 'all') filterParams.filter_city_id = currentFilters.city;
        if (currentFilters.region !== 'all') filterParams.filter_region_id = currentFilters.region;
        if (currentFilters.country !== 'all') filterParams.filter_country_id = currentFilters.country;
      }

      const { data, error } = await supabase.rpc('get_engagement_trends_data_with_filters', filterParams);

      console.log('🔍 [DEBUG] get_engagement_trends_data_with_filters response:', { data, error });

      if (error) throw error;

      if (!data || data.length === 0) {
        console.log('🔍 [DEBUG] No engagement trends data found, setting empty array');
        setEngagementTrendsData([]);
        return;
      }

      // Transform the data to match the expected format
      const trendsData = data.map((item: any) => ({
        week: item.week_label,
        assignments: item.assignments_count,
        quizzes: item.quizzes_count,
      }));

      // Check if all values are zero or empty
      const hasValidData = trendsData.some(item => 
        item.assignments > 0 || item.quizzes > 0
      );

      if (!hasValidData) {
        console.log('🔍 [DEBUG] No valid engagement trends data found, setting empty array');
        setEngagementTrendsData([]);
        return;
      }

      console.log('🔍 [DEBUG] Transformed engagement trends data:', trendsData);
      setEngagementTrendsData(trendsData);
    } catch (error) {
      console.error("Failed to fetch engagement trends data:", error);
      setEngagementTrendsData([]);
    }
  };

  const fetchStudentStatusCounts = async (courseIds: string[], currentFilters?: FilterState) => {
    try {
      console.log('🔍 [DEBUG] fetchStudentStatusCounts called with:', { courseIds, teacherId: userProfile.id });
      
      // Use the filtered version of the function
      const filterParams: any = {
        p_teacher_id: userProfile.id
      };
      
      if (currentFilters) {
        if (currentFilters.class !== 'all') filterParams.filter_class_id = currentFilters.class;
        if (currentFilters.school !== 'all') filterParams.filter_school_id = currentFilters.school;
        if (currentFilters.board !== 'all') filterParams.filter_board_id = currentFilters.board;
        if (currentFilters.project !== 'all') filterParams.filter_project_id = currentFilters.project;
        if (currentFilters.city !== 'all') filterParams.filter_city_id = currentFilters.city;
        if (currentFilters.region !== 'all') filterParams.filter_region_id = currentFilters.region;
        if (currentFilters.country !== 'all') filterParams.filter_country_id = currentFilters.country;
      }

      const { data, error } = await supabase.rpc('get_student_status_counts_with_filters', filterParams);

      console.log('🔍 [DEBUG] get_student_status_counts_with_filters response:', { data, error });

      if (error) throw error;

      if (!data || data.length === 0) {
        console.log('🔍 [DEBUG] No student status counts found, using defaults');
        setStudentStatusCounts({
          total_students: 0,
          active_students: 0,
          behind_students: 0,
          excellent_students: 0,
          not_started_students: 0
        });
        return;
      }

      const statusCounts = data[0];
      console.log('🔍 [DEBUG] Student status counts:', statusCounts);
      setStudentStatusCounts(statusCounts);
    } catch (error) {
      console.error("Failed to fetch student status counts:", error);
      setStudentStatusCounts({
        total_students: 0,
        active_students: 0,
        behind_students: 0,
        excellent_students: 0,
        not_started_students: 0
      });
    }
  };

  const getInitials = (firstName?: string, lastName?: string) => {
    return `${firstName?.charAt(0) || ''}${lastName?.charAt(0) || ''}`.toUpperCase();
  };

  const MetricCard = ({ 
    title, 
    value, 
    icon: Icon, 
    color
  }: { 
    title: string; 
    value: string | number; 
    icon: any; 
    color: string; 
  }) => (
    <Card className="relative overflow-hidden transition-all duration-200 hover:shadow-lg bg-gradient-to-br from-card to-green-500/5 dark:bg-card">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className={`h-4 w-4 ${color}`} />
      </CardHeader>
      <CardContent>
        <div className="space-y-1">
            <div className="text-2xl font-bold">{typeof value === 'number' ? value.toLocaleString() : value}</div>
        </div>
      </CardContent>
    </Card>
  );



  return (
    <div className="space-y-6">
      {loading ? (
        <div className="min-h-screen flex items-center justify-center">
          <ContentLoader message="Loading dashboard..." />
        </div>
      ) : (
        <>
        {/* Premium Header Section */}
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-primary/5 rounded-3xl"></div>
          <div className="relative p-8 rounded-3xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-primary/10 to-primary/20 rounded-2xl flex items-center justify-center">
                  <GraduationCap className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-primary via-primary to-primary/80 bg-clip-text text-transparent" style={{ backgroundClip: 'text', WebkitBackgroundClip: 'text' }}>
                    Teacher Dashboard
                  </h1>
                  <p className="text-lg text-muted-foreground mt-2 leading-relaxed">
                    Welcome back, {userProfile?.first_name || 'Teacher'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Select value={timeRange} onValueChange={setTimeRange}>
                  <SelectTrigger className="w-40 h-9 rounded-xl bg-background border border-input shadow-sm hover:shadow-lg hover:shadow-primary/10 transition-all duration-300 hover:-translate-y-0.5">
                    <SelectValue placeholder="Time range" />
                  </SelectTrigger>
                  <SelectContent>
                        <SelectItem value="7days">Last 7 days</SelectItem>
                        <SelectItem value="30days">Last 30 days</SelectItem>
                    <SelectItem value="3months">Last 3 months</SelectItem>
                        <SelectItem value="6months">Last 6 months</SelectItem>
                        <SelectItem value="1year">Last 1 year</SelectItem>
                  </SelectContent>
                </Select>

                <Drawer>
                  <DrawerTrigger asChild>
                    <Button
                      variant="outline"
                      className="h-9 px-4 rounded-xl bg-background border border-input shadow-sm hover:shadow-lg hover:shadow-primary/10 transition-all duration-300 hover:-translate-y-0.5 hover:bg-accent/5 hover:text-foreground dark:hover:bg-gray-800"
                    >
                      <Filter className="h-4 w-4 mr-2" />
                      Filters
                    </Button>
                  </DrawerTrigger>
                  <DrawerContent>
                    <div className="mx-auto w-full max-w-4xl">
                      <DrawerHeader>
                        <div className="flex items-center justify-between">
                          <div>
                            <DrawerTitle>Filter Dashboard Data</DrawerTitle>
                            <DrawerDescription>Apply filters to refine the data shown on the dashboard.</DrawerDescription>
                          </div>
                          <DrawerClose asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900/20 dark:hover:text-red-400">
                              <X className="h-4 w-4" />
                              <span className="sr-only">Close</span>
                            </Button>
                          </DrawerClose>
                        </div>
                      </DrawerHeader>
                      <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {/* Country */}
                        <div className="space-y-2">
                          <Label htmlFor="country">Country</Label>
                          <Select 
                            value={filters.country} 
                            onValueChange={(value) => handleFilterChange('country', value)}
                            disabled={filterLoading.countries}
                          >
                            <SelectTrigger id="country">
                              <SelectValue placeholder={filterLoading.countries ? "Loading..." : "Select country"} />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">All Countries</SelectItem>
                              {countries.map((country) => (
                                <SelectItem key={country.id} value={country.id}>
                                  {country.name} ({country.code})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Region */}
                        <div className="space-y-2">
                          <Label htmlFor="region">Region</Label>
                          <Select 
                            value={filters.region} 
                            onValueChange={(value) => handleFilterChange('region', value)}
                            disabled={filterLoading.regions}
                          >
                            <SelectTrigger id="region">
                              <SelectValue placeholder={filterLoading.regions ? "Loading..." : "Select region"} />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">All Regions</SelectItem>
                              {regions.map((region) => (
                                <SelectItem key={region.id} value={region.id}>
                                  {region.name} ({region.code})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {/* City */}
                        <div className="space-y-2">
                          <Label htmlFor="city">City</Label>
                          <Select 
                            value={filters.city} 
                            onValueChange={(value) => handleFilterChange('city', value)}
                            disabled={filterLoading.cities}
                          >
                            <SelectTrigger id="city">
                              <SelectValue placeholder={filterLoading.cities ? "Loading..." : "Select city"} />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">All Cities</SelectItem>
                              {cities.map((city) => (
                                <SelectItem key={city.id} value={city.id}>
                                  {city.name} ({city.code})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Project */}
                        <div className="space-y-2">
                          <Label htmlFor="project">Project</Label>
                          <Select 
                            value={filters.project} 
                            onValueChange={(value) => handleFilterChange('project', value)}
                            disabled={filterLoading.projects}
                          >
                            <SelectTrigger id="project">
                              <SelectValue placeholder={filterLoading.projects ? "Loading..." : "Select project"} />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">All Projects</SelectItem>
                              {projects.map((project) => (
                                <SelectItem key={project.id} value={project.id}>
                                  {project.name} ({project.code})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Board */}
                        <div className="space-y-2">
                          <Label htmlFor="board">Board</Label>
                          <Select 
                            value={filters.board} 
                            onValueChange={(value) => handleFilterChange('board', value)}
                            disabled={filterLoading.boards}
                          >
                            <SelectTrigger id="board">
                              <SelectValue placeholder={filterLoading.boards ? "Loading..." : "Select board"} />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">All Boards</SelectItem>
                              {boards.map((board) => (
                                <SelectItem key={board.id} value={board.id}>
                                  {board.name} ({board.code})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Schools */}
                        <div className="space-y-2">
                          <Label htmlFor="schools">Schools</Label>
                          <Select 
                            value={filters.school} 
                            onValueChange={(value) => handleFilterChange('school', value)}
                            disabled={filterLoading.schools}
                          >
                            <SelectTrigger id="schools">
                              <SelectValue placeholder={filterLoading.schools ? "Loading..." : "Select school"} />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">All Schools</SelectItem>
                              {schools.map((school) => (
                                <SelectItem key={school.id} value={school.id}>
                                  {school.name} ({school.school_type})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Class */}
                        <div className="space-y-2">
                          <Label htmlFor="class">Class</Label>
                          <Select 
                            value={filters.class} 
                            onValueChange={(value) => handleFilterChange('class', value)}
                            disabled={filterLoading.classes}
                          >
                            <SelectTrigger id="class">
                              <SelectValue placeholder={filterLoading.classes ? "Loading..." : "Select class"} />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">All Classes</SelectItem>
                              {classes.map((classItem) => (
                                <SelectItem key={classItem.id} value={classItem.id}>
                                  {classItem.name} (Grade {classItem.grade})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <DrawerFooter>
                        <Button 
                          onClick={applyFilters}
                          className="w-full transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/20"
                        >
                          Apply Filters
                        </Button>
                        <DrawerClose asChild>
                          <Button 
                            variant="outline" 
                            onClick={clearAllFilters}
                            className="w-full transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md hover:shadow-primary/10 hover:bg-primary/5 hover:border-primary/30 hover:text-primary"
                          >
                            Clear All
                          </Button>
                        </DrawerClose>
                      </DrawerFooter>
                    </div>
                  </DrawerContent>
                </Drawer>
              </div>
            </div>
          </div>
        </div>

        {/* Metric Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <MetricCard
            title="Total Students"
            value={stats?.totalStudents || 0}
            icon={Users}
            color="#3B82F6"
          />
          <MetricCard
            title="Published Courses"
            value={stats?.publishedCourses || 0}
            icon={BookOpen}
            color="#10B981"
          />
          <MetricCard
            title="Active Courses"
            value={stats?.activeCourses || 0}
            icon={Activity}
            color="#F59E0B"
          />
          <MetricCard
            title="Avg Engagement"
            value={`${stats?.avgEngagement || 0}%`}
            icon={TrendingUp}
            color="#8B5CF6"
          />
        </div>

        {/* Tabs Section */}
        <div className="relative">
          <div className="relative">
            <Tabs defaultValue="overview" className="space-y-6">
              <TabsList className="grid w-full grid-cols-2 md:grid-cols-3">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="performance">Performance</TabsTrigger>
                <TabsTrigger value="feedback">Reports</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <TrendingUp className="h-5 w-5" />
                        Student Engagement Trends
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="h-[300px]">
                        {studentEngagementData.length > 0 ? (
                          <ChartContainer config={chartConfig} className="w-full h-full">
                            <ResponsiveContainer width="100%" height="100%">
                              <AreaChart data={studentEngagementData}>
                                <defs>
                                  <linearGradient id="colorEngagement" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3}/>
                                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                                  </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="week" />
                                <YAxis />
                                <ChartTooltip content={<ChartTooltipContent />} />
                                <Area 
                                  type="monotone" 
                                  dataKey="activeStudents" 
                                  stroke="#3B82F6" 
                                  fillOpacity={1} 
                                  fill="url(#colorEngagement)"
                                  name="Active Students"
                                />
                                <Line 
                                  type="monotone" 
                                  dataKey="completionRate" 
                                  stroke="#10B981" 
                                  strokeWidth={2}
                                  name="Completion Rate %"
                                />
                              </AreaChart>
                            </ResponsiveContainer>
                          </ChartContainer>
                        ) : (
                          <div className="flex items-center justify-center h-full">
                            <p className="text-muted-foreground">No data to display for this period.</p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <PieChartIcon className="h-5 w-5" />
                        Student Progress Distribution
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="h-[300px]">
                        {studentProgressData.length > 0 ? (
                          <ChartContainer config={chartConfig} className="w-full h-full">
                            <ResponsiveContainer width="100%" height="100%">
                              <PieChart>
                                <Pie
                                  data={studentProgressData}
                                  cx="50%"
                                  cy="50%"
                                  labelLine={false}
                                  label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                                  outerRadius={100}
                                  fill="#8884d8"
                                  dataKey="value"
                                >
                                  {studentProgressData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                  ))}
                                </Pie>
                                <ChartTooltip />
                              </PieChart>
                            </ResponsiveContainer>
                          </ChartContainer>
                        ) : (
                          <div className="flex items-center justify-center h-full">
                            <p className="text-muted-foreground">No data to display.</p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="performance" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Course Performance Overview</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[400px]">
                      {coursePerformanceData.length > 0 ? (
                      <ChartContainer config={chartConfig} className="w-full h-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={coursePerformanceData} margin={{ top: 20, right: 30, left: 20, bottom: 80 }}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis 
                              dataKey="course" 
                              angle={-45}
                              textAnchor="end"
                              height={80}
                              interval={0}
                            />
                            <YAxis />
                            <ChartTooltip content={<ChartTooltipContent />} />
                            <Bar dataKey="enrolled" fill="#3B82F6" name="Enrolled" />
                            <Bar dataKey="completed" fill="#10B981" name="Completed" />
                            <Bar dataKey="inProgress" fill="#F59E0B" name="In Progress" />
                            <Legend />
                          </BarChart>
                        </ResponsiveContainer>
                      </ChartContainer>
                      ) : (
                        <div className="flex items-center justify-center h-full">
                          <p className="text-muted-foreground">No course performance data to display.</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="feedback" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BarChart3 className="h-5 w-5" />
                      Engagement Trends
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Track student engagement across different content types
                    </p>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[400px]">
                      {engagementTrendsData.length > 0 ? (
                      <ChartContainer config={chartConfig} className="w-full h-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={engagementTrendsData}>
                            <defs>
                              <linearGradient id="colorAssignments" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#10B981" stopOpacity={0.8}/>
                                <stop offset="95%" stopColor="#10B981" stopOpacity={0.1}/>
                              </linearGradient>
                              <linearGradient id="colorQuizzes" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.8}/>
                                <stop offset="95%" stopColor="#F59E0B" stopOpacity={0.1}/>
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="week" />
                            <YAxis />
                            <ChartTooltip content={<ChartTooltipContent />} />
                            <Area 
                              type="monotone" 
                              dataKey="assignments" 
                              stackId="1"
                              stroke="#10B981" 
                              fill="url(#colorAssignments)"
                              name="Assignments"
                            />
                            <Area 
                              type="monotone" 
                              dataKey="quizzes" 
                              stackId="1"
                              stroke="#F59E0B" 
                              fill="url(#colorQuizzes)"
                              name="Quizzes"
                            />
                            <Legend />
                          </AreaChart>
                        </ResponsiveContainer>
                      </ChartContainer>
                      ) : (
                        <div className="flex items-center justify-center h-full">
                          <p className="text-muted-foreground">No engagement trends data to display for this period.</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>


              </TabsContent>
            </Tabs>
          </div>
        </div>
        </>
      )}
    </div>
  );
};
