import { useContext } from 'react';
import { AuthContext } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';


export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  const signOut = async () => {
    await supabase.auth.signOut();
    // The onAuthStateChange listener in AuthProvider will handle setting user to null
  };

  return { ...context, signOut };
};
