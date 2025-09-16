-- Fix GROUP BY error in get_standalone_quiz_with_questions function
-- Simplified approach to avoid GROUP BY clause issues

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
  FROM public.standalone_quizzes sq
  WHERE sq.id = input_quiz_id;
  
  -- If quiz not found, return empty result
  IF NOT FOUND THEN
    RETURN;
  END IF;
  
  -- Get questions as JSON array
  SELECT COALESCE(
    json_agg(
      json_build_object(
        'id', q.id,
        'quiz_id', q.quiz_id,
        'question_text', q.question_text,
        'question_type', q.question_type,
        'position', q.position,
        'points', q.points::numeric,
        'explanation', q.explanation,
        'math_expression', q.math_expression,
        'math_tolerance', q.math_tolerance::numeric,
        'math_hint', q.math_hint,
        'math_allow_drawing', q.math_allow_drawing,
        'is_required', q.is_required,
        'created_at', q.created_at,
        'updated_at', q.updated_at,
        'options', (
          SELECT COALESCE(
            json_agg(
              json_build_object(
                'id', o.id,
                'question_id', o.question_id,
                'option_text', o.option_text,
                'is_correct', o.is_correct,
                'position', o.position,
                'created_at', o.created_at
              ) ORDER BY o.position
            ),
            '[]'::json
          )
          FROM public.standalone_question_options o
          WHERE o.question_id = q.id
        )
      ) ORDER BY q.position
    ),
    '[]'::json
  ) INTO questions_json
  FROM public.standalone_quiz_questions q
  WHERE q.quiz_id = input_quiz_id;
  
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

COMMENT ON FUNCTION public.get_standalone_quiz_with_questions(uuid) IS 'Gets a quiz with its questions and options - fixed GROUP BY error';
