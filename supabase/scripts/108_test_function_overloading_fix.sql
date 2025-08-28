-- Test script for the function overloading fix
-- This script verifies that only one function exists and it works correctly

-- Test 1: Check how many functions exist with this name
SELECT 
    'Function Count Check' as test_type,
    COUNT(*) as function_count
FROM information_schema.routines 
WHERE routine_name = 'get_users_with_mfa_status'
AND routine_schema = 'public';

-- Test 2: List all functions with this name (should be only 1)
SELECT 
    'Function Details' as test_type,
    routine_name,
    routine_definition,
    data_type
FROM information_schema.routines 
WHERE routine_name = 'get_users_with_mfa_status'
AND routine_schema = 'public';

-- Test 3: Check function parameters
SELECT 
    'Function Parameters' as test_type,
    parameter_name,
    parameter_mode,
    data_type,
    ordinal_position
FROM information_schema.parameters 
WHERE specific_name IN (
    SELECT specific_name 
    FROM information_schema.routines 
    WHERE routine_name = 'get_users_with_mfa_status'
    AND routine_schema = 'public'
)
ORDER BY ordinal_position;

-- Test 4: Test the function call (should work for admin users)
SELECT 
    'Function Call Test' as test_type,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM get_users_with_mfa_status(NULL, 1, 5)
        ) THEN 'Success - Function executed'
        ELSE 'Failed - Function execution error'
    END as result;

-- Test 5: Test with different parameter orders (should all work)
SELECT 
    'Parameter Order Test 1' as test_type,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM get_users_with_mfa_status(NULL, 1, 5)
        ) THEN 'Success'
        ELSE 'Failed'
    END as result;

SELECT 
    'Parameter Order Test 2' as test_type,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM get_users_with_mfa_status('test', 1, 5)
        ) THEN 'Success'
        ELSE 'Failed'
    END as result;

-- Test 6: Show sample data from the function
SELECT 
    'Sample Function Data' as test_type,
    id,
    email,
    role,
    mfa_enabled
FROM get_users_with_mfa_status(NULL, 1, 3);
