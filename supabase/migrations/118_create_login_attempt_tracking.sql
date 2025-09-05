-- Migration: Create Login Attempt Tracking and User Blocking System
-- Description: Implements security features for tracking failed login attempts and blocking users
-- Date: 2024-01-20

-- 1. Create login_attempts table to track failed login attempts
CREATE TABLE IF NOT EXISTS login_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL,
    ip_address INET,
    user_agent TEXT,
    attempt_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    success BOOLEAN DEFAULT FALSE,
    failure_reason TEXT,
    metadata JSONB DEFAULT '{}'
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_login_attempts_email ON login_attempts(email);
CREATE INDEX IF NOT EXISTS idx_login_attempts_time ON login_attempts(attempt_time);
CREATE INDEX IF NOT EXISTS idx_login_attempts_success ON login_attempts(success);
CREATE INDEX IF NOT EXISTS idx_login_attempts_ip ON login_attempts(ip_address);

-- Add comments
COMMENT ON TABLE login_attempts IS 'Tracks all login attempts (successful and failed) for security monitoring';
COMMENT ON COLUMN login_attempts.email IS 'Email address used in login attempt';
COMMENT ON COLUMN login_attempts.success IS 'Whether the login attempt was successful';
COMMENT ON COLUMN login_attempts.failure_reason IS 'Reason for login failure if applicable';

-- 2. Create blocked_users table to track temporarily blocked users
CREATE TABLE IF NOT EXISTS blocked_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    ip_address INET,
    block_reason TEXT NOT NULL,
    blocked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    blocked_until TIMESTAMP WITH TIME ZONE NOT NULL,
    attempts_count INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    metadata JSONB DEFAULT '{}'
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_blocked_users_email ON blocked_users(email);
CREATE INDEX IF NOT EXISTS idx_blocked_users_active ON blocked_users(is_active);
CREATE INDEX IF NOT EXISTS idx_blocked_users_until ON blocked_users(blocked_until);
CREATE INDEX IF NOT EXISTS idx_blocked_users_ip ON blocked_users(ip_address);

-- Add comments
COMMENT ON TABLE blocked_users IS 'Tracks users who are temporarily blocked due to security violations';
COMMENT ON COLUMN blocked_users.blocked_until IS 'Timestamp when the block expires';
COMMENT ON COLUMN blocked_users.is_active IS 'Whether the block is currently active';

-- 3. Create function to check if user is blocked
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
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Create function to get failed login attempts count
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

-- 5. Create function to log login attempt
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

-- 6. Create function to block user
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

-- 7. Create function to unblock user
CREATE OR REPLACE FUNCTION unblock_user(p_email TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE blocked_users 
    SET is_active = FALSE
    WHERE email = p_email;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Create function to reset failed attempts on successful login
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

-- 9. Create function to get security statistics
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

-- 10. Create function to clean up old records
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

-- 11. Set up Row Level Security (RLS)
ALTER TABLE login_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE blocked_users ENABLE ROW LEVEL SECURITY;

-- RLS policies for login_attempts (admins can read all, users can read their own)
CREATE POLICY "Admins can view all login attempts" ON login_attempts
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'admin'
        )
    );

CREATE POLICY "Users can view their own login attempts" ON login_attempts
    FOR SELECT USING (
        email = (
            SELECT email FROM auth.users WHERE id = auth.uid()
        )
    );

-- Allow system to insert login attempts
CREATE POLICY "System can insert login attempts" ON login_attempts
    FOR INSERT WITH CHECK (true);

-- RLS policies for blocked_users (admins can manage all, users can view their own)
CREATE POLICY "Admins can manage blocked users" ON blocked_users
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'admin'
        )
    );

CREATE POLICY "Users can view their own block status" ON blocked_users
    FOR SELECT USING (
        email = (
            SELECT email FROM auth.users WHERE id = auth.uid()
        )
    );

-- Allow system to manage blocked users
CREATE POLICY "System can manage blocked users" ON blocked_users
    FOR ALL USING (true);

-- 12. Create trigger to automatically clean up expired blocks
CREATE OR REPLACE FUNCTION auto_cleanup_expired_blocks()
RETURNS TRIGGER AS $$
BEGIN
    -- Set expired blocks as inactive
    UPDATE blocked_users 
    SET is_active = FALSE
    WHERE blocked_until < NOW() AND is_active = TRUE;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_cleanup_expired_blocks
    AFTER INSERT OR UPDATE ON blocked_users
    FOR EACH STATEMENT
    EXECUTE FUNCTION auto_cleanup_expired_blocks();

-- 13. Insert sample data for testing
INSERT INTO login_attempts (email, ip_address, success, failure_reason) VALUES
    ('test@example.com', '192.168.1.100', FALSE, 'Invalid credentials'),
    ('test@example.com', '192.168.1.100', FALSE, 'Invalid credentials'),
    ('test@example.com', '192.168.1.100', FALSE, 'Invalid credentials'),
    ('test@example.com', '192.168.1.100', FALSE, 'Invalid credentials'),
    ('test@example.com', '192.168.1.100', FALSE, 'Invalid credentials'),
    ('test@example.com', '192.168.1.100', TRUE, NULL);

-- 14. Create a function to check and handle login security
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
    -- Get max login attempts from security settings
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
