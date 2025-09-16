-- Migration: Fix Standalone Quizzes RLS Policies
-- This migration fixes the infinite recursion issue in standalone_quizzes RLS policies

-- Drop all existing policies on standalone_quizzes to start fresh
DROP POLICY IF EXISTS "Users can view published quizzes" ON public.standalone_quizzes;
DROP POLICY IF EXISTS "Quiz authors and admins can manage quizzes" ON public.standalone_quizzes;
DROP POLICY IF EXISTS "Quiz members can view quiz details" ON public.standalone_quizzes;
DROP POLICY IF EXISTS "Teachers and Admins can manage all quizzes" ON public.standalone_quizzes;
DROP POLICY IF EXISTS "Users can view their own quizzes" ON public.standalone_quizzes;

-- Create a single, comprehensive SELECT policy for standalone_quizzes
CREATE POLICY "Users can view accessible quizzes" ON public.standalone_quizzes
  FOR SELECT USING (
    -- Quiz author can see their own quizzes (any status)
    author_id = auth.uid()
    OR
    -- Published quizzes with public visibility
    (status = 'published' AND visibility = 'public')
    OR
    -- Quiz members can see quizzes they have access to (any status)
    EXISTS (
      SELECT 1 FROM public.quiz_members qm
      WHERE qm.quiz_id = id AND qm.user_id = auth.uid()
    )
    OR
    -- Teachers and admins can see all quizzes
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('teacher', 'admin')
    )
  );

-- Create a single, comprehensive ALL policy for standalone_quizzes
CREATE POLICY "Quiz authors and admins can manage quizzes" ON public.standalone_quizzes
  FOR ALL USING (
    -- Quiz author can manage their own quizzes
    author_id = auth.uid()
    OR
    -- Admins can manage all quizzes
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Also ensure quiz_members policies are still correct (re-apply them to be safe)
DROP POLICY IF EXISTS "Users can view quiz members for accessible quizzes" ON public.quiz_members;
DROP POLICY IF EXISTS "Quiz authors and admins can manage quiz members" ON public.quiz_members;

-- Recreate quiz_members policies
CREATE POLICY "Users can view quiz members for accessible quizzes" ON public.quiz_members
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.standalone_quizzes sq
      WHERE sq.id = quiz_members.quiz_id
      AND (
        -- Quiz author can see all members
        sq.author_id = auth.uid()
        OR
        -- User is a member of this quiz
        quiz_members.user_id = auth.uid()
        OR
        -- Teachers and admins can see all quiz members
        EXISTS (
          SELECT 1 FROM public.profiles
          WHERE id = auth.uid() AND role IN ('teacher', 'admin')
        )
      )
    )
  );

CREATE POLICY "Quiz authors and admins can manage quiz members" ON public.quiz_members
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.standalone_quizzes sq
      WHERE sq.id = quiz_members.quiz_id
      AND (
        -- Quiz author can manage members
        sq.author_id = auth.uid()
        OR
        -- Admins can manage all quiz members
        EXISTS (
          SELECT 1 FROM public.profiles
          WHERE id = auth.uid() AND role = 'admin'
        )
      )
    )
  );
