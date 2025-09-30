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

// Profile cache to prevent duplicate requests (with persistent storage)
const profileCache = new Map<string, { data: Profile; timestamp: number }>();
const CACHE_DURATION = 60000; // 1 minute cache
const OFFLINE_CACHE_KEY = 'dil_user_profile_offline_cache';

// Helper functions for persistent storage
const saveProfileToStorage = (userId: string, profile: Profile) => {
  try {
    const cacheData = {
      userId,
      profile,
      timestamp: Date.now()
    };
    localStorage.setItem(OFFLINE_CACHE_KEY, JSON.stringify(cacheData));
    console.log('💾 useUserProfile: Profile saved to persistent storage');
  } catch (error) {
    console.error('Failed to save profile to storage:', error);
  }
};

const getProfileFromStorage = (userId: string): Profile | null => {
  try {
    const cached = localStorage.getItem(OFFLINE_CACHE_KEY);
    if (!cached) return null;
    
    const cacheData = JSON.parse(cached);
    if (cacheData.userId === userId) {
      console.log('💾 useUserProfile: Profile loaded from persistent storage');
      return cacheData.profile;
    }
  } catch (error) {
    console.error('Failed to load profile from storage:', error);
  }
  return null;
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
    
    // When offline, try to load from persistent storage
    if (!navigator.onLine) {
      console.log('🔴 useUserProfile: Offline - trying to load from storage');
      const storedProfile = getProfileFromStorage(user.id);
      if (storedProfile) {
        setProfile(storedProfile);
        setError(null);
      } else {
        console.log('❌ useUserProfile: No cached profile found for offline use');
        setError('Profile not available offline. Please connect to the internet.');
      }
      setLoading(false);
      return;
    }

    // Check cache first to prevent duplicate requests
    const cacheKey = user.id;
    const cached = profileCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      console.log('📦 useUserProfile: Using cached profile data');
      setProfile(cached.data);
      setLoading(false);
      return;
    }
    
    setLoading(true);
    try {
      console.log('🔄 useUserProfile: Fetching fresh profile data');
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) {
        throw error;
      }

      console.log('✅ useUserProfile: Profile data fetched:', data);
      
      // Cache the result (both in memory and persistent storage)
      profileCache.set(cacheKey, { data, timestamp: Date.now() });
      saveProfileToStorage(user.id, data);
      setProfile(data);
      setError(null); // Clear any previous errors
    } catch (err: any) {
      console.error('❌ useUserProfile: Error fetching profile:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const refreshProfile = useCallback(async () => {
    console.log('🔄 useUserProfile: refreshProfile called - triggering refresh');
    
    // Clear cache to force fresh fetch
    if (user?.id) {
      profileCache.delete(user.id);
    }
    
    // Increment refresh key for UI updates
    setRefreshKey(prev => {
      const newKey = prev + 1;
      console.log('🔄 useUserProfile: RefreshKey updated to:', newKey);
      return newKey;
    });
    
    // Fetch fresh profile data
    await fetchProfile();
  }, [fetchProfile, user?.id]); // Removed refreshKey dependency to prevent loops

  return useMemo(() => ({
    profile,
    loading,
    error,
    refreshProfile,
    refreshKey
  }), [profile, loading, error, refreshProfile, refreshKey]);
};
