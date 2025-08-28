-- Script: Test Security Alert on User Block
-- Description: Tests that security alerts are created when users get blocked
-- Date: 2024-01-20

-- Clean up any existing test data
DELETE FROM login_attempts WHERE email = 'test@example.com';
DELETE FROM blocked_users WHERE email = 'test@example.com';
DELETE FROM security_alerts WHERE metadata->>'email' = 'test@example.com';

-- Ensure security settings are correct
INSERT INTO security_settings (setting_key, setting_value, setting_type, description) 
VALUES ('max_login_attempts', '5', 'integer', 'Maximum failed login attempts before lockout')
ON CONFLICT (setting_key) 
DO UPDATE SET 
    setting_value = EXCLUDED.setting_value,
    updated_at = NOW();

-- Test 1: Simulate 5 failed login attempts
SELECT 'Test 1: Simulating 5 failed login attempts' as test_name;
SELECT log_login_attempt('test@example.com', FALSE, '192.168.1.100', 'Test Browser', 'Invalid credentials');
SELECT log_login_attempt('test@example.com', FALSE, '192.168.1.100', 'Test Browser', 'Invalid credentials');
SELECT log_login_attempt('test@example.com', FALSE, '192.168.1.100', 'Test Browser', 'Invalid credentials');
SELECT log_login_attempt('test@example.com', FALSE, '192.168.1.100', 'Test Browser', 'Invalid credentials');
SELECT log_login_attempt('test@example.com', FALSE, '192.168.1.100', 'Test Browser', 'Invalid credentials');

-- Test 2: Check failed attempts count
SELECT 'Test 2: Failed attempts count' as test_name;
SELECT get_failed_login_attempts('test@example.com', 24) as failed_attempts;

-- Test 3: Trigger user block (this should create a security alert)
SELECT 'Test 3: Triggering user block' as test_name;
SELECT block_user('test@example.com', '192.168.1.100', 'Too many failed login attempts', 24, 5);

-- Test 4: Check if user is blocked
SELECT 'Test 4: Checking if user is blocked' as test_name;
SELECT * FROM blocked_users WHERE email = 'test@example.com';

-- Test 5: Check if security alert was created
SELECT 'Test 5: Checking security alert creation' as test_name;
SELECT 
    id,
    alert_type,
    message,
    severity,
    metadata->>'email' as blocked_email,
    metadata->>'attempts_count' as attempts_count,
    metadata->>'event_type' as event_type,
    created_at
FROM security_alerts 
WHERE metadata->>'email' = 'test@example.com'
AND metadata->>'event_type' = 'user_blocked'
ORDER BY created_at DESC
LIMIT 1;

-- Test 6: Verify security alert details
SELECT 'Test 6: Security alert details verification' as test_name;
SELECT 
    CASE 
        WHEN alert_type = 'warning' THEN '✓ Alert type is warning'
        ELSE '✗ Alert type should be warning'
    END as alert_type_check,
    CASE 
        WHEN message = 'User account blocked due to multiple failed login attempts' THEN '✓ Message is correct'
        ELSE '✗ Message should be about user account blocked'
    END as message_check,
    CASE 
        WHEN severity = 'high' THEN '✓ Severity is high'
        ELSE '✗ Severity should be high'
    END as severity_check,
    CASE 
        WHEN metadata->>'email' = 'test@example.com' THEN '✓ Email is correct'
        ELSE '✗ Email should be test@example.com'
    END as email_check,
    CASE 
        WHEN metadata->>'attempts_count' = '5' THEN '✓ Attempts count is correct'
        ELSE '✗ Attempts count should be 5'
    END as attempts_check,
    CASE 
        WHEN metadata->>'event_type' = 'user_blocked' THEN '✓ Event type is correct'
        ELSE '✗ Event type should be user_blocked'
    END as event_type_check
FROM security_alerts 
WHERE metadata->>'email' = 'test@example.com'
AND metadata->>'event_type' = 'user_blocked'
ORDER BY created_at DESC
LIMIT 1;

-- Test 7: Test the create_user_block_security_alert function directly
SELECT 'Test 7: Testing direct security alert creation' as test_name;
SELECT create_user_block_security_alert(
    'direct_test@example.com',
    'Direct test block reason',
    3,
    NOW() + INTERVAL '12 hours'
) as alert_id;

-- Test 8: Verify direct alert creation
SELECT 'Test 8: Verifying direct alert creation' as test_name;
SELECT 
    alert_type,
    message,
    severity,
    metadata->>'email' as blocked_email,
    metadata->>'event_type' as event_type
FROM security_alerts 
WHERE metadata->>'email' = 'direct_test@example.com'
ORDER BY created_at DESC
LIMIT 1;

-- Clean up test data
DELETE FROM login_attempts WHERE email IN ('test@example.com', 'direct_test@example.com');
DELETE FROM blocked_users WHERE email IN ('test@example.com', 'direct_test@example.com');
DELETE FROM security_alerts WHERE metadata->>'email' IN ('test@example.com', 'direct_test@example.com');

SELECT 'Security alert on block test completed successfully!' as status;
