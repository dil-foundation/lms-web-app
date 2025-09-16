-- Fix the analytics function to handle cases where question IDs in answers don't match current questions
-- This can happen when questions are deleted/recreated or when there are data inconsistencies

DROP FUNCTION IF EXISTS public.get_question_performance_analytics(uuid);

CREATE OR REPLACE FUNCTION public.get_question_performance_analytics(input_quiz_id uuid)
RETURNS TABLE (
  question_id uuid,
  question_text text,
  question_type text,
  "position" integer,
  total_attempts bigint,
  correct_attempts bigint,
  accuracy_rate numeric,
  average_time_seconds numeric
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
    COUNT(*) FILTER (WHERE 
      CASE 
        WHEN sqq.question_type = 'single_choice' THEN
          -- Check if the answer exists and is correct
          EXISTS (
            SELECT 1 FROM jsonb_each(sqa.answers) as answer
            WHERE answer.key = sqq.id::text
              AND jsonb_array_length(answer.value->'selectedOptions') = 1
              AND (answer.value->'selectedOptions'->0)::text = (
                SELECT ('"' || sqo.id::text || '"') FROM public.standalone_question_options sqo
                WHERE sqo.question_id = sqq.id AND sqo.is_correct = true
                LIMIT 1
              )
          )
        WHEN sqq.question_type = 'multiple_choice' THEN
          -- Check if all correct options are selected and no incorrect ones
          EXISTS (
            SELECT 1 FROM jsonb_each(sqa.answers) as answer
            WHERE answer.key = sqq.id::text
              AND (
                SELECT COUNT(*) FROM jsonb_array_elements_text(answer.value->'selectedOptions') as selected
                JOIN public.standalone_question_options sqo ON sqo.id::text = selected
                WHERE sqo.question_id = sqq.id AND sqo.is_correct = true
              ) = (
                SELECT COUNT(*) FROM public.standalone_question_options sqo
                WHERE sqo.question_id = sqq.id AND sqo.is_correct = true
              )
              AND (
                SELECT COUNT(*) FROM jsonb_array_elements_text(answer.value->'selectedOptions') as selected
                JOIN public.standalone_question_options sqo ON sqo.id::text = selected
                WHERE sqo.question_id = sqq.id AND sqo.is_correct = false
              ) = 0
          )
        WHEN sqq.question_type = 'text_answer' THEN
          -- For text answers, we'll consider them correct if they exist (exact matching would be complex)
          EXISTS (
            SELECT 1 FROM jsonb_each(sqa.answers) as answer
            WHERE answer.key = sqq.id::text
              AND answer.value->>'textAnswer' IS NOT NULL
              AND answer.value->>'textAnswer' != ''
          )
        WHEN sqq.question_type = 'math_expression' THEN
          -- For math expressions, we'll consider them correct if they exist
          EXISTS (
            SELECT 1 FROM jsonb_each(sqa.answers) as answer
            WHERE answer.key = sqq.id::text
              AND answer.value->>'mathExpression' IS NOT NULL
              AND answer.value->>'mathExpression' != ''
          )
        ELSE false
      END
    ) as correct_attempts,
    ROUND(
      (COUNT(*) FILTER (WHERE 
        CASE 
          WHEN sqq.question_type = 'single_choice' THEN
            EXISTS (
              SELECT 1 FROM jsonb_each(sqa.answers) as answer
              WHERE answer.key = sqq.id::text
                AND jsonb_array_length(answer.value->'selectedOptions') = 1
                AND (answer.value->'selectedOptions'->0)::text = (
                  SELECT ('"' || sqo.id::text || '"') FROM public.standalone_question_options sqo
                  WHERE sqo.question_id = sqq.id AND sqo.is_correct = true
                  LIMIT 1
                )
            )
          WHEN sqq.question_type = 'multiple_choice' THEN
            EXISTS (
              SELECT 1 FROM jsonb_each(sqa.answers) as answer
              WHERE answer.key = sqq.id::text
                AND (
                  SELECT COUNT(*) FROM jsonb_array_elements_text(answer.value->'selectedOptions') as selected
                  JOIN public.standalone_question_options sqo ON sqo.id::text = selected
                  WHERE sqo.question_id = sqq.id AND sqo.is_correct = true
                ) = (
                  SELECT COUNT(*) FROM public.standalone_question_options sqo
                  WHERE sqo.question_id = sqq.id AND sqo.is_correct = true
                )
                AND (
                  SELECT COUNT(*) FROM jsonb_array_elements_text(answer.value->'selectedOptions') as selected
                  JOIN public.standalone_question_options sqo ON sqo.id::text = selected
                  WHERE sqo.question_id = sqq.id AND sqo.is_correct = false
                ) = 0
            )
          WHEN sqq.question_type = 'text_answer' THEN
            EXISTS (
              SELECT 1 FROM jsonb_each(sqa.answers) as answer
              WHERE answer.key = sqq.id::text
                AND answer.value->>'textAnswer' IS NOT NULL
                AND answer.value->>'textAnswer' != ''
            )
          WHEN sqq.question_type = 'math_expression' THEN
            EXISTS (
              SELECT 1 FROM jsonb_each(sqa.answers) as answer
              WHERE answer.key = sqq.id::text
                AND answer.value->>'mathExpression' IS NOT NULL
                AND answer.value->>'mathExpression' != ''
            )
          ELSE false
        END
      )::numeric / NULLIF(COUNT(sqa.id), 0)::numeric) * 100, 2
    ) as accuracy_rate,
    ROUND(AVG(
      CASE 
        WHEN sqa.answers ? sqq.id::text THEN
          COALESCE((sqa.answers->sqq.id::text->>'time_spent_seconds')::numeric, 0)
        ELSE 0
      END
    ), 2) as average_time_seconds
  FROM public.standalone_quiz_questions sqq
  LEFT JOIN public.standalone_quiz_attempts sqa ON sqa.quiz_id = input_quiz_id
  WHERE sqq.quiz_id = input_quiz_id
  GROUP BY sqq.id, sqq.question_text, sqq.question_type, sqq.position
  ORDER BY sqq.position;
END;
$$;

-- Add comment for documentation
COMMENT ON FUNCTION public.get_question_performance_analytics(uuid) IS 'Gets performance analytics for each question in a quiz - handles missing question IDs gracefully';

-- Also create a function to show orphaned answers (answers for questions that no longer exist)
CREATE OR REPLACE FUNCTION public.get_orphaned_quiz_answers(input_quiz_id uuid)
RETURNS TABLE (
  attempt_id uuid,
  question_id_in_answer uuid,
  question_text text,
  question_type text,
  selected_options jsonb,
  attempt_created_at timestamptz
) LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    sqa.id as attempt_id,
    answer.key::uuid as question_id_in_answer,
    COALESCE(sqq.question_text, 'Question not found') as question_text,
    COALESCE(sqq.question_type, 'unknown') as question_type,
    answer.value->'selectedOptions' as selected_options,
    sqa.created_at as attempt_created_at
  FROM public.standalone_quiz_attempts sqa,
       jsonb_each(sqa.answers) as answer
  LEFT JOIN public.standalone_quiz_questions sqq ON sqq.id = answer.key::uuid
  WHERE sqa.quiz_id = input_quiz_id
    AND sqq.id IS NULL  -- This means the question doesn't exist anymore
  ORDER BY sqa.created_at DESC;
END;
$$;

-- Test the orphaned answers function
SELECT * FROM public.get_orphaned_quiz_answers('1bd739b4-e8fa-4c31-9670-61cc8fa9e2be'::uuid);
