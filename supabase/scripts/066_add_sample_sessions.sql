-- Migration: Add Sample Sessions for Testing
-- Description: Adds sample sessions using existing user IDs from auth.users table
-- Date: 2024-01-15

-- This script will add sample sessions for existing users
-- Run this only after you have users in your auth.users table

-- First, let's see what users exist (for reference)
SELECT id, email FROM auth.users LIMIT 5;

-- Add sample sessions for existing users (replace with actual user IDs)
-- Uncomment and modify the INSERT statements below with real user IDs from your auth.users table

/*
-- Example: Add sample sessions (replace the user_id values with actual user IDs from your auth.users table)
INSERT INTO user_sessions (user_id, session_token, ip_address, location, last_activity, expires_at) VALUES
    ('YOUR_ACTUAL_USER_ID_1', 'sample_session_token_1', '192.168.1.100', 'New York, US', NOW() - INTERVAL '5 minutes', NOW() + INTERVAL '24 hours'),
    ('YOUR_ACTUAL_USER_ID_2', 'sample_session_token_2', '192.168.1.101', 'London, UK', NOW() - INTERVAL '10 minutes', NOW() + INTERVAL '24 hours'),
    ('YOUR_ACTUAL_USER_ID_3', 'sample_session_token_3', '192.168.1.102', 'Toronto, CA', NOW() - INTERVAL '15 minutes', NOW() + INTERVAL '24 hours');

-- To get actual user IDs, run this query first:
-- SELECT id, email FROM auth.users;
*/

-- Alternative: Add a session for the first user found (if any exist)
DO $$
DECLARE
    first_user_id UUID;
BEGIN
    -- Get the first user ID
    SELECT id INTO first_user_id FROM auth.users LIMIT 1;
    
    -- If a user exists, add a sample session
    IF first_user_id IS NOT NULL THEN
        INSERT INTO user_sessions (user_id, session_token, ip_address, location, last_activity, expires_at) VALUES
            (first_user_id, 'sample_session_token_1', '192.168.1.100', 'New York, US', NOW() - INTERVAL '5 minutes', NOW() + INTERVAL '24 hours');
        
        RAISE NOTICE 'Added sample session for user ID: %', first_user_id;
    ELSE
        RAISE NOTICE 'No users found in auth.users table. Please create users first.';
    END IF;
END $$;
