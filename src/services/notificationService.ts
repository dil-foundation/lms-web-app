import { supabase } from '@/integrations/supabase/client';

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  notificationType?: string; // For specific notification types like 'new_discussion', 'new_message', etc.
  timestamp: string;
  read: boolean;
  actionUrl?: string;
  actionData?: Record<string, any>; // Additional data for routing
  userId: string;
  created_at: string;
  updated_at?: string;
}

export interface NotificationInsert {
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  notificationType?: string;
  actionUrl?: string;
  actionData?: Record<string, any>;
  userId: string;
}

class NotificationService {
  private static readonly TABLE_NAME = 'notifications';

  /**
   * Get all notifications for a user
   */
  static async getNotifications(userId: string, limit = 50, offset = 0): Promise<Notification[]> {
    try {
      const { data, error } = await supabase
        .from(this.TABLE_NAME)
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        console.error('Database error fetching notifications:', error);
        throw new Error(`Failed to fetch notifications: ${error.message}`);
      }

      return (data || []).map(this.transformDatabaseRecord);
    } catch (error: any) {
      console.error('Error fetching notifications:', error);
      throw new Error(error.message || 'Failed to fetch notifications');
    }
  }

  /**
   * Get unread notifications count for a user
   */
  static async getUnreadCount(userId: string): Promise<number> {
    try {
      const { count, error } = await supabase
        .from(this.TABLE_NAME)
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('read', false);

      if (error) {
        console.error('Database error fetching unread count:', error);
        throw new Error(`Failed to fetch unread count: ${error.message}`);
      }

      return count || 0;
    } catch (error: any) {
      console.error('Error fetching unread count:', error);
      throw new Error(error.message || 'Failed to fetch unread count');
    }
  }

  /**
   * Mark a notification as read
   */
  static async markAsRead(notificationId: string, userId: string): Promise<Notification> {
    try {
      const { data, error } = await supabase
        .from(this.TABLE_NAME)
        .update({ 
          read: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', notificationId)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) {
        console.error('Database error marking notification as read:', error);
        throw new Error(`Failed to mark notification as read: ${error.message}`);
      }

      if (!data) {
        throw new Error('Notification not found or no permission to update');
      }

      return this.transformDatabaseRecord(data);
    } catch (error: any) {
      console.error('Error marking notification as read:', error);
      throw new Error(error.message || 'Failed to mark notification as read');
    }
  }

  /**
   * Mark all notifications as read for a user
   */
  static async markAllAsRead(userId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from(this.TABLE_NAME)
        .update({ 
          read: true,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId)
        .eq('read', false);

      if (error) {
        console.error('Database error marking all notifications as read:', error);
        throw new Error(`Failed to mark all notifications as read: ${error.message}`);
      }

      return true;
    } catch (error: any) {
      console.error('Error marking all notifications as read:', error);
      throw new Error(error.message || 'Failed to mark all notifications as read');
    }
  }

  /**
   * Delete a notification
   */
  static async deleteNotification(notificationId: string, userId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from(this.TABLE_NAME)
        .delete()
        .eq('id', notificationId)
        .eq('user_id', userId);

      if (error) {
        console.error('Database error deleting notification:', error);
        throw new Error(`Failed to delete notification: ${error.message}`);
      }

      return true;
    } catch (error: any) {
      console.error('Error deleting notification:', error);
      throw new Error(error.message || 'Failed to delete notification');
    }
  }

  /**
   * Mark all notifications related to a specific discussion as read
   */
  static async markDiscussionNotificationsAsRead(userId: string, discussionId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from(this.TABLE_NAME)
        .update({ 
          read: true,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId)
        .eq('read', false)
        .or(`action_data->>'discussionId'.eq.${discussionId},action_data->>'discussion_id'.eq.${discussionId}`);

      if (error) {
        console.error('Database error marking discussion notifications as read:', error);
        throw new Error(`Failed to mark discussion notifications as read: ${error.message}`);
      }

      return true;
    } catch (error: any) {
      console.error('Error marking discussion notifications as read:', error);
      throw new Error(error.message || 'Failed to mark discussion notifications as read');
    }
  }

  /**
   * Check if a discussion exists
   */
  static async checkDiscussionExists(discussionId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('discussions')
        .select('id')
        .eq('id', discussionId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') { // No rows returned
          return false;
        }
        console.error('Database error checking discussion existence:', error);
        throw new Error(`Failed to check discussion existence: ${error.message}`);
      }

      return !!data;
    } catch (error: any) {
      console.error('Error checking discussion existence:', error);
      throw new Error(error.message || 'Failed to check discussion existence');
    }
  }

  /**
   * Clear all notifications for a user
   */
  static async clearAllNotifications(userId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from(this.TABLE_NAME)
        .delete()
        .eq('user_id', userId);

      if (error) {
        console.error('Database error clearing notifications:', error);
        throw new Error(`Failed to clear notifications: ${error.message}`);
      }

      return true;
    } catch (error: any) {
      console.error('Error clearing notifications:', error);
      throw new Error(error.message || 'Failed to clear notifications');
    }
  }

  /**
   * Create a new notification
   */
  static async createNotification(notificationData: NotificationInsert): Promise<Notification> {
    try {
      const { data, error } = await supabase
        .from(this.TABLE_NAME)
        .insert({
          ...notificationData,
          read: false,
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) {
        console.error('Database error creating notification:', error);
        throw new Error(`Failed to create notification: ${error.message}`);
      }

      if (!data) {
        throw new Error('No data returned from notification creation');
      }

      return this.transformDatabaseRecord(data);
    } catch (error: any) {
      console.error('Error creating notification:', error);
      throw new Error(error.message || 'Failed to create notification');
    }
  }

  /**
   * Transform database record to our interface format
   */
  private static transformDatabaseRecord(record: any): Notification {
    return {
      id: record.id,
      title: record.title,
      message: record.message,
      type: record.type,
      notificationType: record.notification_type,
      timestamp: record.created_at,
      read: record.read,
      actionUrl: record.action_url,
      actionData: record.action_data,
      userId: record.user_id,
      created_at: record.created_at,
      updated_at: record.updated_at,
    };
  }


}

export default NotificationService;
