-- Migration: Fix MFA Disable to Actually Remove Factors
-- Description: Updates the admin_disable_mfa_for_user function to completely remove MFA factors
-- Date: 2024-01-15

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS admin_disable_mfa_for_user(UUID);

-- Create function to completely disable MFA for a user (admin only)
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
  factors_removed INTEGER := 0;
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
  
  -- COMPLETELY REMOVE ALL MFA FACTORS from auth.mfa_factors table
  DELETE FROM auth.mfa_factors 
  WHERE user_id = target_user_id;
  
  GET DIAGNOSTICS factors_removed = ROW_COUNT;
  
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
  
  -- Also update the profiles table metadata and clear MFA-related fields
  UPDATE profiles 
  SET 
    metadata = COALESCE(metadata, '{}'::jsonb) || 
      jsonb_build_object(
        'mfa_enabled', false,
        'mfa_disabled_by_admin', true,
        'mfa_disabled_at', now()::text
      ),
    two_factor_setup_completed_at = NULL,
    mfa_reset_required = false,
    mfa_reset_requested_at = NULL,
    two_factor_backup_codes = NULL,
    updated_at = NOW()
  WHERE id = target_user_id;
  
  -- Log the action
  INSERT INTO access_logs (user_id, user_email, action, ip_address, user_agent, status, metadata)
  VALUES (
    admin_user_id,
    admin_user_email,
    'Admin Disabled MFA for User',
    NULL,
    'admin_dashboard_edge_function',
    'success',
    jsonb_build_object(
      'target_user_id', target_user_id,
      'target_user_email', target_user_email,
      'admin_user_id', admin_user_id,
      'admin_user_email', admin_user_email,
      'factors_removed', factors_removed,
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
    'factors_removed', factors_removed,
    'note', 'User will now be prompted to set up MFA again if required for their role'
  );
  
  RETURN result;
  
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error
    INSERT INTO access_logs (user_id, user_email, action, ip_address, user_agent, status, metadata)
    VALUES (
      admin_user_id,
      admin_user_email,
      'Admin MFA Disable Failed',
      NULL,
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
GRANT EXECUTE ON FUNCTION admin_disable_mfa_for_user(UUID) TO service_role;

-- Add comment
COMMENT ON FUNCTION admin_disable_mfa_for_user(UUID) IS 
  'Completely disables MFA for a user by removing all factors and updating metadata';
