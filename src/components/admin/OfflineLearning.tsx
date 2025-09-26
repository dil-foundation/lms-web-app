import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { 
  Download, 
  HardDrive, 
  RefreshCw, 
  Clock, 
  CheckCircle, 
  AlertTriangle,
  Trash2,
  Pause,
  Play,
  Users,
  BookOpen,
  Wifi,
  WifiOff,
  Search,
  Filter,
  Star,
  PlayCircle
} from 'lucide-react';
import { useOfflineManager } from '@/hooks/useOfflineManager';
import { NetworkStatusBanner } from '@/components/offline/NetworkStatusBanner';
import { StorageUsageCard } from '@/components/offline/StorageUsageCard';
import { SyncStatusPanel } from '@/components/offline/SyncStatusPanel';
import SyncStatusIndicator from '../offline/SyncStatusIndicator';
import { backgroundSyncService } from '@/services/backgroundSyncService';
import { formatBytes } from '@/utils/formatBytes';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { offlineDatabase } from '@/services/offlineDatabase';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';

interface UserProfile {
    id: string;
  role: string;
    first_name?: string;
    last_name?: string;
  email: string;
}

interface Course {
  id: string;
  title: string;
  subtitle: string;
  image_url: string;
  progress?: number;
  total_lessons?: number;
  completed_lessons?: number;
  last_accessed?: string;
  instructor_name?: string;
  duration?: string;
  level?: string;
  downloadStatus?: 'not_downloaded' | 'downloading' | 'completed' | 'failed';
  downloadProgress?: number;
}

interface OfflineLearningProps {
  userProfile: UserProfile;
}


