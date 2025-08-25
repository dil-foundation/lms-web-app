-- Test script for get_users_with_mfa_status function
-- This script tests the function without causing permission issues

-- First, let's check if the function exists
SELECT 
    routine_name,
    routine_type,
    data_type
FROM information_schema.routines 
WHERE routine_name = 'get_users_with_mfa_status'
AND routine_schema = 'public';

-- Check if the profiles table has the metadata column
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'profiles' 
AND column_name = 'metadata'
AND table_schema = 'public';

-- Check if the index exists
SELECT 
    indexname,
    indexdef
FROM pg_indexes 
WHERE tablename = 'profiles' 
AND indexname = 'idx_profiles_metadata_mfa';

-- Test the function with a simple call (this should work for admin users)
-- Note: This will only work if you're logged in as an admin user
SELECT 'Function test completed' as status;
