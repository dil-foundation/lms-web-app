-- Create meetings system tables
-- This migration creates the necessary tables for the Zoom meetings functionality

-- Create integrations table to store API configurations
CREATE TABLE IF NOT EXISTS public.integrations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    type TEXT NOT NULL, -- 'zoom', 'stripe', etc.
    status TEXT NOT NULL DEFAULT 'disabled', -- 'enabled', 'disabled', 'error'
    settings JSONB DEFAULT '{}',
    is_configured BOOLEAN DEFAULT false,
    last_sync TIMESTAMPTZ,
    version TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT integrations_status_check CHECK (status IN ('enabled', 'disabled', 'error')),
    CONSTRAINT integrations_type_check CHECK (type IN ('communication', 'payment', 'productivity'))
);

-- Create zoom_meetings table
CREATE TABLE IF NOT EXISTS public.zoom_meetings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    meeting_type TEXT NOT NULL DEFAULT '1-on-1',
    scheduled_time TIMESTAMPTZ NOT NULL,
    duration INTEGER NOT NULL DEFAULT 60, -- duration in minutes
    teacher_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    student_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    course_id UUID REFERENCES courses(id) ON DELETE SET NULL,
    zoom_meeting_id TEXT, -- Zoom's meeting ID
    zoom_join_url TEXT, -- Zoom join URL
    zoom_password TEXT, -- Zoom meeting password
    zoom_host_url TEXT, -- Zoom host URL
    status TEXT NOT NULL DEFAULT 'scheduled',
    participants_count INTEGER DEFAULT 0,
    actual_duration INTEGER, -- actual duration in minutes
    recording_url TEXT, -- URL to meeting recording if available
    notes TEXT, -- Meeting notes
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT zoom_meetings_type_check CHECK (meeting_type IN ('1-on-1', 'class')),
    CONSTRAINT zoom_meetings_status_check CHECK (status IN ('scheduled', 'active', 'completed', 'cancelled')),
    CONSTRAINT zoom_meetings_duration_check CHECK (duration > 0 AND duration <= 480), -- max 8 hours
    CONSTRAINT zoom_meetings_student_or_course CHECK (
        (meeting_type = '1-on-1' AND student_id IS NOT NULL AND course_id IS NULL) OR
        (meeting_type = 'class' AND course_id IS NOT NULL AND student_id IS NULL)
    )
);

-- Create meeting_participants table for class meetings
CREATE TABLE IF NOT EXISTS public.meeting_participants (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    meeting_id UUID NOT NULL REFERENCES zoom_meetings(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'participant', -- 'host', 'participant'
    joined_at TIMESTAMPTZ,
    left_at TIMESTAMPTZ,
    duration_minutes INTEGER,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT meeting_participants_role_check CHECK (role IN ('host', 'participant')),
    CONSTRAINT meeting_participants_unique UNIQUE (meeting_id, user_id)
);

-- Create meeting_notifications table
CREATE TABLE IF NOT EXISTS public.meeting_notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    meeting_id UUID NOT NULL REFERENCES zoom_meetings(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    notification_type TEXT NOT NULL, -- 'reminder', 'started', 'ended', 'cancelled'
    scheduled_for TIMESTAMPTZ NOT NULL,
    sent_at TIMESTAMPTZ,
    status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'sent', 'failed'
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT meeting_notifications_type_check CHECK (notification_type IN ('reminder', 'started', 'ended', 'cancelled')),
    CONSTRAINT meeting_notifications_status_check CHECK (status IN ('pending', 'sent', 'failed'))
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_zoom_meetings_teacher_id ON zoom_meetings(teacher_id);
CREATE INDEX IF NOT EXISTS idx_zoom_meetings_student_id ON zoom_meetings(student_id);
CREATE INDEX IF NOT EXISTS idx_zoom_meetings_course_id ON zoom_meetings(course_id);
CREATE INDEX IF NOT EXISTS idx_zoom_meetings_scheduled_time ON zoom_meetings(scheduled_time);
CREATE INDEX IF NOT EXISTS idx_zoom_meetings_status ON zoom_meetings(status);
CREATE INDEX IF NOT EXISTS idx_meeting_participants_meeting_id ON meeting_participants(meeting_id);
CREATE INDEX IF NOT EXISTS idx_meeting_participants_user_id ON meeting_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_meeting_notifications_meeting_id ON meeting_notifications(meeting_id);
CREATE INDEX IF NOT EXISTS idx_meeting_notifications_user_id ON meeting_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_meeting_notifications_scheduled_for ON meeting_notifications(scheduled_for);
CREATE INDEX IF NOT EXISTS idx_integrations_name ON integrations(name);
CREATE INDEX IF NOT EXISTS idx_integrations_status ON integrations(status);

-- Enable RLS (Row Level Security)
ALTER TABLE zoom_meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE meeting_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE meeting_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE integrations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for zoom_meetings
CREATE POLICY "Teachers can view their own meetings" ON zoom_meetings
    FOR SELECT USING (
        teacher_id = auth.uid() OR
        student_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM meeting_participants mp 
            WHERE mp.meeting_id = zoom_meetings.id AND mp.user_id = auth.uid()
        )
    );

CREATE POLICY "Teachers can create meetings" ON zoom_meetings
    FOR INSERT WITH CHECK (teacher_id = auth.uid());

CREATE POLICY "Teachers can update their own meetings" ON zoom_meetings
    FOR UPDATE USING (teacher_id = auth.uid());

CREATE POLICY "Teachers can delete their own meetings" ON zoom_meetings
    FOR DELETE USING (teacher_id = auth.uid());

-- RLS Policies for meeting_participants
CREATE POLICY "Users can view meeting participants for their meetings" ON meeting_participants
    FOR SELECT USING (
        user_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM zoom_meetings zm 
            WHERE zm.id = meeting_participants.meeting_id 
            AND (zm.teacher_id = auth.uid() OR zm.student_id = auth.uid())
        )
    );

