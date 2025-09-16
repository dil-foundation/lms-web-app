-- Migration: Fix get_standalone_quiz_with_questions function to include members column
-- This fixes the PGRST204 error by ensuring the function returns the members column

-- Drop and recreate the function with the members column included
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
