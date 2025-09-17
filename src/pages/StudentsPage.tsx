import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useViewPreferences } from '@/contexts/ViewPreferencesContext';
import { ViewToggle } from '@/components/ui/ViewToggle';
import { StudentTileView } from '@/components/student/StudentTileView';
import { StudentListView } from '@/components/student/StudentListView';
import { StudentCardView } from '@/components/student/StudentCardView';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
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
  Mail,
  Eye,
  FileText,
  MoreHorizontal,
  AlertCircle,
  UserPlus,
  X,
  Check,
  Edit
} from 'lucide-react';
import { useDebounce } from '@/hooks/useDebounce';
import { ContentLoader } from '@/components/ContentLoader';
import AccessLogService from '@/services/accessLogService';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Label } from '@/components/ui/label';

// Types
interface Student {
  id: string;
  name: string;
  firstName: string;
  lastName: string;
  email: string;
  avatar: string;
  avatar_url?: string;
  enrolledDate: string;
  course: string;
  progress: number;
  status: 'active' | 'inactive' | 'unverified';
  lastActive: string;
  grade?: string;
}

interface StudentData {
  students: Student[];
  totalCount: number;
  activeCount: number;
  averageProgress: number;
  unverifiedCount: number;
  courses: string[];
}

interface AvailableStudent {
  id: string;
  name: string;
  email: string;
  avatar: string;
  avatar_url?: string;
}

interface Profile {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string;
  avatar_url?: string;
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

const getStatusBadgeVariant = (status: string) => {
  switch (status) {
    case 'active':
      return 'default';
    case 'unverified':
      return 'destructive';
    default:
      return 'secondary';
  }
};

const getLastActiveText = (lastActiveDate: string): string => {
  try {
    if (!lastActiveDate || lastActiveDate === 'null' || lastActiveDate === 'undefined') return 'Never';
    
    const now = new Date();
    const lastActive = new Date(lastActiveDate);
    
    // Check if the date is valid
    if (isNaN(lastActive.getTime())) return 'Never';
    
    const diffInHours = Math.floor((now.getTime() - lastActive.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours} hours ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 30) return `${diffInDays} days ago`;
    
    const diffInMonths = Math.floor(diffInDays / 30);
    // Ensure diffInMonths is a valid number
    if (isNaN(diffInMonths) || diffInMonths < 0) return 'Never';
    
    return `${diffInMonths} months ago`;
  } catch {
    return 'Never';
  }
};

export default function StudentsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { preferences, setTeacherStudentView } = useViewPreferences();
  
