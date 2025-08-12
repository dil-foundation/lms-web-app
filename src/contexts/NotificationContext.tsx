import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from '@/hooks/useAuth';
import NotificationService, { Notification } from '@/services/notificationService';
import { toast } from 'sonner';

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  error: string | null;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
  clearAllNotifications: () => Promise<void>;
  refreshNotifications: () => Promise<void>;
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'read' | 'userId' | 'created_at'>) => Promise<void>;
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

  // Load notifications when user changes
  useEffect(() => {
    if (user?.id) {
      loadNotifications();
      loadUnreadCount();
    } else {
      // Reset state when user logs out
      setNotifications([]);
      setUnreadCount(0);
    }
  }, [user?.id]);

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
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAllNotifications,
    refreshNotifications,
    addNotification,
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
