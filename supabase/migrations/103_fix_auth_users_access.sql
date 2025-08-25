-- Migration: Fix auth.users table access for admin functions
-- Description: Grants proper permissions to access auth.users table for admin functions
-- Date: 2024-01-15

-- Grant necessary permissions to the function owner
-- This allows the function to access auth.users table
GRANT USAGE ON SCHEMA auth TO postgres;
GRANT SELECT ON ALL TABLES IN SCHEMA auth TO postgres;

-- Also grant permissions to the service_role (which Supabase uses)
GRANT USAGE ON SCHEMA auth TO service_role;
GRANT SELECT ON ALL TABLES IN SCHEMA auth TO service_role;

-- Create a more robust version of the get_users_with_mfa_status function
-- that handles permission issues gracefully
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
  
  -- Return paginated results
  RETURN QUERY
  SELECT 
    p.id,
    p.email,
    p.first_name,
    p.last_name,
    p.role::TEXT,
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
