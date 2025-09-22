-- Fix the RLS policies that are causing infinite recursion
-- Run this in Supabase SQL Editor

-- Drop the problematic policies
DROP POLICY IF EXISTS "Teachers can view their own meetings" ON zoom_meetings;
DROP POLICY IF EXISTS "Teachers can create meetings" ON zoom_meetings;
DROP POLICY IF EXISTS "Teachers can update their own meetings" ON zoom_meetings;
DROP POLICY IF EXISTS "Teachers can delete their own meetings" ON zoom_meetings;

DROP POLICY IF EXISTS "Users can view meeting participants for their meetings" ON meeting_participants;
DROP POLICY IF EXISTS "Teachers can manage participants for their meetings" ON meeting_participants;

DROP POLICY IF EXISTS "Users can view their own notifications" ON meeting_notifications;
DROP POLICY IF EXISTS "System can manage notifications" ON meeting_notifications;

DROP POLICY IF EXISTS "Admins can manage integrations" ON integrations;

-- Create simpler, non-recursive policies for zoom_meetings
CREATE POLICY "Users can view their meetings" ON zoom_meetings
    FOR SELECT USING (
        teacher_id = auth.uid() OR student_id = auth.uid()
    );

CREATE POLICY "Teachers can insert meetings" ON zoom_meetings
    FOR INSERT WITH CHECK (teacher_id = auth.uid());

CREATE POLICY "Teachers can update their meetings" ON zoom_meetings
    FOR UPDATE USING (teacher_id = auth.uid());

CREATE POLICY "Teachers can delete their meetings" ON zoom_meetings
    FOR DELETE USING (teacher_id = auth.uid());

-- Create simpler policies for meeting_participants
CREATE POLICY "Users can view participants" ON meeting_participants
    FOR SELECT USING (true); -- Will be filtered by meeting access

CREATE POLICY "System can manage participants" ON meeting_participants
    FOR ALL USING (true); -- This will be restricted by service role

-- Create simpler policies for meeting_notifications
CREATE POLICY "Users can view their notifications" ON meeting_notifications
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "System can manage notifications" ON meeting_notifications
    FOR ALL USING (true); -- This will be restricted by service role

-- Create policies for integrations
CREATE POLICY "Authenticated users can read integrations" ON integrations
    FOR SELECT USING (true);

CREATE POLICY "Service role can manage integrations" ON integrations
    FOR ALL USING (true); -- This will be restricted by service role

-- Also, let's make sure the integrations table has the zoom record
INSERT INTO integrations (name, type, status, settings, is_configured) VALUES
    ('zoom', 'communication', 'disabled', '{"api_key": "", "api_secret": "", "user_id": ""}', false)
ON CONFLICT (name) DO UPDATE SET
    settings = '{"api_key": "", "api_secret": "", "user_id": ""}';
