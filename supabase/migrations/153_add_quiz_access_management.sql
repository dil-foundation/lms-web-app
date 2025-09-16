-- Migration: Add Quiz Access Management
-- This migration adds the ability to manage teacher and student access to standalone quizzes

-- Create quiz_members table to manage access to quizzes
CREATE TABLE IF NOT EXISTS public.quiz_members (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  quiz_id uuid NOT NULL REFERENCES public.standalone_quizzes(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('teacher', 'student')),
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(quiz_id, user_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_quiz_members_quiz_id ON public.quiz_members(quiz_id);
CREATE INDEX IF NOT EXISTS idx_quiz_members_user_id ON public.quiz_members(user_id);
CREATE INDEX IF NOT EXISTS idx_quiz_members_role ON public.quiz_members(role);

-- Enable RLS
ALTER TABLE public.quiz_members ENABLE ROW LEVEL SECURITY;

-- RLS Policies for quiz_members
-- Users can view quiz members for quizzes they have access to
DROP POLICY IF EXISTS "Users can view quiz members for accessible quizzes" ON public.quiz_members;
CREATE POLICY "Users can view quiz members for accessible quizzes" ON public.quiz_members
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.standalone_quizzes sq
      WHERE sq.id = quiz_members.quiz_id
      AND (
        -- Quiz author can see all members
        sq.author_id = auth.uid()
        OR
        -- Quiz members can see other members
        EXISTS (
          SELECT 1 FROM public.quiz_members qm
          WHERE qm.quiz_id = sq.id AND qm.user_id = auth.uid()
        )
        OR
        -- Teachers and admins can see all quiz members
        EXISTS (
          SELECT 1 FROM public.profiles
          WHERE id = auth.uid() AND role IN ('teacher', 'admin')
        )
      )
    )
  );

-- Quiz authors and admins can manage quiz members
DROP POLICY IF EXISTS "Quiz authors and admins can manage quiz members" ON public.quiz_members;
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

-- Create updated_at trigger for quiz_members
CREATE OR REPLACE FUNCTION public.update_quiz_members_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_quiz_members_updated_at ON public.quiz_members;
CREATE TRIGGER update_quiz_members_updated_at
  BEFORE UPDATE ON public.quiz_members
  FOR EACH ROW
  EXECUTE FUNCTION public.update_quiz_members_updated_at();

-- Function to get quiz with members
CREATE OR REPLACE FUNCTION public.get_quiz_with_members(input_quiz_id uuid)
RETURNS TABLE (
  id uuid,
  title text,
  description text,
  instructions text,
  time_limit_minutes integer,
  max_attempts integer,
  passing_score numeric,
  shuffle_questions boolean,
  shuffle_options boolean,
  show_correct_answers boolean,
  show_results_immediately boolean,
  allow_retake boolean,
  retry_settings jsonb,
  status text,
  tags text[],
  estimated_duration_minutes integer,
  author_id uuid,
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  published_at timestamp with time zone,
  members jsonb
) LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    sq.id,
    sq.title,
    sq.description,
    sq.instructions,
    sq.time_limit_minutes,
    sq.max_attempts,
    sq.passing_score,
    sq.shuffle_questions,
    sq.shuffle_options,
    sq.show_correct_answers,
    sq.show_results_immediately,
    sq.allow_retake,
    sq.retry_settings,
    sq.status,
    sq.tags,
    sq.estimated_duration_minutes,
    sq.author_id,
    sq.created_at,
    sq.updated_at,
    sq.published_at,
    COALESCE(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'id', qm.id,
            'user_id', qm.user_id,
            'role', qm.role,
            'created_at', qm.created_at,
            'profile', jsonb_build_object(
              'id', p.id,
              'first_name', p.first_name,
              'last_name', p.last_name,
              'email', p.email,
              'avatar_url', p.avatar_url
            )
          )
        )
        FROM public.quiz_members qm
        JOIN public.profiles p ON p.id = qm.user_id
        WHERE qm.quiz_id = sq.id
      ),
      '[]'::jsonb
    ) as members
  FROM public.standalone_quizzes sq
  WHERE sq.id = input_quiz_id;
END;
$$;

-- Function to add member to quiz
CREATE OR REPLACE FUNCTION public.add_quiz_member(
  input_quiz_id uuid,
  input_user_id uuid,
  input_role text
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  result jsonb;
BEGIN
  -- Check if user has permission to add members
  IF NOT EXISTS (
    SELECT 1 FROM public.standalone_quizzes sq
    WHERE sq.id = input_quiz_id
    AND (
      sq.author_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'admin'
      )
    )
  ) THEN
    RAISE EXCEPTION 'Insufficient permissions to add quiz members';
  END IF;

  -- Insert or update quiz member
  INSERT INTO public.quiz_members (quiz_id, user_id, role)
  VALUES (input_quiz_id, input_user_id, input_role)
  ON CONFLICT (quiz_id, user_id)
  DO UPDATE SET 
    role = input_role,
    updated_at = timezone('utc'::text, now())
  RETURNING jsonb_build_object(
    'id', id,
    'quiz_id', quiz_id,
    'user_id', user_id,
    'role', role,
    'created_at', created_at
  ) INTO result;

  RETURN result;
END;
$$;

