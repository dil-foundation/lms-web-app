-- ============================================================================
-- STEP 4: CREATE CLEAN, NON-RECURSIVE POLICIES
-- ============================================================================
-- This script creates all RLS policies for zoom meetings and related tables
-- These policies are designed to be non-recursive and performant
-- ============================================================================

BEGIN;

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

DO $$
BEGIN
    RAISE NOTICE 'Created 4 policies for zoom_meetings table';
END $$;

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

DO $$
BEGIN
    RAISE NOTICE 'Created 5 policies for meeting_participants table';
END $$;

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

DO $$
BEGIN
    RAISE NOTICE 'Created 2 policies for meeting_notifications table';
END $$;

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

DO $$
BEGIN
    RAISE NOTICE 'Created 2 policies for integrations table';
    RAISE NOTICE 'Step 4 completed: All policies created successfully!';
END $$;

COMMIT;

