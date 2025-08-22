import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield, Send, Loader2, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

interface TwoFactorReminderDialogProps {
  isOpen: boolean;
  onClose: () => void;
  users: Array<{
    id: string;
    email: string;
    first_name: string;
    last_name: string;
    role: string;
  }>;
}

export const TwoFactorReminderDialog: React.FC<TwoFactorReminderDialogProps> = ({
  isOpen,
  onClose,
  users
}) => {
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);

  const defaultMessage = `Dear user,

Your administrator has enabled two-factor authentication (2FA) for the DIL-LMS platform. To ensure the security of your account and maintain access to the platform, you must complete the 2FA setup.

Please log in to your account and follow the setup instructions. If you need assistance, please contact your administrator.

Thank you for your cooperation.

Best regards,
DIL-LMS Team`;

  React.useEffect(() => {
    if (isOpen) {
      setMessage(defaultMessage);
      setSelectedUsers(users.map(user => user.id));
    }
  }, [isOpen, users]);

  const handleSendReminders = async () => {
    if (selectedUsers.length === 0) {
      toast.error('Please select at least one user');
      return;
    }

    if (!message.trim()) {
      toast.error('Please enter a message');
      return;
    }

    try {
      setIsSending(true);

      // In a real implementation, this would send actual notifications
      // For now, we'll simulate the process
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Log the reminder action
      console.log('Sending 2FA reminders to:', selectedUsers);
      console.log('Message:', message);

      toast.success(`Reminders sent to ${selectedUsers.length} user${selectedUsers.length !== 1 ? 's' : ''}`);
      onClose();
    } catch (error) {
      console.error('Error sending reminders:', error);
      toast.error('Failed to send reminders');
    } finally {
      setIsSending(false);
    }
  };

  const handleSelectAll = () => {
    if (selectedUsers.length === users.length) {
      setSelectedUsers([]);
    } else {
      setSelectedUsers(users.map(user => user.id));
    }
  };

  const handleSelectUser = (userId: string) => {
    setSelectedUsers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            Send 2FA Reminders
          </DialogTitle>
          <DialogDescription>
            Send reminders to users who haven't completed two-factor authentication setup
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* User Selection */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Select Users</Label>
              <Button
                variant="outline"
                size="sm"
                onClick={handleSelectAll}
              >
                {selectedUsers.length === users.length ? 'Deselect All' : 'Select All'}
              </Button>
            </div>
            
            <div className="max-h-48 overflow-y-auto border rounded-lg p-3 space-y-2">
              {users.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center space-x-3 p-2 rounded hover:bg-muted"
                >
                  <input
                    type="checkbox"
                    id={user.id}
                    checked={selectedUsers.includes(user.id)}
                    onChange={() => handleSelectUser(user.id)}
                    className="rounded"
                  />
                  <label htmlFor={user.id} className="flex-1 cursor-pointer">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{user.first_name} {user.last_name}</p>
                        <p className="text-sm text-muted-foreground">{user.email}</p>
                      </div>
                      <span className="text-xs bg-muted px-2 py-1 rounded capitalize">
                        {user.role}
                      </span>
                    </div>
                  </label>
                </div>
              ))}
            </div>
          </div>

          {/* Message */}
          <div className="space-y-3">
            <Label htmlFor="reminder-message">Reminder Message</Label>
            <Textarea
              id="reminder-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Enter your reminder message..."
              className="min-h-[200px]"
            />
          </div>

          {/* Warning */}
          <Alert>
            <AlertTriangle className="w-4 h-4" />
            <AlertDescription>
              This will send reminder notifications to {selectedUsers.length} selected user{selectedUsers.length !== 1 ? 's' : ''}. 
              Make sure your message is clear and helpful.
            </AlertDescription>
          </Alert>

          {/* Actions */}
          <div className="flex gap-2 justify-end">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isSending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSendReminders}
              disabled={selectedUsers.length === 0 || isSending}
              className="flex items-center gap-2"
            >
              {isSending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Send Reminders
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
