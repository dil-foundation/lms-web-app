-- Fix ambiguous column reference in get_standalone_quiz_with_questions function
-- Simplified approach to avoid column reference ambiguity

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
  -- Get the quiz record with explicit table alias
  SELECT * INTO quiz_record
  FROM public.standalone_quizzes sq
  WHERE sq.id = input_quiz_id;
  
  -- If quiz not found, return empty result
  IF NOT FOUND THEN
    RETURN;
  END IF;
  
  -- Get questions with options as JSON using a simpler approach
  WITH question_data AS (
    SELECT 
      q.id as question_id,
      q.quiz_id,
      q.question_text,
      q.question_type,
      q.position,
      q.points::numeric as points,
      q.explanation,
      q.math_expression,
      q.math_tolerance::numeric as math_tolerance,
      q.math_hint,
      q.math_allow_drawing,
      q.is_required,
      q.created_at,
      q.updated_at,
      COALESCE(
        (
          SELECT json_agg(
            json_build_object(
              'id', opt.id,
              'question_id', opt.question_id,
              'option_text', opt.option_text,
              'is_correct', opt.is_correct,
              'position', opt.position,
              'created_at', opt.created_at
            )
          )
          FROM public.standalone_question_options opt
          WHERE opt.question_id = q.id
        ),
        '[]'::json
      ) as options
    FROM public.standalone_quiz_questions q
    WHERE q.quiz_id = input_quiz_id
    ORDER BY q.position
  )
  SELECT COALESCE(
    json_agg(
      json_build_object(
        'id', question_id,
        'quiz_id', quiz_id,
        'question_text', question_text,
        'question_type', question_type,
        'position', position,
        'points', points,
        'explanation', explanation,
        'math_expression', math_expression,
        'math_tolerance', math_tolerance,
        'math_hint', math_hint,
        'math_allow_drawing', math_allow_drawing,
        'is_required', is_required,
        'created_at', created_at,
        'updated_at', updated_at,
        'options', options
      )
    ),
    '[]'::json
  ) INTO questions_json
  FROM question_data;
  
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

COMMENT ON FUNCTION public.get_standalone_quiz_with_questions(uuid) IS 'Gets a quiz with its questions and options - fixed ambiguous column reference using CTE';
