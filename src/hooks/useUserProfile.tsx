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

  const fetchProfile = useCallback(async () => {
    console.log('👤 useUserProfile: fetchProfile called', {
      hasUser: !!user,
      userId: user?.id,
      userEmail: user?.email
    });
    
    if (!user) {
      console.log('👤 useUserProfile: No user, clearing profile');
      setProfile(null);
      setLoading(false);
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      console.log('👤 useUserProfile: Fetching profile from database...');
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      console.log('👤 useUserProfile: Profile fetch result', {
        hasData: !!data,
        hasError: !!error,
        errorCode: error?.code,
        errorMessage: error?.message,
        profileRole: data?.role
      });

      if (error) {
        console.error('👤 useUserProfile: Profile fetch error:', error);
        throw error;
      }

      console.log('👤 useUserProfile: Profile data fetched successfully:', data);
      setProfile(data);
    } catch (err: any) {
      console.error('👤 useUserProfile: Profile fetch failed:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    console.log('👤 useUserProfile: useEffect triggered', {
      hasUser: !!user,
      userId: user?.id,
      refreshKey
    });
    fetchProfile();
  }, [fetchProfile]);

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
