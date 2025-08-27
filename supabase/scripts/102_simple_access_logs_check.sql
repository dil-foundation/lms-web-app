-- Simple script to check access_logs table and policies
-- This combines all checks into a single result set

WITH checks AS (
    -- 1. Check if RLS is enabled
    SELECT 
        'RLS Status' as check_type,
        CASE 
            WHEN EXISTS (
                SELECT 1 FROM pg_tables 
                WHERE tablename = 'access_logs' AND rowsecurity = true
            ) THEN 'RLS Enabled'
            ELSE 'RLS Disabled'
        END as result
    UNION ALL
    
    -- 2. Count policies
    SELECT 
        'Policy Count' as check_type,
        COUNT(*)::text as result
    FROM pg_policies 
    WHERE tablename = 'access_logs'
    UNION ALL
    
    -- 3. List policy names
    SELECT 
        'Policy Names' as check_type,
        STRING_AGG(policyname, ', ') as result
    FROM pg_policies 
    WHERE tablename = 'access_logs'
    UNION ALL
    
    -- 4. Check table permissions
    SELECT 
        'Table Permissions' as check_type,
        STRING_AGG(grantee || ':' || privilege_type, ', ') as result
    FROM information_schema.role_table_grants 
    WHERE table_name = 'access_logs'
    UNION ALL
    
    -- 5. Check if table exists
    SELECT 
        'Table Exists' as check_type,
        CASE 
            WHEN EXISTS (
                SELECT 1 FROM information_schema.tables 
                WHERE table_name = 'access_logs' AND table_schema = 'public'
            ) THEN 'Yes'
            ELSE 'No'
        END as result
    UNION ALL
    
    -- 6. Count columns
    SELECT 
        'Column Count' as check_type,
        COUNT(*)::text as result
    FROM information_schema.columns 
    WHERE table_name = 'access_logs' AND table_schema = 'public'
    UNION ALL
    
    -- 7. Check function exists
    SELECT 
        'Function Exists' as check_type,
        CASE 
            WHEN EXISTS (
                SELECT 1 FROM information_schema.routines 
                WHERE routine_name = 'get_users_with_mfa_status' AND routine_schema = 'public'
            ) THEN 'Yes'
            ELSE 'No'
        END as result
    UNION ALL
    
    -- 8. Check function permissions
    SELECT 
        'Function Permissions' as check_type,
        STRING_AGG(grantee || ':' || privilege_type, ', ') as result
    FROM information_schema.role_routine_grants 
    WHERE routine_name = 'get_users_with_mfa_status' AND routine_schema = 'public'
    UNION ALL
    
    -- 9. Current user info
    SELECT 
        'Current User' as check_type,
        current_user as result
    UNION ALL
    
    -- 10. Test direct query
    SELECT 
        'Direct Query Test' as check_type,
        CASE 
            WHEN EXISTS (SELECT 1 FROM access_logs LIMIT 1) THEN 'Success'
            ELSE 'Failed'
        END as result
)
SELECT * FROM checks ORDER BY check_type;
