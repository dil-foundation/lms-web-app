-- Fix notifications table actionData column issue
-- The issue is that PostgREST can't find the 'actionData' column due to naming mismatch

-- First, let's check if the column exists and its current state
DO $$
BEGIN
    -- Check if action_data column exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'notifications' 
        AND column_name = 'action_data'
    ) THEN
        -- Add the column if it doesn't exist
        ALTER TABLE notifications ADD COLUMN action_data JSONB;
        RAISE NOTICE 'Added action_data column to notifications table';
    ELSE
        RAISE NOTICE 'action_data column already exists in notifications table';
    END IF;
END $$;

-- Ensure the column has proper comments and constraints
COMMENT ON COLUMN notifications.action_data IS 'Additional data for routing (e.g., discussion_id, message_id, etc.)';

-- Add a check constraint to ensure action_data is valid JSON
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_action_data_check;
ALTER TABLE notifications ADD CONSTRAINT notifications_action_data_check 
    CHECK (action_data IS NULL OR jsonb_typeof(action_data) = 'object');

-- Refresh PostgREST schema cache to ensure it recognizes the column
-- This is done by calling the PostgREST schema cache refresh function
-- Note: This requires the postgrest extension to be available
DO $$
BEGIN
    -- Try to refresh the schema cache if postgrest extension is available
    IF EXISTS (
        SELECT 1 FROM pg_extension WHERE extname = 'postgrest'
    ) THEN
        -- This will refresh the PostgREST schema cache
        PERFORM pg_notify('postgrest', '{"type": "schema_reload"}');
        RAISE NOTICE 'Triggered PostgREST schema cache refresh';
    ELSE
        RAISE NOTICE 'PostgREST extension not found, manual schema refresh may be needed';
    END IF;
END $$;

-- Create an index on action_data for better query performance
CREATE INDEX IF NOT EXISTS idx_notifications_action_data ON notifications USING GIN (action_data);

-- Verify the table structure
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'notifications' 
AND column_name IN ('action_data', 'action_url', 'notification_type')
ORDER BY column_name;
