
import { useState, useEffect } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

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
    await supabase.auth.signOut();
    localStorage.removeItem('cameFromDashboard');
  };

  // Log current auth state for debugging
  useEffect(() => {
    console.log('🔐 Current auth state - User:', user ? user.email : 'null', 'Loading:', loading);
  }, [user, loading]);

  return { user, session, loading, signOut };
};
