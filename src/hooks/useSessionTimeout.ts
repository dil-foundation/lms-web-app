import { useEffect, useRef, useCallback, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import SecurityService from '@/services/securityService';
import SessionService from '@/services/sessionService';
import { useCrossTabSessionSync } from './useCrossTabSessionSync';

export const useSessionTimeout = () => {
  const { user, session, signOut } = useAuth();
  const navigate = useNavigate();
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const warningRef = useRef<NodeJS.Timeout | null>(null);
  const lastActivityRef = useRef<number>(Date.now());
  const sessionTimeoutRef = useRef<number>(30); // Default 30 minutes
  const isHandlingTimeoutRef = useRef<boolean>(false); // Prevent multiple simultaneous timeouts
  
  // Remove warning state - we'll logout directly when timeout occurs

  // Cross-tab session sync
  const {
    broadcastSessionExtended,
    broadcastSessionTimeout,
    subscribeToSessionExtended,
    subscribeToSessionTimeout
  } = useCrossTabSessionSync();

  // Get session timeout setting from security settings (with offline awareness)
  const getSessionTimeout = useCallback(async () => {
    // Skip security settings fetch when offline, use default
    if (!navigator.onLine) {
      console.log('🔴 useSessionTimeout: Offline - using default session timeout');
      sessionTimeoutRef.current = 30;
      return 30;
    }

    try {
      const settings = await SecurityService.getSecuritySettings();
      const timeoutSetting = settings.find(s => s.setting_key === 'session_timeout_minutes');
      if (timeoutSetting) {
        const timeout = parseInt(timeoutSetting.setting_value);
        sessionTimeoutRef.current = timeout;
        return timeout;
      }
      return 30; // Default fallback
    } catch (error) {
      console.error('Error getting session timeout setting:', error);
      return 30; // Default fallback
    }
  }, []);

  // Update last activity timestamp
  const updateLastActivity = useCallback(() => {
    lastActivityRef.current = Date.now();
  }, []);

  // Handle session timeout
  const handleSessionTimeout = useCallback(async (isFromCrossTab = false) => {
    // Prevent multiple simultaneous timeout handling
    if (isHandlingTimeoutRef.current) {
      console.log('⚠️ Session timeout already being handled, ignoring duplicate');
      return;
    }
    
    isHandlingTimeoutRef.current = true;
    console.log(`🔄 Session timeout triggered - From cross-tab: ${isFromCrossTab}, Timeout: ${sessionTimeoutRef.current} minutes`);
    
    try {
      // Only broadcast if this timeout originated from this tab (not from cross-tab communication)
      if (!isFromCrossTab) {
        console.log('📡 Broadcasting session timeout to other tabs');
        broadcastSessionTimeout();
      } else {
        console.log('📨 Received timeout from another tab, not broadcasting');
      }
      
      // Clear any pending timeouts
      if (warningRef.current) {
        clearTimeout(warningRef.current);
        warningRef.current = null;
      }
      
      // Clear the main timeout interval
      if (timeoutRef.current) {
        clearInterval(timeoutRef.current);
        timeoutRef.current = null;
      }
      
      // Show logout message (only once per tab)
      if (!isFromCrossTab) {
        console.log('🚨 Showing session expired toast');
        toast.error('Your session has expired due to inactivity. Please log in again.');
      }
      
      // Sign out the user
      console.log('🚪 Signing out user');
      await signOut();
      
      // Navigate to login page
      console.log('🔄 Navigating to login page');
      navigate('/auth', { replace: true });
    } catch (error) {
      console.error('❌ Error during session timeout handling:', error);
    } finally {
      // Reset the flag after a delay to allow for cleanup
      setTimeout(() => {
        isHandlingTimeoutRef.current = false;
      }, 1000);
    }
  }, [signOut, navigate, broadcastSessionTimeout]);

  // Check if session has timed out
  const checkSessionTimeout = useCallback(async () => {
    if (!user || !session) {
      console.log('🔍 Session timeout check skipped - no user/session');
      return;
    }

    const now = Date.now();
    const timeSinceLastActivity = now - lastActivityRef.current;
    const timeoutMs = sessionTimeoutRef.current * 60 * 1000; // Convert minutes to milliseconds
    
    console.log(`🔍 Session timeout check - Time since last activity: ${Math.round(timeSinceLastActivity / 1000)}s, Timeout: ${Math.round(timeoutMs / 1000)}s`);

    // Check if session has timed out - logout immediately
    if (timeSinceLastActivity >= timeoutMs) {
      console.log('⏰ Session timeout detected, triggering logout');
      handleSessionTimeout();
    }
  }, [user, session, handleSessionTimeout]);

  // Handle extending session (no longer needed since we don't show warnings)
  const handleExtendSession = useCallback(() => {
    updateLastActivity();
    
    // Broadcast session extension to other tabs
    broadcastSessionExtended();
  }, [updateLastActivity, broadcastSessionExtended]);

  // Handle dismissing warning (no longer needed)
  const handleDismissWarning = useCallback(() => {
    // No longer needed since we don't show warnings
  }, []);

  // Set up activity listeners
  const setupActivityListeners = useCallback(() => {
    const events = [
      'mousedown',
      'mousemove',
      'keypress',
      'scroll',
      'touchstart',
      'click'
    ];

    const handleActivity = (event: Event) => {
      try {
        // No need to check for warning dialog since we removed it
        updateLastActivity();
      } catch (error) {
        // If there's any error with the target checking, just update activity
        console.warn('Error checking event target for session warning:', error);
        updateLastActivity();
      }
    };

    events.forEach(event => {
      document.addEventListener(event, handleActivity, true);
    });

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleActivity, true);
      });
    };
  }, [updateLastActivity]);

  // Set up periodic timeout checking (with offline awareness)
  const setupTimeoutChecking = useCallback(() => {
    // Check every 60 seconds to reduce frequency (was 30 seconds), but only when online
    timeoutRef.current = setInterval(() => {
      if (navigator.onLine) {
        checkSessionTimeout();
      } else {
        console.log('🔴 useSessionTimeout: Offline - skipping timeout check');
      }
    }, 60 * 1000);
  }, [checkSessionTimeout]);

  // Set up cross-tab event listeners
  useEffect(() => {
    if (!user || !session) return;

    // Listen for session extensions from other tabs
    const unsubscribeSessionExtended = subscribeToSessionExtended((message) => {
      console.log('Received session extended from another tab:', message);
      updateLastActivity();
    });

    // No longer need to listen for session warnings since we removed the warning system

    // Listen for session timeouts from other tabs
    const unsubscribeSessionTimeout = subscribeToSessionTimeout((message) => {
      console.log('📨 Received session timeout from another tab:', message);
      handleSessionTimeout(true); // Pass true to indicate this is from cross-tab communication
    });

    return () => {
      unsubscribeSessionExtended();
      unsubscribeSessionTimeout();
    };
  }, [user, session, subscribeToSessionExtended, subscribeToSessionTimeout, updateLastActivity, handleSessionTimeout]);

  // Initialize session timeout management
  useEffect(() => {
    if (!user || !session) {
      // Clear timeouts if no user/session
      if (timeoutRef.current) {
        clearInterval(timeoutRef.current);
        timeoutRef.current = null;
      }
      if (warningRef.current) {
        clearTimeout(warningRef.current);
        warningRef.current = null;
      }
      return;
    }

    const initializeTimeout = async () => {
      // Update last activity time when user/session becomes available
      lastActivityRef.current = Date.now();
      
      // Get current session timeout setting
      await getSessionTimeout();
      
      // Set up activity listeners
      const cleanupListeners = setupActivityListeners();
      
      // Set up periodic timeout checking
      setupTimeoutChecking();
      
      // Update session activity in database (only if online)
      if (navigator.onLine) {
        try {
          await SessionService.updateSessionActivity(session.access_token);
        } catch (error) {
          console.error('Error updating session activity:', error);
        }
      } else {
        console.log('🔴 useSessionTimeout: Offline - skipping session activity update');
      }

      return cleanupListeners;
    };

    initializeTimeout().then(cleanupListeners => {
      return () => {
        if (timeoutRef.current) {
          clearInterval(timeoutRef.current);
        }
        if (warningRef.current) {
          clearTimeout(warningRef.current);
        }
        if (cleanupListeners) {
          cleanupListeners();
        }
      };
    });

    // Cleanup on unmount
    return () => {
      if (timeoutRef.current) {
        clearInterval(timeoutRef.current);
      }
      if (warningRef.current) {
        clearTimeout(warningRef.current);
      }
    };
  }, [user, session, getSessionTimeout, setupActivityListeners, setupTimeoutChecking]);

  // Update session activity in database periodically
  useEffect(() => {
    if (!user || !session) return;

    const updateActivityInterval = setInterval(async () => {
      try {
        await SessionService.updateSessionActivity(session.access_token);
      } catch (error) {
        console.error('Error updating session activity:', error);
      }
    }, 5 * 60 * 1000); // Update every 5 minutes

    return () => {
      clearInterval(updateActivityInterval);
    };
  }, [user, session]);

  return {
    updateLastActivity,
    getSessionTimeout: () => sessionTimeoutRef.current,
    handleExtendSession,
    handleDismissWarning
  };
};
