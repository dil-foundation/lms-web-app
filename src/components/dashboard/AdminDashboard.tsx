
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Legend, AreaChart, Area } from 'recharts';
import { 
  Users, 
  Shield, 
  BookOpen, 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  GraduationCap, 
  Award, 
  Clock, 
  Eye, 
  MessageSquare, 
  FileText, 
  Target, 
  Globe, 
  AlertCircle,
  CheckCircle,
  Calendar,
  Settings,
  Filter,
  X,
  Building2,
  UserCheck,
  Briefcase,
  ClipboardCheck,
  ExternalLink,
} from 'lucide-react';
import { ContentLoader } from '@/components/ContentLoader';
import { Drawer, DrawerClose, DrawerContent, DrawerDescription, DrawerFooter, DrawerHeader, DrawerTitle, DrawerTrigger } from '@/components/ui/drawer';
import { Label } from '@/components/ui/label';

interface AdminDashboardProps {
  userProfile: any;
}

interface DashboardStats {
  totalUsers: number;
  totalTeachers: number;
  totalStudents: number;
  totalAdmins: number;
  totalCourses: number;
  activeCourses: number;
  completedAssignments: number;
  activeDiscussions: number;
  avgEngagement: number;
  newUsersThisMonth: number;
  courseCompletionRate: number;
  totalLogins: number;
  // Add user activity metrics
  activeUsersPercentage: number;
  courseEngagementPercentage: number;
  discussionParticipationPercentage: number;
  assignmentCompletionPercentage: number;
}

interface UserGrowthData {
  month: string;
  users: number;
  teachers: number;
  students: number;
  admins: number;
  active: number;
}

interface PlatformStatsData {
  name: string;
  value: number;
  color: string;
}

interface CourseAnalyticsData {
  course: string;
  enrolled: number;
  completed: number;
  progress: number;
  rating: number;
}

interface EngagementData {
  day: string;
  activeUsers: number;
  courses: number;
  discussions: number;
}

