// Offline-aware user profile hook
// Caches profile when online, uses cached profile when offline

import { useState, useEffect } from 'react';
import { useAuth } from './useAuth';
import { useNetworkStatus } from './useNetworkStatus';
import { offlineDatabase } from '@/services/offlineDatabase';
import { supabase } from '@/integrations/supabase/client';

interface UserProfile {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  role: string;
  avatar_url?: string;
  created_at?: string;
  updated_at?: string;
  lastUpdated?: string; // For offline tracking
}

export const useOfflineUserProfile = () => {
  const { user } = useAuth();
  const { isOnline } = useNetworkStatus();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setProfile(null);
      setLoading(false);
      setError(null);
      return;
    }

    const fetchProfile = async () => {
      console.log('[useOfflineUserProfile] Fetching profile for user:', user.id, 'online:', isOnline);
      
      try {
        setLoading(true);
        setError(null);

        if (isOnline && navigator.onLine) {
          // Online: Fetch from Supabase and cache
          console.log('[useOfflineUserProfile] Fetching from Supabase...');
          
          const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();

          if (profileError) {
            console.warn('[useOfflineUserProfile] Supabase fetch failed:', profileError);
            // Fallback to offline data
            const cachedProfile = await offlineDatabase.getProfile(user.id);
            if (cachedProfile) {
              console.log('[useOfflineUserProfile] Using cached profile after online failure');
              setProfile(cachedProfile);
            } else {
              throw profileError;
            }
          } else {
            console.log('[useOfflineUserProfile] Profile fetched from Supabase');
            setProfile(profileData);
            
            // Cache the profile for offline use
            try {
              await offlineDatabase.saveProfile(profileData);
              console.log('[useOfflineUserProfile] Profile cached for offline use');
            } catch (cacheError) {
              console.warn('[useOfflineUserProfile] Failed to cache profile:', cacheError);
              // Don't throw - profile is still available online
            }
          }
        } else {
          // Offline: Use cached profile
          console.log('[useOfflineUserProfile] Fetching from cache (offline)...');
          
          const cachedProfile = await offlineDatabase.getProfile(user.id);
          if (cachedProfile) {
            console.log('[useOfflineUserProfile] Profile loaded from cache');
            setProfile(cachedProfile);
          } else {
            console.warn('[useOfflineUserProfile] No cached profile found, creating fallback profile');
            // Create a basic fallback profile from user data
            const fallbackProfile = {
              id: user.id,
              email: user.email || 'user@example.com',
              first_name: 'User',
              last_name: '',
              role: 'student', // Default role
              avatar_url: null,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              lastUpdated: new Date().toISOString()
            };
            setProfile(fallbackProfile);
            console.log('[useOfflineUserProfile] Using fallback profile');
          }
        }
      } catch (err: any) {
        console.error('[useOfflineUserProfile] Failed to fetch profile:', err);
        setError(err.message || 'Failed to load user profile');
        
        // Try to load from cache as last resort
        if (isOnline) {
          try {
            const cachedProfile = await offlineDatabase.getProfile(user.id);
            if (cachedProfile) {
              console.log('[useOfflineUserProfile] Using cached profile as fallback');
              setProfile(cachedProfile);
              setError(null);
            }
          } catch (cacheError) {
            console.error('[useOfflineUserProfile] Cache fallback also failed:', cacheError);
          }
        }
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [user, isOnline]);

  // Function to manually refresh profile (useful when going back online)
  const refreshProfile = async () => {
    if (!user) return;
    
    setLoading(true);
    setError(null);
    
    try {
      if (isOnline && navigator.onLine) {
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (!profileError && profileData) {
          setProfile(profileData);
          await offlineDatabase.saveProfile(profileData);
          console.log('[useOfflineUserProfile] Profile refreshed and cached');
        } else {
          throw profileError;
        }
      }
    } catch (err: any) {
      console.error('[useOfflineUserProfile] Failed to refresh profile:', err);
      setError(err.message || 'Failed to refresh profile');
    } finally {
      setLoading(false);
    }
  };

  // Function to update profile (saves both online and offline)
  const updateProfile = async (updates: Partial<UserProfile>) => {
    if (!user || !profile) return;

    try {
      const updatedProfile = { ...profile, ...updates };

      if (isOnline && navigator.onLine) {
        // Update online
        const { data, error } = await supabase
          .from('profiles')
          .update(updates)
          .eq('id', user.id)
          .select()
          .single();

        if (error) throw error;
        
        setProfile(data);
        await offlineDatabase.saveProfile(data);
        console.log('[useOfflineUserProfile] Profile updated online and cached');
      } else {
        // Update offline only
        setProfile(updatedProfile);
        await offlineDatabase.saveProfile(updatedProfile);
        console.log('[useOfflineUserProfile] Profile updated offline (will sync when online)');
      }
    } catch (err: any) {
      console.error('[useOfflineUserProfile] Failed to update profile:', err);
      throw err;
    }
  };

  return {
    profile,
    loading,
    error,
    refreshProfile,
    updateProfile,
    isOfflineProfile: !isOnline || (profile?.lastUpdated !== undefined)
  };
};
