-- Script: Fix MFA Status Function
-- Description: Fixes the get_users_with_mfa_status function to properly detect MFA status
-- Date: 2024-01-15

-- Drop the existing function
DROP FUNCTION IF EXISTS get_users_with_mfa_status(TEXT, INTEGER, INTEGER);

-- Create improved function to get all users with their MFA status
CREATE FUNCTION get_users_with_mfa_status(
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
AS $$
DECLARE
  offset_val INTEGER;
  total_count_val BIGINT;
BEGIN
  -- Check if the current user is an admin
  IF NOT is_admin_user(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied. Only administrators can view all users.';
  END IF;

  -- Calculate offset
  offset_val := (page_number - 1) * page_size;

  -- Get total count for pagination
  SELECT COUNT(*) INTO total_count_val
  FROM profiles p
  WHERE (
    search_term IS NULL 
    OR search_term = ''
    OR LOWER(p.first_name) LIKE '%' || LOWER(search_term) || '%'
    OR LOWER(p.last_name) LIKE '%' || LOWER(search_term) || '%'
    OR LOWER(p.email) LIKE '%' || LOWER(search_term) || '%'
    OR LOWER(p.first_name || ' ' || p.last_name) LIKE '%' || LOWER(search_term) || '%'
  );

  RETURN QUERY
  SELECT 
    p.id,
    p.email,
    p.first_name,
    p.last_name,
    p.role::TEXT,
    CASE 
      -- Check if user has MFA enabled in metadata
      WHEN EXISTS (
        SELECT 1 FROM auth.users u 
        WHERE u.id = p.id 
        AND (
          u.raw_app_meta_data->>'mfa_enabled' = 'true'
          OR u.raw_user_meta_data->>'mfa_enabled' = 'true'
        )
      ) THEN true
      -- Also check if user has verified MFA factors (backup check)
      WHEN EXISTS (
        SELECT 1 FROM auth.mfa_factors mf
        WHERE mf.user_id = p.id 
        AND mf.status = 'verified'
        AND mf.factor_type = 'totp'
      ) THEN true
      ELSE false
    END as mfa_enabled,
    p.created_at,
    total_count_val
  FROM profiles p
  WHERE (
    search_term IS NULL 
    OR search_term = ''
    OR LOWER(p.first_name) LIKE '%' || LOWER(search_term) || '%'
    OR LOWER(p.last_name) LIKE '%' || LOWER(search_term) || '%'
    OR LOWER(p.email) LIKE '%' || LOWER(search_term) || '%'
    OR LOWER(p.first_name || ' ' || p.last_name) LIKE '%' || LOWER(search_term) || '%'
  )
  ORDER BY p.created_at DESC
  LIMIT page_size
  OFFSET offset_val;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_users_with_mfa_status(TEXT, INTEGER, INTEGER) TO authenticated;

-- Test the function
SELECT 'MFA status function updated successfully' as status;
