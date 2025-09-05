-- Migration: Fix Remove MFA Logic
-- Description: Updates admin_disable_mfa_for_user function to remove MFA factors but still respect role-based requirements
-- Date: 2024-01-15

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS admin_disable_mfa_for_user(UUID);

-- Create function to remove MFA for a user (admin only) - REMOVE FACTORS BUT KEEP ROLE REQUIREMENTS
CREATE OR REPLACE FUNCTION admin_disable_mfa_for_user(target_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  admin_user_id UUID;
  admin_role TEXT;
  target_user_email TEXT;
  admin_user_email TEXT;
  result JSONB;
  factor_count INTEGER;
BEGIN
  -- Get the current user (admin)
  admin_user_id := auth.uid();
  
  -- Check if current user is an admin
  SELECT role INTO admin_role 
  FROM profiles 
  WHERE id = admin_user_id;
  
  IF admin_role != 'admin' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Access denied. Only administrators can remove MFA for users.'
    );
  END IF;
  
  -- Get user emails for logging
  SELECT email INTO target_user_email FROM profiles WHERE id = target_user_id;
  SELECT email INTO admin_user_email FROM profiles WHERE id = admin_user_id;
  
  -- Count existing MFA factors before removal
  SELECT COUNT(*) INTO factor_count 
  FROM auth.mfa_factors 
  WHERE user_id = target_user_id AND status = 'verified';
  
  -- COMPLETELY REMOVE MFA FACTORS from auth.mfa_factors table
  DELETE FROM auth.mfa_factors 
  WHERE user_id = target_user_id;
  
  -- Update the target user's metadata to indicate MFA factors were removed by admin
  -- BUT DON'T set mfa_disabled_by_admin to true - this allows role-based requirements to still apply
  UPDATE auth.users 
  SET raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb) || 
      jsonb_build_object(
        'mfa_enabled', 'false',
        'mfa_factors_removed_by_admin', 'true',
        'mfa_removed_at', now()::text,
        'mfa_factors_removed', 'true'
      )
  WHERE id = target_user_id;
  
  -- Also update the profiles table timestamp
  UPDATE profiles 
  SET updated_at = NOW()
  WHERE id = target_user_id;
  
  -- Log the action (using NULL for ip_address since it's not a real IP)
  INSERT INTO access_logs (user_id, user_email, action, ip_address, user_agent, status, metadata)
  VALUES (
    admin_user_id,
    admin_user_email,
    'admin_remove_mfa_for_user',
    NULL, -- Use NULL instead of 'admin_dashboard' for ip_address
    'admin_dashboard_edge_function',
    'success',
    jsonb_build_object(
      'target_user_id', target_user_id,
      'target_user_email', target_user_email,
      'admin_user_id', admin_user_id,
      'admin_user_email', admin_user_email,
      'factors_removed', factor_count,
      'timestamp', now()::text
    )
  );
  
  -- Return success response
  result := jsonb_build_object(
    'success', true,
    'message', 'MFA factors removed successfully',
    'target_user_id', target_user_id,
    'target_user_email', target_user_email,
    'admin_user_id', admin_user_id,
    'admin_user_email', admin_user_email,
    'factors_removed', factor_count,
    'note', 'User will be prompted to set up MFA again if required for their role'
  );
  
  RETURN result;
  
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error (using NULL for ip_address since it's not a real IP)
    INSERT INTO access_logs (user_id, user_email, action, ip_address, user_agent, status, metadata)
    VALUES (
      admin_user_id,
      admin_user_email,
      'admin_remove_mfa_error',
      NULL, -- Use NULL instead of 'admin_dashboard' for ip_address
      'admin_dashboard_edge_function',
      'failed',
      jsonb_build_object(
        'target_user_id', target_user_id,
        'error', SQLERRM,
        'timestamp', now()::text
      )
    );
    
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Failed to remove MFA',
      'details', SQLERRM
    );
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION admin_disable_mfa_for_user(UUID) TO authenticated;

-- Update the check_mfa_requirement function to respect role requirements even after admin removal
DROP FUNCTION IF EXISTS check_mfa_requirement(TEXT);

CREATE OR REPLACE FUNCTION check_mfa_requirement(user_role TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  setting_key_var TEXT;
  setting_value_var TEXT;
  mfa_required BOOLEAN := FALSE;
  user_id_var UUID;
  mfa_factors_removed_by_admin BOOLEAN := FALSE;
BEGIN
  -- Get current user ID
  user_id_var := auth.uid();
  
  -- Check if MFA factors were removed by admin (but don't bypass role requirements)
  SELECT (raw_app_meta_data->>'mfa_factors_removed_by_admin')::boolean INTO mfa_factors_removed_by_admin
  FROM auth.users 
  WHERE id = user_id_var;
  
  -- Construct the setting key based on role
  setting_key_var := 'two_factor_auth_enabled_' || user_role || 's';
  
  -- Get the setting value from security_settings
  SELECT setting_value INTO setting_value_var
  FROM security_settings
  WHERE setting_key = setting_key_var;
  
  -- Check if MFA is required for this role (regardless of admin removal)
  IF setting_value_var = 'true' THEN
    mfa_required := TRUE;
  END IF;
  
  RETURN mfa_required;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION check_mfa_requirement(TEXT) TO authenticated;

-- Update the get_users_with_mfa_status function to reflect the new logic
DROP FUNCTION IF EXISTS get_users_with_mfa_status(INTEGER, INTEGER, TEXT);

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
  mfa_factors_removed_by_admin BOOLEAN,
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
        -- Check if MFA is enabled (has verified factors)
        CASE 
          WHEN EXISTS (
            SELECT 1 FROM auth.mfa_factors 
            WHERE user_id = p.id AND status = ''verified''
          ) THEN true
          WHEN (u.raw_app_meta_data->>''mfa_enabled'')::boolean = true THEN true
          ELSE false
        END as mfa_enabled,
        -- Check if MFA factors were removed by admin
        COALESCE((u.raw_app_meta_data->>''mfa_factors_removed_by_admin'')::boolean, false) as mfa_factors_removed_by_admin
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
      ud.mfa_factors_removed_by_admin,
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

-- Test the functions
SELECT 'Remove MFA logic updated successfully' as status;
