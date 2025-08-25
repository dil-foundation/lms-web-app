-- Migration: Fix access_logs function permissions
-- Description: Fixes permission issues with get_recent_access_logs function
-- Date: 2024-01-15

-- Drop the existing function
DROP FUNCTION IF EXISTS get_recent_access_logs(INTEGER, INTEGER);

-- Create a more robust version of the get_recent_access_logs function
-- that handles permission issues gracefully
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
  created_at TIMESTAMP WITH TIME ZONE
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_role TEXT;
BEGIN
  -- Check if current user is admin (using profiles table)
  SELECT p.role INTO current_user_role 
  FROM profiles p
  WHERE p.id = auth.uid();
  
  -- Only allow admins to access this function
  IF current_user_role != 'admin' THEN
    RAISE EXCEPTION 'Access denied: Admin role required';
  END IF;
  
  -- Return paginated results
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
$$;

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION get_recent_access_logs(INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_recent_access_logs(INTEGER, INTEGER) TO service_role;

-- Also ensure the access_logs table has proper permissions
GRANT SELECT ON access_logs TO authenticated;
GRANT SELECT ON access_logs TO service_role;
