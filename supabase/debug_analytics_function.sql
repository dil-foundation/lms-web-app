-- Debug version of the analytics function to see what's happening
-- This will help us understand why the calculations are returning 0

CREATE OR REPLACE FUNCTION public.debug_question_performance_analytics(input_quiz_id uuid)
RETURNS TABLE (
  question_id uuid,
  question_text text,
  question_type text,
  position integer,
  total_attempts bigint,
  debug_info jsonb
) LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    sqq.id,
    sqq.question_text,
    sqq.question_type,
    sqq.position,
    COUNT(sqa.id) as total_attempts,
    jsonb_build_object(
      'question_id', sqq.id::text,
      'question_type', sqq.question_type,
      'total_attempts', COUNT(sqa.id),
      'attempts_with_answers', COUNT(*) FILTER (WHERE sqa.answers ? sqq.id::text),
      'sample_answers', (
        SELECT jsonb_agg(
          jsonb_build_object(
            'attempt_id', sqa2.id,
            'has_answer', sqa2.answers ? sqq.id::text,
            'answer_value', sqa2.answers->sqq.id::text,
            'selected_options', sqa2.answers->sqq.id::text->'selectedOptions',
            'selected_options_type', jsonb_typeof(sqa2.answers->sqq.id::text->'selectedOptions'),
            'selected_options_length', jsonb_array_length(sqa2.answers->sqq.id::text->'selectedOptions')
          )
        )
        FROM public.standalone_quiz_attempts sqa2
        WHERE sqa2.quiz_id = input_quiz_id
        AND sqa2.answers ? sqq.id::text
        LIMIT 3
      ),
      'correct_options', (
        SELECT jsonb_agg(
          jsonb_build_object(
            'option_id', sqo.id,
            'option_text', sqo.option_text,
            'is_correct', sqo.is_correct
          )
        )
        FROM public.standalone_question_options sqo
        WHERE sqo.question_id = sqq.id
      )
    ) as debug_info
  FROM public.standalone_quiz_questions sqq
  LEFT JOIN public.standalone_quiz_attempts sqa ON sqa.quiz_id = input_quiz_id
  WHERE sqq.quiz_id = input_quiz_id
  GROUP BY sqq.id, sqq.question_text, sqq.question_type, sqq.position
  ORDER BY sqq.position;
END;
$$;

-- Test the debug function
SELECT * FROM public.debug_question_performance_analytics(
  (SELECT DISTINCT quiz_id FROM public.standalone_quiz_attempts WHERE answers IS NOT NULL LIMIT 1)
);
