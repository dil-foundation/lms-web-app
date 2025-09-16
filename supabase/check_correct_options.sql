-- Check what the correct options are for the questions in the quiz
-- This will help us understand why the analytics are showing 0% accuracy

-- Get the quiz ID from the data you provided
WITH quiz_id AS (
  SELECT '1bd739b4-e8fa-4c31-9670-61cc8fa9e2be'::uuid as id
)
SELECT 
  sqq.id as question_id,
  sqq.question_text,
  sqq.question_type,
  sqq.position,
  sqo.id as option_id,
  sqo.option_text,
  sqo.is_correct,
  sqo.position as option_position
FROM public.standalone_quiz_questions sqq
CROSS JOIN quiz_id
LEFT JOIN public.standalone_question_options sqo ON sqo.question_id = sqq.id
WHERE sqq.quiz_id = quiz_id.id
ORDER BY sqq.position, sqo.position;

-- Also check what answers were actually selected
SELECT 
  sqa.id as attempt_id,
  answer.key as question_id,
  answer.value->'selectedOptions' as selected_options,
  sqq.question_text,
  sqq.question_type
FROM public.standalone_quiz_attempts sqa,
     jsonb_each(sqa.answers) as answer
LEFT JOIN public.standalone_quiz_questions sqq ON sqq.id = answer.key::uuid
WHERE sqa.quiz_id = '1bd739b4-e8fa-4c31-9670-61cc8fa9e2be'::uuid
ORDER BY sqa.created_at DESC, sqq.position;
