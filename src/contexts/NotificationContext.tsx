import React, { createContext, useContext, useState, useEffect, ReactNode, useRef, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import NotificationService, { Notification } from '@/services/notificationService';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  error: string | null;
  connectionStatus: 'connected' | 'connecting' | 'disconnected' | 'error';
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
  clearAllNotifications: () => Promise<void>;
  refreshNotifications: () => Promise<void>;
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'read' | 'userId' | 'created_at'>) => Promise<void>;
  reconnect: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

interface NotificationProviderProps {
  children: ReactNode;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({ children }) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'connecting' | 'disconnected' | 'error'>('disconnected');
  
  // Refs for subscription management
  const subscriptionRef = useRef<any>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const isConnectingRef = useRef(false);
  const maxReconnectAttempts = 3; // Reduced attempts
  const baseReconnectDelay = 5000; // Increased delay to 5 seconds

  // Load initial data when user changes
  useEffect(() => {
    if (user?.id) {
      loadNotifications();
      loadUnreadCount();
      setupRealtimeSubscription();
    } else {
      // Reset state when user logs out
      cleanupSubscription();
      setNotifications([]);
      setUnreadCount(0);
      setConnectionStatus('disconnected');
    }

    // Cleanup on unmount or user change
    return () => {
      cleanupSubscription();
    };
  }, [user?.id]);

  // Cleanup subscription when component unmounts
  useEffect(() => {
    return () => {
      cleanupSubscription();
    };
  }, []);

  const cleanupSubscription = useCallback(() => {
    if (subscriptionRef.current) {
      supabase.removeChannel(subscriptionRef.current);
      subscriptionRef.current = null;
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    reconnectAttemptsRef.current = 0;
    isConnectingRef.current = false;
  }, []);

  const setupRealtimeSubscription = useCallback(async () => {
    if (!user?.id || isConnectingRef.current) return;

    try {
      isConnectingRef.current = true;
      setConnectionStatus('connecting');
      
      // Clean up any existing subscription
      if (subscriptionRef.current) {
        supabase.removeChannel(subscriptionRef.current);
        subscriptionRef.current = null;
      }

      // Create simplified subscription - only essential handlers
      const subscription = supabase
        .channel(`notifications-${user.id}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${user.id}`
          },
          (payload) => {
            handleRealtimeUpdate(payload);
          }
        )
        .subscribe((status) => {
          console.log('Subscription status:', status);
          if (status === 'SUBSCRIBED') {
            setConnectionStatus('connected');
            reconnectAttemptsRef.current = 0;
            isConnectingRef.current = false;
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            setConnectionStatus('error');
            isConnectingRef.current = false;
            handleDisconnect();
          }
        });

      subscriptionRef.current = subscription;

    } catch (err: any) {
      console.error('Failed to setup realtime subscription:', err);
      setConnectionStatus('error');
      isConnectingRef.current = false;
      handleDisconnect();
    }
  }, [user?.id]);

  const handleRealtimeUpdate = useCallback((payload: any) => {
    console.log('Realtime update received:', payload);
    
    const { eventType, new: newRecord, old: oldRecord } = payload;

    switch (eventType) {
      case 'INSERT':
        // New notification created
        if (newRecord) {
          const newNotification = newRecord as Notification;
          setNotifications(prev => [newNotification, ...prev]);
          setUnreadCount(prev => prev + 1);
          
          // Show toast for new notifications (optional)
          if (newNotification.notificationType !== 'system_maintenance') {
            const notificationType = newNotification.notificationType || newNotification.type;
            toast.success(`New ${notificationType.replace('_', ' ')} notification`);
          }
        }
        break;

      case 'UPDATE':
        // Notification updated (e.g., marked as read)
        if (newRecord && oldRecord) {
          const updatedNotification = newRecord as Notification;
          const oldNotification = oldRecord as Notification;
          
          setNotifications(prev => 
            prev.map(n => n.id === updatedNotification.id ? updatedNotification : n)
          );
          
          // Update unread count
          if (oldNotification.read === false && updatedNotification.read === true) {
            setUnreadCount(prev => Math.max(0, prev - 1));
          } else if (oldNotification.read === true && updatedNotification.read === false) {
            setUnreadCount(prev => prev + 1);
          }
        }
        break;

      case 'DELETE':
        // Notification deleted
        if (oldRecord) {
          const deletedNotification = oldRecord as Notification;
          setNotifications(prev => 
            prev.filter(n => n.id !== deletedNotification.id)
          );
          
          // Update unread count if deleted notification was unread
          if (deletedNotification.read === false) {
            setUnreadCount(prev => Math.max(0, prev - 1));
          }
        }
        break;

      default:
        console.log('Unknown event type:', eventType);
    }
  }, []);

