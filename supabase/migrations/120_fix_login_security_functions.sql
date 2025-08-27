-- Migration: Fix Login Security Functions
-- Description: Updates functions to work properly with the new RLS policies
-- Date: 2024-01-20

-- Update the check_login_security function to handle missing security settings gracefully
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

-- Update the check_user_blocked function to handle empty results properly
CREATE OR REPLACE FUNCTION check_user_blocked(p_email TEXT, p_ip_address INET DEFAULT NULL)
RETURNS TABLE (
    is_blocked BOOLEAN,
    block_reason TEXT,
    blocked_until TIMESTAMP WITH TIME ZONE,
    attempts_count INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        bu.is_active AND bu.blocked_until > NOW(),
        bu.block_reason,
        bu.blocked_until,
        bu.attempts_count
    FROM blocked_users bu
    WHERE bu.email = p_email
    AND bu.is_active = TRUE
    AND bu.blocked_until > NOW();
    
    -- If no rows returned, return default values
    IF NOT FOUND THEN
        RETURN QUERY SELECT FALSE, NULL::TEXT, NULL::TIMESTAMP WITH TIME ZONE, 0;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update the get_failed_login_attempts function to handle empty results
CREATE OR REPLACE FUNCTION get_failed_login_attempts(
    p_email TEXT,
    p_hours_back INTEGER DEFAULT 24
)
RETURNS INTEGER AS $$
DECLARE
    attempt_count INTEGER;
BEGIN
    SELECT COUNT(*)
    INTO attempt_count
    FROM login_attempts
    WHERE email = p_email
    AND success = FALSE
    AND attempt_time > NOW() - INTERVAL '1 hour' * p_hours_back;
    
    RETURN COALESCE(attempt_count, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update the log_login_attempt function
CREATE OR REPLACE FUNCTION log_login_attempt(
    p_email TEXT,
    p_success BOOLEAN,
    p_ip_address INET DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL,
    p_failure_reason TEXT DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}'
)
RETURNS UUID AS $$
DECLARE
    log_id UUID;
BEGIN
    INSERT INTO login_attempts (
        email,
        ip_address,
        user_agent,
        success,
        failure_reason,
        metadata
    ) VALUES (
        p_email,
        p_ip_address,
        p_user_agent,
        p_success,
        p_failure_reason,
        p_metadata
    ) RETURNING id INTO log_id;
    
    RETURN log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update the block_user function
CREATE OR REPLACE FUNCTION block_user(
    p_email TEXT,
    p_ip_address INET DEFAULT NULL,
    p_block_reason TEXT DEFAULT 'Too many failed login attempts',
    p_block_hours INTEGER DEFAULT 24,
    p_attempts_count INTEGER DEFAULT 0
)
RETURNS UUID AS $$
DECLARE
    block_id UUID;
BEGIN
    -- Insert or update blocked user record
    INSERT INTO blocked_users (
        email,
        ip_address,
        block_reason,
        blocked_until,
        attempts_count,
        metadata
    ) VALUES (
        p_email,
        p_ip_address,
        p_block_reason,
        NOW() + INTERVAL '1 hour' * p_block_hours,
        p_attempts_count,
        jsonb_build_object(
            'blocked_at', NOW(),
            'block_duration_hours', p_block_hours
        )
    )
    ON CONFLICT (email) 
    DO UPDATE SET
        ip_address = EXCLUDED.ip_address,
        block_reason = EXCLUDED.block_reason,
        blocked_until = EXCLUDED.blocked_until,
        attempts_count = EXCLUDED.attempts_count,
        is_active = TRUE,
        metadata = EXCLUDED.metadata
    RETURNING id INTO block_id;
    
    RETURN block_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update the unblock_user function
CREATE OR REPLACE FUNCTION unblock_user(p_email TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE blocked_users 
    SET is_active = FALSE
    WHERE email = p_email;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update the reset_failed_attempts function
CREATE OR REPLACE FUNCTION reset_failed_attempts(p_email TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    -- Remove user from blocked list if they exist
    UPDATE blocked_users 
    SET is_active = FALSE
    WHERE email = p_email;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update the get_login_security_stats function
CREATE OR REPLACE FUNCTION get_login_security_stats(p_hours_back INTEGER DEFAULT 24)
RETURNS TABLE (
    total_attempts BIGINT,
    failed_attempts BIGINT,
    successful_attempts BIGINT,
    blocked_users_count BIGINT,
    unique_ips BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*) as total_attempts,
        COUNT(*) FILTER (WHERE success = FALSE) as failed_attempts,
        COUNT(*) FILTER (WHERE success = TRUE) as successful_attempts,
        (SELECT COUNT(*) FROM blocked_users WHERE is_active = TRUE AND blocked_until > NOW()) as blocked_users_count,
        COUNT(DISTINCT ip_address) FILTER (WHERE ip_address IS NOT NULL) as unique_ips
    FROM login_attempts
    WHERE attempt_time > NOW() - INTERVAL '1 hour' * p_hours_back;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update the cleanup_old_login_records function
CREATE OR REPLACE FUNCTION cleanup_old_login_records(p_days_to_keep INTEGER DEFAULT 30)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    -- Delete old login attempts
    DELETE FROM login_attempts 
    WHERE attempt_time < NOW() - INTERVAL '1 day' * p_days_to_keep;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    -- Delete expired blocked users
    DELETE FROM blocked_users 
    WHERE blocked_until < NOW() AND is_active = FALSE;
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions on all functions
GRANT EXECUTE ON FUNCTION check_login_security(TEXT, INET, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION check_login_security(TEXT, INET, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION check_user_blocked(TEXT, INET) TO authenticated;
GRANT EXECUTE ON FUNCTION check_user_blocked(TEXT, INET) TO anon;
GRANT EXECUTE ON FUNCTION get_failed_login_attempts(TEXT, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_failed_login_attempts(TEXT, INTEGER) TO anon;
GRANT EXECUTE ON FUNCTION log_login_attempt(TEXT, BOOLEAN, INET, TEXT, TEXT, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION log_login_attempt(TEXT, BOOLEAN, INET, TEXT, TEXT, JSONB) TO anon;
GRANT EXECUTE ON FUNCTION block_user(TEXT, INET, TEXT, INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION block_user(TEXT, INET, TEXT, INTEGER, INTEGER) TO anon;
GRANT EXECUTE ON FUNCTION unblock_user(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION unblock_user(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION reset_failed_attempts(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION reset_failed_attempts(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION get_login_security_stats(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_login_security_stats(INTEGER) TO anon;
GRANT EXECUTE ON FUNCTION cleanup_old_login_records(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_old_login_records(INTEGER) TO anon;
