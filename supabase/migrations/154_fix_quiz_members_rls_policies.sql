-- Migration: Fix Quiz Members RLS Policies
-- This migration fixes the infinite recursion issue in quiz_members RLS policies

-- Drop the problematic policies
DROP POLICY IF EXISTS "Users can view quiz members for accessible quizzes" ON public.quiz_members;
DROP POLICY IF EXISTS "Quiz authors and admins can manage quiz members" ON public.quiz_members;

-- Create simplified, non-recursive policies for quiz_members

-- Policy for SELECT: Users can view quiz members if they have access to the quiz
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

-- Policy for INSERT/UPDATE/DELETE: Only quiz authors and admins can manage members
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

-- Also update the standalone_quizzes RLS policy to be more specific
DROP POLICY IF EXISTS "Users can view published quizzes" ON public.standalone_quizzes;
CREATE POLICY "Users can view published quizzes" ON public.standalone_quizzes
  FOR SELECT USING (
    status = 'published' AND (
      -- Public quizzes
      visibility = 'public'
      OR
      -- Quiz author can see their own quizzes
      author_id = auth.uid()
      OR
      -- Quiz members can see quizzes they have access to
      EXISTS (
        SELECT 1 FROM public.quiz_members qm
        WHERE qm.quiz_id = id AND qm.user_id = auth.uid()
      )
      OR
      -- Teachers and admins can see all published quizzes
      EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role IN ('teacher', 'admin')
      )
    )
  );

-- Add a policy for quiz authors and admins to manage quizzes
DROP POLICY IF EXISTS "Quiz authors and admins can manage quizzes" ON public.standalone_quizzes;
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

-- Add a policy for quiz members to view quiz details
DROP POLICY IF EXISTS "Quiz members can view quiz details" ON public.standalone_quizzes;
CREATE POLICY "Quiz members can view quiz details" ON public.standalone_quizzes
  FOR SELECT USING (
    -- Quiz members can view quiz details
    EXISTS (
      SELECT 1 FROM public.quiz_members qm
      WHERE qm.quiz_id = id AND qm.user_id = auth.uid()
    )
  );
