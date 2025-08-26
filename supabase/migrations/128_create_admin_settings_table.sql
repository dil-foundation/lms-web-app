-- Create admin_settings table
CREATE TABLE IF NOT EXISTS admin_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    
    -- System Settings
    system_name VARCHAR(255) DEFAULT 'DIL Learning Platform',
    maintenance_mode BOOLEAN DEFAULT false,
    
    -- Notification Settings
    system_notifications BOOLEAN DEFAULT true,
    email_notifications BOOLEAN DEFAULT true,
    push_notifications BOOLEAN DEFAULT false,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_admin_settings_created_at ON admin_settings(created_at DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE admin_settings ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Only admins can view admin settings
CREATE POLICY "Admins can view admin settings" ON admin_settings
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Only admins can insert admin settings
CREATE POLICY "Admins can insert admin settings" ON admin_settings
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Only admins can update admin settings
CREATE POLICY "Admins can update admin settings" ON admin_settings
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Only admins can delete admin settings
CREATE POLICY "Admins can delete admin settings" ON admin_settings
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_admin_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    NEW.updated_by = auth.uid();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically update updated_at column
CREATE TRIGGER trigger_update_admin_settings_updated_at 
    BEFORE UPDATE ON admin_settings 
    FOR EACH ROW 
    EXECUTE FUNCTION update_admin_settings_updated_at();

-- Create function to automatically set created_by on insert
CREATE OR REPLACE FUNCTION set_admin_settings_created_by()
RETURNS TRIGGER AS $$
BEGIN
    NEW.created_by = auth.uid();
    NEW.updated_by = auth.uid();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically set created_by on insert
CREATE TRIGGER trigger_set_admin_settings_created_by
    BEFORE INSERT ON admin_settings
    FOR EACH ROW
    EXECUTE FUNCTION set_admin_settings_created_by();

-- Insert default admin settings
INSERT INTO admin_settings (
    system_name,
    maintenance_mode,
    system_notifications,
    email_notifications,
    push_notifications
) VALUES (
    'DIL Learning Platform',
    false,
    true,
    true,
    false
) ON CONFLICT DO NOTHING;

-- Create function to get admin settings
CREATE OR REPLACE FUNCTION get_admin_settings()
RETURNS TABLE (
    system_name VARCHAR,
    maintenance_mode BOOLEAN,
    system_notifications BOOLEAN,
    email_notifications BOOLEAN,
    push_notifications BOOLEAN,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ads.system_name,
        ads.maintenance_mode,
        ads.system_notifications,
        ads.email_notifications,
        ads.push_notifications,
        ads.created_at,
        ads.updated_at
    FROM admin_settings ads
    ORDER BY ads.created_at DESC
    LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to update admin settings
CREATE OR REPLACE FUNCTION update_admin_settings(
    p_system_name VARCHAR DEFAULT NULL,
    p_maintenance_mode BOOLEAN DEFAULT NULL,
    p_system_notifications BOOLEAN DEFAULT NULL,
    p_email_notifications BOOLEAN DEFAULT NULL,
    p_push_notifications BOOLEAN DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    settings_id UUID;
BEGIN
    -- Get the most recent settings record
    SELECT id INTO settings_id
    FROM admin_settings
    ORDER BY created_at DESC
    LIMIT 1;
    
    -- If no settings exist, create a new one
    IF settings_id IS NULL THEN
        INSERT INTO admin_settings (
            system_name,
            maintenance_mode,
            system_notifications,
            email_notifications,
            push_notifications
        ) VALUES (
            COALESCE(p_system_name, 'DIL Learning Platform'),
            COALESCE(p_maintenance_mode, false),
            COALESCE(p_system_notifications, true),
            COALESCE(p_email_notifications, true),
            COALESCE(p_push_notifications, false)
        );
        RETURN true;
    ELSE
        -- Update existing settings
        UPDATE admin_settings
        SET 
            system_name = COALESCE(p_system_name, system_name),
            maintenance_mode = COALESCE(p_maintenance_mode, maintenance_mode),
            system_notifications = COALESCE(p_system_notifications, system_notifications),
            email_notifications = COALESCE(p_email_notifications, email_notifications),
            push_notifications = COALESCE(p_push_notifications, push_notifications)
        WHERE id = settings_id;
        RETURN true;
    END IF;
    
    RETURN false;
EXCEPTION
    WHEN OTHERS THEN
        RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON admin_settings TO authenticated;
GRANT EXECUTE ON FUNCTION get_admin_settings() TO authenticated;
GRANT EXECUTE ON FUNCTION update_admin_settings(VARCHAR, BOOLEAN, BOOLEAN, BOOLEAN, BOOLEAN) TO authenticated;

-- Add helpful comments
COMMENT ON TABLE admin_settings IS 'Stores system-wide admin settings and configuration';
COMMENT ON COLUMN admin_settings.system_name IS 'The name of the learning platform';
COMMENT ON COLUMN admin_settings.maintenance_mode IS 'Whether the system is in maintenance mode';
COMMENT ON COLUMN admin_settings.system_notifications IS 'Whether system-wide notifications are enabled';
COMMENT ON COLUMN admin_settings.email_notifications IS 'Whether email notifications are enabled';
COMMENT ON COLUMN admin_settings.push_notifications IS 'Whether real-time notifications are enabled';
