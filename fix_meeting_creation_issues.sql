-- Fix meeting creation issues
-- This script addresses several issues preventing meeting creation

-- 1. Fix the integrations table policies (use correct table name)
DROP POLICY IF EXISTS "Admin users can view all integrations" ON public.integrations;
DROP POLICY IF EXISTS "Admin users can update integrations" ON public.integrations;
DROP POLICY IF EXISTS "Admin users can insert integrations" ON public.integrations;
DROP POLICY IF EXISTS "Admin users can delete integrations" ON public.integrations;
DROP POLICY IF EXISTS "Admins can manage integrations" ON public.integrations;

-- Create simpler policies for integrations that work with both table structures
CREATE POLICY "Authenticated users can read integrations" ON public.integrations
    FOR SELECT TO authenticated
    USING (true);

CREATE POLICY "Service role can manage integrations" ON public.integrations
    FOR ALL TO service_role
    USING (true);

-- 2. Ensure the zoom integration record exists and is enabled for development
INSERT INTO public.integrations (name, type, status, settings, is_configured) 
VALUES (
    'zoom', 
    'communication', 
    'enabled',  -- Enable it for development
    '{"api_key": "dev_key", "api_secret": "dev_secret", "user_id": "dev_user"}', 
    true  -- Mark as configured
)
ON CONFLICT (name) 
DO UPDATE SET 
    status = 'enabled',
    is_configured = true,
    settings = '{"api_key": "dev_key", "api_secret": "dev_secret", "user_id": "dev_user"}',
    updated_at = timezone('utc'::text, now());

-- 3. Fix any potential issues with the zoom_meetings table policies
-- Make sure the basic policies work correctly
DROP POLICY IF EXISTS "Teachers can view their own meetings" ON public.zoom_meetings;
DROP POLICY IF EXISTS "Teachers can create meetings" ON public.zoom_meetings;
DROP POLICY IF EXISTS "Teachers can update their own meetings" ON public.zoom_meetings;
DROP POLICY IF EXISTS "Teachers can delete their own meetings" ON public.zoom_meetings;

-- Create simpler, more reliable policies
CREATE POLICY "Users can view meetings they're involved in" ON public.zoom_meetings
    FOR SELECT TO authenticated
    USING (
        teacher_id = auth.uid() OR
        student_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM meeting_participants mp 
            WHERE mp.meeting_id = zoom_meetings.id AND mp.user_id = auth.uid()
        )
    );

CREATE POLICY "Teachers can create meetings" ON public.zoom_meetings
    FOR INSERT TO authenticated
    WITH CHECK (teacher_id = auth.uid());

CREATE POLICY "Teachers can update their own meetings" ON public.zoom_meetings
    FOR UPDATE TO authenticated
    USING (teacher_id = auth.uid())
    WITH CHECK (teacher_id = auth.uid());

CREATE POLICY "Teachers can delete their own meetings" ON public.zoom_meetings
    FOR DELETE TO authenticated
    USING (teacher_id = auth.uid());

-- 4. Fix meeting_participants policies
DROP POLICY IF EXISTS "Users can view meeting participants for their meetings" ON public.meeting_participants;
DROP POLICY IF EXISTS "Teachers can manage participants for their meetings" ON public.meeting_participants;

CREATE POLICY "Users can view participants for their meetings" ON public.meeting_participants
    FOR SELECT TO authenticated
    USING (
        user_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM zoom_meetings zm 
            WHERE zm.id = meeting_participants.meeting_id 
            AND (zm.teacher_id = auth.uid() OR zm.student_id = auth.uid())
        )
    );

CREATE POLICY "Teachers can manage participants" ON public.meeting_participants
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM zoom_meetings zm 
            WHERE zm.id = meeting_participants.meeting_id AND zm.teacher_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM zoom_meetings zm 
            WHERE zm.id = meeting_participants.meeting_id AND zm.teacher_id = auth.uid()
        )
    );

-- 5. Fix meeting_notifications policies  
DROP POLICY IF EXISTS "Users can view their own notifications" ON public.meeting_notifications;
DROP POLICY IF EXISTS "Users can view their notifications" ON public.meeting_notifications;
DROP POLICY IF EXISTS "System can manage notifications" ON public.meeting_notifications;

CREATE POLICY "Users can view their notifications" ON public.meeting_notifications
    FOR SELECT TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "System can manage notifications" ON public.meeting_notifications
    FOR ALL TO service_role
    USING (true);

-- 6. Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.integrations TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.zoom_meetings TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.meeting_participants TO authenticated;
GRANT SELECT ON public.meeting_notifications TO authenticated;
GRANT INSERT ON public.meeting_notifications TO service_role;

-- 7. Ensure the courses table exists and has proper structure for foreign keys
-- (This is just a safety check - the table should already exist)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'courses' AND table_schema = 'public') THEN
        RAISE NOTICE 'Warning: courses table does not exist. Meeting creation with course_id will fail.';
    END IF;
END $$;

COMMIT;