CREATE POLICY "Teachers can manage participants for their meetings" ON meeting_participants
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM zoom_meetings zm 
            WHERE zm.id = meeting_participants.meeting_id AND zm.teacher_id = auth.uid()
        )
    );

-- RLS Policies for meeting_notifications
CREATE POLICY "Users can view their own notifications" ON meeting_notifications
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "System can manage notifications" ON meeting_notifications
    FOR ALL USING (true); -- This will be restricted by service role

-- RLS Policies for integrations (admin only)
CREATE POLICY "Admins can manage integrations" ON integrations
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
        )
    );

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add updated_at triggers
CREATE TRIGGER update_zoom_meetings_updated_at 
    BEFORE UPDATE ON zoom_meetings 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_integrations_updated_at 
    BEFORE UPDATE ON integrations 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default integrations
INSERT INTO integrations (name, type, status, settings, is_configured) VALUES
    ('zoom', 'communication', 'disabled', '{"api_key": "", "api_secret": "", "webhook_url": ""}', false),
    ('stripe', 'payment', 'disabled', '{"api_key": "", "webhook_url": ""}', false)
ON CONFLICT (name) DO NOTHING;

-- Create function to get teacher's meetings with participant info
CREATE OR REPLACE FUNCTION get_teacher_meetings(teacher_uuid UUID)
RETURNS TABLE (
    id UUID,
    title TEXT,
    description TEXT,
    meeting_type TEXT,
    scheduled_time TIMESTAMPTZ,
    duration INTEGER,
    teacher_id UUID,
    student_id UUID,
    course_id UUID,
    zoom_meeting_id TEXT,
    zoom_join_url TEXT,
    zoom_password TEXT,
    status TEXT,
    participants_count INTEGER,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    student_name TEXT,
    course_title TEXT,
    participant_names TEXT[]
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        zm.id,
        zm.title,
        zm.description,
        zm.meeting_type,
        zm.scheduled_time,
        zm.duration,
        zm.teacher_id,
        zm.student_id,
        zm.course_id,
        zm.zoom_meeting_id,
        zm.zoom_join_url,
        zm.zoom_password,
        zm.status,
        zm.participants_count,
        zm.created_at,
        zm.updated_at,
        CASE 
            WHEN zm.student_id IS NOT NULL THEN 
                COALESCE(sp.first_name || ' ' || sp.last_name, sp.email)
            ELSE NULL
        END as student_name,
        c.title as course_title,
        CASE 
            WHEN zm.meeting_type = 'class' THEN
                ARRAY(
                    SELECT COALESCE(p.first_name || ' ' || p.last_name, p.email)
                    FROM meeting_participants mp
                    JOIN profiles p ON p.id = mp.user_id
                    WHERE mp.meeting_id = zm.id
                )
            ELSE NULL
        END as participant_names
    FROM zoom_meetings zm
    LEFT JOIN profiles sp ON sp.id = zm.student_id
    LEFT JOIN courses c ON c.id = zm.course_id
    WHERE zm.teacher_id = teacher_uuid
    ORDER BY zm.scheduled_time DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON FUNCTION get_teacher_meetings(UUID) TO authenticated;

