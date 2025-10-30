-- Migration: Add three new user roles to the system
-- Roles: content_creator, super_user, view_only
-- Date: 2025-10-28

-- Step 1: Add new values to the app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'content_creator';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'super_user';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'view_only';

-- Step 2: Create helper functions for the new roles

-- Function to check if user is a content creator
CREATE OR REPLACE FUNCTION public.is_content_creator(user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_role TEXT;
BEGIN
  SELECT role INTO user_role 
  FROM profiles 
  WHERE id = user_id;
  
  RETURN user_role = 'content_creator';
END;
$$;

COMMENT ON FUNCTION public.is_content_creator(uuid) IS 'Check if user has content_creator role';

-- Function to check if user is a super user
CREATE OR REPLACE FUNCTION public.is_super_user(user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_role TEXT;
BEGIN
  SELECT role INTO user_role 
  FROM profiles 
  WHERE id = user_id;
  
  RETURN user_role = 'super_user';
END;
$$;

COMMENT ON FUNCTION public.is_super_user(uuid) IS 'Check if user has super_user role';

-- Function to check if user is view only
CREATE OR REPLACE FUNCTION public.is_view_only(user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_role TEXT;
BEGIN
  SELECT role INTO user_role 
  FROM profiles 
  WHERE id = user_id;
  
  RETURN user_role = 'view_only';
END;
$$;

COMMENT ON FUNCTION public.is_view_only(uuid) IS 'Check if user has view_only role';

-- Function to check if user has elevated privileges (admin, super_user)
CREATE OR REPLACE FUNCTION public.has_elevated_privileges(user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_role TEXT;
BEGIN
  SELECT role INTO user_role 
  FROM profiles 
  WHERE id = user_id;
  
  RETURN user_role IN ('admin', 'super_user');
END;
$$;

COMMENT ON FUNCTION public.has_elevated_privileges(uuid) IS 'Check if user has admin or super_user role';

-- Function to check if user can modify content (admin, super_user, content_creator, teacher)
CREATE OR REPLACE FUNCTION public.can_modify_content(user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_role TEXT;
BEGIN
  SELECT role INTO user_role 
  FROM profiles 
  WHERE id = user_id;
  
  RETURN user_role IN ('admin', 'super_user', 'content_creator', 'teacher');
END;
$$;

COMMENT ON FUNCTION public.can_modify_content(uuid) IS 'Check if user has permission to modify content';

-- Step 3: Update existing is_admin_user function to include super_user
CREATE OR REPLACE FUNCTION public.is_admin_user(user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_role TEXT;
BEGIN
  SELECT role INTO user_role 
  FROM profiles 
  WHERE id = user_id;
  
  -- Super users have all admin privileges
  RETURN user_role IN ('admin', 'super_user');
END;
$$;

COMMENT ON FUNCTION public.is_admin_user(uuid) IS 'Check if user has admin or super_user role (full administrative access)';

-- Step 4: Update existing policies to support new roles

-- ============================================
-- COURSES TABLE - Update existing policies
-- ============================================

-- Drop and recreate "Allow insert for admins and teachers" to include content_creator
DROP POLICY IF EXISTS "Allow insert for admins and teachers" ON public.courses;
CREATE POLICY "Allow insert for admins and teachers" 
ON public.courses 
FOR INSERT 
TO authenticated 
WITH CHECK (
  can_modify_content(auth.uid())
);

-- Drop and recreate "Allow update based on role and status" to include content_creator and super_user
DROP POLICY IF EXISTS "Allow update based on role and status" ON public.courses;
CREATE POLICY "Allow update based on role and status" 
ON public.courses 
FOR UPDATE 
TO authenticated 
USING (true) 
WITH CHECK (
  has_elevated_privileges(auth.uid()) OR 
  can_modify_content(auth.uid()) AND (
    status = 'Draft' AND (
      author_id = auth.uid() OR 
      EXISTS (
        SELECT 1 FROM public.course_members cm 
        WHERE cm.course_id = courses.id 
        AND cm.user_id = auth.uid() 
        AND cm.role = 'teacher'::public.course_member_role
      )
    )
  )
);

-- Drop and recreate "Allow delete for authors and admins" - content_creators cannot delete
DROP POLICY IF EXISTS "Allow delete for authors and admins" ON public.courses;
CREATE POLICY "Allow delete for authors and admins" 
ON public.courses 
FOR DELETE 
TO authenticated 
USING (
  has_elevated_privileges(auth.uid()) OR 
  (author_id = auth.uid() AND NOT is_content_creator(auth.uid())) OR 
  (status = 'Draft' AND EXISTS (
    SELECT 1 FROM public.course_members cm 
    WHERE cm.course_id = courses.id 
    AND cm.user_id = auth.uid() 
    AND cm.role = 'teacher'::public.course_member_role
  ))
);

-- Drop and recreate "Allow view based on role and membership" to include view_only for published courses
DROP POLICY IF EXISTS "Allow view based on role and membership" ON public.courses;
CREATE POLICY "Allow view based on role and membership" 
ON public.courses 
FOR SELECT 
TO authenticated 
USING (
  has_elevated_privileges(auth.uid()) OR 
  can_modify_content(auth.uid()) OR 
  author_id = auth.uid() OR 
  (is_view_only(auth.uid()) AND status = 'Published') OR
  EXISTS (
    SELECT 1 FROM public.course_members cm 
    WHERE cm.course_id = courses.id 
    AND cm.user_id = auth.uid()
  )
);

-- ============================================
-- COURSE_MEMBERS TABLE - Update existing policies
-- ============================================

-- Drop and recreate "Allow management of course members" to include content_creator
DROP POLICY IF EXISTS "Allow management of course members" ON public.course_members;
CREATE POLICY "Allow management of course members" 
ON public.course_members 
TO authenticated 
USING (
  has_elevated_privileges(auth.uid()) OR 
  can_modify_content(auth.uid()) AND (
    public.get_course_author(course_id) = auth.uid() OR 
    public.is_teacher_for_course(course_id)
  )
) 
WITH CHECK (
  has_elevated_privileges(auth.uid()) OR 
  can_modify_content(auth.uid()) AND (
    public.get_course_author(course_id) = auth.uid() OR 
    public.is_teacher_for_course(course_id)
  )
);

-- Drop and recreate "Allow viewing of course members" to include view_only and content_creator
DROP POLICY IF EXISTS "Allow viewing of course members" ON public.course_members;
CREATE POLICY "Allow viewing of course members" 
ON public.course_members 
FOR SELECT 
TO authenticated 
USING (
  has_elevated_privileges(auth.uid()) OR 
  can_modify_content(auth.uid()) OR 
  is_view_only(auth.uid()) OR
  course_id IN (
    SELECT id FROM public.get_user_course_ids()
  )
);

-- ============================================
-- PROFILES TABLE - Update existing policies
-- ============================================

-- Drop and recreate "Allow users to update profiles based on role" to include super_user
DROP POLICY IF EXISTS "Allow users to update profiles based on role" ON public.profiles;
CREATE POLICY "Allow users to update profiles based on role" 
ON public.profiles 
FOR UPDATE 
TO authenticated 
USING (true) 
WITH CHECK (
  has_elevated_privileges(auth.uid()) OR 
  (public.get_current_user_role() = 'teacher' AND role = 'student'::public.app_role) OR 
  (public.get_current_user_role() = 'content_creator' AND role = 'student'::public.app_role) OR
  id = auth.uid()
);

-- Drop and recreate "Allow admins to delete profiles" to include super_user
DROP POLICY IF EXISTS "Allow admins to delete profiles" ON public.profiles;
CREATE POLICY "Allow admins to delete profiles" 
ON public.profiles 
FOR DELETE 
TO authenticated 
USING (
  has_elevated_privileges(auth.uid())
);

-- ============================================
-- BOARDS TABLE - Update existing policies
-- ============================================

-- Drop and recreate "Only admins can insert boards" to include super_user
DROP POLICY IF EXISTS "Only admins can insert boards" ON public.boards;
CREATE POLICY "Only admins can insert boards" 
ON public.boards 
FOR INSERT 
WITH CHECK (
  has_elevated_privileges(auth.uid())
);

-- Drop and recreate "Only admins can update boards" to include super_user
DROP POLICY IF EXISTS "Only admins can update boards" ON public.boards;
CREATE POLICY "Only admins can update boards" 
ON public.boards 
FOR UPDATE 
USING (
  has_elevated_privileges(auth.uid())
);

-- Drop and recreate "Only admins can delete boards" to include super_user
DROP POLICY IF EXISTS "Only admins can delete boards" ON public.boards;
CREATE POLICY "Only admins can delete boards" 
ON public.boards 
FOR DELETE 
USING (
  has_elevated_privileges(auth.uid())
);

-- ============================================
-- SCHOOLS TABLE - Update existing policies
-- ============================================

-- Drop and recreate "Only admins can insert schools" to include super_user
DROP POLICY IF EXISTS "Only admins can insert schools" ON public.schools;
CREATE POLICY "Only admins can insert schools" 
ON public.schools 
FOR INSERT 
WITH CHECK (
  has_elevated_privileges(auth.uid())
);

-- Drop and recreate "Only admins can update schools" to include super_user
DROP POLICY IF EXISTS "Only admins can update schools" ON public.schools;
CREATE POLICY "Only admins can update schools" 
ON public.schools 
FOR UPDATE 
USING (
  has_elevated_privileges(auth.uid())
);

-- Drop and recreate "Only admins can delete schools" to include super_user
DROP POLICY IF EXISTS "Only admins can delete schools" ON public.schools;
CREATE POLICY "Only admins can delete schools" 
ON public.schools 
FOR DELETE 
USING (
  has_elevated_privileges(auth.uid())
);

-- ============================================
-- CLASSES TABLE - Update existing policies
-- ============================================

-- Drop and recreate "Admins can manage all classes" to include super_user
DROP POLICY IF EXISTS "Admins can manage all classes" ON public.classes;
CREATE POLICY "Admins can manage all classes" 
ON public.classes 
USING (
  has_elevated_privileges(auth.uid())
) 
WITH CHECK (
  has_elevated_privileges(auth.uid())
);

-- Add new SELECT policy for view_only and content_creator to view classes
DROP POLICY IF EXISTS "Content creators and view only can view classes" ON public.classes;
CREATE POLICY "Content creators and view only can view classes" 
ON public.classes 
FOR SELECT 
USING (
  can_modify_content(auth.uid()) OR 
  is_view_only(auth.uid())
);

-- ============================================
-- ZOOM_MEETINGS TABLE - Update existing policies
-- ============================================

-- Add new policies for zoom_meetings (existing policies remain, these are additional)
DROP POLICY IF EXISTS "View only users can view their meetings" ON public.zoom_meetings;
CREATE POLICY "View only users can view their meetings" 
ON public.zoom_meetings 
FOR SELECT 
USING (
  is_view_only(auth.uid()) AND (
    student_id = auth.uid() OR 
    participant_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Content creators can view meetings" ON public.zoom_meetings;
CREATE POLICY "Content creators can view meetings" 
ON public.zoom_meetings 
FOR SELECT 
USING (
  can_modify_content(auth.uid())
);

DROP POLICY IF EXISTS "Super users can insert meetings" ON public.zoom_meetings;
CREATE POLICY "Super users can insert meetings" 
ON public.zoom_meetings 
FOR INSERT 
WITH CHECK (
  has_elevated_privileges(auth.uid())
);

DROP POLICY IF EXISTS "Super users can update meetings" ON public.zoom_meetings;
CREATE POLICY "Super users can update meetings" 
ON public.zoom_meetings 
FOR UPDATE 
USING (
  has_elevated_privileges(auth.uid())
)
WITH CHECK (
  has_elevated_privileges(auth.uid())
);

DROP POLICY IF EXISTS "Super users can delete meetings" ON public.zoom_meetings;
CREATE POLICY "Super users can delete meetings" 
ON public.zoom_meetings 
FOR DELETE 
USING (
  has_elevated_privileges(auth.uid())
);

-- ============================================
-- NOTIFICATIONS TABLE - Add new policies
-- ============================================

-- Super users can view all notifications
DROP POLICY IF EXISTS "Super users can view all notifications" ON public.notifications;
CREATE POLICY "Super users can view all notifications" 
ON public.notifications 
FOR SELECT 
USING (
  is_super_user(auth.uid())
);

-- ============================================
-- INTEGRATIONS TABLE - Update existing policies
-- ============================================

-- Update the admin integration policies to include super_user
DROP POLICY IF EXISTS "Admin users can view all integrations" ON public.integrations;
CREATE POLICY "Admin users can view all integrations" 
ON public.integrations
FOR SELECT
TO authenticated
USING (
  has_elevated_privileges(auth.uid())
);

DROP POLICY IF EXISTS "Admin users can update integrations" ON public.integrations;
CREATE POLICY "Admin users can update integrations" 
ON public.integrations
FOR UPDATE
TO authenticated
USING (
  has_elevated_privileges(auth.uid())
)
WITH CHECK (
  has_elevated_privileges(auth.uid())
);

DROP POLICY IF EXISTS "Admin users can insert integrations" ON public.integrations;
CREATE POLICY "Admin users can insert integrations" 
ON public.integrations
FOR INSERT
TO authenticated
WITH CHECK (
  has_elevated_privileges(auth.uid())
);

DROP POLICY IF EXISTS "Admin users can delete integrations" ON public.integrations;
CREATE POLICY "Admin users can delete integrations" 
ON public.integrations
FOR DELETE
TO authenticated
USING (
  has_elevated_privileges(auth.uid())
);

-- ============================================
-- ACCESS_LOGS TABLE - Add new policies
-- ============================================

-- Super users can view and update access logs
DROP POLICY IF EXISTS "Super users can view access logs" ON public.access_logs;
CREATE POLICY "Super users can view access logs" 
ON public.access_logs 
FOR SELECT 
USING (
  is_super_user(auth.uid())
);

DROP POLICY IF EXISTS "Super users can update access logs" ON public.access_logs;
CREATE POLICY "Super users can update access logs" 
ON public.access_logs 
FOR UPDATE 
USING (
  is_super_user(auth.uid())
)
WITH CHECK (
  is_super_user(auth.uid())
);

-- ============================================
-- USER_SESSIONS TABLE - Add new policy
-- ============================================

-- Super users can view all user sessions
DROP POLICY IF EXISTS "Super users can view all user sessions" ON public.user_sessions;
CREATE POLICY "Super users can view all user sessions" 
ON public.user_sessions 
FOR SELECT 
USING (
  is_super_user(auth.uid())
);

-- ============================================
-- Add comment explaining the role hierarchy
-- ============================================

COMMENT ON TYPE public.app_role IS 'User roles in the system:
- student: Can enroll in courses and submit assignments
- teacher: Can create and manage courses, view student progress
- admin: Full administrative access to the system
- content_creator: Can create, view, and update course content (similar to teacher but focused on content)
- super_user: Has all admin privileges plus additional system-level access
- view_only: Read-only access to published course content and organizational structure';

-- Migration completed successfully
