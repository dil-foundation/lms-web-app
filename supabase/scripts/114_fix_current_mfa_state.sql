-- Script: Fix Current MFA State
-- Description: Manually fixes the MFA state for arunvaradharajalu@gmail.com
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
    (SELECT COUNT(*) FROM auth.mfa_factors mf WHERE mf.user_id = p.id AND mf.status = 'verified') as verified_factors
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

-- COMPLETELY REMOVE ALL MFA FACTORS for this user
DELETE FROM auth.mfa_factors 
WHERE user_id IN (
    SELECT p.id 
    FROM profiles p 
    WHERE p.email = 'arunvaradharajalu@gmail.com'
);

-- Update auth.users metadata to completely disable MFA
UPDATE auth.users 
SET raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb) || 
    jsonb_build_object(
        'mfa_enabled', 'false',
        'mfa_disabled_by_admin', 'true',
        'mfa_disabled_at', now()::text,
        'mfa_factors_removed', 'true'
    )
WHERE id IN (
    SELECT p.id 
    FROM profiles p 
    WHERE p.email = 'arunvaradharajalu@gmail.com'
);

-- Update profiles metadata and clear all MFA-related fields
UPDATE profiles 
SET 
    metadata = COALESCE(metadata, '{}'::jsonb) || 
        jsonb_build_object(
            'mfa_enabled', false,
            'mfa_disabled_by_admin', true,
            'mfa_disabled_at', now()::text
        ),
    two_factor_setup_completed_at = NULL,
    mfa_reset_required = false,
    mfa_reset_requested_at = NULL,
    two_factor_backup_codes = NULL,
    updated_at = NOW()
WHERE email = 'arunvaradharajalu@gmail.com';

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
    (SELECT COUNT(*) FROM auth.mfa_factors mf WHERE mf.user_id = p.id AND mf.status = 'verified') as verified_factors
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

-- Verify no MFA factors remain
SELECT 
    'Verification - No MFA Factors' as check_type,
    COUNT(*) as remaining_factors
FROM auth.mfa_factors mf
JOIN profiles p ON p.id = mf.user_id
WHERE p.email = 'arunvaradharajalu@gmail.com';
