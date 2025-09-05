-- Migration: Allow anonymous users to insert into access_logs table
-- This enables logging of failed login attempts from unauthenticated users

-- Drop existing policies that might conflict
DROP POLICY IF EXISTS "Users can insert their own access logs" ON access_logs;

-- Create new policy that allows anonymous users to insert access logs
CREATE POLICY "Allow anonymous access log inserts" ON access_logs
    FOR INSERT 
    WITH CHECK (true); -- Allow all inserts, including from anonymous users

-- Add comment explaining the policy
COMMENT ON POLICY "Allow anonymous access log inserts" ON access_logs IS 
    'Allows anonymous users to insert access logs for failed login attempts and other security events';

-- Verify the policy was created
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'access_logs' 
AND policyname = 'Allow anonymous access log inserts';

-- Migration complete notification
DO $$
BEGIN
    RAISE NOTICE 'Migration 094: Anonymous access log insert policy created successfully';
END $$;
