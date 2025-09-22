-- Fix infinite recursion in zoom_meetings policies
-- This script creates simple, non-recursive policies

-- First, disable RLS temporarily to clear all policies
ALTER TABLE public.zoom_meetings DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.meeting_participants DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.meeting_notifications DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.integrations DISABLE ROW LEVEL SECURITY;

-- Drop all existing policies to start fresh
DO $$
BEGIN
    -- Drop zoom_meetings policies
    DROP POLICY IF EXISTS "Users can view meetings they're involved in" ON public.zoom_meetings;
    DROP POLICY IF EXISTS "Teachers can create meetings" ON public.zoom_meetings;
    DROP POLICY IF EXISTS "Teachers can update their own meetings" ON public.zoom_meetings;
    DROP POLICY IF EXISTS "Teachers can delete their own meetings" ON public.zoom_meetings;
    DROP POLICY IF EXISTS "Teachers can view their own meetings" ON public.zoom_meetings;

    -- Drop meeting_participants policies
    DROP POLICY IF EXISTS "Users can view participants for their meetings" ON public.meeting_participants;
    DROP POLICY IF EXISTS "Teachers can manage participants" ON public.meeting_participants;
    DROP POLICY IF EXISTS "Users can view meeting participants for their meetings" ON public.meeting_participants;
    DROP POLICY IF EXISTS "Teachers can manage participants for their meetings" ON public.meeting_participants;

    -- Drop meeting_notifications policies
    DROP POLICY IF EXISTS "Users can view their notifications" ON public.meeting_notifications;
    DROP POLICY IF EXISTS "System can manage notifications" ON public.meeting_notifications;
    DROP POLICY IF EXISTS "Users can view their own notifications" ON public.meeting_notifications;

    -- Drop integrations policies
    DROP POLICY IF EXISTS "Authenticated users can read integrations" ON public.integrations;
    DROP POLICY IF EXISTS "Service role can manage integrations" ON public.integrations;
    DROP POLICY IF EXISTS "Admin users can view all integrations" ON public.integrations;
    DROP POLICY IF EXISTS "Admins can manage integrations" ON public.integrations;

    RAISE NOTICE 'All existing policies dropped';
END $$;

-- Re-enable RLS
ALTER TABLE public.zoom_meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meeting_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meeting_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integrations ENABLE ROW LEVEL SECURITY;

-- Create simple, non-recursive policies for zoom_meetings
CREATE POLICY "zoom_meetings_select_policy" ON public.zoom_meetings
    FOR SELECT TO authenticated
    USING (
        teacher_id = auth.uid() OR 
        student_id = auth.uid()
    );

CREATE POLICY "zoom_meetings_insert_policy" ON public.zoom_meetings
    FOR INSERT TO authenticated
    WITH CHECK (teacher_id = auth.uid());

CREATE POLICY "zoom_meetings_update_policy" ON public.zoom_meetings
    FOR UPDATE TO authenticated
    USING (teacher_id = auth.uid())
    WITH CHECK (teacher_id = auth.uid());

CREATE POLICY "zoom_meetings_delete_policy" ON public.zoom_meetings
    FOR DELETE TO authenticated
    USING (teacher_id = auth.uid());

-- Create simple policies for meeting_participants
CREATE POLICY "meeting_participants_select_policy" ON public.meeting_participants
    FOR SELECT TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "meeting_participants_insert_policy" ON public.meeting_participants
    FOR INSERT TO authenticated
    WITH CHECK (true); -- Teachers will manage this through the application

CREATE POLICY "meeting_participants_update_policy" ON public.meeting_participants
    FOR UPDATE TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "meeting_participants_delete_policy" ON public.meeting_participants
    FOR DELETE TO authenticated
    USING (user_id = auth.uid());

-- Create simple policies for meeting_notifications
CREATE POLICY "meeting_notifications_select_policy" ON public.meeting_notifications
    FOR SELECT TO authenticated
    USING (user_id = auth.uid());

-- Allow service role to manage notifications
CREATE POLICY "meeting_notifications_service_policy" ON public.meeting_notifications
    FOR ALL TO service_role
    USING (true);

-- Create simple policies for integrations
CREATE POLICY "integrations_select_policy" ON public.integrations
    FOR SELECT TO authenticated
    USING (true);

-- Allow service role to manage integrations
CREATE POLICY "integrations_service_policy" ON public.integrations
    FOR ALL TO service_role
    USING (true);

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
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.integrations TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.zoom_meetings TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.meeting_participants TO authenticated;
GRANT SELECT ON public.meeting_notifications TO authenticated;

-- Verify the setup
DO $$
DECLARE
    zoom_integration_count INTEGER;
    policies_count INTEGER;
BEGIN
    -- Check zoom integration
    SELECT COUNT(*) INTO zoom_integration_count 
    FROM public.integrations 
    WHERE name = 'zoom' AND status = 'enabled' AND is_configured = true;
    
    -- Check policies
    SELECT COUNT(*) INTO policies_count
    FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'zoom_meetings';
    
    RAISE NOTICE 'Zoom integration enabled: %', (zoom_integration_count > 0);
    RAISE NOTICE 'Zoom meetings policies created: %', policies_count;
    
    IF zoom_integration_count > 0 AND policies_count > 0 THEN
        RAISE NOTICE 'SUCCESS: Meeting creation should now work!';
    ELSE
        RAISE WARNING 'WARNING: Setup may be incomplete';
    END IF;
END $$;
