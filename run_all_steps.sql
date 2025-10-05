-- ============================================================================
-- RUN ALL STEPS - MASTER SCRIPT
-- ============================================================================
-- This master script runs all 7 steps in sequence
-- Use this to execute the complete deployment in one go
-- 
-- IMPORTANT: 
--   - Backup your database before running!
--   - Test in staging first!
--   - This entire script runs in a single transaction
--   - If any step fails, all changes will be rolled back
-- ============================================================================

BEGIN;

RAISE NOTICE '';
RAISE NOTICE '========================================';
RAISE NOTICE 'STARTING ZOOM MEETINGS FIX DEPLOYMENT';
RAISE NOTICE '========================================';
RAISE NOTICE '';

-- ============================================================================
-- STEP 1: FIX FOREIGN KEY CONSTRAINTS
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '>>> STEP 1: Fixing foreign key constraints...';
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

DO $$
BEGIN
    RAISE NOTICE '✓ Step 1 completed successfully';
    RAISE NOTICE '';
END $$;

-- ============================================================================
-- STEP 2: DROP ALL EXISTING POLICIES
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '>>> STEP 2: Dropping all existing policies...';
    
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
    
    RAISE NOTICE '✓ Step 2 completed successfully';
    RAISE NOTICE '';
END $$;

-- ============================================================================
-- STEP 3: ENABLE RLS ON ALL TABLES
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '>>> STEP 3: Enabling RLS on all tables...';
END $$;

ALTER TABLE zoom_meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE meeting_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE meeting_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE integrations ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    RAISE NOTICE '✓ Step 3 completed successfully';
    RAISE NOTICE '';
END $$;

-- ============================================================================
-- STEP 4: CREATE CLEAN, NON-RECURSIVE POLICIES
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '>>> STEP 4: Creating new policies...';
END $$;

