-- Migration: Add function to force MFA reset by removing factors
-- This function will be called when a user logs in and has mfa_reset_required = true

-- Function to force MFA reset by removing all factors
CREATE OR REPLACE FUNCTION force_mfa_reset_for_user(target_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  factors_removed INTEGER := 0;
  result JSONB;
BEGIN
  -- Check if user exists and has mfa_reset_required flag
  IF NOT EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = target_user_id AND mfa_reset_required = true
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'User not found or MFA reset not required'
    );
  END IF;

  -- Remove all MFA factors for the user
  DELETE FROM auth.mfa_factors 
  WHERE user_id = target_user_id;
  
  GET DIAGNOSTICS factors_removed = ROW_COUNT;

  -- Update user metadata to clear MFA flags
  UPDATE auth.users 
  SET raw_app_meta_data = raw_app_meta_data || jsonb_build_object(
    'mfa_enabled', 'false',
    'mfa_reset_required', 'false',
    'mfa_factors_removed_by_backup_code', 'true',
    'mfa_removed_at', now()::text
  )
  WHERE id = target_user_id;

  -- Update profile to clear reset flags
  UPDATE profiles 
  SET 
    mfa_reset_required = false,
    mfa_reset_requested_at = null,
    two_factor_setup_completed_at = null
  WHERE id = target_user_id;



  result := jsonb_build_object(
    'success', true,
    'factors_removed', factors_removed,
    'message', 'MFA factors removed successfully. User will be prompted to set up MFA again if required for their role.'
  );

  RETURN result;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION force_mfa_reset_for_user(UUID) TO authenticated;

-- Add comment
COMMENT ON FUNCTION force_mfa_reset_for_user(UUID) IS 'Removes all MFA factors for a user who used a backup code and marks them for fresh MFA setup';

-- Status message
DO $$ BEGIN
  RAISE NOTICE 'Migration 090: Created force_mfa_reset_for_user function successfully';
END $$;
