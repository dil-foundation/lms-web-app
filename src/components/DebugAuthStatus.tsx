import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

export const DebugAuthStatus: React.FC = () => {
  const { user, session, loading } = useAuth();
  const [debugInfo, setDebugInfo] = useState<any>({});

  useEffect(() => {
    const updateDebugInfo = async () => {
      try {
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        
        setDebugInfo({
          authContextUser: user?.id,
          authContextSession: session?.access_token ? 'Present' : 'Missing',
          authContextLoading: loading,
          supabaseSession: currentSession?.access_token ? 'Present' : 'Missing',
          supabaseUser: currentUser?.id,
          tokenExpiry: currentSession?.expires_at ? new Date(currentSession.expires_at * 1000).toISOString() : 'N/A',
          localStorage: Object.keys(localStorage).filter(key => key.includes('supabase') || key.includes('sb-')),
          sessionStorage: Object.keys(sessionStorage).filter(key => key.includes('supabase') || key.includes('sb-'))
        });
      } catch (error) {
        console.error('Error getting debug info:', error);
      }
    };

    updateDebugInfo();
    const interval = setInterval(updateDebugInfo, 5000); // Update every 5 seconds

    return () => clearInterval(interval);
  }, [user, session, loading]);

  if (process.env.NODE_ENV === 'production') {
    return null; // Don't show in production
  }

  return (
    <div style={{
      position: 'fixed',
      top: '10px',
      right: '10px',
      background: 'rgba(0,0,0,0.8)',
      color: 'white',
      padding: '10px',
      borderRadius: '5px',
      fontSize: '12px',
      zIndex: 9999,
      maxWidth: '300px',
      fontFamily: 'monospace'
    }}>
      <h4>🔍 Auth Debug Info</h4>
      <div>Auth Loading: {loading ? '⏳' : '✅'}</div>
      <div>Auth User: {debugInfo.authContextUser || '❌'}</div>
      <div>Auth Session: {debugInfo.authContextSession || '❌'}</div>
      <div>Supabase User: {debugInfo.supabaseUser || '❌'}</div>
      <div>Supabase Session: {debugInfo.supabaseSession || '❌'}</div>
      <div>Token Expiry: {debugInfo.tokenExpiry}</div>
      <div>LocalStorage Keys: {debugInfo.localStorage?.length || 0}</div>
      <div>SessionStorage Keys: {debugInfo.sessionStorage?.length || 0}</div>
    </div>
  );
};
