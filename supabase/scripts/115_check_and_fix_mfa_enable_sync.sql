-- Script: Check and Fix MFA Enable Sync
-- Description: Checks and fixes the MFA enable sync issue for arunvaradharajalu@gmail.com
-- Date: 2024-01-15

-- First, let's check the current state
SELECT 
    'Current State Check' as check_type,
    p.id,
    p.email,
    p.first_name,
    p.last_name,
    p.metadata->>'mfa_enabled' as profiles_mfa_status,
    u.raw_app_meta_data->>'mfa_enabled' as auth_mfa_status,
    (SELECT COUNT(*) FROM auth.mfa_factors mf WHERE mf.user_id = p.id) as total_factors,
    (SELECT COUNT(*) FROM auth.mfa_factors mf WHERE mf.user_id = p.id AND mf.status = 'verified') as verified_factors,
    p.metadata as full_metadata
FROM profiles p
LEFT JOIN auth.users u ON u.id = p.id
WHERE p.email = 'arunvaradharajalu@gmail.com';

-- Show all MFA factors for this user
SELECT 
    'MFA Factors' as check_type,
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

-- If the user has verified MFA factors, properly sync the status to profiles metadata
UPDATE profiles 
SET metadata = COALESCE(metadata, '{}'::jsonb) || 
    jsonb_build_object(
        'mfa_enabled', true,
        'mfa_setup_completed_at', now()::text
    )
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

-- Also update auth.users metadata to ensure consistency
UPDATE auth.users 
SET raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb) || 
    jsonb_build_object(
        'mfa_enabled', 'true',
        'mfa_setup_completed_at', now()::text
    )
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
    'After Fix' as check_type,
    p.id,
    p.email,
    p.first_name,
    p.last_name,
    p.metadata->>'mfa_enabled' as profiles_mfa_status,
    u.raw_app_meta_data->>'mfa_enabled' as auth_mfa_status,
    (SELECT COUNT(*) FROM auth.mfa_factors mf WHERE mf.user_id = p.id) as total_factors,
    (SELECT COUNT(*) FROM auth.mfa_factors mf WHERE mf.user_id = p.id AND mf.status = 'verified') as verified_factors,
    p.metadata as full_metadata
FROM profiles p
LEFT JOIN auth.users u ON u.id = p.id
WHERE p.email = 'arunvaradharajalu@gmail.com';

-- Test the admin function
SELECT 
    'Admin Function Test' as check_type,
    id,
    email,
    first_name,
    last_name,
    role,
    mfa_enabled
FROM get_users_with_mfa_status('arunvaradharajalu', 1, 10)
WHERE email = 'arunvaradharajalu@gmail.com';
