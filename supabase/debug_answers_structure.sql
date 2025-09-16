-- Debug script to check the actual structure of answers data
-- Run this in Supabase SQL editor to see what the answers look like

-- Check a few quiz attempts and their answers structure
SELECT 
  sqa.id as attempt_id,
  sqa.quiz_id,
  sqa.answers,
  jsonb_object_keys(sqa.answers) as answer_keys,
  jsonb_typeof(sqa.answers) as answers_type
FROM public.standalone_quiz_attempts sqa
WHERE sqa.answers IS NOT NULL
LIMIT 5;

-- Check the structure of individual answers
SELECT 
  sqa.id as attempt_id,
  answer.key as answer_key,
  answer.value as answer_value,
  jsonb_typeof(answer.value) as value_type,
  answer.value->'selectedOptions' as selected_options,
  jsonb_typeof(answer.value->'selectedOptions') as selected_options_type
FROM public.standalone_quiz_attempts sqa,
     jsonb_each(sqa.answers) as answer
WHERE sqa.answers IS NOT NULL
LIMIT 10;

-- Check what questions exist for a specific quiz
SELECT 
  sqq.id as question_id,
  sqq.question_text,
  sqq.question_type,
  sqq.position
FROM public.standalone_quiz_questions sqq
WHERE sqq.quiz_id = (
  SELECT DISTINCT quiz_id 
  FROM public.standalone_quiz_attempts 
  WHERE answers IS NOT NULL 
  LIMIT 1
)
ORDER BY sqq.position;

-- Check what options exist for these questions
SELECT 
  sqq.id as question_id,
  sqq.question_text,
  sqo.id as option_id,
  sqo.option_text,
  sqo.is_correct
FROM public.standalone_quiz_questions sqq
LEFT JOIN public.standalone_question_options sqo ON sqo.question_id = sqq.id
WHERE sqq.quiz_id = (
  SELECT DISTINCT quiz_id 
  FROM public.standalone_quiz_attempts 
  WHERE answers IS NOT NULL 
  LIMIT 1
)
ORDER BY sqq.position, sqo.position;
