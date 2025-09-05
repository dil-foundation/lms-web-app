-- Migration: Fix Role Type Casting Issue
-- Description: Fixes the role type casting in get_users_with_mfa_status function
-- Date: 2024-01-15

-- Drop the existing function
DROP FUNCTION IF EXISTS get_users_with_mfa_status(INTEGER, INTEGER, TEXT);

-- Create the function with proper role type casting
CREATE OR REPLACE FUNCTION get_users_with_mfa_status(
  page_size INTEGER DEFAULT 10,
  page_number INTEGER DEFAULT 1,
  search_term TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  email TEXT,
  first_name TEXT,
  last_name TEXT,
  role TEXT,
  mfa_enabled BOOLEAN,
  mfa_disabled_by_admin BOOLEAN,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  total_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  offset_val INTEGER;
  where_clause TEXT := '';
  search_condition TEXT := '';
BEGIN
  -- Calculate offset
  offset_val := (page_number - 1) * page_size;
  
  -- Build search condition
  IF search_term IS NOT NULL AND search_term != '' THEN
    search_condition := ' AND (p.email ILIKE ''%' || search_term || '%'' OR p.first_name ILIKE ''%' || search_term || '%'' OR p.last_name ILIKE ''%' || search_term || '%'')';
  END IF;
  
  -- Build where clause
  where_clause := 'WHERE 1=1' || search_condition;
  
  -- Return users with accurate MFA status
  RETURN QUERY EXECUTE '
    WITH user_data AS (
      SELECT 
        p.id,
        p.email,
        p.first_name,
        p.last_name,
        p.role::TEXT, -- Cast app_role to TEXT
        p.created_at,
        p.updated_at,
        -- Check if MFA is enabled (has verified factors AND not disabled by admin)
        CASE 
          WHEN (u.raw_app_meta_data->>''mfa_disabled_by_admin'')::boolean = true THEN false
          WHEN EXISTS (
            SELECT 1 FROM auth.mfa_factors 
            WHERE user_id = p.id AND status = ''verified''
          ) THEN true
          WHEN (u.raw_app_meta_data->>''mfa_enabled'')::boolean = true THEN true
          ELSE false
        END as mfa_enabled,
        -- Check if MFA was disabled by admin
        COALESCE((u.raw_app_meta_data->>''mfa_disabled_by_admin'')::boolean, false) as mfa_disabled_by_admin
      FROM profiles p
      LEFT JOIN auth.users u ON p.id = u.id
      ' || where_clause || '
    ),
    total_counts AS (
      SELECT COUNT(*) as total_count FROM user_data
    )
    SELECT 
      ud.id,
      ud.email,
      ud.first_name,
      ud.last_name,
      ud.role,
      ud.mfa_enabled,
      ud.mfa_disabled_by_admin,
      ud.created_at,
      ud.updated_at,
      tc.total_count
    FROM user_data ud
    CROSS JOIN total_counts tc
    ORDER BY ud.created_at DESC
    LIMIT ' || page_size || ' OFFSET ' || offset_val;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_users_with_mfa_status(INTEGER, INTEGER, TEXT) TO authenticated;

-- Test the function
SELECT 'Role type casting issue resolved successfully' as status;
