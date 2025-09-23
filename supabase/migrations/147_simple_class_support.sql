-- Simple class support for meetings - no complex functions
-- This migration just adds the class_id column and basic support

-- Add class_id column to zoom_meetings table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'zoom_meetings' AND column_name = 'class_id') THEN
        ALTER TABLE public.zoom_meetings 
        ADD COLUMN class_id UUID REFERENCES classes(id) ON DELETE SET NULL;
        
        -- Create index for performance
        CREATE INDEX IF NOT EXISTS idx_zoom_meetings_class_id ON zoom_meetings(class_id);
    END IF;
END $$;

-- Update the constraint to support class_id as well as course_id
ALTER TABLE public.zoom_meetings 
DROP CONSTRAINT IF EXISTS zoom_meetings_student_or_course;

ALTER TABLE public.zoom_meetings 
DROP CONSTRAINT IF EXISTS zoom_meetings_student_course_or_class;

-- Add new constraint that supports both course_id and class_id for class meetings
ALTER TABLE public.zoom_meetings 
ADD CONSTRAINT zoom_meetings_student_course_or_class CHECK (
    (meeting_type = '1-on-1' AND student_id IS NOT NULL AND course_id IS NULL AND class_id IS NULL) OR
    (meeting_type = 'class' AND student_id IS NULL AND (course_id IS NOT NULL OR class_id IS NOT NULL))
);

-- Update RLS policies to include class-based access (simple version)
DROP POLICY IF EXISTS "Teachers can view their own meetings" ON zoom_meetings;

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
        )
    );

-- Add helpful comment
COMMENT ON COLUMN zoom_meetings.class_id IS 'Reference to classes table for class-based meetings (preferred over course_id)';
