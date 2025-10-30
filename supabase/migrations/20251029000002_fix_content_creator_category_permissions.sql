-- Migration: Fix content creator course category permissions
-- Allow content creators to manage course categories like admins
-- Date: 2025-10-29

-- ============================================
-- COURSE_CATEGORIES TABLE - Update management policy
-- ============================================

-- Drop the old admin-only policy
DROP POLICY IF EXISTS "Admins can manage course categories" ON public.course_categories;

-- Create new policy that includes content creators and super users
CREATE POLICY "Content creators and admins can manage course categories" 
ON public.course_categories 
TO authenticated 
USING (
  -- Allow admins, super users, and content creators to manage categories
  has_elevated_privileges(auth.uid()) OR 
  is_content_creator(auth.uid())
) 
WITH CHECK (
  -- Same permissions for INSERT/UPDATE
  has_elevated_privileges(auth.uid()) OR 
  is_content_creator(auth.uid())
);

-- Add comment explaining the new permissions
COMMENT ON POLICY "Content creators and admins can manage course categories" ON public.course_categories IS 
'Updated course categories management policy:
- Admins/Super Users: Can create, update, and delete course categories
- Content Creators: Can create, update, and delete course categories (needed for course organization)
- Teachers/Students: Can only view categories (read-only access)';

-- Migration completed successfully
-- Content creators can now create and manage course categories