const chartConfig = {
  users: { label: 'Total Users', color: '#3B82F6' },
  teachers: { label: 'Teachers', color: '#10B981' },
  students: { label: 'Students', color: '#8B5CF6' },
  admins: { label: 'Admins', color: '#F59E0B' },
  active: { label: 'Active Users', color: '#EF4444' },
  enrolled: { label: 'Enrolled', color: '#3B82F6' },
  completed: { label: 'Completed', color: '#10B981' },
  progress: { label: 'Progress %', color: '#8B5CF6' },
  rating: { label: 'Rating', color: '#F59E0B' },
  activeUsers: { label: 'Active Users', color: '#3B82F6' },
  timeSpent: { label: 'Time Spent (min)', color: '#10B981' },
  courses: { label: 'Courses Accessed', color: '#8B5CF6' },
  discussions: { label: 'Discussions', color: '#F59E0B' },
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

interface Grade {
  id: string;
  name: string;
  code: string;
}

interface FilterState {
  country: string;
  region: string;
  city: string;
  project: string;
  board: string;
  school: string;
  grade: string;
  class: string;
}

export const AdminDashboard = ({ userProfile }: AdminDashboardProps) => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [userGrowthData, setUserGrowthData] = useState<UserGrowthData[]>([]);
  const [platformStatsData, setPlatformStatsData] = useState<PlatformStatsData[]>([]);
  const [courseAnalyticsData, setCourseAnalyticsData] = useState<CourseAnalyticsData[]>([]);
  const [engagementData, setEngagementData] = useState<EngagementData[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('30days');

  // Filter data states
  const [countries, setCountries] = useState<Country[]>([]);
  const [regions, setRegions] = useState<Region[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [boards, setBoards] = useState<Board[]>([]);
  const [schools, setSchools] = useState<School[]>([]);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);

  // Filter loading states
  const [filterLoading, setFilterLoading] = useState({
    countries: false,
    regions: false,
    cities: false,
    projects: false,
    boards: false,
    schools: false,
    grades: false,
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
    grade: 'all',
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
    grade: 'all',
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

  const fetchGrades = async () => {
    setFilterLoading(prev => ({ ...prev, grades: true }));
    try {
      // Static grades 1-12 as per classes table schema
      const staticGrades: Grade[] = [
        { id: '1', name: 'Grade 1', code: 'G1' },
        { id: '2', name: 'Grade 2', code: 'G2' },
        { id: '3', name: 'Grade 3', code: 'G3' },
        { id: '4', name: 'Grade 4', code: 'G4' },
        { id: '5', name: 'Grade 5', code: 'G5' },
        { id: '6', name: 'Grade 6', code: 'G6' },
        { id: '7', name: 'Grade 7', code: 'G7' },
        { id: '8', name: 'Grade 8', code: 'G8' },
        { id: '9', name: 'Grade 9', code: 'G9' },
        { id: '10', name: 'Grade 10', code: 'G10' },
        { id: '11', name: 'Grade 11', code: 'G11' },
        { id: '12', name: 'Grade 12', code: 'G12' },
      ];
      
      setGrades(staticGrades);
    } catch (error) {
      console.error('Failed to load grades:', error);
      toast.error('Failed to load grades');
    } finally {
      setFilterLoading(prev => ({ ...prev, grades: false }));
    }
  };

  const fetchClasses = async (schoolId?: string, boardId?: string, gradeId?: string) => {
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
      if (gradeId && gradeId !== 'all') {
        query = query.eq('grade', gradeId);
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
          newFilters.grade = 'all';
          newFilters.class = 'all';
          break;
        case 'region':
          newFilters.city = 'all';
          newFilters.project = 'all';
          newFilters.board = 'all';
          newFilters.school = 'all';
          newFilters.grade = 'all';
          newFilters.class = 'all';
          break;
        case 'city':
          newFilters.project = 'all';
          newFilters.board = 'all';
          newFilters.school = 'all';
          newFilters.grade = 'all';
          newFilters.class = 'all';
          break;
        case 'project':
          newFilters.board = 'all';
          newFilters.school = 'all';
          newFilters.grade = 'all';
          newFilters.class = 'all';
          break;
        case 'board':
          newFilters.school = 'all';
          newFilters.grade = 'all';
          newFilters.class = 'all';
          break;
        case 'school':
          newFilters.grade = 'all';
          newFilters.class = 'all';
          break;
        case 'grade':
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
        fetchGrades();
        fetchClasses(undefined, undefined, filters.grade !== 'all' ? filters.grade : undefined);
        break;
      case 'region':
        fetchCities(filters.country !== 'all' ? filters.country : undefined, value !== 'all' ? value : undefined);
        fetchProjects(filters.country !== 'all' ? filters.country : undefined, value !== 'all' ? value : undefined);
        fetchBoards(filters.country !== 'all' ? filters.country : undefined, value !== 'all' ? value : undefined);
        fetchSchools(filters.country !== 'all' ? filters.country : undefined, value !== 'all' ? value : undefined);
        fetchGrades();
        fetchClasses(undefined, undefined, filters.grade !== 'all' ? filters.grade : undefined);
        break;
      case 'city':
        fetchProjects(filters.country !== 'all' ? filters.country : undefined, filters.region !== 'all' ? filters.region : undefined, value !== 'all' ? value : undefined);
        fetchBoards(filters.country !== 'all' ? filters.country : undefined, filters.region !== 'all' ? filters.region : undefined, value !== 'all' ? value : undefined);
        fetchSchools(filters.country !== 'all' ? filters.country : undefined, filters.region !== 'all' ? filters.region : undefined, value !== 'all' ? value : undefined);
        fetchGrades();
        fetchClasses(undefined, undefined, filters.grade !== 'all' ? filters.grade : undefined);
        break;
      case 'project':
        fetchBoards(filters.country !== 'all' ? filters.country : undefined, filters.region !== 'all' ? filters.region : undefined, filters.city !== 'all' ? filters.city : undefined, value !== 'all' ? value : undefined);
        fetchSchools(filters.country !== 'all' ? filters.country : undefined, filters.region !== 'all' ? filters.region : undefined, filters.city !== 'all' ? filters.city : undefined, value !== 'all' ? value : undefined);
        fetchGrades();
        fetchClasses(undefined, undefined, filters.grade !== 'all' ? filters.grade : undefined);
        break;
      case 'board':
        fetchSchools(filters.country !== 'all' ? filters.country : undefined, filters.region !== 'all' ? filters.region : undefined, filters.city !== 'all' ? filters.city : undefined, filters.project !== 'all' ? filters.project : undefined, value !== 'all' ? value : undefined);
        fetchGrades();
        fetchClasses(undefined, value !== 'all' ? value : undefined, filters.grade !== 'all' ? filters.grade : undefined);
        break;
      case 'school':
        fetchGrades();
        fetchClasses(value !== 'all' ? value : undefined, filters.board !== 'all' ? filters.board : undefined, filters.grade !== 'all' ? filters.grade : undefined);
        break;
      case 'grade':
        fetchClasses(filters.school !== 'all' ? filters.school : undefined, filters.board !== 'all' ? filters.board : undefined, value !== 'all' ? value : undefined);
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
      grade: 'all',
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
    fetchGrades();
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
    fetchGrades();
    fetchClasses();
  }, []);

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      try {
        // Prepare filter parameters for the new function
        const filterParams: any = { time_range: timeRange };
        
        // Add filter parameters if they are not 'all'
        if (appliedFilters.country !== 'all') filterParams.filter_country_id = appliedFilters.country;
        if (appliedFilters.region !== 'all') filterParams.filter_region_id = appliedFilters.region;
        if (appliedFilters.city !== 'all') filterParams.filter_city_id = appliedFilters.city;
        if (appliedFilters.project !== 'all') filterParams.filter_project_id = appliedFilters.project;
        if (appliedFilters.board !== 'all') filterParams.filter_board_id = appliedFilters.board;
        if (appliedFilters.school !== 'all') filterParams.filter_school_id = appliedFilters.school;
        if (appliedFilters.grade !== 'all') filterParams.filter_grade = appliedFilters.grade;
        if (appliedFilters.class !== 'all') filterParams.filter_class_id = appliedFilters.class;

        const { data, error } = await supabase.rpc('get_admin_dashboard_stats_with_filters', filterParams);

        if (error) throw error;
        if (!data) throw new Error("No data returned from stats function.");

        // The RPC returns a single object in an array
        const statsData = data[0];

        const baseStats = {
          totalUsers: statsData.total_users,
          totalTeachers: statsData.total_teachers,
          totalStudents: statsData.total_students,
          totalAdmins: statsData.total_admins,
          totalCourses: statsData.total_courses,
          activeCourses: statsData.active_courses,
          completedAssignments: statsData.completed_assignments,
          activeDiscussions: statsData.active_discussions,
          avgEngagement: statsData.avg_engagement,
          newUsersThisMonth: statsData.new_users_this_month,
          courseCompletionRate: statsData.course_completion_rate,
          totalLogins: statsData.total_logins,
          activeUsersPercentage: statsData.active_users_percentage,
          courseEngagementPercentage: statsData.course_engagement_percentage,
          discussionParticipationPercentage: statsData.discussion_participation_percentage,
          assignmentCompletionPercentage: statsData.assignment_completion_percentage,
        };

        setStats(baseStats);

        // Fetch chart data with filters applied
        await fetchUserGrowthData(timeRange, appliedFilters);
        await fetchPlatformStatsData(appliedFilters);
        await fetchCourseAnalyticsData(appliedFilters);
        await fetchEngagementData(timeRange, appliedFilters);

      } catch (error: any) {
        console.error("Failed to fetch dashboard stats:", error);
        toast.error("Failed to load dashboard statistics.", { description: error.message });
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [timeRange, appliedFilters]);

  const fetchUserGrowthData = async (range: string, currentFilters?: FilterState) => {
    try {
      // Build filter parameters for the database function
      const filterParams: any = { p_time_range: range };
      
      if (currentFilters) {
        if (currentFilters.class !== 'all') filterParams.filter_class_id = currentFilters.class;
        if (currentFilters.school !== 'all') filterParams.filter_school_id = currentFilters.school;
        if (currentFilters.grade !== 'all') filterParams.filter_grade = currentFilters.grade;
        if (currentFilters.board !== 'all') filterParams.filter_board_id = currentFilters.board;
        if (currentFilters.project !== 'all') filterParams.filter_project_id = currentFilters.project;
        if (currentFilters.city !== 'all') filterParams.filter_city_id = currentFilters.city;
        if (currentFilters.region !== 'all') filterParams.filter_region_id = currentFilters.region;
        if (currentFilters.country !== 'all') filterParams.filter_country_id = currentFilters.country;
      }
      
      // Use the database function with filters
      const { data, error } = await supabase.rpc('get_admin_user_growth_trends_with_filters', filterParams);

      if (error) throw error;

      if (!data || data.length === 0) {
        setUserGrowthData([]);
        return;
      }

      // Transform the data to match the expected format
      const userGrowthData: UserGrowthData[] = data.map((item: any) => ({
        month: item.period_label,
        users: item.total_users,
        teachers: item.teachers,
        students: item.students,
        admins: item.admins,
        active: item.active_users,
      }));

      setUserGrowthData(userGrowthData);
    } catch (error) {
      console.error("Failed to fetch user growth data:", error);
      setUserGrowthData([]);
    }
  };

  const fetchPlatformStatsData = async (currentFilters?: FilterState) => {
    try {
      // Build filter parameters for the database function
      const filterParams: any = {};
      
      if (currentFilters) {
        if (currentFilters.class !== 'all') filterParams.filter_class_id = currentFilters.class;
        if (currentFilters.school !== 'all') filterParams.filter_school_id = currentFilters.school;
        if (currentFilters.grade !== 'all') filterParams.filter_grade = currentFilters.grade;
        if (currentFilters.board !== 'all') filterParams.filter_board_id = currentFilters.board;
        if (currentFilters.project !== 'all') filterParams.filter_project_id = currentFilters.project;
        if (currentFilters.city !== 'all') filterParams.filter_city_id = currentFilters.city;
        if (currentFilters.region !== 'all') filterParams.filter_region_id = currentFilters.region;
        if (currentFilters.country !== 'all') filterParams.filter_country_id = currentFilters.country;
      }
      
      // Use the database function with filters
      const { data, error } = await supabase.rpc('get_admin_platform_stats_with_filters', filterParams);

      if (error) throw error;

      if (!data || data.length === 0) {
        setPlatformStatsData([]);
        return;
      }

      // Transform the data to match the expected format
      const platformStats: PlatformStatsData[] = data.map((item: any) => ({
        name: item.stat_name,
        value: item.stat_value,
        color: item.stat_color,
      }));

      // Filter out zero values and ensure we have at least one non-zero value
      const nonZeroStats = platformStats.filter(stat => stat.value > 0);
      
      setPlatformStatsData(nonZeroStats);
    } catch (error) {
      console.error("Failed to fetch platform stats data:", error);
      setPlatformStatsData([]);
    }
  };

  const fetchCourseAnalyticsData = async (currentFilters?: FilterState) => {
    try {
      console.log('🔍 [DEBUG] fetchCourseAnalyticsData called with filters:', currentFilters);
      
      // Build filter parameters for the database function
      const filterParams: any = {};
      
      if (currentFilters) {
        if (currentFilters.class !== 'all') filterParams.filter_class_id = currentFilters.class;
        if (currentFilters.school !== 'all') filterParams.filter_school_id = currentFilters.school;
        if (currentFilters.grade !== 'all') filterParams.filter_grade = currentFilters.grade;
        if (currentFilters.board !== 'all') filterParams.filter_board_id = currentFilters.board;
        if (currentFilters.project !== 'all') filterParams.filter_project_id = currentFilters.project;
        if (currentFilters.city !== 'all') filterParams.filter_city_id = currentFilters.city;
        if (currentFilters.region !== 'all') filterParams.filter_region_id = currentFilters.region;
        if (currentFilters.country !== 'all') filterParams.filter_country_id = currentFilters.country;
      }
      
      // Use the database function with filters
      const { data, error } = await supabase.rpc('get_admin_course_analytics_with_filters', filterParams);

      console.log('🔍 [DEBUG] get_admin_course_analytics_with_filters response:', { data, error });

      if (error) throw error;

      if (!data || data.length === 0) {
        console.log('🔍 [DEBUG] No course analytics data found');
        setCourseAnalyticsData([]);
        return;
      }

      // Transform the data to match the expected format
      const courseAnalytics: CourseAnalyticsData[] = data.map((item: any) => ({
        course: item.course_title,
        enrolled: item.enrolled_students,
        completed: item.completed_students,
        progress: item.completion_rate,
        rating: item.average_score || 0,
      }));

      // Check if all values are zero or empty
      const hasValidData = courseAnalytics.some(item => 
        item.enrolled > 0 || item.completed > 0 || item.progress > 0
      );

      if (!hasValidData) {
        console.log('🔍 [DEBUG] No valid course analytics data found');
        setCourseAnalyticsData([]);
        return;
      }

      console.log('🔍 [DEBUG] Transformed course analytics:', courseAnalytics);
      setCourseAnalyticsData(courseAnalytics);
    } catch (error) {
      console.error("Failed to fetch course analytics data:", error);
      setCourseAnalyticsData([]);
    }
  };

  const fetchEngagementData = async (range: string, currentFilters?: FilterState) => {
    try {
      // Build filter parameters for the database function
      const filterParams: any = { p_time_range: range };
      
      if (currentFilters) {
        if (currentFilters.class !== 'all') filterParams.filter_class_id = currentFilters.class;
        if (currentFilters.school !== 'all') filterParams.filter_school_id = currentFilters.school;
        if (currentFilters.grade !== 'all') filterParams.filter_grade = currentFilters.grade;
        if (currentFilters.board !== 'all') filterParams.filter_board_id = currentFilters.board;
        if (currentFilters.project !== 'all') filterParams.filter_project_id = currentFilters.project;
        if (currentFilters.city !== 'all') filterParams.filter_city_id = currentFilters.city;
        if (currentFilters.region !== 'all') filterParams.filter_region_id = currentFilters.region;
        if (currentFilters.country !== 'all') filterParams.filter_country_id = currentFilters.country;
      }
      
      const { data, error } = await supabase.rpc('get_admin_engagement_trends_data_with_filters', filterParams);

      if (error) throw error;
      
      const formattedData = data.map((item: any) => ({
        day: item.period_label,
        activeUsers: item.active_users,
        courses: item.courses_accessed,
        discussions: item.discussions,
      }));

      // For engagement trends, we should show the chart even if all values are 0
      // because it provides context about the time periods, even if there's no activity
      // The main engagement rate metric shows overall engagement, while this shows trends

      setEngagementData(formattedData);
    } catch (error: any) {
      console.error("Failed to fetch engagement data:", error);
      toast.error("Failed to load engagement data.", { description: error.message });
      setEngagementData([]);
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
          <Card className="bg-gradient-to-br from-card to-green-500/5 dark:bg-card">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{typeof value === 'number' ? value.toLocaleString() : value}</div>
        <p className="text-xs text-muted-foreground">
          {title === 'Total Users' && 'Registered users'}
          {title === 'Published Courses' && 'Active courses'}
          {title === 'Engagement Rate' && 'Average engagement'}
          {title === 'Course Completion' && 'Completion rate'}
          {title === 'New Users' && 'This month'}
          {title === 'Total Logins' && 'Platform logins'}
        </p>
      </CardContent>
    </Card>
  );

  const isEngagementDataEmpty = engagementData.length === 0;

  // Helper functions to check if data has meaningful values
  const hasUserGrowthData = userGrowthData.length > 0 && userGrowthData.some(item => 
    item.users > 0 || item.teachers > 0 || item.students > 0 || item.admins > 0 || item.active > 0
  );

  const hasPlatformStatsData = platformStatsData.length > 0 && platformStatsData.some(item => item.value > 0);

  const hasEngagementData = engagementData.length > 0 && engagementData.some(item => 
    item.activeUsers > 0 || item.courses > 0 || item.discussions > 0
  );

  const hasCourseAnalyticsData = courseAnalyticsData.length > 0 && courseAnalyticsData.some(item => 
    item.enrolled > 0 || item.completed > 0 || item.progress > 0
  );

  return (
    <div className="space-y-8">
      {loading ? (
        <div className="min-h-screen flex items-center justify-center">
          <ContentLoader message="Loading dashboard..." />
        </div>
      ) : (
        <>
          {/* Premium Header Section */}
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-primary/5 rounded-3xl"></div>
            <div className="relative p-4 sm:p-6 lg:p-8 rounded-3xl">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                <div className="flex items-center gap-3">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-primary/10 to-primary/20 rounded-2xl flex items-center justify-center">
                  <Shield className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
                </div>
          <div>
                  <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight bg-gradient-to-r from-primary via-primary to-primary/80 bg-clip-text text-transparent">
                    Admin Dashboard
                  </h1>
                  <p className="text-sm sm:text-base lg:text-lg text-muted-foreground font-light">
                    Welcome back, {userProfile?.first_name || 'Administrator'}
                  </p>
                  </div>
                </div>
                
                {/* Filter Controls - Matching Reports Page Style */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 w-full sm:w-auto">
                  <Select value={timeRange} onValueChange={setTimeRange}>
                    <SelectTrigger className="w-full sm:w-48 rounded-xl h-9">
                      <SelectValue placeholder="Select time range" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="7days">Last 7 days</SelectItem>
                      <SelectItem value="30days">Last 30 days</SelectItem>
                      <SelectItem value="3months">Last 3 months</SelectItem>
                      <SelectItem value="6months">Last 6 months</SelectItem>
                      <SelectItem value="1year">Last year</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  <Drawer>
                    <DrawerTrigger asChild>
                      <Button 
                        variant="outline"
                        className="h-9 px-4 rounded-xl bg-background border border-input shadow-sm hover:shadow-lg hover:shadow-primary/10 transition-all duration-300 hover:-translate-y-0.5 hover:bg-accent/5 hover:text-foreground dark:hover:bg-gray-800 w-full sm:w-auto"
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

                          {/* Grade */}
                          <div className="space-y-2">
                            <Label htmlFor="grade">Grade</Label>
                            <Select 
                              value={filters.grade} 
                              onValueChange={(value) => handleFilterChange('grade', value)}
                              disabled={filterLoading.grades}
                            >
                              <SelectTrigger id="grade">
                                <SelectValue placeholder={filterLoading.grades ? "Loading..." : "Select grade"} />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="all">All Grades</SelectItem>
                                {grades.map((grade) => (
                                  <SelectItem key={grade.id} value={grade.id}>
                                    {grade.name}
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

          {/* Stats Grid - Clean Design */}
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        <MetricCard
          title="Total Users"
          value={stats?.totalUsers ?? 0}
          icon={Users}
          color="text-[#1582B4]"
        />
        <MetricCard
              title="Published Courses"
          value={stats?.activeCourses ?? 0}
          icon={BookOpen}
          color="text-green-500"
        />
        <MetricCard
          title="Engagement Rate"
          value={`${stats?.avgEngagement ?? 0}%`}
          icon={Activity}
          color="text-purple-500"
        />
        <MetricCard
          title="Course Completion"
          value={`${stats?.courseCompletionRate ?? 0}%`}
          icon={Award}
          color="text-orange-500"
        />
        <MetricCard
          title="New Users"
          value={stats?.newUsersThisMonth ?? 0}
          icon={TrendingUp}
          color="text-cyan-500"
        />
        <MetricCard
          title="Total Logins"
          value={stats?.totalLogins ?? 0}
          icon={Eye}
          color="text-indigo-500"
        />
      </div>

      {/* Charts and Analytics */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 grid-rows-3 sm:grid-cols-5 sm:grid-rows-1 gap-1 h-auto p-1">
          <TabsTrigger value="overview" className="text-xs sm:text-sm">Overview</TabsTrigger>
          <TabsTrigger value="users" className="text-xs sm:text-sm">Users</TabsTrigger>
          <TabsTrigger value="courses" className="text-xs sm:text-sm">Courses</TabsTrigger>
          <TabsTrigger value="engagement" className="text-xs sm:text-sm">Engagement</TabsTrigger>
          <TabsTrigger value="previews" className="text-xs sm:text-sm">Dashboard Previews</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  User Growth Trends
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  {hasUserGrowthData ? (
                  <ChartContainer config={chartConfig} className="w-full h-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={userGrowthData}>
                        <defs>
                          <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" />
                        <YAxis />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Area 
                          type="monotone" 
                          dataKey="users" 
                          stroke="#3B82F6" 
                          fillOpacity={1} 
                          fill="url(#colorUsers)"
                          name="Total Users"
                        />
                        <Line 
                          type="monotone" 
                          dataKey="active" 
                          stroke="#10B981" 
                          strokeWidth={2}
                          name="Active Users"
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
                  <Globe className="h-5 w-5" />
                  Platform Distribution
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  {hasPlatformStatsData ? (
                  <ChartContainer config={chartConfig} className="w-full h-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={platformStatsData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                          outerRadius={100}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {platformStatsData.map((entry, index) => (
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

        <TabsContent value="users" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>User Role Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  {hasUserGrowthData ? (
                  <ChartContainer config={chartConfig} className="w-full h-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={userGrowthData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" />
                        <YAxis />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Bar dataKey="students" fill="#8B5CF6" name="Students" />
                        <Bar dataKey="teachers" fill="#10B981" name="Teachers" />
                        <Bar dataKey="admins" fill="#F59E0B" name="Admins" />
                      </BarChart>
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
                <CardTitle>User Activity Overview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                        <span className="text-sm font-medium w-32">Active Users</span>
                    <div className="flex items-center gap-2">
                          <div className="w-24 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-green-500 transition-all duration-300 ease-in-out"
                              style={{ width: `${stats?.activeUsersPercentage ?? 0}%` }}
                            />
                          </div>
                          <span className="text-sm w-8 text-right">{stats?.activeUsersPercentage ?? 0}%</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                        <span className="text-sm font-medium w-32">Course Engagement</span>
                    <div className="flex items-center gap-2">
                          <div className="w-24 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-green-500 transition-all duration-300 ease-in-out"
                              style={{ width: `${stats?.courseEngagementPercentage ?? 0}%` }}
                            />
                          </div>
                          <span className="text-sm w-8 text-right">{stats?.courseEngagementPercentage ?? 0}%</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                        <span className="text-sm font-medium w-32">Discussion Participation</span>
                    <div className="flex items-center gap-2">
                          <div className="w-24 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-green-500 transition-all duration-300 ease-in-out"
                              style={{ width: `${stats?.discussionParticipationPercentage ?? 0}%` }}
                            />
                          </div>
                          <span className="text-sm w-8 text-right">{stats?.discussionParticipationPercentage ?? 0}%</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                        <span className="text-sm font-medium w-32">Assignment Completion</span>
                    <div className="flex items-center gap-2">
                          <div className="w-24 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-green-500 transition-all duration-300 ease-in-out"
                              style={{ width: `${stats?.assignmentCompletionPercentage ?? 0}%` }}
                            />
                          </div>
                          <span className="text-sm w-8 text-right">{stats?.assignmentCompletionPercentage ?? 0}%</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="courses" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Course Performance Analytics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[400px]">
                {hasCourseAnalyticsData ? (
                <ChartContainer config={chartConfig} className="w-full h-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={courseAnalyticsData} margin={{ top: 20, right: 30, left: 20, bottom: 80 }}>
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
                    </BarChart>
                  </ResponsiveContainer>
                </ChartContainer>
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-muted-foreground">No course data to display.</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="engagement" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Daily Engagement Metrics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[400px] w-full">
                {!hasEngagementData ? (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-muted-foreground">No engagement data to display for this period.</p>
                  </div>
                ) : (
                <div className="relative w-full h-full">
                  <ChartContainer config={chartConfig} className="w-full h-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={engagementData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="day" />
                        <YAxis />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Line type="monotone" dataKey="activeUsers" stroke="#3B82F6" strokeWidth={2} name="Active Users" />
                        <Line type="monotone" dataKey="courses" stroke="#10B981" strokeWidth={2} name="Courses Accessed" />
                        <Line type="monotone" dataKey="discussions" stroke="#F59E0B" strokeWidth={2} name="Discussions" />
                      </LineChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                  {engagementData.every(d => d.activeUsers === 0 && d.courses === 0 && d.discussions === 0) && (
                    <div className="absolute inset-0 flex items-center justify-center bg-background/90 backdrop-blur-sm rounded-lg">
                      <div className="text-center">
                        <p className="text-sm text-muted-foreground">No activity recorded for this period</p>
                        <p className="text-xs text-muted-foreground mt-1">Overall engagement: {stats?.avgEngagement ?? 0}%</p>
                      </div>
                    </div>
                  )}
                </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="previews" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                Role Dashboard Previews
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-2">
                Preview dashboards for different user roles. These are design previews with mock data.
              </p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Principal Dashboard Preview */}
                <Card className="hover:shadow-lg transition-all duration-300 border-2 hover:border-primary/20 cursor-pointer group">
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center group-hover:bg-blue-200 dark:group-hover:bg-blue-900/50 transition-colors">
                        <Building2 className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div className="flex-1">
                        <CardTitle className="text-lg">Principal Dashboard</CardTitle>
                        <p className="text-xs text-muted-foreground mt-1">School management view</p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-sm text-muted-foreground">
                      View school information, teachers, classes, performance metrics, and observation reports.
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="outline" className="text-xs">School Info</Badge>
                      <Badge variant="outline" className="text-xs">Teachers</Badge>
                      <Badge variant="outline" className="text-xs">Classes</Badge>
                      <Badge variant="outline" className="text-xs">Observations</Badge>
                    </div>
                    <Button 
                      className="w-full mt-4" 
                      onClick={() => navigate('/dashboard/preview/principal')}
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Preview Dashboard
                    </Button>
                  </CardContent>
                </Card>

                {/* School Officer Dashboard Preview */}
                <Card className="hover:shadow-lg transition-all duration-300 border-2 hover:border-primary/20 cursor-pointer group">
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center group-hover:bg-purple-200 dark:group-hover:bg-purple-900/50 transition-colors">
                        <UserCheck className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                      </div>
                      <div className="flex-1">
                        <CardTitle className="text-lg">School Officer Dashboard</CardTitle>
                        <p className="text-xs text-muted-foreground mt-1">Multi-school oversight</p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-sm text-muted-foreground">
                      Manage multiple schools, track principal performance, and monitor school-wide metrics.
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="outline" className="text-xs">Multi-School</Badge>
                      <Badge variant="outline" className="text-xs">Principals</Badge>
                      <Badge variant="outline" className="text-xs">Performance</Badge>
                    </div>
                    <Button 
                      className="w-full mt-4" 
                      onClick={() => navigate('/dashboard/preview/school-officer')}
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Preview Dashboard
                    </Button>
                  </CardContent>
                </Card>

                {/* Program Manager Dashboard Preview */}
                <Card className="hover:shadow-lg transition-all duration-300 border-2 hover:border-primary/20 cursor-pointer group">
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center group-hover:bg-green-200 dark:group-hover:bg-green-900/50 transition-colors">
                        <Briefcase className="h-6 w-6 text-green-600 dark:text-green-400" />
                      </div>
                      <div className="flex-1">
                        <CardTitle className="text-lg">Program Manager Dashboard</CardTitle>
                        <p className="text-xs text-muted-foreground mt-1">Project oversight</p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-sm text-muted-foreground">
                      Monitor multiple projects, track school performance across projects, and analyze program metrics.
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="outline" className="text-xs">Projects</Badge>
                      <Badge variant="outline" className="text-xs">Schools</Badge>
                      <Badge variant="outline" className="text-xs">Analytics</Badge>
                    </div>
                    <Button 
                      className="w-full mt-4" 
                      onClick={() => navigate('/dashboard/preview/program-manager')}
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Preview Dashboard
                    </Button>
                  </CardContent>
                </Card>

                {/* ECE Observer Dashboard Preview */}
                <Card className="hover:shadow-lg transition-all duration-300 border-2 hover:border-primary/20 cursor-pointer group">
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center group-hover:bg-orange-200 dark:group-hover:bg-orange-900/50 transition-colors">
                        <ClipboardCheck className="h-6 w-6 text-orange-600 dark:text-orange-400" />
                      </div>
                      <div className="flex-1">
                        <CardTitle className="text-lg">ECE Observer Dashboard</CardTitle>
                        <p className="text-xs text-muted-foreground mt-1">Observation reports</p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-sm text-muted-foreground">
                      View and manage Early Childhood Education observation reports and assessments.
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="outline" className="text-xs">Observations</Badge>
                      <Badge variant="outline" className="text-xs">Reports</Badge>
                      <Badge variant="outline" className="text-xs">Assessments</Badge>
                    </div>
                    <Button 
                      className="w-full mt-4" 
                      onClick={() => navigate('/dashboard/preview/ece-observer')}
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Preview Dashboard
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
        </>
      )}
    </div>
  );
};
