-- Fix RLS policies to prevent infinite recursion
-- This migration fixes the circular reference in zoom_meetings policies

-- Temporarily disable RLS to fix the policies
ALTER TABLE zoom_meetings DISABLE ROW LEVEL SECURITY;

-- Drop all existing policies that might cause recursion
DROP POLICY IF EXISTS "Teachers can view their own meetings" ON zoom_meetings;
DROP POLICY IF EXISTS "Teachers can create meetings" ON zoom_meetings;
DROP POLICY IF EXISTS "Teachers can update their own meetings" ON zoom_meetings;
DROP POLICY IF EXISTS "Teachers can delete their own meetings" ON zoom_meetings;

-- Create simple, non-recursive policies
CREATE POLICY "Teachers can view their own meetings" ON zoom_meetings
    FOR SELECT USING (
        teacher_id = auth.uid() OR
        student_id = auth.uid()
    );

CREATE POLICY "Teachers can create meetings" ON zoom_meetings
    FOR INSERT WITH CHECK (teacher_id = auth.uid());

CREATE POLICY "Teachers can update their own meetings" ON zoom_meetings
    FOR UPDATE USING (teacher_id = auth.uid());

CREATE POLICY "Teachers can delete their own meetings" ON zoom_meetings
    FOR DELETE USING (teacher_id = auth.uid());

-- Re-enable RLS
ALTER TABLE zoom_meetings ENABLE ROW LEVEL SECURITY;

-- Add class_id column if it doesn't exist (safe version)
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
