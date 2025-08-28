-- Script: Diagnose Login Blocking Issue
-- Description: Diagnoses why users aren't being blocked after failed attempts
-- Date: 2024-01-20

-- Check the current security settings
SELECT 'Current security settings:' as info;
SELECT * FROM security_settings WHERE setting_key = 'max_login_attempts';

-- Check all login attempts for the specific user
SELECT 'All login attempts for arunvaradharajalu@gmail.com:' as info;
SELECT 
    id,
    email,
    attempt_time,
    success,
    failure_reason,
    EXTRACT(EPOCH FROM (NOW() - attempt_time))/3600 as hours_ago
FROM login_attempts 
WHERE email = 'arunvaradharajalu@gmail.com'
ORDER BY attempt_time DESC;

-- Check failed attempts count using the function
SELECT 'Failed attempts count (function):' as info;
SELECT get_failed_login_attempts('arunvaradharajalu@gmail.com', 24);

-- Check failed attempts count manually
SELECT 'Failed attempts count (manual):' as info;
SELECT COUNT(*) as failed_count
FROM login_attempts
WHERE email = 'arunvaradharajalu@gmail.com'
AND success = FALSE
AND attempt_time > NOW() - INTERVAL '24 hours';

-- Check security status
SELECT 'Security status:' as info;
SELECT * FROM check_login_security('arunvaradharajalu@gmail.com');

-- Check if user is blocked
SELECT 'Blocked user status:' as info;
SELECT * FROM blocked_users WHERE email = 'arunvaradharajalu@gmail.com';

-- Check blocked users count
SELECT 'Total blocked users:' as info;
SELECT COUNT(*) as blocked_count FROM blocked_users WHERE is_active = TRUE AND blocked_until > NOW();

-- Test the blocking function manually
SELECT 'Testing manual block:' as info;
SELECT block_user('arunvaradharajalu@gmail.com', '192.168.1.100', 'Manual test block', 24, 6);

-- Check if user is now blocked
SELECT 'Blocked user status after manual block:' as info;
SELECT * FROM blocked_users WHERE email = 'arunvaradharajalu@gmail.com';

-- Check security status after manual block
SELECT 'Security status after manual block:' as info;
SELECT * FROM check_login_security('arunvaradharajalu@gmail.com');

-- Clean up test block
SELECT 'Cleaning up test block:' as info;
SELECT unblock_user('arunvaradharajalu@gmail.com');

-- Final status
SELECT 'Final blocked user status:' as info;
SELECT * FROM blocked_users WHERE email = 'arunvaradharajalu@gmail.com';
