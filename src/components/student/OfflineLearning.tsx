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
  RotateCcw,
  Loader2
} from 'lucide-react';
import { getCourseDownloadService, DownloadOptions } from '@/services/courseDownloadService';
import { getOfflineDatabaseUtils } from '@/services/offlineDatabaseUtils';

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
  const [downloadingCourses, setDownloadingCourses] = useState<Set<string>>(new Set());
  const [downloadProgress, setDownloadProgress] = useState<Record<string, number>>({});
  const [activeTab, setActiveTab] = useState<string>(isOnline ? "available" : "downloaded");
  const navigate = useNavigate();

  // Services
  const downloadService = getCourseDownloadService();
  const dbUtils = getOfflineDatabaseUtils();

  // Format bytes to human readable format
  const formatBytes = useCallback((bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }, []);

  // Load downloaded courses from offline database
  const loadDownloadedCourses = useCallback(async () => {
    try {
      const offlineCourses = await dbUtils.getAllCourses();
      
      const downloadedCoursesData: DownloadedCourse[] = await Promise.all(
        offlineCourses.map(async (course) => {
          let imageUrl = '/placeholder.svg';
          
          // Try to get offline image if available
          if (course.image_url) {
            try {
              // Check if we have the course image stored as an asset
              const courseAssets = await dbUtils.getAssetsByCourse(course.id);
              const imageAsset = courseAssets.find(asset => 
                asset.type === 'image' && asset.filename?.includes('course-image')
              );
              
              if (imageAsset) {
                // Create blob URL for offline image
                imageUrl = URL.createObjectURL(imageAsset.blob);
              } else if (navigator.onLine && course.image_url) {
                // Fallback to online signed URL if online and no offline image
                try {
                  const { data: signedUrlData } = await supabase.storage
                    .from('dil-lms')
                    .createSignedUrl(course.image_url, 3600);
                  if (signedUrlData) {
                    imageUrl = signedUrlData.signedUrl;
                  }
                } catch (error) {
                  console.log('Failed to create signed URL for offline course image:', error);
                }
              }
            } catch (error) {
              console.log('Failed to load offline course image:', error);
            }
          }
          
          return {
            id: course.id,
            title: course.title,
            subtitle: course.subtitle || '',
            image_url: imageUrl,
            progress: 0, // Will be calculated from progress data
            total_lessons: course.total_lessons,
            completed_lessons: 0, // Will be calculated from progress data
            last_accessed: course.lastAccessed ? new Date(course.lastAccessed).toISOString() : new Date().toISOString(),
            downloadDate: new Date(course.downloadDate).toISOString(),
            size: formatBytes(course.totalSize),
            downloadStatus: course.downloadStatus
          };
        })
      );

      setDownloadedCourses(downloadedCoursesData);
      console.log(`📱 OfflineLearning: Loaded ${downloadedCoursesData.length} downloaded courses`);
    } catch (error) {
      console.error('Failed to load downloaded courses:', error);
    }
  }, [dbUtils, formatBytes]);

  // Load storage information
  const loadStorageInfo = useCallback(async () => {
    try {
      const storageInfo = await dbUtils.getStorageInfo();
      setStorageUsed(Math.round(storageInfo.used / 1024 / 1024)); // Convert to MB
      console.log(`💾 OfflineLearning: Storage used: ${Math.round(storageInfo.used / 1024 / 1024)} MB`);
    } catch (error) {
      console.error('Failed to load storage info:', error);
    }
  }, [dbUtils]);

  // Define fetchEnrolledCourses function with useCallback to prevent dependency issues
  const fetchEnrolledCourses = useCallback(async () => {
    if (!userProfile?.id) return;

    setLoading(true);
    try {
      // Always load downloaded courses and storage info first
      await loadDownloadedCourses();
      await loadStorageInfo();

      // Only fetch online courses if we're online
      if (!navigator.onLine) {
        console.log('🔴 OfflineLearning: Offline - skipping online courses fetch, showing offline content only');
        setEnrolledCourses([]);
        setLoading(false);
        return;
      }

      console.log('🟢 OfflineLearning: Online - fetching enrolled courses');
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

    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to load courses.');
    } finally {
      setLoading(false);
    }
  }, [userProfile?.id, loadDownloadedCourses, loadStorageInfo]);

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
      // Auto-switch to downloaded tab when going offline
      setActiveTab("downloaded");
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

  const handleDownloadCourse = async (courseId: string) => {
    if (!isOnline) {
      toast.error('You need an internet connection to download courses.');
      return;
    }

    if (downloadingCourses.has(courseId)) {
      toast.warning('This course is already being downloaded.');
      return;
    }

    try {
      // Check storage space
      const estimatedSize = await downloadService.estimateDownloadSize(courseId);
      const storageInfo = await dbUtils.getStorageInfo();
      
      if (storageInfo.available < estimatedSize) {
        toast.error('Not enough storage space. Please free up some space and try again.');
        return;
      }

      // Start download
      setDownloadingCourses(prev => new Set(prev).add(courseId));
      setDownloadProgress(prev => ({ ...prev, [courseId]: 0 }));

      toast.success('Course download started!');

      const downloadOptions: DownloadOptions = {
        videoQuality: 'auto',
        compressVideos: true,
        includeAssets: true,
        onProgress: (progress) => {
          setDownloadProgress(prev => ({ ...prev, [courseId]: progress.progress }));
          
          if (progress.error) {
            toast.error(`Download error: ${progress.error}`);
          }
        }
      };

      const result = await downloadService.downloadCourse(courseId, downloadOptions);

      if (result.success) {
        toast.success(`Course downloaded successfully! (${formatBytes(result.totalSize)})`);
        // Refresh downloaded courses list
        await loadDownloadedCourses();
      } else {
        toast.error(`Download failed: ${result.error}`);
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast.error(`Download failed: ${errorMessage}`);
      console.error('Course download error:', error);
    } finally {
      setDownloadingCourses(prev => {
        const newSet = new Set(prev);
        newSet.delete(courseId);
        return newSet;
      });
      setDownloadProgress(prev => {
        const newProgress = { ...prev };
        delete newProgress[courseId];
        return newProgress;
      });
    }
  };

  const handleViewCourse = (courseId: string) => {
    navigate(`/dashboard/courses/${courseId}/content`);
  };

  const handleDeleteCourse = async (courseId: string) => {
    try {
      // Get course info before deletion for toast message
      const course = downloadedCourses.find(c => c.id === courseId);
      const courseName = course?.title || 'Course';

      // Delete from offline database
      await dbUtils.deleteCourse(courseId);
      
      // Update UI
      setDownloadedCourses(prev => prev.filter(course => course.id !== courseId));
      await loadStorageInfo();
      
      toast.success(`${courseName} removed from offline storage.`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast.error(`Failed to delete course: ${errorMessage}`);
      console.error('Course deletion error:', error);
    }
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
    <div className="space-y-4 sm:space-y-6 md:space-y-8">
      {/* Premium Header Section */}
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-primary/5 rounded-2xl sm:rounded-3xl"></div>
        <div className="relative p-3 sm:p-4 md:p-8 rounded-2xl sm:rounded-3xl">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
            <div className="flex items-start sm:items-center gap-2 sm:gap-3 min-w-0 flex-1">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-primary/10 to-primary/20 rounded-xl sm:rounded-2xl flex items-center justify-center shadow-lg flex-shrink-0">
                <Download className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <h1 className="text-xl sm:text-2xl md:text-4xl font-bold tracking-tight bg-gradient-to-r from-primary via-primary to-primary/80 bg-clip-text text-transparent leading-tight" style={{ backgroundClip: 'text', WebkitBackgroundClip: 'text' }}>
                  Offline Learning
                </h1>
                <p className="text-xs sm:text-sm md:text-lg text-muted-foreground font-light mt-0.5 sm:mt-1">
                  Download your courses for offline access
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2 self-start sm:self-auto">
              {isOnline ? (
                <Badge variant="default" className="bg-green-100 text-green-800 border-green-200 shadow-sm text-[10px] sm:text-xs">
                  <Wifi className="w-2.5 h-2.5 sm:w-3 sm:h-3 mr-1" />
                  Online
                </Badge>
              ) : (
                <Badge variant="destructive" className="shadow-sm text-[10px] sm:text-xs">
                  <WifiOff className="w-2.5 h-2.5 sm:w-3 sm:h-3 mr-1" />
                  Offline
                </Badge>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Storage Usage */}
      <Card className="rounded-xl sm:rounded-2xl">
        <CardHeader className="pb-3 p-3 sm:p-4 md:p-6">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <HardDrive className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
            Storage Usage
          </CardTitle>
        </CardHeader>
        <CardContent className="p-3 sm:p-4 md:p-6 pt-0">
          <div className="space-y-2">
            <div className="flex justify-between text-xs sm:text-sm">
              <span>{storageUsed} MB used</span>
              <span>{storageLimit} MB available</span>
            </div>
            <Progress value={storagePercentage} className="h-1.5 sm:h-2" />
            <p className="text-[10px] sm:text-xs text-muted-foreground">
              {Math.round(storageLimit - storageUsed)} MB remaining
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4 sm:space-y-6">
        {isOnline ? (
          <TabsList className="grid w-full grid-cols-2 h-auto sm:h-10">
            <TabsTrigger value="available" className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm px-2 sm:px-3 py-2">
              <Download className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="hidden xs:inline">Available for Download</span>
              <span className="xs:hidden">Available</span> ({enrolledCourses.length})
            </TabsTrigger>
            <TabsTrigger value="downloaded" className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm px-2 sm:px-3 py-2">
              <BookOpen className="w-3 h-3 sm:w-4 sm:h-4" />
              Downloaded ({downloadedCourses.length})
            </TabsTrigger>
          </TabsList>
        ) : (
          <TabsList className="grid w-full grid-cols-1 h-auto sm:h-10">
            <TabsTrigger value="downloaded" className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm px-2 sm:px-3 py-2">
              <BookOpen className="w-3 h-3 sm:w-4 sm:h-4" />
              Downloaded ({downloadedCourses.length})
            </TabsTrigger>
          </TabsList>
        )}

        {/* Available Courses Tab - Only show when online */}
        {isOnline && (
          <TabsContent value="available" className="space-y-3 sm:space-y-4">
          {enrolledCourses.length === 0 ? (
            <EmptyState
              icon={<BookOpen className="h-6 w-6 sm:h-8 sm:w-8 text-muted-foreground" />}
              title="No courses available"
              description="You don't have any enrolled courses to download yet."
            />
          ) : (
            <div className="space-y-2 sm:space-y-3">
              {enrolledCourses.map((course) => (
                <Card key={course.id} className="hover:shadow-md transition-shadow rounded-lg sm:rounded-xl">
                  <CardContent className="p-3 sm:p-4">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
                      {/* Course Image */}
                      <img
                        src={course.image_url}
                        alt={course.title}
                        className="w-full sm:w-14 h-32 sm:h-14 rounded-lg object-cover flex-shrink-0"
                      />
                      
                      {/* Course Info */}
                      <div className="flex-1 min-w-0 w-full">
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between mb-2 gap-2">
                          <div className="min-w-0 flex-1">
                            <h3 className="font-semibold text-sm sm:text-base line-clamp-1">{course.title}</h3>
                            <p className="text-xs sm:text-sm text-muted-foreground line-clamp-1 mt-0.5 sm:mt-1">
                              {course.subtitle}
                            </p>
                          </div>
                          <Badge variant="outline" className="text-[10px] sm:text-xs self-start sm:ml-3 flex-shrink-0">
                            {course.total_lessons} lessons
                          </Badge>
                        </div>
                        
                        {/* Progress and Stats Row */}
                        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6 mb-3">
                          <div className="flex-1">
                            <div className="flex justify-between text-[10px] sm:text-xs text-muted-foreground mb-1">
                              <span>Progress</span>
                              <span>{course.progress}%</span>
                            </div>
                            <Progress value={course.progress} className="h-1.5 sm:h-2" />
                          </div>
                          
                          <div className="flex items-center gap-3 sm:gap-4 text-[10px] sm:text-xs text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <CheckCircle className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                              <span>{course.completed_lessons}/{course.total_lessons}</span>
                            </div>
                            {course.last_accessed && (
                              <div className="hidden sm:flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                <span>Last: {new Date(course.last_accessed).toLocaleDateString()}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Action Button */}
                     <div className="flex-shrink-0 w-full sm:w-auto">
                       {downloadingCourses.has(course.id) ? (
                         <div className="w-full sm:min-w-[140px]">
                           <Button
                             disabled
                             size="sm"
                             className="w-full mb-1 h-9 sm:h-10 text-xs sm:text-sm"
                           >
                             <Loader2 className="w-3 h-3 sm:w-4 sm:h-4 mr-2 animate-spin" />
                             Downloading...
                           </Button>
                           <div className="text-[10px] sm:text-xs text-center text-muted-foreground">
                             {(downloadProgress[course.id] && !isNaN(downloadProgress[course.id])) ? downloadProgress[course.id].toFixed(0) : 0}%
                           </div>
                           <Progress 
                             value={(downloadProgress[course.id] && !isNaN(downloadProgress[course.id])) ? downloadProgress[course.id] : 0} 
                             className="h-1 mt-1" 
                           />
                         </div>
                       ) : downloadedCourses.some(dc => dc.id === course.id) ? (
                         <Button
                           onClick={() => handleViewCourse(course.id)}
                           size="sm"
                           variant="outline"
                           className="w-full sm:min-w-[140px] h-9 sm:h-10 text-xs sm:text-sm"
                         >
                           <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4 mr-2 text-green-500" />
                           Downloaded
                         </Button>
                       ) : (
                         <Button
                           onClick={() => handleDownloadCourse(course.id)}
                           disabled={!isOnline}
                           size="sm"
                           className="w-full sm:min-w-[140px] h-9 sm:h-10 text-xs sm:text-sm"
                         >
                           <Download className="w-3 h-3 sm:w-4 sm:h-4 mr-2" />
                           Download Course
                         </Button>
                       )}
                     </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
        )}

        {/* Downloaded Courses Tab */}
        <TabsContent value="downloaded" className="space-y-3 sm:space-y-4">
          {downloadedCourses.length === 0 ? (
            <EmptyState
              icon={<Download className="h-6 w-6 sm:h-8 sm:w-8 text-muted-foreground" />}
              title="No downloaded courses"
              description="Download some courses to access them offline."
            />
          ) : (
            <div className="space-y-2 sm:space-y-3">
              {downloadedCourses.map((course) => (
                <Card key={course.id} className="hover:shadow-md transition-shadow rounded-lg sm:rounded-xl">
                  <CardContent className="p-3 sm:p-4">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
                      {/* Course Image */}
                      <img
                        src={course.image_url}
                        alt={course.title}
                        className="w-full sm:w-14 h-32 sm:h-14 rounded-lg object-cover flex-shrink-0"
                      />
                      
                      {/* Course Info */}
                      <div className="flex-1 min-w-0 w-full">
                        <div className="mb-1 sm:mb-2">
                          <h3 className="font-semibold text-sm sm:text-base truncate">{course.title}</h3>
                          <p className="text-xs sm:text-sm text-muted-foreground truncate">{course.subtitle}</p>
                        </div>

                        {/* Compact Info Grid */}
                        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 text-[10px] sm:text-xs text-muted-foreground">
                          <span>Size: {course.size}</span>
                          <span className="hidden xs:inline">•</span>
                          <span className="hidden sm:inline">Downloaded: {new Date(course.downloadDate).toLocaleDateString()}</span>
                          <span className="hidden sm:inline">•</span>
                          <span>Progress: {course.progress}%</span>
                          <span className="hidden xs:inline">•</span>
                          <span>Lessons: {course.completed_lessons}/{course.total_lessons}</span>
                        </div>

                        {/* Download Progress - Only show if downloading */}
                        {course.downloadStatus === 'downloading' && course.downloadProgress && (
                          <div className="mt-2">
                            <div className="flex justify-between text-[10px] sm:text-xs mb-1">
                              <span>Downloading...</span>
                              <span>{course.downloadProgress}%</span>
                            </div>
                            <Progress value={course.downloadProgress} className="h-1 sm:h-1.5" />
                          </div>
                        )}
                      </div>

                      {/* Status Badge - Hidden on mobile */}
                      {course.downloadStatus === 'completed' && (
                        <Badge variant="outline" className="hidden sm:flex text-xs flex-shrink-0 bg-green-50 text-green-700 border-green-200">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Downloaded
                        </Badge>
                      )}

                      {/* Action Buttons */}
                      <div className="flex items-center gap-2 flex-shrink-0 w-full sm:w-auto">
                        {course.downloadStatus === 'completed' && (
                          <>
                            <Button
                              onClick={() => handleViewCourse(course.id)}
                              size="sm"
                              className="h-8 sm:h-9 flex-1 sm:flex-initial text-xs sm:text-sm"
                            >
                              <Eye className="w-3 h-3 sm:w-3.5 sm:h-3.5 mr-1.5" />
                              <span className="hidden sm:inline">View Course</span>
                              <span className="sm:hidden">View</span>
                            </Button>
                            <Button
                              onClick={() => handleDeleteCourse(course.id)}
                              size="sm"
                              variant="outline"
                              className="h-8 sm:h-9 text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                            </Button>
                          </>
                        )}
                        
                        {course.downloadStatus === 'downloading' && (
                          <>
                            <Button
                              onClick={() => handlePauseResume(course.id, 'pause')}
                              size="sm"
                              variant="outline"
                              className="h-8 sm:h-9 flex-1 sm:flex-initial text-xs sm:text-sm"
                            >
                              <Pause className="w-3 h-3 sm:w-3.5 sm:h-3.5 mr-1.5" />
                              Pause
                            </Button>
                            <Button
                              onClick={() => handleDeleteCourse(course.id)}
                              size="sm"
                              variant="outline"
                              className="h-8 sm:h-9 text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                            </Button>
                          </>
                        )}
                        
                        {course.downloadStatus === 'error' && (
                          <>
                            <Button
                              onClick={() => handleRetryDownload(course.id)}
                              size="sm"
                              variant="outline"
                              className="h-8 sm:h-9 flex-1 sm:flex-initial text-xs sm:text-sm"
                            >
                              <RotateCcw className="w-3 h-3 sm:w-3.5 sm:h-3.5 mr-1.5" />
                              Retry
                            </Button>
                            <Button
                              onClick={() => handleDeleteCourse(course.id)}
                              size="sm"
                              variant="outline"
                              className="h-8 sm:h-9 text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                            </Button>
                          </>
                        )}
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
