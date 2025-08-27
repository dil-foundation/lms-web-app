-- Script: Complete MFA Cleanup and Reset
-- Description: Completely removes all MFA factors and resets metadata for arunvaradharajalu@gmail.com
-- Date: 2024-01-15

-- First, let's check the current state before cleanup
SELECT 
    'BEFORE CLEANUP - Current State' as check_type,
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

-- Show all MFA factors that will be removed
SELECT 
    'MFA Factors to Remove' as check_type,
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

-- STEP 1: COMPLETELY REMOVE ALL MFA FACTORS
DELETE FROM auth.mfa_factors 
WHERE user_id IN (
    SELECT p.id 
    FROM profiles p 
    WHERE p.email = 'arunvaradharajalu@gmail.com'
);

-- STEP 2: Update auth.users metadata to completely disable MFA
UPDATE auth.users 
SET raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb) || 
    jsonb_build_object(
        'mfa_enabled', 'false',
        'mfa_disabled_by_admin', 'true',
        'mfa_disabled_at', now()::text,
        'mfa_factors_removed', 'true',
        'mfa_cleanup_completed', 'true'
    )
WHERE id IN (
    SELECT p.id 
    FROM profiles p 
    WHERE p.email = 'arunvaradharajalu@gmail.com'
);

-- STEP 3: Update profiles metadata and clear all MFA-related fields
UPDATE profiles 
SET 
    metadata = COALESCE(metadata, '{}'::jsonb) || 
        jsonb_build_object(
            'mfa_enabled', false,
            'mfa_disabled_by_admin', true,
            'mfa_disabled_at', now()::text,
            'mfa_cleanup_completed', true
        ),
    two_factor_setup_completed_at = NULL,
    mfa_reset_required = false,
    mfa_reset_requested_at = NULL,
    two_factor_backup_codes = NULL,
    updated_at = NOW()
WHERE email = 'arunvaradharajalu@gmail.com';

-- STEP 4: Check the result after cleanup
SELECT 
    'AFTER CLEANUP - Final State' as check_type,
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

-- STEP 5: Test the admin function to verify it shows MFA as disabled
SELECT 
    'Admin Function Test - Should Show MFA Disabled' as check_type,
    id,
    email,
    first_name,
    last_name,
    role,
    mfa_enabled
FROM get_users_with_mfa_status('arunvaradharajalu', 1, 10)
WHERE email = 'arunvaradharajalu@gmail.com';

-- STEP 6: Verify no MFA factors remain
SELECT 
    'Verification - No MFA Factors Should Remain' as check_type,
    COUNT(*) as remaining_factors
FROM auth.mfa_factors mf
JOIN profiles p ON p.id = mf.user_id
WHERE p.email = 'arunvaradharajalu@gmail.com';

-- STEP 7: Show summary of changes
SELECT 
    'CLEANUP SUMMARY' as check_type,
    'MFA factors removed' as action,
    'All MFA factors have been completely removed from auth.mfa_factors' as details
UNION ALL
SELECT 
    'CLEANUP SUMMARY' as check_type,
    'Auth metadata updated' as action,
    'auth.users.raw_app_meta_data updated to show mfa_enabled: false' as details
UNION ALL
SELECT 
    'CLEANUP SUMMARY' as check_type,
    'Profiles metadata updated' as action,
    'profiles.metadata updated to show mfa_enabled: false and all MFA fields cleared' as details
UNION ALL
SELECT 
    'CLEANUP SUMMARY' as check_type,
    'Backup codes cleared' as action,
    'two_factor_backup_codes set to NULL' as details
UNION ALL
SELECT 
    'CLEANUP SUMMARY' as check_type,
    'Setup timestamps cleared' as action,
    'two_factor_setup_completed_at and related timestamps set to NULL' as details;
