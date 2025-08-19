-- Migration: Add Pagination Support to Security Functions
-- Description: Updates existing functions to support pagination for better performance
-- Date: 2024-01-15

-- Update get_recent_access_logs function to support pagination
CREATE OR REPLACE FUNCTION get_recent_access_logs(limit_count INTEGER DEFAULT 50, offset_count INTEGER DEFAULT 0)
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
    LIMIT limit_count
    OFFSET offset_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update get_security_alerts function to support pagination
CREATE OR REPLACE FUNCTION get_security_alerts(include_resolved BOOLEAN DEFAULT FALSE, limit_count INTEGER DEFAULT 50, offset_count INTEGER DEFAULT 0)
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
    ORDER BY sa.created_at DESC
    LIMIT limit_count
    OFFSET offset_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
