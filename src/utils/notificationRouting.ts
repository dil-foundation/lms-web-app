import { Notification } from '@/services/notificationService';
import NotificationService from '@/services/notificationService';

export interface NotificationRoute {
  path: string;
  params?: Record<string, string>;
  query?: Record<string, string>;
}

/**
 * Get the appropriate route for a notification based on its type and action data
 */
export async function getNotificationRoute(notification: Notification): Promise<NotificationRoute | null> {
  const { notificationType, actionData, actionUrl } = notification;

  // If there's a direct action URL, use it
  if (actionUrl) {
    return { path: actionUrl };
  }

  // Route based on notification type
  switch (notificationType) {
    case 'new_discussion':
      // Handle both snake_case and camelCase naming conventions
      const discussionId = actionData?.discussion_id || actionData?.discussionId;
      if (discussionId) {
        // Check if the discussion still exists
        try {
          const discussionExists = await NotificationService.checkDiscussionExists(discussionId);
          console.log('Discussion exists check for', discussionId, ':', discussionExists);
          if (!discussionExists) {
            console.log('Discussion does not exist, redirecting to discussions with deleted=true');
            // Discussion was deleted, mark notification as read and redirect to discussions list
            return { 
              path: '/dashboard/discussion',
              query: { deleted: 'true' }
            };
          }
        } catch (error) {
          console.error('Error checking discussion existence:', error);
          // If we can't check, assume it exists and try to redirect
        }
        
        return {
          path: `/dashboard/discussion/${discussionId}`,
          query: { highlight: 'new' }
        };
      }
      return { path: '/dashboard/discussion' };

    case 'new_message':
      // Handle reply update notifications
      if (actionData?.updateType === 'reply_updated') {
        const messageDiscussionId = actionData?.discussion_id || actionData?.discussionId;
        const messageId = actionData?.message_id || actionData?.messageId;
        if (messageDiscussionId) {
          // Check if the discussion still exists
          try {
            const discussionExists = await NotificationService.checkDiscussionExists(messageDiscussionId);
            if (!discussionExists) {
              return { 
                path: '/dashboard/discussion',
                query: { deleted: 'true' }
              };
            }
          } catch (error) {
            console.error('Error checking discussion existence:', error);
          }
          
          return {
            path: `/dashboard/discussion/${messageDiscussionId}`,
            query: { 
              highlight: 'updated_message',
              message_id: messageId 
            }
          };
        }
        return { path: '/dashboard/discussion' };
      }
      
      // Handle new reply notifications
      const messageDiscussionId = actionData?.discussion_id || actionData?.discussionId;
      const messageId = actionData?.message_id || actionData?.messageId;
      if (messageDiscussionId) {
        // Check if the discussion still exists
        try {
          const discussionExists = await NotificationService.checkDiscussionExists(messageDiscussionId);
          if (!discussionExists) {
            return { 
              path: '/dashboard/discussion',
              query: { deleted: 'true' }
            };
          }
        } catch (error) {
          console.error('Error checking discussion existence:', error);
        }
        
        return {
          path: `/dashboard/discussion/${messageDiscussionId}`,
          query: { 
            highlight: 'message',
            message_id: messageId 
          }
        };
      }
      return { path: '/dashboard/discussion' };

    case 'assignment_created':
      // Handle both snake_case and camelCase naming conventions
      const assignmentId = actionData?.assignment_id || actionData?.assignmentId;
      if (assignmentId) {
        return {
          path: `/dashboard/assignments/${assignmentId}`
        };
      }
      return { path: '/dashboard/assignments' };

    case 'assignment_due':
      // Handle both snake_case and camelCase naming conventions
      const dueAssignmentId = actionData?.assignment_id || actionData?.assignmentId;
      if (dueAssignmentId) {
        return {
          path: `/dashboard/assignments/${dueAssignmentId}`,
          query: { urgent: 'true' }
        };
      }
      return { path: '/dashboard/assignments' };

    case 'course_update':
      // Handle discussion update notifications
      if (actionData?.updateType === 'discussion_updated') {
        const discussionId = actionData?.discussion_id || actionData?.discussionId;
        if (discussionId) {
          // Check if the discussion still exists
          try {
            const discussionExists = await NotificationService.checkDiscussionExists(discussionId);
            if (!discussionExists) {
              return { 
                path: '/dashboard/discussion',
                query: { deleted: 'true' }
              };
            }
          } catch (error) {
            console.error('Error checking discussion existence:', error);
          }
          
          return {
            path: `/dashboard/discussion/${discussionId}`,
            query: { highlight: 'updated' }
          };
        }
        return { path: '/dashboard/discussion' };
      }
      
      // Handle regular course updates
      const courseId = actionData?.course_id || actionData?.courseId;
      if (courseId) {
        return {
          path: `/dashboard/courses/${courseId}`
        };
      }
      return { path: '/dashboard/courses' };

    case 'practice_completed':
      // Handle both snake_case and camelCase naming conventions
      const practiceId = actionData?.practice_id || actionData?.practiceId;
      if (practiceId) {
        return {
          path: `/dashboard/ai-progress`,
          query: { practice: practiceId }
        };
      }
      return { path: '/dashboard/ai-progress' };

    case 'grade_received':
      // Handle both snake_case and camelCase naming conventions
      const gradeAssignmentId = actionData?.assignment_id || actionData?.assignmentId;
      if (gradeAssignmentId) {
        return {
          path: `/dashboard/assignments/${gradeAssignmentId}`,
          query: { view: 'grade' }
        };
      }
      return { path: '/dashboard/assignments' };

    case 'system_maintenance':
      // Handle discussion deletion notifications
      if (actionData?.deleteType === 'discussion_deleted') {
        return { path: '/dashboard/discussion' };
      }
      // Handle reply deletion notifications
      if (actionData?.deleteType === 'reply_deleted') {
        const discussionId = actionData?.discussion_id || actionData?.discussionId;
        if (discussionId) {
          // Check if the discussion still exists
          try {
            const discussionExists = await NotificationService.checkDiscussionExists(discussionId);
            if (!discussionExists) {
              return { 
                path: '/dashboard/discussion',
                query: { deleted: 'true' }
              };
            }
          } catch (error) {
            console.error('Error checking discussion existence:', error);
          }
          
          return {
            path: `/dashboard/discussion/${discussionId}`,
            query: { highlight: 'deleted' }
          };
        }
        return { path: '/dashboard/discussion' };
      }
      return { path: '/dashboard' };

    case 'welcome':
      return { path: '/dashboard' };

    default:
      // For generic notifications, try to extract route from action data
      if (actionData?.route) {
        return {
          path: actionData.route,
          params: actionData.params,
          query: actionData.query
        };
      }
      return null;
  }
}

