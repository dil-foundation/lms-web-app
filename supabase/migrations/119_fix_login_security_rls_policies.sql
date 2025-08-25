-- Migration: Fix Login Security RLS Policies
-- Description: Fixes permission issues with login_attempts and blocked_users tables
-- Date: 2024-01-20

-- Drop existing policies that are causing permission issues
DROP POLICY IF EXISTS "Admins can view all login attempts" ON login_attempts;
DROP POLICY IF EXISTS "Users can view their own login attempts" ON login_attempts;
DROP POLICY IF EXISTS "System can insert login attempts" ON login_attempts;
DROP POLICY IF EXISTS "Admins can manage blocked users" ON blocked_users;
DROP POLICY IF EXISTS "Users can view their own block status" ON blocked_users;
DROP POLICY IF EXISTS "System can manage blocked users" ON blocked_users;

-- Create new policies that work with the current authentication setup
-- For login_attempts table
CREATE POLICY "Enable read access for authenticated users" ON login_attempts
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Enable insert access for all users" ON login_attempts
    FOR INSERT WITH CHECK (true);

-- For blocked_users table
CREATE POLICY "Enable read access for authenticated users" ON blocked_users
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Enable insert access for all users" ON blocked_users
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable update access for authenticated users" ON blocked_users
    FOR UPDATE USING (auth.role() = 'authenticated');

-- Grant necessary permissions to the service role
GRANT USAGE ON SCHEMA public TO service_role;
GRANT ALL ON login_attempts TO service_role;
GRANT ALL ON blocked_users TO service_role;

-- Grant permissions to authenticated users
GRANT SELECT ON login_attempts TO authenticated;
GRANT INSERT ON login_attempts TO authenticated;
GRANT SELECT ON blocked_users TO authenticated;
GRANT INSERT ON blocked_users TO authenticated;
GRANT UPDATE ON blocked_users TO authenticated;

-- Grant permissions to anon users for system operations
GRANT SELECT ON login_attempts TO anon;
GRANT INSERT ON login_attempts TO anon;
GRANT SELECT ON blocked_users TO anon;
GRANT INSERT ON blocked_users TO anon;
GRANT UPDATE ON blocked_users TO anon;
