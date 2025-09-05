-- Migration: Revert to Working Functions
-- Description: Reverts the get_users_with_mfa_status function back to a simpler, working version
-- Date: 2024-01-15

-- Drop the existing function
DROP FUNCTION IF EXISTS get_users_with_mfa_status(TEXT, INTEGER, INTEGER);

-- Create a simple, working version of the function (based on the original working version)
CREATE OR REPLACE FUNCTION get_users_with_mfa_status(
  search_term TEXT DEFAULT NULL,
  page_number INTEGER DEFAULT 1,
  page_size INTEGER DEFAULT 10
)
RETURNS TABLE (
  id UUID,
  email TEXT,
  first_name TEXT,
  last_name TEXT,
  role TEXT,
  mfa_enabled BOOLEAN,
  created_at TIMESTAMPTZ,
  total_count BIGINT
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  offset_val INTEGER;
  total_count_val BIGINT;
  current_user_role TEXT;
BEGIN
  -- Set offset for pagination
  offset_val := (page_number - 1) * page_size;
  
  -- Check if current user is admin (using profiles table)
  SELECT p.role INTO current_user_role 
  FROM profiles p
  WHERE p.id = auth.uid();
  
  -- Only allow admins to access this function
  IF current_user_role != 'admin' THEN
    RAISE EXCEPTION 'Access denied: Admin role required';
  END IF;
  
  -- Get total count
  SELECT COUNT(*) INTO total_count_val
  FROM profiles p
  WHERE (search_term IS NULL OR 
         p.email ILIKE '%' || search_term || '%' OR
         p.first_name ILIKE '%' || search_term || '%' OR
         p.last_name ILIKE '%' || search_term || '%');
  
  -- Return paginated results with simple MFA status check
  RETURN QUERY
  SELECT 
    p.id,
    p.email,
    p.first_name,
    p.last_name,
    p.role::TEXT,
    -- Simple MFA status check - just use profiles metadata
    COALESCE((p.metadata->>'mfa_enabled')::boolean, false) as mfa_enabled,
    p.created_at,
    total_count_val
  FROM profiles p
  WHERE (search_term IS NULL OR 
         p.email ILIKE '%' || search_term || '%' OR
         p.first_name ILIKE '%' || search_term || '%' OR
         p.last_name ILIKE '%' || search_term || '%')
  ORDER BY p.created_at DESC
  LIMIT page_size
  OFFSET offset_val;
  
  -- Set the total_count for all rows
  total_count := total_count_val;
END;
$$;

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION get_users_with_mfa_status(TEXT, INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_users_with_mfa_status(TEXT, INTEGER, INTEGER) TO service_role;

-- Also revert the access_logs function to its simpler version
DROP FUNCTION IF EXISTS get_recent_access_logs(INTEGER, INTEGER);

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

-- Add comments
COMMENT ON FUNCTION get_users_with_mfa_status(TEXT, INTEGER, INTEGER) IS 
  'Get users with MFA status for admin panel - simple version that works reliably';

COMMENT ON FUNCTION get_recent_access_logs(INTEGER, INTEGER) IS 
  'Get recent access logs for admin panel - simple version that works reliably';
