-- Script: Create MFA Check Function
-- Description: Creates a database function to check MFA requirements that can be called by any authenticated user
-- Date: 2024-01-15

-- Create function to check if MFA is required for a user
CREATE OR REPLACE FUNCTION check_mfa_requirement(user_role TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    setting_key_var TEXT;
    setting_value_var TEXT;
BEGIN
    -- Determine the correct setting key based on role
    IF user_role = 'admin' THEN
        setting_key_var := 'two_factor_auth_enabled_admin';
    ELSIF user_role = 'teacher' THEN
        setting_key_var := 'two_factor_auth_enabled_teachers';
    ELSIF user_role = 'student' THEN
        setting_key_var := 'two_factor_auth_enabled_students';
    ELSE
        RETURN FALSE;
    END IF;
    
    -- Get the setting value
    SELECT setting_value INTO setting_value_var
    FROM security_settings
    WHERE setting_key = setting_key_var;
    
    -- Return true if setting is 'true', false otherwise
    RETURN COALESCE(setting_value_var, 'false') = 'true';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION check_mfa_requirement(TEXT) TO authenticated;

-- Test the function
SELECT check_mfa_requirement('student') as student_mfa_required;
SELECT check_mfa_requirement('teacher') as teacher_mfa_required;
SELECT check_mfa_requirement('admin') as admin_mfa_required;