  // State
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 500);
  const [selectedCourse, setSelectedCourse] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [studentData, setStudentData] = useState<StudentData>({
    students: [],
    totalCount: 0,
    activeCount: 0,
    averageProgress: 0,
    unverifiedCount: 0,
    courses: [],
  });
  const [loading, setLoading] = useState(true);
  const [isTableLoading, setIsTableLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalStudentsInFilter, setTotalStudentsInFilter] = useState(0);
  
  // Get default items per page based on current view
  const getDefaultItemsPerPage = (view: string) => {
    switch (view) {
      case 'card': return 8;
      case 'tile': return 16; // Tile view should show 16 items per page
      case 'list': return 8;
      default: return 8;
    }
  };
  
  const [rowsPerPage, setRowsPerPage] = useState(getDefaultItemsPerPage(preferences.teacherStudentView));

  // Profile modal state
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [editableStudent, setEditableStudent] = useState<Partial<Student>>({});
  const [modalMode, setModalMode] = useState<'view' | 'edit'>('view');
  const [isUpdatingUser, setIsUpdatingUser] = useState(false);

  // Enrollment modal state
  const [enrollModalOpen, setEnrollModalOpen] = useState(false);
  const [enrollmentLoading, setEnrollmentLoading] = useState(false);
  const [selectedStudentForEnroll, setSelectedStudentForEnroll] = useState<string>('');
  const [selectedCourseForEnroll, setSelectedCourseForEnroll] = useState<string>('');
  const [studentSearchTerm, setStudentSearchTerm] = useState('');
  const [availableStudents, setAvailableStudents] = useState<AvailableStudent[]>([]);
  const [availableCourses, setAvailableCourses] = useState<AvailableCourse[]>([]);
  const [loadingEnrollData, setLoadingEnrollData] = useState(false);
  const [filterableCourses, setFilterableCourses] = useState<string[]>([]);

  const fetchStudentStats = async () => {
    if(!user) return;
    try {
        const { data, error } = await supabase.rpc('get_student_stats_for_teacher', { p_teacher_id: user.id });
        if(error) throw error;

        setStudentData(prev => ({
            ...prev,
            totalCount: data.totalCount,
            activeCount: data.activeCount,
            unverifiedCount: data.unverifiedCount
        }));
    } catch(err: any) {
        console.error('Failed to fetch student stats:', err);
    }
  }

  // Fetch student data
  const fetchStudentDataAndCount = async () => {
    if (!user) return;
    
    setIsTableLoading(true);
    setError(null);
    
    try {
      const params = { 
        p_teacher_id: user.id,
        p_search_term: debouncedSearchTerm,
        p_course_filter: selectedCourse,
        p_status_filter: selectedStatus
      };

      const countPromise = supabase.rpc('get_students_for_teacher_count', params);
      const dataPromise = supabase.rpc('get_students_for_teacher', { ...params, p_page: currentPage, p_rows_per_page: rowsPerPage });
      
      const [{ data: count, error: countError }, { data: studentsData, error: dataError }] = await Promise.all([countPromise, dataPromise]);

      if (countError) throw countError;
      if (dataError) throw dataError;
      
      const students: Student[] = (studentsData || []).map((student: any) => {
          const mockProgress = Math.floor(Math.random() * 100);
          
          const firstName = student.first_name || 'Unknown';
          const lastName = student.last_name || 'User';
          const fullName = `${firstName} ${lastName}`.trim();
          
          return {
            id: student.id,
            name: fullName,
            firstName,
            lastName,
            email: student.email || 'N/A',
            avatar: getInitials(fullName || 'Unknown Student'),
            avatar_url: student.avatar_url,
            enrolledDate: student.enrolled_at || new Date().toISOString(),
            course: student.course_title || 'Unknown Course',
            progress: mockProgress,
            status: student.status,
            lastActive: getLastActiveText(student.last_active),
            grade: student.grade,
          };
        });

      // Calculate metrics from the filtered set
      const averageProgress = students.length > 0 ? Math.round(students.reduce((acc, s) => acc + s.progress, 0) / students.length) : 0;
      setTotalStudentsInFilter(count || 0);

      setStudentData(prev => ({
        ...prev,
        students,
        averageProgress
      }));

    } catch (err: any) {
      console.error('Error fetching student data:', err);
      const errorMessage = err.message || 'Failed to fetch student data';
      setError(errorMessage);
      toast({
        title: 'Error',
        description: `Failed to load student data: ${errorMessage}`,
        variant: 'destructive'
      });
      
      setStudentData(prev => ({ ...prev, students: [] }));
    } finally {
        setIsTableLoading(false);
    }
  };

  const fetchFilterableCourses = async () => {
    if (!user) return;
    try {
        const { data: teacherCourseMembers, error: coursesError } = await supabase
            .from('course_members')
            .select('course_id')
            .eq('user_id', user.id)
            .eq('role', 'teacher');

        if (coursesError) throw coursesError;

        const courseIds = (teacherCourseMembers || []).map(tcm => tcm.course_id);
        if (courseIds.length === 0) {
            setFilterableCourses([]);
            return;
        }

        const { data: courseDetails, error: courseDetailsError } = await supabase
            .from('courses')
            .select('title')
            .in('id', courseIds)
            .eq('status', 'Published');
        
        if (courseDetailsError) throw courseDetailsError;

        const courseTitles = (courseDetails || []).map(c => c.title).filter((c): c is string => c !== null);
        setFilterableCourses(courseTitles);
    } catch (err: any) {
        console.error('Failed to fetch filterable courses:', err);
        toast({
            title: 'Error',
            description: `Failed to load course filters.`,
            variant: 'destructive'
        });
    }
  };

  useEffect(() => {
    const loadInitialData = async () => {
        if (!user) return;
        setLoading(true);
        await Promise.all([
            fetchStudentStats(),
            fetchFilterableCourses()
        ]);
        setLoading(false);
    };
    loadInitialData();
  }, [user]);

  // Update items per page when view changes
  useEffect(() => {
    const newRowsPerPage = getDefaultItemsPerPage(preferences.teacherStudentView);
    setRowsPerPage(newRowsPerPage);
    setCurrentPage(1); // Reset to first page when view changes
  }, [preferences.teacherStudentView]);

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchTerm, selectedCourse, selectedStatus]);

  useEffect(() => {
    if(user) {
      fetchStudentDataAndCount();
    }
  }, [user, currentPage, debouncedSearchTerm, selectedCourse, selectedStatus, rowsPerPage]);

  const handleUpdateStudent = async () => {
    if (!editableStudent || !editableStudent.id) return;
    setIsUpdatingUser(true);
    try {
        const { error } = await supabase.functions.invoke('update-user', {
            body: {
                userId: editableStudent.id,
                firstName: editableStudent.firstName,
                lastName: editableStudent.lastName,
                grade: editableStudent.grade,
                role: 'student'
            },
        });

        if (error) throw error;
        
        toast({
            title: "Success",
            description: "Student profile has been updated.",
        });
        
        setIsProfileModalOpen(false);
        fetchStudentDataAndCount();

    } catch (err: any) {
        toast({
            title: "Update Failed",
            description: err.message || "Failed to update student profile.",
            variant: 'destructive',
        });
    } finally {
        setIsUpdatingUser(false);
    }
  };

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

      const students: AvailableStudent[] = (allProfiles || []).map((profile: Profile) => {
        const firstName = profile.first_name || 'Unknown';
        const lastName = profile.last_name || 'Student';
        const fullName = `${firstName} ${lastName}`.trim();
        
        return {
          id: profile.id,
          name: fullName,
          email: profile.email || 'N/A',
          avatar: getInitials(fullName),
          avatar_url: profile.avatar_url
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

      // Log course enrollment
      try {
        const selectedCourse = availableCourses.find(c => c.id === selectedCourseForEnroll);
        const selectedStudent = availableStudents.find(s => s.id === selectedStudentForEnroll);
        
        if (selectedCourse && selectedStudent) {
          await AccessLogService.logCourseEnrollment(
            selectedStudentForEnroll,
            selectedStudent.email,
            selectedCourseForEnroll,
            selectedCourse.title,
            'success'
          );
        }
      } catch (logError) {
        console.error('Error logging course enrollment:', logError);
      }

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
      fetchStudentDataAndCount();

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
  const filteredStudents = studentData.students;
  const totalPages = Math.ceil(totalStudentsInFilter / rowsPerPage);

  return (
    <div className="space-y-6">
      {/* Premium Header Section */}
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-primary/5 rounded-3xl"></div>
        <div className="relative p-4 md:p-8 rounded-3xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 md:w-12 md:h-12 bg-gradient-to-br from-primary/10 to-primary/20 rounded-2xl flex items-center justify-center">
                <Users className="w-5 h-5 md:w-6 md:h-6 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl md:text-4xl font-bold tracking-tight bg-gradient-to-r from-primary via-primary to-primary/80 bg-clip-text text-transparent" style={{ backgroundClip: 'text', WebkitBackgroundClip: 'text' }}>
                  Students
                </h1>
                <p className="text-sm md:text-lg text-muted-foreground md:mt-2 leading-relaxed">
                  Manage your students and track their progress
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button 
                onClick={() => {
                  setEnrollModalOpen(true);
                  fetchEnrollmentData();
                }}
                className="h-9 px-4 rounded-xl bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5 flex items-center gap-2"
              >
                <UserPlus className="h-4 w-4" />
                Enroll Student
              </Button>
            </div>
          </div>
        </div>
      </div>

      <Dialog open={enrollModalOpen} onOpenChange={setEnrollModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-primary" />
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
                              <AvatarImage 
                                src={student.avatar_url} 
                                alt={student.name}
                              />
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
                  onClick={() => {
                    setEnrollModalOpen(false);
                    setSelectedStudentForEnroll('');
                    setSelectedCourseForEnroll('');
                    setStudentSearchTerm('');
                  }}
                  disabled={enrollmentLoading}
                  className="hover:bg-accent/5 hover:text-foreground dark:hover:bg-gray-800"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleEnrollStudent}
                  disabled={!selectedStudentForEnroll || !selectedCourseForEnroll || enrollmentLoading}
                  className="flex items-center gap-2 hover:bg-accent/5 hover:text-foreground dark:hover:bg-gray-800"
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

             {/* Students Summary Metrics */}
       <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
         <Card className="relative overflow-hidden transition-all duration-200 hover:shadow-lg bg-gradient-to-br from-card to-green-500/5 dark:bg-card">
           <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
             <CardTitle className="text-sm font-medium text-muted-foreground">Total Students</CardTitle>
             <Users className="h-4 w-4 text-[#1582B4]" />
           </CardHeader>
           <CardContent>
             <div className="space-y-1">
               {loading ? (
                 <Skeleton className="h-8 w-16" />
               ) : (
                 <div className="text-2xl font-bold">{studentData.totalCount}</div>
               )}
             </div>
           </CardContent>
         </Card>
         <Card className="relative overflow-hidden transition-all duration-200 hover:shadow-lg bg-gradient-to-br from-card to-green-500/5 dark:bg-card">
           <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
             <CardTitle className="text-sm font-medium text-muted-foreground">Active Students</CardTitle>
             <Activity className="h-4 w-4 text-green-500" />
           </CardHeader>
           <CardContent>
             <div className="space-y-1">
               {loading ? (
                 <Skeleton className="h-8 w-16" />
               ) : (
                 <div className="text-2xl font-bold">{studentData.activeCount}</div>
               )}
             </div>
           </CardContent>
         </Card>
         <Card className="relative overflow-hidden transition-all duration-200 hover:shadow-lg bg-gradient-to-br from-card to-green-500/5 dark:bg-card">
           <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
             <CardTitle className="text-sm font-medium text-muted-foreground">Avg Progress</CardTitle>
             <Target className="h-4 w-4 text-purple-500" />
           </CardHeader>
           <CardContent>
             <div className="space-y-1">
               {loading ? (
                 <Skeleton className="h-8 w-16" />
               ) : (
                 <div className="text-2xl font-bold">{studentData.averageProgress}%</div>
               )}
             </div>
           </CardContent>
         </Card>
         <Card className="relative overflow-hidden transition-all duration-200 hover:shadow-lg bg-gradient-to-br from-card to-green-500/5 dark:bg-card">
           <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
             <CardTitle className="text-sm font-medium text-muted-foreground">Unverified</CardTitle>
             <AlertCircle className="h-4 w-4 text-orange-500" />
           </CardHeader>
           <CardContent>
             <div className="space-y-1">
               {loading ? (
                 <Skeleton className="h-8 w-16" />
               ) : (
                 <div className="text-2xl font-bold">{studentData.unverifiedCount}</div>
               )}
             </div>
           </CardContent>
         </Card>
       </div>

      {/* Error Display */}
      {error && (
        <Card className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/20">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <AlertCircle className="h-5 w-5 text-red-500" />
                             <div>
                 <p className="text-sm font-medium text-red-800 dark:text-red-400">Error loading student data</p>
                 <p className="text-sm text-red-600 dark:text-red-300">{error}</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={fetchStudentDataAndCount}
                  className="mt-2 hover:bg-accent/5 hover:text-foreground dark:hover:bg-gray-800"
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
      <Card className="bg-card border border-border">
        <CardHeader>
          <CardTitle className="text-xl font-semibold">Student Management</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                             <Input
                 placeholder="Search students by name or email..."
                 value={searchTerm}
                 onChange={(e) => setSearchTerm(e.target.value)}
                 className="pl-10 h-9 rounded-xl bg-background border border-input shadow-sm hover:shadow-lg hover:shadow-primary/10 transition-all duration-300 hover:-translate-y-0.5"
               />
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
                             <Select value={selectedCourse} onValueChange={setSelectedCourse}>
                 <SelectTrigger className="w-full sm:w-48 h-9 rounded-xl bg-background border border-input shadow-sm hover:shadow-lg hover:shadow-primary/10 transition-all duration-300 hover:-translate-y-0.5">
                   <SelectValue placeholder="Filter by course" />
                 </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Courses</SelectItem>
                  {filterableCourses.map(course => (
                    <SelectItem key={course} value={course}>{course}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
                             <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                 <SelectTrigger className="w-full sm:w-32 h-9 rounded-xl bg-background border border-input shadow-sm hover:shadow-lg hover:shadow-primary/10 transition-all duration-300 hover:-translate-y-0.5">
                   <SelectValue placeholder="Status" />
                 </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="unverified">Unverified</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* View Toggle and Students Display */}
          <div className="space-y-6">
            {/* View Toggle */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-foreground">Students</h2>
                <p className="text-sm text-muted-foreground">Switch between different views to manage your students</p>
              </div>
              <ViewToggle
                currentView={preferences.teacherStudentView}
                onViewChange={setTeacherStudentView}
                availableViews={['card', 'tile', 'list']}
              />
            </div>

            {/* Students Display based on selected view */}
            {isTableLoading ? (
              <div className="h-48 flex items-center justify-center">
                <ContentLoader message="Loading students..." />
              </div>
            ) : (
              <>
                {preferences.teacherStudentView === 'card' && (
                  <StudentCardView
                    students={filteredStudents.map(student => ({
                      id: student.id,
                      firstName: student.firstName,
                      lastName: student.lastName,
                      email: student.email,
                      avatar_url: student.avatar_url,
                      status: student.status as 'active' | 'inactive',
                      joinedDate: formatDate(student.enrolledDate),
                      lastActive: student.lastActive,
                      grade: student.grade
                    }))}
                    onStudentClick={(student) => {
                      const originalStudent = filteredStudents.find(s => s.id === student.id);
                      if (originalStudent) {
                        setSelectedStudent(originalStudent);
                        setModalMode('view');
                        setIsProfileModalOpen(true);
                      }
                    }}
                    onMessage={(student) => {
                      // Handle message functionality
                    }}
                    onViewProfile={(student) => {
                      const originalStudent = filteredStudents.find(s => s.id === student.id);
                      if (originalStudent) {
                        setSelectedStudent(originalStudent);
                        setModalMode('view');
                        setIsProfileModalOpen(true);
                      }
                    }}
                    onGrade={(student) => {
                      // Handle grade functionality
                    }}
                    onEdit={(student) => {
                      const originalStudent = filteredStudents.find(s => s.id === student.id);
                      if (originalStudent) {
                        setSelectedStudent(originalStudent);
                        setEditableStudent({
                          id: originalStudent.id,
                          firstName: originalStudent.firstName,
                          lastName: originalStudent.lastName,
                          grade: originalStudent.grade
                        });
                        setModalMode('edit');
                        setIsProfileModalOpen(true);
                      }
                    }}
                    onRemove={(student) => {
                      // Handle remove functionality
                    }}
                  />
                )}

                {preferences.teacherStudentView === 'tile' && (
                  <StudentTileView
                    students={filteredStudents.map(student => ({
                      id: student.id,
                      name: student.name,
                      firstName: student.firstName,
                      lastName: student.lastName,
                      email: student.email,
                      avatar: student.avatar,
                      avatar_url: student.avatar_url,
                      status: student.status as 'active' | 'inactive',
                      enrolledDate: formatDate(student.enrolledDate),
                      lastActive: student.lastActive,
                      grade: student.grade,
                      course: student.course,
                      progress: student.progress
                    }))}
                    onStudentClick={(student) => {
                      setSelectedStudent(student);
                      setModalMode('view');
                      setIsProfileModalOpen(true);
                    }}
                    onMessage={(student) => {
                      // Handle message functionality
                      toast({
                        title: "Message",
                        description: `Messaging ${student.name}...`,
                      });
                    }}
                    onViewProfile={(student) => {
                      setSelectedStudent(student);
                      setModalMode('view');
                      setIsProfileModalOpen(true);
                    }}
                    onGrade={(student) => {
                      // Handle grade functionality
                      toast({
                        title: "Grade",
                        description: `Grading ${student.name}...`,
                      });
                    }}
                    onEdit={(student) => {
                      setSelectedStudent(student);
                      setEditableStudent({
                        id: student.id,
                        firstName: student.firstName,
                        lastName: student.lastName,
                        grade: student.grade
                      });
                      setModalMode('edit');
                      setIsProfileModalOpen(true);
                    }}
                    onRemove={(student) => {
                      // Handle remove functionality
                      toast({
                        title: "Remove Student",
                        description: `Removing ${student.name}...`,
                      });
                    }}
                  />
                )}

                {preferences.teacherStudentView === 'list' && (
                  <StudentListView
                    students={filteredStudents.map(student => ({
                      id: student.id,
                      name: student.name,
                      firstName: student.firstName,
                      lastName: student.lastName,
                      email: student.email,
                      avatar: student.avatar,
                      avatar_url: student.avatar_url,
                      status: student.status as 'active' | 'inactive',
                      enrolledDate: formatDate(student.enrolledDate),
                      lastActive: student.lastActive,
                      grade: student.grade,
                      course: student.course,
                      progress: student.progress
                    }))}
                    onStudentClick={(student) => {
                      setSelectedStudent(student);
                      setModalMode('view');
                      setIsProfileModalOpen(true);
                    }}
                    onMessage={(student) => {
                      // Handle message functionality
                      toast({
                        title: "Message",
                        description: `Messaging ${student.name}...`,
                      });
                    }}
                    onViewProfile={(student) => {
                      setSelectedStudent(student);
                      setModalMode('view');
                      setIsProfileModalOpen(true);
                    }}
                    onGrade={(student) => {
                      // Handle grade functionality
                      toast({
                        title: "Grade",
                        description: `Grading ${student.name}...`,
                      });
                    }}
                    onEdit={(student) => {
                      setSelectedStudent(student);
                      setEditableStudent({
                        id: student.id,
                        firstName: student.firstName,
                        lastName: student.lastName,
                        grade: student.grade
                      });
                      setModalMode('edit');
                      setIsProfileModalOpen(true);
                    }}
                    onRemove={(student) => {
                      // Handle remove functionality
                      toast({
                        title: "Remove Student",
                        description: `Removing ${student.name}...`,
                      });
                    }}
                  />
                )}
              </>
            )}
          </div>
          
          {/* Pagination */}
          {!isTableLoading && totalPages > 1 && (
            <Pagination className="mt-6">
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      setCurrentPage((prev) => Math.max(1, prev - 1));
                    }}
                    className={currentPage === 1 ? "pointer-events-none opacity-50" : ""}
                  />
                </PaginationItem>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <PaginationItem key={page}>
                    <PaginationLink
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        setCurrentPage(page);
                      }}
                      isActive={currentPage === page}
                    >
                      {page}
                    </PaginationLink>
                  </PaginationItem>
                ))}
                <PaginationItem>
                  <PaginationNext
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      setCurrentPage((prev) => Math.min(totalPages, prev + 1));
                    }}
                    className={currentPage === totalPages ? "pointer-events-none opacity-50" : ""}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          )}

          {/* Empty State */}
          {!isTableLoading && filteredStudents.length === 0 && studentData.totalCount === 0 && (
            <div className="text-center py-12">
              <Users className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium mb-2">No Students Found</h3>
              <p className="text-muted-foreground mb-4">
                You don't have any students enrolled in your courses yet.
              </p>
                              <Button variant="outline" onClick={fetchStudentDataAndCount} disabled={loading} className="hover:bg-accent/5 hover:text-foreground dark:hover:bg-gray-800">
                  Refresh Data
                </Button>
            </div>
          )}
          
          {/* No Results State */}
          {!isTableLoading && filteredStudents.length === 0 && studentData.totalCount > 0 && (
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

      {/* Profile View/Edit Modal */}
      <Dialog open={isProfileModalOpen} onOpenChange={setIsProfileModalOpen}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>
                    {modalMode === 'edit' ? 'Edit Student Profile' : 'View Student Profile'}
                </DialogTitle>
                <DialogDescription>
                    {modalMode === 'edit' ? "Update the student's details below." : "Viewing student details."}
                </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                        <Label htmlFor="firstName">First Name</Label>
                        <Input
                            id="firstName"
                            value={(modalMode === 'edit' ? editableStudent.firstName : selectedStudent?.firstName) || ''}
                            onChange={(e) => modalMode === 'edit' && setEditableStudent(prev => ({ ...prev, firstName: e.target.value }))}
                            disabled={modalMode === 'view'}
                        />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="lastName">Last Name</Label>
                        <Input
                            id="lastName"
                            value={(modalMode === 'edit' ? editableStudent.lastName : selectedStudent?.lastName) || ''}
                            onChange={(e) => modalMode === 'edit' && setEditableStudent(prev => ({ ...prev, lastName: e.target.value }))}
                            disabled={modalMode === 'view'}
                        />
                    </div>
                </div>
                <div className="grid gap-2">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" value={selectedStudent?.email || ''} disabled />
                </div>
                <div className="grid gap-2">
                    <Label htmlFor="grade">Grade</Label>
                    <Select
                        value={(modalMode === 'edit' ? editableStudent.grade : selectedStudent?.grade) || ''}
                        onValueChange={(value) => modalMode === 'edit' && setEditableStudent(prev => ({ ...prev, grade: value }))}
                        disabled={modalMode === 'view'}
                    >
                        <SelectTrigger>
                            <SelectValue placeholder="Select a grade" />
                        </SelectTrigger>
                        <SelectContent>
                            {[...Array(12)].map((_, i) => (
                                <SelectItem key={i + 1} value={`${i + 1}`}>{`${i + 1}${['st', 'nd', 'rd'][i] ?? 'th'} Grade`}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>
            <DialogFooter>
                <Button variant="outline" onClick={() => setIsProfileModalOpen(false)} className="transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md hover:shadow-primary/10 hover:bg-primary/5 hover:border-primary/30 hover:text-primary">
                    {modalMode === 'edit' ? 'Cancel' : 'Close'}
                </Button>
                {modalMode === 'edit' && (
                    <Button onClick={handleUpdateStudent} disabled={isUpdatingUser} className="transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/20">
                        {isUpdatingUser ? "Saving..." : "Save Changes"}
                    </Button>
                )}
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 