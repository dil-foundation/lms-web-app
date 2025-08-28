-- Script: Test Login Attempts Pagination
-- Description: Tests the pagination functionality for recent login attempts
-- Date: 2024-01-20

-- Clean up any existing test data
DELETE FROM login_attempts WHERE email LIKE 'test_pagination_%';

-- Create test data for pagination testing
-- We'll create 25 login attempts to test pagination with 20 items per page

SELECT 'Creating test data for pagination...' as status;

-- Create 25 test login attempts with different emails and timestamps
DO $$
DECLARE
    i INTEGER;
    test_email TEXT;
    attempt_time TIMESTAMP WITH TIME ZONE;
BEGIN
    FOR i IN 1..25 LOOP
        test_email := 'test_pagination_' || i || '@example.com';
        attempt_time := NOW() - (i || ' minutes')::INTERVAL;
        
        INSERT INTO login_attempts (
            email,
            ip_address,
            user_agent,
            attempt_time,
            success,
            failure_reason,
            metadata
        ) VALUES (
            test_email,
            '192.168.1.' || (100 + i),
            'Test Browser ' || i,
            attempt_time,
            CASE WHEN i % 3 = 0 THEN TRUE ELSE FALSE END, -- Every 3rd attempt is successful
            CASE WHEN i % 3 = 0 THEN NULL ELSE 'Invalid credentials' END,
            jsonb_build_object('test_id', i, 'batch', 'pagination_test')
        );
    END LOOP;
END $$;

-- Test 1: Check total count
SELECT 'Test 1: Total login attempts count' as test_name;
SELECT COUNT(*) as total_attempts FROM login_attempts WHERE email LIKE 'test_pagination_%';

-- Test 2: Test first page (limit 20, offset 0)
SELECT 'Test 2: First page (limit 20, offset 0)' as test_name;
SELECT 
    email,
    attempt_time,
    success,
    failure_reason
FROM login_attempts 
WHERE email LIKE 'test_pagination_%'
ORDER BY attempt_time DESC
LIMIT 20 OFFSET 0;

-- Test 3: Test second page (limit 20, offset 20)
SELECT 'Test 3: Second page (limit 20, offset 20)' as test_name;
SELECT 
    email,
    attempt_time,
    success,
    failure_reason
FROM login_attempts 
WHERE email LIKE 'test_pagination_%'
ORDER BY attempt_time DESC
LIMIT 20 OFFSET 20;

-- Test 4: Test remaining items (limit 20, offset 40)
SELECT 'Test 4: Third page (limit 20, offset 40)' as test_name;
SELECT 
    email,
    attempt_time,
    success,
    failure_reason
FROM login_attempts 
WHERE email LIKE 'test_pagination_%'
ORDER BY attempt_time DESC
LIMIT 20 OFFSET 40;

-- Test 5: Test the getRecentLoginAttempts function with pagination
SELECT 'Test 5: Testing getRecentLoginAttempts function' as test_name;

-- First page
SELECT 'First page (limit 20, offset 0):' as page_info;
SELECT * FROM get_recent_login_attempts(20, 0);

-- Second page
SELECT 'Second page (limit 20, offset 20):' as page_info;
SELECT * FROM get_recent_login_attempts(20, 20);

-- Test 6: Verify pagination logic
SELECT 'Test 6: Pagination logic verification' as test_name;
SELECT 
    'Total records' as info,
    COUNT(*) as count
FROM login_attempts 
WHERE email LIKE 'test_pagination_%'
UNION ALL
SELECT 
    'Page 1 records (0-19)' as info,
    COUNT(*) as count
FROM (
    SELECT * FROM login_attempts 
    WHERE email LIKE 'test_pagination_%'
    ORDER BY attempt_time DESC
    LIMIT 20 OFFSET 0
) page1
UNION ALL
SELECT 
    'Page 2 records (20-39)' as info,
    COUNT(*) as count
FROM (
    SELECT * FROM login_attempts 
    WHERE email LIKE 'test_pagination_%'
    ORDER BY attempt_time DESC
    LIMIT 20 OFFSET 20
) page2
UNION ALL
SELECT 
    'Page 3 records (40-59)' as info,
    COUNT(*) as count
FROM (
    SELECT * FROM login_attempts 
    WHERE email LIKE 'test_pagination_%'
    ORDER BY attempt_time DESC
    LIMIT 20 OFFSET 40
) page3;

-- Test 7: Test edge cases
SELECT 'Test 7: Edge cases testing' as test_name;

-- Test with limit 0
SELECT 'Limit 0 test:' as edge_case;
SELECT COUNT(*) as count FROM get_recent_login_attempts(0, 0);

-- Test with large offset
SELECT 'Large offset test:' as edge_case;
SELECT COUNT(*) as count FROM get_recent_login_attempts(20, 1000);

-- Test with negative offset
SELECT 'Negative offset test:' as edge_case;
SELECT COUNT(*) as count FROM get_recent_login_attempts(20, -10);

-- Clean up test data
DELETE FROM login_attempts WHERE email LIKE 'test_pagination_%';

SELECT 'Login attempts pagination test completed successfully!' as status;
