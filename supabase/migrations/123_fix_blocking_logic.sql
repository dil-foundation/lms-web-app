-- Migration: Fix Login Blocking Logic
-- Description: Fixes the blocking logic to ensure users are blocked after 5 failed attempts
-- Date: 2024-01-20

-- First, let's check and fix the get_failed_login_attempts function
-- The issue might be with the time interval calculation
CREATE OR REPLACE FUNCTION get_failed_login_attempts(
    p_email TEXT,
    p_hours_back INTEGER DEFAULT 24
)
RETURNS INTEGER AS $$
DECLARE
    attempt_count INTEGER;
BEGIN
    -- Use a more explicit time calculation
    SELECT COUNT(*)
    INTO attempt_count
    FROM login_attempts
    WHERE email = p_email
    AND success = FALSE
    AND attempt_time >= NOW() - (p_hours_back || ' hours')::INTERVAL;
    
    RETURN COALESCE(attempt_count, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update the check_login_security function to be more explicit about the logic
CREATE OR REPLACE FUNCTION check_login_security(
    p_email TEXT,
    p_ip_address INET DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL
)
RETURNS TABLE (
    can_proceed BOOLEAN,
    is_blocked BOOLEAN,
    block_reason TEXT,
    blocked_until TIMESTAMP WITH TIME ZONE,
    failed_attempts INTEGER,
    max_attempts INTEGER
) AS $$
DECLARE
    max_attempts_setting INTEGER;
    failed_count INTEGER;
    block_status RECORD;
BEGIN
    -- Get max login attempts from security settings, default to 5 if not found
    SELECT CAST(setting_value AS INTEGER) INTO max_attempts_setting
    FROM security_settings 
    WHERE setting_key = 'max_login_attempts';
    
    -- Default to 5 if not found
    max_attempts_setting := COALESCE(max_attempts_setting, 5);
    
    -- Check if user is currently blocked
    SELECT * INTO block_status
    FROM check_user_blocked(p_email, p_ip_address);
    
    -- Get failed attempts count for last 24 hours
    failed_count := get_failed_login_attempts(p_email, 24);
    
    -- Debug logging (remove in production)
    RAISE NOTICE 'Email: %, Failed attempts: %, Max attempts: %, Is blocked: %', 
        p_email, failed_count, max_attempts_setting, block_status.is_blocked;
    
    RETURN QUERY
    SELECT 
        NOT block_status.is_blocked AND failed_count < max_attempts_setting,
        block_status.is_blocked,
        block_status.block_reason,
        block_status.blocked_until,
        failed_count,
        max_attempts_setting;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to manually trigger blocking for testing
CREATE OR REPLACE FUNCTION trigger_user_block(
    p_email TEXT,
    p_reason TEXT DEFAULT 'Manual trigger'
)
RETURNS BOOLEAN AS $$
DECLARE
    failed_count INTEGER;
    max_attempts INTEGER;
BEGIN
    -- Get current failed attempts
    failed_count := get_failed_login_attempts(p_email, 24);
    
    -- Get max attempts setting
    SELECT CAST(setting_value AS INTEGER) INTO max_attempts
    FROM security_settings 
    WHERE setting_key = 'max_login_attempts';
    
    max_attempts := COALESCE(max_attempts, 5);
    
    -- If user has enough failed attempts, block them
    IF failed_count >= max_attempts THEN
        PERFORM block_user(p_email, NULL, p_reason, 24, failed_count);
        RETURN TRUE;
    ELSE
        RETURN FALSE;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_failed_login_attempts(TEXT, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_failed_login_attempts(TEXT, INTEGER) TO anon;
GRANT EXECUTE ON FUNCTION check_login_security(TEXT, INET, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION check_login_security(TEXT, INET, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION trigger_user_block(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION trigger_user_block(TEXT, TEXT) TO anon;

-- Test the fix
SELECT 'Testing fixed functions...' as status;

-- Test failed attempts count
SELECT 'Failed attempts for arunvaradharajalu@gmail.com:' as test;
SELECT get_failed_login_attempts('arunvaradharajalu@gmail.com', 24);

-- Test security check
SELECT 'Security check for arunvaradharajalu@gmail.com:' as test;
SELECT * FROM check_login_security('arunvaradharajalu@gmail.com');

-- Test manual block trigger
SELECT 'Testing manual block trigger:' as test;
SELECT trigger_user_block('arunvaradharajalu@gmail.com', 'Test manual trigger');

-- Check if user is now blocked
SELECT 'Checking if user is blocked:' as test;
SELECT * FROM blocked_users WHERE email = 'arunvaradharajalu@gmail.com';

-- Clean up test
SELECT 'Cleaning up test block:' as test;
SELECT unblock_user('arunvaradharajalu@gmail.com');

SELECT 'Blocking logic fix completed!' as status;
