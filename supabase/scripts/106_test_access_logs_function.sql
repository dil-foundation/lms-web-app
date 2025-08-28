-- Test script for the fixed get_recent_access_logs function
-- This script tests the function to ensure it works without permission errors

-- First, let's check the current user and their role
SELECT 
    'Current User Info' as test_type,
    current_user as current_user,
    auth.uid() as auth_uid,
    (SELECT p.role FROM profiles p WHERE p.id = auth.uid()) as user_role;

-- Test 1: Check if the function exists and its definition
SELECT 
    'Function Definition' as test_type,
    routine_name,
    routine_definition
FROM information_schema.routines 
WHERE routine_name = 'get_recent_access_logs'
AND routine_schema = 'public';

-- Test 2: Check function permissions
SELECT 
    'Function Permissions' as test_type,
    grantee,
    privilege_type
FROM information_schema.role_routine_grants 
WHERE routine_name = 'get_recent_access_logs'
AND routine_schema = 'public';

-- Test 3: Check access_logs table permissions
SELECT 
    'Table Permissions' as test_type,
    grantee,
    privilege_type
FROM information_schema.role_table_grants 
WHERE table_name = 'access_logs'
AND table_schema = 'public';

-- Test 4: Check if we can access the access_logs table directly
SELECT 
    'Access Logs Table Access' as test_type,
    COUNT(*) as log_count
FROM access_logs;

-- Test 5: Try to call the function (this should work for admin users)
SELECT 
    'Function Call Test' as test_type,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM get_recent_access_logs(5, 0)
        ) THEN 'Success - Function executed'
        ELSE 'Failed - Function execution error'
    END as result;

-- Test 6: Show sample access logs data
SELECT 
    'Sample Access Logs Data' as test_type,
    id,
    user_email,
    action,
    status,
    created_at
FROM access_logs 
ORDER BY created_at DESC
LIMIT 3;
