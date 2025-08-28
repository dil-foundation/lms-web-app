-- Script: Fix MFA Status Sync Issue
-- Description: Checks and fixes MFA status for arunvaradharajalu@gmail.com
-- Date: 2024-01-15

-- First, let's check the current state of MFA for this user
SELECT 
    'Current MFA Status Check' as check_type,
    p.id,
    p.email,
    p.first_name,
    p.last_name,
    -- Check auth.users metadata
    u.raw_app_meta_data->>'mfa_enabled' as app_meta_mfa,
    u.raw_user_meta_data->>'mfa_enabled' as user_meta_mfa,
    -- Check profiles metadata
    p.metadata->>'mfa_enabled' as profiles_meta_mfa,
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

-- If the user has verified MFA factors, let's sync the status to all locations
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

-- Also update the profiles metadata
UPDATE profiles 
SET metadata = COALESCE(metadata, '{}'::jsonb) || '{"mfa_enabled": true}'::jsonb
WHERE id IN (
    SELECT p.id 
    FROM profiles p 
    WHERE p.email = 'arunvaradharajalu@gmail.com'
)
AND EXISTS (
    SELECT 1 FROM auth.mfa_factors mf 
    WHERE mf.user_id = profiles.id 
    AND mf.status = 'verified' 
    AND mf.factor_type = 'totp'
)
AND (metadata->>'mfa_enabled' IS NULL OR metadata->>'mfa_enabled' != 'true');

-- Check the result after the fix
SELECT 
    'MFA Status After Fix' as check_type,
    p.id,
    p.email,
    p.first_name,
    p.last_name,
    -- Check auth.users metadata
    u.raw_app_meta_data->>'mfa_enabled' as app_meta_mfa,
    u.raw_user_meta_data->>'mfa_enabled' as user_meta_mfa,
    -- Check profiles metadata
    p.metadata->>'mfa_enabled' as profiles_meta_mfa,
    -- Check MFA factors
    (SELECT COUNT(*) FROM auth.mfa_factors mf WHERE mf.user_id = p.id AND mf.status = 'verified') as verified_factors_count,
    (SELECT COUNT(*) FROM auth.mfa_factors mf WHERE mf.user_id = p.id) as total_factors_count
FROM profiles p
LEFT JOIN auth.users u ON u.id = p.id
WHERE p.email = 'arunvaradharajalu@gmail.com';

-- Test the get_users_with_mfa_status function for this user
SELECT 
    'Function Test Result' as check_type,
    id,
    email,
    first_name,
    last_name,
    role,
    mfa_enabled,
    created_at
FROM get_users_with_mfa_status('arunvaradharajalu', 1, 10)
WHERE email = 'arunvaradharajalu@gmail.com';