export const OfflineLearning: React.FC<OfflineLearningProps> = ({ userProfile }) => {
  const { user } = useAuth();
  const { isOnline } = useNetworkStatus();
  const {
    storageUsage,
    downloadQueue,
    syncStatus,
    activityLog,
    settings,
    syncData,
    downloadCourse,
    deleteCourse,
    updateSettings,
    clearAllData
  } = useOfflineManager();

  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [courses, setCourses] = useState<Course[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'downloaded' | 'available'>('all');

  useEffect(() => {
    fetchCourses(true); // Initial load
    
    // Initialize background sync service
    backgroundSyncService.init().catch(error => {
      console.error('[OfflineLearning] Failed to initialize background sync:', error);
    });
    
    return () => {
      backgroundSyncService.destroy();
    };
  }, [user]);

  // Refresh when network status changes
  useEffect(() => {
    if (!isInitialLoad) {
      console.log('[OfflineLearning] Network status changed, online:', isOnline);
      fetchCourses(false); // Refresh data when network status changes
    }
  }, [isOnline, isInitialLoad]);

  // Refresh courses when download status changes (without showing loading)
  useEffect(() => {
    if (!isInitialLoad && downloadQueue && downloadQueue.length > 0) {
      // Check for completed downloads and refresh
      const hasCompletedDownloads = downloadQueue.some(item => item.status === 'completed');
      if (hasCompletedDownloads) {
        fetchCourses(false); // Background refresh
      }
    }
  }, [downloadQueue, isInitialLoad]);

  // Refresh courses periodically to sync with offline database (background only)
  useEffect(() => {
    if (isInitialLoad) return; // Don't start periodic refresh until initial load is done
    
    const interval = setInterval(() => {
      // Only refresh if online or if we need to update offline status
      if (isOnline || courses.length === 0) {
        fetchCourses(false); // Background refresh without loading state
      }
    }, 10000); // Refresh every 10 seconds (less frequent)

    return () => clearInterval(interval);
  }, [isInitialLoad, isOnline, courses.length]);

  // Handler functions - defined with useCallback to ensure stable references
  const handleViewCourse = useCallback((courseId: string) => {
    console.log('[OfflineLearning] Navigating to course content:', courseId);
    navigate(`/dashboard/courses/${courseId}/content`);
  }, [navigate]);

  const handleDownload = useCallback(async (course: Course) => {
    console.log('[OfflineLearning] Starting download for course:', course.title);
    try {
      await downloadCourse(course.id, course.title);
      toast.success(`Started downloading ${course.title}`);
      // Refresh courses to show updated status
      setTimeout(() => fetchCourses(false), 1000);
    } catch (error) {
      console.error('Download failed:', error);
      toast.error('Failed to start download');
    }
  }, [downloadCourse]);

  const handleDelete = useCallback(async (courseId: string) => {
    console.log('[OfflineLearning] Deleting course:', courseId);
    try {
      await deleteCourse(courseId);
      toast.success('Course deleted from offline storage');
      // Refresh courses to update UI
      fetchCourses(false);
    } catch (error) {
      console.error('Delete failed:', error);
      toast.error('Failed to delete course');
    }
  }, [deleteCourse]);

  const fetchCourses = useCallback(async (showLoading: boolean = false) => {
    if (!user) return;
    
    if (showLoading) {
      setIsLoading(true);
    }
    
    try {
      let enrollments: any[] = [];
      let progressData: any[] = [];

      // Double-check online status with navigator.onLine
      let actuallyOnline = isOnline && navigator.onLine;
      console.log('[OfflineLearning] Network status check:', { 
        hookIsOnline: isOnline, 
        navigatorOnLine: navigator.onLine, 
        actuallyOnline 
      });

      // Force offline if we're in DevTools offline mode or if network requests are failing
      if (!navigator.onLine) {
        console.log('[OfflineLearning] Forcing offline mode - navigator.onLine is false');
        actuallyOnline = false;
      }

      if (actuallyOnline) {
        try {
          // Online: Fetch from Supabase
          console.log('[OfflineLearning] Fetching courses from server (online)');
          
          // For admins, fetch all courses. For students, fetch enrolled courses only
          const userRole = userProfile?.role || 'student';
          
          let courseQuery;
          if (userRole === 'admin') {
            // Admin: Get all courses
            console.log('[OfflineLearning] Admin user - fetching all courses');
            const { data: allCourses, error: courseError } = await supabase
              .from('courses')
              .select(`
                id,
                title,
                subtitle,
                image_url,
                duration,
                sections:course_sections (
                  id,
                  lessons:course_lessons (
                    id,
                    contentItems:course_lesson_content(id)
                  )
                ),
                members:course_members (
                  role,
                  profile:profiles (
                    first_name,
                    last_name
                  )
                ),
                level:course_levels(name)
              `);
            
            if (courseError) throw courseError;
            
            // Convert to enrollment format
            enrollments = allCourses?.map(course => ({
              course_id: course.id,
              courses: course
            })) || [];
            
          } else {
            // Student: Get enrolled courses only
            console.log('[OfflineLearning] Student user - fetching enrolled courses');
            const { data: onlineEnrollments, error: enrollmentError } = await supabase
              .from('course_members')
              .select(`
                course_id,
                courses:course_id (
                  id,
                  title,
                  subtitle,
                  image_url,
                  duration,
                  sections:course_sections (
                    id,
                    lessons:course_lessons (
                      id,
                      contentItems:course_lesson_content(id)
                    )
                  ),
                  members:course_members!inner (
                    role,
                    profile:profiles (
                      first_name,
                      last_name
                    )
                  ),
                  level:course_levels(name)
                )
              `)
              .eq('user_id', user.id)
              .eq('role', 'student');

            if (enrollmentError) throw enrollmentError;
            enrollments = onlineEnrollments || [];
          }

          // Get user progress for all courses
          const courseIds = enrollments?.map(e => e.course_id) || [];
          if (courseIds.length > 0) {
            const { data: progress, error: progressError } = await supabase
              .from('user_content_item_progress')
              .select('*')
              .eq('user_id', user.id);

            if (!progressError) {
              progressData = progress || [];
            }
          }
          
          console.log('[OfflineLearning] Successfully fetched', enrollments.length, 'courses from server');
        } catch (networkError) {
          console.warn('[OfflineLearning] Network request failed, falling back to offline data:', networkError);
          // Fallback to offline data
          actuallyOnline = false;
        }
      }
      
      if (!actuallyOnline) {
        // Offline: Use cached data
        console.log('[OfflineLearning] Using cached data (offline)');
        
        try {
          console.log('[OfflineLearning] Attempting to fetch from offline database...');
          const offlineCourses = await offlineDatabase.getAllCourses();
          console.log('[OfflineLearning] Raw offline courses:', offlineCourses);
          console.log('[OfflineLearning] Found', offlineCourses.length, 'cached courses');
          
          if (offlineCourses.length === 0) {
            console.warn('[OfflineLearning] No offline courses found! Check if courses were downloaded properly.');
          }
          
          // Convert offline courses to the expected format
          enrollments = offlineCourses.map(course => {
            console.log('[OfflineLearning] Processing offline course:', course.title);
            return {
              course_id: course.id,
              courses: {
                id: course.id,
                title: course.title,
                subtitle: course.subtitle || '',
                image_url: course.image_url || '',
                duration: course.duration || 'N/A',
                sections: course.sections || [],
                members: [{ 
                  role: 'teacher', 
                  profile: { 
                    first_name: course.instructor?.name?.split(' ')[0] || 'Unknown',
                    last_name: course.instructor?.name?.split(' ')[1] || ''
                  }
                }],
                level: { name: course.level || 'All Levels' }
              }
            };
          });

          // Get offline progress
          console.log('[OfflineLearning] Fetching offline progress for user:', user.id);
          const allProgress = await offlineDatabase.getProgress(user.id);
          console.log('[OfflineLearning] Found offline progress:', allProgress.length, 'items');
          progressData = allProgress.map(p => ({
            lesson_content_id: p.contentId,
            completed_at: p.completed ? new Date() : null,
            updated_at: p.updatedAt
          }));
        } catch (offlineError) {
          console.warn('[OfflineLearning] Failed to load offline data:', offlineError);
          enrollments = [];
          progressData = [];
        }
      }


      // Get offline course data
      const offlineCourses = await offlineDatabase.getAllCourses();
      const offlineCoursesMap = new Map(offlineCourses.map(oc => [oc.id, oc]));

      // Map courses with progress
      console.log('[OfflineLearning] Mapping', enrollments?.length || 0, 'enrollments to courses');
      const mappedCourses: Course[] = await Promise.all(enrollments?.map(async (enrollment: any) => {
        console.log('[OfflineLearning] Processing enrollment:', enrollment);
        const course = enrollment?.courses;
        if (!course) {
          console.warn('[OfflineLearning] Enrollment has no course data:', enrollment);
          return null;
        }
        console.log('[OfflineLearning] Processing course:', course.title, 'with ID:', course.id);

        // Calculate progress with null checks
        const sections = Array.isArray(course.sections) ? course.sections : [];
        const allLessons = sections.flatMap((s: any) => Array.isArray(s?.lessons) ? s.lessons : []);
        const allContentItems = allLessons.flatMap((l: any) => Array.isArray(l?.contentItems) ? l.contentItems : []);
        const completedContentItems = Array.isArray(progressData) ? progressData.filter(p => 
          p?.completed_at && allContentItems.some((ci: any) => ci?.id === p?.lesson_content_id)
        ) : [];
        
        const progressPercentage = allContentItems.length > 0 
          ? Math.round((completedContentItems.length / allContentItems.length) * 100) 
          : 0;

        // Get instructor name with null checks
        const members = Array.isArray(course.members) ? course.members : [];
        const teacher = members.find((m: any) => m?.role === 'teacher');
        const instructorName = teacher?.profile 
          ? `${teacher.profile.first_name || ''} ${teacher.profile.last_name || ''}`.trim() || 'Unknown'
          : 'Unknown';

        // Get last accessed with null checks
        const validProgressData = Array.isArray(progressData) ? progressData : [];
        const lastAccessedProgress = validProgressData
          .filter(p => p && allContentItems.some((ci: any) => ci?.id === p?.lesson_content_id))
          .sort((a, b) => new Date(b?.updated_at || 0).getTime() - new Date(a?.updated_at || 0).getTime())[0];

        // Get offline status
        const offlineCourse = offlineCoursesMap.get(course.id);
        const downloadStatus = offlineCourse?.downloadStatus || 'not_downloaded';
        const downloadProgress = offlineCourse?.downloadProgress || 0;

        const mappedCourse = {
          id: course.id || '',
          title: course.title || 'Untitled Course',
          subtitle: course.subtitle || '',
          image_url: course.image_url || '',
          progress: progressPercentage,
          total_lessons: allLessons.length,
          completed_lessons: Math.floor((progressPercentage / 100) * allLessons.length),
          last_accessed: lastAccessedProgress?.updated_at,
          instructor_name: instructorName,
          duration: course.duration || 'N/A',
          level: course.level?.name || 'All Levels',
          downloadStatus: downloadStatus as 'not_downloaded' | 'downloading' | 'completed' | 'failed',
          downloadProgress: downloadProgress
        };
        
        console.log('[OfflineLearning] Mapped course:', mappedCourse.title, 'with download status:', mappedCourse.downloadStatus);
        return mappedCourse;
      }) || []);

      const validCourses = mappedCourses.filter(Boolean) as Course[];

      console.log('[OfflineLearning] Setting courses:', validCourses.length, 'courses found');
      console.log('[OfflineLearning] Course details:', validCourses.map(c => ({ 
        id: c.id, 
        title: c.title, 
        downloadStatus: c.downloadStatus 
      })));
      
      setCourses(validCourses);
      
      // Mark initial load as complete
      if (isInitialLoad) {
        setIsInitialLoad(false);
      }
    } catch (error: any) {
      console.error('Error fetching courses:', error);
      console.error('Error details:', {
        message: error?.message,
        code: error?.code,
        details: error?.details,
        hint: error?.hint
      });
      
      if (showLoading) {
        toast.error('Failed to load courses: ' + (error?.message || 'Unknown error'));
      }
    } finally {
      if (showLoading) {
        setIsLoading(false);
      }
    }
  }, [user, isOnline, userProfile]);

  // Remove duplicate - already defined above with useCallback
  /*const handleDownload = async (course: Course) => {
    try {
      await downloadCourse(course.id, course.title);
      
      // Immediately update UI to show downloading status
      setCourses(prevCourses => 
        prevCourses.map(c => 
          c.id === course.id 
            ? { ...c, downloadStatus: 'downloading' as const, downloadProgress: 0 }
            : c
        )
      );

      // Refresh after a short delay (background refresh)
      setTimeout(() => {
        fetchCourses(false);
      }, 3000);
      
    } catch (error: any) {
      console.error('Download failed:', error);
      toast.error('Download failed: ' + error.message);
    }
  }; */

  // Additional handlers
  const handleSync = async () => {
    await syncData();
  };

  const handleClearAll = async () => {
    if (confirm('Are you sure you want to clear all offline data? This cannot be undone.')) {
      await clearAllData();
    }
  };

  const filteredCourses = courses.filter(course => {
    const matchesSearch = course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         course.subtitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         course.instructor_name?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesFilter = filterStatus === 'all' || 
                         (filterStatus === 'downloaded' && course.downloadStatus === 'completed') ||
                         (filterStatus === 'available' && course.downloadStatus !== 'completed');
    
    return matchesSearch && matchesFilter;
  });

  if (isLoading && isInitialLoad) {
    return (
      <div className="space-y-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Offline Learning</h1>
          <p className="text-muted-foreground">
            Download courses for offline access and manage your local content
          </p>
        </div>
        <div className="flex items-center gap-2">
          <SyncStatusIndicator />
          <Button onClick={handleSync} variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 mr-2" />
            Sync Now
          </Button>
          <Button onClick={handleClearAll} variant="destructive" size="sm">
            <Trash2 className="w-4 h-4 mr-2" />
            Clear All
          </Button>
        </div>
      </div>

      {/* Network Status */}
      <NetworkStatusBanner />

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StorageUsageCard usage={storageUsage} />
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Download Queue</CardTitle>
            <Download className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{downloadQueue?.length || 0}</div>
            <p className="text-xs text-muted-foreground">
              {downloadQueue?.filter(q => q?.status === 'downloading')?.length || 0} active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sync Status</CardTitle>
            <RefreshCw className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {syncStatus.isOnline ? 'Online' : 'Offline'}
            </div>
            <p className="text-xs text-muted-foreground">
              Last sync: {syncStatus.lastSync ? new Date(syncStatus.lastSync).toLocaleString() : 'Never'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Sync Status Panel */}
      <SyncStatusPanel />

      {/* Course Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Search courses..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          <Button
            variant={filterStatus === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilterStatus('all')}
          >
            All Courses
          </Button>
          <Button
            variant={filterStatus === 'downloaded' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilterStatus('downloaded')}
          >
            Downloaded
          </Button>
          <Button
            variant={filterStatus === 'available' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilterStatus('available')}
          >
            Available
          </Button>
        </div>
      </div>

      {/* Courses List */}
      <Card>
        <CardHeader>
          <CardTitle>Your Courses ({filteredCourses.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredCourses.length === 0 ? (
            <div className="text-center py-12">
              <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No courses found</h3>
              <p className="text-muted-foreground">
                {courses.length === 0 
                  ? "You're not enrolled in any courses yet." 
                  : "No courses match your current search or filter."}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredCourses.map((course) => (
                <div key={course.id} className="flex items-center gap-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                  {/* Download Status Indicator */}
                  <div className="flex-shrink-0">
                    {course.downloadStatus === 'completed' && (
                      <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                        <CheckCircle className="w-6 h-6 text-green-600" />
                      </div>
                    )}
                    {course.downloadStatus === 'downloading' && (
                      <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                        <Download className="w-6 h-6 text-blue-600" />
                      </div>
                    )}
                    {course.downloadStatus === 'failed' && (
                      <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                        <AlertTriangle className="w-6 h-6 text-red-600" />
                      </div>
                    )}
                    {course.downloadStatus === 'not_downloaded' && (
                      <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                        <BookOpen className="w-6 h-6 text-gray-600" />
                      </div>
                    )}
                  </div>

                  {/* Course Info */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-lg mb-1 truncate">{course.title}</h3>
                    <p className="text-sm text-muted-foreground mb-2 truncate">{course.subtitle}</p>
                    
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        <span>{course.instructor_name}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <BookOpen className="w-3 h-3" />
                        <span>{course.total_lessons} lessons</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span>{course.duration}</span>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {course.level}
                      </Badge>
                    </div>

                    {/* Progress */}
                    {course.progress !== undefined && course.progress > 0 && (
                      <div className="mt-3">
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="text-muted-foreground">Progress</span>
                          <span className="font-medium text-primary">{course.progress}%</span>
                        </div>
                        <Progress value={course.progress} className="h-1.5" />
                      </div>
                    )}
                  </div>

                  {/* Download Actions */}
                  <div className="flex items-center gap-2">
                    {course.downloadStatus === 'not_downloaded' && (
                      <Button
                        onClick={() => handleDownload(course)}
                        size="sm"
                        className="h-8"
                      >
                        <Download className="w-3 h-3 mr-2" />
                        Download
                      </Button>
                    )}
                    
                    {course.downloadStatus === 'downloading' && (
                      <div className="flex items-center gap-2">
                        <div className="w-20">
                          <Progress value={course.downloadProgress || 0} className="h-1.5" />
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {course.downloadProgress || 0}%
                        </span>
                        <Button size="sm" variant="outline" className="h-8 w-8 p-0">
                          <Pause className="w-3 h-3" />
                        </Button>
                      </div>
                    )}
                    
                    {course.downloadStatus === 'completed' && (
                      <div className="flex items-center gap-2">
                        <Button
                          onClick={() => handleViewCourse(course.id)}
                          size="sm"
                          className="h-8"
                        >
                          <PlayCircle className="w-3 h-3 mr-2" />
                          View Course
                        </Button>
                        <Badge variant="default" className="text-xs">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Downloaded
                        </Badge>
                        <Button
                          onClick={() => handleDelete(course.id)}
                          size="sm"
                          variant="outline"
                          className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    )}
                    
                    {course.downloadStatus === 'failed' && (
                      <div className="flex items-center gap-2">
                        <Badge variant="destructive" className="text-xs">
                          <AlertTriangle className="w-3 h-3 mr-1" />
                          Failed
                        </Badge>
                        <Button
                          onClick={() => handleDownload(course)}
                          size="sm"
                          variant="outline"
                          className="h-8"
                        >
                          Retry
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Download Queue */}
      {downloadQueue && downloadQueue.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Download Queue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {downloadQueue.map((item) => (
                <div key={item.courseId} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <h4 className="font-medium">{item.courseName}</h4>
                    <div className="flex items-center gap-4 mt-2">
                      <Progress value={item.progress} className="flex-1" />
                      <span className="text-sm text-muted-foreground">
                        {item.progress}%
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <Badge variant={
                      item.status === 'completed' ? 'default' :
                      item.status === 'downloading' ? 'secondary' :
                      item.status === 'paused' ? 'outline' :
                      'destructive'
                    }>
                      {item.status}
                    </Badge>
                    {item.status === 'downloading' && (
                      <Button size="sm" variant="outline">
                        <Pause className="w-4 h-4" />
                      </Button>
                    )}
                    {item.status === 'paused' && (
                      <Button size="sm" variant="outline">
                        <Play className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Activity Log */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {activityLog?.slice(0, 10)?.map((event, index) => (
              <div key={index} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                <div className="flex-shrink-0 mt-0.5">
                  {event?.type === 'download_completed' && <CheckCircle className="w-4 h-4 text-green-500" />}
                  {event?.type === 'download_started' && <Download className="w-4 h-4 text-blue-500" />}
                  {event?.type === 'sync_completed' && <RefreshCw className="w-4 h-4 text-green-500" />}
                  {event?.type === 'error' && <AlertTriangle className="w-4 h-4 text-red-500" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{event?.message || 'Unknown event'}</p>
                  <p className="text-xs text-muted-foreground">
                    {event?.timestamp ? new Date(event.timestamp).toLocaleString() : 'Unknown time'}
                  </p>
                </div>
              </div>
            ))}
            {(!activityLog || activityLog.length === 0) && (
              <p className="text-center text-muted-foreground py-8">
                No activity yet. Start by downloading a course!
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};