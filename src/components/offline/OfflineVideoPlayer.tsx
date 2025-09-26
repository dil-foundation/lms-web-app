// Offline Video Player Component
// Plays videos from IndexedDB cache when offline

import React, { useState, useEffect, useRef } from 'react';
import { PlayCircle, Pause, Volume2, VolumeX, Maximize, Minimize, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { offlineDatabase } from '@/services/offlineDatabase';
import { toast } from 'sonner';

interface OfflineVideoPlayerProps {
  contentId: string;
  title: string;
  courseId: string;
  className?: string;
}

const OfflineVideoPlayer: React.FC<OfflineVideoPlayerProps> = ({ 
  contentId, 
  title, 
  courseId,
  className = "" 
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load video from IndexedDB
  useEffect(() => {
    const loadVideo = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        console.log('[OfflineVideoPlayer] Loading video for content ID:', contentId);
        
        // Get video blob from IndexedDB
        const content = await offlineDatabase.getContent(contentId);
        
        if (!content) {
          console.log('[OfflineVideoPlayer] No content found for ID:', contentId);
          setError('Video not available offline. Please download this course while online.');
          return;
        }

        console.log('[OfflineVideoPlayer] Content found:', {
          blobSize: content.blob.size,
          contentType: content.metadata.contentType,
          fileName: content.metadata.fileName
        });

        // Create blob URL for video
        const url = URL.createObjectURL(content.blob);
        setVideoUrl(url);
        
        console.log('[OfflineVideoPlayer] Video blob URL created successfully');
        
      } catch (error) {
        console.error('[OfflineVideoPlayer] Failed to load video:', error);
        setError('Failed to load video from offline storage.');
      } finally {
        setIsLoading(false);
      }
    };

    if (contentId) {
      loadVideo();
    }

    // Cleanup blob URL on unmount
    return () => {
      if (videoUrl) {
        URL.revokeObjectURL(videoUrl);
      }
    };
  }, [contentId]);

  // Video event handlers
  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
      console.log('[OfflineVideoPlayer] Video metadata loaded, duration:', videoRef.current.duration);
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const handlePlayPause = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play().catch(error => {
          console.error('[OfflineVideoPlayer] Play failed:', error);
          toast.error('Failed to play video');
        });
      }
    }
  };

  const handleSeek = (value: number[]) => {
    if (videoRef.current && duration > 0) {
      const newTime = (value[0] / 100) * duration;
      videoRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  const handleVolumeChange = (value: number[]) => {
    const newVolume = value[0] / 100;
    setVolume(newVolume);
    if (videoRef.current) {
      videoRef.current.volume = newVolume;
    }
    if (newVolume === 0) {
      setIsMuted(true);
    } else if (isMuted) {
      setIsMuted(false);
    }
  };

  const handleMuteToggle = () => {
    if (videoRef.current) {
      const newMuted = !isMuted;
      setIsMuted(newMuted);
      videoRef.current.muted = newMuted;
    }
  };

  const handleFullscreenToggle = () => {
    if (!document.fullscreenElement) {
      videoRef.current?.requestFullscreen().catch(err => {
        console.error('[OfflineVideoPlayer] Fullscreen failed:', err);
      });
    } else {
      document.exitFullscreen();
    }
  };

  const handleRestart = () => {
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      setCurrentTime(0);
    }
  };

  const formatTime = (time: number): string => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // Handle fullscreen change
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  if (isLoading) {
    return (
      <div className={`relative aspect-video bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 rounded-3xl overflow-hidden flex items-center justify-center shadow-xl ${className}`}>
        <div className="text-center p-8">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground text-lg font-medium">Loading video...</p>
          <p className="text-sm text-muted-foreground mt-2">Retrieving from offline storage</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`relative aspect-video bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 rounded-3xl overflow-hidden flex items-center justify-center shadow-xl ${className}`}>
        <div className="text-center p-8">
          <PlayCircle className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground text-lg font-medium">Video not available offline</p>
          <p className="text-sm text-muted-foreground mt-2">{error}</p>
        </div>
      </div>
    );
  }

  if (!videoUrl) {
    return (
      <div className={`relative aspect-video bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 rounded-3xl overflow-hidden flex items-center justify-center shadow-xl ${className}`}>
        <div className="text-center p-8">
          <PlayCircle className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground text-lg font-medium">Video not found</p>
          <p className="text-sm text-muted-foreground mt-2">This video may not be downloaded yet</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative group ${className}`}>
      <div className="relative aspect-video bg-black rounded-3xl overflow-hidden shadow-xl">
        <video
          ref={videoRef}
          src={videoUrl}
          className="w-full h-full object-contain"
          onLoadedMetadata={handleLoadedMetadata}
          onTimeUpdate={handleTimeUpdate}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onEnded={() => setIsPlaying(false)}
          playsInline
        />
        
        {/* Video Controls Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <div className="absolute inset-0 flex items-center justify-center">
            <Button
              variant="ghost"
              size="lg"
              onClick={handlePlayPause}
              className="w-16 h-16 rounded-full bg-black/50 hover:bg-black/70 text-white border-2 border-white/20"
            >
              {isPlaying ? (
                <Pause className="w-8 h-8" />
              ) : (
                <PlayCircle className="w-8 h-8" />
              )}
            </Button>
          </div>
          
          {/* Bottom Controls */}
          <div className="absolute bottom-0 left-0 right-0 p-4 space-y-2">
            {/* Progress Bar */}
            <div className="flex items-center gap-2 text-white text-sm">
              <span>{formatTime(currentTime)}</span>
              <div className="flex-1">
                <Slider
                  value={[duration > 0 ? (currentTime / duration) * 100 : 0]}
                  onValueChange={handleSeek}
                  max={100}
                  step={0.1}
                  className="w-full"
                />
              </div>
              <span>{formatTime(duration)}</span>
            </div>
            
            {/* Control Buttons */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handlePlayPause}
                  className="text-white hover:bg-white/20"
                >
                  {isPlaying ? <Pause className="w-4 h-4" /> : <PlayCircle className="w-4 h-4" />}
                </Button>
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleRestart}
                  className="text-white hover:bg-white/20"
                >
                  <RotateCcw className="w-4 h-4" />
                </Button>
                
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleMuteToggle}
                    className="text-white hover:bg-white/20"
                  >
                    {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                  </Button>
                  <div className="w-20">
                    <Slider
                      value={[isMuted ? 0 : volume * 100]}
                      onValueChange={handleVolumeChange}
                      max={100}
                      step={1}
                      className="w-full"
                    />
                  </div>
                </div>
              </div>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={handleFullscreenToggle}
                className="text-white hover:bg-white/20"
              >
                {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
              </Button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Video Title */}
      <div className="mt-4 px-2">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{title}</h3>
        <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
          <span>Available offline</span>
        </div>
      </div>
    </div>
  );
};

export default OfflineVideoPlayer;
