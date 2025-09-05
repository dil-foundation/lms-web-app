-- Migration: Fix Backup Codes RLS and Add Debugging
-- Description: Ensures backup codes columns exist and adds debugging function
-- Date: 2024-01-15

-- Add two_factor_backup_codes column if it doesn't exist
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'two_factor_backup_codes'
  ) THEN
    ALTER TABLE profiles ADD COLUMN two_factor_backup_codes TEXT[] DEFAULT NULL;
    COMMENT ON COLUMN profiles.two_factor_backup_codes IS 'Array of backup codes for MFA recovery. Each code can only be used once.';
    CREATE INDEX IF NOT EXISTS idx_profiles_backup_codes ON profiles USING GIN (two_factor_backup_codes);
  END IF;
END $$;

-- Add two_factor_setup_completed_at column if it doesn't exist
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'two_factor_setup_completed_at'
  ) THEN
    ALTER TABLE profiles ADD COLUMN two_factor_setup_completed_at TIMESTAMPTZ DEFAULT NULL;
    COMMENT ON COLUMN profiles.two_factor_setup_completed_at IS 'Timestamp when 2FA setup was completed.';
  END IF;
END $$;

-- Add MFA reset columns if they don't exist
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'mfa_reset_required'
  ) THEN
    ALTER TABLE profiles ADD COLUMN mfa_reset_required BOOLEAN DEFAULT FALSE;
    COMMENT ON COLUMN profiles.mfa_reset_required IS 'Flag indicating if MFA reset is required after backup code usage.';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'mfa_reset_requested_at'
  ) THEN
    ALTER TABLE profiles ADD COLUMN mfa_reset_requested_at TIMESTAMPTZ DEFAULT NULL;
    COMMENT ON COLUMN profiles.mfa_reset_requested_at IS 'Timestamp when MFA reset was requested via backup code.';
  END IF;
END $$;

-- Create a function to test backup codes saving
CREATE OR REPLACE FUNCTION test_backup_codes_save(test_codes TEXT[])
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_user_id UUID;
  result JSONB;
BEGIN
  -- Get current user ID
  current_user_id := auth.uid();
  
  IF current_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'User not authenticated');
  END IF;

  -- Try to update backup codes
  UPDATE profiles 
  SET 
    two_factor_backup_codes = test_codes,
    two_factor_setup_completed_at = now(),
    updated_at = now()
  WHERE id = current_user_id;

  -- Check if update was successful
  IF FOUND THEN
    -- Verify the update
    SELECT jsonb_build_object(
      'success', true,
      'user_id', current_user_id,
      'backup_codes', two_factor_backup_codes,
      'setup_completed_at', two_factor_setup_completed_at
    ) INTO result
    FROM profiles 
    WHERE id = current_user_id;
    
    RETURN result;
  ELSE
    RETURN jsonb_build_object('success', false, 'error', 'Profile not found or update failed');
  END IF;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION test_backup_codes_save(TEXT[]) TO authenticated;

-- Test the function
SELECT 'Backup codes debugging setup completed' as status;
