-- Test script for the fixed get_users_with_mfa_status function
-- This script tests the function to ensure it works without permission errors

-- First, let's check the current user and their role
SELECT 
    'Current User Info' as test_type,
    current_user as current_user,
    auth.uid() as auth_uid,
    (SELECT role FROM profiles WHERE id = auth.uid()) as user_role;

-- Test 1: Check if the function exists and its definition
SELECT 
    'Function Definition' as test_type,
    routine_name,
    routine_definition
FROM information_schema.routines 
WHERE routine_name = 'get_users_with_mfa_status'
AND routine_schema = 'public';

-- Test 2: Check function permissions
SELECT 
    'Function Permissions' as test_type,
    grantee,
    privilege_type
FROM information_schema.role_routine_grants 
WHERE routine_name = 'get_users_with_mfa_status'
AND routine_schema = 'public';

-- Test 3: Try to call the function (this should work for admin users)
-- Note: This will only work if you're logged in as an admin user
SELECT 
    'Function Call Test' as test_type,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM get_users_with_mfa_status(NULL, 1, 5)
        ) THEN 'Success - Function executed'
        ELSE 'Failed - Function execution error'
    END as result;

-- Test 4: Check if we can access the profiles table directly
SELECT 
    'Profiles Table Access' as test_type,
    COUNT(*) as profile_count
FROM profiles;

-- Test 5: Check if we can access auth.users table (this might fail due to RLS)
SELECT 
    'Auth Users Table Access' as test_type,
    CASE 
        WHEN EXISTS (SELECT 1 FROM auth.users LIMIT 1) THEN 'Success'
        ELSE 'Failed - RLS or permission issue'
    END as result;

-- Test 6: Show sample data from profiles table
SELECT 
    'Sample Profiles Data' as test_type,
    id,
    email,
    role,
    metadata->>'mfa_enabled' as mfa_enabled
FROM profiles 
LIMIT 3;
