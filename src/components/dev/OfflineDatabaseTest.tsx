/**
 * Offline Database Test Component
 * Development component to test and verify offline database functionality
 * This component should only be used in development mode
 * 
 * @version 1.0.0
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Database, 
  TestTube, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  Trash2,
  RefreshCw,
  HardDrive
} from 'lucide-react';
import { 
  getOfflineDatabase, 
  OfflineCourse,
  OfflineLesson,
  OfflineVideo,
  OfflineAsset,
  OfflineProgress,
  STORAGE_LIMITS
} from '@/services/offlineDatabase';
import { 
  getOfflineDatabaseUtils,
  StorageInfo, 
  CourseStats, 
  DatabaseHealth 
} from '@/services/offlineDatabaseUtils';

interface TestResult {
  name: string;
  status: 'pending' | 'success' | 'error';
  message: string;
  duration?: number;
}

export const OfflineDatabaseTest: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [storageInfo, setStorageInfo] = useState<StorageInfo | null>(null);
  const [courseStats, setCourseStats] = useState<CourseStats | null>(null);
  const [dbHealth, setDbHealth] = useState<DatabaseHealth | null>(null);
  const [initError, setInitError] = useState<string | null>(null);

  const [db, utils] = React.useMemo(() => {
    try {
      return [getOfflineDatabase(), getOfflineDatabaseUtils()];
    } catch (error) {
      setInitError(error instanceof Error ? error.message : 'Failed to initialize database services');
      return [null, null];
    }
  }, []);

  // Only show in development mode
  useEffect(() => {
    setIsVisible(import.meta.env.DEV);
  }, []);

  const addTestResult = (result: TestResult) => {
    setTestResults(prev => [...prev, result]);
  };

  const runTest = async (name: string, testFn: () => Promise<void>): Promise<void> => {
    const startTime = Date.now();
    addTestResult({ name, status: 'pending', message: 'Running...' });

    try {
      await testFn();
      const duration = Date.now() - startTime;
      setTestResults(prev => 
        prev.map(result => 
          result.name === name 
            ? { ...result, status: 'success', message: 'Passed', duration }
            : result
        )
      );
    } catch (error) {
      const duration = Date.now() - startTime;
      const message = error instanceof Error ? error.message : 'Unknown error';
      setTestResults(prev => 
        prev.map(result => 
          result.name === name 
            ? { ...result, status: 'error', message, duration }
            : result
        )
      );
    }
  };

  const runAllTests = async () => {
    setIsRunning(true);
    setTestResults([]);

    try {
      // Test 1: Database Initialization
      await runTest('Database Initialization', async () => {
        await db.init();
      });

      // Test 2: Course Storage
      await runTest('Course Storage', async () => {
        const testCourse: OfflineCourse = {
          id: 'test-course-1',
          title: 'Test Course',
          subtitle: 'A test course for database validation',
          description: 'This is a test course to verify database functionality',
          total_lessons: 5,
          downloadDate: Date.now(),
          lastAccessed: Date.now(),
          version: '1.0.0',
          totalSize: 100 * 1024 * 1024, // 100MB
          downloadStatus: 'completed',
          downloadProgress: 100,
          metadata: { test: true }
        };

        await db.storeCourse(testCourse);
        const retrieved = await db.getCourse('test-course-1');
        
        if (!retrieved || retrieved.title !== testCourse.title) {
          throw new Error('Course storage/retrieval failed');
        }
      });

      // Test 3: Lesson Storage
      await runTest('Lesson Storage', async () => {
        const testLesson: OfflineLesson = {
          id: 'test-lesson-1',
          courseId: 'test-course-1',
          title: 'Test Lesson',
          description: 'A test lesson',
          content: 'Test lesson content',
          order: 1,
          duration: 300,
          type: 'video',
          videoId: 'test-video-1',
          assetIds: [],
          metadata: {}
        };

        await db.storeLesson(testLesson);
        const lessons = await db.getLessonsByCourse('test-course-1');
        
        if (lessons.length === 0 || lessons[0].title !== testLesson.title) {
          throw new Error('Lesson storage/retrieval failed');
        }
      });

      // Test 4: Video Storage (with mock blob)
      await runTest('Video Storage', async () => {
        const mockVideoBlob = new Blob(['mock video data'], { type: 'video/mp4' });
        
        const testVideo: OfflineVideo = {
          id: 'test-video-1',
          lessonId: 'test-lesson-1',
          courseId: 'test-course-1',
          originalUrl: 'https://example.com/video.mp4',
          blob: mockVideoBlob,
          duration: 300,
          size: mockVideoBlob.size,
          quality: '720p',
          format: 'mp4',
          compressed: false,
          downloadDate: Date.now(),
          metadata: {}
        };

        await db.storeVideo(testVideo);
        const retrieved = await db.getVideo('test-video-1');
        
        if (!retrieved || retrieved.duration !== testVideo.duration) {
          throw new Error('Video storage/retrieval failed');
        }
      });

      // Test 5: Asset Storage
      await runTest('Asset Storage', async () => {
        const mockAssetBlob = new Blob(['mock asset data'], { type: 'image/jpeg' });
        
        const testAsset: OfflineAsset = {
          id: 'test-asset-1',
          courseId: 'test-course-1',
          lessonId: 'test-lesson-1',
          originalUrl: 'https://example.com/image.jpg',
          blob: mockAssetBlob,
          type: 'image',
          mimeType: 'image/jpeg',
          size: mockAssetBlob.size,
          filename: 'test-image.jpg',
          downloadDate: Date.now(),
          metadata: {}
        };

        await db.storeAsset(testAsset);
        const assets = await db.getAssetsByCourse('test-course-1');
        
        if (assets.length === 0 || assets[0].filename !== testAsset.filename) {
          throw new Error('Asset storage/retrieval failed');
        }
      });

      // Test 6: Progress Storage
      await runTest('Progress Storage', async () => {
        const testProgress: OfflineProgress = {
          id: 'test-course-1-test-lesson-1',
          courseId: 'test-course-1',
          lessonId: 'test-lesson-1',
          userId: 'test-user',
          completed: true,
          progress: 100,
          timeSpent: 300,
          lastAccessed: Date.now(),
          completedAt: Date.now(),
          metadata: {}
        };

        await db.storeProgress(testProgress);
        const progress = await db.getProgressByCourse('test-course-1');
        
        if (progress.length === 0 || !progress[0].completed) {
          throw new Error('Progress storage/retrieval failed');
        }
      });

      // Test 7: Storage Usage
      await runTest('Storage Usage Calculation', async () => {
        const usage = await db.getStorageUsage();
        
        if (usage.used < 0 || usage.quota < 0) {
          throw new Error('Invalid storage usage values');
        }
      });

      // Test 8: Course Deletion
      await runTest('Course Deletion', async () => {
        await db.deleteCourse('test-course-1');
        const course = await db.getCourse('test-course-1');
        
        if (course !== null) {
          throw new Error('Course deletion failed');
        }
      });

    } finally {
      setIsRunning(false);
    }
  };

  const loadDashboardData = async () => {
    try {
      const [storage, stats, health] = await Promise.all([
        utils.getStorageInfo(),
        utils.getCourseStats(),
        utils.checkDatabaseHealth()
      ]);

      setStorageInfo(storage);
      setCourseStats(stats);
      setDbHealth(health);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    }
  };

  const handleReset = async () => {
    if (confirm('Are you sure you want to reset the database? This will delete all offline data.')) {
      try {
        await utils.resetDatabase();
        await loadDashboardData();
        setTestResults([]);
      } catch (error) {
        console.error('Failed to reset database:', error);
      }
    }
  };

  const handleMaintenance = async () => {
    try {
      const result = await utils.performMaintenance();
      console.log('Maintenance result:', result);
      await loadDashboardData();
    } catch (error) {
      console.error('Maintenance failed:', error);
    }
  };

  useEffect(() => {
    if (isVisible) {
      loadDashboardData();
    }
  }, [isVisible]);

  if (!isVisible) {
    return null;
  }

  if (initError || !db || !utils) {
    return (
      <div className="fixed bottom-4 left-4 z-50 max-w-md">
        <Card className="shadow-lg border-2 border-red-200">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm text-red-600">
              <XCircle className="w-4 h-4" />
              Database Test Error
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-red-600">
              {initError || 'Failed to initialize database services'}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 left-4 z-50 max-w-md">
      <Card className="shadow-lg border-2 border-blue-200">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Database className="w-4 h-4" />
            Offline DB Test Panel
            <Badge variant="outline" className="text-xs">DEV</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Database Health */}
          {dbHealth && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                {dbHealth.isHealthy ? (
                  <CheckCircle className="w-4 h-4 text-green-600" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-yellow-600" />
                )}
                <span className="text-sm font-medium">
                  Database {dbHealth.isHealthy ? 'Healthy' : 'Issues Found'}
                </span>
              </div>
              {dbHealth.issues.length > 0 && (
                <div className="text-xs text-red-600">
                  {dbHealth.issues.slice(0, 2).map((issue, i) => (
                    <div key={i}>• {issue}</div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Storage Info */}
          {storageInfo && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <HardDrive className="w-4 h-4" />
                <span className="text-sm font-medium">Storage Usage</span>
              </div>
              <Progress value={storageInfo.usedPercentage} className="h-2" />
              <div className="text-xs text-muted-foreground">
                {((storageInfo.used / 1024 / 1024)).toFixed(1)}MB / {((storageInfo.quota / 1024 / 1024 / 1024)).toFixed(1)}GB
                ({storageInfo.usedPercentage.toFixed(1)}%)
              </div>
            </div>
          )}

          {/* Course Stats */}
          {courseStats && (
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>Courses: {courseStats.totalCourses}</div>
              <div>Completed: {courseStats.completedDownloads}</div>
              <div>In Progress: {courseStats.inProgressDownloads}</div>
              <div>Failed: {courseStats.failedDownloads}</div>
            </div>
          )}

          {/* Test Results */}
          {testResults.length > 0 && (
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {testResults.map((result, index) => (
                <div key={index} className="flex items-center gap-2 text-xs">
                  {result.status === 'pending' && <RefreshCw className="w-3 h-3 animate-spin" />}
                  {result.status === 'success' && <CheckCircle className="w-3 h-3 text-green-600" />}
                  {result.status === 'error' && <XCircle className="w-3 h-3 text-red-600" />}
                  <span className="flex-1 truncate">{result.name}</span>
                  {result.duration && (
                    <span className="text-muted-foreground">{result.duration}ms</span>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2">
            <Button
              onClick={runAllTests}
              disabled={isRunning}
              size="sm"
              className="flex-1"
            >
              <TestTube className="w-3 h-3 mr-1" />
              {isRunning ? 'Testing...' : 'Run Tests'}
            </Button>
            <Button
              onClick={loadDashboardData}
              variant="outline"
              size="sm"
            >
              <RefreshCw className="w-3 h-3" />
            </Button>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={handleMaintenance}
              variant="outline"
              size="sm"
              className="flex-1"
            >
              Maintenance
            </Button>
            <Button
              onClick={handleReset}
              variant="destructive"
              size="sm"
            >
              <Trash2 className="w-3 h-3" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
