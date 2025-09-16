-- Migration: Complete RLS Policy Cleanup
-- This migration completely removes all existing policies and recreates them cleanly

-- First, let's see what policies exist and remove them all
-- Drop ALL possible policies on standalone_quizzes
DROP POLICY IF EXISTS "Users can view accessible quizzes" ON public.standalone_quizzes;
DROP POLICY IF EXISTS "Quiz authors and admins can manage quizzes" ON public.standalone_quizzes;
DROP POLICY IF EXISTS "Users can view published quizzes" ON public.standalone_quizzes;
DROP POLICY IF EXISTS "Quiz members can view quiz details" ON public.standalone_quizzes;
DROP POLICY IF EXISTS "Teachers and Admins can manage all quizzes" ON public.standalone_quizzes;
DROP POLICY IF EXISTS "Users can view their own quizzes" ON public.standalone_quizzes;
DROP POLICY IF EXISTS "Authors can manage their own quizzes" ON public.standalone_quizzes;
DROP POLICY IF EXISTS "Teachers and Admins can view all quizzes" ON public.standalone_quizzes;

-- Drop ALL possible policies on quiz_members
DROP POLICY IF EXISTS "Users can view quiz members for accessible quizzes" ON public.quiz_members;
DROP POLICY IF EXISTS "Quiz authors and admins can manage quiz members" ON public.quiz_members;

-- Now create simple, non-recursive policies

-- For standalone_quizzes: Simple policies without complex subqueries
CREATE POLICY "standalone_quizzes_select_policy" ON public.standalone_quizzes
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

CREATE POLICY "standalone_quizzes_all_policy" ON public.standalone_quizzes
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

-- For quiz_members: Simple policies without referencing standalone_quizzes
CREATE POLICY "quiz_members_select_policy" ON public.quiz_members
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

CREATE POLICY "quiz_members_all_policy" ON public.quiz_members
  FOR ALL USING (
    -- Admins can manage all memberships
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

-- Add a separate policy for quiz authors to manage members
-- This is more specific and avoids recursion
CREATE POLICY "quiz_authors_manage_members" ON public.quiz_members
  FOR ALL USING (
    -- Quiz author can manage members of their own quizzes
    EXISTS (
      SELECT 1 FROM public.standalone_quizzes sq
      WHERE sq.id = quiz_members.quiz_id 
      AND sq.author_id = auth.uid()
    )
  );
