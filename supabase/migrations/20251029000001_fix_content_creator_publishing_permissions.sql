-- Migration: Fix content creator publishing permissions
-- Allow content creators to publish courses directly like admins
-- Date: 2025-10-29

-- ============================================
-- COURSES TABLE - Update course update policy
-- ============================================

-- Drop and recreate the course update policy to allow content creators to publish
DROP POLICY IF EXISTS "Allow update based on role and status" ON public.courses;
CREATE POLICY "Allow update based on role and status" 
ON public.courses 
FOR UPDATE 
TO authenticated 
USING (true) 
WITH CHECK (
  -- Admins and super users can update anything
  has_elevated_privileges(auth.uid()) OR 
  -- Content creators can update their own courses and publish them directly
  (is_content_creator(auth.uid()) AND (
    author_id = auth.uid() OR 
    EXISTS (
      SELECT 1 FROM public.course_members cm 
      WHERE cm.course_id = courses.id 
      AND cm.user_id = auth.uid() 
      AND cm.role = 'teacher'::public.course_member_role
    )
  )) OR
  -- Teachers can only update draft courses (need review to publish)
  (EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.id = auth.uid() 
    AND p.role = 'teacher'
  ) AND (
    status = 'Draft' AND (
      author_id = auth.uid() OR 
      EXISTS (
        SELECT 1 FROM public.course_members cm 
        WHERE cm.course_id = courses.id 
        AND cm.user_id = auth.uid() 
        AND cm.role = 'teacher'::public.course_member_role
      )
    )
  ))
);

-- Add comment explaining the new permissions
COMMENT ON POLICY "Allow update based on role and status" ON public.courses IS 
'Updated course update policy:
- Admins/Super Users: Can update any course in any status
- Content Creators: Can update and publish their own courses directly (no review needed)
- Teachers: Can only update their own draft courses (must submit for review to publish)
- Students: Cannot update courses';

-- Migration completed successfully
-- Content creators can now publish courses directly without admin review
