-- Migration: Create Security Settings Tables and Functions
-- Description: Creates tables and functions for storing authentication settings, access logs, and security alerts
-- Date: 2024-01-15

-- 1. Create security_settings table to store authentication configuration
CREATE TABLE IF NOT EXISTS security_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    setting_key VARCHAR(100) UNIQUE NOT NULL,
    setting_value TEXT NOT NULL,
    setting_type VARCHAR(50) NOT NULL CHECK (setting_type IN ('boolean', 'integer', 'string')),
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add comments for documentation
COMMENT ON TABLE security_settings IS 'Stores system-wide security and authentication settings';
COMMENT ON COLUMN security_settings.setting_key IS 'Unique identifier for the setting';
COMMENT ON COLUMN security_settings.setting_value IS 'Current value of the setting';
COMMENT ON COLUMN security_settings.setting_type IS 'Data type of the setting value';

-- 2. Create access_logs table for tracking user activity
CREATE TABLE IF NOT EXISTS access_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    user_email TEXT,
    action VARCHAR(100) NOT NULL,
    ip_address INET,
    user_agent TEXT,
    location TEXT,
    status VARCHAR(20) NOT NULL CHECK (status IN ('success', 'failed', 'pending')),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_access_logs_user_id ON access_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_access_logs_created_at ON access_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_access_logs_status ON access_logs(status);
CREATE INDEX IF NOT EXISTS idx_access_logs_action ON access_logs(action);

-- Add comments
COMMENT ON TABLE access_logs IS 'Tracks user access and authentication attempts';

-- 3. Create security_alerts table for system notifications
CREATE TABLE IF NOT EXISTS security_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    alert_type VARCHAR(50) NOT NULL CHECK (alert_type IN ('info', 'warning', 'error', 'success')),
    message TEXT NOT NULL,
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    metadata JSONB DEFAULT '{}',
    is_resolved BOOLEAN DEFAULT FALSE,
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolved_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_security_alerts_type ON security_alerts(alert_type);
CREATE INDEX IF NOT EXISTS idx_security_alerts_severity ON security_alerts(severity);
CREATE INDEX IF NOT EXISTS idx_security_alerts_resolved ON security_alerts(is_resolved);

-- Add comments
COMMENT ON TABLE security_alerts IS 'Stores security-related system alerts and notifications';

-- 4. Insert default authentication settings
INSERT INTO security_settings (setting_key, setting_value, setting_type, description) VALUES
    ('two_factor_auth_enabled', 'true', 'boolean', 'Require 2FA for all users'),
    ('session_timeout_minutes', '30', 'integer', 'Session timeout duration in minutes'),
    ('max_login_attempts', '5', 'integer', 'Maximum failed login attempts before lockout')
ON CONFLICT (setting_key) 
DO UPDATE SET 
    setting_value = EXCLUDED.setting_value,
    updated_at = NOW();

-- 5. Create functions for managing settings
-- Function to get all security settings
CREATE OR REPLACE FUNCTION get_security_settings()
RETURNS TABLE (
    setting_key VARCHAR(100),
    setting_value TEXT,
    setting_type VARCHAR(50),
    description TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ss.setting_key,
        ss.setting_value,
        ss.setting_type,
        ss.description
    FROM security_settings ss
    ORDER BY ss.setting_key;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update a security setting
CREATE OR REPLACE FUNCTION update_security_setting(
    p_setting_key VARCHAR(100),
    p_setting_value TEXT
)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE security_settings 
    SET 
        setting_value = p_setting_value,
        updated_at = NOW()
    WHERE setting_key = p_setting_key;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to log access attempts
CREATE OR REPLACE FUNCTION log_access_attempt(
    p_action VARCHAR(100),
    p_status VARCHAR(20),
    p_user_id UUID DEFAULT NULL,
    p_user_email TEXT DEFAULT NULL,
    p_ip_address INET DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL,
    p_location TEXT DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}'
)
RETURNS UUID AS $$
DECLARE
    log_id UUID;
BEGIN
    INSERT INTO access_logs (
        user_id,
        user_email,
        action,
        ip_address,
        user_agent,
        location,
        status,
        metadata
    ) VALUES (
        p_user_id,
        p_user_email,
        p_action,
        p_ip_address,
        p_user_agent,
        p_location,
        p_status,
        p_metadata
    ) RETURNING id INTO log_id;
    
    RETURN log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get recent access logs
CREATE OR REPLACE FUNCTION get_recent_access_logs(limit_count INTEGER DEFAULT 50)
RETURNS TABLE (
    id UUID,
    user_email TEXT,
    action VARCHAR(100),
    ip_address INET,
    location TEXT,
    status VARCHAR(20),
    created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        al.id,
        al.user_email,
        al.action,
        al.ip_address,
        al.location,
        al.status,
        al.created_at
    FROM access_logs al
    ORDER BY al.created_at DESC
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get security alerts
CREATE OR REPLACE FUNCTION get_security_alerts(include_resolved BOOLEAN DEFAULT FALSE)
RETURNS TABLE (
    id UUID,
    alert_type VARCHAR(50),
    message TEXT,
    severity VARCHAR(20),
    is_resolved BOOLEAN,
    created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        sa.id,
        sa.alert_type,
        sa.message,
        sa.severity,
        sa.is_resolved,
        sa.created_at
    FROM security_alerts sa
    WHERE include_resolved OR NOT sa.is_resolved
    ORDER BY sa.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Set up Row Level Security (RLS)
-- Enable RLS on tables
ALTER TABLE security_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE access_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_alerts ENABLE ROW LEVEL SECURITY;

-- RLS policies for security_settings (only admins can read/write)
CREATE POLICY "Admins can manage security settings" ON security_settings
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'admin'
        )
    );

-- RLS policies for access_logs (admins can read all, users can read their own)
CREATE POLICY "Admins can view all access logs" ON access_logs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'admin'
        )
    );

CREATE POLICY "Users can view their own access logs" ON access_logs
    FOR SELECT USING (
        user_id = auth.uid()
    );

-- RLS policies for security_alerts (admins can manage, users can view)
CREATE POLICY "Admins can manage security alerts" ON security_alerts
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'admin'
        )
    );

CREATE POLICY "Users can view security alerts" ON security_alerts
    FOR SELECT USING (true);

-- 7. Insert sample data
-- Insert sample access logs
INSERT INTO access_logs (user_email, action, ip_address, location, status) VALUES
    ('admin@dil.com', 'Login', '192.168.1.100', 'New York, US', 'success'),
    ('teacher@dil.com', 'Course Update', '192.168.1.101', 'London, UK', 'success'),
    ('unknown@dil.com', 'Login Attempt', '203.0.113.45', 'Unknown', 'failed');

-- Insert sample security alerts
INSERT INTO security_alerts (alert_type, message, severity) VALUES
    ('warning', 'Multiple failed login attempts detected', 'medium'),
    ('info', 'System backup completed successfully', 'low');

-- 8. Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_security_settings_updated_at
    BEFORE UPDATE ON security_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
