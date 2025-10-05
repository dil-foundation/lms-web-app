-- ============================================================================
-- CONSOLIDATED ZOOM MEETINGS FIX FOR PRODUCTION
-- ============================================================================
-- This script consolidates all zoom meetings fixes into a single production-ready script
-- It addresses:
--   1. Foreign key constraints
--   2. RLS policies (non-recursive, clean)
--   3. Class enrollment support for students
--   4. Integration configuration
--   5. Permissions and grants
-- 
-- IMPORTANT: Review and test in staging before running in production!
-- ============================================================================

BEGIN;

-- ============================================================================
-- STEP 1: FIX FOREIGN KEY CONSTRAINTS
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE 'Step 1: Fixing foreign key constraints...';
END $$;

-- Drop existing foreign key constraints if they exist
ALTER TABLE zoom_meetings DROP CONSTRAINT IF EXISTS zoom_meetings_teacher_id_fkey;
ALTER TABLE zoom_meetings DROP CONSTRAINT IF EXISTS zoom_meetings_student_id_fkey;
ALTER TABLE zoom_meetings DROP CONSTRAINT IF EXISTS zoom_meetings_course_id_fkey;
ALTER TABLE zoom_meetings DROP CONSTRAINT IF EXISTS zoom_meetings_class_id_fkey;
ALTER TABLE zoom_meetings DROP CONSTRAINT IF EXISTS zoom_meetings_participant_id_fkey;

-- Add correct foreign key constraints
ALTER TABLE zoom_meetings 
ADD CONSTRAINT zoom_meetings_teacher_id_fkey 
FOREIGN KEY (teacher_id) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE zoom_meetings 
ADD CONSTRAINT zoom_meetings_student_id_fkey 
FOREIGN KEY (student_id) REFERENCES profiles(id) ON DELETE SET NULL;

ALTER TABLE zoom_meetings 
ADD CONSTRAINT zoom_meetings_participant_id_fkey 
FOREIGN KEY (participant_id) REFERENCES profiles(id) ON DELETE SET NULL;

ALTER TABLE zoom_meetings 
ADD CONSTRAINT zoom_meetings_course_id_fkey 
FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE SET NULL;

ALTER TABLE zoom_meetings 
ADD CONSTRAINT zoom_meetings_class_id_fkey 
FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE SET NULL;

-- ============================================================================
-- STEP 2: DROP ALL EXISTING POLICIES
-- ============================================================================

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
    
    RAISE NOTICE 'All existing policies dropped successfully';
END $$;

-- ============================================================================
-- STEP 3: ENABLE RLS ON ALL TABLES
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE 'Step 3: Enabling RLS on all tables...';
END $$;

ALTER TABLE zoom_meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE meeting_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE meeting_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE integrations ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- STEP 4: CREATE CLEAN, NON-RECURSIVE POLICIES
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE 'Step 4: Creating new policies...';
END $$;

-- ----------------------------------------------------------------------------
-- ZOOM_MEETINGS POLICIES
-- ----------------------------------------------------------------------------

-- SELECT: Users can view meetings they are part of
-- Includes support for class enrollment
CREATE POLICY "Users can view meetings they are part of" ON zoom_meetings
    FOR SELECT TO authenticated
    USING (
        -- Host/teacher can see their meetings
        teacher_id = auth.uid() 
        OR 
        -- Direct participant (1-on-1 meetings)
        student_id = auth.uid() 
        OR 
        -- Generic participant (teacher-to-teacher, admin-to-teacher, etc.)
        participant_id = auth.uid()
        OR
        -- Students can see class meetings for classes they're enrolled in
        (
            meeting_type = 'class' 
            AND class_id IS NOT NULL
            AND EXISTS (
                SELECT 1 FROM class_students
                WHERE class_students.class_id = zoom_meetings.class_id
                AND class_students.student_id = auth.uid()
                AND class_students.enrollment_status = 'active'
            )
        )
    );

-- INSERT: Teachers can create meetings
CREATE POLICY "Teachers can create meetings" ON zoom_meetings
    FOR INSERT TO authenticated
    WITH CHECK (teacher_id = auth.uid());

-- UPDATE: Teachers can update their own meetings
CREATE POLICY "Teachers can update their meetings" ON zoom_meetings
    FOR UPDATE TO authenticated
    USING (teacher_id = auth.uid())
    WITH CHECK (teacher_id = auth.uid());

-- DELETE: Teachers can delete their own meetings
CREATE POLICY "Teachers can delete their meetings" ON zoom_meetings
    FOR DELETE TO authenticated
    USING (teacher_id = auth.uid());

-- Add policy comment
COMMENT ON POLICY "Users can view meetings they are part of" ON zoom_meetings IS 
    'Users can view meetings where they are the host, a direct participant, or enrolled in the class';

-- ----------------------------------------------------------------------------
-- MEETING_PARTICIPANTS POLICIES
-- ----------------------------------------------------------------------------

-- SELECT: Users can view participants for meetings they're involved in
CREATE POLICY "Users can view participants" ON meeting_participants
    FOR SELECT TO authenticated
    USING (user_id = auth.uid());

-- INSERT: Allow authenticated users to insert participants
CREATE POLICY "Participants can be added" ON meeting_participants
    FOR INSERT TO authenticated
    WITH CHECK (true); -- Teachers will manage this through the application

