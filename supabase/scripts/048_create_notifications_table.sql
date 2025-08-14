-- Drop table if exists to ensure clean migration
DROP TABLE IF EXISTS notifications CASCADE;

-- Create notifications table
CREATE TABLE notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('info', 'success', 'warning', 'error')),
    notification_type VARCHAR(50), -- For specific notification types like 'new_discussion', 'new_message', etc.
    read BOOLEAN NOT NULL DEFAULT false,
    action_url TEXT,
    action_data JSONB, -- Store additional data for routing (e.g., discussion_id, message_id, etc.)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(user_id, read);

-- Enable Row Level Security (RLS)
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Users can only see their own notifications
CREATE POLICY "Users can view their own notifications" ON notifications
    FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own notifications OR service role can insert for any user
CREATE POLICY "Users can insert their own notifications" ON notifications
    FOR INSERT WITH CHECK (
        auth.uid() = user_id OR 
        auth.role() = 'service_role'
    );

-- Users can only update their own notifications OR service role can update any
CREATE POLICY "Users can update their own notifications" ON notifications
    FOR UPDATE USING (
        auth.uid() = user_id OR 
        auth.role() = 'service_role'
    );

-- Users can only delete their own notifications OR service role can delete any
CREATE POLICY "Users can delete their own notifications" ON notifications
    FOR DELETE USING (
        auth.uid() = user_id OR 
        auth.role() = 'service_role'
    );

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_notifications_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at column
CREATE TRIGGER update_notifications_updated_at 
    BEFORE UPDATE ON notifications 
    FOR EACH ROW 
    EXECUTE FUNCTION update_notifications_updated_at();

-- Add helpful comments
COMMENT ON TABLE notifications IS 'Stores user notifications for the application';
COMMENT ON COLUMN notifications.type IS 'Type of notification: info, success, warning, or error';
COMMENT ON COLUMN notifications.notification_type IS 'Specific notification type for routing: new_discussion, new_message, etc.';
COMMENT ON COLUMN notifications.action_url IS 'Optional URL to navigate to when notification is clicked';
COMMENT ON COLUMN notifications.action_data IS 'Additional data for routing (e.g., discussion_id, message_id, etc.)';
COMMENT ON COLUMN notifications.read IS 'Whether the notification has been read by the user';
COMMENT ON COLUMN notifications.user_id IS 'References the user who owns this notification';
