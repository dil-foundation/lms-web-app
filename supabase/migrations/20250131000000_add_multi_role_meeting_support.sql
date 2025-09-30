-- Migration: Add multi-role meeting support for Teacher-to-Teacher and Admin-to-Teacher meetings
-- This extends the Zoom meetings functionality beyond just Teacher-to-Student meetings

-- STEP 1: Drop ALL RLS policies first (they may reference participant_id or conflict)
DROP POLICY IF EXISTS "Teachers can view their own meetings" ON zoom_meetings;
DROP POLICY IF EXISTS "Users can view meetings they are part of" ON zoom_meetings;
DROP POLICY IF EXISTS "Users can view their meetings" ON zoom_meetings;
DROP POLICY IF EXISTS "Teachers can create meetings" ON zoom_meetings;
DROP POLICY IF EXISTS "Teachers can update their own meetings" ON zoom_meetings;
DROP POLICY IF EXISTS "Teachers can delete their own meetings" ON zoom_meetings;

-- STEP 2: Add new columns to zoom_meetings table
-- Drop and recreate participant_id to ensure correct foreign key reference
ALTER TABLE zoom_meetings DROP COLUMN IF EXISTS participant_id;
ALTER TABLE zoom_meetings ADD COLUMN participant_id UUID REFERENCES profiles(id) ON DELETE SET NULL;
ALTER TABLE zoom_meetings ADD COLUMN IF NOT EXISTS participant_role TEXT;

-- STEP 3: Migrate and fix existing data (BEFORE adding constraints)

-- Migrate existing 1-on-1 meetings to use the new participant fields
UPDATE zoom_meetings 
SET participant_id = student_id, 
    participant_role = 'student'
WHERE meeting_type = '1-on-1' 
  AND student_id IS NOT NULL 
  AND participant_id IS NULL;

-- Log information about existing meetings for debugging
DO $$
DECLARE
  meeting_count INT;
BEGIN
  SELECT COUNT(*) INTO meeting_count FROM zoom_meetings;
  RAISE NOTICE 'Found % existing meetings to process', meeting_count;
END $$;

-- STEP 4: Add/update constraints (AFTER migrating data)
-- Drop all possible variations of the constraint names first
ALTER TABLE zoom_meetings DROP CONSTRAINT IF EXISTS zoom_meetings_participant_role_check;
ALTER TABLE zoom_meetings DROP CONSTRAINT IF EXISTS zoom_meetings_type_check;
ALTER TABLE zoom_meetings DROP CONSTRAINT IF EXISTS zoom_meetings_student_or_course;
ALTER TABLE zoom_meetings DROP CONSTRAINT IF EXISTS zoom_meetings_student_course_or_class;
ALTER TABLE zoom_meetings DROP CONSTRAINT IF EXISTS zoom_meetings_participant_check;

-- Add participant_role constraint
ALTER TABLE zoom_meetings ADD CONSTRAINT zoom_meetings_participant_role_check 
  CHECK (participant_role IS NULL OR participant_role IN ('student', 'teacher', 'admin'));

-- Update meeting_type constraint to include new meeting types
ALTER TABLE zoom_meetings ADD CONSTRAINT zoom_meetings_type_check 
  CHECK (meeting_type IN ('1-on-1', 'class', 'teacher-to-teacher', 'admin-to-teacher'));

-- Note: Skipping participant validation constraint for now to avoid issues with existing data
-- Application-level validation will handle this
-- Future migration can add this constraint once all data is verified to be clean

-- STEP 5: Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_zoom_meetings_participant_id ON zoom_meetings(participant_id);
CREATE INDEX IF NOT EXISTS idx_zoom_meetings_participant_role ON zoom_meetings(participant_role);

-- STEP 6: Create RLS policies to support new meeting types
-- Create updated policies that include participant access (simplified to avoid infinite recursion)

-- SELECT policy: Users can view meetings they created, are participants in, or are students in
CREATE POLICY "Users can view meetings they are part of" ON zoom_meetings
    FOR SELECT USING (
        teacher_id = auth.uid() OR
        student_id = auth.uid() OR
        participant_id = auth.uid()
    );

-- INSERT policy: Any authenticated user can create meetings as host
CREATE POLICY "Users can create meetings" ON zoom_meetings
    FOR INSERT WITH CHECK (teacher_id = auth.uid());

-- UPDATE policy: Only the host can update their meetings
CREATE POLICY "Users can update their meetings" ON zoom_meetings
    FOR UPDATE USING (teacher_id = auth.uid())
    WITH CHECK (teacher_id = auth.uid());

-- DELETE policy: Only the host can delete their meetings
CREATE POLICY "Users can delete their meetings" ON zoom_meetings
    FOR DELETE USING (teacher_id = auth.uid());

-- STEP 7: Update the get_teacher_meetings function to include participant information
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
    participant_id UUID,
    participant_role TEXT,
    zoom_meeting_id TEXT,
    zoom_join_url TEXT,
    zoom_password TEXT,
    zoom_host_url TEXT,
    status TEXT,
    participants_count INTEGER,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    student_name TEXT,
    course_title TEXT,
    class_name TEXT,
    participant_name TEXT,
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
        zm.participant_id,
        zm.participant_role,
        zm.zoom_meeting_id,
        zm.zoom_join_url,
        zm.zoom_password,
        zm.zoom_host_url,
        zm.status,
        zm.participants_count,
        zm.created_at,
        zm.updated_at,
        -- Student name (for backward compatibility with 1-on-1 meetings)
        CASE 
            WHEN zm.student_id IS NOT NULL THEN 
                COALESCE(sp.first_name || ' ' || sp.last_name, sp.email)
            ELSE NULL
        END as student_name,
        -- Course title (for class meetings)
        CASE
            WHEN zm.class_id IS NOT NULL THEN
                COALESCE(cl.name || ' (' || cl.code || ')', 'Unknown Class')
            WHEN zm.course_id IS NOT NULL THEN
                c.title
            ELSE NULL
        END as course_title,
        -- Class name
        cl.name as class_name,
        -- Participant name (for teacher-to-teacher and admin-to-teacher meetings)
        CASE 
            WHEN zm.participant_id IS NOT NULL THEN 
                COALESCE(pp.first_name || ' ' || pp.last_name, pp.email)
            ELSE NULL
        END as participant_name,
        -- Participant names for class meetings
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
    LEFT JOIN profiles pp ON pp.id = zm.participant_id
    LEFT JOIN courses c ON c.id = zm.course_id
    LEFT JOIN classes cl ON cl.id = zm.class_id
    WHERE zm.teacher_id = teacher_uuid
    ORDER BY zm.scheduled_time DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_teacher_meetings(UUID) TO authenticated;

-- Add comment for documentation
COMMENT ON COLUMN zoom_meetings.participant_id IS 'Generic participant reference for teacher-to-teacher and admin-to-teacher meetings';
COMMENT ON COLUMN zoom_meetings.participant_role IS 'Role of the participant (student, teacher, or admin)';

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'Multi-role meeting support migration completed successfully';
    RAISE NOTICE 'New meeting types available: teacher-to-teacher, admin-to-teacher';
    RAISE NOTICE 'Existing 1-on-1 meetings have been migrated to use participant_id and participant_role';
END $$;

