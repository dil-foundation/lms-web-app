-- Migration: Update profiles table documentation after 2FA removal from profile settings
-- Description: 2FA management was removed from the profile settings UI, but the 2FA columns 
--              remain in the database for core authentication functionality. This migration 
--              updates documentation to reflect the current state and ensures all required columns exist.

-- Ensure phone_number column exists (should already exist from migration 003)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone_number VARCHAR(20);

-- Ensure avatar_url column exists (should already exist from migration 003)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Add notification settings columns for user preferences
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS notification_preferences JSONB DEFAULT '{"push": false, "inApp": true}'::jsonb,
ADD COLUMN IF NOT EXISTS theme_preference VARCHAR(10) DEFAULT 'auto';

-- Remove timezone column since it was removed from profile settings UI
-- (This is safe since timezone is no longer used in the frontend)
ALTER TABLE profiles DROP COLUMN IF EXISTS timezone;

-- Add comments to document the current state
COMMENT ON TABLE profiles IS 'Profiles table with 2FA columns preserved for core authentication system';

-- Add helpful comments for profile settings columns
COMMENT ON COLUMN profiles.first_name IS 'User first name - editable in profile settings';
COMMENT ON COLUMN profiles.last_name IS 'User last name - editable in profile settings';
COMMENT ON COLUMN profiles.phone_number IS 'User phone number - editable in profile settings';
COMMENT ON COLUMN profiles.avatar_url IS 'URL to user profile picture - managed in profile settings';
COMMENT ON COLUMN profiles.notification_preferences IS 'User notification preferences - managed in profile settings';
COMMENT ON COLUMN profiles.theme_preference IS 'User theme preference (light/dark/auto) - managed in profile settings';

-- Add comments for 2FA columns (preserved for core authentication)
COMMENT ON COLUMN profiles.two_factor_backup_codes IS 'Array of backup codes for MFA recovery - managed by core authentication system';
COMMENT ON COLUMN profiles.two_factor_setup_completed_at IS 'Timestamp when 2FA setup was completed - managed by core authentication system';
COMMENT ON COLUMN profiles.mfa_reset_required IS 'Flag indicating if MFA reset is required - managed by core authentication system';
COMMENT ON COLUMN profiles.mfa_reset_requested_at IS 'Timestamp when MFA reset was requested - managed by core authentication system';

-- Create index for phone number lookups (if not already exists)
CREATE INDEX IF NOT EXISTS idx_profiles_phone_number ON profiles(phone_number);

-- Log the migration completion
DO $$
BEGIN
    RAISE NOTICE 'Migration 131 completed: Updated profiles table documentation';
    RAISE NOTICE '2FA columns preserved for core authentication system';
    RAISE NOTICE '2FA management removed from profile settings UI';
    RAISE NOTICE 'Added notification_preferences and theme_preference columns';
    RAISE NOTICE 'Removed timezone column (no longer used in profile settings)';
END $$;
