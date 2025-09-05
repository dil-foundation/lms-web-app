-- Migration: Improve MFA Status Check
-- Description: Updates the get_users_with_mfa_status function to check multiple sources for MFA status
-- Date: 2024-01-15

-- Drop the existing function
DROP FUNCTION IF EXISTS get_users_with_mfa_status(TEXT, INTEGER, INTEGER);

-- Create an improved version that checks multiple sources for MFA status
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
  
  -- Return paginated results with improved MFA status check
  RETURN QUERY
  SELECT 
    p.id,
    p.email,
    p.first_name,
    p.last_name,
    p.role::TEXT,
    -- Check multiple sources for MFA status:
    -- 1. First check if user has verified MFA factors (most reliable)
    -- 2. Then check profiles.metadata
    -- 3. Finally check auth.users metadata
    COALESCE(
      -- Check if user has verified TOTP factors
      (SELECT COUNT(*) > 0 
       FROM auth.mfa_factors mf 
       WHERE mf.user_id = p.id 
       AND mf.status = 'verified' 
       AND mf.factor_type = 'totp'),
      -- Check profiles metadata
      (p.metadata->>'mfa_enabled')::boolean,
      -- Check auth.users metadata (if accessible)
      (SELECT (u.raw_app_meta_data->>'mfa_enabled')::boolean 
       FROM auth.users u 
       WHERE u.id = p.id),
      -- Default to false
      false
    ) as mfa_enabled,
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

-- Create a function to sync MFA status for all users
CREATE OR REPLACE FUNCTION sync_all_mfa_status()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  sync_count INTEGER := 0;
  user_record RECORD;
BEGIN
  -- Loop through all users and sync their MFA status
  FOR user_record IN 
    SELECT p.id, p.email
    FROM profiles p
  LOOP
    -- Check if user has verified MFA factors
    IF EXISTS (
      SELECT 1 FROM auth.mfa_factors mf 
      WHERE mf.user_id = user_record.id 
      AND mf.status = 'verified' 
      AND mf.factor_type = 'totp'
    ) THEN
      -- User has MFA enabled, sync to all locations
      UPDATE auth.users 
      SET raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb) || '{"mfa_enabled": "true"}'::jsonb
      WHERE id = user_record.id
      AND (raw_app_meta_data->>'mfa_enabled' IS NULL OR raw_app_meta_data->>'mfa_enabled' != 'true');
      
      UPDATE profiles 
      SET metadata = COALESCE(metadata, '{}'::jsonb) || '{"mfa_enabled": true}'::jsonb
      WHERE id = user_record.id
      AND (metadata->>'mfa_enabled' IS NULL OR metadata->>'mfa_enabled' != 'true');
      
      sync_count := sync_count + 1;
    ELSE
      -- User doesn't have MFA enabled, ensure it's marked as disabled
      UPDATE auth.users 
      SET raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb) || '{"mfa_enabled": "false"}'::jsonb
      WHERE id = user_record.id
      AND (raw_app_meta_data->>'mfa_enabled' IS NULL OR raw_app_meta_data->>'mfa_enabled' = 'true');
      
      UPDATE profiles 
      SET metadata = COALESCE(metadata, '{}'::jsonb) || '{"mfa_enabled": false}'::jsonb
      WHERE id = user_record.id
      AND (metadata->>'mfa_enabled' IS NULL OR metadata->>'mfa_enabled' = 'true');
    END IF;
  END LOOP;
  
  RETURN sync_count;
END;
$$;

-- Grant execute permission on the sync function
GRANT EXECUTE ON FUNCTION sync_all_mfa_status() TO authenticated;
GRANT EXECUTE ON FUNCTION sync_all_mfa_status() TO service_role;

-- Add comments
COMMENT ON FUNCTION get_users_with_mfa_status(TEXT, INTEGER, INTEGER) IS 
  'Get users with MFA status for admin panel - checks multiple sources for accurate MFA status';

COMMENT ON FUNCTION sync_all_mfa_status() IS 
  'Sync MFA status for all users by checking verified factors and updating metadata';
