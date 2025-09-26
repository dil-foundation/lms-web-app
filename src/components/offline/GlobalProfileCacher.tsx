// Global profile caching component
// Automatically caches user profile whenever online, anywhere in the app

import { useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { offlineDatabase } from '@/services/offlineDatabase';
import { supabase } from '@/integrations/supabase/client';

export const GlobalProfileCacher: React.FC = () => {
  const { user } = useAuth();
  const { isOnline } = useNetworkStatus();

  useEffect(() => {
    if (!user || !isOnline || !navigator.onLine) return;

    const cacheProfile = async () => {
      try {
        // Fetch profile from Supabase
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (profileError) {
          console.warn('[GlobalProfileCacher] Failed to fetch profile:', profileError);
          return;
        }

        if (profileData) {
          // Cache the profile for offline use
          await offlineDatabase.saveProfile(profileData);
          console.log('[GlobalProfileCacher] Profile cached successfully for user:', user.id);
        }
      } catch (error) {
        console.warn('[GlobalProfileCacher] Profile caching failed:', error);
      }
    };

    // Cache profile immediately when online
    cacheProfile();

    // Set up interval to refresh profile cache periodically (every 5 minutes)
    const intervalId = setInterval(cacheProfile, 5 * 60 * 1000);

    return () => clearInterval(intervalId);
  }, [user, isOnline]);

  // This component doesn't render anything
  return null;
};
