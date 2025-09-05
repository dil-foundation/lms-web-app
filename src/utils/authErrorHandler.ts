import { supabase } from '@/integrations/supabase/client';

// Global error handler for authentication errors
export const handleAuthError = async (error: any): Promise<boolean> => {
  // Check if this is a user_not_found error
  if (
    error?.message?.includes('user_not_found') ||
    error?.message?.includes('User from sub claim in JWT does not exist') ||
    error?.code === 'user_not_found'
  ) {
    console.warn('User not found error detected, signing out automatically');
    
    try {
      // Clear all auth-related storage
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
      
      // Clear custom sessionStorage items
      sessionStorage.removeItem('profileSettings_resetProcessed');
      sessionStorage.removeItem('passwordRecovery');
      localStorage.removeItem('cameFromDashboard');
      
      // Sign out from Supabase
      await supabase.auth.signOut({ scope: 'global' });
      
      // Redirect to login page if on dashboard
      if (window.location.pathname.startsWith('/dashboard')) {
        window.location.href = '/auth';
      }
      
      return true; // Error was handled
    } catch (signOutError) {
      console.error('Error during automatic sign out:', signOutError);
      
      // Force redirect even if sign out fails
      if (window.location.pathname.startsWith('/dashboard')) {
        window.location.href = '/auth';
      }
      
      return true; // Error was handled
    }
  }
  
  return false; // Error was not handled
};

// Function to check if user exists in database
export const checkUserExists = async (userId: string): Promise<boolean> => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .single();
    
    if (error && error.code === 'PGRST116') {
      return false; // User not found
    }
    
    return !!data; // User exists
  } catch (error) {
    console.error('Error checking user existence:', error);
    return false;
  }
};
