import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { WifiOff, Download, BookOpen, Clock, Users, CheckCircle } from 'lucide-react';
import { offlineDatabase } from '@/services/offlineDatabase';
import { useNavigate } from 'react-router-dom';

interface OfflineCourse {
  id: string;
  title: string;
  subtitle?: string;
  image_url?: string;
  downloadStatus: string;
  downloadProgress: number;
  totalSize?: number;
  downloadedAt: Date;
}

export const OfflineDashboardOverview: React.FC = () => {
  const [courses, setCourses] = useState<OfflineCourse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadOfflineCourses();
  }, []);

  const loadOfflineCourses = async () => {
    try {
      const offlineCourses = await offlineDatabase.getAllCourses();
      setCourses(offlineCourses);
    } catch (error) {
      console.error('Failed to load offline courses:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Offline Status Banner */}
      <Card className="border-blue-200 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-800">
        <CardContent className="flex items-center gap-3 p-4">
          <WifiOff className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          <div className="flex-1">
            <h3 className="font-medium text-blue-900 dark:text-blue-100">You're currently offline</h3>
            <p className="text-sm text-blue-700 dark:text-blue-200">
              Showing your downloaded courses available for offline learning
            </p>
          </div>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => navigate('/dashboard/offline-learning')}
            className="border-blue-300 text-blue-700 hover:bg-blue-100 dark:border-blue-700 dark:text-blue-300 dark:hover:bg-blue-800"
          >
            Manage Offline Content
          </Button>
        </CardContent>
      </Card>

      {/* Offline Courses */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold">Available Offline Courses</h2>
          <Badge variant="secondary" className="text-sm">
            {courses.length} course{courses.length !== 1 ? 's' : ''} downloaded
          </Badge>
        </div>

        {courses.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Download className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No offline courses available</h3>
              <p className="text-muted-foreground text-center mb-4">
                Connect to the internet and visit the Offline Learning tab to download courses for offline access.
              </p>
              <Button 
                variant="outline" 
                onClick={() => navigate('/dashboard/offline-learning')}
              >
                Go to Offline Learning
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {courses.map((course) => (
              <Card key={course.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg line-clamp-2">{course.title}</CardTitle>
                      {course.subtitle && (
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                          {course.subtitle}
                        </p>
                      )}
                    </div>
                    <Badge variant="default" className="ml-2">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Downloaded
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      <span>Downloaded {new Date(course.downloadedAt).toLocaleDateString()}</span>
                    </div>
                    {course.totalSize && (
                      <span>{formatBytes(course.totalSize)}</span>
                    )}
                  </div>
                  
                  <Button 
                    className="w-full" 
                    onClick={() => navigate(`/dashboard/courses/${course.id}`)}
                  >
                    <BookOpen className="w-4 h-4 mr-2" />
                    Access Course
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Offline Tips */}
      <Card className="border-green-200 bg-green-50 dark:bg-green-900/20 dark:border-green-800">
        <CardHeader>
          <CardTitle className="text-green-900 dark:text-green-100 flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Offline Learning Tips
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-green-800 dark:text-green-200">
          <p className="text-sm">• Your progress will be saved locally and synced when you're back online</p>
          <p className="text-sm">• Downloaded course content includes videos, documents, and quizzes</p>
          <p className="text-sm">• Visit the Offline Learning tab to download more courses or manage storage</p>
        </CardContent>
      </Card>
    </div>
  );
};
