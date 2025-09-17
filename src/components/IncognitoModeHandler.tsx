import React, { useEffect, useState } from 'react';
import { isIncognitoMode } from '@/utils/storageUtils';

interface IncognitoModeHandlerProps {
  children: React.ReactNode;
}

export const IncognitoModeHandler: React.FC<IncognitoModeHandlerProps> = ({ children }) => {
  const [isIncognito, setIsIncognito] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkIncognitoMode = () => {
      try {
        const incognito = isIncognitoMode();
        setIsIncognito(incognito);
        
        if (incognito) {
          console.warn('🔒 Incognito mode detected. Some features may be limited.');
        }
      } catch (error) {
        console.error('Error detecting incognito mode:', error);
        setIsIncognito(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkIncognitoMode();
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (isIncognito) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="text-center space-y-4 p-8 max-w-md">
          <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto">
            <svg
              className="w-8 h-8 text-yellow-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
          </div>
          <div>
            <h2 className="text-2xl font-bold text-foreground mb-2">Incognito Mode Detected</h2>
            <p className="text-muted-foreground mb-4">
              Some features may not work properly in incognito mode due to storage restrictions. 
              For the best experience, please use a regular browser window.
            </p>
            <div className="space-x-4">
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
              >
                Continue Anyway
              </button>
              <button
                onClick={() => window.open(window.location.href, '_blank')}
                className="px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/90 transition-colors"
              >
                Open in New Window
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
