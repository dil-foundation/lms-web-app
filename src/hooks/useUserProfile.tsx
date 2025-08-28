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
    if (!user) {
      setProfile(null);
      setLoading(false);
      return;
    }
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) {
        throw error;
      }

      console.log('Profile data fetched:', data);
      setProfile(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const refreshProfile = useCallback(async () => {
    console.log('refreshProfile called - triggering refresh');
    console.log('Current refreshKey before:', refreshKey);
    
    // Force immediate refresh key increment for instant UI updates
    setRefreshKey(prev => {
      const newKey = prev + 1;
      console.log('RefreshKey updated to:', newKey);
      return newKey;
    });
    
    // Fetch fresh profile data
    await fetchProfile();
    
    // Add small delay to ensure state propagation, then increment again for extra force
    setTimeout(() => {
      setRefreshKey(prev => {
        const finalKey = prev + 1;
        console.log('Final refreshKey updated to:', finalKey);
        return finalKey;
      });
    }, 100);
  }, [fetchProfile, refreshKey]);

  return useMemo(() => ({
    profile,
    loading,
    error,
    refreshProfile,
    refreshKey
  }), [profile, loading, error, refreshProfile, refreshKey]);
};
