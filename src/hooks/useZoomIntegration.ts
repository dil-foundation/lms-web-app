import { useState, useEffect } from 'react';
import meetingService from '@/services/meetingService';

export const useZoomIntegration = () => {
  const [isEnabled, setIsEnabled] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkZoomIntegration = async () => {
      try {
        setLoading(true);
        const { enabled } = await meetingService.getZoomIntegrationStatus();
        setIsEnabled(enabled);
        setError(null);
      } catch (err) {
        // Silently handle the error and default to disabled
        // This prevents console errors on app load when Zoom integration is not set up
        setError(null); // Don't show error to user
        setIsEnabled(false); // Default to disabled
      } finally {
        setLoading(false);
      }
    };

    checkZoomIntegration();
  }, []);

  return { isEnabled, loading, error };
};
