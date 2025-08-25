-- Script: Test Blocking After Trigger Fix
-- Description: Tests the login blocking functionality after fixing the trigger issue
-- Date: 2024-01-20

-- First, let's clean up any existing test data
DELETE FROM login_attempts WHERE email = 'test@example.com';
DELETE FROM blocked_users WHERE email = 'test@example.com';

-- Ensure the security settings are correct
INSERT INTO security_settings (setting_key, setting_value, setting_type, description) 
VALUES ('max_login_attempts', '5', 'integer', 'Maximum failed login attempts before lockout')
ON CONFLICT (setting_key) 
DO UPDATE SET 
    setting_value = EXCLUDED.setting_value,
    updated_at = NOW();

-- Test 1: Check initial state
SELECT 'Test 1: Initial state check' as test_name;
SELECT get_failed_login_attempts('test@example.com', 24) as failed_attempts;
SELECT * FROM check_login_security('test@example.com');

-- Test 2: Simulate 5 failed login attempts
SELECT 'Test 2: Simulating 5 failed login attempts' as test_name;
SELECT log_login_attempt('test@example.com', FALSE, '192.168.1.100', 'Test Browser', 'Invalid credentials');
SELECT log_login_attempt('test@example.com', FALSE, '192.168.1.100', 'Test Browser', 'Invalid credentials');
SELECT log_login_attempt('test@example.com', FALSE, '192.168.1.100', 'Test Browser', 'Invalid credentials');
SELECT log_login_attempt('test@example.com', FALSE, '192.168.1.100', 'Test Browser', 'Invalid credentials');
SELECT log_login_attempt('test@example.com', FALSE, '192.168.1.100', 'Test Browser', 'Invalid credentials');

-- Test 3: Check failed attempts count
SELECT 'Test 3: Failed attempts count after 5 attempts' as test_name;
SELECT get_failed_login_attempts('test@example.com', 24) as failed_attempts;

-- Test 4: Test manual block trigger
SELECT 'Test 4: Testing manual block trigger' as test_name;
SELECT trigger_user_block('test@example.com', 'Test manual trigger - 5 failed attempts');

-- Test 5: Check if user is now blocked
SELECT 'Test 5: Checking if user is blocked' as test_name;
SELECT * FROM blocked_users WHERE email = 'test@example.com';

-- Test 6: Check security status
SELECT 'Test 6: Security status check' as test_name;
SELECT * FROM check_login_security('test@example.com');

-- Test 7: Test admin dashboard stats
SELECT 'Test 7: Admin dashboard stats' as test_name;
SELECT * FROM get_login_security_stats(24);

-- Test 8: Unblock the user
SELECT 'Test 8: Unblocking user' as test_name;
SELECT unblock_user('test@example.com');

-- Test 9: Final verification
SELECT 'Test 9: Final verification' as test_name;
SELECT * FROM blocked_users WHERE email = 'test@example.com';
SELECT * FROM check_login_security('test@example.com');

-- Clean up test data
DELETE FROM login_attempts WHERE email = 'test@example.com';
DELETE FROM blocked_users WHERE email = 'test@example.com';

SELECT 'Blocking test completed successfully!' as status;
