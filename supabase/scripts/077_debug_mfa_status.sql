-- Script: Debug MFA Status for Specific User
-- Description: Debug and fix MFA status for arunvaradharajalu@gmail.com
-- Date: 2024-01-15

-- First, let's check what's currently stored for this user
SELECT 
  'Current MFA Status Check' as check_type,
  p.id,
  p.email,
  p.first_name,
  p.last_name,
  -- Check auth.users metadata
  u.raw_app_meta_data->>'mfa_enabled' as app_meta_mfa,
  u.raw_user_meta_data->>'mfa_enabled' as user_meta_mfa,
  -- Check MFA factors
  (SELECT COUNT(*) FROM auth.mfa_factors mf WHERE mf.user_id = p.id AND mf.status = 'verified') as verified_factors_count,
  (SELECT COUNT(*) FROM auth.mfa_factors mf WHERE mf.user_id = p.id) as total_factors_count
FROM profiles p
LEFT JOIN auth.users u ON u.id = p.id
WHERE p.email = 'arunvaradharajalu@gmail.com';

-- Check all MFA factors for this user
SELECT 
  'MFA Factors Details' as check_type,
  mf.id,
  mf.user_id,
  mf.friendly_name,
  mf.factor_type,
  mf.status,
  mf.created_at,
  mf.updated_at
FROM auth.mfa_factors mf
JOIN profiles p ON p.id = mf.user_id
WHERE p.email = 'arunvaradharajalu@gmail.com';

-- If the user has verified MFA factors but no metadata, let's fix it
UPDATE auth.users 
SET raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb) || '{"mfa_enabled": "true"}'::jsonb
WHERE id IN (
  SELECT p.id 
  FROM profiles p 
  WHERE p.email = 'arunvaradharajalu@gmail.com'
)
AND EXISTS (
  SELECT 1 FROM auth.mfa_factors mf 
  WHERE mf.user_id = auth.users.id 
  AND mf.status = 'verified' 
  AND mf.factor_type = 'totp'
)
AND (raw_app_meta_data->>'mfa_enabled' IS NULL OR raw_app_meta_data->>'mfa_enabled' != 'true');

-- Check the result after the fix
SELECT 
  'After Fix Check' as check_type,
  p.id,
  p.email,
  p.first_name,
  p.last_name,
  u.raw_app_meta_data->>'mfa_enabled' as app_meta_mfa,
  u.raw_user_meta_data->>'mfa_enabled' as user_meta_mfa,
  (SELECT COUNT(*) FROM auth.mfa_factors mf WHERE mf.user_id = p.id AND mf.status = 'verified') as verified_factors_count
FROM profiles p
LEFT JOIN auth.users u ON u.id = p.id
WHERE p.email = 'arunvaradharajalu@gmail.com';

-- Test the updated function
SELECT 
  'Function Test' as check_type,
  *
FROM get_users_with_mfa_status('arun', 1, 10)
WHERE email = 'arunvaradharajalu@gmail.com';
