import { useState, memo } from 'react';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { NotificationDialog } from './NotificationDialog';
import { useNotifications } from '@/contexts/NotificationContext';

export const NotificationToggle = memo(() => {
  const [isOpen, setIsOpen] = useState(false);
  const { unreadCount } = useNotifications();

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setIsOpen(true)}
        className="relative h-10 w-10 rounded-xl bg-background border border-input shadow-sm hover:shadow-lg hover:shadow-[#8DC63F]/10 transition-all duration-300 hover:-translate-y-0.5 hover:bg-accent/5 hover:text-foreground dark:hover:bg-gray-800 group"
      >
        <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-[#8DC63F]/5 to-[#8DC63F]/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        <div className="relative z-10">
          <Bell className="h-5 w-5 text-gray-600 dark:text-gray-400 transition-all duration-300 group-hover:scale-110 group-hover:text-[#8DC63F]" />
        </div>
        {/* Notification badge */}
        {unreadCount > 0 && (
          <div className="absolute -top-2 -right-2 min-w-5 h-5 px-1.5 bg-red-500 rounded-full flex items-center justify-center">
            <span className="text-xs text-white font-semibold leading-none">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          </div>
        )}
      </Button>
      
      <NotificationDialog open={isOpen} onOpenChange={setIsOpen} />
    </>
  );
});

NotificationToggle.displayName = 'NotificationToggle';
