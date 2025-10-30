-- Migration: Fix discussions RLS policies to include super_user access
-- Issue: Super users cannot create discussions due to missing super_user in policies
-- Date: 2025-10-30
-- 
-- Analysis: The discussions table was not updated when super_user role was added.
-- Other tables use has_elevated_privileges() helper function, but discussions still
-- use the old pattern of checking only for 'admin'. This migration brings discussions
-- in line with the established pattern used throughout the system.

-- ============================================
-- DISCUSSIONS TABLE - Update RLS policies to follow existing pattern
-- ============================================

-- Update Insert Policy: Add 'super_user' to the existing array check
-- Current policy uses get_current_user_role() = ANY (ARRAY['admin', 'teacher'])
-- We just need to add 'super_user' to the array
DROP POLICY IF EXISTS "Discussions: Insert Access Policy" ON public.discussions;
CREATE POLICY "Discussions: Insert Access Policy" 
ON public.discussions 
FOR INSERT 
TO authenticated 
WITH CHECK (
  public.get_current_user_role() = ANY (ARRAY['admin'::text, 'super_user'::text, 'teacher'::text])
);

-- Update Delete Policy: Add super_user to existing role check pattern
DROP POLICY IF EXISTS "Discussions: Delete Access Policy" ON public.discussions;
CREATE POLICY "Discussions: Delete Access Policy" 
ON public.discussions 
FOR DELETE 
TO authenticated 
USING (
  (
    SELECT role::text 
    FROM public.profiles 
    WHERE id = auth.uid()
  ) IN ('admin', 'super_user') 
  OR creator_id = auth.uid()
);

-- Update Update Policy: Add super_user to existing role check pattern
DROP POLICY IF EXISTS "Discussions: Update Access Policy" ON public.discussions;
CREATE POLICY "Discussions: Update Access Policy" 
ON public.discussions 
FOR UPDATE 
TO authenticated 
USING (
  (
    SELECT role::text 
    FROM public.profiles 
    WHERE id = auth.uid()
  ) IN ('admin', 'super_user') 
  OR creator_id = auth.uid()
) 
WITH CHECK (
  (
    SELECT role::text 
    FROM public.profiles 
    WHERE id = auth.uid()
  ) IN ('admin', 'super_user') 
  OR creator_id = auth.uid()
);

-- Update View Policy: Add super_user to the existing role check (preserving original logic)
DROP POLICY IF EXISTS "Discussions: View Access Policy" ON public.discussions;
CREATE POLICY "Discussions: View Access Policy" 
ON public.discussions 
FOR SELECT 
TO authenticated 
USING (
  creator_id = auth.uid() 
  OR (
    SELECT role::text 
    FROM public.profiles 
    WHERE id = auth.uid()
  ) IN ('admin', 'super_user')
  OR (
    course_id IS NOT NULL AND 
    EXISTS (
      SELECT 1 FROM public.course_members cm 
      WHERE cm.course_id = discussions.course_id 
      AND cm.user_id = auth.uid()
    )
  ) 
  OR (
    course_id IS NULL AND 
    EXISTS (
      SELECT 1 FROM public.discussion_participants dp 
      WHERE dp.discussion_id = discussions.id 
      AND dp.role::text = (
        SELECT p.role::text 
        FROM public.profiles p 
        WHERE p.id = auth.uid()
      )
    )
  )
);

-- Add comments explaining the updated policies
COMMENT ON POLICY "Discussions: Insert Access Policy" ON public.discussions IS 
'Allow admins, super_users, and teachers to create discussions. Updated to include super_user role.';

COMMENT ON POLICY "Discussions: Delete Access Policy" ON public.discussions IS 
'Allow users with elevated privileges (admin/super_user) and discussion creators to delete discussions.';

COMMENT ON POLICY "Discussions: Update Access Policy" ON public.discussions IS 
'Allow users with elevated privileges (admin/super_user) and discussion creators to update discussions.';

COMMENT ON POLICY "Discussions: View Access Policy" ON public.discussions IS 
'Allow viewing discussions based on elevated privileges, ownership, course membership, or participation.';
