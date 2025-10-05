-- ============================================================================
-- STEP 2: DROP ALL EXISTING POLICIES
-- ============================================================================
-- This script drops all existing RLS policies to start fresh
-- This prevents conflicts and duplicate policies
-- ============================================================================

BEGIN;

DO $$
BEGIN
    RAISE NOTICE 'Step 2: Dropping all existing policies...';
    
    -- Drop all zoom_meetings policies
    DROP POLICY IF EXISTS "Users can view meetings they are part of" ON zoom_meetings;
    DROP POLICY IF EXISTS "Users can view meetings they're involved in" ON zoom_meetings;
    DROP POLICY IF EXISTS "Teachers can view their own meetings" ON zoom_meetings;
    DROP POLICY IF EXISTS "zoom_meetings_select_policy" ON zoom_meetings;
    DROP POLICY IF EXISTS "Users can view their meetings" ON zoom_meetings;
    
    DROP POLICY IF EXISTS "Teachers can create meetings" ON zoom_meetings;
    DROP POLICY IF EXISTS "Teachers can insert meetings" ON zoom_meetings;
    DROP POLICY IF EXISTS "Users can create meetings" ON zoom_meetings;
    DROP POLICY IF EXISTS "zoom_meetings_insert_policy" ON zoom_meetings;
    
    DROP POLICY IF EXISTS "Teachers can update their own meetings" ON zoom_meetings;
    DROP POLICY IF EXISTS "Teachers can update their meetings" ON zoom_meetings;
    DROP POLICY IF EXISTS "Users can update their meetings" ON zoom_meetings;
    DROP POLICY IF EXISTS "zoom_meetings_update_policy" ON zoom_meetings;
    
    DROP POLICY IF EXISTS "Teachers can delete their own meetings" ON zoom_meetings;
    DROP POLICY IF EXISTS "Teachers can delete their meetings" ON zoom_meetings;
    DROP POLICY IF EXISTS "Users can delete their meetings" ON zoom_meetings;
    DROP POLICY IF EXISTS "zoom_meetings_delete_policy" ON zoom_meetings;
    
    -- Drop all meeting_participants policies
    DROP POLICY IF EXISTS "Users can view meeting participants for their meetings" ON meeting_participants;
    DROP POLICY IF EXISTS "Teachers can manage participants for their meetings" ON meeting_participants;
    DROP POLICY IF EXISTS "Users can view participants for their meetings" ON meeting_participants;
    DROP POLICY IF EXISTS "Teachers can manage participants" ON meeting_participants;
    DROP POLICY IF EXISTS "meeting_participants_select_policy" ON meeting_participants;
    DROP POLICY IF EXISTS "meeting_participants_insert_policy" ON meeting_participants;
    DROP POLICY IF EXISTS "meeting_participants_update_policy" ON meeting_participants;
    DROP POLICY IF EXISTS "meeting_participants_delete_policy" ON meeting_participants;
    DROP POLICY IF EXISTS "Users can view participants" ON meeting_participants;
    DROP POLICY IF EXISTS "System can manage participants" ON meeting_participants;
    
    -- Drop all meeting_notifications policies
    DROP POLICY IF EXISTS "Users can view their own notifications" ON meeting_notifications;
    DROP POLICY IF EXISTS "Users can view their notifications" ON meeting_notifications;
    DROP POLICY IF EXISTS "System can manage notifications" ON meeting_notifications;
    DROP POLICY IF EXISTS "meeting_notifications_select_policy" ON meeting_notifications;
    DROP POLICY IF EXISTS "meeting_notifications_service_policy" ON meeting_notifications;
    
    -- Drop all integrations policies
    DROP POLICY IF EXISTS "Admin users can view all integrations" ON integrations;
    DROP POLICY IF EXISTS "Admin users can update integrations" ON integrations;
    DROP POLICY IF EXISTS "Admin users can insert integrations" ON integrations;
    DROP POLICY IF EXISTS "Admin users can delete integrations" ON integrations;
    DROP POLICY IF EXISTS "Admins can manage integrations" ON integrations;
    DROP POLICY IF EXISTS "Authenticated users can read integrations" ON integrations;
    DROP POLICY IF EXISTS "Service role can manage integrations" ON integrations;
    DROP POLICY IF EXISTS "integrations_select_policy" ON integrations;
    DROP POLICY IF EXISTS "integrations_service_policy" ON integrations;
    DROP POLICY IF EXISTS "Authenticated users can view integrations" ON integrations;
    
    RAISE NOTICE 'Step 2 completed: All existing policies dropped successfully!';
END $$;

COMMIT;

