-- Enable real-time replication for notifications table
-- This is required for Supabase real-time subscriptions to work

-- Enable real-time for the notifications table
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;

-- Verify the table is enabled for real-time
-- You can check this in the Supabase dashboard under Database > Replication
-- The notifications table should appear in the "Replicated Tables" section

-- Add a comment to document this change
COMMENT ON TABLE notifications IS 'Stores user notifications for the application - ENABLED FOR REAL-TIME';
