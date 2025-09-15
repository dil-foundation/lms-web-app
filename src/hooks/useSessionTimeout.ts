import { useEffect, useRef, useCallback, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import SecurityService from '@/services/securityService';
import SessionService from '@/services/sessionService';

export const useSessionTimeout = () => {
  const { user, session, signOut } = useAuth();
  const navigate = useNavigate();
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const warningRef = useRef<NodeJS.Timeout | null>(null);
  const lastActivityRef = useRef<number>(Date.now());
  const sessionTimeoutRef = useRef<number>(30); // Default 30 minutes
  
  // Warning state
  const [showWarning, setShowWarning] = useState(false);
  const [warningTimeRemaining, setWarningTimeRemaining] = useState(0);
  const WARNING_BEFORE_TIMEOUT = 5 * 60; // Show warning 5 minutes before timeout

  // Get session timeout setting from security settings
  const getSessionTimeout = useCallback(async () => {
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
    
    // Hide warning if user is active
    if (showWarning) {
      setShowWarning(false);
      if (warningRef.current) {
        clearTimeout(warningRef.current);
        warningRef.current = null;
      }
    }
  }, [showWarning]);

  // Check if session has timed out
  const checkSessionTimeout = useCallback(async () => {
    if (!user || !session) return;

    const now = Date.now();
    const timeSinceLastActivity = now - lastActivityRef.current;
    const timeoutMs = sessionTimeoutRef.current * 60 * 1000; // Convert minutes to milliseconds
    const warningMs = (sessionTimeoutRef.current - WARNING_BEFORE_TIMEOUT / 60) * 60 * 1000;

    // Check if we should show warning
    if (timeSinceLastActivity >= warningMs && !showWarning) {
      const remainingTime = timeoutMs - timeSinceLastActivity;
      setWarningTimeRemaining(Math.max(0, Math.floor(remainingTime / 1000)));
      setShowWarning(true);
      
      // Set timeout for actual logout
      warningRef.current = setTimeout(() => {
        handleSessionTimeout();
      }, remainingTime);
    }

    // Check if session has completely timed out
    if (timeSinceLastActivity >= timeoutMs) {
      handleSessionTimeout();
    }
  }, [user, session, showWarning]);

  // Handle session timeout
  const handleSessionTimeout = useCallback(async () => {
    console.log(`Session timed out after ${sessionTimeoutRef.current} minutes of inactivity`);
    
    // Clear any pending warnings
    setShowWarning(false);
    if (warningRef.current) {
      clearTimeout(warningRef.current);
      warningRef.current = null;
    }
    
    // Show warning toast
    toast.error('Your session has expired due to inactivity. Please log in again.');
    
    // Sign out the user
    await signOut();
    
    // Navigate to login page
    navigate('/auth', { replace: true });
  }, [signOut, navigate]);

  // Handle extending session
  const handleExtendSession = useCallback(() => {
    updateLastActivity();
    setShowWarning(false);
    if (warningRef.current) {
      clearTimeout(warningRef.current);
      warningRef.current = null;
    }
  }, [updateLastActivity]);

  // Handle dismissing warning
  const handleDismissWarning = useCallback(() => {
    setShowWarning(false);
    // Don't clear the timeout - let it expire naturally
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
        // Don't update activity if the event originated from the warning dialog
        const target = event.target as Element;
        if (target && typeof target.closest === 'function') {
          const warningElement = target.closest('[data-session-warning]');
          if (warningElement) {
            return; // Event originated from warning dialog, don't update activity
          }
        }
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

  // Set up periodic timeout checking
  const setupTimeoutChecking = useCallback(() => {
    // Check every 60 seconds to reduce frequency (was 30 seconds)
    timeoutRef.current = setInterval(checkSessionTimeout, 60 * 1000);
  }, [checkSessionTimeout]);

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
      setShowWarning(false);
      return;
    }



    const initializeTimeout = async () => {
      // Get current session timeout setting
      await getSessionTimeout();
      
      // Set up activity listeners
      const cleanupListeners = setupActivityListeners();
      
      // Set up periodic timeout checking
      setupTimeoutChecking();
      
      // Update session activity in database
      try {
        await SessionService.updateSessionActivity(session.access_token);
      } catch (error) {
        console.error('Error updating session activity:', error);
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
    showWarning,
    warningTimeRemaining,
    handleExtendSession,
    handleDismissWarning
  };
};
