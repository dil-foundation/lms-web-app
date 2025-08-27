-- Create function to check maintenance mode status
-- This function can be accessed by all authenticated users (students, teachers, admins)
CREATE OR REPLACE FUNCTION get_maintenance_mode_status()
RETURNS TABLE (
    maintenance_mode BOOLEAN,
    system_name VARCHAR
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ads.maintenance_mode,
        ads.system_name
    FROM admin_settings ads
    ORDER BY ads.created_at DESC
    LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to all authenticated users
GRANT EXECUTE ON FUNCTION get_maintenance_mode_status() TO authenticated;

-- Add helpful comment
COMMENT ON FUNCTION get_maintenance_mode_status() IS 'Returns current maintenance mode status and system name. Accessible by all authenticated users.';
