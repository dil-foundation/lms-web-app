-- Fix RLS recursion issue for 2FA implementation
-- Run this script in your Supabase SQL editor to fix the infinite recursion error

-- Drop existing RLS policies that cause recursion
DROP POLICY IF EXISTS "Users can read own 2FA status" ON profiles;
DROP POLICY IF EXISTS "Users can update own 2FA status" ON profiles;
DROP POLICY IF EXISTS "Admins can read all 2FA statuses" ON profiles;
DROP POLICY IF EXISTS "Admins can update any 2FA status" ON profiles;
DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can read all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can update any profile" ON profiles;

-- Drop the function if it exists
DROP FUNCTION IF EXISTS is_admin_user(UUID);

-- Create a function to check if user is admin (avoids recursion)
CREATE OR REPLACE FUNCTION is_admin_user(user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  user_role TEXT;
BEGIN
  -- Use a direct query without RLS to avoid recursion
  SELECT role INTO user_role 
  FROM profiles 
  WHERE id = user_id;
  
  RETURN user_role = 'admin';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION is_admin_user(UUID) TO authenticated;

-- Create new RLS policies that avoid recursion
-- Policy: Users can read their own profile
CREATE POLICY "Users can read own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

-- Policy: Users can update their own profile
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Policy: Admins can read all profiles (using function to avoid recursion)
CREATE POLICY "Admins can read all profiles" ON profiles
  FOR SELECT USING (is_admin_user(auth.uid()));

-- Policy: Admins can update any profile (using function to avoid recursion)
CREATE POLICY "Admins can update any profile" ON profiles
  FOR UPDATE USING (is_admin_user(auth.uid()));

-- Policy: Allow insert for authenticated users (for new user registration)
CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Add 2FA fields if they don't exist
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS two_factor_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS two_factor_secret TEXT,
ADD COLUMN IF NOT EXISTS two_factor_backup_codes TEXT[],
ADD COLUMN IF NOT EXISTS two_factor_setup_completed_at TIMESTAMP WITH TIME ZONE;

-- Create index for faster queries on 2FA status
CREATE INDEX IF NOT EXISTS idx_profiles_two_factor_enabled ON profiles(two_factor_enabled);

-- Create function to get users without 2FA setup
CREATE OR REPLACE FUNCTION get_users_without_2fa()
RETURNS TABLE (
  id UUID,
  email TEXT,
  first_name TEXT,
  last_name TEXT,
  role TEXT,
  created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.email,
    p.first_name,
    p.last_name,
    p.role,
    p.created_at
  FROM profiles p
  WHERE p.two_factor_enabled IS NULL 
     OR p.two_factor_enabled = FALSE
  ORDER BY p.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to update user 2FA status
CREATE OR REPLACE FUNCTION update_user_2fa_status(
  p_user_id UUID,
  p_enabled BOOLEAN,
  p_secret TEXT DEFAULT NULL,
  p_backup_codes TEXT[] DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE profiles 
  SET 
    two_factor_enabled = p_enabled,
    two_factor_secret = CASE WHEN p_enabled THEN p_secret ELSE NULL END,
    two_factor_backup_codes = CASE WHEN p_enabled THEN p_backup_codes ELSE NULL END,
    two_factor_setup_completed_at = CASE WHEN p_enabled THEN NOW() ELSE NULL END,
    updated_at = NOW()
  WHERE id = p_user_id;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to get 2FA statistics
CREATE OR REPLACE FUNCTION get_2fa_statistics()
RETURNS TABLE (
  total_users INTEGER,
  users_with_2fa INTEGER,
  users_without_2fa INTEGER,
  two_fa_percentage NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  WITH stats AS (
    SELECT 
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE two_factor_enabled = TRUE) as with_2fa,
      COUNT(*) FILTER (WHERE two_factor_enabled IS NULL OR two_factor_enabled = FALSE) as without_2fa
    FROM profiles
  )
  SELECT 
    total::INTEGER,
    with_2fa::INTEGER,
    without_2fa::INTEGER,
    CASE 
      WHEN total > 0 THEN ROUND((with_2fa::NUMERIC / total::NUMERIC) * 100, 2)
      ELSE 0
    END as percentage
  FROM stats;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions to authenticated users
GRANT EXECUTE ON FUNCTION get_users_without_2fa() TO authenticated;
GRANT EXECUTE ON FUNCTION update_user_2fa_status(UUID, BOOLEAN, TEXT, TEXT[]) TO authenticated;
GRANT EXECUTE ON FUNCTION get_2fa_statistics() TO authenticated;

-- Verify the fix
SELECT 'RLS recursion fix completed successfully' as status;
