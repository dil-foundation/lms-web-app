import { createContext, useState, useEffect, useMemo, useCallback, ReactNode, useRef, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import SessionService from '@/services/sessionService';
import AccessLogService from '@/services/accessLogService';

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
}

// Create the context with a default undefined value
export const AuthContext = createContext<AuthContextType | undefined>(undefined);

const getInitialUser = () => {
  // Don't try to read from localStorage manually - let Supabase handle it
  // The initial user will be set when getSession() is called
  console.log('🔐 getInitialUser: Returning null, will be set by getSession()');
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
    // Get the initial session and user data
    console.log('🔐 AuthContext: Getting initial session...');
    supabase.auth.getSession().then(async ({ data: { session }, error }) => {
      console.log('🔐 AuthContext: Session result:', { 
        hasSession: !!session, 
        hasError: !!error,
        userId: session?.user?.id,
        expiresAt: session?.expires_at,
        expiresAtDate: session?.expires_at ? new Date(session.expires_at * 1000).toISOString() : 'N/A',
        isExpired: session?.expires_at ? session.expires_at < Math.floor(Date.now() / 1000) : 'N/A'
      });
      
      if (error) {
        console.error('Error getting session:', error);
        
        // Handle user_not_found error
        if (error.message?.includes('user_not_found') || error.message?.includes('User from sub claim in JWT does not exist')) {
          console.warn('User not found, clearing auth state and redirecting to login');
          cleanupAuthState();
          setSession(null);
          setUser(null);
          setLoading(false);
          
          // Redirect to login if on dashboard
          if (window.location.pathname.startsWith('/dashboard')) {
            navigate('/auth', { replace: true });
          }
          return;
        }
        
        // For other errors, still set loading to false to prevent infinite loading
        console.warn('Session error (non-user_not_found), setting loading to false');
        setSession(null);
        setUser(null);
        setLoading(false);
        return;
      }
      
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    }).catch((catchError) => {
      // Handle any unexpected errors in the promise chain
      console.error('Unexpected error in getSession:', catchError);
      setSession(null);
      setUser(null);
      setLoading(false);
    });
    
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
              console.warn('User not found in database during auth state change, signing out');
              cleanupAuthState();
              setSession(null);
              setUser(null);
              navigate('/auth', { replace: true });
              return;
            }
            
            // Update session state after successful token refresh
            console.log('🔄 Token refreshed successfully, updating session state');
            setSession(session);
            setUser(session.user);
          } catch (profileError) {
            console.error('Error checking user profile during auth state change:', profileError);
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
          console.error('Error logging user logout:', error);
        }
      }

      // Deactivate session in database before signing out
      if (session?.access_token) {
        try {
          await SessionService.deactivateSession(session.access_token);
        } catch (error) {
          console.error('Error deactivating session:', error);
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
      console.error('🔐 Sign out error:', error);
    }
  }, [navigate, session, user]);

  // Global error handler for user_not_found errors
  const handleUserNotFoundError = useCallback(async () => {
    console.warn('Handling user_not_found error globally');
    cleanupAuthState();
    setSession(null);
    setUser(null);
    setPendingMFAUser(null);
    navigate('/auth', { replace: true });
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
    handleUserNotFoundError
  }), [user, session, loading, signOut, pendingMFAUser, handleUserNotFoundError]);

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