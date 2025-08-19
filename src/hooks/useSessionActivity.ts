import { useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import SessionService from '@/services/sessionService';

export const useSessionActivity = () => {
  const { session } = useAuth();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!session?.access_token) {
      return;
    }

    // Update session activity every 5 minutes
    const updateActivity = async () => {
      try {
        await SessionService.updateSessionActivity(session.access_token);
      } catch (error) {
        console.error('Error updating session activity:', error);
      }
    };

    // Update immediately
    updateActivity();

    // Set up interval for periodic updates
    intervalRef.current = setInterval(updateActivity, 5 * 60 * 1000); // 5 minutes

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [session?.access_token]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);
};