/**
 * Build a complete URL with query parameters
 */
export function buildNotificationUrl(route: NotificationRoute): string {
  let url = route.path;
  
  console.log('Building URL for route:', route);
  
  if (route.query && Object.keys(route.query).length > 0) {
    const queryParams = new URLSearchParams();
    Object.entries(route.query).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        queryParams.append(key, value);
      }
    });
    url += `?${queryParams.toString()}`;
    console.log('Final URL with query params:', url);
  } else {
    console.log('No query params, final URL:', url);
  }
  
  return url;
}

/**
 * Get notification icon based on notification type
 */
export function getNotificationTypeIcon(notificationType?: string) {
  switch (notificationType) {
    case 'new_discussion':
      return '💬';
    case 'new_message':
      return '💭';
    case 'assignment_created':
    case 'assignment_due':
      return '📝';
    case 'grade_received':
      return '📊';
    case 'course_update':
      return '📚';
    case 'practice_completed':
      return '🎯';
    case 'system_maintenance':
      return '🔧';
    case 'welcome':
      return '👋';
    default:
      return '🔔';
  }
}

/**
 * Get notification color based on notification type
 */
export function getNotificationTypeColor(notificationType?: string): string {
  switch (notificationType) {
    case 'new_discussion':
    case 'new_message':
      return 'text-blue-600 dark:text-blue-400';
    case 'assignment_created':
    case 'assignment_due':
      return 'text-orange-600 dark:text-orange-400';
    case 'grade_received':
      return 'text-[#8DC63F] dark:text-[#8DC63F]';
    case 'course_update':
      return 'text-purple-600 dark:text-purple-400';
    case 'practice_completed':
      return 'text-[#8DC63F] dark:text-[#8DC63F]';
    case 'system_maintenance':
      return 'text-yellow-600 dark:text-yellow-400';
    case 'welcome':
      return 'text-[#8DC63F] dark:text-[#8DC63F]';
    default:
      return 'text-[#8DC63F] dark:text-[#8DC63F]';
  }
}
