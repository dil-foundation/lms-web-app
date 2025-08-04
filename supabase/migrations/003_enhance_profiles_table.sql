-- Enhance profiles table with additional fields for Profile Settings
-- Add new columns to the profiles table

ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS phone_number VARCHAR(20),
ADD COLUMN IF NOT EXISTS timezone VARCHAR(50),
ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Add comments for documentation
COMMENT ON COLUMN profiles.phone_number IS 'User phone number for contact and recovery';
COMMENT ON COLUMN profiles.timezone IS 'User timezone for scheduling and notifications';
COMMENT ON COLUMN profiles.avatar_url IS 'URL to user profile picture';

-- Create index for phone number lookups (if needed for future features)
CREATE INDEX IF NOT EXISTS idx_profiles_phone_number ON profiles(phone_number);

-- Update existing profiles with default timezone if not set
UPDATE profiles 
SET timezone = 'UTC' 
WHERE timezone IS NULL;

-- Add constraint to ensure phone number format (optional)
-- ALTER TABLE profiles ADD CONSTRAINT check_phone_format CHECK (phone_number ~ '^\+?[1-9]\d{1,14}$'); 