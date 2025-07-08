import { createContext, useState, useEffect, useMemo, useCallback, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

// Define the shape of the context state
interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

// Create the context with a default undefined value
export const AuthContext = createContext<AuthContextType | undefined>(undefined);

const getInitialUser = () => {
  try {
    const sessionStr = localStorage.getItem('sb-yfaiauooxwvekdimfeuu-auth-token');
    if (sessionStr) {
      const session = JSON.parse(sessionStr);
      return session.user || null;
    }
  } catch (error) {
    // Ignore parsing errors
  }
  return null;
};

const cleanupAuthState = () => {
  Object.keys(localStorage).forEach((key) => {
    if (key.startsWith('supabase.auth.') || key.includes('sb-')) {
      localStorage.removeItem(key);
    }
  });
  Object.keys(sessionStorage || {}).forEach((key) => {
    if (key.startsWith('supabase.auth.') || key.includes('sb-')) {
      sessionStorage.removeItem(key);
    }
  });
};

// Create the provider component
export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(getInitialUser());
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);

        const currentPath = window.location.pathname;
        const isAuthPage = currentPath.startsWith('/auth');
        const isDashboardPage = currentPath.startsWith('/dashboard');

        if (event === 'SIGNED_IN' && !isAuthPage && !isDashboardPage) {
          navigate('/dashboard', { replace: true });
        }

        if (event === 'PASSWORD_RECOVERY') {
          sessionStorage.setItem('passwordRecovery', 'true');
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const signOut = useCallback(async () => {
    try {
      cleanupAuthState();
      await supabase.auth.signOut({ scope: 'global' });
      setSession(null);
      setUser(null);
      navigate('/', { replace: true });
      localStorage.removeItem('cameFromDashboard');
    } catch (error) {
      console.error('🔐 Sign out error:', error);
    }
  }, [navigate]);

  const value = useMemo(() => ({
    user,
    session,
    loading,
    signOut
  }), [user, session, loading, signOut]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}; 