-- Migration: Simplified RLS Policies (No Cross-Table References)
-- This migration creates the simplest possible policies to avoid recursion

-- Drop ALL existing policies
DROP POLICY IF EXISTS "standalone_quizzes_select_policy" ON public.standalone_quizzes;
DROP POLICY IF EXISTS "standalone_quizzes_all_policy" ON public.standalone_quizzes;
DROP POLICY IF EXISTS "Users can view accessible quizzes" ON public.standalone_quizzes;
DROP POLICY IF EXISTS "Quiz authors and admins can manage quizzes" ON public.standalone_quizzes;
DROP POLICY IF EXISTS "Users can view published quizzes" ON public.standalone_quizzes;
DROP POLICY IF EXISTS "Quiz members can view quiz details" ON public.standalone_quizzes;
DROP POLICY IF EXISTS "Teachers and Admins can manage all quizzes" ON public.standalone_quizzes;
DROP POLICY IF EXISTS "Users can view their own quizzes" ON public.standalone_quizzes;
DROP POLICY IF EXISTS "Authors can manage their own quizzes" ON public.standalone_quizzes;
DROP POLICY IF EXISTS "Teachers and Admins can view all quizzes" ON public.standalone_quizzes;

DROP POLICY IF EXISTS "quiz_members_select_policy" ON public.quiz_members;
DROP POLICY IF EXISTS "quiz_members_all_policy" ON public.quiz_members;
DROP POLICY IF EXISTS "quiz_authors_manage_members" ON public.quiz_members;
DROP POLICY IF EXISTS "Users can view quiz members for accessible quizzes" ON public.quiz_members;
DROP POLICY IF EXISTS "Quiz authors and admins can manage quiz members" ON public.quiz_members;

-- Create the simplest possible policies for standalone_quizzes
-- NO references to quiz_members table to avoid recursion

CREATE POLICY "standalone_quizzes_select" ON public.standalone_quizzes
  FOR SELECT USING (
    -- Author can see their own quizzes
    author_id = auth.uid()
    OR
    -- Published public quizzes
    (status = 'published' AND visibility = 'public')
    OR
    -- Teachers and admins can see all quizzes
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('teacher', 'admin')
    )
  );

CREATE POLICY "standalone_quizzes_all" ON public.standalone_quizzes
  FOR ALL USING (
    -- Author can manage their own quizzes
    author_id = auth.uid()
    OR
    -- Admins can manage all quizzes
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

-- Create simple policies for quiz_members
-- NO references to standalone_quizzes table to avoid recursion

CREATE POLICY "quiz_members_select" ON public.quiz_members
  FOR SELECT USING (
    -- User can see their own membership
    user_id = auth.uid()
    OR
    -- Teachers and admins can see all memberships
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('teacher', 'admin')
    )
  );

CREATE POLICY "quiz_members_all" ON public.quiz_members
  FOR ALL USING (
    -- Admins can manage all memberships
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

-- Note: Quiz member access will be handled at the application level
-- rather than through RLS policies to avoid recursion issues
