import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { EmptyState } from '@/components/EmptyState';
import { ContentLoader } from '@/components/ContentLoader';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import {
  Download,
  Eye,
  Trash2,
  HardDrive,
  Wifi,
  WifiOff,
  CheckCircle,
  Clock,
  AlertCircle,
  BookOpen,
  Play,
  Pause,
  RotateCcw
} from 'lucide-react';

interface OfflineLearningProps {
  userProfile: {
    id: string;
    first_name?: string;
    last_name?: string;
    role?: string;
  };
}

interface Course {
  id: string;
  title: string;
  subtitle: string;
  image_url: string;
  progress: number;
  total_lessons: number;
  completed_lessons: number;
  last_accessed: string;
}

interface DownloadedCourse extends Course {
  downloadDate: string;
  size: string;
  downloadStatus: 'completed' | 'downloading' | 'paused' | 'error';
  downloadProgress?: number;
}

export const OfflineLearning = ({ userProfile }: OfflineLearningProps) => {
  const [enrolledCourses, setEnrolledCourses] = useState<Course[]>([]);
  const [downloadedCourses, setDownloadedCourses] = useState<DownloadedCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [storageUsed, setStorageUsed] = useState(0);
  const [storageLimit] = useState(5000); // 5GB limit in MB
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const navigate = useNavigate();

  // Mock data for demonstration - replace with actual data fetching
  const mockDownloadedCourses: DownloadedCourse[] = [
    {
      id: '1',
      title: 'Introduction to React',
      subtitle: 'Learn the basics of React development',
      image_url: '/placeholder.svg',
      progress: 75,
      total_lessons: 12,
      completed_lessons: 9,
      last_accessed: '2024-01-15',
      downloadDate: '2024-01-10',
      size: '245 MB',
      downloadStatus: 'completed'
    },
    {
      id: '2',
      title: 'Advanced JavaScript',
      subtitle: 'Master JavaScript concepts',
      image_url: '/placeholder.svg',
      progress: 30,
      total_lessons: 15,
      completed_lessons: 4,
      last_accessed: '2024-01-14',
      downloadDate: '2024-01-12',
      size: '180 MB',
      downloadStatus: 'downloading',
      downloadProgress: 65
    }
  ];

  // Define fetchEnrolledCourses function with useCallback to prevent dependency issues
  const fetchEnrolledCourses = useCallback(async () => {
    if (!userProfile?.id) return;

    // Skip fetch when offline to prevent failed requests
    if (!navigator.onLine) {
      console.log('🔴 OfflineLearning: Offline - skipping courses fetch, using empty state');
      setEnrolledCourses([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_student_courses_with_progress', { 
        student_id: userProfile.id 
      });

        if (error) {
          console.error('Error fetching courses:', error);
          toast.error('Failed to load your courses.');
          return;
        }

        if (data) {
          const coursesWithSignedUrls = await Promise.all(data.map(async (course: any) => {
            let imageUrl = '/placeholder.svg';
            // Only create signed URLs if online
            if (course.image_url && navigator.onLine) {
              try {
                const { data: signedUrlData } = await supabase.storage
                  .from('dil-lms')
                  .createSignedUrl(course.image_url, 3600);
                if (signedUrlData) {
                  imageUrl = signedUrlData.signedUrl;
                }
              } catch (error) {
                console.log('🔴 OfflineLearning: Failed to create signed URL (might be offline):', error);
                // Keep placeholder image
              }
            }
            return {
              id: course.course_id,
              title: course.title,
              subtitle: course.subtitle,
              image_url: imageUrl,
              progress: course.progress_percentage,
              total_lessons: course.total_lessons,
              completed_lessons: course.completed_lessons,
              last_accessed: course.last_accessed,
            };
          }));
          setEnrolledCourses(coursesWithSignedUrls);
        }

        // Set mock downloaded courses for demo
        setDownloadedCourses(mockDownloadedCourses);
        setStorageUsed(425); // Mock storage usage
      } catch (error) {
        console.error('Error:', error);
        toast.error('Failed to load courses.');
      } finally {
        setLoading(false);
      }
    }, [userProfile?.id]);

  useEffect(() => {
    // Listen for online/offline status
    const handleOnline = () => {
      console.log('🟢 OfflineLearning: Back online - can fetch courses');
      setIsOnline(true);
      // Refetch courses when back online
      if (userProfile?.id) {
        fetchEnrolledCourses();
      }
    };
    const handleOffline = () => {
      console.log('🔴 OfflineLearning: Gone offline - showing offline state');
      setIsOnline(false);
      // Clear any existing course data that might have signed URLs
      setEnrolledCourses([]);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [userProfile?.id, fetchEnrolledCourses]);

  useEffect(() => {
    fetchEnrolledCourses();
  }, [fetchEnrolledCourses]);

  const handleDownloadCourse = (courseId: string) => {
    if (!isOnline) {
      toast.error('You need an internet connection to download courses.');
      return;
    }

    // Mock download implementation
    toast.success('Course download started!');
    console.log('Downloading course:', courseId);
  };

  const handleViewCourse = (courseId: string) => {
    navigate(`/dashboard/courses/content/${courseId}`);
  };

  const handleDeleteCourse = (courseId: string) => {
    // Mock delete implementation
    setDownloadedCourses(prev => prev.filter(course => course.id !== courseId));
    toast.success('Course removed from offline storage.');
  };

  const handlePauseResume = (courseId: string, action: 'pause' | 'resume') => {
    // Mock pause/resume implementation
    toast.info(`Download ${action}d`);
  };

  const handleRetryDownload = (courseId: string) => {
    // Mock retry implementation
    toast.info('Retrying download...');
  };

  const storagePercentage = (storageUsed / storageLimit) * 100;

  if (loading) {
    return <ContentLoader />;
  }

  return (
    <div className="space-y-8">
      {/* Premium Header Section */}
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-primary/5 rounded-3xl"></div>
        <div className="relative p-4 md:p-8 rounded-3xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 md:w-12 md:h-12 bg-gradient-to-br from-primary/10 to-primary/20 rounded-2xl flex items-center justify-center shadow-lg">
                <Download className="w-5 h-5 md:w-6 md:h-6 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl md:text-4xl font-bold tracking-tight bg-gradient-to-r from-primary via-primary to-primary/80 bg-clip-text text-transparent">
                  Offline Learning
                </h1>
                <p className="text-sm md:text-lg text-muted-foreground font-light">
                  Download your courses for offline access
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {isOnline ? (
                <Badge variant="default" className="bg-green-100 text-green-800 border-green-200 shadow-sm">
                  <Wifi className="w-3 h-3 mr-1" />
                  Online
                </Badge>
              ) : (
                <Badge variant="destructive" className="shadow-sm">
                  <WifiOff className="w-3 h-3 mr-1" />
                  Offline
                </Badge>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Storage Usage */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <HardDrive className="w-5 h-5" />
            Storage Usage
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>{storageUsed} MB used</span>
              <span>{storageLimit} MB available</span>
            </div>
            <Progress value={storagePercentage} className="h-2" />
            <p className="text-xs text-muted-foreground">
              {Math.round(storageLimit - storageUsed)} MB remaining
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Main Content Tabs */}
      <Tabs defaultValue="available" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="available" className="flex items-center gap-2">
            <Download className="w-4 h-4" />
            Available for Download ({enrolledCourses.length})
          </TabsTrigger>
          <TabsTrigger value="downloaded" className="flex items-center gap-2">
            <BookOpen className="w-4 h-4" />
            Downloaded ({downloadedCourses.length})
          </TabsTrigger>
        </TabsList>

        {/* Available Courses Tab */}
        <TabsContent value="available" className="space-y-4">
          {enrolledCourses.length === 0 ? (
            <EmptyState
              icon={<BookOpen className="h-8 w-8 text-muted-foreground" />}
              title="No courses available"
              description="You don't have any enrolled courses to download yet."
            />
          ) : (
            <div className="space-y-3">
              {enrolledCourses.map((course) => (
                <Card key={course.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      {/* Course Image */}
                      <img
                        src={course.image_url}
                        alt={course.title}
                        className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
                      />
                      
                      {/* Course Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between mb-2">
                          <div className="min-w-0 flex-1">
                            <h3 className="font-semibold text-base line-clamp-1">{course.title}</h3>
                            <p className="text-sm text-muted-foreground line-clamp-1 mt-1">
                              {course.subtitle}
                            </p>
                          </div>
                          <Badge variant="outline" className="text-xs ml-3 flex-shrink-0">
                            {course.total_lessons} lessons
                          </Badge>
                        </div>
                        
                        {/* Progress and Stats Row */}
                        <div className="flex items-center gap-6 mb-3">
                          <div className="flex-1">
                            <div className="flex justify-between text-xs text-muted-foreground mb-1">
                              <span>Progress</span>
                              <span>{course.progress}%</span>
                            </div>
                            <Progress value={course.progress} className="h-2" />
                          </div>
                          
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <CheckCircle className="w-3 h-3" />
                              <span>{course.completed_lessons}/{course.total_lessons}</span>
                            </div>
                            {course.last_accessed && (
                              <div className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                <span>Last: {new Date(course.last_accessed).toLocaleDateString()}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Action Button */}
                      <div className="flex-shrink-0">
                        <Button
                          onClick={() => handleDownloadCourse(course.id)}
                          disabled={!isOnline}
                          size="sm"
                          className="min-w-[140px]"
                        >
                          <Download className="w-4 h-4 mr-2" />
                          Download Course
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Downloaded Courses Tab */}
        <TabsContent value="downloaded" className="space-y-4">
          {downloadedCourses.length === 0 ? (
            <EmptyState
              icon={<Download className="h-8 w-8 text-muted-foreground" />}
              title="No downloaded courses"
              description="Download some courses to access them offline."
            />
          ) : (
            <div className="space-y-4">
              {downloadedCourses.map((course) => (
                <Card key={course.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <img
                        src={course.image_url}
                        alt={course.title}
                        className="w-20 h-20 rounded-lg object-cover"
                      />
                      
                      <div className="flex-1 space-y-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className="font-semibold text-lg">{course.title}</h3>
                            <p className="text-muted-foreground">{course.subtitle}</p>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            {course.downloadStatus === 'completed' && (
                              <Badge variant="default" className="bg-green-100 text-green-800">
                                <CheckCircle className="w-3 h-3 mr-1" />
                                Downloaded
                              </Badge>
                            )}
                            {course.downloadStatus === 'downloading' && (
                              <Badge variant="secondary">
                                <Clock className="w-3 h-3 mr-1" />
                                Downloading
                              </Badge>
                            )}
                            {course.downloadStatus === 'error' && (
                              <Badge variant="destructive">
                                <AlertCircle className="w-3 h-3 mr-1" />
                                Error
                              </Badge>
                            )}
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground">
                          <div>Size: {course.size}</div>
                          <div>Downloaded: {new Date(course.downloadDate).toLocaleDateString()}</div>
                          <div>Progress: {course.progress}% complete</div>
                          <div>Lessons: {course.completed_lessons}/{course.total_lessons}</div>
                        </div>

                        {course.downloadStatus === 'downloading' && course.downloadProgress && (
                          <div className="space-y-2">
                            <div className="flex justify-between text-xs">
                              <span>Downloading...</span>
                              <span>{course.downloadProgress}%</span>
                            </div>
                            <Progress value={course.downloadProgress} className="h-2" />
                          </div>
                        )}

                        <div className="flex items-center gap-2 pt-2">
                          {course.downloadStatus === 'completed' && (
                            <Button
                              onClick={() => handleViewCourse(course.id)}
                              size="sm"
                              variant="default"
                            >
                              <Eye className="w-4 h-4 mr-2" />
                              View Course
                            </Button>
                          )}
                          
                          {course.downloadStatus === 'downloading' && (
                            <Button
                              onClick={() => handlePauseResume(course.id, 'pause')}
                              size="sm"
                              variant="outline"
                            >
                              <Pause className="w-4 h-4 mr-2" />
                              Pause
                            </Button>
                          )}
                          
                          {course.downloadStatus === 'error' && (
                            <Button
                              onClick={() => handleRetryDownload(course.id)}
                              size="sm"
                              variant="outline"
                            >
                              <RotateCcw className="w-4 h-4 mr-2" />
                              Retry
                            </Button>
                          )}

                          <Button
                            onClick={() => handleDeleteCourse(course.id)}
                            size="sm"
                            variant="outline"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};
