import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  Bell, 
  CheckCircle, 
  AlertCircle, 
  Info, 
  Clock, 
  X,
  Trash2,
  Check,
  MoreHorizontal,
  Loader2
} from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useNotifications } from '@/contexts/NotificationContext';
import { useNavigate } from 'react-router-dom';
import { getNotificationRoute, buildNotificationUrl, getNotificationTypeIcon, getNotificationTypeColor } from '@/utils/notificationRouting';

interface NotificationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const getNotificationIcon = (type: 'info' | 'success' | 'warning' | 'error') => {
  switch (type) {
    case 'success':
      return <CheckCircle className="h-5 w-5 text-green-500" />;
    case 'warning':
      return <AlertCircle className="h-5 w-5 text-yellow-500" />;
    case 'error':
      return <AlertCircle className="h-5 w-5 text-red-500" />;
    default:
      return <Info className="h-5 w-5 text-blue-500" />;
  }
};

const getNotificationBadgeColor = (type: 'info' | 'success' | 'warning' | 'error') => {
  switch (type) {
    case 'success':
      return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
    case 'warning':
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
    case 'error':
      return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
    default:
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
  }
};

const formatTimestamp = (timestamp: string) => {
  const date = new Date(timestamp);
  const now = new Date();
  const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
  
  if (diffInHours < 1) {
    return 'Just now';
  } else if (diffInHours < 24) {
    return `${diffInHours}h ago`;
  } else {
    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays}d ago`;
  }
};

export const NotificationDialog = ({ open, onOpenChange }: NotificationDialogProps) => {
  const navigate = useNavigate();
  const { 
    notifications, 
    unreadCount, 
    loading, 
    markAsRead, 
    markAllAsRead, 
    deleteNotification, 
    clearAllNotifications 
  } = useNotifications();

  const handleNotificationClick = async (notification: any) => {
    if (!notification.read) {
      markAsRead(notification.id);
    }
    
    // Get the appropriate route for this notification
    const route = await getNotificationRoute(notification);
    console.log('Notification route:', route);
    
    if (route) {
      const url = buildNotificationUrl(route);
      console.log('Navigating to:', url);
      navigate(url);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[80vh] p-0 bg-gradient-to-br from-white/95 via-white/90 to-gray-50/95 dark:from-gray-900/95 dark:via-gray-900/90 dark:to-gray-800/95 backdrop-blur-xl border border-gray-200/60 dark:border-gray-700/60 rounded-3xl shadow-2xl">
        <DialogHeader className="px-6 py-4 border-b border-gray-200/60 dark:border-gray-700/60">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-primary/10 to-primary/20 rounded-2xl flex items-center justify-center shadow-lg">
                <Bell className="h-5 w-5 text-primary" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold text-gray-900 dark:text-gray-100">
                  Notifications
                </DialogTitle>
                {unreadCount > 0 && (
                  <p className="text-sm text-muted-foreground">
                    {unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}
                  </p>
                )}
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={markAllAsRead}
                  className="h-8 px-3 text-xs bg-green-50 hover:bg-green-100 dark:bg-green-900/20 dark:hover:bg-green-900/30 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800 rounded-xl transition-all duration-300"
                >
                  <Check className="h-3 w-3 mr-1" />
                  Mark all read
                </Button>
              )}
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800"
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onClick={clearAllNotifications} className="text-red-600 dark:text-red-400">
                    <Trash2 className="h-4 w-4 mr-2" />
                    Clear all
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh]">
          <div className="p-2">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 px-6">
                <div className="w-16 h-16 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 rounded-3xl flex items-center justify-center mb-4">
                  <Bell className="h-8 w-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                  No notifications
                </h3>
                <p className="text-sm text-muted-foreground text-center">
                  You're all caught up! New notifications will appear here.
                </p>
              </div>
            ) : (
              <div className="space-y-1">
                {notifications.map((notification, index) => (
                  <div key={notification.id}>
                                         <div
                                               className={`group p-4 rounded-2xl transition-all duration-300 cursor-pointer hover:bg-gradient-to-r hover:from-gray-50/80 hover:to-white/60 dark:hover:from-gray-800/80 dark:hover:to-gray-700/60 hover:shadow-lg hover:-translate-y-0.5 ${
                          !notification.read 
                            ? 'bg-gradient-to-r from-blue-50/80 to-blue-100/40 dark:from-blue-900/20 dark:to-blue-800/20 border border-blue-200/60 dark:border-blue-800/60' 
                            : 'bg-white/60 dark:bg-gray-800/60 border border-gray-200/40 dark:border-gray-700/40'
                        } hover:border-primary/40`}
                       onClick={() => handleNotificationClick(notification)}
                     >
                                             <div className="flex items-start gap-3">
                         <div className="flex-shrink-0 mt-1">
                           <div className="flex items-center gap-2">
                             <span className="text-lg">
                               {getNotificationTypeIcon(notification.notificationType)}
                             </span>
                             {getNotificationIcon(notification.type)}
                           </div>
                         </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <h4 className={`font-semibold text-sm leading-tight ${
                              !notification.read 
                                ? 'text-gray-900 dark:text-gray-100' 
                                : 'text-gray-700 dark:text-gray-300'
                            }`}>
                              {notification.title}
                            </h4>
                            
                            <div className="flex items-center gap-2">
                              <Badge 
                                variant="secondary" 
                                className={`text-xs px-2 py-1 rounded-lg ${getNotificationBadgeColor(notification.type)}`}
                              >
                                {notification.type}
                              </Badge>
                              
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <MoreHorizontal className="h-3 w-3" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-32">
                                  <DropdownMenuItem 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      markAsRead(notification.id);
                                    }}
                                  >
                                    <Check className="h-3 w-3 mr-2" />
                                    Mark read
                                  </DropdownMenuItem>
                                  <DropdownMenuItem 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      deleteNotification(notification.id);
                                    }}
                                    className="text-red-600 dark:text-red-400"
                                  >
                                    <Trash2 className="h-3 w-3 mr-2" />
                                    Delete
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </div>
                          
                          <p className="text-sm text-muted-foreground leading-relaxed mb-3">
                            {notification.message}
                          </p>
                          
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              {formatTimestamp(notification.timestamp)}
                            </div>
                            
                            {!notification.read && (
                              <div className="w-2 h-2 bg-blue-500 rounded-full" />
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {index < notifications.length - 1 && (
                      <Separator className="my-2 bg-gray-200/60 dark:bg-gray-700/60" />
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
