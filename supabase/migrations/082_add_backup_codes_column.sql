-- Migration: Add two_factor_backup_codes column to profiles table
-- Description: Adds the missing column for storing backup codes for MFA
-- Date: 2024-01-15

-- Add the two_factor_backup_codes column to the profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS two_factor_backup_codes TEXT[] DEFAULT NULL;

-- Add a comment to document the column
COMMENT ON COLUMN profiles.two_factor_backup_codes IS 'Array of backup codes for MFA recovery. Each code can only be used once.';

-- Create an index for better performance when querying backup codes
CREATE INDEX IF NOT EXISTS idx_profiles_backup_codes 
ON profiles USING GIN (two_factor_backup_codes);

-- Verify the column was added
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'profiles' 
AND column_name = 'two_factor_backup_codes';

-- Test the migration
SELECT 'Backup codes column added successfully' as status;
