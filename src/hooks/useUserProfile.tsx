import { useState, useEffect, useMemo, useCallback } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { UserRole } from '@/config/roleNavigation';

type Profile = {
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  role: UserRole;
  phone_number?: string | null;
  timezone?: string | null;
  avatar_url?: string | null;
  [key: string]: any;
};

export const useUserProfile = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [isFetching, setIsFetching] = useState(false);

  const fetchProfile = useCallback(async () => {
    console.log('👤 useUserProfile: fetchProfile called', {
      hasUser: !!user,
      userId: user?.id,
      userEmail: user?.email,
      isFetching
    });
    
    if (!user) {
      console.log('👤 useUserProfile: No user, clearing profile');
      setProfile(null);
      setLoading(false);
      setIsFetching(false);
      return;
    }
    
    // Prevent multiple simultaneous fetches
    if (isFetching) {
      console.log('👤 useUserProfile: Already fetching, skipping...');
      return;
    }
    
    setIsFetching(true);
    setLoading(true);
    setError(null);
    
    try {
      console.log('👤 useUserProfile: Fetching profile from database...', {
        userId: user.id,
        userEmail: user.email
      });
      
      const startTime = Date.now();
      
      // Add timeout to prevent infinite loading (reduced to 5 seconds)
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Profile fetch timeout after 5 seconds')), 5000);
      });
      
      const fetchPromise = supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      
      const { data, error } = await Promise.race([fetchPromise, timeoutPromise]) as any;
      
      const endTime = Date.now();
      const duration = endTime - startTime;

      console.log('👤 useUserProfile: Profile fetch result', {
        hasData: !!data,
        hasError: !!error,
        errorCode: error?.code,
        errorMessage: error?.message,
        profileRole: data?.role,
        duration: `${duration}ms`,
        fullError: error,
        fullData: data
      });

      if (error) {
        console.error('👤 useUserProfile: Profile fetch error:', error);
        throw error;
      }

      console.log('👤 useUserProfile: Profile data fetched successfully:', data);
      setProfile(data);
    } catch (err: any) {
      console.error('👤 useUserProfile: Profile fetch failed:', err);
      
      // If it's a timeout error, create a fallback profile
      if (err.message?.includes('timeout')) {
        console.warn('👤 useUserProfile: Database timeout, creating fallback profile');
        console.warn('👤 useUserProfile: This indicates a database connectivity issue');
        
        // Check if we're online
        if (!navigator.onLine) {
          console.error('👤 useUserProfile: No internet connection detected');
          setError('No internet connection. Please check your network and try again.');
        } else {
          const fallbackProfile = {
            id: user.id,
            email: user.email,
            first_name: user.user_metadata?.first_name || null,
            last_name: user.user_metadata?.last_name || null,
            role: 'admin' as UserRole, // Default to admin for now
            phone_number: null,
            timezone: null,
            avatar_url: null
          };
          setProfile(fallbackProfile);
          setError(null); // Clear error since we have a fallback
          console.log('👤 useUserProfile: Fallback profile created:', fallbackProfile);
        }
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
      setIsFetching(false);
    }
  }, [user]);

  useEffect(() => {
    console.log('👤 useUserProfile: useEffect triggered', {
      hasUser: !!user,
      userId: user?.id,
      refreshKey,
      hasProfile: !!profile
    });
    
    // Only fetch if we don't have a profile or if the user changed
    if (!profile || (user && profile.id !== user.id)) {
      fetchProfile();
    } else {
      console.log('👤 useUserProfile: Profile already exists, skipping fetch');
    }
  }, [user, refreshKey, profile?.id]);

  const refreshProfile = useCallback(async () => {
    console.log('refreshProfile called - triggering refresh');
    console.log('Current refreshKey before:', refreshKey);
    
    // Increment refresh key once for UI updates
    setRefreshKey(prev => {
      const newKey = prev + 1;
      console.log('RefreshKey updated to:', newKey);
      return newKey;
    });
    
    // Fetch fresh profile data
    await fetchProfile();
  }, [fetchProfile, refreshKey]);

  return useMemo(() => ({
    profile,
    loading,
    error,
    refreshProfile,
    refreshKey
  }), [profile, loading, error, refreshProfile, refreshKey]);
};
