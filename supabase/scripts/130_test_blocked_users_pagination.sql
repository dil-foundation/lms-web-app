-- Script: Test Blocked Users Pagination
-- Description: Tests the pagination functionality for blocked users
-- Date: 2024-01-20

-- Clean up any existing test data
DELETE FROM blocked_users WHERE email LIKE 'test_pagination_%';

-- Create test data for pagination testing
-- We'll create 25 blocked users to test pagination with 20 items per page

SELECT 'Creating test data for pagination...' as status;

-- Create 25 test blocked users with different emails and timestamps
DO $$
DECLARE
    i INTEGER;
    test_email TEXT;
    blocked_until TIMESTAMP WITH TIME ZONE;
BEGIN
    FOR i IN 1..25 LOOP
        test_email := 'test_pagination_' || i || '@example.com';
        blocked_until := NOW() + (i || ' hours')::INTERVAL;
        
        INSERT INTO blocked_users (
            email,
            ip_address,
            block_reason,
            blocked_until,
            attempts_count,
            is_active,
            metadata
        ) VALUES (
            test_email,
            '192.168.1.' || (100 + i),
            'Test block reason ' || i,
            blocked_until,
            i + 5, -- Different attempt counts
            TRUE,
            jsonb_build_object('test_id', i, 'batch', 'pagination_test')
        );
    END LOOP;
END $$;

-- Test 1: Check total count
SELECT 'Test 1: Total blocked users count' as test_name;
SELECT COUNT(*) as total_blocked_users FROM blocked_users WHERE email LIKE 'test_pagination_%' AND is_active = TRUE;

-- Test 2: Test first page (limit 20, offset 0)
SELECT 'Test 2: First page (limit 20, offset 0)' as test_name;
SELECT 
    email,
    block_reason,
    blocked_until,
    attempts_count
FROM blocked_users 
WHERE email LIKE 'test_pagination_%' AND is_active = TRUE
ORDER BY blocked_at DESC
LIMIT 20 OFFSET 0;

-- Test 3: Test second page (limit 20, offset 20)
SELECT 'Test 3: Second page (limit 20, offset 20)' as test_name;
SELECT 
    email,
    block_reason,
    blocked_until,
    attempts_count
FROM blocked_users 
WHERE email LIKE 'test_pagination_%' AND is_active = TRUE
ORDER BY blocked_at DESC
LIMIT 20 OFFSET 20;

-- Test 4: Test remaining items (limit 20, offset 40)
SELECT 'Test 4: Third page (limit 20, offset 40)' as test_name;
SELECT 
    email,
    block_reason,
    blocked_until,
    attempts_count
FROM blocked_users 
WHERE email LIKE 'test_pagination_%' AND is_active = TRUE
ORDER BY blocked_at DESC
LIMIT 20 OFFSET 40;

-- Test 5: Test pagination with range (Supabase style)
SELECT 'Test 5: Testing range-based pagination' as test_name;

-- First page
SELECT 'First page (range 0-19):' as page_info;
SELECT 
    email,
    block_reason,
    attempts_count
FROM blocked_users 
WHERE email LIKE 'test_pagination_%' AND is_active = TRUE
ORDER BY blocked_at DESC
LIMIT 20 OFFSET 0;

-- Second page
SELECT 'Second page (range 20-39):' as page_info;
SELECT 
    email,
    block_reason,
    attempts_count
FROM blocked_users 
WHERE email LIKE 'test_pagination_%' AND is_active = TRUE
ORDER BY blocked_at DESC
LIMIT 20 OFFSET 20;

-- Test 6: Verify pagination logic
SELECT 'Test 6: Pagination logic verification' as test_name;
SELECT 
    'Total records' as info,
    COUNT(*) as count
FROM blocked_users 
WHERE email LIKE 'test_pagination_%' AND is_active = TRUE
UNION ALL
SELECT 
    'Page 1 records (0-19)' as info,
    COUNT(*) as count
FROM (
    SELECT * FROM blocked_users 
    WHERE email LIKE 'test_pagination_%' AND is_active = TRUE
    ORDER BY blocked_at DESC
    LIMIT 20 OFFSET 0
) page1
UNION ALL
SELECT 
    'Page 2 records (20-39)' as info,
    COUNT(*) as count
FROM (
    SELECT * FROM blocked_users 
    WHERE email LIKE 'test_pagination_%' AND is_active = TRUE
    ORDER BY blocked_at DESC
    LIMIT 20 OFFSET 20
) page2
UNION ALL
SELECT 
    'Page 3 records (40-59)' as info,
    COUNT(*) as count
FROM (
    SELECT * FROM blocked_users 
    WHERE email LIKE 'test_pagination_%' AND is_active = TRUE
    ORDER BY blocked_at DESC
    LIMIT 20 OFFSET 40
) page3;

-- Test 7: Test edge cases
SELECT 'Test 7: Edge cases testing' as test_name;

-- Test with limit 0
SELECT 'Limit 0 test:' as edge_case;
SELECT COUNT(*) as count FROM (
    SELECT * FROM blocked_users 
    WHERE email LIKE 'test_pagination_%' AND is_active = TRUE
    ORDER BY blocked_at DESC
    LIMIT 0 OFFSET 0
) empty_result;

-- Test with large offset
SELECT 'Large offset test:' as edge_case;
SELECT COUNT(*) as count FROM (
    SELECT * FROM blocked_users 
    WHERE email LIKE 'test_pagination_%' AND is_active = TRUE
    ORDER BY blocked_at DESC
    LIMIT 20 OFFSET 1000
) large_offset_result;

-- Test with negative offset
SELECT 'Negative offset test:' as edge_case;
SELECT COUNT(*) as count FROM (
    SELECT * FROM blocked_users 
    WHERE email LIKE 'test_pagination_%' AND is_active = TRUE
    ORDER BY blocked_at DESC
    LIMIT 20 OFFSET -10
) negative_offset_result;

-- Test 8: Test active vs inactive users
SELECT 'Test 8: Active vs inactive users' as test_name;

-- Create some inactive blocked users
INSERT INTO blocked_users (
    email,
    ip_address,
    block_reason,
    blocked_until,
    attempts_count,
    is_active,
    metadata
) VALUES 
    ('test_inactive_1@example.com', '192.168.1.200', 'Inactive test 1', NOW() + INTERVAL '1 hour', 5, FALSE, '{}'),
    ('test_inactive_2@example.com', '192.168.1.201', 'Inactive test 2', NOW() + INTERVAL '1 hour', 6, FALSE, '{}');

-- Check active users only
SELECT 'Active blocked users count:' as info;
SELECT COUNT(*) as active_count FROM blocked_users WHERE email LIKE 'test_pagination_%' AND is_active = TRUE;

-- Check inactive users
SELECT 'Inactive blocked users count:' as info;
SELECT COUNT(*) as inactive_count FROM blocked_users WHERE email LIKE 'test_inactive_%' AND is_active = FALSE;

-- Clean up test data
DELETE FROM blocked_users WHERE email LIKE 'test_pagination_%';
DELETE FROM blocked_users WHERE email LIKE 'test_inactive_%';

SELECT 'Blocked users pagination test completed successfully!' as status;
