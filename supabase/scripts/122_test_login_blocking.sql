-- Script: Test Login Blocking Functionality
-- Description: Tests the login security system to ensure users are blocked after 5 failed attempts
-- Date: 2024-01-20

-- First, ensure the security_settings table has the max_login_attempts setting
INSERT INTO security_settings (setting_key, setting_value, setting_type, description) 
VALUES ('max_login_attempts', '5', 'integer', 'Maximum failed login attempts before lockout')
ON CONFLICT (setting_key) 
DO UPDATE SET 
    setting_value = EXCLUDED.setting_value,
    updated_at = NOW();

-- Clear any existing test data
DELETE FROM login_attempts WHERE email = 'test@example.com';
DELETE FROM blocked_users WHERE email = 'test@example.com';

-- Test 1: Check initial security status
SELECT 'Test 1: Initial security status' as test_name;
SELECT * FROM check_login_security('test@example.com');

-- Test 2: Simulate 4 failed login attempts
SELECT 'Test 2: Simulating 4 failed login attempts' as test_name;
SELECT log_login_attempt('test@example.com', FALSE, '192.168.1.100', 'Test Browser', 'Invalid credentials');
SELECT log_login_attempt('test@example.com', FALSE, '192.168.1.100', 'Test Browser', 'Invalid credentials');
SELECT log_login_attempt('test@example.com', FALSE, '192.168.1.100', 'Test Browser', 'Invalid credentials');
SELECT log_login_attempt('test@example.com', FALSE, '192.168.1.100', 'Test Browser', 'Invalid credentials');

-- Test 3: Check security status after 4 failed attempts
SELECT 'Test 3: Security status after 4 failed attempts' as test_name;
SELECT * FROM check_login_security('test@example.com');

-- Test 4: Simulate 5th failed attempt (should trigger blocking)
SELECT 'Test 4: Simulating 5th failed attempt (should trigger blocking)' as test_name;
SELECT log_login_attempt('test@example.com', FALSE, '192.168.1.100', 'Test Browser', 'Invalid credentials');

-- Test 5: Check if user is now blocked
SELECT 'Test 5: Checking if user is now blocked' as test_name;
SELECT * FROM check_login_security('test@example.com');

-- Test 6: Check blocked_users table
SELECT 'Test 6: Checking blocked_users table' as test_name;
SELECT * FROM blocked_users WHERE email = 'test@example.com';

-- Test 7: Verify failed attempts count
SELECT 'Test 7: Verifying failed attempts count' as test_name;
SELECT get_failed_login_attempts('test@example.com', 24);

-- Test 8: Try to log another attempt (should be blocked)
SELECT 'Test 8: Trying to log another attempt (should be blocked)' as test_name;
SELECT * FROM check_login_security('test@example.com');

-- Test 9: Unblock the user
SELECT 'Test 9: Unblocking the user' as test_name;
SELECT unblock_user('test@example.com');

-- Test 10: Check if user is unblocked
SELECT 'Test 10: Checking if user is unblocked' as test_name;
SELECT * FROM check_login_security('test@example.com');

-- Test 11: Reset failed attempts
SELECT 'Test 11: Resetting failed attempts' as test_name;
SELECT reset_failed_attempts('test@example.com');

-- Test 12: Final check
SELECT 'Test 12: Final security status check' as test_name;
SELECT * FROM check_login_security('test@example.com');

-- Clean up test data
DELETE FROM login_attempts WHERE email = 'test@example.com';
DELETE FROM blocked_users WHERE email = 'test@example.com';

SELECT 'Login blocking test completed!' as status;
