-- Add class support to meetings system
-- This migration adds class_id support to zoom_meetings table for better class-based meetings

-- Add class_id column to zoom_meetings table
ALTER TABLE public.zoom_meetings 
ADD COLUMN IF NOT EXISTS class_id UUID REFERENCES classes(id) ON DELETE SET NULL;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_zoom_meetings_class_id ON zoom_meetings(class_id);

-- Update the constraint to support class_id as well as course_id
ALTER TABLE public.zoom_meetings 
DROP CONSTRAINT IF EXISTS zoom_meetings_student_or_course;

-- Add new constraint that supports both course_id and class_id for class meetings
ALTER TABLE public.zoom_meetings 
ADD CONSTRAINT zoom_meetings_student_course_or_class CHECK (
    (meeting_type = '1-on-1' AND student_id IS NOT NULL AND course_id IS NULL AND class_id IS NULL) OR
    (meeting_type = 'class' AND student_id IS NULL AND (course_id IS NOT NULL OR class_id IS NOT NULL))
);

-- Update RLS policies to include class-based access
-- Drop existing policies that need updating
DROP POLICY IF EXISTS "Teachers can view their own meetings" ON zoom_meetings;
DROP POLICY IF EXISTS "Users can view meeting participants for their meetings" ON meeting_participants;

-- Create updated policies that support class-based access
CREATE POLICY "Teachers can view their own meetings" ON zoom_meetings
    FOR SELECT USING (
        teacher_id = auth.uid() OR
        student_id = auth.uid() OR
        -- Course-based access (existing)
        EXISTS (
            SELECT 1 FROM course_members cm 
            WHERE cm.course_id = zoom_meetings.course_id 
            AND cm.user_id = auth.uid() 
            AND cm.role = 'student'
        ) OR
        -- Class-based access (new)
        EXISTS (
            SELECT 1 FROM class_students cs 
            WHERE cs.class_id = zoom_meetings.class_id 
            AND cs.student_id = auth.uid()
        ) OR
        -- Meeting participants access
        EXISTS (
            SELECT 1 FROM meeting_participants mp 
            WHERE mp.meeting_id = zoom_meetings.id AND mp.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can view meeting participants for their meetings" ON meeting_participants
    FOR SELECT USING (
        user_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM zoom_meetings zm 
            WHERE zm.id = meeting_participants.meeting_id 
            AND (
                zm.teacher_id = auth.uid() OR 
                zm.student_id = auth.uid() OR
                -- Course-based access
                EXISTS (
                    SELECT 1 FROM course_members cm 
                    WHERE cm.course_id = zm.course_id 
                    AND cm.user_id = auth.uid() 
                    AND cm.role = 'student'
                ) OR
                -- Class-based access
                EXISTS (
                    SELECT 1 FROM class_students cs 
                    WHERE cs.class_id = zm.class_id 
                    AND cs.student_id = auth.uid()
                )
            )
        )
    );

-- Drop and recreate the get_teacher_meetings function to support class information
DROP FUNCTION IF EXISTS get_teacher_meetings(UUID);

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
    class_id UUID,
    zoom_meeting_id TEXT,
    zoom_join_url TEXT,
    zoom_password TEXT,
    status TEXT,
    participants_count INTEGER,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    student_name TEXT,
    course_title TEXT,
    class_name TEXT,
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
        zm.class_id,
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
        cl.name as class_name,
        CASE 
            WHEN zm.meeting_type = 'class' THEN
                CASE 
                    WHEN zm.class_id IS NOT NULL THEN
                        -- Get class students
                        ARRAY(
                            SELECT COALESCE(p.first_name || ' ' || p.last_name, p.email)
                            FROM class_students cs
                            JOIN profiles p ON p.id = cs.student_id
                            WHERE cs.class_id = zm.class_id
                        )
                    WHEN zm.course_id IS NOT NULL THEN
                        -- Get course members (existing logic)
                        ARRAY(
                            SELECT COALESCE(p.first_name || ' ' || p.last_name, p.email)
                            FROM course_members cm
                            JOIN profiles p ON p.id = cm.user_id
                            WHERE cm.course_id = zm.course_id AND cm.role = 'student'
                        )
                    ELSE NULL
                END
            ELSE NULL
        END as participant_names
    FROM zoom_meetings zm
    LEFT JOIN profiles sp ON sp.id = zm.student_id
    LEFT JOIN courses c ON c.id = zm.course_id
    LEFT JOIN classes cl ON cl.id = zm.class_id
    WHERE zm.teacher_id = teacher_uuid
    ORDER BY zm.scheduled_time DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to get student meetings with class support
CREATE OR REPLACE FUNCTION get_student_meetings(student_uuid UUID)
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
    class_id UUID,
    zoom_meeting_id TEXT,
    zoom_join_url TEXT,
    zoom_password TEXT,
    status TEXT,
    participants_count INTEGER,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    teacher_name TEXT,
    course_title TEXT,
    class_name TEXT
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
        zm.class_id,
        zm.zoom_meeting_id,
        zm.zoom_join_url,
        zm.zoom_password,
        zm.status,
        zm.participants_count,
        zm.created_at,
        zm.updated_at,
        COALESCE(tp.first_name || ' ' || tp.last_name, tp.email) as teacher_name,
        c.title as course_title,
        cl.name as class_name
    FROM zoom_meetings zm
    LEFT JOIN profiles tp ON tp.id = zm.teacher_id
    LEFT JOIN courses c ON c.id = zm.course_id
    LEFT JOIN classes cl ON cl.id = zm.class_id
    WHERE (
        -- Direct 1-on-1 meetings
        zm.student_id = student_uuid OR
        -- Course-based class meetings
        (zm.meeting_type = 'class' AND zm.course_id IS NOT NULL AND EXISTS (
            SELECT 1 FROM course_members cm 
            WHERE cm.course_id = zm.course_id 
            AND cm.user_id = student_uuid 
            AND cm.role = 'student'
        )) OR
        -- Class-based meetings (new)
        (zm.meeting_type = 'class' AND zm.class_id IS NOT NULL AND EXISTS (
            SELECT 1 FROM class_students cs 
            WHERE cs.class_id = zm.class_id 
            AND cs.student_id = student_uuid
        ))
    )
    ORDER BY zm.scheduled_time DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_student_meetings(UUID) TO authenticated;

-- Add helpful comments
COMMENT ON COLUMN zoom_meetings.class_id IS 'Reference to classes table for class-based meetings (preferred over course_id)';
COMMENT ON FUNCTION get_teacher_meetings(UUID) IS 'Get all meetings for a teacher with participant information, supporting both course and class-based meetings';
COMMENT ON FUNCTION get_student_meetings(UUID) IS 'Get all meetings for a student, supporting both course and class-based meetings';
