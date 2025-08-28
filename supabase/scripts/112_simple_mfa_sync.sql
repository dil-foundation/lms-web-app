-- Script: Simple MFA Status Sync
-- Description: Simply syncs MFA status to profiles metadata for arunvaradharajalu@gmail.com
-- Date: 2024-01-15

-- First, let's check the current state
SELECT 
    'Current State' as check_type,
    p.id,
    p.email,
    p.first_name,
    p.last_name,
    p.metadata->>'mfa_enabled' as profiles_mfa_status,
    (SELECT COUNT(*) FROM auth.mfa_factors mf WHERE mf.user_id = p.id AND mf.status = 'verified') as verified_factors
FROM profiles p
WHERE p.email = 'arunvaradharajalu@gmail.com';

-- If the user has verified MFA factors, update the profiles metadata
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
);

-- Check the result
SELECT 
    'After Update' as check_type,
    p.id,
    p.email,
    p.first_name,
    p.last_name,
    p.metadata->>'mfa_enabled' as profiles_mfa_status,
    (SELECT COUNT(*) FROM auth.mfa_factors mf WHERE mf.user_id = p.id AND mf.status = 'verified') as verified_factors
FROM profiles p
WHERE p.email = 'arunvaradharajalu@gmail.com';

-- Test the function
SELECT 
    'Function Test' as check_type,
    id,
    email,
    first_name,
    last_name,
    role,
    mfa_enabled
FROM get_users_with_mfa_status('arunvaradharajalu', 1, 10)
WHERE email = 'arunvaradharajalu@gmail.com';
