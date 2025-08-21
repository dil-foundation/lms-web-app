-- Script: Enable MFA for Students
-- Description: Sets the two_factor_auth_enabled_students setting to true
-- Date: 2024-01-15

-- Enable MFA for students
INSERT INTO security_settings (setting_key, setting_value, setting_type, description) VALUES
    ('two_factor_auth_enabled_students', 'true', 'boolean', 'Require 2FA for student users')
ON CONFLICT (setting_key) 
DO UPDATE SET 
    setting_value = 'true',
    updated_at = NOW();

-- Also enable for teachers and admins for consistency
INSERT INTO security_settings (setting_key, setting_value, setting_type, description) VALUES
    ('two_factor_auth_enabled_teachers', 'true', 'boolean', 'Require 2FA for teacher users'),
    ('two_factor_auth_enabled_admin', 'true', 'boolean', 'Require 2FA for administrator users')
ON CONFLICT (setting_key) 
DO UPDATE SET 
    setting_value = 'true',
    updated_at = NOW();

-- Verify the settings were applied
SELECT setting_key, setting_value, description 
FROM security_settings 
WHERE setting_key LIKE 'two_factor_auth_enabled_%'
ORDER BY setting_key;
