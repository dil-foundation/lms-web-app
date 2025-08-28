-- Script: Run Login Security Fixes
-- Description: Applies all the fixes for login security permissions
-- Date: 2024-01-20

-- First, ensure the security_settings table has the max_login_attempts setting
INSERT INTO security_settings (setting_key, setting_value, setting_type, description) 
VALUES ('max_login_attempts', '5', 'integer', 'Maximum failed login attempts before lockout')
ON CONFLICT (setting_key) 
DO UPDATE SET 
    setting_value = EXCLUDED.setting_value,
    updated_at = NOW();

-- Test the functions to ensure they work
SELECT 'Testing check_login_security function...' as status;
SELECT * FROM check_login_security('test@example.com');

SELECT 'Testing get_failed_login_attempts function...' as status;
SELECT get_failed_login_attempts('test@example.com', 24);

SELECT 'Testing get_login_security_stats function...' as status;
SELECT * FROM get_login_security_stats(24);

-- Verify tables exist and are accessible
SELECT 'Verifying login_attempts table...' as status;
SELECT COUNT(*) FROM login_attempts;

SELECT 'Verifying blocked_users table...' as status;
SELECT COUNT(*) FROM blocked_users;

SELECT 'Login security system is ready!' as status;
