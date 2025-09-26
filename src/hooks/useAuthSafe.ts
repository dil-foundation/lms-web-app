// Safe version of useAuth that doesn't throw errors
// Used by offline components that might load before AuthProvider

import { useContext } from 'react';
import { AuthContext } from '@/contexts/AuthContext';

export const useAuthSafe = () => {
  try {
    const context = useContext(AuthContext);
    return context || { user: null, loading: true };
  } catch (error) {
    // Return safe defaults if AuthProvider is not available
    return { user: null, loading: true };
  }
};