-- Function to remove member from quiz
CREATE OR REPLACE FUNCTION public.remove_quiz_member(
  input_quiz_id uuid,
  input_user_id uuid
)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  -- Check if user has permission to remove members
  IF NOT EXISTS (
    SELECT 1 FROM public.standalone_quizzes sq
    WHERE sq.id = input_quiz_id
    AND (
      sq.author_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'admin'
      )
    )
  ) THEN
    RAISE EXCEPTION 'Insufficient permissions to remove quiz members';
  END IF;

  -- Remove quiz member
  DELETE FROM public.quiz_members
  WHERE quiz_id = input_quiz_id AND user_id = input_user_id;

  RETURN FOUND;
END;
$$;

-- Function to get user's accessible quizzes
CREATE OR REPLACE FUNCTION public.get_user_accessible_quizzes(input_user_id uuid)
RETURNS TABLE (
  id uuid,
  title text,
  description text,
  status text,
  author_id uuid,
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  published_at timestamp with time zone,
  role text
) LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    sq.id,
    sq.title,
    sq.description,
    sq.status,
    sq.author_id,
    sq.created_at,
    sq.updated_at,
    sq.published_at,
    COALESCE(qm.role, 'author'::text) as role
  FROM public.standalone_quizzes sq
  LEFT JOIN public.quiz_members qm ON qm.quiz_id = sq.id AND qm.user_id = input_user_id
  WHERE 
    -- User is the author
    sq.author_id = input_user_id
    OR
    -- User is a member of the quiz
    qm.user_id IS NOT NULL
    OR
    -- User is admin or teacher (can see all published quizzes)
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = input_user_id AND role IN ('admin', 'teacher')
    )
  ORDER BY sq.updated_at DESC;
END;
$$;

-- Update existing RLS policies for standalone_quizzes to consider quiz members
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

-- Update the get_standalone_quiz_with_questions function to include members
DROP FUNCTION IF EXISTS public.get_standalone_quiz_with_questions(uuid);

CREATE OR REPLACE FUNCTION public.get_standalone_quiz_with_questions(input_quiz_id uuid)
RETURNS TABLE (
  id uuid,
  title text,
  description text,
  instructions text,
  time_limit_minutes integer,
  max_attempts integer,
  passing_score numeric,
  shuffle_questions boolean,
  shuffle_options boolean,
  show_correct_answers boolean,
  show_results_immediately boolean,
  allow_retake boolean,
  retry_settings jsonb,
  status text,
  tags text[],
  estimated_duration_minutes integer,
  author_id uuid,
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  published_at timestamp with time zone,
  questions jsonb,
  members jsonb
) LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    sq.id,
    sq.title,
    sq.description,
    sq.instructions,
    sq.time_limit_minutes,
    sq.max_attempts,
    sq.passing_score,
    sq.shuffle_questions,
    sq.shuffle_options,
    sq.show_correct_answers,
    sq.show_results_immediately,
    sq.allow_retake,
    sq.retry_settings,
    sq.status,
    sq.tags,
    sq.estimated_duration_minutes,
    sq.author_id,
    sq.created_at,
    sq.updated_at,
    sq.published_at,
    COALESCE(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'id', sqq.id,
            'question_text', sqq.question_text,
            'question_type', sqq.question_type,
            'position', sqq.position,
            'points', sqq.points,
            'explanation', sqq.explanation,
            'math_expression', sqq.math_expression,
            'math_tolerance', sqq.math_tolerance,
            'math_hint', sqq.math_hint,
            'math_allow_drawing', sqq.math_allow_drawing,
            'is_required', sqq.is_required,
            'options', COALESCE(
              (
                SELECT jsonb_agg(
                  jsonb_build_object(
                    'id', sqo.id,
                    'option_text', sqo.option_text,
                    'is_correct', sqo.is_correct,
                    'position', sqo.position
                  ) ORDER BY sqo.position
                )
                FROM public.standalone_question_options sqo
                WHERE sqo.question_id = sqq.id
              ),
              '[]'::jsonb
            )
          ) ORDER BY sqq.position
        )
        FROM public.standalone_quiz_questions sqq
        WHERE sqq.quiz_id = sq.id
      ),
      '[]'::jsonb
    ) as questions,
    COALESCE(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'id', qm.id,
            'user_id', qm.user_id,
            'role', qm.role,
            'created_at', qm.created_at,
            'profile', jsonb_build_object(
              'id', p.id,
              'first_name', p.first_name,
              'last_name', p.last_name,
              'email', p.email,
              'avatar_url', p.avatar_url
            )
          )
        )
        FROM public.quiz_members qm
        JOIN public.profiles p ON p.id = qm.user_id
        WHERE qm.quiz_id = sq.id
      ),
      '[]'::jsonb
    ) as members
  FROM public.standalone_quizzes sq
  WHERE sq.id = input_quiz_id;
END;
$$;

-- Add comments for documentation
COMMENT ON TABLE public.quiz_members IS 'Manages teacher and student access to standalone quizzes';
COMMENT ON COLUMN public.quiz_members.quiz_id IS 'Reference to the standalone quiz';
COMMENT ON COLUMN public.quiz_members.user_id IS 'Reference to the user (teacher or student)';
COMMENT ON COLUMN public.quiz_members.role IS 'Role of the user: teacher or student';

COMMENT ON FUNCTION public.get_quiz_with_members(uuid) IS 'Retrieves a quiz with its members';
COMMENT ON FUNCTION public.add_quiz_member(uuid, uuid, text) IS 'Adds a member to a quiz';
COMMENT ON FUNCTION public.remove_quiz_member(uuid, uuid) IS 'Removes a member from a quiz';
COMMENT ON FUNCTION public.get_user_accessible_quizzes(uuid) IS 'Gets all quizzes accessible to a user';
