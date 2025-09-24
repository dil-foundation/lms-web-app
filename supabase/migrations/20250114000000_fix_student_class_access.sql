-- Fix RLS policy to allow students to see class-based meetings
-- This migration adds proper class-based access for students

-- Drop all existing policies that might conflict
DROP POLICY IF EXISTS "Teachers can view their own meetings" ON zoom_meetings;
DROP POLICY IF EXISTS "Users can view their meetings" ON zoom_meetings;

-- Create a comprehensive policy that includes class-based access
CREATE POLICY "Users can view their meetings" ON zoom_meetings
    FOR SELECT USING (
        -- Teachers can see their own meetings
        teacher_id = auth.uid() OR
        -- Students can see 1-on-1 meetings where they're the participant
        student_id = auth.uid() OR
        -- Students can see class meetings for courses they're enrolled in
        EXISTS (
            SELECT 1 FROM course_members cm 
            WHERE cm.course_id = zoom_meetings.course_id 
            AND cm.user_id = auth.uid() 
            AND cm.role = 'student'
        ) OR
        -- Students can see class meetings for classes they're enrolled in (NEW)
        EXISTS (
            SELECT 1 FROM class_students cs 
            WHERE cs.class_id = zoom_meetings.class_id 
            AND cs.student_id = auth.uid()
            AND cs.enrollment_status = 'active'
        )
    );
