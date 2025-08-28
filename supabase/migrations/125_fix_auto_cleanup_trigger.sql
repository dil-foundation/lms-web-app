-- Migration: Fix Auto Cleanup Trigger Infinite Loop
-- Description: Fixes the infinite loop in auto_cleanup_expired_blocks trigger
-- Date: 2024-01-20

-- First, drop the problematic trigger
DROP TRIGGER IF EXISTS trigger_cleanup_expired_blocks ON blocked_users;

-- Drop the problematic function
DROP FUNCTION IF EXISTS auto_cleanup_expired_blocks();

-- Create a safer version that doesn't cause infinite loops
CREATE OR REPLACE FUNCTION auto_cleanup_expired_blocks()
RETURNS TRIGGER AS $$
BEGIN
    -- Only run cleanup if this is a new insert or update that affects is_active
    -- This prevents the trigger from running recursively
    IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND (OLD.is_active IS DISTINCT FROM NEW.is_active)) THEN
        -- Use a separate transaction to avoid conflicts
        PERFORM pg_notify('cleanup_expired_blocks', 'cleanup_needed');
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create a safer trigger that only fires on specific conditions
CREATE TRIGGER trigger_cleanup_expired_blocks
    AFTER INSERT OR UPDATE ON blocked_users
    FOR EACH ROW
    WHEN (NEW.is_active = TRUE)
    EXECUTE FUNCTION auto_cleanup_expired_blocks();

-- Create a separate function to handle the actual cleanup
CREATE OR REPLACE FUNCTION perform_expired_blocks_cleanup()
RETURNS INTEGER AS $$
DECLARE
    cleaned_count INTEGER;
BEGIN
    -- Update expired blocks to inactive
    UPDATE blocked_users 
    SET is_active = FALSE
    WHERE blocked_until < NOW() 
    AND is_active = TRUE;
    
    GET DIAGNOSTICS cleaned_count = ROW_COUNT;
    
    -- Log the cleanup
    IF cleaned_count > 0 THEN
        RAISE NOTICE 'Cleaned up % expired blocked users', cleaned_count;
    END IF;
    
    RETURN cleaned_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION perform_expired_blocks_cleanup() TO authenticated;
GRANT EXECUTE ON FUNCTION perform_expired_blocks_cleanup() TO anon;

-- Test the fix
SELECT 'Testing fixed cleanup function...' as status;
SELECT perform_expired_blocks_cleanup();

-- Verify the trigger is working
SELECT 'Verifying trigger setup...' as status;
SELECT 
    trigger_name,
    event_manipulation,
    action_statement
FROM information_schema.triggers 
WHERE event_object_table = 'blocked_users' 
AND trigger_schema = 'public';

SELECT 'Auto cleanup trigger fix completed!' as status;
