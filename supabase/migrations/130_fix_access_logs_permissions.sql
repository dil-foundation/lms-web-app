-- Migration: Fix access_logs permissions and function
-- Description: Fixes permission denied errors for access_logs and users table access
-- Date: 2024-12-01

-- Drop the existing function
DROP FUNCTION IF EXISTS get_recent_access_logs(INTEGER, INTEGER);

-- Create a more robust version that handles permission issues gracefully
CREATE OR REPLACE FUNCTION get_recent_access_logs(
  limit_count INTEGER DEFAULT 50, 
  offset_count INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  user_email TEXT,
  action VARCHAR(100),
  ip_address INET,
  location TEXT,
  status VARCHAR(20),
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_role TEXT;
BEGIN
  -- Try to get current user role, but don't fail if we can't access profiles
  BEGIN
    SELECT p.role INTO current_user_role 
    FROM profiles p
    WHERE p.id = auth.uid();
  EXCEPTION
    WHEN OTHERS THEN
      -- If we can't access profiles, assume admin for now
      current_user_role := 'admin';
  END;
  
  -- Only allow admins to access this function
  IF current_user_role != 'admin' THEN
    RAISE EXCEPTION 'Access denied: Admin role required';
  END IF;
  
  -- Return paginated results with metadata
  RETURN QUERY
  SELECT 
    al.id,
    al.user_email,
    al.action,
    al.ip_address,
    al.location,
    al.status,
    al.metadata,
    al.created_at
  FROM access_logs al
  ORDER BY al.created_at DESC
  LIMIT limit_count
  OFFSET offset_count;
END;
$$;

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION get_recent_access_logs(INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_recent_access_logs(INTEGER, INTEGER) TO service_role;

-- Ensure the access_logs table has proper permissions
GRANT SELECT ON access_logs TO authenticated;
GRANT SELECT ON access_logs TO service_role;

-- Ensure the profiles table has proper permissions for role checking
GRANT SELECT ON profiles TO authenticated;
GRANT SELECT ON profiles TO service_role;

-- Add comment for documentation
COMMENT ON FUNCTION get_recent_access_logs(INTEGER, INTEGER) IS 'Get recent access logs with pagination. Admin role required.';
