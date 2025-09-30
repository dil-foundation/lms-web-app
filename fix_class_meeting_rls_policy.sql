-- Fix RLS policy to allow students to see class meetings they're enrolled in

-- Drop the existing SELECT policy
DROP POLICY IF EXISTS "Users can view meetings they are part of" ON zoom_meetings;

-- Create updated policy that includes class enrollment check
CREATE POLICY "Users can view meetings they are part of" ON zoom_meetings
    FOR SELECT USING (
        -- Host can see their meetings
        teacher_id = auth.uid() 
        OR 
        -- Direct participant (1-on-1 meetings)
        student_id = auth.uid() 
        OR 
        -- Generic participant (teacher-to-teacher, admin-to-teacher)
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

-- Add comment
COMMENT ON POLICY "Users can view meetings they are part of" ON zoom_meetings IS 
    'Users can view meetings where they are the host, a direct participant, or enrolled in the class';

