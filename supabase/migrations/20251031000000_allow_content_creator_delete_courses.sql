-- Migration: Allow content creators to delete courses they created
-- Content creators should be able to delete courses they authored
-- Date: 2025-10-31

-- ============================================
-- COURSES TABLE - Update DELETE policy
-- ============================================

-- Drop the existing delete policy that excludes content creators
DROP POLICY IF EXISTS "Allow delete for authors and admins" ON public.courses;

-- Create new policy that allows content creators to delete courses they authored
CREATE POLICY "Allow delete for authors and admins" 
ON public.courses 
FOR DELETE 
TO authenticated 
USING (
  -- Admins and super users can delete any course
  has_elevated_privileges(auth.uid()) OR 
  -- Content creators can delete courses they authored (any status)
  (is_content_creator(auth.uid()) AND author_id = auth.uid()) OR
  -- Teachers (non-content-creators) can delete courses they authored (any status)
  -- This maintains backward compatibility with the original policy
  (author_id = auth.uid() AND NOT is_content_creator(auth.uid())) OR
  -- Teachers can delete draft courses where they are course members with teacher role
  (status = 'Draft' AND EXISTS (
    SELECT 1 FROM public.course_members cm 
    WHERE cm.course_id = courses.id 
    AND cm.user_id = auth.uid() 
    AND cm.role = 'teacher'::public.course_member_role
  ))
);

-- Add comment explaining the updated permissions
COMMENT ON POLICY "Allow delete for authors and admins" ON public.courses IS 
'Updated course DELETE policy:
- Admins/Super Users: Can delete any course
- Content Creators: Can delete courses they authored (author_id = auth.uid()), any status
- Teachers: Can delete courses they authored (any status) or draft courses where they are course members
- Students: Cannot delete courses';

-- Migration completed successfully
-- Content creators can now delete courses they created

