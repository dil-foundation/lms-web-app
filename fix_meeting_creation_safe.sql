-- Safe fix for meeting creation issues
-- This script handles existing policies gracefully

-- Function to safely drop and recreate policies
DO $$
BEGIN
    -- Drop all existing policies on integrations table
    DROP POLICY IF EXISTS "Admin users can view all integrations" ON public.integrations;
    DROP POLICY IF EXISTS "Admin users can update integrations" ON public.integrations;
    DROP POLICY IF EXISTS "Admin users can insert integrations" ON public.integrations;
    DROP POLICY IF EXISTS "Admin users can delete integrations" ON public.integrations;
    DROP POLICY IF EXISTS "Admins can manage integrations" ON public.integrations;
    DROP POLICY IF EXISTS "Authenticated users can read integrations" ON public.integrations;
    DROP POLICY IF EXISTS "Service role can manage integrations" ON public.integrations;

    -- Drop all existing policies on zoom_meetings table
    DROP POLICY IF EXISTS "Teachers can view their own meetings" ON public.zoom_meetings;
    DROP POLICY IF EXISTS "Teachers can create meetings" ON public.zoom_meetings;
    DROP POLICY IF EXISTS "Teachers can update their own meetings" ON public.zoom_meetings;
    DROP POLICY IF EXISTS "Teachers can delete their own meetings" ON public.zoom_meetings;
    DROP POLICY IF EXISTS "Users can view meetings they're involved in" ON public.zoom_meetings;

    -- Drop all existing policies on meeting_participants table
    DROP POLICY IF EXISTS "Users can view meeting participants for their meetings" ON public.meeting_participants;
    DROP POLICY IF EXISTS "Teachers can manage participants for their meetings" ON public.meeting_participants;
    DROP POLICY IF EXISTS "Users can view participants for their meetings" ON public.meeting_participants;
    DROP POLICY IF EXISTS "Teachers can manage participants" ON public.meeting_participants;

    -- Drop all existing policies on meeting_notifications table
    DROP POLICY IF EXISTS "Users can view their own notifications" ON public.meeting_notifications;
    DROP POLICY IF EXISTS "Users can view their notifications" ON public.meeting_notifications;
    DROP POLICY IF EXISTS "System can manage notifications" ON public.meeting_notifications;

    RAISE NOTICE 'All existing policies dropped successfully';
END $$;

-- Now create the new policies
DO $$
BEGIN
    -- Create integrations policies
    CREATE POLICY "Authenticated users can read integrations" ON public.integrations
        FOR SELECT TO authenticated
        USING (true);

    CREATE POLICY "Service role can manage integrations" ON public.integrations
        FOR ALL TO service_role
        USING (true);

    -- Create zoom_meetings policies
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

    -- Create meeting_participants policies
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

    -- Create meeting_notifications policies
    CREATE POLICY "Users can view their notifications" ON public.meeting_notifications
        FOR SELECT TO authenticated
        USING (user_id = auth.uid());

    CREATE POLICY "System can manage notifications" ON public.meeting_notifications
        FOR ALL TO service_role
        USING (true);

    RAISE NOTICE 'All new policies created successfully';
END $$;

-- Enable/update the zoom integration
INSERT INTO public.integrations (name, type, status, settings, is_configured) 
VALUES (
    'zoom', 
    'communication', 
    'enabled',
    '{"api_key": "dev_key", "api_secret": "dev_secret", "user_id": "dev_user"}', 
    true
)
ON CONFLICT (name) 
DO UPDATE SET 
    status = 'enabled',
    is_configured = true,
    settings = '{"api_key": "dev_key", "api_secret": "dev_secret", "user_id": "dev_user"}',
    updated_at = timezone('utc'::text, now());

-- Grant necessary permissions
DO $$
BEGIN
    GRANT USAGE ON SCHEMA public TO authenticated;
    GRANT SELECT, INSERT, UPDATE, DELETE ON public.integrations TO authenticated;
    GRANT SELECT, INSERT, UPDATE, DELETE ON public.zoom_meetings TO authenticated;
    GRANT SELECT, INSERT, UPDATE, DELETE ON public.meeting_participants TO authenticated;
    GRANT SELECT ON public.meeting_notifications TO authenticated;
    GRANT INSERT ON public.meeting_notifications TO service_role;
    
    RAISE NOTICE 'All permissions granted successfully';
END $$;

-- Final verification
DO $$
DECLARE
    zoom_integration_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO zoom_integration_count 
    FROM public.integrations 
    WHERE name = 'zoom' AND status = 'enabled' AND is_configured = true;
    
    IF zoom_integration_count > 0 THEN
        RAISE NOTICE 'SUCCESS: Zoom integration is now enabled and configured';
    ELSE
        RAISE WARNING 'WARNING: Zoom integration may not be properly configured';
    END IF;
END $$;
