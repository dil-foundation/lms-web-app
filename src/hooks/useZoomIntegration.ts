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
        console.error('Error checking Zoom integration:', err);
        setError(err instanceof Error ? err.message : 'Failed to check Zoom integration');
        setIsEnabled(false);
      } finally {
        setLoading(false);
      }
    };

    checkZoomIntegration();
  }, []);

  return { isEnabled, loading, error };
};
