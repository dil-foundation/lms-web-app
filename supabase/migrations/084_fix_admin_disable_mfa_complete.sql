-- Migration: Fix Admin Disable MFA to Completely Remove MFA
-- Description: Updates admin_disable_mfa_for_user function to properly remove MFA factors
-- Date: 2024-01-15

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS admin_disable_mfa_for_user(UUID);

-- Create function to disable MFA for a user (admin only) - COMPLETE REMOVAL
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
      'error', 'Access denied. Only administrators can disable MFA for users.'
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
  
  -- Update the target user's metadata to indicate MFA is completely disabled
  UPDATE auth.users 
  SET raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb) || 
      jsonb_build_object(
        'mfa_enabled', 'false',
        'mfa_disabled_by_admin', 'true',
        'mfa_disabled_at', now()::text,
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
    'admin_disable_mfa_for_user',
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
    'message', 'MFA completely disabled and factors removed',
    'target_user_id', target_user_id,
    'target_user_email', target_user_email,
    'admin_user_id', admin_user_id,
    'admin_user_email', admin_user_email,
    'factors_removed', factor_count,
    'note', 'User can now set up MFA again if needed'
  );
  
  RETURN result;
  
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error (using NULL for ip_address since it's not a real IP)
    INSERT INTO access_logs (user_id, user_email, action, ip_address, user_agent, status, metadata)
    VALUES (
      admin_user_id,
      admin_user_email,
      'admin_disable_mfa_error',
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
      'error', 'Failed to disable MFA',
      'details', SQLERRM
    );
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION admin_disable_mfa_for_user(UUID) TO authenticated;

-- Update the check_mfa_requirement function to respect admin-disabled MFA
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
  mfa_disabled_by_admin BOOLEAN := FALSE;
BEGIN
  -- Get current user ID
  user_id_var := auth.uid();
  
  -- Check if MFA was disabled by admin for this user
  SELECT (raw_app_meta_data->>'mfa_disabled_by_admin')::boolean INTO mfa_disabled_by_admin
  FROM auth.users 
  WHERE id = user_id_var;
  
  -- If MFA was disabled by admin, don't require MFA
  IF mfa_disabled_by_admin = true THEN
    RETURN FALSE;
  END IF;
  
  -- Construct the setting key based on role
  setting_key_var := 'two_factor_auth_enabled_' || user_role || 's';
  
  -- Get the setting value from security_settings
  SELECT setting_value INTO setting_value_var
  FROM security_settings
  WHERE setting_key = setting_key_var;
  
  -- Check if MFA is required for this role
  IF setting_value_var = 'true' THEN
    mfa_required := TRUE;
  END IF;
  
  RETURN mfa_required;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION check_mfa_requirement(TEXT) TO authenticated;

-- Test the functions
SELECT 'Admin disable MFA function updated successfully' as status;
