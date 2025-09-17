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
  try {
    // Check if localStorage is available
    if (typeof localStorage === 'undefined' || !localStorage) {
      return null;
    }
    
    const sessionStr = localStorage.getItem(import.meta.env.VITE_AUTH_TOKEN);
    if (sessionStr) {
      const session = JSON.parse(sessionStr);
      return session.user || null;
    }
  } catch (error) {
    console.warn('Error accessing localStorage for initial user:', error);
  }
  return null;
};

const cleanupAuthState = () => {
  try {
    if (typeof localStorage !== 'undefined' && localStorage) {
      Object.keys(localStorage).forEach((key) => {
        if (key.startsWith('supabase.auth.') || key.includes('sb-')) {
          localStorage.removeItem(key);
        }
      });
    }
  } catch (error) {
    console.warn('Error cleaning up localStorage:', error);
  }
  
  try {
    if (typeof sessionStorage !== 'undefined' && sessionStorage) {
      Object.keys(sessionStorage).forEach((key) => {
        if (key.startsWith('supabase.auth.') || key.includes('sb-')) {
          sessionStorage.removeItem(key);
        }
      });
    }
  } catch (error) {
    console.warn('Error cleaning up sessionStorage:', error);
  }
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
    console.log('🔐 AuthContext: Initializing authentication...');
    console.log('🔐 AuthContext: Current path:', window.location.pathname);
    console.log('🔐 AuthContext: Initial user state:', getInitialUser());
    
    // Get the initial session and user data
    supabase.auth.getSession().then(async ({ data: { session }, error }) => {
      console.log('🔐 AuthContext: getSession result:', { session: !!session, error: !!error });
      
      if (error) {
        console.error('🔐 AuthContext: Error getting session:', error);
        console.error('🔐 AuthContext: Error details:', {
          message: error.message,
          code: error.code,
          status: error.status
        });
        
        // Handle user_not_found error
        if (error.message?.includes('user_not_found') || error.message?.includes('User from sub claim in JWT does not exist')) {
          console.warn('🔐 AuthContext: User not found, clearing auth state and redirecting to login');
          cleanupAuthState();
          setSession(null);
          setUser(null);
          setLoading(false);
          
          // Redirect to login if on dashboard
          if (window.location.pathname.startsWith('/dashboard')) {
            console.log('🔐 AuthContext: Redirecting to /auth from dashboard');
            navigate('/auth', { replace: true });
          }
          return;
        }
      }
      
      console.log('🔐 AuthContext: Setting session and user:', {
        hasSession: !!session,
        hasUser: !!session?.user,
        userId: session?.user?.id,
        userEmail: session?.user?.email
      });
      
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      
      console.log('🔐 AuthContext: Initial auth setup complete');
    });
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('🔐 AuthContext: Auth state change event:', event, {
          hasSession: !!session,
          hasUser: !!session?.user,
          userId: session?.user?.id,
          currentPath: window.location.pathname
        });
        
        // Handle auth errors
        if (event === 'TOKEN_REFRESHED' && session) {
          console.log('🔐 AuthContext: Token refreshed, checking user profile...');
          try {
            // Check if user still exists in database
            const { data: profile, error } = await supabase
              .from('profiles')
              .select('id')
              .eq('id', session.user.id)
              .single();
            
            console.log('🔐 AuthContext: Profile check result:', { profile: !!profile, error: !!error });
            
            if (error && error.code === 'PGRST116') {
              // User not found in database, sign them out
              console.warn('🔐 AuthContext: User not found in database during auth state change, signing out');
              cleanupAuthState();
              setSession(null);
              setUser(null);
              navigate('/auth', { replace: true });
              return;
            }
          } catch (profileError) {
            console.error('🔐 AuthContext: Error checking user profile during auth state change:', profileError);
          }
        }
        
        // Prevent re-renders on tab focus, etc. by only updating state if the user ID is different.
        if (event === 'USER_UPDATED' || session?.user?.id !== userRef.current?.id) {
          console.log('🔐 AuthContext: Updating user state:', {
            event,
            previousUserId: userRef.current?.id,
            newUserId: session?.user?.id,
            isSignIn: event === 'SIGNED_IN'
          });
          
          setSession(session);
          setUser(session?.user ?? null);
          
          // Track session in database when user signs in
          if (event === 'SIGNED_IN' && session?.user) {
            console.log('🔐 AuthContext: User signed in, creating session record...');
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
              
              console.log('🔐 AuthContext: Session record and access log created successfully');
            } catch (error) {
              console.error('🔐 AuthContext: Error creating session or logging access:', error);
            }
          }
        }

        const currentPath = window.location.pathname;
        const isAuthPage = currentPath.startsWith('/auth');
        const isDashboardPage = currentPath.startsWith('/dashboard');
        const isSecureFormPage = currentPath.startsWith('/secure-form');

        console.log('🔐 AuthContext: Navigation check:', {
          event,
          currentPath,
          isAuthPage,
          isDashboardPage,
          isSecureFormPage,
          hasPendingMFA: !!pendingMFAUser,
          shouldNavigate: event === 'SIGNED_IN' && !isAuthPage && !isDashboardPage && !isSecureFormPage && !pendingMFAUser
        });

        // Only navigate to dashboard if user is fully authenticated (not pending MFA)
        if (event === 'SIGNED_IN' && !isAuthPage && !isDashboardPage && !isSecureFormPage && !pendingMFAUser) {
          console.log('🔐 AuthContext: Navigating to dashboard after sign in');
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