-- ZOOM_MEETINGS POLICIES
CREATE POLICY "Users can view meetings they are part of" ON zoom_meetings
    FOR SELECT TO authenticated
    USING (
        teacher_id = auth.uid() 
        OR student_id = auth.uid() 
        OR participant_id = auth.uid()
        OR (
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

CREATE POLICY "Teachers can create meetings" ON zoom_meetings
    FOR INSERT TO authenticated
    WITH CHECK (teacher_id = auth.uid());

CREATE POLICY "Teachers can update their meetings" ON zoom_meetings
    FOR UPDATE TO authenticated
    USING (teacher_id = auth.uid())
    WITH CHECK (teacher_id = auth.uid());

CREATE POLICY "Teachers can delete their meetings" ON zoom_meetings
    FOR DELETE TO authenticated
    USING (teacher_id = auth.uid());

COMMENT ON POLICY "Users can view meetings they are part of" ON zoom_meetings IS 
    'Users can view meetings where they are the host, a direct participant, or enrolled in the class';

-- MEETING_PARTICIPANTS POLICIES
CREATE POLICY "Users can view participants" ON meeting_participants
    FOR SELECT TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "Participants can be added" ON meeting_participants
    FOR INSERT TO authenticated
    WITH CHECK (true);

CREATE POLICY "Users can update their participation" ON meeting_participants
    FOR UPDATE TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can remove their participation" ON meeting_participants
    FOR DELETE TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "Service role can manage all participants" ON meeting_participants
    FOR ALL TO service_role
    USING (true)
    WITH CHECK (true);

-- MEETING_NOTIFICATIONS POLICIES
CREATE POLICY "Users can view their notifications" ON meeting_notifications
    FOR SELECT TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "Service role can manage notifications" ON meeting_notifications
    FOR ALL TO service_role
    USING (true)
    WITH CHECK (true);

-- INTEGRATIONS POLICIES
CREATE POLICY "Authenticated users can view integrations" ON integrations
    FOR SELECT TO authenticated
    USING (true);

CREATE POLICY "Service role can manage integrations" ON integrations
    FOR ALL TO service_role
    USING (true)
    WITH CHECK (true);

DO $$
BEGIN
    RAISE NOTICE '✓ Step 4 completed successfully';
    RAISE NOTICE '';
END $$;

-- ============================================================================
-- STEP 5: GRANT NECESSARY PERMISSIONS
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '>>> STEP 5: Granting permissions...';
END $$;

GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.zoom_meetings TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.meeting_participants TO authenticated;
GRANT SELECT ON public.meeting_notifications TO authenticated;
GRANT SELECT ON public.integrations TO authenticated;

GRANT ALL ON public.zoom_meetings TO service_role;
GRANT ALL ON public.meeting_participants TO service_role;
GRANT ALL ON public.meeting_notifications TO service_role;
GRANT ALL ON public.integrations TO service_role;

DO $$
BEGIN
    RAISE NOTICE '✓ Step 5 completed successfully';
    RAISE NOTICE '';
END $$;

-- ============================================================================
-- STEP 6: CONFIGURE ZOOM INTEGRATION
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '>>> STEP 6: Configuring zoom integration...';
END $$;

INSERT INTO public.integrations (name, type, status, settings, is_configured) 
VALUES (
    'zoom', 
    'communication', 
    'disabled',
    '{"api_key": "", "api_secret": "", "user_id": ""}', 
    false
)
ON CONFLICT (name) 
DO UPDATE SET 
    updated_at = timezone('utc'::text, now());

DO $$
BEGIN
    RAISE NOTICE '✓ Step 6 completed successfully';
    RAISE NOTICE '';
END $$;

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
    foreign_keys_count INTEGER;
BEGIN
    RAISE NOTICE '>>> STEP 7: Verifying setup...';
    RAISE NOTICE '';
    
    SELECT COUNT(*) INTO zoom_integration_count 
    FROM public.integrations 
    WHERE name = 'zoom';
    
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
    
    SELECT COUNT(*) INTO foreign_keys_count
    FROM information_schema.table_constraints
    WHERE table_name = 'zoom_meetings' 
    AND constraint_type = 'FOREIGN KEY';
    
    RAISE NOTICE '========================================';
    RAISE NOTICE 'VERIFICATION RESULTS:';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
    RAISE NOTICE 'Foreign Keys: % (expected: 5)', foreign_keys_count;
    RAISE NOTICE 'Zoom meetings policies: % (expected: 4)', zoom_policies_count;
    RAISE NOTICE 'Meeting participants policies: % (expected: 5)', participants_policies_count;
    RAISE NOTICE 'Meeting notifications policies: % (expected: 2)', notifications_policies_count;
    RAISE NOTICE 'Integrations policies: % (expected: 2)', integrations_policies_count;
    RAISE NOTICE 'Zoom integration exists: %', (zoom_integration_count > 0);
    RAISE NOTICE '';
    
    IF zoom_integration_count > 0 AND 
       zoom_policies_count = 4 AND 
       participants_policies_count = 5 AND
       notifications_policies_count = 2 AND
       integrations_policies_count = 2 AND
       foreign_keys_count = 5 THEN
        RAISE NOTICE '✓✓✓ SUCCESS ✓✓✓';
        RAISE NOTICE 'All configurations applied correctly!';
    ELSE
        RAISE WARNING '⚠⚠⚠ WARNING ⚠⚠⚠';
        RAISE WARNING 'Some configurations may be incomplete!';
    END IF;
    
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'NEXT STEPS:';
    RAISE NOTICE '1. Configure production Zoom credentials';
    RAISE NOTICE '2. Enable the integration';
    RAISE NOTICE '3. Test thoroughly';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
END $$;

COMMIT;

RAISE NOTICE '';
RAISE NOTICE '========================================';
RAISE NOTICE 'DEPLOYMENT COMPLETED!';
RAISE NOTICE '========================================';
RAISE NOTICE '';

