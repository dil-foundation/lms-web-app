-- Migration: Add role-based 2FA settings
-- This migration replaces the single two_factor_auth_enabled setting with role-specific settings

-- First, let's check if the old setting exists and get its value
DO $$
DECLARE
    old_setting_value TEXT;
BEGIN
    -- Get the value of the old setting
    SELECT setting_value INTO old_setting_value 
    FROM security_settings 
    WHERE setting_key = 'two_factor_auth_enabled';
    
    -- If the old setting exists, use its value for all roles
    -- If it doesn't exist, default to false
    IF old_setting_value IS NULL THEN
        old_setting_value := 'false';
    END IF;
    
    -- Insert the new role-based settings
    INSERT INTO security_settings (setting_key, setting_value, setting_type, description) VALUES
        ('two_factor_auth_enabled_admin', old_setting_value, 'boolean', 'Require 2FA for administrator users'),
        ('two_factor_auth_enabled_teachers', old_setting_value, 'boolean', 'Require 2FA for teacher users'),
        ('two_factor_auth_enabled_students', old_setting_value, 'boolean', 'Require 2FA for student users')
    ON CONFLICT (setting_key) DO NOTHING;
    
    -- Remove the old setting
    DELETE FROM security_settings WHERE setting_key = 'two_factor_auth_enabled';
    
    RAISE NOTICE 'Migration completed: Added role-based 2FA settings with value: %', old_setting_value;
END $$;
