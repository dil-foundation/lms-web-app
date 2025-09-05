import { createContext, useState, useEffect, useMemo, useCallback, ReactNode, useRef, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import SessionService from '@/services/sessionService';
import AccessLogService from '@/services/accessLogService';
import { isTokenExpired, getTokenExpiry, getTokenTimeRemaining } from '@/utils/tokenUtils';

// Define the shape of the context state
interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
  pendingMFAUser: User | null;
  setPendingMFAUser: (user: User | null) => void;
  isMFAVerificationPending: boolean;
  handleUserNotFoundError: () => Promise<void>;
  clearInvalidToken: () => Promise<void>;
}

// Create the context with a default undefined value
export const AuthContext = createContext<AuthContextType | undefined>(undefined);

const getInitialUser = () => {
  // Don't try to read from localStorage manually - let Supabase handle it
  // The initial user will be set when getSession() is called
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
  const [pendingMFAUser, setPendingMFAUser] = useState<User | null>(null);

  // This ref holds the latest user object to avoid stale closures in the subscription,
  // without making the useEffect below dependent on the `user` object itself.
  const userRef = useRef(user);
  useEffect(() => {
    userRef.current = user;
  }, [user]);

  useEffect(() => {
    // Proactive token validation approach
    const authTokenKey = import.meta.env.VITE_AUTH_TOKEN;
    const storedToken = localStorage.getItem(authTokenKey);
    
    if (!storedToken) {
      setSession(null);
      setUser(null);
      setLoading(false);
      return;
    }
    
    let parsedToken;
    try {
      parsedToken = JSON.parse(storedToken);
    } catch (e) {
      setSession(null);
      setUser(null);
      setLoading(false);
      return;
    }
    
    // Check if we have required tokens
    if (!parsedToken.access_token || !parsedToken.refresh_token) {
      cleanupAuthState();
      setSession(null);
      setUser(null);
      setLoading(false);
      return;
    }
    
    // Check if access token is expired
    const isAccessTokenExpired = isTokenExpired(parsedToken.access_token);
    
    if (isAccessTokenExpired) {
      // Try to refresh the token with timeout
      const refreshPromise = supabase.auth.refreshSession();
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('refreshSession timeout after 5 seconds')), 5000)
      );
      
      Promise.race([refreshPromise, timeoutPromise]).then((result: any) => {
        const { data: refreshData, error: refreshError } = result;
        
        if (refreshError) {
          cleanupAuthState();
          setSession(null);
          setUser(null);
          setLoading(false);
          
          if (window.location.pathname.startsWith('/dashboard')) {
            navigate('/auth', { replace: true });
          }
          return;
        }
        
        if (refreshData.session) {
          setSession(refreshData.session);
          setUser(refreshData.session.user);
          setLoading(false);
          return;
        } else {
          cleanupAuthState();
          setSession(null);
          setUser(null);
          setLoading(false);
          
          if (window.location.pathname.startsWith('/dashboard')) {
            navigate('/auth', { replace: true });
          }
          return;
        }
      }).catch((refreshException) => {
        cleanupAuthState();
        setSession(null);
        setUser(null);
        setLoading(false);
        
        if (window.location.pathname.startsWith('/dashboard')) {
          navigate('/auth', { replace: true });
        }
      });
    } else {
      // Token is valid, get the session normally
      supabase.auth.getSession().then(async ({ data: { session }, error }) => {
        if (error) {
          // Handle user_not_found error
          if (error.message?.includes('user_not_found') || error.message?.includes('User from sub claim in JWT does not exist')) {
            cleanupAuthState();
            setSession(null);
            setUser(null);
            setLoading(false);
            
            if (window.location.pathname.startsWith('/dashboard')) {
              navigate('/auth', { replace: true });
            }
            return;
          }
          
          // For other errors, still set loading to false to prevent infinite loading
          setSession(null);
          setUser(null);
          setLoading(false);
          return;
        }
        
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }).catch((catchError) => {
        setSession(null);
        setUser(null);
        setLoading(false);
      });
    }
    
    // Set up auth state change listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        // Handle auth errors
        if (event === 'TOKEN_REFRESHED' && session) {
          try {
            // Check if user still exists in database
            const { data: profile, error } = await supabase
              .from('profiles')
              .select('id')
              .eq('id', session.user.id)
              .single();
            
            if (error && error.code === 'PGRST116') {
              // User not found in database, sign them out
              cleanupAuthState();
              setSession(null);
              setUser(null);
              navigate('/auth', { replace: true });
              return;
            }
            
            // Update session state after successful token refresh
            setSession(session);
            setUser(session.user);
          } catch (profileError) {
            // Even if profile check fails, still update the session state
            setSession(session);
            setUser(session.user);
          }
        }
        
        // Prevent re-renders on tab focus, etc. by only updating state if the user ID is different.
        if (event === 'USER_UPDATED' || session?.user?.id !== userRef.current?.id) {
          setSession(session);
          setUser(session?.user ?? null);
          
          // Track session in database when user signs in
          if (event === 'SIGNED_IN' && session?.user) {
            try {
              // Create session record
              await SessionService.createSession(
                session.user.id,
                session.access_token,
                undefined, // IP address (can be added later)
                navigator.userAgent,
                undefined // Location (can be added later)
              );

              // Log successful login with human-readable information
              await AccessLogService.logUserLogin({
                user_id: session.user.id,
                user_email: session.user.email || 'unknown@email.com',
                ip_address: undefined, // Will be undefined for now, can be enhanced later
                user_agent: navigator.userAgent,
                location: 'Unknown location', // Can be enhanced with geolocation later
                login_method: 'email' // Default to email, can be enhanced based on auth method
              });
            } catch (error) {
              console.error('Error creating session or logging access:', error);
            }
          }
        }

        const currentPath = window.location.pathname;
        const isAuthPage = currentPath.startsWith('/auth');
        const isDashboardPage = currentPath.startsWith('/dashboard');
        const isSecureFormPage = currentPath.startsWith('/secure-form');

        // Only navigate to dashboard if user is fully authenticated (not pending MFA)
        if (event === 'SIGNED_IN' && !isAuthPage && !isDashboardPage && !isSecureFormPage && !pendingMFAUser) {
          navigate('/dashboard', { replace: true });
        }

        if (event === 'PASSWORD_RECOVERY') {
          sessionStorage.setItem('passwordRecovery', 'true');
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [navigate]);

  const signOut = useCallback(async () => {
    try {
      // Log user logout before signing out
      if (user) {
        try {
          await AccessLogService.logUserLogout(
            user.id,
            user.email || 'unknown@email.com',
            undefined, // IP address (can be enhanced later)
            navigator.userAgent
          );
        } catch (error) {
          // Silently handle logging errors
        }
      }

      // Deactivate session in database before signing out
      if (session?.access_token) {
        try {
          await SessionService.deactivateSession(session.access_token);
        } catch (error) {
          // Silently handle session deactivation errors
        }
      }
      
      cleanupAuthState();
      // Clear custom sessionStorage items
      sessionStorage.removeItem('profileSettings_resetProcessed');
      sessionStorage.removeItem('passwordRecovery');
      await supabase.auth.signOut({ scope: 'global' });
      setSession(null);
      setUser(null);
      setPendingMFAUser(null);
      navigate('/', { replace: true });
      localStorage.removeItem('cameFromDashboard');
    } catch (error) {
      // Silently handle sign out errors
    }
  }, [navigate, session, user]);

  // Global error handler for user_not_found errors
  const handleUserNotFoundError = useCallback(async () => {
    cleanupAuthState();
    setSession(null);
    setUser(null);
    setPendingMFAUser(null);
    navigate('/auth', { replace: true });
  }, [navigate]);

  // Manual function to clear invalid tokens - with refresh attempt
  const clearInvalidToken = useCallback(async () => {
    // First try to refresh the token
    try {
      const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
      
      if (refreshError) {
        cleanupAuthState();
        setSession(null);
        setUser(null);
        setPendingMFAUser(null);
        setLoading(false);
        
        if (window.location.pathname.startsWith('/dashboard')) {
          navigate('/auth', { replace: true });
        }
        return;
      }
      
      if (refreshData.session) {
        setSession(refreshData.session);
        setUser(refreshData.session.user);
        setLoading(false);
        return;
      }
    } catch (refreshException) {
      // Silently handle refresh exceptions
    }
    
    // If refresh fails, clear everything
    cleanupAuthState();
    setSession(null);
    setUser(null);
    setPendingMFAUser(null);
    setLoading(false);
    
    if (window.location.pathname.startsWith('/dashboard')) {
      navigate('/auth', { replace: true });
    }
  }, [navigate]);

  // Expose the error handler for use in other components
  const value = useMemo(() => ({
    user,
    session,
    loading,
    signOut,
    pendingMFAUser,
    setPendingMFAUser,
    isMFAVerificationPending: !!pendingMFAUser,
    handleUserNotFoundError,
    clearInvalidToken
  }), [user, session, loading, signOut, pendingMFAUser, handleUserNotFoundError, clearInvalidToken]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Custom hook to use the AuthContext
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}; 