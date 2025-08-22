-- Script: Add sample backup codes for existing MFA users
-- Description: Adds backup codes for users who have MFA enabled but no backup codes
-- Date: 2024-01-15

-- Function to generate backup codes
CREATE OR REPLACE FUNCTION generate_backup_codes(count_codes INTEGER DEFAULT 5)
RETURNS TEXT[]
LANGUAGE plpgsql
AS $$
DECLARE
  codes TEXT[] := '{}';
  i INTEGER;
  new_code TEXT;
BEGIN
  FOR i IN 1..count_codes LOOP
    -- Generate 8-digit backup codes
    new_code := LPAD(FLOOR(RANDOM() * 100000000)::TEXT, 8, '0');
    
    -- Ensure uniqueness within the array
    WHILE new_code = ANY(codes) LOOP
      new_code := LPAD(FLOOR(RANDOM() * 100000000)::TEXT, 8, '0');
    END LOOP;
    
    codes := array_append(codes, new_code);
  END LOOP;
  
  RETURN codes;
END;
$$;

-- Add backup codes for users who have MFA enabled but no backup codes
UPDATE profiles 
SET two_factor_backup_codes = generate_backup_codes(5)
WHERE id IN (
  SELECT p.id 
  FROM profiles p
  JOIN auth.users u ON p.id = u.id
  WHERE (u.raw_app_meta_data->>'mfa_enabled')::boolean = true
    AND (p.two_factor_backup_codes IS NULL OR array_length(p.two_factor_backup_codes, 1) IS NULL)
);

-- Show how many users were updated
SELECT 
  COUNT(*) as users_updated,
  'Users with MFA enabled who now have backup codes' as description
FROM profiles 
WHERE two_factor_backup_codes IS NOT NULL 
  AND array_length(two_factor_backup_codes, 1) > 0;

-- Show sample of users with backup codes
SELECT 
  email,
  role,
  array_length(two_factor_backup_codes, 1) as backup_codes_count,
  two_factor_backup_codes[1:3] as sample_codes
FROM profiles 
WHERE two_factor_backup_codes IS NOT NULL 
  AND array_length(two_factor_backup_codes, 1) > 0
LIMIT 5;

-- Clean up the temporary function
DROP FUNCTION IF EXISTS generate_backup_codes(INTEGER);
