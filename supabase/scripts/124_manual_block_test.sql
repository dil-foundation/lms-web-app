-- Script: Manual Block Test
-- Description: Manually tests blocking for user with 6 failed attempts
-- Date: 2024-01-20

-- First, let's check the current state
SELECT 'Current state check:' as info;

-- Check failed attempts
SELECT 'Failed attempts count:' as info;
SELECT get_failed_login_attempts('arunvaradharajalu@gmail.com', 24);

-- Check security status
SELECT 'Security status:' as info;
SELECT * FROM check_login_security('arunvaradharajalu@gmail.com');

-- Check if user is already blocked
SELECT 'Current blocked status:' as info;
SELECT * FROM blocked_users WHERE email = 'arunvaradharajalu@gmail.com';

-- Now let's manually trigger the blocking
SELECT 'Manually triggering block...' as info;
SELECT trigger_user_block('arunvaradharajalu@gmail.com', 'Manual test - 6 failed attempts');

-- Check if user is now blocked
SELECT 'Blocked status after manual trigger:' as info;
SELECT * FROM blocked_users WHERE email = 'arunvaradharajalu@gmail.com';

-- Check security status after blocking
SELECT 'Security status after blocking:' as info;
SELECT * FROM check_login_security('arunvaradharajalu@gmail.com');

-- Test the admin dashboard stats
SELECT 'Admin dashboard stats:' as info;
SELECT * FROM get_login_security_stats(24);

-- Now let's unblock the user for testing
SELECT 'Unblocking user for testing...' as info;
SELECT unblock_user('arunvaradharajalu@gmail.com');

-- Final check
SELECT 'Final status:' as info;
SELECT * FROM blocked_users WHERE email = 'arunvaradharajalu@gmail.com';
SELECT * FROM check_login_security('arunvaradharajalu@gmail.com');

SELECT 'Manual block test completed!' as status;
