-- Force PostgREST schema cache refresh
-- This script will trigger PostgREST to reload its schema cache

-- Method 1: Use pg_notify to trigger schema reload
SELECT pg_notify('postgrest', '{"type": "schema_reload"}');

-- Method 2: If the above doesn't work, try restarting the PostgREST service
-- This is a more aggressive approach that may require admin privileges
-- SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE application_name = 'postgrest';

-- Method 3: Alternative notification method
SELECT pg_notify('postgrest', 'schema_reload');

-- Verify the notifications table structure after refresh
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'notifications' 
AND column_name = 'action_data';

-- Test a simple query to see if PostgREST can now access the column
-- This should work after the schema refresh
SELECT 
    id,
    title,
    message,
    action_data
FROM notifications 
LIMIT 1;
