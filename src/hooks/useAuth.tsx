
import { useState, useEffect } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

const cleanupAuthState = () => {
  // Remove all Supabase auth keys from localStorage
  Object.keys(localStorage).forEach((key) => {
    if (key.startsWith('supabase.auth.') || key.includes('sb-')) {
      localStorage.removeItem(key);
    }
  });
  // Remove from sessionStorage if in use
  Object.keys(sessionStorage || {}).forEach((key) => {
    if (key.startsWith('supabase.auth.') || key.includes('sb-')) {
      sessionStorage.removeItem(key);
    }
  });
};

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log('🔐 Setting up auth state listener...');
    
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('🔐 Auth state changed:', event, session ? 'Session exists' : 'No session');
        console.log('🔐 User:', session?.user ? session.user.email : 'No user');
        
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('🔐 Initial session check:', session ? 'Session found' : 'No session');
      console.log('🔐 Initial user:', session?.user ? session.user.email : 'No user');
      
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    console.log('🔐 Signing out...');
    try {
      // Clean up auth state first
      cleanupAuthState();
      
      // Attempt global sign out (ignore errors since session might already be invalid)
      try {
        await supabase.auth.signOut({ scope: 'global' });
      } catch (err) {
        console.log('🔐 Sign out error (continuing anyway):', err);
      }
      
      // Clear local state
      setSession(null);
      setUser(null);
      
      // Remove custom app storage
      localStorage.removeItem('cameFromDashboard');
      
      console.log('🔐 Sign out completed');
    } catch (error) {
      console.error('🔐 Sign out error:', error);
    }
  };

  // Log current auth state for debugging
  useEffect(() => {
    console.log('🔐 Current auth state - User:', user ? user.email : 'null', 'Loading:', loading);
  }, [user, loading]);

  return { user, session, loading, signOut };
};
