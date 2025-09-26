// Storage Usage Card Component
// Displays storage usage information and management controls

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  HardDrive, 
  Trash2, 
  Download, 
  AlertTriangle,
  Info,
  Settings
} from 'lucide-react';
import { offlineDatabase } from '@/services/offlineDatabase';
import { OfflineCourse } from '@/types/offline';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface StorageUsageCardProps {
  className?: string;
  showDetails?: boolean;
  onManageStorage?: () => void;
}

interface StorageData {
  usedBytes: number;
  totalQuota: number;
  availableBytes: number;
  courseCount: number;
  contentCount: number;
  courses: Array<{
    id: string;
    title: string;
    sizeBytes: number;
    downloadedAt: Date;
  }>;
}

export const StorageUsageCard: React.FC<StorageUsageCardProps> = ({
  className,
  showDetails = true,
  onManageStorage
}) => {
  const [storageData, setStorageData] = useState<StorageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStorageData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get storage quota
      let totalQuota = 5 * 1024 * 1024 * 1024; // Default 5GB
      let availableBytes = totalQuota;

      if ('storage' in navigator && 'estimate' in navigator.storage) {
        const estimate = await navigator.storage.estimate();
        totalQuota = estimate.quota || totalQuota;
        availableBytes = (estimate.quota || totalQuota) - (estimate.usage || 0);
      }

      // Get offline database info
      const dbInfo = await offlineDatabase.getStorageInfo();
      const courses = await offlineDatabase.getAllCourses();

      const courseStorageInfo = courses.map(course => ({
        id: course.id,
        title: course.title,
        sizeBytes: course.totalSize || 0,
        downloadedAt: course.downloadedAt
      }));

      setStorageData({
        usedBytes: dbInfo.usedBytes,
        totalQuota,
        availableBytes: Math.max(0, availableBytes),
        courseCount: dbInfo.courseCount,
        contentCount: dbInfo.contentCount,
        courses: courseStorageInfo
      });
    } catch (err) {
      console.error('Failed to fetch storage data:', err);
      setError('Failed to load storage information');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStorageData();
  }, []);

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getUsagePercentage = (): number => {
    if (!storageData) return 0;
    return Math.round((storageData.usedBytes / storageData.totalQuota) * 100);
  };

  const getUsageColor = (): string => {
    const percentage = getUsagePercentage();
    if (percentage >= 90) return 'text-red-600';
    if (percentage >= 70) return 'text-yellow-600';
    return 'text-green-600';
  };

  const handleClearStorage = async () => {
    try {
      await offlineDatabase.clearAllData();
      toast.success('Storage cleared successfully');
      await fetchStorageData();
    } catch (err) {
      console.error('Failed to clear storage:', err);
      toast.error('Failed to clear storage');
    }
  };

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <HardDrive className="h-5 w-5" />
            <span>Storage Usage</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="h-4 bg-muted rounded animate-pulse" />
            <div className="h-4 bg-muted rounded animate-pulse w-3/4" />
            <div className="h-4 bg-muted rounded animate-pulse w-1/2" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !storageData) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <HardDrive className="h-5 w-5" />
            <span>Storage Usage</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2 text-red-600">
            <AlertTriangle className="h-4 w-4" />
            <span className="text-sm">{error || 'Failed to load storage data'}</span>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={fetchStorageData}
            className="mt-3"
          >
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  const usagePercentage = getUsagePercentage();
  const isNearLimit = usagePercentage >= 80;

  return (
    <Card className={cn(className, isNearLimit && "border-yellow-500")}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <HardDrive className="h-5 w-5" />
            <span>Storage Usage</span>
          </div>
          
          {isNearLimit && (
            <Badge variant="secondary" className="text-yellow-700">
              <AlertTriangle className="h-3 w-3 mr-1" />
              Near Limit
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Usage Progress */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Used: {formatBytes(storageData.usedBytes)}</span>
            <span className={getUsageColor()}>
              {usagePercentage}%
            </span>
          </div>
          
          <Progress 
            value={usagePercentage} 
            className="h-2"
          />
          
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Available: {formatBytes(storageData.availableBytes)}</span>
            <span>Total: {formatBytes(storageData.totalQuota)}</span>
          </div>
        </div>

        {/* Storage Stats */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex items-center space-x-2">
            <Download className="h-4 w-4 text-blue-600" />
            <div>
              <p className="font-medium">{storageData.courseCount}</p>
              <p className="text-muted-foreground">Courses</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <HardDrive className="h-4 w-4 text-green-600" />
            <div>
              <p className="font-medium">{storageData.contentCount}</p>
              <p className="text-muted-foreground">Content Items</p>
            </div>
          </div>
        </div>

        {/* Course Breakdown */}
        {showDetails && storageData.courses.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium flex items-center space-x-2">
              <Info className="h-4 w-4" />
              <span>Course Breakdown</span>
            </h4>
            
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {storageData.courses
                .sort((a, b) => b.sizeBytes - a.sizeBytes)
                .slice(0, 5)
                .map(course => (
                  <div key={course.id} className="flex justify-between items-center text-xs">
                    <span className="truncate flex-1 mr-2" title={course.title}>
                      {course.title}
                    </span>
                    <span className="text-muted-foreground">
                      {formatBytes(course.sizeBytes)}
                    </span>
                  </div>
                ))}
              
              {storageData.courses.length > 5 && (
                <p className="text-xs text-muted-foreground text-center">
                  +{storageData.courses.length - 5} more courses
                </p>
              )}
            </div>
          </div>
        )}

        {/* Warning for near limit */}
        {isNearLimit && (
          <div className="flex items-start space-x-2 p-3 bg-yellow-50 dark:bg-yellow-950 rounded-lg">
            <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm">
              <p className="font-medium text-yellow-800 dark:text-yellow-200">
                Storage Almost Full
              </p>
              <p className="text-yellow-700 dark:text-yellow-300">
                Consider removing some downloaded courses to free up space.
              </p>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex space-x-2 pt-2">
          {onManageStorage && (
            <Button variant="outline" size="sm" onClick={onManageStorage} className="flex-1">
              <Settings className="h-4 w-4 mr-2" />
              Manage
            </Button>
          )}
          
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleClearStorage}
            className="flex-1"
            disabled={storageData.usedBytes === 0}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Clear All
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

// Compact storage indicator for headers/toolbars
export const StorageIndicator: React.FC<{
  className?: string;
  onClick?: () => void;
}> = ({ className, onClick }) => {
  const [usagePercentage, setUsagePercentage] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUsage = async () => {
      try {
        let totalQuota = 5 * 1024 * 1024 * 1024; // Default 5GB
        
        if ('storage' in navigator && 'estimate' in navigator.storage) {
          const estimate = await navigator.storage.estimate();
          totalQuota = estimate.quota || totalQuota;
        }

        const dbInfo = await offlineDatabase.getStorageInfo();
        const percentage = Math.round((dbInfo.usedBytes / totalQuota) * 100);
        setUsagePercentage(percentage);
      } catch (error) {
        console.error('Failed to fetch storage usage:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUsage();
  }, []);

  if (loading) return null;

  const getVariant = () => {
    if (usagePercentage >= 90) return 'destructive';
    if (usagePercentage >= 70) return 'secondary';
    return 'outline';
  };

  return (
    <Badge 
      variant={getVariant()} 
      className={cn("cursor-pointer", className)}
      onClick={onClick}
    >
      <HardDrive className="h-3 w-3 mr-1" />
      {usagePercentage}%
    </Badge>
  );
};
