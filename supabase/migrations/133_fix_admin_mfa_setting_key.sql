-- Script: Fix Admin MFA Setting Key
-- Description: Updates the admin MFA setting key from singular to plural to match the check_mfa_requirement function
-- Date: 2024-01-15

-- Update the admin MFA setting key from 'two_factor_auth_enabled_admin' to 'two_factor_auth_enabled_admins'
UPDATE security_settings 
SET 
  setting_key = 'two_factor_auth_enabled_admins',
  updated_at = NOW()
WHERE setting_key = 'two_factor_auth_enabled_admin';

-- Verify the update
SELECT 
  setting_key,
  setting_value,
  description,
  updated_at
FROM security_settings 
WHERE setting_key LIKE '%two_factor_auth_enabled%'
ORDER BY setting_key;

-- Test the check_mfa_requirement function for admin role
SELECT 
  'Admin MFA Requirement Test' as test_name,
  check_mfa_requirement('admin') as admin_mfa_required,
  'Expected: true (since MFA is enabled for admins)' as expected_result;
