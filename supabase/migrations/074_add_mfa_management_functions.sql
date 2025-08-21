-- Migration: Add MFA management functions
-- This migration adds functions to manage MFA for users

-- Drop the existing function first to allow return type change
DROP FUNCTION IF EXISTS get_users_with_mfa_status();

-- Function to get all users with their MFA status (with pagination and search)
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
      WHEN EXISTS (
        SELECT 1 FROM auth.users u 
        WHERE u.id = p.id 
        AND u.raw_app_meta_data->>'mfa_enabled' = 'true'
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

-- Function to disable MFA for a specific user
CREATE OR REPLACE FUNCTION disable_mfa_for_user(user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if the current user is an admin
  IF NOT is_admin_user(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied. Only administrators can disable MFA for users.';
  END IF;

  -- Update the user's metadata to indicate MFA is disabled
  UPDATE auth.users 
  SET raw_app_meta_data = raw_app_meta_data || '{"mfa_enabled": "false"}'::jsonb
  WHERE id = user_id;
  
  -- Also update the profiles table if needed
  UPDATE profiles 
  SET updated_at = NOW()
  WHERE id = user_id;
  
  RETURN FOUND;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_users_with_mfa_status(TEXT, INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION disable_mfa_for_user(UUID) TO authenticated;

-- Use a function to check admin status to avoid recursion
CREATE OR REPLACE FUNCTION is_admin_user(user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_role TEXT;
BEGIN
  -- Direct query without triggering RLS
  SELECT role INTO user_role 
  FROM profiles 
  WHERE id = user_id;
  
  RETURN user_role = 'admin';
END;
$$;

-- Add RLS policies (using non-recursive approach)
-- Drop existing policies if they exist to avoid conflicts
DROP POLICY IF EXISTS "Users can view their own MFA status" ON profiles;
DROP POLICY IF EXISTS "Admins can view all users" ON profiles;

CREATE POLICY "Users can view their own MFA status" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Admins can view all users" ON profiles
  FOR SELECT USING (is_admin_user(auth.uid()));
