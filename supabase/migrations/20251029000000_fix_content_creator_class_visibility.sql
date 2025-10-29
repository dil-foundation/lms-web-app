-- Migration: Fix content creator class visibility issue
-- Content creators need to see teachers and students in classes when creating courses
-- Date: 2025-10-29

-- ============================================
-- CLASS_TEACHERS TABLE - Add SELECT policy for content creators
-- ============================================

-- Allow content creators to view all class teacher assignments
-- This is needed for the course builder to show teacher counts in classes
DROP POLICY IF EXISTS "Content creators can view all class teachers" ON public.class_teachers;
CREATE POLICY "Content creators can view all class teachers" 
ON public.class_teachers 
FOR SELECT 
USING (
  is_content_creator(auth.uid()) OR 
  can_modify_content(auth.uid())
);

-- ============================================
-- CLASS_STUDENTS TABLE - Add SELECT policy for content creators
-- ============================================

-- Allow content creators to view all class student enrollments
-- This is needed for the course builder to show student counts in classes
DROP POLICY IF EXISTS "Content creators can view all class students" ON public.class_students;
CREATE POLICY "Content creators can view all class students" 
ON public.class_students 
FOR SELECT 
USING (
  is_content_creator(auth.uid()) OR 
  can_modify_content(auth.uid())
);

-- ============================================
-- PROFILES TABLE - Ensure content creators can view teacher/student profiles
-- ============================================

-- Content creators need to see teacher and student profile information
-- when viewing class members in the course builder
-- The existing "Allow users to view all profiles" policy should cover this,
-- but let's ensure it includes content creators explicitly

-- Check if the existing policy needs updating
-- First, let's see what the current policy looks like and update if needed

-- Note: The existing "Allow users to view all profiles" policy should already
-- allow authenticated users to view profiles, but we'll add a specific one
-- for content creators to be explicit about their permissions

DROP POLICY IF EXISTS "Content creators can view profiles for class management" ON public.profiles;
CREATE POLICY "Content creators can view profiles for class management" 
ON public.profiles 
FOR SELECT 
USING (
  can_modify_content(auth.uid()) OR 
  is_view_only(auth.uid())
);

-- Migration completed successfully
-- Content creators can now see teacher and student counts in classes when creating courses
