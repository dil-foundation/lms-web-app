import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { 
  Users, 
  Activity, 
  Target, 
  Clock, 
  Search,
  Filter,
  SortAsc,
  Mail,
  Eye,
  FileText,
  MoreHorizontal,
  AlertCircle,
  UserPlus,
  X,
  Check
} from 'lucide-react';

// Types
interface Student {
  id: string;
  name: string;
  email: string;
  avatar: string;
  enrolledDate: string;
  course: string;
  progress: number;
  status: 'Active' | 'Behind' | 'Excellent' | 'Inactive';
  lastActive: string;
  grade: string;
  assignments: string;
  phone?: string;
  location?: string;
}

interface StudentData {
  students: Student[];
  totalCount: number;
  activeCount: number;
  averageProgress: number;
  atRiskCount: number;
  courses: string[];
  statuses: string[];
}

interface AvailableStudent {
  id: string;
  name: string;
  email: string;
  avatar: string;
}

interface AvailableCourse {
  id: string;
  title: string;
  description?: string;
  status: string;
}

// Utility functions
const getInitials = (name: string): string => {
  return name.split(' ').map(n => n.charAt(0)).join('').toUpperCase();
};

const formatDate = (dateString: string): string => {
  try {
    return new Date(dateString).toLocaleDateString();
  } catch {
    return 'N/A';
  }
};

const getStatusFromProgress = (progress: number): Student['status'] => {
  if (progress >= 90) return 'Excellent';
  if (progress >= 70) return 'Active';
  if (progress >= 40) return 'Active';
  return 'Behind';
};

const getGradeFromProgress = (progress: number): string => {
  if (progress >= 95) return 'A+';
  if (progress >= 90) return 'A';
  if (progress >= 85) return 'A-';
  if (progress >= 80) return 'B+';
  if (progress >= 75) return 'B';
  if (progress >= 70) return 'B-';
  if (progress >= 65) return 'C+';
  if (progress >= 60) return 'C';
  if (progress >= 55) return 'C-';
  if (progress >= 50) return 'D';
  return 'F';
};

const getLastActiveText = (lastActiveDate: string): string => {
  try {
    const now = new Date();
    const lastActive = new Date(lastActiveDate);
    const diffInHours = Math.floor((now.getTime() - lastActive.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours} hours ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 30) return `${diffInDays} days ago`;
    
    const diffInMonths = Math.floor(diffInDays / 30);
    return `${diffInMonths} months ago`;
  } catch {
    return 'Never';
  }
};

