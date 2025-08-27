-- Migration: Add Security Alert on User Block
-- Description: Creates a function to automatically create security alerts when users get blocked
-- Date: 2024-01-20

-- Function to create security alert when user gets blocked
CREATE OR REPLACE FUNCTION create_user_block_security_alert(
    p_email TEXT,
    p_block_reason TEXT,
    p_attempts_count INTEGER,
    p_blocked_until TIMESTAMP WITH TIME ZONE
)
RETURNS UUID AS $$
DECLARE
    alert_id UUID;
BEGIN
    -- Insert security alert
    INSERT INTO security_alerts (
        alert_type,
        message,
        severity,
        metadata
    ) VALUES (
        'warning',
        'User account blocked due to multiple failed login attempts',
        'high',
        jsonb_build_object(
            'email', p_email,
            'block_reason', p_block_reason,
            'attempts_count', p_attempts_count,
            'blocked_until', p_blocked_until,
            'event_type', 'user_blocked',
            'timestamp', NOW()
        )
    ) RETURNING id INTO alert_id;
    
    -- Log the alert creation
    RAISE NOTICE 'Security alert created for blocked user %: %', p_email, alert_id;
    
    RETURN alert_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION create_user_block_security_alert(TEXT, TEXT, INTEGER, TIMESTAMP WITH TIME ZONE) TO authenticated;
GRANT EXECUTE ON FUNCTION create_user_block_security_alert(TEXT, TEXT, INTEGER, TIMESTAMP WITH TIME ZONE) TO anon;

-- Update the block_user function to automatically create security alert
CREATE OR REPLACE FUNCTION block_user(
    p_email TEXT,
    p_ip_address INET DEFAULT NULL,
    p_block_reason TEXT DEFAULT 'Too many failed login attempts',
    p_block_duration_hours INTEGER DEFAULT 24,
    p_attempts_count INTEGER DEFAULT 0
)
RETURNS BOOLEAN AS $$
DECLARE
    blocked_until TIMESTAMP WITH TIME ZONE;
    block_id UUID;
    alert_id UUID;
BEGIN
    -- Calculate block duration
    blocked_until := NOW() + (p_block_duration_hours || ' hours')::INTERVAL;
    
    -- Insert or update blocked user record
    INSERT INTO blocked_users (
        email,
        ip_address,
        block_reason,
        blocked_until,
        attempts_count,
        is_active
    ) VALUES (
        p_email,
        p_ip_address,
        p_block_reason,
        blocked_until,
        p_attempts_count,
        TRUE
    )
    ON CONFLICT (email) 
    DO UPDATE SET
        ip_address = EXCLUDED.ip_address,
        block_reason = EXCLUDED.block_reason,
        blocked_until = EXCLUDED.blocked_until,
        attempts_count = EXCLUDED.attempts_count,
        is_active = TRUE,
        created_at = NOW()
    RETURNING id INTO block_id;
    
    -- Create security alert for the blocked user
    SELECT create_user_block_security_alert(
        p_email,
        p_block_reason,
        p_attempts_count,
        blocked_until
    ) INTO alert_id;
    
    -- Log the block action
    RAISE NOTICE 'User % blocked until % (attempts: %, alert_id: %)', p_email, blocked_until, p_attempts_count, alert_id;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION block_user(TEXT, INET, TEXT, INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION block_user(TEXT, INET, TEXT, INTEGER, INTEGER) TO anon;

-- Test the new functionality
SELECT 'Testing security alert creation...' as status;
SELECT create_user_block_security_alert(
    'test@example.com',
    'Test block reason',
    5,
    NOW() + INTERVAL '24 hours'
);

-- Verify the alert was created
SELECT 'Verifying security alert...' as status;
SELECT 
    alert_type,
    message,
    severity,
    metadata->>'email' as blocked_email,
    metadata->>'attempts_count' as attempts_count
FROM security_alerts 
WHERE metadata->>'event_type' = 'user_blocked'
ORDER BY created_at DESC
LIMIT 1;

-- Clean up test data
DELETE FROM security_alerts WHERE metadata->>'email' = 'test@example.com';

SELECT 'Security alert on block functionality added successfully!' as status;
