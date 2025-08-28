-- Script: Get all RLS policies for access_logs table
-- Description: This script retrieves all policies and permissions for the access_logs table
-- Date: 2024-01-15

-- 1. Check if RLS is enabled on access_logs table
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename = 'access_logs';

-- 2. Get all RLS policies for access_logs table
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
ORDER BY policyname;

-- 3. Get detailed policy information
SELECT 
    p.policyname,
    p.permissive,
    p.roles,
    p.cmd,
    CASE 
        WHEN p.qual IS NOT NULL THEN 'Has WHERE clause'
        ELSE 'No WHERE clause'
    END as has_where,
    CASE 
        WHEN p.with_check IS NOT NULL THEN 'Has WITH CHECK'
        ELSE 'No WITH CHECK'
    END as has_with_check,
    p.qual as where_clause,
    p.with_check as with_check_clause
FROM pg_policies p
WHERE p.tablename = 'access_logs'
ORDER BY p.policyname;

-- 4. Check table permissions for different roles
SELECT 
    grantee,
    privilege_type,
    is_grantable
FROM information_schema.role_table_grants 
WHERE table_name = 'access_logs'
ORDER BY grantee, privilege_type;

-- 5. Check if the table exists and its structure
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'access_logs'
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 6. Check current user and their role
SELECT 
    current_user as current_user,
    session_user as session_user,
    current_setting('role') as current_role;

-- 7. Test if we can query the access_logs table directly
SELECT 
    'Direct query test' as test_type,
    COUNT(*) as record_count
FROM access_logs;

-- 8. Check if the get_users_with_mfa_status function exists and its definition
SELECT 
    routine_name,
    routine_type,
    data_type,
    routine_definition
FROM information_schema.routines 
WHERE routine_name = 'get_users_with_mfa_status'
AND routine_schema = 'public';

-- 9. Check function permissions
SELECT 
    grantee,
    privilege_type,
    is_grantable
FROM information_schema.role_routine_grants 
WHERE routine_name = 'get_users_with_mfa_status'
AND routine_schema = 'public'
ORDER BY grantee, privilege_type;

-- 10. Test the function with a simple call
SELECT 'Testing get_users_with_mfa_status function...' as test_status;

-- This will show us exactly what's happening with the permissions