export default function StudentsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  
  // State
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCourse, setSelectedCourse] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [studentData, setStudentData] = useState<StudentData>({
    students: [],
    totalCount: 0,
    activeCount: 0,
    averageProgress: 0,
    atRiskCount: 0,
    courses: [],
    statuses: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Enrollment modal state
  const [enrollModalOpen, setEnrollModalOpen] = useState(false);
  const [enrollmentLoading, setEnrollmentLoading] = useState(false);
  const [selectedStudentForEnroll, setSelectedStudentForEnroll] = useState<string>('');
  const [selectedCourseForEnroll, setSelectedCourseForEnroll] = useState<string>('');
  const [studentSearchTerm, setStudentSearchTerm] = useState('');
  const [availableStudents, setAvailableStudents] = useState<AvailableStudent[]>([]);
  const [availableCourses, setAvailableCourses] = useState<AvailableCourse[]>([]);
  const [loadingEnrollData, setLoadingEnrollData] = useState(false);

  // Fetch student data
  const fetchStudentData = async () => {
    if (!user) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // Get teacher's courses
      const { data: teacherCourses, error: coursesError } = await supabase
        .from('course_members')
        .select('course_id, courses(id, title)')
        .eq('user_id', user.id)
        .eq('role', 'teacher');

      if (coursesError) throw coursesError;

      const courseIds = teacherCourses?.map(tc => tc.course_id) || [];
      
      if (courseIds.length === 0) {
        setStudentData({
          students: [],
          totalCount: 0,
          activeCount: 0,
          averageProgress: 0,
          atRiskCount: 0,
          courses: [],
          statuses: []
        });
        setLoading(false);
        return;
      }

      // Get students enrolled in teacher's courses
      let { data: enrolledStudents, error: studentsError } = await supabase
        .from('course_members')
        .select(`
          user_id,
          created_at,
          course_id,
          courses(id, title),
          profiles(id, first_name, last_name, email)
        `)
        .in('course_id', courseIds)
        .eq('role', 'student');

      // If the complex query fails, try a simpler fallback
      if (studentsError) {
        console.warn('Complex query failed, trying fallback:', studentsError);
        const { data: fallbackData, error: fallbackError } = await supabase
          .from('course_members')
          .select(`
            user_id,
            created_at,
            course_id,
            courses(id, title)
          `)
          .in('course_id', courseIds)
          .eq('role', 'student');

        if (fallbackError) throw fallbackError;
        
        // Transform fallback data to include empty profile info
        enrolledStudents = fallbackData?.map(item => ({
          ...item,
          profiles: null
        })) || [];
      }

      // Transform data to Student format
      const students: Student[] = (enrolledStudents || [])
        .filter(enrollment => enrollment && enrollment.user_id) // Filter out invalid entries
        .map(enrollment => {
          const profile = enrollment.profiles;
          const course = enrollment.courses;
          
          // Generate mock data for missing fields (in real app, these would come from progress tracking)
          const mockProgress = Math.floor(Math.random() * 100);
          const mockAssignments = `${Math.floor(Math.random() * 10) + 1}/${Math.floor(Math.random() * 5) + 10}`;
          
          const firstName = profile?.first_name || 'Unknown';
          const lastName = profile?.last_name || 'User';
          const fullName = `${firstName} ${lastName}`.trim();
          
          return {
            id: enrollment.user_id,
            name: fullName || 'Unknown Student',
            email: profile?.email || 'N/A',
            avatar: getInitials(fullName || 'Unknown Student'),
            enrolledDate: enrollment.created_at || new Date().toISOString(),
            course: course?.title || 'Unknown Course',
            progress: mockProgress,
            status: getStatusFromProgress(mockProgress),
            lastActive: getLastActiveText(enrollment.created_at || new Date().toISOString()),
            grade: getGradeFromProgress(mockProgress),
            assignments: mockAssignments,
            phone: undefined,
            location: undefined
          };
        });

      // Calculate metrics
      const totalCount = students.length;
      const activeCount = students.filter(s => s.status === 'Active' || s.status === 'Excellent').length;
      const averageProgress = totalCount > 0 ? Math.round(students.reduce((acc, s) => acc + s.progress, 0) / totalCount) : 0;
      const atRiskCount = students.filter(s => s.status === 'Behind').length;
      const courses = [...new Set(students.map(s => s.course))];
      const statuses = [...new Set(students.map(s => s.status))];

      setStudentData({
        students,
        totalCount,
        activeCount,
        averageProgress,
        atRiskCount,
        courses,
        statuses
      });

    } catch (err: any) {
      console.error('Error fetching student data:', err);
      const errorMessage = err.message || 'Failed to fetch student data';
      setError(errorMessage);
      toast({
        title: 'Error',
        description: `Failed to load student data: ${errorMessage}`,
        variant: 'destructive'
      });
      
      // Set empty data on error to show proper empty state
      setStudentData({
        students: [],
        totalCount: 0,
        activeCount: 0,
        averageProgress: 0,
        atRiskCount: 0,
        courses: [],
        statuses: []
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudentData();
  }, [user]);

  // Fetch available students and courses for enrollment
  const fetchEnrollmentData = async () => {
    if (!user) return;
    
    setLoadingEnrollData(true);
    try {
      // Get teacher's courses - first get course IDs, then fetch course details
      const { data: teacherCourseMembers, error: coursesError } = await supabase
        .from('course_members')
        .select('course_id')
        .eq('user_id', user.id)
        .eq('role', 'teacher');

      if (coursesError) throw coursesError;

      const courseIds = (teacherCourseMembers || []).map(tcm => tcm.course_id);
      
      let courses: AvailableCourse[] = [];
      
      if (courseIds.length > 0) {
        // Now fetch course details - first try with status filter, then without
        let { data: courseDetails, error: courseDetailsError } = await supabase
          .from('courses')
          .select('id, title, description, status')
          .in('id', courseIds)
          .eq('status', 'Published');

        if (courseDetailsError) {
          console.warn('Failed to fetch courses with status filter, trying without:', courseDetailsError);
          
          // Fallback: fetch all courses without status filter
          const { data: allCourseDetails, error: allCoursesError } = await supabase
            .from('courses')
            .select('id, title, description, status')
            .in('id', courseIds);

          if (allCoursesError) {
            console.error('Failed to fetch courses:', allCoursesError);
            courseDetails = [];
          } else {
            courseDetails = allCourseDetails;
          }
        }

        courses = (courseDetails || []).map(course => ({
          id: course.id,
          title: course.title || 'Untitled Course',
          description: course.description,
          status: course.status || 'Published'
        }));
      }

      setAvailableCourses(courses);

      // Get all students (not already enrolled in the selected course)
      const { data: allProfiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email')
        .eq('role', 'student');

      if (profilesError) throw profilesError;

      const students: AvailableStudent[] = (allProfiles || []).map(profile => {
        const firstName = profile.first_name || 'Unknown';
        const lastName = profile.last_name || 'Student';
        const fullName = `${firstName} ${lastName}`.trim();
        
        return {
          id: profile.id,
          name: fullName,
          email: profile.email || 'N/A',
          avatar: getInitials(fullName)
        };
      });

      setAvailableStudents(students);

    } catch (err: any) {
      console.error('Error fetching enrollment data:', err);
      toast({
        title: 'Error',
        description: 'Failed to load enrollment data. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setLoadingEnrollData(false);
    }
  };

  // Handle enrollment submission
  const handleEnrollStudent = async () => {
    if (!selectedStudentForEnroll || !selectedCourseForEnroll) {
      toast({
        title: 'Missing Information',
        description: 'Please select both a student and a course.',
        variant: 'destructive'
      });
      return;
    }

    setEnrollmentLoading(true);
    try {
      // Check if student is already enrolled
      const { data: existingEnrollment, error: checkError } = await supabase
        .from('course_members')
        .select('id')
        .eq('user_id', selectedStudentForEnroll)
        .eq('course_id', selectedCourseForEnroll)
        .eq('role', 'student')
        .single();

      if (checkError && checkError.code !== 'PGRST116') {
        throw checkError;
      }

      if (existingEnrollment) {
        toast({
          title: 'Already Enrolled',
          description: 'This student is already enrolled in the selected course.',
          variant: 'destructive'
        });
        return;
      }

      // Enroll the student
      const { error: enrollError } = await supabase
        .from('course_members')
        .insert({
          user_id: selectedStudentForEnroll,
          course_id: selectedCourseForEnroll,
          role: 'student'
        });

      if (enrollError) throw enrollError;

      toast({
        title: 'Success',
        description: 'Student enrolled successfully!',
      });

      // Reset form and close modal
      setSelectedStudentForEnroll('');
      setSelectedCourseForEnroll('');
      setStudentSearchTerm('');
      setEnrollModalOpen(false);

      // Refresh student data
      fetchStudentData();

    } catch (err: any) {
      console.error('Error enrolling student:', err);
      toast({
        title: 'Enrollment Failed',
        description: err.message || 'Failed to enroll student. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setEnrollmentLoading(false);
    }
  };

  // Filter available students based on search
  const filteredAvailableStudents = availableStudents.filter(student =>
    student.name.toLowerCase().includes(studentSearchTerm.toLowerCase()) ||
    student.email.toLowerCase().includes(studentSearchTerm.toLowerCase())
  );

  // Get available courses for selected student (exclude already enrolled courses)
  const getAvailableCoursesForStudent = () => {
    if (!selectedStudentForEnroll) return [];
    
    const enrolledCourseIds = studentData.students
      .filter(s => s.id === selectedStudentForEnroll)
      .map(s => {
        // Find course ID from course title - this is a simplification
        // In a real app, you'd store course IDs properly
        return availableCourses.find(c => c.title === s.course)?.id;
      })
      .filter(Boolean);

    return availableCourses.filter(course => !enrolledCourseIds.includes(course.id));
  };

  // Filter and sort students
  const filteredStudents = studentData.students
    .filter(student => {
      const matchesSearch = student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          student.email.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCourse = selectedCourse === 'all' || student.course === selectedCourse;
      const matchesStatus = selectedStatus === 'all' || student.status === selectedStatus;
      return matchesSearch && matchesCourse && matchesStatus;
    })
    .sort((a, b) => {
      let aValue = a[sortBy as keyof typeof a];
      let bValue = b[sortBy as keyof typeof b];
      
      if (sortBy === 'progress') {
        aValue = a.progress;
        bValue = b.progress;
      } else if (sortBy === 'enrolledDate') {
        aValue = new Date(a.enrolledDate).getTime();
        bValue = new Date(b.enrolledDate).getTime();
      }
      
      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

  // Get unique courses and statuses for filters
  const uniqueCourses = studentData.courses;
  const uniqueStatuses = studentData.statuses;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Students</h1>
          <p className="text-muted-foreground">Manage your students and track their progress</p>
        </div>
        <Dialog open={enrollModalOpen} onOpenChange={setEnrollModalOpen}>
          <DialogTrigger asChild>
            <Button 
              onClick={() => {
                setEnrollModalOpen(true);
                fetchEnrollmentData();
              }}
              className="flex items-center gap-2"
            >
              <UserPlus className="h-4 w-4" />
              Enroll Student
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-green-600" />
                Enroll Student in Course
              </DialogTitle>
              <p className="text-sm text-muted-foreground">
                Select a student and course to create a new enrollment. Only courses the student is not already enrolled in will be shown.
              </p>
            </DialogHeader>
            
            <div className="space-y-6 py-4">
              {/* Select Student */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Select Student</label>
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search students..."
                    value={studentSearchTerm}
                    onChange={(e) => setStudentSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select
                  value={selectedStudentForEnroll}
                  onValueChange={setSelectedStudentForEnroll}
                  disabled={loadingEnrollData}
                >
                  <SelectTrigger className="h-auto py-3 px-4">
                    <SelectValue placeholder="Choose a student to enroll" />
                  </SelectTrigger>
                  <SelectContent>
                    {loadingEnrollData ? (
                      <div className="p-2">
                        <Skeleton className="h-4 w-full" />
                      </div>
                    ) : filteredAvailableStudents.length > 0 ? (
                      filteredAvailableStudents.map((student) => (
                        <SelectItem key={student.id} value={student.id} className="focus:bg-accent focus:text-white [&[data-highlighted]]:bg-accent [&[data-highlighted]]:text-white [&[data-highlighted]_[data-avatar]]:bg-white/20 [&[data-highlighted]_[data-avatar]]:text-white focus:[&_[data-avatar]]:bg-white/20 focus:[&_[data-avatar]]:text-white py-3">
                          <div className="flex items-center space-x-3">
                            <Avatar className="h-8 w-8 shrink-0">
                              <AvatarFallback className="text-xs bg-primary/10 text-primary" data-avatar>
                                {student.avatar}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex flex-col items-start min-w-0 flex-1">
                              <span className="font-medium truncate w-full text-left">{student.name}</span>
                              <span className="text-xs opacity-80 truncate w-full text-left">{student.email}</span>
                            </div>
                          </div>
                        </SelectItem>
                      ))
                    ) : (
                      <div className="p-2 text-sm text-muted-foreground">
                        No students found
                      </div>
                    )}
                  </SelectContent>
                </Select>
              </div>

              {/* Select Course */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Select Course</label>
                <Select
                  value={selectedCourseForEnroll}
                  onValueChange={setSelectedCourseForEnroll}
                  disabled={!selectedStudentForEnroll || loadingEnrollData}
                >
                  <SelectTrigger>
                    <SelectValue 
                      placeholder={
                        selectedStudentForEnroll 
                          ? "Choose a course" 
                          : "Select a student first"
                      } 
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {getAvailableCoursesForStudent().length > 0 ? (
                      getAvailableCoursesForStudent().map((course) => (
                        <SelectItem key={course.id} value={course.id} className="focus:bg-accent focus:text-white [&[data-highlighted]]:bg-accent [&[data-highlighted]]:text-white">
                          <div className="flex flex-col">
                            <span className="font-medium">{course.title}</span>
                            {course.description && (
                              <span className="text-xs opacity-80 line-clamp-1">
                                {course.description}
                              </span>
                            )}
                          </div>
                        </SelectItem>
                      ))
                    ) : selectedStudentForEnroll ? (
                      <div className="p-2 text-sm text-muted-foreground">
                        No available courses for this student
                      </div>
                    ) : (
                      <div className="p-2 text-sm text-muted-foreground">
                        Select a student to see available courses
                      </div>
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={() => {
                  setEnrollModalOpen(false);
                  setSelectedStudentForEnroll('');
                  setSelectedCourseForEnroll('');
                  setStudentSearchTerm('');
                }}
                disabled={enrollmentLoading}
              >
                Cancel
              </Button>
              <Button
                onClick={handleEnrollStudent}
                disabled={!selectedStudentForEnroll || !selectedCourseForEnroll || enrollmentLoading}
                className="flex items-center gap-2"
              >
                {enrollmentLoading ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    Enrolling...
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4" />
                    Enroll Student
                  </>
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Students Summary Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-card to-green-500/5 dark:bg-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Students</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold">{studentData.totalCount}</div>
            )}
            <p className="text-xs text-muted-foreground">
              Across all courses
            </p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-card to-green-500/5 dark:bg-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Students</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold">{studentData.activeCount}</div>
            )}
            <p className="text-xs text-muted-foreground">
              {studentData.totalCount > 0 ? Math.round((studentData.activeCount / studentData.totalCount) * 100) : 0}% of total
            </p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-card to-green-500/5 dark:bg-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Progress</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold">{studentData.averageProgress}%</div>
            )}
            <p className="text-xs text-muted-foreground">
              Course completion
            </p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-card to-green-500/5 dark:bg-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">At Risk</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold">{studentData.atRiskCount}</div>
            )}
            <p className="text-xs text-muted-foreground">
              Students behind schedule
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Error Display */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <AlertCircle className="h-5 w-5 text-red-500" />
              <div>
                <p className="text-sm font-medium text-red-800">Error loading student data</p>
                <p className="text-sm text-red-600">{error}</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={fetchStudentData}
                  className="mt-2"
                  disabled={loading}
                >
                  Try Again
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search and Filter Controls */}
      <Card>
        <CardHeader>
          <CardTitle>Student Management</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search students by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <Select value={selectedCourse} onValueChange={setSelectedCourse}>
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder="Filter by course" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Courses</SelectItem>
                  {uniqueCourses.map(course => (
                    <SelectItem key={course} value={course}>{course}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger className="w-full sm:w-32">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  {uniqueStatuses.map(status => (
                    <SelectItem key={status} value={status}>{status}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="w-full sm:w-auto">
                    <SortAsc className="h-4 w-4 mr-2" />
                    Sort
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => { setSortBy('name'); setSortOrder('asc'); }}>
                    Name A-Z
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => { setSortBy('name'); setSortOrder('desc'); }}>
                    Name Z-A
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => { setSortBy('progress'); setSortOrder('desc'); }}>
                    Progress High-Low
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => { setSortBy('progress'); setSortOrder('asc'); }}>
                    Progress Low-High
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => { setSortBy('enrolledDate'); setSortOrder('desc'); }}>
                    Recently Enrolled
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => { setSortBy('enrolledDate'); setSortOrder('asc'); }}>
                    Oldest Enrolled
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Students Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Course</TableHead>
                  <TableHead>Progress</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Grade</TableHead>
                  <TableHead>Last Active</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  // Loading skeleton
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell>
                        <div className="flex items-center space-x-3">
                          <Skeleton className="h-8 w-8 rounded-full" />
                          <div className="space-y-1">
                            <Skeleton className="h-4 w-32" />
                            <Skeleton className="h-3 w-48" />
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <Skeleton className="h-4 w-24" />
                          <Skeleton className="h-3 w-20" />
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <Skeleton className="h-4 w-12" />
                          <Skeleton className="h-2 w-20" />
                          <Skeleton className="h-3 w-16" />
                        </div>
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-6 w-16" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-8" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-16" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-8 w-8" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  filteredStudents.map((student) => (
                    <TableRow key={student.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center space-x-3">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="text-xs">
                              {student.avatar}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium">{student.name}</div>
                            <div className="text-sm text-muted-foreground">{student.email}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div className="font-medium">{student.course}</div>
                          <div className="text-muted-foreground">
                            Enrolled: {formatDate(student.enrolledDate)}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">{student.progress}%</span>
                          </div>
                          <Progress value={student.progress} className="h-2" />
                          <div className="text-xs text-muted-foreground">
                            {student.assignments}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            student.status === 'Active' ? 'default' :
                            student.status === 'Excellent' ? 'secondary' :
                            student.status === 'Behind' ? 'destructive' :
                            'outline'
                          }
                        >
                          {student.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="font-medium">{student.grade}</span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {student.lastActive}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <span className="sr-only">Open menu</span>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem>
                              <Eye className="mr-2 h-4 w-4" />
                              View Profile
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Mail className="mr-2 h-4 w-4" />
                              Send Message
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <FileText className="mr-2 h-4 w-4" />
                              View Progress
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          
          {/* Empty State */}
          {!loading && filteredStudents.length === 0 && studentData.totalCount === 0 && (
            <div className="text-center py-12">
              <Users className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium mb-2">No Students Found</h3>
              <p className="text-muted-foreground mb-4">
                You don't have any students enrolled in your courses yet.
              </p>
              <Button variant="outline" onClick={fetchStudentData} disabled={loading}>
                Refresh Data
              </Button>
            </div>
          )}
          
          {/* No Results State */}
          {!loading && filteredStudents.length === 0 && studentData.totalCount > 0 && (
            <div className="text-center py-8">
              <Search className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No students found matching your search criteria.</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearchTerm('');
                  setSelectedCourse('all');
                  setSelectedStatus('all');
                }}
                className="mt-2"
              >
                Clear Filters
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 