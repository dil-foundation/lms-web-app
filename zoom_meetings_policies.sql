-- ============================================================================
-- Row Level Security (RLS) Policies for zoom_meetings table
-- ============================================================================
-- This script creates all RLS policies for the public.zoom_meetings table
-- Run this script in your production database after ensuring RLS is enabled
-- ============================================================================

-- Enable Row Level Security on the zoom_meetings table
ALTER TABLE public.zoom_meetings ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- DROP EXISTING POLICIES (if they exist)
-- ============================================================================
DROP POLICY IF EXISTS "Teachers can delete their meetings" ON public.zoom_meetings;
DROP POLICY IF EXISTS "Teachers can insert meetings" ON public.zoom_meetings;
DROP POLICY IF EXISTS "Teachers can update their meetings" ON public.zoom_meetings;
DROP POLICY IF EXISTS "Users can create meetings" ON public.zoom_meetings;
DROP POLICY IF EXISTS "Users can delete their meetings" ON public.zoom_meetings;
DROP POLICY IF EXISTS "Users can update their meetings" ON public.zoom_meetings;
DROP POLICY IF EXISTS "Users can view meetings they are part of" ON public.zoom_meetings;
DROP POLICY IF EXISTS "zoom_meetings_delete_policy" ON public.zoom_meetings;
DROP POLICY IF EXISTS "zoom_meetings_insert_policy" ON public.zoom_meetings;
DROP POLICY IF EXISTS "zoom_meetings_select_policy" ON public.zoom_meetings;
DROP POLICY IF EXISTS "zoom_meetings_update_policy" ON public.zoom_meetings;

-- ============================================================================
-- SELECT POLICIES
-- ============================================================================

-- Policy: Users can view meetings they are part of
-- Allows teachers, students, and participants to view meetings they're associated with
CREATE POLICY "Users can view meetings they are part of"
ON public.zoom_meetings
AS PERMISSIVE
FOR SELECT
TO public
USING (
  (teacher_id = auth.uid()) 
  OR (student_id = auth.uid()) 
  OR (
    (participant_id = auth.uid()) 
    OR (
      (meeting_type = 'class'::text) 
      AND (class_id IS NOT NULL) 
      AND (
        EXISTS (
          SELECT 1
          FROM class_students
          WHERE (class_students.class_id = zoom_meetings.class_id) 
            AND (class_students.student_id = auth.uid()) 
            AND (class_students.enrollment_status = 'active'::text)
        )
      )
    )
  )
);

-- Policy: zoom_meetings_select_policy (for authenticated users)
-- Simplified SELECT policy for authenticated users
CREATE POLICY "zoom_meetings_select_policy"
ON public.zoom_meetings
AS PERMISSIVE
FOR SELECT
TO authenticated
USING (
  (teacher_id = auth.uid()) 
  OR (student_id = auth.uid())
);

-- ============================================================================
-- INSERT POLICIES
-- ============================================================================

-- Policy: Teachers can insert meetings
-- Allows public users to insert if they are the teacher
CREATE POLICY "Teachers can insert meetings"
ON public.zoom_meetings
AS PERMISSIVE
FOR INSERT
TO public
WITH CHECK (teacher_id = auth.uid());

-- Policy: Users can create meetings
-- Allows public users to create meetings if they are the teacher
CREATE POLICY "Users can create meetings"
ON public.zoom_meetings
AS PERMISSIVE
FOR INSERT
TO public
WITH CHECK (teacher_id = auth.uid());

-- Policy: zoom_meetings_insert_policy (for authenticated users)
-- Allows authenticated users to insert meetings if they are the teacher
CREATE POLICY "zoom_meetings_insert_policy"
ON public.zoom_meetings
AS PERMISSIVE
FOR INSERT
TO authenticated
WITH CHECK (teacher_id = auth.uid());

-- ============================================================================
-- UPDATE POLICIES
-- ============================================================================

-- Policy: Teachers can update their meetings
-- Allows public users to update meetings they created
CREATE POLICY "Teachers can update their meetings"
ON public.zoom_meetings
AS PERMISSIVE
FOR UPDATE
TO public
USING (teacher_id = auth.uid());

-- Policy: Users can update their meetings
-- Allows public users to update meetings with both USING and WITH CHECK
CREATE POLICY "Users can update their meetings"
ON public.zoom_meetings
AS PERMISSIVE
FOR UPDATE
TO public
USING (teacher_id = auth.uid())
WITH CHECK (teacher_id = auth.uid());

-- Policy: zoom_meetings_update_policy (for authenticated users)
-- Allows authenticated users to update meetings they created
CREATE POLICY "zoom_meetings_update_policy"
ON public.zoom_meetings
AS PERMISSIVE
FOR UPDATE
TO authenticated
USING (teacher_id = auth.uid())
WITH CHECK (teacher_id = auth.uid());

-- ============================================================================
-- DELETE POLICIES
-- ============================================================================

-- Policy: Teachers can delete their meetings
-- Allows public users to delete meetings they created
CREATE POLICY "Teachers can delete their meetings"
ON public.zoom_meetings
AS PERMISSIVE
FOR DELETE
TO public
USING (teacher_id = auth.uid());

-- Policy: Users can delete their meetings
-- Allows public users to delete meetings they created
CREATE POLICY "Users can delete their meetings"
ON public.zoom_meetings
AS PERMISSIVE
FOR DELETE
TO public
USING (teacher_id = auth.uid());

-- Policy: zoom_meetings_delete_policy (for authenticated users)
-- Allows authenticated users to delete meetings they created
CREATE POLICY "zoom_meetings_delete_policy"
ON public.zoom_meetings
AS PERMISSIVE
FOR DELETE
TO authenticated
USING (teacher_id = auth.uid());

-- ============================================================================
-- END OF SCRIPT
-- ============================================================================
-- Note: You may want to review and remove duplicate policies based on your needs
-- The script includes both public and authenticated role policies
-- Consider keeping only the ones that match your security requirements
-- ============================================================================

