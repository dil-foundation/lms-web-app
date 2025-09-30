import React, { useState, useEffect } from 'react';
import { ImageIcon } from 'lucide-react';

interface OfflineAwareImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  fallbackSrc?: string;
  onError?: (e: React.SyntheticEvent<HTMLImageElement>) => void;
}

/**
 * An image component that respects offline status and prevents failed network requests
 */
export const OfflineAwareImage: React.FC<OfflineAwareImageProps> = ({
  src,
  alt,
  fallbackSrc = '/placeholder.svg',
  onError,
  className,
  ...props
}) => {
  const [imageSrc, setImageSrc] = useState<string>(src);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [hasError, setHasError] = useState(false);

  // Listen for online/offline events
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => {
      setIsOnline(false);
      // When going offline, switch to fallback if current src is a network URL
      if (src.startsWith('http') && !src.includes('placeholder.svg')) {
        console.log('🔴 OfflineAwareImage: Switching to fallback - device offline');
        setImageSrc(fallbackSrc);
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [src, fallbackSrc]);

  // Update image source when src prop changes
  useEffect(() => {
    if (isOnline) {
      setImageSrc(src);
      setHasError(false);
    } else if (src.startsWith('http') && !src.includes('placeholder.svg')) {
      // If offline and src is a network URL, use fallback
      setImageSrc(fallbackSrc);
    } else {
      // If offline but src is already a local/fallback URL, use it
      setImageSrc(src);
    }
  }, [src, isOnline, fallbackSrc]);

  const handleError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    setHasError(true);
    
    // If we haven't already switched to fallback, do so now
    if (imageSrc !== fallbackSrc) {
      console.log('🔴 OfflineAwareImage: Image failed to load, switching to fallback');
      setImageSrc(fallbackSrc);
    }

    // Call the provided onError handler if any
    if (onError) {
      onError(e);
    }
  };

  // If offline and we have a network URL, show placeholder
  if (!isOnline && src.startsWith('http') && !src.includes('placeholder.svg')) {
    return (
      <div className={`bg-gray-100 dark:bg-gray-800 flex items-center justify-center ${className}`}>
        <ImageIcon className="w-4 h-4 text-gray-400" />
      </div>
    );
  }

  return (
    <img
      {...props}
      src={imageSrc}
      alt={alt}
      className={className}
      onError={handleError}
    />
  );
};
