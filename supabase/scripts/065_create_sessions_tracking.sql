-- Migration: Create Sessions Tracking for Active Sessions Count
-- Description: Creates tables and functions to track user sessions and get active sessions count
-- Date: 2024-01-15

-- 1. Create user_sessions table to track active sessions
CREATE TABLE IF NOT EXISTS user_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    session_token TEXT NOT NULL,
    ip_address INET,
    user_agent TEXT,
    location TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_active ON user_sessions(is_active);
CREATE INDEX IF NOT EXISTS idx_user_sessions_last_activity ON user_sessions(last_activity);
CREATE INDEX IF NOT EXISTS idx_user_sessions_expires_at ON user_sessions(expires_at);

-- Add comments
COMMENT ON TABLE user_sessions IS 'Tracks active user sessions for security monitoring';

-- 2. Create function to create a new session
CREATE OR REPLACE FUNCTION create_user_session(
    p_user_id UUID,
    p_session_token TEXT,
    p_ip_address INET DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL,
    p_location TEXT DEFAULT NULL,
    p_session_duration_hours INTEGER DEFAULT 24
)
RETURNS UUID AS $$
DECLARE
    session_id UUID;
BEGIN
    -- Deactivate any existing sessions for this user
    UPDATE user_sessions 
    SET is_active = FALSE 
    WHERE user_id = p_user_id AND is_active = TRUE;
    
    -- Create new session
    INSERT INTO user_sessions (
        user_id,
        session_token,
        ip_address,
        user_agent,
        location,
        expires_at
    ) VALUES (
        p_user_id,
        p_session_token,
        p_ip_address,
        p_user_agent,
        p_location,
        NOW() + (p_session_duration_hours || ' hours')::INTERVAL
    ) RETURNING id INTO session_id;
    
    RETURN session_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Create function to update session activity
CREATE OR REPLACE FUNCTION update_session_activity(
    p_session_token TEXT
)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE user_sessions 
    SET last_activity = NOW()
    WHERE session_token = p_session_token 
    AND is_active = TRUE 
    AND expires_at > NOW();
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Create function to deactivate session
CREATE OR REPLACE FUNCTION deactivate_session(
    p_session_token TEXT
)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE user_sessions 
    SET is_active = FALSE
    WHERE session_token = p_session_token;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Create function to get active sessions count
CREATE OR REPLACE FUNCTION get_active_sessions_count()
RETURNS INTEGER AS $$
DECLARE
    active_count INTEGER;
BEGIN
    -- Clean up expired sessions first
    UPDATE user_sessions 
    SET is_active = FALSE 
    WHERE expires_at < NOW() AND is_active = TRUE;
    
    -- Count active sessions
    SELECT COUNT(*) INTO active_count
    FROM user_sessions 
    WHERE is_active = TRUE 
    AND expires_at > NOW();
    
    RETURN COALESCE(active_count, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Create function to get active sessions details
CREATE OR REPLACE FUNCTION get_active_sessions()
RETURNS TABLE (
    user_id UUID,
    user_email TEXT,
    ip_address INET,
    location TEXT,
    last_activity TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    -- Clean up expired sessions first
    UPDATE user_sessions 
    SET is_active = FALSE 
    WHERE expires_at < NOW() AND is_active = TRUE;
    
    RETURN QUERY
    SELECT 
        us.user_id,
        u.email,
        us.ip_address,
        us.location,
        us.last_activity,
        us.created_at
    FROM user_sessions us
    LEFT JOIN auth.users u ON us.user_id = u.id
    WHERE us.is_active = TRUE 
    AND us.expires_at > NOW()
    ORDER BY us.last_activity DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Create function to clean up old sessions (for maintenance)
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS INTEGER AS $$
DECLARE
    cleaned_count INTEGER;
BEGIN
    DELETE FROM user_sessions 
    WHERE expires_at < NOW() - INTERVAL '7 days';
    
    GET DIAGNOSTICS cleaned_count = ROW_COUNT;
    RETURN cleaned_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Set up Row Level Security (RLS)
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;

-- RLS policies for user_sessions
CREATE POLICY "Users can view their own sessions" ON user_sessions
    FOR SELECT USING (
        user_id = auth.uid()
    );

CREATE POLICY "Admins can view all sessions" ON user_sessions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'admin'
        )
    );

CREATE POLICY "Users can manage their own sessions" ON user_sessions
    FOR ALL USING (
        user_id = auth.uid()
    );

-- 9. Create trigger to update last_activity on session access
CREATE OR REPLACE FUNCTION update_session_on_access()
RETURNS TRIGGER AS $$
BEGIN
    NEW.last_activity = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_session_activity
    BEFORE UPDATE ON user_sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_session_on_access();

-- 10. Sample data insertion removed - will be handled by actual user sessions
-- The session tracking will work automatically when users log in
