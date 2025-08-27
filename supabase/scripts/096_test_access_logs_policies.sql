-- Test script for access_logs policies
-- This script tests the policies without using ROLLBACK in DO blocks

-- First, let's see what policies exist
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

-- Test 1: Anonymous insert (this should work)
-- Note: This will actually insert a row, but it's just a test
INSERT INTO access_logs (user_email, action, status, metadata) 
VALUES ('test-anonymous@example.com', 'test_anonymous_insert', 'success', '{"test": true, "type": "anonymous"}');

-- Test 2: Check if the insert worked
SELECT 
    id,
    user_email,
    action,
    status,
    created_at
FROM access_logs 
WHERE user_email = 'test-anonymous@example.com' 
AND action = 'test_anonymous_insert'
ORDER BY created_at DESC
LIMIT 1;

-- Test 3: Clean up the test data (optional)
-- Uncomment the following line if you want to remove the test data
-- DELETE FROM access_logs WHERE user_email = 'test-anonymous@example.com' AND action = 'test_anonymous_insert';

-- Show recent access logs (if you have permission)
SELECT 
    id,
    user_email,
    action,
    status,
    created_at
FROM access_logs 
ORDER BY created_at DESC
LIMIT 10;