-- UPDATE: Users can update their own participant records
CREATE POLICY "Users can update their participation" ON meeting_participants
    FOR UPDATE TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- DELETE: Users can remove their own participant records
CREATE POLICY "Users can remove their participation" ON meeting_participants
    FOR DELETE TO authenticated
    USING (user_id = auth.uid());

-- Service role can manage all participants
CREATE POLICY "Service role can manage all participants" ON meeting_participants
    FOR ALL TO service_role
    USING (true)
    WITH CHECK (true);

-- ----------------------------------------------------------------------------
-- MEETING_NOTIFICATIONS POLICIES
-- ----------------------------------------------------------------------------

-- SELECT: Users can view their own notifications
CREATE POLICY "Users can view their notifications" ON meeting_notifications
    FOR SELECT TO authenticated
    USING (user_id = auth.uid());

-- Service role can manage all notifications
CREATE POLICY "Service role can manage notifications" ON meeting_notifications
    FOR ALL TO service_role
    USING (true)
    WITH CHECK (true);

-- ----------------------------------------------------------------------------
-- INTEGRATIONS POLICIES
-- ----------------------------------------------------------------------------

-- SELECT: All authenticated users can view integrations
CREATE POLICY "Authenticated users can view integrations" ON integrations
    FOR SELECT TO authenticated
    USING (true);

-- Service role can manage all integrations
CREATE POLICY "Service role can manage integrations" ON integrations
    FOR ALL TO service_role
    USING (true)
    WITH CHECK (true);

-- ============================================================================
-- STEP 5: GRANT NECESSARY PERMISSIONS
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE 'Step 5: Granting permissions...';
END $$;

GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.zoom_meetings TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.meeting_participants TO authenticated;
GRANT SELECT ON public.meeting_notifications TO authenticated;
GRANT SELECT ON public.integrations TO authenticated;

-- Grant service role full access
GRANT ALL ON public.zoom_meetings TO service_role;
GRANT ALL ON public.meeting_participants TO service_role;
GRANT ALL ON public.meeting_notifications TO service_role;
GRANT ALL ON public.integrations TO service_role;

-- ============================================================================
-- STEP 6: CONFIGURE ZOOM INTEGRATION (for production)
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE 'Step 6: Configuring zoom integration...';
END $$;

-- Note: Update the settings with your actual production credentials
-- This is just a placeholder to ensure the record exists
INSERT INTO public.integrations (name, type, status, settings, is_configured) 
VALUES (
    'zoom', 
    'communication', 
    'disabled',  -- Set to 'enabled' once you've configured production credentials
    '{"api_key": "", "api_secret": "", "user_id": ""}', 
    false  -- Set to true once configured
)
ON CONFLICT (name) 
DO UPDATE SET 
    updated_at = timezone('utc'::text, now());

-- ============================================================================
-- STEP 7: VERIFICATION
-- ============================================================================

DO $$
DECLARE
    zoom_integration_count INTEGER;
    zoom_policies_count INTEGER;
    participants_policies_count INTEGER;
    notifications_policies_count INTEGER;
    integrations_policies_count INTEGER;
BEGIN
    RAISE NOTICE 'Step 7: Verifying setup...';
    
    -- Check zoom integration exists
    SELECT COUNT(*) INTO zoom_integration_count 
    FROM public.integrations 
    WHERE name = 'zoom';
    
    -- Count policies
    SELECT COUNT(*) INTO zoom_policies_count
    FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'zoom_meetings';
    
    SELECT COUNT(*) INTO participants_policies_count
    FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'meeting_participants';
    
    SELECT COUNT(*) INTO notifications_policies_count
    FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'meeting_notifications';
    
    SELECT COUNT(*) INTO integrations_policies_count
    FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'integrations';
    
    -- Display results
    RAISE NOTICE '----------------------------------------';
    RAISE NOTICE 'VERIFICATION RESULTS:';
    RAISE NOTICE '----------------------------------------';
    RAISE NOTICE 'Zoom integration exists: %', (zoom_integration_count > 0);
    RAISE NOTICE 'Zoom meetings policies: %', zoom_policies_count;
    RAISE NOTICE 'Meeting participants policies: %', participants_policies_count;
    RAISE NOTICE 'Meeting notifications policies: %', notifications_policies_count;
    RAISE NOTICE 'Integrations policies: %', integrations_policies_count;
    RAISE NOTICE '----------------------------------------';
    
    IF zoom_integration_count > 0 AND 
       zoom_policies_count = 4 AND 
       participants_policies_count = 5 AND
       notifications_policies_count = 2 AND
       integrations_policies_count = 2 THEN
        RAISE NOTICE 'SUCCESS: All configurations applied correctly!';
    ELSE
        RAISE WARNING 'WARNING: Some configurations may be incomplete. Please verify.';
    END IF;
    
    RAISE NOTICE '----------------------------------------';
    RAISE NOTICE 'NEXT STEPS:';
    RAISE NOTICE '1. Configure production Zoom OAuth credentials in integrations table';
    RAISE NOTICE '2. Set integration status to "enabled"';
    RAISE NOTICE '3. Test meeting creation and viewing with different user roles';
    RAISE NOTICE '----------------------------------------';
END $$;

COMMIT;

-- ============================================================================
-- END OF SCRIPT
-- ============================================================================
-- Script completed successfully!
-- Review the verification output above to ensure all changes were applied.
-- ============================================================================

