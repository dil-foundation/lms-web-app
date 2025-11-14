-- Migration: Fix content creator course access policy
-- Content creators should only see courses they authored, not all courses
-- Date: 2025-10-30

-- ============================================
-- COURSES TABLE - Fix SELECT policy for content creators
-- ============================================

-- Drop the current policy that gives content creators too much access
DROP POLICY IF EXISTS "Allow view based on role and membership" ON public.courses;

-- Create new policy with proper content creator restrictions
CREATE POLICY "Allow view based on role and membership" 
ON public.courses 
FOR SELECT 
TO authenticated 
USING (
  -- Admins and super users can see all courses
  has_elevated_privileges(auth.uid()) OR
  -- Content creators can only see courses they authored  
  (is_content_creator(auth.uid()) AND author_id = auth.uid()) OR
  -- Teachers can see courses they authored or are members of
  (EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.id = auth.uid() 
    AND p.role = 'teacher'
  ) AND (
    author_id = auth.uid() OR 
    EXISTS (
      SELECT 1 FROM public.course_members cm 
      WHERE cm.course_id = courses.id 
      AND cm.user_id = auth.uid()
    )
  )) OR
  -- View-only users can see published courses
  (is_view_only(auth.uid()) AND status = 'Published') OR
  -- Students can see courses they're enrolled in
  (EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.id = auth.uid() 
    AND p.role = 'student'
  ) AND EXISTS (
    SELECT 1 FROM public.course_members cm 
    WHERE cm.course_id = courses.id 
    AND cm.user_id = auth.uid()
  ))
);

-- Add comment explaining the corrected permissions
COMMENT ON POLICY "Allow view based on role and membership" ON public.courses IS 
'Updated course SELECT policy with proper role-based access:
- Admins/Super Users: Can view all courses
- Content Creators: Can only view courses they authored (author_id = auth.uid())
- Teachers: Can view courses they authored or are members of
- View Only: Can view published courses only
- Students: Can view courses they are enrolled in';

-- Migration completed successfully
-- Content creators will now only see courses they authored
