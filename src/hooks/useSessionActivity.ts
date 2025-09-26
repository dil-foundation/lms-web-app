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

    // Update session activity every 5 minutes (only when online)
    const updateActivity = async () => {
      // Only update if online
      if (!navigator.onLine) {
        console.log('🔴 useSessionActivity: Offline - skipping activity update');
        return;
      }

      try {
        await SessionService.updateSessionActivity(session.access_token);
        console.log('✅ useSessionActivity: Session activity updated');
      } catch (error) {
        console.error('❌ useSessionActivity: Error updating session activity:', error);
      }
    };

    // Update immediately if online
    if (navigator.onLine) {
      updateActivity();
    }

    // Set up interval for periodic updates (with online checks)
    intervalRef.current = setInterval(() => {
      if (navigator.onLine) {
        updateActivity();
      } else {
        console.log('🔴 useSessionActivity: Offline - skipping periodic activity update');
      }
    }, 5 * 60 * 1000); // 5 minutes

    // Listen for online/offline events
    const handleOnline = () => {
      console.log('🟢 useSessionActivity: Back online - updating session activity');
      updateActivity();
    };

    window.addEventListener('online', handleOnline);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      window.removeEventListener('online', handleOnline);
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
