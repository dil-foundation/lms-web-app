import { useEffect, useCallback, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useNetworkStatus } from './useNetworkStatus';
import { toast } from 'sonner';

export interface OfflineRouteConfig {
  allowedOfflineRoutes: string[];
  redirectRoute: string;
  enabledRoles: string[];
}

// Default configuration for offline route protection
const DEFAULT_CONFIG: OfflineRouteConfig = {
  allowedOfflineRoutes: [
    '/dashboard/offline-learning',
    '/dashboard/courses/:id/content',
  ],
  redirectRoute: '/dashboard/offline-learning',
  enabledRoles: ['student'], // Only apply restrictions to students
};

// Route matching utility with parameter support
const matchRoute = (currentPath: string, routePattern: string): boolean => {
  // Convert route pattern to regex
  const regexPattern = routePattern
    .replace(/:[^/]+/g, '[^/]+') // Replace :param with regex
    .replace(/\//g, '\\/'); // Escape forward slashes
  
  const regex = new RegExp(`^${regexPattern}$`);
  return regex.test(currentPath);
};

// Check if current route is allowed when offline
const isRouteAllowedOffline = (
  currentPath: string, 
  allowedRoutes: string[]
): boolean => {
  return allowedRoutes.some(route => matchRoute(currentPath, route));
};

export interface UseOfflineRouteGuardOptions {
  userRole?: string;
  config?: Partial<OfflineRouteConfig>;
  onRedirect?: (from: string, to: string, reason: string) => void;
  enableLogging?: boolean;
}

export const useOfflineRouteGuard = (options: UseOfflineRouteGuardOptions = {}) => {
  const {
    userRole,
    config: userConfig = {},
    onRedirect,
    enableLogging = true,
  } = options;

  const location = useLocation();
  const navigate = useNavigate();
  const { isOnline, connectionType, connectionQuality } = useNetworkStatus();
  
  // Merge user config with defaults
  const config: OfflineRouteConfig = { ...DEFAULT_CONFIG, ...userConfig };
  
  // Refs to track previous states and prevent unnecessary effects
  const previousOnlineStatus = useRef<boolean>(isOnline);
  const previousPath = useRef<string>(location.pathname);
  const hasShownOfflineToast = useRef<boolean>(false);
  const hasShownOnlineToast = useRef<boolean>(false);
  const redirectTimeoutRef = useRef<NodeJS.Timeout>();

  // Log function for debugging
  const log = useCallback((message: string, ...args: any[]) => {
    if (enableLogging) {
      console.log(`🛡️ OfflineRouteGuard: ${message}`, ...args);
    }
  }, [enableLogging]);

  // Check if route protection should be applied for current user
  const shouldApplyProtection = useCallback((): boolean => {
    if (!userRole) {
      log('No user role provided, skipping protection');
      return false;
    }

    if (!config.enabledRoles.includes(userRole)) {
      log(`User role "${userRole}" not in enabled roles`, config.enabledRoles);
      return false;
    }

    return true;
  }, [userRole, config.enabledRoles, log]);

  // Handle redirect with proper notifications
  const handleRedirect = useCallback((
    from: string, 
    to: string, 
    reason: string,
    showToast: boolean = true
  ) => {
    log(`Redirecting from "${from}" to "${to}" - Reason: ${reason}`);

    // Clear any existing redirect timeout
    if (redirectTimeoutRef.current) {
      clearTimeout(redirectTimeoutRef.current);
    }

    // Show toast notification if requested
    if (showToast) {
      const toastMessage = reason === 'offline' 
        ? "You're now offline. Redirecting to available content..."
        : "This page is not available offline. Redirecting...";
      
      toast.info(toastMessage, {
        description: `Connection: ${connectionType} (${connectionQuality})`,
        duration: 4000,
      });
    }

    // Call user callback if provided
    if (onRedirect) {
      onRedirect(from, to, reason);
    }

    // Perform redirect with a slight delay to allow toast to show
    redirectTimeoutRef.current = setTimeout(() => {
      navigate(to, { replace: true });
    }, 500);
  }, [navigate, onRedirect, log, connectionType, connectionQuality]);

  // Show connection status notifications
  const showConnectionStatusToast = useCallback((isCurrentlyOnline: boolean) => {
    if (isCurrentlyOnline && !hasShownOnlineToast.current) {
      hasShownOnlineToast.current = true;
      hasShownOfflineToast.current = false;
      
      toast.success("Connection restored! Full access available.", {
        description: `Connected via ${connectionType}`,
        duration: 3000,
      });
      
      log('Connection restored notification shown');
    } else if (!isCurrentlyOnline && !hasShownOfflineToast.current) {
      hasShownOfflineToast.current = true;
      hasShownOnlineToast.current = false;
      
      toast.warning("You're now offline", {
        description: "Limited functionality available",
        duration: 4000,
      });
      
      log('Offline notification shown');
    }
  }, [connectionType, log]);

  // Main effect to handle route protection
  useEffect(() => {
    const currentPath = location.pathname;
    const wasOnline = previousOnlineStatus.current;
    const previousPathValue = previousPath.current;

    // Update refs
    previousOnlineStatus.current = isOnline;
    previousPath.current = currentPath;

    // Skip if protection is not enabled for this user
    if (!shouldApplyProtection()) {
      return;
    }

    log('Route guard check:', {
      currentPath,
      isOnline,
      wasOnline,
      userRole,
      connectionType,
      connectionQuality,
      allowedRoutes: config.allowedOfflineRoutes,
      shouldApplyProtection: shouldApplyProtection(),
    });

    // Handle online/offline status changes
    if (wasOnline !== isOnline) {
      showConnectionStatusToast(isOnline);
    }

    // Only apply restrictions when offline
    if (!isOnline) {
      const isCurrentRouteAllowed = isRouteAllowedOffline(currentPath, config.allowedOfflineRoutes);
      
      if (!isCurrentRouteAllowed) {
        log(`Route "${currentPath}" not allowed offline, redirecting...`);
        handleRedirect(currentPath, config.redirectRoute, 'offline');
        return;
      } else {
        log(`Route "${currentPath}" is allowed offline`);
      }
    }

    // Handle route changes while offline
    if (!isOnline && currentPath !== previousPathValue) {
      const isNewRouteAllowed = isRouteAllowedOffline(currentPath, config.allowedOfflineRoutes);
      
      if (!isNewRouteAllowed) {
        log(`Navigation to "${currentPath}" blocked while offline`);
        handleRedirect(currentPath, config.redirectRoute, 'offline');
        return;
      }
    }

  }, [
    location.pathname,
    isOnline,
    userRole,
    config.allowedOfflineRoutes,
    config.redirectRoute,
    shouldApplyProtection,
    showConnectionStatusToast,
    handleRedirect,
    log,
    connectionType,
    connectionQuality,
  ]);

  // Cleanup effect
  useEffect(() => {
    return () => {
      if (redirectTimeoutRef.current) {
        clearTimeout(redirectTimeoutRef.current);
      }
    };
  }, []);

  // Utility functions for external use
  const checkRouteAccess = useCallback((path: string): boolean => {
    if (!shouldApplyProtection()) return true;
    if (isOnline) return true;
    return isRouteAllowedOffline(path, config.allowedOfflineRoutes);
  }, [isOnline, shouldApplyProtection, config.allowedOfflineRoutes]);

  const getOfflineStatus = useCallback(() => ({
    isOnline,
    connectionType,
    connectionQuality,
    isProtectionEnabled: shouldApplyProtection(),
    allowedRoutes: config.allowedOfflineRoutes,
    currentRouteAllowed: checkRouteAccess(location.pathname),
  }), [
    isOnline,
    connectionType,
    connectionQuality,
    shouldApplyProtection,
    config.allowedOfflineRoutes,
    checkRouteAccess,
    location.pathname,
  ]);

  return {
    isOnline,
    connectionType,
    connectionQuality,
    isProtectionEnabled: shouldApplyProtection(),
    checkRouteAccess,
    getOfflineStatus,
    currentRouteAllowed: checkRouteAccess(location.pathname),
  };
};