  const handleDisconnect = useCallback(() => {
    // Prevent multiple disconnect handlers from running
    if (isConnectingRef.current) return;
    
    setConnectionStatus('disconnected');
    
    // Implement exponential backoff for reconnection
    if (reconnectAttemptsRef.current < maxReconnectAttempts) {
      const delay = baseReconnectDelay * Math.pow(2, reconnectAttemptsRef.current);
      reconnectAttemptsRef.current++;
      
      console.log(`Attempting to reconnect in ${delay}ms (attempt ${reconnectAttemptsRef.current}/${maxReconnectAttempts})`);
      
      reconnectTimeoutRef.current = setTimeout(() => {
        setupRealtimeSubscription();
      }, delay);
    } else {
      console.error('Max reconnection attempts reached');
      setError('Connection lost. Please refresh the page to reconnect.');
      toast.error('Notification connection lost. Please refresh the page.');
    }
  }, [setupRealtimeSubscription]);

  const reconnect = useCallback(async () => {
    console.log('Manual reconnection requested');
    reconnectAttemptsRef.current = 0;
    setError(null);
    
    // Clear any existing reconnection timeout
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    await setupRealtimeSubscription();
  }, [setupRealtimeSubscription]);

  const loadNotifications = async () => {
    if (!user?.id) return;

    setLoading(true);
    setError(null);
    
    try {
      const data = await NotificationService.getNotifications(user.id);
      setNotifications(data);
    } catch (err: any) {
      setError(err.message);
      console.error('Failed to load notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadUnreadCount = async () => {
    if (!user?.id) return;

    try {
      const count = await NotificationService.getUnreadCount(user.id);
      setUnreadCount(count);
    } catch (err: any) {
      console.error('Failed to load unread count:', err);
    }
  };

  const markAsRead = async (id: string) => {
    if (!user?.id) return;

    try {
      // Update local state immediately for better UX
      setNotifications(prev => 
        prev.map(n => n.id === id ? { ...n, read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));

      await NotificationService.markAsRead(id, user.id);
    } catch (err: any) {
      // Revert local state on error
      setNotifications(prev => 
        prev.map(n => n.id === id ? { ...n, read: false } : n)
      );
      setUnreadCount(prev => prev + 1);
      
      toast.error('Failed to mark notification as read');
      console.error('Failed to mark notification as read:', err);
    }
  };

  const markAllAsRead = async () => {
    if (!user?.id) return;

    try {
      // Update local state immediately for better UX
      setNotifications(prev => 
        prev.map(n => ({ ...n, read: true }))
      );
      setUnreadCount(0);

      await NotificationService.markAllAsRead(user.id);
      
      toast.success('All notifications marked as read');
    } catch (err: any) {
      toast.error('Failed to mark all notifications as read');
      console.error('Failed to mark all notifications as read:', err);
    }
  };

  const deleteNotification = async (id: string) => {
    if (!user?.id) return;

    try {
      const notification = notifications.find(n => n.id === id);
      const wasUnread = notification?.read === false;

      // Update local state immediately for better UX
      setNotifications(prev => prev.filter(n => n.id !== id));
      if (wasUnread) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }

      await NotificationService.deleteNotification(id, user.id);
      
      toast.success('Notification deleted');
    } catch (err: any) {
      toast.error('Failed to delete notification');
      console.error('Failed to delete notification:', err);
    }
  };

  const clearAllNotifications = async () => {
    if (!user?.id) return;

    try {
      // Update local state immediately for better UX
      setNotifications([]);
      setUnreadCount(0);

      await NotificationService.clearAllNotifications(user.id);
      
      toast.success('All notifications cleared');
    } catch (err: any) {
      toast.error('Failed to clear notifications');
      console.error('Failed to clear notifications:', err);
    }
  };

  const refreshNotifications = async () => {
    await loadNotifications();
    await loadUnreadCount();
  };

  const addNotification = async (notificationData: Omit<Notification, 'id' | 'timestamp' | 'read' | 'userId' | 'created_at'>) => {
    if (!user?.id) return;

    try {
      const newNotification = await NotificationService.createNotification({
        ...notificationData,
        userId: user.id,
      });

      // Add to local state immediately for better UX
      setNotifications(prev => [newNotification, ...prev]);
      setUnreadCount(prev => prev + 1);
    } catch (err: any) {
      toast.error('Failed to create notification');
      console.error('Failed to create notification:', err);
    }
  };

  const value: NotificationContextType = {
    notifications,
    unreadCount,
    loading,
    error,
    connectionStatus,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAllNotifications,
    refreshNotifications,
    addNotification,
    reconnect,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = (): NotificationContextType => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};
