// Course Download Button Component
// Provides download controls for courses with progress indication

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  Download, 
  Pause, 
  Play, 
  X, 
  CheckCircle, 
  AlertCircle,
  Loader2,
  Wifi,
  WifiOff
} from 'lucide-react';
import { contentDownloader, DownloadProgress } from '@/services/contentDownloader';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { OfflineCourse } from '@/types/offline';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface CourseDownloadButtonProps {
  courseId: string;
  courseName: string;
  className?: string;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'sm' | 'default' | 'lg';
  showProgress?: boolean;
  showStatus?: boolean;
  onDownloadStart?: () => void;
  onDownloadComplete?: () => void;
  onDownloadError?: (error: string) => void;
}

export const CourseDownloadButton: React.FC<CourseDownloadButtonProps> = ({
  courseId,
  courseName,
  className,
  variant = 'default',
  size = 'default',
  showProgress = true,
  showStatus = true,
  onDownloadStart,
  onDownloadComplete,
  onDownloadError
}) => {
  const [downloadStatus, setDownloadStatus] = useState<OfflineCourse | null>(null);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const { isOnline, shouldDownloadOnCurrentConnection, ...networkStatus } = useNetworkStatus();

  // Fetch initial download status
  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const status = await contentDownloader.getCourseDownloadStatus(courseId);
        setDownloadStatus(status);
        
        if (status) {
          setDownloadProgress(status.downloadProgress);
        }
      } catch (error) {
        console.error('Failed to fetch download status:', error);
      }
    };

    fetchStatus();
  }, [courseId]);

  // Subscribe to download progress updates
  useEffect(() => {
    const unsubscribe = contentDownloader.subscribeToProgress(courseId, (progress: DownloadProgress) => {
      setDownloadProgress(progress.progress);
      
      if (progress.status === 'completed') {
        onDownloadComplete?.();
      } else if (progress.status === 'failed') {
        onDownloadError?.(progress.error || 'Download failed');
      }
    });

    return unsubscribe;
  }, [courseId, onDownloadComplete, onDownloadError]);

  // Refresh status periodically
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const status = await contentDownloader.getCourseDownloadStatus(courseId);
        setDownloadStatus(status);
        
        if (status) {
          setDownloadProgress(status.downloadProgress);
        }
      } catch (error) {
        // Silently fail for periodic updates
      }
    }, 5000); // Update every 5 seconds

    return () => clearInterval(interval);
  }, [courseId]);

  const handleDownload = async () => {
    if (!isOnline) {
      toast.error('No internet connection available');
      return;
    }

    const settings = await contentDownloader.getSettings();
    const canDownload = shouldDownloadOnCurrentConnection(settings.downloadOnWifiOnly);
    
    // Debug logging
    console.log('[Download Debug]', {
      isOnline,
      downloadOnWifiOnly: settings.downloadOnWifiOnly,
      canDownload,
      connectionType: (navigator as any).connection?.type || 'unknown',
      networkStatus: {
        connectionType: networkStatus.connectionType,
        effectiveType: networkStatus.effectiveType,
        downlink: networkStatus.downlink
      }
    });
    
    // Temporary fix: If user has old restrictive settings, update them
    if (settings.downloadOnWifiOnly && !canDownload && networkStatus.connectionType === 'unknown') {
      console.log('[Download] Updating restrictive settings for unknown connection type');
      await contentDownloader.updateSettings({ downloadOnWifiOnly: false });
      // Retry the download
      const updatedSettings = await contentDownloader.getSettings();
      const canDownloadNow = shouldDownloadOnCurrentConnection(updatedSettings.downloadOnWifiOnly);
      if (canDownloadNow) {
        console.log('[Download] Settings updated, proceeding with download');
      } else {
        toast.error('Download requires Wi-Fi or wired connection (check your offline settings)');
        return;
      }
    } else if (!canDownload) {
      toast.error('Download requires Wi-Fi or wired connection (check your offline settings)');
      return;
    }

    try {
      setIsLoading(true);
      onDownloadStart?.();
      
      await contentDownloader.downloadCourse(courseId);
      
      // Refresh status
      const status = await contentDownloader.getCourseDownloadStatus(courseId);
      setDownloadStatus(status);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Download failed';
      toast.error(errorMessage);
      onDownloadError?.(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePause = async () => {
    try {
      setIsLoading(true);
      await contentDownloader.pauseDownload(courseId);
      
      const status = await contentDownloader.getCourseDownloadStatus(courseId);
      setDownloadStatus(status);
    } catch (error) {
      toast.error('Failed to pause download');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResume = async () => {
    if (!isOnline) {
      toast.error('No internet connection available');
      return;
    }

    try {
      setIsLoading(true);
      await contentDownloader.resumeDownload(courseId);
      
      const status = await contentDownloader.getCourseDownloadStatus(courseId);
      setDownloadStatus(status);
    } catch (error) {
      toast.error('Failed to resume download');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = async () => {
    try {
      setIsLoading(true);
      await contentDownloader.cancelDownload(courseId);
      
      setDownloadStatus(null);
      setDownloadProgress(0);
    } catch (error) {
      toast.error('Failed to cancel download');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      setIsLoading(true);
      await contentDownloader.deleteCourse(courseId);
      
      setDownloadStatus(null);
      setDownloadProgress(0);
    } catch (error) {
      toast.error('Failed to delete course');
    } finally {
      setIsLoading(false);
    }
  };

  const getButtonContent = () => {
    if (isLoading) {
      return (
        <>
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          Loading...
        </>
      );
    }

    if (!downloadStatus) {
      return (
        <>
          <Download className="h-4 w-4 mr-2" />
          Download
        </>
      );
    }

    switch (downloadStatus.downloadStatus) {
      case 'pending':
      case 'downloading':
        return (
          <>
            <Pause className="h-4 w-4 mr-2" />
            Pause
          </>
        );
      
      case 'paused':
        return (
          <>
            <Play className="h-4 w-4 mr-2" />
            Resume
          </>
        );
      
      case 'completed':
        return (
          <>
            <CheckCircle className="h-4 w-4 mr-2" />
            Downloaded
          </>
        );
      
      case 'failed':
        return (
          <>
            <AlertCircle className="h-4 w-4 mr-2" />
            Retry
          </>
        );
      
      default:
        return (
          <>
            <Download className="h-4 w-4 mr-2" />
            Download
          </>
        );
    }
  };

  const getButtonAction = () => {
    if (!downloadStatus) {
      return handleDownload;
    }

    switch (downloadStatus.downloadStatus) {
      case 'pending':
      case 'downloading':
        return handlePause;
      
      case 'paused':
        return handleResume;
      
      case 'completed':
        return handleDelete;
      
      case 'failed':
        return handleDownload;
      
      default:
        return handleDownload;
    }
  };

  const getButtonVariant = () => {
    if (downloadStatus?.downloadStatus === 'completed') {
      return 'outline';
    }
    if (downloadStatus?.downloadStatus === 'failed') {
      return 'destructive';
    }
    return variant;
  };

  const isDownloadDisabled = () => {
    return isLoading || (!isOnline && !downloadStatus);
  };

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center space-x-2">
        <Button
          variant={getButtonVariant()}
          size={size}
          onClick={getButtonAction()}
          disabled={isDownloadDisabled()}
          className="flex-1"
        >
          {getButtonContent()}
        </Button>

        {/* Cancel/Delete button for active downloads */}
        {downloadStatus && downloadStatus.downloadStatus !== 'completed' && (
          <Button
            variant="outline"
            size={size}
            onClick={handleCancel}
            disabled={isLoading}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Progress bar */}
      {showProgress && downloadStatus && downloadStatus.downloadStatus !== 'completed' && (
        <div className="space-y-1">
          <Progress value={downloadProgress} className="h-2" />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{downloadProgress}% complete</span>
            {downloadStatus.downloadStatus === 'downloading' && (
              <span>Downloading...</span>
            )}
            {downloadStatus.downloadStatus === 'paused' && (
              <span>Paused</span>
            )}
            {downloadStatus.downloadStatus === 'failed' && (
              <span>Failed</span>
            )}
          </div>
        </div>
      )}

      {/* Status indicators */}
      {showStatus && (
        <div className="flex items-center space-x-2">
          {/* Network status */}
          {isOnline ? (
            <Badge variant="outline" className="text-xs">
              <Wifi className="h-3 w-3 mr-1" />
              Online
            </Badge>
          ) : (
            <Badge variant="secondary" className="text-xs">
              <WifiOff className="h-3 w-3 mr-1" />
              Offline
            </Badge>
          )}

          {/* Download status */}
          {downloadStatus && (
            <Badge 
              variant={
                downloadStatus.downloadStatus === 'completed' ? 'default' :
                downloadStatus.downloadStatus === 'failed' ? 'destructive' :
                'secondary'
              }
              className="text-xs"
            >
              {downloadStatus.downloadStatus === 'completed' && <CheckCircle className="h-3 w-3 mr-1" />}
              {downloadStatus.downloadStatus === 'failed' && <AlertCircle className="h-3 w-3 mr-1" />}
              {downloadStatus.downloadStatus === 'downloading' && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
              {downloadStatus.downloadStatus === 'paused' && <Pause className="h-3 w-3 mr-1" />}
              
              {downloadStatus.downloadStatus.charAt(0).toUpperCase() + downloadStatus.downloadStatus.slice(1)}
            </Badge>
          )}
        </div>
      )}
    </div>
  );
};

// Compact version for use in course cards
export const CompactDownloadButton: React.FC<{
  courseId: string;
  courseName: string;
  className?: string;
}> = ({ courseId, courseName, className }) => {
  return (
    <CourseDownloadButton
      courseId={courseId}
      courseName={courseName}
      className={className}
      size="sm"
      showProgress={false}
      showStatus={false}
    />
  );
};

// Icon-only version for minimal UI
export const IconDownloadButton: React.FC<{
  courseId: string;
  courseName: string;
  className?: string;
}> = ({ courseId, courseName, className }) => {
  const [downloadStatus, setDownloadStatus] = useState<OfflineCourse | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const status = await contentDownloader.getCourseDownloadStatus(courseId);
        setDownloadStatus(status);
      } catch (error) {
        console.error('Failed to fetch download status:', error);
      }
    };

    fetchStatus();
  }, [courseId]);

  const getIcon = () => {
    if (isLoading) return <Loader2 className="h-4 w-4 animate-spin" />;
    
    if (!downloadStatus) return <Download className="h-4 w-4" />;
    
    switch (downloadStatus.downloadStatus) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'downloading':
        return <Loader2 className="h-4 w-4 animate-spin text-blue-600" />;
      case 'paused':
        return <Pause className="h-4 w-4 text-yellow-600" />;
      case 'failed':
        return <AlertCircle className="h-4 w-4 text-red-600" />;
      default:
        return <Download className="h-4 w-4" />;
    }
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      className={cn("h-8 w-8 p-0", className)}
      title={`Download ${courseName}`}
    >
      {getIcon()}
    </Button>
  );
};
