-- Fix type mismatches in database functions
-- This should resolve the 42804 error

-- Fix get_user_quiz_attempts function with correct types
DROP FUNCTION IF EXISTS public.get_user_quiz_attempts(uuid, uuid);

CREATE OR REPLACE FUNCTION public.get_user_quiz_attempts(input_user_id uuid, input_quiz_id uuid DEFAULT NULL)
RETURNS TABLE (
  id uuid,
  quiz_id uuid,
  user_id uuid,
  attempt_number integer,
  answers jsonb,
  results jsonb,
  score numeric(5,2),
  time_taken_minutes integer,
  submitted_at timestamp with time zone,
  retry_reason text,
  teacher_approval_required boolean,
  teacher_approved boolean,
  teacher_approved_by uuid,
  teacher_approved_at timestamp with time zone,
  teacher_approval_notes text,
  study_materials_completed boolean,
  study_materials_completed_at timestamp with time zone,
  ip_address inet,
  user_agent text,
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  started_at timestamp with time zone
) LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    sqa.id,
    sqa.quiz_id,
    sqa.user_id,
    sqa.attempt_number,
    sqa.answers,
    sqa.results,
    sqa.score,
    sqa.time_taken_minutes,
    sqa.submitted_at,
    sqa.retry_reason,
    sqa.teacher_approval_required,
    sqa.teacher_approved,
    sqa.teacher_approved_by,
    sqa.teacher_approved_at,
    sqa.teacher_approval_notes,
    sqa.study_materials_completed,
    sqa.study_materials_completed_at,
    sqa.ip_address,
    sqa.user_agent,
    sqa.created_at,
    sqa.updated_at,
    sqa.created_at as started_at
  FROM public.standalone_quiz_attempts sqa
  WHERE 
    sqa.user_id = input_user_id
    AND (input_quiz_id IS NULL OR sqa.quiz_id = input_quiz_id)
  ORDER BY sqa.created_at DESC;
END;
$$;

-- Fix get_standalone_quiz_with_questions function with correct types
DROP FUNCTION IF EXISTS public.get_standalone_quiz_with_questions(uuid);

CREATE OR REPLACE FUNCTION public.get_standalone_quiz_with_questions(input_quiz_id uuid)
RETURNS TABLE (
  id uuid,
  title text,
  description text,
  instructions text,
  time_limit_minutes integer,
  max_attempts integer,
  passing_score numeric(5,2),
  shuffle_questions boolean,
  shuffle_options boolean,
  show_correct_answers boolean,
  show_results_immediately boolean,
  allow_retake boolean,
  retry_settings jsonb,
  status text,
  visibility text,
  tags text[],
  difficulty_level text,
  estimated_duration_minutes integer,
  author_id uuid,
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  published_at timestamp with time zone,
  questions jsonb
) LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  quiz_record RECORD;
  questions_json jsonb;
BEGIN
  -- Get the quiz record
  SELECT * INTO quiz_record
  FROM public.standalone_quizzes
  WHERE id = input_quiz_id;
  
  -- If quiz not found, return empty result
  IF NOT FOUND THEN
    RETURN;
  END IF;
  
  -- Get questions with options as JSON
  SELECT COALESCE(
    json_agg(
      json_build_object(
        'id', q.id,
        'quiz_id', q.quiz_id,
        'question_text', q.question_text,
        'question_type', q.question_type,
        'position', q.position,
        'points', q.points,
        'explanation', q.explanation,
        'math_expression', q.math_expression,
        'math_tolerance', q.math_tolerance,
        'math_hint', q.math_hint,
        'math_allow_drawing', q.math_allow_drawing,
        'is_required', q.is_required,
        'created_at', q.created_at,
        'updated_at', q.updated_at,
        'options', COALESCE(
          (
            SELECT json_agg(
              json_build_object(
                'id', o.id,
                'question_id', o.question_id,
                'option_text', o.option_text,
                'is_correct', o.is_correct,
                'position', o.position,
                'created_at', o.created_at
              )
            )
            FROM public.standalone_question_options o
            WHERE o.question_id = q.id
            ORDER BY o.position
          ),
          '[]'::json
        )
      )
    ),
    '[]'::json
  ) INTO questions_json
  FROM public.standalone_quiz_questions q
  WHERE q.quiz_id = input_quiz_id
  ORDER BY q.position;
  
  -- Return the quiz with questions
  RETURN QUERY
  SELECT 
    quiz_record.id,
    quiz_record.title,
    quiz_record.description,
    quiz_record.instructions,
    quiz_record.time_limit_minutes,
    quiz_record.max_attempts,
    quiz_record.passing_score,
    quiz_record.shuffle_questions,
    quiz_record.shuffle_options,
    quiz_record.show_correct_answers,
    quiz_record.show_results_immediately,
    quiz_record.allow_retake,
    quiz_record.retry_settings,
    quiz_record.status,
    quiz_record.visibility,
    quiz_record.tags,
    quiz_record.difficulty_level,
    quiz_record.estimated_duration_minutes,
    quiz_record.author_id,
    quiz_record.created_at,
    quiz_record.updated_at,
    quiz_record.published_at,
    questions_json;
END;
$$;

COMMENT ON FUNCTION public.get_user_quiz_attempts(uuid, uuid) IS 'Gets user quiz attempts with correct types';
COMMENT ON FUNCTION public.get_standalone_quiz_with_questions(uuid) IS 'Gets a quiz with its questions and options with correct types';
