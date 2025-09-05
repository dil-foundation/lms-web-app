-- Migration: Comprehensive access_logs policies
-- This provides a complete set of policies for different user scenarios

-- First, drop all existing policies to start fresh
DROP POLICY IF EXISTS "Admins can view all access logs" ON access_logs;
DROP POLICY IF EXISTS "Users can view their own access logs" ON access_logs;
DROP POLICY IF EXISTS "Allow anonymous access log inserts" ON access_logs;
DROP POLICY IF EXISTS "Users can insert their own access logs" ON access_logs;

-- Policy 1: Allow anonymous users to insert access logs (for failed login attempts)
CREATE POLICY "Anonymous users can insert access logs" ON access_logs
    FOR INSERT 
    WITH CHECK (true);

-- Policy 2: Allow authenticated users to insert their own access logs
CREATE POLICY "Authenticated users can insert access logs" ON access_logs
    FOR INSERT 
    WITH CHECK (
        auth.uid() IS NOT NULL AND 
        (user_id IS NULL OR user_id = auth.uid())
    );

-- Policy 3: Allow users to view their own access logs
CREATE POLICY "Users can view their own access logs" ON access_logs
    FOR SELECT 
    USING (
        auth.uid() IS NOT NULL AND 
        (user_id = auth.uid() OR user_email = (
            SELECT email FROM auth.users WHERE id = auth.uid()
        ))
    );

-- Policy 4: Allow admins to view all access logs
CREATE POLICY "Admins can view all access logs" ON access_logs
    FOR SELECT 
    USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Policy 5: Allow admins to update access logs (for status changes, etc.)
CREATE POLICY "Admins can update access logs" ON access_logs
    FOR UPDATE 
    USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Policy 6: Allow admins to delete access logs (for cleanup)
CREATE POLICY "Admins can delete access logs" ON access_logs
    FOR DELETE 
    USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Add comments to explain each policy
COMMENT ON POLICY "Anonymous users can insert access logs" ON access_logs IS 
    'Allows unauthenticated users to log failed login attempts and security events';

COMMENT ON POLICY "Authenticated users can insert access logs" ON access_logs IS 
    'Allows authenticated users to log their own access events';

COMMENT ON POLICY "Users can view their own access logs" ON access_logs IS 
    'Allows users to view their own access logs by user_id or email';

COMMENT ON POLICY "Admins can view all access logs" ON access_logs IS 
    'Allows administrators to view all access logs for security monitoring';

COMMENT ON POLICY "Admins can update access logs" ON access_logs IS 
    'Allows administrators to update access log status and metadata';

COMMENT ON POLICY "Admins can delete access logs" ON access_logs IS 
    'Allows administrators to delete access logs for data cleanup';

-- Verify all policies were created
SELECT 
    policyname,
    permissive,
    roles,
    cmd,
    CASE 
        WHEN qual IS NOT NULL THEN 'Has WHERE clause'
        ELSE 'No WHERE clause'
    END as has_where,
    CASE 
        WHEN with_check IS NOT NULL THEN 'Has WITH CHECK'
        ELSE 'No WITH CHECK'
    END as has_with_check
FROM pg_policies 
WHERE tablename = 'access_logs'
ORDER BY policyname;

-- Test the policies with a sample insert
DO $$
BEGIN
    -- Test anonymous insert (should work)
    BEGIN
        INSERT INTO access_logs (user_email, action, status, metadata) 
        VALUES ('test@example.com', 'test_anonymous_insert', 'success', '{"test": true}');
        RAISE NOTICE '✓ Anonymous insert test passed';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '✗ Anonymous insert test failed: %', SQLERRM;
    END;
    
    RAISE NOTICE 'Migration 095: Comprehensive access_logs policies created successfully';
END $$;
