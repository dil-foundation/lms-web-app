-- Script: Create Admin Disable MFA Database Function
-- Description: Creates a database function that can disable MFA for users
-- Date: 2024-01-15

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS admin_disable_mfa_for_user(UUID);

-- Create function to disable MFA for a user (admin only)
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
  
  -- Update the target user's metadata to indicate MFA is disabled
  UPDATE auth.users 
  SET raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb) || 
      jsonb_build_object(
        'mfa_enabled', 'false',
        'mfa_disabled_by_admin', 'true',
        'mfa_disabled_at', now()::text
      )
  WHERE id = target_user_id;
  
  -- Also update the profiles table timestamp
  UPDATE profiles 
  SET updated_at = NOW()
  WHERE id = target_user_id;
  
  -- Log the action
  INSERT INTO access_logs (user_id, action, details, ip_address, user_agent)
  VALUES (
    admin_user_id,
    'admin_disable_mfa_for_user',
    jsonb_build_object(
      'target_user_id', target_user_id,
      'target_user_email', target_user_email,
      'admin_user_id', admin_user_id,
      'admin_user_email', admin_user_email,
      'timestamp', now()::text
    ),
    'admin_dashboard',
    'edge_function'
  );
  
  -- Return success response
  result := jsonb_build_object(
    'success', true,
    'message', 'MFA disabled successfully',
    'target_user_id', target_user_id,
    'target_user_email', target_user_email,
    'admin_user_id', admin_user_id,
    'admin_user_email', admin_user_email,
    'note', 'MFA factors will be removed on next user login or can be removed manually'
  );
  
  RETURN result;
  
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error
    INSERT INTO access_logs (user_id, action, details, ip_address, user_agent)
    VALUES (
      admin_user_id,
      'admin_disable_mfa_error',
      jsonb_build_object(
        'target_user_id', target_user_id,
        'error', SQLERRM,
        'timestamp', now()::text
      ),
      'admin_dashboard',
      'edge_function'
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

-- Test the function
SELECT 'Admin disable MFA function created successfully' as status;
